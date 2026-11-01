import React from 'react';
import type { ElementProps } from '../../ElementView';
import { useTheme } from '../../../theme/ThemeContext';
import type { Theme } from '../../../theme/tokens';
import { easeOut, msToFrames, progress } from '../../../lib/anim';
import { Icon } from '../../../ui/Icon';
import { RichText } from '../../../ui/RichText';
import { CheckGlyph, CrossGlyph, Fit, alpha, isDark, mix, partIn } from './kit';

// Plan matrix (reference: "Free / Pro / Max / Team / Enterprise" tables). Row labels on the left,
// one value column per plan. Cells: ✓ / yes -> green check that draws on; ✗ / x / no -> dim cross;
// "-" or "" -> dash; "Beta" / "Preview" -> blue outline badge; "Not yet" / "Soon" / "Waitlist" ->
// amber outline badge; anything else -> plain text. A second line after "\n" is a small note
// ("Beta\nadmin turns on"). Column headers and row labels take a sub-line the same way
// ("Free\nNo Code tab", "Projects\n*Still rolling out*").
// Rows build top -> bottom quickly. `highlight.column` (0-based, over `columns`; `span` columns
// wide) lifts at its frame: raised fill, accent border, shadow, a bit taller; the rest dim.

const LABEL_W_MIN = 300;
const COL_W = 212;
const HEAD_H = 112;
const ROW_H = 118;
const COL_GAP = 14;
const LIFT = 22;

type Cell =
  | { kind: 'yes' }
  | { kind: 'no' }
  | { kind: 'dash' }
  | { kind: 'badge'; text: string; tone: 'info' | 'warn' | 'good' | 'bad'; note?: string }
  | { kind: 'text'; text: string; note?: string };

const parseCell = (raw: string): Cell => {
  const [head, note] = String(raw ?? '').split('\n');
  const s = head.trim();
  const k = s.toLowerCase();
  if (['✓', '✔', '✅', 'yes', 'y', 'true', 'check', 'v'].includes(k)) return { kind: 'yes' };
  if (['✗', '✕', '✖', '❌', 'x', 'no', 'n', 'false', 'cross'].includes(k)) return { kind: 'no' };
  if (['', '-', '–', '—', 'n/a', 'na'].includes(k)) return { kind: 'dash' };
  if (/^(beta|preview|alpha|new|research preview|early access)$/.test(k)) return { kind: 'badge', text: s, tone: 'info', note };
  if (/^(not yet|soon|coming soon|waitlist|limited|rolling out|later)$/.test(k)) return { kind: 'badge', text: s, tone: 'warn', note };
  if (/^(included|unlimited|free)$/.test(k)) return { kind: 'badge', text: s, tone: 'good', note };
  if (/^(removed|blocked|deprecated)$/.test(k)) return { kind: 'badge', text: s, tone: 'bad', note };
  return { kind: 'text', text: s, note };
};

const Note: React.FC<{ text?: string; t: Theme }> = ({ text, t }) =>
  text ? <div style={{ marginTop: 8, fontFamily: t.fonts.display, fontWeight: 500, fontSize: 20, color: t.textMuted, whiteSpace: 'nowrap' }}>{text}</div> : null;

const CellView: React.FC<{ cell: Cell; p: number; t: Theme }> = ({ cell, p, t }) => {
  const s = 0.6 + 0.4 * Math.min(1, p * 1.4) + 0.08 * Math.sin(Math.min(1, p) * Math.PI);
  const wrap = (child: React.ReactNode, note?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: Math.min(1, p * 2.5), transform: `scale(${s})` }}>
      {child}
      <Note text={note} t={t} />
    </div>
  );
  if (cell.kind === 'yes') return wrap(<CheckGlyph size={58} color={t.tones.good} p={p} stroke={4.4} />);
  if (cell.kind === 'no') return wrap(<CrossGlyph size={52} color={alpha(t.tones.muted, 0.55)} p={p} stroke={3.4} />);
  if (cell.kind === 'dash') return wrap(<div style={{ width: 28, height: 4, borderRadius: 2, background: alpha(t.tones.muted, 0.45) }} />);
  if (cell.kind === 'badge') {
    const c = t.tones[cell.tone];
    return wrap(
      <div
        style={{
          padding: '5px 16px 7px',
          borderRadius: 9,
          border: `2px solid ${c}`,
          background: alpha(c, isDark(t) ? 0.13 : 0.1),
          color: c,
          fontFamily: t.fonts.display,
          fontWeight: 600,
          fontSize: 32,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
        }}
      >
        {cell.text}
      </div>,
      cell.note,
    );
  }
  return wrap(<div style={{ fontFamily: t.fonts.display, fontWeight: 600, fontSize: 36, color: t.text, whiteSpace: 'nowrap' }}>{cell.text}</div>, cell.note);
};

