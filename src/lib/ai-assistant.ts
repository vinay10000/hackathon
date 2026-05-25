import { format, subDays } from 'date-fns';

import {
  calculateCompletionRate,
  createDefaultDraft,
  draftFromHabit,
  formatScheduleLabel,
  getHabitLogForDate,
  getTodayProgress,
  HABIT_COLORS,
  HABIT_ICONS,
  isHabitScheduledForDate,
} from '@/src/domain/habits';
import { Habit, HabitFormDraft, HabitLog, HabitSchedule } from '@/src/types/habits';

type AiIntent = 'create' | 'modify' | 'delete' | 'archive' | 'restore' | 'complete' | 'skip' | 'log' | 'note' | 'summary' | 'recommendation' | 'unknown';

type HabitDraftPayload = {
  draft: HabitFormDraft;
  changeSummary: string[];
};

export type AiCommandPreview = {
  interpretedText: string;
  intent: AiIntent;
  preview: string;
  status: 'previewed' | 'needs-clarification';
  matchedHabitId?: string;
  draftPayload?: HabitDraftPayload;
};

export function interpretHabitCommand(input: string, habits: Habit[], logs: HabitLog[]): AiCommandPreview {
  const interpretedText = input.trim().replace(/\s+/g, ' ');
  const text = interpretedText.toLowerCase();

  if (!interpretedText) {
    return {
      interpretedText,
      intent: 'unknown',
      preview: 'Type or dictate a habit command to see a safe action preview.',
      status: 'needs-clarification',
    };
  }

  const matchedHabits = habits.filter((habit) => text.includes(habit.name.toLowerCase()));
  const matchedHabit = matchedHabits.length === 1 ? matchedHabits[0] : undefined;
  const needsHabit = /\b(delete|remove|archive|restore|complete|done|skip|log|note|change|update|modify)\b/.test(text);

  if (matchedHabits.length > 1) {
    return {
      interpretedText,
      intent: 'unknown',
      preview: `I found multiple matching habits: ${matchedHabits.map((habit) => habit.name).join(', ')}. Please choose one before anything changes.`,
      status: 'needs-clarification',
    };
  }

  if (/\b(delete|remove)\b/.test(text)) {
    return actionPreview('delete', interpretedText, matchedHabit, 'Delete habit', needsHabit);
  }

  if (/\barchive\b/.test(text)) {
    return actionPreview('archive', interpretedText, matchedHabit, 'Archive habit', needsHabit);
  }

  if (/\brestore\b/.test(text)) {
    return actionPreview('restore', interpretedText, matchedHabit, 'Restore habit', needsHabit);
  }

  if (/\b(complete|completed|done)\b/.test(text)) {
    return actionPreview('complete', interpretedText, matchedHabit, 'Mark complete today', needsHabit);
  }

  if (/\bskip\b/.test(text)) {
    return actionPreview('skip', interpretedText, matchedHabit, 'Skip for today', needsHabit);
  }

  if (/\b(note|journal)\b/.test(text)) {
    return actionPreview('note', interpretedText, matchedHabit, 'Add note to habit log', needsHabit);
  }

  if (/\b(log|drank|read|ran|walked|minutes|glasses|pages|reps)\b/.test(text)) {
    return actionPreview('log', interpretedText, matchedHabit, 'Log measurable progress', needsHabit);
  }

  if (/\b(change|update|modify)\b/.test(text)) {
    return buildModifyPreview(interpretedText, matchedHabit);
  }

  if (/\b(summary|summarize|how am i doing|progress)\b/.test(text)) {
    return buildSummaryPreview(interpretedText, habits, logs);
  }

  if (/\b(suggest|recommend|idea|template|help me|goal)\b/.test(text)) {
    return buildRecommendationPreview(interpretedText, habits, logs);
  }

  if (/\b(create|add|start|remind me)\b/.test(text)) {
    return buildCreatePreview(interpretedText);
  }

  return {
    interpretedText,
    intent: 'unknown',
    preview: 'I need a clearer command before previewing an action. Nothing has changed.',
    status: 'needs-clarification',
  };
}

function buildCreatePreview(interpretedText: string): AiCommandPreview {
  const draft = hydrateDraftFromText(interpretedText);

  if (!draft.name.trim()) {
    return {
      interpretedText,
      intent: 'create',
      preview: 'Tell me the habit name first, like "Create a water habit for 8 glasses every day at 8 am."',
      status: 'needs-clarification',
      draftPayload: {
        draft,
        changeSummary: [],
      },
    };
  }

  const changes = summarizeDraft(draft);
  return {
    interpretedText,
    intent: 'create',
    preview: `Create this habit after confirmation:\n${changes.join('\n')}`,
    status: 'previewed',
    draftPayload: {
      draft,
      changeSummary: changes,
    },
  };
}

