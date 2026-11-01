import React from 'react';
import type { UiState } from '../../app/replica';
import { isHover, isPressed } from '../../app/replica';
import { Ico, Spinner, fill, slug, FONT_UI } from '../_shared/kit';
import { C, L } from './tokens';
import type { DesktopData, DesktopState, Session } from './types';

// Left sidebar: nav, Pinned, named sections with nested sessions, user footer.
// Row pitch 58 px, row height 52, text 23 px, selected row #3d3d3d with radius 10.

const ROW_H = 52;
const ROW_PITCH = 58;
const NAV_H = 14 + 5 * 58 + 10; // nav block (padding + 5 items); recomputed from data.nav below
const GROUP_PAD = 30;
const HEADER_H = 46;
const FOOTER_H = 82;

// Window-space top of every session row, computed from the same constants the layout uses. The
// context menu is positioned (and clamped to the window) from this, so it never runs off-screen.
export const sidebarRowTops = (data: DesktopData, state: DesktopState) => {
  const out: Record<string, number> = {};
  let y = L.titleH + NAV_H + (data.nav.length - 5) * 58 - (Number(state.sidebarScroll) || 0);
  const walk = (list: Session[]) => {
    for (const s of list) {
      out[s.id] = y;
      y += ROW_PITCH;
      if (s.children?.length && !s.collapsed) walk(s.children);
    }
  };
  if (data.pinned?.length) {
    y += GROUP_PAD + HEADER_H;
    walk(data.pinned);
  }
  for (const sec of data.sections) {
    y += GROUP_PAD + HEADER_H;
    walk(sec.sessions);
  }
  return out;
};
export const SIDEBAR_FOOTER_H = FOOTER_H;

const StatusGlyph: React.FC<{ s?: Session['status']; ui: UiState }> = ({ s, ui }) => {
  if (!s) return null;
  if (s === 'working') return <Spinner size={20} color="#bdbdbd" track="#3a3a3a" ui={ui} stroke={2.5} />;
  if (s === 'waiting') return <Ico name="triangle-alert" size={21} color="#d9d9d9" stroke={1.8} />;
  if (s === 'unread') return <div style={{ width: 9, height: 9, borderRadius: '50%', background: C.blue }} />;
  // done: quiet grey dot (finished, nothing to do)
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#9a9a9a' }} />;
};

