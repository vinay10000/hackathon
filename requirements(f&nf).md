"Below is the updated list with **AI voice features added** for creating, modifying, deleting, searching, and logging habits. All Functional and Non-Functional Requirements have **High** priority.

---

# Functional Requirements / Features

| ID     | Requirement / Feature                                                                                 | Priority |
| ------ | ----------------------------------------------------------------------------------------------------- | -------- |
| FR-001 | User can complete onboarding                                                                          | High     |
| FR-002 | User can create a habit manually                                                                      | High     |
| FR-003 | User can edit a habit manually                                                                        | High     |
| FR-004 | User can delete a habit manually                                                                      | High     |
| FR-005 | User can archive a habit                                                                              | High     |
| FR-006 | User can restore an archived habit                                                                    | High     |
| FR-007 | User can mark a habit as complete                                                                     | High     |
| FR-008 | User can undo habit completion                                                                        | High     |
| FR-009 | User can mark a habit as skipped                                                                      | High     |
| FR-010 | User can view missed habits                                                                           | High     |
| FR-011 | User can track yes/no habits                                                                          | High     |
| FR-012 | User can track count-based habits                                                                     | High     |
| FR-013 | User can track duration-based habits                                                                  | High     |
| FR-014 | User can track negative habits                                                                        | High     |
| FR-015 | User can set habit frequency as daily                                                                 | High     |
| FR-016 | User can set habit frequency for specific weekdays                                                    | High     |
| FR-017 | User can set habit frequency as X times per week                                                      | High     |
| FR-018 | User can set habit frequency as X times per month                                                     | High     |
| FR-019 | User can set custom interval frequency, such as every 2 days                                          | High     |
| FR-020 | User can set habit start date                                                                         | High     |
| FR-021 | User can set optional habit end date                                                                  | High     |
| FR-022 | User can select habit category                                                                        | High     |
| FR-023 | User can filter habits by category                                                                    | High     |
| FR-024 | User can select habit icon                                                                            | High     |
| FR-025 | User can select habit color                                                                           | High     |
| FR-026 | User can add habit description                                                                        | High     |
| FR-027 | User can add motivational note to a habit                                                             | High     |
| FR-028 | User can set target value for count or duration habits                                                | High     |
| FR-029 | User can set unit for measurable habits, such as glasses, pages, or minutes                           | High     |
| FR-030 | User can view today’s habit dashboard                                                                 | High     |
| FR-031 | User can view current date on dashboard                                                               | High     |
| FR-032 | User can view daily completion percentage                                                             | High     |
| FR-033 | User can view habits scheduled for today                                                              | High     |
| FR-034 | User can view completion status of each habit                                                         | High     |
| FR-035 | User can complete a habit with one tap                                                                | High     |
| FR-036 | User can increment and decrement count-based habits                                                   | High     |
| FR-037 | User can manually enter count value                                                                   | High     |
| FR-038 | User can manually enter duration value                                                                | High     |
| FR-039 | User can add notes to a habit log                                                                     | High     |
| FR-040 | User can edit today’s habit entry                                                                     | High     |
| FR-041 | User can edit previous habit entries                                                                  | High     |
| FR-042 | User can view habit detail page                                                                       | High     |
| FR-043 | User can view current streak for each habit                                                           | High     |
| FR-044 | User can view longest streak for each habit                                                           | High     |
| FR-045 | User can view habit completion rate                                                                   | High     |
| FR-046 | User can view calendar heatmap for a habit                                                            | High     |
| FR-047 | User can view recent notes for a habit                                                                | High     |
| FR-048 | User can view weekly habit performance                                                                | High     |
| FR-049 | User can view monthly habit performance                                                               | High     |
| FR-050 | User can view calendar history                                                                        | High     |
| FR-051 | User can view monthly calendar                                                                        | High     |
| FR-052 | User can tap a date to view habits for that day                                                       | High     |
| FR-053 | User can view completed, missed, skipped, and partial status indicators                               | High     |
| FR-054 | User can view overall daily completion score                                                          | High     |
| FR-055 | User can set habit reminders                                                                          | High     |
| FR-056 | User can set one reminder per habit in free plan                                                      | High     |
| FR-057 | User can set multiple reminders per habit in premium plan                                             | High     |
| FR-058 | User can select reminder time                                                                         | High     |
| FR-059 | User can disable reminders per habit                                                                  | High     |
| FR-060 | User can manage global notification settings                                                          | High     |
| FR-061 | App can send push/local notifications                                                                 | High     |
| FR-062 | App requests notification permission after explaining reminder value                                  | High     |
| FR-063 | User can view milestone celebrations                                                                  | High     |
| FR-064 | App can show encouraging messages after missed habits                                                 | High     |
| FR-065 | App can calculate streaks based on habit schedule                                                     | High     |
| FR-066 | App can support skipped days without breaking streak when configured                                  | High     |
| FR-067 | User can use streak freeze in premium plan                                                            | High     |
| FR-068 | User can view basic analytics                                                                         | High     |
| FR-069 | User can view daily completion percentage analytics                                                   | High     |
| FR-070 | User can view weekly completion percentage analytics                                                  | High     |
| FR-071 | User can view monthly completion percentage analytics                                                 | High     |
| FR-072 | User can view total completions                                                                       | High     |
| FR-073 | User can view best-performing habit                                                                   | High     |
| FR-074 | User can view most missed habit                                                                       | High     |
| FR-075 | User can use app without creating an account                                                          | High     |
| FR-076 | User can sign in with Google                                                                          | High     |
| FR-077 | User can sign in with Apple                                                                           | High     |
| FR-078 | User can sign in with email                                                                           | High     |
| FR-079 | User can use guest mode                                                                               | High     |
| FR-080 | User can sync data across devices in future/premium version                                           | High     |
| FR-081 | User can back up and restore data in future/premium version                                           | High     |
| FR-082 | User can switch between light mode and dark mode                                                      | High     |
| FR-083 | User can enable full pitch-black AMOLED dark theme                                                    | High     |
| FR-084 | User can set AMOLED theme as the default app theme                                                    | High     |
| FR-085 | App can automatically follow system theme settings                                                    | High     |
| FR-086 | User can manually choose Light, Dark, AMOLED, or System Default theme                                 | High     |
| FR-087 | App applies AMOLED theme across all screens, modals, cards, tabs, and settings                        | High     |
| FR-088 | App uses true black background `#000000` for AMOLED theme                                             | High     |
| FR-089 | App uses readable high-contrast text colors in AMOLED theme                                           | High     |
| FR-090 | App preserves habit colors, icons, and progress indicators in AMOLED theme                            | High     |
| FR-091 | User can view empty states when no data exists                                                        | High     |
| FR-092 | User can view error messages when actions fail                                                        | High     |
| FR-093 | User can export habit data in premium/future version                                                  | High     |
| FR-094 | User can access subscription screen                                                                   | High     |
| FR-095 | User can upgrade to premium                                                                           | High     |
| FR-096 | User can access settings screen                                                                       | High     |
| FR-097 | User can manage profile settings                                                                      | High     |
| FR-098 | User can manage theme settings                                                                        | High     |
| FR-099 | User can access help and feedback                                                                     | High     |
| FR-100 | User can access privacy policy                                                                        | High     |
| FR-101 | User can access terms of service                                                                      | High     |
| FR-102 | User can delete account and data in account-based version                                             | High     |
| FR-103 | Admin/backend can validate subscription status in future version                                      | High     |
| FR-104 | App can track product analytics events                                                                | High     |
| FR-105 | App can capture crash reports                                                                         | High     |
| FR-106 | App can support remote configuration in future version                                                | High     |
| FR-107 | User can use AI voice command to create a new habit                                                   | High     |
| FR-108 | User can speak a natural-language habit request, such as “Remind me to drink water 8 times every day” | High     |
| FR-109 | AI can extract habit name, frequency, target, unit, reminder time, and habit type from voice input    | High     |
| FR-110 | AI can ask a follow-up question when required habit details are missing                               | High     |
| FR-111 | AI can show a confirmation preview before creating a habit                                            | High     |
| FR-112 | User can approve or cancel an AI-created habit before saving                                          | High     |
| FR-113 | User can use AI voice command to modify an existing habit                                             | High     |
| FR-114 | User can say commands like “Change my reading habit to 30 minutes every night”                        | High     |
| FR-115 | AI can identify the correct habit from the user’s spoken command                                      | High     |
| FR-116 | AI can ask the user to choose when multiple habits match the spoken command                           | High     |
| FR-117 | AI can update habit name, target, frequency, reminder, category, icon, color, start date, or end date | High     |
| FR-118 | AI can show a confirmation preview before modifying an existing habit                                 | High     |
| FR-119 | User can approve or cancel an AI habit modification before saving                                     | High     |
| FR-120 | User can use AI voice command to delete a habit                                                       | High     |
| FR-121 | User can say commands like “Delete my smoking habit tracker” or “Remove my gym habit”                 | High     |
| FR-122 | AI can require explicit confirmation before deleting a habit                                          | High     |
| FR-123 | AI can suggest archiving instead of deleting when historical data exists                              | High     |
| FR-124 | User can use AI voice command to archive a habit                                                      | High     |
| FR-125 | User can use AI voice command to restore an archived habit                                            | High     |
| FR-126 | User can use AI voice command to mark a habit as complete                                             | High     |
| FR-127 | User can say commands like “I completed meditation today”                                             | High     |
| FR-128 | User can use AI voice command to log count-based progress                                             | High     |
| FR-129 | User can say commands like “I drank 5 glasses of water”                                               | High     |
| FR-130 | User can use AI voice command to log duration-based progress                                          | High     |
| FR-131 | User can say commands like “I read for 20 minutes today”                                              | High     |
| FR-132 | User can use AI voice command to skip a habit                                                         | High     |
| FR-133 | User can use AI voice command to add a note to a habit log                                            | High     |
| FR-134 | User can use AI voice command to edit past habit entries                                              | High     |
| FR-135 | User can say commands like “Mark yesterday’s workout as completed”                                    | High     |
| FR-136 | User can use AI text command as an alternative to voice command                                       | High     |
| FR-137 | User can access AI assistant from dashboard, add habit screen, habit detail screen, and settings      | High     |
| FR-138 | AI can recommend habit templates based on user goals                                                  | High     |
| FR-139 | AI can suggest realistic targets based on habit type                                                  | High     |
| FR-140 | AI can suggest better reminders based on user schedule and past behavior                              | High     |
| FR-141 | AI can summarize weekly habit performance in simple language                                          | High     |
| FR-142 | AI can explain why a streak changed after editing or missing a habit                                  | High     |
| FR-143 | AI can generate motivational messages based on user progress                                          | High     |
| FR-144 | AI can help the user break down large goals into smaller habits                                       | High     |
| FR-145 | AI can detect ambiguous or risky commands and request confirmation                                    | High     |
| FR-146 | AI can support hands-free habit management where allowed by device permissions                        | High     |
| FR-147 | User can enable or disable AI features from settings                                                  | High     |
| FR-148 | User can manage microphone permission for AI voice commands                                           | High     |
| FR-149 | User can view AI command history                                                                      | High     |
| FR-150 | User can delete AI command history                                                                    | High     |
| FR-151 | App can prevent AI from deleting or changing data without user confirmation                           | High     |
| FR-152 | App can handle failed speech recognition gracefully                                                   | High     |
| FR-153 | App can show interpreted text after voice recognition                                                 | High     |
| FR-154 | App can allow user to edit interpreted AI command before execution                                    | High     |
| FR-155 | App can support AI commands in AMOLED theme consistently                                              | High     |

