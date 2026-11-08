import React from 'react';
import type { UiState } from '../../../app/replica';
import { caretOn, isHover, isPressed } from '../../../app/replica';
import { Caret, ClaudeStar, Ico, Inline, fill, slug } from '../../_shared/kit';
import type { DesktopData, DesktopState, Message, UsageLimit } from '../types';
import { FONT_SF, FONT_SF_MONO, FS, LC, LL } from './tokens';
import { CheckIcon, Chev, MicIcon, PieIcon, Tri } from './icons';
import { MiniSwitch } from './Chrome';
import { PixelCrab } from '../Rail';

// Light chat column: messages (his /context, /usage, notice and bubble styles), composer with the
// slash popover and the model menu, and the model line under it.

const txt = (size: number, color: string = LC.text, weight = 400): React.CSSProperties => ({ font: `${weight} ${size}px ${FONT_SF}`, color });
const code: React.CSSProperties = { font: `400 0.86em ${FONT_SF_MONO}`, background: '#f0f0f0', borderRadius: 6, padding: '1px 6px', margin: '0 2px', color: LC.text };

// Slash command colouring: "/" light blue, the command blue, the rest plain.
const SlashText: React.FC<{ text: string; commands: DesktopData['commands']; size: number }> = ({ text, commands, size }) => {
  const m = /^\/([^\s]+)(.*)$/s.exec(text);
  if (!m || !commands.some((c) => c.name === m[1])) return <>{text}</>;
  return (
    <>
      <span style={{ color: LC.cmdSlash, marginRight: size * 0.12 }}>/</span>
      <span style={{ color: LC.cmd }}>{m[1]}</span>
      <span>{m[2]}</span>
    </>
  );
};

const defaultUsage = (data: DesktopData) => ({
  title: 'Usage',
  limits: [
    { label: 'Weekly · all models', reset: 'Resets Sun 1:00 PM', pct: 7 },
    { label: `Weekly · Fable`, reset: 'Resets Sun 1:00 PM', pct: 0 },
  ] as UsageLimit[],
  session: { cells: ['Cost $0.41', 'Active 1s', `${data.model.split(' ')[0]} 100%`], extra: 'Cache hit 0%' },
  breakdown: { model: data.model, rows: [['Input', '2'], ['Output', '3'], ['Cache read', '0'], ['Cache write', data.context.used]] as [string, string][] },
  whats: { range: '24h', scope: 'All', note: 'Last 24h · approximate, overlapping measures · this machine only, excludes claude.ai', always: ['90%', 'always on context'] as [string, string], rows: [{ label: 'ccd_turn MCP', pct: 14 }] },
});

const Bar: React.FC<{ pct: number; w?: number | string; h?: number; t?: string }> = ({ pct, w = '100%', h = 12.4, t }) => (
  <div data-target={t} style={{ width: w, height: h, borderRadius: h, boxSizing: 'border-box', background: pct > 0 ? LC.barTrackBlue : LC.barTrack, border: `1px solid ${pct > 0 ? '#d9e2ee' : '#e5e5e5'}`, position: 'relative', overflow: 'hidden' }}>
    {pct > 0 ? <div style={{ position: 'absolute', left: -1, top: -1, bottom: -1, width: `max(${h * 2.5}px, ${pct}%)`, borderRadius: h, background: LC.barBlue }} /> : null}
  </div>
);

