import React from 'react';
import type { ElementProps } from '../../ElementView';
import type { Item, Tone } from '../../../types';
import type { Theme } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import { msToFrames } from '../../../lib/anim';
import { RichText } from '../../../ui/RichText';
import { cardShadow, dash, drawP, Fit, fitScale, Glyph, mix, reveal, textW } from './kit';

// Nodes joined by labelled arrows (reference: "Main session" -> Prompt -> subagent, Result back).
// Forward arrows are accent, the returning arrow is `good`. `direction: loop` (or one more arrow
// than gaps) adds the return arrow: parallel under the forward one for two nodes, a U-turn under
// the row for three or more. Narrow boxes switch to a vertical layout when that reads larger.
const NODE_H = 104;
const NODE_H_SUB = 136;
const LABEL = 36;
const ICON = 44;
const PAIR = 28; // offset of the two parallel arrows from the centre line
const DRAW_MS = 320;

type Arrow = { from: [number, number][]; label?: string; tone: Tone; start: number; ms: number; labelAt: [number, number]; labelAlign: 'center' | 'left' | 'right'; labelSide: 'above' | 'below' | 'mid' };

const nodeW = (n: Item) => 32 * 2 + (n.icon ? ICON + 16 : 0) + Math.max(textW(n.text, 40, 'display', 600), n.sub ? textW(n.sub, 28, 'display', 500) : 0);