function buildModifyPreview(interpretedText: string, matchedHabit: Habit | undefined): AiCommandPreview {
  if (!matchedHabit) {
    return {
      interpretedText,
      intent: 'modify',
      preview: 'Tell me which habit to modify so I can prepare the exact changes safely.',
      status: 'needs-clarification',
    };
  }

  const existingDraft = draftFromHabit(matchedHabit);
  const nextDraft = hydrateDraftFromText(interpretedText, existingDraft);
  const changeSummary = summarizeDraftDiff(existingDraft, nextDraft);

  if (!changeSummary.length) {
    return {
      interpretedText,
      intent: 'modify',
      preview: `I found "${matchedHabit.name}", but I still need the change details. Try "Change ${matchedHabit.name} to 30 minutes every night at 9 pm."`,
      status: 'needs-clarification',
      matchedHabitId: matchedHabit.id,
    };
  }

  return {
    interpretedText,
    intent: 'modify',
    preview: `Update ${matchedHabit.name} after confirmation:\n${changeSummary.join('\n')}`,
    status: 'previewed',
    matchedHabitId: matchedHabit.id,
    draftPayload: {
      draft: nextDraft,
      changeSummary,
    },
  };
}

function buildSummaryPreview(interpretedText: string, habits: Habit[], logs: HabitLog[]): AiCommandPreview {
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const activeHabits = habits.filter((habit) => !habit.archivedAt);
  const progress = getTodayProgress(activeHabits, logs, todayKey);
  const recentWindow = Array.from({ length: 7 }, (_, index) => format(subDays(new Date(), index), 'yyyy-MM-dd'));
  const recentScheduled = activeHabits.flatMap((habit) => recentWindow.filter((dateKey) => isHabitScheduledForDate(habit, dateKey, logs)).map((dateKey) => ({ habit, dateKey })));
  const recentCompleted = recentScheduled.filter(({ habit, dateKey }) => getHabitLogForDate(logs, habit.id, dateKey)?.status === 'completed').length;
  const weeklyRate = recentScheduled.length ? Math.round((recentCompleted / recentScheduled.length) * 100) : 0;
  const bestHabit = activeHabits
    .map((habit) => ({ habit, rate: calculateCompletionRate(habit, logs) }))
    .sort((a, b) => b.rate - a.rate)[0];

  const summary = [
    `Today you have completed ${progress.completedCount} of ${progress.scheduledCount} scheduled habits, which is ${progress.percentage}%.`,
    `Your rolling 7-day completion rate is ${weeklyRate}%.`,
    bestHabit ? `Your strongest habit right now is ${bestHabit.habit.name} at ${bestHabit.rate}% completion.` : 'There is not enough history yet to rank your habits.',
  ].join(' ');

  return {
    interpretedText,
    intent: 'summary',
    preview: summary,
    status: 'previewed',
  };
}

function buildRecommendationPreview(interpretedText: string, habits: Habit[], logs: HabitLog[]): AiCommandPreview {
  const text = interpretedText.toLowerCase();
  const categories = habits.map((habit) => habit.category.toLowerCase());
  const suggestions: string[] = [];

  if (/\bwater|hydration|drink\b/.test(text) || categories.includes('wellness')) {
    suggestions.push('Hydration: 8 glasses daily with a morning reminder at 8:00.');
  }
  if (/\bread|study|learn|focus\b/.test(text)) {
    suggestions.push('Reading: 20 minutes daily in the evening with a calm 9:00 reminder.');
  }
  if (/\bfitness|workout|walk|run|exercise\b/.test(text)) {
    suggestions.push('Movement: 30 minutes 4 times per week, starting with weekdays.');
  }
  if (/\bsleep|night|bed\b/.test(text)) {
    suggestions.push('Sleep wind-down: phone off 30 minutes before bed every day.');
  }

  if (!suggestions.length) {
    const activeCount = habits.filter((habit) => !habit.archivedAt).length;
    const completionAverage = activeCount ? Math.round(habits.reduce((sum, habit) => sum + calculateCompletionRate(habit, logs), 0) / activeCount) : 0;
    suggestions.push(
      activeCount && completionAverage < 60
        ? 'Keep the next habit small: choose one yes/no habit or one count habit with a target under 10.'
        : 'A good next habit is one daily yes/no habit, one measurable habit, and one recovery habit like sleep or stretching.',
    );
    suggestions.push('Use a reminder only for the habit most likely to slip, so notifications stay useful.');
    suggestions.push('If a goal feels large, break it into the smallest daily action you can finish in under 5 minutes.');
  }

  return {
    interpretedText,
    intent: 'recommendation',
    preview: `Suggested habits and coaching:\n- ${suggestions.join('\n- ')}`,
    status: 'previewed',
  };
}

