import React from 'react';
import type { StoryActor, Tone } from '../../../types';
import type { Theme } from '../../../theme/tokens';
import { Glyph } from '../groupA/kit';
import { PROP_SIZE } from './spec';

// Illustrated story props, drawn in SVG at their PROP_SIZE (the wrapper scales them). Flat, rounded,
// warm neutrals on the dark panel; the accent only on the part that matters (a meter, a mic, a light).
// Everything is a pure function of its props and the frame.

export type Pal = {
  paper: string;
  paperShade: string;
  paperLine: string;
  light: string;
  lightShade: string;
  mid: string;
  dark: string;
  deep: string;
  edge: string;
  glass: string;
  screen: string;
  skin: string;
  skinShade: string;
  ink: string;
  shadow: string;
  warm: string;
  metal: string;
};

export const palette = (t: Theme): Pal =>
  t.name === 'clay-light'
    ? {
        paper: '#FFFFFF',
        paperShade: '#E9E2D6',
        paperLine: '#D3CABB',
        light: '#CDC2B2',
        lightShade: '#AFA391',
        mid: '#8A8072',
        dark: '#4A433C',
        deep: '#2E2A26',
        edge: '#6B6258',
        glass: '#55606E',
        screen: '#2C3138',
        skin: '#F2D9C4',
        skinShade: '#DDBA9E',
        ink: '#2A2421',
        shadow: 'rgba(60,45,30,0.18)',
        warm: '#F4D58C',
        metal: '#B5AC9F',
      }
    : {
        paper: '#F3EEE6',
        paperShade: '#D9D1C4',
        paperLine: '#CBC2B4',
        light: '#DAD2C6',
        lightShade: '#B3AA9D',
        mid: '#8C847A',
        dark: '#2F2B28',
        deep: '#1B1918',
        edge: '#4A4540',
        glass: '#3E4753',
        screen: '#1F242B',
        skin: '#F0DCCB',
        skinShade: '#DDBFA8',
        ink: '#2A2421',
        shadow: 'rgba(0,0,0,0.38)',
        warm: '#F4DDA6',
        metal: '#C9C2B8',
      };

const TONES: Tone[] = ['accent', 'good', 'bad', 'info', 'warn', 'muted'];
export const resolveColor = (t: Theme, c: string | undefined, fallback?: string) => (c ? (TONES.includes(c as Tone) ? t.tones[c as Tone] : c) : fallback);

// Small deterministic hash so the same id always gets the same hair and shirt.
export const hash = (s: string) => {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};
const SHIRTS = ['#7C8A9E', '#8E7F72', '#6F8F7E', '#9A7E8C', '#7F8C6E'];
const HAIR = ['#3A2E28', '#6E4E3A', '#22201E', '#8A6648'];

export type PropArgs = { a: StoryActor; t: Theme; pal: Pal; color?: string; f: number; fps: number; x: number; value: number; uid: string };

// `flip: true` mirrors the drawing (a car facing left); text overlays stay readable.
export const FlipContext = React.createContext(false);

const Svg: React.FC<{ kind: keyof typeof PROP_SIZE; children: React.ReactNode }> = ({ kind, children }) => {
  const [w, h] = PROP_SIZE[kind]!;
  const flip = React.useContext(FlipContext);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <g transform={flip ? `translate(${w} 0) scale(-1 1)` : undefined}>{children}</g>
    </svg>
  );
};

// Overlay positioned in the prop's own px (for text that must stay crisp, e.g. a meter display).
const At: React.FC<{ x: number; y: number; w: number; h: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, w, h, children, style }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', ...style }}>{children}</div>
);

// A pill that sits on a prop's corner (page counts, pile sizes).
export const Tag: React.FC<{ t: Theme; text: string; style?: React.CSSProperties }> = ({ t, text, style }) => (
  <div
    style={{
      position: 'absolute',
      background: t.accent,
      color: '#fff',
      fontFamily: t.fonts.display,
      fontWeight: 700,
      fontSize: 28,
      lineHeight: 1,
      padding: '9px 16px 10px',
      borderRadius: 999,
      whiteSpace: 'nowrap',
      boxShadow: `0 6px 18px rgba(0,0,0,0.35), 0 0 22px ${t.accentGlow}`,
      ...style,
    }}
  >
    {text}
  </div>
);

