import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ChapterInfo, ChapterScene } from '../types';
import { Vignette, DotGrid } from '../layers/Backgrounds';
import { useLook, useTheme } from '../theme/ThemeContext';
import { easeOut, progress } from '../lib/anim';
import { chapterHeadingParts, chapterRows } from '../lib/chapters';
import { textW } from '../stage/elements/groupA/kit';

// The "path" chapter card (`chapters.style: path`). Every chapter is a tile, in rows (`group`).
// Chapters already done keep their titles, dimmed, with a check. Chapters still ahead are locked: a
// lock glyph and no title. The new chapter is revealed by an accent line that travels one step from
// the previous chapter's tile (under the tiles in the same row; down and across to the next row),
// landing as the tile lights and the chapter's title builds large above the rows.
//
// The card cuts in and out hard: no frame of it is faded. `lead` is extra time at the front (the
// breather): the line still takes about a second, measured from the card's first frame.

const W = 1920;
const H = 1080;
const TILE_W = 206;
const TILE_WIDE = 300;
const TILE_H = 112;
const GAP = 16;
const ROW_GAP = 20;
const TITLE_PX = 118;
const MAX_ROW_W = 1780;

export const PATH_LINE_START_S = 0.2;
export const PATH_LINE_S = 0.6;

type Box = { x: number; y: number; w: number; h: number };

// Tile boxes in the 1920x1080 design space, plus where the heading and the title sit.
export function pathLayout(chapters: { group?: string }[]): { tiles: Box[]; rows: number[][]; scale: number; headingY: number; titleY: number } {
  const rows = chapterRows(chapters);
  const widths = rows.map((r) => r.reduce((s, _, j) => s + (j === 0 ? TILE_WIDE : TILE_W), 0) + GAP * (r.length - 1));
  // Few chapters: bigger tiles, so the card still fills. Many: shrink until the widest row fits.
  const scale = Math.min(1.5, MAX_ROW_W / Math.max(1, ...widths), 560 / Math.max(1, rows.length * TILE_H + (rows.length - 1) * ROW_GAP));
  const tw = (j: number) => (j === 0 ? TILE_WIDE : TILE_W) * scale;
  const th = TILE_H * scale;
  const gap = GAP * scale;
  const rowGap = ROW_GAP * scale;
  const gridH = rows.length * th + Math.max(0, rows.length - 1) * rowGap;
  const headH = 30 + 18 + TITLE_PX * 1.02 + 56; // heading, gap, title, gap
  const top = Math.max(40, (H - headH - gridH) / 2);
  const tiles: Box[] = [];
  rows.forEach((r, ri) => {
    let x = (W - widths[ri] * scale) / 2;
    r.forEach((idx, j) => {
      tiles[idx] = { x, y: top + headH + ri * (th + rowGap), w: tw(j), h: th };
      x += tw(j) + gap;
    });
  });
  return { tiles, rows, scale, headingY: top, titleY: top + 30 + 18 };
}

// The route from the previous chapter's tile to the new one.
export function pathPoints(p: Box, c: Box): [number, number][] {
  const pc = p.x + p.w / 2;
  const cc = c.x + c.w / 2;
  if (Math.abs(p.y - c.y) < 5) {
    const y = p.y + p.h;
    return [
      [pc, y],
      [pc, y + 11],
      [cc, y + 11],
      [cc, y],
    ];
  }
  const mid = (p.y + p.h + c.y) / 2;
  return [
    [pc, p.y + p.h],
    [pc, mid],
    [cc, mid],
    [cc, c.y],
  ];
}

function partial(pts: [number, number][], fr: number): [number, number][] {
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  let left = fr * seg.reduce((a, b) => a + b, 0);
  const out: [number, number][] = [pts[0]];
  for (let i = 0; i < seg.length; i++) {
    if (left >= seg[i]) {
      out.push(pts[i + 1]);
      left -= seg[i];
    } else {
      const t = seg[i] ? left / seg[i] : 0;
      out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]);
      break;
    }
  }
  return out;
}