function actionPreview(intent: AiIntent, interpretedText: string, habit: Habit | undefined, verb: string, needsHabit: boolean): AiCommandPreview {
  if (needsHabit && !habit) {
    return {
      interpretedText,
      intent,
      preview: `Which habit should I use for "${verb.toLowerCase()}"? No data will change until you confirm.`,
      status: 'needs-clarification',
    };
  }

  return {
    interpretedText,
    intent,
    preview: `${verb}: ${habit?.name ?? 'selected habit'}. Review this preview before confirming.`,
    status: 'previewed',
    matchedHabitId: habit?.id,
  };
}

function hydrateDraftFromText(input: string, baseDraft?: HabitFormDraft) {
  const text = input.toLowerCase();
  const draft = baseDraft ? { ...baseDraft } : createDefaultDraft(format(new Date(), 'yyyy-MM-dd'));

  const explicitName = getExplicitHabitName(input);
  if (explicitName) {
    draft.name = explicitName;
  }

  if (/\bminutes?\b/.test(text)) {
    draft.kind = 'duration';
    draft.unit = 'minutes';
  } else if (/\b(glass|glasses|cups|pages|steps|reps|times)\b/.test(text)) {
    draft.kind = 'count';
    const unitMatch = text.match(/\b(glasses|glass|cups|pages|steps|reps|times)\b/);
    draft.unit = unitMatch?.[0] === 'glass' ? 'glasses' : unitMatch?.[0] ?? draft.unit;
  } else if (/\bavoid|quit|stop|less|reduce\b/.test(text)) {
    draft.kind = 'negative';
  } else if (!baseDraft) {
    draft.kind = 'yesNo';
  }

  const targetMatch = text.match(/(\d+)\s*(minutes?|glasses|glass|cups|pages|steps|reps|times)/);
  if (targetMatch) {
    draft.targetValue = targetMatch[1];
    if (draft.kind !== 'duration') {
      draft.kind = 'count';
    }
    if (targetMatch[2].startsWith('minute')) {
      draft.kind = 'duration';
      draft.unit = 'minutes';
    } else {
      draft.unit = targetMatch[2] === 'glass' ? 'glasses' : targetMatch[2];
    }
  }

  if (/\bevery day|daily\b/.test(text)) {
    draft.scheduleKind = 'daily';
  } else if (/\bweekdays?\b/.test(text)) {
    draft.scheduleKind = 'weekdays';
    draft.weekdays = [1, 2, 3, 4, 5];
  } else {
    const perWeek = text.match(/(\d+)\s+times?\s+(a|per)\s+week/);
    const perMonth = text.match(/(\d+)\s+times?\s+(a|per)\s+month/);
    const everyDays = text.match(/every\s+(\d+)\s+days?/);
    if (perWeek) {
      draft.scheduleKind = 'timesPerWeek';
      draft.cadenceCount = perWeek[1];
    } else if (perMonth) {
      draft.scheduleKind = 'timesPerMonth';
      draft.cadenceCount = perMonth[1];
    } else if (everyDays) {
      draft.scheduleKind = 'interval';
      draft.intervalDays = everyDays[1];
    }
  }

  const reminder = extractReminderTime(text);
  if (reminder) {
    draft.reminderEnabled = true;
    draft.reminderTime = reminder;
  }

  const category = inferCategory(text);
  if (category) {
    draft.category = category;
  }

  const [icon, color] = inferVisuals(text, draft.category);
  draft.icon = icon;
  draft.color = color;

  return draft;
}

function summarizeDraft(draft: HabitFormDraft) {
  const schedule = formatDraftSchedule(draft);
  const target = draft.kind === 'count' || draft.kind === 'duration' ? `${draft.targetValue || '1'} ${draft.unit || (draft.kind === 'duration' ? 'minutes' : 'times')}` : 'simple check-in';
  return [
    `- Name: ${draft.name}`,
    `- Type: ${draft.kind}`,
    `- Target: ${target}`,
    `- Schedule: ${schedule}`,
    `- Reminder: ${draft.reminderEnabled ? draft.reminderTime : 'Off'}`,
    `- Category: ${draft.category}`,
  ];
}