export const fmt = (v: number, decimals = 0) => v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// ---------- person ----------

export const Person: React.FC<PropArgs> = ({ a, t, pal, color, uid }) => {
  const h = hash(a.id);
  const body = color ?? SHIRTS[h % SHIRTS.length];
  const hair = HAIR[(h >> 3) % HAIR.length];
  const style = (h >> 6) % 3;
  return (
    <Svg kind="person">
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: `color-mix(in srgb, ${body} 82%, #fff)` }} />
          <stop offset="1" style={{ stopColor: body }} />
        </linearGradient>
      </defs>
      <path d="M16 230 V184 C16 146 42 124 76 122 H94 C128 124 154 146 154 184 V230 Z" fill={`url(#${uid}-body)`} />
      <rect x={73} y={98} width={24} height={30} rx={10} fill={pal.skinShade} />
      <circle cx={40} cy={72} r={9} fill={pal.skinShade} />
      <circle cx={130} cy={72} r={9} fill={pal.skinShade} />
      {style === 1 ? <path d="M36 98 C26 44 50 14 85 14 C120 14 144 44 134 98 C112 98 120 60 85 50 C50 60 58 98 36 98 Z" fill={hair} /> : null}
      <circle cx={85} cy={66} r={46} fill={pal.skin} />
      {style === 0 ? <path d="M38 66 C34 30 58 14 86 14 C116 14 138 32 132 68 C128 56 120 48 106 44 C92 50 64 50 46 46 C42 52 40 58 38 66 Z" fill={hair} /> : null}
      {style === 1 ? <path d="M40 64 C40 30 62 16 85 16 C110 16 130 30 130 64 C114 46 70 40 40 64 Z" fill={hair} /> : null}
      {style === 2 ? (
        <>
          <circle cx={85} cy={20} r={16} fill={hair} />
          <path d="M40 62 C38 32 60 22 85 22 C110 22 132 32 130 62 C122 48 104 42 85 42 C66 42 48 48 40 62 Z" fill={hair} />
        </>
      ) : null}
      <circle cx={60} cy={88} r={8} fill="#E79C84" opacity={0.35} />
      <circle cx={110} cy={88} r={8} fill="#E79C84" opacity={0.35} />
      <circle cx={68} cy={72} r={5.5} fill={pal.ink} />
      <circle cx={102} cy={72} r={5.5} fill={pal.ink} />
      <path d="M72 88 Q85 98 98 88" fill="none" stroke={pal.ink} strokeWidth={4} strokeLinecap="round" />
      {a.wear === 'tie' ? (
        <>
          <path d="M66 124 L85 148 L104 124 Z" fill={pal.paper} />
          <path d="M85 143 L77 154 L85 204 L93 154 Z" fill={pal.deep} />
        </>
      ) : null}
      {a.wear === 'glasses' ? (
        <g fill="none" stroke={pal.ink} strokeWidth={3.5}>
          <circle cx={68} cy={72} r={13} />
          <circle cx={102} cy={72} r={13} />
          <path d="M81 72 H89" />
        </g>
      ) : null}
      {a.wear === 'headset' ? (
        <>
          <path d="M36 72 C32 22 138 22 134 72" fill="none" stroke={pal.dark} strokeWidth={8} strokeLinecap="round" />
          <rect x={27} y={58} width={17} height={32} rx={7} fill={pal.dark} />
          <rect x={126} y={58} width={17} height={32} rx={7} fill={pal.dark} />
          <path d="M36 86 C40 106 56 110 70 106" fill="none" stroke={pal.dark} strokeWidth={5} strokeLinecap="round" />
          <circle cx={73} cy={105} r={6.5} style={{ fill: t.accent }} />
        </>
      ) : null}
    </Svg>
  );
};

// ---------- vehicles ----------

const Wheel: React.FC<{ cx: number; cy: number; r: number; angle: number; pal: Pal }> = ({ cx, cy, r, angle, pal }) => (
  <g transform={`translate(${cx} ${cy})`}>
    <circle r={r} fill="#141312" />
    <circle r={r * 0.56} fill={pal.mid} />
    <g transform={`rotate(${angle})`}>
      {[0, 72, 144, 216, 288].map((d) => (
        <line key={d} x1={0} y1={0} x2={0} y2={-r * 0.5} stroke={pal.dark} strokeWidth={3.5} strokeLinecap="round" transform={`rotate(${d})`} />
      ))}
    </g>
    <circle r={r * 0.16} fill={pal.light} />
  </g>
);

