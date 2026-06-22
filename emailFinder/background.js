const DEFAULT_SETTINGS = {
  addressBlacklist: [],
  domainBlacklist: [],
  individualEmailsPosition: "bottom"
};

const MENU_CONTEXTS = ["message_display_action_menu", "compose_action_menu"];
const menuItemIds = [];
const menuActions = new Map();
let menuInstanceId = 0;

let currentSettings = { ...DEFAULT_SETTINGS };

// Returns blank email lists for every category. Used when no message is open or something went wrong.
function getEmptyEmailData() {
  return {
    to: [],
    cc: [],
    from: [],
    body: [],
    all: []
  };
}

// Loads the user's saved settings (blocked addresses, blocked domains, menu layout) into memory.
async function loadSettings() {
  try {
    const result = await browser.storage.sync.get(DEFAULT_SETTINGS);
    currentSettings = {
      addressBlacklist: Array.isArray(result.addressBlacklist) ? result.addressBlacklist : [],
      domainBlacklist: Array.isArray(result.domainBlacklist) ? result.domainBlacklist : [],
      individualEmailsPosition: result.individualEmailsPosition === "top" ? "top" : "bottom"
    };
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
}

// Gets the domain part of an email address — everything after the @ symbol.
// Example: "user@gmail.com" becomes "gmail.com"
function extractDomain(email) {
  const parts = String(email).toLowerCase().split("@");
  return parts.length > 1 ? parts[1] : "";
}

// Decides whether an email address should be left out of results because the user blocked it.
// An address can be blocked directly, or because its whole domain is on the blocked list.
function isFiltered(email) {
  const normalizedEmail = String(email).toLowerCase();
  const domain = extractDomain(normalizedEmail);

  if (currentSettings.addressBlacklist.includes(normalizedEmail)) {
    return true;
  }

  if (domain && currentSettings.domainBlacklist.includes(domain)) {
    return true;
  }

  return false;
}

// Takes a list of email addresses and removes any that the user has chosen to block.
function filterEmails(emails) {
  return emails.filter(email => !isFiltered(email));
}

// Looks through a piece of text and pulls out every email address it can find.
// Duplicate addresses are removed, and everything is converted to lowercase.
function extractEmailsFromText(text) {
  if (!text) {
    return [];
  }
  const emailPattern = /[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}/g;
  const matches = String(text).match(emailPattern) || [];
  return [...new Set(matches.map(email => email.toLowerCase()))];
}

// Reads email addresses from a specific message header field, such as "to", "cc", or "from".
function getHeaderEmails(headers, name) {
  if (!headers || !Array.isArray(headers[name])) {
    return [];
  }
  return extractEmailsFromText(headers[name].join(","));
}

// Gathers all the readable text from an email body, including text inside nested parts.
function collectInlineText(parts) {
  if (!Array.isArray(parts)) {
    return "";
  }

  const chunks = [];
  for (const part of parts) {
    if (part && typeof part.content === "string") {
      chunks.push(part.content);
    }
    if (part && Array.isArray(part.parts)) {
      chunks.push(collectInlineText(part.parts));
    }
  }
  return chunks.join("\n");
}

// Turns compose window recipient fields into plain text so we can search them for email addresses.
function composeRecipientsToText(recipients) {
  if (!recipients) {
    return "";
  }

  const list = Array.isArray(recipients) ? recipients : [recipients];
  const parts = [];

  for (const recipient of list) {
    if (typeof recipient === "string") {
      parts.push(recipient);
    }
  }

  return parts.join(", ");
}

// Combines multiple email result sets into one, removing duplicates in each category.
function mergeEmailData(...dataSets) {
  const merged = getEmptyEmailData();

  for (const data of dataSets) {
    merged.to = [...new Set([...merged.to, ...data.to])];
    merged.cc = [...new Set([...merged.cc, ...data.cc])];
    merged.from = [...new Set([...merged.from, ...data.from])];
    merged.body = [...new Set([...merged.body, ...data.body])];
    merged.all = [...new Set([...merged.all, ...data.all])];
  }

  return merged;
}

// Checks whether the menu was opened from a compose or reply window rather than the inbox.
function isComposeContext(info) {
  if (!info || !Array.isArray(info.contexts)) {
    return false;
  }

  return info.contexts.includes("compose_action_menu");
}

// Figures out which email message the user is looking at right now.
// Tries a few different ways because Thunderbird can provide the message in different places.
async function resolveCurrentMessage(info, tab) {
  if (info && info.selectedMessages && Array.isArray(info.selectedMessages.messages) && info.selectedMessages.messages.length > 0) {
    return info.selectedMessages.messages[0];
  }

  if (tab && tab.id !== undefined && messenger.mailTabs && messenger.mailTabs.getSelectedMessages) {
    try {
      const selected = await messenger.mailTabs.getSelectedMessages(tab.id);
      if (selected && Array.isArray(selected.messages) && selected.messages.length > 0) {
        return selected.messages[0];
      }
    } catch (error) {
      console.warn("Could not resolve selected message from tab context:", error);
    }
  }

  if (messenger.mailTabs && messenger.mailTabs.query && messenger.mailTabs.getSelectedMessages) {
    try {
      const mailTabs = await messenger.mailTabs.query({ active: true, currentWindow: true });
      if (mailTabs && mailTabs.length > 0) {
        const selected = await messenger.mailTabs.getSelectedMessages(mailTabs[0].id);
        if (selected && Array.isArray(selected.messages) && selected.messages.length > 0) {
          return selected.messages[0];
        }
      }
    } catch (error) {
      console.warn("Could not resolve selected message from active mail tab:", error);
    }
  }

  return null;
}

// Scans a single saved message and collects email addresses from its To, Cc, From, and body fields.
async function getEmailAddressesFromMessage(message) {
  if (!message) {
    return getEmptyEmailData();
  }

  let toEmails = extractEmailsFromText(Array.isArray(message.recipients) ? message.recipients.join(",") : message.recipients);
  let ccEmails = extractEmailsFromText(Array.isArray(message.ccList) ? message.ccList.join(",") : message.ccList);
  let fromEmails = extractEmailsFromText(message.author);

  try {
    const fullMessage = await messenger.messages.getFull(message.id);
    const headers = fullMessage && fullMessage.headers ? fullMessage.headers : null;

    const headerTo = getHeaderEmails(headers, "to");
    const headerCc = getHeaderEmails(headers, "cc");
    const headerFrom = getHeaderEmails(headers, "from");

    toEmails = [...new Set([...toEmails, ...headerTo])];
    ccEmails = [...new Set([...ccEmails, ...headerCc])];
    fromEmails = [...new Set([...fromEmails, ...headerFrom])];
  } catch (error) {
    console.warn("Header extraction via getFull unavailable:", error);
  }

  let bodyEmails = [];
  try {
    const inlineParts = await messenger.messages.listInlineTextParts(message.id);
    const inlineText = collectInlineText(inlineParts);
    bodyEmails = extractEmailsFromText(inlineText);
  } catch (error) {
    console.warn("Body extraction unavailable:", error);
  }

  const allEmails = [...new Set([...toEmails, ...ccEmails, ...fromEmails, ...bodyEmails])];

  return {
    to: filterEmails(toEmails),
    cc: filterEmails(ccEmails),
    from: filterEmails(fromEmails),
    body: filterEmails(bodyEmails),
    all: filterEmails(allEmails)
  };
}

// Loads a message by its ID and scans it for email addresses.
async function getEmailAddressesFromMessageId(messageId) {
  try {
    const message = await messenger.messages.get(messageId);
    return await getEmailAddressesFromMessage(message);
  } catch (error) {
    console.warn("Could not load related message:", error);
    return getEmptyEmailData();
  }
}

// Scans the open compose or reply window for email addresses in To, Cc, From, Bcc, and the message body.
// If the user is replying to a message, the original message is scanned as well.
async function getEmailAddressesFromCompose(tab) {
  if (!tab || tab.id === undefined || !messenger.compose || !messenger.compose.getComposeDetails) {
    return getEmptyEmailData();
  }

  try {
    const details = await messenger.compose.getComposeDetails(tab.id);

    let toEmails = extractEmailsFromText(composeRecipientsToText(details.to));
    let ccEmails = extractEmailsFromText(composeRecipientsToText(details.cc));
    const bccEmails = extractEmailsFromText(composeRecipientsToText(details.bcc));
    let fromEmails = extractEmailsFromText(composeRecipientsToText(details.from));
    const replyToEmails = extractEmailsFromText(composeRecipientsToText(details.replyTo));

    toEmails = [...new Set([...toEmails, ...replyToEmails])];

    const bodyText = details.isPlainText ? (details.plainTextBody || "") : (details.body || "");
    let bodyEmails = extractEmailsFromText(bodyText);
    bodyEmails = [...new Set([...bodyEmails, ...bccEmails])];

    const allEmails = [...new Set([...toEmails, ...ccEmails, ...fromEmails, ...bodyEmails])];

    const composeData = {
      to: filterEmails(toEmails),
      cc: filterEmails(ccEmails),
      from: filterEmails(fromEmails),
      body: filterEmails(bodyEmails),
      all: filterEmails(allEmails)
    };

    if (details.relatedMessageId) {
      const originalData = await getEmailAddressesFromMessageId(details.relatedMessageId);
      return mergeEmailData(composeData, originalData);
    }

    return composeData;
  } catch (error) {
    console.error("Error extracting email addresses from compose window:", error);
    return getEmptyEmailData();
  }
}

// Scans the current message and collects email addresses from the To, Cc, From, and body fields.
// Blocked addresses and domains are removed before the results are returned.
async function getEmailAddresses(info, tab) {
  try {
    if (isComposeContext(info)) {
      return await getEmailAddressesFromCompose(tab);
    }

    const message = await resolveCurrentMessage(info, tab);
    return await getEmailAddressesFromMessage(message);
  } catch (error) {
    console.error("Error extracting email addresses:", error);
    return getEmptyEmailData();
  }
}

// Copies one or more email addresses to the clipboard as a comma-separated list.
// Returns true if it worked, or false if there was nothing valid to copy.
async function copyToClipboard(emails) {
  try {
    if (!Array.isArray(emails)) {
      return false;
    }

    const validEmails = emails
      .filter(email => typeof email === "string" && email.trim().length > 0)
      .map(email => email.trim());

    if (validEmails.length === 0) {
      return false;
    }

    await navigator.clipboard.writeText(validEmails.join(", "));
    return true;
  } catch (error) {
    console.error("copyToClipboard failed:", error);
    return false;
  }
}

// Checks whether the menu that just opened is one of our extension menus.
// This stops us from reacting to unrelated menus elsewhere in Thunderbird.
function isActionMenuShown(info) {
  if (!info || !Array.isArray(info.contexts)) {
    return false;
  }

  return info.contexts.some(context => MENU_CONTEXTS.includes(context));
}

// Removes every menu item this extension created, so we can rebuild the menu from scratch.
async function removeAllMenuItems() {
  try {
    await browser.menus.removeAll();
  } catch (error) {
    console.warn("Failed to remove all menu items:", error);
  }

  menuItemIds.length = 0;
  menuActions.clear();
}

// Adds a single item to the extension menu, such as a button, a label, or a divider line.
// If an action is provided, it is stored so we can run it when the user clicks that item.
async function createMenuItem(id, title, options = {}) {
  try {
    const item = {
      id,
      title,
      contexts: MENU_CONTEXTS
    };

    if (options.type) {
      item.type = options.type;
    }

    if (typeof options.enabled === "boolean") {
      item.enabled = options.enabled;
    }

    await browser.menus.create(item);
    menuItemIds.push(id);

    if (typeof options.action === "function") {
      menuActions.set(id, options.action);
    }
  } catch (error) {
    console.error(`Failed to create menu item ${id}:`, error);
  }
}

// Adds a horizontal divider line to the menu to visually separate groups of items.
// Does nothing if the menu is still empty, because a divider needs something above it.
async function createSectionSeparator() {
  if (menuItemIds.length === 0) {
    return;
  }

  await createMenuItem(`separator-${Date.now()}-${menuItemIds.length}`, "", { type: "separator" });
}

// Adds the bulk copy buttons to the menu, such as "Copy All", "Copy To", and "Copy Cc".
// Each button only appears if there are addresses in that group to copy.
async function createCopyActionItems(emailData) {
  const toPlusCc = [...new Set([...emailData.to, ...emailData.cc])];
  const fromPlusCc = [...new Set([...emailData.from, ...emailData.cc])];

  await createMenuItem("copy-all", `Copy All (${emailData.all.length})`, {
    action: async () => copyToClipboard(emailData.all)
  });

  if (emailData.to.length > 0) {
    await createMenuItem("copy-to", `Copy To (${emailData.to.length})`, {
      action: async () => copyToClipboard(emailData.to)
    });
  }

  if (emailData.from.length > 0) {
    await createMenuItem("copy-from", `Copy From (${emailData.from.length})`, {
      action: async () => copyToClipboard(emailData.from)
    });
  }

  if (emailData.cc.length > 0) {
    await createMenuItem("copy-cc", `Copy Cc (${emailData.cc.length})`, {
      action: async () => copyToClipboard(emailData.cc)
    });
  }

  if (toPlusCc.length > 0) {
    await createMenuItem("copy-to-cc", `Copy To + Cc (${toPlusCc.length})`, {
      action: async () => copyToClipboard(toPlusCc)
    });
  }

  if (fromPlusCc.length > 0) {
    await createMenuItem("copy-from-cc", `Copy From + Cc (${fromPlusCc.length})`, {
      action: async () => copyToClipboard(fromPlusCc)
    });
  }
}

// Adds one menu item for each individual email address, so the user can copy just one address.
// To keep the menu readable, only the first 15 addresses are shown.
async function createIndividualEmailItems(emailData) {
  const maxIndividualEmails = 15;
  const emailsToShow = emailData.all.slice(0, maxIndividualEmails);

  for (let i = 0; i < emailsToShow.length; i++) {
    const email = emailsToShow[i];
    const id = `email-item-${i}`;
    await createMenuItem(id, email, {
      action: async () => copyToClipboard([email])
    });
  }

  if (emailData.all.length > maxIndividualEmails) {
    await createMenuItem("email-limited", `... and ${emailData.all.length - maxIndividualEmails} more`, { enabled: false });
  }
}

// Builds the full results menu after addresses have been found.
// The order depends on the user's setting: individual addresses can appear above or below the copy buttons.
async function createResultsMenu(emailData) {
  const showIndividualEmailsAtTop = currentSettings.individualEmailsPosition === "top";

  await createMenuItem("email-header", `Found ${emailData.all.length} email address(es)`, { enabled: false });

  if (showIndividualEmailsAtTop) {
    await createIndividualEmailItems(emailData);
    await createSectionSeparator();
    await createCopyActionItems(emailData);
  } else {
    await createCopyActionItems(emailData);
    await createSectionSeparator();
    await createIndividualEmailItems(emailData);
  }

  await createSectionSeparator();
  await createMenuItem("open-settings", "Open Settings", {
    action: async () => {
      await browser.runtime.openOptionsPage();
    }
  });
}

// When the user changes settings, reload them so the extension uses the new choices straight away.
browser.storage.onChanged.addListener(() => {
  loadSettings();
});

// Runs the correct action when the user clicks one of our menu items.
browser.menus.onClicked.addListener(async (info, tab) => {
  const action = menuActions.get(info.menuItemId);
  if (!action) {
    return;
  }

  try {
    await action(info, tab);
  } catch (error) {
    console.error(`Menu action failed for ${info.menuItemId}:`, error);
  }
});

// Runs when the user opens the extension menu.
// It scans the current message, builds the menu, and shows either results or a "nothing found" message.
browser.menus.onShown.addListener(async (info, tab) => {
  if (!isActionMenuShown(info)) {
    return;
  }

  const currentMenuInstanceId = ++menuInstanceId;

  try {
    await removeAllMenuItems();
    await createMenuItem("email-header", "Scanning for email addresses...", { enabled: false });
    await browser.menus.refresh();

    const emailData = await getEmailAddresses(info, tab);
    if (currentMenuInstanceId !== menuInstanceId) {
      return;
    }

    await removeAllMenuItems();

    if (emailData.all.length === 0) {
      await createMenuItem("email-header", "Found 0 email address(es)", { enabled: false });
      await createMenuItem("no-results", "No email addresses found", { enabled: false });
      await createSectionSeparator();
      await createMenuItem("open-settings", "Open Settings", {
        action: async () => {
          await browser.runtime.openOptionsPage();
        }
      });
      await browser.menus.refresh();
      return;
    }

    await createResultsMenu(emailData);

    await browser.menus.refresh();
  } catch (error) {
    console.error("Error handling menu display:", error);
  }
});

// Cleans up the menu when the user closes it, so old items do not stick around.
browser.menus.onHidden.addListener(async () => {
  await removeAllMenuItems();
});

// Loads settings as soon as the extension starts.
(async () => {
  await loadSettings();
})();
