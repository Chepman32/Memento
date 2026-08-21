interface TransitionScrollMetrics {
  selectedIndex: number;
  itemCount: number;
  itemWidth: number;
  itemSpacing: number;
  viewportWidth: number;
}

export const getTransitionScrollOffset = ({
  selectedIndex,
  itemCount,
  itemWidth,
  itemSpacing,
  viewportWidth,
}: TransitionScrollMetrics): number | null => {
  if (
    selectedIndex < 0 ||
    selectedIndex >= itemCount ||
    viewportWidth <= 0
  ) {
    return null;
  }

  const itemStride = itemWidth + itemSpacing;
  const contentWidth = itemCount * itemStride;
  const selectedItemCenter = selectedIndex * itemStride + itemWidth / 2;
  const centeredOffset = selectedItemCenter - viewportWidth / 2;
  const maximumOffset = Math.max(0, contentWidth - viewportWidth);

  return Math.min(maximumOffset, Math.max(0, centeredOffset));
};
