import React from 'react';
import type { UiState } from '../../app/replica';
import { isHover, isPressed } from '../../app/replica';
import { FONT_UI, Ico, slug } from '../_shared/kit';
import { dashboardScroll, gapBefore, hasSpend, textW, visibleAccounts, type LimitMetric } from './geometry';
import { AppIcon, Chevron, Flame, ProviderIcon } from './Glyphs';
import { C, L, pt } from './tokens';
import type { Account, CostTab, Metric, OUData, OUState } from './types';

// The panel's dashboard as OpenUsage 0.7.16 draws it: the Total Spend card ("Cost" title, Today /
// Yesterday / 30 Days capsule, ring + ranked legend), then one section per account (header with
// mark, name and plan; a card of limit bars, Usage Trend, the expand caret), then the footer.

export const PROVIDER_NAMES: Record<string, string> = {
  claude: 'Claude',
  codex: 'Codex',
  cursor: 'Cursor',
  antigravity: 'Antigravity',
  copilot: 'Copilot',
  devin: 'Devin',
  grok: 'Grok',
  ollama: 'Ollama',
  opencode: 'OpenCode',
  openrouter: 'OpenRouter',
  zai: 'Z.ai',
  cliproxyapi: 'CLIProxyAPI',
};

export const providerName = (id: string) => PROVIDER_NAMES[id] ?? id;
export const accountTitle = (a: Account) => a.title ?? (a.label ? `${providerName(a.provider)} — ${a.label}` : providerName(a.provider));

export const accountColor = (a: Account, all: Account[]) => {
  if (a.color) return a.color;
  if (a.provider === 'claude') {
    const k = all.filter((x) => x.provider === 'claude').findIndex((x) => x.id === a.id);
    return C.provider[['claude', 'claude2', 'claude3'][Math.max(0, k) % 3]];
  }
  return C.provider[a.provider] ?? '#8e8e93';
};

// SwiftUI-style tail truncation (trailing spaces and dashes dropped before the "…"), so a legend
// name like "Claude — you@work.com" reads "Claude…" as in the app.
export const truncate = (s: string, max: number, size: number) => {
  if (textW(s, size) <= max) return s;
  for (let n = s.length - 1; n > 0; n--) {
    const head = s.slice(0, n).replace(/[\s—–-]+$/, '');
    if (head && textW(head + '…', size) <= max) return head + '…';
  }
  return s.slice(0, 1) + '…';
};

