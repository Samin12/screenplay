import React from 'react';
import { interpolate } from 'remotion';
import type { Rect } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { blurInOut, easeOut, msToFrames, pop, progress } from '../lib/anim';
import { motion } from '../theme/tokens';

// Screen-space overlays that sit above the replica. All positions are in output pixels.

export const Cursor: React.FC<{ x: number; y: number; scale: number; pressed: boolean }> = ({ x, y, scale, pressed }) => {
  const s = Math.max(0.8, Math.min(3, scale)) * (pressed ? 0.94 : 1);
  return (
    <svg
      width={28 * s}
      height={40 * s}
      viewBox="0 0 28 40"
      style={{ position: 'absolute', left: x - 3 * s, top: y - 2 * s, overflow: 'visible', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.45))' }}
    >
      <path d="M3 2 L3 31 L10 24.5 L14.6 35.5 L19.2 33.6 L14.7 22.8 L24 22.8 Z" fill="#fff" stroke="#000" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
};

export const Tooltip: React.FC<{ rect: Rect; text: string; frame: number; since: number; fps: number }> = ({ rect, text, frame, since, fps }) => {
  const st = blurInOut(frame, fps, since, undefined, { inMs: 200 });
  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x + rect.w / 2,
        top: rect.y + rect.h + 10,
        transform: 'translateX(-50%)',
        background: '#2b2b2b',
        border: '1px solid #3a3a3a',
        color: '#efefef',
        font: `500 22px Inter, system-ui, sans-serif`,
        padding: '8px 14px',
        borderRadius: 10,
        whiteSpace: 'nowrap',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        ...st,
      }}
    >
      {text}
    </div>
  );
};

export const ClickRing: React.FC<{ rect: Rect; age: number; fps: number }> = ({ rect, age, fps }) => {
  const t = useTheme();
  const p = Math.min(1, age / (0.6 * fps));
  const r = Math.max(rect.w, rect.h) / 2 + 10 + 40 * easeOut(p);
  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x + rect.w / 2 - r,
        top: rect.y + rect.h / 2 - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        border: `3px solid ${t.accent}`,
        opacity: 1 - p,
      }}
    />
  );
};

