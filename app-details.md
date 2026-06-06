# HabitAI App Details

Last updated: 2026-06-06
Workspace: `C:\Users\mhvin\OneDrive\Documents\hackathon`

## 1. App Overview

**App name:** HabitAI

**What it is:** HabitAI is a mobile-first habit tracking app designed to make habit creation, daily check-ins, reminders, and coaching feel low-friction. The product direction is calm, minimal, private-by-default, and increasingly voice-driven.

**Core product idea:** Let users create habits quickly, track them consistently, and optionally use AI voice/chat assistance for planning and action execution, while keeping the core habit system usable even without an account.

## 2. Product Positioning

- Calm, minimal habit tracker instead of a noisy productivity or fitness app
- Private-by-default and local-first product direction
- Mobile usage is the primary focus
- Voice interaction is a major differentiator
- Success is defined by helping users sustain habits, not by maximizing app engagement

## 3. Target Users

- People building health, wellness, focus, learning, or break-bad-habit routines
- Users who want low-friction tracking and fast check-ins
- Users who prefer mobile usage over desktop workflows
- Users who may want voice input instead of manual data entry
- Users who care about streaks, reminders, and simple analytics

## 4. Current App Surfaces

Main app routes and screens currently present in the repo:

- `app/onboarding.tsx`
- `app/auth.tsx`
- `app/(tabs)/today.tsx`
- `app/(tabs)/calendar.tsx`
- `app/(tabs)/assistant.tsx`
- `app/(tabs)/settings.tsx`
- `app/habit/new.tsx`
- `app/habit/edit/[id].tsx`
- `app/habit/[id].tsx`
- `app/archive.tsx`
- `app/today-progress.tsx`

## 5. Features Implemented

### 5.1 App shell and navigation

- Expo Router-based app shell is implemented
- Bottom-tab structure exists for Today, Calendar, Analytics/Assistant/Settings app surfaces
- Onboarding and auth entry flow are implemented
- Add-habit action and detail/edit/archive flows are implemented

### 5.2 Habit management

- Create habit manually
- Edit habit manually
- Delete habit manually
- Archive and restore habits
- Habit details page
- Support for habit descriptions, notes, icons, colors, targets, and units
- Scheduling/frequency support for daily and recurring patterns

### 5.3 Daily tracking and logging

- One-tap completion flow
- Skip flow
- Count/duration-style progress logging
- Note capture on logs
- Ability to adjust entries and track progress from detail surfaces
- Today dashboard with progress and scheduled habits

### 5.4 History, streaks, and analytics

- Calendar history view exists
- Habit detail history and streak information exist
- Weekly trend chart exists, including per-habit trend support
- Basic analytics and completion tracking exist
- Analytics are functional but still MVP-level visually

### 5.5 Reminders and notifications

- Local reminders via `expo-notifications`
- Per-habit reminder scheduling exists
- Notification permission request flow exists
- Global reminder preference seam exists
- Reminder UX has been implemented, but complex scheduling behavior still needs refinement

### 5.6 Themes and UI personalization

- Light, Dark, AMOLED, and System themes are implemented
- Theme preference persists locally
- Shared theme tokens are wired into much of the app
- Settings theme controls exist
- AMOLED support is real and intentionally supported across major surfaces

### 5.7 Authentication and session model

- Guest mode exists
- Google Sign-In exists for Android native flow
- Firebase Auth foundation exists
- Email-based auth logic exists in the codebase
- Current visible auth UX is mainly Google-first plus guest-first
- Account/sync state seam exists but full sync is not implemented

### 5.8 AI assistant and voice workflows

- Assistant tab is implemented as a real feature, not a placeholder
- Shared voice/chat assistant flow exists
- Live speech transcript support exists through `expo-speech-recognition`
- Spoken assistant replies exist through `expo-speech`
- Multi-turn clarification exists
- Confirmation-first action previews exist
- Confirmed local AI actions currently cover create, modify, complete, delete, archive, restore, skip, log, and note-oriented flows at varying levels
- Gemini requests are routed through Firebase Cloud Functions
- Groq Whisper transcript cleanup is routed through Firebase Cloud Functions
- AI command history tracking exists locally

