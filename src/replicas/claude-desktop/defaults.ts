import type { DesktopData, DesktopState, Message } from './types';

// The fictional universe every video reuses: a small agency running client work in Claude.
// Clients: Orchard Lane Coffee, Saltmarsh Swim, Tidewell Pet Co, Hearthbook.

const weeklyReports: Message[] = [
  { role: 'user', text: 'Pull this week’s numbers for every client and draft the weekly reports. Same layout as last week.' },
  { kind: 'activity', text: 'Read 6 files, ran 3 commands' },
  { role: 'assistant', text: 'I’ll plan this first, then work through it step by step. Each report goes into its client folder as a `.md` file.' },
  {
    kind: 'steps',
    items: [
      { text: 'Read last week’s reports', status: 'done' },
      { text: 'Pull this week’s numbers from the client sheets', status: 'done' },
      { text: 'Draft the Orchard Lane Coffee report', status: 'active', sub: { name: 'orchard-report', status: 'Working' } },
      { text: 'Draft the Saltmarsh Swim report', status: 'pending' },
      { text: 'Check every number against the sheets', status: 'pending' },
    ],
  },
];

const saltmarshLaunch: Message[] = [
  { role: 'user', text: 'Build the Saltmarsh Swim launch kit: a sales page and the launch emails. Start a nested session for each one.' },
  { role: 'assistant', text: 'On it. One session for each part of the campaign. They’ll report back here when they’re done.' },
  { kind: 'sessions', text: 'Started 2 sessions', open: true, items: [{ title: 'Sales page', status: 'Working' }, { title: 'Emails', status: 'Working' }] },
  { kind: 'notice', text: 'Received message from Sales page' },
  { role: 'assistant', text: '**The sales page is done.** It’s in Outputs as `saltmarsh-sales-page.md`. The emails are still in progress.' },
];

const skillDoctor: Message[] = [
  { role: 'user', text: '/skill-doctor' },
  {
    kind: 'table',
    columns: ['Skill', 'In working memory', 'Used'],
    rows: [
      { cells: ['client-report', '2.1k', '31 uses'], bar: 0.82, on: true },
      { cells: ['brand-voice', '1.6k', '18 uses'], bar: 0.62, on: true },
      { cells: ['weekly-numbers', '1.5k', '12 uses'], bar: 0.58, on: true },
      { cells: ['old-onboarding', '2.6k', 'never'], bar: 1, on: false, tone: 'muted' },
      { cells: ['invoice-helper', '1.8k', 'never'], bar: 0.7, on: true, tone: 'warn' },
    ],
    footer: ['Skills in working memory', '7.0k tokens'],
  },
];

