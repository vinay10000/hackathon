## Purpose
Define how users review past performance through calendar history, streak logic, and simple analytics that stay understandable.

## Requirements

### Requirement: Calendar history
The system SHALL provide a calendar history view with date-level status indicators for completed, missed, skipped, and partial habit outcomes.

#### Scenario: User inspects a prior date
- **WHEN** the user taps a date in the calendar
- **THEN** the app shows the habits and statuses recorded for that day

### Requirement: Streak accuracy
The system SHALL calculate current streak, longest streak, skipped-day behavior, and missed-habit effects according to each habit's configured schedule.

#### Scenario: User skips an allowed day
- **WHEN** a habit is configured to support skipped days without breaking streak rules
- **THEN** the streak result reflects that configuration accurately

### Requirement: Simple performance analytics
The system SHALL show understandable daily, weekly, and monthly analytics including completion percentage, total completions, best-performing habits, and most-missed habits.

#### Scenario: User reviews monthly progress
- **WHEN** the user opens analytics after habit activity has been logged
- **THEN** the app presents updated metrics derived from the latest log data
