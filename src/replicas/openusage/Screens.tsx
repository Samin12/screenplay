import React from 'react';
import type { UiState } from '../../app/replica';
import { isHover, isPressed } from '../../app/replica';
import { FONT_UI, Ico, slug } from '../_shared/kit';
import { accountTitle, providerName } from './Dashboard';
import { visibleAccounts } from './geometry';
import { Chevron, Grip, MacSwitch, ProviderIcon } from './Glyphs';
import { C, L, pt } from './tokens';
import { SETTINGS, SETTINGS_TABS, type SettingsRow as Row } from './settings';
import type { Account, OUData, OUState } from './types';

// The panel's other screens, from OpenUsage's current source (Sources/OpenUsage/Views:
// PopoverTopBar, AccountListView/AccountListRow, AccountDetailView, PopoverFooter, SettingsScreen):
// Accounts (back chevron, "Accounts", one row per account with grip, mark, name, account label and
// chevron, "Add New Account" at the bottom), an account's page (its metrics with pin + switch,
// "Remove Account…"), and Settings (General / Display / Alerts / Advanced tabs, grouped form).

const body = (w = 400): React.CSSProperties => ({ font: `${w} ${pt(13)}px ${FONT_UI}`, color: C.text, letterSpacing: '-0.012em' });
const muted: React.CSSProperties = { ...body(), color: C.secondary };
const card: React.CSSProperties = { borderRadius: L.cardR, background: C.card, boxShadow: `inset 0 0 0 1px ${C.cardLine}` };

const BackButton: React.FC<{ ui: UiState }> = ({ ui }) => (
  <div data-target="back" style={{ width: pt(28), height: pt(28), borderRadius: pt(8), display: 'flex', alignItems: 'center', justifyContent: 'center', background: isHover(ui, 'back') || isPressed(ui, 'back') ? 'rgba(0,0,0,0.06)' : 'transparent' }}>
    <Chevron dir="left" size={pt(15)} color={C.accent} weight={2.7} />
  </div>
);

