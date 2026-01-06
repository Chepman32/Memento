import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated as RNAnimated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  Canvas,
  Image as SkiaImage,
  useImage,
} from '@shopify/react-native-skia';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { RootStackParamList } from '../navigation/navigationTypes';
import useProjectStore from '../store/projectStore';
import { useThemeStore } from '../store/themeStore';
import { IconButton } from '../components/common';
import { haptics } from '../utils/hapticFeedback';
import { sounds } from '../utils/soundEffects';
import {
  SPACING,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  SHADOWS,
} from '../constants/theme';
import {
  buildTimeline,
  TimelineDescription,
  TransitionSegment,
  PhotoSegment,
} from '../utils/videoEncoder';
import { TransitionType } from '../types/project.types';

type PreviewScreenRouteProp = RouteProp<RootStackParamList, 'Preview'>;
type PreviewScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Preview'
>;

const PREVIEW_WIDTH = SCREEN_WIDTH;
const PREVIEW_HEIGHT = SCREEN_HEIGHT - 120; // Maximize height, only leave room for controls
const EMPTY_TIMELINE: TimelineDescription = {
  photoSegments: [],
  transitionSegments: [],
  segments: [],
  totalDurationMs: 0,
};
const CONTROL_ICON_COLOR = '#FFFFFF';

// Preload images component - renders hidden to cache images
const ImagePreloader: React.FC<{ photos: any[] }> = React.memo(({ photos }) => {
  return (
    <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
      {photos.map((photo, index) => (
        <PreloadedImage key={`preload-${photo.id || index}`} uri={photo.uri} />
      ))}
    </View>
  );
});

const PreloadedImage: React.FC<{ uri: string }> = React.memo(({ uri }) => {
  useImage(uri); // This caches the image
  return null;
});

