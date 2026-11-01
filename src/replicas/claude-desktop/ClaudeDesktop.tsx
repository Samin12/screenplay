import React from 'react';
import { usePlateSize, type ReplicaProps } from '../../app/replica';
import { FONT_UI, mergeData } from '../_shared/kit';
import { C, L } from './tokens';
import type { DesktopData, DesktopState, MenuItem, Message, Session } from './types';
import { TitleBar } from './TitleBar';
import { Sidebar, sidebarRowTops } from './Sidebar';
import { ChatPane } from './Chat';
import { AgentsPanel, Rail } from './Rail';
import { ContextMenu, SettingsModal, menuHeight } from './Menus';
import { defaultData, defaultState } from './defaults';

// Claude desktop app, dark theme, macOS chrome by default. 1920x1080 design size at ~1.5x real UI.
// Pure function of (data, state, ui).

const findSession = (list: Session[], id: string | null): Session | undefined => {
  if (!id) return undefined;
  for (const s of list) {
    if (s.id === id) return s;
    const k = s.children ? findSession(s.children, id) : undefined;
    if (k) return k;
  }
  return undefined;
};

export const ClaudeDesktop: React.FC<ReplicaProps<Partial<DesktopData>, Partial<DesktopState>>> = ({ data: rawData, state: rawState, ui }) => {
  const data = mergeData(defaultData, rawData, ['user', 'environment', 'context', 'settings', 'ribbon', 'agents', 'chats']);
  const state = { ...defaultState, ...rawState } as DesktopState;

  const all = [...(data.pinned ?? []), ...data.sections.flatMap((s) => s.sessions)];
  const active = findSession(all, state.active);
  const title = active?.title ?? data.windowTitle ?? 'New session';

  let messages: Message[] = state.active && data.chats?.[state.active] ? data.chats[state.active] : state.active ? data.messages : [];
  if (state.upto !== null && state.upto !== undefined) messages = messages.slice(0, Number(state.upto));
  if (state.append?.length) messages = [...messages, ...state.append];

  const [W, H] = usePlateSize();
  const sideW = state.sidebar === false ? 0 : L.sideW;
  const rightW = state.panel === 'agents' ? 785 : state.rail ? L.railW : 0;
  const mainW = W - sideW - rightW;
  const colW = Math.min(L.colMax, mainW - L.colPad * 2);

  // Context menu: under the toolbar "more" button, or next to a session row (clamped to the window).
  // Shortcuts are written with mac glyphs; Windows chrome spells them out.
  const keys = (items: MenuItem[]): MenuItem[] =>
    data.chrome === 'windows' ? items.map((it) => (typeof it === 'object' && it.key ? { ...it, key: it.key.replace(/⇧/g, 'Shift+').replace(/⌘/g, 'Ctrl+').replace(/⌥/g, 'Alt+') } : it)) : items;
  let menu: React.ReactNode = null;
  if (state.menu) {
    const m = state.menu;
    if (m.for === 'tool-more') {
      const items = keys(m.items ?? data.moreMenu);
      menu = <ContextMenu items={items} hover={m.hover} ui={ui} x={W - rightW - 22 - 560} y={L.titleH + 6} width={560} />;
    } else {
      const items = keys(m.items ?? data.menu);
      const top = sidebarRowTops(data, state)[m.for];
      if (top !== undefined) {
        const h = menuHeight(items);
        // below the row by default; flips above when it would not fit (like a real OS menu)
        let place = m.placement ?? 'below';
        if (place === 'below' && top + 56 + h > H - 12 && top - h - 4 >= L.titleH + 8) place = 'above';
        const x = place === 'right' ? sideW + 10 : Math.max(12, sideW - 140);
        const want = place === 'right' ? top - 8 : place === 'above' ? top - h - 4 : top + 56;
        const y = Math.max(L.titleH + 8, Math.min(H - h - 12, want));
        menu = <ContextMenu items={items} hover={m.hover} ui={ui} x={x} y={y} />;
      }
    }
  }

  return (
    <div style={{ width: W, height: H, position: 'relative', overflow: 'hidden', background: C.bg, fontFamily: FONT_UI, color: C.text, letterSpacing: '-0.01em' }}>
      <TitleBar data={data} state={state} ui={ui} title={title} rightInset={state.panel === 'agents' ? 785 : 0} />
      {sideW ? <Sidebar data={data} state={state} ui={ui} /> : null}
      <div data-target="main" style={{ position: 'absolute', left: sideW, top: L.titleH, width: mainW, bottom: 0, zIndex: 1 }}>
        <ChatPane data={data} state={state} ui={ui} messages={messages} colW={colW} />
      </div>
      {state.rail && state.panel !== 'agents' ? <Rail data={data} state={state} ui={ui} /> : null}
      {state.panel === 'agents' ? <AgentsPanel data={data} ui={ui} frame={ui.frame} /> : null}
      {menu}
      {state.view === 'settings' ? <SettingsModal data={data} state={state} ui={ui} /> : null}
    </div>
  );
};
