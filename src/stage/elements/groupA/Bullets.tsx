import React from 'react';
import type { ElementProps } from '../../ElementView';
import type { Theme } from '../../../theme/tokens';
import type { Tone } from '../../../types';
import { useLook, useTheme } from '../../../theme/ThemeContext';
import { RichText } from '../../../ui/RichText';
import { easeInOut } from '../../../lib/anim';
import { cardShadow, dash, drawP, Fit, Glyph, mix, popIn, reveal, textW, wrap } from './kit';

// Checklist card: rows land on their words and tick (ring draws, then the check strokes on).
// tone: good (default) = check, bad = cross, warn = "!", others = dot.
const SIZE = 46;
const LINE = 58;
const BADGE = 56;
const PAD_X = 48;
const PAD_Y = 40;
const ROW_GAP = 30;
const MAX_TEXT = 900;

const Tick: React.FC<{ t: Theme; tone: Tone; frame: number; fps: number; start: number }> = ({ t, tone, frame, fps, start }) => {
  const c = t.tones[tone];
  const ring = drawP(frame, fps, start, 200);
  const mark = drawP(frame, fps, start + Math.round(0.12 * fps), 200);
  const fill = drawP(frame, fps, start + Math.round(0.1 * fps), 160);
  const r = 26;
  return (
    <svg width={BADGE} height={BADGE} viewBox="-28 -28 56 56" style={{ flexShrink: 0, overflow: 'visible' }}>
      <circle r={r} fill={mix(c, 22, t.card)} opacity={fill} />
      <circle r={r} fill="none" stroke={c} strokeWidth={2.5} transform="rotate(-90)" {...(dash(ring) as React.SVGProps<SVGCircleElement>)} opacity={0.9} />
      {tone === 'good' ? (
        <path d="M -11 1 L -3 9 L 12 -8" fill="none" stroke={c} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" {...dash(mark)} />
      ) : tone === 'bad' ? (
        <>
          <path d="M -9 -9 L 9 9" fill="none" stroke={c} strokeWidth={4.5} strokeLinecap="round" {...dash(Math.min(1, mark * 2))} />
          <path d="M 9 -9 L -9 9" fill="none" stroke={c} strokeWidth={4.5} strokeLinecap="round" {...dash(Math.max(0, mark * 2 - 1))} />
        </>
      ) : tone === 'warn' ? (
        <g style={popIn(frame, fps, start + Math.round(0.12 * fps), 240)}>
          <path d="M 0 -11 L 0 3" stroke={c} strokeWidth={5} strokeLinecap="round" />
          <circle cy={11} r={3} fill={c} />
        </g>
      ) : (
        <circle r={7} fill={c} opacity={mark} />
      )}
    </svg>
  );
};

export const Bullets: React.FC<ElementProps<'bullets'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const panelLook = useLook() === 'panel';
  if (el.items.length === 0 && !el.title) return null;
  // Content arrives with its container: no card before the first row lands.
  if (panelLook && !el.title && frame < el.items[0].frame) return null;
  const rows = el.items.map((it) => {
    const iconW = it.icon ? 44 + 18 : 0;
    const lines = wrap(it.text, SIZE, MAX_TEXT - iconW, 'display', 500);
    const tw = Math.max(...lines.map((l) => textW(l, SIZE, 'display', 500)));
    return { it, lines, w: BADGE + 26 + iconW + tw, h: Math.max(BADGE, lines.length * LINE) };
  });
  const titleSize = 42;
  const titleH = el.title ? titleSize * 1.2 + 30 + 1 + 30 : 0;
  const titleW = el.title ? textW(el.title, titleSize, 'display', 700) + 60 : 0;
  const innerW = Math.max(titleW, ...rows.map((r) => r.w), 420);
  const w = innerW + PAD_X * 2;
  const h = PAD_Y * 2 + titleH + rows.reduce((s, r) => s + r.h, 0) + ROW_GAP * (rows.length - 1);
  let y = PAD_Y + titleH;
  let shown = PAD_Y * 2 + titleH;
  rows.forEach((r, i) => {
    const grow = i === 0 ? 1 : easeInOut(Math.min(1, Math.max(0, (frame - r.it.frame + 4) / 8)));
    shown += (r.h + (i ? ROW_GAP : 0)) * grow;
  });
  return (
    <Fit w={w} h={h} box={box} max={1.2}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: panelLook ? h - shown : 0, background: t.card, borderRadius: 30, boxShadow: `inset 0 0 0 2px ${t.cardBorder}, ${cardShadow(t)}` }} />
      {el.title ? (
        <>
          <div style={{ position: 'absolute', left: PAD_X, top: PAD_Y - 4, display: 'flex', alignItems: 'center', gap: 16, fontFamily: t.fonts.display, fontWeight: 700, fontSize: titleSize, color: t.text, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
            <div style={{ width: 14, height: 14, borderRadius: 14, background: t.accent, boxShadow: `0 0 14px ${t.accentGlow}` }} />
            <RichText text={el.title} />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: PAD_Y + titleSize * 1.2 + 26, height: 1.5, background: t.cardBorder }} />
        </>
      ) : null}
      {rows.map((r, i) => {
        const top = y;
        y += r.h + ROW_GAP;
        const tone: Tone = r.it.tone ?? 'good';
        return (
          <div key={i} style={{ position: 'absolute', left: PAD_X, top, height: r.h, display: 'flex', alignItems: 'center', gap: 26 }}>
            {frame >= r.it.frame ? (
              <Tick t={t} tone={tone} frame={frame} fps={fps} start={r.it.frame} />
            ) : panelLook ? (
              <div style={{ width: BADGE, height: BADGE, flexShrink: 0 }} />
            ) : (
              <svg width={BADGE} height={BADGE} viewBox="-28 -28 56 56" style={{ flexShrink: 0 }}>
                <circle r={26} fill="none" stroke={t.cardBorder} strokeWidth={2.5} />
              </svg>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, ...reveal(frame, fps, r.it.frame, 200) }}>
              {r.it.icon ? <Glyph name={r.it.icon} size={44} color={t.textDim} /> : null}
              <div style={{ fontFamily: t.fonts.display, fontWeight: 500, fontSize: SIZE, lineHeight: `${LINE}px`, color: t.text, whiteSpace: 'nowrap' }}>
                {r.lines.map((l, k) => (
                  <div key={k}>
                    <RichText text={l} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </Fit>
  );
};
