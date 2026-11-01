import React from 'react';
import type { ReplicaDef, ReplicaProps } from '../../app/replica';
import { caretOn, isHover, isPressed } from '../../app/replica';
import { ClaudeStar, FONT_MONO, FONT_UI, TrafficLights, mergeData, slug } from '../_shared/kit';

// Claude Code CLI running in a macOS Terminal window. 1920x1080 plate, the window fills it with a
// thin wallpaper margin. Monospace at 23 px (~1.5x a 15 px terminal font).

type Line = { kind: 'prompt' | 'out' | 'text' | 'tool' | 'ok' | 'err' | 'dim' | 'blank'; text?: string };

type TermData = {
  title: string;
  header: null | { title: string; lines: string[]; tips?: string[] };
  lines: Line[];
  commands: { name: string; desc: string }[];
  status: { left: string; right: string };
  anchor: 'top' | 'bottom';
};

type TermState = {
  prompt: string;
  slash: null | (string | { name: string; desc?: string })[];
  slashHover: string | null;
  upto: number | null;
  append: Line[];
  thinking: string | null;
  mode: 'normal' | 'plan' | 'accept';
};

const P = {
  wall: '#0f0e0d',
  win: '#151515',
  bar: '#2a2a2a',
  barLine: '#0a0a0a',
  text: '#e6e6e6',
  dim: '#8a8a8a',
  faint: '#5f5f5f',
  green: '#4eba65',
  red: '#ff6b80',
  orange: '#d97757',
  purple: '#b1b9f9',
  promptBg: '#262626',
  box: '#888888',
};

const FS = 23;
const LH = 35;

const defaultData: TermData = {
  title: 'agency-clients — claude — 142×40',
  header: {
    title: 'Welcome back, Samin',
    lines: ['Opus 5.5 · Claude Max', '~/Clients/agency-clients'],
    tips: ['Run /init to create a CLAUDE.md file', 'Use /skill-doctor to find unused skills'],
  },
  lines: [
    { kind: 'prompt', text: 'Pull this week’s numbers for every client and draft the weekly reports' },
    { kind: 'blank' },
    { kind: 'out', text: 'I’ll read last week’s reports first, then pull the new numbers.' },
    { kind: 'blank' },
    { kind: 'tool', text: 'Read(reports/orchard-lane/2026-10-20.md)' },
    { kind: 'dim', text: 'Read 84 lines' },
    { kind: 'tool', text: 'Bash(python scripts/pull_sheets.py --week 44)' },
    { kind: 'ok', text: 'Pulled 4 client sheets (Orchard Lane, Saltmarsh Swim, Tidewell Pet Co, Hearthbook)' },
    { kind: 'tool', text: 'Write(reports/orchard-lane/2026-10-27.md)' },
    { kind: 'ok', text: 'Wrote 112 lines' },
    { kind: 'tool', text: 'Bash(python scripts/check_numbers.py)' },
    { kind: 'err', text: 'Tidewell Pet Co: sheet “Oct” missing column “Repeat orders”' },
    { kind: 'blank' },
    { kind: 'out', text: 'Three reports are drafted. Tidewell’s October sheet is missing a column,' },
    { kind: 'text', text: 'so I used September’s layout and flagged it in the report.' },
  ],
  commands: [
    { name: 'add-dir', desc: 'Add a new working directory' },
    { name: 'agents', desc: 'Manage agent configurations' },
    { name: 'compact', desc: 'Clear history but keep a summary in context' },
    { name: 'context', desc: 'Visualize current context usage as a grid' },
    { name: 'doctor', desc: 'Diagnose and verify your Claude Code installation' },
    { name: 'init', desc: 'Initialize a new CLAUDE.md file with codebase documentation' },
    { name: 'memory', desc: 'Edit Claude memory files' },
    { name: 'model', desc: 'Set the AI model for Claude Code' },
    { name: 'rewind', desc: 'Restore the code and/or conversation to a previous point' },
    { name: 'skill-doctor', desc: 'Show which loaded skills are unused and costing context' },
  ],
  status: { left: '? for shortcuts', right: 'Opus 5.5 · 28% context used' },
  anchor: 'top',
};

const defaultState: TermState = { prompt: '', slash: null, slashHover: null, upto: null, append: [], thinking: null, mode: 'normal' };

const ToolText: React.FC<{ text: string }> = ({ text }) => {
  const m = /^([A-Za-z_][\w-]*)(\(.*\))?$/.exec(text);
  if (!m) return <>{text}</>;
  return (
    <>
      <span style={{ fontWeight: 700, color: '#f2f2f2' }}>{m[1]}</span>
      {m[2] ? <span style={{ color: P.text }}>{m[2]}</span> : null}
    </>
  );
};

