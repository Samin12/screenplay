import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Overlay, Scene, Timeline } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { PANEL } from '../theme/panel';
import { blurInOut, easeOut, progress } from '../lib/anim';
import { RichText } from '../ui/RichText';
import { Icon } from '../ui/Icon';
import { textW } from '../stage/elements/groupA/kit';

// Top-level overlays: a level chip and a steps strip. They sit above every layout (panel, full, him)
// and below chapter cards, and they follow the layout: inside the panel while the panel is up, on the
// whole frame in `full` and `him`. On a layout switch they jump with the cut.

export const BAND_FULL = 126; // px of the frame a `band: true` strip reserves at the top
export const BAND_PANEL = 100; // the same inside the panel

type Region = { x: number; y: number; w: number; h: number; full: boolean };

const sceneAt = (t: Timeline, frame: number): Scene | undefined => t.scenes.find((s) => s.from <= frame && frame < s.from + s.duration);

function regionAt(t: Timeline, frame: number): Region | null {
  const s = sceneAt(t, frame);
  if (!s || s.kind === 'chapter') return null;
  if (t.look !== 'panel' || s.lay) return { x: 0, y: 0, w: t.width, h: t.height, full: true };
  return { x: PANEL.x, y: PANEL.y, w: PANEL.w, h: PANEL.h, full: false };
}

// The strip a scene is drawn under, if any: a `band` strip that overlaps the scene at all.
export function bandFor(t: Timeline, s: Scene): Extract<Overlay, { type: 'steps' }> | undefined {
  if (!t.overlays || s.kind === 'chapter' || s.lay === 'him') return undefined;
  return t.overlays.find((o): o is Extract<Overlay, { type: 'steps' }> => o.type === 'steps' && !!o.band && o.frame < s.from + s.duration && o.end > s.from);
}

// Scale a scene down under the band, anchored bottom centre (full frame: 1920x1080 -> 1697x954).
export const BandInset: React.FC<{ band: number; height: number; children: React.ReactNode }> = ({ band, height, children }) => (
  <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 100%', transform: `scale(${((height - band) / height).toFixed(5)})` }}>{children}</div>
);

const Chip: React.FC<{ o: Extract<Overlay, { type: 'chip' }>; r: Region; frame: number; fps: number }> = ({ o, r, frame, fps }) => {
  const t = useTheme();
  const k = r.full ? 1 : 0.86;
  const m = r.full ? 60 : 40;
  const corner = o.corner ?? 'top-left';
  const pos: React.CSSProperties = {
    ...(corner.endsWith('left') ? { left: r.x + m } : { right: 1920 - (r.x + r.w) + m }),
    ...(corner.startsWith('top') ? { top: r.y + m } : { bottom: 1080 - (r.y + r.h) + m }),
  };
  return (
    <div
      style={{
        position: 'absolute',
        ...pos,
        padding: `${22 * k}px ${34 * k}px ${24 * k}px ${30 * k}px`,
        borderRadius: 26 * k,
        background: 'rgba(24,23,22,0.86)',
        boxShadow: '0 0 0 2px rgba(255,255,255,0.08), 0 18px 50px rgba(0,0,0,0.35)',
        fontFamily: t.fonts.ui,
        whiteSpace: 'nowrap',
        ...blurInOut(frame, fps, o.frame, o.end, { inMs: 260, outMs: 220 }),
      }}
    >
      {o.eyebrow ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 * k, fontSize: 22 * k, fontWeight: 700, letterSpacing: '0.14em', color: t.accent, textTransform: 'uppercase' }}>
          <span style={{ width: 12 * k, height: 12 * k, borderRadius: '50%', background: t.accent, display: 'inline-block' }} />
          {o.eyebrow}
        </div>
      ) : null}
      <div style={{ fontSize: 50 * k, fontWeight: 700, letterSpacing: '-0.01em', color: '#f3efe8', marginTop: o.eyebrow ? 6 * k : 0, lineHeight: 1.15 }}>
        <RichText text={o.text} />
      </div>
    </div>
  );
};
const Steps: React.FC<{ o: Extract<Overlay, { type: 'steps' }>; r: Region; frame: number; fps: number }> = ({ o, r, frame, fps }) => {
  const t = useTheme();
  const FONT = 34;
  const PAD = 30;
  const GAP = 52;
  const ICON = 34;
  const labels = o.items.map((it, i) => `${i + 1} · ${it.text.replace(/\*/g, '')}`);
  const widths = labels.map((l, i) => PAD * 2 + (o.items[i].icon ? ICON + 14 : 0) + textW(l, FONT, 'display', 700));
  const natural = widths.reduce((a, b) => a + b, 0) + GAP * (o.items.length - 1);
  const band = r.full ? BAND_FULL : BAND_PANEL;
  const k = Math.min(r.full ? 1 : 0.8, (r.w - 80) / natural);
  let cur = -1;
  o.items.forEach((it, i) => {
    if (frame >= it.frame) cur = i;
  });
  const bottom = o.place === 'bottom' && !o.band;
  const cy = bottom ? r.y + r.h - band / 2 : r.y + band / 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: r.x,
        width: r.w,
        top: cy - (72 * k) / 2,
        height: 72 * k,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: GAP * k,
        fontFamily: t.fonts.ui,
        ...blurInOut(frame, fps, o.frame, o.end, { inMs: 260, outMs: 220 }),
      }}
    >
      {o.items.map((it, i) => {
        const on = i === cur;
        const done = i < cur;
        const p = on ? progress(frame, it.frame, 0.22 * fps, easeOut) : 0;
        return (
          <div key={i} style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {i > 0 ? <div style={{ position: 'absolute', left: -(GAP * k) / 2 - 9 * k, width: 18 * k, textAlign: 'center', fontSize: 26 * k, fontWeight: 700, color: i <= cur ? t.accent : '#5a554e' }}>→</div> : null}
            {/* the ring around the step that is on now */}
            {on ? <div style={{ position: 'absolute', inset: -12 * k * (2 - p), borderRadius: 48 * k, boxShadow: `0 0 0 ${3 * k}px ${t.accent}, 0 0 ${34 * k}px ${t.accentGlow}`, background: 'rgba(12,11,10,0.55)', opacity: p }} /> : null}
            <div
              style={{
                position: 'relative',
                height: 72 * k,
                padding: `0 ${PAD * k}px`,
                borderRadius: 36 * k,
                display: 'flex',
                alignItems: 'center',
                gap: 14 * k,
                whiteSpace: 'nowrap',
                fontSize: FONT * k,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: on || done ? '#f4f1ec' : '#8d877e',
                background: on ? `color-mix(in srgb, ${t.accent} ${Math.round(34 * p)}%, #262422)` : '#262422',
                boxShadow: `inset 0 0 0 ${2 * k}px ${on ? t.accent : 'rgba(255,255,255,0.09)'}, 0 10px 26px rgba(0,0,0,0.35)`,
              }}
            >
              {it.icon ? <Icon name={it.icon} size={ICON * k} color={on ? t.accent : done ? '#f4f1ec' : '#8d877e'} /> : null}
              {labels[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const OverlayLayer: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const list = timeline.overlays;
  if (!list || list.length === 0) return null;
  const r = regionAt(timeline, frame);
  if (!r) return null;
  const tail = Math.round(0.3 * fps);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {list.map((o, i) => (frame < o.frame - 1 || frame > o.end + tail ? null : o.type === 'chip' ? <Chip key={i} o={o} r={r} frame={frame} fps={fps} /> : <Steps key={i} o={o} r={r} frame={frame} fps={fps} />))}
    </AbsoluteFill>
  );
};
