import React from 'react';
import type { ElementProps } from '../../ElementView';
import { useTheme } from '../../../theme/ThemeContext';
import { msToFrames, pop, progress, easeOut } from '../../../lib/anim';
import { Icon } from '../../../ui/Icon';
import { Fit, alpha, isDark, mix } from './kit';

// Enlarged composer-style prompt card (reference 4:15 "Do these at the same time," lift-out):
// composer fill, "+" on the left, mic on the right, the text typing at `cps` (default 40) with a
// caret. Optional `label` chip pops above the card ("Prompt", "Take a screenshot!").
// The full text is laid out from the first frame (untyped characters are transparent), so the card
// never changes size while it types.

export const Prompt: React.FC<ElementProps<'prompt'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const dark = isDark(t);
  const W = Math.min(1480, Math.max(760, box.w - 24));
  const len = el.text.length;
  const textW = W - 250;
  const cpl = (fs: number) => Math.max(8, textW / (0.52 * fs));
  const fs = [46, 42, 38, 34, 30].find((f) => Math.ceil(len / cpl(f)) * f * 1.4 <= Math.max(200, box.h - 220)) ?? 30;

  const cps = el.cps && el.cps > 0 ? el.cps : 40;
  const typeAt = el.frame + msToFrames(el.label ? 380 : 260, fps);
  const n = Math.max(0, Math.min(len, Math.floor(((frame - typeAt) * cps) / fps)));
  const doneAt = typeAt + Math.ceil((len * fps) / cps);
  const caretOn = frame < doneAt ? true : Math.floor((frame - doneAt) / Math.round(fps * 0.5)) % 2 === 1;

  const chipS = el.label ? Math.max(0, pop(frame, fps, el.frame + msToFrames(120, fps), 260, 1.1)) : 0;
  const chipO = el.label ? progress(frame, el.frame + msToFrames(120, fps), msToFrames(120, fps), easeOut) : 0;

  const fill = dark ? mix(t.card, '#fff', 93) : t.cardRaised;
  const border = dark ? mix(t.cardBorder, '#fff', 88) : t.cardBorder;
  const ink = dark ? '#f4f2ee' : t.text;

  const card = (content: React.ReactNode, ghost: boolean) => (
    <div
      style={{
        width: W,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 30,
        padding: `${Math.round(fs * 0.72)}px 40px`,
        borderRadius: 34,
        background: `linear-gradient(180deg, ${mix(fill, '#fff', dark ? 95 : 100)} 0%, ${fill} 100%)`,
        border: `1.5px solid ${border}`,
        boxShadow: [`0 30px 80px rgba(0,0,0,${dark ? 0.55 : 0.16})`, `inset 0 1px 0 rgba(255,255,255,${dark ? 0.06 : 0.8})`].join(', '),
        visibility: ghost ? 'hidden' : undefined,
      }}
    >
      <div style={{ alignSelf: 'flex-start', display: 'flex', height: fs * 1.4, alignItems: 'center' }}>
        <Icon name="plus" size={Math.round(fs * 1.05)} color={t.textDim} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0, fontFamily: t.fonts.ui, fontWeight: 400, fontSize: fs, lineHeight: 1.4, color: ink, whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
        {content}
      </div>
      <div style={{ alignSelf: 'flex-start', display: 'flex', height: fs * 1.4, alignItems: 'center' }}>
        <Icon name="mic" size={Math.round(fs * 0.95)} color={t.textDim} strokeWidth={2} />
      </div>
    </div>
  );

  return (
    <Fit box={box} measureKey={JSON.stringify([el.text, el.label, W, fs])}>
      <div style={{ width: W, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        {el.label ? (
          <div
            style={{
              marginLeft: 18,
              marginBottom: 22,
              padding: '10px 28px 12px',
              borderRadius: 999,
              background: t.accent,
              color: '#fff',
              fontFamily: t.fonts.display,
              fontWeight: 600,
              fontSize: 36,
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              boxShadow: `0 10px 30px ${alpha(t.accent, 0.35)}`,
              transform: `scale(${chipS})`,
              transformOrigin: 'left bottom',
              opacity: chipO,
            }}
          >
            {el.label}
          </div>
        ) : null}
        {/* The ghost (full text, hidden) holds the final size; the live card is pinned to its top and
            grows line by line as the text wraps, like a real composer. */}
        <div style={{ position: 'relative', width: W }}>
          {card(<span>{el.text}</span>, true)}
          <div style={{ position: 'absolute', left: 0, top: 0, width: W }}>
            {card(
              <>
                {el.text.slice(0, n)}
                <span style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 1,
                      top: '0.12em',
                      width: Math.max(2, fs * 0.065),
                      height: '1.16em',
                      borderRadius: 1,
                      background: ink,
                      opacity: caretOn ? 1 : 0,
                    }}
                  />
                  {'\u200b'}
                </span>
              </>,
              false,
            )}
          </div>
        </div>
      </div>
    </Fit>
  );
};
