import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';

import en from './locales/en.json';
import ru from './locales/ru.json';
import es from './locales/es.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import ko from './locales/ko.json';
import uk from './locales/uk.json';
import it from './locales/it.json';
import pl from './locales/pl.json';
import hi from './locales/hi.json';
import ua from './locales/ua.json';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  es: { translation: es },
  sp: { translation: es },
  de: { translation: de },
  fr: { translation: fr },
  pt: { translation: pt },
  por: { translation: pt },
  ja: { translation: ja },
  jp: { translation: ja },
  zh: { translation: zh },
  'zh-cn': { translation: zh },
  'zh-hans': { translation: zh },
  ko: { translation: ko },
  uk: { translation: uk },
  ua: { translation: ua },
  it: { translation: it },
  pl: { translation: pl },
  hi: { translation: hi },
};

const LANGUAGE_ALIASES: Record<string, keyof typeof resources> = {
  sp: 'es',
  es: 'es',
  'es-es': 'es',
  'es-mx': 'es',
  por: 'pt',
  pt: 'pt',
  'pt-br': 'pt',
  'pt-pt': 'pt',
  jp: 'ja',
  ja: 'ja',
  ua: 'ua',
  uk: 'uk',
  it: 'it',
  pl: 'pl',
  hi: 'hi',
  de: 'de',
  fr: 'fr',
  ru: 'ru',
  zh: 'zh',
  'zh-cn': 'zh',
  'zh-hans': 'zh',
  'zh-hant': 'zh',
  ko: 'ko',
  en: 'en',
};

const resolveLanguage = (code: string | undefined): keyof typeof resources | null => {
  if (!code) return null;
  const normalized = code.toLowerCase();
  if (resources[normalized as keyof typeof resources]) {
    return normalized as keyof typeof resources;
  }
  if (LANGUAGE_ALIASES[normalized]) {
    return LANGUAGE_ALIASES[normalized];
  }
  const [base] = normalized.split('-');
  if (resources[base as keyof typeof resources]) {
    return base as keyof typeof resources;
  }
  if (LANGUAGE_ALIASES[base]) {
    return LANGUAGE_ALIASES[base];
  }
  return null;
};

// Get device language
const getDeviceLanguage = (): string => {
  const locales = getLocales();
  if (locales.length > 0) {
    const { languageCode, languageTag } = locales[0];
    const resolved =
      resolveLanguage(languageCode) ||
      resolveLanguage(languageTag);
    if (resolved) {
      return resolved;
    }
  }
  return 'en'; // Default to English
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3',
  });

export default i18n;
