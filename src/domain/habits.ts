import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import { Habit, HabitFormDraft, HabitLog, HabitLogStatus, HabitSchedule } from '@/src/types/habits';

export const HABIT_COLORS = ['#2563eb', '#14b8a6', '#f97316', '#ef4444', '#8b5cf6', '#f59e0b'];
export const HABIT_ICONS = ['sparkles', 'flame', 'book', 'drop', 'moon', 'heart', 'leaf', 'bolt'];

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultDraft(today: string): HabitFormDraft {
  return {
    name: '',
    kind: 'yesNo',
    category: 'Wellness',
    icon: HABIT_ICONS[0],
    color: HABIT_COLORS[0],
    description: '',
    motivationalNote: '',
    targetValue: '',
    unit: '',
    scheduleKind: 'daily',
    weekdays: [1, 2, 3, 4, 5],
    cadenceCount: '3',
    intervalDays: '2',
    startDate: today,
    endDate: '',
    reminderEnabled: false,
    reminderTime: '08:00',
  };
}

export function scheduleFromDraft(draft: HabitFormDraft): HabitSchedule {
  if (draft.scheduleKind === 'weekdays') {
    return { kind: 'weekdays', weekdays: draft.weekdays.length ? draft.weekdays : [1, 3, 5] };
  }
  if (draft.scheduleKind === 'timesPerWeek') {
    return { kind: 'timesPerWeek', count: Number(draft.cadenceCount) || 3 };
  }
  if (draft.scheduleKind === 'timesPerMonth') {
    return { kind: 'timesPerMonth', count: Number(draft.cadenceCount) || 8 };
  }
  if (draft.scheduleKind === 'interval') {
    return { kind: 'interval', everyDays: Number(draft.intervalDays) || 2 };
  }
  return { kind: 'daily' };
}

