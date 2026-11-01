import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { Rect, Timeline, WebcamMode } from '../types';
import { easeInOut, msToFrames } from '../lib/anim';
import { motion } from '../theme/tokens';
import { TILE } from '../theme/panel';
import { trackedX } from '../lib/track';

// The talking head is ONE persistent layer above every scene. Scenes never draw the camera; they
// only ask for a mode, and this layer morphs between modes with the reference's blur-morph
// (blur up, move the box while blurred, blur down) so the head never jump-cuts between layouts.

type Box = { x: number; y: number; w: number; h: number; r: number; zoom: number; glow: number; opacity: number };

const BOXES: Record<Exclude<WebcamMode, 'hidden'>, Omit<Box, 'opacity'>> = {
  tile: { x: TILE.x, y: TILE.y, w: TILE.w, h: TILE.h, r: TILE.r, zoom: 1.0, glow: 0 },
  full: { x: 0, y: 0, w: 1920, h: 1080, r: 0, zoom: 1, glow: 0 },
  // zoom 1 = the source's own framing cover-cropped into the box (head and shoulders for a
  // normal talking-head shot); raise camera.zoom in edit.yaml for wide shots.
  pip: { x: 18, y: 636, w: 267, h: 414, r: 44, zoom: 1.0, glow: 0 },
  'pip-right': { x: 1920 - 18 - 267, y: 636, w: 267, h: 414, r: 44, zoom: 1.0, glow: 0 },
  'pip-square': { x: 32, y: 811, w: 237, h: 237, r: 60, zoom: 1.0, glow: 1 },
  hero: { x: 60, y: 130, w: 820, h: 820, r: 190, zoom: 1.0, glow: 0 },
  plug: { x: 18, y: 499, w: 355, h: 550, r: 50, zoom: 1.0, glow: 0 },
};

// Where the tile sits for a mode, so scenes can keep emphasis clear of it.
export const tileBox = (mode: WebcamMode | undefined): Rect | null => {
  if (mode !== 'pip' && mode !== 'pip-right' && mode !== 'pip-square' && mode !== 'plug') return null;
  const b = BOXES[mode];
  return { x: b.x, y: b.y, w: b.w, h: b.h };
};

const boxFor = (mode: WebcamMode, prev: WebcamMode | null): Box => {
  if (mode === 'hidden') {
    const base = BOXES[prev && prev !== 'hidden' ? prev : 'tile'];
    return { ...base, opacity: 0 };
  }
  return { ...BOXES[mode], opacity: 1 };
};

const mix = (a: Box, b: Box, t: number): Box => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
  r: a.r + (b.r - a.r) * t,
  zoom: a.zoom + (b.zoom - a.zoom) * t,
  glow: a.glow + (b.glow - a.glow) * t,
  opacity: a.opacity + (b.opacity - a.opacity) * t,
});

export const WebcamLayer: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { aroll, webcam, camera } = timeline;
  if (!aroll || webcam.length === 0) return null;

  // Find the active key and the previous one to morph from.
  let i = 0;
  while (i + 1 < webcam.length && webcam[i + 1].frame <= frame) i++;
  const cur = webcam[i];
  const prev = i > 0 ? webcam[i - 1] : null;
  const morphF = msToFrames(motion.webcamMorph, fps);
  const target = boxFor(cur.mode, prev?.mode ?? null);
  let box = target;
  let blur = 0;
  if (prev && frame < cur.frame + morphF) {
    const from = boxFor(prev.mode, i > 1 ? webcam[i - 2].mode : null);
    const local = frame - cur.frame;
    // Blur peaks in the first 30%, the box moves fast while blurred, then de-blurs.
    const moveT = interpolate(local, [morphF * 0.2, morphF * 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeInOut });
    box = mix(from, target, moveT);
    blur = interpolate(local, [0, morphF * 0.25, morphF * 0.6, morphF], [0, 18, 14, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    if (prev.mode === 'hidden' || cur.mode === 'hidden') {
      // Appear/disappear: a pure blur fade in place, no travel.
      box = { ...target, opacity: interpolate(local, [0, morphF * 0.6], [from.opacity, target.opacity], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) };
      if (cur.mode === 'hidden') box = { ...from, opacity: box.opacity };
    }
  }
  if (box.opacity <= 0.001) return null;

  // Jump-cut masking on full-frame: alternate a gentle punch-in on every A-roll cut.
  let punch = 1;
  if (cur.mode === 'full' || (prev && prev.mode === 'full' && frame < cur.frame + morphF)) {
    const cutsBefore = aroll.cuts.filter((c) => c <= frame).length;
    punch = cutsBefore % 2 === 1 ? 1.07 : 1;
  }

  // Cover-crop the 16:9 source into the box, keeping camera.focus at the box centre where possible.
  const srcAspect = width / height;
  const zoom = box.zoom * camera.zoom * punch;
  let vw = box.w * zoom;
  let vh = vw / srcAspect;
  if (vh < box.h * zoom) {
    vh = box.h * zoom;
    vw = vh * srcAspect;
  }
  const fy = camera.focus[1];
  const fx = camera.track ? trackedX(camera.track, frame, fps, aroll.cuts) : camera.focus[0];
  let left = box.w / 2 - fx * vw;
  let top = box.h / 2 - fy * vh;
  left = Math.min(0, Math.max(box.w - vw, left));
  top = Math.min(0, Math.max(box.h - vh, top));

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          borderRadius: box.r,
          overflow: 'hidden',
          opacity: box.opacity,
          filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
          boxShadow: box.glow > 0 ? `0 0 ${30 * box.glow}px rgba(236,236,234,${0.35 * box.glow})` : cur.mode === 'tile' ? '0 20px 20px rgba(0,0,0,0.39)' : undefined,
          background: '#000',
        }}
      >
        <OffthreadVideo
          src={staticFile(aroll.src)}
          muted
          style={{ position: 'absolute', left, top, width: vw, height: vh, transform: camera.mirror ? 'scaleX(-1)' : undefined }}
        />
      </div>
    </AbsoluteFill>
  );
};
