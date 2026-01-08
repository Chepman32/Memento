import { Theme } from './theme.types';
import { TransitionType, ExportQuality } from './project.types';

export enum HapticStrength {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
}

export enum ExportLocation {
  PHOTOS = 'photos',
  FILES = 'files',
  ASK = 'ask',
}

export type LanguageCode =
  | 'en'
  | 'ru'
  | 'es'
  | 'sp'
  | 'de'
  | 'fr'
  | 'pt'
  | 'por'
  | 'ja'
  | 'jp'
  | 'zh'
  | 'zh-cn'
  | 'zh-hans'
  | 'ko'
  | 'uk'
  | 'ua'
  | 'it'
  | 'pl'
  | 'hi'
  | 'ar'
  | 'nl'
  | 'tr'
  | 'th'
  | 'vi'
  | 'id'
  | 'he'
  | 'sv'
  | 'no'
  | 'da'
  | 'fi'
  | 'cs'
  | 'hu'
  | 'ro'
  | 'el'
  | 'ms'
  | 'fil';

export interface AppSettings {
  theme: Theme;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  hapticStrength: HapticStrength;
  language: LanguageCode;
  defaultPhotoDuration: number;
  defaultTransition: TransitionType;
  defaultQuality: ExportQuality;
  cacheSize: number;
  exportLocation: ExportLocation;
}
