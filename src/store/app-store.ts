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
  seedApril2026TestData: () => void;
  seedTodayTestHabits: () => void;
  seedTodayRandomCompletionTest: () => { seededCount: number; currentWeekCount: number };
  archiveHabit: (habitId: string) => void;
  restoreHabit: (habitId: string) => void;
  deleteHabit: (habitId: string) => Promise<void>;
  completeHabit: (habitId: string, dateKey: string) => void;
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
        profileAvatarId: 'mason',
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
      seedApril2026TestData: () =>
        set((state) => {
          const seedData = createApril2026TestData();
          const seededHabitIds = new Set(
            state.habits.filter((habit) => habit.id.startsWith('seed-habit-apr-2026-')).map((habit) => habit.id),
          );

          return {
            habits: [...state.habits.filter((habit) => !seededHabitIds.has(habit.id)), ...seedData.habits],
            logs: [...state.logs.filter((log) => !seededHabitIds.has(log.habitId)), ...seedData.logs],
            session: {
              ...state.session,
              syncStatus: state.session.mode === 'guest' ? 'local-only' : 'queued',
            },
          };
        }),
      seedTodayTestHabits: () =>
        set((state) => {
          const seededHabits = createTodayTestHabits();
          const seededIds = new Set(seededHabits.map((habit) => habit.id));

          return {
            habits: [...state.habits.filter((habit) => !seededIds.has(habit.id)), ...seededHabits],
            session: {
              ...state.session,
              syncStatus: state.session.mode === 'guest' ? 'local-only' : 'queued',
            },
          };
        }),
      seedTodayRandomCompletionTest: () => {
        const today = new Date();
        const currentWeekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 1);
        let summary = { seededCount: 0, currentWeekCount: 0 };

        set((state) => {
          const nextLogs = createTodayRandomCompletionTestData(state.habits, state.logs);
          const nextLogIds = new Set(nextLogs.map((log) => log.id));
          summary = {
            seededCount: nextLogs.length,
            currentWeekCount: nextLogs.filter((log) => {
              const logDate = new Date(`${log.date}T00:00:00`);
              return logDate >= currentWeekStart && logDate <= today;
            }).length,
          };

          return {
            logs: [...state.logs.filter((log) => !nextLogIds.has(log.id)), ...nextLogs],
            session: {
              ...state.session,
              syncStatus: state.session.mode === 'guest' ? 'local-only' : 'queued',
            },
          };
        });

        return summary;
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
      completeHabit: (habitId, dateKey) => {
        const habit = get().habits.find((item) => item.id === habitId);
        if (!habit) {
          return;
        }

        const existing = getHabitLogForDate(get().logs, habitId, dateKey);
        const nextLog: HabitLog = {
          id: existing?.id ?? createId('log'),
          habitId,
          date: dateKey,
          value:
            habit.kind === 'count' || habit.kind === 'duration'
              ? existing?.value ?? habit.targetValue ?? 1
              : existing?.value,
          note: existing?.note,
          status: 'completed',
          completedAt: existing?.completedAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        upsertLog(set, get().logs, nextLog);
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

function createApril2026TestData() {
  const createdAt = new Date().toISOString();
  const streakDates = Array.from({ length: 16 }, (_, index) => format(new Date(2026, 3, index + 1), 'yyyy-MM-dd'));
  const palette = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
  const habitSeeds = [
    { name: 'Morning Walk', category: 'Fitness', icon: 'walk', kind: 'duration' as const, targetValue: 20, unit: 'min' },
    { name: 'Drink Water', category: 'Health', icon: 'water', kind: 'count' as const, targetValue: 8, unit: 'glasses' },
    { name: 'Read Pages', category: 'Learning', icon: 'book', kind: 'count' as const, targetValue: 15, unit: 'pages' },
    { name: 'Meditate', category: 'Mindset', icon: 'sparkles', kind: 'duration' as const, targetValue: 10, unit: 'min' },
    { name: 'Stretch', category: 'Recovery', icon: 'barbell', kind: 'duration' as const, targetValue: 12, unit: 'min' },
    { name: 'Sleep Early', category: 'Sleep', icon: 'moon', kind: 'yesNo' as const, targetValue: undefined, unit: undefined },
  ];

  const shuffled = [...habitSeeds].sort(() => Math.random() - 0.5);
  const selectedHabits = shuffled.slice(0, 4);

  const habits: Habit[] = selectedHabits.map((seed, index) => ({
    id: `seed-habit-apr-2026-${index + 1}`,
    name: seed.name,
    kind: seed.kind,
    category: seed.category,
    icon: seed.icon,
    color: palette[index % palette.length],
    description: 'Temporary seeded habit for April 2026 calendar testing.',
    motivationalNote: 'Test streak data',
    targetValue: seed.targetValue,
    unit: seed.unit,
    schedule: { kind: 'daily' },
    startDate: '2026-04-01',
    endDate: '2026-04-16',
    reminders: [],
    createdAt,
    updatedAt: createdAt,
  }));

  const logs: HabitLog[] = streakDates.map((date, index) => {
    const habit = habits[Math.floor(Math.random() * habits.length)];
    return {
      id: `seed-log-apr-2026-${index + 1}`,
      habitId: habit.id,
      date,
      value: habit.kind === 'count' || habit.kind === 'duration' ? habit.targetValue ?? 1 : undefined,
      status: 'completed',
      completedAt: createdAt,
      updatedAt: createdAt,
    };
  });

  return { habits, logs };
}

function createTodayTestHabits() {
  const createdAt = new Date().toISOString();
  const startDate = format(new Date(), 'yyyy-MM-dd');
  const seeds = [
    { id: 'hydration', name: 'Drink Water', category: 'Health', icon: 'water', color: '#3b82f6', kind: 'count' as const, targetValue: 8, unit: 'glasses', note: 'A quick refill keeps the streak easy.' },
    { id: 'walk', name: 'Morning Walk', category: 'Fitness', icon: 'walk', color: '#22c55e', kind: 'duration' as const, targetValue: 20, unit: 'min', note: 'Fresh air counts. Start with one lap.' },
    { id: 'read', name: 'Read Pages', category: 'Learning', icon: 'book', color: '#8b5cf6', kind: 'count' as const, targetValue: 15, unit: 'pages', note: 'A few pages are enough to build momentum.' },
    { id: 'meditate', name: 'Meditate', category: 'Mindset', icon: 'sparkles', color: '#14b8a6', kind: 'duration' as const, targetValue: 10, unit: 'min', note: 'Just breathe and reset for a moment.' },
    { id: 'stretch', name: 'Stretch', category: 'Recovery', icon: 'body', color: '#f59e0b', kind: 'duration' as const, targetValue: 12, unit: 'min', note: 'A short stretch still counts today.' },
    { id: 'sleep', name: 'Sleep Early', category: 'Sleep', icon: 'moon', color: '#6366f1', kind: 'yesNo' as const, targetValue: undefined, unit: undefined, note: 'Set yourself up for tomorrow tonight.' },
    { id: 'journal', name: 'Journal', category: 'Reflection', icon: 'create', color: '#ec4899', kind: 'count' as const, targetValue: 1, unit: 'entry', note: 'One honest line is enough.' },
    { id: 'protein', name: 'Eat Protein', category: 'Nutrition', icon: 'restaurant', color: '#ef4444', kind: 'count' as const, targetValue: 3, unit: 'meals', note: 'Pick the next meal and keep it simple.' },
    { id: 'cleanup', name: 'Quick Tidy', category: 'Home', icon: 'home', color: '#0ea5e9', kind: 'duration' as const, targetValue: 10, unit: 'min', note: 'Ten focused minutes changes the room.' },
    { id: 'plan', name: 'Plan Tomorrow', category: 'Focus', icon: 'calendar', color: '#10b981', kind: 'yesNo' as const, targetValue: undefined, unit: undefined, note: 'Set up tomorrow before the day ends.' },
  ];

  return seeds.map((seed) => ({
    id: `seed-today-habit-${seed.id}`,
    name: seed.name,
    kind: seed.kind,
    category: seed.category,
    icon: seed.icon,
    color: seed.color,
    description: 'Temporary seeded habit for Today-screen testing.',
    motivationalNote: seed.note,
    targetValue: seed.targetValue,
    unit: seed.unit,
    schedule: { kind: 'daily' } as const,
    startDate,
    reminders: [],
    createdAt,
    updatedAt: createdAt,
  }));
}

function createTodayRandomCompletionTestData(habits: Habit[], logs: HabitLog[]) {
  const activeHabits = habits.filter((habit) => !habit.archivedAt);
  if (!activeHabits.length) {
    return [];
  }

  const shuffledHabits = [...activeHabits].sort(() => Math.random() - 0.5);
  const selectedHabits = shuffledHabits.slice(0, Math.min(5, shuffledHabits.length));
  const today = new Date();

  return selectedHabits.map((habit, index) => {
    const offsetDays = index === 0 ? Math.floor(Math.random() * 7) : Math.floor(Math.random() * 14);
    const date = format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - offsetDays), 'yyyy-MM-dd');
    const existing = getHabitLogForDate(logs, habit.id, date);

    return {
      id: existing?.id ?? `seed-random-complete-${habit.id}-${date}-${index + 1}`,
      habitId: habit.id,
      date,
      value:
        habit.kind === 'count' || habit.kind === 'duration'
          ? existing?.value ?? habit.targetValue ?? 1
          : existing?.value,
      note: existing?.note ?? 'Test completion seeded from Today.',
      status: 'completed' as const,
      completedAt: existing?.completedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}
