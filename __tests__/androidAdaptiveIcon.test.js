const fs = require('fs');
const path = require('path');

const androidMain = path.join(
  __dirname,
  '..',
  'android',
  'app',
  'src',
  'main',
);
const res = path.join(androidMain, 'res');

const readResource = (...segments) =>
  fs.readFileSync(path.join(res, ...segments), 'utf8');

describe('Android launcher icon resources', () => {
  it('keeps manifest references stable and provides legacy fallbacks', () => {
    const manifest = fs.readFileSync(
      path.join(androidMain, 'AndroidManifest.xml'),
      'utf8',
    );

    expect(manifest).toContain('android:icon="@mipmap/ic_launcher"');
    expect(manifest).toContain(
      'android:roundIcon="@mipmap/ic_launcher_round"',
    );
    expect(fs.existsSync(path.join(res, 'mipmap-mdpi', 'ic_launcher.png'))).toBe(
      true,
    );
    expect(
      fs.existsSync(path.join(res, 'mipmap-mdpi', 'ic_launcher_round.png')),
    ).toBe(true);
  });

  it.each(['ic_launcher.xml', 'ic_launcher_round.xml'])(
    'defines %s as a layered adaptive icon on Android 8+',
    fileName => {
      const source = readResource('mipmap-anydpi-v26', fileName);

      expect(source).toContain('<adaptive-icon');
      expect(source).toContain(
        '<background android:drawable="@drawable/ic_launcher_background"',
      );
      expect(source).toContain(
        '<foreground android:drawable="@drawable/ic_launcher_foreground"',
      );
    },
  );

  it.each(['ic_launcher.xml', 'ic_launcher_round.xml'])(
    'adds a monochrome layer to %s on Android 13+',
    fileName => {
      const source = readResource('mipmap-anydpi-v33', fileName);

      expect(source).toContain('<adaptive-icon');
      expect(source).toContain(
        '<monochrome android:drawable="@drawable/ic_launcher_monochrome"',
      );
    },
  );

  it('uses an opaque brand background instead of a transparent legacy canvas', () => {
    const source = readResource('drawable', 'ic_launcher_background.xml');

    expect(source).toContain('android:viewportWidth="108"');
    expect(source).toContain('<gradient');
    expect(source).toContain('android:color="#FFFF765C"');
    expect(source).toContain('android:color="#FF7650D6"');
    expect(source).not.toContain('@android:color/transparent');
  });

  it('provides independent full-size foreground and monochrome vectors', () => {
    for (const fileName of [
      'ic_launcher_foreground.xml',
      'ic_launcher_monochrome.xml',
    ]) {
      const source = readResource('drawable', fileName);

      expect(source).toContain('android:viewportWidth="108"');
      expect(source).toContain('android:viewportHeight="108"');
      expect(source).toContain('<path');
    }
  });
});
