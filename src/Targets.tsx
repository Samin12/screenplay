import React, { useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Composition, Img, continueRender, delayRender, staticFile } from 'remotion';
import { replicas } from './replicas';
import { PlateSizeProvider } from './app/replica';
import type { Rect } from './types';
import { ThemeProvider } from './theme/ThemeContext';
import './theme/fonts';

// Tool compositions used by the CLI (never part of the video):
//   Targets  `screenplay targets`: a replica (or a screen plate) with every [data-target] outlined and
//            named, so the editing agent can see the names it may point at. With {manifest: true}
//            its calculateMetadata also returns the replica manifest (ids, targets, state docs).
//   Sheet    `screenplay sheet`: a contact sheet of rendered thumbnails with burned-in labels.

// ---------------------------------------------------------------- Targets

export type TargetsProps = {
  app?: string;
  data?: Record<string, unknown>;
  state?: Record<string, unknown>;
  screen?: { src: string; size: [number, number]; targets: Record<string, Rect> };
  caption?: string;
  manifest?: unknown;
  plate?: [number, number]; // the plate the look draws replicas on; default the replica's design size
};

const W = 1920;
const H = 1080;
const HEADER = 70;
const MARGIN = 24;
const COLORS = ['#ff6b35', '#3ec1ff', '#7cf07c', '#ffd23f', '#ff5cc8', '#b18cff', '#4ff0d0', '#ff9f9f'];

type Box = { name: string; r: Rect; dup: number };

const fit = (size: [number, number]) => {
  const k = Math.min((W - 2 * MARGIN) / size[0], (H - HEADER - 2 * MARGIN) / size[1]);
  return { k, x: (W - size[0] * k) / 2, y: HEADER + MARGIN + (H - HEADER - 2 * MARGIN - size[1] * k) / 2 };
};

