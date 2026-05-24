## Purpose
Define the core habit entities and scheduling rules that all tracking, reminders, analytics, and AI flows depend on.

## Requirements

### Requirement: Habit definition
The system SHALL support habit definitions with name, type, category, icon, color, description, motivational note, schedule, target, unit, start date, and optional end date.

#### Scenario: User creates a measurable habit
- **WHEN** the user saves a count-based or duration-based habit
- **THEN** the habit is stored with its target value and unit

### Requirement: Schedule flexibility
The system SHALL support daily, selected weekdays, X times per week, X times per month, and custom interval schedules.

#### Scenario: User sets a custom schedule
- **WHEN** the user configures a non-daily cadence such as every two days
- **THEN** the app calculates future scheduled dates correctly

### Requirement: Habit lifecycle
The system SHALL support create, edit, archive, restore, and delete actions while preserving historical data for archived habits.

#### Scenario: User archives a habit with history
- **WHEN** the user archives an active habit
- **THEN** the habit is removed from active tracking and its prior logs remain available for history and analytics