### 5.9 Settings, privacy, and data controls

- Settings surface exists
- Profile/session area exists
- Theme settings exist
- Reminder controls exist
- AI controls exist
- Telemetry preference seam exists
- Premium status surface exists
- Help/legal/data section entry points exist
- Local data export seam exists
- Local reset/account deletion flow exists

### 5.10 Android widget

- Native Android home-screen widget exists
- Widget reads from real persisted app data
- Widget can display real habit history
- Widget tick action writes back into the same local store

## 6. Tech Stack

### 6.1 Frontend

- Expo `~56.0.4`
- React `19.2.3`
- React Native `0.85.3`
- Expo Router
- TypeScript

### 6.2 State and persistence

- Zustand for app state
- AsyncStorage for local persistence
- Local-first data model

### 6.3 Native/device capabilities

- `expo-notifications`
- `expo-speech`
- `expo-speech-recognition`
- `expo-haptics`

### 6.4 Auth and backend services

- Firebase Auth
- Firebase Cloud Functions
- Google Sign-In for React Native

### 6.5 Error/crash tooling

- Sentry is configured in the app shell

### 6.6 Platform targets

- Android is clearly the most production-ready target in the current repo
- iOS support exists at the Expo config level, but Android-specific work is more complete
- Web export has been verified, but the app is primarily designed as a mobile product

## 7. Architecture Summary

### 7.1 High-level architecture

- Client app built with Expo Router and React Native
- Local-first habit system centered on persisted Zustand state
- Device-side features for reminders, speech, and local interaction
- Firebase used for auth and callable AI gateways
- AI is integrated as an assistant layer on top of the core manual habit system, not as the only way to operate the app

### 7.2 Important code areas

- App routes: `app/*`
- Core store: `src/store/app-store.ts`
- Habit domain/types: `src/domain/habits.ts`, `src/types/habits.ts`
- Notifications: `src/lib/notifications.ts`, `src/lib/daily-reminder.ts`
- Auth: `src/lib/auth.ts`, `src/lib/firebase.ts`
- AI assistant logic: `src/lib/ai-assistant.ts`, `src/lib/gemini.ts`, `src/lib/whisper.ts`
- Theme system: `src/theme/colors.ts`
- Native widget: `plugins/android-habit-widget/*`
- Backend AI gateway: `functions/index.js`

### 7.3 Architectural qualities

- Local-first core is real
- AI and sync are layered around the core, not tightly coupled to basic tracking
- The codebase already has seams for premium, sync, privacy controls, export, and backend AI growth
- Current architecture is modular enough for iteration, but some features still exist more as seams than complete production systems

## 8. Functional Requirements Status

### 8.1 Clearly implemented or largely implemented

- Onboarding
- Habit CRUD
- Archive/restore
- Daily tracking
- Count/duration progress updates
- Today dashboard
- Habit detail views
- Calendar/history
- Basic streaks and analytics
- Local reminders
- Theme switching including AMOLED
- Guest mode
- Google sign-in
- Settings surface
- AI assistant entry point
- Voice transcript capture
- Confirmation-first AI actions

### 8.2 Partially implemented

- Advanced scheduling edge cases
- Rich analytics depth and polish
- Email account flows as a polished production user journey
- Accessibility coverage across the whole app
- Privacy/legal/support surfaces
- Data export as a finished product feature
- AI breadth and reliability for every listed requirement
- Cross-device sync lifecycle
- Premium feature enforcement

### 8.3 Not implemented or intentionally deferred

- Firestore sync service
- Cloud backup and restore
- RevenueCat or real subscription billing
- Real premium entitlement refresh/validation
- Apple Sign-In
- Production-grade privacy policy and terms implementation
- Production support workflow
- Full backend-driven AI tool execution
- Full app-wide accessibility audit
- Fully polished production-ready analytics and calendar visuals

## 9. Non-Functional Requirements Status

### 9.1 Strongly aligned already

