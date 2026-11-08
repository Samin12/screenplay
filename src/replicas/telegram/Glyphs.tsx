import React from 'react';
import { Img, staticFile } from 'remotion';

// Drawn because lucide has no match, plus the avatars: the bot's is a black and white portrait in the
// spirit of his real one. A work-dir image overrides it with data.bot.avatar.

const PORTRAIT = (
  <>
    <rect x="0" y="0" width="100" height="100" fill="#fff" />
    <g transform="rotate(-5 50 50)">
      <path d="M14 104 C5 68 8 16 50 8 C92 16 95 68 86 104 Z" fill="#050505" />
      <path d="M38 76 L62 76 L66 88 L78 104 L22 104 L34 88 Z" fill="#fff" />
      <path d="M36 36 L64 36 L65 58 Q63 72 50 79 Q37 72 35 58 Z" fill="#fff" />
      <path d="M31 50 L31 25 Q50 12 69 25 L69 50 L63 44 L57 47 L50 44 L43 47 L37 44 Z" fill="#050505" />
      <path d="M38.5 55.5 Q43 50.5 47.5 54.5 Q43 57.5 38.5 55.5 Z M52.5 54.5 Q57 50.5 61.5 55.5 Q57 57.5 52.5 54.5 Z" fill="#050505" />
      <path d="M49.5 60.5 L51 64.5 L49 65" stroke="#050505" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M44.5 70 Q47.5 68 50 69 Q52.5 68 55.5 70 Q50 73.5 44.5 70 Z" fill="#050505" />
      <path d="M24 34 Q30 19 46 14.5 M72 21 Q78 28 80 40" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M21 56 Q18 72 21 90 M26 62 Q24 74 26 86 M79 56 Q82 72 79 90 M74 62 Q76 74 74 86" stroke="#fff" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M38 88 L50 96 L62 88" stroke="#050505" strokeWidth="1.2" fill="none" />
    </g>
  </>
);

const imgStyle = (size: number, radius: number): React.CSSProperties => ({ width: size, height: size, borderRadius: radius, objectFit: 'cover', display: 'block', flexShrink: 0 });

export const BotAvatar: React.FC<{ size: number; src?: string }> = ({ size, src }) =>
  src ? (
    <Img src={staticFile(src)} style={imgStyle(size, size / 2)} />
  ) : (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', flexShrink: 0, borderRadius: '50%' }}>
      {PORTRAIT}
    </svg>
  );

// The forum's avatar: the portrait repeated, in Telegram's rounded square for forums.
export const TeamAvatar: React.FC<{ size: number; src?: string }> = ({ size, src }) =>
  src ? (
    <Img src={staticFile(src)} style={imgStyle(size, size * 0.27)} />
  ) : (
    <svg width={size} height={size} viewBox="0 0 300 300" style={{ display: 'block', flexShrink: 0, borderRadius: size * 0.27 }}>
      <rect width="300" height="300" fill="#fff" />
      {[0, 100, 200].flatMap((y) => [0, 100, 200].map((x) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>{PORTRAIT}</g>))}
    </svg>
  );

// Telegram's peer colours, top to bottom of the avatar gradient.
const PEERS = [
  ['#ff885e', '#ff516a'],
  ['#ffcd6a', '#ffa85c'],
  ['#82b1ff', '#665fff'],
  ['#a0de7e', '#54cb68'],
  ['#53edd6', '#28c9b7'],
  ['#72d5fd', '#2a9ef1'],
  ['#e0a2f3', '#d669ed'],
];

export const InitialsAvatar: React.FC<{ size: number; text: string; color?: number }> = ({ size, text, color = 0 }) => {
  const [a, b] = PEERS[color % PEERS.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(${a}, ${b})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.36, fontWeight: 600, letterSpacing: '0.01em' }}>
      {text}
    </div>
  );
};

// The rounded box with three dashes at the left of the topic bar ("view as tabs").
export const TabsGlyph: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size * 0.82} viewBox="0 0 22 18" fill="none" style={{ display: 'block', flexShrink: 0 }}>
    <rect x="1" y="1" width="20" height="16" rx="4.2" stroke={color} strokeWidth="1.5" />
    <path d="M1.5 9.5 H20.5" stroke={color} strokeWidth="1.3" />
    <path d="M6 13.4 H8 M10 13.4 H12 M14 13.4 H16" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const SlashBox: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none" style={{ display: 'block', flexShrink: 0 }}>
    <rect x="1.2" y="1.2" width="19.6" height="19.6" rx="4" stroke={color} strokeWidth="1.5" />
    <path d="M12.6 7 L9.6 15" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const PaperPlane: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M2.6 3.3 C2.4 2.5 3.2 1.9 3.9 2.2 L22 10.9 C22.8 11.3 22.8 12.7 22 13.1 L3.9 21.8 C3.2 22.1 2.4 21.5 2.6 20.7 L4.5 13.5 L14.4 12 L4.5 10.5 Z" fill={color} />
  </svg>
);

