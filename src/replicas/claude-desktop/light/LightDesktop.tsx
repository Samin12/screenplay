import React from 'react';
import { usePlateSize, type UiState } from '../../../app/replica';
import { isHover, isPressed } from '../../../app/replica';
import { Ico, slug } from '../../_shared/kit';
import type { DesktopData, DesktopState, MenuItem, Message, Session } from '../types';
import { FONT_SF, FS, LC, LL, TRACK } from './tokens';
import { LightRail, LightSidebar, LightTitleBar, sidebarRowCenters } from './Chrome';
import { LightChat } from './Chat';
import { LightSettings, SwitchModelDialog, UserMenu } from './Overlays';
import { Chev } from './icons';

// Claude Desktop in light mode, Code tab: Samin's setup. Same targets as the dark replica where the
// element exists, plus the light-only ones (model menu, dialog, settings window, usage cards).

const findSession = (list: Session[], id: string | null): Session | undefined => {
  if (!id) return undefined;
  for (const s of list) {
    if (s.id === id) return s;
    const k = s.children ? findSession(s.children, id) : undefined;
    if (k) return k;
  }
  return undefined;
};

const norm = (m: MenuItem) => (typeof m === 'string' ? (m === '-' ? null : { label: m }) : m);

const LightMenu: React.FC<{ items: MenuItem[]; hover?: string; ui: UiState; x: number; y: number; W: number; H: number }> = ({ items, hover, ui, x, y, W, H }) => {
  const IH = 48;
  const w = 380;
  const h = 18 + items.reduce((a, raw) => a + (norm(raw) ? IH : 17), 0);
  const left = Math.max(12, Math.min(W - w - 12, x));
  const top = Math.max(LL.titleH + 6, Math.min(H - h - 12, y));
  let subTop = 9;
  let sub: string[] | undefined;
  for (const raw of items) {
    const m = norm(raw);
    if (!m) {
      subTop += 17;
      continue;
    }
    if (m.label === hover) {
      sub = m.sub;
      break;
    }
    subTop += IH;
  }
  const list = (its: MenuItem[], prefix: string, target: string, width: number) => (
    <div data-target={target} style={{ width, background: LC.menu, border: `1px solid ${LC.menuLine}`, borderRadius: 16, padding: '8px 8px', boxSizing: 'border-box', boxShadow: '0 12px 36px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.05)' }}>
      {its.map((raw, i) => {
        const m = norm(raw);
        if (!m) return <div key={i} style={{ height: 1, background: LC.sep, margin: '8px 12px' }} />;
        const t = `${prefix}-${slug(m.label)}`;
        const on = hover === m.label || isHover(ui, t);
        return (
          <div key={i} data-target={t} style={{ height: IH, borderRadius: 10, display: 'flex', alignItems: 'center', padding: '0 16px', background: isPressed(ui, t) ? '#e2e2e2' : on ? '#efefef' : 'transparent' }}>
            <span style={{ flex: 1, font: `400 ${FS.small}px ${FONT_SF}`, color: m.danger ? LC.red : LC.text, whiteSpace: 'nowrap' }}>{m.label}</span>
            {m.sub ? <Chev dir="right" w={13} stroke={1.8} color={LC.dim} /> : m.key ? <span style={{ font: `400 19.5px ${FONT_SF}`, color: LC.dim }}>{m.key}</span> : null}
          </div>
        );
      })}
    </div>
  );
  return (
    <>
      <div style={{ position: 'absolute', left, top, zIndex: 40 }}>{list(items, 'menu-item', 'menu', w)}</div>
      {sub ? <div style={{ position: 'absolute', left: left + w - 6, top: Math.min(top + subTop - 9, H - (18 + sub.length * IH) - 12), zIndex: 41 }}>{list(sub, 'submenu-item', 'submenu', 300)}</div> : null}
    </>
  );
};

