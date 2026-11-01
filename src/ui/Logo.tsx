import React from 'react';
import { Img, staticFile } from 'remotion';
import { useTheme } from '../theme/ThemeContext';

// Logo tile. "claude" draws the orange starburst tile; any other value is treated as an image path
// in the work dir (e.g. "assets/logo.png").
export const ClaudeMark: React.FC<{ size: number; color?: string }> = ({ size, color = '#fff' }) => {
  const rays = 12;
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100">
      {Array.from({ length: rays }).map((_, i) => {
        const a = (i / rays) * Math.PI * 2 + (i % 2 ? 0.08 : 0);
        const len = i % 3 === 0 ? 40 : i % 3 === 1 ? 34 : 37;
        return <line key={i} x1={Math.cos(a) * 7} y1={Math.sin(a) * 7} x2={Math.cos(a) * len} y2={Math.sin(a) * len} stroke={color} strokeWidth={9} strokeLinecap="round" />;
      })}
    </svg>
  );
};

export const Logo: React.FC<{ name: string; size: number }> = ({ name, size }) => {
  const t = useTheme();
  if (name === 'claude') {
    return (
      <div style={{ width: size, height: size, borderRadius: size * 0.2, background: '#f0572e', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 24px ${t.accentGlow}` }}>
        <ClaudeMark size={size * 0.72} />
      </div>
    );
  }
  return <Img src={staticFile(name)} style={{ width: size, height: size, objectFit: 'contain', borderRadius: size * 0.2 }} />;
};