// One check (sent), two (read), a clock (sending).
export const Ticks: React.FC<{ status?: string; size: number; color: string }> = ({ status = 'read', size, color }) => {
  if (status === 'sending')
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.4" />
        <path d="M8 4.8 V8 L10.4 9.4" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  const check = 'M1.6 8.6 L5 12 L12 4.4';
  return (
    <svg width={size * 1.25} height={size} viewBox="0 0 20 16" fill="none" style={{ display: 'block', flexShrink: 0 }}>
      <path d={check} stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {status === 'read' ? <path d="M8.6 11 L9.6 12 L16.6 4.4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
};

export const SmileGlyph: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block', flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" />
    <path d="M7.8 14 C8.8 16.2 10.2 17.2 12 17.2 C13.8 17.2 15.2 16.2 16.2 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8.8" cy="9.6" r="1.25" fill={color} />
    <circle cx="15.2" cy="9.6" r="1.25" fill={color} />
  </svg>
);

// Telegram's slanted, filled pin.
export const PinGlyph: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M15 2.8 L21.2 9 C21.8 9.6 21.5 10.6 20.6 10.7 L18.4 11 L14.8 15.2 L15.2 18.3 C15.3 19.2 14.2 19.8 13.5 19.1 L4.9 10.5 C4.2 9.8 4.8 8.7 5.7 8.8 L8.8 9.2 L13 5.6 L13.3 3.4 C13.4 2.5 14.4 2.2 15 2.8 Z M8 14.2 L2.8 21.2 L9.8 16 Z" fill={color} />
  </svg>
);

// The filled white marks before a chat's name: group, bot, channel.
export const KindGlyph: React.FC<{ kind: string; size: number }> = ({ kind, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
    {kind === 'bot' ? (
      <path
        fillRule="evenodd"
        d="M11 3.2 H13 V6 H16 C18.2 6 20 7.8 20 10 V16 C20 18.2 18.2 20 16 20 H8 C5.8 20 4 18.2 4 16 V10 C4 7.8 5.8 6 8 6 H11 Z M8.8 11 A1.7 1.7 0 1 0 8.8 14.4 A1.7 1.7 0 1 0 8.8 11 Z M15.2 11 A1.7 1.7 0 1 0 15.2 14.4 A1.7 1.7 0 1 0 15.2 11 Z M1.4 11 H3 V16 H1.4 C0.8 16 0.4 15.6 0.4 15 V12 C0.4 11.4 0.8 11 1.4 11 Z M21 11 H22.6 C23.2 11 23.6 11.4 23.6 12 V15 C23.6 15.6 23.2 16 22.6 16 H21 Z"
        fill="#fff"
      />
    ) : kind === 'channel' ? (
      <path d="M3 9.6 V14.4 C3 15 3.4 15.4 4 15.4 H5.6 L7.4 20.2 C7.6 20.7 8 21 8.6 21 H9.8 C10.6 21 11 20.3 10.8 19.6 L9.6 16 L16.6 19.4 C17.3 19.7 18 19.2 18 18.5 V5.5 C18 4.8 17.3 4.3 16.6 4.6 L8 8.6 H4 C3.4 8.6 3 9 3 9.6 Z M19.8 9 C21 10.6 21 13.4 19.8 15 Z" fill="#fff" />
    ) : (
      <path d="M12 4.4 A3.7 3.7 0 1 1 12 11.8 A3.7 3.7 0 0 1 12 4.4 Z M5.4 6.6 A2.9 2.9 0 1 1 5.4 12.4 A2.9 2.9 0 0 1 5.4 6.6 Z M18.6 6.6 A2.9 2.9 0 1 1 18.6 12.4 A2.9 2.9 0 0 1 18.6 6.6 Z M12 13.2 C15.6 13.2 18 14.9 18 17.4 V18.2 C18 18.8 17.6 19.2 17 19.2 H7 C6.4 19.2 6 18.8 6 18.2 V17.4 C6 14.9 8.4 13.2 12 13.2 Z M5.2 13.6 C5.9 13.6 6.5 13.7 7.1 13.9 C5.6 14.8 4.7 16.1 4.5 17.6 H1 C0.5 17.6 0 17.2 0 16.6 C0 14.9 2.2 13.6 5.2 13.6 Z M18.8 13.6 C21.8 13.6 24 14.9 24 16.6 C24 17.2 23.5 17.6 23 17.6 H19.5 C19.3 16.1 18.4 14.8 16.9 13.9 C17.5 13.7 18.1 13.6 18.8 13.6 Z" fill="#fff" />
    )}
  </svg>
);

export const ArchiveGlyph: React.FC<{ size: number; hole: string }> = ({ size, hole }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M4.4 3 H19.6 C20.9 3 22 4.1 22 5.4 V8.4 H2 V5.4 C2 4.1 3.1 3 4.4 3 Z M3.2 9.8 H20.8 V18.6 C20.8 20 19.7 21 18.4 21 H5.6 C4.3 21 3.2 20 3.2 18.6 Z" fill="#fff" />
    <path d="M12 11.4 V17.4 M9 14.8 L12 17.6 L15 14.8" stroke={hole} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// The three dots of "is typing", each fading in turn. Driven by the frame, no CSS animation.
export const TypingDots: React.FC<{ frame: number; fps: number; size: number; color: string; gap?: number }> = ({ frame, fps, size, color, gap }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: gap ?? size * 0.55, verticalAlign: 'middle' }}>
    {[0, 1, 2].map((i) => {
      const t = ((frame / fps) * 1.6 - i * 0.22) % 1;
      const o = 0.35 + 0.65 * Math.max(0, Math.sin(Math.PI * (t < 0 ? t + 1 : t)));
      return <span key={i} style={{ width: size, height: size, borderRadius: '50%', background: color, opacity: o, display: 'block' }} />;
    })}
  </span>
);

export const Tail: React.FC<{ side: 'left' | 'right'; size: number; color: string }> = ({ side, size, color }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" style={{ position: 'absolute', bottom: 0, [side]: -size + 0.5, display: 'block', transform: side === 'right' ? 'scaleX(-1)' : undefined } as React.CSSProperties}>
    <path d="M10 0 V10 H1.2 C0.2 10 -0.2 8.9 0.6 8.3 C5.5 5.8 9.4 4.2 10 0 Z" fill={color} />
  </svg>
);

