import { TRANSITIONS } from '../constants/transitions';
import { executeFfmpeg, cancelActiveFfmpeg } from './ffmpegBridge';
import {
  ExportQuality,
  Project,
  ResolutionPreset,
  Transition,
  TransitionType,
} from '../types/project.types';

export interface VideoEncoderConfig {
  project: Project;
  outputPath: string;
  quality: ExportQuality;
  resolution: ResolutionPreset;
  includeWatermark?: boolean;
  onProgress?: (progress: number) => void;
  fps?: number;
}

export interface EncodingResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  duration?: number;
}

export interface PhotoSegment {
  type: 'photo';
  index: number;
  id: string;
  uri: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  transitionOutDurationMs: number;
}

export interface TransitionSegment {
  type: 'transition';
  fromIndex: number;
  toIndex: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  transition: {
    type: TransitionType;
    durationMs: number;
  };
  isEntrance?: boolean;
}

export type TimelineSegment = PhotoSegment | TransitionSegment;

export interface TimelineDescription {
  photoSegments: PhotoSegment[];
  transitionSegments: TransitionSegment[];
  segments: TimelineSegment[];
  totalDurationMs: number;
}

const QUALITY_BITRATES: Record<ExportQuality, string> = {
  '720p': '2M',
  '1080p': '5M',
  '4K': '20M',
};

const RESOLUTION_DIMENSIONS: Record<ResolutionPreset, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '21:9': { width: 2560, height: 1080 },
};

const DEFAULT_TRANSITION_DURATION_MS = 600;
const MIN_TRANSITION_DURATION_MS = 100;
const FALLBACK_PHOTO_DURATION_SECONDS = 3;

const FFMPEG_TRANSITION_MAP: Partial<Record<TransitionType, string>> = {
  [TransitionType.FADE]: 'fade',
  [TransitionType.SLIDE_LEFT]: 'slideleft',
  [TransitionType.SLIDE_RIGHT]: 'slideright',
  [TransitionType.SLIDE_UP]: 'slideup',
  [TransitionType.SLIDE_DOWN]: 'slidedown',
  [TransitionType.ZOOM]: 'zoom',
  [TransitionType.DISSOLVE]: 'dissolve',
  [TransitionType.WIPE_CIRCLE]: 'circleopen',
  [TransitionType.PUSH]: 'smoothleft',
  [TransitionType.BLUR]: 'fade',
  [TransitionType.CUBE]: 'fade',
  [TransitionType.FLIP]: 'fade',
  [TransitionType.ROTATE]: 'fade',
};

const coercePositiveNumber = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return numeric;
};

const getDefaultPhotoDurationSeconds = (project: Project) => {
  return coercePositiveNumber(project.settings?.defaultDuration, FALLBACK_PHOTO_DURATION_SECONDS);
};

const resolveTransitionDurationMs = (transition: Transition | undefined | null): number => {
  if (!transition) {
    return 0;
  }

  const rawDuration = Number(transition.duration);

  if (Number.isFinite(rawDuration) && rawDuration > 0) {
    if (rawDuration > 5) {
      return rawDuration;
    }
    return rawDuration * 1000;
  }

  return DEFAULT_TRANSITION_DURATION_MS;
};

// Get entrance transition for a photo (transition BEFORE the photo)
const findEntranceTransitionForPhoto = (project: Project, photoIndex: number): { type: TransitionType; durationMs: number } | null => {
  // The entrance transition for photo at index i is stored at transition.order = i
  const explicit = project.transitions?.find(t => t.order === photoIndex);

  if (!explicit?.type) {
    return null;
  }

  const durationMs = resolveTransitionDurationMs(explicit);

  return {
    type: explicit.type,
    durationMs: durationMs > 0 ? durationMs : DEFAULT_TRANSITION_DURATION_MS,
  };
};

