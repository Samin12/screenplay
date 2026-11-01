import React from 'react';
import { icons, type LucideProps } from 'lucide-react';
import type { UiState } from '../../app/replica';
import { isHover, isPressed } from '../../app/replica';

// Small building blocks shared by the replicas. Everything here is a pure function of props.

export const FONT_UI = '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

// "Move to section" -> "move-to-section". Used to build target names from data labels.
export const slug = (s: string) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toPascal = (s: string) => s.replace(/(^|[-_ ])(\w)/g, (_, __, c: string) => c.toUpperCase());

// Lucide icon by kebab name. Unknown names render nothing (never crash a render).
export const Ico: React.FC<{ name: string; size: number; color: string; stroke?: number; style?: React.CSSProperties }> = ({ name, size, color, stroke = 1.75, style }) => {
  const C = (icons as Record<string, React.FC<LucideProps>>)[toPascal(name)];
  if (!C) return <span style={{ display: 'inline-block', width: size, height: size, ...style }} />;
  return <C size={size} color={color} strokeWidth={stroke} style={{ flexShrink: 0, display: 'block', ...style }} />;
};

// Interactive fill: pressed > hover > active > base.
export const fill = (ui: UiState, target: string, o: { base?: string; hover: string; pressed?: string; active?: boolean; activeBg?: string }) => {
  if (isPressed(ui, target)) return o.pressed ?? o.hover;
  if (isHover(ui, target)) return o.hover;
  if (o.active) return o.activeBg ?? o.hover;
  return o.base ?? 'transparent';
};

// macOS window buttons. 1.5x of the real 12 px lights.
export const TrafficLights: React.FC<{ size?: number; gap?: number; dim?: boolean }> = ({ size = 18, gap = 12, dim }) => (
  <div style={{ display: 'flex', gap, alignItems: 'center' }}>
    {(dim ? ['#4a4a4a', '#4a4a4a', '#4a4a4a'] : ['#ff5f57', '#febc2e', '#28c840']).map((c, i) => (
      <div key={i} style={{ width: size, height: size, borderRadius: '50%', background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.18)' }} />
    ))}
  </div>
);

// Windows caption buttons (min / max / close), drawn as thin glyphs.
export const WinControls: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
    {['minus', 'copy', 'x'].map((n) => (
      <div key={n} style={{ width: 66, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Ico name={n} size={n === 'copy' ? 19 : 22} color={color} stroke={1.4} />
      </div>
    ))}
  </div>
);

// Toggle switch (1.5x of a 32x18 switch).
export const Switch: React.FC<{ on: boolean; target?: string; ui: UiState; w?: number; h?: number; onColor?: string }> = ({ on, target, ui, w = 50, h = 28, onColor = '#4d79d3' }) => {
  const hov = target && (isHover(ui, target) || isPressed(ui, target));
  const pad = 3;
  const k = h - pad * 2;
  return (
    <div
      data-target={target}
      style={{
        width: w,
        height: h,
        borderRadius: h,
        background: on ? onColor : hov ? '#4a4a4a' : '#3a3a3a',
        boxShadow: on ? 'none' : 'inset 0 0 0 1px #4a4a4a',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <div style={{ position: 'absolute', top: pad, left: on ? w - k - pad : pad, width: k, height: k, borderRadius: '50%', background: on ? '#ffffff' : '#d6d6d6', boxShadow: '0 1px 2px rgba(0,0,0,0.35)' }} />
    </div>
  );
};

// Rotating arc spinner driven by ui.frame (no CSS animation).
export const Spinner: React.FC<{ size: number; color: string; track?: string; ui: UiState; stroke?: number }> = ({ size, color, track = 'transparent', ui, stroke = 2.5 }) => {
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const rot = (ui.frame * 14) % 360;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0, display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c * 0.3} ${c}`}
        transform={`rotate(${rot} ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};

// Progress ring (context usage indicator next to the model picker).
export const Ring: React.FC<{ size: number; pct: number; color: string; track: string; stroke?: number }> = ({ size, pct, color, track, stroke = 3 }) => {
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0, display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(c * Math.max(0, Math.min(100, pct))) / 100} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};

// The Claude starburst (orange). Used sparingly: logo, empty state, thinking glyph.
export const ClaudeStar: React.FC<{ size: number; color?: string; spin?: number }> = ({ size, color = '#d97757', spin = 0 }) => {
  const rays = 11;
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ flexShrink: 0, display: 'block' }}>
      <g transform={`rotate(${spin})`}>
        {Array.from({ length: rays }).map((_, i) => {
          const a = (i / rays) * Math.PI * 2 - Math.PI / 2 + (i % 2 ? 0.07 : 0);
          const len = i % 3 === 0 ? 46 : i % 3 === 1 ? 38 : 42;
          return <line key={i} x1={Math.cos(a) * 6} y1={Math.sin(a) * 6} x2={Math.cos(a) * len} y2={Math.sin(a) * len} stroke={color} strokeWidth={10} strokeLinecap="round" />;
        })}
      </g>
    </svg>
  );
};

// Inline markup used in message text: `code`, **bold**, *dim*.
export const Inline: React.FC<{ text: string; code?: React.CSSProperties; bold?: React.CSSProperties; dim?: React.CSSProperties }> = ({ text, code, bold, dim }) => {
  const parts = String(text ?? '').split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('`') && p.endsWith('`') && p.length > 1) return <span key={i} style={code}>{p.slice(1, -1)}</span>;
        if (p.startsWith('**') && p.endsWith('**') && p.length > 3) return <strong key={i} style={{ fontWeight: 600, ...bold }}>{p.slice(2, -2)}</strong>;
        if (p.startsWith('*') && p.endsWith('*') && p.length > 1) return <span key={i} style={dim}>{p.slice(1, -1)}</span>;
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
};

// Blinking caret (uses the shared caretOn timing upstream; this is just the bar).
export const Caret: React.FC<{ on: boolean; h: number; color?: string; w?: number }> = ({ on, h, color = '#ffffff', w = 2 }) => (
  <span style={{ display: 'inline-block', width: w, height: h, background: on ? color : 'transparent', marginLeft: 2, verticalAlign: 'middle', transform: 'translateY(-2px)' }} />
);

// Shallow merge of data over defaults, plus one level deeper for the listed object keys, so a
// partial override like `context: {pct: 12}` keeps the default rows instead of crashing.
export const mergeData = <T extends Record<string, any>>(defaults: T, raw: Partial<T> | undefined, deep: (keyof T)[]): T => {
  const out: Record<string, any> = { ...defaults, ...(raw ?? {}) };
  for (const k of deep) {
    const d = defaults[k];
    const r = raw?.[k];
    if (r === null) out[k as string] = null;
    else if (d && r && typeof d === 'object' && typeof r === 'object' && !Array.isArray(d) && !Array.isArray(r)) out[k as string] = { ...d, ...r };
  }
  return out as T;
};
