import type { PlatformOSType } from 'react-native';
import { PERMISSIONS } from 'react-native-permissions';
import type { Permission } from 'react-native-permissions';

export const getPhotoLibraryPermission = (
  platform: PlatformOSType,
  platformVersion: number | string,
): Permission => {
  if (platform === 'ios') {
    return PERMISSIONS.IOS.PHOTO_LIBRARY;
  }

  return Number(platformVersion) >= 33
    ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
    : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
};
