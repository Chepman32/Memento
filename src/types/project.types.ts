export enum TransitionType {
  FADE = 'fade',
  SLIDE_LEFT = 'slideLeft',
  SLIDE_RIGHT = 'slideRight',
  SLIDE_UP = 'slideUp',
  SLIDE_DOWN = 'slideDown',
  ZOOM = 'zoom',
  ROTATE = 'rotate',
  CUBE = 'cube',
  FLIP = 'flip',
  DISSOLVE = 'dissolve',
  BLUR = 'blur',
  WIPE_CIRCLE = 'wipeCircle',
  PUSH = 'push',
}

export enum PhotoEffect {
  KEN_BURNS = 'kenBurns',
  VIGNETTE = 'vignette',
  SEPIA = 'sepia',
  BLACK_WHITE = 'blackWhite',
  VINTAGE = 'vintage',
  FILM_GRAIN = 'filmGrain',
  COLOR_POP = 'colorPop',
  LIGHT_LEAK = 'lightLeak',
}

export enum ExportQuality {
  LOW = '720p',
  MEDIUM = '1080p',
  HIGH = '4K',
}

export enum ResolutionPreset {
  SQUARE = '1:1',
  PORTRAIT = '9:16',
  LANDSCAPE = '16:9',
  CINEMA = '21:9',
}

export interface Photo {
  id: string;
  uri: string;
  width: number;
  height: number;
  duration: number;
  transition: TransitionType; // Deprecated - kept for backward compatibility
  effects: PhotoEffect[];
  order: number;
  caption?: PhotoCaption;
}

export interface PhotoCaption {
  text: string;
  style: CaptionStyle;
}

export interface CaptionStyle {
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  position: CaptionPosition;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  padding: number;
  maxWidth: number;
  offsetX: number; // percentage offset from center (-50 to 50)
  offsetY: number; // percentage offset from base position (-50 to 50)
}

export enum CaptionPosition {
  TOP = 'top',
  CENTER = 'center',
  BOTTOM = 'bottom',
}

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  fontSize: 24,
  fontColor: '#FFFFFF',
  backgroundColor: '#00000080',
  position: CaptionPosition.BOTTOM,
  fontWeight: 'normal',
  textAlign: 'center',
  padding: 12,
  maxWidth: 90,
  offsetX: 0,
  offsetY: 0,
};

export interface Transition {
  id: string;
  type: TransitionType;
  duration: number; // Transition duration in seconds (e.g., 0.5s, 1s)
  order: number; // Position on timeline
}

export type TimelineItem =
  | { type: 'photo'; data: Photo }
  | { type: 'transition'; data: Transition };

export interface MusicTrack {
  id: string;
  title: string;
  uri: string;
  duration: number;
  category: 'cinematic' | 'upbeat' | 'chill' | 'romantic';
}

export interface ProjectSettings {
  defaultDuration: number;
  defaultTransition: TransitionType;
  music?: MusicTrack;
  exportQuality: ExportQuality;
  resolution: ResolutionPreset;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Project {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  photos: Photo[];
  transitions: Transition[]; // Separate transitions array
  settings: ProjectSettings;
  thumbnail: string;
  duration: number;
  folderId?: string | null;
}
