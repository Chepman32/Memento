import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  openSettings,
} from 'react-native-permissions';
import FeatherIcon from 'react-native-vector-icons/Feather';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { RootStackParamList } from '../navigation/navigationTypes';
import { useThemeStore } from '../store/themeStore';
import useProjectStore from '../store/projectStore';
import { Button, IconButton } from '../components/common';
import { haptics } from '../utils/hapticFeedback';
import { sounds } from '../utils/soundEffects';
import { FREE_TIER_LIMITS } from '../constants/iap';
import { SPACING, RADII, TYPOGRAPHY, SCREEN_WIDTH } from '../constants/theme';

type ImageSelectionNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ImageSelection'
>;

const IMAGE_SIZE = (SCREEN_WIDTH - SPACING.md * 5) / 4;
const COLUMNS = 4;
const IMAGE_MARGIN = SPACING.xs;

interface SelectedImage {
  uri: string;
  width: number;
  height: number;
  id: string;
}

interface DraggableImageProps {
  item: SelectedImage;
  index: number;
  positions: Animated.SharedValue<number[]>;
  scrollY: Animated.SharedValue<number>;
  onRemove: (index: number) => void;
  colors: any;
}

const DraggableImage: React.FC<DraggableImageProps> = ({
  item,
  index,
  positions,
  scrollY,
  onRemove,
  colors,
}) => {
  const isGestureActive = useSharedValue(false);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const getPosition = (index: number) => {
    'worklet';
    const row = Math.floor(index / COLUMNS);
    const col = index % COLUMNS;
    return {
      x: col * (IMAGE_SIZE + IMAGE_MARGIN) + SPACING.md,
      y: row * (IMAGE_SIZE + IMAGE_MARGIN) + SPACING.md,
    };
  };

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number; startY: number; startIndex: number }
  >({
    onStart: (_, ctx) => {
      ctx.startIndex = positions.value[index];
      const pos = getPosition(ctx.startIndex);
      ctx.startX = pos.x;
      ctx.startY = pos.y;
      isGestureActive.value = true;
      scale.value = withSpring(1.1);
      runOnJS(haptics.light)();
    },
    onActive: (event, ctx) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;

      const currentX = ctx.startX + event.translationX;
      const currentY = ctx.startY + event.translationY + scrollY.value;

      const newCol = Math.round(
        (currentX - SPACING.md) / (IMAGE_SIZE + IMAGE_MARGIN),
      );
      const newRow = Math.round(
        (currentY - SPACING.md) / (IMAGE_SIZE + IMAGE_MARGIN),
      );
      const newIndex = Math.max(
        0,
        Math.min(newRow * COLUMNS + newCol, positions.value.length - 1),
      );

      const oldIndex = positions.value.indexOf(index);
      if (newIndex !== oldIndex && newIndex >= 0) {
        const newPositions = [...positions.value];
        newPositions.splice(oldIndex, 1);
        newPositions.splice(newIndex, 0, index);
        positions.value = newPositions;
      }
    },
    onEnd: () => {
      const finalIndex = positions.value.indexOf(index);
      const finalPos = getPosition(finalIndex);
      translateX.value = withSpring(finalPos.x - getPosition(index).x);
      translateY.value = withSpring(finalPos.y - getPosition(index).y);
      scale.value = withSpring(1);
      isGestureActive.value = false;
      runOnJS(haptics.light)();
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    const currentIndex = positions.value.indexOf(index);
    const pos = getPosition(currentIndex);

    if (isGestureActive.value) {
      return {
        position: 'absolute',
        left: 0,
        top: 0,
        transform: [
          { translateX: pos.x + translateX.value },
          { translateY: pos.y + translateY.value - scrollY.value },
          { scale: scale.value },
        ],
        zIndex: 1000,
      };
    }

    return {
      position: 'absolute',
      left: 0,
      top: 0,
      transform: [
        { translateX: withSpring(pos.x) },
        { translateY: withSpring(pos.y - scrollY.value) },
        { scale: scale.value },
      ],
      zIndex: 1,
    };
  });

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.imageContainer, animatedStyle]}>
        <Image
          source={{ uri: item.uri }}
          style={styles.image}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={[styles.removeButton, { backgroundColor: colors.error }]}
          onPress={() => onRemove(index)}
        >
          <Text style={styles.removeIcon}>×</Text>
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
};

