import React from 'react';
import type { ElementProps } from '../../ElementView';
import { useTheme } from '../../../theme/ThemeContext';
import { msToFrames } from '../../../lib/anim';
import { RichText } from '../../../ui/RichText';
import { Fit, reveal, textW } from './kit';

// Big serif accent number that counts up (reference B12: "1,000,000", expo ease-out ~700 ms,
// thousands separators always shown, fast-changing digits smear vertically), with a sans caption.
const COUNT_MS = 700;
// Expo ease-out normalised so it really lands on 1 (Easing.out(Easing.exp) stops at 0.999).
const expoOut = (x: number) => (x >= 1 ? 1 : (1 - Math.pow(2, -10 * x)) / (1 - Math.pow(2, -10)));

export const formatNumber = (v: number, decimals = 0) =>
  v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// Eased count value at a frame, plus its per-frame speed (0..1 of the full range) for the smear.
export function countAt(frame: number, fps: number, start: number, ms = COUNT_MS) {
  const d = msToFrames(ms, fps);
  const p = (f: number) => expoOut(Math.max(0, Math.min(1, (f - start) / d)));
  return { p: p(frame), speed: p(frame) - p(frame - 1), done: start + d };
}

export const Counter: React.FC<ElementProps<'counter'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const decimals = el.decimals ?? 0;
  const start = el.frame + Math.round(0.08 * fps);
  const { p, speed, done } = countAt(frame, fps, start);
  const shown = `${el.prefix ?? ''}${formatNumber(el.value * p, decimals)}${el.suffix ?? ''}`;
  const final = `${el.prefix ?? ''}${formatNumber(el.value, decimals)}${el.suffix ?? ''}`;
  const SIZE = 200;
  const numW = textW(final, SIZE, 'serif', 700, -SIZE * 0.01);
  const LABEL = 54;
  const labelW = el.label ? textW(el.label, LABEL, 'display', 700) : 0;
  const W = Math.max(numW, labelW) + 40;
  const H = SIZE * 1.08 + (el.label ? 22 + LABEL * 1.2 : 0);
  const smear = Math.min(14, speed * 90);
  // a small settle pulse when the count lands
  const k = Math.max(0, Math.min(1, (frame - done) / Math.round(0.22 * fps)));
  const pulse = frame >= done ? 1 + 0.035 * Math.sin(Math.PI * k) : 1;
  return (
    <Fit w={W} h={H} box={box} max={1.1}>
      <div style={{ position: 'absolute', left: W / 2 - numW * 0.7, top: -SIZE * 0.25, width: numW * 1.4, height: SIZE * 1.5, background: `radial-gradient(closest-side, ${t.accentGlow}, transparent)`, opacity: 0.22 }} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: W,
          textAlign: 'center',
          fontFamily: t.fonts.serif,
          fontWeight: 700,
          fontSize: SIZE,
          lineHeight: 1.08,
          letterSpacing: -SIZE * 0.01,
          color: t.accent,
          fontVariantNumeric: 'tabular-nums lining-nums',
          whiteSpace: 'nowrap',
          transform: `scale(${pulse})`,
          textShadow: smear > 0.5 ? `0 ${smear}px ${smear * 0.6}px ${t.accentGlow}, 0 ${-smear}px ${smear * 0.6}px ${t.accentGlow}` : `0 0 40px ${t.accentGlow}`,
        }}
      >
        {shown}
      </div>
      {el.label ? (
        <div style={{ position: 'absolute', left: 0, top: SIZE * 1.08 + 22, width: W, textAlign: 'center', fontFamily: t.fonts.display, fontWeight: 700, fontSize: LABEL, lineHeight: 1.2, color: t.text, whiteSpace: 'nowrap', ...reveal(frame, fps, el.frame + Math.round(0.25 * fps), 220) }}>
          <RichText text={el.label} />
        </div>
      ) : null}
    </Fit>
  );
};
