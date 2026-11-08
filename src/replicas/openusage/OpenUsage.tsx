import React from 'react';
import { Img, staticFile } from 'remotion';
import { usePlateSize, type ReplicaProps } from '../../app/replica';
import { FONT_UI, mergeData } from '../_shared/kit';
import { Dashboard, Footer } from './Dashboard';
import { defaultData, defaultState } from './defaults';
import { panelRect, stripLayout } from './geometry';
import { MenuBar } from './MenuBar';
import { AccountPage, AccountsScreen, SettingsScreen } from './Screens';
import { MENU_W, Menu, SHEET_W, Sheet, menuHeight } from './Sheets';
import { C, L, pt } from './tokens';
import type { OUData, OUState } from './types';

// OpenUsage on a Mac desktop strip: the menu bar with OpenUsage's strip, and its panel under it
// (dashboard, Accounts, an account's page, Settings), the Add Account sheet and the pull-down
// menus. 1920x1080 plate; a pure function of (data, state, ui).

export const OpenUsage: React.FC<ReplicaProps<Partial<OUData>, Partial<OUState>>> = ({ data: raw, state: rawState, ui }) => {
  const data = mergeData(defaultData, raw, ['desktop']);
  const state = { ...defaultState, ...rawState } as OUState;
  const [W, H] = usePlateSize();
  const pr = panelRect(data, state, W, H);
  const view = state.view ?? 'popup';

  // Options pull-down: anchored on the footer button, opening upward (the panel sits low on screen).
  let menu: React.ReactNode = null;
  if (state.open && state.menu === 'options' && view === 'popup') {
    const btnW = data.footer === 'options' ? pt(95) : pt(26);
    const btnX = pr.x + pr.w - L.margin - btnW;
    const btnTop = pr.y + pr.h - L.footerH / 2 - pt(14);
    const h = menuHeight(data.optionsMenu);
    const y = btnTop - h - pt(5) > L.menuH ? btnTop - h - pt(5) : btnTop + pt(33);
    menu = <Menu items={data.optionsMenu} x={Math.min(W - MENU_W - 10, btnX)} y={y} hover={state.menuHover} ui={ui} />;
  }
  if (state.menu === 'status') {
    const s = stripLayout(data, state, W);
    menu = <Menu items={data.statusMenu} x={Math.min(W - pt(180) - 10, s.x)} y={L.menuH + 3} hover={state.menuHover} ui={ui} w={pt(180)} />;
  }

  return (
    <div
      data-target="desktop"
      style={{
        width: W,
        height: H,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: FONT_UI,
        background: `radial-gradient(1200px 700px at 18% 82%, rgba(150,190,240,0.55), rgba(150,190,240,0) 70%), radial-gradient(900px 600px at 85% 30%, rgba(30,70,150,0.6), rgba(30,70,150,0) 70%), linear-gradient(170deg, ${C.wallTop}, ${C.wallBottom})`,
      }}
    >
      {data.desktop?.image ? <Img src={staticFile(data.desktop.image)} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top left' }} /> : null}
      <MenuBar data={data} state={state} ui={ui} W={W} />
      {state.open ? (
        <div
          data-target="panel"
          style={{
            position: 'absolute',
            left: pr.x,
            top: pr.y,
            width: pr.w,
            height: pr.h,
            borderRadius: L.panelR,
            background: C.panel,
            boxShadow: '0 20px 56px rgba(0,0,0,0.30), 0 0 0 1px rgba(0,0,0,0.24)',
            overflow: 'hidden',
          }}
        >
          {view === 'accounts' ? (
            <AccountsScreen data={data} state={state} ui={ui} />
          ) : view === 'account' ? (
            <AccountPage data={data} state={state} ui={ui} />
          ) : view === 'settings' ? (
            <SettingsScreen state={state} ui={ui} />
          ) : (
            <>
              <Dashboard data={data} state={state} ui={ui} viewH={pr.h} />
              <Footer data={data} state={state} ui={ui} />
            </>
          )}
        </div>
      ) : null}
      {state.open && state.sheet ? <Sheet data={data} state={state} ui={ui} x={pr.x + (pr.w - SHEET_W) / 2} y={pr.y + pt(6)} /> : null}
      {menu}
    </div>
  );
};