const Outlines: React.FC<{ boxes: Box[]; origin: { k: number; x: number; y: number } }> = ({ boxes, origin }) => {
  // Big containers first so their labels claim the corners; small ones place around them.
  const sorted = [...boxes].sort((a, b) => b.r.w * b.r.h - a.r.w * a.r.h);
  const placed: Rect[] = [];
  const LH = 26;
  const overlaps = (a: Rect) => placed.some((b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h);
  return (
    <>
      {sorted.map((b, i) => {
        const color = COLORS[i % COLORS.length];
        const s = { x: origin.x + b.r.x * origin.k, y: origin.y + b.r.y * origin.k, w: b.r.w * origin.k, h: b.r.h * origin.k };
        const text = b.dup ? `${b.name} (#${b.dup + 1})` : b.name;
        const lw = Math.min(520, 11.2 * text.length + 14);
        const cands = [
          { x: s.x, y: s.y },
          { x: s.x, y: s.y - LH },
          { x: s.x, y: s.y + s.h - LH },
          { x: s.x + s.w - lw, y: s.y },
          { x: s.x, y: s.y + s.h },
        ];
        let pos = cands.find((p) => !overlaps({ x: p.x, y: p.y, w: lw, h: LH }));
        if (!pos) {
          let y = s.y;
          while (overlaps({ x: s.x, y, w: lw, h: LH }) && y < H) y += LH;
          pos = { x: s.x, y };
        }
        pos = { x: Math.max(0, Math.min(W - lw, pos.x)), y: Math.max(HEADER, Math.min(H - LH, pos.y)) };
        placed.push({ x: pos.x, y: pos.y, w: lw, h: LH });
        return (
          <React.Fragment key={`${b.name}-${b.dup}`}>
            <div style={{ position: 'absolute', left: s.x, top: s.y, width: s.w, height: s.h, outline: `2px solid ${color}`, background: `${color}14`, boxSizing: 'border-box' }} />
            <div
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                height: LH,
                padding: '0 7px',
                background: color,
                color: '#000',
                font: '700 18px "JetBrains Mono", Menlo, monospace',
                lineHeight: `${LH}px`,
                borderRadius: 4,
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 6px rgba(0,0,0,0.5)',
              }}
            >
              {text}
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

const Header: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: HEADER, display: 'flex', alignItems: 'center', gap: 24, padding: '0 28px', boxSizing: 'border-box', background: '#000', borderBottom: '1px solid #333' }}>
    <div style={{ color: '#fff', font: '700 28px Inter, sans-serif', whiteSpace: 'nowrap' }}>{title}</div>
    <div style={{ color: '#aaa', font: '500 18px "JetBrains Mono", Menlo, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
  </div>
);

const ReplicaTargets: React.FC<TargetsProps & { app: string }> = ({ app, data, state, caption, plate }) => {
  const def = replicas[app];
  const size = (plate ? def?.panelSize ?? plate : def?.size) ?? [1920, 1080];
  const ref = useRef<HTMLDivElement | null>(null);
  const [boxes, setBoxes] = useState<Box[] | null>(null);
  const [handle] = useState(() => delayRender(`targets ${app}`, { timeoutInMilliseconds: 60000 }));
  useLayoutEffect(() => {
    let cancelled = false;
    (async () => {
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const root = ref.current;
      const out: Box[] = [];
      if (root && def) {
        const rr = root.getBoundingClientRect();
        const k = size[0] / (rr.width || size[0]);
        const seen: Record<string, number> = {};
        root.querySelectorAll<HTMLElement>('[data-target]').forEach((el) => {
          const b = el.getBoundingClientRect();
          const name = el.dataset.target!;
          const dup = seen[name] ?? 0;
          seen[name] = dup + 1;
          out.push({ name, dup, r: { x: (b.left - rr.left) * k, y: (b.top - rr.top) * k, w: b.width * k, h: b.height * k } });
        });
      }
      if (!cancelled) {
        setBoxes(out);
        // Picked up by `screenplay targets` (onBrowserLog) to print the measured list.
        console.log(`SCREENPLAY_TARGETS ${JSON.stringify(out.map((b) => ({ name: b.name, dup: b.dup, r: [b.r.x, b.r.y, b.r.w, b.r.h].map(Math.round) })))}`);
        continueRender(handle);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [def, handle]);
  if (!def) {
    return (
      <AbsoluteFill style={{ background: '#300', color: '#fff', font: '600 36px Inter', padding: 80 }}>
        Unknown replica "{app}". Known: {Object.keys(replicas).join(', ')}
      </AbsoluteFill>
    );
  }
  const Comp = def.component;
  const o = fit(size);
  const st = { ...def.defaults.state, ...(state ?? {}) };
  const names = boxes ? [...new Set(boxes.map((b) => b.name))] : [];
  return (
    <AbsoluteFill style={{ background: '#0b0b0b' }}>
      <Header title={`${def.id}  ·  ${names.length} targets`} sub={caption ?? `state ${JSON.stringify(st)}`} />
      <div style={{ position: 'absolute', left: o.x, top: o.y, width: size[0], height: size[1], transform: `scale(${o.k})`, transformOrigin: '0 0', overflow: 'hidden' }}>
        <div ref={ref} style={{ width: size[0], height: size[1], position: 'relative' }}>
          <PlateSizeProvider value={size}>
            <Comp data={{ ...def.defaults.data, ...(data ?? {}) }} state={st} ui={{ frame: 0, fps: 30 }} />
          </PlateSizeProvider>
        </div>
      </div>
      <AbsoluteFill style={{ background: 'rgba(0,0,0,0.28)', top: HEADER }} />
      {boxes ? <Outlines boxes={boxes} origin={o} /> : null}
    </AbsoluteFill>
  );
};

const ScreenTargets: React.FC<{ screen: NonNullable<TargetsProps['screen']>; caption?: string }> = ({ screen, caption }) => {
  const o = fit(screen.size);
  const isVideo = /\.(mp4|mov|webm|m4v|mkv)$/i.test(screen.src);
  const boxes = Object.entries(screen.targets).map(([name, r]) => ({ name, r, dup: 0 }));
  return (
    <AbsoluteFill style={{ background: '#0b0b0b' }}>
      <Header title={`${screen.src}  ·  ${boxes.length} targets`} sub={caption ?? `${screen.size[0]}×${screen.size[1]}`} />
      {isVideo ? (
        <div style={{ position: 'absolute', left: o.x, top: o.y, width: screen.size[0] * o.k, height: screen.size[1] * o.k, background: '#222', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '500 28px Inter' }}>
          video plate (use `screenplay still` to see a frame)
        </div>
      ) : (
        <Img src={staticFile(screen.src)} style={{ position: 'absolute', left: o.x, top: o.y, width: screen.size[0] * o.k, height: screen.size[1] * o.k }} />
      )}
      <Outlines boxes={boxes} origin={o} />
    </AbsoluteFill>
  );
};

export const Targets: React.FC<TargetsProps> = (props) => (
  <ThemeProvider name="ember-dark">
    {props.screen ? <ScreenTargets screen={props.screen} caption={props.caption} /> : props.app ? <ReplicaTargets {...props} app={props.app} /> : (
      <AbsoluteFill style={{ background: '#111', color: '#fff', font: '600 40px Inter', padding: 80 }}>Replicas: {Object.keys(replicas).join(', ')}</AbsoluteFill>
    )}
  </ThemeProvider>
);

// JSON-safe description of every replica (for `screenplay replicas` / `check` when the replica
// modules cannot be imported under plain Node).
export const replicaManifest = () =>
  Object.values(replicas).map((r) => JSON.parse(JSON.stringify({ id: r.id, title: r.title, size: r.size, tone: r.tone, targets: r.targets, stateDoc: r.stateDoc, defaults: r.defaults })));

// ---------------------------------------------------------------- Sheet

export type SheetItem = { src: string; time: string; label: string; sub?: string };
export type SheetProps = { title: string; columns: number; thumb: [number, number]; items: SheetItem[] };

const GAP = 14;
const PAD = 22;
const LABEL_H = 64;
const SHEET_HEADER = 56;

const sheetSize = (p: SheetProps) => {
  const rows = Math.max(1, Math.ceil(p.items.length / p.columns));
  const w = PAD * 2 + p.columns * p.thumb[0] + (p.columns - 1) * GAP;
  const h = SHEET_HEADER + PAD * 2 + rows * (p.thumb[1] + LABEL_H) + (rows - 1) * GAP;
  return { width: w + (w % 2), height: h + (h % 2) };
};

export const Sheet: React.FC<SheetProps> = ({ title, columns, thumb, items }) => (
  <AbsoluteFill style={{ background: '#101010', padding: PAD, boxSizing: 'border-box' }}>
    <div style={{ height: SHEET_HEADER, color: '#f4f4f0', font: '700 26px Inter, sans-serif', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{title}</div>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, ${thumb[0]}px)`, gap: GAP }}>
      {items.map((it, i) => (
        <div key={i} style={{ width: thumb[0], height: thumb[1] + LABEL_H, background: '#1b1b1b', borderRadius: 6, overflow: 'hidden' }}>
          <Img src={staticFile(it.src)} style={{ width: thumb[0], height: thumb[1], display: 'block' }} />
          <div style={{ padding: '6px 10px', font: '600 17px Inter, sans-serif', color: '#e8e8e4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: '#ff8a4c', fontFamily: '"JetBrains Mono", Menlo, monospace', marginRight: 10 }}>{it.time}</span>
            {it.label}
          </div>
          <div style={{ padding: '0 10px', font: '500 15px Inter, sans-serif', color: '#9a9a94', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.sub ?? ''}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

// ---------------------------------------------------------------- registration

export const ToolCompositions: React.FC = () => (
  <>
    <Composition
      id="Targets"
      component={Targets as unknown as React.FC<Record<string, unknown>>}
      defaultProps={{ app: '_fixture' } as Record<string, unknown>}
      durationInFrames={1}
      fps={30}
      width={W}
      height={H}
      calculateMetadata={({ props }) => (props.manifest ? { props: { ...props, manifest: replicaManifest() } } : {})}
    />
    <Composition
      id="Sheet"
      component={Sheet as unknown as React.FC<Record<string, unknown>>}
      defaultProps={{ title: 'Sheet', columns: 4, thumb: [480, 270], items: [] } as Record<string, unknown>}
      durationInFrames={1}
      fps={30}
      width={1000}
      height={600}
      calculateMetadata={({ props }) => sheetSize(props as unknown as SheetProps)}
    />
  </>
);
