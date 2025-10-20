import { TransitionType } from '../types/project.types';
import { TRANSITIONS } from '../constants/transitions';

export interface TransitionParams {
  progress: number; // 0 to 1
  fromImageUri: string;
  toImageUri: string;
  width: number;
  height: number;
}

export interface TransitionResult {
  opacity: number;
  translateX: number;
  translateY: number;
  scale: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
}

/**
 * Calculate transition values for current progress
 */
export const calculateTransition = (
  type: TransitionType,
  progress: number
): { from: TransitionResult; to: TransitionResult } => {
  const fromResult: TransitionResult = {
    opacity: 1,
    translateX: 0,
    translateY: 0,
    scale: 1,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
  };

  const toResult: TransitionResult = {
    opacity: 1,
    translateX: 0,
    translateY: 0,
    scale: 1,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
  };

  switch (type) {
    case TransitionType.FADE:
      fromResult.opacity = 1 - progress;
      toResult.opacity = progress;
      break;

    case TransitionType.SLIDE_LEFT:
      fromResult.translateX = -progress * 100;
      toResult.translateX = (1 - progress) * 100;
      break;

    case TransitionType.SLIDE_RIGHT:
      fromResult.translateX = progress * 100;
      toResult.translateX = -(1 - progress) * 100;
      break;

    case TransitionType.SLIDE_UP:
      fromResult.translateY = -progress * 100;
      toResult.translateY = (1 - progress) * 100;
      break;

    case TransitionType.SLIDE_DOWN:
      fromResult.translateY = progress * 100;
      toResult.translateY = -(1 - progress) * 100;
      break;

    case TransitionType.ZOOM:
      fromResult.scale = 1 + progress;
      fromResult.opacity = 1 - progress;
      toResult.scale = 0.5 + progress * 0.5;
      toResult.opacity = progress;
      break;

    case TransitionType.ROTATE:
      fromResult.rotateY = progress * 90;
      fromResult.opacity = 1 - progress;
      toResult.rotateY = -90 + progress * 90;
      toResult.opacity = progress;
      break;

    case TransitionType.CUBE:
      if (progress < 0.5) {
        fromResult.rotateY = progress * 180;
        toResult.opacity = 0;
      } else {
        fromResult.opacity = 0;
        toResult.rotateY = (progress - 0.5) * 180 - 90;
      }
      break;

    case TransitionType.FLIP:
      fromResult.rotateX = progress * 180;
      fromResult.opacity = progress < 0.5 ? 1 : 0;
      toResult.rotateX = -180 + progress * 180;
      toResult.opacity = progress >= 0.5 ? 1 : 0;
      break;

    case TransitionType.DISSOLVE:
      // Particle dissolve - simplified here
      fromResult.opacity = 1 - progress;
      fromResult.scale = 1 - progress * 0.1;
      toResult.opacity = progress;
      toResult.scale = 0.9 + progress * 0.1;
      break;

    case TransitionType.BLUR:
      fromResult.opacity = 1 - progress;
      fromResult.translateX = -progress * 50;
      toResult.opacity = progress;
      toResult.translateX = (1 - progress) * 50;
      break;

    case TransitionType.WIPE_CIRCLE:
      fromResult.opacity = 1 - progress;
      fromResult.scale = 1 - progress;
      toResult.opacity = progress;
      toResult.scale = progress;
      break;

    case TransitionType.PUSH:
      fromResult.translateX = -progress * 100;
      toResult.translateX = -progress * 100 + 100;
      break;

    default:
      // Default to fade
      fromResult.opacity = 1 - progress;
      toResult.opacity = progress;
  }

  return { from: fromResult, to: toResult };
};

/**
 * Get transition configuration
 */
export const getTransitionConfig = (type: TransitionType) => {
  return TRANSITIONS[type];
};

/**
 * Check if transition is premium
 */
export const isTransitionPremium = (type: TransitionType): boolean => {
  return TRANSITIONS[type].isPremium;
};

/**
 * Get all available transitions for user
 */
export const getAvailableTransitions = (isPremium: boolean) => {
  return Object.values(TRANSITIONS).filter(
    (transition) => !transition.isPremium || isPremium
  );
};

/**
 * Easing functions
 */
export const easing = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
};
