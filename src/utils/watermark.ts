import { Image, Platform } from 'react-native';
import RNFS from 'react-native-fs';

const { getAssetByID } = require('@react-native/assets-registry/registry');
const { getAndroidResourceIdentifier } = require('@react-native/assets-registry/path-support');

const WATERMARK_ICON_ID: number = require('../assets/icons/icon.png');

export interface WatermarkResources {
  imagePath: string;
  fontPath?: string;
  imageWidth?: number;
  imageHeight?: number;
}

let cachedResources: WatermarkResources | null = null;
let inflightPromise: Promise<WatermarkResources> | null = null;
let warnedFontLookup = false;

const getWritableCacheDir = (): string | null => {
  return (
    RNFS.CachesDirectoryPath ??
    RNFS.TemporaryDirectoryPath ??
    RNFS.DocumentDirectoryPath ??
    null
  );
};

const normalizeResourceName = (identifier: string): string => {
  let resourceName = identifier.replace(/^asset:\//, '');
  resourceName = resourceName.replace(/\.[^/.]+$/, '');
  return resourceName;
};

const stripFileProtocol = (path: string): string => {
  const withoutProtocol = path.replace(/^file:\/\//, '');
  const [cleanPath] = withoutProtocol.split('?');
  try {
    return decodeURI(cleanPath);
  } catch {
    return cleanPath;
  }
};

const ensureWatermarkImage = async (): Promise<{
  path: string;
  width?: number;
  height?: number;
}> => {
  const cacheDir = getWritableCacheDir();

  if (!cacheDir) {
    throw new Error('No writable cache directory available for watermark assets.');
  }

  const destinationPath = `${cacheDir.replace(/\/$/, '')}/slidemint_watermark_icon.png`;

  if (await RNFS.exists(destinationPath)) {
    return { path: destinationPath };
  }

  const resolvedSource = Image.resolveAssetSource(WATERMARK_ICON_ID);

  if (!resolvedSource?.uri) {
    throw new Error('Unable to resolve watermark icon asset URI.');
  }

  const { uri, width, height } = resolvedSource as {
    uri: string;
    width?: number;
    height?: number;
  };

  try {
    try {
      await RNFS.mkdir(cacheDir);
    } catch {
      // Directory likely already exists; ignore mkdir errors.
    }

    const normalizedLocalPath = stripFileProtocol(uri);

    if ((uri.startsWith('file://') || uri.startsWith('/')) && (await RNFS.exists(normalizedLocalPath))) {
      return {
        path: normalizedLocalPath,
        width,
        height,
      };
    }

    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      const downloadResult = RNFS.downloadFile({
        fromUrl: uri,
        toFile: destinationPath,
      });
      await downloadResult.promise;
    } else if (uri.startsWith('file://') || uri.startsWith('/')) {
      const sourcePath = stripFileProtocol(uri);
      if (!(await RNFS.exists(sourcePath))) {
        throw new Error(`Watermark source image not found at ${sourcePath}`);
      }
      await RNFS.copyFile(sourcePath, destinationPath);
    } else if (Platform.OS === 'android') {
      // Attempt copying from Android resources (res/drawable or res/raw)
      let resourceName = normalizeResourceName(uri);

      try {
        await RNFS.copyFileRes(resourceName, destinationPath);
      } catch (copyError) {
        const assetRecord = getAssetByID(WATERMARK_ICON_ID);
        if (assetRecord) {
          const androidIdentifier = getAndroidResourceIdentifier(assetRecord);
          await RNFS.copyFileRes(androidIdentifier, destinationPath);
        } else {
          throw copyError;
        }
      }
    } else {
      throw new Error(`Unsupported watermark asset URI scheme: ${uri}`);
    }
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Failed to prepare watermark icon: ${error.message}`
        : `Failed to prepare watermark icon: ${String(error)}`
    );
  }

  return {
    path: destinationPath,
    width,
    height,
  };
};

export const findPreferredFont = async (): Promise<string | undefined> => {
  const candidates =
    Platform.select<string[]>({
      ios: [
        '/System/Library/Fonts/CoreUI/SFProDisplay-Regular.otf',
        '/System/Library/Fonts/CoreUI/SFUIText-Regular.otf',
        '/System/Library/Fonts/Core/HelveticaNeue.ttc',
        '/System/Library/Fonts/Core/SFNS.ttf',
      ],
      android: [
        '/system/fonts/Roboto-Regular.ttf',
        '/system/fonts/Roboto-Medium.ttf',
        '/system/fonts/NotoSans-Regular.ttf',
        '/system/fonts/DroidSans.ttf',
      ],
      default: [],
    }) ?? [];

  for (const candidate of candidates) {
    try {
      if (await RNFS.exists(candidate)) {
        return candidate;
      }
    } catch {
      // Ignore lookup errors and continue checking additional candidates.
    }
  }

  if (!warnedFontLookup) {
    warnedFontLookup = true;
    console.warn('[Watermark] No preferred font found; falling back to default drawtext font.');
  }

  return undefined;
};

export const prepareWatermarkResources = async (): Promise<WatermarkResources> => {
  if (cachedResources) {
    return cachedResources;
  }

  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = (async () => {
    const imageResult = await ensureWatermarkImage();
    const fontPath = await findPreferredFont();

    const resources: WatermarkResources = {
      imagePath: imageResult.path,
      fontPath,
      imageWidth: imageResult.width,
      imageHeight: imageResult.height,
    };

    cachedResources = resources;
    return resources;
  })();

  try {
    return await inflightPromise;
  } finally {
    inflightPromise = null;
  }
};

export const getCachedWatermarkResources = (): WatermarkResources | null => cachedResources;
