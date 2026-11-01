import React from 'react';
import type { ElementProps } from '../../ElementView';
import { useTheme } from '../../../theme/ThemeContext';
import { RichText } from '../../../ui/RichText';
import { countAt, formatNumber } from './Counter';
import { Fit, fitScale, reveal, textW, wrap } from './kit';

// A few big numbers with sub-labels ("1M / tokens", "$48,600 / revenue"). Numbers are serif accent
// (or the item's tone) and count up when they hold a real number; each stat lands on its word.
// Lays out as a row with hairline dividers, or as a stacked list when that reads larger.
const NUM = 132;
const SUB = 38;
const SUB_MAX = 360;

type Parsed = { prefix: string; value: number; decimals: number; commas: boolean; suffix: string } | null;

const parse = (s: string): Parsed => {
  const m = s.match(/^([^\d]*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const digits = m[2].replace(/[,.]/g, '');
  if (digits.length < 2) return null;
  const dec = m[2].includes('.') ? m[2].split('.')[1].length : 0;
  return { prefix: m[1], value: parseFloat(m[2].replace(/,/g, '')), decimals: dec, commas: m[2].includes(','), suffix: m[3] };
};

export const Stat: React.FC<ElementProps<'stat'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const items = el.items;
  if (items.length === 0) return null;
  const n = Math.max(1, items.length);
  const laid = items.map((it) => {
    const subLines = it.sub ? wrap(it.sub, SUB, SUB_MAX, 'display', 600) : [];
    return {
      it,
      numW: textW(it.text, NUM, 'serif', 700, -NUM * 0.01),
      subLines,
      subW: Math.max(0, ...subLines.map((l) => textW(l, SUB, 'display', 600))),
    };
  });
  const maxSubLines = Math.max(0, ...laid.map((l) => l.subLines.length));
  // Row layout
  const cellW = Math.max(220, ...laid.map((l) => Math.max(l.numW, l.subW))) + 40;
  const DIV = 70;
  const rowW = cellW * n + DIV * (n - 1);
  const rowH = NUM * 1.05 + (maxSubLines ? 14 + maxSubLines * SUB * 1.2 : 0);
  // Stacked layout: number column + sub column
  const numCol = Math.max(...laid.map((l) => l.numW));
  const subCol = Math.max(0, ...laid.map((l) => l.subW));
  const stackRowH = Math.max(NUM * 1.05, maxSubLines * SUB * 1.2);
  const stackW = numCol + (subCol ? 44 + subCol : 0);
  const stackH = n * stackRowH + (n - 1) * 34;
  const stacked = n >= 3 && fitScale(stackW, stackH, box) > fitScale(rowW, rowH, box) * 1.2;
  const W = stacked ? stackW : rowW;
  const H = stacked ? stackH : rowH;

  const numberText = (s: string, start: number) => {
    const pz = parse(s);
    if (!pz) return s;
    const { p } = countAt(frame, fps, start);
    const v = pz.value * p;
    return `${pz.prefix}${pz.commas ? formatNumber(v, pz.decimals) : v.toFixed(pz.decimals)}${pz.suffix}`;
  };

  return (
    <Fit w={W} h={H} box={box} max={1.1}>
      {laid.map((l, i) => {
        const c = l.it.tone ? t.tones[l.it.tone] : t.accent;
        const num = (
          <div style={{ fontFamily: t.fonts.serif, fontWeight: 700, fontSize: NUM, lineHeight: 1.05, letterSpacing: -NUM * 0.01, color: c, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums lining-nums', textShadow: `0 0 36px ${l.it.tone ? 'transparent' : t.accentGlow}` }}>
            {numberText(l.it.text, l.it.frame)}
          </div>
        );
        const sub = l.subLines.length ? (
          <div style={{ fontFamily: t.fonts.display, fontWeight: 600, fontSize: SUB, lineHeight: 1.2, color: t.textDim, whiteSpace: 'nowrap', ...reveal(frame, fps, l.it.frame + Math.round(0.15 * fps), 200) }}>
            {l.subLines.map((s, k) => (
              <div key={k}>
                <RichText text={s} />
              </div>
            ))}
          </div>
        ) : null;
        if (stacked) {
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: i * (stackRowH + 34), width: W, height: stackRowH, display: 'flex', alignItems: 'center', gap: 44, ...reveal(frame, fps, l.it.frame, 220, 0.94) }}>
              <div style={{ width: numCol, display: 'flex', justifyContent: 'flex-end' }}>{num}</div>
              {sub}
            </div>
          );
        }
        return (
          <React.Fragment key={i}>
            {i > 0 ? <div style={{ position: 'absolute', left: i * (cellW + DIV) - DIV / 2 - 1, top: NUM * 0.18, width: 2, height: rowH - NUM * 0.3, background: t.cardBorder, ...reveal(frame, fps, l.it.frame, 220) }} /> : null}
            <div style={{ position: 'absolute', left: i * (cellW + DIV), top: 0, width: cellW, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, ...reveal(frame, fps, l.it.frame, 220, 0.94) }}>
              {num}
              {sub}
            </div>
          </React.Fragment>
        );
      })}
    </Fit>
  );
};
