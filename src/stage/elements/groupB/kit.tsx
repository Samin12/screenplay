import React, { useLayoutEffect, useRef, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import type { Rect } from '../../../types';
import type { Theme } from '../../../theme/tokens';
import { easeOut, msToFrames, pop, progress } from '../../../lib/anim';

// Shared pieces for the group B elements: theme colour mixing, fit-to-box, the marker wipe, the
// sticker, the callout leader and the check / cross glyphs.

// ---------- colour helpers (theme-relative, no hard-coded palette) ----------

export const mix = (a: string, b: string, pctA: number) => `color-mix(in srgb, ${a} ${pctA}%, ${b})`;
export const alpha = (c: string, a: number) => `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
export const isDark = (t: Theme) => t.name !== 'clay-light';

// Media path: absolute URLs pass through, anything else is a file in the public (work) dir.
export const mediaSrc = (src: string) => (/^(https?:|data:|blob:)/i.test(src) ? src : staticFile(src.replace(/^\/+/, '')));

// ---------- Fit: scale content down (never up) so it never overflows its box ----------
// Measures the content's natural layout size once (offsetWidth/Height ignore transforms, so the
// envelope's blur/scale never skews it) and holds the frame with delayRender until it has. Layout
// of every element here is frame-independent (animations only use transforms, opacity and
// absolutely positioned overlays), so one measurement is valid for every frame.

export const Fit: React.FC<{
  box: Rect;
  children: React.ReactNode;
  measureKey: string;
  margin?: number;
  max?: number;
}> = ({ box, children, measureKey, margin = 8, max = 1 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ key: string; w: number; h: number } | null>(null);
  const [first] = useState(() => delayRender('groupB fit', { timeoutInMilliseconds: 60000 }));
  const firstDone = useRef(false);

  useLayoutEffect(() => {
    let cancelled = false;
    const handle = firstDone.current ? delayRender('groupB refit', { timeoutInMilliseconds: 60000 }) : first;
    firstDone.current = true;
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        continueRender(handle);
      }
    };
    const run = async () => {
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const el = ref.current;
      if (!cancelled && el) setSize({ key: measureKey, w: el.offsetWidth, h: el.offsetHeight });
      release();
    };
    run();
    return () => {
      cancelled = true;
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measureKey]);

  const s = size && size.w > 0 && size.h > 0 ? Math.min(max, (box.w - margin * 2) / size.w, (box.h - margin * 2) / size.h) : 1;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div ref={ref} style={{ width: 'max-content', flexShrink: 0, transform: s !== 1 ? `scale(${s})` : undefined, transformOrigin: 'center center' }}>
        {children}
      </div>
    </div>
  );
};

// ---------- Marker: accent highlight that wipes left -> right behind a phrase ----------

export const markerMs = (phrase: string) => Math.min(450, Math.max(170, phrase.length * 11));

export const Marker: React.FC<{ children: React.ReactNode; p: number; color: string; textColor?: string }> = ({ children, p, color, textColor }) => (
  <span
    style={{
      backgroundImage: `linear-gradient(${color}, ${color})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'left center',
      backgroundSize: `${(p * 100).toFixed(2)}% 100%`,
      borderRadius: 6,
      padding: '0.02em 0.16em',
      margin: '0 -0.16em',
      boxDecorationBreak: 'clone',
      WebkitBoxDecorationBreak: 'clone',
      color: textColor,
    }}
  >
    {children}
  </span>
);

// Split `text` around the first occurrence of `phrase` (case-insensitive). Null if not found.
export const splitPhrase = (text: string, phrase?: string): [string, string, string] | null => {
  if (!phrase) return null;
  const i = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (i < 0) return null;
  return [text.slice(0, i), text.slice(i, i + phrase.length), text.slice(i + phrase.length)];
};

// ---------- Sticker: rotated accent slab with heavy white type that pops in ----------

export const stickerFont = (text: string, base: number) => {
  const n = text.length;
  return n <= 4 ? base : n <= 7 ? base * 0.8 : n <= 11 ? base * 0.64 : n <= 18 ? base * 0.5 : base * 0.4;
};

export const stickerScale = (frame: number, fps: number, start: number) => {
  if (frame < start) return { scale: 0, opacity: 0 };
  // 0.3 -> ~1.05 -> 1 in 250 ms, opacity in over the first 100 ms
  const p = pop(frame, fps, start, 250, 1.07);
  return { scale: 0.3 + 0.7 * p, opacity: progress(frame, start, msToFrames(100, fps), easeOut) };
};

