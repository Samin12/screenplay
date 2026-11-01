import React from 'react';
import { Img, OffthreadVideo, staticFile } from 'remotion';
import type { UiState } from '../../app/replica';
import { caretOn, usePlateSize } from '../../app/replica';
import { Caret, ClaudeStar, FONT_MONO, FONT_UI, Ico, Inline, fill } from '../_shared/kit';
import { Badge } from './Sidebar';
import { C, L } from './tokens';
import type { Message, T3Data, T3State } from './types';

// Main pane: breadcrumb header, chat column (prose, user bubbles, inline video player, code
// blocks), "Scroll to end" pill, floating composer with the model / mode / access tray.

const codeStyle: React.CSSProperties = {
  font: `400 ${L.mono}px ${FONT_MONO}`,
  background: C.inline,
  border: '1px solid #222',
  borderRadius: 6,
  padding: '1px 7px',
  margin: '0 2px',
  color: C.textHi,
};
const prose: React.CSSProperties = { font: `400 ${L.body}px/1.6 ${FONT_UI}`, color: C.text };

// Inline markup plus [[target-name|text]]: a span carrying data-target (kept on one line so marks
// and callouts hug it).
const Rich: React.FC<{ text: string }> = ({ text }) => {
  const parts = String(text ?? '').split(/(\[\[[^\]|]+\|[^\]]+\]\])/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\[\[([^\]|]+)\|([^\]]+)\]\]$/.exec(p);
        if (m)
          return (
            <span key={i} data-target={m[1]} style={{ whiteSpace: 'nowrap' }}>
              <Inline text={m[2]} code={codeStyle} bold={{ color: C.textHi }} />
            </span>
          );
        return <Inline key={i} text={p} code={codeStyle} bold={{ color: C.textHi }} />;
      })}
    </>
  );
};

const VideoCard: React.FC<{ m: Extract<Message, { kind: 'video' }>; t: string; w: number; ui: UiState }> = ({ m, t, w, ui }) => {
  const h = Math.round((w * 9) / 16);
  const p = Math.max(0, Math.min(1, m.progress ?? 0));
  return (
    <div data-target={t} style={{ position: 'relative', width: w, height: h, borderRadius: 14, overflow: 'hidden', background: '#000', boxShadow: 'inset 0 0 0 1px #1a1a1a' }}>
      {m.video && !ui.measuring ? (
        <OffthreadVideo src={staticFile(m.video)} startFrom={m.videoStart ?? 0} muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : m.poster ? (
        <Img src={staticFile(m.poster)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : null}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 150, background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.78))' }} />
      <div style={{ position: 'absolute', left: 30, right: 26, bottom: 62, height: 34, display: 'flex', alignItems: 'center', gap: 22 }}>
        <Ico name={m.time && m.time !== '0:00' ? 'pause' : 'play'} size={26} color="#fff" stroke={2.2} />
        <span style={{ font: `500 21px ${FONT_UI}`, color: '#fff' }}>
          {m.time ?? '0:00'} / {m.duration}
        </span>
        <div style={{ flex: 1 }} />
        <Ico name="volume-2" size={25} color="#fff" stroke={2} />
        <Ico name="maximize" size={23} color="#fff" stroke={2} style={{ marginLeft: 26 }} />
        <Ico name="ellipsis-vertical" size={24} color="#fff" stroke={2.2} style={{ marginLeft: 18 }} />
      </div>
      <div style={{ position: 'absolute', left: 30, right: 30, bottom: 30, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.32)' }}>
        <div style={{ width: `${p * 100}%`, height: '100%', borderRadius: 3, background: '#fff' }} />
        <div style={{ position: 'absolute', left: `calc(${p * 100}% - 6px)`, top: -4, width: 13, height: 13, borderRadius: '50%', background: '#fff' }} />
      </div>
    </div>
  );
};

const MessageView: React.FC<{ m: Message; n: number; colW: number; ui: UiState }> = ({ m, n, colW, ui }) => {
  const t = `msg-${n}`;
  if ('role' in m && m.role === 'user')
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div data-target={t} style={{ maxWidth: '80%', background: C.bubble, border: `1px solid ${C.bubbleLine}`, borderRadius: 26, padding: '22px 28px 20px', boxSizing: 'border-box' }}>
          <div style={{ ...prose, color: C.textHi }}>
            <Rich text={m.text} />
          </div>
          {m.more ? <div style={{ textAlign: 'right', marginTop: 10, font: `400 18px ${FONT_UI}`, color: C.muted }}>Show full message</div> : null}
        </div>
      </div>
    );
  if ('role' in m)
    return (
      <div data-target={t} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {m.text.split(/\n\n+/).map((para, i) => (
          <div key={i} data-target={`${t}-p${i + 1}`} style={prose}>
            <Rich text={para} />
          </div>
        ))}
      </div>
    );
  switch (m.kind) {
    case 'worked':
      return (
        <div data-target={t} style={{ paddingBottom: 20, borderBottom: '1px solid #1d1d1d' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, font: `400 ${L.body}px ${FONT_UI}`, color: C.muted }}>
            {m.text}
            <Ico name="chevron-right" size={20} color={C.muted} stroke={2} />
          </div>
        </div>
      );
    case 'video':
      return <VideoCard m={m} t={t} w={Math.min(m.tall ? 900 : 770, colW)} ui={ui} />;
    case 'code':
      return (
        <div data-target={t} style={{ background: C.code, border: `1px solid ${C.codeLine}`, borderRadius: 16, padding: '20px 28px 22px', position: 'relative' }}>
          <div style={{ font: `400 19px ${FONT_MONO}`, color: C.muted, marginBottom: 14 }}>{m.label ?? 'text'}</div>
          <div style={{ position: 'absolute', right: 22, top: 18, display: 'flex', gap: 18 }}>
            <Ico name="wrap-text" size={22} color={C.muted} stroke={1.8} />
            <Ico name="copy" size={21} color={C.muted} stroke={1.8} />
          </div>
          {m.lines.map((ln, i) => (
            <div key={i} data-target={`${t}-line-${i + 1}`} style={{ font: `400 ${L.mono + 1}px/1.55 ${FONT_MONO}`, color: C.textHi, whiteSpace: 'pre' }}>
              {ln}
            </div>
          ))}
        </div>
      );
    case 'meta':
      return (
        <div data-target={t} style={{ display: 'flex', alignItems: 'center', gap: 14, font: `400 21px ${FONT_UI}`, color: C.muted, paddingLeft: 6 }}>
          <Ico name="copy" size={20} color={C.muted} stroke={1.8} />
          {m.text}
        </div>
      );
  }
  return null;
};

const FinderGlyph: React.FC = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" style={{ display: 'block' }}>
    <rect x="1" y="1" width="24" height="24" rx="6" fill="#2b8cf3" />
    <path d="M13 1 H19 A6 6 0 0 1 25 7 V19 A6 6 0 0 1 19 25 H14 C15 20 12 16 13 1 Z" fill="#a9dcfb" />
    <circle cx="8" cy="10" r="1.4" fill="#0b2b55" />
    <circle cx="18" cy="10" r="1.4" fill="#0b2b55" />
    <path d="M7 16.5 Q13 21 19 16.5" stroke="#0b2b55" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  </svg>
);

