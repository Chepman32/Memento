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
  it('enables the horizontal transition list without stale nested gesture flags', () => {
    const transitionPicker = getSourceSection(
      'const TransitionPicker:',
      'interface EffectPickerProps',
    );

    expect(transitionPicker).toMatch(
      /<RNAnimated\.View[\s\S]*?transitions\.map\(transition =>/,
    );
    expect(transitionPicker).not.toContain('nestedScrollEnabled');
    expect(transitionPicker).not.toContain('directionalLockEnabled');
  });

  it('keeps transition items at intrinsic row width so Android has a scroll range', () => {
    expect(editorSource).toContain('const TRANSITION_ITEM_WIDTH = 64;');
    const transitionPicker = getSourceSection(
      'const TransitionPicker:',
      'interface EffectPickerProps',
    );
    expect(transitionPicker).toContain(
      'width: transitions.length * (TRANSITION_ITEM_WIDTH + SPACING.md),',
    );
    expect(transitionPicker).toContain(
      'transform: [{ translateX: animatedScrollOffset }],',
    );
    expect(editorSource).toMatch(/PanResponder,?\s*\n/);
    expect(transitionPicker).toContain(
      'onMoveShouldSetPanResponderCapture: (_, gestureState) =>',
    );
    expect(transitionPicker).toContain(
      '{...transitionPanResponder.panHandlers}',
    );
    expect(transitionPicker).toContain(
      'dragStartOffsetRef.current - gestureState.dx - gestureState.vx * 120',
    );
    expect(editorSource).toMatch(
      /transitionListViewport:\s*\{[\s\S]*?overflow:\s*'hidden'/,
    );
    expect(editorSource).toMatch(
      /transitionContainer:\s*\{[\s\S]*?flexDirection:\s*'row'/,
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
