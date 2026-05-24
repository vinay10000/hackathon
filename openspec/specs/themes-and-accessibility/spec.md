## Purpose
Define visual theme behavior and accessibility expectations so the app remains readable, consistent, and comfortable across devices and preferences.

## Requirements

### Requirement: Theme selection
The system SHALL support Light, Dark, AMOLED, and System theme preferences and apply theme changes without requiring an app restart.

#### Scenario: User switches to AMOLED theme
- **WHEN** the user selects AMOLED mode in settings
- **THEN** the app immediately applies a true black background theme across screens and modals

### Requirement: AMOLED consistency
The system SHALL preserve readable contrast, habit colors, icons, and progress indicators while using `#000000` as the primary AMOLED background.

#### Scenario: User navigates across the app in AMOLED mode
- **WHEN** the app renders dashboards, cards, tabs, and assistant surfaces
- **THEN** the AMOLED visual treatment remains consistent and readable

### Requirement: Accessible interaction
The system SHALL support screen readers, dynamic font sizes, sufficient contrast, and non-color-only status communication across core app flows.

#### Scenario: User enables larger text and assistive technology
- **WHEN** accessibility settings are active on the device
- **THEN** core screens remain usable without losing essential status information
