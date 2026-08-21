const fs = require('fs');
const path = require('path');

const editorSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'screens', 'EditorScreen.tsx'),
  'utf8',
);

const getSourceSection = (startMarker, endMarker) => {
  const start = editorSource.indexOf(startMarker);
  const end = editorSource.indexOf(endMarker, start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return editorSource.slice(start, end);
};

describe('transition picker scrolling', () => {
  it('uses a gesture-aware native horizontal scroll view so every transition is reachable', () => {
    const transitionPicker = getSourceSection(
      'const TransitionPicker:',
      'interface EffectPickerProps',
    );

    expect(transitionPicker).toMatch(
      /<GestureHandlerScrollView[\s\S]*?horizontal[\s\S]*?transitions\.map\(transition =>/,
    );
    expect(editorSource).toMatch(
      /ScrollView as GestureHandlerScrollView,?\s*\n/,
    );
    expect(transitionPicker).toContain('scrollEnabled');
    expect(transitionPicker).toContain(
      'contentContainerStyle={styles.transitionContainer}',
    );
    expect(transitionPicker).not.toContain('PanResponder');
    expect(transitionPicker).not.toContain('animatedScrollOffset');
  });

  it('keeps transition items wider than the viewport so the native list has a scroll range', () => {
    expect(editorSource).toContain('const TRANSITION_ITEM_WIDTH = 64;');
    expect(editorSource).toMatch(
      /const TRANSITION_CONTENT_WIDTH\s*=\s*Object\.keys\(TRANSITIONS\)\.length\s*\*\s*\(TRANSITION_ITEM_WIDTH \+ SPACING\.md\);/,
    );
    const transitionPicker = getSourceSection(
      'const TransitionPicker:',
      'interface EffectPickerProps',
    );
    expect(transitionPicker).not.toContain('width: transitions.length');
    expect(editorSource).not.toMatch(/Animated as RNAnimated|PanResponder/);
    expect(editorSource).toMatch(
      /transitionList:\s*\{[\s\S]*?width:\s*'100%'[\s\S]*?flexGrow:\s*0/,
    );
    expect(editorSource).toMatch(
      /transitionContainer:\s*\{[\s\S]*?width:\s*TRANSITION_CONTENT_WIDTH[\s\S]*?flexDirection:\s*'row'/,
    );
    expect(editorSource).toMatch(
      /transitionItem:\s*\{[\s\S]*?width:\s*TRANSITION_ITEM_WIDTH[\s\S]*?flexShrink:\s*0/,
    );
  });

  it('renders transition content outside the vertical tab scroller', () => {
    const tabContent = getSourceSection(
      '{/* Tab Content */}',
      '{/* Voice Input Modal */}',
    );

    expect(editorSource).toContain(
      "const isTabContentScrollEnabled = activeTab === 'captions' && selectedTransitionIndex === null;",
    );
    expect(tabContent).toMatch(
      /isTabContentScrollEnabled\s*\?\s*\([\s\S]*?<ScrollView/,
    );
    expect(tabContent).toMatch(
      /:\s*\(\s*<View style=\{styles\.staticTabContent\}>[\s\S]*?renderTabContent\(\)/,
    );
  });
});
