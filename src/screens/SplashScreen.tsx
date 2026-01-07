import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/navigationTypes';
import { useThemeStore } from '../store/themeStore';
import { sounds } from '../utils/soundEffects';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants/theme';

type SplashScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Splash'
>;

const PARTICLE_COUNT = 300;
const LOGO_SIZE = 200;
const ASSEMBLY_DURATION = 800;
const ZOOM_DURATION = 500;

type ShapeType =
  | 'circle'
  | 'triangle'
  | 'rectangle'
  | 'quad'
  | 'trapezoid'
  | 'rhombus';

interface Particle {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  size: number;
  shape: ShapeType;
  rotation: number;
  delay: number;
  color: string;
}

const generateParticles = (): Particle[] => {
  const shapes: ShapeType[] = [
    'circle',
    'triangle',
    'rectangle',
    'quad',
    'trapezoid',
    'rhombus',
  ];

  // Color palette matching typical app icon colors
  const colorPalette = [
    '#007AFF',
    '#0A84FF',
    '#5AC8FA',
    '#4CD964',
    '#34C759',
    '#30D158',
    '#00C7BE',
    '#32ADE6',
    '#5856D6',
    '#AF52DE',
    '#64D2FF',
    '#0099CC',
  ];

  const particles: Particle[] = [];
  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT / 2;

  const gridSize = Math.ceil(Math.sqrt(PARTICLE_COUNT));
  const cellSize = LOGO_SIZE / gridSize;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const gridX = i % gridSize;
    const gridY = Math.floor(i / gridSize);
    const targetX =
      centerX -
      LOGO_SIZE / 2 +
      gridX * cellSize +
      cellSize / 2 +
      (Math.random() - 0.5) * cellSize * 0.8;
    const targetY =
      centerY -
      LOGO_SIZE / 2 +
      gridY * cellSize +
      cellSize / 2 +
      (Math.random() - 0.5) * cellSize * 0.8;

    const edge = Math.floor(Math.random() * 4);
    let startX: number, startY: number;
    const margin = 100;

    switch (edge) {
      case 0:
        startX = Math.random() * (SCREEN_WIDTH + margin * 2) - margin;
        startY = -margin - Math.random() * 200;
        break;
      case 1:
        startX = SCREEN_WIDTH + margin + Math.random() * 200;
        startY = Math.random() * (SCREEN_HEIGHT + margin * 2) - margin;
        break;
      case 2:
        startX = Math.random() * (SCREEN_WIDTH + margin * 2) - margin;
        startY = SCREEN_HEIGHT + margin + Math.random() * 200;
        break;
      default:
        startX = -margin - Math.random() * 200;
        startY = Math.random() * (SCREEN_HEIGHT + margin * 2) - margin;
        break;
    }

    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = 3 + Math.random() * 8;

    // Pick a random color from the palette
    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];

    particles.push({
      id: i,
      startX,
      startY,
      targetX,
      targetY,
      size,
      shape,
      rotation: Math.random() * 360,
      delay: Math.random() * 200,
      color,
    });
  }

  return particles;
};

// Render shape based on type
const renderShape = (shape: ShapeType, size: number, color: string) => {
  const shapeStyle = {
    width: size,
    height: size,
    backgroundColor: color,
  };

  switch (shape) {
    case 'circle':
      return <View style={[shapeStyle, { borderRadius: size / 2 }]} />;
    case 'triangle':
      return (
        <View
          style={{
            width: 0,
            height: 0,
            backgroundColor: 'transparent',
            borderStyle: 'solid',
            borderLeftWidth: size / 2,
            borderRightWidth: size / 2,
            borderBottomWidth: size * 0.866,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
          }}
        />
      );
    case 'rectangle':
      return <View style={[shapeStyle, { height: size * 0.6 }]} />;
    case 'quad':
      return (
        <View style={[shapeStyle, { transform: [{ skewX: '-10deg' }] }]} />
      );
    case 'trapezoid':
      return (
        <View
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            transform: [{ perspective: 100 }, { rotateX: '20deg' }],
          }}
        />
      );
    case 'rhombus':
      return (
        <View style={[shapeStyle, { transform: [{ rotate: '45deg' }] }]} />
      );
    default:
      return <View style={shapeStyle} />;
  }
};

interface AnimatedParticleProps {
  particle: Particle;
}

const AnimatedParticle: React.FC<AnimatedParticleProps> = React.memo(
  ({ particle }) => {
    const positionX = useRef(new Animated.Value(particle.startX)).current;
    const positionY = useRef(new Animated.Value(particle.startY)).current;
    const rotation = useRef(new Animated.Value(particle.rotation)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(positionX, {
          toValue: particle.targetX,
          duration: ASSEMBLY_DURATION,
          delay: particle.delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(positionY, {
          toValue: particle.targetY,
          duration: ASSEMBLY_DURATION,
          delay: particle.delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 0,
          duration: ASSEMBLY_DURATION,
          delay: particle.delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 100,
          delay: particle.delay,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.particle,
          {
            transform: [
              { translateX: positionX },
              { translateY: positionY },
              {
                rotate: rotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
            opacity,
          },
        ]}
      >
        {renderShape(particle.shape, particle.size, particle.color)}
      </Animated.View>
    );
  },
);

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const { colors } = useThemeStore();
  const [showLogo, setShowLogo] = useState(false);
  const [showParticles, setShowParticles] = useState(true);

  const particles = useMemo(() => generateParticles(), []);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    sounds.preload();

    // After assembly completes, show logo and zoom
    const assemblyTimer = setTimeout(() => {
      setShowLogo(true);
      setShowParticles(false);

      // Fade in logo
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();

      // Wait a moment then zoom
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(logoScale, {
            toValue: 15,
            duration: ZOOM_DURATION,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(containerOpacity, {
            toValue: 0,
            duration: 150,
            delay: ZOOM_DURATION - 150,
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) {
            navigation.replace('Home');
          }
        });
      }, 100);
    }, ASSEMBLY_DURATION + 100);

    return () => clearTimeout(assemblyTimer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.background, opacity: containerOpacity },
      ]}
    >
      {/* Particles layer */}
      {showParticles && (
        <View style={styles.particlesContainer}>
          {particles.map(particle => (
            <AnimatedParticle key={particle.id} particle={particle} />
          ))}
        </View>
      )}

      {/* Logo layer */}
      {showLogo && (
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('../assets/icons/icon_no_border_1024.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  logoContainer: {
    position: 'absolute',
    left: (SCREEN_WIDTH - LOGO_SIZE) / 2,
    top: (SCREEN_HEIGHT - LOGO_SIZE) / 2,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});

export default SplashScreen;
