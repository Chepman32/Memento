import { getContainedImageRect } from '../src/utils/previewImageGeometry';

describe('preview image geometry', () => {
  it('centers a landscape image without changing its aspect ratio', () => {
    const rect = getContainedImageRect(1920, 1080, 390, 720);

    expect(rect.x).toBeCloseTo(0);
    expect(rect.y).toBeCloseTo(250.3125);
    expect(rect.width).toBeCloseTo(390);
    expect(rect.height).toBeCloseTo(219.375);
  });

  it('centers a portrait image without changing its aspect ratio', () => {
    const rect = getContainedImageRect(1080, 1920, 390, 720);

    expect(rect.x).toBeCloseTo(0);
    expect(rect.y).toBeCloseTo(13.333333);
    expect(rect.width).toBeCloseTo(390);
    expect(rect.height).toBeCloseTo(693.333333);
  });

  it('uses the full preview for missing source dimensions', () => {
    expect(getContainedImageRect(0, 0, 390, 720)).toEqual({
      x: 0,
      y: 0,
      width: 390,
      height: 720,
    });
  });
});
