import React from 'react';
import type { ElementProps } from '../../ElementView';
import { useTheme } from '../../../theme/ThemeContext';
import { msToFrames, progress } from '../../../lib/anim';
import { Fit, Marker, markerMs, partIn, splitPhrase } from './kit';

// Big serif quote: a large accent opening mark, the text in the display serif, an optional marker
// phrase that wipes in on its word, and an attribution line ("— Dario Amodei").

const linear = (x: number) => x;

export const Quote: React.FC<ElementProps<'quote'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const len = el.text.length;
  const fs = len <= 40 ? 96 : len <= 80 ? 84 : len <= 140 ? 70 : len <= 220 ? 58 : 50;
  const W = Math.min(1500, Math.max(700, box.w - 40));
  // Shrink-wrap the block to its balanced line length so it centres optically (CSS can't size a
  // box to its longest wrapped line). Serif average advance is ~0.46 em.
  const est = len * fs * 0.46;
  const lines = Math.max(1, Math.ceil(est / W));
  const blockW = Math.min(W, est / lines + fs * 1.2);
  const split = splitPhrase(el.text, el.mark?.phrase);
  const markP = el.mark && split ? progress(frame, el.mark.frame, msToFrames(markerMs(split[1]), fps), linear) : 0;
  const by = el.by ? (/^[—–-]/.test(el.by) ? el.by : `— ${el.by}`) : null;
  const markSize = fs * 2.9;

  return (
    <Fit box={box} measureKey={JSON.stringify([el.text, el.by, blockW, fs])}>
      <div style={{ position: 'relative', width: blockW, paddingTop: markSize * 0.36, paddingLeft: fs * 0.1 }}>
        <div
          style={{
            position: 'absolute',
            left: -fs * 0.08,
            top: -markSize * 0.16,
            fontFamily: t.fonts.serif,
            fontWeight: 700,
            fontSize: markSize,
            lineHeight: 1,
            color: t.accent,
            ...partIn(frame, fps, el.frame, 260, 10),
          }}
        >
          “
        </div>
        <div
          style={{
            fontFamily: t.fonts.serif,
            fontWeight: 500,
            fontSize: fs,
            lineHeight: 1.18,
            letterSpacing: -fs * 0.008,
            color: t.text,
            textWrap: 'balance',
          } as React.CSSProperties}
        >
          {split ? (
            <>
              {split[0]}
              <Marker p={markP} color={t.accent}>
                {split[1]}
              </Marker>
              {split[2]}
            </>
          ) : (
            el.text
          )}
        </div>
        {by ? (
          <div
            style={{
              marginTop: fs * 0.55,
              fontFamily: t.fonts.display,
              fontWeight: 600,
              fontSize: Math.max(34, fs * 0.46),
              color: t.textDim,
              ...partIn(frame, fps, el.frame + msToFrames(300, fps)),
            }}
          >
            {by}
          </div>
        ) : null}
      </div>
    </Fit>
  );
};
