import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Text, Image as RNImage, LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/navigationTypes';
import useProjectStore from '../store/projectStore';
import { useThemeStore } from '../store/themeStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { SPACING, RADII, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { TRANSITIONS } from '../constants/transitions';
import { Canvas, Image, useImage, ColorMatrix } from '@shopify/react-native-skia';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { TransitionType, PhotoEffect } from '../types/project.types';
import { PremiumFeature } from '../types/purchase.types';
import { haptics } from '../utils/hapticFeedback';
import { sounds } from '../utils/soundEffects';
import { IconButton } from '../components/common';

// Types
type EditorScreenRouteProp = RouteProp<RootStackParamList, 'Editor'>;
type EditorScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Editor'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - SPACING.md * 2;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * (16 / 9);
const TIMELINE_HEIGHT = 100;
const THUMBNAIL_SIZE = 80;

export const EditorScreen = () => {
  const route = useRoute<EditorScreenRouteProp>();
  const navigation = useNavigation<EditorScreenNavigationProp>();
  const { photos } = route.params;

  const { colors } = useThemeStore();
  const { purchaseState, hasFeature } = usePurchaseStore();
  const {
    projects,
    currentProjectId,
    createProject,
    updateProject,
    updatePhoto,
    reorderPhotos,
    setCurrentProject,
    addPhotos,
  } = useProjectStore();

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'controls' | 'duration' | 'transitions' | 'tools'>('controls');

  // Get current project
  const currentProject = projects.find(p => p.id === currentProjectId);
  const activePhoto = currentProject?.photos[activePhotoIndex];

  // Initialize project when screen loads
  useEffect(() => {
    const initializeProject = async () => {
      if (!currentProject && photos && photos.length > 0) {
        // Create new project
        const project = await createProject('New Slideshow');

        // Add photos to project
        const photoAssets = photos.map((uri: string) => ({
          uri,
          width: 1920,
          height: 1080,
        }));

        await addPhotos(photoAssets);
      }
    };

    initializeProject();
  }, []);
  
  // Handle photo selection
  const handleSelectPhoto = (index: number) => {
    haptics.selection();
    setActivePhotoIndex(index);
  };

  // Handle photo reordering
  const handleDragEnd = (fromIndex: number, toIndex: number) => {
    if (!currentProject) return;

    if (fromIndex !== toIndex) {
      haptics.medium();
      sounds.tap();
      reorderPhotos(currentProject.id, fromIndex, toIndex);

      if (activePhotoIndex === fromIndex) {
        setActivePhotoIndex(toIndex);
      } else if (activePhotoIndex === toIndex) {
        setActivePhotoIndex(fromIndex);
      }
    }
  };

  // Update photo duration
  const handleDurationChange = (value: number) => {
    if (!currentProject || !activePhoto) return;

    updatePhoto(currentProject.id, activePhoto.id, { duration: value });
    haptics.light();
  };

  // Apply transition effect
  const handleTransitionChange = (transitionType: TransitionType) => {
    if (!currentProject || !activePhoto) return;

    // Check if premium transition
    const transition = TRANSITIONS[transitionType];
    if (transition.isPremium && !purchaseState.isPremium) {
      navigation.navigate('Paywall');
      return;
    }

    haptics.medium();
    sounds.tap();
    updatePhoto(currentProject.id, activePhoto.id, { transition: transitionType });
  };

  // Apply photo effect
  const handleEffectApply = (effectName: PhotoEffect) => {
    if (!currentProject || !activePhoto) return;

    const currentEffects = [...(activePhoto.effects || [])];
    const effectIndex = currentEffects.indexOf(effectName);

    if (effectIndex === -1) {
      // Add effect
      currentEffects.push(effectName);
      haptics.success();
    } else {
      // Remove effect
      currentEffects.splice(effectIndex, 1);
      haptics.light();
    }

    updatePhoto(currentProject.id, activePhoto.id, { effects: currentEffects });
    sounds.tap();
  };

  // Toggle play/pause
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    haptics.medium();
  };

  // Navigate to preview screen
  const handlePreview = () => {
    if (!currentProject) return;

    haptics.medium();
    sounds.tap();
    navigation.navigate('Preview', { projectId: currentProject.id });
  };

  // Save project
  const handleSave = () => {
    haptics.success();
    sounds.success();
    navigation.goBack();
  };

  // Go back without saving
  const handleBack = () => {
    haptics.light();
    navigation.goBack();
  };

  const handleTabChange = (tab: 'controls' | 'duration' | 'transitions' | 'tools') => {
    setActiveTab(tab);
    haptics.light();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'controls':
        return (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>General Controls</Text>
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              General project controls will be here
            </Text>
          </View>
        );
      case 'duration':
        return (
          <View style={styles.tabContent}>
            <View style={styles.controlGroup}>
              <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>
                Duration: {activePhoto?.duration || 0}s
              </Text>
              <Slider
                value={activePhoto?.duration || 3}
                min={1}
                max={15}
                step={1}
                onValueChange={handleDurationChange}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              Set how long this photo will be displayed in the slideshow
            </Text>
          </View>
        );
      case 'transitions':
        return (
          <View style={styles.tabContent}>
            <View style={styles.controlGroup}>
              <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>Select Transition</Text>
              <TransitionPicker
                selectedTransition={activePhoto?.transition || TransitionType.FADE}
                onSelect={handleTransitionChange}
                isPremium={purchaseState.isPremium}
              />
            </View>
          </View>
        );
      case 'tools':
        return (
          <View style={styles.tabContent}>
            <View style={styles.controlGroup}>
              <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>Effects</Text>
              <EffectPicker
                selectedEffects={activePhoto?.effects || []}
                onSelect={handleEffectApply}
              />
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <GestureHandlerRootView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon={<Text style={[styles.backIcon, { color: colors.text }]}>←</Text>}
            onPress={handleBack}
            variant="default"
            size={44}
          />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Editor</Text>
          <IconButton
            icon={<Text style={[styles.backIcon, { color: colors.text }]}>♫</Text>}
            onPress={() => {}}
            variant="default"
            size={44}
          />
        </View>

        {/* Top Half: Preview & Timeline */}
        <View style={styles.topHalf}>
          <View style={[styles.previewContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {activePhoto && (
              <PhotoPreview
                photo={activePhoto}
                width={PREVIEW_WIDTH}
                height={PREVIEW_HEIGHT * 0.6}
              />
            )}
          </View>

          <View style={styles.timelineContainer}>
            <PhotoTimeline
              photos={currentProject?.photos || []}
              activeIndex={activePhotoIndex}
              onSelectPhoto={handleSelectPhoto}
              onDragEnd={handleDragEnd}
            />
          </View>
        </View>

        {/* Bottom Half: Tabs & Content */}
        <View style={[styles.bottomHalf, { backgroundColor: colors.surface }]}>
          {/* Tab Selector */}
          <View style={[styles.tabSelector, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'controls' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => handleTabChange('controls')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'controls' ? colors.primary : colors.textSecondary }]}>
                Controls
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'duration' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => handleTabChange('duration')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'duration' ? colors.primary : colors.textSecondary }]}>
                Duration
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'transitions' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => handleTabChange('transitions')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'transitions' ? colors.primary : colors.textSecondary }]}>
                Transitions
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'tools' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => handleTabChange('tools')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'tools' ? colors.primary : colors.textSecondary }]}>
                Tools
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {renderTabContent()}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleSave}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handlePreview}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                Preview
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
};