// Side view, facing right. `oy` shifts it down (the taxi puts a sign and a meter above it).
const CarBody: React.FC<PropArgs & { body: string; oy?: number; taxi?: boolean }> = ({ pal, body, oy = 0, x, uid, taxi }) => {
  const angle = (x / 27) * (180 / Math.PI);
  return (
    <g transform={`translate(0 ${oy})`}>
      <defs>
        <clipPath id={`${uid}-car`}>
          <rect x={10} y={60} width={310} height={64} rx={28} />
        </clipPath>
        <pattern id={`${uid}-check`} width={14} height={14} patternUnits="userSpaceOnUse">
          <rect width={14} height={14} fill={pal.paper} />
          <rect width={7} height={7} fill={pal.deep} />
          <rect x={7} y={7} width={7} height={7} fill={pal.deep} />
        </pattern>
      </defs>
      <ellipse cx={165} cy={144} rx={150} ry={7} fill={pal.shadow} />
      <path d="M84 68 L110 28 Q115 21 124 21 L214 21 Q223 21 229 28 L262 68 Z" style={{ fill: body }} />
      <path d="M104 64 L124 33 Q127 29 132 29 L163 29 L163 64 Z" fill={pal.glass} />
      <path d="M173 64 L173 29 L209 29 Q215 29 219 34 L244 64 Z" fill={pal.glass} />
      <path d="M132 29 L118 50" stroke="rgba(255,255,255,0.14)" strokeWidth={8} strokeLinecap="round" />
      <rect x={10} y={60} width={310} height={64} rx={28} style={{ fill: body }} />
      <g clipPath={`url(#${uid}-car)`}>
        <rect x={10} y={104} width={310} height={24} fill="rgba(0,0,0,0.16)" />
        {taxi ? <rect x={24} y={84} width={282} height={14} fill={`url(#${uid}-check)`} /> : null}
        <circle cx={86} cy={124} r={33} fill={pal.deep} />
        <circle cx={244} cy={124} r={33} fill={pal.deep} />
      </g>
      <path d="M168 66 V110" stroke="rgba(0,0,0,0.2)" strokeWidth={3} />
      <rect x={180} y={72} width={20} height={6} rx={3} fill="rgba(0,0,0,0.25)" />
      <rect x={305} y={70} width={15} height={16} rx={6} fill={pal.warm} />
      <rect x={10} y={70} width={10} height={16} rx={4} fill="#D9654A" />
      <Wheel cx={86} cy={124} r={27} angle={angle} pal={pal} />
      <Wheel cx={244} cy={124} r={27} angle={angle} pal={pal} />
    </g>
  );
};

export const Car: React.FC<PropArgs> = (p) => (
  <Svg kind="car">
    <CarBody {...p} body={p.color ?? p.pal.light} />
  </Svg>
);

export const Taxi: React.FC<PropArgs> = (p) => {
  const { t, pal, a, value } = p;
  const shown = `${a.prefix ?? '$'}${fmt(value, a.decimals ?? 2)}${a.suffix ?? ''}`;
  const size = Math.min(54, 340 / Math.max(4, shown.length * 0.62));
  return (
    <>
      <Svg kind="taxi">
        <rect x={120} y={92} width={90} height={32} rx={9} fill={pal.paper} />
        <text x={165} y={115} textAnchor="middle" fontFamily={t.fonts.display} fontWeight={800} fontSize={21} fill={pal.deep} letterSpacing={2}>
          TAXI
        </text>
        <CarBody {...p} body={p.color ?? '#E3B14E'} oy={100} taxi />
      </Svg>
      <At x={45} y={0} w={240} h={80} style={{ background: '#121110', borderRadius: 18, boxShadow: `inset 0 0 0 2.5px ${pal.edge}, 0 10px 26px rgba(0,0,0,0.4)` }}>
        <div style={{ fontFamily: t.fonts.mono, fontWeight: 700, fontSize: size, color: t.accent, letterSpacing: -1, textShadow: `0 0 18px ${t.accentGlow}`, fontVariantNumeric: 'tabular-nums' }}>{shown}</div>
      </At>
    </>
  );
};

