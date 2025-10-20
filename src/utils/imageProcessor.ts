import { PhotoEffect } from '../types/project.types';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ProcessImageOptions {
  uri: string;
  effects?: PhotoEffect[];
  targetSize?: ImageDimensions;
}

export const imageProcessor = {
  /**
   * Get image dimensions from URI
   */
  getImageDimensions: async (uri: string): Promise<ImageDimensions> => {
    return new Promise((resolve, reject) => {
      const Image = require('react-native').Image;
      Image.getSize(
        uri,
        (width: number, height: number) => {
          resolve({ width, height });
        },
        (error: Error) => {
          reject(error);
        }
      );
    });
  },

  /**
   * Calculate aspect ratio
   */
  calculateAspectRatio: (width: number, height: number): number => {
    return width / height;
  },

  /**
   * Calculate dimensions to fit container while maintaining aspect ratio
   */
  calculateFitDimensions: (
    imageWidth: number,
    imageHeight: number,
    containerWidth: number,
    containerHeight: number
  ): ImageDimensions => {
    const imageAspect = imageWidth / imageHeight;
    const containerAspect = containerWidth / containerHeight;

    if (imageAspect > containerAspect) {
      // Image is wider than container
      return {
        width: containerWidth,
        height: containerWidth / imageAspect,
      };
    } else {
      // Image is taller than container
      return {
        width: containerHeight * imageAspect,
        height: containerHeight,
      };
    }
  },

  /**
   * Calculate dimensions to fill container while maintaining aspect ratio
   */
  calculateFillDimensions: (
    imageWidth: number,
    imageHeight: number,
    containerWidth: number,
    containerHeight: number
  ): ImageDimensions => {
    const imageAspect = imageWidth / imageHeight;
    const containerAspect = containerWidth / containerHeight;

    if (imageAspect > containerAspect) {
      // Image is wider - fit to height
      return {
        width: containerHeight * imageAspect,
        height: containerHeight,
      };
    } else {
      // Image is taller - fit to width
      return {
        width: containerWidth,
        height: containerWidth / imageAspect,
      };
    }
  },

  /**
   * Crop image to aspect ratio
   */
  cropToAspectRatio: async (
    uri: string,
    aspectRatio: string
  ): Promise<string> => {
    // This would use a library like expo-image-manipulator or react-native-image-crop-picker
    // For now, return the original URI
    console.log(`Cropping image to ${aspectRatio}:`, uri);
    return uri;
  },

  /**
   * Resize image to target dimensions
   */
  resizeImage: async (
    uri: string,
    targetWidth: number,
    targetHeight: number
  ): Promise<string> => {
    // This would use expo-image-manipulator or similar
    console.log(`Resizing image to ${targetWidth}x${targetHeight}:`, uri);
    return uri;
  },

  /**
   * Apply effects to image
   */
  applyEffects: async (
    uri: string,
    effects: PhotoEffect[]
  ): Promise<string> => {
    if (effects.length === 0) return uri;

    // Effects would be applied using Skia or native image processing
    console.log('Applying effects:', effects);
    return uri;
  },

  /**
   * Process image with options
   */
  processImage: async (options: ProcessImageOptions): Promise<string> => {
    let processedUri = options.uri;

    if (options.targetSize) {
      processedUri = await imageProcessor.resizeImage(
        processedUri,
        options.targetSize.width,
        options.targetSize.height
      );
    }

    if (options.effects && options.effects.length > 0) {
      processedUri = await imageProcessor.applyEffects(
        processedUri,
        options.effects
      );
    }

    return processedUri;
  },
};
