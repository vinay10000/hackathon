import { addDays, format, isValid, parse, subDays } from 'date-fns';

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
import { generateGeminiText } from '@/src/lib/gemini';
import { Habit, HabitFormDraft, HabitKind, HabitLog, HabitSchedule } from '@/src/types/habits';

export type AiIntent =
  | 'create'
  | 'modify'
  | 'delete'
  | 'archive'
  | 'restore'
  | 'complete'
  | 'skip'
  | 'log'
  | 'note'
  | 'summary'
  | 'recommendation'
  | 'unknown';

type HabitDraftPayload = {
  draft: HabitFormDraft;
  changeSummary: string[];
};

type AssistantProvider = 'google' | 'local-rules';

type AssistantExecution =
  | { type: 'create'; draft: HabitFormDraft }
  | { type: 'modify'; habitId: string; draft: HabitFormDraft }
  | { type: 'complete'; habitId: string; dateKey: string }
  | { type: 'skip'; habitId: string; dateKey: string }
  | { type: 'log'; habitId: string; dateKey: string; value: number; note?: string }
  | { type: 'note'; habitId: string; dateKey: string; note: string }
  | { type: 'archive'; habitId: string }
  | { type: 'restore'; habitId: string }
  | { type: 'delete'; habitId: string };

export type AssistantDisambiguationOption = {
  id: string;
  name: string;
  archived: boolean;
};

export type AiCommandPreview = {
  interpretedText: string;
  intent: AiIntent;
  preview: string;
  status: 'previewed' | 'needs-clarification';
  provider: AssistantProvider;
  matchedHabitId?: string;
  matchedHabitIds?: string[];
  draftPayload?: HabitDraftPayload;
  disambiguationOptions?: AssistantDisambiguationOption[];
  targetDate?: string;
  logValue?: number;
  noteText?: string;
  destructiveSuggestion?: string;
  execution?: AssistantExecution;
};

type ResolveHabitCommandOptions = {
  selectedHabitId?: string;
  now?: Date;
};

export type AssistantConversationOptions = ResolveHabitCommandOptions & {
  pendingInterpretedText?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; text: string }>;
};

export type AssistantConversationTurn = {
  combinedInput: string;
  preview: AiCommandPreview;
  assistantText: string;
  stage: 'conversation' | 'needs-clarification' | 'pending-confirmation';
};

type ModelDraftFields = Partial<{
  name: string;
  kind: HabitKind;
  category: string;
  icon: string;
  color: string;
  targetValue: number;
  unit: string;
  scheduleKind: HabitFormDraft['scheduleKind'];
  weekdays: number[];
  cadenceCount: number;
  intervalDays: number;
  startDate: string;
  endDate: string;
  reminderEnabled: boolean;
  reminderTime: string;
}>;

type ModelCommand = {
  intent?: string;
  habitName?: string;
  dateKey?: string;
  value?: number;
  note?: string;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  fields?: ModelDraftFields;
};

export async function resolveHabitCommand(
  input: string,
  habits: Habit[],
  logs: HabitLog[],
  options: ResolveHabitCommandOptions = {},
): Promise<AiCommandPreview> {
  const interpretedText = input.trim().replace(/\s+/g, ' ');

  if (!interpretedText) {
    return {
      interpretedText,
      intent: 'unknown',
      preview: 'Say or type a habit request to prepare a safe preview.',
      status: 'needs-clarification',
      provider: 'local-rules',
    };
  }

  try {
    const modelCommand = await classifyHabitCommand(interpretedText, habits, options.now ?? new Date());
    if (modelCommand) {
      return buildPreviewFromModel(interpretedText, modelCommand, habits, logs, options);
    }
  } catch {
    // Fall back to local rules so the screen stays usable if Gemini is unavailable.
  }

  return interpretHabitCommand(interpretedText, habits, logs, options);
}

export async function resolveAssistantConversationTurn(
  input: string,
  habits: Habit[],
  logs: HabitLog[],
  options: AssistantConversationOptions = {},
): Promise<AssistantConversationTurn> {
  const trimmedInput = input.trim();
  const combinedInput = [options.pendingInterpretedText?.trim(), trimmedInput].filter(Boolean).join(' ').trim();
  const preview = await resolveHabitCommand(combinedInput || trimmedInput, habits, logs, options);
  const assistantText = await buildAssistantTextFromPreview(preview, habits, logs, options);

  return {
    combinedInput: preview.interpretedText || combinedInput || trimmedInput,
    preview,
    assistantText,
    stage:
      preview.status === 'needs-clarification'
        ? 'needs-clarification'
        : preview.execution
          ? 'pending-confirmation'
          : 'conversation',
  };
}

