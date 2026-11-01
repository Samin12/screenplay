import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ChapterInfo, ChapterScene } from '../types';
import { Vignette, DotGrid } from '../layers/Backgrounds';
import { useLook, useTheme } from '../theme/ThemeContext';
import { Logo } from '../ui/Logo';
import { RichText } from '../ui/RichText';
import { blurInOut, easeIn, easeInOut, easeOut, msToFrames, progress, rand } from '../lib/anim';
import { DESIGN_H, DESIGN_W, gridLayout, splitHeading } from './chapter/layout';
import { FeatureFace, NumberFace } from './chapter/Tile';

// ChapterGrid card (≈3.4 s, scene frame 0 = chapter start). Reference: "11 [✱] Features" over a
// 5+5+1 grid of floating 3D tiles. Earlier chapters show their (dim) feature faces, later ones a
// serif numeral; the current tile Y-flips ≈0.45 s in and lands lit (accent border, glow, ~1.06x).
//   Entrance: hard cut onto a blurred grid that sharpens in ~0.3 s; on the very first chapter the
//   tiles drop in one by one (85 ms stagger) instead. A blur/fade scene transition replaces the
//   built-in entrance, and a `cut` out gets a short blur-out so the hard cut reads soft.

const TITLE_Y = 151; // ≈14 % H
const TITLE_PX = 108;
const LOGO_PX = 84;
const PERSPECTIVE = 1500;
const VANISH_Y = 497; // ≈46 % H

