import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Rect, LinearGradient, vec } from '@shopify/react-native-skia';

interface GradientOverlayProps {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  width: number;
  height: number;
}

export const GradientOverlay: React.FC<GradientOverlayProps> = ({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 0, y: 1 },
  width,
  height,
}) => {
  return (
    <Canvas style={[styles.canvas, { width, height }]}>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(start.x * width, start.y * height)}
          end={vec(end.x * width, end.y * height)}
          colors={colors}
        />
      </Rect>
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
  },
});
