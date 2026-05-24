## Purpose
Define the navigation shell and first-run experience so the app has a stable entry flow for onboarding, guest access, and the main mobile surfaces.

## Requirements

### Requirement: App shell navigation
The system SHALL provide a mobile app shell with primary tabs for Today, Calendar, Analytics, Assistant, and Settings, plus stack-based navigation for onboarding, authentication, habit details, add or edit habit, subscription, archive, help, privacy, and terms.

#### Scenario: User opens the app after installation
- **WHEN** the app launches successfully
- **THEN** the user sees the correct initial route for onboarding or the main app shell

### Requirement: Onboarding completion
The system SHALL guide first-time users through onboarding in under two minutes and explain the value of reminders, themes, AI assistance, and guest mode before entering the main app.

#### Scenario: New user completes onboarding
- **WHEN** a first-time user progresses through onboarding
- **THEN** the app stores onboarding completion and routes the user into the appropriate next flow

### Requirement: Guest-first entry
The system SHALL allow users to continue in guest mode without requiring account creation and preserve access to core manual habit tracking features.

#### Scenario: User skips account creation
- **WHEN** the user chooses guest mode
- **THEN** the app opens the main habit experience without blocking on sign-in
