# TODO - Improvements

## Core Features

- [x] **Duplicate Removal**: Implement logic to automatically detect and remove duplicate email addresses from copy operations
- [x] **Menu Options**: Add additional context menu items
  - [x] Copy To (To field only)
  - [x] Copy Cc (Cc field only)
  - [x] Copy To + Cc (combined To and Cc fields)
  - [x] Copy All (all email fields)
- [x] **Settings/Preferences Page**: Create a proper settings UI for the extension
  - [x] Store user preferences in browser storage
  - [x] Load preferences on extension startup

## Filtering & Exclusions

- [x] **Address Filtering**: Allow users to exclude specific email addresses
  - [x] Add, edit, remove addresses in settings
  - [x] Case-insensitive matching
- [x] **Domain Filtering**: Allow users to exclude entire domains
  - [x] Add, edit, remove domains in settings
  - [x] Apply filtering to all copy operations
  - [x] Case-insensitive matching

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
- [ ] **Testing**: Manual testing across different email scenarios
  - [ ] Single email
  - [ ] Multiple recipients
  - [ ] Mixed To/Cc/Bcc fields
  - [ ] Filter edge cases

## Polish & Submission

- [ ] **User Experience**: Ensure UI is intuitive and responsive
- [ ] **Accessibility**: Check for accessibility compliance
- [ ] **Final Code Clean-up**: Remove console logs, unused code
- [ ] **Version Bump**: Update version for release
- [ ] **Submit to Thunderbird AMO**: Prepare for review

