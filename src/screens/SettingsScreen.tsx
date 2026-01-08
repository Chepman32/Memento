import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { RootStackParamList } from '../navigation/navigationTypes';
import { useThemeStore } from '../store/themeStore';
import { useSettingsStore } from '../store/settingsStore';
import { Card, AnimatedCollapsible } from '../components/common';
import { haptics } from '../utils/hapticFeedback';
import { Theme } from '../types/theme.types';
import { HapticStrength, LanguageCode } from '../types/settings.types';
import { SPACING, RADII, TYPOGRAPHY, THEME_COLORS } from '../constants/theme';
import { changeLanguage } from '../i18n';
import { PRIVACY_POLICY_URL } from '../constants/legal';

type SettingsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Settings'
>;

interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flagIcon: any;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flagIcon: require('../assets/icons/flags/en.png') },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', flagIcon: require('../assets/icons/flags/zh.png') },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flagIcon: require('../assets/icons/flags/ja.png') },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flagIcon: require('../assets/icons/flags/ko.png') },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flagIcon: require('../assets/icons/flags/de.png') },
  { code: 'fr', name: 'French', nativeName: 'Français', flagIcon: require('../assets/icons/flags/fr.png') },
  { code: 'es', name: 'Spanish (Mexican)', nativeName: 'Español (México)', flagIcon: require('../assets/icons/flags/es.png') },
  { code: 'pt', name: 'Portuguese (Brazilian)', nativeName: 'Português (Brasil)', flagIcon: require('../assets/icons/flags/pt-BR.png') },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flagIcon: require('../assets/icons/flags/ar.png') },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flagIcon: require('../assets/icons/flags/ru.png') },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flagIcon: require('../assets/icons/flags/it.png') },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flagIcon: require('../assets/icons/flags/nl.png') },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flagIcon: require('../assets/icons/flags/tr.png') },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flagIcon: require('../assets/icons/flags/th.png') },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flagIcon: require('../assets/icons/flags/vi.png') },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flagIcon: require('../assets/icons/flags/id.png') },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flagIcon: require('../assets/icons/flags/pl.png') },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flagIcon: require('../assets/icons/flags/uk.png') },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flagIcon: require('../assets/icons/flags/hi.png') },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flagIcon: require('../assets/icons/flags/he.png') },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flagIcon: require('../assets/icons/flags/sv.png') },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flagIcon: require('../assets/icons/flags/no.png') },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flagIcon: require('../assets/icons/flags/da.png') },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flagIcon: require('../assets/icons/flags/fi.png') },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flagIcon: require('../assets/icons/flags/cs.png') },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flagIcon: require('../assets/icons/flags/hu.png') },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flagIcon: require('../assets/icons/flags/ro.png') },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flagIcon: require('../assets/icons/flags/el.png') },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flagIcon: require('../assets/icons/flags/ms.png') },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', flagIcon: require('../assets/icons/flags/fil.png') },
];

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { t, i18n } = useTranslation();
  const { colors, theme, setTheme } = useThemeStore();
  const { settings, updateSettings, clearCache } = useSettingsStore();
  const [languageExpanded, setLanguageExpanded] = useState(false);
  const themeOptions = [Theme.LIGHT, Theme.DARK, Theme.SOLAR, Theme.MONO];
  const hapticStrengthOptions = [
    HapticStrength.LIGHT,
    HapticStrength.MEDIUM,
    HapticStrength.HEAVY,
  ];

  const handleClose = () => {
    haptics.light();
    navigation.goBack();
  };

  const handlePrivacyPolicy = () => {
    haptics.light();
    navigation.navigate('WebView', {
      url: PRIVACY_POLICY_URL,
      title: t('settings.privacyPolicy'),
    });
  };

  const handleThemeChange = (newTheme: Theme) => {
    haptics.medium();
    setTheme(newTheme);
  };

  const handleToggleHaptic = (value: boolean) => {
    if (value) haptics.medium();
    updateSettings({ hapticEnabled: value });
  };

  const handleHapticStrengthChange = (strength: HapticStrength) => {
    haptics.trigger(strength);
    updateSettings({ hapticStrength: strength });
  };

  const handleClearCache = () => {
    Alert.alert(
      t('settings.clearCache'),
      t('settings.confirmClearCacheMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.clear'),
          style: 'destructive',
          onPress: async () => {
            await clearCache();
            haptics.success();
            Alert.alert(
              t('success.cacheCleared'),
              t('settings.cacheClearedDescription'),
            );
          },
        },
      ],
    );
  };

  const handleLanguageChange = async (languageCode: LanguageCode) => {
    haptics.medium();
    await changeLanguage(languageCode);
    updateSettings({ language: languageCode });
    setLanguageExpanded(false);
  };

  // Helper function to normalize language code for matching
  const normalizeLanguageCode = (code: string): string => {
    if (!code) return 'en';
    const normalized = code.toLowerCase();
    // Handle language variants
    if (normalized.startsWith('zh')) return 'zh';
    if (normalized.startsWith('pt')) return 'pt';
    if (normalized.startsWith('es')) return 'es';
    if (normalized.startsWith('ja') || normalized.startsWith('jp')) return 'ja';
    if (normalized.startsWith('uk') || normalized.startsWith('ua')) return 'uk';
    return normalized.split('-')[0];
  };

  // Get current language - prioritize settings, then i18n, then default
  const getCurrentLanguageCode = () => {
    if (settings.language) {
      return normalizeLanguageCode(settings.language);
    }
    if (i18n.language) {
      return normalizeLanguageCode(i18n.language);
    }
    return 'en';
  };

  const currentLanguageCode = getCurrentLanguageCode();
  const currentLanguage =
    LANGUAGES.find(lang => lang.code === currentLanguageCode) || LANGUAGES[0];

  const formatCacheSizeValue = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <Text style={[styles.closeButton, { color: colors.text }]}>×</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('settings.title')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('settings.appearance')}
          </Text>

          {/* Theme selection */}
          <Card style={styles.card}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              {t('settings.theme')}
            </Text>
            <View style={styles.themeGrid}>
              {themeOptions.map(themeOption => {
                const themeColors = THEME_COLORS[themeOption];
                return (
                  <TouchableOpacity
                    key={themeOption}
                    style={[
                      styles.themeOption,
                      {
                        borderColor:
                          theme === themeOption
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() => handleThemeChange(themeOption)}
                  >
                    <View
                      style={[
                        styles.themePreview,
                        {
                          backgroundColor: themeColors.background,
                          borderColor: themeColors.border,
                        },
                      ]}
                    />
                    <Text style={[styles.themeLabel, { color: colors.text }]}>
                      {t(`themes.${themeOption}`)}
                    </Text>
                    <Text
                      style={[
                        styles.themeDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t(`themes.description.${themeOption}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('settings.language')}
          </Text>

          <Card style={styles.card}>
            <TouchableOpacity
              style={styles.languageHeader}
              onPress={() => {
                haptics.light();
                setLanguageExpanded(!languageExpanded);
              }}
            >
              <View style={styles.languageHeaderContent}>
                <Image
                  source={currentLanguage.flagIcon}
                  style={styles.flagIcon}
                />
                <View style={styles.languageInfo}>
                  <Text style={[styles.languageName, { color: colors.text }]}>
                    {currentLanguage.nativeName}
                  </Text>
                  <Text
                    style={[
                      styles.languageSubtext,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {currentLanguage.name}
                  </Text>
                </View>
              </View>
              <FeatherIcon
                name={languageExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <AnimatedCollapsible expanded={languageExpanded}>
              <View
                style={[
                  styles.languageList,
                  { borderTopColor: colors.border },
                ]}
              >
                {LANGUAGES.map(language => {
                  const isSelected = language.code === currentLanguageCode;
                  return (
                    <TouchableOpacity
                      key={language.code}
                      style={[
                        styles.languageOption,
                        {
                          backgroundColor: isSelected
                            ? colors.primary + '15'
                            : 'transparent',
                        },
                      ]}
                      onPress={() => handleLanguageChange(language.code)}
                    >
                      <Image
                        source={language.flagIcon}
                        style={styles.flagIcon}
                      />
                      <View style={styles.languageInfo}>
                        <Text
                          style={[
                            styles.languageName,
                            { color: colors.text },
                          ]}
                        >
                          {language.nativeName}
                        </Text>
                        <Text
                          style={[
                            styles.languageSubtext,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {language.name}
                        </Text>
                      </View>
                      {isSelected && (
                        <FeatherIcon
                          name="check"
                          size={20}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </AnimatedCollapsible>
          </Card>
        </View>

        {/* Haptics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('settings.feedback')}
          </Text>

          <Card style={styles.card}>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                {t('settings.hapticFeedback')}
              </Text>
              <Switch
                value={settings.hapticEnabled}
                onValueChange={handleToggleHaptic}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Card>

          {settings.hapticEnabled && (
            <Card style={styles.card}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                {t('settings.hapticStrength')}
              </Text>
              <View style={styles.strengthOptions}>
                {hapticStrengthOptions.map(strength => (
                  <TouchableOpacity
                    key={strength}
                    style={[
                      styles.strengthOption,
                      {
                        backgroundColor:
                          settings.hapticStrength === strength
                            ? colors.primary
                            : colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => handleHapticStrengthChange(strength)}
                  >
                    <Text
                      style={[
                        styles.strengthLabel,
                        {
                          color:
                            settings.hapticStrength === strength
                              ? '#FFFFFF'
                              : colors.text,
                        },
                      ]}
                    >
                      {t(`settings.hapticStrengthOptions.${strength}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}
        </View>

        {/* Storage */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('settings.storage')}
          </Text>

          <Card style={styles.card}>
            <View style={styles.settingRow}>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  {t('settings.cache')}
                </Text>
                <Text
                  style={[
                    styles.settingSubtext,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t('settings.cacheSize', {
                    size: formatCacheSizeValue(settings.cacheSize),
                  })}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.clearButton, { borderColor: colors.error }]}
                onPress={handleClearCache}
              >
                <Text style={[styles.clearButtonText, { color: colors.error }]}>
                  {t('settings.clear')}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('settings.about')}
          </Text>

          <Card style={styles.card}>
            <TouchableOpacity style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                {t('settings.versionLabel')}
              </Text>
              <Text
                style={[styles.settingValue, { color: colors.textSecondary }]}
              >
                {t('settings.version', { version: '1.0.0' })}
              </Text>
            </TouchableOpacity>
          </Card>

          <Card style={styles.card}>
            <TouchableOpacity style={styles.settingRow} onPress={handlePrivacyPolicy}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                {t('settings.privacyPolicy')}
              </Text>
              <Text
                style={[styles.settingValue, { color: colors.textSecondary }]}
              >
                →
              </Text>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  closeButton: {
    fontSize: 36,
    fontWeight: '300',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  content: {
    padding: SPACING.md,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.md,
  },
  card: {
    marginBottom: SPACING.sm,
  },
  cardLabel: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    ...TYPOGRAPHY.body1,
    fontWeight: '500',
  },
  settingSubtext: {
    ...TYPOGRAPHY.caption,
    marginTop: 4,
  },
  settingValue: {
    ...TYPOGRAPHY.body2,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
  },
  themeOption: {
    width: '48%',
    marginRight: '2%',
    marginBottom: SPACING.sm,
    borderRadius: RADII.md,
    borderWidth: 2,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  themePreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  themeLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  themeDescription: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
    textAlign: 'center',
  },
  strengthOptions: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
  },
  strengthOption: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADII.sm,
    borderWidth: 1,
    marginHorizontal: SPACING.xs / 2,
    alignItems: 'center',
  },
  strengthLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  clearButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.sm,
    borderWidth: 1,
  },
  clearButtonText: {
    ...TYPOGRAPHY.body2,
    fontWeight: '600',
  },
  languageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  languageHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flagIcon: {
    width: 32,
    height: 32,
    borderRadius: RADII.xs,
    marginRight: SPACING.sm,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    ...TYPOGRAPHY.body1,
    fontWeight: '500',
  },
  languageSubtext: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  languageList: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADII.sm,
    marginBottom: SPACING.xs,
  },
});

export default SettingsScreen;