// Each line: a full-width row, with the target on an inner box that hugs the text, so a lifted
// line is just its content (a full-width target cannot be magnified on screen).
const LineView: React.FC<{ l: Line; n: number }> = ({ l, n }) => {
  const t = `line-${n}`;
  const hug: React.CSSProperties = { display: 'inline-flex', maxWidth: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: LH, alignItems: 'flex-start' };
  const gut = (ch: string, color: string) => <span style={{ width: '2ch', flexShrink: 0, color }}>{ch}</span>;
  if (l.kind === 'blank') return <div data-target={t} style={{ height: LH * 0.6 }} />;
  if (l.kind === 'prompt')
    return (
      <div style={{ background: P.promptBg, margin: '0 -12px', padding: '4px 12px' }}>
        <div data-target={t} style={hug}>
          {gut('>', P.dim)}
          <span style={{ color: '#d8d8d8' }}>{l.text}</span>
        </div>
      </div>
    );
  let body: React.ReactNode = null;
  if (l.kind === 'out')
    body = (
      <>
        {gut('⏺', '#f2f2f2')}
        <span style={{ color: P.text }}>{l.text}</span>
      </>
    );
  else if (l.kind === 'text') body = <span style={{ color: P.text, paddingLeft: '2ch' }}>{l.text}</span>;
  else if (l.kind === 'tool')
    body = (
      <>
        {gut('⏺', P.green)}
        <span>
          <ToolText text={l.text ?? ''} />
        </span>
      </>
    );
  else
    body = (
      <>
        <span style={{ width: '7ch', flexShrink: 0, color: P.dim, paddingLeft: '2ch', boxSizing: 'border-box' }}>⎿</span>
        <span style={{ color: l.kind === 'ok' ? P.green : l.kind === 'err' ? P.red : P.dim }}>{l.text}</span>
      </>
    );
  return (
    <div>
      <div data-target={t} style={hug}>
        {body}
      </div>
    </div>
  );
};

