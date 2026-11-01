import { Easing, interpolate } from 'remotion';
import { motion } from '../theme/tokens';

// The reference uses one motion vocabulary everywhere. These helpers are that vocabulary.

export const easeInOut = Easing.inOut(Easing.cubic);
export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);

export const msToFrames = (ms: number, fps: number) => Math.max(1, Math.round((ms / 1000) * fps));

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const progress = (frame: number, start: number, duration: number, easing = easeInOut) =>
  interpolate(frame, [start, start + Math.max(1, duration)], [0, 1], { ...clamp, easing });

// Universal entrance/exit: opacity + gaussian blur, no translate. Returns CSS for the element.
export function blurInOut(
  frame: number,
  fps: number,
  start: number,
  end: number | undefined,
  opts: { inMs?: number; outMs?: number; blur?: number; scaleFrom?: number } = {},
): React.CSSProperties {
  const inF = msToFrames(opts.inMs ?? motion.blurIn, fps);
  const outF = msToFrames(opts.outMs ?? motion.blurOut, fps);
  const blur = opts.blur ?? motion.blurPx;
  const pIn = progress(frame, start, inF, easeOut);
  const pOut = end === undefined ? 0 : progress(frame, end - outF, outF, easeIn);
  const visible = pIn * (1 - pOut);
  const b = blur * (1 - pIn) + blur * pOut;
  const s = opts.scaleFrom ? interpolate(pIn, [0, 1], [opts.scaleFrom, 1]) : 1;
  return {
    opacity: visible,
    filter: b > 0.05 ? `blur(${b.toFixed(2)}px)` : undefined,
    transform: s !== 1 ? `scale(${s})` : undefined,
  };
}

// Is the element on screen at all (cheap early-out for components).
export const isLive = (frame: number, start: number, end?: number) => frame >= start && (end === undefined || frame < end);

// Spring-like pop with a small overshoot (stickers, lit chapter tiles, callout dots).
export function pop(frame: number, fps: number, start: number, ms = 250, overshoot = 1.08) {
  const d = msToFrames(ms, fps);
  if (frame < start) return 0;
  const t = Math.min(1, (frame - start) / d);
  // back-out curve: rises past 1 then settles
  const c1 = (overshoot - 1) * 10 + 0.6;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Deterministic pseudo-random in [0,1) from an integer seed.
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