// Polyline with rounded corners as an SVG path.
function roundedPath(pts: [number, number][], r = 26): string {
  if (pts.length < 3) return `M ${pts[0][0]} ${pts[0][1]} L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(cx - px, cy - py);
    const l2 = Math.hypot(nx - cx, ny - cy);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const ax = cx - ((cx - px) / l1) * rr;
    const ay = cy - ((cy - py) / l1) * rr;
    const bx = cx + ((nx - cx) / l2) * rr;
    const by = cy + ((ny - cy) / l2) * rr;
    d += ` L ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L ${last[0]} ${last[1]}`;
}

const ArrowView: React.FC<{ a: Arrow; t: Theme; frame: number; fps: number }> = ({ a, t, frame, fps }) => {
  const c = t.tones[a.tone];
  const p = drawP(frame, fps, a.start, a.ms);
  if (frame < a.start) return null;
  const pts = a.from;
  const [tx, ty] = pts[pts.length - 1];
  const [sx, sy] = pts[pts.length - 2];
  const len = Math.hypot(tx - sx, ty - sy) || 1;
  const dx = (tx - sx) / len;
  const dy = (ty - sy) / len;
  const head = 20;
  const hp = Math.max(0, Math.min(1, (p - 0.78) / 0.22));
  const h1: [number, number] = [tx - dx * head - dy * head * 0.85, ty - dy * head + dx * head * 0.85];
  const h2: [number, number] = [tx - dx * head + dy * head * 0.85, ty - dy * head - dx * head * 0.85];
  return (
    <g>
      <path d={roundedPath(pts)} fill="none" stroke={c} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" {...dash(p)} style={{ filter: `drop-shadow(0 0 8px ${mix(c, 35, 'transparent')})` }} />
      <path d={`M ${h1[0]} ${h1[1]} L ${tx} ${ty} L ${h2[0]} ${h2[1]}`} fill="none" stroke={c} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" opacity={hp > 0 ? 1 : 0} {...dash(hp)} />
    </g>
  );
};

const ArrowLabel: React.FC<{ a: Arrow; t: Theme; frame: number; fps: number }> = ({ a, t, frame, fps }) => {
  if (!a.label) return null;
  const w = textW(a.label, LABEL, 'display', 700) + 8;
  const [x, y] = a.labelAt;
  const left = a.labelAlign === 'center' ? x - w / 2 : a.labelAlign === 'left' ? x : x - w;
  const top = a.labelSide === 'above' ? y - LABEL * 1.2 : a.labelSide === 'below' ? y : y - LABEL * 0.6;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: w,
        textAlign: a.labelAlign,
        fontFamily: t.fonts.display,
        fontWeight: 700,
        fontSize: LABEL,
        lineHeight: 1.2,
        color: t.tones[a.tone],
        whiteSpace: 'nowrap',
        ...reveal(frame, fps, a.start + Math.round(msToFrames(a.ms, fps) * 0.3), 200),
      }}
    >
      <RichText text={a.label} accent={t.text} />
    </div>
  );
};

export const Flow: React.FC<ElementProps<'flow'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const nodes = el.nodes;
  const n = nodes.length;
  if (n === 0) return null;
  const arrowsIn = el.arrows ?? [];
  const hasReturn = n >= 2 && (el.direction === 'loop' || arrowsIn.length >= n);
  const fwdSpec = (i: number) => arrowsIn[i] ?? {};
  const retSpec = hasReturn ? (arrowsIn[n - 1] ?? {}) : null;
  const pair = hasReturn && n === 2;
  const drawF = msToFrames(DRAW_MS, fps);

  const hasSub = nodes.some((x) => x.sub);
  const NH = hasSub ? NODE_H_SUB : NODE_H;
  const widths = nodes.map(nodeW);
  const labelW = (s?: { label?: string }) => (s?.label ? textW(s.label, LABEL, 'display', 700) : 0);
  const gapLen = (i: number) => Math.max(pair ? 250 : 210, labelW(fwdSpec(i)) + 80, pair && retSpec ? labelW(retSpec) + 80 : 0);

  // Timing defaults: an arrow finishes drawing as its target node lands.
  const fwdStart = (i: number) => fwdSpec(i).frame ?? Math.max(nodes[i].frame + 4, nodes[i + 1].frame - drawF);
  const lastFwdEnd = n > 1 ? Math.max(...nodes.slice(0, n - 1).map((_, i) => fwdStart(i) + drawF)) : nodes[0]?.frame ?? el.frame;
  const retStart = retSpec?.frame ?? lastFwdEnd + Math.round(0.5 * fps);

  // ----- Row geometry -----
  const rowGaps = nodes.slice(0, -1).map((_, i) => gapLen(i));
  const rowW = widths.reduce((s, w) => s + w, 0) + rowGaps.reduce((s, g) => s + g, 0);
  const labelBand = LABEL * 1.2 + 18;
  const loopDrop = hasReturn && !pair ? 96 : 0;
  const rowTop = labelBand + (pair ? PAIR : 0);
  const rowH = rowTop + NH + (pair ? PAIR + labelBand : loopDrop ? loopDrop + labelBand : 0) + 8;

  // ----- Column geometry -----
  const maxNodeW = Math.max(...widths);
  const allLabelW = Math.max(0, ...arrowsIn.map(labelW));
  const colGap = 130;
  const colSide = allLabelW + 60 + (hasReturn && !pair ? 90 : 0) + (pair ? PAIR : 0);
  const colW = maxNodeW + colSide * 2;
  const colH = n * NH + (n - 1) * colGap + 8;

  const vertical = n >= 3 && fitScale(rowW, rowH, box) < 0.7 && fitScale(colW, colH, box) > fitScale(rowW, rowH, box) * 1.15;
  const W = vertical ? colW : rowW;
  const H = vertical ? colH : rowH;

  // Node boxes in design px.
  const rects = nodes.map((_, i) => {
    if (vertical) return { x: (W - widths[i]) / 2, y: i * (NH + colGap), w: widths[i], h: NH };
    const x = widths.slice(0, i).reduce((s, w) => s + w, 0) + rowGaps.slice(0, i).reduce((s, g) => s + g, 0);
    return { x, y: rowTop, w: widths[i], h: NH };
  });

  const arrows: Arrow[] = [];
  const g = 18; // clearance between arrow ends and nodes
  for (let i = 0; i < n - 1; i++) {
    const a = rects[i];
    const b = rects[i + 1];
    const tone = fwdSpec(i).tone ?? 'accent';
    if (vertical) {
      const x = W / 2 + (pair ? -PAIR : 0);
      const y1 = a.y + a.h + g;
      const y2 = b.y - g;
      arrows.push({ from: [[x, y1], [x, y2]], label: fwdSpec(i).label, tone, start: fwdStart(i), ms: DRAW_MS, labelAt: [pair ? x - 22 : x + 22, (y1 + y2) / 2], labelAlign: pair ? 'right' : 'left', labelSide: 'mid' });
    } else {
      const y = a.y + a.h / 2 - (pair ? PAIR : 0);
      const x1 = a.x + a.w + g;
      const x2 = b.x - g;
      arrows.push({ from: [[x1, y], [x2, y]], label: fwdSpec(i).label, tone, start: fwdStart(i), ms: DRAW_MS, labelAt: [(x1 + x2) / 2, y - 18], labelAlign: 'center', labelSide: 'above' });
    }
  }
  if (hasReturn && retSpec) {
    const tone = retSpec.tone ?? 'good';
    const first = rects[0];
    const last = rects[n - 1];
    if (pair) {
      if (vertical) {
        const x = W / 2 + PAIR;
        arrows.push({ from: [[x, last.y - g], [x, first.y + first.h + g]], label: retSpec.label, tone, start: retStart, ms: DRAW_MS, labelAt: [x + 22, (last.y + first.y + first.h) / 2], labelAlign: 'left', labelSide: 'mid' });
      } else {
        const y = first.y + first.h / 2 + PAIR;
        const x1 = last.x - g;
        const x2 = first.x + first.w + g;
        arrows.push({ from: [[x1, y], [x2, y]], label: retSpec.label, tone, start: retStart, ms: DRAW_MS, labelAt: [(x1 + x2) / 2, y + 16], labelAlign: 'center', labelSide: 'below' });
      }
    } else if (vertical) {
      const xr = W / 2 + maxNodeW / 2 + 90;
      const yl = last.y + last.h / 2;
      const yf = first.y + first.h / 2;
      arrows.push({ from: [[last.x + last.w + g, yl], [xr, yl], [xr, yf], [first.x + first.w + g, yf]], label: retSpec.label, tone, start: retStart, ms: 480, labelAt: [xr + 22, (yl + yf) / 2], labelAlign: 'left', labelSide: 'mid' });
    } else {
      const yb = first.y + first.h + loopDrop;
      const xl = last.x + last.w / 2;
      const xf = first.x + first.w / 2;
      arrows.push({ from: [[xl, last.y + last.h + g], [xl, yb], [xf, yb], [xf, first.y + first.h + g]], label: retSpec.label, tone, start: retStart, ms: 480, labelAt: [(xl + xf) / 2, yb + 14], labelAlign: 'center', labelSide: 'below' });
    }
  }

  return (
    <Fit w={W} h={H} box={box} max={1.25}>
      <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        {arrows.map((a, i) => (
          <ArrowView key={i} a={a} t={t} frame={frame} fps={fps} />
        ))}
      </svg>
      {arrows.map((a, i) => (
        <ArrowLabel key={i} a={a} t={t} frame={frame} fps={fps} />
      ))}
      {nodes.map((nd, i) => {
        const r = rects[i];
        const tc = nd.tone ? t.tones[nd.tone] : undefined;
        const ring = nd.tone === 'accent';
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              width: r.w,
              height: r.h,
              boxSizing: 'border-box',
              borderRadius: 24,
              background: ring ? mix(t.accent, 7, t.card) : t.card,
              boxShadow: `inset 0 0 0 ${ring ? 2.5 : 1.5}px ${ring ? t.accent : t.cardBorder}, ${ring ? `0 0 36px ${t.accentGlow}, ` : ''}${cardShadow(t)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: '0 32px',
              ...reveal(frame, fps, nd.frame, 240, 0.9),
            }}
          >
            {nd.icon ? <Glyph name={nd.icon} size={ICON} color={nd.icon === 'critter' ? (tc ?? t.accent) : (tc ?? t.textDim)} /> : null}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: t.fonts.display, fontWeight: 600, fontSize: 40, lineHeight: 1.1, color: t.text, whiteSpace: 'nowrap' }}>
                <RichText text={nd.text} />
              </div>
              {nd.sub ? <div style={{ fontFamily: t.fonts.display, fontWeight: 500, fontSize: 28, lineHeight: 1.2, color: t.textMuted, whiteSpace: 'nowrap', marginTop: 2 }}>{nd.sub}</div> : null}
            </div>
          </div>
        );
      })}
    </Fit>
  );
};