export function interpretHabitCommand(
  input: string,
  habits: Habit[],
  logs: HabitLog[],
  options: ResolveHabitCommandOptions = {},
): AiCommandPreview {
  const interpretedText = input.trim().replace(/\s+/g, ' ');
  const text = interpretedText.toLowerCase();
  const now = options.now ?? new Date();

  if (!interpretedText) {
    return {
      interpretedText,
      intent: 'unknown',
      preview: 'Say or type a habit request to prepare a safe preview.',
      status: 'needs-clarification',
      provider: 'local-rules',
    };
  }

  const matches = matchHabits(habits, text, interpretedText, undefined, options.selectedHabitId);
  const matchedHabit = matches.length === 1 ? matches[0] : undefined;
  const needsHabit = /\b(delete|remove|archive|restore|complete|done|skip|log|note|change|update|modify)\b/.test(text);

  if (matches.length > 1) {
    return buildDisambiguationPreview(interpretedText, 'unknown', matches, 'I found multiple matching habits. Choose one before anything changes.');
  }

  if (/\b(delete|remove)\b/.test(text)) {
    return buildLifecyclePreview('delete', interpretedText, matchedHabit, logs, now, 'Delete habit', options.selectedHabitId);
  }

  if (/\barchive\b/.test(text)) {
    return buildLifecyclePreview('archive', interpretedText, matchedHabit, logs, now, 'Archive habit', options.selectedHabitId);
  }

  if (/\brestore\b/.test(text)) {
    return buildLifecyclePreview('restore', interpretedText, matchedHabit, logs, now, 'Restore habit', options.selectedHabitId);
  }

  if (/\b(complete|completed|done)\b/.test(text)) {
    return buildStatusPreview('complete', interpretedText, matchedHabit, logs, now, needsHabit);
  }

  if (/\bskip(ped)?\b/.test(text)) {
    return buildStatusPreview('skip', interpretedText, matchedHabit, logs, now, needsHabit);
  }

  if (/\b(note|journal)\b/.test(text)) {
    return buildNotePreview(interpretedText, matchedHabit, logs, now, needsHabit);
  }

  if (/\b(log|drank|read|ran|walked|minutes|glasses|pages|reps|steps)\b/.test(text)) {
    return buildLogPreview(interpretedText, matchedHabit, logs, now, needsHabit);
  }

  if (/\b(change|update|modify)\b/.test(text)) {
    return buildModifyPreview(interpretedText, matchedHabit, now, 'local-rules');
  }

  if (/\b(summary|summarize|how am i doing|progress)\b/.test(text)) {
    return buildSummaryPreview(interpretedText, habits, logs, 'local-rules');
  }

  if (/\b(suggest|recommend|idea|template|help me|goal)\b/.test(text)) {
    return buildRecommendationPreview(interpretedText, habits, logs, 'local-rules');
  }

  if (/\b(create|add|start|remind me)\b/.test(text)) {
    return buildCreatePreview(interpretedText, now, 'local-rules');
  }

  return {
    interpretedText,
    intent: 'unknown',
    preview: 'I need a clearer command before previewing an action. Nothing has changed.',
    status: 'needs-clarification',
    provider: 'local-rules',
  };
}

async function classifyHabitCommand(interpretedText: string, habits: Habit[], now: Date) {
  const habitContext = habits.slice(0, 30).map((habit) => ({
    name: habit.name,
    archived: Boolean(habit.archivedAt),
    category: habit.category,
    type: habit.kind,
    targetValue: habit.targetValue ?? null,
    unit: habit.unit ?? '',
  }));

  const prompt = [
    `Today is ${format(now, 'yyyy-MM-dd')}.`,
    'You classify voice commands for a habit assistant. Return JSON only with no markdown.',
    'Allowed intents: create, modify, delete, archive, restore, complete, skip, log, note, summary, recommendation, unknown.',
    'For create or modify, fill fields only when the user clearly asked for them.',
    'Use 24-hour HH:mm time if a reminder time is mentioned.',
    'Use ISO YYYY-MM-DD for explicit startDate, endDate, or dateKey when present.',
    'If the user did not provide enough detail, set needsClarification=true and add a short clarificationQuestion.',
    `Available habits: ${JSON.stringify(habitContext)}`,
    'Return shape:',
    JSON.stringify({
      intent: 'modify',
      habitName: 'Reading',
      dateKey: '2026-05-25',
      value: 30,
      note: 'Felt focused',
      needsClarification: false,
      clarificationQuestion: '',
      fields: {
        name: 'Reading',
        kind: 'duration',
        category: 'Learning',
        icon: 'book',
        color: 'green',
        targetValue: 30,
        unit: 'minutes',
        scheduleKind: 'daily',
        weekdays: [1, 2, 3, 4, 5],
        cadenceCount: 3,
        intervalDays: 2,
        startDate: '2026-05-25',
        endDate: '2026-06-30',
        reminderEnabled: true,
        reminderTime: '21:00',
      },
    }),
    `User request: ${interpretedText}`,
  ].join('\n\n');

  const raw = await generateGeminiText(prompt, {
    systemInstruction:
      'You are a careful habit assistant parser. Prefer safe clarification over guessing. Output valid JSON only.',
  });

  const json = extractJsonObject(raw);
  if (!json) {
    return null;
  }

  try {
    return JSON.parse(json) as ModelCommand;
  } catch {
    return null;
  }
}

