const DEFAULT_SETTINGS = {
  addressBlacklist: [],
  domainBlacklist: []
};

const MENU_CONTEXTS = ["message_display_action_menu", "compose_action_menu"];
const menuItemIds = [];
const menuActions = new Map();
let menuInstanceId = 0;

let currentSettings = { ...DEFAULT_SETTINGS };

function getEmptyEmailData() {
  return {
    to: [],
    cc: [],
    from: [],
    body: [],
    all: []
  };
}

async function loadSettings() {
  try {
    const result = await browser.storage.sync.get(DEFAULT_SETTINGS);
    currentSettings = {
      addressBlacklist: Array.isArray(result.addressBlacklist) ? result.addressBlacklist : [],
      domainBlacklist: Array.isArray(result.domainBlacklist) ? result.domainBlacklist : []
    };
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
}

function extractDomain(email) {
  const parts = String(email).toLowerCase().split("@");
  return parts.length > 1 ? parts[1] : "";
}

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

function filterEmails(emails) {
  return emails.filter(email => !isFiltered(email));
}

function extractEmailsFromText(text) {
  if (!text) {
    return [];
  }
  const emailPattern = /[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}/g;
  const matches = String(text).match(emailPattern) || [];
  return [...new Set(matches.map(email => email.toLowerCase()))];
}

function getHeaderEmails(headers, name) {
  if (!headers || !Array.isArray(headers[name])) {
    return [];
  }
  return extractEmailsFromText(headers[name].join(","));
}

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

async function resolveCurrentMessage(info, tab) {
  if (info && info.selectedMessages && Array.isArray(info.selectedMessages.messages) && info.selectedMessages.messages.length > 0) {
    return info.selectedMessages.messages[0];
  }

  // Thunderbird-compatible fallback: read selected messages from a mail tab.
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

  // Final fallback: find active mail tab and read its selected messages.
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

async function getEmailAddresses(info, tab) {
  try {
    const message = await resolveCurrentMessage(info, tab);
    if (!message) {
      return getEmptyEmailData();
    }

    // Start with direct message fields when present.
    let toEmails = extractEmailsFromText(Array.isArray(message.recipients) ? message.recipients.join(",") : message.recipients);
    let ccEmails = extractEmailsFromText(Array.isArray(message.ccList) ? message.ccList.join(",") : message.ccList);
    let fromEmails = extractEmailsFromText(message.author);

    // Thunderbird commonly exposes richer header data via messages.getFull().
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
  } catch (error) {
    console.error("Error extracting email addresses:", error);
    return getEmptyEmailData();
  }
}

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

function isActionMenuShown(info) {
  if (!info || !Array.isArray(info.contexts)) {
    return false;
  }

  return info.contexts.some(context => MENU_CONTEXTS.includes(context));
}

async function removeAllMenuItems() {
  try {
    await browser.menus.removeAll();
  } catch (error) {
    console.warn("Failed to remove all menu items:", error);
  }

  menuItemIds.length = 0;
  menuActions.clear();
}

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

async function createSectionSeparator() {
  if (menuItemIds.length === 0) {
    return;
  }

  await createMenuItem(`separator-${Date.now()}-${menuItemIds.length}`, "", { type: "separator" });
}

browser.storage.onChanged.addListener(() => {
  loadSettings();
});

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
      await createMenuItem("open-settings", "Open Settings", {
        action: async () => {
          await browser.runtime.openOptionsPage();
        }
      });
      await browser.menus.refresh();
      return;
    }

    const toPlusCc = [...new Set([...emailData.to, ...emailData.cc])];

    await createMenuItem("email-header", `Found ${emailData.all.length} email address(es)`, { enabled: false });

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

    const fromPlusCc = [...new Set([...emailData.from, ...emailData.cc])];
    if (fromPlusCc.length > 0) {
      await createMenuItem("copy-from-cc", `Copy From + Cc (${fromPlusCc.length})`, {
        action: async () => copyToClipboard(fromPlusCc)
      });
    }

    await createSectionSeparator();

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

    await createMenuItem("open-settings", "Open Settings", {
      action: async () => {
        await browser.runtime.openOptionsPage();
      }
    });

    await browser.menus.refresh();
  } catch (error) {
    console.error("Error handling menu display:", error);
  }
});

browser.menus.onHidden.addListener(async () => {
  await removeAllMenuItems();
});

(async () => {
  await loadSettings();
})();

