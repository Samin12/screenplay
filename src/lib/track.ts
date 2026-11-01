// Face x at a frame, from camera.track. A jump cut moves the head instantly, so the crop does too.
export const trackedX = (track: { fps: number; x: number[] }, frame: number, fps: number, cuts: number[]): number => {
  const step = fps / track.fps;
  const pos = Math.max(0, Math.min(track.x.length - 1, frame / step));
  const i = Math.floor(pos);
  const j = Math.min(track.x.length - 1, i + 1);
  const a = i * step;
  const b = j * step;
  const cut = cuts.find((c) => c > a && c <= b);
  if (cut !== undefined) return frame < cut ? track.x[i] : track.x[j];
  return track.x[i] + (track.x[j] - track.x[i]) * (pos - i);
};
