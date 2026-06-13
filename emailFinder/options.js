const DEFAULT_SETTINGS = {
  addressBlacklist: [],
  domainBlacklist: [],
  individualEmailsPosition: "bottom"
};

const addressBlacklistTextarea = document.getElementById('addressBlacklist');
const domainBlacklistTextarea = document.getElementById('domainBlacklist');
const individualEmailsPositionInputs = document.querySelectorAll('input[name="individualEmailsPosition"]');
const saveButton = document.getElementById('saveButton');
const resetButton = document.getElementById('resetButton');
const statusMessage = document.getElementById('statusMessage');

// Sets which radio button is selected for the "where should individual emails appear" setting.
function setIndividualEmailsPosition(value) {
  const position = value === "top" ? "top" : "bottom";
  for (const input of individualEmailsPositionInputs) {
    input.checked = input.value === position;
  }
}

// Reads saved settings from storage and fills the settings page with the user's current choices.
async function loadSettings() {
  try {
    const result = await browser.storage.sync.get(DEFAULT_SETTINGS);
    addressBlacklistTextarea.value = result.addressBlacklist.join('\n');
    domainBlacklistTextarea.value = result.domainBlacklist.join('\n');
    setIndividualEmailsPosition(result.individualEmailsPosition);
  } catch (error) {
    console.error('Failed to load settings:', error);
    showStatus('Failed to load settings', 'error');
  }
}

// Turns the text from a settings box into a clean list of values, one item per line.
// Extra spaces are removed and everything is converted to lowercase for easier matching.
function parseBlacklist(text) {
  return text
    .split('\n')
    .map(line => line.trim().toLowerCase())
    .filter(line => line.length > 0);
}

// Reads which menu layout option the user has selected on the settings page.
function getSelectedIndividualEmailsPosition() {
  const selected = document.querySelector('input[name="individualEmailsPosition"]:checked');
  return selected && selected.value === "top" ? "top" : "bottom";
}

// Saves everything on the settings page so the extension can use it later.
async function saveSettings() {
  try {
    const settings = {
      addressBlacklist: parseBlacklist(addressBlacklistTextarea.value),
      domainBlacklist: parseBlacklist(domainBlacklistTextarea.value),
      individualEmailsPosition: getSelectedIndividualEmailsPosition()
    };

    await browser.storage.sync.set(settings);
    showStatus('Settings saved successfully', 'success');

    setTimeout(() => {
      statusMessage.classList.remove('success');
    }, 3000);
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('Failed to save settings', 'error');
  }
}

// Puts all settings back to their original default values after the user confirms.
async function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    try {
      await browser.storage.sync.set(DEFAULT_SETTINGS);
      addressBlacklistTextarea.value = '';
      domainBlacklistTextarea.value = '';
      setIndividualEmailsPosition(DEFAULT_SETTINGS.individualEmailsPosition);
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

// Shows a short success or error message at the bottom of the settings page.
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

saveButton.addEventListener('click', saveSettings);
resetButton.addEventListener('click', resetSettings);

document.addEventListener('DOMContentLoaded', loadSettings);