export const StickerSlab: React.FC<{ text: string; fontSize: number; rotate: number; t: Theme; scale: number; opacity: number; origin?: string }> = ({
  text,
  fontSize,
  rotate,
  t,
  scale,
  opacity,
  origin = 'center center',
}) => (
  <div
    style={{
      background: `linear-gradient(170deg, ${mix(t.accent, '#fff', 92)} 0%, ${t.accent} 55%, ${mix(t.accent, '#000', 90)} 100%)`,
      color: '#fff',
      fontFamily: t.fonts.display,
      fontWeight: 900,
      fontSize,
      lineHeight: 1,
      letterSpacing: -fontSize * 0.02,
      padding: `${fontSize * 0.36}px ${fontSize * (text.length > 5 ? 0.55 : 0.42)}px ${fontSize * 0.42}px`,
      borderRadius: Math.max(18, fontSize * 0.19),
      whiteSpace: 'nowrap',
      boxShadow: `0 10px 30px rgba(0,0,0,0.42), 0 2px 0 ${mix(t.accent, '#fff', 70)} inset`,
      transform: `rotate(${rotate}deg) scale(${scale})`,
      transformOrigin: origin,
      opacity,
    }}
  >
    {text}
  </div>
);

// ---------- Callout leader: dot (with ping ring) + leader line + label ----------
// Positioned with its anchor (the dot centre) at (0,0) of the parent; the line runs to (dx,dy).

export const Leader: React.FC<{
  text: string;
  frame: number;
  fps: number;
  start: number;
  dx: number;
  dy: number;
  t: Theme;
  fontSize?: number;
}> = ({ text, frame, fps, start, dx, dy, t, fontSize = 46 }) => {
  if (frame < start) return null;
  const dotS = Math.max(0, pop(frame, fps, start, 150, 1.15));
  const ringP = progress(frame, start, msToFrames(420, fps), easeOut);
  const lineP = progress(frame, start + msToFrames(120, fps), msToFrames(200, fps), easeOut);
  const labelP = progress(frame, start + msToFrames(300, fps), msToFrames(200, fps), easeOut);
  const pad = 40;
  const minX = Math.min(0, dx) - pad;
  const minY = Math.min(0, dy) - pad;
  const w = Math.abs(dx) + pad * 2;
  const h = Math.abs(dy) + pad * 2;
  const right = dx >= 0;
  return (
    <>
      <svg width={w} height={h} style={{ position: 'absolute', left: minX, top: minY, overflow: 'visible' }}>
        <g transform={`translate(${-minX} ${-minY})`}>
          {lineP > 0 ? (
            <line x1={0} y1={0} x2={dx * lineP} y2={dy * lineP} style={{ stroke: '#fff' }} strokeWidth={3} strokeLinecap="round" />
          ) : null}
          {ringP > 0 && ringP < 1 ? <circle cx={0} cy={0} r={11 + 22 * ringP} fill="none" style={{ stroke: t.accent }} strokeWidth={2} opacity={0.7 * (1 - ringP)} /> : null}
          <g transform={`scale(${dotS})`}>
            <circle r={11} style={{ fill: t.accent, stroke: '#fff' }} strokeWidth={3.5} />
          </g>
        </g>
      </svg>
      <div
        style={{
          position: 'absolute',
          left: dx + (right ? 16 : -16),
          top: dy,
          transform: `translate(${right ? '0' : '-100%'}, -62%) translateY(${(1 - labelP) * 8}px)`,
          opacity: labelP,
          filter: labelP < 1 ? `blur(${(12 * (1 - labelP)).toFixed(2)}px)` : undefined,
          whiteSpace: 'nowrap',
          fontFamily: t.fonts.display,
          fontWeight: 600,
          fontSize,
          lineHeight: 1.05,
          color: isDark(t) ? '#fff' : t.text,
          textShadow: isDark(t) ? '0 2px 16px rgba(0,0,0,0.6)' : undefined,
        }}
      >
        {text}
      </div>
    </>
  );
};

// ---------- Glyphs ----------

// Check mark that draws its stroke on (p 0..1), with a tiny scale pop.
export const CheckGlyph: React.FC<{ size: number; color: string; p: number; stroke?: number }> = ({ size, color, p, stroke = 4.2 }) => {
  const len = 30;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ overflow: 'visible' }}>
      <path
        d="M6 16.5 L13 23.5 L26.5 9"
        fill="none"
        style={{ stroke: color }}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - p)}
      />
    </svg>
  );
};

export const CrossGlyph: React.FC<{ size: number; color: string; p: number; stroke?: number }> = ({ size, color, p, stroke = 3.6 }) => {
  const len = 17;
  const a = Math.min(1, p * 2);
  const b = Math.max(0, p * 2 - 1);
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <path d="M10 10 L22 22" fill="none" style={{ stroke: color }} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - a)} />
      <path d="M22 10 L10 22" fill="none" style={{ stroke: color }} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - b)} />
    </svg>
  );
};

// Gaussian-blur-in with no translate, for inner parts (returns CSS).
export const partIn = (frame: number, fps: number, start: number, ms = 220, blur = 12): React.CSSProperties => {
  const p = progress(frame, start, msToFrames(ms, fps), easeOut);
  return { opacity: p, filter: p < 1 ? `blur(${(blur * (1 - p)).toFixed(2)}px)` : undefined };
};