const ImageSelectionScreen: React.FC = () => {
  const navigation = useNavigation<ImageSelectionNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'ImageSelection'>>();
  const { colors } = useThemeStore();
  const { currentProjectId, getProjectById } = useProjectStore();

  // Load existing project photos on mount
  const getInitialImages = useCallback((): SelectedImage[] => {
    if (currentProjectId) {
      const project = getProjectById(currentProjectId);
      if (project && project.photos.length > 0) {
        return project.photos.map((photo, idx) => ({
          uri: photo.uri,
          width: photo.width || 1920,
          height: photo.height || 1080,
          id: `${photo.uri}-${idx}`,
        }));
      }
    }
    return [];
  }, [currentProjectId, getProjectById]);

  const [selectedImages, setSelectedImages] =
    useState<SelectedImage[]>(getInitialImages);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(true);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const positions = useSharedValue<number[]>([]);
  const scrollY = useSharedValue(0);
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();

  useEffect(() => {
    positions.value = selectedImages.map((_, index) => index);
  }, [selectedImages.length]);

  const maxPhotos = FREE_TIER_LIMITS.MAX_PHOTOS;
  const photoPermission =
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.PHOTO_LIBRARY
      : PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;
  const autoOpenPicker = route.params?.autoOpenPicker ?? false;

  const refreshPermissionStatus = useCallback(async () => {
    const status = await check(photoPermission);
    setPermissionStatus(status);
    setHasPermission(status === RESULTS.GRANTED || status === RESULTS.LIMITED);
    return status;
  }, [photoPermission]);

  useEffect(() => {
    refreshPermissionStatus();
  }, [refreshPermissionStatus]);

  const ensurePermission = useCallback(async (): Promise<string> => {
    const existingStatus = await refreshPermissionStatus();

    if (
      existingStatus === RESULTS.GRANTED ||
      existingStatus === RESULTS.LIMITED
    ) {
      return existingStatus;
    }

    const requested = await request(photoPermission);
    setPermissionStatus(requested);
    const allowed =
      requested === RESULTS.GRANTED || requested === RESULTS.LIMITED;
    setHasPermission(allowed);

    if (!allowed) {
      Alert.alert(
        'Permission Required',
        Platform.OS === 'ios'
          ? 'Please allow photo access in Settings to pick images for your slideshow.'
          : 'Please allow photo access to pick images for your slideshow.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                openSettings().catch(() => {
                  Alert.alert(
                    'Error',
                    'Unable to open settings. Please enable permissions manually.',
                  );
                });
              }
            },
          },
        ],
      );
    }

    return requested;
  }, [photoPermission, refreshPermissionStatus]);

  const handleSelectImages = useCallback(async () => {
    const status = await ensurePermission();

    if (status !== RESULTS.GRANTED && status !== RESULTS.LIMITED) {
      return;
    }

    const remainingSlots = Math.max(0, maxPhotos - selectedImages.length);
    if (remainingSlots === 0) {
      haptics.light();
      Alert.alert(
        'Photo Limit Reached',
        'Remove a photo before adding new ones.',
      );
      return;
    }

    haptics.light();

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: Math.max(1, remainingSlots),
        quality: 1,
        includeBase64: false,
      });

      // Handle permission denied
      if (result.errorCode === 'permission') {
        await refreshPermissionStatus();
        Alert.alert(
          'Permission Required',
          'Please grant photo library access in Settings to select images.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                // On iOS, this will open the app settings
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                }
              },
            },
          ],
        );
        return;
      }

      // Handle other errors
      if (result.errorCode) {
        console.log(
          'Image picker error:',
          result.errorCode,
          result.errorMessage,
        );
        Alert.alert('Error', 'Unable to load photos. Please try again.');
        return;
      }

      // Handle successful selection
      if (result.assets && result.assets.length > 0) {
        const newImages: SelectedImage[] = result.assets.map((asset, idx) => ({
          uri: asset.uri || '',
          width: asset.width || 1920,
          height: asset.height || 1080,
          id: `${asset.uri}-${Date.now()}-${idx}`,
        }));

        setSelectedImages(prevImages => [...prevImages, ...newImages]);
        sounds.success();
        haptics.success();
      }
    } catch (error) {
      console.error('Error selecting images:', error);
      Alert.alert('Error', 'Unable to load photos. Please try again.');
    }
  }, [
    ensurePermission,
    maxPhotos,
    refreshPermissionStatus,
    selectedImages.length,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (autoOpenPicker && !hasAutoOpened) {
        setHasAutoOpened(true);
        void handleSelectImages();
      }
    }, [autoOpenPicker, hasAutoOpened, handleSelectImages]),
  );

  const handleRemoveImage = useCallback((index: number) => {
    haptics.light();
    setSelectedImages(prevImages => prevImages.filter((_, i) => i !== index));
  }, []);

  const handleContinue = () => {
    if (selectedImages.length < 2) {
      Alert.alert(
        'Not Enough Photos',
        'Please select at least 2 photos to create a slideshow.',
      );
      return;
    }

    haptics.medium();
    sounds.tap();

    // Reorder images based on positions
    const reorderedImages = positions.value.map(pos => selectedImages[pos]);

    navigation.navigate('Editor', {
      photos: reorderedImages.map(img => img.uri),
    });
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const containerHeight =
    Math.ceil(selectedImages.length / COLUMNS) * (IMAGE_SIZE + IMAGE_MARGIN) +
    SPACING.md * 2;

  const handleClose = () => {
    haptics.light();
    navigation.goBack();
  };

  if (!hasPermission) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Photo Access Required
          </Text>
          <Text
            style={[styles.permissionText, { color: colors.textSecondary }]}
          >
            We need access to your photo library to create slideshows
          </Text>
          <Button
            title="Grant Access"
            onPress={ensurePermission}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon={
              <FeatherIcon name="chevron-left" size={26} color={colors.text} />
            }
            onPress={handleClose}
            size={44}
          />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Select Photos
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Selection info */}
        <View style={styles.infoContainer}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {selectedImages.length} of {maxPhotos} selected
          </Text>
        </View>

        {/* Selected images grid */}
        <Animated.ScrollView
          ref={scrollViewRef}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
        >
          {selectedImages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No photos selected yet
              </Text>
            </View>
          ) : (
            <View style={{ height: containerHeight }}>
              {selectedImages.map((item, index) => (
                <DraggableImage
                  key={item.id}
                  item={item}
                  index={index}
                  positions={positions}
                  scrollY={scrollY}
                  onRemove={handleRemoveImage}
                  colors={colors}
                />
              ))}
            </View>
          )}
        </Animated.ScrollView>

        {/* Actions */}
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <Button
            title="Add Photos"
            onPress={handleSelectImages}
            variant="outlined"
            style={styles.addButton}
          />
          <Button
            title="Continue"
            onPress={handleContinue}
            variant="primary"
            style={styles.continueButton}
            disabled={selectedImages.length < 2}
          />
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
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
  closeIcon: {
    fontSize: 36,
    fontWeight: '300',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  infoContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    ...TYPOGRAPHY.body2,
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: RADII.sm,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    ...TYPOGRAPHY.body1,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
  },
  addButton: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  continueButton: {
    flex: 1.5,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  permissionTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.md,
  },
  permissionText: {
    ...TYPOGRAPHY.body1,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
});

export default ImageSelectionScreen;
