import { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { getDeviceLanguage, changeLanguage } from '../i18n';

export const useLanguageInitialization = (): { isInitialized: boolean } => {
  const { settings, _hasHydrated, updateSettings } = useSettingsStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Wait for zustand hydration to complete
    if (!_hasHydrated) {
      return;
    }

    const initializeLanguage = async () => {
      try {
        // Check if this is first launch by checking if language is still default 'en'
        const isFirstLaunch = settings.language === 'en';

        if (isFirstLaunch) {
          // First launch: detect and save device language
          const deviceLang = getDeviceLanguage();

          // Only update if device language is different from default
          if (deviceLang !== 'en') {
            updateSettings({ language: deviceLang });
          }

          // Update i18n
          await changeLanguage(deviceLang);
        } else {
          // Subsequent launch: use saved language from settings
          await changeLanguage(settings.language);
        }

        setIsInitialized(true);
      } catch (error) {
        // On error, fall back to current settings language
        await changeLanguage(settings.language);
        setIsInitialized(true);
      }
    };

    initializeLanguage();
  }, [_hasHydrated]); // Only depend on _hasHydrated, run once after hydration

  return { isInitialized };
};