function summarizeDraftDiff(previous: HabitFormDraft, next: HabitFormDraft) {
  const changes: string[] = [];
  if (previous.name !== next.name) changes.push(`- Name: ${previous.name} -> ${next.name}`);
  if (previous.kind !== next.kind) changes.push(`- Type: ${previous.kind} -> ${next.kind}`);
  if (previous.targetValue !== next.targetValue || previous.unit !== next.unit) {
    changes.push(`- Target: ${previous.targetValue || 'none'} ${previous.unit || ''}`.trimEnd() + ` -> ${next.targetValue || 'none'} ${next.unit || ''}`.trimEnd());
  }
  if (formatDraftSchedule(previous) !== formatDraftSchedule(next)) {
    changes.push(`- Schedule: ${formatDraftSchedule(previous)} -> ${formatDraftSchedule(next)}`);
  }
  if (previous.reminderEnabled !== next.reminderEnabled || previous.reminderTime !== next.reminderTime) {
    changes.push(`- Reminder: ${previous.reminderEnabled ? previous.reminderTime : 'Off'} -> ${next.reminderEnabled ? next.reminderTime : 'Off'}`);
  }
  if (previous.category !== next.category) changes.push(`- Category: ${previous.category} -> ${next.category}`);
  if (previous.icon !== next.icon) changes.push(`- Icon: ${previous.icon} -> ${next.icon}`);
  if (previous.color !== next.color) changes.push(`- Color updated`);
  if (previous.endDate !== next.endDate) changes.push(`- End date: ${previous.endDate || 'none'} -> ${next.endDate || 'none'}`);
  return changes;
}

function formatDraftSchedule(draft: HabitFormDraft) {
  const schedule: HabitSchedule =
    draft.scheduleKind === 'weekdays'
      ? { kind: 'weekdays', weekdays: draft.weekdays }
      : draft.scheduleKind === 'timesPerWeek'
        ? { kind: 'timesPerWeek', count: Number(draft.cadenceCount) || 1 }
        : draft.scheduleKind === 'timesPerMonth'
          ? { kind: 'timesPerMonth', count: Number(draft.cadenceCount) || 1 }
          : draft.scheduleKind === 'interval'
            ? { kind: 'interval', everyDays: Number(draft.intervalDays) || 1 }
            : { kind: 'daily' };
  return formatScheduleLabel(schedule);
}

function getExplicitHabitName(input: string) {
  const quoted = input.match(/["']([^"']+)["']/);
  if (quoted?.[1]) {
    return toTitleCase(quoted[1].trim());
  }

  const namePatterns = [
    /(?:create|add|start)\s+(?:a\s+|an\s+|my\s+)?(.+?)(?:\s+(?:habit|tracker))?(?:\s+(?:for|with|every|daily|at)\b|$)/i,
    /remind me to\s+(.+?)(?:\s+(?:at|every|daily|on)\b|$)/i,
    /change\s+(?:my\s+)?(.+?)(?:\s+habit)?\s+to\b/i,
    /update\s+(?:my\s+)?(.+?)(?:\s+habit)?\s+to\b/i,
    /modify\s+(?:my\s+)?(.+?)(?:\s+habit)?\s+to\b/i,
  ];

  for (const pattern of namePatterns) {
    const match = input.match(pattern);
    const candidate = match?.[1]?.trim();
    if (candidate) {
      return toTitleCase(candidate.replace(/\b(my|a|an)\b/gi, '').trim());
    }
  }

  return '';
}

function extractReminderTime(text: string) {
  const timeMatch = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!timeMatch) {
    return '';
  }

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] ?? '0');
  const meridiem = timeMatch[3];
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function inferCategory(text: string) {
  if (/\bwater|sleep|meditat|wellness|health|walk|run|exercise|gym\b/.test(text)) return 'Wellness';
  if (/\bread|study|learn|course|book|write\b/.test(text)) return 'Learning';
  if (/\bwork|deep work|focus|career|project\b/.test(text)) return 'Productivity';
  if (/\bpray|gratitude|journal|mindful\b/.test(text)) return 'Mindset';
  return '';
}

function inferVisuals(text: string, category: string): [string, string] {
  if (/\bwater|drink\b/.test(text)) return ['drop', HABIT_COLORS[1]];
  if (/\bread|book|study|learn\b/.test(text)) return ['book', HABIT_COLORS[0]];
  if (/\bsleep|night\b/.test(text)) return ['moon', HABIT_COLORS[4]];
  if (/\bheart|gratitude|mindful\b/.test(text)) return ['heart', HABIT_COLORS[4]];
  if (/\bexercise|run|workout|gym|energy\b/.test(text)) return ['bolt', HABIT_COLORS[2]];
  if (category === 'Wellness') return ['leaf', HABIT_COLORS[1]];
  return [HABIT_ICONS[0], HABIT_COLORS[0]];
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
