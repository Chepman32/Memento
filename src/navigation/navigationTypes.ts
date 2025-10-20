export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  ImageSelection: undefined;
  Editor: { photos: string[] };
  Preview: { projectId: string };
  Export: { projectId: string };
  Settings: undefined;
  Paywall: undefined;
};

export type TransitionType =
  | 'fade'
  | 'slideLeft'
  | 'slideRight'
  | 'slideUp'
  | 'slideDown'
  | 'zoom'
  | 'rotate'
  | 'cube'
  | 'flip'
  | 'dissolve'
  | 'blur'
  | 'wipeCircle'
  | 'push';

export type PhotoEffect =
  | 'kenBurns'
  | 'vignette'
  | 'sepia'
  | 'blackWhite'
  | 'vintage'
  | 'filmGrain';

export interface Photo {
  id: string;
  uri: string;
  width: number;
  height: number;
  duration: number;
  transition: TransitionType;
  effects: PhotoEffect[];
  order: number;
}

export interface ProjectSettings {
  defaultDuration: number;
  defaultTransition: TransitionType;
  music?: string;
  exportQuality: '720p' | '1080p' | '4K';
  resolution: '1:1' | '9:16' | '16:9' | '21:9';
}

export interface Project {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  photos: Photo[];
  settings: ProjectSettings;
  thumbnail: string;
  duration: number;
}