export const ChapterSceneView: React.FC<{ scene: ChapterScene; chapters: ChapterInfo[]; heading: string; logo: boolean }> = ({ scene, chapters, heading, logo }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = useTheme();
  const panelLook = useLook() === 'panel';
  const k = Math.min(width / DESIGN_W, height / DESIGN_H);
  const n = Math.max(chapters.length, scene.index + 1);
  const { tiles } = gridLayout(n);
  const groupBottom = Math.max(...tiles.map((b) => b.y + b.h));
  const centre = panelLook ? (DESIGN_H - (TITLE_Y - TITLE_PX * 0.6 + groupBottom)) / 2 : 0;
  const active = scene.index;
  const first = scene.index === 0;

  // First chapter: tiles drop in one by one (≤85 ms stagger, all down within ~0.8 s), and the flip
  // waits for the last one. Later chapters flip ≈0.45 s in.
  const stagger = Math.min(0.085, 0.6 / Math.max(1, n - 1));
  const dropAt = (i: number) => (0.06 + i * stagger) * fps;
  // Flip of the current tile, then the lit landing.
  const flipStart = Math.round((first ? Math.max(0.45, 0.06 + (n - 1) * stagger + 0.12) : 0.45) * fps);
  const flipDur = msToFrames(280, fps);
  const land = flipStart + flipDur;
  const flipP = progress(frame, flipStart, flipDur, easeInOut);
  const lift = frame < land ? 1 + 0.085 * flipP : 1.085 - 0.025 * progress(frame, land, msToFrames(240, fps), easeInOut);
  const glow = progress(frame, land - 2, msToFrames(170, fps), easeOut);
  const dim = progress(frame, land, msToFrames(300, fps), easeInOut);

  // Card envelope.
  const cutIn = scene.transitionIn === 'cut' || scene.transitionIn === 'flash';
  const enterP = !first && cutIn ? progress(frame, 0, msToFrames(300, fps), easeOut) : 1;
  const exitF = msToFrames(270, fps);
  const exitP = scene.transitionOut === 'cut' ? progress(frame, scene.duration - exitF, exitF, easeIn) : 0;
  const blur = 22 * (1 - enterP) + 20 * exitP;
  const opacity = (0.35 + 0.65 * enterP) * (1 - 0.4 * exitP);
  const scale = 1 + 0.03 * (1 - enterP);

  const { num, rest } = splitHeading(heading);
  const titleParts: React.ReactNode[] = [];
  if (num) titleParts.push(<span key="n">{num}</span>);
  if (logo) titleParts.push(<Logo key="l" name="claude" size={LOGO_PX} />);
  if (rest) titleParts.push(<RichText key="r" text={rest} />);

  const order = tiles.map((_, i) => i).sort((a, b) => (a === active ? 1 : 0) - (b === active ? 1 : 0));

  return (
    <AbsoluteFill>
      <Vignette />
      {panelLook ? null : (
        <AbsoluteFill style={{ opacity: 0.55 }}>
          <DotGrid />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ opacity, filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: DESIGN_W,
            height: DESIGN_H,
            transformOrigin: '0 0',
            transform: `translate(${width / 2}px, ${height / 2 + centre}px) scale(${(k * scale).toFixed(4)}) translate(${-DESIGN_W / 2}px, ${-DESIGN_H / 2}px)`,
          }}
        >
          {/* Title */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              width: DESIGN_W,
              top: TITLE_Y - TITLE_PX * 0.6,
              height: TITLE_PX * 1.2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 32,
              fontFamily: t.fonts.display,
              fontWeight: 800,
              fontSize: TITLE_PX,
              lineHeight: 1,
              letterSpacing: '-0.01em',
              color: t.text,
            }}
          >
            {titleParts.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', ...(first ? blurInOut(frame, fps, Math.round(i * 0.06 * fps), undefined, { inMs: 220 }) : {}) }}>
                {p}
              </div>
            ))}
          </div>

          {/* Tiles. Every tile carries the same light perspective (vanishing point at the frame
              centre), so the grid keystones outward like the reference while each tile stays its
              own layer (drop-in blur/opacity don't flatten the flip). */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {order.map((i) => {
              const b = tiles[i];
              const isActive = i === active;
              const isDone = i < active;
              // Each tile floats with its own small tilt.
              const rx0 = 6.5 + (rand(i * 7 + 3) * 2 - 1) * 2.2;
              const ry0 = (rand(i * 13 + 5) * 2 - 1) * 3.4;
              let rx = isActive ? rx0 * (1 - flipP) : rx0;
              let ry = isActive ? ry0 * (1 - flipP) : ry0;
              let ty = 0;
              let o = 1;
              let tb = 0;
              if (first) {
                const dp = progress(frame, dropAt(i), 0.2 * fps, easeOut);
                ty = -b.h * 0.45 * (1 - dp);
                rx += 48 * (1 - dp);
                tb = 10 * (1 - dp);
                o = Math.min(1, dp * 1.6);
              }
              const angle = isActive ? 180 * flipP : 0;
              const s = isActive ? lift : 1;
              const feature = <FeatureFace n={i + 1} info={chapters[i]} w={b.w} h={b.h} active={isActive} glow={isActive ? glow : 0} dim={first ? 1 : dim} />;
              const number = <NumberFace n={i + 1} w={b.w} h={b.h} />;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: b.x,
                    top: b.y,
                    width: b.w,
                    height: b.h,
                    zIndex: isActive ? 10 : 1,
                    opacity: o,
                    filter: tb > 0.05 ? `blur(${tb.toFixed(2)}px)` : undefined,
                    perspective: PERSPECTIVE,
                    perspectiveOrigin: `${(DESIGN_W / 2 - b.x).toFixed(1)}px ${(VANISH_Y - b.y).toFixed(1)}px`,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      transformStyle: isActive ? 'preserve-3d' : undefined,
                      transform: `translateY(${ty.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${(ry - angle).toFixed(3)}deg) scale(${s.toFixed(4)})`,
                    }}
                  >
                    {isActive ? (
                      // A real two-sided card: the browser shows whichever face points at the viewer.
                      <>
                        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}>{number}</div>
                        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>{feature}</div>
                      </>
                    ) : isDone ? (
                      feature
                    ) : (
                      number
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