export const Header: React.FC<{ data: T3Data; state: T3State; ui: UiState; left: number }> = ({ data, state, ui, left }) => {
  const th = data.threads.find((t) => t.id === state.active);
  const p = data.projects.find((x) => x.id === th?.project);
  const btn = (target: string, children: React.ReactNode, pad = '0 14px', border = true) => (
    <div
      data-target={target}
      style={{
        height: 40,
        minWidth: 40,
        boxSizing: 'border-box',
        borderRadius: 11,
        border: border ? `1px solid ${C.btnLine}` : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: pad,
        background: fill(ui, target, { hover: '#151515', pressed: '#1f1f1f' }),
        font: `500 22px ${FONT_UI}`,
        color: '#e8e8e8',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );
  return (
    <div data-target="header" style={{ position: 'absolute', left, right: 0, top: 0, height: L.barH, background: C.header, display: 'flex', alignItems: 'center', padding: '0 30px 0 45px', boxSizing: 'border-box', gap: 14 }}>
      <div data-target="crumb-project" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Badge p={p} size={24} />
        <span style={{ font: `400 25px ${FONT_UI}`, color: C.muted, whiteSpace: 'nowrap' }}>{p?.name ?? ''}</span>
      </div>
      <span style={{ font: `400 25px ${FONT_UI}`, color: '#4a4a4a', margin: '0 6px' }}>/</span>
      <span data-target="crumb-title" style={{ font: `400 25px ${FONT_UI}`, color: C.textHi, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
        {th?.title ?? 'New thread'}
      </span>
      <div style={{ flex: 1 }} />
      {btn('header-add', <Ico name="plus" size={22} color="#9a9a9a" stroke={1.8} />, '0')}
      {btn(
        'open-in',
        <>
          <FinderGlyph />
          <Ico name="chevron-down" size={19} color="#9a9a9a" stroke={2} />
        </>,
        '0 12px 0 14px',
      )}
      {btn(
        'init-git',
        <>
          <Ico name="git-branch-plus" size={21} color="#cfcfcf" stroke={1.8} />
          {data.gitLabel}
        </>,
      )}
      <div style={{ width: 8 }} />
      {btn('toggle-terminal', <Ico name="panel-bottom" size={24} color="#cfcfcf" stroke={1.8} />, '0', false)}
      {btn('toggle-panel', <Ico name="panel-right" size={24} color="#cfcfcf" stroke={1.8} />, '0', false)}
    </div>
  );
};

export const ChatPane: React.FC<{ data: T3Data; state: T3State; ui: UiState; left: number; messages: Message[] }> = ({ data, state, ui, left, messages }) => {
  const [W, H] = usePlateSize();
  const mainW = W - left;
  const colW = Math.min(L.colMax, mainW - 96);
  const colX = (mainW - colW) / 2;
  const composerTop = H - L.composerBottom - L.trayH - L.composerH;
  const cw = colW + 14;
  const cx = colX - 7;
  const typing = ui.caret === 'prompt';
  const hasText = Boolean(state.prompt);
  return (
    <div data-target="main" style={{ position: 'absolute', left, top: L.barH, right: 0, bottom: 0, background: C.main }}>
      {/* messages */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: composerTop - L.barH - 6, overflow: 'hidden' }}>
        <div data-target="messages" style={{ position: 'absolute', left: colX, width: colW, top: 26 - (Number(state.scroll) || 0), display: 'flex', flexDirection: 'column', gap: 30 }}>
          {messages.map((m, i) => (
            <MessageView key={i} m={m} n={i + 1} colW={colW} ui={ui} />
          ))}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 36, background: `linear-gradient(to bottom, rgba(10,10,10,0), ${C.main})` }} />
      </div>

      {state.scrollPill ? (
        <div
          data-target="scroll-pill"
          style={{
            position: 'absolute',
            left: cx + cw / 2,
            top: composerTop - L.barH - 72,
            transform: 'translateX(-50%)',
            height: 44,
            padding: '0 20px 0 16px',
            borderRadius: 22,
            background: '#070707',
            border: '1px solid #1f1f1f',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            font: `500 21px ${FONT_UI}`,
            color: '#f0f0f0',
            whiteSpace: 'nowrap',
          }}
        >
          <Ico name="chevron-down" size={19} color="#f0f0f0" stroke={2} />
          Scroll to end
        </div>
      ) : null}

      {/* tray under the composer: model / mode / access */}
      <div
        style={{
          position: 'absolute',
          left: cx + 30,
          width: cw - 60,
          top: composerTop - L.barH + L.composerH - 24,
          height: L.trayH + 24,
          borderRadius: '0 0 26px 26px',
          background: C.tray,
          border: '1px solid #1a1a1a',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '0 24px 12px',
          gap: 18,
          font: `400 21px ${FONT_UI}`,
          color: '#6e6e6e',
        }}
      >
        <div data-target="model-picker" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 30, whiteSpace: 'nowrap' }}>
          <div style={{ position: 'relative', width: 26, height: 26 }}>
            <ClaudeStar size={22} color="#9a6a58" />
            <div style={{ position: 'absolute', left: 9, top: 12, padding: '0 3px', height: 13, borderRadius: 6, background: '#1e1e1e', color: '#bdbdbd', font: `700 10px ${FONT_UI}`, lineHeight: '13px' }}>{data.modelTag}</div>
          </div>
          {data.model}
          <Ico name="chevron-down" size={17} color="#6e6e6e" stroke={2} />
        </div>
        <div style={{ width: 1, height: 26, background: '#242424', marginBottom: 2 }} />
        <div data-target="mode-picker" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 30, whiteSpace: 'nowrap' }}>
          {data.mode}
          <Ico name="chevron-down" size={17} color="#6e6e6e" stroke={2} />
        </div>
        <div style={{ width: 1, height: 26, background: '#242424', marginBottom: 2 }} />
        <div data-target="access-picker" style={{ display: 'flex', alignItems: 'center', gap: 9, height: 30, whiteSpace: 'nowrap' }}>
          <Ico name="lock-open" size={19} color="#6e6e6e" stroke={1.9} />
          {data.access}
          <Ico name="chevron-down" size={17} color="#6e6e6e" stroke={2} />
        </div>
      </div>

      {/* composer */}
      <div
        data-target="composer"
        style={{
          position: 'absolute',
          left: cx,
          width: cw,
          top: composerTop - L.barH,
          height: L.composerH,
          borderRadius: 40,
          background: C.composer,
          border: `1px solid ${C.composerLine}`,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px 0 30px',
          gap: 20,
        }}
      >
        <div style={{ flex: 1, minWidth: 0, font: `400 ${L.body}px ${FONT_UI}`, color: hasText ? C.textHi : C.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {hasText ? state.prompt : data.placeholder}
          {typing ? <Caret on={caretOn(ui, 'prompt')} h={26} /> : null}
        </div>
        <div data-target="attach" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ico name="paperclip" size={24} color="#8a8a8a" stroke={1.8} />
        </div>
        <div
          data-target="send"
          style={{ width: 54, height: 54, borderRadius: '50%', background: fill(ui, 'send', { base: C.send, hover: '#3159bd', pressed: '#1f3d86' }), display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ico name="arrow-up" size={25} color="#fff" stroke={2.4} />
        </div>
      </div>
    </div>
  );
};