// Photo Preview Component
interface PhotoPreviewProps {
  photo: {
    uri: string;
    width: number;
    height: number;
    effects?: PhotoEffect[];
  };
  width: number;
  height: number;
}

const PhotoPreview: React.FC<PhotoPreviewProps> = ({ photo, width, height }) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const image = useImage(photo.uri);

  // Calculate aspect ratio and dimensions
  useEffect(() => {
    if (photo.width && photo.height) {
      const aspectRatio = photo.width / photo.height;
      const containerAspect = width / height;

      if (aspectRatio > containerAspect) {
        // Image is wider than container
        setSize({
          width: width,
          height: width / aspectRatio,
        });
      } else {
        // Image is taller than container
        setSize({
          width: height * aspectRatio,
          height: height,
        });
      }
    }
  }, [photo, width, height]);

  // Get color matrix for effects
  const getColorMatrix = (): number[] | undefined => {
    if (!photo.effects || photo.effects.length === 0) return undefined;

    // Sepia effect
    if (photo.effects.includes(PhotoEffect.SEPIA)) {
      return [
        0.393, 0.769, 0.189, 0, 0,
        0.349, 0.686, 0.168, 0, 0,
        0.272, 0.534, 0.131, 0, 0,
        0, 0, 0, 1, 0,
      ];
    }

    // Black & White effect
    if (photo.effects.includes(PhotoEffect.BLACK_WHITE)) {
      return [
        0.33, 0.33, 0.33, 0, 0,
        0.33, 0.33, 0.33, 0, 0,
        0.33, 0.33, 0.33, 0, 0,
        0, 0, 0, 1, 0,
      ];
    }

    // Vintage effect (warm tones)
    if (photo.effects.includes(PhotoEffect.VINTAGE)) {
      return [
        1.2, 0, 0, 0, 0,
        0, 0.9, 0, 0, 0,
        0, 0, 0.7, 0, 0,
        0, 0, 0, 1, 0,
      ];
    }

    return undefined;
  };

  if (!image) {
    return <View style={[styles.previewPlaceholder, { width, height }]} />;
  }

  const colorMatrix = getColorMatrix();
  const x = (width - size.width) / 2;
  const y = (height - size.height) / 2;

  return (
    <Canvas style={{ width, height }}>
      <Image
        image={image}
        x={x}
        y={y}
        width={size.width}
        height={size.height}
        fit="contain"
      >
        {colorMatrix && <ColorMatrix matrix={colorMatrix} />}
      </Image>
    </Canvas>
  );
};

