const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (...segments) =>
  fs.readFileSync(path.join(root, ...segments), 'utf8');

describe('Android export integration', () => {
  it('exposes export directly from the editor header', () => {
    const editor = read('src', 'screens', 'EditorScreen.tsx');

    expect(editor).toContain('const handleExport = async () =>');
    expect(editor).toContain("navigation.navigate('Export', {");
    expect(editor).toContain('accessibilityLabel={t(\'preview.export\')}');
    expect(editor).toContain('onPress={handleExport}');
  });

  it('routes Android photo-library calls through a registered native module', () => {
    const bridge = read('src', 'utils', 'photoLibrary.ts');
    const application = read(
      'android',
      'app',
      'src',
      'main',
      'java',
      'com',
      'slidemint',
      'MainApplication.kt',
    );

    expect(bridge).toContain("Platform.OS === 'android'");
    expect(bridge).not.toContain('Photo library is only supported on iOS');
    expect(application).toContain('add(PhotoLibraryPackage())');
    expect(
      fs.existsSync(
        path.join(
          root,
          'android',
          'app',
          'src',
          'main',
          'java',
          'com',
          'slidemint',
          'PhotoLibraryModule.kt',
        ),
      ),
    ).toBe(true);
  });

  it('publishes completed exports with Android MediaStore', () => {
    const nativeModule = read(
      'android',
      'app',
      'src',
      'main',
      'java',
      'com',
      'slidemint',
      'PhotoLibraryModule.kt',
    );

    expect(nativeModule).toContain('MediaStore.Video.Media');
    expect(nativeModule).toContain('MediaStore.Images.Media');
    expect(nativeModule).toContain('MediaStore.MediaColumns.RELATIVE_PATH');
    expect(nativeModule).toContain('MediaStore.MediaColumns.IS_PENDING');
    expect(nativeModule).toContain('MediaScannerConnection.scanFile');
    expect(nativeModule).toContain('context.startActivity(intent)');
    expect(nativeModule).not.toContain('intent.resolveActivity');
  });

  it('uses an encoder that exists in the Android FFmpeg package', () => {
    const encoder = read('src', 'utils', 'videoEncoder.ts');

    expect(encoder).toContain("Platform.OS === 'android'");
    expect(encoder).toContain("'-c:v mpeg4'");
  });

  it('keeps legacy shared-storage writes scoped to Android 9 and below', () => {
    const manifest = read('android', 'app', 'src', 'main', 'AndroidManifest.xml');

    expect(manifest).toContain(
      'android:name="android.permission.WRITE_EXTERNAL_STORAGE"',
    );
    expect(manifest).toContain('android:maxSdkVersion="28"');
  });
});
