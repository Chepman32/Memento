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
import { calculateTransition } from '../utils/transitionEffects';
import { SPACING, SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants/theme';

type PreviewScreenRouteProp = RouteProp<RootStackParamList, 'Preview'>;
type PreviewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Preview'>;

const PREVIEW_WIDTH = SCREEN_WIDTH;
const PREVIEW_HEIGHT = SCREEN_HEIGHT - 200;

const PreviewScreen: React.FC = () => {
  const navigation = useNavigation<PreviewScreenNavigationProp>();
  const route = useRoute<PreviewScreenRouteProp>();
  const { projectId } = route.params;

  const { colors } = useThemeStore();
  const { getProjectById } = useProjectStore();
  const project = getProjectById(projectId);

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new RNAnimated.Value(0)).current;

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

    // Move to next photo
    animationRef.current = setTimeout(() => {
      const nextIndex = (currentPhotoIndex + 1) % project.photos.length;
      setCurrentPhotoIndex(nextIndex);

      if (nextIndex === 0) {
        // Loop completed
        setIsPlaying(false);
      }
    }, duration);
  };

  const handlePlayPause = () => {
    haptics.medium();
    sounds.tap();
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    if (!project) return;
    haptics.light();
    setIsPlaying(false);
    setCurrentPhotoIndex((currentPhotoIndex - 1 + project.photos.length) % project.photos.length);
  };

  const handleNext = () => {
    if (!project) return;
    haptics.light();
    setIsPlaying(false);
    setCurrentPhotoIndex((currentPhotoIndex + 1) % project.photos.length);
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
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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
        <PhotoCanvas photo={currentPhoto} width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} />
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
            icon={<Text style={styles.controlIcon}>⏮</Text>}
            onPress={handlePrevious}
            size={50}
            style={styles.controlButton}
          />
          <IconButton
            icon={<Text style={styles.controlIcon}>{isPlaying ? '⏸' : '▶️'}</Text>}
            onPress={handlePlayPause}
            size={70}
            variant="filled"
            style={[styles.playButton, { backgroundColor: colors.primary }]}
          />
          <IconButton
            icon={<Text style={styles.controlIcon}>⏭</Text>}
            onPress={handleNext}
            size={50}
            style={styles.controlButton}
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

  if (!image) {
    return <View style={{ width, height, backgroundColor: '#000' }} />;
  }

  // Calculate aspect-fit dimensions
  const imageAspect = photo.width / photo.height;
  const containerAspect = width / height;

  let drawWidth, drawHeight, x, y;

  if (imageAspect > containerAspect) {
    drawWidth = width;
    drawHeight = width / imageAspect;
    x = 0;
    y = (height - drawHeight) / 2;
  } else {
    drawHeight = height;
    drawWidth = height * imageAspect;
    x = (width - drawWidth) / 2;
    y = 0;
  }

  return (
    <Canvas style={{ width, height }}>
      <Image image={image} x={x} y={y} width={drawWidth} height={drawHeight} fit="contain" />
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
  progressBarContainer: {
    height: 4,
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  controls: {
    padding: SPACING.lg,
  },
  photoInfo: {
    alignItems: 'center',
    marginBottom: SPACING.md,
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
    marginBottom: SPACING.lg,
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  playButton: {
    marginHorizontal: SPACING.lg,
  },
  controlIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  exportButton: {
    height: 50,
    borderRadius: 25,
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