const PreviewScreen: React.FC = () => {
  const navigation = useNavigation<PreviewScreenNavigationProp>();
  const route = useRoute<PreviewScreenRouteProp>();
  const { projectId } = route.params;

  const { colors } = useThemeStore();
  const { getProjectById } = useProjectStore();
  const project = getProjectById(projectId);
  const photos = project?.photos ?? [];
  const totalPhotos = photos.length;

  const [isPlaying, setIsPlaying] = useState(true); // Start with autoplay
  const [playbackPositionMs, setPlaybackPositionMs] = useState(0);

  const progressAnim = useRef(new RNAnimated.Value(0)).current;
  const transitionAnim = useRef(new RNAnimated.Value(0)).current;
  const rafRef = useRef<number | null>(null);
  const pausedAtRef = useRef(0);
  const playbackStartRef = useRef(Date.now());

  const timeline = useMemo<TimelineDescription>(
    () => (project ? buildTimeline(project) : EMPTY_TIMELINE),
    [project],
  );

  const totalDurationMs = timeline.totalDurationMs;

  useEffect(() => {
    pausedAtRef.current = 0;
    setPlaybackPositionMs(0);
    progressAnim.setValue(0);
    transitionAnim.setValue(0);
  }, [projectId, totalDurationMs, progressAnim, transitionAnim]);

  useEffect(() => {
    if (!project || totalDurationMs <= 0) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!isPlaying) {
      return;
    }

    const runFrame = () => {
      const elapsed = Date.now() - playbackStartRef.current;
      const nextPosition = totalDurationMs ? elapsed % totalDurationMs : 0;
      setPlaybackPositionMs(nextPosition);
      rafRef.current = requestAnimationFrame(runFrame);
    };

    playbackStartRef.current = Date.now() - pausedAtRef.current;
    rafRef.current = requestAnimationFrame(runFrame);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, project, totalDurationMs]);

  const activeTransitionSegment = useMemo<TransitionSegment | null>(() => {
    if (!timeline.transitionSegments.length) {
      return null;
    }

    return (
      timeline.transitionSegments.find(
        segment =>
          playbackPositionMs >= segment.startMs &&
          playbackPositionMs < segment.endMs,
      ) ?? null
    );
  }, [timeline.transitionSegments, playbackPositionMs]);

  const activePhotoSegment = useMemo<PhotoSegment | null>(() => {
    if (!timeline.photoSegments.length) {
      return null;
    }

    let candidate: PhotoSegment | null = timeline.photoSegments[0];

    for (let index = 0; index < timeline.photoSegments.length; index += 1) {
      const segment = timeline.photoSegments[index];
      if (segment.startMs <= playbackPositionMs) {
        candidate = segment;
      } else {
        break;
      }
    }

    return candidate;
  }, [timeline.photoSegments, playbackPositionMs]);

  const isTransitioning = Boolean(activeTransitionSegment);

  const transitionsIntoPhoto = useMemo(() => {
    const map = new Map<
      number,
      {
        entrance?: TransitionSegment;
        regular?: TransitionSegment;
      }
    >();

    timeline.transitionSegments.forEach(segment => {
      if (segment.toIndex === undefined || segment.toIndex < 0) {
        return;
      }

      const existing = map.get(segment.toIndex) ?? {};

      if (segment.isEntrance) {
        if (!existing.entrance || segment.endMs > existing.entrance.endMs) {
          existing.entrance = segment;
        }
      } else if (!existing.regular || segment.endMs > existing.regular.endMs) {
        existing.regular = segment;
      }

      map.set(segment.toIndex, existing);
    });

    return map;
  }, [timeline.transitionSegments]);

  const seekToPhoto = useCallback(
    (targetIndex: number) => {
      const targetSegment = timeline.photoSegments[targetIndex];
      if (!targetSegment) {
        return;
      }

      const transitionInfo = transitionsIntoPhoto.get(targetIndex);
      let newPosition = targetSegment.startMs;

      if (transitionInfo?.entrance) {
        newPosition = Math.max(newPosition, transitionInfo.entrance.endMs);
      }
      if (transitionInfo?.regular) {
        newPosition = Math.max(newPosition, transitionInfo.regular.endMs);
      }

      if (newPosition >= targetSegment.endMs) {
        newPosition = Math.max(targetSegment.startMs, targetSegment.endMs - 1);
      }

      const clamped = Math.max(
        0,
        Math.min(newPosition, Math.max(totalDurationMs - 1, 0)),
      );

      setPlaybackPositionMs(clamped);
      pausedAtRef.current = clamped;
      playbackStartRef.current = Date.now() - clamped;
    },
    [timeline.photoSegments, transitionsIntoPhoto, totalDurationMs],
  );

  useEffect(() => {
    if (!totalDurationMs) {
      progressAnim.setValue(0);
      return;
    }

    const normalized = Math.min(
      Math.max(playbackPositionMs / totalDurationMs, 0),
      1,
    );
    progressAnim.setValue(normalized);
  }, [playbackPositionMs, totalDurationMs, progressAnim]);

  useEffect(() => {
    if (!activeTransitionSegment) {
      transitionAnim.setValue(0);
      return;
    }

    const { startMs, durationMs } = activeTransitionSegment;
    const progress =
      durationMs > 0 ? (playbackPositionMs - startMs) / durationMs : 0;
    transitionAnim.setValue(Math.min(Math.max(progress, 0), 1));
  }, [activeTransitionSegment, playbackPositionMs, transitionAnim]);

  const outgoingIndex = isTransitioning
    ? activeTransitionSegment?.fromIndex ?? activePhotoSegment?.index ?? 0
    : activePhotoSegment?.index ?? 0;
  const incomingIndex = isTransitioning
    ? activeTransitionSegment?.toIndex ?? outgoingIndex
    : totalPhotos > 0
    ? (outgoingIndex + 1) % totalPhotos
    : 0;

  const handlePlayPause = () => {
    haptics.medium();
    sounds.tap();
    setIsPlaying(prev => {
      if (prev) {
        pausedAtRef.current = playbackPositionMs;
      } else {
        playbackStartRef.current = Date.now() - pausedAtRef.current;
      }
      return !prev;
    });
  };

  const handleNext = () => {
    haptics.medium();
    sounds.tap();
    if (timeline.photoSegments.length === 0) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Pause playback when navigating
    if (isPlaying) {
      setIsPlaying(false);
    }

    // Find the next photo segment
    let currentSegmentIndex = timeline.photoSegments.findIndex(
      segment =>
        playbackPositionMs >= segment.startMs &&
        playbackPositionMs < segment.endMs,
    );

    // If we're not in any segment (e.g., in a transition), find the last passed segment
    if (currentSegmentIndex === -1) {
      currentSegmentIndex = timeline.photoSegments.findIndex(
        segment => segment.startMs > playbackPositionMs,
      );
      if (currentSegmentIndex === -1) {
        currentSegmentIndex = timeline.photoSegments.length - 1;
      } else {
        currentSegmentIndex = Math.max(0, currentSegmentIndex - 1);
      }
    }

    const nextSegmentIndex =
      (currentSegmentIndex + 1) % timeline.photoSegments.length;
    seekToPhoto(nextSegmentIndex);
  };

  const handlePrev = () => {
    haptics.medium();
    sounds.tap();
    if (timeline.photoSegments.length === 0) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Pause playback when navigating
    if (isPlaying) {
      setIsPlaying(false);
    }

    // Find the current photo segment
    let currentSegmentIndex = timeline.photoSegments.findIndex(
      segment =>
        playbackPositionMs >= segment.startMs &&
        playbackPositionMs < segment.endMs,
    );

    // If we're not in any segment (e.g., in a transition), find the last passed segment
    if (currentSegmentIndex === -1) {
      currentSegmentIndex = timeline.photoSegments.findIndex(
        segment => segment.startMs > playbackPositionMs,
      );
      if (currentSegmentIndex === -1) {
        currentSegmentIndex = timeline.photoSegments.length - 1;
      } else {
        currentSegmentIndex = Math.max(0, currentSegmentIndex - 1);
      }
    }

    const prevSegmentIndex =
      currentSegmentIndex <= 0
        ? timeline.photoSegments.length - 1
        : currentSegmentIndex - 1;
    seekToPhoto(prevSegmentIndex);
  };

  const handleExport = () => {
    haptics.medium();
    sounds.tap();
    pausedAtRef.current = playbackPositionMs;
    setIsPlaying(false);
    navigation.navigate('Export', { projectId });
  };

  const handleClose = () => {
    haptics.light();
    navigation.goBack();
  };

  if (!project || totalPhotos === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            No project found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const resolvedOutgoingIndex = Math.max(
    0,
    Math.min(outgoingIndex, totalPhotos - 1),
  );
  const resolvedIncomingIndex =
    totalPhotos > 1
      ? (incomingIndex + totalPhotos) % totalPhotos
      : resolvedOutgoingIndex;

  const isEntranceTransition = Boolean(activeTransitionSegment?.isEntrance);
  const currentTransitionType = isTransitioning
    ? activeTransitionSegment?.transition.type ?? null
    : null;
  const displayIndex = resolvedOutgoingIndex;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Calculate transition styles for current and next layers
  const getLayerStyles = (isEntrance: boolean, hasOverlay: boolean) => {
    const hiddenNext = { opacity: 0 };
    const defaultCurrent = { opacity: 1 };

    if (!isTransitioning || !currentTransitionType) {
      return { current: defaultCurrent, next: hiddenNext };
    }

    const progress = transitionAnim;
    const fadeOut = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    });
    const fadeIn = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    let currentStyle: any = defaultCurrent;
    let nextStyle: any = hiddenNext;

    switch (currentTransitionType) {
      case TransitionType.FADE: {
        currentStyle = { opacity: fadeOut };
        nextStyle = { opacity: fadeIn };
        break;
      }
      case TransitionType.SLIDE_LEFT: {
        const currentTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -PREVIEW_WIDTH],
        });
        const nextTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [PREVIEW_WIDTH, 0],
        });
        currentStyle = { transform: [{ translateX: currentTranslate }] };
        nextStyle = { opacity: 1, transform: [{ translateX: nextTranslate }] };
        break;
      }
      case TransitionType.SLIDE_RIGHT: {
        const currentTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, PREVIEW_WIDTH],
        });
        const nextTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-PREVIEW_WIDTH, 0],
        });
        currentStyle = { transform: [{ translateX: currentTranslate }] };
        nextStyle = { opacity: 1, transform: [{ translateX: nextTranslate }] };
        break;
      }
      case TransitionType.SLIDE_UP: {
        const currentTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -PREVIEW_HEIGHT],
        });
        const nextTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [PREVIEW_HEIGHT, 0],
        });
        currentStyle = { transform: [{ translateY: currentTranslate }] };
        nextStyle = { opacity: 1, transform: [{ translateY: nextTranslate }] };
        break;
      }
      case TransitionType.SLIDE_DOWN: {
        const currentTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, PREVIEW_HEIGHT],
        });
        const nextTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-PREVIEW_HEIGHT, 0],
        });
        currentStyle = { transform: [{ translateY: currentTranslate }] };
        nextStyle = { opacity: 1, transform: [{ translateY: nextTranslate }] };
        break;
      }
      case TransitionType.ZOOM: {
        const currentScale = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.2],
        });
        const nextScale = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1],
        });
        currentStyle = {
          opacity: fadeOut,
          transform: [{ scale: currentScale }],
        };
        nextStyle = { opacity: fadeIn, transform: [{ scale: nextScale }] };
        break;
      }
      case TransitionType.ROTATE: {
        const currentRotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '90deg'],
        });
        const nextRotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['-90deg', '0deg'],
        });
        currentStyle = {
          opacity: fadeOut,
          transform: [{ perspective: 900 }, { rotateY: currentRotate }],
        };
        nextStyle = {
          opacity: fadeIn,
          transform: [{ perspective: 900 }, { rotateY: nextRotate }],
        };
        break;
      }
      case TransitionType.CUBE: {
        const currentRotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '90deg'],
        });
        const nextRotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['-90deg', '0deg'],
        });
        const currentTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -PREVIEW_WIDTH / 2],
        });
        const nextTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [PREVIEW_WIDTH / 2, 0],
        });
        currentStyle = {
          opacity: fadeOut,
          transform: [
            { perspective: 900 },
            { translateX: currentTranslate },
            { rotateY: currentRotate },
          ],
        };
        nextStyle = {
          opacity: fadeIn,
          transform: [
            { perspective: 900 },
            { translateX: nextTranslate },
            { rotateY: nextRotate },
          ],
        };
        break;
      }
      case TransitionType.FLIP: {
        const currentRotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        });
        const nextRotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['-180deg', '0deg'],
        });
        currentStyle = {
          opacity: fadeOut,
          transform: [{ perspective: 900 }, { rotateX: currentRotate }],
        };
        nextStyle = {
          opacity: fadeIn,
          transform: [{ perspective: 900 }, { rotateX: nextRotate }],
        };
        break;
      }
      case TransitionType.DISSOLVE: {
        currentStyle = {
          opacity: fadeOut,
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.9],
              }),
            },
          ],
        };
        nextStyle = {
          opacity: fadeIn,
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1.1, 1],
              }),
            },
          ],
        };
        break;
      }
      case TransitionType.BLUR: {
        currentStyle = {
          opacity: fadeOut,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -40],
              }),
            },
          ],
        };
        nextStyle = {
          opacity: fadeIn,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [40, 0],
              }),
            },
          ],
        };
        break;
      }
      case TransitionType.WIPE_CIRCLE: {
        currentStyle = {
          opacity: fadeOut,
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.2],
              }),
            },
          ],
        };
        nextStyle = {
          opacity: fadeIn,
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        };
        break;
      }
      case TransitionType.PUSH: {
        const currentTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -PREVIEW_WIDTH],
        });
        const nextTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [PREVIEW_WIDTH, 0],
        });
        currentStyle = { transform: [{ translateX: currentTranslate }] };
        nextStyle = { opacity: 1, transform: [{ translateX: nextTranslate }] };
        break;
      }
      default: {
        currentStyle = { opacity: fadeOut };
        nextStyle = { opacity: fadeIn };
        break;
      }
    }

    if (isEntrance) {
      const incomingStyle = nextStyle || defaultCurrent;
      return {
        current: incomingStyle,
        next: hiddenNext,
      };
    }

    if (!hasOverlay) {
      return {
        current: currentStyle,
        next: hiddenNext,
      };
    }

    return {
      current: currentStyle,
      next: nextStyle,
    };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
      {/* Preload all images to prevent flickering */}
      <ImagePreloader photos={photos} />

      {/* Close button */}
      <View style={styles.topBar}>
        <IconButton
          icon={<Text style={styles.closeIcon}>×</Text>}
          onPress={handleClose}
          size={44}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        />
      </View>

      {/* Preview canvas */}
      <View style={styles.previewContainer}>
        {/* Base layer - current photo */}
        <RNAnimated.View
          key="base-layer"
          style={[
            styles.photoLayer,
            getLayerStyles(
              isEntranceTransition,
              isTransitioning &&
                !isEntranceTransition &&
                resolvedIncomingIndex !== resolvedOutgoingIndex,
            ).current,
          ]}
        >
          <PhotoCanvas
            photo={photos[resolvedOutgoingIndex]}
            width={PREVIEW_WIDTH}
            height={PREVIEW_HEIGHT}
          />
        </RNAnimated.View>

        {/* Overlay layer - next photo during transitions */}
        {isTransitioning &&
          !isEntranceTransition &&
          resolvedIncomingIndex !== resolvedOutgoingIndex && (
            <RNAnimated.View
              key="overlay-layer"
              pointerEvents="none"
              style={[
                styles.photoLayer,
                getLayerStyles(isEntranceTransition, true).next,
              ]}
            >
              <PhotoCanvas
                photo={photos[resolvedIncomingIndex]}
                width={PREVIEW_WIDTH}
                height={PREVIEW_HEIGHT}
              />
            </RNAnimated.View>
          )}
        {/* Watermark removed - app is completely free */}
      </View>

      {/* Progress bar */}
      <View
        style={[
          styles.progressBarContainer,
          { backgroundColor: 'rgba(255,255,255,0.3)' },
        ]}
      >
        <RNAnimated.View
          style={[
            styles.progressBar,
            { width: progressWidth, backgroundColor: colors.primary },
          ]}
        />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.photoInfo}>
          <Text style={[styles.photoCounter, { color: '#FFFFFF' }]}>
            {displayIndex + 1} / {totalPhotos}
          </Text>
          <Text style={[styles.projectTitle, { color: '#FFFFFF' }]}>
            {project.title}
          </Text>
        </View>

        <View style={styles.playbackControls}>
          <TouchableOpacity
            onPress={handlePrev}
            activeOpacity={0.7}
            style={[styles.navButton, { backgroundColor: colors.primary }]}
          >
            <FeatherIcon
              name="skip-back"
              size={28}
              color={CONTROL_ICON_COLOR}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePlayPause}
            activeOpacity={0.7}
            style={[styles.playButton, { backgroundColor: colors.primary }]}
          >
            <FeatherIcon
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color={CONTROL_ICON_COLOR}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.7}
            style={[styles.navButton, { backgroundColor: colors.primary }]}
          >
            <FeatherIcon
              name="skip-forward"
              size={28}
              color={CONTROL_ICON_COLOR}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: colors.primary }]}
          onPress={handleExport}
        >
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Photo Canvas Component - Memoized to prevent unnecessary re-renders
interface PhotoCanvasProps {
  photo: any;
  width: number;
  height: number;
}