const Row: React.FC<{
  s: Session;
  depth: number;
  last?: boolean;
  pinned?: boolean;
  data: DesktopData;
  state: DesktopState;
  ui: UiState;
}> = ({ s, depth, last, pinned, data, state, ui }) => {
  const t = `session-${s.id}`;
  const more = `more-${s.id}`;
  const active = state.active === s.id;
  const menuHere = state.menu?.for === s.id;
  const showMore = menuHere || isHover(ui, t) || isHover(ui, more);
  const icon = s.icon ?? (pinned ? (state.tab === 'chat' ? 'chat' : 'code') : 'none');
  const hasKids = !!s.children?.length;
  return (
    <>
      <div style={{ position: 'relative', margin: '0 12px' }}>
        {depth > 0 ? (
          // tree guide for nested sessions
          <div style={{ position: 'absolute', left: 24, top: -6, width: 18, height: last ? ROW_H / 2 + 6 : ROW_H + 6, borderLeft: '1.5px solid #4a4a4a', borderBottom: last ? '1.5px solid #4a4a4a' : 'none', borderBottomLeftRadius: last ? 8 : 0 }} />
        ) : null}
        <div
          data-target={t}
          style={{
            height: ROW_H,
            marginBottom: 6,
            marginLeft: depth * 46,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: depth > 0 ? '0 10px 0 14px' : icon === 'none' ? '0 10px 0 16px' : '0 10px 0 18px',
            background: fill(ui, t, { hover: C.hover, pressed: C.press, active: active || menuHere, activeBg: C.sel }),
            boxSizing: 'border-box',
          }}
        >
          {icon === 'code' ? <Ico name="code-xml" size={24} color="#cfcfcf" stroke={1.7} /> : icon === 'chat' ? <Ico name="message-circle" size={23} color="#cfcfcf" stroke={1.7} /> : null}
          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden', maskImage: 'linear-gradient(to right, #000 calc(100% - 22px), transparent)', WebkitMaskImage: 'linear-gradient(to right, #000 calc(100% - 22px), transparent)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
              <span style={{ font: `400 ${L.body}px ${FONT_UI}`, color: active ? C.textHi : '#e6e6e6' }}>{s.title}</span>
              {hasKids ? <Ico name="chevron-down" size={18} color="#bdbdbd" stroke={2.4} style={{ transform: s.collapsed ? 'rotate(-90deg)' : undefined }} /> : null}
            </div>
          </div>
          <div style={{ width: 26, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', flexShrink: 0 }}>
            {showMore || (hasKids && !s.collapsed) ? null : <StatusGlyph s={s.status} ui={ui} />}
            <div
              data-target={more}
              style={{
                position: 'absolute',
                left: -8,
                top: -18,
                width: 42,
                height: 36,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: showMore ? 1 : 0,
                background: menuHere || isHover(ui, more) ? '#555555' : 'transparent',
              }}
            >
              <Ico name="ellipsis" size={22} color="#f0f0f0" stroke={2} />
            </div>
          </div>
        </div>
      </div>
      {hasKids && !s.collapsed ? s.children!.map((c, i) => <Row key={c.id} s={c} depth={depth + 1} last={i === s.children!.length - 1} data={data} state={state} ui={ui} />) : null}
    </>
  );
};

const Header: React.FC<{ name: string; t: string; ui: UiState }> = ({ name, t, ui }) => (
  <div data-target={t} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 40, margin: '0 12px 6px', padding: '0 20px', borderRadius: 8, background: fill(ui, t, { hover: '#262626' }) }}>
    <span style={{ font: `500 ${L.section}px ${FONT_UI}`, color: '#9b9b9b' }}>{name}</span>
    <svg width="12" height="8" viewBox="0 0 12 8">
      <path d="M1 1 L6 7 L11 1 Z" fill="#9b9b9b" />
    </svg>
  </div>
);

export const Sidebar: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState }> = ({ data, state, ui }) => {
  const user = data.user;
  return (
    <div
      data-target="sidebar"
      style={{ position: 'absolute', left: 0, top: L.titleH, width: L.sideW, bottom: 0, background: C.side, borderRight: `1px solid ${C.sideLine}`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', zIndex: 4 }}
    >
      {/* nav */}
      <div data-target="nav" style={{ padding: '14px 0 10px' }}>
        {data.nav.map((n) => {
          const t = `nav-${slug(n.label)}`;
          return (
            <div key={n.label} data-target={t} style={{ height: 50, margin: '0 12px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 16, padding: '0 18px', background: fill(ui, t, { hover: C.hover, pressed: C.press }) }}>
              <Ico name={n.icon} size={26} color="#dcdcdc" stroke={1.85} />
              <span style={{ font: `400 ${L.body}px ${FONT_UI}`, color: '#e6e6e6' }}>{n.label}</span>
            </div>
          );
        })}
      </div>

      {/* sessions */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        <div style={{ transform: state.sidebarScroll ? `translateY(${-Number(state.sidebarScroll)}px)` : undefined }}>
        {data.pinned?.length ? (
          <div data-target="pinned" style={{ paddingTop: GROUP_PAD }}>
            <Header name="Pinned" t="section-pinned" ui={ui} />
            {data.pinned.map((s) => (
              <Row key={s.id} s={s} depth={0} pinned data={data} state={state} ui={ui} />
            ))}
          </div>
        ) : null}
        {data.sections.map((sec) => (
          <div key={sec.name} data-target={`group-${slug(sec.name)}`} style={{ paddingTop: GROUP_PAD }}>
            <Header name={sec.name} t={`section-${slug(sec.name)}`} ui={ui} />
            {sec.sessions.map((s) => (
              <Row key={s.id} s={s} depth={0} data={data} state={state} ui={ui} />
            ))}
          </div>
        ))}
        </div>
      </div>

      {/* footer */}
      <div style={{ height: FOOTER_H, borderTop: `1px solid ${C.sideLine}`, display: 'flex', alignItems: 'center', padding: '0 14px 0 14px', gap: 10, flexShrink: 0, background: C.side, position: 'relative', zIndex: 2 }}>
        <div data-target="user" style={{ display: 'flex', alignItems: 'center', gap: 12, height: 56, padding: '0 12px 0 8px', borderRadius: 10, background: fill(ui, 'user', { hover: C.hover }), flex: 1, minWidth: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#3a3a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `600 18px ${FONT_UI}`, color: '#e8e8e8' }}>
            {user.initial ?? user.name.slice(0, 1)}
          </div>
          <span style={{ font: `500 ${L.body}px ${FONT_UI}`, color: '#ececec' }}>{user.name}</span>
          <span style={{ font: `400 ${L.small}px ${FONT_UI}`, color: '#9b9b9b' }}>· {user.plan}</span>
          <Ico name="chevron-down" size={18} color="#9b9b9b" stroke={2} />
        </div>
        <div data-target="debug" style={{ width: 48, height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: fill(ui, 'debug', { hover: C.hover }) }}>
          <Ico name="bug" size={26} color="#d8d8d8" stroke={1.7} />
        </div>
      </div>
    </div>
  );
};
