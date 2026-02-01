import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import videoEncoder from './videoEncoder';
import { executeFfmpeg } from './ffmpegBridge';
import {
  Project,
  ExportQuality,
  ResolutionPreset,
} from '../types/project.types';
import { prepareWatermarkResources, WatermarkResources, findPreferredFont } from './watermark';

export interface GifConfig {
  project: Project;
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  optimize: boolean;
  colors: number;
  includeWatermark?: boolean;
  onProgress?: (progress: number) => void;
}

export interface GifResult {
  success: boolean;
  outputPath?: string;
  fileSize?: number;
  error?: string;
}

const MAX_GIF_SIZE = 10 * 1024 * 1024; // 10MB

const pickResolutionPreset = (
  width: number,
  height: number,
): ResolutionPreset => {
  if (width === height) {
    return ResolutionPreset.SQUARE;
  }

  if (width > height) {
    const aspect = width / Math.max(height, 1);
    if (aspect >= 2.1) {
      return ResolutionPreset.CINEMA;
    }
    return ResolutionPreset.LANDSCAPE;
  }

  return ResolutionPreset.PORTRAIT;
};

export const gifGenerator = {
  /**
   * Calculate estimated file size
   */
  estimateFileSize: (
    width: number,
    height: number,
    fps: number,
    duration: number,
    colors: number,
  ): number => {
    // Rough estimation: width * height * fps * duration * (colors/256) * compression_factor
    const compressionFactor = 0.1; // GIF compression
    const bytesPerFrame = width * height * (colors / 256) * compressionFactor;
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
    maxSize: number = MAX_GIF_SIZE,
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
      settings.colors,
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
        settings.colors,
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
        settings.colors,
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
        settings.colors,
      );
    }

    return settings;
  },

  createGif: async (config: GifConfig): Promise<GifResult> => {
    const timeline = videoEncoder.buildTimeline(config.project);

    if (!timeline.photoSegments.length) {
      return {
        success: false,
        error: 'Cannot export: the project has no photos.',
      };
    }

    config.onProgress?.(0);

    const baseDir =
      RNFS.CachesDirectoryPath ??
      RNFS.TemporaryDirectoryPath ??
      RNFS.DocumentDirectoryPath;

    if (!baseDir) {
      return {
        success: false,
        error: 'No writable directory available for GIF export.',
      };
    }

    const tempVideoPath = `${baseDir}/slidemint_gif_${Date.now()}.mp4`;
    const colors = Math.min(Math.max(config.colors, 2), 256);
    const resolution = pickResolutionPreset(config.width, config.height);
    const estimatedDurationMs = Math.max(timeline.totalDurationMs, 1000);
    // App is free - no watermark by default
    const includeWatermark = config.includeWatermark ?? false;
    let watermarkResources: WatermarkResources | null = null;

    if (includeWatermark) {
      try {
        watermarkResources = await prepareWatermarkResources();
      } catch (error) {
        console.warn(
          '[FFmpeg-GIF]',
          error instanceof Error
            ? `Failed to prepare watermark resources: ${error.message}`
            : 'Failed to prepare watermark resources.',
        );
      }
    }

    // Load font for captions
    let fontPath: string | undefined;
    try {
      fontPath = await findPreferredFont();
    } catch (error) {
      console.warn('[FFmpeg-GIF] Failed to find preferred font for captions');
    }

    try {
      const videoCommand = videoEncoder.buildFFmpegCommand({
        project: config.project,
        outputPath: tempVideoPath,
        quality: ExportQuality.MEDIUM,
        resolution,
        includeWatermark,
        watermarkResources: watermarkResources ?? undefined,
        fps: config.fps,
        fontPath,
      });

      let videoResult = await executeFfmpeg({
        command: videoCommand,
        estimatedDurationMs,
        onProgress: progress => {
          if (config.onProgress) {
            const mapped = Math.min(progress, 100) * 0.7;
            config.onProgress(mapped);
          }
        },
        logTag: 'FFmpeg-GIF-MP4',
      });

      // If hardware encoder fails on iOS, retry with software encoder
      if (!videoResult.success && Platform.OS === 'ios' && videoCommand.includes('h264_videotoolbox')) {
        console.log('[FFmpeg-GIF] Hardware encoder failed, retrying with software encoder (libx264)...');
        
        const fallbackCommand = videoCommand.replace(/-c:v h264_videotoolbox/, '-c:v libx264 -preset fast');
        
        videoResult = await executeFfmpeg({
          command: fallbackCommand,
          estimatedDurationMs,
          onProgress: progress => {
            if (config.onProgress) {
              const mapped = Math.min(progress, 100) * 0.7;
              config.onProgress(mapped);
            }
          },
          logTag: 'FFmpeg-GIF-MP4-Fallback',
        });
      }

      if (!videoResult.success) {
        return {
          success: false,
          error: videoResult.error ?? 'Failed to prepare GIF frames.',
        };
      }

      const baseFilter = `fps=${config.fps},scale=${config.width}:${config.height}:flags=lanczos`;
      const gifCommand = config.optimize
        ? `-y -i "${tempVideoPath}" -filter_complex "[0:v]${baseFilter},split [a][b];[a]palettegen=stats_mode=diff:max_colors=${colors}[p];[b][p]paletteuse=new=1" -loop 0 "${config.outputPath}"`
        : `-y -i "${tempVideoPath}" -vf "${baseFilter}" -loop 0 "${config.outputPath}"`;

      const gifResult = await executeFfmpeg({
        command: gifCommand,
        estimatedDurationMs,
        onProgress: progress => {
          if (config.onProgress) {
            const mapped = 70 + Math.min(progress, 100) * 0.3;
            config.onProgress(mapped > 100 ? 100 : mapped);
          }
        },
        logTag: 'FFmpeg-GIF',
      });

      if (!gifResult.success) {
        return {
          success: false,
          error: gifResult.error ?? 'GIF export failed.',
        };
      }

      config.onProgress?.(100);

      let fileSize = 0;
      try {
        const stat = await RNFS.stat(config.outputPath);
        fileSize = Number(stat?.size ?? 0);
      } catch {
        fileSize = 0;
      }

      return {
        success: true,
        outputPath: config.outputPath,
        fileSize,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      try {
        if (await RNFS.exists(tempVideoPath)) {
          await RNFS.unlink(tempVideoPath);
        }
      } catch (cleanupError) {
        console.warn('[GIF] Failed to remove temporary video', cleanupError);
      }
    }
  },

  /**
   * Check if file size is within limit
   */
  isWithinSizeLimit: (
    fileSize: number,
    maxSize: number = MAX_GIF_SIZE,
  ): boolean => {
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
