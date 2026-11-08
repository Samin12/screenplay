import React from 'react';
import type { UiState } from '../../app/replica';
import { caretOn, isHover, isPressed } from '../../app/replica';
import { Caret, FONT_MONO, FONT_UI, Ico } from '../_shared/kit';
import { providerName } from './Dashboard';
import { Chevron, CloseCircle, MacSpinner, ProviderIcon } from './Glyphs';
import { C, pt } from './tokens';
import type { MenuItem, OUData, OUState } from './types';

// The Add Account sheet (AddAccountSheet.swift): a 300 pt sheet on the panel. Step 1 "Add Account /
// Choose a provider to sign in to." with the provider list; step 2 by sign-in kind: browser
// ("Sign In to Claude", paste-a-code field, Copy Link / Open Browser, "Waiting for your browser…"),
// device code (Copilot, Grok), or API key (Ollama, OpenCode, OpenRouter, Z.ai). Plus the app's
// pull-down menus (Options, right-click on the strip).

export const SHEET_W = pt(300);

const body = (w = 400): React.CSSProperties => ({ font: `${w} ${pt(13)}px ${FONT_UI}`, color: C.text, letterSpacing: '-0.012em' });
const sub: React.CSSProperties = { font: `400 ${pt(11.2)}px/1.35 ${FONT_UI}`, color: C.secondary, letterSpacing: '-0.005em' };

const SheetHeader: React.FC<{ icon?: string; title: string; message: string; link?: string }> = ({ icon, title, message, link }) => (
  <div style={{ padding: `${pt(20)}px ${pt(20)}px ${pt(14)}px`, display: 'flex', flexDirection: 'column', gap: pt(4) }}>
    {icon ? (
      <div style={{ marginBottom: pt(8) }}>
        <ProviderIcon id={icon} size={pt(32)} color="#2c2c2c" />
      </div>
    ) : null}
    <span data-target="sheet-title" style={{ ...body(700), alignSelf: 'flex-start' }}>
      {title}
    </span>
    <span style={sub}>{message}</span>
    {link ? <span style={{ ...sub, color: C.accent, marginTop: pt(2) }}>{link}</span> : null}
  </div>
);

