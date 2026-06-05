const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
});

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

exports.generateGeminiText = onCall(
  {
    cors: true,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    requireAuthenticatedUser(request);

    if (!GEMINI_API_KEY) {
      logger.error('Missing GEMINI_API_KEY runtime config.');
      throw new HttpsError('failed-precondition', 'Gemini is not configured on the server.');
    }

    const prompt = sanitizeText(request.data?.prompt, 12000);
    const systemInstruction = sanitizeOptionalText(request.data?.systemInstruction, 4000);
    const model = sanitizeModel(request.data?.model) || DEFAULT_MODEL;

    if (!prompt) {
      throw new HttpsError('invalid-argument', 'A prompt is required.');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: systemInstruction
            ? {
                parts: [{ text: systemInstruction }],
              }
            : undefined,
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Gemini request failed.', {
        status: response.status,
        uid: request.auth?.uid ?? null,
      });
      throw new HttpsError('internal', `Gemini request failed (${response.status}): ${truncate(errorText, 400)}`);
    }

    const json = await response.json();
    const text = extractGeminiText(json);

    if (!text) {
      throw new HttpsError('internal', 'Gemini returned an empty response.');
    }

    return {
      text,
      model,
    };
  },
);

exports.cleanupTranscriptWithWhisper = onCall(
  {
    cors: true,
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    requireAuthenticatedUser(request);

    if (!GROQ_API_KEY) {
      logger.error('Missing GROQ_API_KEY runtime config.');
      throw new HttpsError('failed-precondition', 'Whisper cleanup is not configured on the server.');
    }

    const audioBase64 = sanitizeText(request.data?.audioBase64, 30 * 1024 * 1024);
    const fileName = sanitizeFileName(request.data?.fileName) || 'assistant-audio.wav';
    const mimeType = sanitizeMimeType(request.data?.mimeType) || 'audio/wav';
    const language = sanitizeOptionalText(request.data?.language, 32);
    const prompt = sanitizeOptionalText(request.data?.prompt, 4000);
    const model = sanitizeModel(request.data?.model) || DEFAULT_GROQ_WHISPER_MODEL;

    if (!audioBase64) {
      throw new HttpsError('invalid-argument', 'Audio content is required.');
    }

    const audioBuffer = decodeBase64(audioBase64);
    const formData = new FormData();
    formData.append('model', model);
    formData.append('response_format', 'verbose_json');
    if (language) {
      formData.append('language', language);
    }
    if (prompt) {
      formData.append('prompt', prompt);
    }

    formData.append('file', new Blob([audioBuffer], { type: mimeType }), fileName);

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Whisper cleanup request failed.', {
        status: response.status,
        uid: request.auth?.uid ?? null,
      });
      throw new HttpsError('internal', `Whisper cleanup failed (${response.status}): ${truncate(errorText, 400)}`);
    }

    const json = await response.json();
    const text = typeof json?.text === 'string' ? json.text.trim() : '';

    if (!text) {
      throw new HttpsError('internal', 'Whisper cleanup returned an empty transcript.');
    }

    return {
      text,
      model,
      provider: 'groq',
    };
  },
);

function requireAuthenticatedUser(request) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in to use this feature.');
  }
}

function sanitizeText(value, maxLength) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function sanitizeOptionalText(value, maxLength) {
  const text = sanitizeText(value, maxLength);
  return text || undefined;
}

function sanitizeModel(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const next = value.trim();
  if (!next) {
    return '';
  }

  return /^[a-zA-Z0-9._-]+$/.test(next) ? next : '';
}

function sanitizeFileName(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const next = value.trim().replace(/[^a-zA-Z0-9._-]/g, '');
  return next.slice(0, 120);
}

function sanitizeMimeType(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const next = value.trim().toLowerCase();
  return /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(next) ? next : '';
}

function decodeBase64(value) {
  try {
    return Buffer.from(value, 'base64');
  } catch {
    throw new HttpsError('invalid-argument', 'Audio content could not be decoded.');
  }
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return '';
  }

  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

function truncate(value, maxLength) {
  if (typeof value !== 'string' || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}
