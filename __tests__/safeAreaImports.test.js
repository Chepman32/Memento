const fs = require('fs');
const path = require('path');

const screensUsingSafeArea = [
  'ExportScreen.tsx',
  'HomeScreen.tsx',
  'ImageSelectionScreen.tsx',
  'PreviewScreen.tsx',
  'SettingsScreen.tsx',
  'WebViewScreen.tsx',
];

describe.each(screensUsingSafeArea)('%s', screen => {
  it('uses the cross-platform safe-area component', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'screens', screen),
      'utf8',
    );
    const reactNativeImports =
      source.match(/import\s*{[\s\S]*?}\s*from\s*['"]react-native['"]/g) || [];

    expect(reactNativeImports.join('\n')).not.toMatch(/\bSafeAreaView\b/);
    expect(source).toMatch(
      /import\s*{[^}]*\bSafeAreaView\b[^}]*}\s*from\s*['"]react-native-safe-area-context['"]/,
    );
  });
});
