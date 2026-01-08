import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Easing,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  G,
} from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../navigation/navigationTypes';
import { useThemeStore } from '../store/themeStore';
import { useSettingsStore } from '../store/settingsStore';
import { AnimatedBackground, Button } from '../components/common';
import { SPACING, RADII, TYPOGRAPHY } from '../constants/theme';
import { haptics } from '../utils/hapticFeedback';

const VIEWBOX_WIDTH = 300;
const VIEWBOX_HEIGHT = 220;

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const alphaValue = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${normalized}${alphaValue}`;
};

type OnboardingNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

interface IllustrationProps {
  width: number;
  height: number;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    border: string;
  };
}

const StoryIllustration: React.FC<IllustrationProps> = ({ width, height, colors }) => {
  const float = useRef(new Animated.Value(0)).current;
  const sparkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const sparkleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkle, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sparkle, {
          toValue: 0,
          duration: 1200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    floatLoop.start();
    sparkleLoop.start();

    return () => {
      floatLoop.stop();
      sparkleLoop.stop();
    };
  }, [float, sparkle]);

  const floatY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  const floatRotate = float.interpolate({
    inputRange: [0, 1],
    outputRange: ['-1.5deg', '2deg'],
  });

  const sparkleScale = sparkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.2],
  });
  const sparkleOpacity = sparkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  const accentSoft = withAlpha(colors.secondary, 0.18);
  const cardFill = withAlpha(colors.surface, 0.96);
  const cardStroke = withAlpha(colors.border, 0.9);
  const highlight = withAlpha(colors.accent, 0.35);

  const renderCard = (x: number, y: number, tint: string) => (
    <G>
      <Rect
        x={x}
        y={y}
        width={180}
        height={120}
        rx={16}
        fill={cardFill}
        stroke={cardStroke}
        strokeWidth={2}
      />
      <Rect x={x + 12} y={y + 14} width={156} height={66} rx={10} fill={accentSoft} />
      <Circle cx={x + 34} cy={y + 38} r={10} fill={tint} />
      <Path
        d={`M${x + 18} ${y + 78} L${x + 66} ${y + 40} L${x + 118} ${y + 78} Z`}
        fill={highlight}
      />
      <Rect x={x + 12} y={y + 92} width={96} height={10} rx={5} fill={withAlpha(colors.border, 0.6)} />
    </G>
  );

  return (
    <View style={[styles.illustrationCanvas, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}>
        <Circle cx={70} cy={70} r={54} fill={withAlpha(colors.primary, 0.18)} />
        {renderCard(48, 60, colors.primary)}
        {renderCard(70, 46, colors.secondary)}
      </Svg>
      <Animated.View
        style={[
          styles.illustrationLayer,
          {
            width,
            height,
            transform: [{ translateY: floatY }, { rotate: floatRotate }],
          },
        ]}
      >
        <Svg width={width} height={height} viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}>
          {renderCard(92, 32, colors.accent)}
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          styles.sparkle,
          {
            opacity: sparkleOpacity,
            transform: [{ scale: sparkleScale }],
          },
        ]}
      >
        <Svg width={32} height={32} viewBox="0 0 24 24">
          <Path
            d="M12 2.5l2.4 5.4 5.6.5-4.2 3.6 1.3 5.5-5.1-3-5.1 3 1.3-5.5-4.2-3.6 5.6-.5L12 2.5z"
            fill={colors.accent}
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const RhythmIllustration: React.FC<IllustrationProps> = ({ width, height, colors }) => {
  const playhead = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(playhead, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(playhead, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [playhead]);

  const playheadX = playhead.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 230],
  });
  const playheadLeft = Animated.subtract(playheadX, 2);

  const AnimatedRect = Animated.createAnimatedComponent(Rect);
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <View style={[styles.illustrationCanvas, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}>
        <Rect
          x={24}
          y={36}
          width={252}
          height={148}
          rx={24}
          fill={withAlpha(colors.surface, 0.96)}
          stroke={withAlpha(colors.border, 0.8)}
          strokeWidth={2}
        />
        <Rect x={44} y={120} width={26} height={44} rx={8} fill={withAlpha(colors.primary, 0.4)} />
        <Rect x={80} y={96} width={26} height={68} rx={8} fill={withAlpha(colors.secondary, 0.5)} />
        <Rect x={116} y={108} width={26} height={56} rx={8} fill={withAlpha(colors.primary, 0.55)} />
        <Rect x={152} y={88} width={26} height={76} rx={8} fill={withAlpha(colors.secondary, 0.55)} />
        <Rect x={188} y={116} width={26} height={48} rx={8} fill={withAlpha(colors.primary, 0.4)} />
        <Rect x={224} y={100} width={26} height={64} rx={8} fill={withAlpha(colors.secondary, 0.5)} />
        <Path
          d="M52 78h196"
          stroke={withAlpha(colors.border, 0.6)}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <AnimatedRect
          x={playheadLeft}
          y={68}
          width={4}
          height={104}
          rx={2}
          fill={colors.accent}
        />
        <AnimatedCircle
          cx={playheadX}
          cy={62}
          r={7}
          fill={colors.accent}
          opacity={0.9}
        />
      </Svg>
    </View>
  );
};

const TransitionIllustration: React.FC<IllustrationProps> = ({ width, height, colors }) => {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fade, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(fade, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [fade]);

  const overlayOpacity = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.85],
  });

  const AnimatedRect = Animated.createAnimatedComponent(Rect);

  return (
    <View style={[styles.illustrationCanvas, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}>
        <Circle cx={232} cy={68} r={46} fill={withAlpha(colors.primary, 0.14)} />
        <Rect
          x={36}
          y={50}
          width={180}
          height={120}
          rx={18}
          fill={withAlpha(colors.surface, 0.95)}
          stroke={withAlpha(colors.border, 0.75)}
          strokeWidth={2}
        />
        <Rect
          x={70}
          y={30}
          width={190}
          height={130}
          rx={18}
          fill={withAlpha(colors.primary, 0.15)}
          stroke={withAlpha(colors.border, 0.8)}
          strokeWidth={2}
        />
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={withAlpha(colors.secondary, 0.2)} />
            <Stop offset="1" stopColor={withAlpha(colors.accent, 0.45)} />
          </LinearGradient>
        </Defs>
        <AnimatedRect
          x={70}
          y={30}
          width={190}
          height={130}
          rx={18}
          fill="url(#fade)"
          opacity={overlayOpacity}
        />
        <Path
          d="M118 92c18 16 46 16 64 0"
          stroke={colors.accent}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M176 76l18 6-12 15"
          stroke={colors.accent}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
};

const ExportIllustration: React.FC<IllustrationProps> = ({ width, height, colors }) => {
  const arrow = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const arrowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(arrow, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(arrow, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    arrowLoop.start();
    shimmerLoop.start();

    return () => {
      arrowLoop.stop();
      shimmerLoop.stop();
    };
  }, [arrow, shimmer]);

  const arrowY = arrow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });
  const shimmerScale = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.3],
  });
  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.9],
  });

  return (
    <View style={[styles.illustrationCanvas, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}>
        <Circle cx={78} cy={166} r={44} fill={withAlpha(colors.secondary, 0.14)} />
        <Rect
          x={96}
          y={26}
          width={120}
          height={170}
          rx={24}
          fill={withAlpha(colors.surface, 0.96)}
          stroke={withAlpha(colors.border, 0.8)}
          strokeWidth={2}
        />
        <Rect x={110} y={44} width={92} height={122} rx={16} fill={withAlpha(colors.primary, 0.14)} />
        <Rect x={124} y={176} width={64} height={6} rx={3} fill={withAlpha(colors.border, 0.7)} />
      </Svg>
      <Animated.View
        style={[
          styles.arrowLayer,
          {
            transform: [{ translateY: arrowY }],
          },
        ]}
      >
        <Svg width={72} height={72} viewBox="0 0 72 72">
          <Path
            d="M36 54V18"
            stroke={colors.accent}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <Path
            d="M24 30l12-12 12 12"
            stroke={colors.accent}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          styles.shimmer,
          {
            opacity: shimmerOpacity,
            transform: [{ scale: shimmerScale }],
          },
        ]}
      >
        <Svg width={28} height={28} viewBox="0 0 24 24">
          <Path
            d="M12 3l2.2 5 5 .4-3.8 3.3 1.2 5-4.6-2.8-4.6 2.8 1.2-5L4.8 8.4 9.8 8 12 3z"
            fill={colors.accent}
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

interface Slide {
  key: string;
  title: string;
  body: string;
  Illustration: React.FC<IllustrationProps>;
}

interface SlideProps {
  slide: Slide;
  index: number;
  total: number;
  scrollX: Animated.Value;
  width: number;
  height: number;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    border: string;
    text: string;
    textSecondary: string;
  };
  tipLabel: string;
}

const OnboardingSlide: React.FC<SlideProps> = ({
  slide,
  index,
  total,
  scrollX,
  width,
  height,
  colors,
  tipLabel,
}) => {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const illustrationTranslate = scrollX.interpolate({
    inputRange,
    outputRange: [30, 0, 30],
    extrapolate: 'clamp',
  });
  const illustrationScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.9, 1, 0.9],
    extrapolate: 'clamp',
  });
  const illustrationOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.6, 1, 0.6],
    extrapolate: 'clamp',
  });

  const textTranslate = scrollX.interpolate({
    inputRange,
    outputRange: [24, 0, 24],
    extrapolate: 'clamp',
  });
  const textOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  const illustrationWidth = Math.min(320, width * 0.78);
  const illustrationHeight = Math.min(260, height * 0.5);

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View
        style={[
          styles.illustrationWrapper,
          {
            height: illustrationHeight,
            opacity: illustrationOpacity,
            transform: [{ translateY: illustrationTranslate }, { scale: illustrationScale }],
          },
        ]}
      >
        <slide.Illustration
          width={illustrationWidth}
          height={illustrationHeight}
          colors={colors}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.textWrapper,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslate }],
          },
        ]}
      >
        <View
          style={[
            styles.tipBadge,
            {
              backgroundColor: withAlpha(colors.primary, 0.16),
              borderColor: withAlpha(colors.primary, 0.4),
            },
          ]}
        >
          <Text style={[styles.tipText, { color: colors.primary }]}>{tipLabel}</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{slide.body}</Text>
        <Text style={[styles.progress, { color: colors.textSecondary }]}>({index + 1}/{total})</Text>
      </Animated.View>
    </View>
  );
};

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingNavigationProp>();
  const { colors } = useThemeStore();
  const { updateSettings } = useSettingsStore();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const slides = useMemo<Slide[]>(
    () => [
      {
        key: 'hook',
        title: t('onboarding.slides.hook.title'),
        body: t('onboarding.slides.hook.body'),
        Illustration: StoryIllustration,
      },
      {
        key: 'rhythm',
        title: t('onboarding.slides.rhythm.title'),
        body: t('onboarding.slides.rhythm.body'),
        Illustration: RhythmIllustration,
      },
      {
        key: 'transitions',
        title: t('onboarding.slides.transitions.title'),
        body: t('onboarding.slides.transitions.body'),
        Illustration: TransitionIllustration,
      },
      {
        key: 'export',
        title: t('onboarding.slides.export.title'),
        body: t('onboarding.slides.export.body'),
        Illustration: ExportIllustration,
      },
    ],
    [t],
  );

  const handleSkip = () => {
    haptics.light();
    updateSettings({ onboardingCompleted: true });
    navigation.replace('Home');
  };

  const handleNext = () => {
    haptics.light();
    if (activeIndex < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (activeIndex + 1), animated: true });
      return;
    }

    haptics.success();
    updateSettings({ onboardingCompleted: true });
    navigation.replace('Home');
  };

  const handleMomentumEnd = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(nextIndex);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedBackground variant="vibrant">
        <View style={[styles.scrim, { backgroundColor: colors.background }]} pointerEvents="none" />
        <View style={styles.orbContainer} pointerEvents="none">
          <View
            style={[
              styles.orb,
              {
                backgroundColor: withAlpha(colors.primary, 0.25),
                width: 220,
                height: 220,
                left: -60,
                top: -40,
              },
            ]}
          />
          <View
            style={[
              styles.orb,
              {
                backgroundColor: withAlpha(colors.secondary, 0.2),
                width: 180,
                height: 180,
                right: -50,
                top: height * 0.15,
              },
            ]}
          />
          <View
            style={[
              styles.orb,
              {
                backgroundColor: withAlpha(colors.accent, 0.18),
                width: 240,
                height: 240,
                right: -80,
                bottom: -60,
              },
            ]}
          />
        </View>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topBar}>
            <Text style={[styles.brand, { color: colors.text }]}>SlideMint</Text>
            <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                {t('onboarding.skip')}
              </Text>
            </TouchableOpacity>
          </View>
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            style={styles.scroll}
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleMomentumEnd}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true },
            )}
          >
            {slides.map((slide, index) => (
              <OnboardingSlide
                key={slide.key}
                slide={slide}
                index={index}
                total={slides.length}
                scrollX={scrollX}
                width={width}
                height={height}
                colors={colors}
                tipLabel={t('onboarding.tipLabel', { index: index + 1, total: slides.length })}
              />
            ))}
          </Animated.ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
            <View style={styles.pagination}>
              {slides.map((_, index) => {
                const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
                const dotScale = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.6, 1.4, 0.6],
                  extrapolate: 'clamp',
                });
                const dotOpacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.35, 1, 0.35],
                  extrapolate: 'clamp',
                });

                return (
                  <Animated.View
                    key={`dot-${index}`}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: colors.primary,
                        opacity: dotOpacity,
                        transform: [{ scale: dotScale }],
                      },
                    ]}
                  />
                );
              })}
            </View>
            <Button
              title={
                activeIndex === slides.length - 1
                  ? t('onboarding.getStarted')
                  : t('common.next')
              }
              onPress={handleNext}
              fullWidth
              size="large"
            />
          </View>
        </SafeAreaView>
      </AnimatedBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.88,
  },
  orbContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    ...TYPOGRAPHY.h4,
    letterSpacing: 0.3,
  },
  skipText: {
    ...TYPOGRAPHY.body2,
    fontWeight: '600',
  },
  slide: {
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  illustrationWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationCanvas: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  arrowLayer: {
    position: 'absolute',
    left: '50%',
    top: 8,
    marginLeft: -36,
  },
  shimmer: {
    position: 'absolute',
    right: 34,
    bottom: 22,
  },
  textWrapper: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  tipBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.pill,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  tipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    ...TYPOGRAPHY.h2,
    textAlign: 'center',
  },
  body: {
    ...TYPOGRAPHY.body1,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  progress: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.sm,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 6,
  },
});

export default OnboardingScreen;
