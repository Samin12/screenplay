import React from 'react';
import type { UiState } from '../../app/replica';
import { isHover, isPressed, usePlateSize } from '../../app/replica';
import { Ico, Switch, fill, slug, FONT_UI } from '../_shared/kit';
import { C, L } from './tokens';
import type { DesktopData, DesktopState, MenuItem } from './types';

// Context menu (session rows and the toolbar "more" button), slash-command popover, settings modal.

const norm = (m: MenuItem) => (typeof m === 'string' ? (m === '-' ? null : { label: m }) : m);

const MENU_W = 380;
const ITEM_H = 58;

const MenuList: React.FC<{ items: MenuItem[]; hover?: string; ui: UiState; prefix: string; target: string; width?: number; withIcons?: boolean }> = ({ items, hover, ui, prefix, target, width = MENU_W, withIcons }) => (
  <div
    data-target={target}
    style={{
      width,
      background: C.menu,
      border: `1px solid ${C.menuLine}`,
      borderRadius: 16,
      padding: 8,
      boxSizing: 'border-box',
      boxShadow: '0 18px 48px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4)',
    }}
  >
    {items.map((raw, i) => {
      const m = norm(raw);
      if (!m) return <div key={i} style={{ height: 1, background: C.menuSep, margin: '8px 10px' }} />;
      const t = `${prefix}-${slug(m.label)}`;
      const on = hover === m.label || isHover(ui, t);
      return (
        <div
          key={i}
          data-target={t}
          style={{
            height: ITEM_H,
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '0 18px 0 20px',
            background: isPressed(ui, t) ? C.press : on ? C.menuHover : 'transparent',
          }}
        >
          {withIcons && m.icon ? <Ico name={m.icon} size={24} color="#dcdcdc" stroke={1.7} /> : null}
          <span style={{ flex: 1, font: `400 ${L.body}px ${FONT_UI}`, color: m.danger ? C.red : '#efefef', whiteSpace: 'nowrap' }}>{m.label}</span>
          {m.sub ? <Ico name="chevron-right" size={20} color="#bdbdbd" stroke={2} /> : m.key ? <span style={{ font: `400 ${L.small}px ${FONT_UI}`, color: C.shortcut }}>{m.key}</span> : null}
        </div>
      );
    })}
  </div>
);

export const menuHeight = (items: MenuItem[]) => 18 + items.reduce((h, raw) => h + (norm(raw) ? ITEM_H : 17), 0);

// Context menu at window coordinates. `x`/`y` is the top-left; the caller clamps it to the window.
export const ContextMenu: React.FC<{ items: MenuItem[]; hover?: string; ui: UiState; x: number; y: number; width?: number }> = ({ items, hover, ui, x, y, width = MENU_W }) => {
  const [, plateH] = usePlateSize();
  // top of the hovered item -> submenu top
  let subTop = 9;
  let subItems: string[] | undefined;
  for (const raw of items) {
    const m = norm(raw);
    if (!m) {
      subTop += 17;
      continue;
    }
    if (m.label === hover) {
      subItems = m.sub;
      break;
    }
    subTop += ITEM_H;
  }
  const subH = subItems ? menuHeight(subItems) : 0;
  const subY = Math.min(y + subTop - 9, plateH - subH - 12);
  const SUB_W = 330;
  // One wrapper spanning menu + submenu (no target: a rectangular clone of the union would show
  // the app behind the empty corner; lift `menu` or `submenu` instead).
  const top = subItems ? Math.min(y, subY) : y;
  const bottom = subItems ? Math.max(y + menuHeight(items), subY + subH) : y + menuHeight(items);
  return (
    <div style={{ position: 'absolute', left: x, top, width: width + (subItems ? SUB_W - 6 : 0), height: bottom - top, zIndex: 40 }}>
      <div style={{ position: 'absolute', left: 0, top: y - top }}>
        <MenuList items={items} hover={hover} ui={ui} prefix="menu-item" target="menu" width={width} />
      </div>
      {subItems ? (
        <div style={{ position: 'absolute', left: width - 6, top: subY - top, zIndex: 1 }}>
          <MenuList items={subItems.map((s) => ({ label: s, icon: s === 'Split view' ? 'columns-2' : s === 'New window' ? 'app-window' : undefined }))} ui={ui} prefix="submenu-item" target="submenu" width={SUB_W} withIcons />
        </div>
      ) : null}
    </div>
  );
};

