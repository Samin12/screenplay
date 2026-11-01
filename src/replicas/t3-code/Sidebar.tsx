import React from 'react';
import type { UiState } from '../../app/replica';
import { ClaudeStar, FONT_UI, Ico, TrafficLights, fill } from '../_shared/kit';
import { C, L } from './tokens';
import type { Project, T3Data, T3State, Thread } from './types';

// Left sidebar: traffic lights + "T3 Code" wordmark, Search row with folder / new-thread icons,
// three-line thread rows (project label + time, title, agent glyph), "Settled" group, icon footer.

export const Badge: React.FC<{ p?: Project; size?: number; faint?: boolean }> = ({ p, size = 25, faint }) => {
  if (!p) return <div style={{ width: size, height: size }} />;
  if (p.icon)
    return (
      <div style={{ width: size, height: size, borderRadius: 6, background: faint ? '#3a3a3a' : '#f2f2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Ico name={p.icon} size={size * 0.7} color="#0a0a0a" stroke={2} />
      </div>
    );
  const col = C[p.color ?? 'green'];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: faint ? '#141414' : col.bg,
        color: faint ? '#4a4a4a' : col.fg,
        font: `700 ${Math.round(size * 0.5)}px ${FONT_UI}`,
        letterSpacing: '0.02em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {p.badge ?? p.name.slice(0, 2).toUpperCase()}
    </div>
  );
};

// Agent glyph bottom-right of a row: Claude starburst (or a bot) with a tiny account tag.
export const AgentGlyph: React.FC<{ kind?: Thread['agent']; tag?: string; size?: number }> = ({ kind, tag, size = 22 }) => {
  if (!kind) return null;
  return (
    <div style={{ position: 'relative', width: size + 6, height: size + 4, flexShrink: 0 }}>
      {kind === 'claude' ? <ClaudeStar size={size} color={C.claude} /> : <Ico name={kind === 'codex' ? 'terminal' : 'bot'} size={size} color="#9a9a9a" stroke={1.8} />}
      {tag ? (
        <div
          style={{
            position: 'absolute',
            right: -4,
            bottom: -3,
            padding: '0 4px',
            height: 14,
            borderRadius: 7,
            background: '#1e1e1e',
            color: '#cfcfcf',
            font: `700 10.5px ${FONT_UI}`,
            lineHeight: '14px',
          }}
        >
          {tag}
        </div>
      ) : null}
    </div>
  );
};

const Row: React.FC<{ t: Thread; top: number; data: T3Data; state: T3State; ui: UiState }> = ({ t, top, data, state, ui }) => {
  const id = `thread-${t.id}`;
  const active = state.active === t.id;
  const p = data.projects.find((x) => x.id === t.project);
  const bg = fill(ui, id, { hover: C.hover, pressed: '#222', active, activeBg: C.sel, base: t.editing ? C.editing : 'transparent' });
  return (
    <div data-target={id} style={{ position: 'absolute', left: 12, top, width: L.sideW - 26, height: L.rowH, borderRadius: 15, background: bg, boxSizing: 'border-box' }}>
      {/* line 1: project + pin + time */}
      <div style={{ position: 'absolute', left: 17, right: 15, top: 28 - 13, height: 26, display: 'flex', alignItems: 'center', gap: 10 }}>
        {t.editing ? <Ico name="square-pen" size={21} color="#e0a43c" stroke={1.9} /> : null}
        <Badge p={p} />
        <span style={{ font: `400 ${L.small}px ${FONT_UI}`, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{p?.name ?? ''}</span>
        <div style={{ flex: 1 }} />
        {t.pinned ? <Ico name="pin" size={19} color={C.muted} stroke={1.7} style={{ marginRight: 14 }} /> : null}
        <span style={{ font: `400 ${L.small}px ${FONT_UI}`, color: C.muted }}>{t.time}</span>
      </div>
      {/* line 2: title */}
      <div
        data-target={`${id}-title`}
        style={{
          position: 'absolute',
          left: 17,
          top: 67 - 15,
          maxWidth: L.sideW - 26 - 34,
          font: `400 ${L.body}px ${FONT_UI}`,
          lineHeight: '30px',
          color: active ? C.selText : C.muted,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {t.title}
      </div>
      {/* line 3: branches + agent */}
      <div style={{ position: 'absolute', right: 15, top: 98 - 12, height: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
        {t.branches ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.purple, font: `400 ${L.small}px ${FONT_UI}` }}>
            <Ico name="git-branch" size={18} color={C.purple} stroke={1.9} />
            {t.branches}
          </div>
        ) : null}
        <AgentGlyph kind={t.agent} tag={t.agentTag} />
      </div>
    </div>
  );
};

/** Window-space top of each live thread row (same constants as the layout). */
export const rowTops = (data: T3Data) => {
  const out: Record<string, number> = {};
  data.threads.filter((t) => !t.settled).forEach((t, i) => (out[t.id] = L.rowTop0 + i * L.rowPitch));
  return out;
};

export const Sidebar: React.FC<{ data: T3Data; state: T3State; ui: UiState }> = ({ data, state, ui }) => {
  const live = data.threads.filter((t) => !t.settled);
  const settled = data.threads.filter((t) => t.settled);
  const settledTop = L.rowTop0 + live.length * L.rowPitch + 6;
  const iconBtn = (name: string, target: string, size = 23) => (
    <div
      data-target={target}
      style={{ width: 38, height: 38, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: fill(ui, target, { hover: '#1a1a1a', pressed: '#262626' }) }}
    >
      <Ico name={name} size={size} color={C.muted} stroke={1.7} />
    </div>
  );
  return (
    <div data-target="sidebar" style={{ position: 'absolute', left: 0, top: 0, width: L.sideW, height: '100%', background: C.side, borderRight: `1px solid ${C.sideLine}`, boxSizing: 'border-box', overflow: 'hidden' }}>
      {/* title bar part */}
      <div style={{ position: 'absolute', left: 16, top: L.barH / 2 - 7 }}>
        <TrafficLights size={13} gap={10} />
      </div>
      <div style={{ position: 'absolute', left: 115 - 19, top: L.barH / 2 - 19 }}>{iconBtn('panel-left-close', 'sidebar-toggle', 22)}</div>
      <div
        data-target="brand"
        style={{ position: 'absolute', left: 155 - 14, top: L.barH / 2 - 22, height: 44, padding: '0 14px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 7, font: `400 24px ${FONT_UI}`, color: '#f2f2f2', whiteSpace: 'nowrap' }}
      >
        <span style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>{data.appName.split(' ')[0]}</span>
        <span>{data.appName.split(' ').slice(1).join(' ')}</span>
      </div>

      {/* search row */}
      <div style={{ position: 'absolute', left: 22, right: 18, top: L.searchY - 21, height: 42, display: 'flex', alignItems: 'center' }}>
        <div data-target="search" style={{ display: 'flex', alignItems: 'center', gap: 13, height: 42, paddingRight: 10, borderRadius: 9, background: fill(ui, 'search', { hover: '#121212' }) }}>
          <Ico name="search" size={22} color={C.muted} stroke={1.8} />
          <span style={{ font: `500 22px ${FONT_UI}`, color: '#b5b5b5' }}>Search</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {iconBtn('folder', 'new-folder')}
          {iconBtn('folder-plus', 'add-project')}
          {iconBtn('square-pen', 'new-thread')}
        </div>
      </div>

      {/* threads */}
      {live.map((t, i) => (
        <Row key={t.id} t={t} top={L.rowTop0 + i * L.rowPitch} data={data} state={state} ui={ui} />
      ))}
      {settled.length ? (
        <div data-target="section-settled" style={{ position: 'absolute', left: 29, right: 28, top: settledTop, height: 40, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ font: `500 ${L.small}px ${FONT_UI}`, color: '#5e5e5e' }}>Settled</span>
          <div style={{ flex: 1, height: 1, background: '#1d1d1d' }} />
          <Ico name="chevron-up" size={18} color="#5e5e5e" stroke={2} />
        </div>
      ) : null}
      {settled.map((t, i) => {
        const p = data.projects.find((x) => x.id === t.project);
        const id = `thread-${t.id}`;
        return (
          <div
            key={t.id}
            data-target={id}
            style={{
              position: 'absolute',
              left: 12,
              width: L.sideW - 26,
              top: settledTop + 48 + i * 62,
              height: 54,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '0 15px 0 17px',
              boxSizing: 'border-box',
              background: fill(ui, id, { hover: C.hover, active: state.active === t.id, activeBg: C.sel }),
            }}
          >
            <Badge p={p} faint size={22} />
            <span style={{ flex: 1, minWidth: 0, font: `400 ${L.body}px ${FONT_UI}`, color: '#5a5a5a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
            <span style={{ font: `400 ${L.small}px ${FONT_UI}`, color: '#5a5a5a' }}>{t.time}</span>
          </div>
        );
      })}

      {/* footer */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: L.footerH, height: 46, background: `linear-gradient(to bottom, rgba(0,0,0,0), ${C.side})` }} />
      <div data-target="sidebar-footer" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: L.footerH, background: C.side, display: 'flex', alignItems: 'center', padding: '0 20px 0 19px', boxSizing: 'border-box', gap: 20 }}>
        {iconBtn('settings', 'settings')}
        {iconBtn('git-compare', 'tool-diff')}
        {iconBtn('chart-no-axes-column', 'tool-usage')}
        <div style={{ flex: 1 }} />
        {iconBtn('refresh-cw', 'tool-refresh')}
      </div>
    </div>
  );
};
