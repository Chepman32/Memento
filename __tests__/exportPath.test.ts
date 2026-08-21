import { buildExportOutputPath } from '../src/utils/exportPath';

describe('buildExportOutputPath', () => {
  it.each([
    ['/data/user/0/app/cache', '/data/user/0/app/cache/slidemint_1.mp4'],
    ['/data/user/0/app/cache/', '/data/user/0/app/cache/slidemint_1.mp4'],
    ['file:///data/user/0/app/cache/', '/data/user/0/app/cache/slidemint_1.mp4'],
  ])('builds a native FFmpeg path from %s', (directory, expected) => {
    expect(buildExportOutputPath(directory, 'slidemint_1.mp4')).toBe(expected);
  });
});
