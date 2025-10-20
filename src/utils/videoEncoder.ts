import { Project } from '../types/project.types';
import { ExportQuality, ResolutionPreset } from '../types/project.types';

export interface VideoEncoderConfig {
  project: Project;
  outputPath: string;
  quality: ExportQuality;
  resolution: ResolutionPreset;
  includeWatermark?: boolean;
  onProgress?: (progress: number) => void;
}

export interface EncodingResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  duration?: number;
}

const QUALITY_BITRATES = {
  '720p': '2M',
  '1080p': '5M',
  '4K': '20M',
};

const RESOLUTION_DIMENSIONS = {
  '1:1': { width: 1080, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '21:9': { width: 2560, height: 1080 },
};

export const videoEncoder = {
  /**
   * Calculate total slideshow duration
   */
  calculateDuration: (project: Project): number => {
    return project.photos.reduce((total, photo) => {
      return total + photo.duration;
    }, 0);
  },

  /**
   * Generate frame sequences for each photo
   */
  generateFrameList: (project: Project, fps: number = 30): string[] => {
    const frames: string[] = [];

    project.photos.forEach((photo) => {
      const frameCount = Math.floor(photo.duration * fps);
      for (let i = 0; i < frameCount; i++) {
        frames.push(photo.uri);
      }
    });

    return frames;
  },

  /**
   * Build FFmpeg command for video encoding
   */
  buildFFmpegCommand: (config: VideoEncoderConfig): string => {
    const { project, outputPath, quality, resolution } = config;
    const dimensions = RESOLUTION_DIMENSIONS[resolution];
    const bitrate = QUALITY_BITRATES[quality];
    const fps = quality === '4K' ? 60 : 30;

    // Build input files list
    const inputs = project.photos.map((photo, index) => {
      return `-loop 1 -t ${photo.duration} -i "${photo.uri}"`;
    }).join(' ');

    // Build filter complex for transitions
    const filterComplex = videoEncoder.buildFilterComplex(project, dimensions);

    // Complete command
    const command = `
      ${inputs}
      -filter_complex "${filterComplex}"
      -c:v libx264
      -preset medium
      -crf 23
      -b:v ${bitrate}
      -pix_fmt yuv420p
      -r ${fps}
      -movflags +faststart
      -y "${outputPath}"
    `.replace(/\s+/g, ' ').trim();

    return command;
  },

  /**
   * Build filter complex for transitions
   */
  buildFilterComplex: (
    project: Project,
    dimensions: { width: number; height: number }
  ): string => {
    const { width, height } = dimensions;
    const filters: string[] = [];

    // Scale and pad each input
    project.photos.forEach((photo, index) => {
      filters.push(
        `[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[v${index}]`
      );
    });

    // Add transitions between photos
    if (project.photos.length > 1) {
      let currentStream = 'v0';
      for (let i = 0; i < project.photos.length - 1; i++) {
        const nextStream = `v${i + 1}`;
        const outputStream = i === project.photos.length - 2 ? 'out' : `t${i}`;
        const transition = project.photos[i].transition || 'fade';
        const duration = 1; // 1 second transition

        filters.push(
          `[${currentStream}][${nextStream}]xfade=transition=${transition}:duration=${duration}:offset=${project.photos[i].duration - duration}[${outputStream}]`
        );

        currentStream = outputStream;
      }
    } else {
      filters.push('[v0]copy[out]');
    }

    return filters.join(';') + ';[out]format=yuv420p[outv]';
  },

  /**
   * Encode video (placeholder - FFmpeg removed)
   * TODO: Implement video encoding with alternative solution
   */
  encodeVideo: async (config: VideoEncoderConfig): Promise<EncodingResult> => {
    // FFmpeg has been removed due to library retirement
    // This is a placeholder that simulates encoding
    return new Promise((resolve) => {
      const totalDuration = videoEncoder.calculateDuration(config.project);
      const simulationTime = 3000; // 3 seconds simulation

      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        config.onProgress?.(progress);

        if (progress >= 100) {
          clearInterval(interval);
          resolve({
            success: false,
            error: 'Video encoding not available. FFmpeg library has been removed. Please use an alternative solution.',
          });
        }
      }, simulationTime / 10);
    });
  },

  /**
   * Cancel ongoing encoding
   */
  cancelEncoding: async () => {
    // Placeholder - FFmpeg removed
    console.log('Encoding cancellation not available');
  },

  /**
   * Get supported resolutions for quality
   */
  getSupportedResolutions: (quality: ExportQuality): ResolutionPreset[] => {
    if (quality === '4K') {
      return [ResolutionPreset.LANDSCAPE, ResolutionPreset.CINEMA];
    }
    return Object.values(ResolutionPreset);
  },
};
