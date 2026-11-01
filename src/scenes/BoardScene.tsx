import React, { useMemo } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import type { BoardScene, Element } from '../types';
import { Vignette } from '../layers/Backgrounds';
import { ElementView } from '../stage/ElementView';
import { useTheme } from '../theme/ThemeContext';
import { easeInOut, progress } from '../lib/anim';
import { NODE_H, NODE_W, cameraAt, connector, cubicD, flights, leadIn, makePath, paramAt, placeNodes, pointAt, splitCubic, tailOut, type Path } from './board/geometry';
import { mix } from './chapter/Tile';

// Cold-open "world canvas" (reference 0:10–0:37). All nodes live on one large 2D board; a camera
// (x, y, scale) flies node to node, arriving on each node's `frame` with a zoom-out-pan-zoom-in arc,
// and drifts ~3 % between moves. Consecutive nodes are joined by dotted paths; with `line: true`
// a solid accent line grows along the path in step with the camera, ending in a dot head.
// Each node's element starts its own entrance when the camera arrives and then stays on the board
// (dimmed once the camera moves on), so wide mid-flight shots show where we came from.

const GRID_PITCH = 44; // world px
const DOT = 6; // dotted-path dot size, world px
const DOT_GAP = 30;
const LINE = 6;

const PathLine: React.FC<{ path: Path; p: number; color: string; tail: string; id: string; head: boolean }> = ({ path, p, color, tail, id, head }) => {
  if (p <= 0.001) return null;
  const part = p >= 0.999 ? path.c : splitCubic(path.c, paramAt(path, p));
  const end = p >= 0.999 ? path.c[3] : pointAt(path, p);
  const start = path.c[0];
  return (
    <g>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={start.x} y1={start.y} x2={end.x} y2={end.y}>
          <stop offset={0} stopColor={tail} />
          <stop offset={1} stopColor={color} />
        </linearGradient>
      </defs>
      <path d={cubicD(part)} fill="none" stroke={`url(#${id})`} strokeWidth={LINE} strokeLinecap="round" />
      {head ? (
        <>
          <circle cx={end.x} cy={end.y} r={17} fill={color} opacity={0.18} />
          <circle cx={end.x} cy={end.y} r={7.5} fill={color} />
        </>
      ) : null}
    </g>
  );
};

