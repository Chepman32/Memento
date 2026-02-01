import type { Statistics } from 'ffmpeg-kit-react-native';

type FfmpegKitModule = {
  FFmpegKit: any;
  FFmpegKitConfig: any;
  ReturnCode: any;
};

interface ExecuteFfmpegParams {
  command: string;
  estimatedDurationMs?: number;
  onProgress?: (progress: number) => void;
  logTag?: string;
}

let cachedModule: FfmpegKitModule | null = null;
let activeSession: any | null = null;

const loadModule = (): FfmpegKitModule => {
  if (cachedModule) {
    return cachedModule;
  }

  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const module = require('ffmpeg-kit-react-native');
    cachedModule = {
      FFmpegKit: module.FFmpegKit,
      FFmpegKitConfig: module.FFmpegKitConfig,
      ReturnCode: module.ReturnCode,
    };
    return cachedModule;
  } catch (error) {
    throw new Error(
      'ffmpeg-kit-react-native is not installed. Please add it to your project to enable exporting.'
    );
  }
};

export interface FFmpegAvailability {
  available: boolean;
  error?: string;
}

let ffmpegAvailabilityCache: FFmpegAvailability | null = null;

export const isFFmpegAvailable = (): FFmpegAvailability => {
  if (ffmpegAvailabilityCache) {
    return ffmpegAvailabilityCache;
  }

  try {
    loadModule();
    ffmpegAvailabilityCache = { available: true };
  } catch (error) {
    ffmpegAvailabilityCache = {
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return ffmpegAvailabilityCache;
};

const clampProgress = (value: number) => {
  if (Number.isNaN(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
};

const disableStatisticsCallback = (FFmpegKitConfig: any) => {
  if (typeof FFmpegKitConfig?.disableStatisticsCallback === 'function') {
    FFmpegKitConfig.disableStatisticsCallback();
  } else if (typeof FFmpegKitConfig?.enableStatisticsCallback === 'function') {
    FFmpegKitConfig.enableStatisticsCallback(() => {});
  }
};

export const executeFfmpeg = async (
  params: ExecuteFfmpegParams
): Promise<{ success: boolean; error?: string; logs?: string[] }> => {
  let module: FfmpegKitModule;

  try {
    module = loadModule();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const { FFmpegKit, FFmpegKitConfig, ReturnCode } = module;
  const logs: string[] = [];

  params.onProgress?.(0);

  return new Promise(resolve => {
    if (
      params.estimatedDurationMs &&
      params.estimatedDurationMs > 0 &&
      typeof FFmpegKitConfig?.enableStatisticsCallback === 'function'
    ) {
      FFmpegKitConfig.enableStatisticsCallback((statistics: Statistics) => {
        const timeMs = statistics?.getTime?.() ?? 0;
        const ratio = timeMs / params.estimatedDurationMs!;
        params.onProgress?.(clampProgress(ratio * 100));
      });
    } else if (typeof FFmpegKitConfig?.enableStatisticsCallback === 'function') {
      FFmpegKitConfig.enableStatisticsCallback(() => {});
    }

    FFmpegKit.executeAsync(
      params.command,
      async (session: any) => {
        disableStatisticsCallback(FFmpegKitConfig);
        activeSession = null;

        try {
          const returnCode = await session.getReturnCode();

          if (ReturnCode?.isSuccess?.(returnCode)) {
            params.onProgress?.(100);
            resolve({ success: true, logs });
            return;
          }

          if (ReturnCode?.isCancel?.(returnCode)) {
            resolve({ success: false, error: 'cancelled', logs });
            return;
          }

          const failStack = await session.getFailStackTrace();
          const state = await session.getState();
          const lastLogs = logs.slice(-20).join('\n'); // Last 20 log lines for context
          resolve({
            success: false,
            error:
              (failStack && failStack.toString()) ||
              `FFmpeg failed (state: ${state?.toString?.() ?? 'unknown'})\n\nLogs:\n${lastLogs}`,
            logs,
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            logs,
          });
        }
      },
      (log: any) => {
        const message =
          typeof log?.getMessage === 'function' ? log.getMessage() : String(log);
        logs.push(message);
        if (params.logTag) {
          console.log(`[${params.logTag}] ${message}`);
        }
      }
    )
      .then((session: any) => {
        activeSession = session;
      })
      .catch((error: unknown) => {
        disableStatisticsCallback(FFmpegKitConfig);
        activeSession = null;
        resolve({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          logs,
        });
      });
  });
};

export const cancelActiveFfmpeg = async () => {
  if (activeSession && typeof activeSession.cancel === 'function') {
    try {
      await activeSession.cancel();
    } catch (error) {
      console.warn('[FFmpeg] Failed to cancel session', error);
    }
  }
  activeSession = null;
};
