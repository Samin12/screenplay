import React from 'react';
import type { UiState } from '../../app/replica';
import { isHover, isPressed, usePlateSize } from '../../app/replica';
import { Ico, TrafficLights, WinControls, fill, FONT_UI } from '../_shared/kit';
import { C, L } from './tokens';
import type { DesktopData, DesktopState } from './types';

// One 60 px bar across the whole window. Left part sits over the sidebar (window buttons, sidebar
// toggle, back/forward, Chat/Code tabs); then the session title; right: tool icons + rail toggle.

const IconBtn: React.FC<{ t: string; icon: string; ui: UiState; size?: number; active?: boolean; dim?: boolean; w?: number }> = ({ t, icon, ui, size = 24, active, dim, w = 44 }) => (
  <div
    data-target={t}
    style={{
      width: w,
      height: 44,
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: fill(ui, t, { hover: C.hover, pressed: C.press, active, activeBg: '#2a2a2a' }),
    }}
  >
    <Ico name={icon} size={size} color={dim ? '#6a6a6a' : '#d6d6d6'} stroke={1.7} />
  </div>
);

export const TitleBar: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState; title: string; rightInset?: number }> = ({ data, state, ui, title, rightInset = 0 }) => {
  const mac = data.chrome !== 'windows';
  const sideW = state.sidebar === false ? 0 : L.sideW;
  const [W] = usePlateSize();
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: W - rightInset,
        height: L.titleH,
        display: 'flex',
        alignItems: 'center',
        background: C.bg,
        zIndex: 3,
      }}
    >
      {/* left cluster, over the sidebar */}
      <div style={{ width: sideW || undefined, height: '100%', display: 'flex', alignItems: 'center', gap: 2, paddingLeft: mac ? 22 : 12, paddingRight: sideW ? 0 : 12, boxSizing: 'border-box', background: sideW ? C.side : C.bg, borderRight: sideW ? `1px solid ${C.sideLine}` : 'none', flexShrink: 0 }}>
        {mac ? (
          <div style={{ marginRight: 14 }}>
            <TrafficLights />
          </div>
        ) : (
          <IconBtn t="app-menu" icon="menu" ui={ui} />
        )}
        <IconBtn t="sidebar-toggle" icon="panel-left" ui={ui} w={40} />
        <IconBtn t="back" icon="chevron-left" ui={ui} w={34} />
        <IconBtn t="forward" icon="chevron-right" ui={ui} w={34} dim />
        <div style={{ display: 'flex', gap: 2, background: '#272727', borderRadius: 11, padding: 3, marginLeft: 6 }}>
          {(['chat', 'code'] as const).map((k) => {
            const t = `tab-${k}`;
            const on = state.tab === k;
            return (
              <div
                key={k}
                data-target={t}
                style={{
                  width: 46,
                  height: 40,
                  borderRadius: 9,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isPressed(ui, t) ? C.press : on ? '#3c3c3c' : isHover(ui, t) ? C.hover : 'transparent',
                  boxShadow: on ? 'inset 0 0 0 1px #4a4a4a' : 'none',
                }}
              >
                <Ico name={k === 'chat' ? 'message-circle' : 'code-xml'} size={23} color={on ? '#f2f2f2' : '#bdbdbd'} stroke={1.8} />
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.titleLine}`, boxSizing: 'border-box' }}>
      {/* session title */}
      <div data-target="title" style={{ marginLeft: 34, display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 8px', borderRadius: 10, background: fill(ui, 'title', { hover: C.hover }) }}>
        <span style={{ font: `400 ${L.body}px ${FONT_UI}`, color: '#e8e8e8', whiteSpace: 'nowrap' }}>{title}</span>
        <Ico name="chevron-down" size={20} color="#bdbdbd" stroke={2} />
      </div>

      <div style={{ flex: 1 }} />

      {/* tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: mac || rightInset ? 22 : 0 }}>
        <IconBtn t="rail-toggle" icon="square-menu" ui={ui} active={state.rail} />
        <div style={{ width: 1, height: 26, background: '#3a3a3a', margin: '0 6px' }} />
        <IconBtn t="tool-terminal" icon="terminal" ui={ui} />
        <IconBtn t="tool-diff" icon="file-diff" ui={ui} />
        <IconBtn t="tool-preview" icon="globe" ui={ui} />
        <IconBtn t="tool-files" icon="folder" ui={ui} />
        <IconBtn t="tool-more" icon="ellipsis" ui={ui} active={state.menu?.for === 'tool-more'} />
        {mac || rightInset ? null : <div style={{ width: 30 }} />}
        {mac || rightInset ? null : <WinControls color="#cfcfcf" />}
      </div>
      </div>
    </div>
  );
};