const Lock: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <rect x={4} y={11} width={16} height={10} rx={2.5} />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export const ChapterPathView: React.FC<{ scene: ChapterScene; chapters: ChapterInfo[]; heading: string }> = ({ scene, chapters, heading }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = useTheme();
  const panelLook = useLook() === 'panel';
  const light = t.name === 'clay-light';
  const ink = light ? '0,0,0' : '255,255,255';
  const k = Math.min(width / W, height / H);
  const active = Math.min(scene.index, chapters.length - 1);
  const { tiles, scale, headingY, titleY } = pathLayout(chapters);
  const cur = chapters[active];
  const prevBox = active > 0 ? tiles[active - 1] : null;
  const pts = prevBox ? pathPoints(prevBox, tiles[active]) : null;

  const lineStart = PATH_LINE_START_S * fps;
  const lineP = pts ? progress(frame, lineStart, PATH_LINE_S * fps, easeOut) : 1;
  const land = pts ? lineStart + PATH_LINE_S * fps : 0.25 * fps;
  const lit = progress(frame, land, 0.2 * fps, easeOut);
  const titleP = progress(frame, land, 0.28 * fps, easeOut);
  const drawn = pts && lineP > 0 ? partial(pts, lineP) : null;
  const head = drawn ? drawn[drawn.length - 1] : null;

  const parts = chapterHeadingParts(cur);
  const full = `${parts.label} ${parts.rest}`.trim();
  const titlePx = Math.min(TITLE_PX, (TITLE_PX * 1760) / Math.max(1, textW(full, TITLE_PX, 'display', 800, -0.03)));
  const small = 16 * scale;
  const body = 25 * scale;

  return (
    <AbsoluteFill>
      <Vignette />
      {panelLook ? null : (
        <AbsoluteFill style={{ opacity: 0.55 }}>
          <DotGrid />
        </AbsoluteFill>
      )}
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `translate(${(width - W * k) / 2}px, ${(height - H * k) / 2}px) scale(${k})`, fontFamily: t.fonts.ui }}>
        {/* heading */}
        <div style={{ position: 'absolute', left: 0, width: W, top: headingY, height: 30, textAlign: 'center', fontSize: 30, lineHeight: '30px', fontWeight: 700, letterSpacing: '0.22em', color: t.accent, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {heading.replace(/\*/g, '')}
        </div>
        {/* the new chapter's title: the same string as its YouTube chapter line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: W,
            top: titleY,
            height: TITLE_PX * 1.02,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: titlePx,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.02,
            color: t.text,
            whiteSpace: 'pre',
            opacity: titleP,
            filter: titleP < 0.999 ? `blur(${(14 * (1 - titleP)).toFixed(2)}px)` : undefined,
          }}
        >
          {parts.label ? <span style={{ color: t.accent }}>{parts.label} </span> : null}
          {parts.rest}
        </div>
        {/* tiles */}
        {chapters.map((c, i) => {
          const b = tiles[i];
          const done = i < active;
          const on = i === active ? lit : 0;
          const shown = done || (i === active && lit > 0);
          const base: React.CSSProperties = { position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: 20 * scale, boxSizing: 'border-box', overflow: 'hidden' };
          return (
            <React.Fragment key={i}>
              {/* locked face (also under the tile that is about to light) */}
              {!done ? (
                <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `rgba(${ink},0.025)`, boxShadow: `inset 0 0 0 1.5px rgba(${ink},0.05)`, opacity: 1 - on }}>
                  <Lock size={30 * scale} color={light ? '#b5ada2' : '#5a554e'} />
                </div>
              ) : null}
              {shown ? (
                <div
                  style={{
                    ...base,
                    padding: `${17 * scale}px ${18 * scale}px`,
                    fontSize: body,
                    fontWeight: 650,
                    lineHeight: 1.16,
                    opacity: done ? 1 : on,
                    color: done ? (light ? '#6f675c' : '#bdb6ab') : t.text,
                    background: done ? `rgba(${ink},0.06)` : light ? '#fbe9e0' : '#2a1d17',
                    boxShadow: done ? `inset 0 0 0 1.5px rgba(${ink},0.08)` : `inset 0 0 0 3px ${t.accent}, 0 0 44px ${t.accentGlow}`,
                  }}
                >
                  <div style={{ fontSize: small, fontWeight: 700, letterSpacing: '0.14em', marginBottom: 7 * scale, color: done ? (light ? '#b0704f' : '#a8644a') : t.accent, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {done ? '✓ ' : ''}
                    {c.label ?? 'Chapter'}
                  </div>
                  {c.title.replace(/\*/g, '')}
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
        {/* the line: travels once, then stays as a quiet trace */}
        {drawn && head ? (
          <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: 1 - 0.45 * lit, filter: `drop-shadow(0 0 9px ${t.accentGlow})` }}>
            <polyline points={drawn.map((p) => p.join(',')).join(' ')} fill="none" stroke={t.accent} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={head[0]} cy={head[1]} r={11} fill="#ffaa82" />
          </svg>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
