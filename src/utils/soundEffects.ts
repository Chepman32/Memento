import Sound from 'react-native-sound';
import { useSettingsStore } from '../store/settingsStore';

// Enable playback in silence mode
Sound.setCategory('Playback');

type SoundName = 'tap' | 'success' | 'error' | 'transition' | 'export_complete';

type SoundConfig = {
  source: string;
  basePath?: string;
};

class SoundManager {
  private sounds: Map<SoundName, Sound> = new Map();
  private loaded: boolean = false;
  private missingSounds = new Set<SoundName>();

  // Only export_complete is currently provided by the app assets
  private soundConfigs: Partial<Record<SoundName, SoundConfig>> = {
    export_complete: {
      source: 'success_fanfare_trumpets',
      basePath: Sound.MAIN_BUNDLE,
    },
  };

  private getSoundConfig(name: SoundName): SoundConfig | undefined {
    const config = this.soundConfigs[name];
    if (!config && !this.missingSounds.has(name)) {
      this.missingSounds.add(name);
      console.warn(`Sound ${name} is not configured`);
    }
    return config;
  }

  private loadSound(
    name: SoundName,
    config?: SoundConfig,
  ): Promise<Sound | null> {
    const soundConfig = config ?? this.getSoundConfig(name);
    if (!soundConfig) {
      return Promise.resolve(null);
    }

    const source = soundConfig.source;

    if (!source) {
      console.warn(`Sound ${name} source could not be resolved`);
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      const sound = new Sound(
        source,
        soundConfig.basePath || '',
        error => {
          if (error) {
            console.warn(`Failed to load sound ${name}:`, error);
            reject(error);
            return;
          }
          this.sounds.set(name, sound);
          resolve(sound);
        },
      );
    });
  }

  async preloadSounds(): Promise<void> {
    if (this.loaded) return;

    const entries = Object.entries(this.soundConfigs) as [
      SoundName,
      SoundConfig,
    ][];

    if (!entries.length) return;

    try {
      await Promise.all(
        entries.map(([name, config]) => this.loadSound(name, config)),
      );
      this.loaded = true;
    } catch (error) {
      console.error('Error preloading sounds:', error);
    }
  }

  private playLoadedSound(name: SoundName, sound: Sound) {
    sound.stop(() => {
      sound.play(success => {
        if (!success) {
          console.warn(`Failed to play sound ${name}`);
        }
      });
    });
  }

  playSound(name: SoundName): void {
    const { settings } = useSettingsStore.getState();
    if (!settings.soundEnabled) return;

    const sound = this.sounds.get(name);
    if (sound) {
      this.playLoadedSound(name, sound);
      return;
    }

    this.loadSound(name)
      .then(loadedSound => {
        if (loadedSound) {
          this.playLoadedSound(name, loadedSound);
        }
      })
      .catch(error => {
        console.error(`Error loading sound ${name}:`, error);
      });
  }

  stopAllSounds(): void {
    this.sounds.forEach(sound => {
      sound.stop();
    });
  }

  release(): void {
    this.sounds.forEach(sound => {
      sound.release();
    });
    this.sounds.clear();
    this.loaded = false;
    this.missingSounds.clear();
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