export const Plane: React.FC<PropArgs> = ({ pal, color }) => (
  <Svg kind="plane">
    <path d="M140 52 L172 52 L150 22 Q147 18 142 18 L134 18 Z" fill={pal.lightShade} />
    <path d="M26 56 L12 14 Q11 8 17 8 L34 8 Q38 8 41 12 L76 56 Z" style={{ fill: color ?? pal.lightShade }} />
    <path d="M30 70 L8 84 Q5 87 10 87 L52 84 Z" fill={pal.lightShade} />
    <path d="M18 70 Q18 50 44 50 L248 50 Q284 52 296 70 Q284 90 248 90 L44 90 Q18 90 18 70 Z" fill={pal.paper} />
    <path d="M18 70 Q18 90 44 90 L248 90 Q284 90 296 70 Z" fill="rgba(0,0,0,0.08)" />
    <path d="M258 58 Q277 60 285 68 L258 68 Z" fill={pal.glass} />
    {Array.from({ length: 10 }).map((_, i) => (
      <circle key={i} cx={78 + i * 17} cy={64} r={4.4} fill={pal.glass} />
    ))}
    <path d="M118 76 L172 76 L142 122 Q139 126 133 126 L122 126 Q117 126 117 121 Z" fill={pal.lightShade} />
    <rect x={128} y={90} width={44} height={18} rx={9} fill={pal.mid} />
  </Svg>
);

// ---------- places ----------

export const Building: React.FC<PropArgs> = ({ a, pal, color }) => {
  const h = hash(a.id);
  return (
    <Svg kind="building">
      <ellipse cx={115} cy={316} rx={104} ry={6} fill={pal.shadow} />
      <rect x={22} y={26} width={186} height={290} rx={10} style={{ fill: color ?? pal.light }} />
      <rect x={14} y={16} width={202} height={20} rx={7} fill={pal.lightShade} />
      {Array.from({ length: 18 }).map((_, i) => {
        const c = i % 3;
        const r = Math.floor(i / 3);
        const lit = (h >> (i % 13)) % 4 === 0;
        return <rect key={i} x={46 + c * 52} y={54 + r * 36} width={34} height={22} rx={5} fill={lit ? pal.warm : pal.glass} />;
      })}
      <rect x={95} y={266} width={40} height={50} rx={6} fill={pal.dark} />
    </Svg>
  );
};

export const Office: React.FC<PropArgs> = ({ a, t, pal, color }) => {
  const h = hash(a.id);
  const sign = a.text ?? '';
  return (
    <>
      <Svg kind="office">
        <ellipse cx={145} cy={316} rx={130} ry={6} fill={pal.shadow} />
        <rect x={20} y={52} width={250} height={264} rx={10} style={{ fill: color ?? pal.light }} />
        <rect x={12} y={44} width={266} height={16} rx={6} fill={pal.lightShade} />
        <rect x={48} y={4} width={194} height={50} rx={12} fill={pal.dark} />
        {Array.from({ length: 16 }).map((_, i) => {
          const c = i % 4;
          const r = Math.floor(i / 4);
          const lit = (h >> (i % 11)) % 4 === 0;
          return <rect key={i} x={40 + c * 56} y={80 + r * 44} width={42} height={30} rx={5} fill={lit ? pal.warm : pal.glass} />;
        })}
        <rect x={117} y={262} width={56} height={54} rx={6} fill={pal.dark} />
        <path d="M145 264 V316" stroke={pal.edge} strokeWidth={3} />
      </Svg>
      {sign ? (
        <At x={48} y={4} w={194} h={50}>
          <div style={{ fontFamily: t.fonts.display, fontWeight: 800, fontSize: Math.min(28, 300 / Math.max(6, sign.length)), color: pal.paper, letterSpacing: 1.5, whiteSpace: 'nowrap' }}>{sign}</div>
        </At>
      ) : null}
    </>
  );
};

