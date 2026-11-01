import React from 'react';
import { Img } from 'remotion';
import type { ElementProps } from '../../ElementView';
import { useTheme } from '../../../theme/ThemeContext';
import type { Theme } from '../../../theme/tokens';
import { msToFrames, progress } from '../../../lib/anim';
import { Icon } from '../../../ui/Icon';
import { Fit, Leader, Marker, StickerSlab, alpha, isDark, markerMs, mediaSrc, mix, splitPhrase, stickerFont, stickerScale } from './kit';

// X/Twitter-style post card.
// - mark: accent marker wipes left -> right behind the phrase (text stays white)
// - sticker: rotated accent slab with heavy white type that pops over the card's bottom-right corner
// - label: callout dot after the name, white leader line up-right, label text above the card
// `avatar` is an image path in the public dir; without it an initials circle is drawn.
// `meta` ("8:13 PM · Oct 14, 2026 · 382.1K Views"): `*x*` renders bold white; without asterisks
// the number before "Views" is bolded automatically.

const linear = (x: number) => x;

const XLogo: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      style={{ fill: color }}
      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
    />
  </svg>
);

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

const Meta: React.FC<{ text: string; strong: string }> = ({ text, strong }) => {
  if (text.includes('*')) {
    return (
      <>
        {text.split(/(\*[^*]+\*)/g).map((p, i) =>
          p.startsWith('*') && p.endsWith('*') && p.length > 2 ? (
            <b key={i} style={{ color: strong, fontWeight: 700 }}>
              {p.slice(1, -1)}
            </b>
          ) : (
            <React.Fragment key={i}>{p}</React.Fragment>
          ),
        )}
      </>
    );
  }
  const m = text.match(/(\d[\d.,]*\s?[KMB]?)(\s+(views|likes|reposts|bookmarks))/i);
  if (!m || m.index === undefined) return <>{text}</>;
  return (
    <>
      {text.slice(0, m.index)}
      <b style={{ color: strong, fontWeight: 700 }}>{m[1]}</b>
      {text.slice(m.index + m[1].length)}
    </>
  );
};

const Avatar: React.FC<{ src?: string; name: string; size: number; t: Theme }> = ({ src, name, size, t }) =>
  src ? (
    <Img src={mediaSrc(src)} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: `linear-gradient(145deg, ${mix(t.cardRaised, '#fff', 80)}, ${t.cardRaised})`,
        boxShadow: `inset 0 0 0 1px ${alpha(t.cardBorder, 0.9)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: t.fonts.display,
        fontWeight: 700,
        fontSize: size * 0.4,
        color: t.text,
      }}
    >
      {initials(name)}
    </div>
  );

export const Tweet: React.FC<ElementProps<'tweet'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const dark = isDark(t);
  const W = box.w >= 1400 ? 1260 : 1080;
  const cardBg = dark ? mix(t.bgEdge, '#000', 22) : '#fff';
  const ink = dark ? mix(t.text, '#e7e9ea', 40) : t.text;
  const strong = dark ? '#fff' : t.text;

  const split = splitPhrase(el.text, el.mark?.phrase);
  const markP = el.mark && split ? progress(frame, el.mark.frame, msToFrames(markerMs(split[1]), fps), linear) : 0;
  const st = el.sticker ? stickerScale(frame, fps, el.sticker.frame) : null;
  // short posts get a smaller sticker so it doesn't swallow the card
  const sFont = el.sticker ? stickerFont(el.sticker.text, el.text.length < 90 ? 112 : el.text.length < 180 ? 132 : 150) : 0;

  const padTop = el.label ? 120 : 0;
  // The callout label is absolutely positioned, so reserve room for it (rough text-width estimate)
  // or Fit would let it run past the box edge.
  const nameEnd = 60 + 104 + 24 + el.name.length * 0.6 * 40 + (el.verified ? 50 : 0) + 16;
  const labelEnd = el.label ? nameEnd + 230 + 16 + el.label.text.length * 0.56 * 48 : 0;
  const padRight = Math.max(el.sticker ? 60 : 0, labelEnd - W);
  const padBottom = el.sticker ? 90 : 0;

  return (
    <Fit box={box} measureKey={JSON.stringify([el.name, el.handle, el.text, el.meta, el.label?.text, el.sticker?.text, el.avatar, W])}>
      <div style={{ padding: `${padTop}px ${padRight}px ${padBottom}px 0` }}>
        <div
          style={{
            position: 'relative',
            width: W,
            boxSizing: 'border-box',
            padding: '54px 60px 50px',
            borderRadius: 28,
            background: cardBg,
            border: `1.5px solid ${dark ? mix(t.cardBorder, '#000', 70) : t.cardBorder}`,
            boxShadow: `0 30px 80px rgba(0,0,0,${dark ? 0.5 : 0.14})`,
            fontFamily: t.fonts.ui,
            color: ink,
          }}
        >
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Avatar src={el.avatar} name={el.name} size={104} t={t} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ position: 'relative', fontWeight: 700, fontSize: 40, lineHeight: 1.15, color: strong, whiteSpace: 'nowrap' }}>
                  {el.name}
                  {el.label && !el.verified ? (
                    <div style={{ position: 'absolute', left: '100%', top: '54%', marginLeft: 16 }}>
                      <Leader text={el.label.text} frame={frame} fps={fps} start={el.label.frame} dx={230} dy={-142} t={t} fontSize={48} />
                    </div>
                  ) : null}
                </span>
                {el.verified ? (
                  <span style={{ position: 'relative', display: 'flex' }}>
                    <Icon name="badge-check" size={40} color={cardBg} fill={t.tones.info} strokeWidth={2} />
                    {el.label ? (
                      <div style={{ position: 'absolute', left: '100%', top: '50%', marginLeft: 14 }}>
                        <Leader text={el.label.text} frame={frame} fps={fps} start={el.label.frame} dx={230} dy={-142} t={t} fontSize={48} />
                      </div>
                    ) : null}
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: 34, lineHeight: 1.15, color: t.textMuted, whiteSpace: 'nowrap' }}>{el.handle.startsWith('@') ? el.handle : `@${el.handle}`}</div>
            </div>
            <div style={{ marginLeft: 'auto', alignSelf: 'flex-start', paddingTop: 6 }}>
              <XLogo size={46} color={strong} />
            </div>
          </div>

          {/* body */}
          <div style={{ marginTop: 34, fontSize: 40, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
            {split ? (
              <>
                {split[0]}
                <Marker p={markP} color={t.accent} textColor={dark ? '#fff' : undefined}>
                  {split[1]}
                </Marker>
                {split[2]}
              </>
            ) : (
              el.text
            )}
          </div>

          {/* meta */}
          {el.meta ? (
            <div style={{ marginTop: 34, fontSize: 31, color: t.textMuted, whiteSpace: 'nowrap' }}>
              <Meta text={el.meta} strong={strong} />
            </div>
          ) : null}

          {/* sticker over the bottom-right corner */}
          {el.sticker && st && st.opacity > 0 ? (
            <div style={{ position: 'absolute', right: -50, bottom: -82, zIndex: 3 }}>
              <StickerSlab text={el.sticker.text} fontSize={sFont} rotate={-3} t={t} scale={st.scale} opacity={st.opacity} />
            </div>
          ) : null}
        </div>
      </div>
    </Fit>
  );
};
