/**
 * Speech utilities for AquaShield Bilingual Voice Assistant
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
 * Detects whether the text is Hindi or English.
 * Checks for Devanagari Unicode range (\u0900-\u097F).
 * Falls back to the current active application language.
 */
export function detectLanguageForSpeech(
  text: string,
  fallbackLang: string = 'en'
): 'hi-IN' | 'en-IN' {
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  if (hasDevanagari) {
    return 'hi-IN';
  }
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
  targetLang: 'hi-IN' | 'en-IN'
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const isHindi = targetLang === 'hi-IN';

  if (isHindi) {
    // 1. Exact match hi-IN
    const exact = voices.find(
      (v) => v.lang.toLowerCase().replace('_', '-') === 'hi-in'
    );
    if (exact) return exact;

    // 2. Any voice starting with hi or containing hindi in name
    const anyHi = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('hi') ||
        v.name.toLowerCase().includes('hindi')
    );
    if (anyHi) return anyHi;

    return null;
  } else {
    // 1. Prefer Indian English voice for local dialect context
    const enIn = voices.find(
      (v) => v.lang.toLowerCase().replace('_', '-') === 'en-in'
    );
    if (enIn) return enIn;

    // 2. Fall back to US or GB English
    const enUsOrGb = voices.find(
      (v) =>
        v.lang.toLowerCase().replace('_', '-') === 'en-us' ||
        v.lang.toLowerCase().replace('_', '-') === 'en-gb'
    );
    if (enUsOrGb) return enUsOrGb;

    // 3. Any English voice
    const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    if (anyEn) return anyEn;

    return null;
  }
}

