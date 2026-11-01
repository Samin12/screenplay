import React, { useMemo } from 'react';
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Action, AppScene, Rect, WebcamMode } from '../types';
import { replicas } from '../replicas';
import { PlateSizeProvider, type ReplicaDef, type UiState } from './replica';
import { useMeasuredTargets } from './Measure';
import { boundaryIndex, cameraAt, cursorAt, measureState, rectFor, screenTransform, stateAt, stateBoundaries, uiAt, type Rects } from './logic';
import { Callout, ClickRing, Cursor, Mark, Scrim, Tooltip, fadeWindow } from './Overlays';
import { easeInOut, msToFrames, progress, blurInOut } from '../lib/anim';
import { motion } from '../theme/tokens';
import { useLook, useTheme } from '../theme/ThemeContext';
import { ElementView } from '../stage/ElementView';
import { Vignette } from '../layers/Backgrounds';
import { tileBox } from '../layers/Webcam';

// The "screen recording" that is not a recording: a replica (or a real screenshot/recording plate)
// framed by a virtual camera, with a scripted cursor and the reference's emphasis vocabulary.

type PlateAdapter = {
  size: [number, number];
  tone: 'dark' | 'light';
  render: (state: Record<string, unknown>, ui: UiState) => React.ReactNode;
};

// `view` is the area the scene draws in: the whole frame, or the panel's viewport in the panel look.
export const AppSceneView: React.FC<{ scene: AppScene; webcam?: WebcamMode; view?: [number, number] }> = ({ scene, webcam, view }) => {
  if (scene.plate.type === 'replica') {
    const def = replicas[scene.plate.app];
    if (!def) return <Missing text={`Unknown replica "${scene.plate.app}". Known: ${Object.keys(replicas).join(', ')}`} />;
    return <ReplicaPlate scene={scene} def={def} webcam={webcam} view={view} />;
  }
  return <MediaPlate scene={scene} webcam={webcam} view={view} />;
};

const ReplicaPlate: React.FC<{ scene: AppScene; def: ReplicaDef; webcam?: WebcamMode; view?: [number, number] }> = ({ scene, def, webcam, view }) => {
  const plate = scene.plate as Extract<AppScene['plate'], { type: 'replica' }>;
  const data = useMemo(() => ({ ...def.defaults.data, ...plate.data }), [def, plate.data]);
  const base = def.defaults.state;
  const bounds = useMemo(() => stateBoundaries(scene), [scene]);
  const states = useMemo(() => bounds.map((_, i) => measureState(scene, base, bounds, i)), [scene, base, bounds]);
  const size = view ? (def.panelSize ?? view) : def.size;
  const { rects, measurer } = useMeasuredTargets(def, data, states, size);
  const Comp = def.component;
  const adapter: PlateAdapter = {
    size,
    tone: def.tone,
    render: (state, ui) => (
      <PlateSizeProvider value={size}>
        <Comp data={data} state={state} ui={ui} />
      </PlateSizeProvider>
    ),
  };
  return (
    <AbsoluteFill>
      {measurer}
      {rects ? <Stage scene={scene} adapter={adapter} rects={rects} bounds={bounds} base={base} webcam={webcam} view={view} /> : null}
    </AbsoluteFill>
  );
};

const MediaPlate: React.FC<{ scene: AppScene; webcam?: WebcamMode; view?: [number, number] }> = ({ scene, webcam, view }) => {
  const plate = scene.plate as Exclude<AppScene['plate'], { type: 'replica' }>;
  const adapter: PlateAdapter = {
    size: plate.size,
    tone: plate.tone ?? 'dark',
    render: () =>
      plate.type === 'image' ? (
        <Img src={staticFile(plate.src)} style={{ width: plate.size[0], height: plate.size[1] }} />
      ) : (
        <OffthreadVideo src={staticFile(plate.src)} startFrom={plate.startFrom} muted style={{ width: plate.size[0], height: plate.size[1] }} />
      ),
  };
  return <Stage scene={scene} adapter={adapter} rects={[plate.targets]} bounds={[0]} base={{}} webcam={webcam} view={view} />;
};

type LiftBox = { key: string; src: Rect; cur: Rect; p: number; plateRect: Rect; label?: string; labelStart?: number };

