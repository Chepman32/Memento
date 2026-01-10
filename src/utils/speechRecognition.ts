import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { SpeechRecognitionModule } = NativeModules;

export interface SpeechRecognitionResult {
  text: string;
  isFinal: boolean;
}

export interface SpeechRecognitionError {
  error: string;
}

export interface PermissionsResult {
  speech: boolean;
  microphone: boolean;
}

const eventEmitter = SpeechRecognitionModule
  ? new NativeEventEmitter(SpeechRecognitionModule)
  : null;

class SpeechRecognition {
  private onResultsCallback: ((result: SpeechRecognitionResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor() {
    if (eventEmitter) {
      eventEmitter.addListener('onSpeechResults', (result: SpeechRecognitionResult) => {
        this.onResultsCallback?.(result);
      });

      eventEmitter.addListener('onSpeechError', (error: SpeechRecognitionError) => {
        this.onErrorCallback?.(error.error);
      });

      eventEmitter.addListener('onSpeechEnd', () => {
        this.onEndCallback?.();
      });
    }
  }

  async requestPermissions(): Promise<PermissionsResult> {
    if (!SpeechRecognitionModule) {
      return { speech: false, microphone: false };
    }
    try {
      return await SpeechRecognitionModule.requestPermissions();
    } catch (error) {
      console.error('[SpeechRecognition] Error requesting permissions:', error);
      return { speech: false, microphone: false };
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!SpeechRecognitionModule) {
      return false;
    }
    try {
      return await SpeechRecognitionModule.isAvailable();
    } catch (error) {
      console.error('[SpeechRecognition] Error checking availability:', error);
      return false;
    }
  }

  async startRecording(locale: string = 'en-US'): Promise<void> {
    if (!SpeechRecognitionModule) {
      throw new Error('Speech recognition module not available');
    }
    return SpeechRecognitionModule.startRecording(locale);
  }

  async stopRecording(): Promise<void> {
    if (!SpeechRecognitionModule) {
      throw new Error('Speech recognition module not available');
    }
    return SpeechRecognitionModule.stopRecording();
  }

  onResults(callback: (result: SpeechRecognitionResult) => void) {
    this.onResultsCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  onEnd(callback: () => void) {
    this.onEndCallback = callback;
  }

  cleanup() {
    if (eventEmitter) {
      eventEmitter.removeAllListeners('onSpeechResults');
      eventEmitter.removeAllListeners('onSpeechError');
      eventEmitter.removeAllListeners('onSpeechEnd');
    }
    this.onResultsCallback = null;
    this.onErrorCallback = null;
    this.onEndCallback = null;
  }
}

export const speechRecognition = new SpeechRecognition();
export default speechRecognition;
