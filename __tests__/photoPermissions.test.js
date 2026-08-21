const fs = require('fs');
const path = require('path');

jest.mock('react-native-permissions', () =>
  require('react-native-permissions/mock'),
);

const { PERMISSIONS } = require('react-native-permissions');
const {
  getPhotoLibraryPermission,
} = require('../src/utils/photoPermissions');

describe('getPhotoLibraryPermission', () => {
  it('uses READ_MEDIA_IMAGES on Android 13 and newer', () => {
    expect(getPhotoLibraryPermission('android', 33)).toBe(
      PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
    );
  });

  it('uses READ_EXTERNAL_STORAGE through Android 12L', () => {
    expect(getPhotoLibraryPermission('android', 32)).toBe(
      PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
    );
  });

  it('uses the iOS photo-library permission on iOS', () => {
    expect(getPhotoLibraryPermission('ios', 18)).toBe(
      PERMISSIONS.IOS.PHOTO_LIBRARY,
    );
  });
});

describe('Android photo permissions manifest', () => {
  const manifest = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'android',
      'app',
      'src',
      'main',
      'AndroidManifest.xml',
    ),
    'utf8',
  );

  it('declares photo access for Android 13 and newer', () => {
    expect(manifest).toContain(
      'android.permission.READ_MEDIA_IMAGES',
    );
  });

  it('declares legacy photo access only through Android 12L', () => {
    expect(manifest).toMatch(
      /<uses-permission\s+android:name="android\.permission\.READ_EXTERNAL_STORAGE"\s+android:maxSdkVersion="32"\s*\/>/,
    );
  });
});