const Stage: React.FC<{ scene: AppScene; adapter: PlateAdapter; rects: Rects[]; bounds: number[]; base: Record<string, unknown>; webcam?: WebcamMode; view?: [number, number] }> = ({
  scene,
  adapter,
  rects,
  bounds,
  base,
  webcam,
  view,
}) => {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  const { fps } = config;
  const [width, height] = view ?? [config.width, config.height];
  const theme = useTheme();
  const panelLook = useLook() === 'panel';
  const lookup = (f: number, t: string) => rectFor(rects, bounds, f, t);

  const cam = cameraAt(scene, adapter.size, lookup, frame, fps, [width, height]);
  const tf = screenTransform(cam, adapter.size, [width, height]);
  const cursor = cursorAt(scene, lookup, frame, fps, adapter.size);
  const ui = uiAt(scene, cursor, frame, fps);
  const state = stateAt(scene, base, frame);
  const liftF = msToFrames(motion.lift, fps);

  // ---- lifts (exploded clones) ----
  const lifts: LiftBox[] = [];
  const spot: { rect: Rect; f: number }[] = [];
  const addLift = (key: string, target: string, start: number, end: number, scale?: number, to?: [number, number], dest?: Rect, label?: string, delay = 0) => {
    const r = lookup(start, target);
    if (!r) return;
    const src = tf.rectToScreen(r);
    const pin = progress(frame, start + delay, liftF, easeInOut);
    const pout = end < scene.duration ? progress(frame, end, liftF, easeInOut) : 0;
    const p = pin * (1 - pout);
    if (p <= 0) return;
    let d = dest;
    if (!d) {
      const auto = Math.max(1.3, Math.min(3.2, Math.min((0.78 * width) / src.w, (0.5 * height) / src.h)));
      // Never let the clone outgrow the frame (very wide targets would otherwise overflow at 1.3x).
      const m = Math.min(scale ?? auto, (0.92 * width) / src.w, (0.84 * height) / src.h);
      if (!scale && m < 1.15) {
        // Too big to enlarge (e.g. a full-width composer): spotlight it in place instead.
        spot.push({ rect: src, f: fadeWindow(frame, start + delay, end, fps, motion.lift, motion.lift) });
        return;
      }
      const w = src.w * m;
      const h = src.h * m;
      const c = to ? { x: to[0], y: to[1] } : { x: src.x + src.w / 2 + (width / 2 - (src.x + src.w / 2)) * 0.65, y: src.y + src.h / 2 + (height / 2 - (src.y + src.h / 2)) * 0.65 };
      let x = Math.min(width - 60 - w, Math.max(60, c.x - w / 2));
      let y = Math.min(height - 60 - h, Math.max(60, c.y - h / 2));
      let dw = w;
      let dh = h;
      // Keep clear of the webcam tile, which always draws on top: move above it if that fits,
      // otherwise beside it, shrinking only if the free width demands it.
      const tile = tileBox(webcam);
      if (tile && x < tile.x + tile.w + 24 && x + dw > tile.x - 24 && y + dh > tile.y - 24) {
        const above = tile.y - 24 - dh;
        if (above >= 40) y = above;
        else if (tile.x > width / 2) {
          const room = tile.x - 24 - 60;
          if (dw > room) { dh *= room / dw; dw = room; }
          x = tile.x - 24 - dw;
        } else {
          const room = width - 60 - (tile.x + tile.w + 24);
          if (dw > room) { dh *= room / dw; dw = room; }
          x = tile.x + tile.w + 24;
        }
      }
      d = { x, y, w: dw, h: dh };
    }
    const cur = { x: src.x + (d.x - src.x) * p, y: src.y + (d.y - src.y) * p, w: src.w + (d.w - src.w) * p, h: src.h + (d.h - src.h) * p };
    lifts.push({ key, src, cur, p, plateRect: r, label, labelStart: start + delay + liftF });
  };

  let scrim = 0;
  let hole: Rect | null = null;
  const overlays: React.ReactNode[] = [];

  scene.actions.forEach((a: Action, i) => {
    const k = `a${i}`;
    if (a.do === 'lift') {
      addLift(k, a.target, a.frame, a.end, a.scale, a.to);
      scrim = Math.max(scrim, 0.62 * fadeWindow(frame, a.frame, a.end, fps, motion.lift, motion.lift));
    }
    if (a.do === 'type' && a.lift && a.target) {
      const start = a.frame - msToFrames(300, fps);
      const end = a.end + Math.round(1.2 * fps);
      addLift(k, a.target, start, end, undefined, [width / 2, height * 0.5]);
      scrim = Math.max(scrim, 0.62 * fadeWindow(frame, start, end, fps, motion.lift, motion.lift));
    }
    if (a.do === 'explode') {
      const srcs = a.targets.map((t) => lookup(a.frame, t)).filter(Boolean) as Rect[];
      const screen = srcs.map((r) => tf.rectToScreen(r));
      const gap = 44;
      const totalW = screen.reduce((s, r) => s + r.w, 0);
      const maxH = Math.max(...screen.map((r) => r.h));
      const m = Math.min(1.6, (0.9 * width - gap * (screen.length - 1)) / totalW, (0.58 * height) / maxH);
      let x = (width - (totalW * m + gap * (screen.length - 1))) / 2;
      a.targets.forEach((t, j) => {
        const r = screen[j];
        if (!r) return;
        const dest = { x, y: height * 0.56 - (r.h * m) / 2, w: r.w * m, h: r.h * m };
        x += r.w * m + gap;
        addLift(`${k}-${j}`, t, a.frame, a.end, undefined, undefined, dest, a.labels[j], j * msToFrames(motion.stagger, fps));
      });
      scrim = Math.max(scrim, 0.7 * fadeWindow(frame, a.frame, a.end, fps, motion.lift, motion.lift));
    }
    if (a.do === 'focus') {
      const r = lookup(a.frame, a.target);
      const f = fadeWindow(frame, a.frame, a.end, fps);
      if (r && f > 0) {
        scrim = Math.max(scrim, 0.62 * f);
        hole = tf.rectToScreen(r);
      }
    }
    if (a.do === 'callout') {
      const r = lookup(a.frame, a.target);
      if (!r) return;
      const sr = tf.rectToScreen(r);
      if (a.dim) {
        const f = fadeWindow(frame, a.frame, a.end, fps, 120, 200);
        if (f > 0) {
          scrim = Math.max(scrim, 0.5 * f);
          hole = sr;
        }
      }
      overlays.push(<Callout key={k} rect={sr} side={a.side} text={a.text} sub={a.sub} frame={frame} start={a.frame} end={a.end} fps={fps} backing={adapter.tone === 'light'} />);
    }
    if (a.do === 'mark') {
      const r = lookup(a.frame, a.target);
      if (r) overlays.push(<Mark key={k} rect={tf.rectToScreen(r)} style={a.style} frame={frame} start={a.frame} end={a.end} fps={fps} tone={adapter.tone} />);
    }
    if (a.do === 'title' || a.do === 'show') {
      const f = fadeWindow(frame, a.frame, a.end, fps);
      scrim = Math.max(scrim, 0.72 * f);
      if (f > 0) {
        const el = a.do === 'title' ? ({ type: 'title', frame: a.frame, end: a.end, text: a.text, sub: a.sub, size: 'l' } as const) : a.element;
        overlays.push(
          <AbsoluteFill key={k} style={{ zIndex: 5 }}>
            <ElementView el={el} box={view ? { x: 60, y: 60, w: width - 120, h: height - 120 } : { x: 160, y: 120, w: width - 320, h: height - 240 }} />
          </AbsoluteFill>,
        );
      }
    }
  });

  for (const sp of spot) if (sp.f > 0) hole = sp.rect;

  // Cursor: plate point -> screen, through a lift if the point is inside a lifted element.
  let cursorScreen = tf.toScreen(cursor.p);
  let cursorScale = tf.S;
  for (const L of lifts) {
    const r = L.plateRect;
    if (cursor.p.x >= r.x && cursor.p.x <= r.x + r.w && cursor.p.y >= r.y && cursor.p.y <= r.y + r.h) {
      const k = L.cur.w / r.w;
      cursorScreen = { x: L.cur.x + (cursor.p.x - r.x) * k, y: L.cur.y + (cursor.p.y - r.y) * k };
      cursorScale = k;
    }
  }

  const tooltipRect = cursor.tooltip ? lookup(frame, cursor.tooltip.target) : undefined;
  const ringRect = cursor.clickRing ? lookup(frame, cursor.clickRing.target) : undefined;
  const plateBg = adapter.tone === 'dark' ? '#0a0a0a' : '#f4f4f2';
  // A plate that doesn't fill the panel (a 16:9 recording) sits on it as a framed card.
  const fit = Math.min(width / adapter.size[0], height / adapter.size[1]);
  const framed = panelLook && (adapter.size[0] * fit < width - 1 || adapter.size[1] * fit < height - 1);

  return (
    <AbsoluteFill style={{ background: panelLook ? undefined : theme.bgEdge, overflow: 'hidden' }}>
      <Vignette />
      {/* the plate, framed by the camera */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: adapter.size[0],
          height: adapter.size[1],
          transformOrigin: '0 0',
          transform: `translate(${tf.tx}px, ${tf.ty}px) scale(${tf.S})`,
          background: plateBg,
          ...(framed ? { borderRadius: 22 / tf.S, overflow: 'hidden', boxShadow: `0 ${30 / tf.S}px ${70 / tf.S}px rgba(0,0,0,0.55)` } : {}),
        }}
      >
        {adapter.render(state, ui)}
      </div>
      <Scrim opacity={scrim} hole={lifts.length ? null : hole} width={width} height={height} />
      {/* live clones of lifted elements */}
      {lifts.map((L) => {
        const k = L.cur.w / L.plateRect.w;
        const flight = Math.sin(Math.PI * Math.min(1, Math.max(0, L.p))) * (L.p < 1 ? 5 : 0);
        return (
          <React.Fragment key={L.key}>
            <div
              style={{
                position: 'absolute',
                left: L.cur.x,
                top: L.cur.y,
                width: L.cur.w,
                height: L.cur.h,
                overflow: 'hidden',
                borderRadius: 14 * Math.max(1, k / tf.S),
                boxShadow: `0 ${20 * L.p}px ${60 * L.p}px rgba(0,0,0,${0.6 * L.p})`,
                outline: `1px solid rgba(255,255,255,${0.08 * L.p})`,
                filter: flight > 0.2 ? `blur(${flight.toFixed(2)}px)` : undefined,
                background: plateBg,
              }}
            >
              <div style={{ position: 'absolute', left: -L.plateRect.x * k, top: -L.plateRect.y * k, width: adapter.size[0], height: adapter.size[1], transformOrigin: '0 0', transform: `scale(${k})` }}>
                {adapter.render(state, ui)}
              </div>
            </div>
            {L.label && L.labelStart !== undefined ? (
              <div
                style={{
                  position: 'absolute',
                  left: L.cur.x + L.cur.w / 2,
                  top: L.cur.y - 28,
                  transform: 'translate(-50%, -100%)',
                  color: '#fff',
                  font: `700 44px ${theme.fonts.display}`,
                  whiteSpace: 'nowrap',
                  textShadow: '0 2px 18px rgba(0,0,0,0.85)',
                  ...blurInOut(frame, fps, L.labelStart, undefined),
                }}
              >
                {L.label}
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
      {overlays}
      {tooltipRect && cursor.tooltip ? <Tooltip rect={tf.rectToScreen(tooltipRect)} text={cursor.tooltip.text} frame={frame} since={cursor.tooltip.since} fps={fps} /> : null}
      {ringRect && cursor.clickRing ? <ClickRing rect={tf.rectToScreen(ringRect)} age={cursor.clickRing.age} fps={fps} /> : null}
      {cursor.visible ? <Cursor x={cursorScreen.x} y={cursorScreen.y} scale={cursorScale} pressed={!!cursor.pressed} /> : null}
    </AbsoluteFill>
  );
};

const Missing: React.FC<{ text: string }> = ({ text }) => (
  <AbsoluteFill style={{ background: '#300', color: '#fff', font: '600 36px Inter', padding: 80 }}>{text}</AbsoluteFill>
);

export const _debug = { boundaryIndex };
