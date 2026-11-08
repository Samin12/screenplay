import React from 'react';
import { Img } from 'remotion';
import type { ElementProps } from '../../ElementView';
import type { StoryActor, StoryPoint, StorySide } from '../../../types';
import type { Theme } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import { RichText } from '../../../ui/RichText';
import { Fit, Glyph, cardShadow, mix, textW, wrap } from '../groupA/kit';
import { StickerSlab, mediaSrc, partIn } from '../groupB/kit';
import { PROP_SCALE, PROP_SIZE, STORY_H, STORY_W } from './spec';
import { StorySim, c01, outCubic } from './sim';
import { FlipContext, PROPS, fmt, hash, palette, resolveColor, type Pal } from './props';

// `type: story`: a little animated scene on a fixed 1400x990 stage (the panel's viewport). Actors are
// illustrated props, icons, cards and numbers; beats move them on spoken words (cli/story.ts). Layers,
// bottom to top: arrows and paths, actors (in list order), speech bubbles; the title stays put while
// the camera follows.

const LABEL = 34;
const ROLE = 26;
const BUBBLE = 32;
const BUBBLE_W = 400;

const counterText = (a: StoryActor, v: number) => `${a.prefix ?? ''}${fmt(v, a.decimals ?? 0)}${a.suffix ?? ''}`;
const boxText = (a: StoryActor) => a.title ?? a.text ?? '';

// Size of the drawing (not its label) in story px, for arrows, bubbles and the camera.
export function sizeOf(a: StoryActor, value: number): [number, number] {
  const s = a.scale ?? 1;
  const p = PROP_SIZE[a.kind];
  if (p) return [p[0] * s * PROP_SCALE, p[1] * s * PROP_SCALE];
  switch (a.kind) {
    case 'icon': {
      const z = a.size ?? 150;
      return [z * s, z * s];
    }
    case 'text': {
      const size = a.size ?? 48;
      const lines = wrap(a.text ?? '', size, a.w ?? 900, 'display', 700);
      return [Math.max(...lines.map((l) => textW(l, size, 'display', 700))) * s, lines.length * size * 1.2 * s];
    }
    case 'box':
    case 'card': {
      const { w, h } = cardLayout(a);
      return [w * s, h * s];
    }
    case 'counter': {
      const size = a.size ?? 110;
      return [textW(counterText(a, value), size, 'display', 800) * s, size * 1.15 * s];
    }
    case 'meter':
      return a.style === 'dial' ? [280 * s, 206 * s] : [((a.w ?? 440) + 120) * s, 48 * s];
    case 'image':
      return [(a.w ?? 380) * s, (a.h ?? 250) * s];
    case 'badge':
      return [(textW(a.text ?? '', 32, 'display', 700) + 64 + (a.icon ? 46 : 0)) * s, 70 * s];
    case 'sticker': {
      const fs = a.size ?? 58;
      return [(textW(a.text ?? '', fs, 'display', 800) + fs * 1.1) * s, fs * 1.8 * s];
    }
    case 'bubble':
      return bubbleSize(a.text ?? '');
    default:
      return [120, 120];
  }
}

// ---------- cards ----------

function cardLayout(a: StoryActor) {
  const lines = a.lines ?? [];
  const w = a.w ?? (lines.length ? 460 : 340);
  const inner = w - 56;
  if (!lines.length) {
    const tl = wrap(boxText(a), 36, inner, 'display', 700);
    return { w, h: 56 + (a.icon ? 82 : 0) + tl.length * 44, titleLines: tl };
  }
  const tl = wrap(boxText(a), 36, inner - (a.icon ? 70 : 0), 'display', 700);
  const body = lines.map((l) => wrap(l, 28, inner - 26, 'display', 500));
  return { w, h: 56 + Math.max(a.icon ? 56 : 0, tl.length * 44) + 14 + body.reduce((n, b) => n + b.length * 38 + 8, 0), titleLines: tl };
}

