export const formatProjectDate = (
  value: Date | string | number,
  language?: string,
): string => {
  const locale = language || 'en';
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  try {
    return new Intl.DateTimeFormat(locale, options).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat('en', options).format(new Date(value));
  }
};

const SPEECH_LOCALES: Record<string, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  es: 'es-MX',
  de: 'de-DE',
  fr: 'fr-FR',
  pt: 'pt-BR',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ko: 'ko-KR',
  uk: 'uk-UA',
  ua: 'uk-UA',
  it: 'it-IT',
  pl: 'pl-PL',
  hi: 'hi-IN',
  ar: 'ar-SA',
  nl: 'nl-NL',
  tr: 'tr-TR',
  th: 'th-TH',
  vi: 'vi-VN',
  id: 'id-ID',
  he: 'he-IL',
  sv: 'sv-SE',
  no: 'no-NO',
  da: 'da-DK',
  fi: 'fi-FI',
  cs: 'cs-CZ',
  hu: 'hu-HU',
  ro: 'ro-RO',
  el: 'el-GR',
  ms: 'ms-MY',
  fil: 'fil-PH',
};

export const resolveSpeechLocale = (language?: string): string => {
  if (!language) return SPEECH_LOCALES.en;

  const normalized = language.toLowerCase().replace('_', '-');
  const baseLanguage = normalized.split('-')[0];
  return SPEECH_LOCALES[baseLanguage] || language;
};
