import type { OUData, OUState } from './types';

// Defaults follow Samin's own OpenUsage 0.7.16 panel (his displayed numbers: $10.5K over 30 days,
// Claude $7,447.93 / $2,041.94, Codex $699.08, Grok $337.93, one Claude weekly limit reached) with
// fictional account names in place of his emails. Today / Yesterday figures are fictional.

const trendWork = [1, 1, 1, 1, 1, 6, 5, 3, 1, 4, 1, 3, 6, 8, 7, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 7, 2, 1, 1];
const trendHome = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 6, 2, 1, 1, 1, 1, 1, 1];
const trendCodex = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 9, 1, 3, 1];
const trendGrok = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 6, 2, 1, 1, 1, 1, 1];

export const defaultData: OUData = {
  appName: 'OpenUsage',
  version: '0.7.16',
  nextUpdate: 'Next update in 5m',
  footer: 'options',
  activeApp: 'Finder',
  appMenus: ['File', 'Edit', 'View', 'Go', 'Window', 'Help'],
  clock: 'Tue Nov 3  6:56 PM',
  desktop: {},
  strip: [
    { provider: 'claude', values: ['0%'], account: 'claude-work' },
    { provider: 'claude', values: ['93%'], account: 'claude-personal' },
    { provider: 'claude', values: ['96%', '88%'], account: 'claude-team' },
    { provider: 'codex', values: ['20%'], account: 'codex' },
    { provider: 'cursor', values: ['93%', '100%'], account: 'cursor' },
  ],
  costTitle: 'Cost',
  accounts: [
    {
      id: 'claude-work',
      provider: 'claude',
      label: 'you@work.com',
      plan: 'Max 20x',
      metrics: [
        { label: 'Session', left: null },
        { label: 'Weekly', left: 0, resets: 'Resets in 18h 45m', note: 'Limit reached', flame: true, tone: 'red' },
        { label: 'Fable', left: 100, resets: 'Resets in 18h 45m' },
        { label: 'Extra Usage', left: null },
        { kind: 'trend', bars: trendWork },
      ],
      more: [
        { kind: 'value', label: 'Today', value: '$212.40 · 148.2M tokens' },
        { kind: 'value', label: 'Yesterday', value: '$389.17 · 276.5M tokens' },
        { kind: 'value', label: 'Last 30 Days', value: '$7.45K · 5.1B tokens' },
      ],
      links: ['Status', 'Usage'],
      spend: { today: 212.4, yesterday: 389.17, '30-days': 7447.93 },
    },
    {
      id: 'claude-personal',
      provider: 'claude',
      label: 'Personal',
      title: 'Claude: Personal',
      plan: 'Max 20x',
      metrics: [
        { label: 'Session', left: null },
        { label: 'Weekly', left: 93, resets: 'Resets in 4d 22h' },
        { label: 'Fable', left: 100, resets: 'Resets in 4d 22h' },
        { label: 'Extra Usage', left: null },
        { kind: 'trend', bars: trendHome },
      ],
      more: [
        { kind: 'value', label: 'Today', value: '$61.85 · 41.0M tokens' },
        { kind: 'value', label: 'Yesterday', value: '$88.02 · 63.7M tokens' },
        { kind: 'value', label: 'Last 30 Days', value: '$2.04K · 1.4B tokens' },
      ],
      spend: { today: 61.85, yesterday: 88.02, '30-days': 2041.94 },
    },
    {
      id: 'claude-team',
      provider: 'claude',
      label: 'team@studio.com',
      title: 'Claude: team@studio.com',
      plan: 'Max 20x',
      metrics: [
        { label: 'Session', left: 96, resets: 'Resets in 1h 25m' },
        { label: 'Weekly', left: 88, resets: 'Resets in 3d 17h' },
        { label: 'Fable', left: 100, resets: 'Resets in 3d 17h' },
        { label: 'Extra Usage', left: null },
        { kind: 'trend', bars: null },
      ],
    },
    {
      id: 'codex',
      provider: 'codex',
      plan: 'Pro 200',
      metrics: [
        { label: 'Session', left: null },
        { label: 'Weekly', left: 20, resets: 'Resets in 11h 30m' },
        { kind: 'trend', bars: trendCodex },
      ],
      more: [
        { kind: 'value', label: 'Today', value: '$31.20 · 22.4M tokens' },
        { kind: 'value', label: 'Yesterday', value: '$27.64 · 19.9M tokens' },
        { kind: 'value', label: 'Last 30 Days', value: '$699.08 · 512M tokens' },
      ],
      spend: { today: 31.2, yesterday: 27.64, '30-days': 699.08 },
    },
    {
      id: 'cursor',
      provider: 'cursor',
      plan: 'Ultra',
      metrics: [
        { label: 'Total Usage', left: 93, resets: 'Resets in 2d 23h' },
        { label: 'Cursor Models', left: 93, resets: 'Resets in 2d 23h' },
        { label: 'Other Models', left: 100, resets: 'Resets in 2d 23h' },
        { kind: 'trend', bars: null },
      ],
      more: [
        { kind: 'value', label: 'Today', value: null },
        { kind: 'value', label: 'Yesterday', value: null },
        { kind: 'value', label: 'Last 30 Days', value: null },
      ],
    },
    {
      id: 'grok',
      provider: 'grok',
      plan: 'SuperGrok Heavy',
      metrics: [
        { label: 'Weekly', left: 93, resets: 'Resets in 2d 23h' },
        { kind: 'trend', bars: trendGrok },
      ],
      more: [
        { kind: 'value', label: 'Extra Usage', value: 'Disabled' },
        { kind: 'value', label: 'Today', value: null },
        { kind: 'value', label: 'Yesterday', value: '$0.53 · 218.1K tokens' },
        { kind: 'value', label: 'Last 30 Days', value: '$337.93 · 490M tokens' },
      ],
      links: ['Usage'],
      spend: { yesterday: 0.53, '30-days': 337.93 },
    },
  ],
  // Add Account picker, in the app's order (ProviderKind.allCases + CLIProxyAPI). The new picker
  // names the OpenAI provider "ChatGPT"; 0.7.16's dashboard calls it Codex.
  providers: [
    { id: 'claude', name: 'Claude' },
    { id: 'codex', name: 'ChatGPT' },
    { id: 'cursor', name: 'Cursor' },
    { id: 'antigravity', name: 'Antigravity' },
    { id: 'copilot', name: 'Copilot' },
    { id: 'devin', name: 'Devin' },
    { id: 'grok', name: 'Grok' },
    { id: 'ollama', name: 'Ollama' },
    { id: 'opencode', name: 'OpenCode' },
    { id: 'openrouter', name: 'OpenRouter' },
    { id: 'zai', name: 'Z.ai' },
    { id: 'cliproxyapi', name: 'CLIProxyAPI' },
  ],
  optionsMenu: [
    { label: 'Accounts', icon: 'circle-user-round', key: '↩' },
    { label: 'Settings', icon: 'settings', key: '⌘,' },
    '-',
    { label: 'Check for Updates…', icon: 'refresh-cw' },
    '-',
    { label: 'Report an Issue…', icon: 'bug' },
    { label: 'About OpenUsage', icon: 'info' },
    { label: 'Quit OpenUsage', icon: 'power', key: '⌘Q' },
  ],
  statusMenu: [{ label: 'Settings', key: '⌘,' }, '-', { label: 'Quit OpenUsage', key: '⌘Q' }],
  deviceCode: 'KQ7M-4XTB',
};

export const defaultState: OUState = {
  open: true,
  view: 'popup',
  tab: '30-days',
  menu: null,
  menuHover: null,
  accounts: null,
  account: null,
  expanded: [],
  scroll: 0,
  scrollTo: null,
  sheet: null,
  provider: null,
  pickHover: null,
  signin: 'waiting',
  code: '',
  settingsTab: 'general',
  toggles: { 'launch-at-login': true, 'check-automatically': true },
};