const IconTile: React.FC<{ t: Theme; name?: string; size: number; color?: string }> = ({ t, name, size, color }) =>
  name === 'claude' ? (
    <div style={{ borderRadius: size * 0.24, boxShadow: `0 10px 30px ${t.accentGlow}` }}>
      <Glyph name="claude" size={size} color="#fff" />
    </div>
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.26,
        background: color ? mix(color, 20, t.cardRaised) : t.cardRaised,
        boxShadow: `inset 0 0 0 2px ${color ? mix(color, 55, t.cardBorder) : t.cardBorder}, ${cardShadow(t)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Glyph name={name} size={size * 0.54} color={color ?? t.text} stroke={2.2} />
    </div>
  );

const Card: React.FC<{ t: Theme; a: StoryActor; color?: string; fresh?: React.CSSProperties }> = ({ t, a, color, fresh }) => {
  const { w } = cardLayout(a);
  const lines = a.lines ?? [];
  const border = color ? mix(color, 60, t.cardBorder) : t.cardBorder;
  const center = !lines.length;
  return (
    <div style={{ width: w, boxSizing: 'border-box', padding: '28px 28px', borderRadius: 26, background: t.card, boxShadow: `inset 0 0 0 2px ${border}, ${cardShadow(t)}`, display: 'flex', flexDirection: 'column', alignItems: center ? 'center' : 'stretch', textAlign: center ? 'center' : 'left' }}>
      <div style={{ display: 'flex', flexDirection: center ? 'column' : 'row', alignItems: 'center', gap: center ? 18 : 14 }}>
        {a.icon ? (
          <div style={{ width: 64, height: 64, borderRadius: 17, background: color ? mix(color, 22, t.bg) : t.accentDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Glyph name={a.icon} size={36} color={color ?? t.accent} />
          </div>
        ) : null}
        {boxText(a) ? (
          <div style={{ fontFamily: t.fonts.display, fontWeight: 700, fontSize: 36, lineHeight: 1.22, color: t.text, ...fresh }}>
            <RichText text={boxText(a)} />
          </div>
        ) : null}
      </div>
      {lines.length ? (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, ...fresh }}>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'baseline', fontFamily: t.fonts.display, fontWeight: 500, fontSize: 28, lineHeight: 1.36, color: t.textDim }}>
              <div style={{ width: 9, height: 9, borderRadius: 9, background: color ?? t.accent, flexShrink: 0, transform: 'translateY(-4px)' }} />
              <div>
                <RichText text={l} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

// ---------- meters ----------

const Meter: React.FC<{ t: Theme; a: StoryActor; v: number; color: string }> = ({ t, a, v, color }) => {
  const pct = Math.max(0, Math.min(100, v));
  const shown = `${Math.round(pct)}%`;
  if (a.style === 'dial') {
    const r = 112;
    const len = Math.PI * r;
    const ang = Math.PI * (1 - pct / 100);
    return (
      <div style={{ position: 'relative', width: 280, height: 206 }}>
        <svg width={280} height={170} viewBox="0 0 280 170" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <path d={`M ${140 - r} 146 A ${r} ${r} 0 0 1 ${140 + r} 146`} fill="none" style={{ stroke: t.cardRaised }} strokeWidth={26} strokeLinecap="round" />
          <path d={`M ${140 - r} 146 A ${r} ${r} 0 0 1 ${140 + r} 146`} fill="none" style={{ stroke: color, filter: `drop-shadow(0 0 10px ${t.accentGlow})` }} strokeWidth={26} strokeLinecap="round" strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - pct / 100)} />
          <line x1={140} y1={146} x2={140 + Math.cos(ang) * (r - 40)} y2={146 - Math.sin(ang) * (r - 40)} style={{ stroke: t.text }} strokeWidth={7} strokeLinecap="round" />
          <circle cx={140} cy={146} r={13} style={{ fill: t.text }} />
        </svg>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 162, textAlign: 'center', fontFamily: t.fonts.display, fontWeight: 800, fontSize: 40, lineHeight: 1.1, color: t.text, fontVariantNumeric: 'tabular-nums' }}>{shown}</div>
      </div>
    );
  }
  const w = a.w ?? 440;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ position: 'relative', width: w, height: 44, borderRadius: 22, background: t.cardRaised, boxShadow: `inset 0 0 0 2px ${t.cardBorder}` }}>
        <div style={{ position: 'absolute', left: 5, top: 5, bottom: 5, width: Math.max(0, (w - 10) * (pct / 100)), borderRadius: 17, background: `linear-gradient(90deg, ${mix(color, 70, t.bg)}, ${color})`, boxShadow: pct > 0 ? `0 0 18px ${t.accentGlow}` : undefined }} />
      </div>
      <div style={{ width: 100, fontFamily: t.fonts.display, fontWeight: 800, fontSize: 38, color: t.text, fontVariantNumeric: 'tabular-nums' }}>{shown}</div>
    </div>
  );
};

// ---------- content actors (not illustrated) ----------

const Content: React.FC<{ t: Theme; a: StoryActor; v: number; color?: string; fresh?: React.CSSProperties }> = ({ t, a, v, color, fresh }) => {
  switch (a.kind) {
    case 'icon':
      return a.tile === false ? <Glyph name={a.icon} size={(a.size ?? 150) * 0.8} color={color ?? t.text} stroke={2} /> : <IconTile t={t} name={a.icon} size={a.size ?? 150} color={color} />;
    case 'text': {
      const size = a.size ?? 48;
      return (
        <div style={{ maxWidth: a.w ?? 900, width: 'max-content', textAlign: 'center', fontFamily: t.fonts.display, fontWeight: size >= 60 ? 800 : 700, fontSize: size, lineHeight: 1.2, letterSpacing: -size * 0.015, color: color ?? t.text, ...fresh }}>
          <RichText text={a.text ?? ''} />
        </div>
      );
    }
    case 'box':
    case 'card':
      return <Card t={t} a={a} color={color} fresh={fresh} />;
    case 'counter': {
      const size = a.size ?? 110;
      const c = color ?? t.accent;
      return (
        <div style={{ fontFamily: t.fonts.display, fontWeight: 800, fontSize: size, lineHeight: 1.1, letterSpacing: -size * 0.02, color: c, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', textShadow: `0 0 40px ${t.accentGlow}` }}>{counterText(a, v)}</div>
      );
    }
    case 'meter':
      return <Meter t={t} a={a} v={v} color={color ?? t.accent} />;
    case 'image':
      return <Img src={mediaSrc(a.src ?? '')} style={{ width: a.w ?? 380, height: a.h ?? 250, objectFit: 'cover', borderRadius: 20, display: 'block', boxShadow: `inset 0 0 0 2px ${t.cardBorder}, ${cardShadow(t)}` }} />;
    case 'badge':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 28px', borderRadius: 999, background: color ? mix(color, 22, t.cardRaised) : t.cardRaised, boxShadow: `inset 0 0 0 2px ${color ? mix(color, 60, t.cardBorder) : t.cardBorder}, ${cardShadow(t)}`, whiteSpace: 'nowrap', ...fresh }}>
          {a.icon ? <Glyph name={a.icon} size={34} color={color ?? t.text} stroke={2.4} /> : null}
          <div style={{ fontFamily: t.fonts.display, fontWeight: 700, fontSize: 32, lineHeight: 1.2, color: t.text }}>
            <RichText text={a.text ?? ''} />
          </div>
        </div>
      );
    case 'sticker':
      return <StickerSlab text={a.text ?? ''} fontSize={a.size ?? 58} rotate={a.rotate ?? -4} t={t} scale={1} opacity={1} />;
    default:
      return null;
  }
};

// ---------- one actor ----------

const ActorView: React.FC<{ sim: StorySim; id: string; f: number; fps: number; t: Theme; pal: Pal; uid: string }> = ({ sim, id, f, fps, t, pal, uid }) => {
  const vis = sim.vis(id, f);
  if (vis.o <= 0.002) return null;
  const { a, swapAt } = sim.fields(id, f);
  const [x, y] = sim.pos(id, f);
  const v = sim.value(id, f);
  const color = resolveColor(t, a.color);
  const hl = sim.highlight(id, f);
  const pk = sim.pulse(id, f);
  const dx = sim.shake(id, f);
  const dim = sim.dim([id], f);
  const fresh = swapAt !== undefined && f - swapAt < 12 ? partIn(f, fps, swapAt, 240) : undefined;
  const Prop = PROPS[a.kind];
  const s = (a.scale ?? 1) * (Prop ? PROP_SCALE : 1);
  const pulseS = pk >= 0 ? 1 + 0.07 * Math.sin(Math.PI * pk) : 1;
  // The highlight ring takes in the label too.
  const labelGap = a.kind === 'person' ? 12 : 16;
  const labelH = a.label || a.role ? labelGap + (a.label ? LABEL * 1.15 : 0) + (a.role ? 4 + ROLE * 1.2 : 0) : 0;
  const labelW = Math.max(a.label ? textW(a.label, LABEL, 'display', 700) : 0, a.role ? textW(a.role, ROLE, 'display', 500) : 0);
  const shapeW = sizeOf(a, v)[0] / (Prop ? 1 : s);
  const side = Math.max(20, (labelW - shapeW) / 2 + 18);
  let body: React.ReactNode;
  if (Prop) {
    const [w, h] = PROP_SIZE[a.kind]!;
    body = (
      <div style={{ position: 'relative', width: w * s, height: h * s }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `scale(${s})${a.rotate ? ` rotate(${a.rotate}deg)` : ''}`, transformOrigin: a.rotate ? `${w / 2}px ${h / 2}px` : '0 0' }}>
          <FlipContext.Provider value={!!a.flip}>
            <Prop a={a} t={t} pal={pal} color={color} f={f} fps={fps} x={x} value={v} uid={`${uid}-${id}`} />
          </FlipContext.Provider>
        </div>
      </div>
    );
  } else body = <Content t={t} a={a} v={v} color={color} fresh={fresh} />;
  const scale = vis.scale * pulseS * (Prop || a.kind === 'sticker' ? 1 : s);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) translateX(${dx.toFixed(2)}px) scale(${scale.toFixed(4)})`,
        opacity: vis.o * (1 - 0.72 * dim),
        filter: vis.blur > 0.05 ? `blur(${vis.blur.toFixed(2)}px)` : undefined,
      }}
    >
      <div style={{ position: 'relative' }}>
        {hl > 0 ? <div style={{ position: 'absolute', top: -20, left: -side, right: -side, bottom: -20 - labelH, borderRadius: 30, boxShadow: `0 0 0 4px ${t.accent}, 0 0 34px ${t.accentGlow}`, opacity: hl }} /> : null}
        {pk >= 0 ? <div style={{ position: 'absolute', inset: -12 - 34 * outCubic(pk), borderRadius: 34, boxShadow: `0 0 0 3px ${t.accent}`, opacity: 0.85 * (1 - pk) }} /> : null}
        {body}
        {a.label || a.role ? (
          <div style={{ position: 'absolute', left: '50%', top: '100%', marginTop: labelGap, transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap', ...fresh }}>
            {a.label ? (
              <div style={{ fontFamily: t.fonts.display, fontWeight: 700, fontSize: LABEL, lineHeight: 1.15, letterSpacing: -0.4, color: hl > 0.5 ? t.accent : t.text }}>
                <RichText text={a.label} />
              </div>
            ) : null}
            {a.role ? <div style={{ fontFamily: t.fonts.display, fontWeight: 500, fontSize: ROLE, lineHeight: 1.2, marginTop: 4, color: t.textMuted }}>{a.role}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ---------- arrows and paths ----------

type Geo = { p1: [number, number]; p2: [number, number]; c: [number, number]; d: string; mid: [number, number] };

function edgePoint(sim: StorySim, pt: StoryPoint, toward: [number, number], f: number): [number, number] {
  if (Array.isArray(pt)) return pt;
  const [x, y] = sim.pos(pt, f);
  const a = sim.byId.get(pt);
  if (!a) return [x, y];
  const [w, h] = sizeOf(a, sim.value(pt, f));
  const dx = toward[0] - x;
  const dy = toward[1] - y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return [x, y];
  const k = Math.min((w / 2 + 20) / Math.max(1e-6, Math.abs(dx)), (h / 2 + 20) / Math.max(1e-6, Math.abs(dy)));
  return k >= 1 ? [x, y] : [x + dx * k, y + dy * k];
}

function arrowGeo(sim: StorySim, a: StoryActor, f: number): Geo | null {
  if (a.from === undefined || a.to === undefined) return null;
  const c1 = Array.isArray(a.from) ? a.from : sim.pos(a.from, f);
  const c2 = Array.isArray(a.to) ? a.to : sim.pos(a.to, f);
  const len = Math.hypot(c2[0] - c1[0], c2[1] - c1[1]) || 1;
  const bend = a.curve ?? 0;
  const mx = (c1[0] + c2[0]) / 2;
  const my = (c1[1] + c2[1]) / 2;
  const nx = -(c2[1] - c1[1]) / len;
  const ny = (c2[0] - c1[0]) / len;
  const c: [number, number] = [mx + nx * bend * len * 0.5, my + ny * bend * len * 0.5];
  const p1 = edgePoint(sim, a.from, bend ? c : c2, f);
  const p2 = edgePoint(sim, a.to, bend ? c : c1, f);
  const cc: [number, number] = bend ? c : [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  const d = `M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} Q ${cc[0].toFixed(1)} ${cc[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  const mid: [number, number] = [0.25 * p1[0] + 0.5 * cc[0] + 0.25 * p2[0], 0.25 * p1[1] + 0.5 * cc[1] + 0.25 * p2[1]];
  return { p1, p2, c: cc, d, mid };
}

const endOpacity = (sim: StorySim, pt: StoryPoint | undefined, f: number) => (typeof pt === 'string' ? sim.vis(pt, f).o : 1);

const ArrowLayer: React.FC<{ sim: StorySim; arrows: StoryActor[]; f: number; t: Theme; uid: string; part: 'lines' | 'labels' }> = ({ sim, arrows, f, t, uid, part }) => {
  const live = arrows
    .map((a) => {
      const vis = sim.vis(a.id, f);
      const geo = arrowGeo(sim, a, f);
      const keep = [a.id, ...(typeof a.from === 'string' ? [a.from] : []), ...(typeof a.to === 'string' ? [a.to] : [])];
      const o = vis.o * Math.min(endOpacity(sim, a.from, f), endOpacity(sim, a.to, f)) * (1 - 0.72 * sim.dim(keep, f));
      return { a, vis, geo, o };
    })
    .filter((x) => x.geo && x.o > 0.002 && x.vis.drawn > 0);
  if (!live.length) return null;
  if (part === 'labels') return <>{live.map(({ a, vis, geo, o }) => (a.label ? <ArrowLabel key={a.id} t={t} a={a} at={geo!.mid} o={o * c01((vis.drawn - 0.45) / 0.35)} /> : null))}</>;
  return (
    <>
      <svg width={STORY_W} height={STORY_H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        {live.map(({ a, vis, geo, o }) => {
          const g = geo!;
          const isPath = a.kind === 'path';
          const c = resolveColor(t, a.color, isPath ? t.textMuted : t.accent)!;
          const dashed = a.dashed ?? isPath;
          const p = vis.drawn;
          const tx = g.p2[0] - g.c[0];
          const ty = g.p2[1] - g.c[1];
          const tl = Math.hypot(tx, ty) || 1;
          const ux = tx / tl;
          const uy = ty / tl;
          const hs = 24;
          const h1 = [g.p2[0] - ux * hs - uy * hs * 0.8, g.p2[1] - uy * hs + ux * hs * 0.8];
          const h2 = [g.p2[0] - ux * hs + uy * hs * 0.8, g.p2[1] - uy * hs - ux * hs * 0.8];
          const hp = c01((p - 0.82) / 0.18);
          const mid = `${uid}-${a.id}-m`;
          return (
            <g key={a.id} opacity={o}>
              {dashed ? (
                <>
                  <mask id={mid} maskUnits="userSpaceOnUse" x={-200} y={-200} width={STORY_W + 400} height={STORY_H + 400}>
                    <path d={g.d} fill="none" stroke="#fff" strokeWidth={14} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
                  </mask>
                  <path d={g.d} fill="none" style={{ stroke: c }} strokeWidth={6} strokeLinecap="round" strokeDasharray="2 18" mask={`url(#${mid})`} />
                </>
              ) : (
                <path d={g.d} fill="none" style={{ stroke: c, filter: `drop-shadow(0 0 8px ${mix(c, 40, 'transparent')})` }} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
              )}
              {!isPath && hp > 0 ? <path d={`M ${h1[0]} ${h1[1]} L ${g.p2[0]} ${g.p2[1]} L ${h2[0]} ${h2[1]}`} fill="none" style={{ stroke: c }} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={hp} /> : null}
            </g>
          );
        })}
      </svg>
    </>
  );
};

