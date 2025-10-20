import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { launchImageLibrary } from 'react-native-image-picker';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { RootStackParamList } from '../navigation/navigationTypes';
import { useThemeStore } from '../store/themeStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { Button, IconButton } from '../components/common';
import { haptics } from '../utils/hapticFeedback';
import { sounds } from '../utils/soundEffects';
import { FREE_TIER_LIMITS } from '../constants/iap';
import { SPACING, RADII, TYPOGRAPHY, SCREEN_WIDTH } from '../constants/theme';
import { Platform } from 'react-native';

type ImageSelectionNavigationProp = StackNavigationProp<RootStackParamList, 'ImageSelection'>;

const IMAGE_SIZE = (SCREEN_WIDTH - SPACING.md * 5) / 4;

interface SelectedImage {
  uri: string;
  width: number;
  height: number;
}

const ImageSelectionScreen: React.FC = () => {
  const navigation = useNavigation<ImageSelectionNavigationProp>();
  const { colors } = useThemeStore();
  const { purchaseState } = usePurchaseStore();

  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [hasPermission, setHasPermission] = useState(false);

  const maxPhotos = purchaseState.isPremium ? 50 : FREE_TIER_LIMITS.MAX_PHOTOS;

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const permission =
      Platform.OS === 'ios' ? PERMISSIONS.IOS.PHOTO_LIBRARY : PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;

    const result = await check(permission);

    if (result === RESULTS.GRANTED) {
      setHasPermission(true);
    } else {
      requestPermission();
    }
  };

  const requestPermission = async () => {
    const permission =
      Platform.OS === 'ios' ? PERMISSIONS.IOS.PHOTO_LIBRARY : PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;

    const result = await request(permission);

    if (result === RESULTS.GRANTED) {
      setHasPermission(true);
    } else {
      Alert.alert(
        'Permission Required',
        'Please grant photo library access to select images.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  const handleSelectImages = async () => {
    haptics.light();

    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: maxPhotos - selectedImages.length,
      quality: 1,
    });

    if (result.assets && result.assets.length > 0) {
      const newImages: SelectedImage[] = result.assets.map((asset) => ({
        uri: asset.uri || '',
        width: asset.width || 1920,
        height: asset.height || 1080,
      }));

      setSelectedImages([...selectedImages, ...newImages]);
      sounds.success();
      haptics.success();
    }
  };

  const handleRemoveImage = useCallback(
    (index: number) => {
      haptics.light();
      setSelectedImages(selectedImages.filter((_, i) => i !== index));
    },
    [selectedImages]
  );

  const handleContinue = () => {
    if (selectedImages.length < 2) {
      Alert.alert('Not Enough Photos', 'Please select at least 2 photos to create a slideshow.');
      return;
    }

    haptics.medium();
    sounds.tap();
    navigation.navigate('Editor', { photos: selectedImages.map((img) => img.uri) });
  };

  const handleClose = () => {
    haptics.light();
    navigation.goBack();
  };

  const renderImage = useCallback(
    ({ item, index }: { item: SelectedImage; index: number }) => (
      <View style={[styles.imageContainer, { marginRight: SPACING.xs }]}>
        <Image source={{ uri: item.uri }} style={styles.image} resizeMode="cover" />
        <TouchableOpacity
          style={[styles.removeButton, { backgroundColor: colors.error }]}
          onPress={() => handleRemoveImage(index)}
        >
          <Text style={styles.removeIcon}>×</Text>
        </TouchableOpacity>
      </View>
    ),
    [colors, handleRemoveImage]
  );

  if (!hasPermission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Photo Access Required
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            We need access to your photo library to create slideshows
          </Text>
          <Button title="Grant Access" onPress={requestPermission} variant="primary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon={<Text style={styles.closeIcon}>×</Text>} onPress={handleClose} size={44} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Select Photos</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Selection info */}
      <View style={styles.infoContainer}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          {selectedImages.length} of {maxPhotos} selected
        </Text>
        {!purchaseState.isPremium && selectedImages.length >= maxPhotos && (
          <TouchableOpacity onPress={() => navigation.navigate('Paywall')}>
            <Text style={[styles.upgradeText, { color: colors.primary }]}>
              Upgrade for more photos
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Selected images grid */}
      <FlatList
        data={selectedImages}
        renderItem={renderImage}
        keyExtractor={(_, index) => index.toString()}
        numColumns={4}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No photos selected yet
            </Text>
          </View>
        }
      />

      {/* Actions */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Button
          title="Add Photos"
          onPress={handleSelectImages}
          variant="outlined"
          style={styles.addButton}
          disabled={selectedImages.length >= maxPhotos}
        />
        <Button
          title={`Continue (${selectedImages.length})`}
          onPress={handleContinue}
          variant="primary"
          style={styles.continueButton}
          disabled={selectedImages.length < 2}
        />
      </View>
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
  upgradeText: {
    ...TYPOGRAPHY.body2,
    fontWeight: '600',
  },
  grid: {
    padding: SPACING.md,
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    marginBottom: SPACING.xs,
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
