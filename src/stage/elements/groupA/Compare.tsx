import React from 'react';
import type { ElementProps } from '../../ElementView';
import { useTheme } from '../../../theme/ThemeContext';
import { easeInOut, msToFrames, progress } from '../../../lib/anim';
import { RichText } from '../../../ui/RichText';
import { Badge, cardShadow, Fit, fitScale, Glyph, mix, popIn, reveal, textW, wrap } from './kit';

// 2-3 column comparison cards (reference: Projects vs Nested sessions, DecisionTree cards, Peek/Talk
// status pills). Each column card blurs in on its word; rows land on theirs and their good/bad
// badge pops. A highlighted column gets the accent ring + glow and a slight lift while the others
// recede; it lands at `highlightFrame`, or once everything has been said.
const TITLE = 50;
const ROW = 36;
const LINE = 46;
const BADGE = 50;
const PAD = 40;
const GAP = 40;
const ROW_GAP = 26;

export const Compare: React.FC<ElementProps<'compare'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const cols = el.columns;
  if (cols.length === 0) return null;
  const n = Math.max(1, cols.length);
  // Wrap width chosen so the cards fit the box near scale 1.
  const textMax = Math.max(260, Math.min(560, (box.w - GAP * (n - 1)) / n - PAD * 2 - BADGE - 20));
  const laid = cols.map((c) => {
    const rows = c.rows.map((r) => ({ r, lines: wrap(r.text, ROW, textMax, 'display', 500) }));
    const titleLines = wrap(c.title, TITLE, textMax + BADGE, 'serif', 600);
    const w = Math.max(
      ...titleLines.map((l) => textW(l, TITLE, 'serif', 600)) .map((x) => x + (c.icon ? 64 + 18 : 0)),
      ...rows.map(({ lines }) => BADGE + 20 + Math.max(...lines.map((l) => textW(l, ROW, 'display', 500)))),
    );
    return { c, rows, titleLines, w };
  });
  const colW = Math.max(...laid.map((l) => l.w), 300) + PAD * 2;
  const titleH = Math.max(...laid.map((l) => l.titleLines.length)) * TITLE * 1.1;
  const headH = PAD + Math.max(titleH, 64) + 28;
  const rowsH = Math.max(...laid.map((l) => l.rows.reduce((s, { lines }) => s + Math.max(BADGE, lines.length * LINE), 0) + ROW_GAP * Math.max(0, l.rows.length - 1)));
  const colH = headH + 30 + rowsH + PAD;
  const lift = 26; // room for the highlighted card's scale
  const W = colW * n + GAP * (n - 1) + lift * 2;
  const H = colH + lift * 2;

  const everything = Math.max(...cols.flatMap((c) => [c.frame, ...c.rows.map((r) => r.frame)]));
  // Default: once everything has been said, but always early enough to be seen in a short scene.
  const hlF = (i: number) => cols[i].highlightFrame ?? Math.min(everything + Math.round(0.45 * fps), el.end - Math.round(1.2 * fps));
  const hlP = cols.map((c, i) => (c.highlight ? progress(frame, hlF(i), msToFrames(320, fps), easeInOut) : 0));
  const anyHl = Math.max(0, ...hlP);

  return (
    <Fit w={W} h={H} box={box} max={fitScale(W, H, box) > 1.15 ? 1.15 : 1}>
      {laid.map(({ c, rows, titleLines }, i) => {
        const p = hlP[i];
        const dim = c.highlight ? 1 : 1 - 0.32 * anyHl;
        let y = headH + 30;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: lift + i * (colW + GAP),
              top: lift,
              width: colW,
              height: colH,
              ...reveal(frame, fps, c.frame, 240, 0.94),
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 30,
                background: p > 0 ? mix(t.accent, 6 * p, t.card) : t.card,
                boxShadow: `inset 0 0 0 ${2 + 1 * p}px ${p > 0 ? mix(t.accent, 100 * p, t.cardBorder) : t.cardBorder}, 0 0 ${50 * p}px ${p > 0 ? mix(t.accent, 45 * p, 'transparent') : 'transparent'}, ${cardShadow(t)}`,
                transform: `scale(${1 + 0.035 * p})`,
                opacity: dim,
              }}
            >
              <div style={{ position: 'absolute', left: PAD, right: PAD, top: PAD, height: Math.max(titleH, 64), display: 'flex', alignItems: 'center', gap: 18 }}>
                {c.icon ? (
                  <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 16, background: c.highlight ? mix(t.accent, 14 + 6 * p, t.card) : mix(t.text, 6, t.card), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Glyph name={c.icon} size={36} color={c.highlight && p > 0.5 ? t.accent : t.textDim} />
                  </div>
                ) : null}
                <div style={{ fontFamily: t.fonts.serif, fontWeight: 600, fontSize: TITLE, lineHeight: 1.1, color: t.text, whiteSpace: 'nowrap' }}>
                  {titleLines.map((l, k) => (
                    <div key={k}>
                      <RichText text={l} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ position: 'absolute', left: PAD, right: PAD, top: headH, height: 1.5, background: p > 0 ? mix(t.accent, 50 * p, t.cardBorder) : t.cardBorder }} />
              {rows.map(({ r, lines }, k) => {
                const h = Math.max(BADGE, lines.length * LINE);
                const top = y;
                y += h + ROW_GAP;
                return (
                  <div key={k} style={{ position: 'absolute', left: PAD, top, height: h, display: 'flex', alignItems: 'center', gap: 20 }}>
                    {r.tone ? (
                      <Badge t={t} tone={r.tone} size={BADGE} style={popIn(frame, fps, r.frame + Math.round(0.1 * fps), 260, 1.15, 0.3)} />
                    ) : (
                      <div style={{ width: BADGE, height: BADGE, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...popIn(frame, fps, r.frame, 240) }}>
                        <div style={{ width: 12, height: 12, borderRadius: 12, background: c.highlight ? t.accent : t.textMuted }} />
                      </div>
                    )}
                    <div style={{ fontFamily: t.fonts.display, fontWeight: 500, fontSize: ROW, lineHeight: `${LINE}px`, color: r.tone === 'bad' ? t.textDim : t.text, whiteSpace: 'nowrap', ...reveal(frame, fps, r.frame, 200) }}>
                      {lines.map((l, j) => (
                        <div key={j}>
                          <RichText text={l} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </Fit>
  );
};
