export const MIN_COMIC_ZOOM = 1.0;
export const MAX_COMIC_ZOOM = 4.0;
export const DOUBLE_TAP_COMIC_ZOOM = 2.5;

export function clampComicZoom(scale: number): number {
  if (!Number.isFinite(scale)) return MIN_COMIC_ZOOM;
  return Math.max(MIN_COMIC_ZOOM, Math.min(MAX_COMIC_ZOOM, Number(scale.toFixed(2))));
}

export function toggleDoubleTapZoom(currentScale: number): number {
  return currentScale > 1.05 ? MIN_COMIC_ZOOM : DOUBLE_TAP_COMIC_ZOOM;
}

export function clampComicPanOffset(
  offset: { x: number; y: number },
  scale: number,
  viewport: { width: number; height: number }
): { x: number; y: number } {
  const clampedScale = clampComicZoom(scale);
  if (clampedScale <= 1.01) {
    return { x: 0, y: 0 };
  }
  const maxX = Math.max(0, ((clampedScale - 1) * viewport.width) / 2);
  const maxY = Math.max(0, ((clampedScale - 1) * viewport.height) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, offset.x)),
    y: Math.max(-maxY, Math.min(maxY, offset.y)),
  };
}
