import React from 'react';
import type { UiState } from '../../../app/replica';
import { isHover, isPressed } from '../../../app/replica';
import { Ico, Spinner, fill, slug } from '../../_shared/kit';
import type { DesktopData, DesktopState, Session } from '../types';
import { FONT_SF, FS, LC, LL, SIDEBAR_BG } from './tokens';
import { ArtifactsIcon, BriefcaseIcon, ChatSearchIcon, Chev, DiffIcon, PointerIcon, RailIcon, SidebarIcon, Tri } from './icons';

// Light (samin) window chrome: title bar, vibrancy sidebar, session rail. Positions are design px
// measured from his recording (see tokens.ts); every overlay that needs a row position computes it
// from the same constants (sidebarRowCenters).

const txt = (size: number, color: string = LC.text, weight = 400): React.CSSProperties => ({ font: `${weight} ${size}px ${FONT_SF}`, color, whiteSpace: 'nowrap' });

// ---------- title bar ----------

const Btn: React.FC<{ t: string; ui: UiState; cx: number; w?: number; h?: number; active?: boolean; children: React.ReactNode }> = ({ t, ui, cx, w = 44, h = 40, active, children }) => (
  <div
    data-target={t}
    style={{
      position: 'absolute',
      left: cx - w / 2,
      top: 36 - h / 2,
      width: w,
      height: h,
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: fill(ui, t, { hover: LC.hover, pressed: LC.press, active, activeBg: LC.btnSel }),
    }}
  >
    {children}
  </div>
);

