import React from 'react';
import type { ElementProps } from '../ElementView';
import { useTheme } from '../../theme/ThemeContext';
import { blurInOut } from '../../lib/anim';
import { Logo } from '../../ui/Logo';
import { RichText } from '../../ui/RichText';
import { textW } from './groupA/kit';

// Big serif title, optional logo tile to its left and a sans sub-line ("by Anthropic").
// Reference: serif ~170 px (xl) over a dimmed UI; ~120 px (l) as a stage heading. Always one line:
// the size shrinks to fit the box instead of wrapping.
export const Title: React.FC<ElementProps<'title'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const base = el.size === 'xl' ? 170 : el.size === 'm' ? 84 : 124;
  const plain = el.text.replace(/\*/g, '');
  const natural = (el.logo ? base * 0.94 + base * 0.24 : 0) + textW(plain, base, 'serif', 600, t.titleTracking);
  const k = Math.max(0.45, Math.min(1, (box.w * 0.94) / natural, (box.h * 0.9) / (base * (el.sub ? 1.75 : 1.15))));
  const size = base * k;
  const sub = el.sub ? blurInOut(frame, fps, el.frame + Math.round(0.35 * fps), undefined) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.24 }}>
        {el.logo ? <Logo name={el.logo} size={size * 0.94} /> : null}
        <div style={{ fontFamily: t.fonts.serif, fontWeight: t.titleWeight, fontSize: size, lineHeight: 1.05, color: t.text, letterSpacing: size * t.titleTracking, textAlign: 'center', whiteSpace: 'nowrap' }}>
          <RichText text={el.text} />
        </div>
      </div>
      {el.sub ? (
        <div style={{ marginTop: size * 0.28, fontFamily: t.fonts.display, fontWeight: 600, fontSize: Math.max(34, size * 0.26), color: t.textDim, ...sub }}>
          <RichText text={el.sub} />
        </div>
      ) : null}
    </div>
  );
};
