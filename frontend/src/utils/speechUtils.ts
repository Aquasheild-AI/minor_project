/**
 * Speech utilities for AquaShield Multilingual Voice Assistant
 */

/**
 * Strips markdown and special characters from response content
 * to make it suitable and natural for speech synthesis.
 */
export function stripMarkdownForSpeech(markdown: string): string {
  if (!markdown) return '';

  let text = markdown;

  // 1. Remove the follow-ups section if appended
  text = text.split('---FOLLOW_UPS---')[0];

  // 2. Remove fenced code blocks
  text = text.replace(/```[\s\S]*?```/g, '');

  // 3. Remove inline code
  text = text.replace(/`([^`]+)`/g, '$1');

  // 4. Remove markdown images
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '');

  // 5. Convert links [label](url) to just the label text
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

  // 6. Remove headings (#, ##, ###, etc.)
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 7. Remove bold, italic, strikethrough formatting (***, **, *, __, _, ~~)
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  text = text.replace(/~~(.*?)~~/g, '$1');

  // 8. Remove blockquotes (> )
  text = text.replace(/^>\s+/gm, '');

  // 9. Remove list markers (- , * , + , 1. )
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^[\s]*\d+\.\s+/gm, '');

  // 10. Replace table markers |
  text = text.replace(/\|/g, ' ');

  // 11. Normalize newlines into sentence pauses
  text = text.replace(/\n+/g, '. ');

  // 12. Collapse redundant spaces and punctuation
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\.\s*\./g, '.');

  return text.trim();
}

/**
 * Maps short language codes or names to standard BCP-47 speech tags.
 */
export function mapLanguageCodeToBcp47(langCode?: string): string {
  if (!langCode) return 'en-IN';
  const code = langCode.toLowerCase().trim();
  const map: Record<string, string> = {
    hi: 'hi-IN',
    hindi: 'hi-IN',
    en: 'en-IN',
    english: 'en-IN',
    te: 'te-IN',
    telugu: 'te-IN',
    ta: 'ta-IN',
    tamil: 'ta-IN',
    bn: 'bn-IN',
    bengali: 'bn-IN',
    mr: 'mr-IN',
    marathi: 'mr-IN',
    gu: 'gu-IN',
    gujarati: 'gu-IN',
    kn: 'kn-IN',
    kannada: 'kn-IN',
    ml: 'ml-IN',
    malayalam: 'ml-IN',
    pa: 'pa-IN',
    punjabi: 'pa-IN',
    or: 'or-IN',
    odia: 'or-IN',
    ur: 'ur-IN',
    urdu: 'ur-IN',
    es: 'es-ES',
    spanish: 'es-ES',
    fr: 'fr-FR',
    french: 'fr-FR',
    de: 'de-DE',
    german: 'de-DE',
    ar: 'ar-SA',
    arabic: 'ar-SA',
    ru: 'ru-RU',
    russian: 'ru-RU',
    pt: 'pt-BR',
    portuguese: 'pt-BR',
    it: 'it-IT',
    italian: 'it-IT',
    ja: 'ja-JP',
    japanese: 'ja-JP',
    zh: 'zh-CN',
    chinese: 'zh-CN',
    ko: 'ko-KR',
    korean: 'ko-KR',
    tr: 'tr-TR',
    turkish: 'tr-TR',
  };
  return map[code] || (code.length === 2 ? `${code}-${code.toUpperCase()}` : 'en-IN');
}

/**
 * Detects language tag for speech synthesis from text and message metadata.
 * Supports English, Hindi, Indian regional languages, and global languages.
 */
export function detectLanguageForSpeech(
  text: string,
  fallbackLang: string = 'en',
  messageLang?: string
): string {
  if (messageLang && messageLang !== 'en') {
    return mapLanguageCodeToBcp47(messageLang);
  }

  // Script-based detection
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'; // Telugu
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN'; // Tamil
  if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN'; // Bengali
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN'; // Gujarati
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN'; // Punjabi
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN'; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN'; // Malayalam
  if (/[\u0B00-\u0B7F]/.test(text)) return 'or-IN'; // Odia
  if (/[\u0600-\u06FF]/.test(text)) return 'ur-IN'; // Urdu / Arabic
  if (/[\u0400-\u04FF]/.test(text)) return 'ru-RU'; // Russian
  if (/[\u3040-\u30FF]/.test(text)) return 'ja-JP'; // Japanese
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko-KR'; // Korean
  if (/[\u0900-\u097F]/.test(text)) return 'hi-IN'; // Devanagari

  if (fallbackLang.toLowerCase().startsWith('hi')) {
    return 'hi-IN';
  }
  return 'en-IN';
}

/**
 * Finds the most suitable SpeechSynthesisVoice for the requested language.
 */
export function findBestVoice(
  voices: SpeechSynthesisVoice[],
  targetLang: string
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const normalized = targetLang.toLowerCase().replace('_', '-');
  const langPrefix = normalized.split('-')[0];

  // 1. Exact BCP-47 match
  const exact = voices.find(
    (v) => v.lang.toLowerCase().replace('_', '-') === normalized
  );
  if (exact) return exact;

  // 2. Prefix match (e.g. any 'te', 'es', 'fr', 'hi')
  const prefixMatch = voices.find(
    (v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix) ||
      v.name.toLowerCase().includes(langPrefix)
  );
  if (prefixMatch) return prefixMatch;

  // 3. Fallback to English
  const enIn = voices.find(
    (v) => v.lang.toLowerCase().replace('_', '-') === 'en-in'
  );
  if (enIn) return enIn;

  const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
  if (anyEn) return anyEn;

  return voices[0] || null;
}
