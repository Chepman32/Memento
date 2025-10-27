declare module 'ffmpeg-kit-react-native' {
  export interface Statistics {
    getTime(): number;
  }

  export class ReturnCode {
    static isSuccess(returnCode: ReturnCode | null): boolean;
    static isCancel(returnCode: ReturnCode | null): boolean;
  }

  export class FFmpegSession {
    getReturnCode(): Promise<ReturnCode | null>;
    getFailStackTrace(): Promise<string | null>;
    getState(): Promise<unknown>;
    cancel(): Promise<void>;
  }

  export class FFmpegKitConfig {
    static enableStatisticsCallback(
      callback: ((statistics: Statistics) => void) | null
    ): void;
    static disableStatisticsCallback?(): void;
  }

  export class FFmpegKit {
    static executeAsync(
      command: string,
      completeCallback: (session: FFmpegSession) => void,
      logCallback?: (log: unknown) => void,
      statisticsCallback?: (statistics: Statistics) => void
    ): Promise<FFmpegSession>;
  }
}
