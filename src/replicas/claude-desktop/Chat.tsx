import React from 'react';
import type { UiState } from '../../app/replica';
import { isHover, isPressed } from '../../app/replica';
import { caretOn } from '../../app/replica';
import { Caret, ClaudeStar, Ico, Inline, Ring, Switch, fill, FONT_MONO, FONT_UI } from '../_shared/kit';
import { C, L } from './tokens';
import type { DesktopData, DesktopState, Message, Step } from './types';
import { SlashMenu } from './Menus';

const codeStyle: React.CSSProperties = { font: `400 19px ${FONT_MONO}`, background: '#2b2b2b', border: '1px solid #343434', borderRadius: 6, padding: '1px 7px', margin: '0 2px', color: '#e8e8e8' };
const body: React.CSSProperties = { font: `400 ${L.body}px/1.62 ${FONT_UI}`, color: C.text };
const muted: React.CSSProperties = { font: `400 ${L.small}px ${FONT_UI}`, color: C.dim };

const StepIcon: React.FC<{ s: Step['status'] }> = ({ s }) => {
  if (s === 'done')
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10.5" fill="#a3a3a3" />
        <path d="M7.4 12.3 L10.6 15.3 L16.6 9" stroke="#181818" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (s === 'active') return <Ico name="circle-ellipsis" size={24} color="#f0f0f0" stroke={1.8} />;
  if (s === 'failed') return <Ico name="circle-x" size={24} color={C.red} stroke={1.8} />;
  return <Ico name="circle-dashed" size={24} color="#9a9a9a" stroke={1.8} />;
};

const Card: React.FC<{ t?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ t, children, style }) => (
  <div data-target={t} style={{ border: `1px solid ${C.cardLine}`, borderRadius: 16, background: '#1a1a1a', ...style }}>
    {children}
  </div>
);