export const Tower: React.FC<PropArgs> = ({ t, pal, f, fps }) => {
  const on = Math.sin((f / fps) * Math.PI * 2 * 0.8) > -0.2;
  return (
    <Svg kind="tower">
      <ellipse cx={85} cy={326} rx={60} ry={5} fill={pal.shadow} />
      <rect x={46} y={300} width={78} height={26} rx={6} fill={pal.lightShade} />
      <path d="M66 150 H104 L112 304 H58 Z" fill={pal.light} />
      <path d="M28 126 H142 L120 154 H50 Z" fill={pal.lightShade} />
      <path d="M16 74 H154 L142 128 H28 Z" fill={pal.glass} />
      <path d="M50 74 V128 M85 74 V128 M120 74 V128" stroke={pal.dark} strokeWidth={4} />
      <rect x={10} y={60} width={150} height={18} rx={6} fill={pal.light} />
      <line x1={85} y1={60} x2={85} y2={24} stroke={pal.mid} strokeWidth={5} strokeLinecap="round" />
      <circle cx={85} cy={18} r={18} style={{ fill: t.accentGlow }} opacity={on ? 0.7 : 0} />
      <circle cx={85} cy={18} r={8} style={{ fill: t.accent }} opacity={on ? 1 : 0.35} />
    </Svg>
  );
};

// ---------- paper ----------

export const Document: React.FC<PropArgs> = ({ a, t, pal, color }) => {
  const pages = a.pages ?? 1;
  return (
    <>
      <Svg kind="document">
        {pages > 2 ? <rect x={30} y={26} width={140} height={188} rx={12} fill={pal.lightShade} /> : null}
        {pages > 1 ? <rect x={20} y={16} width={140} height={188} rx={12} fill={pal.paperShade} /> : null}
        <path d="M8 18 Q8 6 20 6 H112 L150 44 V186 Q150 198 138 198 H20 Q8 198 8 186 Z" fill={pal.paper} />
        <path d="M112 6 V34 Q112 44 122 44 H150 Z" fill={pal.paperShade} />
        {a.title ? null : <rect x={28} y={34} width={62} height={13} rx={6.5} style={{ fill: color ?? pal.mid }} />}
        {(a.title ? [100, 88, 102, 74, 62] : [100, 88, 102, 74, 96, 62]).map((w, i) => (
          <rect key={i} x={28} y={(a.title ? 96 : 70) + i * 20} width={w} height={9} rx={4.5} fill={pal.paperLine} />
        ))}
      </Svg>
      {a.title ? (
        <At x={22} y={50} w={116} h={34} style={{ justifyContent: 'flex-start' }}>
          <div style={{ fontFamily: t.fonts.display, fontWeight: 800, fontSize: Math.min(26, 180 / Math.max(4, a.title.length)), color: pal.ink, whiteSpace: 'nowrap' }}>{a.title}</div>
        </At>
      ) : null}
      {a.pages !== undefined ? <Tag t={t} text={`${fmt(pages)} page${pages === 1 ? '' : 's'}`} style={{ right: -34, top: -16 }} /> : null}
    </>
  );
};

export const Stack: React.FC<PropArgs> = ({ a, t, pal, value }) => {
  const n = Math.max(3, Math.min(13, Math.round(3 + 2.4 * Math.log2(1 + Math.max(0, value || 30) / 5))));
  const h = hash(a.id);
  const top = 212 - n * 15;
  const tag = a.count !== undefined || a.text ? `${a.count !== undefined ? fmt(Math.round(value)) : ''}${a.count !== undefined && a.text ? ' ' : ''}${a.text ?? ''}` : '';
  return (
    <>
      <Svg kind="stack">
        <ellipse cx={115} cy={218} rx={104} ry={7} fill={pal.shadow} />
        {Array.from({ length: n }).map((_, i) => {
          const jx = (((h >> (i % 17)) % 17) - 8) * 1.1;
          const y = 212 - (i + 1) * 15;
          return (
            <g key={i} transform={`translate(${25 + jx} ${y})`}>
              <rect width={180} height={16} rx={4} fill={i % 2 ? pal.paper : pal.paperShade} />
              <rect y={12} width={180} height={4} rx={2} fill="rgba(0,0,0,0.14)" />
            </g>
          );
        })}
      </Svg>
      {tag ? <Tag t={t} text={tag} style={{ left: '50%', top: top - 52, transform: 'translateX(-50%)' }} /> : null}
    </>
  );
};