const ArrowLabel: React.FC<{ t: Theme; a: StoryActor; at: [number, number]; o: number }> = ({ t, a, at, o }) => (
  <div
    style={{
      position: 'absolute',
      left: at[0],
      top: at[1],
      transform: 'translate(-50%, -50%)',
      padding: '7px 18px 8px',
      borderRadius: 999,
      background: t.bg,
      boxShadow: `inset 0 0 0 2px ${mix(resolveColor(t, a.color, a.kind === 'path' ? t.textMuted : t.accent)!, 55, t.bg)}, 0 6px 18px rgba(0,0,0,0.3)`,
      fontFamily: t.fonts.display,
      fontWeight: 700,
      fontSize: 28,
      lineHeight: 1.15,
      color: t.text,
      whiteSpace: 'nowrap',
      opacity: o,
    }}
  >
    <RichText text={a.label ?? ''} />
  </div>
);

// ---------- speech and thought bubbles ----------

function bubbleSize(text: string): [number, number] {
  const lines = wrap(text, BUBBLE, BUBBLE_W, 'display', 600);
  const tw = Math.max(...lines.map((l) => textW(l, BUBBLE, 'display', 600)));
  return [Math.ceil(tw + 64), Math.ceil(lines.length * BUBBLE * 1.24 + 38)];
}

