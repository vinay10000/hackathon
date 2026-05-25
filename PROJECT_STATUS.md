# Project Status

## Project
- Name: HabitAI
- Workspace: `C:\Users\mhvin\OneDrive\Documents\hackathon`
- Source planning docs:
  - `codex-plan.md`
  - `requirements(f&nf).md`
  - `openspec/specs/*/spec.md`

## Current Build Scope
- Active milestone: Build the first five app feature areas from the OpenSpec base specs
- Interpreted first five feature areas:
  1. App shell and onboarding
  2. Habit model and scheduling
  3. Daily tracking and logging
  4. History, streaks, and analytics
  5. Reminders and notifications

## Completed
- Installed OpenSpec CLI globally in Codex
- Initialized OpenSpec for Codex in this repo
- Created and validated 10 base OpenSpec spec files
- Added this persistent status file for cross-chat continuity
- Bootstrapped Expo Router app foundation in the repo root
- Added local-first app store with persisted habits, logs, onboarding state, and notification permission state
- Implemented app shell with tabs: Today, Calendar, Analytics, Assistant, Settings
- Implemented onboarding and guest-first entry routing
- Implemented habit creation, editing, detail view, archive, restore, and delete flows
- Implemented daily tracking UI with one-tap complete, measurable progress updates, skip, and note capture
- Implemented calendar history and basic analytics views
- Implemented first-pass reminder scheduling with `expo-notifications`
- Added persisted theme preferences with Light, Dark, AMOLED, and System modes
- Added settings surfaces for profile/session, sync status, reminders, AI controls, telemetry privacy, premium status, help, legal, export, and account/data deletion entry points
- Added local-first premium entitlement seam for gating future multiple reminders, streak freeze, export, backup, premium analytics, and AI limits
- Added local-first account/sync seam for guest mode, email session upgrade, queued sync status, and offline-safe persistence
- Added Firebase Auth foundation using `google-services.json`, with Android native Google Sign-In, guest continuation, and a passwordless email-link sign-in flow
- Replaced Assistant placeholder with editable text command previews, confirmation/cancel UX, ambiguity handling, microphone permission state, and local AI command history deletion
- Added local Assistant execution for confirmed complete, skip, archive, restore, delete, note, and measurable log commands
- Integrated `expo-speech-recognition` for microphone permissions, start/stop listening, live transcript capture, speech errors, and typed fallback in Assistant
- Added local data export seam, privacy-safe telemetry helper, and confirmed local data reset/account-deletion flow
- Added delete confirmation for habit detail destructive actions
- Extended AMOLED/theme token support into shared stat cards, empty states, habit cards, and habit creation/edit forms
- Added swipe actions on Today habit rows for archive, edit, and delete
- Refreshed the habit detail screen to match the Today screen's card-heavy visual style
- Refreshed create and edit habit screens with a more native, card-based form flow
- Improved light-theme UI across Today, habit details, and create/edit habit flows
- Added a Today-screen `test2` button that schedules a short burst of local test notifications using the existing habit reminder notification system
- Added a Today-screen `10 habits` test button plus a wider wrapped action row so test controls are easier to tap
- Updated new-habit save flow to return to Today instead of opening habit details
- Verified `npm run typecheck`
- Verified `npx expo export --platform web`
- Verified EAS Android preview APK build with profile `preview`

## In Progress
- Polishing the first five feature areas beyond the initial vertical slice
- Tightening reminder behavior for complex schedules
- Replacing placeholder Assistant content with real AI flows in a later milestone

## Not Started
- Firestore sync service integration
- RevenueCat-backed purchase and entitlement refresh integration intentionally deferred
- Remote AI intent parsing provider integration
- Full app-wide accessibility and contrast audit
- Production privacy policy, terms, support, export, and account deletion implementations

## Repo Notes
- This repo started as a planning workspace and did not contain an app yet
- The app bootstrap and code implementation begin from this milestone
- Expo scaffold was promoted from a temporary bootstrap folder into the repo root
- Current architecture is intentionally local-first; Firebase, RevenueCat, and AI services are deferred until the manual tracking core is stable

