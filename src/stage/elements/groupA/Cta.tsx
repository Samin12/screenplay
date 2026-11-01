import React from 'react';
import type { ElementProps } from '../../ElementView';
import { useTheme } from '../../../theme/ThemeContext';
import { RichText } from '../../../ui/RichText';
import { dash, drawP, Fit, Glyph, mix, popIn, reveal, textW, wrap } from './kit';

// "In the description below" call to action: optional icon tile, bold sans line (~80 px), a dim
// sub-line, and an orange down arrow that strokes on and then bobs gently.
const SIZE = 80;
const SUB = 40;
const TILE = 120;
const ARROW = 118;

export const Cta: React.FC<ElementProps<'cta'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const lines = wrap(el.text, SIZE, 1400, 'display', 700);
  const textWidth = Math.max(...lines.map((l) => textW(l, SIZE, 'display', 700)), el.sub ? textW(el.sub, SUB, 'display', 500) : 0);
  const W = Math.max(textWidth, TILE) + 40;
  const iconH = el.icon ? TILE + 34 : 0;
  const textH = lines.length * SIZE * 1.1;
  const subH = el.sub ? 18 + SUB * 1.25 : 0;
  const H = iconH + textH + subH + 30 + ARROW + 16;
  const arrowStart = el.frame + Math.round(0.3 * fps);
  const p = drawP(frame, fps, arrowStart, 320);
  const hp = Math.max(0, Math.min(1, (p - 0.65) / 0.35));
  const settle = arrowStart + Math.round(0.35 * fps);
  const bob = frame > settle ? Math.sin(((frame - settle) / fps) * Math.PI * 2 * 0.75) * 9 : 0;
  const ax = W / 2;
  const ay0 = iconH + textH + subH + 30;
  return (
    <Fit w={W} h={H} box={box} max={1}>
      {el.icon ? (
        <div
          style={{
            position: 'absolute',
            left: W / 2 - TILE / 2,
            top: 0,
            width: TILE,
            height: TILE,
            borderRadius: 26,
            background: t.accentDeep,
            boxShadow: `inset 0 0 0 1.5px ${mix(t.accent, 62, 'transparent')}, 0 0 40px ${mix(t.accent, 22, 'transparent')}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...popIn(frame, fps, el.frame, 300, 1.08, 0.7),
          }}
        >
          <Glyph name={el.icon} size={58} color={t.accent} stroke={2.4} />
        </div>
      ) : null}
      <div style={{ position: 'absolute', left: 0, top: iconH, width: W, textAlign: 'center', fontFamily: t.fonts.display, fontWeight: 700, fontSize: SIZE, lineHeight: 1.1, color: t.text, letterSpacing: -0.5, ...reveal(frame, fps, el.frame, 240) }}>
        {lines.map((l, i) => (
          <div key={i} style={{ whiteSpace: 'nowrap' }}>
            <RichText text={l} />
          </div>
        ))}
      </div>
      {el.sub ? (
        <div style={{ position: 'absolute', left: 0, top: iconH + textH + 18, width: W, textAlign: 'center', fontFamily: t.fonts.display, fontWeight: 500, fontSize: SUB, lineHeight: 1.25, color: t.textDim, whiteSpace: 'nowrap', ...reveal(frame, fps, el.frame + Math.round(0.18 * fps), 200) }}>
          <RichText text={el.sub} />
        </div>
      ) : null}
      <svg width={W} height={ARROW + 40} style={{ position: 'absolute', left: 0, top: ay0 - 10, overflow: 'visible', transform: `translateY(${bob}px)` }}>
        <g style={{ filter: `drop-shadow(0 0 12px ${t.accentGlow})` }}>
          <path d={`M ${ax} 10 L ${ax} ${ARROW}`} stroke={t.accent} strokeWidth={9} strokeLinecap="round" fill="none" {...dash(p)} opacity={frame >= arrowStart ? 1 : 0} />
          <path d={`M ${ax - 34} ${ARROW - 34} L ${ax} ${ARROW} L ${ax + 34} ${ARROW - 34}`} stroke={t.accent} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" {...dash(hp)} opacity={hp > 0 ? 1 : 0} />
        </g>
      </svg>
    </Fit>
  );
};
