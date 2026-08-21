const fs = require('fs');
const path = require('path');

const editorSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'screens', 'EditorScreen.tsx'),
  'utf8',
);

const sliderStart = editorSource.indexOf('const Slider:');
const sliderEnd = editorSource.indexOf('// Color Palette Component', sliderStart);
const sliderSource = editorSource.slice(sliderStart, sliderEnd);

describe('duration slider drag stability', () => {
  it('does not resync the controlled value while a drag is active', () => {
    expect(sliderSource).toContain(
      'const isDragging = useSharedValue(false);',
    );
    expect(sliderSource).toMatch(
      /useEffect\(\(\) => \{\s*if \(isDragging\.value \|\| trackWidth <= 0 \|\| range === 0\) return;/,
    );
    expect(sliderSource).toMatch(
      /\.onBegin\(\(\) => \{\s*isDragging\.value = true;/,
    );
  });

  it('settles the thumb to the snapped value only when the drag finishes', () => {
    expect(sliderSource).toMatch(
      /\.onFinalize\(\(\) => \{[\s\S]*?isDragging\.value = false;/,
    );
    expect(sliderSource).toContain(
      'position.value = withTiming(snappedPosition, { duration: 100 });',
    );
  });
});
