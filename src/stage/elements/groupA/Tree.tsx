import React from 'react';
import type { ElementProps } from '../../ElementView';
import { useTheme } from '../../../theme/ThemeContext';
import { msToFrames } from '../../../lib/anim';
import { RichText } from '../../../ui/RichText';
import { cardShadow, dash, drawP, Fit, Glyph, mix, popIn, reveal, textW, wrap } from './kit';

// Orchestrator fan-out (reference: "Master session" node graph, "Personal assistant" tree). The root
// is a card with a 3 px accent ring and glow (or a ringed circle when it has no text); bezier
// connectors draw on to each child, which pops in on its word as a leaf circle with a label.
// Icons default to the pixel critter. A small accent pulse keeps travelling down live branches.
const ROOT_H = 118;
const ROOT_CIRCLE = 210;
const LEAF = 118;
const LABEL = 36;
const LABEL_MAX = 300;
const DROP = 190; // root bottom -> leaf top
const DRAW_MS = 300;

const bez = (p0: number, p1: number, p2: number, p3: number, u: number) => {
  const v = 1 - u;
  return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3;
};

export const Tree: React.FC<ElementProps<'tree'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const root = el.root;
  const kids = el.children;
  const circleRoot = !root.text;
  const rootW = circleRoot ? ROOT_CIRCLE : 40 * 2 + 56 + 20 + textW(root.text, 44, 'display', 600);
  const rootH = circleRoot ? ROOT_CIRCLE : ROOT_H;

  const labels = kids.map((k) => wrap(k.text, LABEL, LABEL_MAX, 'display', 600));
  const slotW = Math.max(LEAF + 30, ...labels.map((ls) => Math.max(...ls.map((l) => textW(l, LABEL, 'display', 600)))), ...kids.map((k) => (k.sub ? textW(k.sub, 26, 'display', 500) : 0))) + 44;
  const maxLines = Math.max(1, ...labels.map((l) => l.length));
  const hasSub = kids.some((k) => k.sub);
  const rowW = slotW * Math.max(1, kids.length);
  const W = Math.max(rootW + 40, rowW);
  const leafTop = rootH + DROP;
  const H = leafTop + LEAF + 16 + maxLines * LABEL * 1.15 + (hasSub ? 34 : 0) + 6;

  const cx = W / 2;
  const jy = rootH + 34; // junction below the root
  const drawF = msToFrames(DRAW_MS, fps);
  const stemStart = root.frame + Math.round(0.15 * fps);

  const kidsGeo = kids.map((k, i) => {
    const x = (W - rowW) / 2 + slotW * (i + 0.5);
    const start = Math.max(stemStart + 4, k.frame - drawF);
    return { k, x, start, lines: labels[i] };
  });

  return (
    <Fit w={W} h={H} box={box} max={1.2}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {/* stem */}
        <path d={`M ${cx} ${rootH} L ${cx} ${jy}`} stroke={t.accent} strokeWidth={3} fill="none" strokeLinecap="round" {...dash(drawP(frame, fps, stemStart, 160))} />
        {kidsGeo.map(({ x, start }, i) => {
          const y2 = leafTop - 12;
          const d = `M ${cx} ${jy} C ${cx} ${jy + (y2 - jy) * 0.55}, ${x} ${jy + (y2 - jy) * 0.3}, ${x} ${y2}`;
          const p = drawP(frame, fps, start, DRAW_MS);
          // pulse travelling down the branch after it has drawn
          const period = Math.round(1.7 * fps);
          const live = frame - (start + drawF);
          const u = live > 0 ? ((live + i * 9) % period) / period : -1;
          const px = u >= 0 ? bez(cx, cx, x, x, u) : 0;
          const py = u >= 0 ? bez(jy, jy + (y2 - jy) * 0.55, jy + (y2 - jy) * 0.3, y2, u) : 0;
          const po = u >= 0 ? Math.sin(Math.PI * u) : 0;
          return (
            <g key={i}>
              <path d={d} stroke={mix(t.accent, 85, 'transparent')} strokeWidth={3} fill="none" strokeLinecap="round" {...dash(p)} />
              {u >= 0 ? <circle cx={px} cy={py} r={6} fill={t.accent} opacity={po} style={{ filter: `drop-shadow(0 0 6px ${t.accentGlow})` }} /> : null}
            </g>
          );
        })}
        {frame >= stemStart ? <circle cx={cx} cy={jy} r={7} fill={t.textMuted} stroke={t.bg} strokeWidth={3} opacity={drawP(frame, fps, stemStart, 160)} /> : null}
      </svg>

      {/* root */}
      <div
        style={{
          position: 'absolute',
          left: cx - rootW / 2,
          top: 0,
          width: rootW,
          height: rootH,
          boxSizing: 'border-box',
          borderRadius: circleRoot ? rootH : 28,
          background: mix(t.accent, 6, t.card),
          boxShadow: `inset 0 0 0 3px ${t.accent}, 0 0 46px ${t.accentGlow}, ${cardShadow(t)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          ...reveal(frame, fps, root.frame, 240, 0.9),
        }}
      >
        <Glyph name={root.icon ?? 'critter'} size={circleRoot ? 120 : 56} color={t.accent} stroke={2.4} />
        {circleRoot ? null : (
          <div style={{ fontFamily: t.fonts.display, fontWeight: 600, fontSize: 44, color: t.text, whiteSpace: 'nowrap', lineHeight: 1 }}>
            <RichText text={root.text} />
          </div>
        )}
      </div>

      {/* leaves */}
      {kidsGeo.map(({ k, x, lines }, i) => {
        const c = k.tone ? t.tones[k.tone] : undefined;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: x - LEAF / 2,
                top: leafTop,
                width: LEAF,
                height: LEAF,
                borderRadius: LEAF,
                background: c ? mix(c, 10, t.card) : t.card,
                boxShadow: `inset 0 0 0 ${c ? 2.5 : 1.5}px ${c ?? t.cardBorder}, ${c ? `0 0 26px ${mix(c, 40, 'transparent')}, ` : ''}${cardShadow(t)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...popIn(frame, fps, k.frame, 300, 1.1, 0.5),
              }}
            >
              <Glyph name={k.icon ?? 'critter'} size={58} color={c ?? t.text} stroke={2.2} />
            </div>
            <div
              style={{
                position: 'absolute',
                left: x - slotW / 2,
                top: leafTop + LEAF + 16,
                width: slotW,
                textAlign: 'center',
                ...reveal(frame, fps, k.frame + 2, 200),
              }}
            >
              <div style={{ fontFamily: t.fonts.display, fontWeight: 600, fontSize: LABEL, lineHeight: 1.15, color: t.text, whiteSpace: 'nowrap' }}>
                {lines.map((l, j) => (
                  <div key={j}>
                    <RichText text={l} />
                  </div>
                ))}
              </div>
              {k.sub ? <div style={{ marginTop: 6, fontFamily: t.fonts.display, fontWeight: 500, fontSize: 26, color: t.textMuted, whiteSpace: 'nowrap' }}>{k.sub}</div> : null}
            </div>
          </React.Fragment>
        );
      })}
    </Fit>
  );
};
