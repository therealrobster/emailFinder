// Default settings
const DEFAULT_SETTINGS = {
  addressBlacklist: [],
  domainBlacklist: []
};

// DOM elements
const addressBlacklistTextarea = document.getElementById('addressBlacklist');
const domainBlacklistTextarea = document.getElementById('domainBlacklist');
const saveButton = document.getElementById('saveButton');
const resetButton = document.getElementById('resetButton');
const statusMessage = document.getElementById('statusMessage');

/**
 * Load settings from storage and populate the form
 */
async function loadSettings() {
  try {
    const result = await browser.storage.sync.get(DEFAULT_SETTINGS);
    addressBlacklistTextarea.value = result.addressBlacklist.join('\n');
    domainBlacklistTextarea.value = result.domainBlacklist.join('\n');
  } catch (error) {
    console.error('Failed to load settings:', error);
    showStatus('Failed to load settings', 'error');
  }
}

/**
 * Parse textarea content into an array of normalized values
 */
function parseBlacklist(text) {
  return text
    .split('\n')
    .map(line => line.trim().toLowerCase())
    .filter(line => line.length > 0);
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    const settings = {
      addressBlacklist: parseBlacklist(addressBlacklistTextarea.value),
      domainBlacklist: parseBlacklist(domainBlacklistTextarea.value)
    };

    await browser.storage.sync.set(settings);
    showStatus('Settings saved successfully', 'success');
    
    // Clear message after 3 seconds
    setTimeout(() => {
      statusMessage.classList.remove('success');
    }, 3000);
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('Failed to save settings', 'error');
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    try {
      await browser.storage.sync.set(DEFAULT_SETTINGS);
      addressBlacklistTextarea.value = '';
      domainBlacklistTextarea.value = '';
      showStatus('Settings reset to defaults', 'success');
      
      setTimeout(() => {
        statusMessage.classList.remove('success');
      }, 3000);
    } catch (error) {
      console.error('Failed to reset settings:', error);
      showStatus('Failed to reset settings', 'error');
    }
  }
}

/**
 * Display status message to user
 */
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

// Event listeners
saveButton.addEventListener('click', saveSettings);
resetButton.addEventListener('click', resetSettings);

// Load settings when the page opens
document.addEventListener('DOMContentLoaded', loadSettings);
