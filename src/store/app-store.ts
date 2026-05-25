import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import { calculateCompletionRate, calculateStreak, computeLogStatus, createId, getHabitLogForDate, habitFromDraft, isHabitScheduledForDate } from '@/src/domain/habits';
import { clearNotificationIds, syncHabitReminderNotifications } from '@/src/lib/notifications';
import { AiCommandHistoryItem, AppPreferences, Habit, HabitFormDraft, HabitLog, PremiumState, ThemePreference, UserSession } from '@/src/types/habits';

type AppState = {
  hydrated: boolean;
  habits: Habit[];
  logs: HabitLog[];
  preferences: AppPreferences;
  session: UserSession;
  premium: PremiumState;
  aiHistory: AiCommandHistoryItem[];
  setHydrated: (value: boolean) => void;
  completeOnboarding: () => void;
  setNotificationPermission: (value: AppPreferences['notificationPermission']) => void;
  setTheme: (value: ThemePreference) => void;
  setAiEnabled: (value: boolean) => void;
  setMicrophonePermission: (value: AppPreferences['microphonePermission']) => void;
  setTelemetryEnabled: (value: boolean) => void;
  setProfile: (profile: { displayName?: string; profileAvatarId?: string }) => void;
  setPremiumEntitlement: (value: PremiumState['entitlement']) => void;
  startEmailSession: (email: string) => void;
  startFirebaseSession: (session: Pick<UserSession, 'mode' | 'uid' | 'email' | 'displayName'>) => void;
  continueAsGuest: () => void;
  queueSync: () => void;
  markSynced: () => void;
  resetLocalData: () => void;
  addAiHistoryItem: (item: Omit<AiCommandHistoryItem, 'id' | 'createdAt'>) => AiCommandHistoryItem;
  updateAiHistoryStatus: (id: string, status: AiCommandHistoryItem['status']) => void;
  clearAiHistory: () => void;
  saveHabit: (draft: HabitFormDraft, existingId?: string) => Promise<Habit>;
  archiveHabit: (habitId: string) => void;
  restoreHabit: (habitId: string) => void;
  deleteHabit: (habitId: string) => Promise<void>;
  toggleHabitComplete: (habitId: string, dateKey: string) => void;
  skipHabit: (habitId: string, dateKey: string) => void;
  updateHabitValue: (habitId: string, dateKey: string, nextValue: number, note?: string) => void;
  updateHabitNote: (habitId: string, dateKey: string, note: string) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      habits: [],
      logs: [],
      preferences: {
        onboardingComplete: false,
        guestMode: true,
        notificationPermission: 'unknown',
        theme: 'system',
        aiEnabled: true,
        microphonePermission: 'unknown',
        telemetryEnabled: false,
        profileAvatarId: 'aurora',
      },
      session: {
        mode: 'guest',
        displayName: 'Friend',
        syncStatus: 'local-only',
      },
      premium: {
        entitlement: 'free',
        provider: 'local-placeholder',
      },
      aiHistory: [],
      setHydrated: (value) => set({ hydrated: value }),
      completeOnboarding: () =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            onboardingComplete: true,
            guestMode: true,
          },
        })),
      setNotificationPermission: (value) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            notificationPermission: value,
          },
        })),
      setTheme: (value) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            theme: value,
          },
        })),
      setAiEnabled: (value) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            aiEnabled: value,
          },
        })),
      setMicrophonePermission: (value) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            microphonePermission: value,
          },
        })),
      setTelemetryEnabled: (value) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            telemetryEnabled: value,
          },
        })),
      setProfile: ({ displayName, profileAvatarId }) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            profileAvatarId: profileAvatarId ?? state.preferences.profileAvatarId,
          },
          session: {
            ...state.session,
            displayName: displayName?.trim() ? displayName.trim() : state.session.displayName,
          },
        })),
      setPremiumEntitlement: (value) =>
        set({
          premium: {
            entitlement: value,
            provider: 'local-placeholder',
          },
        }),
      startEmailSession: (email) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            guestMode: false,
          },
          session: {
            mode: 'email',
            email,
            syncStatus: 'queued',
          },
        })),
      startFirebaseSession: (session) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            onboardingComplete: true,
            guestMode: false,
          },
          session: {
            mode: session.mode,
            uid: session.uid,
            email: session.email,
            displayName: session.displayName,
            syncStatus: 'queued',
          },
        })),
      continueAsGuest: () =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            guestMode: true,
          },
          session: {
            mode: 'guest',
            displayName: state.session.displayName,
            syncStatus: 'local-only',
          },
        })),
      queueSync: () =>
        set((state) => ({
          session: {
            ...state.session,
            syncStatus: state.session.mode === 'guest' ? 'local-only' : 'queued',
          },
        })),
      markSynced: () =>
        set((state) => ({
          session: {
            ...state.session,
            syncStatus: state.session.mode === 'guest' ? 'local-only' : 'synced',
          },
        })),
      resetLocalData: () =>
        set((state) => ({
          habits: [],
          logs: [],
          aiHistory: [],
          preferences: {
            ...state.preferences,
            onboardingComplete: true,
            guestMode: true,
          },
          session: {
            mode: 'guest',
            displayName: state.session.displayName,
            syncStatus: 'local-only',
          },
          premium: {
            entitlement: 'free',
            provider: 'local-placeholder',
          },
        })),
      addAiHistoryItem: (item) => {
        const nextItem: AiCommandHistoryItem = {
          ...item,
          id: createId('ai'),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          aiHistory: [nextItem, ...state.aiHistory].slice(0, 50),
        }));
        return nextItem;
      },
      updateAiHistoryStatus: (id, status) =>
        set((state) => ({
          aiHistory: state.aiHistory.map((item) => (item.id === id ? { ...item, status } : item)),
        })),
      clearAiHistory: () => set({ aiHistory: [] }),
      saveHabit: async (draft, existingId) => {
        const existing = get().habits.find((habit) => habit.id === existingId);
        if (existing?.reminders.length) {
          await clearNotificationIds(existing.reminders.flatMap((item) => item.notificationIds));
        }

        const nextHabit = habitFromDraft(draft, existing);
        const nextNotificationIds = nextHabit.reminders.length ? await syncHabitReminderNotifications(nextHabit) : [];
        const syncedHabit = {
          ...nextHabit,
          reminders: nextHabit.reminders.map((reminder) => ({
            ...reminder,
            notificationIds: nextNotificationIds,
          })),
        };

        set((state) => ({
          habits: existing ? state.habits.map((habit) => (habit.id === existing.id ? syncedHabit : habit)) : [syncedHabit, ...state.habits],
          session: {
            ...state.session,
            syncStatus: state.session.mode === 'guest' ? 'local-only' : 'queued',
          },
        }));

        return syncedHabit;
      },
      archiveHabit: (habitId) =>
        set((state) => ({
          habits: state.habits.map((habit) => (habit.id === habitId ? { ...habit, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : habit)),
        })),
      restoreHabit: (habitId) =>
        set((state) => ({
          habits: state.habits.map((habit) => (habit.id === habitId ? { ...habit, archivedAt: undefined, updatedAt: new Date().toISOString() } : habit)),
        })),
      deleteHabit: async (habitId) => {
        const habit = get().habits.find((item) => item.id === habitId);
        if (habit?.reminders.length) {
          await clearNotificationIds(habit.reminders.flatMap((item) => item.notificationIds));
        }

        set((state) => ({
          habits: state.habits.filter((item) => item.id !== habitId),
          logs: state.logs.filter((log) => log.habitId !== habitId),
          session: {
            ...state.session,
            syncStatus: state.session.mode === 'guest' ? 'local-only' : 'queued',
          },
        }));
      },
      toggleHabitComplete: (habitId, dateKey) => {
        const habit = get().habits.find((item) => item.id === habitId);
        if (!habit) {
          return;
        }

        const existing = getHabitLogForDate(get().logs, habitId, dateKey);
        if (existing?.status === 'completed') {
          set((state) => ({
            logs: state.logs.filter((log) => log.id !== existing.id),
          }));
          return;
        }

        const nextLog: HabitLog = {
          id: existing?.id ?? createId('log'),
          habitId,
          date: dateKey,
          value: habit.kind === 'count' || habit.kind === 'duration' ? habit.targetValue ?? 1 : existing?.value,
          note: existing?.note,
          status: 'completed',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        upsertLog(set, get().logs, nextLog);
      },
      skipHabit: (habitId, dateKey) => {
        const existing = getHabitLogForDate(get().logs, habitId, dateKey);
        const nextLog: HabitLog = {
          id: existing?.id ?? createId('log'),
          habitId,
          date: dateKey,
          value: existing?.value,
          note: existing?.note,
          status: 'skipped',
          updatedAt: new Date().toISOString(),
        };
        upsertLog(set, get().logs, nextLog);
      },
      updateHabitValue: (habitId, dateKey, nextValue, note) => {
        const habit = get().habits.find((item) => item.id === habitId);
        if (!habit) {
          return;
        }

        const existing = getHabitLogForDate(get().logs, habitId, dateKey);
        const nextLog: HabitLog = {
          id: existing?.id ?? createId('log'),
          habitId,
          date: dateKey,
          value: nextValue,
          note: note ?? existing?.note,
          status: computeLogStatus(habit, nextValue, false),
          completedAt: existing?.completedAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        upsertLog(set, get().logs, nextLog);
      },
      updateHabitNote: (habitId, dateKey, note) => {
        const existing = getHabitLogForDate(get().logs, habitId, dateKey);
        const nextLog: HabitLog = {
          id: existing?.id ?? createId('log'),
          habitId,
          date: dateKey,
          value: existing?.value,
          note,
          status: existing?.status ?? 'partial',
          completedAt: existing?.completedAt,
          updatedAt: new Date().toISOString(),
        };
        upsertLog(set, get().logs, nextLog);
      },
    }),
    {
      name: 'habitai-store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

export function useTodayHabits() {
  return useAppStore(
    useShallow((state) => {
      const dateKey = format(new Date(), 'yyyy-MM-dd');
      return state.habits.filter((habit) => !habit.archivedAt && isHabitScheduledForDate(habit, dateKey, state.logs));
    }),
  );
}

export function useArchivedHabits() {
  return useAppStore(useShallow((state) => state.habits.filter((habit) => habit.archivedAt)));
}

export function useHabitInsights(habitId: string) {
  const habit = useAppStore((state) => state.habits.find((item) => item.id === habitId));
  const logs = useAppStore((state) => state.logs);

  if (!habit) {
    return null;
  }

  return {
    streak: calculateStreak(habit, logs),
    completionRate: calculateCompletionRate(habit, logs),
    logs: logs.filter((log) => log.habitId === habitId).sort((a, b) => b.date.localeCompare(a.date)),
  };
}

function upsertLog(set: (fn: (state: AppState) => Partial<AppState>) => void, logs: HabitLog[], nextLog: HabitLog) {
  const existing = logs.find((item) => item.id === nextLog.id);
  set((state) => ({
    logs: existing ? state.logs.map((log) => (log.id === nextLog.id ? nextLog : log)) : [nextLog, ...state.logs],
    session: {
      ...state.session,
      syncStatus: state.session.mode === 'guest' ? 'local-only' : 'queued',
    },
  }));
}
