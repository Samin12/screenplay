import React from 'react';
import { Freeze, Img, OffthreadVideo, staticFile } from 'remotion';
import type { ReplicaProps, UiState } from '../../app/replica';
import { caretOn, isHover, isPressed, usePlateSize } from '../../app/replica';
import { Caret, Ico, TrafficLights, slug } from '../_shared/kit';
import type { FinderData, FinderFolder, FinderItem, FinderKind, FinderState } from './types';

// macOS Finder, light appearance, measured from a real window on macOS 27 (1280 pt wide capture):
// grey sidebar, glass capsule toolbar groups, icon view and list view. Drawn at ~1.55x real size so
// names read on a phone; the window fills the plate and reflows into the panel (1400x990).

const FONT = 'BlinkMacSystemFont, "Inter", system-ui, sans-serif';
const C = {
  bg: '#ffffff',
  side: '#f0f0f0',
  sideLine: '#e4e4e4',
  text: '#262626',
  dim: '#7c7c7c',
  head: '#a3a3a3', // sidebar section labels
  icon: '#5f5f5f',
  capsule: '#ffffff',
  capsuleLine: '#e3e3e3',
  on: '#e4e4e4', // selected view button
  hover: 'rgba(0,0,0,0.05)',
  press: 'rgba(0,0,0,0.10)',
  selBox: '#e2e2e2', // grey plate behind a selected icon
  selBlue: '#2f6fe0', // selected name pill / list row
  info: '#5b8fd6', // item info line
  stripe: '#f4f5f5',
  rule: '#e6e6e6',
  drop: '#cfe0fb',
  fieldRing: '#6aa5f8',
  fieldSel: '#b9d7ff',
};

