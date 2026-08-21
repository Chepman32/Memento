import { TransitionType } from '../src/types/project.types';
import {
  createTransitionVfxUniforms,
  getTransitionVfxMode,
  isTransitionVfx,
  TRANSITION_VFX_PARTICLE_SCALE,
  TRANSITION_VFX_PARTICLE_SIZES,
} from '../src/utils/transitionVfx';

describe('creative transition VFX routing', () => {
  it.each([
    [TransitionType.DISSOLVE, 0],
    [TransitionType.BLUR, 1],
    [TransitionType.WIPE_CIRCLE, 2],
    [TransitionType.PUSH, 3],
  ])('assigns %s its own shader mode', (transition, expectedMode) => {
    expect(isTransitionVfx(transition)).toBe(true);
    expect(getTransitionVfxMode(transition)).toBe(expectedMode);
  });

  it('does not route ordinary fades or zooms through the particle renderer', () => {
    expect(isTransitionVfx(TransitionType.FADE)).toBe(false);
    expect(isTransitionVfx(TransitionType.ZOOM)).toBe(false);
    expect(getTransitionVfxMode(TransitionType.ZOOM)).toBeNull();
    expect(getTransitionVfxMode(null)).toBeNull();
    expect(getTransitionVfxMode(undefined)).toBeNull();
  });

  it('builds safe shader uniforms and clamps timeline progress', () => {
    expect(
      createTransitionVfxUniforms(
        TransitionType.WIPE_CIRCLE,
        1.4,
        390,
        720,
        true,
      ),
    ).toEqual({
      effect: 2,
      progress: 1,
      resolution: { x: 390, y: 720 },
      entrance: 1,
    });

    expect(
      createTransitionVfxUniforms(
        TransitionType.DISSOLVE,
        -0.25,
        390,
        720,
        false,
      ).progress,
    ).toBe(0);

    expect(
      createTransitionVfxUniforms(
        TransitionType.BLUR,
        Number.NaN,
        0,
        -20,
        false,
      ),
    ).toEqual({
      effect: 1,
      progress: 0,
      resolution: { x: 1, y: 1 },
      entrance: 0,
    });
  });

  it('renders every particle at one fifth of its original size', () => {
    expect(TRANSITION_VFX_PARTICLE_SCALE).toBe(0.2);
    expect(TRANSITION_VFX_PARTICLE_SIZES).toEqual({
      dissolveStart: 4.4,
      dissolveEnd: 1.4,
      circleSparkInner: 0.2,
      circleSparkOuter: 1,
      pushSparkInner: 0.2,
      pushSparkOuter: 0.8,
    });
  });
});
