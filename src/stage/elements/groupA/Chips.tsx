import React from 'react';
import type { ElementProps } from '../../ElementView';
import type { Item } from '../../../types';
import { useTheme } from '../../../theme/ThemeContext';
import { RichText } from '../../../ui/RichText';
import { Badge, Fit, Glyph, mix, popIn, textW } from './kit';

// Pills that pop in on their words (reference: "</> Main session" chip, Skills/Files/Tools chips,
// "Peek ✓" / "Talk ✗" status pills). tone good/bad turns a chip into a status pill with a badge;
// tone accent gives it the orange ring + glow; other tones colour the icon.
const SIZE = 40;
const ICON = 42;
const H = 96;
const GAP = 34;
const ROW_GAP = 30;

type Laid = { it: Item; w: number; status: boolean };

const measure = (it: Item): Laid => {
  const status = it.tone === 'good' || it.tone === 'bad';
  const pad = status ? 34 : 30;
  const iconW = it.icon ? ICON + 18 : 0;
  const badgeW = status ? 58 + 20 : 0;
  return { it, status, w: pad * 2 + iconW + textW(it.text, SIZE, 'display', 600) + badgeW - (status ? 12 : 0) };
};

export const Chips: React.FC<ElementProps<'chips'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  if (el.items.length === 0) return null;
  const laid = el.items.map(measure);
  // Greedy rows against the box width (design px = output px at scale 1).
  const maxRow = Math.max(box.w, Math.max(...laid.map((l) => l.w)));
  const rows: Laid[][] = [];
  for (const l of laid) {
    const row = rows[rows.length - 1];
    const rowW = row ? row.reduce((s, x) => s + x.w, 0) + GAP * row.length : Infinity;
    if (!row || rowW + l.w > maxRow) rows.push([l]);
    else row.push(l);
  }
  // Balance: if the last row is lonely, spread items evenly across rows.
  if (rows.length > 1) {
    const per = Math.ceil(laid.length / rows.length);
    rows.length = 0;
    for (let i = 0; i < laid.length; i += per) rows.push(laid.slice(i, i + per));
  }
  const rowW = (r: Laid[]) => r.reduce((s, x) => s + x.w, 0) + GAP * (r.length - 1);
  const w = Math.max(...rows.map(rowW));
  const h = rows.length * H + (rows.length - 1) * ROW_GAP;
  return (
    <Fit w={w + 24} h={h + 24} box={box} max={1.15}>
      <div style={{ position: 'absolute', inset: 12, display: 'flex', flexDirection: 'column', gap: ROW_GAP, alignItems: 'center' }}>
        {rows.map((r, ri) => (
          <div key={ri} style={{ display: 'flex', gap: GAP, height: H }}>
            {r.map((l, i) => {
              const it = l.it;
              const tc = it.tone ? t.tones[it.tone] : undefined;
              const accent = it.tone === 'accent';
              return (
                <div
                  key={i}
                  style={{
                    width: l.w,
                    height: H,
                    flexShrink: 0,
                    boxSizing: 'border-box',
                    borderRadius: l.status ? H : 22,
                    background: l.status ? mix(t.card, 70, t.bg) : accent ? mix(t.accent, 8, t.card) : t.card,
                    boxShadow: `inset 0 0 0 ${accent ? 2 : 1.5}px ${accent ? t.accent : t.cardBorder}, ${accent ? `0 0 34px ${t.accentGlow}, ` : ''}0 14px 30px rgba(0,0,0,0.35)`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    paddingLeft: l.status ? 34 : 30,
                    paddingRight: l.status ? 20 : 30,
                    ...popIn(frame, fps, it.frame, 300, 1.1, 0.6),
                  }}
                >
                  {it.icon ? <Glyph name={it.icon} size={ICON} color={tc && !l.status ? tc : t.textDim} stroke={2.2} /> : null}
                  <div style={{ fontFamily: t.fonts.display, fontWeight: 600, fontSize: SIZE, color: t.text, whiteSpace: 'nowrap', lineHeight: 1, flex: 1 }}>
                    <RichText text={it.text} />
                  </div>
                  {l.status && it.tone ? <Badge t={t} tone={it.tone} size={58} style={popIn(frame, fps, it.frame + Math.round(0.18 * fps), 260, 1.15, 0)} /> : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Fit>
  );
};
