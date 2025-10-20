import Sound from 'react-native-sound';
import { useSettingsStore } from '../store/settingsStore';

// Enable playback in silence mode
Sound.setCategory('Playback');

type SoundName = 'tap' | 'success' | 'error' | 'transition' | 'export_complete';

class SoundManager {
  private sounds: Map<SoundName, Sound> = new Map();
  private loaded: boolean = false;

  async preloadSounds(): Promise<void> {
    if (this.loaded) return;

    const soundFiles: Record<SoundName, string> = {
      tap: 'tap.mp3',
      success: 'success.mp3',
      error: 'error.mp3',
      transition: 'transition.mp3',
      export_complete: 'export_complete.mp3',
    };

    const loadPromises = Object.entries(soundFiles).map(
      ([name, filename]) =>
        new Promise<void>((resolve, reject) => {
          const sound = new Sound(filename, Sound.MAIN_BUNDLE, (error) => {
            if (error) {
              console.warn(`Failed to load sound ${name}:`, error);
              reject(error);
              return;
            }
            this.sounds.set(name as SoundName, sound);
            resolve();
          });
        })
    );

    try {
      await Promise.all(loadPromises);
      this.loaded = true;
    } catch (error) {
      console.error('Error preloading sounds:', error);
    }
  }

  playSound(name: SoundName): void {
    const { settings } = useSettingsStore.getState();
    if (!settings.soundEnabled) return;

    const sound = this.sounds.get(name);
    if (!sound) {
      console.warn(`Sound ${name} not loaded`);
      return;
    }

    sound.stop(() => {
      sound.play((success) => {
        if (!success) {
          console.warn(`Failed to play sound ${name}`);
        }
      });
    });
  }

  stopAllSounds(): void {
    this.sounds.forEach((sound) => {
      sound.stop();
    });
  }

  release(): void {
    this.sounds.forEach((sound) => {
      sound.release();
    });
    this.sounds.clear();
    this.loaded = false;
  }
}

export const soundManager = new SoundManager();

export const sounds = {
  tap: () => soundManager.playSound('tap'),
  success: () => soundManager.playSound('success'),
  error: () => soundManager.playSound('error'),
  transition: () => soundManager.playSound('transition'),
  exportComplete: () => soundManager.playSound('export_complete'),
  preload: () => soundManager.preloadSounds(),
  stopAll: () => soundManager.stopAllSounds(),
};
