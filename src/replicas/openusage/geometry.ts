import { settingsHeight } from './settings';
import { L, pt, px } from './tokens';
import type { Account, Metric, OUData, OUState, StripItem } from './types';

// Layout numbers shared by the menu bar, the panel and the overlays. Overlays (menus, sheets) are
// placed from these, never measured, so every state renders deterministically.

const em: Record<string, number> = { '%': 0.86, '.': 0.3, ',': 0.3, ' ': 0.28, '+': 0.62, '$': 0.62, ':': 0.3 };
export const textW = (s: string, size: number) => [...String(s)].reduce((w, ch) => w + (em[ch] ?? (/[0-9]/.test(ch) ? 0.62 : /[A-Z]/.test(ch) ? 0.68 : 0.56)) * size, 0);

export const STRIP = {
  icon: px(24),
  iconGap: px(11),
  gap: px(24),
  pad: px(16),
  single: px(20.5), // one value
  stacked: px(15), // two stacked values
};

export const stripItemW = (it: StripItem) => {
  if (!it.values.length) return STRIP.icon;
  const stacked = it.values.length > 1;
  const w = Math.max(...it.values.map((v) => textW(v, stacked ? STRIP.stacked : STRIP.single)), 10);
  return STRIP.icon + STRIP.iconGap + Math.ceil(w) + 2;
};

// Right cluster of the menu bar, right to left: clock, Control Center, battery, Wi-Fi.
export const rightCluster = (data: OUData) => {
  const clockW = Math.ceil(textW(data.clock, L.fMenu)) + 8;
  const right = px(22);
  const items = { clockW, cc: px(28), battery: px(48), wifi: px(28), gap: px(26) };
  const total = right + clockW + items.gap + items.cc + items.gap + items.battery + items.gap + items.wifi + items.gap;
  return { ...items, right, total };
};

// The strip shows only accounts that are added; with none it falls back to the app icon.
export const stripItems = (data: OUData, state: OUState): StripItem[] => {
  const ids = new Set(visibleAccounts(data, state).map((a) => a.id));
  const items = data.strip.filter((it) => !it.account || ids.has(it.account));
  return items.length ? items : [{ provider: 'openusage', values: [] }];
};

export const stripLayout = (data: OUData, state: OUState, W: number) => {
  const items = stripItems(data, state);
  const widths = items.map(stripItemW);
  const inner = widths.reduce((a, b) => a + b, 0) + STRIP.gap * Math.max(0, widths.length - 1);
  const w = inner + STRIP.pad * 2;
  const x = W - rightCluster(data).total - w + 6;
  const xs: number[] = [];
  let cur = x + STRIP.pad;
  for (const wi of widths) {
    xs.push(cur);
    cur += wi + STRIP.gap;
  }
  return { x, w, xs, widths, items };
};

export type Rect = { x: number; y: number; w: number; h: number };

export const visibleAccounts = (data: OUData, state: OUState): Account[] =>
  state.accounts ? (state.accounts.map((id) => data.accounts.find((a) => a.id === id)).filter(Boolean) as Account[]) : data.accounts;

export const metricCount = (a: Account) => a.metrics.length + (a.more?.length ?? 0);

// The panel under the strip. Height follows the screen like the app's PanelHeightController.
export const panelRect = (data: OUData, state: OUState, W: number, H: number): Rect => {
  const s = stripLayout(data, state, W);
  const w = L.panelW;
  // anchored to the strip's right end (as on his screen), so it stays put while the strip grows
  const x = Math.max(12, Math.min(W - w - 12, s.x + s.w + px(56) - w));
  const y = L.menuH + 3;
  const maxH = H - y - 14;
  const accts = visibleAccounts(data, state);
  let h = maxH;
  if (state.view === 'popup' && accts.length === 0) h = pt(300) + L.footerH;
  if (state.view === 'accounts') h = L.topBarH + pt(10) + (accts.length ? accts.length * L.rowH : pt(110)) + pt(10 + 30 + 14);
  if (state.view === 'account') {
    const a = data.accounts.find((x) => x.id === state.account);
    h = L.topBarH + pt(10) + (a ? metricCount(a) : 4) * L.rowH + pt(14) + L.rowH + pt(14);
  }
  if (state.view === 'settings') h = settingsHeight(state.settingsTab ?? 'general');
  return { x, y, w, h: Math.min(maxH, h) };
};

export type LimitMetric = Extract<Metric, { kind?: 'limit' }>;
export const isLimit = (m: Metric): m is LimitMetric => !m.kind || m.kind === 'limit';

// ---------- dashboard rhythm (shared by Dashboard.tsx and scrollTo) ----------

// vertical gap above a row: limit blocks 18.5 pt apart, the trend 13.5 pt under a block, one-line
// rows pull together.
export const gapBefore = (prev: Metric | undefined, m: Metric) => {
  if (!prev) return 0;
  if (m.kind === 'trend') return pt(isLimit(prev) ? 13.5 : 9);
  if (m.kind === 'value' && !isLimit(prev)) return pt(6);
  return L.blockGap;
};
export const metricH = (m: Metric) => (m.kind === 'trend' ? pt(22) : m.kind === 'value' ? L.labelLine : L.labelLine + L.barGapTop + L.barH + L.barGapBottom + L.subLine);
export const COST_BLOCK_H = pt(39) + pt(166);

export const sectionHeight = (a: Account, open: boolean) => {
  let h = pt(12) + pt(28) + L.cardPad;
  a.metrics.forEach((m, i) => (h += gapBefore(a.metrics[i - 1], m) + metricH(m)));
  const more = open ? a.more ?? [] : [];
  const links = open && !!a.links?.length;
  if (more.length || links) h += pt(9) + 1 + pt(4);
  more.forEach((m, i) => (h += (i === 0 ? pt(6.5) : gapBefore(more[i - 1], m)) + metricH(m)));
  if (links) h += pt(9.5) + pt(20);
  h += a.more?.length || a.links?.length ? (open ? pt(9) : pt(6)) + pt(20) : pt(8);
  return h + pt(6);
};

export const hasSpend = (accts: Account[]) => accts.some((a) => a.spend && Object.values(a.spend).some((v) => (v ?? 0) > 0));

// Dashboard scroll in px: state.scrollTo (an account id) wins over state.scroll. Clamped like a
// real scroll view: the last card can't leave the bottom of the panel (viewH = panel height).
export const dashboardScroll = (data: OUData, state: OUState, viewH: number) => {
  const accts = visibleAccounts(data, state);
  let y = hasSpend(accts) ? COST_BLOCK_H : pt(4);
  let want = state.scroll ?? 0;
  for (const a of accts) {
    if (a.id === state.scrollTo) want = y + pt(4);
    y += sectionHeight(a, !!state.expanded?.includes(a.id));
  }
  const total = y + L.footerH + pt(14);
  return Math.max(0, Math.min(want, total - viewH));
};

// App menus that fit between the Apple menu and the strip (a narrow plate drops the last ones).
export const fittingMenus = (data: OUData, stripX: number) => {
  let x = px(26) + px(27) + px(34) + textW(data.activeApp, L.fMenu) * 1.08 + px(34);
  const out: string[] = [];
  for (const m of data.appMenus) {
    x += textW(m, L.fMenu) + px(34);
    if (x > stripX - px(24)) break;
    out.push(m);
  }
  return out;
};
