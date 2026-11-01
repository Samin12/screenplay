import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { Transition } from '../types';
import { msToFrames, easeOut, easeIn } from '../lib/anim';
import { motion } from '../theme/tokens';

// Scene envelope. The default scene change is a blur dissolve through dark (0.33 s). Chapter
// boundaries hard-cut. `flash` brackets a palette break (e.g. a sponsor/community plug) with white.
// The Sequence that hosts a scene starts `overlap` frames early so dissolves can cross.

export const transitionOverlap = (t: Transition, fps: number) => (t === 'blur' || t === 'fade' ? msToFrames(motion.sceneBlur, fps) : 0);

export const SceneTransition: React.FC<{
  inT: Transition;
  outT: Transition;
  duration: number; // frames the scene owns (excluding the lead-in overlap)
  lead: number; // frames of overlap before the scene's own start
  children: React.ReactNode;
}> = ({ inT, outT, duration, lead, children }) => {
  const frame = useCurrentFrame() - lead; // 0 = scene start
  const { fps } = useVideoConfig();
  const inF = transitionOverlap(inT, fps);
  const outF = transitionOverlap(outT, fps);
  let opacity = 1;
  let blur = 0;
  if (inF > 0 && frame < 0) {
    const t = interpolate(frame, [-inF, 0], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut });
    opacity = t;
    blur = inT === 'blur' ? 16 * (1 - t) : 0;
  }
  if (outF > 0 && frame > duration - outF) {
    const t = interpolate(frame, [duration - outF, duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeIn });
    opacity = Math.min(opacity, 1 - t);
    blur = Math.max(blur, outT === 'blur' ? 16 * t : 0);
  }
  return (
    <AbsoluteFill style={{ opacity, filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

// White flash used around palette breaks: ramp to white, hold, fade out.
export const FlashOverlay: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const up = msToFrames(100, fps);
  const hold = msToFrames(100, fps);
  const down = msToFrames(170, fps);
  const o = interpolate(frame, [at - up, at, at + hold, at + hold + down], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: '#fff', opacity: o }} />;
};
