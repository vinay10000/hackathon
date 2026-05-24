import { Habit } from '@/src/types/habits';

type AiIntent = 'create' | 'modify' | 'delete' | 'archive' | 'restore' | 'complete' | 'skip' | 'log' | 'note' | 'summary' | 'recommendation' | 'unknown';

export type AiCommandPreview = {
  interpretedText: string;
  intent: AiIntent;
  preview: string;
  status: 'previewed' | 'needs-clarification';
  matchedHabitId?: string;
};

export function interpretHabitCommand(input: string, habits: Habit[]): AiCommandPreview {
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
    return actionPreview('modify', interpretedText, matchedHabit, 'Modify habit details', needsHabit);
  }

  if (/\b(summary|summarize|how am i doing|progress)\b/.test(text)) {
    return {
      interpretedText,
      intent: 'summary',
      preview: 'Prepare a simple progress summary from local habit data.',
      status: 'previewed',
    };
  }

  if (/\b(suggest|recommend|idea|template|help me)\b/.test(text)) {
    return {
      interpretedText,
      intent: 'recommendation',
      preview: 'Suggest realistic habit templates and targets without saving anything.',
      status: 'previewed',
    };
  }

  if (/\b(create|add|start|remind me)\b/.test(text)) {
    return {
      interpretedText,
      intent: 'create',
      preview: 'Create a new habit draft for review before saving.',
      status: 'previewed',
    };
  }

  return {
    interpretedText,
    intent: 'unknown',
    preview: 'I need a clearer command before previewing an action. Nothing has changed.',
    status: 'needs-clarification',
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