const PhotoCanvas: React.FC<PhotoCanvasProps> = React.memo(
  ({ photo, width, height }) => {
    const image = useImage(photo.uri);
    const previousImageRef = useRef<any>(null);
    const [size, setSize] = useState({ width, height });

    // Keep track of the last successfully loaded image
    useEffect(() => {
      if (image) {
        previousImageRef.current = image;
      }
    }, [image]);

    // Use current image if available, otherwise fall back to previous
    const displayImage = image || previousImageRef.current;

    useEffect(() => {
      const intrinsicWidth = displayImage?.width();
      const intrinsicHeight = displayImage?.height();

      const sourceWidth =
        intrinsicWidth && intrinsicHeight ? intrinsicWidth : photo.width;
      const sourceHeight =
        intrinsicWidth && intrinsicHeight ? intrinsicHeight : photo.height;

      if (!sourceWidth || !sourceHeight) {
        setSize({ width, height });
        return;
      }

      const aspectRatio = sourceWidth / sourceHeight;
      const containerAspect = width / height;

      if (aspectRatio > containerAspect) {
        setSize({
          width,
          height: width / aspectRatio,
        });
      } else {
        setSize({
          width: height * aspectRatio,
          height,
        });
      }
    }, [photo.uri, photo.width, photo.height, displayImage, width, height]);

    if (!displayImage) {
      return <View style={{ width, height, backgroundColor: '#000' }} />;
    }

    const x = (width - size.width) / 2;
    const y = (height - size.height) / 2;

    return (
      <Canvas style={{ width, height }}>
        <SkiaImage
          image={displayImage}
          x={x}
          y={y}
          width={size.width}
          height={size.height}
          fit="contain"
        />
      </Canvas>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if the photo URI changes
    return (
      prevProps.photo.uri === nextProps.photo.uri &&
      prevProps.width === nextProps.width &&
      prevProps.height === nextProps.height
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: SPACING.md,
    zIndex: 10,
  },
  closeIcon: {
    fontSize: 36,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoLayer: {
    position: 'absolute',
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
  },
  progressBarContainer: {
    height: 4,
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  controls: {
    padding: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  photoInfo: {
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  photoCounter: {
    fontSize: 14,
    marginBottom: 4,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  playbackControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  exportButton: {
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
  },
});

export default PreviewScreen;