const BubbleView: React.FC<{ sim: StorySim; t: Theme; pal: Pal; f: number; text: string; on?: string; at?: [number, number]; side?: StorySide; thought?: boolean; p: number; q: number; dim: number }> = ({
  sim,
  t,
  pal,
  f,
  text,
  on,
  at,
  side = 'top',
  thought,
  p,
  q,
  dim,
}) => {
  let ax: number;
  let ay: number;
  if (on) {
    const [x, y] = sim.pos(on, f);
    const target = sim.byId.get(on)!;
    const [w, h] = sizeOf(target, sim.value(on, f));
    const labelH = target.label ? 48 + (target.role ? 34 : 0) : 0;
    if (side === 'left') [ax, ay] = [x - w / 2 - 6, y - h * 0.18];
    else if (side === 'right') [ax, ay] = [x + w / 2 + 6, y - h * 0.18];
    else if (side === 'bottom') [ax, ay] = [x, y + h / 2 + labelH + 8];
    else [ax, ay] = [x, y - h / 2 - 4];
  } else [ax, ay] = at ?? [STORY_W / 2, STORY_H / 2];
  const [bw, bh] = bubbleSize(text);
  const gap = thought ? 34 : 22;
  let left: number;
  let top: number;
  if (side === 'left') [left, top] = [ax - gap - bw, ay - bh / 2];
  else if (side === 'right') [left, top] = [ax + gap, ay - bh / 2];
  else if (side === 'bottom') [left, top] = [ax - bw / 2, ay + gap];
  else [left, top] = [ax - bw / 2, ay - gap - bh];
  left = Math.max(16, Math.min(STORY_W - bw - 16, left));
  top = Math.max(16, Math.min(STORY_H - bh - 16, top));
  const fill = t.name === 'clay-light' ? '#FFFFFF' : pal.paper;
  // tail: from the bubble edge facing the anchor to the anchor
  const vertical = side === 'top' || side === 'bottom';
  const ex = vertical ? Math.max(left + 34, Math.min(left + bw - 34, ax)) : side === 'left' ? left + bw : left;
  const ey = vertical ? (side === 'top' ? top + bh : top) : Math.max(top + 30, Math.min(top + bh - 30, ay));
  const tail = vertical ? `M ${ex - 15} ${ey - (side === 'top' ? 2 : -2)} L ${ax} ${ay} L ${ex + 15} ${ey - (side === 'top' ? 2 : -2)} Z` : `M ${ex} ${ey - 15} L ${ax} ${ay} L ${ex} ${ey + 15} Z`;
  const o = p * (1 - q) * (1 - 0.72 * dim);
  const blur = 8 * (1 - p) + 8 * q;
  const k = 0.88 + 0.12 * p;
  const origin = `${ax}px ${ay}px`;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: STORY_W, height: STORY_H, opacity: o, filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined, transform: `scale(${k})`, transformOrigin: origin }}>
      <svg width={STORY_W} height={STORY_H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        {thought ? (
          <>
            <circle cx={ex + (ax - ex) * 0.42} cy={ey + (ay - ey) * 0.42} r={11} fill={fill} />
            <circle cx={ex + (ax - ex) * 0.82} cy={ey + (ay - ey) * 0.82} r={7} fill={fill} />
          </>
        ) : (
          <path d={tail} fill={fill} stroke={fill} strokeWidth={4} strokeLinejoin="round" />
        )}
      </svg>
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: bw,
          height: bh,
          boxSizing: 'border-box',
          padding: '18px 28px 20px',
          borderRadius: thought ? 44 : 28,
          background: fill,
          boxShadow: `0 14px 34px rgba(0,0,0,0.35)${t.name === 'clay-light' ? `, inset 0 0 0 2px ${t.cardBorder}` : ''}`,
          fontFamily: t.fonts.display,
          fontWeight: 600,
          fontSize: BUBBLE,
          lineHeight: 1.24,
          color: '#1F1C1A',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span>
          <RichText text={text} accent={t.name === 'clay-light' ? t.accent : '#C8552C'} />
        </span>
      </div>
    </div>
  );
};