export const LightTitleBar: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState; title: string; W: number; sideW: number }> = ({ data, state, ui, title, W, sideW }) => {
  const mac = data.chrome !== 'windows';
  const onChat = state.tab === 'chat';
  // right tools, centres measured from the right edge
  const right = (d: number) => W - d;
  return (
    <>
      {/* left cluster, drawn over the sidebar (or the bare title bar when the sidebar is hidden) */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 414, height: LL.titleH, zIndex: 6 }}>
        {mac ? (
          [
            ['#fa6b64', '#df4c3e'],
            ['#fcc33b', '#d69603'],
            ['#6bcf45', '#48a548'],
          ].map(([c, ring], i) => (
            <div key={i} style={{ position: 'absolute', left: 38.9 + i * 23.75 - 7.2, top: 34.5 - 7.2, width: 14.4, height: 14.4, borderRadius: '50%', background: c, boxShadow: `inset 0 0 0 0.6px ${ring}` }} />
          ))
        ) : (
          <Btn t="app-menu" ui={ui} cx={32}>
            <Ico name="menu" size={26} color={LC.text} stroke={1.9} />
          </Btn>
        )}
        <Btn t="sidebar-toggle" ui={ui} cx={161.4}>
          <SidebarIcon size={27} />
        </Btn>
        <Btn t="back" ui={ui} cx={207.8} w={36}>
          <Chev dir="left" w={22} stroke={2.1} />
        </Btn>
        <Btn t="forward" ui={ui} cx={252} w={36}>
          <Chev dir="right" w={22} stroke={2.1} color="#9aa1aa" />
        </Btn>
        {/* Chat / Code segmented control */}
        <div style={{ position: 'absolute', left: 288.7, top: 12.9, width: 112.9, height: 45.9, borderRadius: 12.5, background: '#d0d8eb' }}>
          {(['chat', 'code'] as const).map((k, i) => {
            const t = `tab-${k}`;
            const on = state.tab === k;
            return (
              <div
                key={k}
                data-target={t}
                style={{
                  position: 'absolute',
                  left: i === 0 ? 2.6 : 56.3,
                  top: 1.5,
                  width: 54.6,
                  height: 42.4,
                  borderRadius: 10.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isPressed(ui, t) ? '#c3cbe0' : on ? '#eff4f9' : isHover(ui, t) ? 'rgba(255,255,255,0.35)' : 'transparent',
                  boxShadow: on ? '0 0 0 1px rgba(160,172,196,0.55), 0 1px 2px rgba(40,50,80,0.10)' : 'none',
                }}
              >
                {k === 'chat' ? <ChatSearchIcon size={26} stroke={2} /> : <Ico name="code-xml" size={28} color={LC.text} stroke={1.9} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* bar over main + rail */}
      <div style={{ position: 'absolute', left: sideW, top: 0, right: 0, height: LL.titleH, background: LC.bg, borderBottom: `1px solid ${LC.line}`, boxSizing: 'border-box', zIndex: 3 }}>
        <div
          data-target="title"
          style={{ position: 'absolute', left: sideW ? 26 : 430, top: 36 - 22, height: 44, display: 'flex', alignItems: 'center', gap: 26, padding: '0 9px', borderRadius: 10, background: fill(ui, 'title', { hover: LC.hover }) }}
        >
          <span style={txt(FS.row, onChat && !state.active ? LC.dim : LC.text)}>{title}</span>
          <Chev dir="down" w={16} stroke={2.1} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: LL.titleH, zIndex: 4, pointerEvents: 'none' }}>
        <Btn t="rail-toggle" ui={ui} cx={right(297.2)} w={43.3} active={!!state.rail}>
          <RailIcon size={25} />
        </Btn>
        <Btn t="tool-terminal" ui={ui} cx={right(235.6)}>
          <Ico name="terminal" size={30} color={LC.text} stroke={1.75} />
        </Btn>
        <Btn t="tool-diff" ui={ui} cx={right(193.1)}>
          <DiffIcon size={25} />
        </Btn>
        <Btn t="tool-preview" ui={ui} cx={right(140.7)}>
          <Ico name="globe" size={30} color={LC.text} stroke={1.65} />
        </Btn>
        <Btn t="tool-files" ui={ui} cx={right(89.2)}>
          <Ico name="folder" size={30} color={LC.text} stroke={1.65} />
        </Btn>
        <Btn t="tool-more" ui={ui} cx={right(37.1)} active={state.menu?.for === 'tool-more'}>
          <Ico name="ellipsis" size={28} color={LC.text} stroke={2.4} />
        </Btn>
      </div>
    </>
  );
};

// ---------- sidebar ----------

const NAV_ICON: Record<string, string> = { New: 'plus', Search: 'search', Artifacts: 'book-copy', Scheduled: 'clock', Customize: 'briefcase' };

// Window-space centre y of every session row (and section header), from the layout constants.
export const sidebarRowCenters = (data: DesktopData, state: DesktopState) => {
  const out: Record<string, number> = {};
  const scroll = Number(state.sidebarScroll) || 0;
  let y = LL.navTop + (data.nav.length - 1) * LL.pitch + 86 - scroll; // first header centre (413.5 with 5 nav rows)
  const walk = (list: Session[], depth: number) => {
    for (const s of list) {
      out[s.id] = y;
      y += LL.pitch;
      if (s.children?.length && !s.collapsed) walk(s.children, depth + 1);
    }
  };
  const groups = [...(data.pinned?.length ? [{ name: 'Pinned', sessions: data.pinned }] : []), ...data.sections];
  groups.forEach((g, i) => {
    out[`section:${g.name}`] = y;
    y += 53.3; // header centre -> first row centre (413.5 -> 466.8)
    walk(g.sessions, 0);
    if (i < groups.length - 1) y += 30; // gap before the next group header
  });
  return out;
};

const Status: React.FC<{ s?: Session['status']; ui: UiState }> = ({ s, ui }) => {
  if (!s) return null;
  if (s === 'working') return <Spinner size={20} color="#555" track="#cfcfcf" ui={ui} stroke={2.4} />;
  if (s === 'waiting') return <Ico name="triangle-alert" size={21} color="#555" stroke={1.8} />;
  if (s === 'unread') return <div style={{ width: 8.8, height: 8.8, borderRadius: '50%', background: '#2a7de1' }} />;
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8a8a8a' }} />;
};

export const LightSidebar: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState; H: number }> = ({ data, state, ui, H }) => {
  const centers = sidebarRowCenters(data, state);
  const groups = [...(data.pinned?.length ? [{ name: 'Pinned', sessions: data.pinned }] : []), ...data.sections];
  const footerTop = H - LL.footerH;
  const rows: React.ReactNode[] = [];
  const walk = (list: Session[], depth: number) => {
    for (const s of list) {
      const t = `session-${s.id}`;
      const more = `more-${s.id}`;
      const cy = centers[s.id];
      const active = state.active === s.id;
      const menuHere = state.menu?.for === s.id;
      const showMore = menuHere || isHover(ui, t) || isHover(ui, more);
      const hasKids = !!s.children?.length;
      const right = s.status || showMore ? 360 : 398;
      rows.push(
        <div
          key={s.id}
          data-target={t}
          style={{
            position: 'absolute',
            left: LL.rowX + depth * 26,
            top: cy - LL.rowH / 2,
            width: 385.6 - depth * 26,
            height: LL.rowH,
            borderRadius: 12,
            background: fill(ui, t, { hover: 'rgba(0,0,0,0.045)', pressed: 'rgba(0,0,0,0.09)', active: active || menuHere, activeBg: LC.sel }),
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: LL.textX - LL.rowX,
              top: 0,
              height: LL.rowH,
              width: right - LL.textX - depth * 26,
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
              maskImage: 'linear-gradient(to right, #000 calc(100% - 26px), transparent)',
              WebkitMaskImage: 'linear-gradient(to right, #000 calc(100% - 26px), transparent)',
            }}
          >
            <span style={txt(FS.row)}>{s.title}</span>
            {hasKids ? <Chev dir="down" w={12} stroke={1.8} color="#555" style={{ marginLeft: 10, transform: s.collapsed ? 'rotate(-90deg)' : undefined }} /> : null}
          </div>
          <div style={{ position: 'absolute', left: 374.3 - LL.rowX - depth * 26 - 15, top: LL.rowH / 2 - 15, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {showMore ? null : <Status s={s.status} ui={ui} />}
            <div
              data-target={more}
              style={{ position: 'absolute', left: -4, top: -2, width: 38, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: showMore ? 1 : 0, background: menuHere || isHover(ui, more) ? 'rgba(0,0,0,0.08)' : 'transparent' }}
            >
              <Ico name="ellipsis" size={24} color={LC.text} stroke={2.2} />
            </div>
          </div>
        </div>,
      );
      if (hasKids && !s.collapsed) walk(s.children!, depth + 1);
    }
  };
  groups.forEach((g) => walk(g.sessions, 0));

  return (
    <div data-target="sidebar" style={{ position: 'absolute', left: 0, top: 0, width: LL.sideW, height: H, background: SIDEBAR_BG, borderRight: `1px solid ${LC.sideLine}`, boxSizing: 'border-box', zIndex: 5, overflow: 'hidden' }}>
      {/* nav */}
      <div data-target="nav" style={{ position: 'absolute', left: LL.rowX, top: LL.navTop - LL.rowH / 2, width: 385.6, height: (data.nav.length - 1) * LL.pitch + LL.rowH }}>
        {data.nav.map((n, i) => {
          const t = `nav-${slug(n.label)}`;
          return (
            <div
              key={n.label}
              data-target={t}
              style={{ position: 'absolute', left: 0, top: i * LL.pitch, width: 385.6, height: LL.rowH, borderRadius: 12, display: 'flex', alignItems: 'center', background: fill(ui, t, { hover: 'rgba(0,0,0,0.045)', pressed: 'rgba(0,0,0,0.09)' }) }}
            >
              <div style={{ position: 'absolute', left: 44.4 - LL.rowX - 15, width: 30, display: 'flex', justifyContent: 'center' }}>
                {n.label === 'Artifacts' ? <ArtifactsIcon size={25} /> : n.label === 'Customize' ? <BriefcaseIcon size={25} /> : <Ico name={NAV_ICON[n.label] ?? n.icon} size={n.label === 'New' ? 30 : 27} color={LC.text} stroke={n.label === 'New' ? 1.6 : 1.75} />}
              </div>
              <span style={{ ...txt(FS.row), position: 'absolute', left: 75.8 - LL.rowX }}>{n.label}</span>
            </div>
          );
        })}
      </div>

      {/* sessions (clipped above the footer) */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: LL.sideW, height: footerTop, overflow: 'hidden' }}>
        {groups.map((g) => {
          const cy = centers[`section:${g.name}`];
          const t = `section-${slug(g.name)}`;
          const last = g.sessions.length ? (() => {
            let id = g.sessions[g.sessions.length - 1].id;
            const lastKid = (s: Session): string => (s.children?.length && !s.collapsed ? lastKid(s.children[s.children.length - 1]) : s.id);
            id = lastKid(g.sessions[g.sessions.length - 1]);
            return centers[id];
          })() : cy;
          return (
            <React.Fragment key={g.name}>
              <div data-target={`group-${slug(g.name)}`} style={{ position: 'absolute', left: LL.rowX, top: cy - 22, width: 385.6, height: last + LL.rowH / 2 - (cy - 22) }} />
              <div data-target={t} style={{ position: 'absolute', left: LL.rowX, top: cy - 20, height: 40, display: 'flex', alignItems: 'center', gap: 16, padding: '0 12px 0 18.5px', borderRadius: 9, background: fill(ui, t, { hover: 'rgba(0,0,0,0.045)' }) }}>
                <span style={txt(FS.header, LC.dim)}>{g.name}</span>
                <Tri dir="down" w={6.7} h={9.8} color="#4c4c4c" />
              </div>
            </React.Fragment>
          );
        })}
        {rows}
      </div>

      {/* footer */}
      <div style={{ position: 'absolute', left: 0, top: footerTop, width: LL.sideW - 1, height: LL.footerH, borderTop: '1px solid #cfcccd', boxSizing: 'border-box' }}>
        <div
          data-target="user"
          style={{ position: 'absolute', left: 18, top: LL.footerH / 2 - 26, height: 52, display: 'flex', alignItems: 'center', padding: '0 12px 0 10px', borderRadius: 12, background: fill(ui, 'user', { hover: 'rgba(0,0,0,0.045)', pressed: 'rgba(0,0,0,0.09)', active: !!state.userMenu, activeBg: 'rgba(0,0,0,0.07)' }) }}
        >
          <div style={{ width: 33, height: 33, borderRadius: '50%', background: '#d2d0d1', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `400 15.5px ${FONT_SF}`, color: '#2a2a2a' }}>{(data.user.initial ?? data.user.name.slice(0, 1)).toUpperCase()}</div>
          <span style={{ ...txt(22.6), marginLeft: 16 }}>{data.user.name}</span>
          <span style={{ ...txt(FS.tiny, LC.dim), marginLeft: 10 }}>· {data.user.plan}</span>
          <Chev dir="down" w={12} stroke={1.9} color={LC.dim} style={{ marginLeft: 14 }} />
        </div>
        <div
          data-target="settings-gear"
          style={{ position: 'absolute', left: 376.6 - 21, top: LL.footerH / 2 - 21, width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: fill(ui, 'settings-gear', { hover: 'rgba(0,0,0,0.06)', pressed: 'rgba(0,0,0,0.1)' }) }}
        >
          <Ico name="settings" size={30} color={LC.text} stroke={1.65} />
        </div>
      </div>
    </div>
  );
};

// ---------- session rail ----------

const RailRow: React.FC<{ t: string; y: number; icon: React.ReactNode; children: React.ReactNode; left: number; width: number }> = ({ t, y, icon, children, left, width }) => (
  <div data-target={t} style={{ position: 'absolute', left, top: y - 22, width, height: 44, display: 'flex', alignItems: 'center' }}>
    <div style={{ position: 'absolute', left: 1, width: 28, display: 'flex', justifyContent: 'center' }}>{icon}</div>
    <div style={{ position: 'absolute', left: 48.2, right: 0, display: 'flex', alignItems: 'center' }}>{children}</div>
  </div>
);

const Divider: React.FC<{ y: number; left: number; width: number }> = ({ y, left, width }) => <div style={{ position: 'absolute', left, top: y, width, height: 1, background: LC.divider }} />;

const MiniSwitch: React.FC<{ on: boolean; t: string; ui: UiState; w?: number; h?: number }> = ({ on, t, ui, w = 47, h = 26.3 }) => {
  const k = h - 6;
  const hov = isHover(ui, t) || isPressed(ui, t);
  return (
    <div data-target={t} style={{ width: w, height: h, borderRadius: h, background: on ? LC.blue : hov ? '#d0d0d0' : '#dcdcdc', boxShadow: on ? 'none' : 'inset 0 0 0 1px #c9c9c9', position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: on ? w - k - 3 : 3, width: k, height: k, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
    </div>
  );
};
export { MiniSwitch };

export const LightRail: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState; W: number; H: number }> = ({ data, state, ui, W, H }) => {
  const L0 = W - LL.railW;
  const cl = L0 + LL.railPadL; // content left
  const cw = W - LL.railPadR - cl; // content width
  const env = data.environment;
  const ctx = data.context;
  const iconC = LC.dim;
  const ctxRows = ctx.rows.filter((r) => !/free/i.test(r.label));
  // expanded sections push the ones below down
  const ctxExtra = state.contextFull ? 22 + ctxRows.length * 38 : 0;
  const conExtra = state.connectorsOpen ? data.connectors.length * 46 + 6 : 0;
  const yCtx = 398.5;
  const d2 = 438.2 + ctxExtra;
  const yCon = 476.9 + ctxExtra;
  const d3 = 515.6 + ctxExtra + conExtra;
  const yCh = 554.2 + ctxExtra + conExtra;
  const yChRow = 606.8 + ctxExtra + conExtra;
  const head = (t: string, label: string, y: number, tri: boolean, open = false) => (
    <div data-target={t} style={{ position: 'absolute', left: cl, top: y - 20, height: 40, display: 'flex', alignItems: 'center', gap: 15 }}>
      <span style={txt(FS.small)}>{label}</span>
      {tri ? <Tri dir={open ? 'down' : 'right'} w={7.7} h={10.3} color="#595959" /> : null}
    </div>
  );
  return (
    <div data-target="rail" style={{ position: 'absolute', left: L0, top: LL.titleH, width: LL.railW, height: H - LL.titleH, background: LC.bg, borderLeft: `1px solid ${LC.railLine}`, boxSizing: 'border-box', zIndex: 2 }}>
      <div style={{ position: 'absolute', left: -L0, top: -LL.titleH, width: W, height: H }}>
        {/* Environment */}
        <div data-target="env-card" style={{ position: 'absolute', left: cl, top: 111.9 - 22, width: cw, height: 321.2 + 24 - (111.9 - 22) }} />
        {head('env-head', 'Environment', 111.9, false)}
        <RailRow t="env-location" y={165} left={cl} width={cw} icon={<Ico name="laptop" size={29} color={iconC} stroke={1.6} />}>
          <span style={{ ...txt(FS.row), flex: 1 }}>{env.location}</span>
          <span data-target="env-save" style={{ ...txt(FS.row), textDecoration: 'underline', textUnderlineOffset: 6, textDecorationThickness: 1.4, textDecorationColor: '#555' }}>
            Save
          </span>
        </RailRow>
        <RailRow t="env-folder" y={217} left={cl} width={cw} icon={<Ico name="folder" size={28} color={iconC} stroke={1.6} />}>
          <span style={txt(FS.row)}>{env.folder}</span>
          {env.drive ? <span style={{ ...txt(FS.row, LC.dim), marginLeft: 8 }}>· {env.drive}</span> : null}
        </RailRow>
        {env.branch ? (
          <RailRow t="env-branch" y={269} left={cl} width={cw} icon={<Ico name="git-branch" size={27} color={iconC} stroke={1.6} />}>
            <span style={txt(FS.row)}>{env.branch}</span>
          </RailRow>
        ) : null}
        <RailRow t="env-remote" y={env.branch ? 321.2 : 269} left={cl} width={cw} icon={<PointerIcon size={25} color={iconC} stroke={1.6} />}>
          <span style={{ ...txt(FS.row), flex: 1 }}>Remote Control</span>
          <MiniSwitch on={!!state.remote} t="remote-toggle" ui={ui} />
        </RailRow>
        <Divider y={359.9} left={cl} width={cw} />

        {/* Context */}
        <div data-target="context-card" style={{ position: 'absolute', left: cl, top: yCtx - 22, width: cw, height: 44 + ctxExtra }} />
        {head('context-head', 'Context', yCtx, true, !!state.contextFull)}
        <div data-target="context-used" style={{ position: 'absolute', right: W - 1892.7, top: yCtx - 15, height: 30, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={txt(FS.row, LC.dim)}>{ctx.pct}%</span>
          <div data-target="context-bar" style={{ width: 37.7, height: 14.4, borderRadius: 8, background: LC.track, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: Math.max(14.4, (37.7 * ctx.pct) / 100), borderRadius: 8, background: LC.barBlue }} />
          </div>
        </div>
        {state.contextFull
          ? ctxRows.map((r, i) => (
              <div key={r.label} data-target={`context-${slug(r.label)}`} style={{ position: 'absolute', left: cl, top: yCtx + 30 + i * 38, width: cw, height: 34, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 13, height: 13, borderRadius: 3.5, background: r.color ?? '#bdbdbd', marginRight: 16, flexShrink: 0 }} />
                <span style={{ ...txt(FS.small), flex: 1, textDecorationLine: r.dotted ? 'underline' : 'none', textDecorationStyle: 'dotted', textUnderlineOffset: 5, textDecorationColor: '#9a9a9a' }}>{r.label}</span>
                <span style={{ ...txt(FS.small, LC.dim), width: 90, textAlign: 'right' }}>{r.size}</span>
                <span style={{ ...txt(FS.small, LC.dim), width: 80, textAlign: 'right' }}>{r.pct}</span>
              </div>
            ))
          : null}
        <Divider y={d2} left={cl} width={cw} />

        {/* Connectors */}
        <div data-target="connectors-card" style={{ position: 'absolute', left: cl, top: yCon - 22, width: cw, height: 44 + conExtra }} />
        {head('connectors-head', 'Connectors', yCon, true, !!state.connectorsOpen)}
        {data.connectorsNote ? (
          <span data-target="connectors-note" style={{ ...txt(FS.small, LC.dim), position: 'absolute', right: W - 1892.7, top: yCon - 14, lineHeight: '28px' }}>
            {data.connectorsNote}
          </span>
        ) : null}
        {state.connectorsOpen
          ? data.connectors.map((c, i) => {
              const t = `connector-${slug(c.name)}`;
              const warn = /auth|reconnect/i.test(c.status);
              return (
                <div key={c.name} data-target={t} style={{ position: 'absolute', left: cl, top: yCon + 28 + i * 46, width: cw, height: 42, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f0f0f0', border: '1px solid #e2e2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `600 14px ${FONT_SF}`, color: '#555', flexShrink: 0 }}>
                    {c.letter ?? c.name.slice(0, 1)}
                  </div>
                  <span style={{ ...txt(FS.row), flex: 1 }}>{c.name}</span>
                  <span style={{ ...txt(FS.small, warn ? '#b26a00' : LC.dim) }}>{c.status}</span>
                </div>
              );
            })
          : null}
        <Divider y={d3} left={cl} width={cw} />

        {/* Changes */}
        {data.changes ? (
          <>
            <div data-target="changes-card" style={{ position: 'absolute', left: cl, top: yCh - 22, width: cw, height: yChRow + 22 - (yCh - 22) }} />
            {head('changes-head', 'Changes', yCh, false)}
            <RailRow t="changes" y={yChRow} left={cl} width={cw} icon={<DiffIcon size={24} color={iconC} stroke={1.7} />}>
              <span style={{ ...txt(FS.small, LC.green), flex: 0 }}>{data.changes.added}</span>
              <span style={{ ...txt(FS.small, LC.red), marginLeft: 9, flex: 1 }}>{data.changes.removed}</span>
            </RailRow>
            <div
              data-target="create-pr"
              style={{ position: 'absolute', left: 1767.9 - (1920 - W), top: yChRow - 18.6, width: 124.8, height: 37.1, borderRadius: 10, background: fill(ui, 'create-pr', { base: LC.btn, hover: '#e6e6e6', pressed: '#dcdcdc' }), display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span style={txt(FS.row)}>Create PR</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