// Slider Component
interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  color: string;
}

const Slider: React.FC<SliderProps> = ({ value, min, max, step, onValueChange, color }) => {
  const { colors } = useThemeStore();
  const [trackWidth, setTrackWidth] = useState(0);
  const position = useSharedValue(0);
  const startOffset = useSharedValue(0);
  const currentValue = useSharedValue(value);
  const range = max - min;

  const handleTrackLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  useEffect(() => {
    if (trackWidth <= 0 || range === 0) return;
    const clampedValue = Math.min(Math.max(value, min), max);
    const ratio = (clampedValue - min) / range;
    position.value = ratio * trackWidth;
    currentValue.value = clampedValue;
  }, [value, min, max, range, trackWidth, position, currentValue]);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      startOffset.value = position.value;
    })
    .onChange((event) => {
      if (trackWidth <= 0 || range === 0) return;
      const nextPosition = Math.min(Math.max(startOffset.value + event.translationX, 0), trackWidth);
      if (nextPosition === position.value) return;

      position.value = nextPosition;

      const ratio = nextPosition / trackWidth;
      const rawValue = min + ratio * range;
      const snapped = min + Math.round((rawValue - min) / step) * step;
      const clampedValue = Math.min(Math.max(snapped, min), max);

      if (currentValue.value !== clampedValue) {
        currentValue.value = clampedValue;
        runOnJS(onValueChange)(clampedValue);
      }
    })
    .onFinalize(() => {
      startOffset.value = position.value;
    });

  const progressStyle = useAnimatedStyle(() => ({
    width: position.value,
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value }],
  }));

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderTrackWrapper}>
        <View
          style={[styles.sliderTrack, { backgroundColor: colors.border }]}
          onLayout={handleTrackLayout}
        >
          <Animated.View style={[styles.sliderProgress, { backgroundColor: color }, progressStyle]} />
        </View>
        <GestureDetector gesture={gesture}>
          <Animated.View style={styles.sliderGestureArea}>
            <Animated.View style={[styles.sliderKnob, { borderColor: color }, knobStyle]} />
          </Animated.View>
        </GestureDetector>
      </View>
      <Text style={[styles.sliderValue, { color: colors.textSecondary }]}>{value}s</Text>
    </View>
  );
};

// Transition Picker Component
interface TransitionPickerProps {
  selectedTransition: TransitionType;
  onSelect: (transition: TransitionType) => void;
  isPremium: boolean;
}

