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
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  Canvas,
  Image as SkiaImage,
  useImage,
} from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { RootStackParamList } from '../navigation/navigationTypes';
import useProjectStore from '../store/projectStore';
import { useThemeStore } from '../store/themeStore';
import { IconButton } from '../components/common';
import { TransitionVfxCanvas } from '../components/preview/TransitionVfxCanvas';
import { haptics } from '../utils/hapticFeedback';
import { isTransitionVfx } from '../utils/transitionVfx';
import { getContainedImageRect } from '../utils/previewImageGeometry';
import { PREVIEW_IMAGE_SAMPLING } from '../utils/previewImageSampling';
import {
  resolvePreviewPlaybackFrame,
  shouldCommitPlaybackBoundary,
  type PreviewPlaybackFrame,
} from '../utils/previewPlayback';
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
const VFX_HANDOFF_FRAME_COUNT = 2;
const EMPTY_LOADED_IMAGES = new Map<string, SkImage>();

type ImageLoadedHandler = (uri: string, image: SkImage) => void;

interface VfxRenderFrame {
  outgoingImage: SkImage;
  incomingImage: SkImage;
  outgoingPhoto: any;
  incomingPhoto: any;
  transition: TransitionType;
  isEntrance: boolean;
}

// The loaded SkImages are shared by every surface, so a handoff never decodes
// the same photo again or waits for a second asynchronous hook.
const ImagePreloader: React.FC<{
  photos: any[];
  onImageLoaded: ImageLoadedHandler;
}> = React.memo(({ photos, onImageLoaded }) => (
  <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
    {photos.map((photo, index) => (
      <PreloadedImage
        key={`preload-${photo.id || index}`}
        uri={photo.uri}
        onImageLoaded={onImageLoaded}
      />
    ))}
  </View>
));

const PreloadedImage: React.FC<{
  uri: string;
  onImageLoaded: ImageLoadedHandler;
}> = React.memo(({ uri, onImageLoaded }) => {
  const image = useImage(uri);

  useEffect(() => {
    if (image) {
      onImageLoaded(uri, image);
    }
  }, [image, onImageLoaded, uri]);

  return null;
});

