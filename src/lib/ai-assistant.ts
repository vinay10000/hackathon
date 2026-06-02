import { addDays, format, parseISO, subDays } from 'date-fns';

import {
  calculateCompletionRate,
  createDefaultDraft,
  draftFromHabit,
  getHabitLogForDate,
  getTodayProgress,
  HABIT_COLORS,
  HABIT_ICONS,
} from '@/src/domain/habits';
import { generateGeminiText, getGeminiModelName } from '@/src/lib/gemini';
import { Habit, HabitFormDraft, HabitKind, HabitLog } from '@/src/types/habits';

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
  description: string;
  motivationalNote: string;
}>;

type ModelPlan = {
  mode?: 'coach' | 'action' | 'mixed';
  reply?: string;
  intent?: string;
  habitName?: string;
  dateKey?: string;
  value?: number;
  note?: string;
  confidence?: number;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  confirmationMessage?: string;
  destructiveSuggestion?: string;
  fields?: ModelDraftFields;
};

export async function resolveHabitCommand(
  input: string,
  habits: Habit[],
  logs: HabitLog[],
  options: ResolveHabitCommandOptions = {},
): Promise<AiCommandPreview> {
  const interpretedText = normalizeInput(input);
  if (!interpretedText) {
    return buildClarificationPreview('', 'unknown', 'Say or type what you want help with.');
  }

  const modelPlan = await tryGenerateModelPlan(interpretedText, habits, logs, options);
  if (modelPlan) {
    return buildPreviewFromModelPlan(interpretedText, modelPlan, habits, logs, options);
  }

  return interpretHabitCommand(interpretedText, habits, logs, options);
}

