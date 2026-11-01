import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { CANVAS_BG, DRIFT_PX_PER_S, PANEL, PANEL_BG, PANEL_SCALE, PANEL_VIEW } from '../theme/panel';

// The panel look's surfaces: a dark canvas with a slowly drifting dot grid, and the rounded panel
// that holds every scene. The drift follows video time, so it never jumps at a cut.

const Dots: React.FC<{ off: number; color: string; pitch: number; dot: number }> = ({ off, color, pitch, dot }) => (
  <div
    style={{
      position: 'absolute',
      left: -pitch,
      top: -pitch,
      right: -pitch,
      bottom: -pitch,
      backgroundImage: `radial-gradient(circle, ${color} ${dot}px, rgba(0,0,0,0) ${dot + 0.8}px)`,
      backgroundSize: `${pitch}px ${pitch}px`,
      backgroundPosition: `${-pitch / 2}px ${-pitch / 2}px`,
      transform: `translate(${off % pitch}px, ${off % pitch}px)`,
    }}
  />
);

// The bare canvas, full frame, for chapter cards. `from`: the frame this layer starts at, so the dots
// stay in phase with the canvas behind it.
export const CanvasBackdrop: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: CANVAS_BG, overflow: 'hidden' }}>
      <Dots off={((frame + from) / fps) * DRIFT_PX_PER_S} color="rgb(70,70,70)" pitch={40} dot={2.1} />
    </AbsoluteFill>
  );
};

export const PanelFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const off = (frame / fps) * DRIFT_PX_PER_S;
  return (
    <AbsoluteFill style={{ background: CANVAS_BG, overflow: 'hidden' }}>
      <Dots off={off} color="rgb(70,70,70)" pitch={40} dot={2.1} />
      <div
        style={{
          position: 'absolute',
          left: PANEL.x,
          top: PANEL.y,
          width: PANEL.w,
          height: PANEL.h,
          borderRadius: PANEL.r,
          overflow: 'hidden',
          background: PANEL_BG,
          boxShadow: '0 20px 20px rgba(0,0,0,0.39)',
        }}
      >
        <Dots off={off * 0.8} color="rgb(42,42,40)" pitch={32} dot={2.1} />
        {children}
        {/* The hairline sits on top so plates that fill the panel keep its edge. */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: PANEL.r, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
      </div>
    </AbsoluteFill>
  );
};

// `fill` scenes draw in the panel's own aspect; fixed 1920x1080 designs scale in whole, centred.
export const PanelView: React.FC<{ fill: boolean; children: React.ReactNode }> = ({ fill, children }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: fill ? 0 : (PANEL.h - 1080 * PANEL_SCALE) / 2,
      width: fill ? PANEL_VIEW[0] : 1920,
      height: fill ? PANEL_VIEW[1] : 1080,
      transform: `scale(${fill ? PANEL.w / PANEL_VIEW[0] : PANEL_SCALE})`,
      transformOrigin: '0 0',
    }}
  >
    {children}
  </div>
);