export function habitFromDraft(draft: HabitFormDraft, existing?: Habit): Habit {
  const now = new Date().toISOString();
  const reminderEnabled = draft.reminderEnabled && draft.reminderTime;

  return {
    id: existing?.id ?? createId('habit'),
    name: draft.name.trim(),
    kind: draft.kind,
    category: draft.category.trim() || 'General',
    icon: draft.icon,
    color: draft.color,
    description: draft.description.trim(),
    motivationalNote: draft.motivationalNote.trim(),
    targetValue: draft.kind === 'count' || draft.kind === 'duration' ? Number(draft.targetValue) || 1 : undefined,
    unit: draft.kind === 'count' || draft.kind === 'duration' ? draft.unit.trim() || (draft.kind === 'duration' ? 'minutes' : 'count') : undefined,
    schedule: scheduleFromDraft(draft),
    startDate: draft.startDate,
    endDate: draft.endDate || undefined,
    reminders: reminderEnabled
      ? [
          {
            id: existing?.reminders[0]?.id ?? createId('reminder'),
            time: draft.reminderTime,
            enabled: true,
            notificationIds: existing?.reminders[0]?.notificationIds ?? [],
          },
        ]
      : [],
    archivedAt: existing?.archivedAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function draftFromHabit(habit: Habit): HabitFormDraft {
  return {
    name: habit.name,
    kind: habit.kind,
    category: habit.category,
    icon: habit.icon,
    color: habit.color,
    description: habit.description,
    motivationalNote: habit.motivationalNote,
    targetValue: habit.targetValue ? String(habit.targetValue) : '',
    unit: habit.unit ?? '',
    scheduleKind: habit.schedule.kind,
    weekdays: habit.schedule.kind === 'weekdays' ? habit.schedule.weekdays : [1, 2, 3, 4, 5],
    cadenceCount:
      habit.schedule.kind === 'timesPerWeek' || habit.schedule.kind === 'timesPerMonth' ? String(habit.schedule.count) : '3',
    intervalDays: habit.schedule.kind === 'interval' ? String(habit.schedule.everyDays) : '2',
    startDate: habit.startDate,
    endDate: habit.endDate ?? '',
    reminderEnabled: habit.reminders.some((item) => item.enabled),
    reminderTime: habit.reminders[0]?.time ?? '08:00',
  };
}

export function isHabitScheduledForDate(habit: Habit, dateKey: string, logs: HabitLog[]) {
  const currentDate = parseISO(dateKey);
  const startDate = parseISO(habit.startDate);
  if (isBefore(currentDate, startDate)) {
    return false;
  }
  if (habit.endDate && isAfter(currentDate, parseISO(habit.endDate))) {
    return false;
  }

  switch (habit.schedule.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return habit.schedule.weekdays.includes(currentDate.getDay());
    case 'interval':
      return differenceInDaysSafe(habit.startDate, dateKey) % habit.schedule.everyDays === 0;
    case 'timesPerWeek': {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      const completed = logs.filter(
        (log) => log.habitId === habit.id && log.status === 'completed' && isDayWithinInterval(log.date, weekStart, weekEnd),
      ).length;
      return completed < habit.schedule.count;
    }
    case 'timesPerMonth': {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const completed = logs.filter(
        (log) => log.habitId === habit.id && log.status === 'completed' && isDayWithinInterval(log.date, monthStart, monthEnd),
      ).length;
      return completed < habit.schedule.count;
    }
    default:
      return false;
  }
}

export function getHabitLogForDate(logs: HabitLog[], habitId: string, dateKey: string) {
  return logs.find((log) => log.habitId === habitId && log.date === dateKey);
}

export function computeLogStatus(habit: Habit, value?: number, skipped?: boolean): HabitLogStatus {
  if (skipped) {
    return 'skipped';
  }
  if (habit.kind === 'yesNo') {
    return 'completed';
  }
  if (habit.kind === 'negative') {
    return value && value > 0 ? 'partial' : 'completed';
  }

  const target = habit.targetValue ?? 1;
  if ((value ?? 0) >= target) {
    return 'completed';
  }
  if ((value ?? 0) > 0) {
    return 'partial';
  }
  return 'pending';
}

export function getTodayProgress(habits: Habit[], logs: HabitLog[], dateKey: string) {
  const scheduled = habits.filter((habit) => !habit.archivedAt && isHabitScheduledForDate(habit, dateKey, logs));
  const completed = scheduled.filter((habit) => getHabitLogForDate(logs, habit.id, dateKey)?.status === 'completed').length;
  return {
    scheduledCount: scheduled.length,
    completedCount: completed,
    percentage: scheduled.length ? Math.round((completed / scheduled.length) * 100) : 0,
  };
}

export function buildMonthGrid(currentMonth: Date) {
  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export function getLogStatusForHabitOnDate(habit: Habit, logs: HabitLog[], dateKey: string): HabitLogStatus {
  const log = getHabitLogForDate(logs, habit.id, dateKey);
  if (log) {
    return log.status;
  }
  const targetDate = parseISO(dateKey);
  if (isHabitScheduledForDate(habit, dateKey, logs) && isBefore(targetDate, new Date())) {
    return 'missed';
  }
  return 'pending';
}

export function calculateStreak(habit: Habit, logs: HabitLog[]) {
  const scheduledDays = eachDayOfInterval({ start: parseISO(habit.startDate), end: new Date() })
    .map((date) => format(date, 'yyyy-MM-dd'))
    .filter((dateKey) => isHabitScheduledForDate(habit, dateKey, logs));

  let running = 0;
  let best = 0;
  for (const dateKey of scheduledDays) {
    const log = getHabitLogForDate(logs, habit.id, dateKey);
    if (log?.status === 'completed' || log?.status === 'partial') {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  for (let index = scheduledDays.length - 1; index >= 0; index -= 1) {
    const log = getHabitLogForDate(logs, habit.id, scheduledDays[index]);
    if (log?.status === 'completed' || log?.status === 'partial') {
      current += 1;
    } else {
      break;
    }
  }

  return { current, best };
}

export function calculateCompletionRate(habit: Habit, logs: HabitLog[]) {
  const scheduledDays = eachDayOfInterval({ start: parseISO(habit.startDate), end: new Date() })
    .map((date) => format(date, 'yyyy-MM-dd'))
    .filter((dateKey) => isHabitScheduledForDate(habit, dateKey, logs));

  if (!scheduledDays.length) {
    return 0;
  }

  const completed = scheduledDays.filter((dateKey) => getHabitLogForDate(logs, habit.id, dateKey)?.status === 'completed').length;
  return Math.round((completed / scheduledDays.length) * 100);
}

export function getRecentDates(days = 7) {
  return Array.from({ length: days }, (_, index) => format(addDays(new Date(), -1 * (days - index - 1)), 'yyyy-MM-dd'));
}

export function formatScheduleLabel(schedule: HabitSchedule) {
  switch (schedule.kind) {
    case 'daily':
      return 'Daily';
    case 'weekdays':
      return `Weekdays: ${schedule.weekdays.map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(', ')}`;
    case 'timesPerWeek':
      return `${schedule.count} times per week`;
    case 'timesPerMonth':
      return `${schedule.count} times per month`;
    case 'interval':
      return `Every ${schedule.everyDays} days`;
    default:
      return 'Custom';
  }
}

function differenceInDaysSafe(startDate: string, endDate: string) {
  return Math.round((parseISO(endDate).getTime() - parseISO(startDate).getTime()) / (1000 * 60 * 60 * 24));
}

function isDayWithinInterval(dateKey: string, start: Date, end: Date) {
  const date = parseISO(dateKey);
  return !isBefore(date, start) && !isAfter(date, end);
}
