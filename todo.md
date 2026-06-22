# TODO - Improvements

## Core Features

- [x] **Duplicate Removal**: Implement logic to automatically detect and remove duplicate email addresses from copy operations
- [x] **Menu Options**: Add additional context menu items
  - [x] Copy To (To field only)
  - [x] Copy Cc (Cc field only)
  - [x] Copy To + Cc (combined To and Cc fields)
  - [x] Copy All (all email fields)
  - [x] Copy From (From field only)
  - [x] Copy From + Cc (combined From and Cc fields)
- [x] **Individual Address Menu Items**: Show clickable entries for single addresses (up to 15 shown)
- [x] **Settings/Preferences Page**: Create a proper settings UI for the extension
  - [x] Store user preferences in browser storage
  - [x] Load preferences on extension startup
- [x] **Menu Layout Setting**: Let users choose whether individual addresses appear above or below copy actions
- [x] **Compose Window Support**: Scan addresses in compose, reply, and forward windows via the compose API
- [x] **Scanning Indicator**: Show a "Scanning for email addresses..." message while the menu is loading
- [x] **Contributor PR #4**: Integrate Copy From + Cc request from community pull request

## Filtering & Exclusions

- [x] **Address Filtering**: Allow users to exclude specific email addresses
  - [x] Add, edit, remove addresses in settings
  - [x] Case-insensitive matching
- [x] **Domain Filtering**: Allow users to exclude entire domains
  - [x] Add, edit, remove domains in settings
  - [x] Apply filtering to all copy operations
  - [x] Case-insensitive matching

## Menu UX & Reliability

- [x] **Menu Section Dividers**: Separate copy actions, individual addresses, and settings clearly
- [x] **Settings Menu Separation**: Place Open Settings below its own divider
- [x] **Menu Cleanup**: Use reliable menu removal so old items do not linger
- [x] **Stale Menu Protection**: Ignore outdated menu builds when the menu is opened or closed quickly
- [x] **Empty Results State**: Show a clear message when no addresses are found

## Code Quality & Review Readiness

- [x] **Code Review**: Audit for security vulnerabilities
  - [x] Validate all clipboard operations
  - [x] Ensure no data leaks or unintended access
- [x] **Error Handling**: Add robust error handling for edge cases
- [x] **Manifest Review**: Ensure manifest.json follows Thunderbird guidelines
  - [x] Verify required permissions
  - [x] Check icon sizes and formats
  - [x] Review description and version
- [x] **Documentation**: Update README with feature descriptions and usage
- [x] **Code Comments**: Add plain-language comments to functions for maintainability
- [x] **Testing**: Manual testing across different email scenarios
  - [x] Single email
  - [x] Multiple recipients
  - [x] Mixed To/Cc/From fields
  - [x] Filter edge cases
  - [x] Menu layout setting (top vs bottom)
  - [x] Menu divider and settings placement
  - [x] Compose and reply windows

## Polish & Submission

- [x] **User Experience**: Ensure UI is intuitive and responsive
- [ ] **Accessibility**: Check for accessibility compliance
- [ ] **Final Code Clean-up**: Remove console logs, unused code
- [x] **Version Bump**: Update version for release
- [ ] **Submit to Thunderbird AMO**: Prepare for review