export const Notebook: React.FC<PropArgs> = ({ a, t, pal, color }) => {
  const cover = color ?? `color-mix(in srgb, ${t.tones.info} 62%, #2b2826)`;
  return (
    <>
      <Svg kind="notebook">
        <ellipse cx={104} cy={246} rx={88} ry={5} fill={pal.shadow} />
        <rect x={24} y={12} width={170} height={232} rx={14} fill={pal.paper} />
        <rect x={12} y={6} width={172} height={232} rx={14} style={{ fill: cover }} />
        <rect x={150} y={6} width={10} height={232} fill="rgba(0,0,0,0.22)" />
        <rect x={46} y={58} width={116} height={68} rx={10} fill={pal.paper} />
        {Array.from({ length: 9 }).map((_, i) => (
          <g key={i}>
            <circle cx={22} cy={30 + i * 24} r={4} fill={pal.deep} />
            <rect x={2} y={25 + i * 24} width={22} height={10} rx={5} fill={pal.metal} />
          </g>
        ))}
      </Svg>
      {a.title ? (
        <At x={50} y={60} w={108} h={64}>
          <div style={{ fontFamily: t.fonts.display, fontWeight: 800, fontSize: a.title.length > 8 ? 22 : 26, lineHeight: 1.05, color: pal.ink }}>{a.title}</div>
        </At>
      ) : null}
    </>
  );
};

const DRAWER_ICONS = ['utensils', 'scissors', 'cooking-pot', 'wrench', 'egg', 'hammer', 'ruler', 'paperclip'];

export const Drawer: React.FC<PropArgs> = ({ a, pal, color }) => {
  const open = a.open !== false;
  const icons = (a.icons && a.icons.length ? a.icons : DRAWER_ICONS).slice(0, 8);
  const front = color ?? pal.light;
  const per = Math.ceil(icons.length / 2);
  return (
    <>
      {open ? (
        <Svg kind="drawer">
          <path d="M30 26 H310 L328 152 H12 Z" fill={pal.deep} />
          <path d="M30 26 H310 L328 152 H12 Z" fill="none" stroke={pal.edge} strokeWidth={4} strokeLinejoin="round" />
          <path d="M30 26 L12 152 L36 152 L48 40 Z" fill="rgba(255,255,255,0.05)" />
        </Svg>
      ) : null}
      {open
        ? icons.map((name, i) => {
            const row = i < per ? 0 : 1;
            const col = row ? i - per : i;
            const cols = row ? icons.length - per : per;
            const x = (row ? 40 : 58) + ((col + 0.5) * (row ? 260 : 224)) / cols;
            const y = row ? 112 : 58;
            const rot = (((hash(name) + i * 7) % 5) - 2) * 9;
            return (
              <div key={i} style={{ position: 'absolute', left: x - 26, top: y - 26, width: 52, height: 52, transform: `rotate(${rot}deg)` }}>
                <Glyph name={name} size={52} color={pal.paper} stroke={2.4} />
              </div>
            );
          })
        : null}
      <Svg kind="drawer">
        <ellipse cx={170} cy={236} rx={160} ry={6} fill={pal.shadow} />
        {!open ? (
          <>
            <rect x={4} y={64} width={332} height={80} rx={14} style={{ fill: front }} />
            <rect x={134} y={96} width={72} height={14} rx={7} fill={pal.dark} />
          </>
        ) : null}
        <rect x={4} y={146} width={332} height={84} rx={14} style={{ fill: front }} />
        <rect x={4} y={146} width={332} height={10} rx={5} fill="rgba(255,255,255,0.18)" />
        <rect x={134} y={180} width={72} height={14} rx={7} fill={pal.dark} />
      </Svg>
    </>
  );
};

// ---------- devices ----------

const ScreenContent: React.FC<{ t: Theme; a: StoryActor; x: number; y: number; w: number; h: number; size: number; pal: Pal; color?: string }> = ({ t, a, x, y, w, h, size, color }) => (
  <At x={x} y={y} w={w} h={h} style={{ padding: 10, boxSizing: 'border-box' }}>
    {a.text ? (
      <div style={{ fontFamily: t.fonts.display, fontWeight: 700, fontSize: size, lineHeight: 1.12, color: t.name === 'clay-light' ? '#F4F1EC' : t.text }}>{a.text}</div>
    ) : a.icon ? (
      <Glyph name={a.icon} size={Math.min(w, h) * 0.5} color={color ?? t.accent} stroke={2.2} />
    ) : null}
  </At>
);