const MessageView: React.FC<{ m: Message; n: number; ui: UiState }> = ({ m, n, ui }) => {
  const t = `msg-${n}`;
  if ('role' in m && m.role === 'user')
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div data-target={t} style={{ maxWidth: '78%', background: C.bubble, borderRadius: 22, padding: '20px 28px', ...body, lineHeight: 1.55 }}>
          <Inline text={m.text} code={codeStyle} />
        </div>
      </div>
    );
  if ('role' in m)
    return (
      <div data-target={t} style={{ ...body }}>
        <Inline text={m.text} code={codeStyle} bold={{ color: C.textHi }} dim={{ color: C.dim }} />
      </div>
    );
  switch (m.kind) {
    case 'activity':
      return (
        <div data-target={t}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...muted }}>
            {m.text}
            <Ico name={m.open ? 'chevron-down' : 'chevron-right'} size={19} color={C.dim} stroke={2} />
          </div>
          {m.open && m.items ? (
            <div style={{ marginTop: 10, paddingLeft: 18, borderLeft: '1.5px solid #333' }}>
              {m.items.map((it, i) => (
                <div key={i} style={{ ...muted, font: `400 20px ${FONT_MONO}`, color: '#8f8f8f', lineHeight: '34px' }}>
                  {it}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );
    case 'steps':
      return (
        <Card t={t} style={{ padding: '18px 28px' }}>
          {m.items.map((s, i) => (
            <div key={i} data-target={`step-${i + 1}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 47 }}>
                <StepIcon s={s.status} />
                <span style={{ ...body, color: s.status === 'done' ? C.dim : C.text }}>{s.text}</span>
              </div>
              {s.sub ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 36, paddingLeft: 60 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#9a9a9a' }} />
                  <span style={{ font: `600 ${L.small}px ${FONT_UI}`, color: C.textHi }}>{s.sub.name}</span>
                  {s.sub.status ? <span style={{ ...muted }}>· {s.sub.status}</span> : null}
                </div>
              ) : null}
            </div>
          ))}
        </Card>
      );
    case 'sessions':
      return (
        <div data-target={t}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, font: `400 22px ${FONT_UI}`, color: C.dim }}>
            {m.text}
            <Ico name={m.open ? 'chevron-down' : 'chevron-right'} size={19} color={C.dim} stroke={2} />
          </div>
          {m.open
            ? m.items.map((it, i) => (
                <div key={i} data-target={`subsession-${i + 1}`} style={{ display: 'flex', alignItems: 'center', gap: 12, height: 50, paddingLeft: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a0a0a0' }} />
                  <span style={{ font: `600 ${L.body}px ${FONT_UI}`, color: C.textHi, marginLeft: 6 }}>{it.title}</span>
                  {it.status ? <span style={{ font: `400 ${L.body}px ${FONT_UI}`, color: C.dim }}>· {it.status}</span> : null}
                </div>
              ))
            : null}
        </div>
      );
    case 'notice':
      return (
        <div data-target={t} style={{ display: 'flex', alignItems: 'center', gap: 10, ...muted, fontSize: 20 }}>
          <Ico name={m.icon ?? 'corner-down-right'} size={20} color={C.dim} stroke={1.8} />
          {m.text}
        </div>
      );
    case 'thinking': {
      return (
        <div data-target={t} style={{ display: 'flex', alignItems: 'center', gap: 14, ...muted, fontSize: 22 }}>
          <ClaudeStar size={30} spin={(ui.frame * 6) % 360} />
          {m.text ?? 'Thinking…'}
        </div>
      );
    }
    case 'table': {
      const grid = '330px 1fr 150px 84px';
      return (
        <Card t={t} style={{ padding: '6px 38px 4px', background: '#1b1b1b' }}>
          {m.title ? <div style={{ font: `600 ${L.body}px ${FONT_UI}`, color: C.textHi, padding: '22px 0 4px' }}>{m.title}</div> : null}
          <div style={{ display: 'grid', gridTemplateColumns: grid, alignItems: 'center', height: 66, borderBottom: `1px solid ${C.cardLineHi}`, ...muted }}>
            <span>{m.columns[0]}</span>
            <span>{m.columns[1]}</span>
            <span style={{ textAlign: 'right' }}>{m.columns[2]}</span>
            <span />
          </div>
          {m.rows.map((r, i) => {
            const mutedRow = r.tone === 'muted';
            const tone = r.tone === 'warn' ? C.amber : r.tone === 'bad' ? C.red : r.tone === 'good' ? C.green : mutedRow ? '#8a7a55' : C.text;
            return (
              <div key={i} data-target={`table-row-${i + 1}`} style={{ display: 'grid', gridTemplateColumns: grid, alignItems: 'center', height: 82, borderBottom: i < m.rows.length - 1 ? `1px solid ${C.cardLine}` : 'none' }}>
                <span style={{ font: `500 23px ${FONT_MONO}`, color: mutedRow ? '#8a8a8a' : '#efefef' }}>{r.cells[0]}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                  {r.bar !== undefined ? (
                    <div style={{ width: 340, height: 16, borderRadius: 8, background: '#2b2b2b', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round(r.bar * 100)}%`, height: '100%', borderRadius: 8, background: mutedRow ? '#8a4a2a' : '#ee6a2c' }} />
                    </div>
                  ) : null}
                  <span style={{ ...muted, color: mutedRow ? '#6f6f6f' : '#b5b5b5' }}>{r.cells[1]}</span>
                </div>
                <span style={{ font: `400 ${L.body}px ${FONT_UI}`, color: r.tone === 'warn' || mutedRow ? tone : C.text, textAlign: 'right' }}>{r.cells[2]}</span>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {r.on !== undefined ? <Switch on={r.on} target={`table-toggle-${i + 1}`} ui={ui} w={62} h={36} onColor={C.toggle} /> : null}
                </div>
              </div>
            );
          })}
          {m.footer ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70, borderTop: `1px solid ${C.cardLineHi}` }}>
              <span style={{ ...muted, fontSize: 22 }}>{m.footer[0]}</span>
              <span style={{ font: `700 26px ${FONT_UI}`, color: C.green }}>{m.footer[1]}</span>
            </div>
          ) : null}
        </Card>
      );
    }
    case 'checklist':
      return (
        <Card t={t} style={{ padding: '22px 34px', background: '#1b1b1b' }}>
          <div style={{ font: `600 ${L.body}px ${FONT_UI}`, color: C.textHi, marginBottom: 12 }}>{m.title}</div>
          {m.items.map((it, i) => {
            const col = it.status === 'warn' ? C.amber : it.status === 'bad' ? C.red : C.green;
            return (
              <div key={i} data-target={`check-${i + 1}`} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {it.status === 'warn' || it.status === 'bad' ? <span style={{ font: `800 18px ${FONT_UI}`, color: '#1b1b1b' }}>!</span> : <Ico name="check" size={18} color="#1b1b1b" stroke={3.2} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ font: `400 ${L.body}px ${FONT_UI}`, color: C.text }}>{it.text}</div>
                  {it.sub ? <div style={{ ...muted, fontSize: 19, marginTop: 2 }}>{it.sub}</div> : null}
                </div>
                {it.note ? <span style={{ font: `500 ${L.small}px ${FONT_UI}`, color: '#71b37e' }}>{it.note}</span> : null}
              </div>
            );
          })}
        </Card>
      );
    default:
      return null;
  }
};

