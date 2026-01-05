import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../navigation/navigationTypes';
import { useThemeStore } from '../store/themeStore';
import { useSettingsStore } from '../store/settingsStore';
import { Card } from '../components/common';
import { haptics } from '../utils/hapticFeedback';
import { sounds } from '../utils/soundEffects';
import { Theme } from '../types/theme.types';
import { HapticStrength } from '../types/settings.types';
import { SPACING, RADII, TYPOGRAPHY, THEME_COLORS } from '../constants/theme';

type SettingsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Settings'
>;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { t } = useTranslation();
  const { colors, theme, setTheme } = useThemeStore();
  const { settings, updateSettings, clearCache } = useSettingsStore();
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

  const handleThemeChange = (newTheme: Theme) => {
    haptics.medium();
    sounds.tap();
    setTheme(newTheme);
  };

  const handleToggleSound = (value: boolean) => {
    haptics.light();
    if (value) sounds.tap();
    updateSettings({ soundEnabled: value });
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

        {/* Sound & Haptics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('settings.feedback')}
          </Text>

          <Card style={styles.card}>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                {t('settings.soundEffects')}
              </Text>
              <Switch
                value={settings.soundEnabled}
                onValueChange={handleToggleSound}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Card>

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
            <TouchableOpacity style={styles.settingRow}>
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

          <Card style={styles.card}>
            <TouchableOpacity style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                {t('settings.termsOfService')}
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
});

export default SettingsScreen;