const PreviewScreen: React.FC = () => {
  const navigation = useNavigation<PreviewScreenNavigationProp>();
  const route = useRoute<PreviewScreenRouteProp>();
  const { projectId } = route.params;
  const { t } = useTranslation();

  const { colors } = useThemeStore();
  const { getProjectById } = useProjectStore();
  const project = getProjectById(projectId);
  const photos = project?.photos ?? [];
  const totalPhotos = photos.length;

  const [isPlaying, setIsPlaying] = useState(true); // Start with autoplay
  const [playbackPositionMs, setPlaybackPositionMs] = useState(0);
  const [imageCache, setImageCache] = useState<{
    projectId: string;
    images: Map<string, SkImage>;
  }>(() => ({ projectId, images: new Map() }));

  const progressAnim = useRef(new RNAnimated.Value(0)).current;
  const transitionAnim = useRef(new RNAnimated.Value(0)).current;
  const vfxProgress = useSharedValue(0);
  const rafRef = useRef<number | null>(null);
  const pausedAtRef = useRef(0);
  const playbackStartRef = useRef(Date.now());
  const playbackPositionRef = useRef(0);
  const playbackBoundaryFrameRef = useRef<PreviewPlaybackFrame | null>(null);
  const currentProjectIdRef = useRef(projectId);
  currentProjectIdRef.current = projectId;

  const loadedImagesByUri =
    imageCache.projectId === projectId
      ? imageCache.images
      : EMPTY_LOADED_IMAGES;
  const handleImageLoaded = useCallback<ImageLoadedHandler>(
    (uri, image) => {
      if (currentProjectIdRef.current !== projectId) {
        return;
      }

      setImageCache(previousCache => {
        const previousImages =
          previousCache.projectId === projectId
            ? previousCache.images
            : EMPTY_LOADED_IMAGES;

        if (previousImages.get(uri) === image) {
          return previousCache;
        }

        const nextImages = new Map(previousImages);
        nextImages.set(uri, image);
        return { projectId, images: nextImages };
      });
    },
    [projectId],
  );

  const timeline = useMemo<TimelineDescription>(
    () => (project ? buildTimeline(project) : EMPTY_TIMELINE),
    [project],
  );

  const totalDurationMs = timeline.totalDurationMs;

  const updatePlaybackAnimations = useCallback(
    (positionMs: number) => {
      const frame = resolvePreviewPlaybackFrame(timeline, positionMs);
      playbackPositionRef.current = frame.positionMs;
      progressAnim.setValue(
        totalDurationMs > 0 ? frame.positionMs / totalDurationMs : 0,
      );

      // A completed value is intentional outside transitions: it lets a
      // retained VFX frame stay on the incoming image during the handoff.
      const visualProgress = frame.activeTransitionSegment
        ? frame.transitionProgress
        : 1;
      transitionAnim.setValue(visualProgress);
      vfxProgress.value = visualProgress;
      return frame;
    },
    [progressAnim, timeline, totalDurationMs, transitionAnim, vfxProgress],
  );

  useEffect(() => {
    pausedAtRef.current = 0;
    playbackPositionRef.current = 0;
    setPlaybackPositionMs(0);
    const firstFrame = updatePlaybackAnimations(0);
    playbackBoundaryFrameRef.current = firstFrame;
  }, [projectId, totalDurationMs, updatePlaybackAnimations]);

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
      const nextFrame = updatePlaybackAnimations(nextPosition);
      const previousFrame = playbackBoundaryFrameRef.current;

      if (
        !previousFrame ||
        shouldCommitPlaybackBoundary(previousFrame, nextFrame)
      ) {
        playbackBoundaryFrameRef.current = nextFrame;
        setPlaybackPositionMs(nextFrame.positionMs);
      }
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
  }, [isPlaying, project, totalDurationMs, updatePlaybackAnimations]);

  const playbackFrame = useMemo(
    () => resolvePreviewPlaybackFrame(timeline, playbackPositionMs),
    [timeline, playbackPositionMs],
  );
  const activeTransitionSegment = playbackFrame.activeTransitionSegment;
  const activePhotoSegment = playbackFrame.activePhotoSegment;

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

      const frame = updatePlaybackAnimations(clamped);
      playbackBoundaryFrameRef.current = frame;
      setPlaybackPositionMs(frame.positionMs);
      pausedAtRef.current = frame.positionMs;
      playbackStartRef.current = Date.now() - frame.positionMs;
    },
    [
      timeline.photoSegments,
      transitionsIntoPhoto,
      totalDurationMs,
      updatePlaybackAnimations,
    ],
  );

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
    setIsPlaying(prev => {
      if (prev) {
        pausedAtRef.current = playbackPositionRef.current;
      } else {
        playbackStartRef.current = Date.now() - pausedAtRef.current;
      }
      return !prev;
    });
  };

  const handleNext = () => {
    haptics.medium();
    if (timeline.photoSegments.length === 0) return;
    const playbackPosition = playbackPositionRef.current;

    // Find the next photo segment
    let currentSegmentIndex = timeline.photoSegments.findIndex(
      segment =>
        playbackPosition >= segment.startMs && playbackPosition < segment.endMs,
    );

    // If we're not in any segment (e.g., in a transition), find the last passed segment
    if (currentSegmentIndex === -1) {
      currentSegmentIndex = timeline.photoSegments.findIndex(
        segment => segment.startMs > playbackPosition,
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
    if (timeline.photoSegments.length === 0) return;
    const playbackPosition = playbackPositionRef.current;

    // Find the current photo segment
    let currentSegmentIndex = timeline.photoSegments.findIndex(
      segment =>
        playbackPosition >= segment.startMs && playbackPosition < segment.endMs,
    );

    // If we're not in any segment (e.g., in a transition), find the last passed segment
    if (currentSegmentIndex === -1) {
      currentSegmentIndex = timeline.photoSegments.findIndex(
        segment => segment.startMs > playbackPosition,
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
    pausedAtRef.current = playbackPositionRef.current;
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
            {t('preview.noProjectFound')}
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
  const isVfxActive = isTransitioning && isTransitionVfx(currentTransitionType);
  const outgoingPhoto = photos[resolvedOutgoingIndex];
  const incomingPhoto = photos[resolvedIncomingIndex];
  const outgoingImage = loadedImagesByUri.get(outgoingPhoto.uri) ?? null;
  const incomingImage = loadedImagesByUri.get(incomingPhoto.uri) ?? null;
  const activeVfxFrame: VfxRenderFrame | null =
    isVfxActive && currentTransitionType && outgoingImage && incomingImage
      ? {
          outgoingImage,
          incomingImage,
          outgoingPhoto,
          incomingPhoto,
          transition: currentTransitionType,
          isEntrance: isEntranceTransition,
        }
      : null;
  const displayIndex = resolvedOutgoingIndex;
  const shouldShowOverlay =
    isTransitioning &&
    !isEntranceTransition &&
    resolvedIncomingIndex !== resolvedOutgoingIndex;
  const layerStyles = isVfxActive
    ? {
        current: { opacity: 1 },
        next: { opacity: 0, pointerEvents: 'none' as const },
      }
    : getLayerStyles(isEntranceTransition, shouldShowOverlay);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Calculate transition styles for current and next layers
  function getLayerStyles(isEntrance: boolean, hasOverlay: boolean) {
    const hiddenNext = { opacity: 0, pointerEvents: 'none' as const };
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
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
      {/* Preload all images to prevent flickering */}
      <ImagePreloader photos={photos} onImageLoaded={handleImageLoaded} />

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
        <View style={styles.previewViewport} collapsable={false}>
          {/* Base layer - current photo */}
          <RNAnimated.View
            style={[styles.photoLayer, layerStyles.current]}
            needsOffscreenAlphaCompositing
            removeClippedSubviews={false}
            collapsable={false}
          >
            <PhotoCanvas
              photo={outgoingPhoto}
              image={outgoingImage}
              width={PREVIEW_WIDTH}
              height={PREVIEW_HEIGHT}
            />
          </RNAnimated.View>

          {/* Overlay layer - next photo during transitions */}
          <RNAnimated.View
            pointerEvents="none"
            style={[styles.photoLayer, layerStyles.next]}
            needsOffscreenAlphaCompositing
            removeClippedSubviews={false}
            collapsable={false}
          >
            <PhotoCanvas
              photo={incomingPhoto}
              image={incomingImage}
              width={PREVIEW_WIDTH}
              height={PREVIEW_HEIGHT}
            />
          </RNAnimated.View>

          <VfxHandoffLayer
            frame={activeVfxFrame}
            progress={vfxProgress}
            captionProgress={transitionAnim}
            width={PREVIEW_WIDTH}
            height={PREVIEW_HEIGHT}
          />
          {/* Watermark removed - app is completely free */}
        </View>
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
          <Text style={styles.exportButtonText}>{t('preview.export')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Photo Canvas Component - Memoized to prevent unnecessary re-renders
interface PhotoCanvasProps {
  photo: any;
  image: SkImage | null;
  width: number;
  height: number;
}

interface PhotoCaptionOverlayProps {
  photo: any;
  width: number;
  height: number;
}

const PhotoCaptionOverlay: React.FC<PhotoCaptionOverlayProps> = ({
  photo,
  width,
  height,
}) => {
  if (!photo.caption?.text) return null;

  const { text, style } = photo.caption;
  const maxTextWidth = (width * style.maxWidth) / 100;

  let textAlign: 'left' | 'center' | 'right' = 'center';
  if (style.textAlign === 'left') textAlign = 'left';
  if (style.textAlign === 'right') textAlign = 'right';

  return (
    <View
      style={{
        position: 'absolute',
        top:
          style.position === 'top'
            ? style.padding
            : style.position === 'center'
            ? 0
            : undefined,
        bottom:
          style.position === 'bottom'
            ? style.padding
            : style.position === 'center'
            ? 0
            : undefined,
        left: style.textAlign === 'left' ? style.padding : 0,
        right: style.textAlign === 'right' ? style.padding : 0,
        width: style.textAlign === 'center' ? '100%' : maxTextWidth,
        alignItems:
          style.textAlign === 'left'
            ? 'flex-start'
            : style.textAlign === 'right'
            ? 'flex-end'
            : 'center',
        justifyContent: style.position === 'center' ? 'center' : 'flex-start',
        transform: [
          { translateX: ((style.offsetX ?? 0) / 100) * width },
          { translateY: ((style.offsetY ?? 0) / 100) * height },
        ],
      }}
    >
      <View
        style={{
          backgroundColor: style.backgroundColor,
          paddingHorizontal: style.padding,
          paddingVertical: style.padding / 2,
          borderRadius: 4,
          maxWidth: maxTextWidth,
        }}
      >
        <Text
          style={{
            color: style.fontColor,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            textAlign,
          }}
        >
          {text}
        </Text>
      </View>
    </View>
  );
};

interface VfxHandoffLayerProps {
  frame: VfxRenderFrame | null;
  progress: SharedValue<number>;
  captionProgress: RNAnimated.Value;
  width: number;
  height: number;
}

const VfxHandoffLayer: React.FC<VfxHandoffLayerProps> = React.memo(
  ({ frame, progress, captionProgress, width, height }) => {
    const retainedFrameRef = useRef<VfxRenderFrame | null>(null);
    const [, setReleaseVersion] = useState(0);

    if (frame) {
      retainedFrameRef.current = frame;
    }

    const displayedFrame = frame ?? retainedFrameRef.current;
    const outgoingCaptionOpacity = useMemo(
      () =>
        captionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0],
        }),
      [captionProgress],
    );

    useEffect(() => {
      if (frame || !retainedFrameRef.current) {
        return;
      }

      let animationFrameId: number | null = null;
      let remainingFrames = VFX_HANDOFF_FRAME_COUNT;

      const releaseFrame = () => {
        remainingFrames -= 1;
        if (remainingFrames > 0) {
          animationFrameId = requestAnimationFrame(releaseFrame);
          return;
        }

        retainedFrameRef.current = null;
        setReleaseVersion(version => version + 1);
      };

      animationFrameId = requestAnimationFrame(releaseFrame);
      return () => {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }, [frame]);

    if (!displayedFrame) {
      return null;
    }

    return (
      <View
        pointerEvents="none"
        style={styles.photoLayer}
        collapsable={false}
      >
        <TransitionVfxCanvas
          outgoingImage={displayedFrame.outgoingImage}
          incomingImage={displayedFrame.incomingImage}
          transition={displayedFrame.transition}
          progress={progress}
          width={width}
          height={height}
          isEntrance={displayedFrame.isEntrance}
        />

        {!displayedFrame.isEntrance && (
          <RNAnimated.View
            pointerEvents="none"
            style={[
              styles.vfxCaptionLayer,
              { opacity: outgoingCaptionOpacity },
            ]}
          >
            <PhotoCaptionOverlay
              photo={displayedFrame.outgoingPhoto}
              width={width}
              height={height}
            />
          </RNAnimated.View>
        )}
        <RNAnimated.View
          pointerEvents="none"
          style={[styles.vfxCaptionLayer, { opacity: captionProgress }]}
        >
          <PhotoCaptionOverlay
            photo={displayedFrame.incomingPhoto}
            width={width}
            height={height}
          />
        </RNAnimated.View>
      </View>
    );
  },
);

const PhotoCanvas: React.FC<PhotoCanvasProps> = React.memo(
  ({ photo, image, width, height }) => {
    const retainedFrameRef = useRef<{ image: SkImage; photo: any } | null>(
      null,
    );

    if (image) {
      retainedFrameRef.current = { image, photo };
    }

    const displayedFrame = image ? { image, photo } : retainedFrameRef.current;

    if (!displayedFrame) {
      return <View style={{ width, height, backgroundColor: '#000' }} />;
    }

    const intrinsicWidth = displayedFrame.image.width();
    const intrinsicHeight = displayedFrame.image.height();
    const sourceWidth =
      intrinsicWidth && intrinsicHeight
        ? intrinsicWidth
        : displayedFrame.photo.width;
    const sourceHeight =
      intrinsicWidth && intrinsicHeight
        ? intrinsicHeight
        : displayedFrame.photo.height;
    const imageRect = getContainedImageRect(
      sourceWidth,
      sourceHeight,
      width,
      height,
    );

    return (
      <View style={{ width, height }}>
        <Canvas style={{ width, height, backgroundColor: '#000' }}>
          <SkiaImage
            image={displayedFrame.image}
            x={imageRect.x}
            y={imageRect.y}
            width={imageRect.width}
            height={imageRect.height}
            fit="fill"
            sampling={PREVIEW_IMAGE_SAMPLING}
          />
        </Canvas>
        <PhotoCaptionOverlay
          photo={displayedFrame.photo}
          width={width}
          height={height}
        />
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Re-render if photo URI or caption changes
    return (
      prevProps.image === nextProps.image &&
      prevProps.photo.uri === nextProps.photo.uri &&
      prevProps.width === nextProps.width &&
      prevProps.height === nextProps.height &&
      prevProps.photo.caption?.text === nextProps.photo.caption?.text &&
      JSON.stringify(prevProps.photo.caption?.style) ===
        JSON.stringify(nextProps.photo.caption?.style)
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
  previewViewport: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
  },
  photoLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  vfxCaptionLayer: {
    ...StyleSheet.absoluteFillObject,
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
