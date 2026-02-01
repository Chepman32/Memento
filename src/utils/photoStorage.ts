import RNFS from 'react-native-fs';

const PHOTOS_DIR = `${RNFS.DocumentDirectoryPath}/photos`;
const THUMBNAILS_DIR = `${RNFS.DocumentDirectoryPath}/thumbnails`;

export interface StoredPhotoResult {
  localUri: string;
  thumbnailUri: string;
}

export interface MigratedPhoto {
  id: string;
  uri: string;
  thumbnailUri?: string;
  migrated: boolean;
  error?: string;
}

export interface MigrationResult {
  projectId: string;
  migratedPhotos: MigratedPhoto[];
  hasInvalidPhotos: boolean;
}

const stripFileProtocol = (path: string): string => {
  const withoutProtocol = path.replace(/^file:\/\//, '');
  const [cleanPath] = withoutProtocol.split('?');
  try {
    return decodeURI(cleanPath);
  } catch {
    return cleanPath;
  }
};

const getExtension = (uri: string): string => {
  const cleanUri = uri.split('?')[0];
  const match = cleanUri.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : 'jpg';
};

export const photoStorage = {
  ensureDirectories: async (): Promise<void> => {
    try {
      const photosExists = await RNFS.exists(PHOTOS_DIR);
      if (!photosExists) {
        await RNFS.mkdir(PHOTOS_DIR);
      }
    } catch (error) {
      console.warn('[photoStorage] Failed to create photos directory:', error);
    }

    try {
      const thumbnailsExists = await RNFS.exists(THUMBNAILS_DIR);
      if (!thumbnailsExists) {
        await RNFS.mkdir(THUMBNAILS_DIR);
      }
    } catch (error) {
      console.warn('[photoStorage] Failed to create thumbnails directory:', error);
    }
  },

  copyPhotoToStorage: async (sourceUri: string, photoId: string): Promise<string> => {
    const extension = getExtension(sourceUri);
    const destPath = `${PHOTOS_DIR}/${photoId}.${extension}`;

    const normalizedSource = stripFileProtocol(sourceUri);

    try {
      await RNFS.copyFile(normalizedSource, destPath);
      return `file://${destPath}`;
    } catch (error) {
      console.error('[photoStorage] Failed to copy photo:', error);
      throw error;
    }
  },

  generateThumbnail: async (sourceUri: string, photoId: string): Promise<string> => {
    const extension = getExtension(sourceUri);
    const thumbPath = `${THUMBNAILS_DIR}/${photoId}_thumb.${extension}`;

    const normalizedSource = stripFileProtocol(sourceUri);

    try {
      // For now, copy the original as thumbnail
      // TODO: Use react-native-image-resizer for actual resizing
      await RNFS.copyFile(normalizedSource, thumbPath);
      return `file://${thumbPath}`;
    } catch (error) {
      console.error('[photoStorage] Failed to generate thumbnail:', error);
      throw error;
    }
  },

  copyAndGenerateThumbnail: async (
    sourceUri: string,
    photoId: string,
  ): Promise<StoredPhotoResult> => {
    await photoStorage.ensureDirectories();

    const localUri = await photoStorage.copyPhotoToStorage(sourceUri, photoId);
    const thumbnailUri = await photoStorage.generateThumbnail(sourceUri, photoId);

    return { localUri, thumbnailUri };
  },

  deletePhotoFiles: async (photoId: string): Promise<void> => {
    try {
      const photosFiles = await RNFS.readDir(PHOTOS_DIR);
      for (const file of photosFiles) {
        if (file.name.startsWith(photoId)) {
          await RNFS.unlink(file.path);
        }
      }
    } catch (error) {
      console.warn('[photoStorage] Failed to delete photo files:', error);
    }

    try {
      const thumbFiles = await RNFS.readDir(THUMBNAILS_DIR);
      for (const file of thumbFiles) {
        if (file.name.startsWith(photoId)) {
          await RNFS.unlink(file.path);
        }
      }
    } catch (error) {
      console.warn('[photoStorage] Failed to delete thumbnail files:', error);
    }
  },

  validateUri: async (uri: string): Promise<boolean> => {
    if (!uri) return false;
    const normalizedUri = stripFileProtocol(uri);
    try {
      return await RNFS.exists(normalizedUri);
    } catch {
      return false;
    }
  },

  isLocalStoragePath: (uri: string): boolean => {
    return uri.includes(RNFS.DocumentDirectoryPath);
  },

  getPhotosDirectory: (): string => PHOTOS_DIR,
  getThumbnailsDirectory: (): string => THUMBNAILS_DIR,

  migratePhoto: async (
    photoId: string,
    currentUri: string,
  ): Promise<MigratedPhoto> => {
    // If already in local storage, nothing to do
    if (photoStorage.isLocalStoragePath(currentUri)) {
      return { id: photoId, uri: currentUri, migrated: false };
    }

    // Check if the original URI is still valid
    const isValid = await photoStorage.validateUri(currentUri);

    if (!isValid) {
      return {
        id: photoId,
        uri: currentUri,
        migrated: false,
        error: 'Photo no longer accessible',
      };
    }

    try {
      await photoStorage.ensureDirectories();
      const { localUri, thumbnailUri } =
        await photoStorage.copyAndGenerateThumbnail(currentUri, photoId);
      return {
        id: photoId,
        uri: localUri,
        thumbnailUri,
        migrated: true,
      };
    } catch (error) {
      return {
        id: photoId,
        uri: currentUri,
        migrated: false,
        error: error instanceof Error ? error.message : 'Migration failed',
      };
    }
  },
};