const TransitionPicker: React.FC<TransitionPickerProps> = ({ selectedTransition, onSelect, isPremium }) => {
  const { colors } = useThemeStore();
  const transitions = Object.values(TRANSITIONS);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.transitionContainer}
    >
      {transitions.map((transition) => {
        const isSelected = selectedTransition === transition.id;
        const isLocked = transition.isPremium && !isPremium;

        return (
          <TouchableOpacity
            key={transition.id}
            style={styles.transitionItem}
            onPress={() => onSelect(transition.id)}
          >
            <View
              style={[
                styles.transitionIcon,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSelected && { borderColor: colors.primary, borderWidth: 2 },
              ]}
            >
              <Text style={[styles.transitionIconText, { color: colors.primary }]}>
                {transition.name.charAt(0)}
              </Text>
              {isLocked && (
                <View style={styles.lockBadge}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.transitionName,
                { color: colors.textSecondary },
                isSelected && { color: colors.primary, fontWeight: '600' },
              ]}
            >
              {transition.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

// Effect Picker Component
interface EffectPickerProps {
  selectedEffects: PhotoEffect[];
  onSelect: (effect: PhotoEffect) => void;
}

const EffectPicker: React.FC<EffectPickerProps> = ({ selectedEffects, onSelect }) => {
  const { colors } = useThemeStore();
  const effects = [
    { id: PhotoEffect.KEN_BURNS, name: 'Ken Burns' },
    { id: PhotoEffect.VIGNETTE, name: 'Vignette' },
    { id: PhotoEffect.SEPIA, name: 'Sepia' },
    { id: PhotoEffect.BLACK_WHITE, name: 'B&W' },
    { id: PhotoEffect.VINTAGE, name: 'Vintage' },
    { id: PhotoEffect.FILM_GRAIN, name: 'Film Grain' },
    { id: PhotoEffect.COLOR_POP, name: 'Color Pop' },
    { id: PhotoEffect.LIGHT_LEAK, name: 'Light Leak' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.effectContainer}
    >
      {effects.map((effect) => {
        const isSelected = selectedEffects.includes(effect.id);

        return (
          <TouchableOpacity
            key={effect.id}
            style={styles.effectItem}
            onPress={() => onSelect(effect.id)}
          >
            <View
              style={[
                styles.effectIcon,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSelected && { borderColor: colors.success, borderWidth: 2, backgroundColor: colors.success + '20' },
              ]}
            >
              <Text style={[styles.effectIconText, { color: isSelected ? colors.success : colors.primary }]}>
                {effect.name.charAt(0)}
              </Text>
            </View>
            <Text
              style={[
                styles.effectName,
                { color: colors.textSecondary },
                isSelected && { color: colors.success, fontWeight: '600' },
              ]}
            >
              {effect.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

// Photo Timeline Component
interface PhotoTimelineProps {
  photos: any[];
  activeIndex: number;
  onSelectPhoto: (index: number) => void;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
}

const PhotoTimeline: React.FC<PhotoTimelineProps> = ({ photos, activeIndex, onSelectPhoto, onDragEnd }) => {
  const { colors } = useThemeStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [currentTargetIndex, setCurrentTargetIndex] = useState<number | null>(null);
  const positions = useSharedValue<number[]>(photos.map((_, i) => i));

  // Reset positions when photos change
  useEffect(() => {
    positions.value = photos.map((_, i) => i);
  }, [photos.length]);

  // Scroll to active photo
  useEffect(() => {
    if (scrollViewRef.current && photos.length > 0) {
      const offset = Math.max(
        0,
        activeIndex * (THUMBNAIL_SIZE + SPACING.sm * 2) - SCREEN_WIDTH / 2 + THUMBNAIL_SIZE / 2
      );
      scrollViewRef.current.scrollTo({ x: offset, animated: true });
    }
  }, [activeIndex, photos.length]);

  const getOrder = (index: number) => {
    'worklet';
    return positions.value.indexOf(index);
  };

  const renderPhoto = (photo: any, index: number) => {
    const isActive = index === activeIndex;
    const isDragged = index === draggedIndex;
    const translateX = useSharedValue(0);
    const scale = useSharedValue(1);
    const itemWidth = THUMBNAIL_SIZE + SPACING.sm * 2;

    const longPress = Gesture.LongPress()
      .minDuration(400)
      .onStart(() => {
        runOnJS(haptics.medium)();
        scale.value = withSpring(1.2);
        runOnJS(setDraggedIndex)(index);
      });

    const pan = Gesture.Pan()
      .activeOffsetX([-10, 10])
      .failOffsetY([-10, 10])
      .onUpdate((event) => {
        if (draggedIndex === index) {
          translateX.value = event.translationX;

          // Calculate target index based on drag distance
          const movedItems = Math.round(translateX.value / itemWidth);
          const newTargetIndex = Math.max(0, Math.min(photos.length - 1, index + movedItems));

          // Update positions array in real-time for live reordering
          const oldOrder = [...positions.value];
          const currentPos = oldOrder.indexOf(index);
          const targetPos = newTargetIndex;

          if (currentPos !== targetPos) {
            // Create new order array
            const newOrder = oldOrder.filter(i => i !== index);
            newOrder.splice(targetPos, 0, index);
            positions.value = newOrder;

            runOnJS(setCurrentTargetIndex)(newTargetIndex);
            runOnJS(haptics.light)();
          }
        }
      })
      .onEnd(() => {
        if (draggedIndex === index) {
          const movedItems = Math.round(translateX.value / itemWidth);
          const targetIndex = Math.max(0, Math.min(photos.length - 1, index + movedItems));

          if (targetIndex !== index) {
            runOnJS(onDragEnd)(index, targetIndex);
            runOnJS(haptics.success)();
          }

          scale.value = withSpring(1);
          translateX.value = withSpring(0);
          runOnJS(setDraggedIndex)(null);
          runOnJS(setCurrentTargetIndex)(null);

          // Reset positions after actual reorder
          positions.value = photos.map((_, i) => i);
        }
      });

    const tap = Gesture.Tap()
      .onStart(() => {
        runOnJS(onSelectPhoto)(index);
        runOnJS(haptics.light)();
      });

    const composed = Gesture.Exclusive(
      Gesture.Simultaneous(longPress, pan),
      tap
    );

    const animatedStyle = useAnimatedStyle(() => {
      // Calculate position based on current order
      const currentOrder = getOrder(index);
      const offset = (currentOrder - index) * itemWidth;

      const finalTranslateX = draggedIndex === index
        ? translateX.value
        : withSpring(offset, {
            damping: 20,
            stiffness: 150,
          });

      return {
        transform: [
          { translateX: finalTranslateX },
          { scale: scale.value },
        ],
        zIndex: draggedIndex === index ? 1000 : 1,
        opacity: draggedIndex === index ? 0.9 : 1,
      };
    });

    return (
      <GestureDetector key={photo.id} gesture={composed}>
        <Animated.View style={[styles.thumbnailContainer, animatedStyle]}>
          <View
            style={[
              styles.thumbnailWrapper,
              { borderColor: isActive ? colors.primary : 'transparent' },
              isDragged && { borderColor: colors.success, borderWidth: 3 },
            ]}
          >
            <RNImage source={{ uri: photo.uri }} style={styles.thumbnailImage} resizeMode="cover" />
            {isActive && !isDragged && (
              <View style={[styles.thumbnailActiveIndicator, { borderColor: colors.primary }]} />
            )}
          </View>
          <Text style={[styles.thumbnailDuration, { color: colors.textSecondary }]} numberOfLines={1}>
            {photo.duration}s
          </Text>
        </Animated.View>
      </GestureDetector>
    );
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.timelineContent}
      scrollEnabled={draggedIndex === null}
    >
      {photos.map((photo: any, index: number) => renderPhoto(photo, index))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backIcon: {
    fontSize: 28,
    fontWeight: '300',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
  },
  topHalf: {
    flex: 1,
    paddingBottom: SPACING.sm,
  },
  bottomHalf: {
    flex: 1,
    borderTopLeftRadius: RADII.lg,
    borderTopRightRadius: RADII.lg,
    overflow: 'hidden',
  },
  previewContainer: {
    flex: 1,
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: RADII.md,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  previewPlaceholder: {
    flex: 1,
  },
  timelineContainer: {
    height: TIMELINE_HEIGHT,
    paddingHorizontal: SPACING.md,
  },
  tabSelector: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingTop: SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tabText: {
    ...TYPOGRAPHY.body1,
    fontWeight: '600',
  },
  tabContent: {
    padding: SPACING.md,
  },
  scrollContent: {
    flex: 1,
  },
  controlGroup: {
    marginBottom: SPACING.md,
  },
  controlLabel: {
    ...TYPOGRAPHY.body2,
    marginBottom: SPACING.xs,
  },
  placeholderText: {
    ...TYPOGRAPHY.body2,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  helpText: {
    ...TYPOGRAPHY.caption,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  sliderTrackWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderProgress: {
    height: '100%',
    borderRadius: 2,
  },
  sliderGestureArea: {
    ...StyleSheet.absoluteFillObject,
  },
  sliderKnob: {
    position: 'absolute',
    top: -10,
    left: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    ...SHADOWS.sm,
  },
  sliderValue: {
    ...TYPOGRAPHY.caption,
    minWidth: 30,
    textAlign: 'right',
  },
  transitionContainer: {
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  transitionItem: {
    alignItems: 'center',
    marginRight: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  transitionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    borderWidth: 1,
  },
  transitionIconText: {
    fontSize: 18,
    fontWeight: '600',
  },
  transitionName: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    maxWidth: 60,
    textAlign: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 10,
  },
  effectContainer: {
    paddingVertical: SPACING.xs,
  },
  effectItem: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  effectIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    borderWidth: 1,
  },
  effectIconText: {
    fontSize: 18,
    fontWeight: '600',
  },
  effectName: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    maxWidth: 60,
    textAlign: 'center',
  },
  timelineContent: {
    paddingHorizontal: SPACING.md,
  },
  thumbnailContainer: {
    width: THUMBNAIL_SIZE + SPACING.sm * 2,
    alignItems: 'center',
    marginRight: SPACING.xs,
  },
  thumbnailWrapper: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: RADII.sm,
    overflow: 'hidden',
    borderWidth: 3,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailActiveIndicator: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: RADII.sm - 1,
  },
  thumbnailDuration: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: RADII.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.sm,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditorScreen;
