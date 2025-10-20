import { TransitionType } from '../types/project.types';

export interface TransitionConfig {
  id: TransitionType;
  name: string;
  description: string;
  duration: number; // milliseconds
  isPremium: boolean;
  category: 'basic' | 'slide' | '3d' | 'creative';
}

export const TRANSITIONS: Record<TransitionType, TransitionConfig> = {
  [TransitionType.FADE]: {
    id: TransitionType.FADE,
    name: 'Fade',
    description: 'Smooth crossfade between photos',
    duration: 500,
    isPremium: false,
    category: 'basic',
  },
  [TransitionType.SLIDE_LEFT]: {
    id: TransitionType.SLIDE_LEFT,
    name: 'Slide Left',
    description: 'Slide from right to left',
    duration: 600,
    isPremium: false,
    category: 'slide',
  },
  [TransitionType.SLIDE_RIGHT]: {
    id: TransitionType.SLIDE_RIGHT,
    name: 'Slide Right',
    description: 'Slide from left to right',
    duration: 600,
    isPremium: false,
    category: 'slide',
  },
  [TransitionType.SLIDE_UP]: {
    id: TransitionType.SLIDE_UP,
    name: 'Slide Up',
    description: 'Slide from bottom to top',
    duration: 600,
    isPremium: false,
    category: 'slide',
  },
  [TransitionType.SLIDE_DOWN]: {
    id: TransitionType.SLIDE_DOWN,
    name: 'Slide Down',
    description: 'Slide from top to bottom',
    duration: 600,
    isPremium: false,
    category: 'slide',
  },
  [TransitionType.ZOOM]: {
    id: TransitionType.ZOOM,
    name: 'Zoom',
    description: 'Zoom in/out effect',
    duration: 700,
    isPremium: false,
    category: 'basic',
  },
  [TransitionType.ROTATE]: {
    id: TransitionType.ROTATE,
    name: 'Rotate',
    description: '3D rotation effect',
    duration: 800,
    isPremium: true,
    category: '3d',
  },
  [TransitionType.CUBE]: {
    id: TransitionType.CUBE,
    name: 'Cube',
    description: '3D cube rotation',
    duration: 800,
    isPremium: true,
    category: '3d',
  },
  [TransitionType.FLIP]: {
    id: TransitionType.FLIP,
    name: 'Flip',
    description: 'Page flip effect',
    duration: 700,
    isPremium: true,
    category: '3d',
  },
  [TransitionType.DISSOLVE]: {
    id: TransitionType.DISSOLVE,
    name: 'Dissolve',
    description: 'Particle dissolve effect',
    duration: 900,
    isPremium: true,
    category: 'creative',
  },
  [TransitionType.BLUR]: {
    id: TransitionType.BLUR,
    name: 'Blur',
    description: 'Motion blur transition',
    duration: 600,
    isPremium: true,
    category: 'creative',
  },
  [TransitionType.WIPE_CIRCLE]: {
    id: TransitionType.WIPE_CIRCLE,
    name: 'Circle Wipe',
    description: 'Circular wipe pattern',
    duration: 700,
    isPremium: true,
    category: 'creative',
  },
  [TransitionType.PUSH]: {
    id: TransitionType.PUSH,
    name: 'Push',
    description: 'Push transition',
    duration: 600,
    isPremium: true,
    category: 'slide',
  },
};

export const FREE_TRANSITIONS = Object.values(TRANSITIONS).filter(t => !t.isPremium);
export const PREMIUM_TRANSITIONS = Object.values(TRANSITIONS).filter(t => t.isPremium);