export const Table: React.FC<ElementProps<'table'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const dark = isDark(t);
  const cols = el.columns;
  const n = cols.length;
  const rows = el.rows;
  const hl = el.highlight;
  const hlFrom = hl ? Math.max(0, Math.min(n - 1, hl.column)) : -1;
  const hlTo = hl ? Math.min(n - 1, hlFrom + Math.max(1, hl.span ?? 1) - 1) : -2;
  const isHl = (c: number) => c >= hlFrom && c <= hlTo;
  const lift = hl ? progress(frame, hl.frame, msToFrames(280, fps), easeOut) : 0;

  // Build: header, then each row 110 ms apart; its cells sweep left -> right 70 ms apart.
  const headAt = el.frame + msToFrames(60, fps);
  const rowAt = (r: number) => el.frame + msToFrames(220 + r * 110, fps);
  const cellAt = (r: number, c: number) => rowAt(r) + msToFrames(90 + c * 70, fps);

  const gridCols = `minmax(${LABEL_W_MIN}px, max-content) repeat(${n}, minmax(${COL_W}px, 1fr))`;
  const gridRows = `${HEAD_H}px repeat(${rows.length}, ${ROW_H}px)`;
  const colLine = (c: number) => c + 2; // grid line of value column c
  const dimOf = (c: number) => (hl && !isHl(c) ? 1 - 0.55 * lift : 1);
  const hasIcons = rows.some((r) => r.icon);

  const panelFill = dark ? mix(t.card, t.bg, 55) : mix(t.card, t.bg, 70);
  const liftFill = dark ? mix(t.cardRaised, '#fff', 94) : t.cardRaised;

  return (
    <Fit box={box} measureKey={JSON.stringify([cols, rows])}>
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gridTemplateRows: gridRows, columnGap: COL_GAP, position: 'relative', padding: `${LIFT + 6}px 8px ${LIFT + 10}px 0` }}>
        {/* value-area panel */}
        <div
          style={{
            gridColumn: `2 / ${n + 2}`,
            gridRow: `1 / ${rows.length + 2}`,
            background: panelFill,
            borderRadius: 16,
            boxShadow: `inset 0 0 0 1px ${alpha(t.cardBorder, 0.5)}`,
            ...partIn(frame, fps, el.frame, 260, 0),
          }}
        />
        {/* lifted highlight column(s): one raised panel per column */}
        {hl && lift > 0
          ? cols.map((_, c) =>
              isHl(c) ? (
                <div key={`lift${c}`} style={{ gridColumn: colLine(c), gridRow: `1 / ${rows.length + 2}`, position: 'relative', zIndex: 1 }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: -3 * lift,
                      right: -3 * lift,
                      top: -LIFT * lift,
                      bottom: -LIFT * lift,
                      borderRadius: 14,
                      background: liftFill,
                      border: `2px solid ${alpha(t.accent, 0.9 * lift)}`,
                      boxShadow: `0 ${26 * lift}px ${60 * lift}px rgba(0,0,0,${(dark ? 0.55 : 0.18) * lift}), 0 0 ${30 * lift}px ${alpha(t.accent, 0.2 * lift)}`,
                      opacity: Math.min(1, lift * 1.6),
                    }}
                  />
                </div>
              ) : null,
            )
          : null}

        {/* header row */}
        {cols.map((c, i) => {
          const [name, sub] = c.split('\n');
          const on = isHl(i) && lift > 0;
          return (
            <div
              key={`h${i}`}
              style={{
                gridColumn: colLine(i),
                gridRow: 1,
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 22px',
                opacity: dimOf(i),
                transform: on ? `translateY(${-6 * lift}px)` : undefined,
              }}
            >
              <div style={{ ...partIn(frame, fps, headAt + msToFrames(i * 40, fps)), display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    fontFamily: t.fonts.display,
                    fontWeight: 600,
                    fontSize: 40,
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap',
                    color: on ? mix(t.accent, t.textMuted, Math.round(100 * lift)) : t.textMuted,
                  }}
                >
                  {name}
                </div>
                {sub ? <div style={{ marginTop: 4, fontFamily: t.fonts.display, fontWeight: 500, fontSize: 22, color: t.textMuted, opacity: 0.8, whiteSpace: 'nowrap' }}>{sub}</div> : null}
              </div>
            </div>
          );
        })}

        {/* rows */}
        {rows.map((row, r) => {
          const [label, sub] = row.label.split('\n');
          return (
            <React.Fragment key={`r${r}`}>
              <div
                style={{
                  gridColumn: 1,
                  gridRow: r + 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 22,
                  paddingRight: 44,
                  borderBottom: r < rows.length - 1 ? `2px solid ${alpha(t.cardBorder, dark ? 0.7 : 1)}` : undefined,
                  ...partIn(frame, fps, rowAt(r)),
                }}
              >
                {hasIcons ? (
                  <div
                    style={{
                      width: 72,
                      height: 58,
                      flexShrink: 0,
                      borderRadius: 12,
                      background: dark ? mix(t.cardRaised, '#fff', 92) : t.cardRaised,
                      boxShadow: `inset 0 0 0 1px ${alpha(t.cardBorder, 0.9)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: row.icon ? 1 : 0,
                    }}
                  >
                    {row.icon ? <Icon name={row.icon} size={32} color={t.textDim} strokeWidth={2} /> : null}
                  </div>
                ) : null}
                <div>
                  <div style={{ fontFamily: t.fonts.display, fontWeight: 600, fontSize: 46, lineHeight: 1.1, color: t.text, whiteSpace: 'nowrap' }}>{label}</div>
                  {sub ? (
                    <div style={{ marginTop: 6, fontFamily: t.fonts.display, fontWeight: 600, fontSize: 28, color: t.textMuted, whiteSpace: 'nowrap' }}>
                      <RichText text={sub} />
                    </div>
                  ) : null}
                </div>
              </div>
              {cols.map((_, c) => {
                const p = progress(frame, cellAt(r, c), msToFrames(220, fps), easeOut);
                const on = isHl(c) && lift > 0;
                return (
                  <div
                    key={`c${r}-${c}`}
                    style={{
                      gridColumn: colLine(c),
                      gridRow: r + 2,
                      zIndex: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: dimOf(c),
                      transform: on ? `translateY(${-6 * lift}px)` : undefined,
                    }}
                  >
                    {p > 0 ? <CellView cell={parseCell(row.cells[c] ?? '')} p={p} t={t} /> : null}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </Fit>
  );
};
