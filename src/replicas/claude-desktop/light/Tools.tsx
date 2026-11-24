import React from 'react';
import { Img, OffthreadVideo, Sequence, staticFile } from 'remotion';
import type { UiState } from '../../../app/replica';
import { isHover, isPressed } from '../../../app/replica';
import { Ico, Spinner, slug } from '../../_shared/kit';
import { FolderIcon, ItemIcon } from '../../finder/Finder';
import type { Attachment, ConnectorTool, DesktopData, DesktopState, Message, ToolResult, ToolStatus } from '../types';
import { FONT_SF, FONT_SF_MONO, FS, LC } from './tokens';
import { Chev } from './icons';
import { MiniSwitch } from './Chrome';

// Light-theme additions for connector (MCP) work: the connectors popover with a connector's tool
// list, tool-call rows with a media result, attachment chips (folder, pasted text, image) and the
// ghost of a file or folder being dropped on the composer.

const txt = (size: number, color: string = LC.text, weight = 400): React.CSSProperties => ({ font: `${weight} ${size}px ${FONT_SF}`, color });
const isPath = (s?: string) => !!s && /\.(png|jpe?g|webp|svg|gif)$/i.test(s);

// A connector's mark: its logo (work-dir image), a lucide icon, or its first letter on a tile.
export const ConnIcon: React.FC<{ c?: { name: string; letter?: string; icon?: string; color?: string }; name: string; icon?: string; size: number }> = ({ c, name, icon, size }) => {
  const ic = icon ?? c?.icon;
  const box: React.CSSProperties = { width: size, height: size, borderRadius: size * 0.26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };
  if (isPath(ic)) return <Img src={staticFile(ic!)} style={{ ...box, objectFit: 'cover', display: 'block' }} />;
  const bg = c?.color ?? '#1c1c1c';
  return (
    <div style={{ ...box, background: bg, font: `700 ${size * 0.52}px ${FONT_SF}`, color: '#fff' }}>
      {ic ? <Ico name={ic} size={size * 0.6} color="#fff" stroke={2} /> : (c?.letter ?? name.slice(0, 1)).toUpperCase()}
    </div>
  );
};

// ---------- attachment chips ----------

