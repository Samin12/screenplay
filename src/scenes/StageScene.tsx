import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import type { Element, Rect, StageScene, TalkingScene } from '../types';
import { StageBackground } from '../layers/Backgrounds';
import { ElementView } from '../stage/ElementView';
import { useTheme } from '../theme/ThemeContext';
import { useCurrentFrame } from 'remotion';
import { fadeWindow } from '../app/Overlays';

// Elements whose lifetimes overlap share the column: each overlapping cluster is split into rows,
// fixed for the whole cluster so nothing jumps when a second element arrives.
export function layoutElements(elements: Element[], column: Rect, pad = 0.4 * 30): { el: Element; box: Rect }[] {
  const sorted = [...elements].sort((a, b) => a.frame - b.frame);
  const clusters: Element[][] = [];
  let clusterEnd = -Infinity;
  for (const el of sorted) {
    if (clusters.length && el.frame <= clusterEnd + pad) {
      clusters[clusters.length - 1].push(el);
      clusterEnd = Math.max(clusterEnd, el.end);
    } else {
      clusters.push([el]);
      clusterEnd = el.end;
    }
  }
  const out: { el: Element; box: Rect }[] = [];
  for (const c of clusters) {
    // Only split rows among elements that are live at the same time.
    const rows: Element[][] = [];
    for (const el of c) {
      const row = rows.find((r) => r.every((o) => o.end + pad <= el.frame || el.end + pad <= o.frame));
      if (row) row.push(el);
      else rows.push([el]);
    }
    const gap = 30;
    const h = (column.h - gap * (rows.length - 1)) / rows.length;
    rows.forEach((row, i) => row.forEach((el) => out.push({ el, box: { x: column.x, y: column.y + i * (h + gap), w: column.w, h } })));
  }
  return out;
}

// `view` is the panel's viewport in the panel look. There a headline is smaller, and on its own it
// sits in the middle of the panel.
export const StageSceneView: React.FC<{ scene: StageScene; view?: [number, number] }> = ({ scene, view }) => {
  const config = useVideoConfig();
  const [width, height] = view ?? [config.width, config.height];
  const hero = scene.layout === 'hero-left';
  const col: Rect = view ? { x: 60, y: scene.title && scene.elements.length ? 130 : 60, w: width - 120, h: height - (scene.title && scene.elements.length ? 260 : 120) } : hero ? { x: 940, y: 90, w: 930, h: 900 } : { x: 140, y: 90, w: width - 280, h: height - 180 };
  const headH = view ? 150 : 210;
  const titleBox: Rect = view && scene.elements.length === 0 ? col : { ...col, h: headH };
  const body: Rect = scene.title ? { x: col.x, y: col.y + headH + 20, w: col.w, h: col.h - headH - 20 } : col;
  return (
    <AbsoluteFill>
      <StageBackground />
      {scene.title ? (
        <ElementView el={{ type: 'title', frame: scene.title.frame, end: scene.title.end, text: scene.title.text, sub: scene.title.sub, size: view && scene.elements.length ? 'm' : 'l' }} box={titleBox} />
      ) : null}
      {layoutElements(scene.elements, body).map(({ el, box }, i) => (
        <ElementView key={i} el={el} box={box} />
      ))}
    </AbsoluteFill>
  );
};

// Overlays drawn ABOVE the full-frame talking head (titles, icon lists, lower thirds).
// In the panel look the same elements draw in the panel's `view`, with no dim (the head isn't behind them).
export const TalkingOverlay: React.FC<{ scene: TalkingScene; view?: [number, number] }> = ({ scene, view }) => {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  const { fps } = config;
  const [width, height] = view ?? [config.width, config.height];
  const t = useTheme();
  const dim = view ? 0 : scene.elements.reduce((m, el) => (el.type === 'lower' ? m : Math.max(m, fadeWindow(frame, el.frame, el.end, fps))), 0) * scene.dim;
  return (
    <AbsoluteFill>
      {dim > 0 ? <AbsoluteFill style={{ background: t.bgEdge, opacity: dim }} /> : null}
      {layoutElements(
        scene.elements.filter((e) => e.type !== 'lower'),
        view ? { x: 60, y: 60, w: width - 120, h: height - 120 } : { x: 160, y: 120, w: width - 320, h: height - 240 },
      ).map(({ el, box }, i) => (
        <ElementView key={i} el={el} box={box} />
      ))}
      {scene.elements
        .filter((e) => e.type === 'lower')
        .map((el, i) => (
          <ElementView key={`l${i}`} el={el} box={{ x: 80, y: height - 300, w: 900, h: 220 }} />
        ))}
    </AbsoluteFill>
  );
};