function buildPreviewFromModel(
  interpretedText: string,
  modelCommand: ModelCommand,
  habits: Habit[],
  logs: HabitLog[],
  options: ResolveHabitCommandOptions,
): AiCommandPreview {
  const provider: AssistantProvider = 'google';
  const intent = normalizeIntent(modelCommand.intent);
  const now = options.now ?? new Date();

  if (modelCommand.needsClarification && modelCommand.clarificationQuestion) {
    return {
      interpretedText,
      intent,
      preview: modelCommand.clarificationQuestion,
      status: 'needs-clarification',
      provider,
    };
  }

  if (intent === 'summary') {
    return buildSummaryPreview(interpretedText, habits, logs, provider);
  }

  if (intent === 'recommendation') {
    return buildRecommendationPreview(interpretedText, habits, logs, provider);
  }

  if (intent === 'create') {
    const baseDraft = hydrateDraftFromText(interpretedText, undefined, now);
    const nextDraft = applyModelFieldsToDraft(baseDraft, modelCommand.fields, now);
    if (modelCommand.habitName?.trim()) {
      nextDraft.name = toTitleCase(modelCommand.habitName.trim());
    }
    return buildCreatePreviewFromDraft(interpretedText, nextDraft, provider);
  }

  const matches = matchHabits(
    habits,
    modelCommand.habitName ?? '',
    interpretedText,
    intent,
    options.selectedHabitId,
  );

  if (matches.length > 1) {
    return buildDisambiguationPreview(
      interpretedText,
      intent,
      matches,
      `I found multiple habits that could match${modelCommand.habitName ? ` "${modelCommand.habitName}"` : ''}. Choose one before I continue.`,
      provider,
    );
  }

  const matchedHabit = matches[0];

  if (intent === 'modify') {
    return buildModifyPreviewFromModel(interpretedText, matchedHabit, modelCommand.fields, now, provider);
  }

  if (intent === 'delete' || intent === 'archive' || intent === 'restore') {
    return buildLifecyclePreview(intent, interpretedText, matchedHabit, logs, now, lifecycleVerb(intent), options.selectedHabitId, provider);
  }

  if (intent === 'complete' || intent === 'skip') {
    return buildStatusPreview(intent, interpretedText, matchedHabit, logs, now, true, provider, modelCommand.dateKey);
  }

  if (intent === 'note') {
    return buildNotePreview(interpretedText, matchedHabit, logs, now, true, provider, modelCommand.dateKey, modelCommand.note);
  }

  if (intent === 'log') {
    return buildLogPreview(interpretedText, matchedHabit, logs, now, true, provider, modelCommand.dateKey, modelCommand.value, modelCommand.note);
  }

  return interpretHabitCommand(interpretedText, habits, logs, options);
}

function buildCreatePreview(interpretedText: string, now: Date, provider: AssistantProvider): AiCommandPreview {
  return buildCreatePreviewFromDraft(interpretedText, hydrateDraftFromText(interpretedText, undefined, now), provider);
}

