import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { StepBadge, Timeline } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { BADGE } from '../theme/panel';
import { easeInOut, msToFrames, progress } from '../lib/anim';
import { textW } from '../stage/elements/groupA/kit';

// The step badge above the tile: which part the viewer is in, always on screen. When the part
// changes the text swaps (old out first, then new in) and the progress bar fills. Fills the same
// box as Samin's badge PNGs (make_badges.py): a 342x138 card inside the 354x150 slot.

const INSET = 6;
const PAD = 28;
const TITLE_W = BADGE.w - PAD * 2;

const fitTitle = (title: string) => {
  const natural = textW(title, 29, 'display', 800, -0.01);
  return Math.max(15, Math.min(29, (29 * TITLE_W) / natural));
};

const eyebrowOf = (b: StepBadge) => (b.step > 0 ? `${b.eyebrow} · ${b.step} / ${b.total}` : b.eyebrow).toUpperCase();

export const StepBadgeLayer: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { badges, webcam } = timeline;
  if (badges.length === 0 || frame < badges[0].frame) return null;

  let i = 0;
  while (i + 1 < badges.length && badges[i + 1].frame <= frame) i++;
  const cur = badges[i];
  const prev = i > 0 ? badges[i - 1] : null;
  const swapF = msToFrames(300, fps);
  const p = prev ? progress(frame, cur.frame, swapF, easeInOut) : 1;
  const shown = p < 0.5 && prev ? prev : cur;
  const textOpacity = prev && p < 1 ? Math.abs(2 * p - 1) : 1;

  // Bows out with the panel when the head goes full frame.
  let w = 0;
  while (w + 1 < webcam.length && webcam[w + 1].frame <= frame) w++;
  const mode = webcam[w]?.mode;
  const since = webcam[w] ? frame - webcam[w].frame : 0;
  const morph = msToFrames(450, fps);
  const hide = mode === 'full' ? Math.min(1, since / morph) : w > 0 && webcam[w - 1].mode === 'full' ? 1 - Math.min(1, since / morph) : 0;
  if (hide >= 1) return null;

  const total = Math.max(1, cur.total);
  const gap = 6;
  const barW = (TITLE_W - gap * (total - 1)) / total;
  return (
    <div style={{ position: 'absolute', left: BADGE.x, top: BADGE.y, width: BADGE.w, height: BADGE.h, opacity: 1 - hide }}>
      <div
        style={{
          position: 'absolute',
          inset: INSET,
          borderRadius: 22,
          background: 'rgba(38,36,33,0.94)',
          boxShadow: 'inset 0 0 0 1.5px rgba(75,73,71,0.95), 0 10px 20px rgba(0,0,0,0.39)',
        }}
      />
      <div style={{ position: 'absolute', left: PAD, right: PAD, top: 26, height: 16, display: 'flex', alignItems: 'center', gap: 10, opacity: textOpacity }}>
        <div style={{ width: 10, height: 10, borderRadius: 5, background: t.accent, flexShrink: 0 }} />
        <div style={{ font: `700 15px ${t.fonts.ui}`, letterSpacing: 2, color: t.accent, whiteSpace: 'nowrap' }}>{eyebrowOf(shown)}</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: PAD,
          right: PAD,
          top: 62,
          height: 41,
          display: 'flex',
          alignItems: 'center',
          font: `800 ${fitTitle(shown.title)}px ${t.fonts.ui}`,
          letterSpacing: '-0.01em',
          color: t.text,
          whiteSpace: 'nowrap',
          opacity: textOpacity,
        }}
      >
        {shown.title}
      </div>
      {Array.from({ length: total }, (_, k) => {
        const was = prev && k < prev.step ? 1 : 0;
        const now = k < cur.step ? 1 : 0;
        const fill = was + (now - was) * p;
        return (
          <div key={k} style={{ position: 'absolute', left: PAD + k * (barW + gap), top: 119, width: barW, height: 7, borderRadius: 4, overflow: 'hidden', background: 'rgba(79,77,75,0.95)' }}>
            <div style={{ width: `${fill * 100}%`, height: '100%', background: t.accent }} />
          </div>
        );
      })}
    </div>
  );
};
