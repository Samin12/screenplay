import React from 'react';
import type { ElementProps } from '../../ElementView';
import { useTheme } from '../../../theme/ThemeContext';
import { RichText } from '../../../ui/RichText';
import { Fit, Glyph, mix, reveal, textW, toneColor } from './kit';

// Intro "what you'll get" list (reference B3): 126 px icon tiles in a dark tint of the item's tone
// with a 1.5 px tone border, ~88 px Outfit SemiBold text. Slots are fixed for the whole element so
// rows never re-flow; each row blurs in on its own word.
const TILE = 126;
const GAP = 42;
const PITCH = 174;
const SIZE = 88;
const SUB = 40;

export const IconList: React.FC<ElementProps<'iconlist'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const items = el.items;
  if (items.length === 0) return null;
  const hasSub = items.some((i) => i.sub);
  const pitch = hasSub ? PITCH + 26 : PITCH;
  const textMax = Math.max(...items.map((i) => Math.max(textW(i.text, SIZE, 'display', 600), i.sub ? textW(i.sub, SUB, 'display', 500) : 0)), 200);
  const w = TILE + GAP + textMax;
  const h = TILE + (items.length - 1) * pitch;
  return (
    <Fit w={w} h={h} box={box}>
      {items.map((it, i) => {
        const c = toneColor(t, it.tone, t.accent);
        const tileFill = it.tone && it.tone !== 'accent' ? mix(c, 9, t.bg) : t.accentDeep;
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: i * pitch, height: TILE, display: 'flex', alignItems: 'center', gap: GAP, ...reveal(frame, fps, it.frame, 200) }}>
            <div
              style={{
                width: TILE,
                height: TILE,
                flexShrink: 0,
                borderRadius: 24,
                background: tileFill,
                boxShadow: `inset 0 0 0 1.5px ${mix(c, 62, 'transparent')}, 0 10px 30px rgba(0,0,0,0.35)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Glyph name={it.icon ?? 'sparkles'} size={58} color={c} stroke={2.4} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontFamily: t.fonts.display, fontWeight: 600, fontSize: SIZE, lineHeight: 1.05, color: t.text, whiteSpace: 'nowrap', letterSpacing: -0.5 }}>
                <RichText text={it.text} />
              </div>
              {it.sub ? (
                <div style={{ marginTop: 6, fontFamily: t.fonts.display, fontWeight: 500, fontSize: SUB, lineHeight: 1.1, color: t.textDim, whiteSpace: 'nowrap' }}>
                  <RichText text={it.sub} />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </Fit>
  );
};
