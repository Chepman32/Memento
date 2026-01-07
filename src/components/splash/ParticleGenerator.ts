export type ShapeType = 'circle' | 'triangle' | 'rectangle' | 'quad' | 'trapezoid' | 'rhombus';

export interface Particle {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  shape: ShapeType;
  size: number;
  rotation: number;
}

// Seeded random number generator for consistent results
class SeededRandom {
  private seed: number;

  constructor(seed: number = 42) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

// Color palette based on typical app icon colors
// Can be replaced with actual color sampling from the icon image
const COLOR_PALETTE = [
  '#FF6B6B', // Coral red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Sky blue
  '#FFA07A', // Light salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Light blue
  '#F8B739', // Orange
  '#52B788', // Green
];

function generateShapeType(random: SeededRandom): ShapeType {
  const shapes: ShapeType[] = ['circle', 'triangle', 'rectangle', 'quad', 'trapezoid', 'rhombus'];
  const weights = [0.4, 0.15, 0.15, 0.1, 0.1, 0.1]; // 40% circles, 60% polygons

  const rand = random.next();
  let cumulative = 0;

  for (let i = 0; i < shapes.length; i++) {
    cumulative += weights[i];
    if (rand <= cumulative) {
      return shapes[i];
    }
  }

  return 'circle';
}

function generateStartPosition(
  index: number,
  total: number,
  screenWidth: number,
  screenHeight: number,
  random: SeededRandom
): { x: number; y: number } {
  const isEdgeSpawn = random.next() < 0.5;

  if (isEdgeSpawn) {
    // Spawn from screen edges
    const edge = Math.floor(random.next() * 4); // 0: top, 1: right, 2: bottom, 3: left

    switch (edge) {
      case 0: // Top
        return { x: random.range(0, screenWidth), y: -random.range(20, 100) };
      case 1: // Right
        return { x: screenWidth + random.range(20, 100), y: random.range(0, screenHeight) };
      case 2: // Bottom
        return { x: random.range(0, screenWidth), y: screenHeight + random.range(20, 100) };
      case 3: // Left
        return { x: -random.range(20, 100), y: random.range(0, screenHeight) };
      default:
        return { x: random.range(0, screenWidth), y: -50 };
    }
  } else {
    // Random off-screen position
    const angle = random.range(0, Math.PI * 2);
    const distance = random.range(screenWidth * 0.6, screenWidth * 0.9);

    return {
      x: screenWidth / 2 + Math.cos(angle) * distance,
      y: screenHeight / 2 + Math.sin(angle) * distance,
    };
  }
}

function generateEndPosition(
  index: number,
  total: number,
  iconSize: number,
  centerX: number,
  centerY: number,
  random: SeededRandom
): { x: number; y: number } {
  // Create a grid-based layout for particles to form the icon
  const gridSize = Math.ceil(Math.sqrt(total));
  const cellSize = iconSize / gridSize;

  const row = Math.floor(index / gridSize);
  const col = index % gridSize;

  // Calculate base position in grid
  const baseX = col * cellSize;
  const baseY = row * cellSize;

  // Add slight random offset within cell for organic look
  const offsetX = random.range(-cellSize * 0.2, cellSize * 0.2);
  const offsetY = random.range(-cellSize * 0.2, cellSize * 0.2);

  // Position relative to icon top-left, then offset to center
  const iconLeft = centerX - iconSize / 2;
  const iconTop = centerY - iconSize / 2;

  return {
    x: iconLeft + baseX + offsetX,
    y: iconTop + baseY + offsetY,
  };
}

export function generateParticles(
  count: number,
  screenWidth: number,
  screenHeight: number,
  iconSize: number
): Particle[] {
  const random = new SeededRandom(42);
  const particles: Particle[] = [];
  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2;

  for (let i = 0; i < count; i++) {
    const start = generateStartPosition(i, count, screenWidth, screenHeight, random);
    const end = generateEndPosition(i, count, iconSize, centerX, centerY, random);

    const particle: Particle = {
      id: i,
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      color: random.choice(COLOR_PALETTE),
      shape: generateShapeType(random),
      size: random.range(5, 15),
      rotation: random.range(0, 360),
    };

    particles.push(particle);
  }

  return particles;
}