export const AttachmentChip: React.FC<{ a: Attachment; t?: string }> = ({ a, t }) => {
  const folder = a.kind === 'folder';
  const pasted = a.kind === 'pasted';
  const meta = a.meta ?? (pasted ? `Pasted${a.lines ? ` · ${a.lines.toLocaleString('en-US')} lines` : ''}` : folder && a.count !== undefined ? `${a.count} item${a.count === 1 ? '' : 's'}` : undefined);
  return (
    <div data-target={t} style={{ height: 64, padding: '0 22px 0 16px', borderRadius: 14, border: `1px solid ${LC.cardLine}`, background: LC.white, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', flexShrink: 0 }}>
      {a.thumb ? (
        <Img src={staticFile(a.thumb)} style={{ width: 44, height: 44, borderRadius: 9, objectFit: 'cover', display: 'block', boxShadow: '0 0 0 1px rgba(0,0,0,0.10)' }} />
      ) : folder ? (
        <div style={{ width: 40, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FolderIcon w={40} />
        </div>
      ) : (
        <div style={{ width: 38, height: 38, borderRadius: 9, background: '#f1efe9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ico name={a.icon ?? (pasted ? 'clipboard' : a.name.endsWith('/') ? 'folder' : a.kind === 'image' ? 'image' : 'file-text')} size={22} color="#5a5a5a" stroke={1.8} />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ ...txt(20.5), lineHeight: '25px', whiteSpace: 'nowrap' }}>{a.name}</span>
        {meta ? <span style={{ ...txt(16.5, LC.dim), lineHeight: '21px', whiteSpace: 'nowrap' }}>{meta}</span> : null}
      </div>
    </div>
  );
};

// The thing being dragged onto the composer: its icon and name under the cursor.
export const DropGhost: React.FC<{ a: Attachment; ui: UiState }> = ({ a, ui }) => {
  if (!ui.cursor || ui.measuring) return null;
  const folder = a.kind === 'folder' || a.name.endsWith('/');
  const name = a.name.replace(/\/$/, '');
  return (
    <div data-target="drop-ghost" style={{ position: 'absolute', left: ui.cursor.x - 34, top: ui.cursor.y - 30, zIndex: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'none', opacity: 0.94, filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.22))' }}>
      <div style={{ position: 'relative', width: 124, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ItemIcon it={{ id: 'drop', name: folder ? `${name}/` : a.name, kind: folder ? 'folder' : undefined, thumb: a.thumb }} w={118} h={92} ui={ui} />
        {a.count && a.count > 1 ? (
          <div style={{ position: 'absolute', right: -8, top: -10, minWidth: 34, height: 34, padding: '0 9px', boxSizing: 'border-box', borderRadius: 17, background: '#f0453a', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', ...txt(19, '#fff', 600) }}>{a.count}</div>
        ) : null}
      </div>
      <span style={{ ...txt(19, '#fff', 500), background: '#2f6fe0', borderRadius: 6, padding: '2px 9px', whiteSpace: 'nowrap' }}>{name}</span>
    </div>
  );
};

// ---------- connectors popover ----------

const toolName = (t: ConnectorTool) => (typeof t === 'string' ? t : t.name);

export const ConnectorsPopover: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState; x: number; bottom: number; maxRight: number; maxH: number }> = ({ data, state, ui, x, bottom, maxRight, maxH }) => {
  const st = state.connectors!;
  const list = data.connectors ?? [];
  const openName = typeof st.open === 'string' ? st.open : null;
  const open = openName ? list.find((c) => c.name === openName || slug(c.name) === slug(openName)) : undefined;
  const tools = open?.tools ?? [];
  const ROW = 58;
  const LW = 430;
  const listH = 62 + list.length * ROW + 66;
  // tool pane: rows of 44, as many columns as needed (and fit)
  const TR = 44;
  const paneH = Math.max(listH, Math.min(maxH, 74 + Math.max(1, tools.length) * TR + 14));
  const perCol = Math.max(1, Math.floor((paneH - 74 - 14) / TR));
  const maxCols = Math.max(1, Math.floor((maxRight - x - LW - 8) / 330));
  const cols = Math.min(maxCols, Math.max(1, Math.ceil(tools.length / perCol)));
  const fit = cols * perCol;
  const upto = st.upto === null || st.upto === undefined ? tools.length : Number(st.upto);
  const overflow = tools.length > fit;
  const visible = Math.min(upto, overflow ? fit - 1 : fit);
  const PW = open ? cols * 330 + 30 : 0;
  const h = open ? paneH : listH;
  // cascade: tools revealed by the last `set` of state.connectors appear one after another
  const ch = ui.changes?.connectors;
  const prev = (ch?.prev ?? null) as DesktopState['connectors'];
  const prevUpto = prev && typeof prev.open === 'string' && openName && slug(prev.open) === slug(openName) ? (prev.upto === null || prev.upto === undefined ? tools.length : Number(prev.upto)) : 0;
  const appear = (i: number): React.CSSProperties => {
    if (!ch || ui.measuring || i < prevUpto) return {};
    const p = Math.max(0, Math.min(1, (ui.frame - ch.frame - (i - prevUpto) * 1.6) / (ui.fps * 0.22)));
    if (p >= 1) return {};
    const e = 1 - Math.pow(1 - p, 3);
    return { opacity: e, transform: `translateY(${((1 - e) * 10).toFixed(1)}px)`, filter: `blur(${((1 - e) * 5).toFixed(1)}px)` };
  };
  const card: React.CSSProperties = { background: LC.menu, border: `1px solid ${LC.menuLine}`, borderRadius: 22, boxShadow: '0 12px 36px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.05)', boxSizing: 'border-box' };
  return (
    <div data-target="connectors-popover" style={{ position: 'absolute', left: x, top: bottom - h, width: LW + (open ? PW + 8 : 0), height: h, zIndex: 32 }}>
      <div data-target="connectors-list" style={{ ...card, position: 'absolute', left: 0, bottom: 0, width: LW, height: listH, padding: '10px 10px' }}>
        <div style={{ height: 46, display: 'flex', alignItems: 'center', padding: '0 14px', ...txt(20.5, LC.dim) }}>Connectors</div>
        {list.map((c) => {
          const t = `mcp-${slug(c.name)}`;
          const on = open === c || st.hover === c.name || isHover(ui, t);
          const warn = /auth|reconnect|connect$/i.test(c.status ?? '');
          return (
            <div key={c.name} data-target={t} style={{ height: ROW - 4, marginBottom: 4, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14, padding: '0 12px 0 12px', background: isPressed(ui, t) ? '#e2e2e2' : on ? '#efefef' : 'transparent' }}>
              <ConnIcon c={c} name={c.name} size={34} />
              <span style={{ ...txt(22.5), flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              {warn ? (
                <span style={txt(19.5, '#b26a00')}>{c.status}</span>
              ) : (
                <>
                  {c.tools?.length ? <span style={txt(19.5, LC.dim)}>{c.tools.length} tools</span> : null}
                  <MiniSwitch on={true} t={`mcp-switch-${slug(c.name)}`} ui={ui} w={38} h={21.4} />
                </>
              )}
              <Chev dir="right" w={12} stroke={1.8} color={LC.dim} />
            </div>
          );
        })}
        <div style={{ height: 1, background: LC.sep, margin: '6px 12px' }} />
        <div data-target="add-connector" style={{ height: 50, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14, padding: '0 14px', background: isHover(ui, 'add-connector') ? '#efefef' : 'transparent' }}>
          <Ico name="plus" size={24} color={LC.text} stroke={1.7} />
          <span style={txt(22.5)}>Add connector</span>
        </div>
      </div>
      {open ? (
        <div data-target="mcp-tools" style={{ ...card, position: 'absolute', left: LW + 8, top: 0, width: PW, height: h, padding: '12px 15px', overflow: 'hidden' }}>
          <div data-target="mcp-tools-head" style={{ height: 52, display: 'flex', alignItems: 'center', gap: 13, padding: '0 8px', borderBottom: `1px solid ${LC.sep}`, marginBottom: 8 }}>
            <ConnIcon c={open} name={open.name} size={32} />
            <span style={txt(22.5, LC.text, 600)}>{open.name}</span>
            <span style={{ ...txt(19.5, LC.dim), flex: 1 }}>{tools.length} tools</span>
            <span style={{ height: 26, padding: '0 11px', borderRadius: 13, background: '#e4f3e7', display: 'flex', alignItems: 'center', ...txt(17.5, LC.green, 600) }}>Connected</span>
          </div>
          <div style={{ display: 'grid', gridAutoFlow: 'column', gridTemplateRows: `repeat(${perCol}, ${TR}px)`, gridAutoColumns: '330px' }}>
            {tools.slice(0, visible).map((tl, i) => {
              const nm = toolName(tl);
              const t = `mcp-tool-${slug(nm)}`;
              return (
                <div key={i} data-target={t} style={{ height: TR - 4, borderRadius: 9, display: 'flex', alignItems: 'center', gap: 11, padding: '0 9px', background: isHover(ui, t) ? '#efefef' : 'transparent', ...appear(i) }}>
                  <Ico name="wrench" size={18} color="#8a8a8a" stroke={1.9} />
                  <span style={{ font: `400 18.5px ${FONT_SF_MONO}`, color: LC.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nm}</span>
                </div>
              );
            })}
            {overflow && upto >= fit ? <div style={{ height: TR - 4, display: 'flex', alignItems: 'center', padding: '0 9px', ...txt(19, LC.dim), ...appear(fit - 1) }}>+ {tools.length - (fit - 1)} more</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

// ---------- tool call ----------

export const MediaCard: React.FC<{ kind: 'image' | 'video'; src: string; title?: string; meta?: string; start?: number; w?: number; h?: number; maxH?: number; t: string; ui: UiState; colW: number; arrive?: number }> = ({ kind, src, title, meta, start, w: W0 = 1920, h: H0 = 1080, maxH = 560, t, ui, colW, arrive }) => {
  const w = Math.min(colW - 16, (maxH * W0) / H0);
  const h = (w * H0) / W0;
  const startFrames = Math.round((kind === 'video' ? start ?? 0 : 0) * ui.fps);
  return (
    <div data-target={t} style={{ width: w + 2, border: `1px solid ${LC.cardLine}`, borderRadius: 14, background: LC.white, overflow: 'hidden', marginLeft: 8 }}>
      {title ? (
        <div style={{ height: 54, display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', borderBottom: `1px solid ${LC.cardLine}` }}>
          <Ico name={kind === 'video' ? 'clapperboard' : 'image'} size={21} color="#5a5a5a" stroke={1.8} />
          <span style={{ font: `400 19px ${FONT_SF_MONO}`, color: LC.text, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
          {meta ? <span style={txt(17, LC.dim)}>{meta}</span> : null}
        </div>
      ) : null}
      <div data-target={`${t}-media`} style={{ width: w, height: h, position: 'relative', background: '#111' }}>
        {kind === 'image' ? (
          <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : ui.measuring ? null : (
          <Sequence from={arrive ?? 0} layout="none">
            <OffthreadVideo src={staticFile(src)} startFrom={startFrames} muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          </Sequence>
        )}
      </div>
    </div>
  );
};

type ToolMsg = Extract<Message, { role: 'tool' }>;

export const ToolCall: React.FC<{ m: ToolMsg; n: number; data: DesktopData; state: DesktopState; ui: UiState; colW: number; arrive?: number }> = ({ m, n, data, state, ui, colW, arrive }) => {
  const t = `msg-${n}`;
  const key = m.id ?? String(n);
  const over = state.toolStatus?.[key];
  const status: ToolStatus = over ?? m.status ?? 'done';
  const conn = (data.connectors ?? []).find((c) => c.name === m.connector);
  // when the result arrived: the `set` of toolStatus that finished this call, else when the message did
  const ch = ui.changes?.toolStatus;
  const flipped = !!ch && over === 'done' && ((ch.prev as Record<string, ToolStatus> | null | undefined)?.[key] ?? m.status) !== 'done';
  const at = flipped ? ch!.frame : arrive;
  const res: ToolResult | undefined = status === 'done' ? m.result : undefined;
  const p = at === undefined || ui.measuring ? 1 : Math.max(0, Math.min(1, (ui.frame - at) / (ui.fps * 0.32)));
  const e = 1 - Math.pow(1 - p, 3);
  const src = res?.video ?? res?.image;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
      <div data-target={t} style={{ marginLeft: 8, maxWidth: colW - 16, border: `1px solid ${LC.cardLine}`, borderRadius: 12.5, background: LC.bg, boxSizing: 'border-box', overflow: 'hidden' }}>
        <div style={{ height: 58, display: 'flex', alignItems: 'center', gap: 13, padding: '0 18px 0 14px' }}>
          <ConnIcon c={conn} name={m.connector} icon={m.icon} size={30} />
          <span style={txt(FS.row, LC.text, 600)}>{m.connector}</span>
          <span style={{ font: `400 19.5px ${FONT_SF_MONO}`, color: LC.text, background: '#f0f0f0', borderRadius: 7, padding: '3px 9px', whiteSpace: 'nowrap' }}>{m.tool}</span>
          <div style={{ flex: 1, minWidth: 26 }} />
          <span data-target={`${t}-status`} style={{ display: 'flex', alignItems: 'center', gap: 9, ...txt(FS.small, status === 'error' ? LC.red : LC.dim), whiteSpace: 'nowrap' }}>
            {status === 'running' ? <Spinner size={22} color="#555" track="#d6d6d6" ui={ui} stroke={2.4} /> : <Ico name={status === 'error' ? 'circle-x' : 'circle-check'} size={23} color={status === 'error' ? LC.red : LC.green} stroke={2} />}
            {status === 'running' ? 'Running' : status === 'error' ? 'Failed' : 'Done'}
          </span>
          <Chev dir={m.open && m.args ? 'down' : 'right'} w={12} stroke={1.8} color={LC.dim} />
        </div>
        {m.open && m.args ? <pre style={{ margin: 0, padding: '13px 18px 15px', borderTop: `1px solid ${LC.cardLine}`, background: '#f7f7f7', font: `400 18.5px/1.5 ${FONT_SF_MONO}`, color: '#3a3a3a', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.args}</pre> : null}
      </div>
      {res && src ? (
        <div style={e < 1 ? { opacity: e, filter: `blur(${((1 - e) * 12).toFixed(2)}px)` } : undefined}>
          <MediaCard kind={res.video ? 'video' : 'image'} src={src} title={res.title} meta={res.meta} start={res.start} w={res.w} h={res.h} maxH={res.maxH ?? 440} t={`${t}-result`} ui={ui} colW={colW} arrive={at} />
        </div>
      ) : res?.text ? (
        <div data-target={`${t}-result`} style={{ ...txt(FS.small, LC.dim), marginLeft: 12 }}>{res.text}</div>
      ) : null}
    </div>
  );
};