const money = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = (v: number) => (v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${Math.round(v)}`);

const ellipsis: React.CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 };
const fLabel = (w = 600): React.CSSProperties => ({ font: `${w} ${L.fLabel}px ${FONT_UI}`, color: C.text, letterSpacing: '-0.012em' });
const fSub: React.CSSProperties = { font: `400 ${L.fSub}px ${FONT_UI}`, color: C.secondary, letterSpacing: '-0.01em' };

// ---------- Total Spend ----------

const TABS: { id: CostTab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '30-days', label: '30 Days' },
];

const arc = (cx: number, cy: number, R: number, r: number, a0: number, a1: number) => {
  const p = (rad: number, a: number) => `${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${p(R, a0)} A ${R} ${R} 0 ${large} 1 ${p(R, a1)} L ${p(r, a1)} A ${r} ${r} 0 ${large} 0 ${p(r, a0)} Z`;
};

export const Donut: React.FC<{ rows: { value: number; color: string }[]; size: number; thick: number; total: string; unit: string }> = ({ rows, size, thick, total, unit }) => {
  const sum = rows.reduce((a, r) => a + r.value, 0);
  const c = size / 2;
  const gap = rows.length > 1 ? 0.045 : 0;
  const minA = 0.07;
  // even a tiny share keeps a visible sliver
  const raw = rows.map((r) => (sum ? (r.value / sum) * Math.PI * 2 : 0));
  const extra = raw.reduce((a, x) => a + Math.max(0, minA - x), 0);
  const big = raw.reduce((a, x) => a + (x > minA ? x : 0), 0);
  const angs = raw.map((x) => (x <= minA ? minA : x - (extra * x) / (big || 1)));
  let a = -Math.PI / 2;
  return (
    <div data-target="donut" style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        {sum === 0 ? <circle cx={c} cy={c} r={c - thick / 2} fill="none" stroke={C.track} strokeWidth={thick} /> : null}
        {rows.map((r, i) => {
          const a0 = a + gap / 2;
          const a1 = a + angs[i] - gap / 2;
          a += angs[i];
          if (a1 <= a0) return null;
          return <path key={i} d={arc(c, c, c - 1.4, c - thick + 1.4, a0 + 0.004, a1 - 0.004)} fill={r.color} stroke={r.color} strokeWidth={2.8} strokeLinejoin="round" />;
        })}
      </svg>
      <div data-target="donut-total" style={{ position: 'absolute', left: thick, top: thick, width: size - thick * 2, height: size - thick * 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ font: `700 ${pt(15.2)}px ${FONT_UI}`, color: C.text, letterSpacing: '-0.02em', lineHeight: 1.05 }}>{total}</span>
        <span style={{ font: `500 ${pt(9.5)}px ${FONT_UI}`, color: C.tertiary, lineHeight: 1.3 }}>{unit}</span>
      </div>
    </div>
  );
};

const CostCard: React.FC<{ data: OUData; state: OUState; ui: UiState; accts: Account[] }> = ({ data, state, ui, accts }) => {
  const tab = state.tab;
  const rows = accts
    .filter((a) => (a.spend?.[tab] ?? 0) > 0)
    .map((a) => ({ id: a.id, name: a.legend ?? accountTitle(a), value: a.spend?.[tab] ?? 0, color: accountColor(a, data.accounts) }))
    .sort((x, y) => y.value - x.value);
  const total = rows.reduce((a, r) => a + r.value, 0);
  const cardW = L.panelW - L.margin * 2;
  return (
    <div data-target="cost" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: pt(39), display: 'flex', alignItems: 'center', padding: `${pt(6)}px ${pt(20.5)}px 0 ${pt(18.5)}px`, gap: pt(5), boxSizing: 'border-box' }}>
        <span data-target="cost-title" style={{ display: 'inline-flex', alignItems: 'center', gap: pt(5) }}>
          <span style={{ font: `700 ${pt(15.4)}px ${FONT_UI}`, color: C.text, letterSpacing: '-0.015em' }}>{data.costTitle}</span>
          <Chevron dir="down" size={pt(9.5)} color={C.secondary} weight={2.6} />
        </span>
        <span data-target="cost-info" style={{ marginLeft: pt(3) }}>
          <Ico name="info" size={pt(11.5)} color={C.secondary} stroke={1.9} />
        </span>
        <div style={{ flex: 1 }} />
        <span data-target="cost-share">
          <Ico name="copy" size={pt(13)} color={C.secondary} stroke={1.8} />
        </span>
      </div>
      <div data-target="cost-card" style={{ margin: `0 ${L.margin}px`, width: cardW, height: pt(166), borderRadius: L.cardR, background: C.card, boxShadow: `inset 0 0 0 1px ${C.cardLine}`, position: 'relative' }}>
        {/* capsule */}
        <div data-target="tabs" style={{ position: 'absolute', left: pt(14.5), right: pt(14.5), top: pt(11.5), height: pt(26), borderRadius: pt(13), background: C.capsule, display: 'flex', padding: pt(2), boxSizing: 'border-box' }}>
          {TABS.map((t) => {
            const sel = state.tab === t.id;
            const id = `tab-${t.id}`;
            const hov = isHover(ui, id) || isPressed(ui, id);
            return (
              <div
                key={t.id}
                data-target={id}
                style={{
                  flex: 1,
                  borderRadius: pt(11),
                  background: sel ? C.thumb : hov ? 'rgba(0,0,0,0.04)' : 'transparent',
                  boxShadow: sel ? '0 1px 2.5px rgba(0,0,0,0.13), inset 0 0 0 0.5px rgba(0,0,0,0.05)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  font: `${sel ? 600 : 400} ${pt(11.7)}px ${FONT_UI}`,
                  color: sel ? C.text : '#666666',
                  letterSpacing: '-0.01em',
                }}
              >
                {t.label}
              </div>
            );
          })}
        </div>
        {/* ring */}
        <div style={{ position: 'absolute', left: pt(14), top: pt(103 - 52) }}>
          <Donut rows={rows} size={pt(104)} thick={pt(20)} total={rows.length ? compact(total) : '$0'} unit="dollars" />
        </div>
        {/* legend */}
        <div data-target="legend" style={{ position: 'absolute', left: pt(133), right: pt(15), top: pt(103), transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column' }}>
          {rows.length === 0 ? <span style={{ ...fSub, textAlign: 'center' }}>No spend</span> : null}
          {rows.map((r, i) => {
            const v = money(r.value);
            const long = v.length > 7;
            return (
              <div key={r.id} data-target={`cost-row-${r.id}`} style={{ height: pt(22) }}>
                <div data-target={`cost-row-${i + 1}`} style={{ height: '100%', display: 'flex', alignItems: 'center', gap: pt(8), paddingLeft: pt(3) }}>
                  <div style={{ width: pt(7.2), height: pt(7.2), borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                  <div style={{ ...ellipsis, flex: '0 1 auto', font: `400 ${pt(13.4)}px ${FONT_UI}`, color: C.text, letterSpacing: '-0.012em', maxWidth: pt(68) }}>{truncate(r.name, pt(long ? 59 : 66), pt(13.4))}</div>
                  <span data-target={`cost-value-${r.id}`} style={{ marginLeft: 'auto', font: `400 ${pt(long ? 10.6 : 12.6)}px ${FONT_UI}`, color: '#707070', letterSpacing: long ? '0.035em' : '0.005em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {v}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ---------- account cards ----------

const Bar: React.FC<{ m: LimitMetric; target: string }> = ({ m, target }) => {
  const left = m.left === null || m.left === undefined ? null : Math.max(0, Math.min(100, m.left));
  const col = m.tone === 'red' ? C.red : m.tone === 'yellow' ? C.yellow : C.blue;
  return (
    <div data-target={target} style={{ height: L.barH, borderRadius: L.barH, background: C.track, position: 'relative', overflow: 'hidden' }}>
      {left ? <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${left}%`, background: col, borderRadius: L.barH }} /> : null}
      {m.tick !== undefined ? <div style={{ position: 'absolute', left: `${m.tick}%`, top: -1, bottom: -1, width: 2.5, marginLeft: -1.25, background: '#3a3a3a', borderRadius: 2 }} /> : null}
    </div>
  );
};

