import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useSettingsStore } from '../store/settingsStore';
import { HapticStrength } from '../types/settings.types';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const haptics = {
  light: () => {
    const { settings } = useSettingsStore.getState();
    if (!settings.hapticEnabled) return;

    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
  },

  medium: () => {
    const { settings } = useSettingsStore.getState();
    if (!settings.hapticEnabled) return;

    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
  },

  heavy: () => {
    const { settings } = useSettingsStore.getState();
    if (!settings.hapticEnabled) return;

    ReactNativeHapticFeedback.trigger('impactHeavy', hapticOptions);
  },

  success: () => {
    const { settings } = useSettingsStore.getState();
    if (!settings.hapticEnabled) return;

    ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
  },

  warning: () => {
    const { settings } = useSettingsStore.getState();
    if (!settings.hapticEnabled) return;

    ReactNativeHapticFeedback.trigger('notificationWarning', hapticOptions);
  },

  error: () => {
    const { settings } = useSettingsStore.getState();
    if (!settings.hapticEnabled) return;

    ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
  },

  selection: () => {
    const { settings } = useSettingsStore.getState();
    if (!settings.hapticEnabled) return;

    ReactNativeHapticFeedback.trigger('selection', hapticOptions);
  },

  trigger: (strength?: HapticStrength) => {
    const { settings } = useSettingsStore.getState();
    if (!settings.hapticEnabled) return;

    const hapticStrength = strength || settings.hapticStrength;

    switch (hapticStrength) {
      case HapticStrength.LIGHT:
        haptics.light();
        break;
      case HapticStrength.MEDIUM:
        haptics.medium();
        break;
      case HapticStrength.HEAVY:
        haptics.heavy();
        break;
    }
  },
};
