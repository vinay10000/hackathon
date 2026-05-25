const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-3.1-flash-lite-preview';

type GenerateTextOptions = {
  systemInstruction?: string;
};

export async function generateGeminiText(prompt: string, options: GenerateTextOptions = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY.');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: options.systemInstruction
        ? {
            parts: [{ text: options.systemInstruction }],
          }
        : undefined,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('').trim();

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return text;
}

export function getGeminiModelName() {
  return GEMINI_MODEL;
}