function buildCreatePreviewFromDraft(interpretedText: string, draft: HabitFormDraft, provider: AssistantProvider): AiCommandPreview {
  if (!draft.name.trim()) {
    return {
      interpretedText,
      intent: 'create',
      preview: 'Tell me the habit name first, like "Create a water habit for 8 glasses every day at 8 am."',
      status: 'needs-clarification',
      provider,
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
    provider,
    draftPayload: {
      draft,
      changeSummary: changes,
    },
    execution: {
      type: 'create',
      draft,
    },
  };
}

function buildModifyPreview(interpretedText: string, matchedHabit: Habit | undefined, now: Date, provider: AssistantProvider): AiCommandPreview {
  return buildModifyPreviewFromModel(interpretedText, matchedHabit, undefined, now, provider);
}

function buildModifyPreviewFromModel(
  interpretedText: string,
  matchedHabit: Habit | undefined,
  modelFields: ModelDraftFields | undefined,
  now: Date,
  provider: AssistantProvider,
): AiCommandPreview {
  if (!matchedHabit) {
    return {
      interpretedText,
      intent: 'modify',
      preview: 'Tell me which habit to modify so I can prepare the exact changes safely.',
      status: 'needs-clarification',
      provider,
    };
  }

  const existingDraft = draftFromHabit(matchedHabit);
  const heuristicDraft = hydrateDraftFromText(interpretedText, existingDraft, now);
  const nextDraft = applyModelFieldsToDraft(heuristicDraft, modelFields, now);
  const changeSummary = summarizeDraftDiff(existingDraft, nextDraft);

  if (!changeSummary.length) {
    return {
      interpretedText,
      intent: 'modify',
      preview: `I found "${matchedHabit.name}", but I still need the change details. Try "Change ${matchedHabit.name} to 30 minutes every night at 9 pm."`,
      status: 'needs-clarification',
      provider,
      matchedHabitId: matchedHabit.id,
    };
  }

  return {
    interpretedText,
    intent: 'modify',
    preview: `Update ${matchedHabit.name} after confirmation:\n${changeSummary.join('\n')}`,
    status: 'previewed',
    provider,
    matchedHabitId: matchedHabit.id,
    draftPayload: {
      draft: nextDraft,
      changeSummary,
    },
    execution: {
      type: 'modify',
      habitId: matchedHabit.id,
      draft: nextDraft,
    },
  };
}

function buildSummaryPreview(
  interpretedText: string,
  habits: Habit[],
  logs: HabitLog[],
  provider: AssistantProvider,
): AiCommandPreview {
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const activeHabits = habits.filter((habit) => !habit.archivedAt);
  const progress = getTodayProgress(activeHabits, logs, todayKey);
  const recentWindow = Array.from({ length: 7 }, (_, index) => format(subDays(new Date(), index), 'yyyy-MM-dd'));
  const recentScheduled = activeHabits.flatMap((habit) =>
    recentWindow
      .filter((dateKey) => isHabitScheduledForDate(habit, dateKey, logs))
      .map((dateKey) => ({ habit, dateKey })),
  );
  const recentCompleted = recentScheduled.filter(
    ({ habit, dateKey }) => getHabitLogForDate(logs, habit.id, dateKey)?.status === 'completed',
  ).length;
  const weeklyRate = recentScheduled.length ? Math.round((recentCompleted / recentScheduled.length) * 100) : 0;
  const bestHabit = activeHabits
    .map((habit) => ({ habit, rate: calculateCompletionRate(habit, logs) }))
    .sort((a, b) => b.rate - a.rate)[0];

  const summary = [
    `Today you have completed ${progress.completedCount} of ${progress.scheduledCount} scheduled habits, which is ${progress.percentage}%.`,
    `Your rolling 7-day completion rate is ${weeklyRate}%.`,
    bestHabit
      ? `Your strongest habit right now is ${bestHabit.habit.name} at ${bestHabit.rate}% completion.`
      : 'There is not enough history yet to rank your habits.',
  ].join(' ');

  return {
    interpretedText,
    intent: 'summary',
    preview: summary,
    status: 'previewed',
    provider,
  };
}

function buildRecommendationPreview(
  interpretedText: string,
  habits: Habit[],
  logs: HabitLog[],
  provider: AssistantProvider,
): AiCommandPreview {
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
    const completionAverage = activeCount
      ? Math.round(habits.reduce((sum, habit) => sum + calculateCompletionRate(habit, logs), 0) / activeCount)
      : 0;
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
    provider,
  };
}

function buildLifecyclePreview(
  intent: 'delete' | 'archive' | 'restore',
  interpretedText: string,
  habit: Habit | undefined,
  logs: HabitLog[],
  now: Date,
  verb: string,
  selectedHabitId?: string,
  provider: AssistantProvider = 'local-rules',
): AiCommandPreview {
  if (!habit) {
    return {
      interpretedText,
      intent,
      preview: `Which habit should I use for "${verb.toLowerCase()}"? No data will change until you confirm.`,
      status: 'needs-clarification',
      provider,
    };
  }

  const historyCount = logs.filter((log) => log.habitId === habit.id).length;
  const destructiveSuggestion =
    intent === 'delete' && historyCount > 0
      ? `${habit.name} already has ${historyCount} historical entr${historyCount === 1 ? 'y' : 'ies'}. Archive is safer if you want to keep past progress.`
      : undefined;

  return {
    interpretedText,
    intent,
    preview:
      intent === 'delete'
        ? `Delete ${habit.name} after explicit confirmation.${destructiveSuggestion ? `\n${destructiveSuggestion}` : ''}`
        : `${verb}: ${habit.name}. Review this preview before confirming.`,
    status: 'previewed',
    provider,
    matchedHabitId: habit.id,
    destructiveSuggestion,
    execution:
      intent === 'delete'
        ? { type: 'delete', habitId: habit.id }
        : intent === 'archive'
          ? { type: 'archive', habitId: habit.id }
          : { type: 'restore', habitId: habit.id },
  };
}

function buildStatusPreview(
  intent: 'complete' | 'skip',
  interpretedText: string,
  habit: Habit | undefined,
  logs: HabitLog[],
  now: Date,
  needsHabit: boolean,
  provider: AssistantProvider = 'local-rules',
  explicitDate?: string,
): AiCommandPreview {
  if (needsHabit && !habit) {
    return {
      interpretedText,
      intent,
      preview: `Which habit should I ${intent === 'complete' ? 'mark complete' : 'mark skipped'}? Nothing has changed yet.`,
      status: 'needs-clarification',
      provider,
    };
  }

  if (!habit) {
    return {
      interpretedText,
      intent,
      preview: 'Choose a habit first so I can prepare the correct status update.',
      status: 'needs-clarification',
      provider,
    };
  }

  const dateKey = resolveActionDate(interpretedText, now, explicitDate);
  return {
    interpretedText,
    intent,
    preview: `${intent === 'complete' ? 'Mark complete' : 'Mark skipped'}: ${habit.name} on ${friendlyDateLabel(dateKey, now)}.`,
    status: 'previewed',
    provider,
    matchedHabitId: habit.id,
    targetDate: dateKey,
    execution:
      intent === 'complete'
        ? { type: 'complete', habitId: habit.id, dateKey }
        : { type: 'skip', habitId: habit.id, dateKey },
  };
}

