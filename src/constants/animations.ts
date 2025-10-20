// Spring configurations for Reanimated
export const SPRING_CONFIGS = {
  default: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  bouncy: {
    damping: 8,
    stiffness: 120,
    mass: 0.8,
  },
  smooth: {
    damping: 20,
    stiffness: 180,
    mass: 1,
  },
  gentle: {
    damping: 25,
    stiffness: 100,
    mass: 1.2,
  },
};

// Timing configurations
export const TIMING = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 800,
};

// Easing functions
export const EASING = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  deceleration: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  acceleration: 'cubic-bezier(0.4, 0.0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// Animation durations for different screens
export const SCREEN_TRANSITIONS = {
  modal: 400,
  stack: 300,
  fade: 200,
};

// Gesture thresholds
export const GESTURE_THRESHOLDS = {
  swipeVelocity: 500,
  swipeDistance: 120,
  longPressDuration: 500,
  doubleTapDelay: 300,
};
