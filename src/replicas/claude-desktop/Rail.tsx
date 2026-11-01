import React from 'react';
import type { UiState } from '../../app/replica';
import { isHover, isPressed } from '../../app/replica';
import { Ico, Switch, fill, slug, FONT_UI } from '../_shared/kit';
import { C, L } from './tokens';
import type { DesktopData, DesktopState } from './types';

// Session rail (right panel): Environment, Context, Connectors, Outputs cards.
// Cards: #181818 with a #272727 hairline, radius 16, 30 px inner padding.

const CardHead: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 40, marginBottom: 6 }}>
    <span style={{ font: `500 ${L.body}px ${FONT_UI}`, color: '#ececec' }}>{title}</span>
    <svg width="12" height="8" viewBox="0 0 12 8">
      <path d="M1 1 L6 7 L11 1 Z" fill="#a8a8a8" />
    </svg>
  </div>
);

const RailCard: React.FC<{ t: string; title: string; children: React.ReactNode; ui: UiState }> = ({ t, title, children, ui }) => (
  <div data-target={t} style={{ border: `1px solid ${isHover(ui, t) ? C.cardLineHi : C.cardLine}`, borderRadius: 16, background: C.card, padding: '16px 26px 14px 30px', flexShrink: 0 }}>
    <CardHead title={title} />
    {children}
  </div>
);

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, height: 52 };
const label: React.CSSProperties = { font: `400 ${L.body}px ${FONT_UI}`, color: '#ececec', whiteSpace: 'nowrap' };
const meta: React.CSSProperties = { font: `400 ${L.small}px ${FONT_UI}`, color: '#8f8f8f', whiteSpace: 'nowrap' };

export const Rail: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState }> = ({ data, state, ui }) => {
  const env = data.environment;
  const ctx = data.context;
  const rows = state.contextFull ? ctx.rows : ctx.rows.slice(0, 4);
  const pctNum = (p: string) => parseFloat(p) || 0;
  const barRows = ctx.rows.filter((r) => !/free/i.test(r.label));
  return (
    <div
      data-target="rail"
      style={{ position: 'absolute', right: 0, top: L.titleH, bottom: 0, width: L.railW, background: C.bg, borderLeft: `1px solid ${C.titleLine}`, padding: '20px 16px 16px 12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden', zIndex: 2 }}
    >
      <RailCard t="env-card" title="Environment" ui={ui}>
        <div data-target="env-location" style={row}>
          <Ico name="laptop" size={25} color="#d0d0d0" stroke={1.6} />
          <span style={{ ...label, flex: 1 }}>{env.location}</span>
          <span data-target="env-save" style={{ ...label, textDecoration: 'underline', textUnderlineOffset: 5, textDecorationThickness: 1.5 }}>Save</span>
        </div>
        <div data-target="env-folder" style={row}>
          <Ico name="folder" size={25} color="#d0d0d0" stroke={1.6} />
          <span style={label}>{env.folder}</span>
          {env.drive ? <span style={{ ...meta, marginLeft: -6 }}>· {env.drive}</span> : null}
        </div>
        <div data-target="env-remote" style={row}>
          <Ico name="mouse-pointer-2" size={23} color={state.remote ? C.accent : '#d0d0d0'} stroke={1.7} />
          <span style={{ ...label, flex: 1 }}>Remote Control</span>
          <Switch on={!!state.remote} target="remote-toggle" ui={ui} onColor={C.toggle} />
        </div>
      </RailCard>

      <RailCard t="context-card" title="Context" ui={ui}>
        <div data-target="context-used" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', height: 36 }}>
          <span style={{ ...label }}>{ctx.pct}% used</span>
          <span style={{ ...meta, color: '#a8a8a8' }}>
            {ctx.used} / {ctx.total}
          </span>
        </div>
        <div data-target="context-bar" style={{ height: 6, borderRadius: 3, background: C.track, display: 'flex', gap: 2, overflow: 'hidden', margin: '6px 0 10px' }}>
          {barRows.map((r, i) => (
            <div key={i} style={{ width: `${Math.max(0.6, pctNum(r.pct))}%`, background: r.color ?? '#9a9a9a', height: '100%' }} />
          ))}
        </div>
        {rows.map((r) => (
          <div key={r.label} data-target={`context-${slug(r.label)}`} style={{ display: 'flex', alignItems: 'center', height: 40 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: r.color ?? '#bdbdbd', marginRight: 22, flexShrink: 0 }} />
            <span
              style={{
                flex: 1,
                font: `400 ${L.small}px ${FONT_UI}`,
                color: '#c8c8c8',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '36px',
                textDecorationLine: r.dotted ? 'underline' : 'none',
                textDecorationStyle: 'dotted',
                textDecorationThickness: 2,
                textUnderlineOffset: 5,
                textDecorationColor: '#8a8a8a',
              }}
            >
              {r.label}
            </span>
            <span style={{ ...meta, width: 90, textAlign: 'right', color: '#a8a8a8' }}>{r.size}</span>
            <span style={{ ...meta, width: 92, textAlign: 'right', color: '#d8d8d8' }}>{r.pct}</span>
          </div>
        ))}
      </RailCard>

      <RailCard t="connectors-card" title="Connectors" ui={ui}>
        {data.connectors.map((c) => {
          const t = `connector-${slug(c.name)}`;
          const auth = /auth/i.test(c.status);
          return (
            <div key={c.name} data-target={t} style={{ ...row, height: 50, borderRadius: 10, margin: '0 -10px', padding: '0 10px', background: fill(ui, t, { hover: '#202020' }) }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: C.chip, border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `600 15px ${FONT_UI}`, color: '#bdbdbd', flexShrink: 0 }}>
                {c.letter ?? c.name.slice(0, 1)}
              </div>
              <span style={{ ...label, flex: 1 }}>{c.name}</span>
              <span style={{ ...meta, color: auth ? C.amber : '#8f8f8f' }}>{c.status}</span>
            </div>
          );
        })}
      </RailCard>

      <RailCard t="outputs-card" title="Outputs" ui={ui}>
        {data.outputs.map((o, i) => (
          <div key={i} data-target={`output-${i + 1}`} style={{ ...row, height: 48 }}>
            <Ico name={o.icon ?? 'file'} size={24} color="#d0d0d0" stroke={1.6} />
            <span style={{ ...label, flex: 1, minWidth: 0, overflow: 'hidden', maskImage: 'linear-gradient(to right, #000 80%, transparent)', WebkitMaskImage: 'linear-gradient(to right, #000 80%, transparent)' }}>{o.name}</span>
            <span style={meta}>{o.meta}</span>
          </div>
        ))}
      </RailCard>
    </div>
  );
};

