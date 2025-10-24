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
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { launchImageLibrary } from 'react-native-image-picker';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
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
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(true);

  const maxPhotos = purchaseState.isPremium ? 50 : FREE_TIER_LIMITS.MAX_PHOTOS;
  const photoPermission =
    Platform.OS === 'ios' ? PERMISSIONS.IOS.PHOTO_LIBRARY : PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;

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

    if (existingStatus === RESULTS.GRANTED || existingStatus === RESULTS.LIMITED) {
      return existingStatus;
    }

    const requested = await request(photoPermission);
    setPermissionStatus(requested);
    const allowed = requested === RESULTS.GRANTED || requested === RESULTS.LIMITED;
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
                  Alert.alert('Error', 'Unable to open settings. Please enable permissions manually.');
                });
              }
            },
          },
        ]
      );
    }

    return requested;
  }, [photoPermission, refreshPermissionStatus]);

  const handleSelectImages = async () => {
    const status = await ensurePermission();

    if (status !== RESULTS.GRANTED && status !== RESULTS.LIMITED) {
      return;
    }

    const remainingSlots = Math.max(0, maxPhotos - selectedImages.length);
    if (remainingSlots === 0) {
      haptics.light();
      Alert.alert('Photo Limit Reached', 'Remove a photo before adding new ones.');
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
            { text: 'Open Settings', onPress: () => {
              // On iOS, this will open the app settings
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              }
            }},
          ]
        );
        return;
      }

      // Handle other errors
      if (result.errorCode) {
        console.log('Image picker error:', result.errorCode, result.errorMessage);
        Alert.alert('Error', 'Unable to load photos. Please try again.');
        return;
      }

      // Handle successful selection
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
    } catch (error) {
      console.error('Error selecting images:', error);
      Alert.alert('Error', 'Unable to load photos. Please try again.');
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
          <Button title="Grant Access" onPress={ensurePermission} variant="primary" />
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
