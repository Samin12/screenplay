import React from 'react';
import type { UiState } from '../../../app/replica';
import { isHover, isPressed } from '../../../app/replica';
import { Ico, fill, slug } from '../../_shared/kit';
import type { DesktopData, DesktopState, SettingsRow } from '../types';
import { FONT_SF, FS, LC, LL } from './tokens';
import { Chev } from './icons';

// Light overlays: the "Switch model?" dialog (measured from his recording), the user menu and the
// Settings window. Settings is built from the installed app's code (Claude 4.16336.0: modal shell
// 16 px inset, 212 px nav with "Search settings", sections with h3 titles, rows label + description
// + control, switch 36x20, blue-450 #2a78d6) at his zoom (1 css px = 1.643 design px), in his light
// palette. It was not visible in his recording, so the layout follows the code, not a screenshot.

const txt = (size: number, color: string = LC.text, weight = 400): React.CSSProperties => ({ font: `${weight} ${size}px ${FONT_SF}`, color });
const Z = 1.643; // css px -> design px at his zoom

// ---------- Switch model? ----------

export const SwitchModelDialog: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState; W: number; H: number }> = ({ data, state, ui, W, H }) => {
  const d = state.dialog!;
  const from = d.from ?? data.model;
  const to = d.to ?? 'Fable 5.1';
  const w = 650.6;
  const h = 313;
  const cb = !!d.dontAsk;
  return (
    <div style={{ position: 'absolute', inset: 0, background: LC.scrim, zIndex: 60 }}>
      <div data-target="dialog" style={{ position: 'absolute', left: (W - w) / 2, top: (H - h) / 2, width: w, height: h, background: '#fdfdfd', borderRadius: 20, boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 20px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ position: 'absolute', left: 26.8, top: 37 - 16, lineHeight: '32px', ...txt(24.4, LC.text, 500) }}>Switch model?</div>
        <div style={{ position: 'absolute', left: 26.8, right: 26, top: 75.8 - 16.2, ...txt(23.6, LC.dim), lineHeight: '32.5px' }}>
          This session is cached for {from}. Switching to {to} means Claude re-reads the whole session on your next message, which uses more of your usage.
        </div>
        <div data-target="dialog-checkbox" style={{ position: 'absolute', left: 26.3, top: 199.5 - 16.25, height: 32.5, display: 'flex', alignItems: 'center', gap: 13.5 }}>
          <div style={{ width: 32.5, height: 32.5, borderRadius: 7, boxSizing: 'border-box', border: cb ? 'none' : '1.4px solid #cdcdcd', background: cb ? LC.blue : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {cb ? <Ico name="check" size={22} color="#fff" stroke={3} /> : null}
          </div>
          <span style={txt(22.9)}>Don’t ask again</span>
        </div>
        <div data-target="dialog-cancel" style={{ position: 'absolute', left: 338, top: 241, width: 102, height: 46, borderRadius: 10, background: fill(ui, 'dialog-cancel', { base: LC.btn, hover: '#e6e6e6', pressed: '#dadada' }), display: 'flex', alignItems: 'center', justifyContent: 'center', ...txt(22.2) }}>
          Cancel
        </div>
        <div
          data-target="dialog-confirm"
          style={{ position: 'absolute', left: 453, top: 241, width: 171.1, height: 46, borderRadius: 10, background: isPressed(ui, 'dialog-confirm') ? '#555' : isHover(ui, 'dialog-confirm') ? '#666' : LC.primaryBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', ...txt(22.2, '#ffffff') }}
        >
          Switch model
        </div>
      </div>
    </div>
  );
};

// ---------- user menu (click "Samin · Ultra") ----------

const USER_ITEMS: (string | { label: string; key?: string; sub?: boolean; icon?: string })[] = [
  { label: 'Settings', key: '⌘,', icon: 'settings' },
  { label: 'Language', sub: true, icon: 'globe' },
  { label: 'Get help', icon: 'circle-question-mark' },
  '-',
  { label: 'Get apps and extensions', icon: 'download' },
  { label: 'View changelog', icon: 'file-text' },
  { label: 'Learn more', sub: true, icon: 'info' },
  '-',
  { label: 'Sign out', icon: 'log-out' },
];

export const UserMenu: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState; H: number }> = ({ data, state, ui, H }) => {
  const IH = 48;
  const h = 76 + USER_ITEMS.reduce((a, it) => a + (it === '-' ? 17 : IH), 0) + 12;
  const top = H - LL.footerH - 10 - h;
  return (
    <div data-target="user-menu" style={{ position: 'absolute', left: 18, top, width: 447, height: h, background: LC.menu, border: `1px solid ${LC.menuLine}`, borderRadius: 18, boxShadow: '0 12px 36px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.05)', boxSizing: 'border-box', padding: '8px 9px', zIndex: 40 }}>
      <div style={{ height: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 14px', borderBottom: `1px solid ${LC.sep}`, marginBottom: 8 }}>
        <span style={txt(FS.small)}>{data.user.name}</span>
        <span style={txt(19, LC.dim)}>{data.user.plan} plan</span>
      </div>
      {USER_ITEMS.map((it, i) => {
        if (it === '-') return <div key={i} style={{ height: 1, background: LC.sep, margin: '8px 14px' }} />;
        const m = typeof it === 'string' ? { label: it } : it;
        const t = `user-menu-${slug(m.label)}`;
        return (
          <div key={i} data-target={t} style={{ height: IH, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 16, padding: '0 14px', background: fill(ui, t, { hover: '#efefef', pressed: '#e2e2e2' }) }}>
            {m.icon ? <Ico name={m.icon} size={22} color={LC.text} stroke={1.8} /> : null}
            <span style={{ ...txt(FS.small), flex: 1 }}>{m.label}</span>
            {m.key ? <span style={txt(19.5, LC.dim)}>{m.key}</span> : m.sub ? <Chev dir="right" w={13} stroke={1.8} color={LC.dim} /> : null}
          </div>
        );
      })}
    </div>
  );
};

// ---------- Settings window ----------

const SettingSwitch: React.FC<{ on: boolean; t: string; ui: UiState }> = ({ on, t, ui }) => {
  const w = 36 * Z;
  const h = 20 * Z;
  const k = 16 * Z;
  const hov = isHover(ui, t) || isPressed(ui, t);
  return (
    <div data-target={t} style={{ width: w, height: h, borderRadius: h, background: on ? (hov ? '#2569bd' : LC.blue) : hov ? '#bdbdbd' : '#cbcbcb', position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2 * Z, left: on ? w - k - 2 * Z : 2 * Z, width: k, height: k, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.22)' }} />
    </div>
  );
};

const Control: React.FC<{ r: SettingsRow; on: boolean; t: string; ui: UiState }> = ({ r, on, t, ui }) => {
  if (r.control === 'none') return null;
  if (r.control === 'select' || r.control === 'input') {
    const w = (r.control === 'input' || /Inside project/.test(r.value ?? '') ? 220 : 160) * Z;
    return (
      <div data-target={t} style={{ width: w, height: 30 * Z, borderRadius: 8 * Z, border: '1px solid #d9d9d9', background: fill(ui, t, { base: '#ffffff', hover: '#f6f6f6' }), boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: `0 ${10 * Z}px`, flexShrink: 0 }}>
        <span style={{ ...txt(FS.small, r.control === 'input' && !r.value ? LC.faint : LC.text), flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.value ?? ''}</span>
        {r.control === 'select' ? <Chev w={13} stroke={1.8} color={LC.dim} /> : null}
      </div>
    );
  }
  return <SettingSwitch on={on} t={t} ui={ui} />;
};

export const settingsNavLabel = (n: DesktopData['settings']['nav'][number]) => (typeof n === 'string' ? n : n.label);

export const LightSettings: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState; W: number; H: number }> = ({ data, state, ui, W, H }) => {
  const page = state.settingsPage ?? 'Claude Code';
  const rows = data.settings.pages[page] ?? [];
  const inset = 16 * Z;
  const mw = W - inset * 2;
  const mh = H - inset * 2;
  const topH = 52 * Z;
  const navW = 212 * Z;
  // group rows into sections, keeping order
  const sections: { name: string; rows: SettingsRow[] }[] = [];
  for (const r of rows) {
    const name = r.section ?? page;
    const last = sections[sections.length - 1];
    if (last && last.name === name) last.rows.push(r);
    else sections.push({ name, rows: [r] });
  }
  const navPitch = 46;
  let navY = 20 + 46 + 20; // after the search field
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.22)', zIndex: 55 }}>
      <div data-target="settings" style={{ position: 'absolute', left: inset, top: inset, width: mw, height: mh, background: '#fdfdfd', borderRadius: 14 * Z, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 24px 60px rgba(0,0,0,0.22)' }}>
        {/* top row */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: mw, height: topH, borderBottom: `1px solid ${LC.divider}`, display: 'flex', alignItems: 'center', padding: `0 ${16 * Z}px`, boxSizing: 'border-box' }}>
          <span style={{ ...txt(15 * Z, LC.text, 600), flex: 1 }}>Settings</span>
          <div data-target="settings-close" style={{ width: 28 * Z, height: 28 * Z, borderRadius: 8 * Z, display: 'flex', alignItems: 'center', justifyContent: 'center', background: fill(ui, 'settings-close', { hover: LC.hover, pressed: LC.press }) }}>
            <Ico name="x" size={26} color={LC.text} stroke={1.8} />
          </div>
        </div>

        {/* nav */}
        <div data-target="settings-nav" style={{ position: 'absolute', left: 0, top: topH, width: navW, height: mh - topH, borderRight: `1px solid ${LC.divider}`, background: '#f8f8f8', boxSizing: 'border-box', overflow: 'hidden' }}>
          <div data-target="settings-search" style={{ position: 'absolute', left: 20, right: 20, top: 20, height: 46, borderRadius: 10, border: '1px solid #e0e0e0', background: '#ffffff', display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px' }}>
            <Ico name="search" size={22} color={LC.dim} stroke={1.8} />
            <span style={txt(FS.small, LC.faint)}>Search settings</span>
          </div>
          {data.settings.nav.map((n, i) => {
            const label = settingsNavLabel(n);
            const group = typeof n === 'object' ? n.group : undefined;
            const icon = typeof n === 'object' ? n.icon : undefined;
            const t = `settings-nav-${slug(label)}`;
            const out: React.ReactNode[] = [];
            if (group) {
              out.push(
                <div key={`g${i}`} style={{ position: 'absolute', left: 34, top: navY + 10, lineHeight: '30px', ...txt(19.5, LC.dim) }}>
                  {group}
                </div>,
              );
              navY += 42;
            }
            const on = label === page;
            out.push(
              <div
                key={label}
                data-target={t}
                style={{ position: 'absolute', left: 14, right: 14, top: navY, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', background: fill(ui, t, { hover: 'rgba(0,0,0,0.045)', pressed: 'rgba(0,0,0,0.09)', active: on, activeBg: 'rgba(0,0,0,0.065)' }) }}
              >
                {icon ? <Ico name={icon} size={22} color={LC.text} stroke={1.75} /> : null}
                <span style={txt(21.6)}>{label}</span>
              </div>,
            );
            navY += navPitch;
            return out;
          })}
        </div>

        {/* page */}
        <div data-target="settings-page" style={{ position: 'absolute', left: navW, top: topH, width: mw - navW, height: mh - topH, overflow: 'hidden' }}>
          <div style={{ padding: `${24 * Z}px ${32 * Z}px 60px`, maxWidth: 680 * Z, transform: state.settingsScroll ? `translateY(${-Number(state.settingsScroll)}px)` : undefined }}>
            {sections.map((s) => (
              <section key={s.name} data-target={`settings-section-${slug(s.name)}`} style={{ marginBottom: 32 * Z }}>
                <h3 style={{ margin: `0 0 ${10 * Z}px`, ...txt(15 * Z, LC.text, 600), lineHeight: `${20 * Z}px` }}>{s.name}</h3>
                {s.rows.map((r, i) => {
                  const k = slug(r.label);
                  const on = state.toggles?.[k] ?? r.on ?? false;
                  const hl = state.settingsHover === r.label;
                  return (
                    <div
                      key={r.label}
                      data-target={`setting-${k}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 20 * Z,
                        padding: `${11 * Z}px ${hl ? 12 : 0}px ${11 * Z}px ${r.indent ? 24 * Z : hl ? 12 : 0}px`,
                        margin: hl ? '0 -12px' : 0,
                        borderTop: i ? `1px solid ${LC.divider}` : 'none',
                        borderRadius: hl ? 10 : 0,
                        background: hl ? '#f3f3f3' : 'transparent',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...txt(14 * Z), lineHeight: `${20 * Z}px` }}>{r.label}</div>
                        {r.desc ? <div style={{ ...txt(14 * Z, LC.dim), lineHeight: `${20 * Z}px`, marginTop: 2 }}>{r.desc}</div> : null}
                      </div>
                      <Control r={r} on={on} t={`toggle-${k}`} ui={ui} />
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