## Current Caveats
- Assistant tab is a local safety implementation with `expo-speech-recognition`; it previews, records, and executes supported confirmed local commands, but does not call remote AI services yet
- Reminders are implemented as a first pass and are strongest for daily or weekday habits; more complex schedule-aware reminder behavior still needs refinement
- Theme preference and AMOLED support are implemented across shell, tabs, settings, assistant, shared stat/empty/habit cards, habit detail, and the refreshed create/edit habit forms; analytics and calendar still need final visual polish
- Firebase Auth is wired for Android native Google Sign-In plus passwordless email-link sign-in; this is not a true numeric email OTP flow and may still need finalized authorized-domain/deep-link handling for production polish
- RevenueCat is not needed for the current build; premium remains a local entitlement seam only
- Google Sign-In may require SHA-1/SHA-256 fingerprints added in Firebase and a refreshed `google-services.json` before ID tokens work on-device
- Calendar and analytics are functional but still MVP-level, not fully polished production visuals

## Next Concrete Steps
- Finish tokenizing legacy cards/forms/details so Light, Dark, and AMOLED are consistent everywhere
- Add Firestore sync and Cloud Functions seams
- Keep premium checks local for now; do not add RevenueCat until subscriptions become a real release target
- Connect backend AI intent parsing to the Assistant confirmation flow
- Add focused accessibility labels, dynamic-type checks, and non-color-only status labels across habit cards and analytics

## Last Updated
- 2026-05-24: Created status tracker and began app bootstrap plus first-five-feature implementation
- 2026-05-24: Shipped initial Expo app vertical slice for shell, onboarding, habit CRUD, daily tracking, history/analytics, and reminders
- 2026-05-24: Added later-spec foundations for themes/AMOLED, settings/privacy, local auth/sync, premium gating, and AI command safety scaffolding
- 2026-05-24: Completed a broader local-first feature pass for assistant command execution, export/reset privacy flows, destructive-action confirmations, and theme-token coverage
- 2026-05-24: Added Expo speech recognition to Assistant with live editable transcription and permission/error handling
- 2026-05-24: Added Firebase Auth with Email/Password and Android native Google Sign-In wiring
- 2026-05-24: Created and linked EAS project, configured preview APK builds, and produced a native Android preview APK
- 2026-05-25: Added Today-screen swipe actions and restyled habit detail to match the newer Today UI language
- 2026-05-25: Reworked create and edit habit flows into native-feeling card layouts with a shared mobile-first habit form
- 2026-05-25: Rebalanced light-theme styling for Today, habit details, and create/edit screens away from dark-card treatments
- 2026-05-25: Added a Today-screen `test2` notification burst trigger wired through the existing `expo-notifications` reminder path
- 2026-05-25: Added a Today-screen `10 habits` seed action and fixed cramped test-button tap targets with a wrapped full-width action row
- 2026-05-25: Changed new habit creation to route back to Today instead of opening the habit detail screen
- 2026-05-25: Tightened the Analytics weekly trend card on narrow screens so the range chip, last data label, and footer day pills no longer crowd the card edges
- 2026-05-25: Increased the Analytics weekly trend footer height budget so the weekday/date pills stay inside the card instead of spilling below the chart on-device
- 2026-05-25: Fixed Analytics weekly trend so past logged completions still appear in the 7-day chart instead of dropping out when flexible schedules like times-per-week or times-per-month are later satisfied
- 2026-05-25: Upgraded the Analytics 7-day range picker with quick jump chips, recent/weekly/all filters, and per-window completion previews so browsing past trend windows is faster and clearer
- 2026-05-25: Made the Analytics weekly trend range picker behave like a draggable bottom sheet, so it can be pulled up slightly and swiped down to dismiss from the handle area
- 2026-05-25: Rebuilt auth to match the new branded mockup direction, replaced the Apple slot with guest continuation, and switched email auth to Firebase passwordless email-link sign-in with manual link fallback
- 2026-05-25: Replaced the old onboarding form with a branded image-led welcome screen using `assets/images/onboarding-1.png`, and fixed first-run routing so onboarding shows before auth
