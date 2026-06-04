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
- Replaced Assistant placeholder with a shared voice/chat assistant flow, multi-turn clarification, confirmation-first action previews, and local AI command history tracking
- Added local Assistant execution for confirmed create, modify, complete, and delete actions in the new unified flow
- Integrated `expo-speech-recognition` and `expo-speech` for live transcript capture, spoken assistant replies, microphone permissions, and voice/chat continuity in Assistant
- Upgraded Assistant into a more open conversational coach/action planner using Gemini for grounded coaching and structured safe previews, with local confirmation-first execution
- Added a Groq Whisper cleanup seam using `whisper-large-v3-turbo` for final voice transcript cleanup after `expo-speech-recognition` live text, pending `EXPO_PUBLIC_GROQ_API_KEY`
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
- Polishing the unified Assistant voice/chat experience and expanding supported safe actions beyond the current first set

## Not Started
- Firestore sync service integration
- RevenueCat-backed purchase and entitlement refresh integration intentionally deferred
- Server-side AI gateway integration for production key protection
- Full app-wide accessibility and contrast audit
- Production privacy policy, terms, support, export, and account deletion implementations

## Repo Notes
- This repo started as a planning workspace and did not contain an app yet
- The app bootstrap and code implementation begin from this milestone
- Expo scaffold was promoted from a temporary bootstrap folder into the repo root
- Current architecture is intentionally local-first; Firebase, RevenueCat, and AI services are deferred until the manual tracking core is stable

## Current Caveats
- Assistant tab now supports a real shared voice/chat conversation loop with live transcript, optional Groq Whisper final cleanup, Gemini coaching/action planning, follow-up clarification, and confirmation-first local actions, but Gemini and Groq are still client-side `EXPO_PUBLIC_*` integrations until a server gateway is added
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
- Connect backend AI intent parsing and server-side tool execution to the Assistant confirmation flow
- Add `EXPO_PUBLIC_GROQ_API_KEY` when ready to enable Whisper final transcript cleanup on native devices that support persisted speech recordings
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
- 2026-05-26: Simplified the auth UI into a minimal Google-or-guest entry screen and removed the email-link sign-in path from the visible auth flow
- 2026-05-28: Reworked the Assistant tab into a chat-bubble UI with quick prompts, safe preview bubbles, local history, and a bottom composer raised above the floating tab bar
- 2026-05-28: Added a fullscreen dark Assistant voice screen launched from the Assistant tab, hiding the bottom nav and showing an animated center bubble, live word-highlight transcript, close control, and bottom mic
- 2026-05-28: Added fullscreen Assistant voice/chat mode toggle, agent response text under recognized speech, and success/failure popups for AI habit command execution
- 2026-05-28: Reworked fullscreen Assistant chat mode to match the dark reference layout with X close, pencil new-chat reset, no model pill, no plus input button, and no overflow menu
- 2026-05-28: Fixed the Assistant tab route conflict so the nav opens the fullscreen Assistant screen directly, hides the bottom tab bar while active, and closes back to Today
- 2026-05-28: Restored a visible path from fullscreen Assistant chat back to voice mode by keeping the voice/chat toggle available in chat and moving new-chat reset into a separate top-right action
- 2026-05-28: Removed the Assistant voice screen's seeded demo transcript, added empty/listening states, kept only live spoken words in the transcript area, and replaced the custom bottom glyph with a proper mic icon
- 2026-06-02: Tightened the Settings screen scale and wired its background, cards, rows, controls, and selected theme state into shared theme tokens so Light, Dark, and AMOLED visibly apply on the screen
- 2026-05-28: Kept spoken user transcript visible above the agent response on the fullscreen Assistant voice screen, added spoken assistant replies via `expo-speech`, and reduced the mic button/icon size
- 2026-05-28: Made fullscreen Assistant voice text ephemeral by auto-clearing the visible user transcript and agent reply about 5 seconds after each update, so the screen resets itself between turns
- 2026-05-28: Smoothed the fullscreen Assistant voice reset with a short fade-out on both transcript and agent reply before they clear
- 2026-05-28: Rebuilt onboarding into a dark swipeable illustration carousel using the new asset images, added 5-second auto-advance with manual swiping, and routed both `Next` and `Sign in` to the auth screen
- 2026-05-30: Rebuilt the Assistant screen into one shared voice/chat assistant with persistent conversation history, live voice transcript, spoken AI replies, clarification loops, and explicit confirmation cards for create/modify/complete/delete actions
- 2026-05-30: Refined the auth screen into a more mobile-native entry experience with stronger hierarchy, benefit chips, clearer Google-vs-guest guidance, and better accessibility/loading/error states
- 2026-05-30: Reworked the auth screen again into a cleaner two-zone mobile composition with a stronger preview panel, segmented habit-mode storytelling, and a more intentional action sheet
- 2026-06-02: Added the Analytics-style weekly trend chart to each individual habit detail screen, scoped to that habit's real schedule and logs with no mocked trend data
- 2026-06-02: Added a native Android HabitAI home-screen widget via `plugins/android-habit-widget`: the picker uses the HabitAI theme/app name and real persisted habits, the compact card renders up to 10 weeks of real habit history, and the tick action writes today's completion log back to the same `habitai-store` AsyncStorage row.