const LimitBlock: React.FC<{ m: LimitMetric; id: string }> = ({ m, id }) => {
  const t = `limit-${id}-${slug(m.label)}`;
  const noData = m.left === null || m.left === undefined;
  return (
    <div data-target={t} style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: L.labelLine, display: 'flex', alignItems: 'center', gap: pt(6) }}>
        <span style={{ ...fLabel(), ...ellipsis }}>{m.label}</span>
        <div style={{ flex: 1 }} />
        {m.note ? (
          <span data-target={`${t}-note`} style={{ display: 'inline-flex', alignItems: 'center', gap: pt(4), ...fSub, color: '#696969' }}>
            {m.flame ? <Flame size={pt(14)} /> : null}
            {m.note}
          </span>
        ) : null}
      </div>
      <div style={{ height: L.barGapTop }} />
      <Bar m={m} target={`${t}-bar`} />
      <div style={{ height: L.barGapBottom }} />
      <div style={{ height: L.subLine, display: 'flex', alignItems: 'center' }}>
        {noData ? (
          <div style={{ width: pt(9.5), height: pt(1.1), background: '#2a2a2a', borderRadius: 1 }} />
        ) : (
          <span data-target={`${t}-left`} style={{ ...fSub, color: C.text }}>
            {Math.round(Number(m.left))}% left
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span data-target={`${t}-resets`} style={fSub}>
          {noData ? 'No data' : m.resets ?? ''}
        </span>
      </div>
    </div>
  );
};

const Trend: React.FC<{ bars?: number[] | null; target: string; label: string }> = ({ bars, target, label }) => {
  const W = pt(120);
  const H = pt(18);
  const n = bars?.length ?? 0;
  const max = Math.max(1, ...(bars ?? [1]));
  const pitch = n ? W / n : 0;
  return (
    <div data-target={target} style={{ height: pt(22), display: 'flex', alignItems: 'center' }}>
      <span style={fLabel()}>{label}</span>
      <div style={{ flex: 1 }} />
      {bars && n ? (
        <svg width={W} height={H} style={{ display: 'block' }}>
          {bars.map((v, i) => {
            const h = Math.max(pt(1.7), (v / max) * H);
            return <rect key={i} x={i * pitch + pitch * 0.16} y={H - h} width={pitch * 0.68} height={h} rx={0.6} fill={C.blue} />;
          })}
        </svg>
      ) : (
        <span style={fSub}>No data</span>
      )}
    </div>
  );
};