// Pixel crab avatar (agents panel). 13x10 grid.
const CRAB = ['..x.......x..', '...x.....x...', '.xxxxxxxxxxx.', '.xx.xxxxx.xx.', 'xxxxxxxxxxxxx', 'x.xxxxxxxxx.x', '..xxxxxxxxx..', '..x.x...x.x..'];
export const PixelCrab: React.FC<{ size: number; color?: string; hat?: string }> = ({ size, color = '#da7656', hat }) => {
  const px = size / 13;
  return (
    <svg width={size} height={px * 10} viewBox={`0 0 13 10`} shapeRendering="crispEdges" style={{ flexShrink: 0 }}>
      {hat ? <rect x={3} y={0} width={7} height={1.6} fill={hat} /> : null}
      {CRAB.map((r, y) => r.split('').map((ch, x) => (ch === 'x' ? <rect key={`${x}-${y}`} x={x} y={y + 2} width={1} height={1} fill={y === 3 && (x === 3 || x === 9) ? '#111' : color} /> : null)))}
    </svg>
  );
};

export const AgentsPanel: React.FC<{ data: DesktopData; ui: UiState; frame: number }> = ({ data, ui }) => {
  const a = data.agents;
  return (
    <div data-target="agents" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 785, background: C.side, borderLeft: `1px solid ${C.sideLine}`, zIndex: 4, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: L.titleH, display: 'flex', alignItems: 'center', padding: '0 22px', borderBottom: `1px solid ${C.titleLine}`, boxSizing: 'border-box' }}>
        <span style={{ font: `400 ${L.body}px ${FONT_UI}`, color: '#9a9a9a', flex: 1 }}>Agents</span>
        <Ico name="maximize-2" size={22} color="#bdbdbd" stroke={1.7} style={{ marginRight: 26 }} />
        <div data-target="agents-close">
          <Ico name="x" size={24} color="#bdbdbd" stroke={1.7} />
        </div>
      </div>
      <div style={{ padding: '28px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ font: `500 30px ${FONT_UI}`, color: '#f0f0f0' }}>{a.title}</div>
        <div data-target="agents-stats" style={{ display: 'flex', gap: 14 }}>
          {a.stats.map(([k, v]) => (
            <div key={k} style={{ flex: 1, background: '#262624', borderRadius: 10, padding: '12px 18px' }}>
              <div style={{ ...meta, color: '#9a9a9a' }}>{k}</div>
              <div style={{ font: `600 30px ${FONT_UI}`, color: '#f0f0f0', marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ font: `400 26px ${FONT_UI}`, color: '#bdbdbd', marginTop: 12 }}>▾ Running · {a.running.length}</div>
        {a.running.map((r, i) => (
          <div key={i} data-target={`agent-${i + 1}`} style={{ display: 'flex', gap: 20, padding: '8px 0 16px', borderBottom: '1px solid #2c2c2a', background: fill(ui, `agent-${i + 1}`, { hover: '#242424' }) }}>
            <PixelCrab size={56} hat={i === 1 ? '#3fae5a' : '#e8e8e8'} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ font: `500 27px ${FONT_UI}`, color: '#f0f0f0', flex: 1 }}>{r.name}</span>
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: r.color ?? C.blue }} />
              </div>
              <div style={{ font: `400 ${L.small}px ${FONT_UI}`, color: '#9a9a9a', marginTop: 2 }}>
                <span style={{ color: r.tier === 'quick' ? '#41907a' : '#4e84bc' }}>{r.tier}</span> {r.model} · {r.effort}
              </div>
              <div style={{ display: 'flex', ...meta, marginTop: 6 }}>
                <span style={{ flex: 1, color: '#bdbdbd' }}>
                  {r.done}/{r.total}
                </span>
                <span>{r.meta}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#2c2c2a', marginTop: 8 }}>
                <div style={{ width: `${(100 * r.done) / Math.max(1, r.total)}%`, height: '100%', borderRadius: 3, background: r.color ?? C.blue }} />
              </div>
            </div>
          </div>
        ))}
        <div style={{ font: `400 26px ${FONT_UI}`, color: '#bdbdbd', marginTop: 6 }}>▸ Finished · {a.finished}</div>
      </div>
    </div>
  );
};