export async function resolveAssistantConversationTurn(
  input: string,
  habits: Habit[],
  logs: HabitLog[],
  options: AssistantConversationOptions = {},
): Promise<AssistantConversationTurn> {
  const trimmedInput = normalizeInput(input);
  const combinedInput = [options.pendingInterpretedText?.trim(), trimmedInput].filter(Boolean).join(' ').trim();
  const interpretedText = combinedInput || trimmedInput;
  const now = options.now ?? new Date();

  const modelPlan = await tryGenerateModelPlan(interpretedText, habits, logs, {
    ...options,
    now,
  });

  const preview = modelPlan
    ? buildPreviewFromModelPlan(interpretedText, modelPlan, habits, logs, { ...options, now })
    : interpretHabitCommand(interpretedText, habits, logs, { ...options, now });

  const assistantText = await buildAssistantText({
    preview,
    modelPlan,
    interpretedText,
    habits,
    logs,
    options: { ...options, now },
  });

  return {
    combinedInput: interpretedText,
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
  const interpretedText = normalizeInput(input);
  const text = interpretedText.toLowerCase();
  const now = options.now ?? new Date();

  if (!interpretedText) {
    return buildClarificationPreview('', 'unknown', 'Say or type what you want help with.');
  }

  const matches = matchHabits(habits, interpretedText, options.selectedHabitId);
  const matchedHabit = matches.length === 1 ? matches[0] : undefined;

  if (matches.length > 1 && /\b(update|change|modify|delete|remove|archive|restore|complete|done|skip|log|note)\b/.test(text)) {
    return buildDisambiguationPreview(
      interpretedText,
      'unknown',
      matches,
      'I found more than one matching habit. Pick the right one and I will continue safely.',
    );
  }

  if (/\b(delete|remove)\b/.test(text)) {
    return buildLifecyclePreview('delete', interpretedText, matchedHabit, matches, now);
  }

  if (/\barchive\b/.test(text)) {
    return buildLifecyclePreview('archive', interpretedText, matchedHabit, matches, now);
  }

  if (/\brestore\b/.test(text)) {
    return buildLifecyclePreview('restore', interpretedText, matchedHabit, matches, now);
  }

  if (/\b(complete|completed|done|finished)\b/.test(text)) {
    return buildStatusPreview('complete', interpretedText, matchedHabit, matches, logs, now);
  }

  if (/\bskip(ped)?\b/.test(text)) {
    return buildStatusPreview('skip', interpretedText, matchedHabit, matches, logs, now);
  }

  if (/\b(note|journal)\b/.test(text)) {
    return buildNotePreview(interpretedText, matchedHabit, matches, logs, now, extractTrailingText(interpretedText));
  }

  if (/\b(log|track|record)\b/.test(text)) {
    const value = extractNumber(interpretedText);
    return buildLogPreview(interpretedText, matchedHabit, matches, logs, now, value);
  }

  if (/\b(create|add|start|new habit)\b/.test(text)) {
    return buildCreatePreview(interpretedText, now);
  }

  if (/\b(update|change|edit|modify)\b/.test(text)) {
    return buildModifyPreview(interpretedText, matchedHabit, matches, now);
  }

  if (/\b(summary|progress|how am i doing|recap)\b/.test(text)) {
    return {
      interpretedText,
      intent: 'summary',
      preview: 'I can summarize your recent progress and patterns from your real habit data.',
      status: 'previewed',
      provider: 'local-rules',
    };
  }

  if (/\b(recommend|suggest|advice|coach|why|struggling|help)\b/.test(text)) {
    return {
      interpretedText,
      intent: 'recommendation',
      preview: 'I can coach you using your current habits, recent logs, and what you just told me.',
      status: 'previewed',
      provider: 'local-rules',
    };
  }

  return {
    interpretedText,
    intent: 'unknown',
    preview: 'I can help you reflect, coach you through a habit problem, or prepare a safe action preview.',
    status: 'previewed',
    provider: 'local-rules',
  };
}

async function tryGenerateModelPlan(
  interpretedText: string,
  habits: Habit[],
  logs: HabitLog[],
  options: AssistantConversationOptions,
) {
  try {
    return await generateModelPlan(interpretedText, habits, logs, options);
  } catch {
    return null;
  }
}

async function generateModelPlan(
  interpretedText: string,
  habits: Habit[],
  logs: HabitLog[],
  options: AssistantConversationOptions,
): Promise<ModelPlan | null> {
  const now = options.now ?? new Date();
  const todayKey = format(now, 'yyyy-MM-dd');
  const activeHabits = habits.filter((habit) => !habit.archivedAt);
  const progress = getTodayProgress(activeHabits, logs, todayKey);

  const habitContext = habits.slice(0, 24).map((habit) => ({
    name: habit.name,
    archived: Boolean(habit.archivedAt),
    category: habit.category,
    kind: habit.kind,
    targetValue: habit.targetValue ?? null,
    unit: habit.unit ?? '',
    schedule: summarizeSchedule(habit),
    recentStatus: getHabitLogForDate(logs, habit.id, todayKey)?.status ?? 'none',
  }));

  const recentLogs = logs
    .slice(0, 40)
    .map((log) => ({
      habitId: log.habitId,
      date: log.date,
      value: log.value ?? null,
      note: log.note ?? '',
      status: log.status,
    }));

  const prompt = [
    `Today is ${todayKey}.`,
    `HabitAI is a conversational habit coach that can also prepare safe app actions.`,
    `Current model: ${getGeminiModelName()}.`,
    `Today's progress: ${progress.completedCount}/${progress.scheduledCount} completed (${progress.percentage}%).`,
    `Available habits: ${JSON.stringify(habitContext)}`,
    `Recent logs: ${JSON.stringify(recentLogs)}`,
    `Conversation history: ${JSON.stringify((options.conversationHistory ?? []).slice(-8))}`,
    `Selected habit id: ${options.selectedHabitId ?? ''}`,
    `Pending interpreted text: ${options.pendingInterpretedText ?? ''}`,
    'Return JSON only. No markdown. No commentary outside the JSON.',
    'If the user wants coaching, encouragement, reflection, planning, explanation, or help deciding what to do, set mode="coach" or mode="mixed" and write a natural reply.',
    'If the user wants an app action, set mode="action" or mode="mixed", choose an intent, and include only the fields the user clearly asked for.',
    'Use needsClarification=true instead of guessing when an action is ambiguous or destructive.',
    'Do not claim the app already changed data. Use confirmationMessage for actions that need review.',
    'Use ISO YYYY-MM-DD for dateKey, startDate, and endDate. Use 24-hour HH:mm for reminderTime.',
    'Allowed intents: create, modify, delete, archive, restore, complete, skip, log, note, summary, recommendation, unknown.',
    `Return shape: ${JSON.stringify({
      mode: 'mixed',
      reply: 'That makes sense. Your current streak is slipping mostly on weekdays. We can lower the target or move the reminder later.',
      intent: 'modify',
      habitName: 'Reading',
      dateKey: todayKey,
      value: 20,
      note: 'Felt distracted',
      confidence: 0.9,
      needsClarification: false,
      clarificationQuestion: '',
      confirmationMessage: 'I can update Reading to 20 minutes and move the reminder later. Review it below before I change anything.',
      destructiveSuggestion: 'Archive it instead of deleting if you may want the history later.',
      fields: {
        name: 'Reading',
        kind: 'duration',
        category: 'Learning',
        icon: 'book',
        color: 'green',
        targetValue: 20,
        unit: 'minutes',
        scheduleKind: 'daily',
        weekdays: [1, 2, 3, 4, 5],
        cadenceCount: 3,
        intervalDays: 2,
        startDate: todayKey,
        endDate: '',
        reminderEnabled: true,
        reminderTime: '20:30',
        description: 'Read consistently in the evening.',
        motivationalNote: 'Small progress still counts.',
      },
    })}`,
    `User message: ${interpretedText}`,
  ].join('\n\n');

  const raw = await generateGeminiText(prompt, {
    systemInstruction:
      'You are HabitAI, a careful conversational coach. Be warm, practical, and safe. Output valid JSON only.',
  });

  const json = extractJsonObject(raw);
  if (!json) {
    return null;
  }

  try {
    return JSON.parse(json) as ModelPlan;
  } catch {
    return null;
  }
}

function buildPreviewFromModelPlan(
  interpretedText: string,
  plan: ModelPlan,
  habits: Habit[],
  logs: HabitLog[],
  options: ResolveHabitCommandOptions,
): AiCommandPreview {
  const provider: AssistantProvider = 'google';
  const intent = normalizeIntent(plan.intent);
  const now = options.now ?? new Date();
  const matches = matchHabits(habits, plan.habitName ?? interpretedText, options.selectedHabitId, intent);
  const matchedHabit = matches.length === 1 ? matches[0] : undefined;

  if (plan.needsClarification && plan.clarificationQuestion) {
    return buildClarificationPreview(interpretedText, intent, plan.clarificationQuestion, provider, matches);
  }

  if (matches.length > 1 && intent !== 'create' && intent !== 'summary' && intent !== 'recommendation' && intent !== 'unknown') {
    return buildDisambiguationPreview(
      interpretedText,
      intent,
      matches,
      `I found multiple habits that could match${plan.habitName ? ` "${plan.habitName}"` : ''}. Pick one and I’ll continue safely.`,
      provider,
    );
  }

  switch (intent) {
    case 'create':
      return buildCreatePreviewFromFields(interpretedText, plan.fields, now, provider, plan.confirmationMessage);
    case 'modify':
      return buildModifyPreviewFromFields(interpretedText, matchedHabit, matches, plan.fields, now, provider, plan.confirmationMessage);
    case 'delete':
    case 'archive':
    case 'restore':
      return buildLifecyclePreview(intent, interpretedText, matchedHabit, matches, now, provider, plan.confirmationMessage, plan.destructiveSuggestion);
    case 'complete':
    case 'skip':
      return buildStatusPreview(intent, interpretedText, matchedHabit, matches, logs, now, provider, plan.confirmationMessage, plan.dateKey);
    case 'log':
      return buildLogPreview(interpretedText, matchedHabit, matches, logs, now, plan.value, provider, plan.confirmationMessage, plan.dateKey, plan.note);
    case 'note':
      return buildNotePreview(interpretedText, matchedHabit, matches, logs, now, plan.note, provider, plan.confirmationMessage, plan.dateKey);
    case 'summary':
      return {
        interpretedText,
        intent,
        preview: plan.confirmationMessage || 'I can summarize your recent progress from your real habit data.',
        status: 'previewed',
        provider,
      };
    case 'recommendation':
      return {
        interpretedText,
        intent,
        preview: plan.confirmationMessage || 'I can coach you based on your current habits and recent patterns.',
        status: 'previewed',
        provider,
      };
    default:
      return {
        interpretedText,
        intent: 'unknown',
        preview: plan.confirmationMessage || plan.reply || 'Tell me what you want to work on and I will help from there.',
        status: 'previewed',
        provider,
      };
  }
}

async function buildAssistantText({
  preview,
  modelPlan,
  interpretedText,
  habits,
  logs,
  options,
}: {
  preview: AiCommandPreview;
  modelPlan: ModelPlan | null;
  interpretedText: string;
  habits: Habit[];
  logs: HabitLog[];
  options: AssistantConversationOptions;
}) {
  if (preview.status === 'needs-clarification') {
    return preview.preview;
  }

  if (preview.execution) {
    return modelPlan?.confirmationMessage || buildNaturalConfirmationText(preview);
  }

  if (modelPlan?.reply?.trim()) {
    return modelPlan.reply.trim();
  }

  if (preview.intent === 'summary' || preview.intent === 'recommendation' || preview.intent === 'unknown') {
    const prompt = [
      `User message: ${interpretedText}`,
      `Available habits: ${JSON.stringify(habits.slice(0, 20).map((habit) => ({
        name: habit.name,
        category: habit.category,
        kind: habit.kind,
        targetValue: habit.targetValue ?? null,
        unit: habit.unit ?? '',
        archived: Boolean(habit.archivedAt),
        completionRate: calculateCompletionRate(habit, logs),
      })))}`,
      `Recent logs: ${JSON.stringify(logs.slice(0, 50).map((log) => ({
        habitId: log.habitId,
        date: log.date,
        status: log.status,
        value: log.value ?? null,
        note: log.note ?? '',
      })))}`,
      `Conversation history: ${JSON.stringify((options.conversationHistory ?? []).slice(-8))}`,
      'Reply naturally like a warm in-app coach. Be concise, grounded in the provided data, and practical.',
      'Do not claim anything was changed in the app unless the user confirms an action later.',
    ].join('\n\n');

    try {
      return await generateGeminiText(prompt, {
        systemInstruction:
          'You are HabitAI, a conversational coach. Use only the provided context, keep the tone supportive, and stay specific.',
      });
    } catch {
      return preview.preview;
    }
  }

  return preview.preview;
}

function buildCreatePreview(interpretedText: string, now: Date, provider: AssistantProvider = 'local-rules'): AiCommandPreview {
  return buildCreatePreviewFromFields(interpretedText, {}, now, provider);
}

function buildCreatePreviewFromFields(
  interpretedText: string,
  fields: ModelDraftFields | undefined,
  now: Date,
  provider: AssistantProvider,
  confirmationMessage?: string,
): AiCommandPreview {
  const draft = applyModelFieldsToDraft(createDefaultDraft(format(now, 'yyyy-MM-dd')), fields, now);
  if (!draft.name.trim()) {
    return buildClarificationPreview(interpretedText, 'create', 'What should I call the new habit?', provider);
  }

  const changeSummary = summarizeDraft(draft);
  return {
    interpretedText,
    intent: 'create',
    preview:
      confirmationMessage ||
      `Create ${draft.name}${changeSummary.length ? ` with ${changeSummary.join(', ')}` : ''}. Review before I add it.`,
    status: 'previewed',
    provider,
    draftPayload: { draft, changeSummary },
    execution: { type: 'create', draft },
  };
}

function buildModifyPreview(
  interpretedText: string,
  matchedHabit: Habit | undefined,
  matches: Habit[],
  now: Date,
  provider: AssistantProvider = 'local-rules',
): AiCommandPreview {
  if (matches.length > 1) {
    return buildDisambiguationPreview(interpretedText, 'modify', matches, 'Choose which habit you want to update.', provider);
  }

  if (!matchedHabit) {
    return buildClarificationPreview(interpretedText, 'modify', 'Which habit should I update?', provider);
  }

  const fallbackFields: ModelDraftFields = inferModifyFieldsFromText(interpretedText, matchedHabit, now);
  return buildModifyPreviewFromFields(interpretedText, matchedHabit, matches, fallbackFields, now, provider);
}

function buildModifyPreviewFromFields(
  interpretedText: string,
  matchedHabit: Habit | undefined,
  matches: Habit[],
  fields: ModelDraftFields | undefined,
  now: Date,
  provider: AssistantProvider,
  confirmationMessage?: string,
): AiCommandPreview {
  if (matches.length > 1) {
    return buildDisambiguationPreview(interpretedText, 'modify', matches, 'Choose which habit you want to update.', provider);
  }

  if (!matchedHabit) {
    return buildClarificationPreview(interpretedText, 'modify', 'Which habit should I update?', provider);
  }

  const draft = applyModelFieldsToDraft(draftFromHabit(matchedHabit), fields, now);
  const changeSummary = summarizeDraftChanges(matchedHabit, draft);
  if (!changeSummary.length) {
    return buildClarificationPreview(
      interpretedText,
      'modify',
      `I found ${matchedHabit.name}, but I still need the change you want me to make.`,
      provider,
      [matchedHabit],
    );
  }

  return {
    interpretedText,
    intent: 'modify',
    preview: confirmationMessage || `Update ${matchedHabit.name}: ${changeSummary.join(', ')}.`,
    status: 'previewed',
    provider,
    matchedHabitId: matchedHabit.id,
    draftPayload: { draft, changeSummary },
    execution: { type: 'modify', habitId: matchedHabit.id, draft },
  };
}

function buildLifecyclePreview(
  intent: 'delete' | 'archive' | 'restore',
  interpretedText: string,
  matchedHabit: Habit | undefined,
  matches: Habit[],
  now: Date,
  provider: AssistantProvider = 'local-rules',
  confirmationMessage?: string,
  destructiveSuggestion?: string,
): AiCommandPreview {
  if (matches.length > 1) {
    return buildDisambiguationPreview(interpretedText, intent, matches, `Choose which habit you want to ${intent}.`, provider);
  }

  if (!matchedHabit) {
    return buildClarificationPreview(interpretedText, intent, `Which habit should I ${intent}?`, provider);
  }

  return {
    interpretedText,
    intent,
    preview:
      confirmationMessage ||
      `${capitalize(intent)} ${matchedHabit.name}.${intent === 'delete' ? ' This removes its history too.' : ''}`,
    status: 'previewed',
    provider,
    matchedHabitId: matchedHabit.id,
    destructiveSuggestion: destructiveSuggestion || (intent === 'delete' ? 'Archive it instead if you might want the history later.' : undefined),
    execution: { type: intent, habitId: matchedHabit.id },
  };
}

function buildStatusPreview(
  intent: 'complete' | 'skip',
  interpretedText: string,
  matchedHabit: Habit | undefined,
  matches: Habit[],
  logs: HabitLog[],
  now: Date,
  provider: AssistantProvider = 'local-rules',
  confirmationMessage?: string,
  dateKeyInput?: string,
): AiCommandPreview {
  if (matches.length > 1) {
    return buildDisambiguationPreview(
      interpretedText,
      intent,
      matches,
      `Choose which habit you want to mark ${intent === 'complete' ? 'complete' : 'skipped'}.`,
      provider,
    );
  }

  if (!matchedHabit) {
    return buildClarificationPreview(
      interpretedText,
      intent,
      `Which habit should I mark ${intent === 'complete' ? 'complete' : 'skipped'}?`,
      provider,
    );
  }

  const dateKey = normalizeDateKey(dateKeyInput, interpretedText, now) ?? format(now, 'yyyy-MM-dd');
  const existing = getHabitLogForDate(logs, matchedHabit.id, dateKey);
  const alreadyDone = existing?.status === (intent === 'complete' ? 'completed' : 'skipped');
  const label = friendlyDateLabel(dateKey, now);

  return {
    interpretedText,
    intent,
    preview:
      confirmationMessage ||
      (alreadyDone
        ? `${matchedHabit.name} is already marked ${intent === 'complete' ? 'complete' : 'skipped'} for ${label}.`
        : `${intent === 'complete' ? 'Mark complete' : 'Mark skipped'}: ${matchedHabit.name} for ${label}.`),
    status: 'previewed',
    provider,
    matchedHabitId: matchedHabit.id,
    targetDate: dateKey,
    execution: { type: intent, habitId: matchedHabit.id, dateKey },
  };
}

function buildLogPreview(
  interpretedText: string,
  matchedHabit: Habit | undefined,
  matches: Habit[],
  logs: HabitLog[],
  now: Date,
  value: number | undefined,
  provider: AssistantProvider = 'local-rules',
  confirmationMessage?: string,
  dateKeyInput?: string,
  note?: string,
): AiCommandPreview {
  if (matches.length > 1) {
    return buildDisambiguationPreview(interpretedText, 'log', matches, 'Choose which habit you want to log.', provider);
  }

  if (!matchedHabit) {
    return buildClarificationPreview(interpretedText, 'log', 'Which habit do you want to log progress for?', provider);
  }

  if (matchedHabit.kind === 'yesNo' || matchedHabit.kind === 'negative') {
    return buildClarificationPreview(
      interpretedText,
      'log',
      `${matchedHabit.name} does not use numeric progress logging. You can mark it complete, skip it, or add a note.`,
      provider,
      [matchedHabit],
    );
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    return buildClarificationPreview(interpretedText, 'log', `How much progress should I log for ${matchedHabit.name}?`, provider, [matchedHabit]);
  }

  const dateKey = normalizeDateKey(dateKeyInput, interpretedText, now) ?? format(now, 'yyyy-MM-dd');
  const label = friendlyDateLabel(dateKey, now);
  return {
    interpretedText,
    intent: 'log',
    preview: confirmationMessage || `Log ${value} ${matchedHabit.unit ?? ''} for ${matchedHabit.name} on ${label}.`.trim(),
    status: 'previewed',
    provider,
    matchedHabitId: matchedHabit.id,
    targetDate: dateKey,
    logValue: value,
    noteText: note,
    execution: { type: 'log', habitId: matchedHabit.id, dateKey, value, note },
  };
}

function buildNotePreview(
  interpretedText: string,
  matchedHabit: Habit | undefined,
  matches: Habit[],
  logs: HabitLog[],
  now: Date,
  note: string | undefined,
  provider: AssistantProvider = 'local-rules',
  confirmationMessage?: string,
  dateKeyInput?: string,
): AiCommandPreview {
  if (matches.length > 1) {
    return buildDisambiguationPreview(interpretedText, 'note', matches, 'Choose which habit should get the note.', provider);
  }

  if (!matchedHabit) {
    return buildClarificationPreview(interpretedText, 'note', 'Which habit should I add the note to?', provider);
  }

  if (!note?.trim()) {
    return buildClarificationPreview(interpretedText, 'note', `What note should I save for ${matchedHabit.name}?`, provider, [matchedHabit]);
  }

  const dateKey = normalizeDateKey(dateKeyInput, interpretedText, now) ?? format(now, 'yyyy-MM-dd');
  const label = friendlyDateLabel(dateKey, now);
  return {
    interpretedText,
    intent: 'note',
    preview: confirmationMessage || `Add note to ${matchedHabit.name} for ${label}: "${note.trim()}".`,
    status: 'previewed',
    provider,
    matchedHabitId: matchedHabit.id,
    targetDate: dateKey,
    noteText: note.trim(),
    execution: { type: 'note', habitId: matchedHabit.id, dateKey, note: note.trim() },
  };
}

function buildDisambiguationPreview(
  interpretedText: string,
  intent: AiIntent,
  matches: Habit[],
  preview: string,
  provider: AssistantProvider = 'local-rules',
): AiCommandPreview {
  return {
    interpretedText,
    intent,
    preview,
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

function buildClarificationPreview(
  interpretedText: string,
  intent: AiIntent,
  preview: string,
  provider: AssistantProvider = 'local-rules',
  matches?: Habit[],
): AiCommandPreview {
  return {
    interpretedText,
    intent,
    preview,
    status: 'needs-clarification',
    provider,
    matchedHabitId: matches?.length === 1 ? matches[0].id : undefined,
  };
}

function buildNaturalConfirmationText(preview: AiCommandPreview) {
  switch (preview.intent) {
    case 'create':
      return `${preview.preview} Say confirm if that looks right, or tell me what to tweak.`;
    case 'modify':
      return `${preview.preview} I can adjust it before saving if you want.`;
    case 'delete':
      return `${preview.preview} This is destructive, so please confirm only if you're sure.`;
    case 'archive':
    case 'restore':
    case 'complete':
    case 'skip':
    case 'log':
    case 'note':
      return `${preview.preview} Confirm when you're ready.`;
    default:
      return preview.preview;
  }
}

function matchHabits(habits: Habit[], query: string, selectedHabitId?: string, intent?: AiIntent) {
  if (selectedHabitId) {
    const selected = habits.find((habit) => habit.id === selectedHabitId);
    if (selected) {
      return [selected];
    }
  }

  const normalizedQuery = query.toLowerCase();
  const candidateHabits = intent === 'restore' ? habits.filter((habit) => habit.archivedAt) : habits;
  const scored = candidateHabits
    .map((habit) => {
      const name = habit.name.toLowerCase();
      let score = 0;
      if (normalizedQuery.includes(name)) score += 5;
      if (name.includes(normalizedQuery)) score += 4;
      if (normalizedQuery.includes(habit.category.toLowerCase())) score += 2;
      const words = name.split(/\s+/);
      for (const word of words) {
        if (word.length > 2 && normalizedQuery.includes(word)) {
          score += 1;
        }
      }
      if (!habit.archivedAt && intent !== 'restore') score += 0.25;
      return { habit, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  if (!scored.length) {
    return [];
  }

  const bestScore = scored[0].score;
  return scored.filter((item) => item.score >= bestScore - 1).map((item) => item.habit).slice(0, 4);
}

function applyModelFieldsToDraft(baseDraft: HabitFormDraft, fields: ModelDraftFields | undefined, now: Date) {
  const nextDraft = { ...baseDraft };
  if (!fields) {
    return nextDraft;
  }

  if (fields.name?.trim()) nextDraft.name = toTitleCase(fields.name.trim());
  if (fields.kind) nextDraft.kind = fields.kind;
  if (fields.category?.trim()) nextDraft.category = toTitleCase(fields.category.trim());
  if (fields.icon && HABIT_ICONS.includes(fields.icon)) nextDraft.icon = fields.icon;
  if (fields.color && HABIT_COLORS.includes(fields.color)) nextDraft.color = fields.color;
  if (typeof fields.targetValue === 'number' && Number.isFinite(fields.targetValue)) nextDraft.targetValue = String(fields.targetValue);
  if (fields.unit?.trim()) nextDraft.unit = fields.unit.trim();
  if (fields.scheduleKind) nextDraft.scheduleKind = fields.scheduleKind;
  if (Array.isArray(fields.weekdays) && fields.weekdays.length) nextDraft.weekdays = fields.weekdays.filter((day) => day >= 0 && day <= 6);
  if (typeof fields.cadenceCount === 'number' && Number.isFinite(fields.cadenceCount)) nextDraft.cadenceCount = String(fields.cadenceCount);
  if (typeof fields.intervalDays === 'number' && Number.isFinite(fields.intervalDays)) nextDraft.intervalDays = String(fields.intervalDays);
  if (fields.startDate) nextDraft.startDate = normalizeDateKey(fields.startDate, fields.startDate, now) ?? format(now, 'yyyy-MM-dd');
  if (typeof fields.endDate === 'string') nextDraft.endDate = fields.endDate;
  if (typeof fields.reminderEnabled === 'boolean') nextDraft.reminderEnabled = fields.reminderEnabled;
  if (fields.reminderTime) nextDraft.reminderTime = fields.reminderTime;
  if (fields.description !== undefined) nextDraft.description = fields.description;
  if (fields.motivationalNote !== undefined) nextDraft.motivationalNote = fields.motivationalNote;

  if ((nextDraft.kind === 'count' || nextDraft.kind === 'duration') && !nextDraft.unit.trim()) {
    nextDraft.unit = nextDraft.kind === 'duration' ? 'minutes' : 'count';
  }

  if (!nextDraft.startDate) {
    nextDraft.startDate = format(now, 'yyyy-MM-dd');
  }

  return nextDraft;
}

function inferModifyFieldsFromText(interpretedText: string, habit: Habit, now: Date): ModelDraftFields {
  const fields: ModelDraftFields = {};
  const lower = interpretedText.toLowerCase();
  const number = extractNumber(interpretedText);

  if (/\b(reminder|alarm)\b/.test(lower)) {
    const reminderTime = extractTime(interpretedText);
    if (reminderTime) {
      fields.reminderEnabled = true;
      fields.reminderTime = reminderTime;
    }
  }

  if (habit.kind !== 'yesNo' && habit.kind !== 'negative' && typeof number === 'number') {
    fields.targetValue = number;
  }

  if (/\b(daily|every day)\b/.test(lower)) fields.scheduleKind = 'daily';
  if (/\b(weekdays|weekday)\b/.test(lower)) fields.scheduleKind = 'weekdays';
  if (/\b(week|times per week)\b/.test(lower) && typeof number === 'number') {
    fields.scheduleKind = 'timesPerWeek';
    fields.cadenceCount = number;
  }
  if (/\b(month|times per month)\b/.test(lower) && typeof number === 'number') {
    fields.scheduleKind = 'timesPerMonth';
    fields.cadenceCount = number;
  }
  if (/\b(interval|every \d+ days?)\b/.test(lower) && typeof number === 'number') {
    fields.scheduleKind = 'interval';
    fields.intervalDays = number;
  }

  const dateMatch = normalizeDateKey(undefined, interpretedText, now, true);
  if (dateMatch) {
    fields.startDate = dateMatch;
  }

  return fields;
}

function summarizeDraft(draft: HabitFormDraft) {
  const bits = [friendlyKindLabel(draft.kind)];
  if (draft.targetValue) bits.push(`${draft.targetValue} ${draft.unit}`.trim());
  bits.push(summarizeDraftSchedule(draft));
  if (draft.reminderEnabled && draft.reminderTime) bits.push(`reminder at ${draft.reminderTime}`);
  return bits.filter(Boolean);
}

function summarizeDraftChanges(habit: Habit, draft: HabitFormDraft) {
  const changes: string[] = [];
  if (draft.name !== habit.name) changes.push(`rename to ${draft.name}`);
  if (draft.kind !== habit.kind) changes.push(`switch to ${friendlyKindLabel(draft.kind)}`);
  if ((draft.targetValue || '') !== String(habit.targetValue ?? '')) changes.push(`target ${draft.targetValue} ${draft.unit}`.trim());
  if ((draft.unit || '') !== (habit.unit ?? '') && draft.unit) changes.push(`unit ${draft.unit}`);
  if (draft.scheduleKind !== habit.schedule.kind || summarizeDraftSchedule(draft) !== summarizeSchedule(habit)) changes.push(summarizeDraftSchedule(draft));
  if (draft.reminderEnabled !== habit.reminders.some((reminder) => reminder.enabled) || draft.reminderTime !== (habit.reminders[0]?.time ?? '08:00')) {
    changes.push(draft.reminderEnabled ? `reminder at ${draft.reminderTime}` : 'remove reminder');
  }
  if (draft.category !== habit.category) changes.push(`category ${draft.category}`);
  return changes;
}

function summarizeSchedule(habit: Habit) {
  switch (habit.schedule.kind) {
    case 'daily':
      return 'daily';
    case 'weekdays':
      return `weekdays ${habit.schedule.weekdays.join(',')}`;
    case 'timesPerWeek':
      return `${habit.schedule.count} times per week`;
    case 'timesPerMonth':
      return `${habit.schedule.count} times per month`;
    case 'interval':
      return `every ${habit.schedule.everyDays} days`;
    default:
      return 'custom';
  }
}

function summarizeDraftSchedule(draft: HabitFormDraft) {
  switch (draft.scheduleKind) {
    case 'daily':
      return 'daily';
    case 'weekdays':
      return `weekdays ${draft.weekdays.join(',')}`;
    case 'timesPerWeek':
      return `${draft.cadenceCount} times per week`;
    case 'timesPerMonth':
      return `${draft.cadenceCount} times per month`;
    case 'interval':
      return `every ${draft.intervalDays} days`;
    default:
      return 'custom';
  }
}

function normalizeIntent(intent?: string): AiIntent {
  switch ((intent ?? '').toLowerCase()) {
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
      return intent!.toLowerCase() as AiIntent;
    default:
      return 'unknown';
  }
}

function normalizeInput(input: string) {
  return input.trim().replace(/\s+/g, ' ');
}

function extractJsonObject(value: string) {
  const match = value.match(/\{[\s\S]*\}/);
  return match?.[0] ?? null;
}

function extractNumber(value: string) {
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function extractTime(value: string) {
  const match = value.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!match) {
    return undefined;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return undefined;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function extractTrailingText(value: string) {
  const parts = value.split(/note|journal/i);
  return parts.length > 1 ? parts.slice(1).join(' ').trim().replace(/^[:\-]\s*/, '') : undefined;
}

function normalizeDateKey(explicitDate: string | undefined, sourceText: string, now: Date, allowEmpty = false) {
  const direct = explicitDate?.match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
  if (direct) {
    return direct;
  }

  const text = sourceText.toLowerCase();
  if (text.includes('yesterday')) {
    return format(subDays(now, 1), 'yyyy-MM-dd');
  }
  if (text.includes('tomorrow')) {
    return format(addDays(now, 1), 'yyyy-MM-dd');
  }
  if (text.includes('today')) {
    return format(now, 'yyyy-MM-dd');
  }

  const isoLike = sourceText.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoLike) {
    return isoLike[0];
  }

  return allowEmpty ? undefined : format(now, 'yyyy-MM-dd');
}

function friendlyDateLabel(dateKey: string, now: Date) {
  const todayKey = format(now, 'yyyy-MM-dd');
  const yesterdayKey = format(subDays(now, 1), 'yyyy-MM-dd');
  const tomorrowKey = format(addDays(now, 1), 'yyyy-MM-dd');
  if (dateKey === todayKey) return 'today';
  if (dateKey === yesterdayKey) return 'yesterday';
  if (dateKey === tomorrowKey) return 'tomorrow';
  try {
    return format(parseISO(dateKey), 'MMM d');
  } catch {
    return dateKey;
  }
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function friendlyKindLabel(kind: HabitKind) {
  switch (kind) {
    case 'count':
      return 'count goal';
    case 'duration':
      return 'duration goal';
    case 'negative':
      return 'avoidance habit';
    default:
      return 'yes/no habit';
  }
}
