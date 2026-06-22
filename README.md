# emailFinder

A free, open-source Thunderbird extension for quickly extracting and copying email addresses from messages.

## Overview

emailFinder scans message headers and content, removes duplicates, and gives you fast copy actions from a compact menu. It is designed for high-volume email workflows where speed and accuracy matter.

## Highlights

- Extracts addresses from:
  - To
  - Cc
  - From
  - Bcc (in compose windows)
  - Message body
- Deduplicates addresses automatically
- One-click copy actions:
  - Copy All
  - Copy To
  - Copy From
  - Copy Cc
  - Copy To + Cc
  - Copy From + Cc
- Copy any single address directly from the menu
- Shows up to 15 individual addresses in the menu, with a note if more were found
- Works when **reading** a message and when **composing or replying**
- Settings page for exclusions and menu layout
- Case-insensitive filtering logic

## Where It Works

| Context | What gets scanned |
| --- | --- |
| **Inbox / message view** | To, Cc, From, and body of the open message |
| **Compose / reply / forward** | To, Cc, Bcc, From, Reply-To, and body of the draft, plus the original message when replying |

The extension button appears in both the message display toolbar and the compose window toolbar.

## Menu

When you open the extension menu, it scans the current message or compose window and builds a menu like this:

1. **Found N email address(es)** — summary line at the top
2. **Copy actions and/or individual addresses** — order depends on your setting (see below)
3. **Divider**
4. The other group (individual addresses or copy actions)
5. **Divider**
6. **Open Settings** — separated so it is clearly a different kind of action

While the scan is running, the menu briefly shows **Scanning for email addresses...**

If no addresses are found, the menu shows a clear empty-state message instead.

## Why It Helps

- Saves time when triaging or replying to large threads
- Reduces repetitive copy/paste work
- Keeps copied address lists clean and consistent
- Lets you copy just the group you need (To, From, Cc, or combinations)
- Useful when replying and you need addresses from the original thread

## Install

Preferred installation is via Thunderbird Add-ons:

- https://addons.thunderbird.net/en-US/thunderbird/addon/email-address-finder

Install steps:

1. Open the add-on page above.
2. Click Add to Thunderbird.
3. Confirm permissions when prompted.
4. The extension will be available from your Thunderbird toolbar/menu actions.

## Usage

### Reading a message

1. Open a message in your inbox.
2. Click the **eMail Address Finder** toolbar/menu button.
3. Choose a bulk copy action or an individual address.

### Replying or composing

1. Open a compose window (new message, reply, reply all, or forward).
2. Click the **eMail Address Finder** button in the compose toolbar.
3. The extension scans the draft and, for replies, the original message too.
4. Choose a bulk copy action or an individual address.

Copied addresses are placed on the clipboard as a comma-separated list, ready to paste.

## Settings

Open settings from either:

- The extension menu option: **Open Settings**
- Add-ons and Themes → Extensions → eMail Address Finder → Preferences/Options

### Menu layout

Choose where individual email addresses appear in the menu:

- **Below copy actions (default)** — bulk copy buttons first, then individual addresses
- **Above copy actions** — individual addresses first, then bulk copy buttons

### Exclusions

- **Excluded addresses** — specific email addresses to ignore (one per line)
- **Excluded domains** — whole domains to ignore (one per line)

Excluded items are case-insensitive and apply to all copy actions and the address list shown in the menu.

Settings are stored in extension storage and applied automatically. You do not need to restart Thunderbird after saving.

## Permissions

The extension requests these permissions:

- **Read messages** — to scan addresses in open messages
- **Compose** — to scan addresses in reply and compose windows
- **Menus** — to build the extension menu
- **Storage** — to save your settings and exclusions

## Compatibility Notes

- Built for Thunderbird MailExtension APIs (Manifest V3)
- Requires Thunderbird 128.0 or newer
- Current UI is menu-driven and optimized for reliability and speed

## Accessibility

emailFinder helps reduce repetitive mouse/keyboard effort during address collection workflows. It is especially useful for users who process many messages per day.

## Contributing

Issues and pull requests are welcome. If you find an edge case (header format, parsing behavior, filtering), please open an issue with a sample scenario.

## License

This project is free and open source. See [LICENSE](LICENSE).
