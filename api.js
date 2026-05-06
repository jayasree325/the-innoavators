/**
 * api.js — Gemini 2.0 Flash API Integration Layer
 */

const API = (() => {
  const MODEL = 'gemini-2.5-flash';
  const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

  function getKey() {
    return localStorage.getItem('ling_api_key') || '';
  }

  async function call(prompt) {
    const key = getKey();
    if (!key) throw new Error('NO_KEY');

    const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTP ${res.status}`;
      if (res.status === 400 && msg.includes('API_KEY')) throw new Error('INVALID_KEY');
      if (res.status === 429) throw new Error('RATE_LIMIT');
      throw new Error(msg);
    }

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    try { return JSON.parse(raw); }
    catch { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  }

  async function translate(text, fromLang, toLang, tone = 'neutral') {
    const prompt = `You are an expert AI translator. Translate this text.
Text: """${text}"""
Source language: ${fromLang === 'auto' ? 'auto-detect' : fromLang}
Target language: ${toLang}
Tone preference: ${tone}

Return ONLY valid JSON:
{
  "translation": "translated text",
  "englishExplanation": "Brief English explanation of meaning",
  "detectedLanguage": "ISO 639-1 code of source",
  "emotion": "happy/sad/angry/neutral",
  "appliedTone": "formal/casual/professional",
  "difficultWords": [
    {
      "word": "word",
      "meaning": "meaning in English",
      "synonyms": ["syn1"],
      "example": "example usage"
    }
  ]
}`;
    return call(prompt);
  }

  async function getWordDetails(word, context, targetLang) {
    const prompt = `Provide linguistic details for: "${word}"
Context: "${context}"
Language: ${targetLang}
Return ONLY valid JSON with keys: word, partOfSpeech, meaning, synonyms (array), examples (array).`;
    return call(prompt);
  }

  async function detectLanguage(text) {
    const prompt = `Detect language: "${text.substring(0, 200)}"
Return ONLY valid JSON: {"code": "ISO code", "name": "Language name"}`;
    return call(prompt);
  }

  async function translateConversation(text, fromLang, toLang, conversationHistory) {
    const prompt = `Translate conversation message. From: ${fromLang} To: ${toLang} Message: "${text}"
Return ONLY valid JSON: {"translation": "translated message"}`;
    return call(prompt);
  }

  return { translate, getWordDetails, detectLanguage, translateConversation, getKey };
})();

window.API = API;
