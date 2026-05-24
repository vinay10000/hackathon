## Purpose
Define the primary day-to-day habit tracking experience, including the dashboard, logging actions, and safe editing of entries.

## Requirements

### Requirement: Daily dashboard
The system SHALL show today's date, scheduled habits, completion state for each habit, and overall daily completion progress on the dashboard.

#### Scenario: User opens the app on an active day
- **WHEN** habits are scheduled for the current date
- **THEN** the dashboard renders the scheduled list and progress summary in under one second on typical devices

### Requirement: Habit logging actions
The system SHALL support one-tap completion, undo, skip, count updates, duration updates, manual value entry, and note entry for today's habits.

#### Scenario: User logs measurable progress
- **WHEN** the user records count or duration progress for a habit
- **THEN** the app updates the habit log and visible progress immediately

### Requirement: Previous-entry editing
The system SHALL allow users to edit previous habit entries without corrupting the habit's current schedule or log history.

#### Scenario: User edits yesterday's entry
- **WHEN** the user changes a prior day's completion or note
- **THEN** the updated log is saved and dependent streak or analytics data can be recalculated
