import { NativeModules, Platform, Linking } from 'react-native';

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
    if (Platform.OS !== 'ios') {
      throw new Error('Photo library is only supported on iOS');
    }

    if (!PhotoLibraryModule) {
      console.warn('PhotoLibraryModule not available. Please rebuild the app.');
      throw new Error('Photo library module not available');
    }

    return PhotoLibraryModule.saveToPhotoLibrary(filePath);
  },

  /**
   * Open the Photos app
   * @returns Promise that resolves to true if Photos app was opened
   */
  openPhotosApp: async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      throw new Error('Opening Photos app is only supported on iOS');
    }

    // Fallback to using Linking if native module isn't available
    if (!PhotoLibraryModule) {
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
