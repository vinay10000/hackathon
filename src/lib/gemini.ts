import { httpsCallable } from 'firebase/functions';

import { firebaseAuth, firebaseFunctions } from '@/src/lib/firebase';

const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-3.1-flash-lite-preview';

type GenerateTextOptions = {
  systemInstruction?: string;
};

type GenerateGeminiTextRequest = {
  prompt: string;
  systemInstruction?: string;
  model?: string;
};

type GenerateGeminiTextResponse = {
  text: string;
  model: string;
};

const generateGeminiTextCallable = httpsCallable<GenerateGeminiTextRequest, GenerateGeminiTextResponse>(
  firebaseFunctions,
  'generateGeminiText',
);

export async function generateGeminiText(prompt: string, options: GenerateTextOptions = {}) {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new Error('Missing Gemini prompt.');
  }

  // The callable backend requires Firebase auth. Skip the network call entirely
  // for guest/web sessions so the assistant can fall back to local rules cleanly.
  if (!firebaseAuth.currentUser?.uid) {
    throw new Error('Gemini auth required.');
  }

  const response = await generateGeminiTextCallable({
    prompt: trimmedPrompt,
    systemInstruction: options.systemInstruction?.trim() || undefined,
    model: GEMINI_MODEL,
  });
  const text = response.data?.text?.trim();

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return text;
}

export function getGeminiModelName() {
  return GEMINI_MODEL;
}