// Get transition between two photos
const findTransitionBetweenPhotos = (project: Project, fromIndex: number, toIndex: number): { type: TransitionType; durationMs: number } | null => {
  // Transition between photos is stored at the toIndex
  // e.g., transition between photo 0 and photo 1 is at transition.order = 1
  const explicit = project.transitions?.find(t => t.order === toIndex);

  const transitionType =
    explicit?.type ??
    project.photos[fromIndex]?.transition ??
    project.settings?.defaultTransition;

  if (!transitionType) {
    return null;
  }

  let durationMs: number;

  if (explicit) {
    durationMs = resolveTransitionDurationMs(explicit);
  } else if (TRANSITIONS[transitionType]?.duration) {
    durationMs = TRANSITIONS[transitionType].duration;
  } else {
    durationMs = DEFAULT_TRANSITION_DURATION_MS;
  }

  return {
    type: transitionType,
    durationMs: durationMs > 0 ? durationMs : DEFAULT_TRANSITION_DURATION_MS,
  };
};

const clampTransitionDuration = (
  desiredDurationMs: number,
  currentPhotoDurationMs: number,
  nextPhotoDurationMs: number
) => {
  if (desiredDurationMs <= 0) {
    return 0;
  }

  const maxPossible = Math.min(currentPhotoDurationMs, nextPhotoDurationMs);
  const clamped = Math.min(desiredDurationMs, maxPossible);

  return Math.max(0, clamped);
};

const mapTransitionToFfmpeg = (transition: TransitionType): string => {
  return FFMPEG_TRANSITION_MAP[transition] ?? 'fade';
};

const toSeconds = (ms: number) => ms / 1000;

const formatSeconds = (seconds: number) =>
  seconds
    .toFixed(3)
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '');

export const buildTimeline = (project: Project): TimelineDescription => {
  if (!project || !project.photos.length) {
    return {
      photoSegments: [],
      transitionSegments: [],
      segments: [],
      totalDurationMs: 0,
    };
  }

  const defaultDurationSeconds = getDefaultPhotoDurationSeconds(project);
  const photoSegments: PhotoSegment[] = [];
  const transitionSegments: TransitionSegment[] = [];
  const segments: TimelineSegment[] = [];

  const normalizedDurations = project.photos.map(photo =>
    coercePositiveNumber(photo.duration, defaultDurationSeconds) * 1000
  );

  // Handle optional entrance transition for the very first photo
  if (project.photos.length > 0) {
    const entranceTransition = findEntranceTransitionForPhoto(project, 0);
    if (entranceTransition) {
      const firstPhotoDurationMs = Math.max(100, normalizedDurations[0]);
      let entranceDurationMs = clampTransitionDuration(
        entranceTransition.durationMs,
        firstPhotoDurationMs,
        firstPhotoDurationMs
      );

      if (entranceDurationMs > 0 && entranceDurationMs < MIN_TRANSITION_DURATION_MS) {
        entranceDurationMs = MIN_TRANSITION_DURATION_MS;
      }

      entranceDurationMs = Math.min(entranceDurationMs, firstPhotoDurationMs);

      if (entranceDurationMs > 0) {
        const entranceSegment: TransitionSegment = {
          type: 'transition',
          fromIndex: -1,
          toIndex: 0,
          startMs: 0,
          endMs: entranceDurationMs,
          durationMs: entranceDurationMs,
          transition: {
            type: entranceTransition.type,
            durationMs: entranceDurationMs,
          },
          isEntrance: true,
        };

        transitionSegments.push(entranceSegment);
        segments.push(entranceSegment);
      }
    }
  }

  let timelineCursorMs = 0;

  project.photos.forEach((photo, index) => {
    const durationMs = Math.max(100, normalizedDurations[index]);
    const startMs = timelineCursorMs;
    const endMs = startMs + durationMs;

    const nextPhotoExists = index < project.photos.length - 1;
    const rawTransition = nextPhotoExists ? findTransitionBetweenPhotos(project, index, index + 1) : null;

    let transitionDurationMs = 0;

    if (rawTransition && nextPhotoExists) {
      const nextDurationMs = Math.max(100, normalizedDurations[index + 1]);
      transitionDurationMs = clampTransitionDuration(rawTransition.durationMs, durationMs, nextDurationMs);

      if (transitionDurationMs > 0 && transitionDurationMs < MIN_TRANSITION_DURATION_MS) {
        transitionDurationMs = MIN_TRANSITION_DURATION_MS;
      }

      if (transitionDurationMs > durationMs) {
        transitionDurationMs = durationMs;
      }
    }

    const photoSegment: PhotoSegment = {
      type: 'photo',
      index,
      id: photo.id,
      uri: photo.uri,
      startMs,
      endMs,
      durationMs,
      transitionOutDurationMs: transitionDurationMs,
    };

    photoSegments.push(photoSegment);
    segments.push(photoSegment);

    if (rawTransition && transitionDurationMs > 0 && nextPhotoExists) {
      const transitionStartMs = Math.max(startMs, endMs - transitionDurationMs);
      const transitionSegment: TransitionSegment = {
        type: 'transition',
        fromIndex: index,
        toIndex: index + 1,
        startMs: transitionStartMs,
        endMs: transitionStartMs + transitionDurationMs,
        durationMs: transitionDurationMs,
        transition: {
          type: rawTransition.type,
          durationMs: transitionDurationMs,
        },
      };

      transitionSegments.push(transitionSegment);
      segments.push(transitionSegment);

      timelineCursorMs = endMs - transitionDurationMs;
    } else {
      timelineCursorMs = endMs;
    }
  });

  const totalDurationMs = photoSegments.length
    ? photoSegments[photoSegments.length - 1].endMs
    : 0;

  return {
    photoSegments,
    transitionSegments,
    segments,
    totalDurationMs,
  };
};

