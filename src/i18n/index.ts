import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
import ar from './locales/ar.json';
import nl from './locales/nl.json';
import tr from './locales/tr.json';
import th from './locales/th.json';
import vi from './locales/vi.json';
import id from './locales/id.json';
import he from './locales/he.json';
import sv from './locales/sv.json';
import no from './locales/no.json';
import da from './locales/da.json';
import fi from './locales/fi.json';
import cs from './locales/cs.json';
import hu from './locales/hu.json';
import ro from './locales/ro.json';
import el from './locales/el.json';
import ms from './locales/ms.json';
import fil from './locales/fil.json';

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
  ar: { translation: ar },
  nl: { translation: nl },
  tr: { translation: tr },
  th: { translation: th },
  vi: { translation: vi },
  id: { translation: id },
  he: { translation: he },
  sv: { translation: sv },
  no: { translation: no },
  da: { translation: da },
  fi: { translation: fi },
  cs: { translation: cs },
  hu: { translation: hu },
  ro: { translation: ro },
  el: { translation: el },
  ms: { translation: ms },
  fil: { translation: fil },
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
  ar: 'ar',
  nl: 'nl',
  tr: 'tr',
  th: 'th',
  vi: 'vi',
  id: 'id',
  he: 'he',
  sv: 'sv',
  no: 'no',
  da: 'da',
  fi: 'fi',
  cs: 'cs',
  hu: 'hu',
  ro: 'ro',
  el: 'el',
  ms: 'ms',
  fil: 'fil',
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

// Get saved language from AsyncStorage
const getSavedLanguage = async (): Promise<string | null> => {
  try {
    const saved = await AsyncStorage.getItem('slidemint-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.state?.settings?.language) {
        return parsed.state.settings.language;
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
};

// Initialize i18n with saved language or device language
const initializeI18n = async () => {
  const savedLang = await getSavedLanguage();
  const initialLang = savedLang
    ? resolveLanguage(savedLang) || getDeviceLanguage()
    : getDeviceLanguage();

  i18n.use(initReactI18next).init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3',
    nsSeparator: false,
    react: {
      useSuspense: false,
    },
  });
};

// Initialize synchronously with device language for immediate use
// Language will be updated by App.tsx after settings hydration
const initialLang = getDeviceLanguage();
i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v3',
  nsSeparator: false,
  react: {
    useSuspense: false,
  },
});

// Function to change language
export const changeLanguage = (languageCode: string): Promise<void> => {
  const resolved = resolveLanguage(languageCode);
  if (resolved) {
    return i18n.changeLanguage(resolved);
  }
  return Promise.resolve();
};

export { getDeviceLanguage };
export default i18n;
