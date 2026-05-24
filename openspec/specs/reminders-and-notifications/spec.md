## Purpose
Define reminder scheduling and notification behavior so users receive useful prompts without compromising control or app usability.

## Requirements

### Requirement: Habit reminders
The system SHALL allow users to configure reminder times per habit, disable reminders, and manage global notification behavior.

#### Scenario: User enables a reminder
- **WHEN** the user saves a reminder time for a habit
- **THEN** the app schedules the reminder and reflects its enabled state in the UI

### Requirement: Permission-aware notification setup
The system SHALL explain reminder value before requesting notification permission and handle denied permission gracefully.

#### Scenario: User denies notification permission
- **WHEN** the system does not receive notification permission
- **THEN** the app keeps core tracking usable and shows a clear path to re-enable reminders later

### Requirement: Free and premium reminder limits
The system SHALL support one reminder per habit in the free plan and multiple reminders per habit in the premium plan.

#### Scenario: Free user adds a second reminder
- **WHEN** a non-premium user attempts to save more than one reminder for a habit
- **THEN** the app blocks the save and explains the premium requirement
