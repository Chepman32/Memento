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
import { Transition } from '../types/project.types';
import { Canvas, Image, useImage, ColorMatrix } from '@shopify/react-native-skia';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue, useAnimatedStyle, withSpring, SharedValue } from 'react-native-reanimated';
import { TransitionType, PhotoEffect } from '../types/project.types';
import { PremiumFeature } from '../types/purchase.types';
import { haptics } from '../utils/hapticFeedback';
import { sounds } from '../utils/soundEffects';
import { IconButton } from '../components/common';
import { useAutosave } from '../hooks/useAutosave';
import { SaveIndicator } from '../components/editor/SaveIndicator';

// Types
type EditorScreenRouteProp = RouteProp<RootStackParamList, 'Editor'>;
type EditorScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Editor'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - SPACING.sm * 2;
const PREVIEW_HEIGHT = SCREEN_HEIGHT * 0.35; // Use 35% of screen height for preview
const TIMELINE_HEIGHT = 80;
const THUMBNAIL_SIZE = 60;

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
    addTransition,
    removeTransition,
    updateTransition,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useProjectStore();

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'controls' | 'duration' | 'transitions' | 'tools'>('controls');

  // Get current project
  const currentProject = projects.find(p => p.id === currentProjectId);
  const activePhoto = currentProject?.photos[activePhotoIndex];

  // Autosave functionality
  const { saveStatus, lastSaved, forceSave } = useAutosave(currentProjectId || undefined, {
    debounceMs: 1500,
    onSaveComplete: () => {
      haptics.light();
    },
  });

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

  // Apply transition effect - adds a transition object before the selected photo
  const handleTransitionChange = (transitionType: TransitionType) => {
    if (!currentProject) return;

    // Check if premium transition
    const transition = TRANSITIONS[transitionType];
    if (transition.isPremium && !purchaseState.isPremium) {
      navigation.navigate('Paywall');
      return;
    }

    // Check if transition already exists at this position
    const existingTransition = currentProject.transitions?.find(
      t => t.order === activePhotoIndex
    );

    if (existingTransition) {
      // Update existing transition type
      updateTransition(currentProject.id, existingTransition.id, { type: transitionType });
    } else {
      // Add new transition before the selected photo
      addTransition(currentProject.id, activePhotoIndex, transitionType);
    }

    haptics.medium();
    sounds.tap();
  };

  // Remove transition at current position
  const handleTransitionRemove = () => {
    if (!currentProject) return;

    const existingTransition = currentProject.transitions?.find(
      t => t.order === activePhotoIndex
    );

    if (existingTransition) {
      removeTransition(currentProject.id, existingTransition.id);
      haptics.light();
    }
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

  // Go back with autosave
  const handleBack = async () => {
    haptics.light();
    // Force save any pending changes before navigating back
    await forceSave();
    navigation.goBack();
  };

  // Handle undo
  const handleUndo = () => {
    if (canUndo()) {
      undo();
      haptics.light();
    }
  };

  // Handle redo
  const handleRedo = () => {
    if (canRedo()) {
      redo();
      haptics.light();
    }
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
          </View>
        );
      case 'transitions':
        const currentTransition = currentProject?.transitions?.find(t => t.order === activePhotoIndex);
        return (
          <View style={styles.tabContent}>
            <View style={styles.controlGroup}>
              <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>
                {activePhotoIndex === 0
                  ? 'Transition In (First Photo)'
                  : `Transition: Photo ${activePhotoIndex} → Photo ${activePhotoIndex + 1}`}
              </Text>
              <Text style={[styles.helpText, { color: colors.textSecondary, marginBottom: SPACING.sm }]}>
                {currentTransition
                  ? `Current: ${TRANSITIONS[currentTransition.type]?.name || 'Unknown'}`
                  : 'No transition selected - tap to add one'}
              </Text>
              <TransitionPicker
                selectedTransition={currentTransition?.type || null}
                onSelect={handleTransitionChange}
                isPremium={purchaseState.isPremium}
              />
              {currentTransition && (
                <TouchableOpacity
                  style={[styles.removeButton, { backgroundColor: colors.error + '20', borderColor: colors.error }]}
                  onPress={handleTransitionRemove}
                >
                  <Text style={[styles.removeButtonText, { color: colors.error }]}>Remove Transition</Text>
                </TouchableOpacity>
              )}
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
          <View style={styles.headerCenter}>
            <View style={styles.undoRedoContainer}>
              <TouchableOpacity
                style={[styles.undoRedoButton, !canUndo() && styles.undoRedoDisabled]}
                onPress={handleUndo}
                disabled={!canUndo()}
              >
                <Text style={[styles.undoRedoText, { color: canUndo() ? colors.text : colors.textSecondary }]}>↶</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.undoRedoButton, !canRedo() && styles.undoRedoDisabled]}
                onPress={handleRedo}
                disabled={!canRedo()}
              >
                <Text style={[styles.undoRedoText, { color: canRedo() ? colors.text : colors.textSecondary }]}>↷</Text>
              </TouchableOpacity>
            </View>
            <SaveIndicator status={saveStatus} lastSaved={lastSaved} />
          </View>
          <IconButton
            icon={<Text style={[styles.backIcon, { color: colors.text }]}>♫</Text>}
            onPress={() => {}}
            variant="default"
            size={44}
          />
        </View>

        {/* Top Half: Preview & Timeline */}
        <View style={styles.topHalf}>
          <View style={styles.previewContainer}>
            {activePhoto ? (
              <PhotoPreview
                photo={activePhoto}
                width={PREVIEW_WIDTH}
                height={PREVIEW_HEIGHT}
              />
            ) : (
              <View style={[styles.previewPlaceholder, { backgroundColor: colors.surface }]} />
            )}
          </View>

          <View style={styles.timelineContainer}>
            <PhotoTimeline
              photos={currentProject?.photos || []}
              transitions={currentProject?.transitions || []}
              activeIndex={activePhotoIndex}
              onSelectPhoto={handleSelectPhoto}
              onDragEnd={handleDragEnd}
              onSelectTransition={(index) => {
                setActivePhotoIndex(index);
                setActiveTab('transitions');
              }}
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

          {/* Footer Button */}
          <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
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
  selectedTransition: TransitionType | null;
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

