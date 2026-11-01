import React from 'react';
import type { ElementProps } from '../../ElementView';
import { useTheme } from '../../../theme/ThemeContext';
import { easeOut, msToFrames, progress } from '../../../lib/anim';
import { RichText } from '../../../ui/RichText';
import { fitScale, mix, reveal, textW } from './kit';

// Lower third name card, anchored bottom-left of its box: a dark glass plate, an accent bar that
// grows up, the name in the serif and a small tracked-caps sub-line.
const TITLE = 66;
const SUB = 26;
const TRACK = 4;

export const Lower: React.FC<ElementProps<'lower'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const sub = el.sub?.toUpperCase();
  const textWidth = Math.max(textW(el.title, TITLE, 'serif', 700), sub ? textW(sub, SUB, 'display', 600, TRACK) : 0);
  const W = 34 + 6 + 28 + textWidth + 44;
  const H = 28 + TITLE * 1.08 + (sub ? 10 + SUB * 1.3 : 0) + 30;
  const s = fitScale(W, H, box, 1);
  const bar = progress(frame, el.frame, msToFrames(320, fps), easeOut);
  return (
    <div style={{ width: box.w, height: box.h, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start' }}>
      <div style={{ position: 'relative', width: W * s, height: H * s }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: W,
            height: H,
            transform: `scale(${s})`,
            transformOrigin: '0 0',
            boxSizing: 'border-box',
            borderRadius: 26,
            background: mix(t.bgEdge, 80, 'transparent'),
            backdropFilter: 'blur(16px)',
            boxShadow: `inset 0 0 0 1.5px ${mix(t.cardBorder, 80, 'transparent')}, 0 18px 40px rgba(0,0,0,0.4)`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 44px 0 34px',
            gap: 28,
          }}
        >
          <div style={{ width: 6, alignSelf: 'stretch', margin: '26px 0', borderRadius: 3, background: t.accent, boxShadow: `0 0 14px ${t.accentGlow}`, transform: `scaleY(${bar})`, transformOrigin: '50% 100%' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontFamily: t.fonts.serif, fontWeight: 700, fontSize: TITLE, lineHeight: 1.08, color: t.text, whiteSpace: 'nowrap', letterSpacing: -0.5, ...reveal(frame, fps, el.frame + Math.round(0.1 * fps), 220) }}>
              <RichText text={el.title} />
            </div>
            {sub ? (
              <div style={{ fontFamily: t.fonts.display, fontWeight: 600, fontSize: SUB, lineHeight: 1.3, letterSpacing: TRACK, color: t.textDim, whiteSpace: 'nowrap', ...reveal(frame, fps, el.frame + Math.round(0.28 * fps), 180) }}>
                <RichText text={sub} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
