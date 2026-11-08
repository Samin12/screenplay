import React from 'react';
import type { UiState } from '../../app/replica';
import { PROVIDER_ICONS } from './icons';
import { C } from './tokens';

// SVG glyphs for the OpenUsage replica: provider marks (from the app's own icon set), the app icon,
// and the few SF Symbols the panel uses that lucide doesn't draw the same way.

export const ProviderIcon: React.FC<{ id: string; size: number; color?: string; style?: React.CSSProperties }> = ({ id, size, color = C.icon, style }) => {
  const def = PROVIDER_ICONS[id] ?? PROVIDER_ICONS.openusage;
  return (
    <svg width={size} height={size} viewBox={def.viewBox} style={{ display: 'block', flexShrink: 0, color, ...style }}>
      {def.paths.map((p, i) => (
        <path key={i} d={p.d} fill="currentColor" fillRule={p.evenOdd ? 'evenodd' : undefined} clipRule={p.evenOdd ? 'evenodd' : undefined} />
      ))}
    </svg>
  );
};

// OpenUsage app icon: blue squircle with a white gauge (as on the welcome screen and openusage.ai).
export const AppIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', flexShrink: 0 }}>
    <defs>
      <linearGradient id="ou-app" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4d9bff" />
        <stop offset="1" stopColor="#1f66ea" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="92" height="92" rx="22" fill="url(#ou-app)" />
    <circle cx="50" cy="53" r="29" fill="none" stroke="#fff" strokeWidth="7" />
    <circle cx="50" cy="53" r="20" fill="rgba(255,255,255,0.18)" />
    {[-60, -30, 0, 30, 60].map((a) => {
      const r = (a * Math.PI) / 180;
      return <line key={a} x1={50 + Math.sin(r) * 16} y1={53 - Math.cos(r) * 16} x2={50 + Math.sin(r) * 20} y2={53 - Math.cos(r) * 20} stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />;
    })}
    <line x1="50" y1="53" x2="62" y2="40" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    <circle cx="50" cy="53" r="4.5" fill="#fff" />
  </svg>
);

export const AppleLogo: React.FC<{ size: number; color?: string }> = ({ size, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
    <path
      fill={color}
      d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
    />
  </svg>
);

// SF "flame.fill" in red: the limit-reached / will-run-out marker.
export const Flame: React.FC<{ size: number; color?: string }> = ({ size, color = C.flame }) => (
  <svg width={size * 0.8} height={size} viewBox="0 0 16 20" style={{ display: 'block', flexShrink: 0 }}>
    <path
      fill={color}
      d="M8.2 0.6c0.4 2.6-0.6 4.1-2.1 5.8C4.4 8.3 2.4 10.4 2.4 13.4c0 3.4 2.6 5.9 5.8 5.9s5.6-2.4 5.6-5.6c0-2.3-1.1-4.1-2-5.2 0.1 1.2-0.3 2.4-1.3 3 0.2-3.6-0.8-7.6-2.3-10.9zM8.1 18c-1.6 0-2.9-1.2-2.9-2.9 0-1.9 1.5-2.8 2.4-4.4 0.3 1.3 1.1 1.8 1.7 2.5 0.5 0.6 0.9 1.2 0.9 2 0 1.6-0.9 2.8-2.1 2.8z"
    />
  </svg>
);

export const Battery: React.FC<{ w: number; color?: string; pct?: number }> = ({ w, color = '#fff', pct = 0.82 }) => {
  const h = w * 0.46;
  return (
    <svg width={w} height={h} viewBox="0 0 50 23" style={{ display: 'block' }}>
      <rect x="1" y="1" width="43" height="21" rx="6" fill="none" stroke={color} strokeOpacity="0.55" strokeWidth="2" />
      <rect x="4" y="4" width={37 * pct} height="15" rx="3.5" fill={color} />
      <path d="M46.5 8.5c1.6 0.4 2.5 1.6 2.5 3s-0.9 2.6-2.5 3z" fill={color} fillOpacity="0.55" />
    </svg>
  );
};

export const ControlCenter: React.FC<{ size: number; color?: string }> = ({ size, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
    <rect x="2.5" y="4" width="19" height="7" rx="3.5" fill="none" stroke={color} strokeWidth="1.7" />
    <circle cx="8" cy="7.5" r="2.2" fill={color} />
    <rect x="2.5" y="13" width="19" height="7" rx="3.5" fill="none" stroke={color} strokeWidth="1.7" />
    <circle cx="16" cy="16.5" r="2.2" fill={color} />
  </svg>
);

// macOS small activity indicator (8 spokes), driven by ui.frame.
export const MacSpinner: React.FC<{ size: number; ui: UiState; color?: string }> = ({ size, ui, color = '#555' }) => {
  const step = Math.floor(ui.frame / 3) % 8;
  return (
    <svg width={size} height={size} viewBox="-10 -10 20 20" style={{ display: 'block', flexShrink: 0 }}>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const age = (step - i + 8) % 8;
        return (
          <line key={i} x1={Math.sin(a) * 4.2} y1={-Math.cos(a) * 4.2} x2={Math.sin(a) * 8.6} y2={-Math.cos(a) * 8.6} stroke={color} strokeWidth="2.1" strokeLinecap="round" opacity={1 - age * 0.11} />
        );
      })}
    </svg>
  );
};

// SwiftUI small switch (light).
export const MacSwitch: React.FC<{ on: boolean; target?: string; w?: number; ui: UiState; hover?: boolean }> = ({ on, target, w = 46, hover }) => {
  const h = Math.round(w * 0.58);
  const k = h - 4;
  return (
    <div data-target={target} style={{ width: w, height: h, borderRadius: h, background: on ? C.accent : hover ? '#d4d4d4' : '#e2e2e2', position: 'relative', flexShrink: 0, boxShadow: on ? 'none' : 'inset 0 0 0 1px rgba(0,0,0,0.06)' }}>
      <div style={{ position: 'absolute', top: 2, left: on ? w - k - 2 : 2, width: k, height: k, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2.5px rgba(0,0,0,0.3)' }} />
    </div>
  );
};

// SF "chevron.*" drawn as a stroked path so weight matches the app.
export const Chevron: React.FC<{ dir: 'down' | 'up' | 'left' | 'right'; size: number; color: string; weight?: number }> = ({ dir, size, color, weight = 2.2 }) => {
  const d = {
    down: 'M3 6 L10 13 L17 6',
    up: 'M3 13 L10 6 L17 13',
    left: 'M13 3 L6 10 L13 17',
    right: 'M7 3 L14 10 L7 17',
  }[dir];
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block', flexShrink: 0 }}>
      <path d={d} fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// SF "line.3.horizontal" reorder grip.
export const Grip: React.FC<{ size: number; color?: string }> = ({ size, color = C.tertiary }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block', flexShrink: 0 }}>
    {[5.5, 10, 14.5].map((y) => (
      <line key={y} x1="3" y1={y} x2="17" y2={y} stroke={color} strokeWidth="2" strokeLinecap="round" />
    ))}
  </svg>
);

// SF "xmark.circle.fill" (hierarchical) for the sheet's close button.
export const CloseCircle: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block' }}>
    <circle cx="10" cy="10" r="9" fill="rgba(0,0,0,0.16)" />
    <path d="M6.8 6.8 L13.2 13.2 M13.2 6.8 L6.8 13.2" stroke="rgba(0,0,0,0.6)" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