// Photo Timeline Item Component - Separated to properly handle hooks
interface PhotoTimelineItemProps {
  photo: any;
  index: number;
  isActive: boolean;
  isDragged: boolean;
  draggedIndex: number | null;
  positions: SharedValue<number[]>;
  onSelectPhoto: (index: number) => void;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
  setDraggedIndex: (index: number | null) => void;
  setCurrentTargetIndex: (index: number | null) => void;
  photosLength: number;
}

const PhotoTimelineItem: React.FC<PhotoTimelineItemProps> = ({
  photo,
  index,
  isActive,
  isDragged,
  draggedIndex,
  positions,
  onSelectPhoto,
  onDragEnd,
  setDraggedIndex,
  setCurrentTargetIndex,
  photosLength
}) => {
  const { colors } = useThemeStore();
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const itemWidth = THUMBNAIL_SIZE + SPACING.sm * 2;

  const getOrder = (idx: number) => {
    'worklet';
    return positions.value.indexOf(idx);
  };

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
        const newTargetIndex = Math.max(0, Math.min(photosLength - 1, index + movedItems));

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
        const targetIndex = Math.max(0, Math.min(photosLength - 1, index + movedItems));

        if (targetIndex !== index) {
          runOnJS(onDragEnd)(index, targetIndex);
          runOnJS(haptics.success)();
        }

        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        runOnJS(setDraggedIndex)(null);
        runOnJS(setCurrentTargetIndex)(null);

        // Reset positions after actual reorder
        positions.value = Array.from({length: photosLength}, (_, i) => i);
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

// Photo Timeline Component
interface PhotoTimelineProps {
  photos: any[];
  transitions: any[];
  activeIndex: number;
  onSelectPhoto: (index: number) => void;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
  onSelectTransition?: (index: number) => void;
}

const PhotoTimeline: React.FC<PhotoTimelineProps> = ({ photos, transitions, activeIndex, onSelectPhoto, onDragEnd, onSelectTransition }) => {
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

  // Render transition item
  const renderTransition = (transition: any, index: number) => {
    return (
      <TouchableOpacity
        key={`transition-${transition.id}`}
        style={styles.transitionTimelineItem}
        onPress={() => onSelectTransition?.(index)}
      >
        <View style={[styles.transitionIcon, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
          <Text style={[styles.transitionTimelineText, { color: colors.primary }]}>
            {TRANSITIONS[transition.type as TransitionType]?.name?.charAt(0) || 'T'}
          </Text>
        </View>
      </TouchableOpacity>
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
      {photos.map((photo, index) => {
        const transition = transitions?.find(t => t.order === index);
        return (
          <React.Fragment key={`timeline-item-${photo.id}`}>
            {transition && renderTransition(transition, index)}
            <PhotoTimelineItem
              photo={photo}
              index={index}
              isActive={index === activeIndex}
              isDragged={index === draggedIndex}
              draggedIndex={draggedIndex}
              positions={positions}
              onSelectPhoto={onSelectPhoto}
              onDragEnd={onDragEnd}
              setDraggedIndex={setDraggedIndex}
              setCurrentTargetIndex={setCurrentTargetIndex}
              photosLength={photos.length}
            />
          </React.Fragment>
        );
      })}
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  undoRedoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  undoRedoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  undoRedoDisabled: {
    opacity: 0.3,
  },
  undoRedoText: {
    fontSize: 24,
    fontWeight: '400',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
  },
  topHalf: {
    flex: 1,
    paddingBottom: SPACING.xs,
  },
  bottomHalf: {
    flex: 1,
    borderTopLeftRadius: RADII.lg,
    borderTopRightRadius: RADII.lg,
    overflow: 'hidden',
  },
  previewContainer: {
    flex: 1,
    margin: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: RADII.sm,
    overflow: 'hidden',
    backgroundColor: '#000',
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
    paddingBottom: SPACING.xs,
  },
  scrollContent: {
    flex: 1,
  },
  controlGroup: {
    marginBottom: SPACING.sm,
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
  removeButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  removeButtonText: {
    ...TYPOGRAPHY.body2,
    fontWeight: '600',
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
  transitionTimelineItem: {
    width: 40,
    height: THUMBNAIL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.xs / 2,
  },
  transitionTimelineText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
  },
  button: {
    height: 50,
    borderRadius: RADII.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
  },
  primaryButton: {
    flex: 1,
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