export const BoardSceneView: React.FC<{ scene: BoardScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = useTheme();
  const k = Math.min(width / 1920, height / 1080);
  const uid = scene.id.replace(/[^a-zA-Z0-9_-]/g, '_');

  const placed = useMemo(() => placeNodes(scene.nodes), [scene.nodes]);
  const fl = useMemo(() => flights(placed, fps), [placed, fps]);
  const links = useMemo(() => placed.slice(1).map((p, i) => makePath(connector(placed[i], p))), [placed]);
  const lead = useMemo(() => (placed.length ? makePath(leadIn(placed[0])) : null), [placed]);
  const tail = useMemo(() => (placed.length ? makePath(tailOut(placed[placed.length - 1])) : null), [placed]);

  const { cam, flight, e } = cameraAt(frame, placed, fl, fps, 1920);
  const S = cam.s * k;
  const tx = width / 2 - cam.x * S;
  const ty = height / 2 - cam.y * S;

  // Progress of each drawn segment: the lead-in grows into the first node, link j grows during the
  // flight into node j+1 (same easing as the camera, so line and camera read as one gesture).
  const first = placed[0];
  const leadP = first ? progress(frame, 0, Math.max(first.arrive, Math.round(0.6 * fps)), easeInOut) : 0;
  const linkP = links.map((_, j) => {
    const to = placed[j + 1];
    if (frame >= to.arrive) return 1;
    return flight && flight.to === j + 1 ? e : 0;
  });
  let headIdx = -1; // -1 = lead-in
  linkP.forEach((p, j) => {
    if (p > 0) headIdx = j;
  });

  // Focus: the node we are on is full strength; nodes we left dim as the camera flies away.
  let current = 0;
  placed.forEach((p, i) => {
    if (p.arrive <= frame) current = i;
  });
  const leaving = flight && flight.to === current + 1 ? e : 0;
  const nodeOpacity = (i: number) => (i < current ? 0.42 : i === current ? 1 - 0.58 * leaving : 1);

  const pitch = GRID_PITCH * S;
  const gx = ((tx % pitch) + pitch) % pitch;
  const gy = ((ty % pitch) + pitch) % pitch;
  const dotColor = mix(t.dotBright, t.text, 78);
  const gridColor = mix(t.dot, t.dotBright, 55);
  const lineTail = mix(t.accent, t.bgEdge, 62);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Vignette />
      {/* World-space dot grid: moves and scales with the camera. */}
      <AbsoluteFill>
        <svg width={width} height={height}>
          <defs>
            <pattern id={`sp-board-grid-${uid}`} width={pitch} height={pitch} patternUnits="userSpaceOnUse" x={gx} y={gy}>
              <circle cx={pitch / 2} cy={pitch / 2} r={Math.max(0.8, 1.7 * S)} fill={gridColor} />
            </pattern>
          </defs>
          <rect width={width} height={height} fill={`url(#sp-board-grid-${uid})`} />
        </svg>
      </AbsoluteFill>

      {/* The board. */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: '0 0', transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${S.toFixed(5)})` }}>
        <svg width={1} height={1} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          <defs>
            {tail ? (
              <linearGradient id={`sp-board-tail-${uid}`} gradientUnits="userSpaceOnUse" x1={tail.c[0].x} y1={tail.c[0].y} x2={tail.c[3].x} y2={tail.c[3].y}>
                <stop offset={0} stopColor={dotColor} stopOpacity={1} />
                <stop offset={1} stopColor={dotColor} stopOpacity={0} />
              </linearGradient>
            ) : null}
            {lead ? (
              <linearGradient id={`sp-board-leadfade-${uid}`} gradientUnits="userSpaceOnUse" x1={lead.c[0].x} y1={lead.c[0].y} x2={lead.c[3].x} y2={lead.c[3].y}>
                <stop offset={0} stopColor={dotColor} stopOpacity={0} />
                <stop offset={0.5} stopColor={dotColor} stopOpacity={1} />
              </linearGradient>
            ) : null}
          </defs>
          {/* Dotted paths (the whole route is laid out from the start). */}
          {lead ? <path d={cubicD(lead.c)} fill="none" stroke={`url(#sp-board-leadfade-${uid})`} strokeWidth={DOT} strokeLinecap="round" strokeDasharray={`0 ${DOT_GAP}`} /> : null}
          {links.map((p, j) => (
            <path key={j} d={cubicD(p.c)} fill="none" stroke={dotColor} strokeWidth={DOT} strokeLinecap="round" strokeDasharray={`0 ${DOT_GAP}`} />
          ))}
          {tail ? <path d={cubicD(tail.c)} fill="none" stroke={`url(#sp-board-tail-${uid})`} strokeWidth={DOT} strokeLinecap="round" strokeDasharray={`0 ${DOT_GAP}`} /> : null}
          {/* Junction dots where the route meets each node; they turn accent once the line reaches them. */}
          {lead ? <circle cx={lead.c[3].x} cy={lead.c[3].y} r={6.5} fill={scene.line && leadP >= 1 ? t.accent : dotColor} /> : null}
          {links.flatMap((p, j) => [
            <circle key={`a${j}`} cx={p.c[0].x} cy={p.c[0].y} r={6.5} fill={scene.line && linkP[j] > 0 ? t.accent : dotColor} />,
            <circle key={`b${j}`} cx={p.c[3].x} cy={p.c[3].y} r={6.5} fill={scene.line && linkP[j] >= 1 ? t.accent : dotColor} />,
          ])}
          {/* Progress line. */}
          {scene.line && lead ? <PathLine path={lead} p={leadP} color={t.accent} tail={lineTail} id={`sp-board-l-${uid}`} head={headIdx === -1} /> : null}
          {scene.line
            ? links.map((p, j) => <PathLine key={j} path={p} p={linkP[j]} color={t.accent} tail={lineTail} id={`sp-board-p${j}-${uid}`} head={headIdx === j} />)
            : null}
        </svg>

        {placed.map((p) => {
          const el = p.node.element;
          // The compiler sets element.frame = node.frame. If an element was anchored earlier, delay it
          // so its entrance (and every item inside it) still plays when the camera lands.
          const shift = Math.max(0, Math.round(p.arrive - el.frame));
          const sticky = { ...el, end: Math.max(el.end, scene.duration + fps) } as Element;
          return (
            <div
              key={p.node.id || p.i}
              style={{ position: 'absolute', left: p.cx - NODE_W / 2, top: p.cy - NODE_H / 2, width: NODE_W, height: NODE_H, opacity: nodeOpacity(p.i) }}
            >
              <Sequence from={shift} layout="none" name={`node:${p.node.id}`}>
                <ElementView el={sticky} box={{ x: 0, y: 0, w: NODE_W, h: NODE_H }} />
              </Sequence>
            </div>
          );
        })}
      </div>

      {/* Screen-space edge falloff, like a lens vignette over the board. */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, ${t.bgEdge} 100%)`, opacity: 0.6, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