const VIDEO = /\.(mp4|mov|m4v|webm)$/i;
const EXT: Record<string, FinderKind> = { png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image', svg: 'image', heic: 'image', mp4: 'video', mov: 'video', m4v: 'video', webm: 'video', wav: 'audio', mp3: 'audio', m4a: 'audio', aiff: 'audio', md: 'doc', txt: 'doc', pdf: 'doc', docx: 'doc', json: 'code', ts: 'code', tsx: 'code', js: 'code', py: 'code', html: 'code', css: 'code', yaml: 'code', sh: 'code' };
export const kindOf = (it: FinderItem): FinderKind => {
  if (it.kind) return it.kind;
  if (it.name.endsWith('/')) return 'folder';
  const m = /\.([a-z0-9]+)$/i.exec(it.name);
  return m ? EXT[m[1].toLowerCase()] ?? 'doc' : 'folder';
};
const KIND_LABEL: Record<FinderKind, string> = { folder: 'Folder', image: 'Image', video: 'Movie', audio: 'Audio', doc: 'Document', code: 'Source code' };
const kindLabel = (it: FinderItem) => {
  const k = kindOf(it);
  const ext = /\.([a-z0-9]+)$/i.exec(it.name)?.[1]?.toUpperCase();
  if (k === 'folder' || !ext) return KIND_LABEL[k];
  if (k === 'image') return `${ext === 'JPG' ? 'JPEG' : ext} image`;
  if (k === 'video') return ext === 'MP4' ? 'MPEG-4 movie' : ext === 'MOV' ? 'QuickTime movie' : `${ext} movie`;
  if (k === 'audio') return `${ext} audio`;
  return ext === 'MD' ? 'Markdown' : `${ext} ${k === 'code' ? 'source' : 'document'}`;
};

// The blue macOS folder.
export const FolderIcon: React.FC<{ w: number; open?: boolean }> = ({ w, open }) => (
  <svg width={w} height={w * 0.8} viewBox="0 0 100 80" style={{ display: 'block', flexShrink: 0 }}>
    <defs>
      <linearGradient id="ff" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={open ? '#7cc4f8' : '#8ccdf7'} />
        <stop offset="1" stopColor={open ? '#3f9be8' : '#58aaec'} />
      </linearGradient>
    </defs>
    <path d="M4 14 a8 8 0 0 1 8 -8 h22 a8 8 0 0 1 6 2.6 l5 5.4 h43 a8 8 0 0 1 8 8 v8 H4 Z" fill="#4f9fe3" />
    <rect x="4" y="19" width="92" height="57" rx="8" fill="url(#ff)" />
    <rect x="4" y="19" width="92" height="2.2" rx="1" fill="rgba(255,255,255,0.55)" />
  </svg>
);

const GLYPH: Record<FinderKind, string> = { folder: 'folder', image: 'image', video: 'film', audio: 'audio-lines', doc: 'file-text', code: 'code-xml' };

// A document page (no thumbnail): white sheet, folded corner, kind glyph, extension.
const DocIcon: React.FC<{ h: number; kind: FinderKind; name: string }> = ({ h, kind, name }) => {
  const w = h * 0.76;
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toUpperCase() ?? '';
  const f = h * 0.2;
  return (
    <div style={{ width: w, height: h, position: 'relative', flexShrink: 0, filter: 'drop-shadow(0 1px 2.5px rgba(0,0,0,0.22))' }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }}>
        <path d={`M${h * 0.06} 0 H${w - f} L${w} ${f} V${h - h * 0.06} a${h * 0.06} ${h * 0.06} 0 0 1 -${h * 0.06} ${h * 0.06} H${h * 0.06} a${h * 0.06} ${h * 0.06} 0 0 1 -${h * 0.06} -${h * 0.06} V${h * 0.06} a${h * 0.06} ${h * 0.06} 0 0 1 ${h * 0.06} -${h * 0.06} Z`} fill="#ffffff" stroke="#dcdcdc" strokeWidth={1} />
        <path d={`M${w - f} 0 V${f * 0.7} a${f * 0.3} ${f * 0.3} 0 0 0 ${f * 0.3} ${f * 0.3} H${w} Z`} fill="#ececec" stroke="#dcdcdc" strokeWidth={1} />
      </svg>
      {h >= 44 ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: h * 0.05, paddingTop: h * 0.08 }}>
          <Ico name={GLYPH[kind]} size={h * 0.34} color={kind === 'audio' ? '#e0567a' : kind === 'video' ? '#7a5fd0' : kind === 'image' ? '#3d9a6a' : kind === 'code' ? '#d0812c' : '#8a8a8a'} stroke={1.7} />
          {ext ? <span style={{ font: `600 ${Math.max(10, h * 0.13)}px ${FONT}`, color: '#9a9a9a', letterSpacing: '0.04em' }}>{ext}</span> : null}
        </div>
      ) : null}
    </div>
  );
};

// The icon of one item, fitted into a w x h box: folder, real thumbnail, or a document page.
export const ItemIcon: React.FC<{ it: FinderItem; w: number; h: number; ui: UiState; open?: boolean }> = ({ it, w, h, ui, open }) => {
  const kind = kindOf(it);
  if (kind === 'folder') return <FolderIcon w={Math.min(w, h * 1.25) * 0.94} open={open} />;
  if (it.thumb) {
    const frame: React.CSSProperties = { display: 'block', borderRadius: Math.max(2, h * 0.035), boxShadow: '0 0 0 1px rgba(0,0,0,0.13), 0 1.5px 5px rgba(0,0,0,0.20)' };
    if (VIDEO.test(it.thumb)) {
      const vw = Math.min(w, (h * 16) / 9);
      const vh = (vw * 9) / 16;
      return (
        <div style={{ ...frame, width: vw, height: vh, background: '#1a1a1a', overflow: 'hidden', position: 'relative' }}>
          {ui.measuring ? null : (
            <Freeze frame={Math.round((it.thumbAt ?? 0.5) * ui.fps)}>
              <OffthreadVideo src={staticFile(it.thumb)} muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            </Freeze>
          )}
        </div>
      );
    }
    return <Img src={staticFile(it.thumb)} style={{ ...frame, maxWidth: w, maxHeight: h, minHeight: Math.min(h, 24) }} />;
  }
  return <DocIcon h={h * 0.96} kind={kind} name={it.name} />;
};

