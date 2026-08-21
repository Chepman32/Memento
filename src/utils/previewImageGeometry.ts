export interface PreviewImageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const isPositiveFinite = (value: number) =>
  Number.isFinite(value) && value > 0;

export const getContainedImageRect = (
  sourceWidth: number,
  sourceHeight: number,
  containerWidth: number,
  containerHeight: number,
): PreviewImageRect => {
  if (
    !isPositiveFinite(containerWidth) ||
    !isPositiveFinite(containerHeight)
  ) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  if (!isPositiveFinite(sourceWidth) || !isPositiveFinite(sourceHeight)) {
    return {
      x: 0,
      y: 0,
      width: containerWidth,
      height: containerHeight,
    };
  }

  const scale = Math.min(
    containerWidth / sourceWidth,
    containerHeight / sourceHeight,
  );
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
};