const Terminal: React.FC<ReplicaProps<Partial<TermData>, Partial<TermState>>> = ({ data: raw, state: rs, ui }) => {
  const data = mergeData(defaultData, raw, ['header', 'status']);
  const state = { ...defaultState, ...rs } as TermState;
  let lines = data.lines ?? [];
  if (state.upto !== null && state.upto !== undefined) lines = lines.slice(0, Number(state.upto));
  if (state.append?.length) lines = [...lines, ...state.append];
  const caret = caretOn(ui, 'prompt');
  const slashList = state.slash ?? [];
  const mode = state.mode === 'plan' ? '⏸ plan mode on (shift+tab to cycle)' : state.mode === 'accept' ? '⏵⏵ accept edits on (shift+tab to cycle)' : data.status.left;
  const modeColor = state.mode === 'plan' ? '#48968c' : state.mode === 'accept' ? '#af87ff' : P.dim;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: `radial-gradient(120% 90% at 70% 0%, #2a2420 0%, ${P.wall} 60%)` }}>
      <div
        data-target="window"
        style={{
          position: 'absolute',
          left: 34,
          top: 30,
          right: 34,
          bottom: 30,
          borderRadius: 18,
          background: P.win,
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* title bar */}
        <div data-target="titlebar" style={{ height: 58, flexShrink: 0, background: P.bar, borderBottom: `1px solid ${P.barLine}`, display: 'flex', alignItems: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 24 }}>
            <TrafficLights />
          </div>
          <div style={{ flex: 1, textAlign: 'center', font: `500 21px ${FONT_UI}`, color: '#b4b4b4' }}>{data.title}</div>
        </div>

        {/* scrollback + input */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: data.anchor === 'bottom' ? 'flex-end' : 'flex-start' }}>
          <div style={{ flexShrink: 0, minHeight: data.anchor === 'bottom' ? undefined : '100%', padding: '26px 40px 20px', boxSizing: 'border-box', font: `400 ${FS}px/${LH}px ${FONT_MONO}`, color: P.text, display: 'flex', flexDirection: 'column' }}>
            {data.header ? (
              <div data-target="header" style={{ border: `1.5px solid ${P.orange}`, borderRadius: 12, padding: '18px 28px', display: 'flex', gap: 40, marginBottom: 26, alignSelf: 'flex-start', minWidth: 1100 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 460 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontWeight: 700, color: '#f2f2f2' }}>
                    <ClaudeStar size={24} />
                    {data.header.title}
                  </div>
                  {data.header.lines.map((x, i) => (
                    <div key={i} style={{ color: P.dim }}>
                      {x}
                    </div>
                  ))}
                </div>
                {data.header.tips?.length ? (
                  <div style={{ borderLeft: `1.5px solid ${P.orange}`, paddingLeft: 32 }}>
                    <div style={{ color: P.orange, fontWeight: 700 }}>Tips for getting started</div>
                    {data.header.tips.map((x, i) => (
                      <div key={i} style={{ color: '#cfcfcf' }}>
                        {x}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div data-target="scrollback">
              {lines.map((l, i) => (
                <LineView key={i} l={l} n={i + 1} />
              ))}
            </div>

            {state.thinking ? (
              <div data-target="thinking" style={{ display: 'flex', marginTop: 14, color: P.orange }}>
                <span style={{ width: '2ch', display: 'flex', alignItems: 'center', height: LH }}>
                  <ClaudeStar size={20 + 4 * Math.abs(Math.sin(ui.frame / 6))} spin={ui.frame * 9} />
                </span>
                <span>{state.thinking}</span>
                <span style={{ color: P.dim, marginLeft: '1ch' }}>(esc to interrupt)</span>
              </div>
            ) : null}

            {/* input box */}
            <div
              data-target="composer"
              style={{ marginTop: 22, border: `1.5px solid ${ui.caret === 'prompt' ? '#a0a0a0' : P.box}`, borderRadius: 10, padding: '12px 18px', display: 'flex', minHeight: LH + 24, boxSizing: 'border-box', background: P.win }}
            >
              <span style={{ width: '2ch', flexShrink: 0, color: '#d0d0d0' }}>{'>'}</span>
              <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#f2f2f2' }}>
                {state.prompt}
                {ui.caret === 'prompt' || !state.prompt ? (
                  <span style={{ display: 'inline-block', width: '0.62em', height: LH - 6, verticalAlign: 'middle', transform: 'translateY(-2px)', background: caret || ui.caret !== 'prompt' ? '#e8e8e8' : 'transparent' }} />
                ) : null}
                {!state.prompt && !slashList.length ? <span style={{ color: P.faint }}> Try “draft the Saltmarsh Swim report”</span> : null}
              </span>
            </div>

            {/* slash popup (below the input, like the CLI) */}
            {slashList.length ? (
              <div data-target="slash" style={{ padding: '10px 2ch 0' }}>
                {slashList.map((it, i) => {
                  if (it === '-') return <div key={i} style={{ height: LH / 2 }} />;
                  const name = (typeof it === 'string' ? it : it.name).replace(/^\//, '');
                  const desc = typeof it === 'string' ? data.commands.find((c) => c.name === name)?.desc ?? '' : it.desc ?? data.commands.find((c) => c.name === name)?.desc ?? '';
                  const tg = `slash-${slug(name)}`;
                  const on = state.slashHover === name || isHover(ui, tg);
                  return (
                    <div key={i} data-target={tg} style={{ display: 'flex', width: 'fit-content', maxWidth: '100%', height: LH + 4, alignItems: 'center', color: on ? P.purple : P.dim }}>
                      <span style={{ width: '24ch', flexShrink: 0, color: on ? P.purple : '#d0d0d0' }}>/{name}</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{desc}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div data-target="status" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 2ch 0', color: P.dim, fontSize: FS - 2 }}>
                <span style={{ color: modeColor }}>{mode}</span>
                <span>{data.status.right}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const terminal: ReplicaDef = {
  id: 'terminal',
  title: 'Claude Code CLI in a macOS Terminal window',
  size: [1920, 1080],
  panelSize: [1280, 905], // mono text needs the extra size on a phone; the window still fits
  tone: 'dark',
  component: Terminal,
  defaults: { data: defaultData as unknown as Record<string, unknown>, state: defaultState as unknown as Record<string, unknown> },
  targets: {
    window: 'the whole terminal window',
    titlebar: 'window title bar (traffic lights + title)',
    header: 'orange "Welcome back" box at the top (data.header; null hides it)',
    scrollback: 'all scrollback lines',
    'line-<n>': 'nth scrollback line (1-based over data.lines, then state.append)',
    thinking: 'the orange spinner line (state.thinking)',
    composer: 'the input box (type into it with key: prompt)',
    status: 'status line under the input box (hidden while the slash popup is open)',
    slash: 'slash-command list under the input box (state.slash)',
    'slash-<slug>': 'one command row, e.g. slash-compact',
  },
  stateDoc: {
    prompt: 'string: input box text (block caret while typing)',
    slash: "null | ['compact', 'context', ...]: command list under the input (names from data.commands, or {name, desc}; '-' = gap)",
    slashHover: 'command name highlighted (purple) in the list',
    upto: 'number | null: show only the first N lines of data.lines',
    append: 'lines appended after data.lines: [{kind, text}] (kinds: prompt | out | text | tool | ok | err | dim | blank)',
    thinking: "string | null: spinner line, e.g. 'Drafting reports… (12s · ↑ 1.2k tokens)'",
    mode: "'normal' | 'plan' | 'accept': status-line mode text",
  },
};