export const Monitor: React.FC<PropArgs> = ({ a, t, pal, color }) => (
  <>
    <Svg kind="monitor">
      <ellipse cx={150} cy={232} rx={84} ry={5} fill={pal.shadow} />
      <path d="M128 186 H172 L180 220 H120 Z" fill={pal.mid} />
      <rect x={88} y={214} width={124} height={14} rx={7} fill={pal.lightShade} />
      <rect x={4} y={4} width={292} height={184} rx={18} fill={pal.dark} stroke={pal.edge} strokeWidth={3} />
      <rect x={18} y={18} width={264} height={156} rx={9} fill={pal.screen} />
      {!a.text && !a.icon ? (
        <>
          <rect x={40} y={44} width={110} height={16} rx={8} style={{ fill: color ?? t.accent }} />
          <rect x={40} y={76} width={212} height={10} rx={5} fill="#4C5560" />
          <rect x={40} y={98} width={180} height={10} rx={5} fill="#4C5560" />
          <rect x={40} y={120} width={196} height={10} rx={5} fill="#4C5560" />
          <rect x={40} y={142} width={120} height={10} rx={5} fill="#4C5560" />
        </>
      ) : null}
    </Svg>
    <ScreenContent t={t} a={a} pal={pal} color={color} x={18} y={18} w={264} h={156} size={a.text && a.text.length > 18 ? 26 : 32} />
  </>
);

export const Phone: React.FC<PropArgs> = ({ a, t, pal, color }) => (
  <>
    <Svg kind="phone">
      <ellipse cx={75} cy={268} rx={56} ry={4} fill={pal.shadow} />
      <rect x={6} y={4} width={138} height={260} rx={30} fill={pal.dark} stroke={pal.edge} strokeWidth={3} />
      <rect x={16} y={16} width={118} height={236} rx={22} fill={pal.screen} />
      <rect x={55} y={24} width={40} height={11} rx={5.5} fill={pal.deep} />
      {!a.text && !a.icon ? (
        <>
          <circle cx={75} cy={120} r={34} style={{ fill: color ?? t.tones.good }} />
          <rect x={42} y={182} width={66} height={10} rx={5} fill="#4C5560" />
          <rect x={50} y={202} width={50} height={10} rx={5} fill="#4C5560" />
        </>
      ) : null}
    </Svg>
    {!a.text && !a.icon ? (
      <At x={41} y={86} w={68} h={68}>
        <Glyph name="phone" size={36} color="#fff" stroke={2.6} />
      </At>
    ) : (
      <ScreenContent t={t} a={a} pal={pal} color={color} x={16} y={40} w={118} h={200} size={26} />
    )}
  </>
);

export const Headset: React.FC<PropArgs> = ({ t, pal, color }) => (
  <Svg kind="headset">
    <path d="M30 86 C30 24 120 24 120 86" fill="none" style={{ stroke: color ?? pal.light }} strokeWidth={12} strokeLinecap="round" />
    <rect x={14} y={70} width={34} height={54} rx={14} style={{ fill: color ?? pal.light }} />
    <rect x={102} y={70} width={34} height={54} rx={14} style={{ fill: color ?? pal.light }} />
    <rect x={40} y={80} width={9} height={34} rx={4} fill={pal.dark} />
    <rect x={101} y={80} width={9} height={34} rx={4} fill={pal.dark} />
    <path d="M30 120 C36 142 64 148 86 140" fill="none" style={{ stroke: color ?? pal.light }} strokeWidth={7} strokeLinecap="round" />
    <ellipse cx={93} cy={138} rx={12} ry={10} style={{ fill: t.accent }} />
  </Svg>
);

export const PROPS: Partial<Record<StoryActor['kind'], React.FC<PropArgs>>> = {
  person: Person,
  car: Car,
  taxi: Taxi,
  plane: Plane,
  building: Building,
  office: Office,
  tower: Tower,
  document: Document,
  stack: Stack,
  notebook: Notebook,
  drawer: Drawer,
  monitor: Monitor,
  phone: Phone,
  headset: Headset,
};
