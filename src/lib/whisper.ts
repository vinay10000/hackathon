import { httpsCallable } from 'firebase/functions';

import { firebaseFunctions } from '@/src/lib/firebase';

const GROQ_WHISPER_MODEL = process.env.EXPO_PUBLIC_GROQ_WHISPER_MODEL ?? 'whisper-large-v3-turbo';
const WHISPER_CLEANUP_ENABLED = process.env.EXPO_PUBLIC_ENABLE_WHISPER_CLEANUP === 'true';

export type WhisperCleanupResult = {
  text: string;
  model: string;
  provider: 'groq';
};

type WhisperCleanupOptions = {
  language?: string;
  prompt?: string;
};

type WhisperCleanupRequest = {
  audioBase64: string;
  fileName: string;
  mimeType: string;
  language?: string;
  prompt?: string;
  model?: string;
};

const cleanupTranscriptWithWhisperCallable = httpsCallable<WhisperCleanupRequest, WhisperCleanupResult>(
  firebaseFunctions,
  'cleanupTranscriptWithWhisper',
);

export async function cleanupTranscriptWithWhisper(audioUri: string, options: WhisperCleanupOptions = {}) {
  const audioBase64 = await readAudioFileAsBase64(audioUri);
  if (!audioBase64) {
    throw new Error('Audio capture was empty.');
  }

  const response = await cleanupTranscriptWithWhisperCallable({
    audioBase64,
    fileName: pickFileName(audioUri),
    mimeType: pickMimeType(audioUri),
    language: options.language?.trim() || undefined,
    prompt: options.prompt?.trim() || undefined,
    model: GROQ_WHISPER_MODEL,
  });
  const text = response.data?.text?.trim();
  if (!text) {
    throw new Error('Whisper cleanup returned an empty transcript.');
  }

  return {
    text,
    model: response.data?.model?.trim() || GROQ_WHISPER_MODEL,
    provider: 'groq' as const,
  } satisfies WhisperCleanupResult;
}

export function getWhisperModelName() {
  return GROQ_WHISPER_MODEL;
}

export function hasWhisperCleanupConfigured() {
  return WHISPER_CLEANUP_ENABLED;
}

function pickFileName(uri: string) {
  const segments = uri.split('/');
  const last = segments[segments.length - 1];
  return last || 'assistant-audio.wav';
}

function pickMimeType(uri: string) {
  if (uri.endsWith('.caf')) {
    return 'audio/x-caf';
  }
  if (uri.endsWith('.m4a')) {
    return 'audio/mp4';
  }
  if (uri.endsWith('.mp3')) {
    return 'audio/mpeg';
  }
  return 'audio/wav';
}

async function readAudioFileAsBase64(audioUri: string) {
  const response = await fetch(audioUri);
  if (!response.ok) {
    throw new Error(`Audio capture could not be read (${response.status}).`);
  }

  const blob = await response.blob();
  return blobToBase64(blob);
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      if (!base64) {
        reject(new Error('Audio capture could not be encoded.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Audio capture could not be encoded.'));
    reader.readAsDataURL(blob);
  });
}
