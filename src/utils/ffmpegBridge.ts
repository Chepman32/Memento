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
): Promise<{ success: boolean; error?: string }> => {
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
            resolve({ success: true });
            return;
          }

          if (ReturnCode?.isCancel?.(returnCode)) {
            resolve({ success: false, error: 'cancelled' });
            return;
          }

          const failStack = await session.getFailStackTrace();
          const state = await session.getState();
          resolve({
            success: false,
            error:
              (failStack && failStack.toString()) ||
              `FFmpeg failed (state: ${state?.toString?.() ?? 'unknown'})`,
          });
        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      (log: any) => {
        if (params.logTag) {
          const message =
            typeof log?.getMessage === 'function' ? log.getMessage() : String(log);
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
