import { TransitionType } from '../src/types/project.types';
import {
  resolvePreviewPlaybackFrame,
  shouldCommitPlaybackBoundary,
} from '../src/utils/previewPlayback';
import type { TimelineDescription } from '../src/utils/videoEncoder';

const timeline: TimelineDescription = {
  photoSegments: [
    {
      type: 'photo',
      index: 0,
      id: 'photo-a',
      uri: 'a.jpg',
      startMs: 0,
      endMs: 1000,
      durationMs: 1000,
      transitionOutDurationMs: 200,
    },
    {
      type: 'photo',
      index: 1,
      id: 'photo-b',
      uri: 'b.jpg',
      startMs: 1200,
      endMs: 2200,
      durationMs: 1000,
      transitionOutDurationMs: 0,
    },
  ],
  transitionSegments: [
    {
      type: 'transition',
      fromIndex: 0,
      toIndex: 1,
      startMs: 1000,
      endMs: 1200,
      durationMs: 200,
      transition: {
        type: TransitionType.DISSOLVE,
        durationMs: 200,
      },
    },
  ],
  segments: [],
  totalDurationMs: 2200,
};

describe('preview playback frame scheduling', () => {
  it('keeps one React boundary key throughout a photo hold', () => {
    const firstFrame = resolvePreviewPlaybackFrame(timeline, 10);
    const laterFrame = resolvePreviewPlaybackFrame(timeline, 990);

    expect(firstFrame.boundaryKey).toBe(laterFrame.boundaryKey);
    expect(shouldCommitPlaybackBoundary(firstFrame, laterFrame)).toBe(false);
  });

  it('commits at transition boundaries while progress remains frame-accurate', () => {
    const photoFrame = resolvePreviewPlaybackFrame(timeline, 999);
    const transitionStart = resolvePreviewPlaybackFrame(timeline, 1000);
    const transitionMiddle = resolvePreviewPlaybackFrame(timeline, 1100);
    const incomingPhoto = resolvePreviewPlaybackFrame(timeline, 1200);

    expect(shouldCommitPlaybackBoundary(photoFrame, transitionStart)).toBe(
      true,
    );
    expect(transitionStart.transitionProgress).toBe(0);
    expect(transitionMiddle.transitionProgress).toBe(0.5);
    expect(
      shouldCommitPlaybackBoundary(transitionStart, transitionMiddle),
    ).toBe(false);
    expect(shouldCommitPlaybackBoundary(transitionMiddle, incomingPhoto)).toBe(
      true,
    );
    expect(incomingPhoto.activePhotoSegment?.index).toBe(1);
  });

  it('clamps invalid and out-of-range positions safely', () => {
    expect(resolvePreviewPlaybackFrame(timeline, Number.NaN).positionMs).toBe(
      0,
    );
    expect(resolvePreviewPlaybackFrame(timeline, -10).positionMs).toBe(0);
    expect(resolvePreviewPlaybackFrame(timeline, 9999).positionMs).toBe(2200);
  });
});
