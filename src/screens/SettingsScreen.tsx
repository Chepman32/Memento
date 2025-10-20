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
import { RootStackParamList } from '../navigation/navigationTypes';
import { useThemeStore } from '../store/themeStore';
import { useSettingsStore } from '../store/settingsStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { Card } from '../components/common';
import { haptics } from '../utils/hapticFeedback';
import { sounds } from '../utils/soundEffects';
import { Theme } from '../types/theme.types';
import { HapticStrength } from '../types/settings.types';
import { SPACING, RADII, TYPOGRAPHY } from '../constants/theme';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { colors, theme, setTheme } = useThemeStore();
  const { settings, updateSettings, clearCache } = useSettingsStore();
  const { purchaseState } = usePurchaseStore();

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
    Alert.alert('Clear Cache', 'Are you sure you want to clear the cache?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearCache();
          haptics.success();
          Alert.alert('Success', 'Cache cleared successfully');
        },
      },
    ]);
  };

  const formatCacheSize = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <Text style={[styles.closeButton, { color: colors.text }]}>×</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>

          {/* Theme selection */}
          <Card style={styles.card}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Theme</Text>
            <View style={styles.themeGrid}>
              {Object.values(Theme).map((themeOption) => (
                <TouchableOpacity
                  key={themeOption}
                  style={[
                    styles.themeOption,
                    { borderColor: theme === themeOption ? colors.primary : colors.border },
                  ]}
                  onPress={() => handleThemeChange(themeOption)}
                >
                  <View
                    style={[
                      styles.themePreview,
                      {
                        backgroundColor:
                          themeOption === Theme.LIGHT
                            ? '#FFFFFF'
                            : themeOption === Theme.DARK
                            ? '#000000'
                            : themeOption === Theme.SOLAR
                            ? '#FFF8DC'
                            : '#E8E8E8',
                      },
                    ]}
                  />
                  <Text style={[styles.themeLabel, { color: colors.text }]}>
                    {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </View>

        {/* Sound & Haptics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Feedback</Text>

          <Card style={styles.card}>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Sound Effects</Text>
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
              <Text style={[styles.settingLabel, { color: colors.text }]}>Haptic Feedback</Text>
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
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Haptic Strength</Text>
              <View style={styles.strengthOptions}>
                {Object.values(HapticStrength).map((strength) => (
                  <TouchableOpacity
                    key={strength}
                    style={[
                      styles.strengthOption,
                      {
                        backgroundColor:
                          settings.hapticStrength === strength ? colors.primary : colors.surface,
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
                            settings.hapticStrength === strength ? '#FFFFFF' : colors.text,
                        },
                      ]}
                    >
                      {strength.charAt(0).toUpperCase() + strength.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}
        </View>

        {/* Storage */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Storage</Text>

          <Card style={styles.card}>
            <View style={styles.settingRow}>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Cache</Text>
                <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                  {formatCacheSize(settings.cacheSize)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.clearButton, { borderColor: colors.error }]}
                onPress={handleClearCache}
              >
                <Text style={[styles.clearButtonText, { color: colors.error }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Premium */}
        {purchaseState.isPremium && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Premium</Text>

            <Card style={[styles.card, { backgroundColor: colors.primary + '20' }]}>
              <View style={styles.premiumInfo}>
                <Text style={[styles.premiumTitle, { color: colors.primary }]}>
                  ⭐ Premium Active
                </Text>
                <Text style={[styles.premiumText, { color: colors.text }]}>
                  {purchaseState.subscriptionType === 'monthly' ? 'Monthly' : 'Annual'} Plan
                </Text>
                {purchaseState.expirationDate && (
                  <Text style={[styles.premiumSubtext, { color: colors.textSecondary }]}>
                    Renews on {new Date(purchaseState.expirationDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </Card>
          </View>
        )}

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>

          <Card style={styles.card}>
            <TouchableOpacity style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Version</Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>1.0.0</Text>
            </TouchableOpacity>
          </Card>

          <Card style={styles.card}>
            <TouchableOpacity style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Privacy Policy</Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>→</Text>
            </TouchableOpacity>
          </Card>

          <Card style={styles.card}>
            <TouchableOpacity style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Terms of Service</Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>→</Text>
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
  premiumInfo: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  premiumTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: 4,
  },
  premiumText: {
    ...TYPOGRAPHY.body1,
    marginBottom: 4,
  },
  premiumSubtext: {
    ...TYPOGRAPHY.caption,
  },
});

export default SettingsScreen;
