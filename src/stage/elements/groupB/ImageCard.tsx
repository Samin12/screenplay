import React from 'react';
import { Img, OffthreadVideo, Sequence } from 'remotion';
import type { ImageMark } from '../../../types';
import type { ElementProps } from '../../ElementView';
import { useLook, useTheme } from '../../../theme/ThemeContext';
import { easeOut, msToFrames, progress } from '../../../lib/anim';
import { Icon } from '../../../ui/Icon';
import { alpha, isDark, mediaSrc, mix, partIn } from './kit';

// Real screenshot as a "proof" card: rounded, shadowed, slow push-in (1.0 -> 1.04 over its life).
// `size: [w, h]` (media px) frames it exactly; without it the image is contained in a 16:10 card.
// `url` adds a browser bar with the real address. `crop` shows part of the image, enlarged, so its
// own text is readable. `highlight` (media px, one mark or a list, each on its own word) draws a
// marker or box on the phrase; `ring` also dims the rest. `caption` and `source` sit under the card.

const linear = (x: number) => x;
const BAR_H = 64;
const MAX_UPSCALE = 1.4; // panel look; 2x captures start to go soft above this

const shortSource = (s: string) => {
  if (s.includes('·')) return s;
  const bare = s.replace(/^[a-z]+:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
  return bare.length <= 34 ? bare : bare.split('/')[0];
};

export const ImageCard: React.FC<ElementProps<'image'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const dark = isDark(t);
  const panelLook = useLook() === 'panel';
  const hasFooter = Boolean(el.caption || el.source);
  const footerH = hasFooter ? 92 : 0;
  const barH = el.url ? BAR_H : 0;
  const view = el.crop ?? (el.size ? { x: 0, y: 0, w: el.size[0], h: el.size[1] } : null);
  const aspect = view && view.w > 0 && view.h > 0 ? view.w / view.h : 16 / 10;
  const availW = box.w - 24;
  const availH = box.h - footerH - barH - 24;
  const w = Math.max(100, Math.min(availW, availH * aspect, panelLook && view ? view.w * MAX_UPSCALE : Infinity));
  const h = w / aspect;
  const k = view ? w / view.w : 1;

  const life = Math.max(1, el.end - el.frame);
  const push = 1 + 0.04 * progress(frame, el.frame, life, linear);

  const marks: ImageMark[] = view ? (el.highlights ?? (el.highlight ? [el.highlight] : [])) : [];
  const pad = 8;
  const boxes = marks.map((m) => ({
    style: m.style ?? (panelLook ? 'marker' : 'ring'),
    p: progress(frame, m.frame, msToFrames(m.style === 'ring' || !panelLook ? 380 : 260, fps), easeOut),
    frame: m.frame,
    x: (m.x - view!.x) * k - pad,
    y: (m.y - view!.y) * k - pad,
    w: m.w * k + pad * 2,
    h: m.h * k + pad * 2,
  }));
  // The push drifts toward the mark that's up.
  const focus = [...boxes].reverse().find((b) => frame >= b.frame) ?? boxes[0];
  const origin = focus ? `${((focus.x + focus.w / 2) / w) * 100}% ${((focus.y + focus.h / 2) / h) * 100}%` : 'center center';

  const footer = partIn(frame, fps, el.frame + msToFrames(220, fps));
  const media: React.CSSProperties = el.crop
    ? { position: 'absolute', left: -el.crop.x * k, top: -el.crop.y * k, width: el.size![0] * k, height: el.size![1] * k, display: 'block' }
    : { width: '100%', height: '100%', objectFit: el.size ? 'cover' : 'contain', display: 'block' };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'relative',
          width: w,
          borderRadius: 22,
          overflow: 'hidden',
          background: dark ? t.card : t.cardRaised,
          boxShadow: `0 34px 90px rgba(0,0,0,${dark ? 0.6 : 0.18}), 0 0 0 1.5px ${alpha(dark ? '#fff' : t.cardBorder, dark ? 0.1 : 1)}`,
        }}
      >
        {el.url ? (
          <div style={{ height: BAR_H, display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px', background: t.cardRaised }}>
            {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
              <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c, flexShrink: 0 }} />
            ))}
            <div
              style={{
                marginLeft: 18,
                flex: 1,
                minWidth: 0,
                height: 40,
                borderRadius: 20,
                background: t.card,
                color: t.textDim,
                fontFamily: t.fonts.ui,
                fontSize: 26,
                display: 'flex',
                alignItems: 'center',
                padding: '0 22px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {el.url}
            </div>
          </div>
        ) : null}
        <div style={{ position: 'relative', width: w, height: h, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: origin }}>
            {/\.(mp4|mov|webm|m4v|mkv)$/i.test(el.src) ? (
              // Real footage as proof: plays from `start` when the element lands, muted under the voice.
              <Sequence from={el.frame} layout="none">
                <OffthreadVideo src={mediaSrc(el.src)} startFrom={el.start ?? 0} muted style={media} />
              </Sequence>
            ) : (
              <Img src={mediaSrc(el.src)} style={media} />
            )}
            {boxes.map((r, i) =>
              r.p <= 0 ? null : r.style === 'marker' ? (
                <div key={i} style={{ position: 'absolute', left: r.x, top: r.y, width: r.w * r.p, height: r.h, borderRadius: 8, background: t.accent, opacity: 0.3 }} />
              ) : (
                <svg key={i} width={w} height={h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                  {r.style === 'ring' ? (
                    <path
                      d={`M0 0H${w}V${h}H0Z M${r.x + 14} ${r.y}H${r.x + r.w - 14}A14 14 0 0 1 ${r.x + r.w} ${r.y + 14}V${r.y + r.h - 14}A14 14 0 0 1 ${r.x + r.w - 14} ${r.y + r.h}H${r.x + 14}A14 14 0 0 1 ${r.x} ${r.y + r.h - 14}V${r.y + 14}A14 14 0 0 1 ${r.x + 14} ${r.y}Z`}
                      fillRule="evenodd"
                      style={{ fill: dark ? '#000' : mix(t.text, '#000', 60) }}
                      opacity={0.52 * r.p}
                    />
                  ) : null}
                  <rect
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    rx={r.style === 'box' ? 10 : 14}
                    fill="none"
                    style={{ stroke: t.accent, filter: r.style === 'ring' ? `drop-shadow(0 0 10px ${t.accentGlow})` : undefined }}
                    strokeWidth={4}
                    strokeDasharray={2 * (r.w + r.h)}
                    strokeDashoffset={2 * (r.w + r.h) * (1 - r.p)}
                  />
                </svg>
              ),
            )}
          </div>
        </div>
      </div>
      {hasFooter ? (
        <div style={{ width: w, height: footerH - 22, marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: el.caption && el.source ? 'space-between' : panelLook ? 'flex-start' : 'center', gap: 24, ...footer }}>
          {el.caption ? (
            <div
              style={{
                minWidth: 0,
                flexShrink: 1,
                fontFamily: t.fonts.display,
                fontWeight: panelLook ? 700 : 600,
                fontSize: panelLook ? 32 : 42,
                color: t.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                ...(panelLook ? { padding: '11px 24px 12px', borderRadius: 999, background: t.card, boxShadow: `inset 0 0 0 1.5px ${alpha('#fff', 0.07)}` } : {}),
              }}
            >
              {el.caption}
            </div>
          ) : null}
          {el.source ? (
            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 24px 12px 20px',
                borderRadius: 999,
                background: dark ? (panelLook ? t.card : mix(t.card, '#000', 85)) : t.cardRaised,
                boxShadow: `inset 0 0 0 1.5px ${panelLook ? alpha('#fff', 0.07) : alpha(t.cardBorder, 0.9)}`,
                fontFamily: t.fonts.display,
                fontWeight: panelLook ? 500 : 600,
                fontSize: 30,
                color: panelLook ? t.textMuted : t.textDim,
                whiteSpace: 'nowrap',
              }}
            >
              {panelLook ? <div style={{ width: 10, height: 10, borderRadius: 5, background: t.accent }} /> : <Icon name="link" size={28} color={t.accent} strokeWidth={2.4} />}
              {shortSource(el.source)}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
