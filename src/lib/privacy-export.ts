import { Habit, HabitLog, AppPreferences, UserSession, PremiumState } from '@/src/types/habits';

export function buildPrivacySafeTelemetry(eventName: string, metadata: Record<string, string | number | boolean> = {}) {
  return {
    eventName,
    metadata,
    capturedAt: new Date().toISOString(),
  };
}

export function buildLocalDataExport(input: {
  habits: Habit[];
  logs: HabitLog[];
  preferences: AppPreferences;
  session: UserSession;
  premium: PremiumState;
}) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      habits: input.habits,
      logs: input.logs,
      preferences: input.preferences,
      session: input.session,
      premium: input.premium,
    },
    null,
    2,
  );
}