// ---------- the element ----------

const DRAWN_ELSEWHERE = ['arrow', 'path', 'bubble'];

export const Story: React.FC<ElementProps<'story'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const pal = palette(t);
  const sim = new StorySim(el.actors, el.beats, fps);
  const cam = sim.camera(frame);
  const uid = `story${hash(el.actors.map((a) => a.id).join('|') + el.frame)}`;
  const camT = `translate(${(STORY_W / 2 - cam.cx * cam.s).toFixed(2)}px, ${(STORY_H / 2 - cam.cy * cam.s).toFixed(2)}px) scale(${cam.s.toFixed(4)})`;
  const arrows = el.actors.filter((a) => a.kind === 'arrow' || a.kind === 'path');
  const bubbles = el.actors.filter((a) => a.kind === 'bubble');
  // The title belongs to the wide shot: it gives way while the camera is pushed in.
  const tIn = partIn(frame, fps, el.frame, 260);
  const title = el.title ? { ...tIn, opacity: Number(tIn.opacity ?? 1) * (1 - c01((cam.s - 1) / 0.12)) } : null;
  return (
    <Fit w={STORY_W} h={STORY_H} box={box}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: STORY_W, height: STORY_H, transform: camT, transformOrigin: '0 0' }}>
        <ArrowLayer sim={sim} arrows={arrows} f={frame} t={t} uid={uid} part="lines" />
        {el.actors
          .filter((a) => !DRAWN_ELSEWHERE.includes(a.kind))
          .map((a) => (
            <ActorView key={a.id} sim={sim} id={a.id} f={frame} fps={fps} t={t} pal={pal} uid={uid} />
          ))}
        <ArrowLayer sim={sim} arrows={arrows} f={frame} t={t} uid={uid} part="labels" />
        {bubbles.map((a) => {
          const vis = sim.vis(a.id, frame);
          if (vis.o <= 0.002) return null;
          const { a: cur } = sim.fields(a.id, frame);
          return (
            <BubbleView key={a.id} sim={sim} t={t} pal={pal} f={frame} text={cur.text ?? ''} on={a.on} at={[a.x, a.y]} side={a.side} thought={a.style === 'thought'} p={vis.o} q={0} dim={sim.dim([a.id, ...(a.on ? [a.on] : [])], frame)} />
          );
        })}
        {sim.says(frame).map(({ beat, p, q }, i) => (
          <BubbleView key={`say${i}`} sim={sim} t={t} pal={pal} f={frame} text={beat.text} on={beat.actor} side={beat.side} thought={beat.style === 'thought'} p={p} q={q} dim={sim.dim([beat.actor], frame)} />
        ))}
      </div>
      {el.title ? (
        <div style={{ position: 'absolute', left: 0, top: 26, width: STORY_W, textAlign: 'center', fontFamily: t.fonts.display, fontWeight: 800, fontSize: 54, lineHeight: 1.1, letterSpacing: -1.2, color: t.text, ...title }}>
          <RichText text={el.title} />
        </div>
      ) : null}
    </Fit>
  );
};
