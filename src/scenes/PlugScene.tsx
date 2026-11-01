import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { PlugScene } from '../types';
import { easeInOut } from '../lib/anim';
import { useLook } from '../theme/ThemeContext';

// Palette break for a sponsor / community plug: cream canvas, real pages in a window frame, plain
// cuts on sentence starts, one programmatic scroll allowed. No callouts, no cursor (reference).
export const PlugSceneView: React.FC<{ scene: PlugScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let idx = 0;
  scene.media.forEach((m, i) => {
    if (m.frame <= frame) idx = i;
  });
  const m = scene.media[idx];
  const panelLook = useLook() === 'panel';
  const win = panelLook ? { x: 120, y: 30, w: 1680, h: 1020 } : { x: 420, y: 44, w: 1456, h: 992 };
  let ty = 0;
  if (m?.scroll) {
    ty = -interpolate(frame, [m.scroll.start, m.scroll.end], [m.scroll.from, m.scroll.to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeInOut });
  }
  return (
    <AbsoluteFill style={{ background: panelLook ? undefined : '#fefcf8' }}>
      {m ? (
        <div style={{ position: 'absolute', left: win.x, top: win.y, width: win.w, height: win.h, borderRadius: 18, overflow: 'hidden', boxShadow: '0 20px 60px rgba(40,30,20,0.18)', border: '1px solid #e7e2d8', background: '#fff' }}>
          <div style={{ height: 44, background: '#f3f1ec', borderBottom: '1px solid #e7e2d8', display: 'flex', alignItems: 'center', gap: 9, paddingLeft: 18 }}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
              <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
            ))}
          </div>
          <div style={{ position: 'absolute', top: 44, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
            <div style={{ transform: `translateY(${ty}px)` }}>
              {m.type === 'image' ? <Img src={staticFile(m.src)} style={{ width: '100%', display: 'block' }} /> : <OffthreadVideo src={staticFile(m.src)} muted style={{ width: '100%' }} />}
            </div>
          </div>
        </div>
      ) : null}
      {void fps}
    </AbsoluteFill>
  );
};
