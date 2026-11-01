import React from 'react';
import type { ElementProps } from '../../ElementView';
import { useTheme } from '../../../theme/ThemeContext';
import { easeOut, msToFrames, progress, rand } from '../../../lib/anim';
import { alpha, isDark, mix, partIn } from './kit';

// Session-card grid (reference 6:17 "20 most recently active"): `count` mini session cards in
// `columns` columns, each with two cream placeholder lines. Rows build top -> bottom; cards sit dim
// (~30%) until lit. `lit` entries (0-based `index`, optional `span` for a run of cards) light up on
// their frame with an accent border, sweeping row by row. A `label` starting with a number renders
// the number huge in the accent serif with the rest as a subtitle ("20 most recently active").

const ROW_STAGGER_MS = 150;
const SWEEP_ROW_MS = 110;

export const Grid: React.FC<ElementProps<'grid'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const dark = isDark(t);
  const count = Math.max(1, Math.round(el.count));
  const cols = Math.max(1, Math.min(count, Math.round(el.columns) || 5));
  const rows = Math.ceil(count / cols);

  // label: "20 most recently active" -> big "20" + subtitle
  const m = el.label?.match(/^\s*([\d.,]+[%+x×]?)\s+(.+)$/);
  const bigNum = m ? m[1] : null;
  const sub = m ? m[2] : el.label ?? null;
  const numSize = Math.min(190, box.h * 0.2);
  const labelH = (bigNum ? numSize * 1.02 : 0) + (sub ? 66 : 0) + (el.label ? 40 : 0);

  // card size: fill the box, aspect 2:1, capped so a short grid doesn't get giant
  const gapRatio = 0.11;
  const availH = box.h - labelH - 16;
  const wByW = (box.w - 16) / (cols + (cols - 1) * gapRatio);
  const wByH = availH / (rows * 0.5 + (rows - 1) * gapRatio);
  const cw = Math.max(40, Math.min(260, wByW, wByH));
  const ch = cw * 0.5;
  const gap = cw * gapRatio;
  const gridW = cols * cw + (cols - 1) * gap;

  // when does each card light?
  const litAt = new Array<number>(count).fill(Infinity);
  for (const l of el.lit ?? []) {
    const span = Math.max(1, Math.round(l.span ?? 1));
    const startRow = Math.floor(l.index / cols);
    for (let k = 0; k < span; k++) {
      const i = l.index + k;
      if (i < 0 || i >= count) continue;
      const f = l.frame + msToFrames((Math.floor(i / cols) - startRow) * SWEEP_ROW_MS, fps);
      litAt[i] = Math.min(litAt[i], f);
    }
  }

  const rowAt = (r: number) => el.frame + msToFrames(r * ROW_STAGGER_MS, fps);
  const builtAt = rowAt(rows - 1) + msToFrames(200, fps);
  const firstLit = Math.min(...litAt);
  const labelAt = Math.min(builtAt, Number.isFinite(firstLit) ? firstLit : builtAt);

  const cardFill = dark ? mix(t.card, '#fff', 94) : t.cardRaised;
  const lineCol = dark ? mix(t.text, t.card, 88) : mix(t.text, t.card, 30);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {el.label ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40, ...partIn(frame, fps, labelAt, 240, 14) }}>
          {bigNum ? (
            <div style={{ fontFamily: t.fonts.serif, fontWeight: 600, fontSize: numSize, lineHeight: 1, color: t.accent, letterSpacing: -numSize * 0.02 }}>{bigNum}</div>
          ) : null}
          {sub ? (
            <div style={{ marginTop: bigNum ? 14 : 0, fontFamily: t.fonts.display, fontWeight: bigNum ? 500 : 600, fontSize: bigNum ? 48 : 52, color: t.text, whiteSpace: 'nowrap' }}>
              {sub}
            </div>
          ) : null}
        </div>
      ) : null}
      <div style={{ position: 'relative', width: gridW, height: rows * ch + (rows - 1) * gap }}>
        {Array.from({ length: count }).map((_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const inS = partIn(frame, fps, rowAt(r), 220, 10);
          const lit = Number.isFinite(litAt[i]) ? progress(frame, litAt[i], msToFrames(200, fps), easeOut) : 0;
          const bumpP = Number.isFinite(litAt[i]) ? progress(frame, litAt[i], msToFrames(280, fps), easeOut) : 0;
          const s = 1 + 0.06 * Math.sin(Math.PI * bumpP);
          const w1 = 0.38 + 0.2 * rand(i * 7 + 3);
          const w2 = 0.62 + 0.26 * rand(i * 13 + 5);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: c * (cw + gap),
                top: r * (ch + gap),
                width: cw,
                height: ch,
                boxSizing: 'border-box',
                borderRadius: Math.max(6, cw * 0.09),
                background: cardFill,
                border: `${Math.max(1.5, cw * 0.014)}px solid ${lit > 0 ? alpha(t.accent, lit) : alpha(t.cardBorder, 0.6)}`,
                boxShadow: lit > 0 ? `0 0 ${cw * 0.12 * lit}px ${alpha(t.accent, 0.28 * lit)}, 0 8px 18px rgba(0,0,0,${dark ? 0.35 : 0.1})` : undefined,
                padding: `${ch * 0.24}px ${cw * 0.11}px`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: ch * 0.13,
                opacity: (inS.opacity as number) * (0.3 + 0.7 * lit),
                filter: inS.filter,
                transform: s !== 1 ? `scale(${s})` : undefined,
              }}
            >
              <div style={{ width: `${w1 * 100}%`, height: Math.max(3, ch * 0.085), borderRadius: 99, background: lineCol }} />
              <div style={{ width: `${w2 * 100}%`, height: Math.max(3, ch * 0.085), borderRadius: 99, background: lineCol }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