const UsageCard: React.FC<{ m: Extract<Message, { kind: 'usage' }>; data: DesktopData; t: string }> = ({ m, data, t }) => {
  const d = defaultUsage(data);
  const limits = m.limits ?? d.limits;
  const session = m.session ?? d.session;
  const br = m.breakdown ?? d.breakdown;
  const wh = m.whats ?? d.whats;
  const U = 22; // his /usage card text (13 css px at his zoom)
  const lab = txt(U, LC.dim);
  const rule = <div style={{ height: 1, background: LC.rule }} />;
  return (
    <div data-target={t} style={{ width: 587.8, border: `1px solid ${LC.cardLine}`, borderRadius: 14, background: LC.bg, padding: '0 26.8px 0 27.3px', boxSizing: 'border-box' }}>
      <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={txt(20.6)}>{m.title ?? d.title}</span>
        <Ico name="copy" size={23} color={LC.text} stroke={1.9} style={{ marginRight: 12 }} />
      </div>
      {limits.map((l, i) => (
        <div key={i} data-target={`usage-limit-${i + 1}`} style={{ height: 72, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <div style={{ height: 44, display: 'flex', alignItems: 'center' }}>
            <span style={{ ...lab, flex: 1 }}>{l.label}</span>
            <span style={lab}>{l.reset}</span>
            <span style={{ ...txt(U), marginLeft: 15 }}>{l.pct}%</span>
          </div>
          <div style={{ marginTop: -4 }}>
            <Bar pct={l.pct} />
          </div>
        </div>
      ))}
      <div data-target="usage-session" style={{ marginTop: 19 }}>
        <div style={{ ...txt(U), height: 36, display: 'flex', alignItems: 'center' }}>This session</div>
        <div style={{ display: 'grid', gridTemplateColumns: '184px 183px 1fr', height: 36, alignItems: 'center' }}>
          {session.cells.map((c, i) => (
            <span key={i} style={lab}>
              {c}
            </span>
          ))}
        </div>
        {rule}
        {session.extra ? (
          <>
            <div style={{ ...lab, height: 36, display: 'flex', alignItems: 'center' }}>{session.extra}</div>
            {rule}
          </>
        ) : null}
      </div>
      <div data-target="usage-breakdown" style={{ marginTop: 32 }}>
        <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
          <span style={{ ...txt(U), flex: 1 }}>Breakdown</span>
          <span style={lab}>{br.model}</span>
        </div>
        {rule}
        {br.rows.map(([k, v], i) => (
          <React.Fragment key={i}>
            <div style={{ height: 36.6, display: 'flex', alignItems: 'center' }}>
              <span style={{ ...lab, flex: 1 }}>{k}</span>
              <span style={lab}>{v}</span>
            </div>
            {rule}
          </React.Fragment>
        ))}
      </div>
      <div data-target="usage-whats" style={{ marginTop: 44, paddingBottom: 14 }}>
        <div style={{ height: 46, display: 'flex', alignItems: 'center' }}>
          <span style={{ ...txt(U), flex: 1 }}>What’s using your usage limits?</span>
          <span style={{ ...txt(U), display: 'flex', alignItems: 'center', gap: 10 }}>
            {wh.range} <Chev w={10} stroke={1.5} color={LC.dim} />
          </span>
          <span style={{ ...txt(U), display: 'flex', alignItems: 'center', gap: 10, marginLeft: 40, marginRight: 10 }}>
            {wh.scope} <Chev w={10} stroke={1.5} color={LC.dim} />
          </span>
        </div>
        <div style={{ ...lab, lineHeight: '27.3px', marginTop: 6, paddingRight: 8 }}>{wh.note}</div>
        {wh.always ? (
          <div style={{ height: 57, display: 'flex', alignItems: 'center', marginTop: 10 }}>
            <span style={{ ...txt(U), width: 64 }}>{wh.always[0]}</span>
            <span style={lab}>{wh.always[1]}</span>
          </div>
        ) : null}
        {wh.rows.map((r, i) => (
          <div key={i} data-target={`usage-what-${i + 1}`} style={{ height: 54, display: 'flex', alignItems: 'center' }}>
            <span style={{ ...lab, flex: 1 }}>{r.label}</span>
            <div style={{ width: 130, height: 7, borderRadius: 4, background: LC.barTrackBlue, border: '1px solid #dae3ee', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: -1, top: -1, bottom: -1, width: `max(18px, ${r.pct}%)`, borderRadius: 4, background: LC.barBlue }} />
            </div>
            <span style={{ ...lab, width: 84, textAlign: 'right' }}>{r.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ContextCard: React.FC<{ m: Extract<Message, { kind: 'context' }>; data: DesktopData; t: string; colW: number }> = ({ m, data, t, colW }) => {
  const rows = data.context.rows.filter((r) => !/free/i.test(r.label));
  const barW = colW - 41;
  const used = m.used ?? data.context.used;
  const total = m.total ?? data.context.total;
  const pct = m.pct ?? data.context.pct;
  return (
    <div>
      <div data-target={t} style={{ width: colW, height: 100.5, border: `1px solid ${LC.cardLine}`, borderRadius: 12.5, background: LC.bg, boxSizing: 'border-box', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 22, top: 37 - 11.5 }}>
          <PieIcon size={23} color="#5a5a5a" stroke={1.9} />
        </div>
        <span style={{ ...txt(22.8), position: 'absolute', left: 60.8, top: 37 - 14, lineHeight: '28px' }}>Context window</span>
        <span style={{ ...txt(22.8, LC.dim), position: 'absolute', right: 56.7, top: 37 - 14, lineHeight: '28px' }}>
          {used} / {total} ({pct}%)
        </span>
        <div style={{ position: 'absolute', right: 26.5, top: 37 - 7 }}>
          <Chev dir="right" w={14} stroke={1.9} color="#3a3a3a" />
        </div>
        <div data-target="context-window-bar" style={{ position: 'absolute', left: 20.5, top: 66.5, width: barW, height: 12.9, borderRadius: 7, background: LC.legend.free, display: 'flex', gap: 2 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ width: Math.max(7, ((parseFloat(r.pct) || 0) / 100) * barW * 1.3), height: '100%', borderRadius: i === 0 ? '7px 3px 3px 7px' : 3, background: r.color ?? '#9a9a9a' }} />
          ))}
        </div>
      </div>
      {m.when !== '' ? (
        <div style={{ display: 'flex', alignItems: 'center', height: 40, marginTop: 9, paddingLeft: 4, gap: 26 }}>
          <Ico name="pin" size={24} color="#5a5a5a" stroke={1.7} style={{ transform: 'rotate(40deg)' }} />
          <span style={txt(FS.small, LC.dim)}>{m.when ?? 'Just now'}</span>
        </div>
      ) : null}
    </div>
  );
};

const LimitCard: React.FC<{ m: Extract<Message, { kind: 'limit' }>; state: DesktopState; ui: UiState; t: string }> = ({ m, state, ui, t }) => {
  const key = 'auto-continue-when-limits-reset';
  const on = state.toggles?.[key] ?? m.on ?? true;
  return (
    <div data-target={t} style={{ border: `1px solid ${LC.cardLine}`, borderRadius: 12.5, background: LC.bg, padding: '20px 24px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Ico name="circle-alert" size={24} color="#b26a00" stroke={1.9} style={{ marginTop: 3 }} />
        <div style={{ flex: 1 }}>
          <div style={{ ...txt(FS.chat), lineHeight: 1.42 }}>{m.text}</div>
          {m.sub ? <div style={{ ...txt(FS.small, LC.dim), marginTop: 4 }}>{on ? m.sub : 'Claude will wait for you to continue'}</div> : null}
        </div>
      </div>
      <div data-target={`setting-${key}`} style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 38 }}>
        <MiniSwitch on={on} t={`toggle-${key}`} ui={ui} w={38} h={21.4} />
        <span style={txt(FS.small)}>Auto-continue when limits reset</span>
      </div>
    </div>
  );
};

const MessageView: React.FC<{ m: Message; n: number; data: DesktopData; state: DesktopState; ui: UiState; colW: number }> = ({ m, n, data, state, ui, colW }) => {
  const t = `msg-${n}`;
  if ('role' in m && m.role === 'user')
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 1.5 }}>
        <div data-target={t} style={{ maxWidth: '78%', background: LC.bubble, borderRadius: 16, padding: '18.5px 25.5px 18.5px 28px', ...txt(FS.chat), lineHeight: 1.42, wordBreak: 'break-word' }}>
          <SlashText text={m.text} commands={data.commands} size={FS.chat} />
        </div>
      </div>
    );
  if ('role' in m)
    return (
      <div data-target={t} style={{ ...txt(FS.chat), lineHeight: 1.42, paddingLeft: 8.2, paddingRight: 8 }}>
        <Inline text={m.text} code={code} bold={{ fontWeight: 600, color: LC.text }} dim={{ color: LC.dim }} />
      </div>
    );
  switch (m.kind) {
    case 'meta':
      return (
        <div data-target={t} style={{ ...txt(FS.meta, LC.dim), paddingLeft: 1.5, whiteSpace: 'nowrap' }}>
          {m.text}
          {m.link ? (
            <>
              {' · '}
              <span data-target="save-as-environment" style={{ textDecoration: 'underline', textUnderlineOffset: 6, textDecorationThickness: 1.3 }}>
                {m.link}
              </span>
            </>
          ) : null}
        </div>
      );
    case 'notice':
      return (
        <div data-target={t} style={{ display: 'flex', alignItems: 'center', gap: 17, paddingLeft: 8.2, ...txt(22.9, LC.dim) }}>
          {m.text}
          <Tri dir="right" w={7.7} h={10.3} color="#4a4a4a" />
        </div>
      );
    case 'context':
      return <ContextCard m={m} data={data} t={t} colW={colW} />;
    case 'usage':
      return <UsageCard m={m} data={data} t={t} />;
    case 'limit':
      return <LimitCard m={m} state={state} ui={ui} t={t} />;
    case 'code':
      return (
        <div data-target={t} style={{ border: `1px solid ${LC.cardLine}`, borderRadius: 12.5, background: '#f7f7f7', overflow: 'hidden' }}>
          {m.title ? <div style={{ ...txt(FS.small, LC.dim), padding: '12px 22px', borderBottom: `1px solid ${LC.cardLine}`, background: LC.bg, font: `400 19px ${FONT_SF_MONO}` }}>{m.title}</div> : null}
          <pre style={{ margin: 0, padding: '16px 22px 18px', font: `400 19.5px/1.5 ${FONT_SF_MONO}`, color: LC.text, whiteSpace: 'pre-wrap' }}>{m.text}</pre>
        </div>
      );
    case 'thinking':
      return (
        <div data-target={t} style={{ display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 8.2, ...txt(22.9, LC.dim) }}>
          <ClaudeStar size={26} spin={(ui.frame * 6) % 360} />
          {m.text ?? 'Thinking…'}
        </div>
      );
    case 'activity':
      return (
        <div data-target={t} style={{ paddingLeft: 8.2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, ...txt(22.9, LC.dim) }}>
            {m.text}
            <Tri dir={m.open ? 'down' : 'right'} w={7.7} h={10.3} color="#4a4a4a" />
          </div>
          {m.open && m.items ? (
            <div style={{ marginTop: 10, paddingLeft: 18, borderLeft: '1.5px solid #e2e2e2' }}>
              {m.items.map((it, i) => (
                <div key={i} style={{ font: `400 19px/34px ${FONT_SF_MONO}`, color: LC.dim }}>
                  {it}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );
    case 'steps':
      return (
        <div data-target={t} style={{ border: `1px solid ${LC.cardLine}`, borderRadius: 12.5, padding: '14px 24px' }}>
          {m.items.map((s, i) => (
            <div key={i} data-target={`step-${i + 1}`} style={{ display: 'flex', alignItems: 'center', gap: 14, height: 46 }}>
              <Ico name={s.status === 'done' ? 'circle-check' : s.status === 'active' ? 'circle-ellipsis' : s.status === 'failed' ? 'circle-x' : 'circle-dashed'} size={24} color={s.status === 'done' ? '#8a8a8a' : s.status === 'failed' ? LC.red : LC.text} stroke={1.8} />
              <span style={txt(FS.row, s.status === 'done' ? LC.dim : LC.text)}>{s.text}</span>
            </div>
          ))}
        </div>
      );
    case 'sessions':
      return (
        <div data-target={t} style={{ paddingLeft: 8.2 }}>
          <div style={{ ...txt(22.9, LC.dim), display: 'flex', alignItems: 'center', gap: 14 }}>
            {m.text}
            <Tri dir={m.open ? 'down' : 'right'} w={7.7} h={10.3} color="#4a4a4a" />
          </div>
          {m.open
            ? m.items.map((it, i) => (
                <div key={i} data-target={`subsession-${i + 1}`} style={{ display: 'flex', alignItems: 'center', gap: 12, height: 46, paddingLeft: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8a8a8a' }} />
                  <span style={txt(FS.row, LC.text, 600)}>{it.title}</span>
                  {it.status ? <span style={txt(FS.row, LC.dim)}>· {it.status}</span> : null}
                </div>
              ))
            : null}
        </div>
      );
    case 'table':
      return (
        <div data-target={t} style={{ border: `1px solid ${LC.cardLine}`, borderRadius: 12.5, padding: '4px 26px' }}>
          {m.title ? <div style={{ ...txt(FS.row, LC.text, 600), padding: '16px 0 4px' }}>{m.title}</div> : null}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.7fr', height: 50, alignItems: 'center', borderBottom: `1px solid ${LC.rule}`, ...txt(FS.small, LC.dim) }}>
            {m.columns.map((c, i) => (
              <span key={i} style={{ textAlign: i === 2 ? 'right' : 'left' }}>
                {c}
              </span>
            ))}
          </div>
          {m.rows.map((r, i) => (
            <div key={i} data-target={`table-row-${i + 1}`} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.7fr', height: 54, alignItems: 'center', borderBottom: i < m.rows.length - 1 ? `1px solid ${LC.divider}` : 'none' }}>
              <span style={{ font: `400 20px ${FONT_SF_MONO}`, color: r.tone === 'muted' ? LC.faint : LC.text }}>{r.cells[0]}</span>
              <span style={txt(FS.small, LC.dim)}>{r.cells[1]}</span>
              <span style={{ ...txt(FS.small, r.tone === 'warn' ? '#b26a00' : r.tone === 'bad' ? LC.red : r.tone === 'good' ? LC.green : LC.text), textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14 }}>
                {r.cells[2]}
                {r.on !== undefined ? <MiniSwitch on={r.on} t={`table-toggle-${i + 1}`} ui={ui} w={38} h={21.4} /> : null}
              </span>
            </div>
          ))}
          {m.footer ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 54, borderTop: `1px solid ${LC.rule}` }}>
              <span style={txt(FS.small, LC.dim)}>{m.footer[0]}</span>
              <span style={txt(FS.row, LC.green, 600)}>{m.footer[1]}</span>
            </div>
          ) : null}
        </div>
      );
    case 'checklist':
      return (
        <div data-target={t} style={{ border: `1px solid ${LC.cardLine}`, borderRadius: 12.5, padding: '16px 26px' }}>
          <div style={{ ...txt(FS.row, LC.text, 600), marginBottom: 8 }}>{m.title}</div>
          {m.items.map((it, i) => (
            <div key={i} data-target={`check-${i + 1}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0' }}>
              <Ico name={it.status === 'warn' || it.status === 'bad' ? 'circle-alert' : 'circle-check'} size={24} color={it.status === 'warn' ? '#b26a00' : it.status === 'bad' ? LC.red : LC.green} stroke={1.9} />
              <div style={{ flex: 1 }}>
                <div style={txt(FS.row)}>{it.text}</div>
                {it.sub ? <div style={txt(FS.small, LC.dim)}>{it.sub}</div> : null}
              </div>
              {it.note ? <span style={txt(FS.small, LC.green)}>{it.note}</span> : null}
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
};

// Vertical gap above a message, from his recording (meta -> bubble 41, before a bubble 90, after a bubble 66).
const gapBefore = (prev: Message | undefined, m: Message) => {
  if (!prev) return 0;
  const isUser = (x: Message) => 'role' in x && x.role === 'user';
  if (isUser(m)) return 'kind' in prev && prev.kind === 'meta' ? 40 : 90;
  if (isUser(prev)) return 'kind' in m && (m.kind === 'context' || m.kind === 'usage') ? 64 : 68.5;
  if ('kind' in prev && prev.kind === 'context') return 34;
  return 34.8;
};

// ---------- composer, slash popover, model menu ----------

export const composerGeometry = (colLeft: number, colW: number, H: number, promptLines = 1) => {
  const h = Math.max(LL.composerH, 37 + promptLines * 36);
  return { left: colLeft - LL.composerOut, width: colW + LL.composerOut * 2, top: H - LL.composerBottom - h, h };
};

const SLASH_PITCH = 45.6;

export const SlashPopover: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState; x: number; bottom: number }> = ({ data, state, ui, x, bottom }) => {
  const list = state.slash ?? [];
  const prompt = String(state.prompt ?? '');
  const q = prompt.startsWith('/') && !/\s/.test(prompt) ? prompt.slice(1).toLowerCase() : '';
  const rows = list.filter((it) => it !== '-');
  const h = rows.length * SLASH_PITCH + 21.6;
  const seen: Record<string, number> = {};
  const bold = (s: string) => {
    const i = q ? s.toLowerCase().indexOf(q) : -1;
    if (i < 0) return <>{s}</>;
    return (
      <>
        {s.slice(0, i)}
        <span style={{ fontWeight: 560 }}>{s.slice(i, i + q.length)}</span>
        {s.slice(i + q.length)}
      </>
    );
  };
  let tip: React.ReactNode = null;
  const items = rows.map((it, i) => {
    const name = typeof it === 'string' ? it.replace(/^\//, '') : it.name.replace(/^\//, '');
    const dup = seen[name] ?? 0;
    seen[name] = dup + 1;
    const cmd = data.commands.filter((c) => c.name === name)[dup] ?? data.commands.find((c) => c.name === name);
    const tag = typeof it === 'object' && it.tag !== undefined ? it.tag : cmd?.tag;
    const desc = typeof it === 'object' && it.desc ? it.desc : cmd?.desc ?? '';
    const t = `slash-${slug(name)}${dup ? `-${dup + 1}` : ''}`;
    const on = state.slashHover === name ? dup === 0 : false;
    const hl = on || isHover(ui, t);
    const top = 10.8 + i * SLASH_PITCH;
    if (hl && state.slashTip && desc) {
      tip = (
        <div data-target="slash-tip" style={{ position: 'absolute', left: 437 + 2.6, top: top + 3.5, width: 'max-content', maxWidth: 296, padding: '5px 13.4px 5px', borderRadius: 10, background: LC.tip, ...txt(22.2, '#ffffff'), lineHeight: '29.4px', boxSizing: 'border-box', zIndex: 2 }}>
          {bold(desc)}
        </div>
      );
    }
    return (
      <div
        key={i}
        data-target={t}
        style={{ position: 'absolute', left: 11.3, right: 10.8, top, height: 45, borderRadius: 11, display: 'flex', alignItems: 'center', padding: '0 12px 0 16.5px', background: isPressed(ui, t) ? '#d9d9d9' : hl ? LC.menuHover : 'transparent' }}
      >
        <span style={{ ...txt(23.7), flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bold(name)}</span>
        {tag ? <span style={{ ...txt(19.8, LC.dim), marginLeft: 16, whiteSpace: 'nowrap' }}>{tag}</span> : null}
      </div>
    );
  });
  return (
    <div style={{ position: 'absolute', left: x, top: bottom - h, width: 437, height: h, zIndex: 30 }}>
      <div data-target="slash" style={{ position: 'absolute', inset: 0, background: LC.menu, border: `1px solid ${LC.menuLine}`, borderRadius: 22, boxShadow: '0 10px 30px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.05)' }}>
        {items}
      </div>
      {tip}
    </div>
  );
};

// Model menu (opens above the model picker; right edge on the picker's right edge).
export const MODEL_MENU_W = 423;
export const modelMenuHeight = 499;

export const ModelMenu: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState; right: number; bottom: number }> = ({ data, state, ui, right, bottom }) => {
  const models = data.models ?? [];
  const top = bottom - modelMenuHeight;
  const left = right - MODEL_MENU_W;
  const hov = state.modelHover;
  const row = (t: string, cy: number, label: string, children: React.ReactNode, h = 42) => {
    const on = hov === label || isHover(ui, t) || (label === 'Effort' && state.modelMenu === 'effort') || (label === 'More models' && state.modelMenu === 'more');
    return (
      <div key={t} data-target={t} style={{ position: 'absolute', left: 9, right: 9, top: cy - h / 2, height: h, borderRadius: 10, background: isPressed(ui, t) ? '#e2e2e2' : on ? '#efefef' : 'transparent', display: 'flex', alignItems: 'center', padding: '0 17.8px 0 19.4px' }}>
        {children}
      </div>
    );
  };
  const sep = (y: number) => <div key={`sep-${y}`} style={{ position: 'absolute', left: 28.4, right: 26.8, top: y, height: 1, background: LC.sep }} />;
  const ys = [74.8, 120.6, 166, 211.4];
  const extra = Math.max(0, models.length - 4) * 45.5;
  const effortSub = state.modelMenu === 'effort';
  return (
    <>
      <div data-target="model-menu" style={{ position: 'absolute', left, top: top - extra, width: MODEL_MENU_W, height: modelMenuHeight + extra, background: LC.menu, border: `1px solid ${LC.menuLine}`, borderRadius: 22.7, boxShadow: '0 12px 36px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)', boxSizing: 'border-box', zIndex: 30 }}>
        <div style={{ position: 'absolute', left: 28.4, top: 32 - 14, lineHeight: '28px', ...txt(21.6, LC.dim) }}>Model · this session</div>
        {models.map((md, i) =>
          row(`model-${slug(md.name)}`, i < 4 ? ys[i] : ys[3] + (i - 3) * 45.5, md.name, (
            <>
              <span style={{ ...txt(22.5), flex: 1 }}>{md.name}</span>
              {md.name === data.model ? <CheckIcon size={21.7} color={LC.blue} stroke={2.2} /> : <span style={txt(21.6, LC.dim)}>{md.key ?? i + 1}</span>}
            </>
          )),
        )}
        <div style={{ position: 'absolute', left: 0, right: 0, top: extra }}>
          {sep(240.8)}
          {row('model-effort', 271.2, 'Effort', (
            <>
              <span style={{ ...txt(22.5), flex: 1 }}>Effort</span>
              <span style={{ ...txt(21.6, LC.dim), marginRight: 23 }}>{data.effort}</span>
              <Chev dir="right" w={14} stroke={1.8} color="#4a4a4a" />
            </>
          ))}
          {sep(300.6)}
          {row('model-more-models', 331.5, 'More models', (
            <>
              <span style={{ ...txt(22.5), flex: 1 }}>More models</span>
              <Chev dir="right" w={14} stroke={1.8} color="#4a4a4a" />
            </>
          ))}
          {sep(361)}
          <div style={{ position: 'absolute', left: 28.4, top: 389.3 - 14, lineHeight: '28px', ...txt(21.6, LC.dim) }}>Fast mode</div>
          {row('model-fast-mode', 451, 'Enable fast mode', (
            <>
              <div style={{ flex: 1 }}>
                <div style={{ ...txt(23), lineHeight: '30px' }}>Enable fast mode</div>
                <div style={{ ...txt(21.6, LC.dim), lineHeight: '30px', marginTop: 6 }}>Requires usage credits</div>
              </div>
              <span data-target="buy-credits" style={{ height: 24.2, padding: '0 10px', borderRadius: 13, background: LC.pill, display: 'flex', alignItems: 'center', ...txt(18.6, LC.pillText, 500) }}>
                Buy credits
              </span>
            </>
          ), 82)}
        </div>
      </div>
      {effortSub ? (
        <div data-target="effort-menu" style={{ position: 'absolute', left: right - 8, top: top + 271.2 - 30 - 10, width: 250, background: LC.menu, border: `1px solid ${LC.menuLine}`, borderRadius: 18, boxShadow: '0 12px 36px rgba(0,0,0,0.12)', padding: '8px 0', zIndex: 31 }}>
          {(data.efforts ?? []).map((e) => {
            const t = `effort-${slug(e)}`;
            const on = hov === e || isHover(ui, t);
            return (
              <div key={e} data-target={t} style={{ height: 45.5, margin: '0 9px', borderRadius: 10, display: 'flex', alignItems: 'center', padding: '0 17.8px 0 19.4px', background: isPressed(ui, t) ? '#e2e2e2' : on ? '#efefef' : 'transparent' }}>
                <span style={{ ...txt(22.5), flex: 1 }}>{e}</span>
                {e === data.effort ? <CheckIcon size={21.7} color={LC.blue} stroke={2.2} /> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
};

// ---------- chat pane ----------

export const LightChat: React.FC<{ data: DesktopData; state: DesktopState; ui: UiState; messages: Message[]; mainLeft: number; mainW: number; H: number }> = ({ data, state, ui, messages, mainLeft, mainW, H }) => {
  const colW = Math.min(LL.colMax, mainW - LL.colPad * 2);
  const colLeft = mainLeft + (mainW - colW) / 2;
  const prompt = String(state.prompt ?? '');
  const caret = caretOn(ui, 'prompt');
  const empty = messages.length === 0;
  const placeholder = empty ? 'Describe a task or ask a question' : state.tab === 'chat' ? 'How can I help you today?' : data.placeholder;
  const lines = Math.max(1, Math.ceil((prompt.length * 12.3) / (colW - 100)));
  const g = composerGeometry(colLeft, colW, H, lines);
  // slash command chip in the composer: "/autocompact" blue, then the args (or the grey hint)
  const cm = /^\/(\S+)(\s.*)?$/s.exec(prompt);
  const cmd = cm ? data.commands.find((c) => c.name === cm[1]) : undefined;
  const chip = !!cmd && (cm![2] !== undefined || !(state.slash && state.slash.length));
  const rowY = H - LL.modelRowY;
  const ctxPct = data.context?.pct ?? 0;
  const pickerOn = !!state.modelMenu;
  return (
    <>
      {/* messages */}
      <div data-target="messages" style={{ position: 'absolute', left: colLeft, top: LL.titleH, width: colW, height: g.top - 20 - LL.titleH, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ minHeight: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '53.5px 0 30px', boxSizing: 'border-box', transform: state.chatScroll ? `translateY(${-Number(state.chatScroll)}px)` : undefined }}>
          {empty ? (
            <EmptyState data={data} ui={ui} />
          ) : (
            messages.map((m, i) => (
              <div key={i} style={{ marginTop: gapBefore(messages[i - 1], m) }}>
                <MessageView m={m} n={i + 1} data={data} state={state} ui={ui} colW={colW} />
              </div>
            ))
          )}
        </div>
      </div>
      <div data-target="chat" style={{ position: 'absolute', left: colLeft - LL.composerOut, top: LL.titleH, width: colW + LL.composerOut * 2, height: H - LL.titleH, pointerEvents: 'none' }} />

      {/* composer */}
      <div
        data-target="composer"
        style={{
          position: 'absolute',
          left: g.left,
          top: g.top,
          width: g.width,
          height: g.h,
          borderRadius: 23,
          background: LC.white,
          border: `1px solid ${isHover(ui, 'composer') || ui.caret === 'prompt' ? '#c4c4c4' : '#d4d4d4'}`,
          boxShadow: '0 6px 18px rgba(0,0,0,0.055), 0 1px 3px rgba(0,0,0,0.03)',
          boxSizing: 'border-box',
          zIndex: 10,
        }}
      >
        <div data-target="attach" style={{ position: 'absolute', left: 37.1 - 20, top: 37 - 20, width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: fill(ui, 'attach', { hover: LC.hover }) }}>
          <Ico name="plus" size={35} color={LC.text} stroke={1.25} />
        </div>
        <div style={{ position: 'absolute', left: 74.2, right: prompt ? 130 : 80, top: 18.5, ...txt(prompt ? FS.chat : 24.8, prompt ? LC.text : LC.faint), lineHeight: '36px', wordBreak: 'break-word' }}>
          {chip ? (
            <>
              <span style={{ color: LC.cmdSlash, marginRight: 4 }}>/</span>
              <span style={{ color: LC.cmd }}>{cm![1]}</span>
              {cm![2] !== undefined && cm![2].trim() ? <span>{cm![2]}</span> : <span> </span>}
              {ui.caret === 'prompt' ? <Caret on={caret} h={30} color="#141414" /> : null}
              {cmd?.hint && !(cm![2] ?? '').trim() ? <span style={{ color: '#8a8a8a' }}>{cmd.hint}</span> : null}
            </>
          ) : (
            <>
              {prompt}
              {ui.caret === 'prompt' ? <Caret on={caret} h={30} color="#141414" /> : null}
              {prompt ? null : placeholder}
            </>
          )}
        </div>
        {prompt ? (
          <div data-target="send" style={{ position: 'absolute', right: 94.9 - 20, top: 37 - 20, width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: fill(ui, 'send', { hover: LC.hover, pressed: LC.press }) }}>
            <Ico name="corner-down-left" size={28} color={LC.text} stroke={1.9} />
          </div>
        ) : null}
        <div data-target={prompt ? 'mic' : 'send'} style={{ position: 'absolute', right: 37.6 - 20, top: 37 - 20, width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: fill(ui, prompt ? 'mic' : 'send', { hover: LC.hover }) }}>
          <MicIcon size={25} stroke={1.9} />
        </div>
      </div>
      {state.slash && state.slash.length ? <SlashPopover data={data} state={state} ui={ui} x={g.left + 46.4} bottom={g.top + 6} /> : null}

      {/* model line */}
      <div style={{ position: 'absolute', right: undefined, left: 0, top: rowY - 19.4, width: colLeft + colW + 8.7, height: 38.8, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 9 }}>
        {empty ? (() => {
          // In a narrow window (the panel reflows the app) the environment items run into the model picker:
          // drop "Worktree", then the folder, until they fit (character-width estimate at FS.small).
          const cw = FS.small * 0.56;
          const rightW = (data.model.length + data.effort.length) * cw + 14.5 + 22.6 + data.mode.length * 10.95 + 22.6 + 5.7 + 38 + 8.6;
          const avail = colLeft + colW + 8.7 - (g.left + 10) - rightW - 28;
          const item = (label: string) => label.length * cw + 32;
          const showWorktree = item(data.environment.location) + item(data.environment.folder) + item('Worktree') + 68 <= avail;
          const showFolder = item(data.environment.location) + item(data.environment.folder) + 34 <= avail;
          return (
          <div data-target="env-picker" style={{ position: 'absolute', left: g.left + 10, height: 38.8, display: 'flex', alignItems: 'center', gap: 34, ...txt(FS.small) }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Ico name="laptop" size={22} color={LC.text} stroke={1.8} />
              {data.environment.location}
            </span>
            {showFolder ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Ico name="folder" size={22} color={LC.text} stroke={1.8} />
                {data.environment.folder}
              </span>
            ) : null}
            {showWorktree ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, color: LC.dim }}>
                <span style={{ width: 17, height: 17, borderRadius: 4, border: '1.5px solid #c4c4c4', boxSizing: 'border-box' }} />
                Worktree
              </span>
            ) : null}
          </div>
          );
        })() : null}
        <div data-target="model-picker" style={{ height: 38.8, display: 'flex', alignItems: 'center', gap: 14.5, padding: '0 11.3px', borderRadius: 10, background: fill(ui, 'model-picker', { hover: LC.hover, pressed: '#d8d8d8', active: pickerOn, activeBg: LC.pickerOn }) }}>
          <span style={txt(FS.small)}>{data.model}</span>
          <span style={txt(FS.small, LC.dim)}>{data.effort}</span>
        </div>
        <div data-target="mode-picker" style={{ height: 38.8, display: 'flex', alignItems: 'center', padding: '0 11.3px', marginLeft: 5.7, borderRadius: 10, background: fill(ui, 'mode-picker', { hover: LC.hover }) }}>
          <span style={txt(20.8)}>{data.mode}</span>
        </div>
        <div data-target="context-ring" style={{ width: 38, height: 38.8, marginLeft: 8.6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={21.6} height={21.6} style={{ display: 'block' }}>
            <circle cx={10.8} cy={10.8} r={9.3} fill="none" stroke="#d0d0d0" strokeWidth={2.1} />
            <circle cx={10.8} cy={10.8} r={9.3} fill="none" stroke={LC.blue} strokeWidth={2.1} strokeLinecap="round" strokeDasharray={`${(2 * Math.PI * 9.3 * Math.max(4, Math.min(100, ctxPct))) / 100} 100`} transform="rotate(-90 10.8 10.8)" />
          </svg>
        </div>
      </div>
      {state.modelMenu ? <ModelMenu data={data} state={state} ui={ui} right={colLeft + colW + 8.7 - 38 - 8.6 - (data.mode.length * 10.95 + 22.6) - 5.7 + 1.5} bottom={rowY - 19.4 - 9.3} /> : null}
    </>
  );
};

// New-session empty state: his crab, the environment card and the GitHub card.
const GH = 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z';
const EmptyState: React.FC<{ data: DesktopData; ui: UiState }> = ({ data, ui }) => {
  const card: React.CSSProperties = { width: 523, border: `1px solid ${LC.cardLine}`, borderRadius: 14, background: LC.bg, boxSizing: 'border-box' };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
      <div style={{ width: 523, display: 'flex', justifyContent: 'flex-end', paddingRight: 8, marginBottom: -6, position: 'relative', zIndex: 1 }}>
        <PixelCrab size={56} />
      </div>
      <div data-target="env-choice" style={card}>
        <div style={{ height: 66, display: 'flex', alignItems: 'center', gap: 16, padding: '0 22px', borderBottom: `1px solid ${LC.cardLine}` }}>
          <Ico name="folder" size={24} color={LC.text} stroke={1.8} />
          <span style={{ ...txt(22.9), flex: 1 }}>{data.environment.folder}</span>
          <Ico name="check" size={25} color={LC.text} stroke={2} />
        </div>
        <div data-target="choose-environment" style={{ height: 66, display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', background: fill(ui, 'choose-environment', { hover: LC.hover }), borderRadius: '0 0 14px 14px' }}>
          <span style={txt(22.9)}>Choose environment</span>
          <Chev w={11} stroke={1.5} color={LC.dim} />
        </div>
      </div>
      <div data-target="connect-github" style={{ ...card, height: 66, marginTop: 18, display: 'flex', alignItems: 'center', gap: 16, padding: '0 22px' }}>
        <svg width={21} height={21} viewBox="0 0 16 16" style={{ display: 'block' }}>
          <path d={GH} fill={LC.text} />
        </svg>
        <span style={txt(22.9)}>Connect GitHub</span>
        <span style={txt(22.9, LC.dim)}>Fix failing checks</span>
      </div>
    </div>
  );
};
