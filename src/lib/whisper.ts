const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_WHISPER_MODEL = process.env.EXPO_PUBLIC_GROQ_WHISPER_MODEL ?? 'whisper-large-v3-turbo';
const GROQ_TRANSCRIPT_ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions';

export type WhisperCleanupResult = {
  text: string;
  model: string;
  provider: 'groq';
};

type WhisperCleanupOptions = {
  language?: string;
  prompt?: string;
};

export async function cleanupTranscriptWithWhisper(audioUri: string, options: WhisperCleanupOptions = {}) {
  if (!GROQ_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_GROQ_API_KEY.');
  }

  const formData = new FormData();
  formData.append('model', GROQ_WHISPER_MODEL);
  formData.append('response_format', 'verbose_json');
  if (options.language) {
    formData.append('language', options.language);
  }
  if (options.prompt?.trim()) {
    formData.append('prompt', options.prompt.trim());
  }

  formData.append('file', {
    uri: audioUri,
    name: pickFileName(audioUri),
    type: pickMimeType(audioUri),
  } as unknown as Blob);

  const response = await fetch(GROQ_TRANSCRIPT_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper cleanup failed (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const text = typeof json?.text === 'string' ? json.text.trim() : '';
  if (!text) {
    throw new Error('Whisper cleanup returned an empty transcript.');
  }

  return {
    text,
    model: GROQ_WHISPER_MODEL,
    provider: 'groq' as const,
  } satisfies WhisperCleanupResult;
}

export function getWhisperModelName() {
  return GROQ_WHISPER_MODEL;
}

export function hasWhisperCleanupConfigured() {
  return Boolean(GROQ_API_KEY);
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