const ValueRow: React.FC<{ label: string; value?: string | null; target: string }> = ({ label, value, target }) => (
  <div data-target={target} style={{ height: L.labelLine, display: 'flex', alignItems: 'center', gap: pt(8) }}>
    <span style={fLabel()}>{label}</span>
    <div style={{ flex: 1 }} />
    <span style={{ ...fSub, color: value && value !== 'Disabled' ? '#1c1c1c' : C.secondary, whiteSpace: 'nowrap' }}>{value ?? 'No data'}</span>
  </div>
);

const MetricView: React.FC<{ m: Metric; id: string }> = ({ m, id }) => {
  if (m.kind === 'trend') return <Trend bars={m.bars} target={`trend-${id}`} label={m.label ?? 'Usage Trend'} />;
  if (m.kind === 'value') return <ValueRow label={m.label} value={m.value} target={`value-${id}-${slug(m.label)}`} />;
  return <LimitBlock m={m as LimitMetric} id={id} />;
};

export const AccountSection: React.FC<{ a: Account; state: OUState; ui: UiState }> = ({ a, state, ui }) => {
  const open = state.expanded?.includes(a.id);
  const caretT = `caret-${a.id}`;
  const rows = a.metrics;
  const more = open ? a.more ?? [] : [];
  return (
    <div data-target={`account-${a.id}`} style={{ display: 'flex', flexDirection: 'column', marginTop: pt(12) }}>
      <div data-target={`account-${a.id}-header`} style={{ height: pt(28), display: 'flex', alignItems: 'center', gap: pt(6), padding: `0 ${pt(12)}px 0 ${pt(24.5)}px` }}>
        <ProviderIcon id={a.provider} size={pt(15)} color={C.icon} />
        <span style={{ font: `700 ${L.fHeader}px ${FONT_UI}`, color: C.text, letterSpacing: '-0.015em', ...ellipsis, flexShrink: 1, maxWidth: pt(162) }}>{accountTitle(a)}</span>
        {a.plan ? (
          <span data-target={`plan-${a.id}`} style={{ font: `400 ${pt(11.4)}px ${FONT_UI}`, color: '#737373', whiteSpace: 'nowrap', marginTop: 3, flexShrink: 0 }}>
            {a.plan}
          </span>
        ) : null}
      </div>
      <div
        data-target={`card-${a.id}`}
        style={{ margin: `0 ${L.margin}px`, borderRadius: L.cardR, background: C.card, boxShadow: `inset 0 0 0 1px ${C.cardLine}`, padding: `${L.cardPad}px ${L.cardPad}px ${pt(6)}px`, display: 'flex', flexDirection: 'column' }}
      >
        {rows.map((m, i) => (
          <div key={i} style={{ marginTop: gapBefore(rows[i - 1], m) }}>
            <MetricView m={m} id={a.id} />
          </div>
        ))}
        {more.length || (open && a.links?.length) ? <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: `${pt(9)}px 0 ${pt(4)}px` }} /> : null}
        {more.map((m, i) => (
          <div key={`m${i}`} style={{ marginTop: i === 0 ? pt(6.5) : gapBefore(more[i - 1], m) }}>
            <MetricView m={m} id={a.id} />
          </div>
        ))}
        {open && a.links?.length ? (
          <div style={{ display: 'flex', gap: pt(8), marginTop: pt(9.5) }}>
            {a.links.map((l) => {
              const t = `link-${a.id}-${slug(l)}`;
              return (
                <div
                  key={l}
                  data-target={t}
                  style={{ flex: 1, height: pt(20), borderRadius: pt(5), background: isHover(ui, t) ? 'rgba(0,0,0,0.13)' : 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: pt(4), font: `500 ${pt(12)}px ${FONT_UI}`, color: C.text }}
                >
                  {l}
                  <Ico name="arrow-up-right" size={pt(11)} color={C.text} stroke={2} />
                </div>
              );
            })}
          </div>
        ) : null}
        {a.more?.length || a.links?.length ? (
          <div style={{ height: pt(20), marginTop: open ? pt(9) : pt(6), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div data-target={caretT} style={{ padding: `${pt(3)}px ${pt(8)}px`, borderRadius: pt(6), background: isHover(ui, caretT) ? 'rgba(0,0,0,0.06)' : 'transparent' }}>
              <Chevron dir={open ? 'up' : 'down'} size={pt(10.5)} color={C.secondary} weight={2.4} />
            </div>
          </div>
        ) : (
          <div style={{ height: pt(8) }} />
        )}
      </div>
    </div>
  );
};