function buildLogPreview(
  interpretedText: string,
  habit: Habit | undefined,
  logs: HabitLog[],
  now: Date,
  needsHabit: boolean,
  provider: AssistantProvider = 'local-rules',
  explicitDate?: string,
  explicitValue?: number,
  explicitNote?: string,
): AiCommandPreview {
  if (needsHabit && !habit) {
    return {
      interpretedText,
      intent: 'log',
      preview: 'Tell me which habit to log so I can prepare the right progress update.',
      status: 'needs-clarification',
      provider,
    };
  }

  if (!habit) {
    return {
      interpretedText,
      intent: 'log',
      preview: 'Choose a habit first so I can log progress safely.',
      status: 'needs-clarification',
      provider,
    };
  }

  const value = explicitValue ?? extractNumericValue(interpretedText);
  if (value == null) {
    return {
      interpretedText,
      intent: 'log',
      preview: `I found "${habit.name}", but I still need the amount to log.`,
      status: 'needs-clarification',
      provider,
      matchedHabitId: habit.id,
    };
  }

  const dateKey = resolveActionDate(interpretedText, now, explicitDate);
  const note = explicitNote || undefined;
  const unitLabel = habit.unit ? ` ${habit.unit}` : '';
  return {
    interpretedText,
    intent: 'log',
    preview: `Log ${value}${unitLabel} for ${habit.name} on ${friendlyDateLabel(dateKey, now)}.`,
    status: 'previewed',
    provider,
    matchedHabitId: habit.id,
    targetDate: dateKey,
    logValue: value,
    noteText: note,
    execution: {
      type: 'log',
      habitId: habit.id,
      dateKey,
      value,
      note,
    },
  };
}

function buildNotePreview(
  interpretedText: string,
  habit: Habit | undefined,
  logs: HabitLog[],
  now: Date,
  needsHabit: boolean,
  provider: AssistantProvider = 'local-rules',
  explicitDate?: string,
  explicitNote?: string,
): AiCommandPreview {
  if (needsHabit && !habit) {
    return {
      interpretedText,
      intent: 'note',
      preview: 'Tell me which habit to attach the note to before I save anything.',
      status: 'needs-clarification',
      provider,
    };
  }

  if (!habit) {
    return {
      interpretedText,
      intent: 'note',
      preview: 'Choose a habit first so I can place the note on the correct log.',
      status: 'needs-clarification',
      provider,
    };
  }

  const note = explicitNote?.trim() || extractNoteText(interpretedText, habit.name);
  if (!note) {
    return {
      interpretedText,
      intent: 'note',
      preview: `I found "${habit.name}", but I still need the note text.`,
      status: 'needs-clarification',
      provider,
      matchedHabitId: habit.id,
    };
  }

  const dateKey = resolveActionDate(interpretedText, now, explicitDate);
  return {
    interpretedText,
    intent: 'note',
    preview: `Save this note for ${habit.name} on ${friendlyDateLabel(dateKey, now)}:\n"${note}"`,
    status: 'previewed',
    provider,
    matchedHabitId: habit.id,
    targetDate: dateKey,
    noteText: note,
    execution: {
      type: 'note',
      habitId: habit.id,
      dateKey,
      note,
    },
  };
}

function buildDisambiguationPreview(
  interpretedText: string,
  intent: AiIntent,
  matches: Habit[],
  message: string,
  provider: AssistantProvider = 'local-rules',
): AiCommandPreview {
  return {
    interpretedText,
    intent,
    preview: message,
    status: 'needs-clarification',
    provider,
    matchedHabitIds: matches.map((habit) => habit.id),
    disambiguationOptions: matches.map((habit) => ({
      id: habit.id,
      name: habit.name,
      archived: Boolean(habit.archivedAt),
    })),
  };
}