const pathParts = (p: string | string[] | null | undefined) => (Array.isArray(p) ? p : String(p ?? '').split('/').filter(Boolean));

export const Finder: React.FC<ReplicaProps<FinderData, FinderState>> = ({ data, state, ui }) => {
  const [W, H] = usePlateSize();
  const wide = W >= 1700;
  const side = data.sidebar === false ? [] : data.sidebar ?? [];
  const sideW = side.length ? (wide ? 372 : 286) : 0;
  const TB = 82; // toolbar height
  const view = state.view ?? data.view ?? 'icon';

  // ---- which folder is on screen ----
  const top: FinderFolder = { title: data.title, path: data.path ?? undefined, items: data.items ?? [] };
  const newId = typeof state.newFolder === 'object' && state.newFolder?.id ? state.newFolder.id : 'new';
  const nameOf = (it: FinderItem) => state.names?.[it.id] ?? it.name;
  const typedNew = typeof state.rename === 'string' && state.rename.length && (state.renaming === undefined || state.renaming === null || state.renaming === newId) ? state.rename : null;
  const newName = typedNew ?? (typeof state.newFolder === 'object' && state.newFolder?.name ? state.newFolder.name : 'untitled folder');
  const newItem: FinderItem | null = state.newFolder ? { id: newId, name: newName, kind: 'folder' } : null;
  let folder = top;
  if (state.path) {
    const f = data.folders?.[state.path];
    const viaItem = [...top.items, ...(newItem ? [newItem] : [])].find((it) => it.id === state.path);
    if (f) folder = { title: f.title ?? (viaItem ? nameOf(viaItem) : state.path), path: f.path ?? (data.path ? [...pathParts(data.path), f.title ?? (viaItem ? nameOf(viaItem) : state.path)] : undefined), items: f.items ?? [] };
    else if (viaItem) folder = { title: nameOf(viaItem), path: data.path ? [...pathParts(data.path), nameOf(viaItem)] : undefined, items: viaItem.items ?? [] };
  }
  const atTop = folder === top;
  let items: FinderItem[] = state.items ?? folder.items;
  if (atTop && newItem && !items.some((it) => it.id === newId)) items = [...items, newItem];
  const all = items;
  if (state.upto !== null && state.upto !== undefined) items = items.slice(0, Number(state.upto));
  if (Array.isArray(state.shown)) items = items.filter((it) => state.shown!.includes(it.id) || (atTop && newItem && it.id === newId));

  // ids that just appeared (a `set` of shown / upto / items): they pop in
  const born: Record<string, number> = {};
  const ch = ui.changes ?? {};
  if (ch.shown && Array.isArray(state.shown)) {
    const prev = Array.isArray(ch.shown.prev) ? (ch.shown.prev as string[]) : ch.shown.prev === null || ch.shown.prev === undefined ? all.map((i) => i.id) : [];
    for (const id of state.shown) if (!prev.includes(id)) born[id] = ch.shown.frame;
  }
  if (ch.upto && typeof state.upto === 'number') {
    const prev = typeof ch.upto.prev === 'number' ? ch.upto.prev : all.length;
    all.slice(prev, state.upto).forEach((it) => (born[it.id] = ch.upto!.frame));
  }
  if (ch.items && Array.isArray(state.items)) {
    const prev = Array.isArray(ch.items.prev) ? (ch.items.prev as FinderItem[]).map((i) => i.id) : folder.items.map((i) => i.id);
    for (const it of state.items) if (!prev.includes(it.id)) born[it.id] = ch.items.frame;
  }
  if (ch.newFolder && state.newFolder && !ch.newFolder.prev) born[newId] = ch.newFolder.frame;
  const pop = (id: string): React.CSSProperties => {
    const f0 = born[id];
    if (f0 === undefined || ui.measuring) return {};
    const p = Math.max(0, Math.min(1, (ui.frame - f0) / (ui.fps * 0.26)));
    if (p >= 1) return {};
    const e = 1 - Math.pow(1 - p, 3);
    return { opacity: e, transform: `scale(${(0.72 + 0.28 * e).toFixed(3)})`, filter: `blur(${((1 - e) * 6).toFixed(1)}px)` };
  };

  const selected = state.selected ? (Array.isArray(state.selected) ? state.selected : [state.selected]) : [];
  const dragIds = state.drag?.ids ?? [];
  const moved = state.moved ?? []; // moved out: the slot stays empty (icon view keeps positions), the row disappears (list view)
  const editing = state.renaming !== undefined ? state.renaming : state.newFolder && atTop ? newId : null;
  const isSel = (id: string) => selected.includes(id) || (id === newId && !!newItem && editing === newId);
  const isDrop = (it: FinderItem) => {
    if (state.dropTarget === it.id) return true;
    return !!state.drag && kindOf(it) === 'folder' && !dragIds.includes(it.id) && (isHover(ui, `item-${it.id}`) || isPressed(ui, `item-${it.id}`));
  };
  const sideDrop = (t: string) => state.dropTarget === t || (!!state.drag && isHover(ui, t));

  // Name: plain text, or the open name field (all text selected until something is typed).
  const NameField: React.FC<{ it: FinderItem; size: number; align: 'center' | 'left' }> = ({ it, size, align }) => {
    const typed = typeof state.rename === 'string' && state.rename.length > 0;
    const base = it.id === newId && newItem ? (typeof state.newFolder === 'object' && state.newFolder?.name ? state.newFolder.name : 'untitled folder') : nameOf(it);
    return (
      <span data-target={`item-${it.id}-name`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: align === 'center' ? 'center' : 'flex-start', minWidth: 60, height: size * 1.5, padding: '0 6px', borderRadius: 5, background: '#fff', boxShadow: `0 0 0 3px ${C.fieldRing}`, font: `400 ${size}px ${FONT}`, color: C.text, whiteSpace: 'nowrap' }}>
        {typed ? state.rename : <span style={{ background: C.fieldSel, borderRadius: 2, padding: '1px 0' }}>{base}</span>}
        {ui.caret === 'rename' ? <Caret on={caretOn(ui, 'rename')} h={size * 1.1} color="#141414" /> : null}
      </span>
    );
  };

  // ---- toolbar ----
  const capsule: React.CSSProperties = { height: 54, borderRadius: 27, background: C.capsule, border: `1px solid ${C.capsuleLine}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', boxSizing: 'border-box', flexShrink: 0 };
  const tbtn = (t: string, icon: string, o: { on?: boolean; size?: number; w?: number } = {}) => (
    <div key={t} data-target={t} style={{ width: o.w ?? 50, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isPressed(ui, t) ? C.press : o.on ? C.on : isHover(ui, t) ? C.hover : 'transparent' }}>
      <Ico name={icon} size={o.size ?? 25} color={C.icon} stroke={1.7} />
    </div>
  );
  const hasPath = pathParts(folder.path).length > 0;
  const PB = hasPath ? 46 : 0;
  const contentW = W - sideW;
  const contentH = H - TB - PB;

  // ---- icon grid geometry ----
  const pad = 26;
  const cols = Math.max(2, data.columns ?? Math.floor((contentW - pad * 2) / 205));
  const cellW = (contentW - pad * 2) / cols;
  const iconW = Math.min(cellW - 44, 210);
  const iconH = iconW * 0.74;
  const nameSize = 20.5;

  const iconCell = (it: FinderItem) => {
    const t = `item-${it.id}`;
    const sel = isSel(it.id);
    const drop = isDrop(it);
    const dragging = dragIds.includes(it.id);
    return (
      <div key={it.id} style={{ width: cellW, display: 'flex', justifyContent: 'center', paddingBottom: 26, ...pop(it.id), ...(moved.includes(it.id) ? { visibility: 'hidden' as const } : {}) }}>
        <div data-target={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: dragging ? 0.42 : 1 }}>
          <div data-target={`${t}-icon`} style={{ width: iconW + 20, height: iconH + 20, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: drop ? C.drop : sel || isPressed(ui, t) ? C.selBox : isHover(ui, t) && !state.drag ? 'rgba(0,0,0,0.035)' : 'transparent' }}>
            <ItemIcon it={it} w={iconW} h={iconH} ui={ui} open={drop} />
          </div>
          <div style={{ marginTop: 7, maxWidth: cellW - 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {editing === it.id ? (
              <NameField it={it} size={nameSize} align="center" />
            ) : (
              <span style={{ font: `400 ${nameSize}px/1.28 ${FONT}`, color: sel || drop ? '#fff' : C.text, background: sel || drop ? C.selBlue : 'transparent', borderRadius: 6, padding: '2px 8px', textAlign: 'center', maxWidth: cellW - 26, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }}>{nameOf(it)}</span>
            )}
            {it.meta ? <span style={{ font: `400 16.5px/1.3 ${FONT}`, color: C.info, marginTop: 2, whiteSpace: 'nowrap' }}>{it.meta}</span> : null}
          </div>
        </div>
      </div>
    );
  };

  // ---- list view ----
  const RH = 46;
  const showDate = contentW >= 1000;
  const listCols = `minmax(0, 1fr) ${showDate ? '270px ' : ''}150px 210px`;
  const listRow = (it: FinderItem, i: number) => {
    const t = `item-${it.id}`;
    const sel = isSel(it.id);
    const drop = isDrop(it);
    const fg = sel ? '#fff' : C.text;
    const fg2 = sel ? 'rgba(255,255,255,0.85)' : C.dim;
    const cell: React.CSSProperties = { font: `400 20px ${FONT}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
    return (
      <div key={it.id} data-target={t} style={{ height: RH, margin: '0 14px', borderRadius: 9, display: 'grid', gridTemplateColumns: listCols, alignItems: 'center', padding: '0 14px 0 12px', background: sel ? C.selBlue : drop ? C.drop : i % 2 ? C.stripe : 'transparent', boxShadow: drop ? `inset 0 0 0 2.5px ${C.selBlue}` : undefined, opacity: dragIds.includes(it.id) ? 0.45 : 1, ...pop(it.id) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{ width: 16, display: 'flex', justifyContent: 'center' }}>{kindOf(it) === 'folder' ? <Ico name="chevron-right" size={18} color={sel ? '#fff' : '#8a8a8a'} stroke={2.2} /> : null}</span>
          <div data-target={`${t}-icon`} style={{ width: 40, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ItemIcon it={it} w={40} h={30} ui={ui} />
          </div>
          {editing === it.id ? <NameField it={it} size={20} align="left" /> : <span style={{ ...cell, color: fg }}>{nameOf(it)}</span>}
        </div>
        {showDate ? <span style={{ ...cell, color: fg2 }}>{it.date ?? data.date ?? 'Today'}</span> : null}
        <span style={{ ...cell, color: fg2, textAlign: 'right', paddingRight: 22 }}>{it.meta ?? '--'}</span>
        <span style={{ ...cell, color: fg2 }}>{kindLabel(it)}</span>
      </div>
    );
  };

  // ---- drag ghost: a stack of the dragged items under the cursor ----
  let ghost: React.ReactNode = null;
  if (state.drag && ui.cursor && !ui.measuring) {
    const its = dragIds.map((id) => all.find((x) => x.id === id) ?? top.items.find((x) => x.id === id)).filter(Boolean) as FinderItem[];
    const count = state.drag.count ?? dragIds.length;
    const stack = its.slice(0, 4);
    const gw = 118;
    const gh = 86;
    ghost = (
      <div data-target="drag-ghost" style={{ position: 'absolute', left: ui.cursor.x - 26, top: ui.cursor.y - 20, width: gw + 44, height: gh + 40, zIndex: 60, pointerEvents: 'none' }}>
        {stack
          .map((it, i) => (
            <div key={it.id} style={{ position: 'absolute', left: i * 11, top: i * 9, width: gw, height: gh, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(${[-3, 2.5, -1.5, 3.5][i]}deg)`, opacity: 0.92 - i * 0.06, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.22))' }}>
              <ItemIcon it={it} w={gw} h={gh} ui={ui} />
            </div>
          ))
          .reverse()}
        {count > 1 ? (
          <div style={{ position: 'absolute', left: gw - 6 + (stack.length - 1) * 4, top: -12, minWidth: 34, height: 34, padding: '0 9px', boxSizing: 'border-box', borderRadius: 17, background: '#f0453a', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `600 19px ${FONT}`, color: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}>{count}</div>
        ) : null}
      </div>
    );
  }

  const parts = pathParts(folder.path);
  const showSearch = data.search !== false;
  return (
    <div data-target="window" style={{ width: W, height: H, position: 'relative', overflow: 'hidden', background: C.bg, fontFamily: FONT, color: C.text }}>
      {/* sidebar */}
      {sideW ? (
        <div data-target="sidebar" style={{ position: 'absolute', left: 0, top: 0, width: sideW, height: H, background: C.side, borderRight: `1px solid ${C.sideLine}`, boxSizing: 'border-box' }}>
          <div style={{ position: 'absolute', left: 30, top: 31 }}>
            <TrafficLights size={20} gap={13} />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 96 }}>
            {side.map((sec, si) => (
              <div key={si} style={{ marginBottom: 22 }}>
                <div style={{ font: `600 17.5px ${FONT}`, color: C.head, padding: '0 0 8px 30px' }}>{sec.section}</div>
                {sec.items.map((s) => {
                  const t = `side-${slug(s.name)}`;
                  const drop = sideDrop(t);
                  return (
                    <div key={s.name} data-target={t} style={{ height: 48, margin: '0 14px', borderRadius: 11, display: 'flex', alignItems: 'center', gap: 14, padding: '0 14px', background: drop ? C.drop : s.active ? '#dedede' : isHover(ui, t) ? C.hover : 'transparent', boxShadow: drop ? `inset 0 0 0 2.5px ${C.selBlue}` : undefined }}>
                      <Ico name={s.icon ?? 'folder'} size={26} color={s.active ? C.selBlue : '#6a6a6a'} stroke={1.7} />
                      <span style={{ font: `400 21.5px ${FONT}`, color: '#3a3a3a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* toolbar */}
      <div data-target="toolbar" style={{ position: 'absolute', left: sideW, top: 0, width: contentW, height: TB, display: 'flex', alignItems: 'center', gap: 14, padding: `0 16px 0 ${sideW ? 14 : 110}px`, boxSizing: 'border-box', borderBottom: `1px solid ${C.rule}` }}>
        {sideW ? null : (
          <div style={{ position: 'absolute', left: 30, top: 31 }}>
            <TrafficLights size={20} gap={13} />
          </div>
        )}
        <div style={{ ...capsule, padding: '0 5px' }}>
          {tbtn('back', 'chevron-left', { size: 30 })}
          <div style={{ width: 1, height: 26, background: '#e0e0e0' }} />
          {tbtn('forward', 'chevron-right', { size: 30 })}
        </div>
        <span data-target="title" style={{ font: `700 24px ${FONT}`, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: 6, minWidth: 0 }}>{folder.title}</span>
        {data.stamp ? (
          <div data-target="stamp" style={{ height: 34, padding: '0 15px', borderRadius: 17, background: '#fff1d6', border: '1px solid #f0d49a', display: 'flex', alignItems: 'center', gap: 8, font: `600 18px ${FONT}`, color: '#8a5a00', flexShrink: 0 }}>
            <Ico name="rotate-ccw" size={18} color="#8a5a00" stroke={2} />
            {data.stamp}
          </div>
        ) : null}
        <div style={{ flex: 1 }} />
        <div data-target="view-switch" style={{ ...capsule, padding: '0 5px', gap: 2 }}>
          {tbtn('view-icon', 'layout-grid', { on: view === 'icon' })}
          {tbtn('view-list', 'list', { on: view === 'list' })}
          {wide ? tbtn('view-columns', 'columns-3') : null}
          {wide ? tbtn('view-gallery', 'gallery-thumbnails') : null}
        </div>
        <div style={{ ...capsule, padding: '0 5px', gap: 2 }}>
          {tbtn('new-folder', 'folder-plus')}
          {tbtn('share', 'share')}
          {wide ? tbtn('tags', 'tag') : null}
          {tbtn('more', 'ellipsis')}
        </div>
        {showSearch ? (
          <div data-target="search" style={{ ...capsule, width: wide ? 330 : 190, padding: '0 18px', gap: 10 }}>
            <Ico name="search" size={23} color="#4a4a4a" stroke={2} />
            <span style={{ font: `500 21px ${FONT}`, color: '#6f6f6f' }}>Search</span>
          </div>
        ) : null}
      </div>

      {/* content */}
      <div data-target="content" style={{ position: 'absolute', left: sideW, top: TB + 1, width: contentW, height: contentH - 1, overflow: 'hidden' }}>
        <div style={{ transform: state.scroll ? `translateY(${-Number(state.scroll)}px)` : undefined }}>
          {view === 'icon' ? (
            <div data-target="items" style={{ display: 'flex', flexWrap: 'wrap', padding: `22px ${pad}px 0`, boxSizing: 'border-box', width: contentW }}>{items.map(iconCell)}</div>
          ) : (
            <>
              <div data-target="list-header" style={{ height: 44, margin: '0 14px', display: 'grid', gridTemplateColumns: listCols, alignItems: 'center', padding: '0 14px 0 12px', borderBottom: `1px solid ${C.rule}`, font: `600 17.5px ${FONT}`, color: '#555' }}>
                <span style={{ paddingLeft: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 14 }}>
                  Name <Ico name="chevron-up" size={17} color="#777" stroke={2} />
                </span>
                {showDate ? <span>Date Modified</span> : null}
                <span>Size</span>
                <span>Kind</span>
              </div>
              <div data-target="items" style={{ paddingTop: 8 }}>
                {items.filter((it) => !moved.includes(it.id)).map(listRow)}
                {Array.from({ length: Math.max(0, Math.ceil((contentH - 60) / RH) - items.filter((it) => !moved.includes(it.id)).length) }).map((_, i) => (
                  <div key={`e${i}`} style={{ height: RH, margin: '0 14px', borderRadius: 9, background: (items.filter((it) => !moved.includes(it.id)).length + i) % 2 ? C.stripe : 'transparent' }} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* path bar */}
      {hasPath ? (
        <div data-target="path" style={{ position: 'absolute', left: sideW, bottom: 0, width: contentW, height: PB, borderTop: `1px solid ${C.rule}`, background: '#fbfbfb', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 9, padding: '0 22px', overflow: 'hidden' }}>
          {parts.map((p, i) => (
            <React.Fragment key={i}>
              {i ? <Ico name="chevron-right" size={15} color="#a0a0a0" stroke={2.2} /> : null}
              {i === 0 ? <Ico name="hard-drive" size={19} color="#7a7a7a" stroke={1.8} /> : <FolderIcon w={22} />}
              <span style={{ font: `400 17.5px ${FONT}`, color: i === parts.length - 1 ? '#333' : '#6f6f6f', whiteSpace: 'nowrap' }}>{p}</span>
            </React.Fragment>
          ))}
        </div>
      ) : null}
      {ghost}
    </div>
  );
};
