import type {
  PhotoSegment,
  TimelineDescription,
  TransitionSegment,
} from './videoEncoder';

export interface PreviewPlaybackFrame {
  positionMs: number;
  boundaryKey: string;
  activePhotoSegment: PhotoSegment | null;
  activeTransitionSegment: TransitionSegment | null;
  transitionProgress: number;
}

const clampPosition = (positionMs: number, totalDurationMs: number) => {
  const finitePosition = Number.isFinite(positionMs) ? positionMs : 0;
  return Math.min(Math.max(finitePosition, 0), Math.max(totalDurationMs, 0));
};

export const resolvePreviewPlaybackFrame = (
  timeline: TimelineDescription,
  positionMs: number,
): PreviewPlaybackFrame => {
  const position = clampPosition(positionMs, timeline.totalDurationMs);
  const activeTransitionSegment =
    timeline.transitionSegments.find(
      segment => position >= segment.startMs && position < segment.endMs,
    ) ?? null;

  let activePhotoSegment: PhotoSegment | null =
    timeline.photoSegments[0] ?? null;

  for (const segment of timeline.photoSegments) {
    if (segment.startMs > position) {
      break;
    }
    activePhotoSegment = segment;
  }

  const rawTransitionProgress = activeTransitionSegment?.durationMs
    ? (position - activeTransitionSegment.startMs) /
      activeTransitionSegment.durationMs
    : 0;
  const transitionProgress = Math.min(Math.max(rawTransitionProgress, 0), 1);

  const boundaryKey = activeTransitionSegment
    ? [
        'transition',
        activeTransitionSegment.startMs,
        activeTransitionSegment.endMs,
        activeTransitionSegment.fromIndex,
        activeTransitionSegment.toIndex,
        activeTransitionSegment.isEntrance ? 'entrance' : 'regular',
      ].join(':')
    : [
        'photo',
        activePhotoSegment?.index ?? -1,
        activePhotoSegment?.startMs ?? -1,
        activePhotoSegment?.endMs ?? -1,
      ].join(':');

  return {
    positionMs: position,
    boundaryKey,
    activePhotoSegment,
    activeTransitionSegment,
    transitionProgress,
  };
};

export const shouldCommitPlaybackBoundary = (
  previousFrame: PreviewPlaybackFrame,
  nextFrame: PreviewPlaybackFrame,
): boolean => previousFrame.boundaryKey !== nextFrame.boundaryKey;