- Offline-first/local persistence direction
- Theme persistence without restart
- Core manual tracking remains usable without AI
- Confirmation before destructive actions
- Archive preserving history
- Modular structure for future expansion
- Mobile responsiveness across major screens

### 9.2 Partially addressed

- Accessibility labels exist in multiple surfaces, but coverage is incomplete
- Error and empty states exist, but quality varies by screen
- Privacy controls exist as settings/data seams, but legal/compliance implementation is incomplete
- Performance is likely acceptable for MVP scope, but there is no formal benchmark evidence in the repo
- Crash tooling exists via Sentry, but production reliability metrics are not documented

### 9.3 Still needs focused work

- Full screen-reader audit
- Dynamic type validation
- Non-color-only state indicators everywhere
- Production privacy/compliance documentation
- Stronger sync conflict/data migration strategy
- Formalized observability and release-quality metrics

## 10. What Is Implemented vs What Is a Seam

### Implemented as real user-facing behavior

- Manual habit tracking flows
- Reminders with local notifications
- Theme switching
- Assistant UI and voice/chat interaction
- Firebase callable AI gateways
- Google auth and guest mode
- Android widget

### Implemented mainly as groundwork/seams

- Premium system
- Sync state model
- Export/legal/help account-management expansion
- Some account-based flows
- Broader AI extensibility

## 11. Key Gaps and Risks

- Sync is not complete, so multi-device continuity is not a finished product capability yet
- Premium exists mostly as local gating structure, not a real business system
- Accessibility is not finished to production standard
- Legal/privacy/support flows are not complete enough for store-ready trust requirements
- Assistant scope is impressive for MVP, but reliability and broader intent coverage still need hardening
- Calendar and analytics are real but still visually/polish-wise below a final production bar
- Google Sign-In may still depend on correct Firebase fingerprints/configuration for some devices

## 12. What Still Needs To Be Done

### Highest priority product work

- Finish Firestore sync architecture and real sync behavior
- Harden reminders for more complex schedules
- Expand assistant action coverage and reliability
- Move more AI/provider logic behind backend seams where appropriate
- Finish accessibility pass across all primary screens
- Complete privacy, terms, support, export, and deletion product surfaces

### Higher priority release work

- Decide the real account strategy for production: guest-only-first, Google-first, or fuller email flows
- Decide whether premium is in-scope for the next release or should stay deferred
- Polish analytics and calendar visuals to match the rest of the app
- Add stronger QA around streak correctness, timezone changes, and reminder scheduling edge cases

### Nice-to-have / later work

- Apple Sign-In
- RevenueCat integration
- Better backup/restore
- More advanced AI summaries and recommendations
- Remote config and safer feature flagging

## 13. OpenSpec / Spec Structure

The repo already contains these feature spec groups:

- `app-shell-and-onboarding`
- `habit-model-and-scheduling`
- `daily-tracking-and-logging`
- `history-streaks-and-analytics`
- `reminders-and-notifications`
- `themes-and-accessibility`
- `settings-privacy-and-quality`
- `local-data-auth-and-sync`
- `premium-and-subscriptions`
- `ai-assistant-and-voice-safety`

These are useful as the intended product blueprint, but current implementation is ahead of some areas and still behind others.

## 14. Recommended Next Execution Order

1. Finish sync architecture and real backend-backed sync behavior.
2. Finish accessibility and non-functional quality gaps on core screens.
3. Harden reminders, streak correctness, and time/date edge cases.
4. Bring legal/privacy/export/support flows to production readiness.
5. Polish analytics/calendar and finalize release-level UI consistency.
6. Decide whether premium and subscriptions are actually part of the next release.
7. Keep expanding AI only after the manual core, trust, and data safety layers are solid.

## 15. Short Honest Summary

HabitAI is already a real, feature-rich MVP with strong local-first habit tracking, reminders, theming, a surprisingly advanced assistant flow, and even an Android widget. The biggest missing pieces are not the core habit experience, but production-hardening layers: sync, accessibility, legal/privacy completeness, premium infrastructure, and broader polish/reliability around advanced AI and analytics.
