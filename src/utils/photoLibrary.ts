import {
  Linking,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';

interface PhotoLibraryModuleInterface {
  saveToPhotoLibrary(filePath: string): Promise<boolean>;
  openPhotosApp(): Promise<boolean>;
}

const { PhotoLibraryModule } = NativeModules;

export const photoLibrary = {
  /**
   * Save a video or image file to the device's photo library
   * @param filePath Absolute path to the file
   * @returns Promise that resolves to true on success
   */
  saveToPhotoLibrary: async (filePath: string): Promise<boolean> => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      throw new Error('Photo library is not supported on this platform');
    }

    if (!PhotoLibraryModule) {
      console.warn('PhotoLibraryModule not available. Please rebuild the app.');
      throw new Error('Photo library module not available');
    }

    if (Platform.OS === 'android' && Number(Platform.Version) <= 28) {
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      );
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error('Storage permission denied');
      }
    }

    return PhotoLibraryModule.saveToPhotoLibrary(filePath);
  },

  /**
   * Open the Photos app
   * @returns Promise that resolves to true if Photos app was opened
   */
  openPhotosApp: async (): Promise<boolean> => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      throw new Error('Opening the photo library is not supported on this platform');
    }

    if (!PhotoLibraryModule) {
      if (Platform.OS === 'android') {
        throw new Error('Photo library module not available');
      }

      // iOS fallback when the native module has not been linked yet.
      const url = 'photos-redirect://';
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
      return false;
    }

    return PhotoLibraryModule.openPhotosApp();
  },
} as PhotoLibraryModuleInterface;