function hydrateDraftFromText(input: string, baseDraft?: HabitFormDraft, now: Date = new Date()) {
  const text = input.toLowerCase();
  const draft = baseDraft ? { ...baseDraft } : createDefaultDraft(format(now, 'yyyy-MM-dd'));

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

  if (/\bevery day|daily|every night|nightly\b/.test(text)) {
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

  const parsedStartDate = extractStartDate(text, now);
  if (parsedStartDate) {
    draft.startDate = parsedStartDate;
  }

  const parsedEndDate = extractEndDate(text, now);
  if (parsedEndDate) {
    draft.endDate = parsedEndDate;
  }

  return draft;
}

function applyModelFieldsToDraft(
  draft: HabitFormDraft,
  fields: ModelDraftFields | undefined,
  now: Date,
): HabitFormDraft {
  if (!fields) {
    return draft;
  }

  const nextDraft = { ...draft };

  if (fields.name?.trim()) nextDraft.name = toTitleCase(fields.name.trim());
  if (fields.kind && ['yesNo', 'count', 'duration', 'negative'].includes(fields.kind)) nextDraft.kind = fields.kind;
  if (fields.category?.trim()) nextDraft.category = toTitleCase(fields.category.trim());
  if (typeof fields.targetValue === 'number' && Number.isFinite(fields.targetValue)) nextDraft.targetValue = String(fields.targetValue);
  if (fields.unit?.trim()) nextDraft.unit = fields.unit.trim().toLowerCase();
  if (fields.scheduleKind && isScheduleKind(fields.scheduleKind)) nextDraft.scheduleKind = fields.scheduleKind;
  if (Array.isArray(fields.weekdays) && fields.weekdays.length) {
    nextDraft.weekdays = Array.from(new Set(fields.weekdays.filter((day) => day >= 0 && day <= 6))).sort();
  }
  if (typeof fields.cadenceCount === 'number' && Number.isFinite(fields.cadenceCount)) nextDraft.cadenceCount = String(fields.cadenceCount);
  if (typeof fields.intervalDays === 'number' && Number.isFinite(fields.intervalDays)) nextDraft.intervalDays = String(fields.intervalDays);

  const startDate = coerceDateKey(fields.startDate, now);
  if (startDate) nextDraft.startDate = startDate;
  if (fields.endDate === '') {
    nextDraft.endDate = '';
  } else {
    const endDate = coerceDateKey(fields.endDate, now);
    if (endDate) nextDraft.endDate = endDate;
  }

  if (typeof fields.reminderEnabled === 'boolean') nextDraft.reminderEnabled = fields.reminderEnabled;
  const reminderTime = coerceTime(fields.reminderTime);
  if (reminderTime) {
    nextDraft.reminderEnabled = true;
    nextDraft.reminderTime = reminderTime;
  }

  const icon = coerceIcon(fields.icon);
  if (icon) nextDraft.icon = icon;
  const color = coerceColor(fields.color);
  if (color) nextDraft.color = color;

  return nextDraft;
}

function summarizeDraft(draft: HabitFormDraft) {
  const schedule = formatDraftSchedule(draft);
  const target =
    draft.kind === 'count' || draft.kind === 'duration'
      ? `${draft.targetValue || '1'} ${draft.unit || (draft.kind === 'duration' ? 'minutes' : 'times')}`
      : 'simple check-in';
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
    changes.push(
      `- Target: ${previous.targetValue || 'none'} ${previous.unit || ''}`.trimEnd() +
        ` -> ${next.targetValue || 'none'} ${next.unit || ''}`.trimEnd(),
    );
  }
  if (formatDraftSchedule(previous) !== formatDraftSchedule(next)) {
    changes.push(`- Schedule: ${formatDraftSchedule(previous)} -> ${formatDraftSchedule(next)}`);
  }
  if (previous.reminderEnabled !== next.reminderEnabled || previous.reminderTime !== next.reminderTime) {
    changes.push(
      `- Reminder: ${previous.reminderEnabled ? previous.reminderTime : 'Off'} -> ${next.reminderEnabled ? next.reminderTime : 'Off'}`,
    );
  }
  if (previous.category !== next.category) changes.push(`- Category: ${previous.category} -> ${next.category}`);
  if (previous.icon !== next.icon) changes.push(`- Icon: ${previous.icon} -> ${next.icon}`);
  if (previous.color !== next.color) changes.push('- Color updated');
  if (previous.startDate !== next.startDate) changes.push(`- Start date: ${previous.startDate} -> ${next.startDate}`);
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

function normalizeIntent(value?: string): AiIntent {
  switch ((value ?? '').toLowerCase()) {
    case 'create':
    case 'modify':
    case 'delete':
    case 'archive':
    case 'restore':
    case 'complete':
    case 'skip':
    case 'log':
    case 'note':
    case 'summary':
    case 'recommendation':
      return value!.toLowerCase() as AiIntent;
    default:
      return 'unknown';
  }
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchHabits(
  habits: Habit[],
  habitName: string,
  interpretedText: string,
  intent?: AiIntent,
  selectedHabitId?: string,
) {
  if (selectedHabitId) {
    return habits.filter((habit) => habit.id === selectedHabitId);
  }

  const normalizedName = normalizeText(habitName);
  const normalizedText = normalizeText(interpretedText);
  const pool =
    intent === 'restore' ? habits.filter((habit) => habit.archivedAt) : habits;

  const scored = pool
    .map((habit) => {
      const normalizedHabit = normalizeText(habit.name);
      let score = 0;

      if (normalizedName && normalizedHabit === normalizedName) score += 100;
      if (normalizedText.includes(normalizedHabit)) score += 80;
      if (normalizedName && normalizedHabit.includes(normalizedName)) score += 40;
      if (normalizedName && normalizedName.includes(normalizedHabit)) score += 40;

      const habitTokens = normalizedHabit.split(' ').filter((token) => token.length > 2);
      const textTokens = new Set(normalizedText.split(' ').filter((token) => token.length > 2));
      score += habitTokens.filter((token) => textTokens.has(token)).length * 8;

      if (!habit.archivedAt && intent !== 'restore') score += 1;
      return { habit, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (!scored.length) {
    return [];
  }

  const bestScore = scored[0].score;
  return scored
    .filter((entry) => entry.score >= Math.max(bestScore - 10, 40))
    .map((entry) => entry.habit);
}

function resolveActionDate(interpretedText: string, now: Date, explicitDate?: string) {
  return coerceDateKey(explicitDate, now) ?? extractRelativeDateKey(interpretedText, now) ?? format(now, 'yyyy-MM-dd');
}

function extractRelativeDateKey(text: string, now: Date) {
  const lowered = text.toLowerCase();
  if (/\byesterday\b/.test(lowered)) return format(subDays(now, 1), 'yyyy-MM-dd');
  if (/\btomorrow\b/.test(lowered)) return format(addDays(now, 1), 'yyyy-MM-dd');
  if (/\btoday\b/.test(lowered)) return format(now, 'yyyy-MM-dd');

  const isoMatch = lowered.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch?.[1]) return isoMatch[1];

  const longDateMatch = lowered.match(/\b(?:on|for|starting|start|ended|end)\s+([a-z]+\s+\d{1,2}(?:,\s*\d{4})?)\b/i);
  const parsed = longDateMatch?.[1] ? parseNaturalDate(longDateMatch[1], now) : '';
  return parsed || '';
}

function extractStartDate(text: string, now: Date) {
  const match = text.match(/\b(?:start|starting|begin|from)\s+([a-z0-9,\-\s]+)/i);
  if (!match?.[1]) {
    return '';
  }
  return parseNaturalDate(match[1], now);
}

function extractEndDate(text: string, now: Date) {
  const match = text.match(/\b(?:until|through|ending|end on|end)\s+([a-z0-9,\-\s]+)/i);
  if (!match?.[1]) {
    return '';
  }
  return parseNaturalDate(match[1], now);
}

function parseNaturalDate(value: string, now: Date) {
  const cleaned = value.trim().replace(/[.]/g, '');
  const formats = ['yyyy-MM-dd', 'MMMM d yyyy', 'MMMM d, yyyy', 'MMM d yyyy', 'MMM d, yyyy', 'MMMM d', 'MMM d'];

  for (const dateFormat of formats) {
    const parsed = parse(cleaned, dateFormat, now);
    if (isValid(parsed)) {
      const yearless = !/\b\d{4}\b/.test(cleaned);
      const resolved = yearless ? new Date(parsed.setFullYear(now.getFullYear())) : parsed;
      return format(resolved, 'yyyy-MM-dd');
    }
  }

  return '';
}

function coerceDateKey(value: string | undefined, now: Date) {
  if (!value?.trim()) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();
  return parseNaturalDate(value, now);
}

function coerceTime(value: string | undefined) {
  if (!value?.trim()) return '';
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function isScheduleKind(value: string): value is HabitFormDraft['scheduleKind'] {
  return ['daily', 'weekdays', 'timesPerWeek', 'timesPerMonth', 'interval'].includes(value);
}

function coerceIcon(value?: string) {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  const aliasMap: Record<string, string> = {
    droplets: 'drop',
    water: 'drop',
    book: 'book',
    reading: 'book',
    sleep: 'moon',
    moon: 'moon',
    workout: 'bolt',
    fitness: 'bolt',
    journal: 'sparkles',
    meditation: 'leaf',
  };
  const nextIcon = aliasMap[normalized] ?? normalized;
  return HABIT_ICONS.includes(nextIcon) ? nextIcon : '';
}

function coerceColor(value?: string) {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  const aliasMap: Record<string, string> = {
    blue: HABIT_COLORS[0],
    green: HABIT_COLORS[1],
    teal: HABIT_COLORS[1],
    orange: HABIT_COLORS[2],
    red: HABIT_COLORS[3],
    purple: HABIT_COLORS[4],
    yellow: HABIT_COLORS[5],
    amber: HABIT_COLORS[5],
  };
  return HABIT_COLORS.includes(normalized) ? normalized : aliasMap[normalized] ?? '';
}

function extractNumericValue(text: string) {
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function extractNoteText(text: string, habitName: string) {
  const noteAfterColon = text.match(/:\s*(.+)$/);
  if (noteAfterColon?.[1]) {
    return noteAfterColon[1].trim();
  }

  const stripped = text
    .replace(new RegExp(habitName, 'ig'), '')
    .replace(/\b(add|save|note|journal|for|to|today|yesterday|tomorrow)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return stripped;
}

function friendlyDateLabel(dateKey: string, now: Date) {
  if (dateKey === format(now, 'yyyy-MM-dd')) return 'today';
  if (dateKey === format(subDays(now, 1), 'yyyy-MM-dd')) return 'yesterday';
  if (dateKey === format(addDays(now, 1), 'yyyy-MM-dd')) return 'tomorrow';
  return dateKey;
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }

  return '';
}

function lifecycleVerb(intent: 'delete' | 'archive' | 'restore') {
  switch (intent) {
    case 'delete':
      return 'Delete habit';
    case 'archive':
      return 'Archive habit';
    case 'restore':
      return 'Restore habit';
  }
}

async function buildAssistantTextFromPreview(
  preview: AiCommandPreview,
  habits: Habit[],
  logs: HabitLog[],
  options: AssistantConversationOptions,
) {
  if (preview.status === 'needs-clarification') {
    if (preview.disambiguationOptions?.length) {
      return `${preview.preview} I can show the closest matches below so you can pick the right one quickly.`;
    }
    return preview.preview;
  }

  if (preview.execution) {
    return buildNaturalConfirmationText(preview);
  }

  return buildConversationalReply(preview, habits, logs, options);
}

function buildNaturalConfirmationText(preview: AiCommandPreview) {
  switch (preview.intent) {
    case 'create':
      return 'I put together a new habit draft for you. Review it below, and confirm only if it looks right.';
    case 'modify':
      return 'I mapped the update I think you want. Check the changes below, then confirm when they look correct.';
    case 'complete':
      return 'I found the completion update. Confirm it below and I will mark it done.';
    case 'delete':
      return preview.destructiveSuggestion
        ? `I found the delete request. ${preview.destructiveSuggestion} If you still want to remove it, confirm below.`
        : 'I found the delete request. Please confirm below before I remove anything.';
    case 'archive':
      return 'I prepared the archive action. Confirm below if you want me to move it out of your active habits.';
    case 'restore':
      return 'I found the restore action. Confirm below if you want it back in your active habits.';
    case 'skip':
      return 'I found the skip update. Confirm below if that is the right day and habit.';
    case 'log':
      return 'I prepared the progress update. Confirm below and I will save it.';
    case 'note':
      return 'I captured the note you want to save. Confirm below and I will add it to the right day.';
    default:
      return 'I understood the action. Review the details below, then confirm if you want me to continue.';
  }
}

async function buildConversationalReply(
  preview: AiCommandPreview,
  habits: Habit[],
  logs: HabitLog[],
  options: AssistantConversationOptions,
) {
  if (preview.intent === 'summary' || preview.intent === 'recommendation') {
    const prompt = [
      `User request: ${preview.interpretedText}`,
      `Structured preview: ${preview.preview}`,
      `Active habits: ${JSON.stringify(habits.filter((habit) => !habit.archivedAt).slice(0, 20).map((habit) => ({
        name: habit.name,
        category: habit.category,
        kind: habit.kind,
        targetValue: habit.targetValue ?? null,
        unit: habit.unit ?? '',
      })))}`,
      `Recent logs: ${JSON.stringify(logs.slice(-60))}`,
      `Conversation history: ${JSON.stringify((options.conversationHistory ?? []).slice(-6))}`,
      'Reply like a thoughtful in-app coach. Keep it short, warm, and practical.',
    ].join('\n\n');

    try {
      return await generateGeminiText(prompt, {
        systemInstruction:
          preview.intent === 'summary'
            ? 'You are a concise in-app habit coach summarizing the user progress with empathy and specifics from the provided data only.'
            : 'You are a concise in-app habit coach giving practical suggestions grounded in the provided habit data only.',
      });
    } catch {
      return preview.preview;
    }
  }

  if (preview.intent === 'unknown') {
    const prompt = [
      `User message: ${preview.interpretedText}`,
      `Conversation history: ${JSON.stringify((options.conversationHistory ?? []).slice(-8))}`,
      `Active habits: ${JSON.stringify(habits.filter((habit) => !habit.archivedAt).slice(0, 16).map((habit) => ({
        name: habit.name,
        category: habit.category,
        kind: habit.kind,
      })))}`,
      'Reply as a real conversational AI habit assistant. Be helpful, short, friendly, and suggest concrete next steps when useful. Do not invent actions or claim data changed.',
    ].join('\n\n');

    try {
      return await generateGeminiText(prompt, {
        systemInstruction:
          'You are HabitAI, a mobile habit assistant. Answer naturally, stay practical, and keep replies concise enough for a chat bubble.',
      });
    } catch {
      return 'I can help you plan habits, adjust existing ones, explain your progress, or turn an idea into a habit. Tell me what you want to work on.';
    }
  }

  return preview.preview;
}