const Ribbon: React.FC<{ data: DesktopData }> = ({ data }) => {
  const r = data.ribbon;
  const dots = (n: number, on: number, col: string) => (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < on ? col : '#4a4640' }} />
      ))}
    </span>
  );
  const seg: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, height: '100%' };
  return (
    <div data-target="ribbon" style={{ height: 70, borderRadius: 14, background: '#23211d', display: 'flex', alignItems: 'center', gap: 34, padding: '0 22px', marginBottom: 14, font: `600 26px ${FONT_UI}`, whiteSpace: 'nowrap' }}>
      <span style={{ color: '#e7e1d3', fontWeight: 800 }}>USAGE</span>
      <div data-target="ribbon-week" style={seg}>
        <span style={{ color: '#8d8877', fontWeight: 700 }}>7D</span>
        {dots(9, 7, '#ec6e2c')}
        <span style={{ color: '#ec6e2c', fontWeight: 700 }}>{r.week.pct}</span>
        <span style={{ color: '#8d8877', fontWeight: 500 }}>· {r.week.reset}</span>
      </div>
      <div data-target="ribbon-window" style={seg}>
        <span style={{ color: '#8d8877', fontWeight: 700 }}>5H</span>
        {dots(9, 8, '#f3a528')}
        <span style={{ color: '#f3a528', fontWeight: 700 }}>{r.window.pct}</span>
        <span style={{ color: '#8d8877', fontWeight: 500 }}>· {r.window.reset}</span>
      </div>
      <div data-target="ribbon-cache" style={seg}>
        <span style={{ background: '#cb6262', color: '#2a1414', borderRadius: 8, padding: '2px 12px', fontWeight: 800 }}>{r.cache.label}</span>
        <span style={{ color: '#c86462', fontWeight: 700 }}>{r.cache.left}</span>
      </div>
    </div>
  );
};

export const ChatPane: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState; messages: Message[]; colW: number }> = ({ data, state, ui, messages, colW }) => {
  const prompt = String(state.prompt ?? '');
  const caret = caretOn(ui, 'prompt');
  const placeholder = state.tab === 'chat' ? 'How can I help you today?' : data.placeholder;
  const ctxPct = data.context?.pct ?? 0;
  return (
    <div data-target="chat" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* messages: top-aligned; when they overflow, the newest stay in view */}
      <div data-target="messages" style={{ flex: 1, minHeight: 0, width: colW, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ minHeight: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 26, padding: '48px 30px 36px', boxSizing: 'border-box', transform: state.chatScroll ? `translateY(${-Number(state.chatScroll)}px)` : undefined }}>
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, paddingBottom: 60 }}>
              <ClaudeStar size={58} />
              <span data-target="greeting" style={{ font: `500 58px "Newsreader", Georgia, serif`, color: '#ede9e0' }}>
                {data.greeting}
              </span>
            </div>
          ) : (
            messages.map((m, i) => <MessageView key={i} m={m} n={i + 1} ui={ui} />)
          )}
        </div>
      </div>

      {/* composer */}
      <div style={{ width: colW, flexShrink: 0, position: 'relative' }}>
        {state.ribbon ? <Ribbon data={data} /> : null}
        <div style={{ position: 'relative' }}>
          {state.slash && state.slash.length ? <SlashMenu data={data} state={state} ui={ui} /> : null}
          <div
            data-target="composer"
            style={{
              minHeight: 74,
              borderRadius: 20,
              background: C.composer,
              border: `1px solid ${isHover(ui, 'composer') || ui.caret === 'prompt' ? '#474747' : C.composerLine}`,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '10px 14px 10px 24px',
              boxSizing: 'border-box',
            }}
          >
            <div data-target="attach" style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: fill(ui, 'attach', { hover: '#3c3c3c' }), marginLeft: -8 }}>
              <Ico name="plus" size={28} color="#d6d6d6" stroke={1.7} />
            </div>
            <div style={{ flex: 1, minWidth: 0, font: `400 25px/1.5 ${FONT_UI}`, color: prompt ? '#f2f2f2' : '#8f8f8f', wordBreak: 'break-word' }}>
              {prompt}
              {ui.caret === 'prompt' ? <Caret on={caret} h={30} /> : null}
              {prompt ? null : placeholder}
            </div>
            <div
              data-target="send"
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'flex-end',
                background: prompt ? (isPressed(ui, 'send') ? '#b5573a' : isHover(ui, 'send') ? '#e0835f' : C.accent) : fill(ui, 'send', { hover: '#3c3c3c' }),
              }}
            >
              <Ico name={prompt ? 'arrow-up' : 'mic'} size={prompt ? 26 : 25} color={prompt ? '#ffffff' : '#d6d6d6'} stroke={prompt ? 2.4 : 1.7} />
            </div>
          </div>
        </div>
        <div style={{ height: 66, marginTop: 4, display: 'flex', alignItems: 'center', padding: '0 22px', gap: 14 }}>
          <div data-target="mode-picker" style={{ height: 42, display: 'flex', alignItems: 'center', padding: '0 10px', marginLeft: -10, borderRadius: 9, background: fill(ui, 'mode-picker', { hover: C.hover }), font: `400 ${L.body}px ${FONT_UI}`, color: '#e8e8e8' }}>
            {data.mode}
          </div>
          <div style={{ flex: 1 }} />
          <div data-target="model-picker" style={{ height: 42, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', borderRadius: 9, background: fill(ui, 'model-picker', { hover: C.hover, pressed: C.press }) }}>
            <span style={{ font: `400 ${L.body}px ${FONT_UI}`, color: '#ececec' }}>{data.model}</span>
            <span style={{ font: `400 ${L.body}px ${FONT_UI}`, color: '#9a9a9a' }}>{data.effort}</span>
          </div>
          <div data-target="context-ring" style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ring size={28} pct={ctxPct} color="#a8a8a8" track="#3a3a3a" stroke={3} />
          </div>
        </div>
      </div>
    </div>
  );
};
