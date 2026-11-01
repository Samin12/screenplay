import React from 'react';
import { Img, staticFile } from 'remotion';
import type { ReplicaDef, ReplicaProps, UiState } from '../../app/replica';
import { isHover, isPressed } from '../../app/replica';
import { FONT_UI, Ico, TrafficLights, fill, mergeData } from '../_shared/kit';

// A Chrome-like window on macOS: tab strip, toolbar with omnibox, and a page that is either a
// screenshot (data.page.image, a path in the work dir) or simple content blocks.

type Block =
  | { type: 'nav'; brand: string; links?: string[]; cta?: string }
  | { type: 'hero'; title: string; sub?: string; kicker?: string; button?: string; secondary?: string; image?: string; align?: 'left' | 'center' }
  | { type: 'heading'; text: string; sub?: string }
  | { type: 'p' | 'text'; text: string }
  | { type: 'cards'; items: { title: string; text?: string; tag?: string; image?: string; price?: string }[]; columns?: number }
  | { type: 'button'; text: string; secondary?: boolean }
  | { type: 'image'; src: string; height?: number; caption?: string }
  | { type: 'stats'; items: { value: string; label: string }[] }
  | { type: 'quote'; text: string; by?: string };

type PageTheme = { bg: string; text: string; muted: string; accent: string; card: string; line: string; serif: boolean };

type BrowserData = {
  theme: 'dark' | 'light';
  tabs: { title: string; icon?: string; color?: string }[];
  url: string;
  page: { image?: string; imageHeight?: number; blocks?: Block[]; theme?: Partial<PageTheme> };
};

type BrowserState = { tab: number; url: string | null; scroll: number; urlSelect: string | null; loading: boolean };

const defaultData: BrowserData = {
  theme: 'dark',
  tabs: [
    { title: 'Orchard Lane Coffee · Roasted on Orchard Lane', icon: 'O', color: '#3f6b4a' },
    { title: 'Saltmarsh Swim · Learn to swim', icon: 'S', color: '#2f6f9f' },
    { title: 'Claude', icon: '✻', color: '#d97757' },
  ],
  url: 'https://orchardlane.coffee/autumn-launch',
  page: {
    theme: { bg: '#f6f1e7', text: '#2a2520', muted: '#6f665b', accent: '#3f6b4a', card: '#fffdf8', line: '#e5dccb', serif: true },
    blocks: [
      { type: 'nav', brand: 'Orchard Lane Coffee', links: ['Shop', 'Subscriptions', 'Cafés', 'Our story'], cta: 'Order online' },
      {
        type: 'hero',
        kicker: 'Autumn launch · Week 44',
        title: 'The Harvest Blend is back.',
        sub: 'Roasted every Monday on Orchard Lane. Notes of baked apple, brown sugar and toasted pecan.',
        button: 'Pre-order a bag',
        secondary: 'Find a café',
      },
      {
        type: 'cards',
        items: [
          { tag: 'New', title: 'Harvest Blend', text: 'Medium roast. Apple, brown sugar, pecan.', price: '$18' },
          { tag: 'Subscriber pick', title: 'Lane No. 7 Espresso', text: 'Dark chocolate and cherry.', price: '$19' },
          { tag: 'Decaf', title: 'Night Orchard', text: 'Swiss-water decaf, cocoa finish.', price: '$17' },
        ],
      },
    ],
  },
};

const defaultState: BrowserState = { tab: 0, url: null, scroll: 0, urlSelect: null, loading: false };

const CHROME = {
  dark: { frame: '#1f2023', tab: '#35363a', tabText: '#e8eaed', tabDim: '#9aa0a6', toolbar: '#35363a', omni: '#202124', omniText: '#e8eaed', omniDim: '#9aa0a6', icon: '#c4c7c5', hover: '#46474b', line: '#4a4b4f' },
  light: { frame: '#dfe3e8', tab: '#ffffff', tabText: '#1f1f1f', tabDim: '#5f6368', toolbar: '#ffffff', omni: '#eef1f4', omniText: '#1f1f1f', omniDim: '#5f6368', icon: '#474747', hover: '#e3e6ea', line: '#d3d7dc' },
};

