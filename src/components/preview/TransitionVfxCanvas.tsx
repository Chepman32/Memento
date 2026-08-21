import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
  SkImage,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { TransitionType } from '../../types/project.types';
import {
  getTransitionVfxMode,
  TRANSITION_VFX_PARTICLE_SIZES,
  type TransitionVfxUniforms,
} from '../../utils/transitionVfx';
import { getContainedImageRect } from '../../utils/previewImageGeometry';
import { PREVIEW_IMAGE_SAMPLING } from '../../utils/previewImageSampling';

interface TransitionVfxCanvasProps {
  outgoingImage: SkImage;
  incomingImage: SkImage;
  transition: TransitionType;
  progress: SharedValue<number>;
  width: number;
  height: number;
  isEntrance: boolean;
}

// These budgets are deliberately small enough for mid-range mobile GPUs.
export const BLUR_TEXTURE_SAMPLE_BUDGET = 6;
export const PUSH_TEXTURE_SAMPLE_BUDGET = 4;

const TRANSITION_VFX_SHADER = `
uniform shader outgoing;
uniform shader incoming;
uniform float progress;
uniform float2 resolution;
uniform float effect;
uniform float entrance;

float hash21(float2 point) {
  point = fract(point * float2(123.34, 345.45));
  point += dot(point, point + 34.345);
  return fract(point.x * point.y);
}

half4 opaqueFrame(half4 color) {
  return half4(color.rgb, 1.0);
}

half4 main(float2 xy) {
  const float PI = 3.14159265;
  float p = clamp(progress, 0.0, 1.0);
  float eased = p * p * (3.0 - 2.0 * p);
  half4 black = half4(0.0, 0.0, 0.0, 1.0);

  // Make both compositor handoffs pixel-exact instead of leaving a residual
  // glow, blur tap, or particle contribution on the boundary frame.
  if (p <= 0.001) {
    return entrance > 0.5 ? black : opaqueFrame(outgoing.eval(xy));
  }
  if (p >= 0.999) {
    return opaqueFrame(incoming.eval(xy));
  }

  // Pixel-particle dissolve with a bright, irregular breakup edge.
  if (effect < 0.5) {
    half4 fromColor = entrance > 0.5
      ? black
      : opaqueFrame(outgoing.eval(xy));
    half4 toColor = opaqueFrame(incoming.eval(xy));
    float blockSize = mix(
      ${TRANSITION_VFX_PARTICLE_SIZES.dissolveStart},
      ${TRANSITION_VFX_PARTICLE_SIZES.dissolveEnd},
      eased
    );
    float2 cell = floor(xy / blockSize);
    float noise = hash21(cell);
    float sweep =
      ((xy.x / resolution.x) - 0.5) * 0.12 +
      ((xy.y / resolution.y) - 0.5) * 0.08;
    float threshold = eased * 1.36 - 0.18 + sweep;
    float reveal = smoothstep(noise - 0.075, noise + 0.075, threshold);
    float edge = 1.0 - smoothstep(0.0, 0.09, abs(threshold - noise));
    float2 tilePosition = fract(xy / blockSize) - 0.5;
    float shard = 1.0 - smoothstep(0.16, 0.48, length(tilePosition));
    float twinkle = 0.45 + 0.55 * hash21(cell + float2(19.7, 7.1));

    half4 color = mix(fromColor, toColor, half(reveal));
    color.rgb += half3(0.08, 0.42, 0.92) * half(edge * shard * twinkle);
    return color;
  }

  // Six texture reads total: three taps per image, plus procedural streaks.
  if (effect < 1.5) {
    float blurAmount = sin(p * PI) * 26.0;
    float2 blurVector = float2(blurAmount, blurAmount * 0.16);

    half4 fromBlur = black;
    if (entrance < 0.5) {
      fromBlur = opaqueFrame(
        outgoing.eval(xy - blurVector) * 0.22 +
        outgoing.eval(xy) * 0.56 +
        outgoing.eval(xy + blurVector) * 0.22
      );
    }
    half4 toBlur = opaqueFrame(
      incoming.eval(xy - blurVector) * 0.22 +
      incoming.eval(xy) * 0.56 +
      incoming.eval(xy + blurVector) * 0.22
    );

    half4 color = mix(fromBlur, toBlur, half(eased));
    float chromaPulse = sin(p * PI) * 0.045;
    color.r += half(chromaPulse * (1.0 - eased));
    color.b += half(chromaPulse * eased);

    float2 streakCell = floor(xy / float2(48.0, 8.0));
    float streakSeed = hash21(streakCell);
    float streakShape = 1.0 - smoothstep(
      0.0,
      0.46,
      abs(fract(xy.x / 48.0) - 0.5)
    );
    float streak = step(0.88, streakSeed) * streakShape * sin(p * PI);
    color.rgb += half3(0.08, 0.22, 0.48) * half(streak * 0.75);
    return color;
  }

  // True circular reveal with a luminous ring and orbiting spark particles.
  if (effect < 2.5) {
    half4 fromColor = entrance > 0.5
      ? black
      : opaqueFrame(outgoing.eval(xy));
    half4 toColor = opaqueFrame(incoming.eval(xy));
    float2 center = resolution * 0.5;
    float maxRadius = length(center) + 24.0;
    float radius = eased * (maxRadius + 8.0) - 8.0;
    float distanceFromCenter = length(xy - center);
    float reveal = 1.0 - smoothstep(
      radius - 4.0,
      radius + 4.0,
      distanceFromCenter
    );
    half4 color = mix(fromColor, toColor, half(reveal));

    float ring = 1.0 - smoothstep(0.0, 7.0, abs(distanceFromCenter - radius));
    float angle = atan(xy.y - center.y, xy.x - center.x);
    float sector = floor(((angle + PI) / (2.0 * PI)) * 96.0);
    float sparkSeed = hash21(float2(sector, 41.0));
    float sparkAngle = ((sector + 0.5) / 96.0) * 2.0 * PI - PI;
    float sparkRadius = radius + (sparkSeed - 0.5) * 34.0;
    float2 sparkPosition = center +
      float2(cos(sparkAngle), sin(sparkAngle)) * sparkRadius;
    float spark = 1.0 - smoothstep(
      ${TRANSITION_VFX_PARTICLE_SIZES.circleSparkInner},
      ${TRANSITION_VFX_PARTICLE_SIZES.circleSparkOuter},
      length(xy - sparkPosition)
    );
    spark *= step(0.56, sparkSeed) * sin(p * PI);

    color.rgb += half3(0.12, 0.48, 1.0) * half(ring * 0.8);
    color.rgb += half3(0.55, 0.82, 1.0) * half(spark * 1.4);
    return color;
  }

  // Four texture reads total: two taps per image plus procedural sparks.
  float seam = resolution.x * (1.0 - eased);
  float2 fromPosition = xy + float2(eased * resolution.x, 0.0);
  float2 toPosition = xy - float2((1.0 - eased) * resolution.x, 0.0);
  float trailAmount = sin(p * PI) * 18.0;

  half4 pushedFrom = black;
  if (entrance < 0.5) {
    pushedFrom = opaqueFrame(
      outgoing.eval(fromPosition) * 0.72 +
      outgoing.eval(fromPosition - float2(trailAmount, 0.0)) * 0.28
    );
  }
  half4 pushedTo = opaqueFrame(
    incoming.eval(toPosition) * 0.72 +
    incoming.eval(toPosition - float2(trailAmount, 0.0)) * 0.28
  );
  half4 color = xy.x < seam ? pushedFrom : pushedTo;

  float energySeam = 1.0 - smoothstep(0.0, 9.0, abs(xy.x - seam));
  float row = floor(xy.y / 11.0);
  float sparkSeed = hash21(float2(row, 73.0));
  float2 sparkPosition = float2(
    seam - 12.0 - sparkSeed * 92.0 * sin(p * PI),
    (row + 0.5) * 11.0 +
      (hash21(float2(row, 19.0)) - 0.5) * 7.0
  );
  float spark = 1.0 - smoothstep(
    ${TRANSITION_VFX_PARTICLE_SIZES.pushSparkInner},
    ${TRANSITION_VFX_PARTICLE_SIZES.pushSparkOuter},
    length(xy - sparkPosition)
  );
  spark *= step(0.62, sparkSeed) * sin(p * PI);

  color.rgb += half3(0.10, 0.45, 1.0) * half(energySeam * 0.85);
  color.rgb += half3(0.62, 0.86, 1.0) * half(spark * 1.35);
  return color;
}
`;

