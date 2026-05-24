## Purpose
Define subscription behavior and entitlement-based feature access so premium capabilities are clear, enforceable, and user-friendly.

## Requirements

### Requirement: Premium entitlement management
The system SHALL use RevenueCat as the source of truth for premium entitlement state and reflect that state in the app experience.

#### Scenario: User purchases premium
- **WHEN** RevenueCat reports an active premium entitlement
- **THEN** premium-gated features become available in the app

### Requirement: Subscription-gated features
The system SHALL gate premium features including multiple reminders, streak freeze, export, cloud backup or restore, and premium analytics or AI limits.

#### Scenario: Free user accesses a premium feature
- **WHEN** the user attempts a premium-only action without entitlement
- **THEN** the app shows the subscription screen or a clear upgrade path instead of executing the feature

### Requirement: Subscription management surface
The system SHALL provide a subscription screen where users can understand premium value and start or manage an upgrade flow.

#### Scenario: User opens the subscription screen
- **WHEN** the user navigates to premium entry points
- **THEN** the app presents current plan status and available upgrade options
