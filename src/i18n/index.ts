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

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  es: { translation: es },
  de: { translation: de },
  fr: { translation: fr },
  pt: { translation: pt },
  ja: { translation: ja },
  zh: { translation: zh },
  ko: { translation: ko },
  uk: { translation: uk },
};

// Get device language
const getDeviceLanguage = (): string => {
  const locales = getLocales();
  if (locales.length > 0) {
    const languageCode = locales[0].languageCode;
    // Check if we support this language
    if (resources[languageCode as keyof typeof resources]) {
      return languageCode;
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
