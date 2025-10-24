import React, { useState, useEffect, useRef } from 'react';
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
import { Canvas, Image, useImage } from '@shopify/react-native-skia';
import { RootStackParamList } from '../navigation/navigationTypes';
import useProjectStore from '../store/projectStore';
import { useThemeStore } from '../store/themeStore';
import { IconButton } from '../components/common';
import { haptics } from '../utils/hapticFeedback';
import { sounds } from '../utils/soundEffects';
import { SPACING, SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants/theme';
import { TRANSITIONS } from '../constants/transitions';
import { TransitionType, Transition } from '../types/project.types';

type PreviewScreenRouteProp = RouteProp<RootStackParamList, 'Preview'>;
type PreviewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Preview'>;

const PREVIEW_WIDTH = SCREEN_WIDTH;
const PREVIEW_HEIGHT = SCREEN_HEIGHT - 120; // Maximize height, only leave room for controls

const PreviewScreen: React.FC = () => {
  const navigation = useNavigation<PreviewScreenNavigationProp>();
  const route = useRoute<PreviewScreenRouteProp>();
  const { projectId } = route.params;

  const { colors } = useThemeStore();
  const { getProjectById } = useProjectStore();
  const project = getProjectById(projectId);

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true); // Start with autoplay
  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new RNAnimated.Value(0)).current;
  const transitionAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying && project) {
      playSlideshow();
    } else {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    }
  }, [isPlaying, currentPhotoIndex, project]);

  const getTransitionForIndex = (index: number): Transition | null => {
    if (!project) return null;

    const explicit = project.transitions?.find(t => t.order === index);
    if (explicit) {
      return explicit;
    }

    const fallbackType =
      project.photos[index]?.transition || project.settings?.defaultTransition;

    if (!fallbackType) {
      return null;
    }

    const config = TRANSITIONS[fallbackType];

    return {
      id: `fallback-${project.photos[index]?.id ?? index}-${fallbackType}`,
      type: fallbackType,
      duration: config?.duration ? config.duration / 1000 : 0.6,
      order: index,
    };
  };

  const getTransitionDurationMs = (transition: Transition | null): number => {
    if (!transition) {
      return 0;
    }

    if (transition.duration && transition.duration > 5) {
      // Duration already in ms
      return transition.duration;
    }

    if (transition.duration && transition.duration > 0) {
      // Treat stored duration as seconds
      return transition.duration * 1000;
    }

    const config = TRANSITIONS[transition.type];
    return config?.duration ?? 600;
  };

  const playSlideshow = () => {
    if (!project) return;

    const currentPhoto = project.photos[currentPhotoIndex];
    if (!currentPhoto) return;

    const duration = currentPhoto.duration * 1000;
    // Animate progress bar
    progressAnim.setValue(0);
    RNAnimated.timing(progressAnim, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start();

    // Move to next photo with transition
    animationRef.current = setTimeout(() => {
      const nextIndex = (currentPhotoIndex + 1) % project.photos.length;
      const transition = getTransitionForIndex(currentPhotoIndex);
      const transitionDuration = getTransitionDurationMs(transition);

      if (transition) {
        // Start transition
        setIsTransitioning(true);
        transitionAnim.setValue(0);

        RNAnimated.timing(transitionAnim, {
          toValue: 1,
          duration: transitionDuration, // Transition duration in ms
          useNativeDriver: true,
        }).start(({ finished }) => {
          setIsTransitioning(false);
          if (finished) {
            setCurrentPhotoIndex(nextIndex);
          }
        });
      } else {
        // No transition, just switch
        setCurrentPhotoIndex(nextIndex);
      }

      if (nextIndex === 0) {
        // Loop completed - continue playing
        // setIsPlaying(false); // Commented out to keep autoplay looping
      }
    }, duration);
  };

  const handlePlayPause = () => {
    haptics.medium();
    sounds.tap();
    setIsPlaying(!isPlaying);
  };

  const handleExport = () => {
    haptics.medium();
    sounds.tap();
    setIsPlaying(false);
    navigation.navigate('Export', { projectId });
  };

  const handleClose = () => {
    haptics.light();
    navigation.goBack();
  };

  if (!project || project.photos.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>No project found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentPhoto = project.photos[currentPhotoIndex];
  const nextPhotoIndex = (currentPhotoIndex + 1) % project.photos.length;
  const nextPhoto = project.photos[nextPhotoIndex];
  const currentTransition = getTransitionForIndex(currentPhotoIndex);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Calculate transition styles for current and next layers
  const getLayerStyles = () => {
    const hiddenNext = { opacity: 0 };
    const defaultCurrent = { opacity: 1 };

    if (!nextPhoto) {
      return { current: defaultCurrent, next: hiddenNext };
    }

    if (!isTransitioning || !currentTransition) {
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

    switch (currentTransition.type) {
      case TransitionType.FADE:
        return {
          current: { opacity: fadeOut },
          next: { opacity: fadeIn },
        };
      case TransitionType.SLIDE_LEFT: {
        const currentTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -PREVIEW_WIDTH],
        });
        const nextTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [PREVIEW_WIDTH, 0],
        });
        return {
          current: { transform: [{ translateX: currentTranslate }] },
          next: { opacity: 1, transform: [{ translateX: nextTranslate }] },
        };
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
        return {
          current: { transform: [{ translateX: currentTranslate }] },
          next: { opacity: 1, transform: [{ translateX: nextTranslate }] },
        };
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
        return {
          current: { transform: [{ translateY: currentTranslate }] },
          next: { opacity: 1, transform: [{ translateY: nextTranslate }] },
        };
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
        return {
          current: { transform: [{ translateY: currentTranslate }] },
          next: { opacity: 1, transform: [{ translateY: nextTranslate }] },
        };
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
        return {
          current: { opacity: fadeOut, transform: [{ scale: currentScale }] },
          next: { opacity: fadeIn, transform: [{ scale: nextScale }] },
        };
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
        return {
          current: {
            opacity: fadeOut,
            transform: [{ perspective: 900 }, { rotateY: currentRotate }],
          },
          next: {
            opacity: fadeIn,
            transform: [{ perspective: 900 }, { rotateY: nextRotate }],
          },
        };
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
        return {
          current: {
            opacity: fadeOut,
            transform: [
              { perspective: 900 },
              { translateX: currentTranslate },
              { rotateY: currentRotate },
            ],
          },
          next: {
            opacity: fadeIn,
            transform: [
              { perspective: 900 },
              { translateX: nextTranslate },
              { rotateY: nextRotate },
            ],
          },
        };
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
        return {
          current: {
            opacity: fadeOut,
            transform: [{ perspective: 900 }, { rotateX: currentRotate }],
          },
          next: {
            opacity: fadeIn,
            transform: [{ perspective: 900 }, { rotateX: nextRotate }],
          },
        };
      }
      case TransitionType.DISSOLVE:
        return {
          current: {
            opacity: fadeOut,
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.9],
                }),
              },
            ],
          },
          next: {
            opacity: fadeIn,
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.1, 1],
                }),
              },
            ],
          },
        };
      case TransitionType.BLUR:
        return {
          current: {
            opacity: fadeOut,
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -40],
                }),
              },
            ],
          },
          next: {
            opacity: fadeIn,
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              },
            ],
          },
        };
      case TransitionType.WIPE_CIRCLE:
        return {
          current: {
            opacity: fadeOut,
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.2],
                }),
              },
            ],
          },
          next: {
            opacity: fadeIn,
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        };
      case TransitionType.PUSH: {
        const currentTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -PREVIEW_WIDTH],
        });
        const nextTranslate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [PREVIEW_WIDTH, 0],
        });
        return {
          current: { transform: [{ translateX: currentTranslate }] },
          next: { opacity: 1, transform: [{ translateX: nextTranslate }] },
        };
      }
      default:
        return {
          current: { opacity: fadeOut },
          next: { opacity: fadeIn },
        };
    }
  };

  const layerStyles = getLayerStyles();
  const currentLayerStyle = layerStyles.current;
  const nextLayerStyle = layerStyles.next;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
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
        <RNAnimated.View style={[styles.photoLayer, currentLayerStyle]}>
          <PhotoCanvas
            photo={currentPhoto}
            width={PREVIEW_WIDTH}
            height={PREVIEW_HEIGHT}
          />
        </RNAnimated.View>
        {nextPhoto && (
          <RNAnimated.View
            pointerEvents="none"
            style={[styles.photoLayer, nextLayerStyle]}
          >
            <PhotoCanvas
              photo={nextPhoto}
              width={PREVIEW_WIDTH}
              height={PREVIEW_HEIGHT}
            />
          </RNAnimated.View>
        )}
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBarContainer, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
        <RNAnimated.View
          style={[styles.progressBar, { width: progressWidth, backgroundColor: colors.primary }]}
        />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.photoInfo}>
          <Text style={[styles.photoCounter, { color: '#FFFFFF' }]}>
            {currentPhotoIndex + 1} / {project.photos.length}
          </Text>
          <Text style={[styles.projectTitle, { color: '#FFFFFF' }]}>{project.title}</Text>
        </View>

        <View style={styles.playbackControls}>
          <IconButton
            icon={<Text style={styles.controlIcon}>{isPlaying ? '⏸' : '▶️'}</Text>}
            onPress={handlePlayPause}
            size={60}
            variant="filled"
            style={[styles.playButton, { backgroundColor: colors.primary }]}
          />
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

// Photo Canvas Component
interface PhotoCanvasProps {
  photo: any;
  width: number;
  height: number;
}

const PhotoCanvas: React.FC<PhotoCanvasProps> = ({ photo, width, height }) => {
  const image = useImage(photo.uri);
  const [size, setSize] = useState({ width, height });

  useEffect(() => {
    const intrinsicWidth = image?.width();
    const intrinsicHeight = image?.height();

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
  }, [photo.uri, photo.width, photo.height, image, width, height]);

  if (!image) {
    return <View style={{ width, height, backgroundColor: '#000' }} />;
  }

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
      />
    </Canvas>
  );
};

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
  },
  playButton: {
    marginHorizontal: 0,
  },
  controlIcon: {
    fontSize: 24,
    color: '#FFFFFF',
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
