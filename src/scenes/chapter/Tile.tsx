import React from 'react';
import type { ChapterInfo } from '../../types';
import { useTheme } from '../../theme/ThemeContext';
import type { Theme } from '../../theme/tokens';
import { Icon } from '../../ui/Icon';
import { RichText } from '../../ui/RichText';

// The two faces of a ChapterGrid tile. Colours are derived from theme tokens with color-mix so the
// card works in every theme.
//   NumberFace  = a chapter not reached yet: dotted accent texture + big silver serif numeral.
//   FeatureFace = "0N" tag, lucide icon and title. `active` is the current chapter (accent border,
//                 glow); otherwise it is a done chapter (dim fill, greyed icon and label).

export const mix = (a: string, b: string, pctA: number) => `color-mix(in srgb, ${a} ${Math.max(0, Math.min(100, pctA)).toFixed(1)}%, ${b})`;

const isLight = (t: Theme) => t.name === 'clay-light';

export const tileRadius = (h: number) => h * 0.098;

const dropShadow = (t: Theme, h: number) =>
  isLight(t) ? `0 ${h * 0.08}px ${h * 0.16}px rgba(70,50,30,0.16)` : `0 ${h * 0.1}px ${h * 0.16}px rgba(0,0,0,0.5)`;

const rim = (t: Theme) => (isLight(t) ? mix(t.cardBorder, 'transparent', 90) : 'rgba(255,255,255,0.055)');

export const NumberFace: React.FC<{ n: number; w: number; h: number }> = ({ n, w, h }) => {
  const t = useTheme();
  const pitch = h * 0.1;
  const dotR = Math.max(1, h * 0.0088);
  const fill = mix(t.card, t.bgEdge, 72);
  const dot = mix(t.accent, t.card, isLight(t) ? 34 : 33);
  const numeral = mix(t.textMuted, t.text, 86);
  const sheen = isLight(t) ? 'linear-gradient(180deg, rgba(255,255,255,0.35), rgba(0,0,0,0.03))' : 'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(0,0,0,0.14))';
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: tileRadius(h),
        background: `${sheen}, radial-gradient(circle at center, ${dot} ${dotR}px, transparent ${dotR + 0.7}px) ${(w % pitch) / 2}px ${(h % pitch) / 2}px / ${pitch}px ${pitch}px, ${fill}`,
        boxShadow: `inset 0 0 0 1px ${rim(t)}, ${dropShadow(t, h)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontFamily: t.fonts.serif,
          fontWeight: 700,
          fontSize: h * 0.56,
          lineHeight: 1,
          fontVariantNumeric: 'lining-nums',
          letterSpacing: '-0.02em',
          backgroundImage: `linear-gradient(180deg, ${mix(numeral, t.text, 72)} 18%, ${mix(numeral, t.bgEdge, 82)} 88%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          filter: `drop-shadow(0 ${h * 0.018}px ${h * 0.025}px rgba(0,0,0,${isLight(t) ? 0.18 : 0.6}))`,
          transform: `translateY(${h * 0.015}px)`,
        }}
      >
        {n}
      </div>
    </div>
  );
};

// Label sizing like the reference: short labels sit on one line (~42 px at h=203); anything wider
// than ~78 % of the tile ("Master session", "Docs, Slides and more") is split into two balanced
// lines at a slightly smaller size. Widths are estimated from Outfit Bold's average advance and the
// font shrinks if a line would still overflow, so nothing is ever clipped.
const CHAR_EM = 0.5;
const plainLen = (s: string) => s.replace(/\*/g, '').length;
export function labelLines(label: string, w: number, h: number): { lines: string[]; fontSize: number } {
  const f1 = h * 0.205;
  const words = label.trim().split(/\s+/);
  if (plainLen(label) * CHAR_EM * 0.92 * f1 <= w * 0.78 || words.length < 2) {
    return { lines: [label], fontSize: Math.min(f1, (w * 0.86) / (plainLen(label) * CHAR_EM)) };
  }
  let best = 1;
  let bestLen = Infinity;
  for (let k = 1; k < words.length; k++) {
    const len = Math.max(plainLen(words.slice(0, k).join(' ')), plainLen(words.slice(k).join(' ')));
    if (len < bestLen) {
      bestLen = len;
      best = k;
    }
  }
  return { lines: [words.slice(0, best).join(' '), words.slice(best).join(' ')], fontSize: Math.min(h * 0.185, (w * 0.86) / (bestLen * CHAR_EM)) };
}

export const FeatureFace: React.FC<{
  n: number;
  info: ChapterInfo | undefined;
  w: number;
  h: number;
  active: boolean;
  glow: number; // 0..1, active border + outer glow
  dim: number; // 0..1, done tiles settle from bright to grey as the new chapter lands
}> = ({ n, info, w, h, active, glow, dim }) => {
  const t = useTheme();
  const label = info?.title ?? `Chapter ${n}`;
  const { lines, fontSize } = labelLines(label, w, h);
  const one = lines.length === 1;
  const iconSize = one ? h * 0.34 : h * 0.3;
  const fill = active ? t.cardRaised : mix(t.card, t.bgEdge, 66);
  const numColor = active ? t.accent : mix(t.accent, t.bgEdge, 60);
  const labelColor = active ? t.text : mix(t.textMuted, t.text, 55 + 45 * dim);
  const iconColor = active ? t.text : labelColor;
  const sheen = isLight(t) ? 'linear-gradient(180deg, rgba(255,255,255,0.4), rgba(0,0,0,0.02))' : 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(0,0,0,0.1))';
  const g = active ? glow : 0;
  const shadows = [
    `inset 0 0 0 ${Math.max(1, h * 0.0145)}px ${mix(t.accent, rim(t), g * 100)}`,
    g > 0 ? `0 0 ${h * 0.2}px ${h * 0.015}px ${mix(t.accentGlow, 'transparent', g * 100)}` : null,
    g > 0 ? `0 0 ${h * 0.05}px ${mix(t.accent, 'transparent', g * 30)}` : null,
    dropShadow(t, h),
  ].filter(Boolean);
  return (
    <div style={{ position: 'absolute', inset: 0, borderRadius: tileRadius(h), background: `${sheen}, ${fill}`, boxShadow: shadows.join(', '), overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: w * 0.085,
          top: h * 0.085,
          fontFamily: t.fonts.display,
          fontWeight: 700,
          fontSize: h * 0.135,
          lineHeight: 1,
          letterSpacing: '0.02em',
          color: numColor,
        }}
      >
        {String(n).padStart(2, '0')}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          paddingTop: h * (one ? 0.06 : 0.035),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: h * (one ? 0.075 : 0.05),
        }}
      >
        <Icon name={info?.icon} size={iconSize} color={iconColor} strokeWidth={1.6} />
        <div style={{ fontFamily: t.fonts.display, fontWeight: 700, fontSize, lineHeight: 1.1, textAlign: 'center', color: labelColor, letterSpacing: '-0.005em', whiteSpace: 'nowrap' }}>
          {lines.map((l, i) => (
            <div key={i}>
              <RichText text={l} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
