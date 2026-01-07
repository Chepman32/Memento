import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Circle, Path, Skia, Group, SkCanvas, SkPaint } from '@shopify/react-native-skia';
import { SharedValue } from 'react-native-reanimated';
import { Particle } from './ParticleGenerator';

interface ParticleCanvasProps {
  particles: Particle[];
  assemblyProgress: SharedValue<number>;
  zoomProgress: SharedValue<number>;
  fadeProgress: SharedValue<number>;
  screenWidth: number;
  screenHeight: number;
}

// Pre-calculate polygon paths for all particles
function createPolygonPath(
  shape: string,
  size: number,
  rotation: number
): ReturnType<typeof Skia.Path.Make> | null {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rotate = (px: number, py: number): { x: number; y: number } => ({
    x: px * cos - py * sin,
    y: px * sin + py * cos,
  });

  let points: { x: number; y: number }[] = [];

  switch (shape) {
    case 'triangle': {
      const h = size * Math.sqrt(3) / 2;
      points = [
        rotate(0, -h * 0.66),
        rotate(-size / 2, h * 0.33),
        rotate(size / 2, h * 0.33),
      ];
      break;
    }
    case 'rectangle': {
      const w = size;
      const h = size * 0.6;
      points = [
        rotate(-w / 2, -h / 2),
        rotate(w / 2, -h / 2),
        rotate(w / 2, h / 2),
        rotate(-w / 2, h / 2),
      ];
      break;
    }
    case 'quad': {
      points = [
        rotate(-size / 2, -size / 2),
        rotate(size / 2, -size / 3),
        rotate(size / 2, size / 2),
        rotate(-size / 3, size / 2),
      ];
      break;
    }
    case 'trapezoid': {
      const topWidth = size * 0.6;
      const bottomWidth = size;
      const h = size * 0.7;
      points = [
        rotate(-topWidth / 2, -h / 2),
        rotate(topWidth / 2, -h / 2),
        rotate(bottomWidth / 2, h / 2),
        rotate(-bottomWidth / 2, h / 2),
      ];
      break;
    }
    case 'rhombus': {
      points = [
        rotate(0, -size / 2),
        rotate(size / 2, 0),
        rotate(0, size / 2),
        rotate(-size / 2, 0),
      ];
      break;
    }
    default:
      return null;
  }

  if (points.length === 0) return null;

  const path = Skia.Path.Make();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y);
  }
  path.close();

  return path;
}

// Linear interpolation helper
const mix = (progress: number, start: number, end: number): number => {
  'worklet';
  return start + (end - start) * progress;
};

// Particle render component - renders a single particle
const ParticleShape: React.FC<{
  particle: Particle;
  path: ReturnType<typeof Skia.Path.Make> | null;
  x: number;
  y: number;
}> = ({ particle, path, x, y }) => {
  if (particle.shape === 'circle') {
    return (
      <Circle
        cx={x}
        cy={y}
        r={particle.size}
        color={particle.color}
      />
    );
  } else if (path) {
    return (
      <Group transform={[{ translateX: x }, { translateY: y }]}>
        <Path
          path={path}
          color={particle.color}
        />
      </Group>
    );
  }
  return null;
};

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({
  particles,
  assemblyProgress,
  zoomProgress,
  fadeProgress,
  screenWidth,
  screenHeight,
}) => {
  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2;

  // Pre-calculate paths for polygon particles
  const particlePaths = useMemo(() => {
    return particles.map((particle) => {
      if (particle.shape === 'circle') {
        return null;
      }
      return createPolygonPath(particle.shape, particle.size, particle.rotation);
    });
  }, [particles]);

  return (
    <Canvas style={styles.canvas}>
      <Group opacity={fadeProgress}>
        {particles.map((particle, index) => {
          // Calculate position based on current animation progress
          // Note: This reads shared values which triggers re-renders on animation frames
          const progress = assemblyProgress.value;
          const zoom = zoomProgress.value;
          const scale = 1 + zoom * 2;

          const currentX = mix(progress, particle.startX, particle.endX);
          const currentY = mix(progress, particle.startY, particle.endY);

          const x = centerX + (currentX - centerX) * scale;
          const y = centerY + (currentY - centerY) * scale;

          return (
            <ParticleShape
              key={particle.id}
              particle={particle}
              path={particlePaths[index]}
              x={x}
              y={y}
            />
          );
        })}
      </Group>
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
});
