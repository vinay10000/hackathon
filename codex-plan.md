# Expo Habit Tracker Full v1 Build Plan

## Summary
Build a production-oriented Expo mobile app for Android first, with iOS compatibility preserved. The app will cover the complete requirements in [requirements(f&nf).md](C:/Users/mhvin/OneDrive/Documents/hackathon/requirements(f&nf).md): manual habit tracking, reminders, streaks, analytics, themes including AMOLED, auth, subscriptions, Firebase sync, and Gemini-powered AI voice/text habit management.

Use `npx create-expo-app@latest` with TypeScript, Expo Router, EAS Build, custom development builds, Firebase, RevenueCat, `expo-notifications`, and `expo-speech-recognition`. Expo Go should not be the target runtime because React Native Firebase and speech recognition require native config/plugins.

## Key Architecture
- App shell: Expo Router with tabs for `Today`, `Calendar`, `Analytics`, `Assistant`, and `Settings`, plus stack screens for onboarding, habit details, add/edit habit, subscription, auth, archive, help, privacy, and terms.
- State/data: local-first app store backed by SQLite or persistent local storage, with Firebase Firestore sync for signed-in users. Manual habit tracking must work offline and queue cloud sync when internet returns.
- Backend: Firebase Auth, Firestore, Cloud Functions, Firebase Analytics, Crashlytics, Remote Config, and Cloud Messaging where needed. Use React Native Firebase in an Expo development build with EAS.
- Premium: RevenueCat manages subscriptions and entitlements. Firestore stores entitlement snapshots for UI gating, while RevenueCat remains the purchase source of truth.
- AI: Gemini runs only on Firebase Cloud Functions. The mobile app sends transcript/text plus minimal habit context to server endpoints; the app never stores Gemini keys.
- Notifications: use `expo-notifications` for local reminders first, with Firebase/Expo push support prepared for cloud-triggered notifications later.
- Voice: use `expo-speech-recognition` with interim transcripts, microphone/speech permissions, editable recognized text, and graceful fallback to text commands.
- Themes: implement a design-token system for Light, Dark, System, and AMOLED. AMOLED uses true black `#000000`, high-contrast text, and consistent styling across screens/modals/tabs/cards.

## Implementation Changes
- Initialize the Expo project with TypeScript, Expo Router, EAS profiles for `development`, `preview`, and `production`, Android package `com.hackathon.habitai`, and app slug `habit-ai`.
- Add native config plugins for React Native Firebase, RevenueCat, notifications, speech recognition, audio/microphone permissions, and Android build properties.
- Define core domain models: `Habit`, `HabitSchedule`, `HabitLog`, `Reminder`, `UserProfile`, `SubscriptionEntitlement`, `AiCommandHistory`, `ThemePreference`, and `SyncOperation`.
- Implement habit logic as pure domain services: schedule matching, completion/skip/undo, count/duration progress, negative habits, missed habits, archive/restore, streaks, streak freezes, completion rates, and calendar status.
- Build onboarding, guest mode, Firebase auth with Google/email first for Android, and keep Apple auth planned for iOS release.
- Build habit CRUD, dashboard, detail page, calendar history, analytics, reminders, settings, profile, subscription, help/feedback, privacy, terms, and delete-account flows.
- Build AI assistant flows for create, modify, delete, archive, restore, complete, skip, count logging, duration logging, note logging, past-entry edits, recommendations, summaries, streak explanations, and motivational messages.
- Require explicit confirmation before any AI create/update/delete/archive/restore/log action writes data. For destructive actions, show the interpreted command, target habit, action preview, and safer alternatives such as archive.
- Store AI command history securely with user-controlled deletion. Minimize transcript/context sent to Gemini and avoid sending personal habit content unless needed for the requested action.
- Add product analytics events without logging personal habit text, and crash reporting with privacy-safe breadcrumbs.

## API And Data Interfaces
- Cloud Function `parseHabitCommand`: input `{ text, userId, locale, currentDate, habitSummaries }`; output structured intent with confidence, missing fields, candidate habit IDs, preview text, and required confirmation level.
- Cloud Function `generateHabitSuggestion`: input `{ goalText, existingHabitTypes, locale }`; output habit templates, realistic target suggestions, and reminder suggestions.
- Cloud Function `summarizeHabitPerformance`: input `{ userId, period }`; output simple weekly/monthly summary, strengths, misses, and supportive next steps.
- Firestore collections: `users`, `habits`, `habitLogs`, `reminders`, `aiCommandHistory`, `syncMetadata`, and `entitlements`.
- Local storage mirrors the same domain shape and uses sync metadata for conflict handling. Last-write-wins is acceptable for v1 except habit logs, which should merge by `habitId + date`.
- RevenueCat entitlement key: `premium`. Premium gates multiple reminders, streak freeze, export, cloud backup/restore, and any premium analytics or AI limits.

## Test Plan
- Unit tests for schedule evaluation, streak calculation, skipped days, negative habits, partial status, timezone/date changes, and analytics aggregation.
- Unit tests for AI intent safety: ambiguous commands, low confidence, multiple habit matches, destructive actions, missing fields, and confirmation requirements.
- Integration tests for local create/edit/delete/archive/log flows, offline persistence, sync queue behavior, Firebase auth state, RevenueCat entitlement state, and notification scheduling.
- UI tests for onboarding, dashboard, habit detail, calendar date tap, analytics, settings, theme switching, AI assistant confirmation, permission-denied states, empty states, and error states.
- Android device verification for microphone permission, speech recognition, local reminders, app restart persistence, offline mode, AMOLED readability, and production EAS build install.
- Performance checks: launch under 3 seconds, dashboard under 1 second, calendar under 2 seconds, habit check-in under 5 seconds, and AI interpreted intent target under 2 seconds when the network/model responds quickly.

## Assumptions
- Build target is full v1 product, Android first, with iOS-compatible architecture but Android release verification first.
- Backend choice is Firebase now: Auth, Firestore, Cloud Functions, Analytics, Crashlytics, Remote Config, and Messaging where needed.
- AI provider is Gemini, accessed only through Firebase Cloud Functions.
- Premium subscriptions use RevenueCat.
- First app language is English; localization architecture should allow Hindi, Spanish, French, German, and Portuguese later.
- Guest mode must be fully usable offline, and account creation should upgrade/sync local data rather than forcing a restart.
- App name/package defaults to `HabitAI`, `habit-ai`, and `com.hackathon.habitai` unless renamed before implementation.