// Popover above the composer, same width. Rows: command (semibold) + grey description, ellipsised.
export const SlashMenu: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState }> = ({ data, state, ui }) => {
  const list = state.slash ?? [];
  return (
    <div
      data-target="slash"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 'calc(100% + 14px)',
        background: C.menu,
        border: `1px solid ${C.menuLine}`,
        borderRadius: 18,
        padding: 10,
        boxShadow: '0 18px 48px rgba(0,0,0,0.5)',
        zIndex: 20,
      }}
    >
      {list.map((it, i) => {
        if (it === '-') return <div key={i} style={{ height: 1, background: C.menuSep, margin: '10px 16px' }} />;
        const name = typeof it === 'string' ? it.replace(/^\//, '') : it.name.replace(/^\//, '');
        const desc = typeof it === 'string' ? data.commands.find((c) => c.name === name)?.desc ?? '' : it.desc ?? data.commands.find((c) => c.name === name)?.desc ?? '';
        const t = `slash-${slug(name)}`;
        const on = state.slashHover === name || isHover(ui, t);
        return (
          <div key={i} data-target={t} style={{ height: 58, borderRadius: 10, display: 'flex', alignItems: 'center', padding: '0 22px', background: isPressed(ui, t) ? C.press : on ? '#363636' : 'transparent' }}>
            <span style={{ width: 250, flexShrink: 0, font: `600 ${L.body}px ${FONT_UI}`, color: '#f4f4f4' }}>{name}</span>
            <span style={{ flex: 1, minWidth: 0, font: `400 ${L.body}px ${FONT_UI}`, color: '#9a9a9a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{desc}</span>
          </div>
        );
      })}
    </div>
  );
};

// Settings modal over the dimmed app: left nav + page of toggle rows.
export const SettingsModal: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState }> = ({ data, state, ui }) => {
  const page = state.settingsPage ?? 'Claude Code';
  const rows = data.settings.pages[page] ?? [];
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 110 }}>
      <div data-target="settings" style={{ width: 1240, height: 680, background: C.modal, border: '1px solid #333', borderRadius: 22, display: 'flex', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ width: 320, borderRight: '1px solid #2e2e2e', padding: '40px 18px', boxSizing: 'border-box', background: '#1c1c1c' }}>
          <div style={{ font: `600 30px ${FONT_UI}`, color: '#f2f2f2', padding: '0 18px 30px' }}>Settings</div>
          {data.settings.nav.map((n) => {
            const t = `settings-nav-${slug(n)}`;
            return (
              <div key={n} data-target={t} style={{ height: 52, borderRadius: 10, display: 'flex', alignItems: 'center', padding: '0 18px', marginBottom: 6, background: fill(ui, t, { hover: C.hover, pressed: C.press, active: n === page, activeBg: '#333333' }) }}>
                <span style={{ font: `400 ${L.body}px ${FONT_UI}`, color: n === page ? '#f4f4f4' : '#d4d4d4' }}>{n}</span>
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1, padding: '44px 56px', boxSizing: 'border-box' }}>
          <div style={{ font: `600 36px ${FONT_UI}`, color: '#f4f4f4', paddingBottom: 30, borderBottom: '1px solid #2e2e2e' }}>{page}</div>
          {rows.map((r) => {
            const t = `toggle-${slug(r.label)}`;
            const on = !!state.toggles?.[slug(r.label)];
            return (
              <div key={r.label} data-target={`setting-${slug(r.label)}`} style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '26px 0', borderBottom: '1px solid #2e2e2e' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ font: `400 25px ${FONT_UI}`, color: '#efefef' }}>{r.label}</div>
                  {r.desc ? <div style={{ font: `400 ${L.small}px ${FONT_UI}`, color: '#8f8f8f', marginTop: 6 }}>{r.desc}</div> : null}
                </div>
                <Switch on={on} target={t} ui={ui} w={60} h={34} onColor={C.toggle} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