const MenuBar: React.FC<{ W: number }> = ({ W }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: 31, background: 'linear-gradient(180deg, #24508f, #1f4787)', display: 'flex', alignItems: 'center', gap: 22, padding: '0 22px', boxSizing: 'border-box', font: `500 15px ${FONT_SF}`, color: '#fff', zIndex: 80 }}>
    <Ico name="apple" size={17} color="#fff" stroke={1.6} />
    <span style={{ fontWeight: 700 }}>Claude</span>
    {['File', 'Edit', 'View', 'Go', 'Window', 'Help'].map((m) => (
      <span key={m}>{m}</span>
    ))}
    <div style={{ flex: 1 }} />
    <span>Claude Code ~96%</span>
    <span>Codex 20%</span>
    <Ico name="wifi" size={17} color="#fff" stroke={2} />
    <Ico name="battery-full" size={20} color="#fff" stroke={1.6} />
  </div>
);

export const LightDesktop: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState }> = ({ data, state, ui }) => {
  const [W, H0] = usePlateSize();
  const MB = data.menubar ? 31 : 0;
  const H = H0 - MB;
  const sideW = state.sidebar === false ? 0 : LL.sideW;
  const railW = state.rail ? LL.railW : 0;
  const mainW = W - sideW - railW;

  const all = [...(data.pinned ?? []), ...data.sections.flatMap((s) => s.sessions)];
  const active = findSession(all, state.active);
  const title = active?.title ?? data.windowTitle ?? 'New session';
  let messages: Message[] = state.active && data.chats?.[state.active] ? data.chats[state.active] : state.active ? data.messages : [];
  if (state.upto !== null && state.upto !== undefined) messages = messages.slice(0, Number(state.upto));
  if (state.append?.length) messages = [...messages, ...state.append];

  const keys = (items: MenuItem[]): MenuItem[] =>
    data.chrome === 'windows' ? items.map((it) => (typeof it === 'object' && it.key ? { ...it, key: it.key.replace(/⇧/g, 'Shift+').replace(/⌘/g, 'Ctrl+').replace(/⌥/g, 'Alt+') } : it)) : items;
  let menu: React.ReactNode = null;
  if (state.menu) {
    const m = state.menu;
    if (m.for === 'tool-more') menu = <LightMenu items={keys(m.items ?? data.moreMenu)} hover={m.hover} ui={ui} x={W - 18 - 380} y={LL.titleH + 4} W={W} H={H} />;
    else {
      const cy = sidebarRowCenters(data, state)[m.for];
      if (cy !== undefined) {
        const items = keys(m.items ?? data.menu);
        const h = 18 + items.reduce<number>((a, raw) => a + (norm(raw) ? 48 : 17), 0);
        const below = cy + 30;
        const y = m.placement === 'above' || (m.placement !== 'below' && below + h > H - 12) ? cy - 30 - h : m.placement === 'right' ? cy - 30 : below;
        menu = <LightMenu items={items} hover={m.hover} ui={ui} x={m.placement === 'right' ? sideW + 8 : sideW - 150} y={y} W={W} H={H} />;
      }
    }
  }

  return (
    <div style={{ width: W, height: H0, position: 'relative', overflow: 'hidden', background: LC.bg, fontFamily: FONT_SF, color: LC.text, letterSpacing: TRACK }}>
      {MB ? <MenuBar W={W} /> : null}
      <div style={{ position: 'absolute', left: 0, top: MB, width: W, height: H }}>
        <LightTitleBar data={data} state={state} ui={ui} title={title} W={W} sideW={sideW} />
        {sideW ? <LightSidebar data={data} state={state} ui={ui} H={H} /> : null}
        <div data-target="main" style={{ position: 'absolute', left: sideW, top: LL.titleH, width: mainW, height: H - LL.titleH }} />
        <LightChat data={data} state={state} ui={ui} messages={messages} mainLeft={sideW} mainW={mainW} H={H} />
        {state.rail ? <LightRail data={data} state={state} ui={ui} W={W} H={H} /> : null}
        {menu}
        {state.userMenu ? <UserMenu data={data} state={state} ui={ui} H={H} /> : null}
        {state.dialog?.kind === 'switch-model' ? <SwitchModelDialog data={data} state={state} ui={ui} W={W} H={H} /> : null}
        {state.view === 'settings' ? <LightSettings data={data} state={state} ui={ui} W={W} H={H} /> : null}
      </div>
    </div>
  );
};
