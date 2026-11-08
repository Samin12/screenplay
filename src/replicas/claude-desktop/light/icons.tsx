import React from 'react';

// Hand-drawn glyphs for the light (samin) look where lucide has no close match. All take the glyph
// box size in design px and a colour; strokes are ~2 px like his retina SF Symbols at this scale.

type P = { size?: number; color?: string; stroke?: number; style?: React.CSSProperties };

const svg = (w: number, h: number, children: React.ReactNode, style?: React.CSSProperties) => (
  <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', flexShrink: 0, overflow: 'visible', ...style }}>
    {children}
  </svg>
);

// Chat tab: round speech bubble with a magnifier at its lower right.
export const ChatSearchIcon: React.FC<P> = ({ size = 26, color = '#141414', stroke = 2 }) =>
  svg(
    size,
    size,
    <g fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${size * 0.5} ${size * 0.86} A ${size * 0.4} ${size * 0.4} 0 1 1 ${size * 0.88} ${size * 0.42}`} />
      <path d={`M${size * 0.5} ${size * 0.86} L${size * 0.16} ${size * 0.86} L${size * 0.2} ${size * 0.7}`} />
      <circle cx={size * 0.72} cy={size * 0.7} r={size * 0.15} />
      <path d={`M${size * 0.83} ${size * 0.81} L${size * 0.94} ${size * 0.92}`} />
    </g>,
  );

// Session rail toggle: rounded square with two bullet rows.
export const RailIcon: React.FC<P> = ({ size = 26, color = '#141414', stroke = 2 }) =>
  svg(
    size,
    size,
    <g fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round">
      <rect x={1} y={2} width={size - 2} height={size - 4} rx={size * 0.2} />
      <circle cx={size * 0.3} cy={size * 0.38} r={0.6} fill={color} strokeWidth={stroke * 1.2} />
      <circle cx={size * 0.3} cy={size * 0.62} r={0.6} fill={color} strokeWidth={stroke * 1.2} />
      <path d={`M${size * 0.45} ${size * 0.38} H${size * 0.74} M${size * 0.45} ${size * 0.62} H${size * 0.74}`} />
    </g>,
  );

// Changes / diff: rounded square with a plus over a minus.
export const DiffIcon: React.FC<P> = ({ size = 26, color = '#141414', stroke = 2 }) =>
  svg(
    size,
    size,
    <g fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round">
      <rect x={1.5} y={1.5} width={size - 3} height={size - 3} rx={size * 0.16} />
      <path d={`M${size * 0.5} ${size * 0.26} V${size * 0.54} M${size * 0.36} ${size * 0.4} H${size * 0.64} M${size * 0.36} ${size * 0.72} H${size * 0.64}`} />
    </g>,
  );

// Microphone (SF Symbols proportions: capsule, cradle arc, stem).
export const MicIcon: React.FC<P> = ({ size = 26, color = '#141414', stroke = 2 }) =>
  svg(
    size,
    size,
    <g fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round">
      <rect x={size * 0.33} y={1} width={size * 0.34} height={size * 0.6} rx={size * 0.17} />
      <path d={`M${size * 0.12} ${size * 0.46} A ${size * 0.38} ${size * 0.36} 0 0 0 ${size * 0.88} ${size * 0.46}`} />
      <path d={`M${size * 0.5} ${size * 0.82} V${size - 1}`} />
    </g>,
  );

// Small filled disclosure triangle: right (collapsed) or down.
export const Tri: React.FC<{ dir?: 'right' | 'down'; w?: number; h?: number; color?: string; style?: React.CSSProperties }> = ({ dir = 'right', w = 8, h = 10, color = '#595959', style }) =>
  dir === 'right'
    ? svg(w, h, <path d={`M1 1 L${w - 0.5} ${h / 2} L1 ${h - 1} Z`} fill={color} stroke={color} strokeWidth={1} strokeLinejoin="round" />, style)
    : svg(h, w, <path d={`M1 1 L${h - 1} 1 L${h / 2} ${w - 0.5} Z`} fill={color} stroke={color} strokeWidth={1} strokeLinejoin="round" />, style);

// Thin chevron (title bar, footer, menus).
export const Chev: React.FC<{ dir?: 'down' | 'right' | 'left'; w?: number; color?: string; stroke?: number; style?: React.CSSProperties }> = ({ dir = 'down', w = 16, color = '#141414', stroke = 2, style }) => {
  const h = w * 0.56;
  if (dir === 'down') return svg(w, h, <path d={`M1 1 L${w / 2} ${h - 1} L${w - 1} 1`} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />, style);
  const p = dir === 'right' ? `M1 1 L${h - 1} ${w / 2} L1 ${w - 1}` : `M${h - 1} 1 L1 ${w / 2} L${h - 1} ${w - 1}`;
  return svg(h, w, <path d={p} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />, style);
};

// Check mark (model menu, environment card).
export const CheckIcon: React.FC<P> = ({ size = 22, color = '#2a78d6', stroke = 2.2 }) =>
  svg(size, size, <path d={`M2 ${size * 0.55} L${size * 0.38} ${size * 0.88} L${size - 1.5} ${size * 0.14}`} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />);

// Context window card glyph: circle with a filled quarter wedge.
export const PieIcon: React.FC<P> = ({ size = 23, color = '#555555', stroke = 1.8 }) =>
  svg(
    size,
    size,
    <g fill="none" stroke={color} strokeWidth={stroke} strokeLinejoin="round">
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 1} />
      <path d={`M${size / 2} ${size * 0.24} V${size / 2} H${size * 0.76} A ${size * 0.26} ${size * 0.26} 0 0 0 ${size / 2} ${size * 0.24} Z`} />
    </g>,
  );

// Pointer arrow (Remote Control row).
export const PointerIcon: React.FC<P> = ({ size = 24, color = '#555555', stroke = 1.8 }) =>
  svg(size, size, <path d={`M${size * 0.22} ${size * 0.1} L${size * 0.22} ${size * 0.78} L${size * 0.4} ${size * 0.62} L${size * 0.54} ${size * 0.92} L${size * 0.66} ${size * 0.86} L${size * 0.52} ${size * 0.57} L${size * 0.76} ${size * 0.57} Z`} fill="none" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />);

// Sidebar toggle (SF "sidebar.left"): wide rounded rect with a short bar near the left edge.
export const SidebarIcon: React.FC<P> = ({ size = 27, color = '#141414', stroke = 2 }) =>
  svg(
    size,
    size,
    <g fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round">
      <rect x={1} y={size * 0.16} width={size - 2} height={size * 0.68} rx={size * 0.16} />
      <path d={`M${size * 0.3} ${size * 0.34} V${size * 0.66}`} strokeWidth={stroke * 1.15} />
    </g>,
  );

// Artifacts: a rounded card with a second one tilted behind it.
export const ArtifactsIcon: React.FC<P> = ({ size = 25, color = '#141414', stroke = 1.9 }) =>
  svg(
    size,
    size,
    <g fill="none" stroke={color} strokeWidth={stroke} strokeLinejoin="round">
      <rect x={size * 0.08} y={size * 0.3} width={size * 0.5} height={size * 0.62} rx={size * 0.1} />
      <path d={`M${size * 0.38} ${size * 0.3} L${size * 0.46} ${size * 0.12} Q${size * 0.5} ${size * 0.04} ${size * 0.6} ${size * 0.08} L${size * 0.88} ${size * 0.2} Q${size * 0.96} ${size * 0.25} ${size * 0.92} ${size * 0.34} L${size * 0.74} ${size * 0.76} Q${size * 0.7} ${size * 0.84} ${size * 0.6} ${size * 0.8}`} />
    </g>,
  );

// Customize: briefcase without the centre band.
export const BriefcaseIcon: React.FC<P> = ({ size = 25, color = '#141414', stroke = 1.9 }) =>
  svg(
    size,
    size,
    <g fill="none" stroke={color} strokeWidth={stroke} strokeLinejoin="round">
      <rect x={1} y={size * 0.3} width={size - 2} height={size * 0.6} rx={size * 0.14} />
      <path d={`M${size * 0.32} ${size * 0.3} V${size * 0.2} Q${size * 0.32} ${size * 0.1} ${size * 0.42} ${size * 0.1} H${size * 0.58} Q${size * 0.68} ${size * 0.1} ${size * 0.68} ${size * 0.2} V${size * 0.3}`} />
    </g>,
  );
