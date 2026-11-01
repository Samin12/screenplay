import React from 'react';
import type { Tone } from '../../../types';
import type { Theme } from '../../../theme/tokens';
import { blurInOut, easeOut, msToFrames, pop, progress } from '../../../lib/anim';
import { Icon } from '../../../ui/Icon';
import { ClaudeMark } from '../../../ui/Logo';

// Shared helpers for the group A stage elements: deterministic text measurement, fit-to-box scaling,
// the per-item motion vocabulary (blur-in, pop, draw-on) and a few small reusable glyphs.

// ---------- Text measurement ----------
// Advance widths (per 100 px, ASCII 32..126) measured in the render browser for the fonts loaded in
// src/theme/fonts.ts. Deterministic, so layouts never depend on font-load timing.
const TABLES: Record<string, number[]> = {
  d500: [20,26,43,64,58,66,67,24,30,30,49,55,28,46,29,40,66,36,54,54,60,55,56,52,55,56,27,27,55,55,55,51,74,70,62,68,74,59,57,77,71,27,49,67,55,84,72,79,60,82,63,56,62,69,70,98,70,67,59,34,40,34,45,48,29,58,58,49,58,53,40,58,55,23,24,51,23,86,55,56,58,58,43,43,38,52,51,75,51,52,45,33,28,33,55],
  d600: [20,27,44,65,59,67,68,25,30,30,49,56,28,46,29,39,66,37,55,55,60,55,57,52,56,57,28,27,56,56,56,50,75,72,63,69,75,60,58,78,72,28,51,69,56,85,73,80,62,82,64,57,63,70,70,99,71,68,60,34,39,34,46,49,31,59,59,49,59,54,42,58,56,25,26,53,25,87,56,57,59,59,43,44,39,53,52,77,52,53,47,33,29,33,56],
  d700: [19,29,46,66,60,68,69,25,31,31,49,56,28,46,30,38,67,38,56,56,61,56,57,53,56,57,29,28,56,56,56,50,76,73,64,69,75,61,59,78,73,29,53,70,56,86,74,81,63,82,65,58,64,70,71,100,72,69,61,35,38,35,47,51,32,60,60,50,60,55,44,58,57,26,27,55,26,87,57,58,60,60,44,46,40,54,54,78,54,53,48,34,30,34,56],
  d800: [19,30,47,67,61,70,70,25,31,31,49,57,29,46,30,38,67,39,58,57,61,57,58,53,57,58,30,29,57,57,57,50,77,74,65,69,76,63,60,79,74,31,55,72,57,87,75,81,64,82,66,60,65,71,72,101,72,69,62,35,38,35,47,52,34,60,60,50,60,55,45,59,58,27,29,56,28,88,58,58,60,60,45,47,41,55,55,80,55,54,50,35,31,35,57],
  s500: [22,28,37,59,59,81,73,20,29,29,43,51,25,36,24,40,59,59,59,59,59,59,59,59,59,59,26,27,51,51,51,46,89,73,67,71,77,65,61,76,82,35,46,75,62,100,78,78,63,78,67,57,68,78,71,100,74,70,64,33,40,33,51,41,50,47,56,45,57,47,36,51,57,29,26,56,28,85,59,53,57,56,41,40,36,55,54,76,52,54,44,32,25,32,51],
  s600: [22,28,39,61,61,84,74,21,30,30,43,51,25,36,25,41,61,61,61,61,61,61,61,61,61,61,27,28,51,51,51,48,90,76,69,72,79,67,62,77,83,37,48,77,64,102,78,79,65,79,70,59,70,78,73,103,76,72,65,33,41,33,51,41,50,49,57,46,58,48,38,52,59,30,28,58,29,87,60,54,58,57,43,41,38,57,55,78,53,55,46,32,25,32,51],
  s700: [21,29,41,63,63,87,76,22,30,30,43,51,26,37,26,41,63,63,63,63,63,63,63,63,63,63,28,28,51,51,51,51,90,78,71,72,80,69,64,78,85,39,49,80,66,105,79,80,67,80,73,60,72,79,75,106,78,74,66,33,41,33,51,41,50,51,58,47,59,49,40,53,60,32,29,60,30,89,61,55,59,58,45,43,40,59,56,80,55,57,48,32,24,32,51],
};

export type FontKind = 'display' | 'serif';

let metrics: Record<FontKind, number> = { display: 1, serif: 1 };
export const setTextMetrics = (m: Record<FontKind, number>) => {
  metrics = m;
};

// Width in px of one line of text (`*accent*` markers are stripped). Slightly conservative.
export function textW(text: string, size: number, font: FontKind = 'display', weight = 600, tracking = 0): number {
  const w = font === 'serif' ? Math.min(700, Math.max(500, Math.round(weight / 100) * 100)) : Math.min(800, Math.max(500, Math.round(weight / 100) * 100));
  const tbl = TABLES[(font === 'serif' ? 's' : 'd') + w];
  const clean = text.replace(/\*/g, '');
  let sum = 0;
  for (const ch of clean) {
    const c = ch.codePointAt(0) ?? 65;
    sum += c >= 32 && c < 127 ? tbl[c - 32] : c > 0x2000 && c < 0x2bff ? 90 : 64;
  }
  return (sum / 100) * size * 1.03 * metrics[font] + tracking * clean.length + size * 0.06;
}

// Greedy word wrap against a max width; returns the lines.
export function wrap(text: string, size: number, maxW: number, font: FontKind = 'display', weight = 600): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && textW(next, size, font, weight) > maxW) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  // Keep `*accent*` spans balanced per line when a span is split across lines.
  let open = false;
  return (lines.length ? lines : ['']).map((l) => {
    let s = open ? `*${l}` : l;
    const n = (l.match(/\*/g) ?? []).length;
    if (n % 2 === 1) open = !open;
    if (open) s = `${s}*`;
    return s;
  });
}

