const fs = require('fs');
const path = require('path');

const sourceRoot = path.join(__dirname, '..', 'src');

const collectSourceFiles = directory =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectSourceFiles(entryPath);
    }

    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [entryPath] : [];
  });

const sourceFiles = collectSourceFiles(sourceRoot);

const findMatches = pattern =>
  sourceFiles.flatMap(file => {
    const source = fs.readFileSync(file, 'utf8');
    return pattern.test(source) ? [path.relative(sourceRoot, file)] : [];
  });

describe('installed animation-library API compatibility', () => {
  it.each([
    ['removed Reanimated gesture hook', /\buseAnimatedGestureHandler\b/],
    ['legacy pan-handler component', /\bPanGestureHandler\b/],
    ['legacy pan-handler event type', /\bPanGestureHandlerGestureEvent\b/],
    ['invalid Animated.SharedValue type', /\bAnimated\.SharedValue\b/],
    ['deprecated Reanimated-to-JS bridge', /\brunOnJS\b/],
  ])('does not use the %s', (_label, pattern) => {
    expect(findMatches(pattern)).toEqual([]);
  });

  it('does not pass Path-only trim props to Skia Circle elements', () => {
    expect(findMatches(/<Circle\b(?:(?!\/>)[\s\S])*?\b(?:start|end)=/)).toEqual(
      [],
    );
  });
});