export const defaultData: DesktopData = {
  chrome: 'mac',
  user: { name: 'Samin', plan: 'Max', initial: 'S' },
  nav: [
    { label: 'New', icon: 'plus' },
    { label: 'Search', icon: 'search' },
    { label: 'Artifacts', icon: 'book-copy' },
    { label: 'Scheduled', icon: 'clock' },
    { label: 'Customize', icon: 'briefcase' },
  ],
  pinned: [
    { id: 'weekly', title: 'Weekly client reports' },
    { id: 'proposals', title: 'Proposal templates' },
  ],
  sections: [
    {
      name: 'Clients',
      sessions: [
        {
          id: 'saltmarsh',
          title: 'Saltmarsh Swim launch',
          status: 'working',
          children: [
            { id: 'sales-page', title: 'Sales page', status: 'done' },
            { id: 'emails', title: 'Emails', status: 'working' },
          ],
        },
        { id: 'orchard', title: 'Orchard Lane Coffee launch', status: 'unread' },
        { id: 'tidewell', title: 'Tidewell Pet Co inbox' },
        { id: 'hearthbook', title: 'Hearthbook onboarding emails', status: 'waiting' },
      ],
    },
    {
      name: 'Content',
      sessions: [
        { id: 'newsletter', title: 'Newsletter draft' },
        { id: 'thumbnails', title: 'Thumbnail ideas' },
      ],
    },
  ],
  messages: weeklyReports,
  // Per-session chats. Any session without an entry shows `messages`.
  chats: {
    saltmarsh: saltmarshLaunch,
    proposals: skillDoctor,
    orchard: [
      { role: 'user', text: 'Pull this week’s numbers for Orchard Lane Coffee and Saltmarsh Swim.' },
      { role: 'assistant', text: 'Both reports are in Outputs. Orchard Lane is up 12% on last week, Saltmarsh Swim is flat.' },
      { role: 'user', text: 'Now draft the Hearthbook welcome email.' },
      { role: 'assistant', text: 'Draft is in Outputs as `hearthbook-welcome.md`.' },
    ],
  },
  model: 'Opus 5.5',
  effort: 'High',
  mode: 'Auto',
  placeholder: 'Type / for commands',
  greeting: 'Evening, Samin',
  environment: { location: 'This computer', folder: 'agency-clients', drive: '~/Clients' },
  context: {
    pct: 28,
    used: '281k',
    total: '1M',
    rows: [
      { label: 'Messages', size: '187.2k', pct: '18.7%', color: '#5e8bdc' },
      { label: 'Memory files', size: '41.9k', pct: '4.2%', color: '#c46839', dotted: true },
      { label: 'System tools', size: '17.2k', pct: '1.7%', color: '#5faf8a' },
      { label: 'MCP tools', size: '10.9k', pct: '1.1%', color: '#ba923b', dotted: true },
      { label: 'Skills', size: '9.9k', pct: '1.0%', dotted: true },
      { label: 'System prompt', size: '9.1k', pct: '0.9%' },
      { label: 'Custom agents', size: '1.6k', pct: '0.2%', dotted: true },
      { label: 'Autocompact buffer', size: '33k', pct: '3.3%' },
      { label: 'Free space', size: '686k', pct: '68.6%', color: '#3a3a3a' },
    ],
  },
  connectors: [
    { name: 'Gmail', letter: 'G', status: 'Connected' },
    { name: 'Google Drive', letter: 'D', status: 'Connected' },
    { name: 'Notion', letter: 'N', status: 'Authenticate' },
  ],
  outputs: [
    { name: 'orchard-lane-weekly-report.md', meta: 'Just now', icon: 'file' },
    { name: 'client-numbers-oct-27.xlsx', meta: 'Read', icon: 'sheet' },
  ],
  commands: [
    { name: 'output-style', desc: 'List output styles or switch to one' },
    { name: 'doctor', desc: 'Health-check your setup and fix issues: installation, unused extensions, duplicates' },
    { name: 'skill-doctor', desc: 'Show which loaded skills are unused and costing context' },
    { name: 'advisor', desc: 'Let Claude consult a stronger model at key moments' },
    { name: 'insights', desc: 'Generate a report analyzing your Claude Code sessions' },
    { name: 'recap', desc: 'Generate a one-line session recap now' },
    { name: 'rewind', desc: 'Restore the code and/or conversation to a previous point' },
    { name: 'btw', desc: 'Ask a quick side question without interrupting the main conversation' },
    { name: 'compact', desc: 'Summarize the conversation so far to free up context' },
  ],
  menu: [
    { label: 'Open in', sub: ['Split view', 'New window'] },
    '-',
    { label: 'Pin', key: 'P' },
    { label: 'Mark as unread', key: 'U' },
    { label: 'Rename', key: 'R' },
    { label: 'Fork', key: 'F' },
    '-',
    { label: 'Move to section', sub: ['Clients', 'Content', 'New section…'] },
    '-',
    { label: 'Archive', key: 'A' },
    { label: 'Delete', key: 'D', danger: true },
  ],
  moreMenu: [
    { label: 'Terminal', key: '⌘`' },
    { label: 'Files' },
    { label: 'Changes', key: '⇧⌘D' },
    { label: 'Artifacts' },
    { label: 'Side chat', key: '⌘;' },
    { label: 'Background tasks' },
    { label: 'Plan' },
    '-',
    { label: 'Hide session rail' },
  ],
  settings: {
    nav: ['General', 'Account', 'Capabilities', 'Connectors', 'Claude Code'],
    pages: {
      General: [
        { label: 'Show session rail by default' },
        { label: 'Play a sound when Claude finishes' },
      ],
      'Claude Code': [
        { label: 'Connect new sessions to Remote Control', desc: 'Pick up any session from your phone' },
        { label: 'Keep computer awake while Claude works', desc: 'Long jobs keep running with the lid open' },
      ],
    },
  },
  ribbon: { week: { pct: '68% left', reset: '3d 4h' }, window: { pct: '82% left', reset: '2h 10m' }, cache: { label: 'WARM', left: '42m left' } },
  agents: {
    title: 'Saltmarsh Swim launch kit',
    stats: [
      ['Cost', '≈$0.34'],
      ['Tokens', '227k'],
      ['Time', '1:18'],
    ],
    running: [
      { name: 'Launch emails', tier: 'standard', model: 'Sonnet 5.5', effort: 'medium', done: 4, total: 5, meta: 'ctx 7% · 77k ≈$0.18 0:45', color: '#3989de' },
      { name: 'Ad sets', tier: 'quick', model: 'Sonnet 5.5', effort: 'low', done: 3, total: 4, meta: 'ctx 5% · 58k ≈$0.14 0:32', color: '#1d9e75' },
      { name: 'Social posts', tier: 'standard', model: 'Sonnet 5.5', effort: 'medium', done: 2, total: 5, meta: 'ctx 4% · 44k ≈$0.11 0:23', color: '#3989de' },
    ],
    finished: 1,
  },
};

export const defaultState: DesktopState = {
  tab: 'code',
  active: 'weekly',
  rail: false,
  remote: false,
  prompt: '',
  menu: null,
  view: 'chat',
  settingsPage: 'Claude Code',
  toggles: {},
  slash: null,
  slashHover: null,
  append: [],
  upto: null,
  sidebar: true,
  sidebarScroll: 0,
  contextFull: false,
  ribbon: false,
  panel: null,
};