const Btn: React.FC<{ label: string; target: string; prominent?: boolean; disabled?: boolean; ui: UiState; flex?: boolean }> = ({ label, target, prominent, disabled, ui, flex }) => {
  const hot = isHover(ui, target) || isPressed(ui, target);
  const bg = prominent ? (disabled ? '#b8d5fb' : hot ? '#006ce6' : C.accent) : hot ? 'rgba(0,0,0,0.11)' : 'rgba(0,0,0,0.065)';
  return (
    <div
      data-target={target}
      style={{ flex: flex ? 1 : undefined, height: pt(24), padding: `0 ${pt(14)}px`, borderRadius: pt(12), background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', ...body(prominent ? 500 : 400), color: prominent ? '#fff' : disabled ? C.tertiary : C.text, whiteSpace: 'nowrap' }}
    >
      {label}
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; placeholder: string; target: string; caret: boolean; secure?: boolean; first?: boolean }> = ({ label, value, placeholder, target, caret, secure, first }) => (
  <div data-target={target} style={{ height: pt(34), display: 'flex', alignItems: 'center', gap: pt(10), padding: `0 ${pt(10)}px`, borderTop: first ? 'none' : '1px solid rgba(0,0,0,0.06)' }}>
    <span style={body()}>{label}</span>
    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
      {value ? <span style={{ ...body(), whiteSpace: 'nowrap', fontFamily: secure ? FONT_MONO : undefined }}>{secure ? '•'.repeat(Math.min(18, value.length)) : value}</span> : <span style={{ ...body(), color: C.tertiary }}>{placeholder}</span>}
      {caret ? <Caret on h={pt(15)} color={C.text} /> : null}
    </div>
  </div>
);

const formCard: React.CSSProperties = { margin: `0 ${pt(20)}px`, borderRadius: pt(10), background: 'rgba(0,0,0,0.045)', overflow: 'hidden' };

const signinKind = (p: string) => (['copilot', 'grok'].includes(p) ? 'device' : ['ollama', 'opencode', 'openrouter', 'zai'].includes(p) ? 'apikey' : 'browser');

export const Sheet: React.FC<{ data: OUData; state: OUState; ui: UiState; x: number; y: number }> = ({ data, state, ui, x, y }) => {
  const shell = (children: React.ReactNode) => (
    <div
      data-target="sheet"
      style={{ position: 'absolute', left: x, top: y, width: SHEET_W, borderRadius: pt(14), background: C.sheet, boxShadow: '0 22px 60px rgba(0,0,0,0.30), 0 0 0 1px rgba(0,0,0,0.14)', overflow: 'hidden' }}
    >
      {children}
    </div>
  );
  if (state.sheet === 'add') {
    return shell(
      <>
        <SheetHeader title="Add Account" message="Choose a provider to sign in to." />
        <div data-target="provider-list" style={{ margin: `0 ${pt(20)}px`, borderRadius: pt(10), background: 'rgba(0,0,0,0.045)', padding: `${pt(10)}px ${pt(6)}px` }}>
          {data.providers.map((p) => {
            const t = `provider-${p.id}`;
            const sel = state.pickHover === p.id || isHover(ui, t) || isPressed(ui, t);
            return (
              <div key={p.id} data-target={t} style={{ height: pt(28), display: 'flex', alignItems: 'center', gap: pt(10), padding: `0 ${pt(8)}px`, borderRadius: pt(6), background: sel ? 'rgba(0,0,0,0.085)' : 'transparent' }}>
                <ProviderIcon id={p.id} size={pt(20) * 0.88} color="#2c2c2c" style={{ margin: pt(1.2) }} />
                <span style={body()}>{p.name}</span>
                <div style={{ flex: 1 }} />
                <Chevron dir="right" size={pt(10)} color={C.tertiary} weight={2.8} />
              </div>
            );
          })}
        </div>
        <div style={{ padding: pt(20), display: 'flex', justifyContent: 'flex-end' }}>
          <Btn label="Cancel" target="cancel" ui={ui} />
        </div>
      </>,
    );
  }
  if (state.sheet !== 'signin') return null;
  const p = state.provider ?? 'claude';
  const name = data.providers.find((x) => x.id === p)?.name ?? providerName(p);
  const kind = signinKind(p);
  const typing = caretOn(ui, 'code');
  if (kind === 'apikey') {
    return shell(
      <>
        <SheetHeader icon={p} title={`Add ${name}`} message={`Enter an API key from your ${name} account. It’s stored in your Keychain.`} link="Get Your API Key" />
        <div style={formCard}>
          <Field label="API Key" value={state.code} placeholder="Required" target="code-field" caret={typing} secure first />
          <Field label="Name" value="" placeholder={name} target="name-field" caret={false} />
        </div>
        <div style={{ display: 'flex', gap: pt(8), padding: `${pt(20)}px ${pt(20)}px ${pt(20)}px` }}>
          <Btn label="Cancel" target="cancel" ui={ui} flex />
          <Btn label="Add Account" target="open-browser" prominent disabled={!state.code} ui={ui} flex />
        </div>
      </>,
    );
  }
  const preparing = state.signin === 'preparing';
  const status = state.signin === 'error' ? 'Sign-in failed. Try again.' : preparing ? 'Preparing sign-in…' : state.signin === 'signing' ? 'Signing in…' : 'Waiting for your browser…';
  const primary = state.signin === 'error' ? 'Try Again' : state.code && kind === 'browser' ? 'Continue' : 'Open Browser';
  return shell(
    <div style={{ position: 'relative' }}>
      <div data-target="signin-close" style={{ position: 'absolute', right: pt(14), top: pt(14) }}>
        <CloseCircle size={pt(17)} />
      </div>
      <SheetHeader
        icon={p}
        title={`Sign In to ${name}`}
        message={kind === 'device' ? 'Open the verification page in your browser and enter this code.' : 'Continue in your browser. This sheet closes when you’re signed in.'}
      />
      {kind === 'device' ? (
        <div data-target="device-code" style={{ margin: `0 ${pt(20)}px`, padding: `${pt(12)}px 0`, borderRadius: pt(10), background: 'rgba(0,0,0,0.045)', textAlign: 'center', font: `600 ${pt(22)}px ${FONT_MONO}`, color: C.text, letterSpacing: '0.04em' }}>
          {data.deviceCode}
        </div>
      ) : (
        <>
          <div style={formCard}>
            <Field label="Code" value={state.code} placeholder="Paste code" target="code-field" caret={typing} first />
          </div>
          <div style={{ ...sub, padding: `${pt(6)}px ${pt(30)}px 0` }}>Paste the code here if your browser shows one.</div>
        </>
      )}
      <div style={{ display: 'flex', gap: pt(8), padding: `${pt(20)}px ${pt(20)}px 0` }}>
        <Btn label={kind === 'device' ? 'Copy Code' : 'Copy Link'} target="copy-link" disabled={preparing} ui={ui} flex />
        <Btn label={primary} target="open-browser" prominent disabled={preparing} ui={ui} flex />
      </div>
      <div data-target="signin-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: pt(8), padding: `${pt(12)}px ${pt(20)}px ${pt(20)}px`, font: `400 ${pt(12)}px ${FONT_UI}`, color: state.signin === 'error' ? C.red : C.secondary }}>
        {state.signin === 'error' ? null : <MacSpinner size={pt(14)} ui={ui} color="#6a6a6a" />}
        {status}
      </div>
    </div>,
  );
};

// ---------- pull-down menus ----------

export const MENU_W = pt(214);
const ITEM_H = pt(22);
const SEP_H = pt(11);
const PAD = pt(5);

export const menuHeight = (items: MenuItem[]) => items.reduce((h, it) => h + (it === '-' ? SEP_H : ITEM_H), PAD * 2);

export const Menu: React.FC<{ items: MenuItem[]; x: number; y: number; hover: string | null; ui: UiState; w?: number }> = ({ items, x, y, hover, ui, w = MENU_W }) => (
  <div
    data-target="menu"
    style={{ position: 'absolute', left: x, top: y, width: w, padding: `${PAD}px ${pt(5)}px`, boxSizing: 'border-box', borderRadius: pt(11), background: C.menu, boxShadow: '0 14px 40px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.13)', backdropFilter: 'blur(30px)' }}
  >
    {items.map((it, i) => {
      if (it === '-') return <div key={i} style={{ height: SEP_H, display: 'flex', alignItems: 'center', padding: `0 ${pt(8)}px` }}><div style={{ flex: 1, height: 1, background: C.menuLine }} /></div>;
      const s = it.label.replace(/…/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const t = `menu-item-${s}`;
      const sel = hover === s || isHover(ui, t) || isPressed(ui, t);
      const col = sel ? '#fff' : it.disabled ? C.tertiary : C.text;
      const inner = (
        <div style={{ height: ITEM_H, display: 'flex', alignItems: 'center', gap: pt(7), padding: `0 ${pt(8)}px`, borderRadius: pt(6), background: sel ? C.menuSel : 'transparent' }}>
          {it.icon ? <MenuIcon name={it.icon} color={col} /> : null}
          <span style={{ font: `400 ${pt(13)}px ${FONT_UI}`, color: col, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{it.label}</span>
          <div style={{ flex: 1 }} />
          {it.key ? <span style={{ font: `400 ${pt(12.5)}px ${FONT_UI}`, color: sel ? 'rgba(255,255,255,0.85)' : C.tertiary }}>{it.key}</span> : null}
        </div>
      );
      // aliases so an edit can say "accounts-nav" / "settings-nav"
      const alias = s === 'accounts' ? 'accounts-nav' : s === 'settings' ? 'settings-nav' : null;
      return (
        <div key={i} data-target={t}>
          {alias ? <div data-target={alias}>{inner}</div> : inner}
        </div>
      );
    })}
  </div>
);

const MenuIcon: React.FC<{ name: string; color: string }> = ({ name, color }) => <Ico name={name} size={pt(13)} color={color} stroke={1.9} />;