let cachedTransitionVfxShader:
  | ReturnType<typeof Skia.RuntimeEffect.Make>
  | undefined;

const getTransitionVfxShader = () => {
  if (cachedTransitionVfxShader === undefined) {
    cachedTransitionVfxShader = Skia.RuntimeEffect.Make(TRANSITION_VFX_SHADER);
  }

  return cachedTransitionVfxShader;
};

export const TransitionVfxCanvas: React.FC<TransitionVfxCanvasProps> =
  React.memo(
    ({
      outgoingImage,
      incomingImage,
      transition,
      progress,
      width,
      height,
      isEntrance,
    }) => {
      const shader = useMemo(getTransitionVfxShader, []);
      const effect = getTransitionVfxMode(transition) ?? 0;
      const safeWidth = Math.max(width, 1);
      const safeHeight = Math.max(height, 1);
      const outgoingRect = getContainedImageRect(
        outgoingImage.width(),
        outgoingImage.height(),
        width,
        height,
      );
      const incomingRect = getContainedImageRect(
        incomingImage.width(),
        incomingImage.height(),
        width,
        height,
      );
      const uniforms = useDerivedValue<TransitionVfxUniforms>(
        () => ({
          effect,
          progress: Math.min(Math.max(progress.value, 0), 1),
          resolution: { x: safeWidth, y: safeHeight },
          entrance: isEntrance ? 1 : 0,
        }),
        [effect, progress, safeWidth, safeHeight, isEntrance],
      );

      if (!shader) {
        return null;
      }

      return (
        <Canvas pointerEvents="none" style={[styles.canvas, { width, height }]}>
          <Fill>
            <Shader source={shader} uniforms={uniforms}>
              <ImageShader
                image={outgoingImage}
                x={outgoingRect.x}
                y={outgoingRect.y}
                width={outgoingRect.width}
                height={outgoingRect.height}
                fit="fill"
                sampling={PREVIEW_IMAGE_SAMPLING}
              />
              <ImageShader
                image={incomingImage}
                x={incomingRect.x}
                y={incomingRect.y}
                width={incomingRect.width}
                height={incomingRect.height}
                fit="fill"
                sampling={PREVIEW_IMAGE_SAMPLING}
              />
            </Shader>
          </Fill>
        </Canvas>
      );
    },
  );

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
});
