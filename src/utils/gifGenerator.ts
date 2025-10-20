import { Project } from '../types/project.types';

export interface GifConfig {
  project: Project;
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  optimize: boolean;
  colors: number;
  onProgress?: (progress: number) => void;
}

export interface GifResult {
  success: boolean;
  outputPath?: string;
  fileSize?: number;
  error?: string;
}

const MAX_GIF_SIZE = 10 * 1024 * 1024; // 10MB

export const gifGenerator = {
  /**
   * Calculate estimated file size
   */
  estimateFileSize: (
    width: number,
    height: number,
    fps: number,
    duration: number,
    colors: number
  ): number => {
    // Rough estimation: width * height * fps * duration * (colors/256) * compression_factor
    const compressionFactor = 0.1; // GIF compression
    const bytesPerFrame = (width * height * (colors / 256)) * compressionFactor;
    const totalFrames = fps * duration;
    return Math.floor(bytesPerFrame * totalFrames);
  },

  /**
   * Optimize GIF settings to meet size limit
   */
  optimizeSettings: (
    width: number,
    height: number,
    duration: number,
    maxSize: number = MAX_GIF_SIZE
  ): { width: number; height: number; fps: number; colors: number } => {
    let settings = {
      width,
      height,
      fps: 10,
      colors: 256,
    };

    let estimatedSize = gifGenerator.estimateFileSize(
      settings.width,
      settings.height,
      settings.fps,
      duration,
      settings.colors
    );

    // Reduce dimensions if too large
    while (estimatedSize > maxSize && settings.width > 320) {
      settings.width = Math.floor(settings.width * 0.8);
      settings.height = Math.floor(settings.height * 0.8);
      estimatedSize = gifGenerator.estimateFileSize(
        settings.width,
        settings.height,
        settings.fps,
        duration,
        settings.colors
      );
    }

    // Reduce colors if still too large
    while (estimatedSize > maxSize && settings.colors > 64) {
      settings.colors = Math.floor(settings.colors / 2);
      estimatedSize = gifGenerator.estimateFileSize(
        settings.width,
        settings.height,
        settings.fps,
        duration,
        settings.colors
      );
    }

    // Reduce fps as last resort
    while (estimatedSize > maxSize && settings.fps > 5) {
      settings.fps = Math.floor(settings.fps * 0.8);
      estimatedSize = gifGenerator.estimateFileSize(
        settings.width,
        settings.height,
        settings.fps,
        duration,
        settings.colors
      );
    }

    return settings;
  },

  /**
   * Create GIF from project (placeholder - FFmpeg removed)
   * TODO: Implement GIF generation with alternative solution
   */
  createGif: async (config: GifConfig): Promise<GifResult> => {
    // FFmpeg has been removed due to library retirement
    // This is a placeholder that simulates GIF creation
    return new Promise((resolve) => {
      const duration = config.project.photos.reduce(
        (sum, photo) => sum + photo.duration,
        0
      );

      const simulationTime = 2000; // 2 seconds simulation
      let progress = 0;

      const interval = setInterval(() => {
        progress += 10;
        config.onProgress?.(progress);

        if (progress >= 100) {
          clearInterval(interval);
          resolve({
            success: false,
            error: 'GIF creation not available. FFmpeg library has been removed. Please use an alternative solution.',
          });
        }
      }, simulationTime / 10);
    });
  },

  /**
   * Check if file size is within limit
   */
  isWithinSizeLimit: (fileSize: number, maxSize: number = MAX_GIF_SIZE): boolean => {
    return fileSize <= maxSize;
  },

  /**
   * Format file size for display
   */
  formatFileSize: (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  },
};
