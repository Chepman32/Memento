import { TransitionType } from '../types/project.types';

const TRANSITION_VFX_MODES: Partial<Record<TransitionType, number>> = {
  [TransitionType.DISSOLVE]: 0,
  [TransitionType.BLUR]: 1,
  [TransitionType.WIPE_CIRCLE]: 2,
  [TransitionType.PUSH]: 3,
};

export const TRANSITION_VFX_PARTICLE_SCALE = 1 / 5;

export const TRANSITION_VFX_PARTICLE_SIZES = {
  dissolveStart: 22 / 5,
  dissolveEnd: 7 / 5,
  circleSparkInner: 1 / 5,
  circleSparkOuter: 5 / 5,
  pushSparkInner: 1 / 5,
  pushSparkOuter: 4 / 5,
} as const;

export interface TransitionVfxUniforms {
  [name: string]: number | { x: number; y: number };
  effect: number;
  progress: number;
  resolution: { x: number; y: number };
  entrance: number;
}

export const getTransitionVfxMode = (
  transition: TransitionType | null | undefined,
): number | null => {
  if (!transition) {
    return null;
  }

  return TRANSITION_VFX_MODES[transition] ?? null;
};

export const isTransitionVfx = (
  transition: TransitionType | null | undefined,
): boolean => getTransitionVfxMode(transition) !== null;

export const createTransitionVfxUniforms = (
  transition: TransitionType,
  progress: number,
  width: number,
  height: number,
  isEntrance: boolean,
): TransitionVfxUniforms => {
  const finiteProgress = Number.isFinite(progress) ? progress : 0;

  return {
    effect: getTransitionVfxMode(transition) ?? 0,
    progress: Math.min(Math.max(finiteProgress, 0), 1),
    resolution: {
      x: Math.max(width, 1),
      y: Math.max(height, 1),
    },
    entrance: isEntrance ? 1 : 0,
  };
};