// ---------- Fit to box ----------
// Draws children on a fixed design canvas (w x h) and scales it uniformly to fit the box.
export const fitScale = (w: number, h: number, box: { w: number; h: number }, max = 1) => Math.max(0.05, Math.min(max, box.w / w, box.h / h));

export const Fit: React.FC<{ w: number; h: number; box: { w: number; h: number }; max?: number; children: React.ReactNode }> = ({ w, h, box, max = 1, children }) => {
  const s = fitScale(w, h, box, max);
  return (
    <div style={{ position: 'relative', width: w * s, height: h * s, flexShrink: 0 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `scale(${s})`, transformOrigin: '0 0' }}>{children}</div>
    </div>
  );
};

// ---------- Motion ----------
// Universal per-item entrance (opacity + blur 14px -> 0, no translate).
export const reveal = (frame: number, fps: number, start: number, ms = 220, scaleFrom?: number): React.CSSProperties =>
  blurInOut(frame, fps, start, undefined, { inMs: ms, scaleFrom });

// Pop with a small overshoot plus blur (chips, badges, tree children).
export function popIn(frame: number, fps: number, start: number, ms = 280, overshoot = 1.1, from = 0.55): React.CSSProperties {
  if (frame < start) return { opacity: 0, transform: `scale(${from})` };
  const p = progress(frame, start, msToFrames(ms * 0.6, fps), easeOut);
  const k = pop(frame, fps, start, ms, overshoot);
  const s = from + (1 - from) * k;
  const b = 12 * (1 - p);
  return { opacity: p, filter: b > 0.05 ? `blur(${b.toFixed(2)}px)` : undefined, transform: `scale(${s.toFixed(4)})` };
}

// Stroke draw-on progress 0..1 (use with pathLength=1 and strokeDashoffset = 1 - p).
export const drawP = (frame: number, fps: number, start: number, ms = 300) => progress(frame, start, msToFrames(ms, fps), easeOut);

export const dash = (p: number): React.SVGProps<SVGPathElement> => ({ pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 - p });

// ---------- Colour ----------
export const toneColor = (t: Theme, tone: Tone | undefined, fallback?: string) => (tone ? t.tones[tone] : fallback ?? t.accent);

// Mix a colour into a base (dark tints for tiles and badges) without adding palette literals.
export const mix = (color: string, pct: number, base: string) => `color-mix(in srgb, ${color} ${pct}%, ${base})`;

// Soft drop shadow used under cards on the stage (lighter on the light theme).
export const cardShadow = (t: Theme) =>
  t.name === 'clay-light' ? '0 14px 30px rgba(60,45,30,0.13), 0 2px 6px rgba(60,45,30,0.08)' : '0 20px 44px rgba(0,0,0,0.42), 0 2px 6px rgba(0,0,0,0.25)';

// ---------- Glyphs ----------
// Claude-style pixel critter (the reference's "agent" mascot).
const CRITTER = ['..XX....XX..', '..XX....XX..', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XX..XXXX..XX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XX.XX..XX.XX', 'XX.XX..XX.XX'];

export const PixelCritter: React.FC<{ size: number; color: string; eye?: string }> = ({ size, color, eye }) => {
  const cols = CRITTER[0].length;
  const rows = CRITTER.length;
  const cell = size / cols;
  return (
    <svg width={size} height={cell * rows} viewBox={`0 0 ${cols} ${rows}`} shapeRendering="crispEdges" style={{ display: 'block' }}>
      {CRITTER.flatMap((row, y) =>
        row.split('').map((c, x) => (c === 'X' ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={color} /> : null)),
      )}
      {eye ? (
        <>
          <rect x={2} y={4} width={2} height={1} fill={eye} />
          <rect x={8} y={4} width={2} height={1} fill={eye} />
        </>
      ) : null}
    </svg>
  );
};

// Icon by name: lucide kebab names, plus "critter" (pixel mascot) and "claude" (starburst tile).
export const Glyph: React.FC<{ name?: string; size: number; color: string; stroke?: number }> = ({ name, size, color, stroke = 2.2 }) => {
  if (name === 'critter') {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PixelCritter size={size * 0.92} color={color} />
      </div>
    );
  }
  if (name === 'claude') {
    return (
      <div style={{ width: size, height: size, borderRadius: size * 0.22, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ClaudeMark size={size * 0.7} />
      </div>
    );
  }
  // (Icon types `stroke` as number & string; pass strokeWidth, which Icon forwards and lets override.)
  return <Icon name={name} size={size} color={color} strokeWidth={stroke} />;
};

// Round status badge: good = check, bad = x, warn = "!", otherwise a dot.
export const Badge: React.FC<{ t: Theme; tone: Tone; size: number; style?: React.CSSProperties }> = ({ t, tone, size, style }) => {
  const c = t.tones[tone];
  const icon = tone === 'good' ? 'check' : tone === 'bad' ? 'x' : tone === 'warn' ? 'exclamation' : undefined;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: mix(c, 24, t.bg),
        boxShadow: `inset 0 0 0 ${Math.max(1, size * 0.03)}px ${mix(c, 45, t.bg)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      {icon === 'exclamation' ? (
        <div style={{ fontFamily: t.fonts.display, fontWeight: 800, fontSize: size * 0.62, color: c, lineHeight: 1 }}>!</div>
      ) : icon ? (
        <Icon name={icon} size={size * 0.58} color={c} strokeWidth={3} />
      ) : (
        <div style={{ width: size * 0.3, height: size * 0.3, borderRadius: size, background: c }} />
      )}
    </div>
  );
};