export const videoEncoder = {
  buildTimeline,

  calculateDuration: (project: Project): number => {
    const timeline = buildTimeline(project);
    return toSeconds(timeline.totalDurationMs);
  },

  generateFrameList: (project: Project, fps: number = 30): string[] => {
    const timeline = buildTimeline(project);
    const frames: string[] = [];

    timeline.photoSegments.forEach(segment => {
      const frameCount = Math.max(1, Math.round((segment.durationMs / 1000) * fps));
      for (let i = 0; i < frameCount; i += 1) {
        frames.push(segment.uri);
      }
    });

    return frames;
  },

  buildFFmpegCommand: (config: VideoEncoderConfig): string => {
    const { project, outputPath, quality, resolution } = config;
    const timeline = buildTimeline(project);

    if (!timeline.photoSegments.length) {
      throw new Error('Cannot build FFmpeg command: project has no photos.');
    }

    const dimensions = RESOLUTION_DIMENSIONS[resolution];
    const bitrate = QUALITY_BITRATES[quality];
    const fps = config.fps ?? (quality === '4K' ? 60 : 30);

    // Check if there's an entrance transition for the first photo
    const firstPhotoEntranceTransition = findEntranceTransitionForPhoto(project, 0);
    let hasBlackFrame = false;
    let blackFrameDuration = 0;

    let inputs = '';

    // Add black frame if there's an entrance transition
    if (firstPhotoEntranceTransition) {
      hasBlackFrame = true;
      blackFrameDuration = firstPhotoEntranceTransition.durationMs / 1000;
      inputs = `-f lavfi -t ${formatSeconds(blackFrameDuration)} -i color=c=black:s=${dimensions.width}x${dimensions.height} `;
    }

    // Add photo inputs
    inputs += timeline.photoSegments
      .map((segment, index) => {
        const seconds = formatSeconds(segment.durationMs / 1000);
        // Remove file:// prefix for FFmpeg
        const cleanUri = segment.uri.replace(/^file:\/\//, '');
        return `-loop 1 -t ${seconds} -i "${cleanUri}"`;
      })
      .join(' ');

    const filters: string[] = [];

    // Adjust input indices if we have a black frame
    const inputOffset = hasBlackFrame ? 1 : 0;

    // Scale all inputs (including black frame if present)
    if (hasBlackFrame) {
      filters.push(`[0:v]setsar=1[vblack]`);
    }

    timeline.photoSegments.forEach((segment, index) => {
      const inputIndex = index + inputOffset;
      filters.push(
        `[${inputIndex}:v]scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=decrease,pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${index}]`
      );
    });

    let finalLabel = 'v0';
    let cumulativeSeconds = 0;

    // Apply entrance transition if we have a black frame
    if (hasBlackFrame && firstPhotoEntranceTransition) {
      const ffmpegTransition = mapTransitionToFfmpeg(firstPhotoEntranceTransition.type);
      filters.push(
        `[vblack][v0]xfade=transition=${ffmpegTransition}:duration=${formatSeconds(
          blackFrameDuration
        )}:offset=0[ventry]`
      );
      finalLabel = 'ventry';
      cumulativeSeconds = timeline.photoSegments[0].durationMs / 1000;
    } else {
      cumulativeSeconds = timeline.photoSegments[0].durationMs / 1000;
    }

    if (timeline.photoSegments.length > 1) {
      const transitionsByIndex = new Map<number, TransitionSegment>(
        timeline.transitionSegments.map(segment => [segment.fromIndex, segment])
      );

      let currentLabel = finalLabel;

      timeline.photoSegments.slice(0, -1).forEach((_, index) => {
        const nextLabel = `v${index + 1}`;
        const transition = transitionsByIndex.get(index);

        const transitionDurationSeconds = transition
          ? Math.max(transition.durationMs / 1000, 0.01)
          : 0.01;

        const ffmpegTransition = transition
          ? mapTransitionToFfmpeg(transition.transition.type)
          : 'fade';

        const offsetSeconds = Math.max(cumulativeSeconds - (transition ? transition.durationMs / 1000 : 0), 0);
        const outputLabel =
          index === timeline.photoSegments.length - 2 ? 'xfinal' : `xf${index}`;

        filters.push(
          `[${currentLabel}][${nextLabel}]xfade=transition=${ffmpegTransition}:duration=${formatSeconds(
            transitionDurationSeconds
          )}:offset=${formatSeconds(offsetSeconds)}[${outputLabel}]`
        );

        cumulativeSeconds = offsetSeconds + timeline.photoSegments[index + 1].durationMs / 1000;
        currentLabel = outputLabel;
        finalLabel = outputLabel;
      });
    }

    filters.push(`[${finalLabel}]format=yuv420p[outv]`);

    const filterComplex = filters.join(';');

    // Use h264_videotoolbox (hardware encoder) instead of libx264 on iOS
    return (
      `${inputs} ` +
      `-filter_complex "${filterComplex}" ` +
      `-map "[outv]" ` +
      `-c:v h264_videotoolbox -b:v ${bitrate} -pix_fmt yuv420p ` +
      `-r ${fps} -movflags +faststart -y "${outputPath}"`
    )
      .replace(/\s+/g, ' ')
      .trim();
  },

  encodeVideo: async (config: VideoEncoderConfig): Promise<EncodingResult> => {
    const timeline = buildTimeline(config.project);

    if (!timeline.photoSegments.length) {
      return {
        success: false,
        error: 'Cannot export: the project has no photos.',
        duration: 0,
      };
    }

    let command: string;

    try {
      command = videoEncoder.buildFFmpegCommand(config);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to build export command.',
        duration: toSeconds(timeline.totalDurationMs),
      };
    }

    const execution = await executeFfmpeg({
      command,
      estimatedDurationMs: Math.max(timeline.totalDurationMs, 1000),
      onProgress: progress => {
        if (config.onProgress) {
          config.onProgress(Math.min(progress, 99.9));
        }
      },
      logTag: 'FFmpeg-Video',
    });

    if (!execution.success) {
      return {
        success: false,
        error: execution.error ?? 'Video export failed.',
        duration: toSeconds(timeline.totalDurationMs),
      };
    }

    config.onProgress?.(100);

    return {
      success: true,
      outputPath: config.outputPath,
      duration: toSeconds(timeline.totalDurationMs),
    };
  },

  cancelEncoding: async () => {
    await cancelActiveFfmpeg();
  },

  getSupportedResolutions: (quality: ExportQuality): ResolutionPreset[] => {
    if (quality === '4K') {
      return [ResolutionPreset.LANDSCAPE, ResolutionPreset.CINEMA];
    }
    return Object.values(ResolutionPreset);
  },
};

export default videoEncoder;
