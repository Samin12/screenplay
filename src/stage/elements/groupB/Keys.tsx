import React from 'react';
import type { ElementProps } from '../../ElementView';
import { useTheme } from '../../../theme/ThemeContext';
import type { Theme } from '../../../theme/tokens';
import { easeOut, msToFrames, progress } from '../../../lib/anim';
import { Icon } from '../../../ui/Icon';
import { Fit, isDark, mix, partIn } from './kit';

// 3D keycaps joined by "+" (reference: "Ctrl + −", "CTRL + ALT + SPACE"). At `press` the caps go
// down in a ripple 130 ms apart (translateY 12 px, lip hidden, accent border + glow), hold until
// ~350 ms after the last press, then release together. Optional label under the row.

const CAP_H = 98;
const LIP = 12;
const RADIUS = 16;
const PRESS_GAP_MS = 130;
const HOLD_MS = 350;

type KeyFace = { text?: string; icon?: string; mouse?: boolean };

// Common key names get their platform glyph, like the reference's "⌘ Cmd" and "⌥ Option".
const face = (raw: string): KeyFace => {
  const k = raw.trim().toLowerCase();
  if (k === 'mouse' || k === 'click' || k === '🖱' || k === '🖱️') return { mouse: true };
  if (k === 'cmd' || k === 'command' || k === '⌘') return { icon: 'command', text: k === '⌘' ? 'Cmd' : raw };
  if (k === 'option' || k === 'opt' || k === '⌥') return { icon: 'option', text: k === '⌥' ? 'Option' : raw };
  if (k === 'shift' || k === '⇧') return { icon: 'arrow-big-up', text: k === '⇧' ? 'Shift' : raw };
  if (k === 'enter' || k === 'return' || k === '↵' || k === '⏎') return { icon: 'corner-down-left', text: k.length === 1 ? 'Enter' : raw };
  if (k === 'up' || k === '↑') return { icon: 'arrow-up' };
  if (k === 'down' || k === '↓') return { icon: 'arrow-down' };
  if (k === 'left' || k === '←') return { icon: 'arrow-left' };
  if (k === 'right' || k === '→') return { icon: 'arrow-right' };
  if (k === '-' || k === 'minus') return { text: '−' };
  if (k === 'plus') return { text: '+' };
  return { text: raw };
};

const MouseGlyph: React.FC<{ size: number; t: Theme }> = ({ size, t }) => (
  <svg width={size * 0.66} height={size} viewBox="0 0 40 60">
    <rect x={3} y={3} width={34} height={54} rx={17} fill="none" style={{ stroke: t.text }} strokeWidth={4} />
    <path d="M20 3 A17 17 0 0 0 3 20 L3 24 L20 24 Z" style={{ fill: t.accent }} />
    <line x1={20} y1={3} x2={20} y2={24} style={{ stroke: t.text }} strokeWidth={3.5} />
    <line x1={3} y1={24} x2={37} y2={24} style={{ stroke: t.text }} strokeWidth={3.5} />
  </svg>
);

const Cap: React.FC<{ k: KeyFace; down: number; lit: number; t: Theme }> = ({ k, down, lit, t }) => {
  const dark = isDark(t);
  const base = dark ? mix(t.cardRaised, '#fff', 88) : mix(t.cardRaised, t.cardBorder, 60);
  const top = dark ? mix(base, '#fff', 86) : '#fff';
  const bottom = dark ? mix(base, '#000', 82) : mix(base, t.cardBorder, 70);
  const lip = dark ? mix(t.bgEdge, '#000', 60) : mix(t.cardBorder, '#000', 78);
  const tint = (c: string) => (lit > 0 ? mix(c, t.accent, 100 - 14 * lit) : c);
  const border = lit > 0 ? mix(t.accent, dark ? mix(base, '#fff', 80) : t.cardBorder, Math.round(100 * lit)) : dark ? mix(base, '#fff', 80) : t.cardBorder;
  const fontSize = 56;
  return (
    <div style={{ position: 'relative', height: CAP_H + LIP, minWidth: 110, filter: `drop-shadow(0 14px 22px rgba(0,0,0,${dark ? 0.5 : 0.18}))` }}>
      {/* base lip, revealed under the face until the key goes down */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: LIP, height: CAP_H, borderRadius: RADIUS, background: lip }} />
      <div
        style={{
          position: 'relative',
          height: CAP_H,
          boxSizing: 'border-box',
          borderRadius: RADIUS,
          border: `${2 + lit}px solid ${border}`,
          background: `linear-gradient(180deg, ${tint(top)} 0%, ${tint(base)} 46%, ${tint(bottom)} 100%)`,
          boxShadow: [
            `inset 0 2px 0 rgba(255,255,255,${dark ? 0.1 : 0.7})`,
            `inset 0 -3px 0 rgba(0,0,0,${dark ? 0.18 : 0.06})`,
            lit > 0 ? `0 0 ${28 * lit}px ${t.accentGlow}` : '',
          ]
            .filter(Boolean)
            .join(', '),
          transform: `translateY(${down * LIP}px)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: `0 ${k.text ? 38 - lit : 30 - lit}px`,
          minWidth: 110,
          fontFamily: t.fonts.display,
          fontWeight: 700,
          fontSize,
          letterSpacing: fontSize * 0.04,
          color: t.text,
          whiteSpace: 'nowrap',
        }}
      >
        {k.mouse ? <MouseGlyph size={62} t={t} /> : null}
        {k.icon ? <Icon name={k.icon} size={50} color={t.text} strokeWidth={2.4} /> : null}
        {k.text ? <span style={{ transform: 'translateY(-2px)' }}>{k.text}</span> : null}
      </div>
    </div>
  );
};

export const Keys: React.FC<ElementProps<'keys'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const keys = el.keys.length ? el.keys : ['?'];
  // Press lands after the entrance has cleared, even if `press` was resolved to the element's `at`.
  const pressAt = Math.max(el.press ?? el.frame, el.frame + msToFrames(300, fps));
  const gap = msToFrames(PRESS_GAP_MS, fps);
  const downF = msToFrames(70, fps);
  const releaseAt = pressAt + gap * (keys.length - 1) + msToFrames(HOLD_MS, fps);
  const release = progress(frame, releaseAt, msToFrames(130, fps), easeOut);
  const glowFade = progress(frame, releaseAt, msToFrames(260, fps), easeOut);
  return (
    <Fit box={box} measureKey={JSON.stringify([el.keys, el.label])}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          {keys.map((k, i) => {
            const d = progress(frame, pressAt + i * gap, downF, easeOut);
            return (
              <React.Fragment key={i}>
                {i > 0 ? (
                  <div style={{ fontFamily: t.fonts.display, fontWeight: 600, fontSize: 52, color: t.textDim, opacity: 0.85, transform: 'translateY(-4px)' }}>+</div>
                ) : null}
                <Cap k={face(k)} down={d * (1 - release)} lit={d * (1 - glowFade)} t={t} />
              </React.Fragment>
            );
          })}
        </div>
        {el.label ? (
          <div
            style={{
              marginTop: 36,
              fontFamily: t.fonts.display,
              fontWeight: 700,
              fontSize: 48,
              color: t.textDim,
              whiteSpace: 'nowrap',
              ...partIn(frame, fps, el.frame + msToFrames(160, fps)),
            }}
          >
            {el.label}
          </div>
        ) : null}
      </div>
    </Fit>
  );
};
