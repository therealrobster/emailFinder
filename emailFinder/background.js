// Find the email addresses in the body
async function findEmailAddresses() {

  let tabs = await messenger.tabs.query({ active: true, currentWindow: true });
  let message = await messenger.messageDisplay.getDisplayedMessage(tabs[0].id);

  // Regex pattern to match email addresses
  const emailPattern = /[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}/g;

  // Find the 'from' email address
  const fromEmail = message.author.match(emailPattern)?.[0]; // Take the first match, if any

  // Get the email body
  let fullBody = await messenger.messages.listInlineTextParts(message.id);
  let part = fullBody[0].content;

  // Find all matches in the text
  const emails = part.match(emailPattern) || []; // Ensure `emails` is always an array

  // Normalize emails to lowercase and remove duplicates
  const uniqueEmails = [...new Set(emails.map(email => email.toLowerCase()))];

  // Normalize 'fromEmail' and add it to the list if it's not already included
  if (fromEmail) {
      const normalizedFromEmail = fromEmail.toLowerCase();
      if (!uniqueEmails.includes(normalizedFromEmail)) {
          uniqueEmails.push(normalizedFromEmail);
      }
  }

  return uniqueEmails;
}
// Global variable to track menu item IDs
const menuItemIds = [];

// Function to remove menu items by their IDs
async function removeMenuItems(ids) {
  console.log("Removing menu items...");
  for (const id of ids) {
    try {
      console.log(`Removing menu item: ${id}`);
      await browser.menus.remove(id);
    } catch (error) {
      console.error(`Failed to remove menu item ${id}:`, error);
    }
  }
}

// Function to create or update menu items
async function createOrUpdateMenuItem(id, title) {
  // Check if the menu item ID is already tracked
  if (menuItemIds.includes(id)) {
    console.log(`Menu item ${id} already exists, skipping creation.`);
    return;
  }

  try {
    await browser.menus.create({
      id: id,
      contexts: ["message_display_action_menu"],
      title: title,
      onclick: async () => {
        try {
          await navigator.clipboard.writeText(title);
          console.log(`Copied ${title} to clipboard`);
        } catch (error) {
          console.error(`Failed to copy ${title} to clipboard:`, error);
        }
      },
    });
    menuItemIds.push(id);  // Track the ID of the created menu item
  } catch (error) {
    console.error(`Failed to create menu item ${id}:`, error);
  }
}

// Function to remove all tracked menu items
async function removeAllMenuItems() {
  await removeMenuItems(menuItemIds);
  menuItemIds.length = 0;  // Clear the tracked IDs
}

// Add a listener for the menus.onShown event
browser.menus.onShown.addListener(async (info, tab) => {
  try {
    // Remove all existing menu items
    await removeAllMenuItems();

    // Call the function and handle the result
    const emailAddresses = await findEmailAddresses();
    
    // Update the menu with the found email address count
    try {
      await browser.menus.update("my-menu-item", {
        title: `Found ${emailAddresses.length} email addresses`,
        enabled: false
      });
    } catch (error) {
      console.error(`Failed to update menu item my-menu-item:`, error);
    }

    // Create new menu items based on email addresses
    for (const item of emailAddresses) {
      const id = `email-${item.toLowerCase()}`;  // Ensure a consistent ID
      await createOrUpdateMenuItem(id, item);
    }

    // Refresh the menu to apply changes
    await browser.menus.refresh();

  } catch (error) {
    console.error("Error finding email addresses:", error);
  }
});

// Add a listener for the menus.onHidden event
browser.menus.onHidden.addListener(async () => {
  // Remove all menu items when the menu is hidden
  await removeAllMenuItems();
});

// Create a context menu item
(async () => {
  try {
    await browser.menus.create({
      id: "my-menu-item",
      title: "Finding email addresses",
      contexts: ["all"]
    });
  } catch (error) {
    console.error(`Failed to create menu item my-menu-item:`, error);
  }
})();

// Function to modify the menu
async function modifyMenu(info, tab) {
  // Refresh the menu to apply changes
  await browser.menus.refresh();
}