const BlockView: React.FC<{ b: Block; n: number; th: PageTheme; ui: UiState }> = ({ b, n, th, ui }) => {
  const t = `block-${n}`;
  const display = th.serif ? '"Newsreader", Georgia, serif' : FONT_UI;
  const btn = (text: string, secondary: boolean | undefined, target: string) => (
    <div
      data-target={target}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 64,
        padding: '0 34px',
        borderRadius: 40,
        font: `600 24px ${FONT_UI}`,
        background: secondary ? 'transparent' : isHover(ui, target) || isPressed(ui, target) ? th.text : th.accent,
        color: secondary ? th.text : '#ffffff',
        boxShadow: secondary ? `inset 0 0 0 2px ${th.line}` : 'none',
      }}
    >
      {text}
    </div>
  );
  switch (b.type) {
    case 'nav':
      return (
        <div data-target={t} style={{ display: 'flex', alignItems: 'center', height: 96, borderBottom: `1px solid ${th.line}`, padding: '0 8px' }}>
          <span style={{ font: `600 30px ${display}`, color: th.text, flex: 1 }}>{b.brand}</span>
          {(b.links ?? []).map((l) => (
            <span key={l} style={{ font: `500 22px ${FONT_UI}`, color: th.muted, marginLeft: 40 }}>
              {l}
            </span>
          ))}
          {b.cta ? <div style={{ marginLeft: 44 }}>{btn(b.cta, false, `${t}-cta`)}</div> : null}
        </div>
      );
    case 'hero':
      return (
        <div data-target={t} style={{ padding: '56px 8px 44px', textAlign: b.align === 'center' ? 'center' : 'left' }}>
          {b.kicker ? <div style={{ font: `600 22px ${FONT_UI}`, color: th.accent, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 22 }}>{b.kicker}</div> : null}
          <div style={{ font: `600 84px/1.02 ${display}`, color: th.text, maxWidth: 1100, margin: b.align === 'center' ? '0 auto' : undefined, letterSpacing: -1 }}>{b.title}</div>
          {b.sub ? <div style={{ font: `400 27px/1.5 ${FONT_UI}`, color: th.muted, maxWidth: 880, marginTop: 22, marginLeft: b.align === 'center' ? 'auto' : undefined, marginRight: b.align === 'center' ? 'auto' : undefined }}>{b.sub}</div> : null}
          {b.button || b.secondary ? (
            <div style={{ display: 'flex', gap: 18, marginTop: 34, justifyContent: b.align === 'center' ? 'center' : 'flex-start' }}>
              {b.button ? btn(b.button, false, `${t}-button`) : null}
              {b.secondary ? btn(b.secondary, true, `${t}-secondary`) : null}
            </div>
          ) : null}
          {b.image ? <Img src={staticFile(b.image)} style={{ width: '100%', borderRadius: 18, marginTop: 48 }} /> : null}
        </div>
      );
    case 'heading':
      return (
        <div data-target={t} style={{ padding: '40px 8px 16px' }}>
          <div style={{ font: `600 52px ${display}`, color: th.text }}>{b.text}</div>
          {b.sub ? <div style={{ font: `400 24px ${FONT_UI}`, color: th.muted, marginTop: 10 }}>{b.sub}</div> : null}
        </div>
      );
    case 'p':
    case 'text':
      return (
        <div data-target={t} style={{ font: `400 26px/1.6 ${FONT_UI}`, color: th.text, padding: '10px 8px', maxWidth: 1000 }}>
          {b.text}
        </div>
      );
    case 'button':
      return (
        <div data-target={t} style={{ padding: '16px 8px' }}>
          {btn(b.text, b.secondary, `${t}-button`)}
        </div>
      );
    case 'image':
      return (
        <div data-target={t} style={{ padding: '16px 8px' }}>
          <Img src={staticFile(b.src)} style={{ width: '100%', height: b.height, objectFit: 'cover', borderRadius: 18, display: 'block' }} />
          {b.caption ? <div style={{ font: `400 20px ${FONT_UI}`, color: th.muted, marginTop: 10 }}>{b.caption}</div> : null}
        </div>
      );
    case 'stats':
      return (
        <div data-target={t} style={{ display: 'flex', gap: 24, padding: '8px 8px 40px' }}>
          {b.items.map((s, i) => (
            <div key={i} data-target={`${t}-stat-${i + 1}`} style={{ flex: 1, borderTop: `2px solid ${th.text}`, paddingTop: 18 }}>
              <div style={{ font: `600 54px ${display}`, color: th.text }}>{s.value}</div>
              <div style={{ font: `400 22px ${FONT_UI}`, color: th.muted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      );
    case 'cards':
      return (
        <div data-target={t} style={{ display: 'grid', gridTemplateColumns: `repeat(${b.columns ?? Math.min(3, b.items.length)}, 1fr)`, gap: 28, padding: '8px 8px 32px' }}>
          {b.items.map((c, i) => {
            const ct = `${t}-card-${i + 1}`;
            return (
              <div key={i} data-target={ct} style={{ background: th.card, borderRadius: 22, border: `1px solid ${th.line}`, padding: '24px 28px', boxShadow: isHover(ui, ct) ? '0 14px 40px rgba(0,0,0,0.12)' : '0 2px 6px rgba(0,0,0,0.04)' }}>
                {c.image ? <Img src={staticFile(c.image)} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 14, marginBottom: 20 }} /> : <div style={{ height: 70, borderRadius: 12, marginBottom: 18, background: `linear-gradient(135deg, ${th.line}, ${th.bg})` }} />}
                {c.tag ? <div style={{ display: 'inline-block', font: `600 17px ${FONT_UI}`, color: th.accent, background: `${th.accent}1a`, borderRadius: 20, padding: '4px 12px', marginBottom: 12 }}>{c.tag}</div> : null}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <div style={{ font: `600 32px ${display}`, color: th.text, flex: 1 }}>{c.title}</div>
                  {c.price ? <div style={{ font: `600 24px ${FONT_UI}`, color: th.text }}>{c.price}</div> : null}
                </div>
                {c.text ? <div style={{ font: `400 21px/1.5 ${FONT_UI}`, color: th.muted, marginTop: 8 }}>{c.text}</div> : null}
              </div>
            );
          })}
        </div>
      );
    case 'quote':
      return (
        <div data-target={t} style={{ padding: '30px 8px', borderLeft: `4px solid ${th.accent}`, paddingLeft: 32, margin: '20px 0' }}>
          <div style={{ font: `500 38px/1.4 ${display}`, color: th.text }}>“{b.text}”</div>
          {b.by ? <div style={{ font: `500 22px ${FONT_UI}`, color: th.muted, marginTop: 14 }}>{b.by}</div> : null}
        </div>
      );
    default:
      return null;
  }
};

const Browser: React.FC<ReplicaProps<Partial<BrowserData>, Partial<BrowserState>>> = ({ data: raw, state: rs, ui }) => {
  const data = mergeData(defaultData, raw, []);
  const state = { ...defaultState, ...rs } as BrowserState;
  const k = CHROME[data.theme === 'light' ? 'light' : 'dark'];
  const url = state.url ?? data.url;
  const th: PageTheme = { bg: '#ffffff', text: '#1d1d1f', muted: '#6e6e73', accent: '#2f6fde', card: '#ffffff', line: '#e6e6e6', serif: false, ...(data.page?.theme ?? {}) };
  // omnibox: host bright, rest dim (Chrome style), optional selection highlight
  const m = /^(https?:\/\/)?([^/]+)(.*)$/.exec(url) ?? ['', '', url, ''];
  const host = m[2];
  const rest = m[3];
  const shown = host + rest;
  const sel = state.urlSelect && shown.includes(state.urlSelect) ? state.urlSelect : null;
  const renderUrl = () => {
    const segs: React.ReactNode[] = [];
    const paint = (s: string, from: number, color: string) => {
      if (!sel) return <span style={{ color }}>{s}</span>;
      const at = shown.indexOf(sel);
      const a = Math.max(0, at - from);
      const b = Math.min(s.length, at + sel.length - from);
      if (b <= 0 || a >= s.length) return <span style={{ color }}>{s}</span>;
      return (
        <span style={{ color }}>
          {s.slice(0, a)}
          <span style={{ background: '#3367d6', color: '#ffffff' }}>{s.slice(a, b)}</span>
          {s.slice(b)}
        </span>
      );
    };
    segs.push(<React.Fragment key="h">{paint(host, 0, k.omniText)}</React.Fragment>);
    segs.push(<React.Fragment key="r">{paint(rest, host.length, k.omniDim)}</React.Fragment>);
    return segs;
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: 'radial-gradient(120% 90% at 30% 0%, #24262b 0%, #0e0f11 60%)' }}>
      <div
        data-target="window"
        style={{ position: 'absolute', left: 34, top: 30, right: 34, bottom: 30, borderRadius: 18, overflow: 'hidden', background: k.frame, boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}
      >
        {/* tab strip */}
        <div style={{ height: 66, display: 'flex', alignItems: 'flex-end', paddingLeft: 22, flexShrink: 0 }}>
          <div style={{ alignSelf: 'center', marginRight: 26 }}>
            <TrafficLights />
          </div>
          {data.tabs.map((tb, i) => {
            const t = `tab-${i + 1}`;
            const on = state.tab === i;
            return (
              <div
                key={i}
                data-target={t}
                style={{
                  width: 360,
                  height: 54,
                  borderRadius: '14px 14px 0 0',
                  background: on ? k.tab : fill(ui, t, { hover: k.hover }),
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '0 16px 0 20px',
                  boxSizing: 'border-box',
                  marginRight: 2,
                }}
              >
                <div style={{ width: 26, height: 26, borderRadius: 7, background: tb.color ?? '#5f6368', color: '#fff', font: `700 15px ${FONT_UI}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{tb.icon ?? tb.title.slice(0, 1)}</div>
                <span style={{ flex: 1, minWidth: 0, font: `400 20px ${FONT_UI}`, color: on ? k.tabText : k.tabDim, whiteSpace: 'nowrap', overflow: 'hidden', maskImage: 'linear-gradient(to right, #000 85%, transparent)', WebkitMaskImage: 'linear-gradient(to right, #000 85%, transparent)' }}>{tb.title}</span>
                <Ico name="x" size={18} color={k.tabDim} stroke={2} />
              </div>
            );
          })}
          <div data-target="new-tab" style={{ alignSelf: 'center', marginLeft: 10, width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: fill(ui, 'new-tab', { hover: k.hover }) }}>
            <Ico name="plus" size={24} color={k.icon} stroke={2} />
          </div>
        </div>

        {/* toolbar */}
        <div style={{ height: 76, background: k.toolbar, display: 'flex', alignItems: 'center', gap: 6, padding: '0 18px', flexShrink: 0, borderBottom: `1px solid ${k.line}` }}>
          {[
            ['nav-back', 'arrow-left'],
            ['nav-forward', 'arrow-right'],
            ['nav-reload', state.loading ? 'x' : 'rotate-cw'],
          ].map(([t, ic]) => (
            <div key={t} data-target={t} style={{ width: 50, height: 50, borderRadius: 25, display: 'flex', alignItems: 'center', justifyContent: 'center', background: fill(ui, t, { hover: k.hover }) }}>
              <Ico name={ic} size={25} color={t === 'nav-forward' ? k.tabDim : k.icon} stroke={2} />
            </div>
          ))}
          <div
            data-target="address"
            style={{ flex: 1, height: 54, borderRadius: 27, background: isHover(ui, 'address') ? k.hover : k.omni, display: 'flex', alignItems: 'center', gap: 16, padding: '0 22px', margin: '0 12px', boxShadow: ui.caret === 'url' ? `inset 0 0 0 2px #8ab4f8` : 'none' }}
          >
            <Ico name="lock" size={21} color={k.omniDim} stroke={2.2} />
            <span style={{ flex: 1, font: `400 23px ${FONT_UI}`, whiteSpace: 'nowrap', overflow: 'hidden' }}>{renderUrl()}</span>
            <Ico name="star" size={23} color={k.omniDim} stroke={1.8} />
          </div>
          <div data-target="profile" style={{ width: 40, height: 40, borderRadius: 20, background: '#d97757', color: '#fff', font: `600 19px ${FONT_UI}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 8px' }}>
            S
          </div>
          <Ico name="ellipsis-vertical" size={25} color={k.icon} stroke={2} />
        </div>
        {state.loading ? <div style={{ height: 3, background: '#8ab4f8', width: `${30 + ((ui.frame * 2) % 60)}%` }} /> : null}

        {/* page */}
        <div data-target="page" style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: th.bg }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: -(state.scroll ?? 0) }}>
            {data.page?.image ? (
              <Img src={staticFile(data.page.image)} style={{ width: '100%', display: 'block', height: data.page.imageHeight }} />
            ) : (
              <div style={{ maxWidth: 1460, margin: '0 auto', padding: '0 60px' }}>
                {(data.page?.blocks ?? []).map((b, i) => (
                  <BlockView key={i} b={b} n={i + 1} th={th} ui={ui} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const browser: ReplicaDef = {
  id: 'browser',
  title: 'Chrome-like browser window (macOS) showing a screenshot or simple page blocks',
  size: [1920, 1080],
  tone: 'dark',
  component: Browser,
  defaults: { data: defaultData as unknown as Record<string, unknown>, state: defaultState as unknown as Record<string, unknown> },
  targets: {
    window: 'the whole browser window',
    'tab-<n>': 'nth tab in the tab strip',
    'new-tab': '"+" new tab button',
    'nav-back': 'back button',
    'nav-forward': 'forward button',
    'nav-reload': 'reload button (x while state.loading)',
    address: 'the address bar (omnibox)',
    profile: 'profile avatar',
    page: 'the page area below the toolbar',
    'block-<n>': 'nth content block of data.page.blocks',
    'block-<n>-cta': 'nav block: call-to-action button',
    'block-<n>-button': 'hero/button block: primary button',
    'block-<n>-secondary': 'hero block: secondary button',
    'block-<n>-card-<k>': 'cards block: kth card',
    'block-<n>-stat-<k>': 'stats block: kth stat',
  },
  stateDoc: {
    tab: 'number: active tab index (0-based)',
    url: 'string | null: overrides data.url in the address bar (type into it with key: url)',
    scroll: 'number: page scroll in px (set it to scroll the page)',
    urlSelect: "string | null: substring of the URL drawn with a blue selection, e.g. 'shared'",
    loading: 'boolean: progress bar + stop icon',
  },
};
