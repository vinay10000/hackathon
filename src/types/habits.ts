export type HabitKind = 'yesNo' | 'count' | 'duration' | 'negative';

export type HabitSchedule =
  | { kind: 'daily' }
  | { kind: 'weekdays'; weekdays: number[] }
  | { kind: 'timesPerWeek'; count: number }
  | { kind: 'timesPerMonth'; count: number }
  | { kind: 'interval'; everyDays: number };

export type HabitReminder = {
  id: string;
  time: string;
  enabled: boolean;
  notificationIds: string[];
};

export type Habit = {
  id: string;
  name: string;
  kind: HabitKind;
  category: string;
  icon: string;
  color: string;
  description: string;
  motivationalNote: string;
  targetValue?: number;
  unit?: string;
  schedule: HabitSchedule;
  startDate: string;
  endDate?: string;
  reminders: HabitReminder[];
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type HabitLogStatus = 'pending' | 'completed' | 'partial' | 'skipped' | 'missed';

export type HabitLog = {
  id: string;
  habitId: string;
  date: string;
  value?: number;
  note?: string;
  status: HabitLogStatus;
  completedAt?: string;
  updatedAt: string;
};

export type ThemePreference = 'system' | 'light' | 'dark' | 'amoled';

export type UserSession = {
  mode: 'guest' | 'email' | 'google' | 'apple';
  uid?: string;
  email?: string;
  displayName?: string;
  syncStatus: 'local-only' | 'queued' | 'synced' | 'error';
};

export type PremiumState = {
  entitlement: 'free' | 'premium';
  provider: 'local-placeholder' | 'revenuecat';
};

export type AiCommandHistoryItem = {
  id: string;
  input: string;
  interpretedText: string;
  intent: 'create' | 'modify' | 'delete' | 'archive' | 'restore' | 'complete' | 'skip' | 'log' | 'note' | 'summary' | 'recommendation' | 'unknown';
  preview: string;
  matchedHabitId?: string;
  status: 'previewed' | 'confirmed' | 'cancelled' | 'needs-clarification' | 'failed';
  createdAt: string;
};

export type AppPreferences = {
  onboardingComplete: boolean;
  guestMode: boolean;
  notificationPermission: 'unknown' | 'granted' | 'denied';
  theme: ThemePreference;
  aiEnabled: boolean;
  microphonePermission: 'unknown' | 'granted' | 'denied';
  telemetryEnabled: boolean;
};

export type HabitFormDraft = {
  name: string;
  kind: HabitKind;
  category: string;
  icon: string;
  color: string;
  description: string;
  motivationalNote: string;
  targetValue: string;
  unit: string;
  scheduleKind: HabitSchedule['kind'];
  weekdays: number[];
  cadenceCount: string;
  intervalDays: string;
  startDate: string;
  endDate: string;
  reminderEnabled: boolean;
  reminderTime: string;
};
