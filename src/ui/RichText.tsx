import React from 'react';
import { useTheme } from '../theme/ThemeContext';

// `*word*` in on-screen text renders in the accent colour.
export const RichText: React.FC<{ text: string; accent?: string }> = ({ text, accent }) => {
  const t = useTheme();
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('*') && p.endsWith('*') && p.length > 2 ? (
          <span key={i} style={{ color: accent ?? t.accent }}>{p.slice(1, -1)}</span>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        ),
      )}
    </>
  );
};
