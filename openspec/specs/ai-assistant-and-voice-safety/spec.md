## Purpose
Define the AI assistant experience for text and voice habit management, with strong confirmation, privacy, and failure-safety requirements.

## Requirements

### Requirement: AI command input modes
The system SHALL support AI-assisted habit commands through voice and text, show recognized or interpreted text, and allow the user to edit it before execution.

#### Scenario: Speech recognition succeeds with minor errors
- **WHEN** the app captures spoken input
- **THEN** the recognized text is shown for review and can be edited before any action is applied

### Requirement: AI action coverage
The system SHALL support AI-assisted create, modify, delete, archive, restore, complete, skip, measurable logging, note logging, past-entry edits, summaries, recommendations, and motivational assistance.

#### Scenario: User asks the assistant to log a habit
- **WHEN** the assistant identifies a supported habit-management intent
- **THEN** the app produces an action preview with the interpreted target and requested change

### Requirement: Confirmation and ambiguity safety
The system SHALL require explicit confirmation before any AI-driven create, update, delete, archive, restore, or logging action writes data, and it SHALL ask for clarification when intent is ambiguous or risky.

#### Scenario: User issues a destructive or ambiguous command
- **WHEN** the assistant has low confidence or the action is destructive
- **THEN** the app blocks execution until the user confirms or clarifies the intent

### Requirement: AI privacy and resilience
The system SHALL keep provider keys out of the mobile client, minimize habit data sent for AI processing, store AI command history securely, and ensure AI failures do not break manual tracking flows.

#### Scenario: AI service or transcription fails
- **WHEN** speech recognition or remote intent processing does not succeed
- **THEN** the app shows a recoverable error state and preserves access to manual habit management
