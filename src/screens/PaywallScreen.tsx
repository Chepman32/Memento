import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/navigationTypes';
import { useThemeStore } from '../store/themeStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { Button, Card } from '../components/common';
import { haptics } from '../utils/hapticFeedback';
import { sounds } from '../utils/soundEffects';
import { SubscriptionType, SUBSCRIPTION_PRODUCTS, PremiumFeature } from '../types/purchase.types';
import { PAYWALL_CONFIG } from '../constants/iap';
import { SPACING, RADII, TYPOGRAPHY, SHADOWS } from '../constants/theme';

type PaywallScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Paywall'>;

const PaywallScreen: React.FC = () => {
  const navigation = useNavigation<PaywallScreenNavigationProp>();
  const { colors } = useThemeStore();
  const { activateSubscription, activateTrial } = usePurchaseStore();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType>(SubscriptionType.ANNUAL);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClose = () => {
    haptics.light();
    navigation.goBack();
  };

  const handleSelectPlan = (plan: SubscriptionType) => {
    haptics.selection();
    sounds.tap();
    setSelectedPlan(plan);
  };

  const handleSubscribe = async () => {
    setIsProcessing(true);
    haptics.medium();

    try {
      // In a real app, this would call react-native-iap
      // For demo, we'll activate a trial
      await new Promise((resolve) => setTimeout(resolve, 1000));

      activateTrial(selectedPlan);
      sounds.success();
      haptics.success();
      navigation.goBack();
    } catch (error) {
      sounds.error();
      haptics.error();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    haptics.light();

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      sounds.success();
    } catch (error) {
      sounds.error();
    } finally {
      setIsProcessing(false);
    }
  };

  const features = [
    { icon: '📷', title: 'Unlimited Photos', description: 'Create slideshows with 50+ photos' },
    { icon: '✨', title: 'Premium Transitions', description: 'Access all 13 transition effects' },
    { icon: '🎵', title: 'Custom Music', description: 'Add your own background music' },
    { icon: '4️⃣', title: '4K Export', description: 'Export in ultra-high definition' },
    { icon: '💧', title: 'No Watermark', description: 'Clean, professional exports' },
    { icon: '🎨', title: 'Advanced Effects', description: 'Ken Burns, color grading & more' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <Text style={[styles.closeButton, { color: colors.text }]}>×</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Unlock Premium</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Create unlimited memories
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={styles.plans}>
          {/* Annual Plan */}
          <TouchableOpacity
            onPress={() => handleSelectPlan(SubscriptionType.ANNUAL)}
            activeOpacity={0.8}
          >
            <Card
              style={[
                styles.planCard,
                {
                  borderColor: selectedPlan === SubscriptionType.ANNUAL ? colors.primary : colors.border,
                  borderWidth: 3,
                },
                selectedPlan === SubscriptionType.ANNUAL && SHADOWS.md,
              ]}
            >
              {selectedPlan === SubscriptionType.ANNUAL && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.badgeText}>BEST VALUE</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: colors.text }]}>Annual</Text>
                <Text style={[styles.planPrice, { color: colors.text }]}>$29.99/year</Text>
                <Text style={[styles.planSubprice, { color: colors.textSecondary }]}>
                  $2.50/month • Save 50%
                </Text>
              </View>

              <Text style={[styles.trialText, { color: colors.primary }]}>7 days free trial</Text>
            </Card>
          </TouchableOpacity>

          {/* Monthly Plan */}
          <TouchableOpacity
            onPress={() => handleSelectPlan(SubscriptionType.MONTHLY)}
            activeOpacity={0.8}
          >
            <Card
              style={[
                styles.planCard,
                {
                  borderColor:
                    selectedPlan === SubscriptionType.MONTHLY ? colors.primary : colors.border,
                  borderWidth: 3,
                },
              ]}
            >
              <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: colors.text }]}>Monthly</Text>
                <Text style={[styles.planPrice, { color: colors.text }]}>$4.99/month</Text>
                <Text style={[styles.planSubprice, { color: colors.textSecondary }]}>
                  Most flexible
                </Text>
              </View>

              <Text style={[styles.trialText, { color: colors.primary }]}>3 days free trial</Text>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Subscribe button */}
        <Button
          title={`Start Free Trial`}
          onPress={handleSubscribe}
          variant="primary"
          loading={isProcessing}
          fullWidth
          style={styles.subscribeButton}
        />

        {/* Restore purchases */}
        <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
          <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        {/* Legal */}
        <View style={styles.legal}>
          <Text style={[styles.legalText, { color: colors.textSecondary }]}>
            Auto-renewable subscription. Cancel anytime.
          </Text>
          <Text style={[styles.legalText, { color: colors.textSecondary }]}>
            Payment will be charged to your Apple ID account.
          </Text>
          <Text style={[styles.legalText, { color: colors.textSecondary }]}>
            Your subscription will automatically renew unless auto-renew is turned off at least 24
            hours before the end of the current period.
          </Text>
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
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  closeButton: {
    fontSize: 36,
    fontWeight: '300',
  },
  content: {
    padding: SPACING.md,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.h1,
    marginBottom: 8,
  },
  subtitle: {
    ...TYPOGRAPHY.body1,
  },
  features: {
    marginBottom: SPACING.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...TYPOGRAPHY.body1,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    ...TYPOGRAPHY.body2,
  },
  plans: {
    marginBottom: SPACING.lg,
  },
  planCard: {
    marginBottom: SPACING.md,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -50 }],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs / 2,
    borderRadius: RADII.pill,
    zIndex: 1,
  },
  badgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  planName: {
    ...TYPOGRAPHY.h3,
    marginBottom: 4,
  },
  planPrice: {
    ...TYPOGRAPHY.h2,
    marginBottom: 4,
  },
  planSubprice: {
    ...TYPOGRAPHY.caption,
  },
  trialText: {
    ...TYPOGRAPHY.body2,
    fontWeight: '600',
    textAlign: 'center',
  },
  subscribeButton: {
    marginBottom: SPACING.md,
  },
  restoreButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  restoreText: {
    ...TYPOGRAPHY.body2,
    fontWeight: '600',
  },
  legal: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  legalText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    lineHeight: 14,
  },
});

export default PaywallScreen;