// ---------- empty state + footer ----------

export const EmptyDashboard: React.FC<{ ui: UiState }> = ({ ui }) => (
  <div data-target="empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${pt(30)}px ${pt(16)}px ${pt(26)}px` }}>
    <AppIcon size={pt(56)} />
    <div style={{ font: `600 ${pt(19)}px ${FONT_UI}`, color: C.text, marginTop: pt(14), letterSpacing: '-0.02em' }}>Add an Account</div>
    <div style={{ font: `400 ${pt(12)}px/1.35 ${FONT_UI}`, color: C.secondary, textAlign: 'center', maxWidth: pt(230), marginTop: pt(7) }}>
      OpenUsage tracks however many accounts you'd like to monitor. Just add them and they'll show right up, even multiple of the same provider!
    </div>
    <div
      data-target="add-account"
      style={{ marginTop: pt(20), height: pt(30), padding: `0 ${pt(16)}px`, borderRadius: pt(15), background: isPressed(ui, 'add-account') ? '#0062d6' : C.accent, display: 'flex', alignItems: 'center', gap: pt(5), font: `600 ${pt(12.5)}px ${FONT_UI}`, color: '#fff' }}
    >
      <Ico name="plus" size={pt(12)} color="#fff" stroke={2.6} />
      Add Account
    </div>
  </div>
);

export const Footer: React.FC<{ data: OUData; state: OUState; ui: UiState }> = ({ data, state, ui }) => {
  const hot = isHover(ui, 'options') || isPressed(ui, 'options') || state.menu === 'options';
  return (
    <div
      data-target="footer"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: L.footerH, background: C.footerBg, backdropFilter: 'blur(14px)', borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', padding: `0 ${L.margin}px`, boxSizing: 'border-box' }}
    >
      <div data-target="next-update" style={{ display: 'flex', flexDirection: 'column', font: `400 ${L.fSmall}px/1.3 ${FONT_UI}`, color: '#7a7a7a' }}>
        {data.footer === 'options' ? <span data-target="version">OpenUsage {data.version}</span> : null}
        <span>{data.nextUpdate}</span>
      </div>
      <div style={{ flex: 1 }} />
      {data.footer === 'options' ? (
        <div
          data-target="options"
          style={{ height: pt(28), padding: `0 ${pt(13)}px 0 ${pt(15)}px`, borderRadius: pt(14), background: hot ? '#ededed' : '#ffffff', boxShadow: '0 0 0 1px rgba(0,0,0,0.09), 0 1px 2px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: pt(7), font: `600 ${pt(13.6)}px ${FONT_UI}`, color: C.text, letterSpacing: '-0.01em' }}
        >
          Options
          <Chevron dir="down" size={pt(10)} color={C.text} weight={2.6} />
        </div>
      ) : (
        <div data-target="options" style={{ width: pt(26), height: pt(26), borderRadius: '50%', background: hot ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ico name="ellipsis" size={pt(15)} color={C.text} stroke={2.6} />
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC<{ data: OUData; state: OUState; ui: UiState; viewH: number }> = ({ data, state, ui, viewH }) => {
  const accts = visibleAccounts(data, state);
  if (!accts.length) return <EmptyDashboard ui={ui} />;
  return (
    <div data-target="dashboard" style={{ display: 'flex', flexDirection: 'column', transform: `translateY(${-dashboardScroll(data, state, viewH)}px)`, paddingBottom: L.footerH + pt(14) }}>
      {hasSpend(accts) ? <CostCard data={data} state={state} ui={ui} accts={accts} /> : <div style={{ height: pt(4) }} />}
      {accts.map((a) => (
        <AccountSection key={a.id} a={a} state={state} ui={ui} />
      ))}
    </div>
  );
};