const TopBar: React.FC<{ title: React.ReactNode; trailing?: React.ReactNode; ui: UiState }> = ({ title, trailing, ui }) => (
  <div data-target="top-bar" style={{ height: L.topBarH, position: 'relative', display: 'flex', alignItems: 'flex-end', padding: `0 ${L.margin}px ${pt(2)}px`, boxSizing: 'border-box' }}>
    <BackButton ui={ui} />
    <div style={{ flex: 1 }} />
    {trailing ?? <div style={{ width: pt(28) }} />}
    <div style={{ position: 'absolute', left: pt(54), right: pt(54), bottom: pt(2), height: pt(28), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span data-target="screen-title" style={{ ...body(600), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {title}
      </span>
    </div>
  </div>
);

const RowShell: React.FC<{ target: string; ui: UiState; children: React.ReactNode }> = ({ target, ui, children }) => (
  <div
    data-target={target}
    style={{ height: L.rowH, display: 'flex', alignItems: 'center', gap: pt(10), padding: `0 ${pt(12)}px`, background: isHover(ui, target) || isPressed(ui, target) ? 'rgba(0,0,0,0.035)' : 'transparent' }}
  >
    {children}
  </div>
);

export const AccountsScreen: React.FC<{ data: OUData; state: OUState; ui: UiState }> = ({ data, state, ui }) => {
  const accts = visibleAccounts(data, state);
  const add = isHover(ui, 'add-account') || isPressed(ui, 'add-account');
  return (
    <div data-target="accounts-screen" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <TopBar title="Accounts" ui={ui} />
      <div style={{ padding: `${pt(10)}px ${L.margin}px 0`, flex: 1 }}>
        {accts.length ? (
          <div data-target="accounts-list" style={{ ...card, overflow: 'hidden' }}>
            {accts.map((a) => (
              <RowShell key={a.id} target={`account-row-${a.id}`} ui={ui}>
                <Grip size={pt(16)} />
                <ProviderIcon id={a.provider} size={pt(18)} color="#3a3a3a" />
                <span style={{ ...body(), whiteSpace: 'nowrap' }}>{providerName(a.provider)}</span>
                {a.label ? <span style={{ ...muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{a.label}</span> : null}
                <div style={{ flex: 1 }} />
                <div data-target={`account-row-${a.id}-open`}>
                  <Chevron dir="right" size={pt(12)} color={C.tertiary} weight={2.6} />
                </div>
              </RowShell>
            ))}
          </div>
        ) : (
          <div data-target="accounts-list" style={{ height: pt(110), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: pt(8) }}>
            <Ico name="circle-user-round" size={pt(30)} color={C.tertiary} stroke={1.6} />
            <span style={{ font: `600 ${pt(15)}px ${FONT_UI}`, color: C.secondary }}>No Accounts</span>
          </div>
        )}
      </div>
      <div style={{ padding: `${pt(10)}px ${L.margin}px ${pt(14)}px` }}>
        <div
          data-target="add-account"
          style={{ height: pt(30), borderRadius: pt(15), background: add ? '#006ce6' : C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `500 ${pt(13)}px ${FONT_UI}`, color: '#fff', letterSpacing: '-0.01em', boxShadow: '0 1px 2px rgba(0,0,0,0.12)' }}
        >
          Add New Account
        </div>
      </div>
    </div>
  );
};

const metricTitles = (a: Account) => [...a.metrics, ...(a.more ?? [])].map((m) => (m.kind === 'trend' ? m.label ?? 'Usage Trend' : m.label));

export const AccountPage: React.FC<{ data: OUData; state: OUState; ui: UiState }> = ({ data, state, ui }) => {
  const a = data.accounts.find((x) => x.id === state.account) ?? visibleAccounts(data, state)[0];
  if (!a) return null;
  const hidden = state.toggles ?? {};
  return (
    <div data-target="account-page" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <TopBar
        ui={ui}
        title={<span data-target="account-title">{a.label ?? accountTitle(a)}</span>}
        trailing={
          <div style={{ width: pt(28), height: pt(28), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ProviderIcon id={a.provider} size={pt(22)} color="#3a3a3a" />
          </div>
        }
      />
      <div style={{ padding: `${pt(10)}px ${L.margin}px 0`, display: 'flex', flexDirection: 'column', gap: pt(14) }}>
        <div data-target="metrics-card" style={{ ...card, overflow: 'hidden' }}>
          {metricTitles(a).map((t) => {
            const s = slug(t);
            const on = hidden[`hide-${s}`] !== true;
            const pinned = hidden[`pin-${s}`] === true;
            return (
              <RowShell key={t} target={`metric-row-${s}`} ui={ui}>
                <Grip size={pt(16)} />
                <span style={{ ...body(), color: on ? C.text : C.secondary }}>{t}</span>
                <div style={{ flex: 1 }} />
                <div data-target={`metric-pin-${s}`}>
                  <Ico name="pin" size={pt(12)} color={pinned ? C.secondary : C.tertiary} stroke={2.2} />
                </div>
                <MacSwitch on={on} target={`metric-switch-${s}`} w={pt(26)} ui={ui} hover={isHover(ui, `metric-switch-${s}`)} />
              </RowShell>
            );
          })}
        </div>
        <div style={{ ...card }}>
          <RowShell target="remove-account" ui={ui}>
            <span style={{ ...body(), color: C.red }}>Remove Account…</span>
          </RowShell>
        </div>
      </div>
    </div>
  );
};

// ---------- Settings ----------

const Control: React.FC<{ r: Row; s: string; state: OUState; ui: UiState }> = ({ r, s, state, ui }) => {
  if (r.kind === 'toggle') return <MacSwitch on={!!state.toggles?.[s]} target={`toggle-${s}`} w={pt(26)} ui={ui} hover={isHover(ui, `toggle-${s}`)} />;
  if (r.kind === 'picker')
    return (
      <span data-target={`picker-${s}`} style={{ display: 'inline-flex', alignItems: 'center', gap: pt(4), ...body(), color: C.secondary }}>
        {r.value}
        <Ico name="chevrons-up-down" size={pt(11)} color={C.secondary} stroke={2} />
      </span>
    );
  if (r.kind === 'shortcut')
    return (
      <span data-target={`picker-${s}`} style={{ ...body(), color: C.tertiary, padding: `${pt(2)}px ${pt(10)}px`, borderRadius: pt(6), boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)', background: '#fff' }}>
        {r.value}
      </span>
    );
  if (r.kind === 'button')
    return (
      <span data-target={`button-${s}`} style={{ ...body(), padding: `${pt(3)}px ${pt(12)}px`, borderRadius: pt(12), background: 'rgba(0,0,0,0.06)' }}>
        {r.value}
      </span>
    );
  return null;
};

export const SettingsScreen: React.FC<{ state: OUState; ui: UiState }> = ({ state, ui }) => {
  const tab = state.settingsTab ?? 'general';
  return (
    <div data-target="settings" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: `${pt(14)}px ${L.margin}px 0` }}>
      <div style={{ height: pt(28), position: 'relative', display: 'flex', alignItems: 'center' }}>
        <BackButton ui={ui} />
        <span data-target="screen-title" style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', ...body(600), pointerEvents: 'none' }}>
          Settings
        </span>
      </div>
      <div style={{ display: 'flex', gap: pt(2), marginTop: pt(10) }}>
        {SETTINGS_TABS.map((t) => {
          const sel = t.id === tab;
          const id = `settings-tab-${t.id}`;
          const col = sel ? C.accent : C.secondary;
          return (
            <div
              key={t.id}
              data-target={id}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: pt(2), padding: `${pt(5)}px 0 ${pt(4)}px`, borderRadius: pt(7), background: sel ? 'rgba(0,0,0,0.06)' : isHover(ui, id) ? 'rgba(0,0,0,0.03)' : 'transparent' }}
            >
              <Ico name={t.icon} size={pt(17)} color={col} stroke={1.8} />
              <span style={{ font: `500 ${pt(11)}px ${FONT_UI}`, color: col }}>{t.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: pt(14), marginTop: pt(12) }}>
        {SETTINGS[tab].map((sec, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
            {sec.header ? <div style={{ font: `600 ${pt(11.5)}px ${FONT_UI}`, color: C.secondary, padding: `0 ${pt(10)}px ${pt(6)}px` }}>{sec.header}</div> : null}
            <div style={{ ...card, overflow: 'hidden' }}>
              {sec.preview ? (
                <div data-target="priority-preview" style={{ height: pt(44), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: pt(14), borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  {[
                    ['claude', '12%'],
                    ['codex', '18%'],
                    ['cursor', '27%'],
                  ].map(([p, v]) => (
                    <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: pt(4), padding: `${pt(3)}px ${pt(7)}px`, borderRadius: pt(6), background: 'rgba(0,0,0,0.05)' }}>
                      <ProviderIcon id={p} size={pt(12)} color="#3a3a3a" />
                      <span style={{ font: `700 ${pt(11.5)}px ${FONT_UI}`, color: C.text }}>{v}</span>
                    </span>
                  ))}
                </div>
              ) : null}
              {sec.rows.map((r, k) => {
                const s = slug(r.label);
                return (
                  <div
                    key={r.label}
                    data-target={`setting-${s}`}
                    style={{ minHeight: r.sub ? pt(46) : pt(36), display: 'flex', alignItems: 'center', gap: pt(10), padding: `0 ${pt(10)}px`, borderTop: k ? '1px solid rgba(0,0,0,0.06)' : 'none', justifyContent: r.kind === 'action' ? 'flex-end' : 'flex-start' }}
                  >
                    {r.kind === 'action' ? (
                      <span data-target={`button-${s}`} style={{ ...body(), padding: `${pt(3)}px ${pt(12)}px`, borderRadius: pt(12), background: 'rgba(0,0,0,0.06)' }}>
                        {r.label}
                      </span>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: pt(1) }}>
                          <span style={body()}>{r.label}</span>
                          {r.sub ? <span style={{ font: `400 ${pt(11)}px ${FONT_UI}`, color: C.secondary }}>{r.sub}</span> : null}
                        </div>
                        <div style={{ flex: 1 }} />
                        <Control r={r} s={s} state={state} ui={ui} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {sec.footer ? <div style={{ font: `400 ${pt(11)}px/1.35 ${FONT_UI}`, color: C.secondary, padding: `${pt(6)}px ${pt(10)}px 0` }}>{sec.footer}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
};