// Dim everything except `hole` (rounded). opacity 0..1 drives the scrim.
export const Scrim: React.FC<{ opacity: number; hole?: Rect | null; width: number; height: number; color?: string }> = ({ opacity, hole, width, height, color }) => {
  const t = useTheme();
  if (opacity <= 0.001) return null;
  const pad = 10;
  const r = 14;
  let d = `M0 0 H${width} V${height} H0 Z`;
  if (hole) {
    const x = hole.x - pad,
      y = hole.y - pad,
      w = hole.w + pad * 2,
      h = hole.h + pad * 2;
    d += ` M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
  }
  return (
    <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
      <path d={d} fill={color ?? t.scrim} fillRule="evenodd" opacity={opacity} />
    </svg>
  );
};

// Dot + leader line + label. Builds as: dot pops, ring pings, line draws, label blurs in.
export const Callout: React.FC<{
  rect: Rect;
  side: 'left' | 'right' | 'top' | 'bottom';
  text: string;
  sub?: string;
  frame: number;
  start: number;
  end: number;
  fps: number;
  backing?: boolean; // dark pill behind the label, for light pages
}> = ({ rect, side, text, sub, frame, start, end, fps, backing }) => {
  const t = useTheme();
  if (frame < start || frame > end + msToFrames(250, fps)) return null;
  const dotT = start + msToFrames(130, fps);
  const lineStart = start + msToFrames(200, fps);
  const labelStart = start + msToFrames(400, fps);
  const dotS = Math.max(0, pop(frame, fps, dotT, motion.calloutDot, 1.15));
  const lineP = progress(frame, lineStart, msToFrames(motion.calloutLine, fps), easeOut);
  const exit = 1 - progress(frame, end, msToFrames(200, fps));
  const ringP = progress(frame, dotT, msToFrames(450, fps), easeOut);

  const len = side === 'left' || side === 'right' ? 90 : 80;
  const anchor =
    side === 'right'
      ? { x: rect.x + rect.w + 8, y: rect.y + rect.h / 2 }
      : side === 'left'
        ? { x: rect.x - 8, y: rect.y + rect.h / 2 }
        : side === 'top'
          ? { x: rect.x + rect.w / 2, y: rect.y - 8 }
          : { x: rect.x + rect.w / 2, y: rect.y + rect.h + 8 };
  const dir = side === 'right' ? [1, 0] : side === 'left' ? [-1, 0] : side === 'top' ? [0, -1] : [0, 1];
  const tip = { x: anchor.x + dir[0] * len * lineP, y: anchor.y + dir[1] * len * lineP };
  const full = { x: anchor.x + dir[0] * len, y: anchor.y + dir[1] * len };
  const label = blurInOut(frame, fps, labelStart, undefined, { inMs: motion.calloutLabel });

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    color: '#fff',
    fontFamily: t.fonts.display,
    fontWeight: 600,
    fontSize: 50,
    lineHeight: 1.05,
    whiteSpace: 'nowrap',
    textShadow: backing ? undefined : '0 2px 16px rgba(0,0,0,0.65)',
    ...(backing ? { background: 'rgba(20,18,15,0.9)', padding: '10px 20px', borderRadius: 14 } : {}),
    ...label,
  };
  const labelPos: React.CSSProperties =
    side === 'right'
      ? { left: full.x + 16, top: full.y, transform: `translateY(-50%) ${label.transform ?? ''}` }
      : side === 'left'
        ? { left: full.x - 16, top: full.y, transform: `translate(-100%, -50%) ${label.transform ?? ''}`, textAlign: 'right' }
        : side === 'top'
          ? { left: full.x, top: full.y - 10, transform: `translate(-50%, -100%) ${label.transform ?? ''}`, textAlign: 'center' }
          : { left: full.x, top: full.y + 10, transform: `translateX(-50%) ${label.transform ?? ''}`, textAlign: 'center' };

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: exit }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {lineP > 0 && <line x1={anchor.x} y1={anchor.y} x2={tip.x} y2={tip.y} stroke={backing ? "#14120f" : "#fff"} strokeWidth={2.5} />}
        {ringP > 0 && ringP < 1 && <circle cx={anchor.x} cy={anchor.y} r={11 + 26 * ringP} fill="none" stroke={t.accent} strokeWidth={1.5} opacity={0.6 * (1 - ringP)} />}
        {dotS > 0 && (
          <g transform={`translate(${anchor.x} ${anchor.y}) scale(${dotS})`}>
            <circle r={11} fill={t.accent} stroke="#fff" strokeWidth={3} />
          </g>
        )}
      </svg>
      <div style={{ ...labelStyle, ...labelPos }}>
        {text}
        {sub ? <div style={{ fontWeight: 400, fontSize: 30, color: '#e6e4df', marginTop: 6 }}>{sub}</div> : null}
      </div>
    </div>
  );
};

// Accent mark on a target: ring (draw-on outline), marker (wipe, lighten blend), underline (wipe).
export const Mark: React.FC<{ rect: Rect; style: 'ring' | 'marker' | 'underline'; frame: number; start: number; end: number; fps: number; tone: 'dark' | 'light' }> = ({
  rect,
  style,
  frame,
  start,
  end,
  fps,
  tone,
}) => {
  const t = useTheme();
  if (frame < start || frame > end + msToFrames(250, fps)) return null;
  const p = progress(frame, start, msToFrames(style === 'ring' ? 350 : 200, fps), easeOut);
  const exit = 1 - progress(frame, end, msToFrames(200, fps));
  if (style === 'ring') {
    const pad = 8;
    const x = rect.x - pad,
      y = rect.y - pad,
      w = rect.w + pad * 2,
      h = rect.h + pad * 2;
    const perim = 2 * (w + h);
    return (
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: exit, filter: `drop-shadow(0 0 10px ${t.accentGlow})` }}>
        <rect x={x} y={y} width={w} height={h} rx={14} fill="none" stroke={t.accent} strokeWidth={3.5} strokeDasharray={perim} strokeDashoffset={perim * (1 - p)} />
      </svg>
    );
  }
  if (style === 'underline') {
    return <div style={{ position: 'absolute', left: rect.x, top: rect.y + rect.h + 2, width: rect.w * p, height: 5, borderRadius: 3, background: t.accent, opacity: exit }} />;
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x - 6,
        top: rect.y - 2,
        width: (rect.w + 12) * p,
        height: rect.h + 4,
        borderRadius: 6,
        background: t.accent,
        mixBlendMode: tone === 'dark' ? 'lighten' : 'multiply',
        opacity: exit,
      }}
    />
  );
};

export const fadeWindow = (frame: number, start: number, end: number, fps: number, inMs = 250, outMs = 250) =>
  interpolate(frame, [start, start + msToFrames(inMs, fps), end, end + msToFrames(outMs, fps)], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
