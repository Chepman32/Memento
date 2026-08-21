import { getTransitionScrollOffset } from '../src/utils/transitionPickerScroll';

const metrics = {
  itemCount: 13,
  itemSpacing: 16,
  itemWidth: 64,
  viewportWidth: 320,
};

describe('getTransitionScrollOffset', () => {
  it('centers the current transition when there is room on both sides', () => {
    expect(
      getTransitionScrollOffset({
        ...metrics,
        selectedIndex: 5,
      }),
    ).toBe(272);
  });

  it('clamps transitions near either edge to the available scroll range', () => {
    expect(
      getTransitionScrollOffset({
        ...metrics,
        selectedIndex: 0,
      }),
    ).toBe(0);
    expect(
      getTransitionScrollOffset({
        ...metrics,
        selectedIndex: 12,
      }),
    ).toBe(720);
  });

  it('does not request a scroll without a valid current transition and layout', () => {
    expect(
      getTransitionScrollOffset({
        ...metrics,
        selectedIndex: -1,
      }),
    ).toBeNull();
    expect(
      getTransitionScrollOffset({
        ...metrics,
        selectedIndex: 13,
      }),
    ).toBeNull();
    expect(
      getTransitionScrollOffset({
        ...metrics,
        selectedIndex: 5,
        viewportWidth: 0,
      }),
    ).toBeNull();
  });
});