---

# Non-Functional Requirements

| ID      | Requirement                                                                                                        | Priority |
| ------- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| NFR-001 | App launch time should be under 3 seconds                                                                          | High     |
| NFR-002 | Home dashboard should load under 1 second                                                                          | High     |
| NFR-003 | Calendar view should load under 2 seconds                                                                          | High     |
| NFR-004 | Habit completion action should feel instant                                                                        | High     |
| NFR-005 | Habit check-in should take less than 5 seconds                                                                     | High     |
| NFR-006 | Habit creation should be possible in under 60 seconds                                                              | High     |
| NFR-007 | Onboarding should be completed in less than 2 minutes                                                              | High     |
| NFR-008 | App should work offline                                                                                            | High     |
| NFR-009 | Habit logs should not be lost                                                                                      | High     |
| NFR-010 | Local data should persist after app restart                                                                        | High     |
| NFR-011 | App should sync once internet is available in future cloud version                                                 | High     |
| NFR-012 | User data should be stored securely                                                                                | High     |
| NFR-013 | Sensitive preferences should use encrypted storage where required                                                  | High     |
| NFR-014 | App should not share personal habit data without user consent                                                      | High     |
| NFR-015 | App should not sell user data                                                                                      | High     |
| NFR-016 | App should clearly explain data usage                                                                              | High     |
| NFR-017 | App should support account and data deletion in account-based version                                              | High     |
| NFR-018 | App should support screen readers                                                                                  | High     |
| NFR-019 | App should support dynamic font sizes                                                                              | High     |
| NFR-020 | App should maintain sufficient color contrast                                                                      | High     |
| NFR-021 | App should not rely only on color to indicate habit status                                                         | High     |
| NFR-022 | App should support light and dark themes                                                                           | High     |
| NFR-023 | App should support full pitch-black AMOLED dark theme                                                              | High     |
| NFR-024 | AMOLED theme should use true black `#000000` as the primary background                                             | High     |
| NFR-025 | AMOLED theme should minimize gray surfaces and avoid washed-out dark backgrounds                                   | High     |
| NFR-026 | AMOLED theme should improve readability in low-light conditions                                                    | High     |
| NFR-027 | AMOLED theme should maintain accessible contrast for text, icons, buttons, and status indicators                   | High     |
| NFR-028 | AMOLED theme should be applied consistently across all screens and components                                      | High     |
| NFR-029 | AMOLED theme should reduce battery usage on OLED/AMOLED devices where supported by hardware                        | High     |
| NFR-030 | Theme switching should not require app restart                                                                     | High     |
| NFR-031 | Theme preference should persist after app restart                                                                  | High     |
| NFR-032 | Theme changes should not affect habit data, reminders, streaks, or analytics                                       | High     |
| NFR-033 | MVP language should be English                                                                                     | High     |
| NFR-034 | Future localization should support Hindi, Spanish, French, German, and Portuguese                                  | High     |
| NFR-035 | App should be responsive across common mobile screen sizes                                                         | High     |
| NFR-036 | App should support iOS and Android                                                                                 | High     |
| NFR-037 | App should handle timezone changes correctly                                                                       | High     |
| NFR-038 | App should handle manual phone date changes gracefully                                                             | High     |
| NFR-039 | App should handle notification permission denied state                                                             | High     |
| NFR-040 | App should avoid excessive notifications                                                                           | High     |
| NFR-041 | App should allow users to control reminders                                                                        | High     |
| NFR-042 | Streak calculations should be accurate                                                                             | High     |
| NFR-043 | Analytics should update after every habit log                                                                      | High     |
| NFR-044 | Analytics should be simple and easy to understand                                                                  | High     |
| NFR-045 | Deleted habits should require confirmation                                                                         | High     |
| NFR-046 | Archived habits should retain historical data                                                                      | High     |
| NFR-047 | Critical actions should show clear success or failure feedback                                                     | High     |
| NFR-048 | Crash-free session rate should be above 99%                                                                        | High     |
| NFR-049 | App should have graceful empty states                                                                              | High     |
| NFR-050 | App should have graceful error states                                                                              | High     |
| NFR-051 | App should use simple, friendly, and positive language                                                             | High     |
| NFR-052 | App should avoid guilt-based messaging                                                                             | High     |
| NFR-053 | App should be scalable for future cloud sync and premium features                                                  | High     |
| NFR-054 | App should protect subscription-only features from unauthorized access                                             | High     |
| NFR-055 | App should be maintainable with modular architecture                                                               | High     |
| NFR-056 | App should support product analytics without exposing personal habit content                                       | High     |
| NFR-057 | App should comply with app store privacy requirements                                                              | High     |
| NFR-058 | App should support backup and restore in future versions                                                           | High     |
| NFR-059 | App should handle no internet connection gracefully                                                                | High     |
| NFR-060 | App should support safe data migration during app updates                                                          | High     |
| NFR-061 | AI voice command response should feel fast and return interpreted intent within 2 seconds when possible            | High     |
| NFR-062 | AI habit creation should not save data without explicit user confirmation                                          | High     |
| NFR-063 | AI habit modification should not update data without explicit user confirmation                                    | High     |
| NFR-064 | AI habit deletion should always require explicit confirmation                                                      | High     |
| NFR-065 | AI should clearly show what action it is about to perform before executing it                                      | High     |
| NFR-066 | AI should handle ambiguous commands safely by asking a clarification question                                      | High     |
| NFR-067 | AI should avoid destructive actions when confidence is low                                                         | High     |
| NFR-068 | AI should support fallback text input when speech recognition fails                                                | High     |
| NFR-069 | AI should show the recognized speech text before executing habit-related actions                                   | High     |
| NFR-070 | AI should allow the user to edit recognized text before confirmation                                               | High     |
| NFR-071 | AI voice features should respect device microphone permissions                                                     | High     |
| NFR-072 | AI voice features should work only after user grants microphone permission                                         | High     |
| NFR-073 | AI command history should be stored securely                                                                       | High     |
| NFR-074 | User should be able to delete AI command history                                                                   | High     |
| NFR-075 | AI features should not expose personal habit data to third parties without consent                                 | High     |
| NFR-076 | AI should minimize collection of voice and habit data                                                              | High     |
| NFR-077 | AI processing should comply with privacy policy and app store rules                                                | High     |
| NFR-078 | AI should support clear error states for failed transcription, failed intent detection, or failed action execution | High     |
| NFR-079 | AI-generated suggestions should be understandable and editable by the user                                         | High     |
| NFR-080 | AI should not create medical, legal, or financial claims from user habit data                                      | High     |
| NFR-081 | AI motivational messages should be supportive and non-judgmental                                                   | High     |
| NFR-082 | AI commands should work consistently in Light, Dark, and AMOLED themes                                             | High     |
| NFR-083 | AI interface should be accessible with screen readers and dynamic font sizes                                       | High     |
| NFR-084 | AI voice command feature should support noisy-environment failure handling                                         | High     |
| NFR-085 | AI should support multiple common phrasing patterns for habit commands                                             | High     |
| NFR-086 | AI should preserve user trust by making all irreversible actions transparent                                       | High     |
| NFR-087 | AI features should be modular so they can be enabled, disabled, or upgraded independently                          | High     |
| NFR-088 | AI-related failures should not break core manual habit tracking                                                    | High     | "
