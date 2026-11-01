import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { useLook, useTheme } from '../theme/ThemeContext';

// Warm near-black stage with a radial vignette.
export const Vignette: React.FC = () => {
  const t = useTheme();
  if (useLook() === 'panel') return null;
  return <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 70% at 50% 45%, ${t.bg} 0%, ${t.bgEdge} 100%)` }} />;
};

// World-space dot grid (44 px pitch). `offset` lets a camera move the grid with the content.
export const DotGrid: React.FC<{ pitch?: number; size?: number; offset?: [number, number]; scale?: number; drift?: boolean }> = ({
  pitch = 44,
  size = 3,
  offset = [0, 0],
  scale = 1,
  drift = true,
}) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const id = `sp-dotgrid-${useId().replace(/:/g, '')}`;
  const p = pitch * scale;
  const d = drift ? frame * 0.25 : 0;
  const ox = (((offset[0] + d) % p) + p) % p;
  const oy = (((offset[1] + d * 0.5) % p) + p) % p;
  return (
    <AbsoluteFill>
      <svg width="100%" height="100%">
        <defs>
          <pattern id={id} width={p} height={p} patternUnits="userSpaceOnUse" x={ox} y={oy}>
            <circle cx={p / 2} cy={p / 2} r={(size * scale) / 2} fill={t.dot} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

// The stage floor: a field of dots below a slowly drifting, stepped "horizon" (procedural, not
// audio-reactive, exactly like the reference).
export const DotWave: React.FC<{ horizon?: number; amp?: number; pitch?: number }> = ({ horizon = 0.62, amp = 55, pitch = 12 }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const uid = useId().replace(/:/g, '');
  const time = frame / fps;
  const cols = Math.ceil(width / pitch) + 1;
  const pts: string[] = [];
  for (let i = 0; i < cols; i++) {
    const x = i * pitch;
    const y =
      height * horizon +
      amp * 0.55 * Math.sin(x / 260 + time * 0.55) +
      amp * 0.3 * Math.sin(x / 140 - time * 0.9 + 1.3) +
      amp * 0.15 * Math.sin(x / 75 + time * 1.6 + 2.1);
    const q = Math.round(y / pitch) * pitch;
    pts.push(`${x},${q}`, `${x + pitch},${q}`);
  }
  const poly = `0,${height} ${pts.join(' ')} ${width},${height}`;
  return (
    <AbsoluteFill>
      <svg width={width} height={height}>
        <defs>
          <pattern id={`sp-dotwave-${uid}`} width={pitch} height={pitch} patternUnits="userSpaceOnUse">
            <circle cx={pitch / 2} cy={pitch / 2} r={2.2} fill={t.dotBright} />
          </pattern>
          <linearGradient id={`sp-dotwave-fade-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset={horizon - 0.08} stopColor="#fff" stopOpacity={0.15} />
            <stop offset={horizon + 0.12} stopColor="#fff" stopOpacity={0.55} />
            <stop offset={1} stopColor="#fff" stopOpacity={0.35} />
          </linearGradient>
          <mask id={`sp-dotwave-mask-${uid}`}>
            <rect width={width} height={height} fill={`url(#sp-dotwave-fade-${uid})`} />
          </mask>
          <clipPath id={`sp-dotwave-clip-${uid}`}>
            <polygon points={poly} />
          </clipPath>
        </defs>
        <g clipPath={`url(#sp-dotwave-clip-${uid})`} mask={`url(#sp-dotwave-mask-${uid})`}>
          <rect width={width} height={height} fill={`url(#sp-dotwave-${uid})`} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

export const StageBackground: React.FC<{ wave?: boolean }> = ({ wave = true }) => {
  const panelLook = useLook() === 'panel';
  if (panelLook) return <AbsoluteFill style={{ backgroundImage: 'radial-gradient(ellipse 72% 62% at 50% 44%, rgba(226,119,78,0.09) 0%, rgba(18,18,18,0) 70%)' }} />;
  return (
    <AbsoluteFill>
      <Vignette />
      {wave ? <DotWave /> : <DotGrid />}
    </AbsoluteFill>
  );
};
