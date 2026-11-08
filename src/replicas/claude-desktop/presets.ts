import type { DesktopData, Message, SettingsRow } from './types';
import { defaultData } from './defaults';

// Light theme defaults and the "samin" preset.
//
// - `data.theme: light` draws the app in light mode (his Code tab look) and swaps in the real app's
//   Settings structure, model menu and slash commands. Sessions stay the fictional agency world.
// - `data.preset: samin` is HIS real setup, as in his screen recording (Nov 2026): project
//   ai-youtube-course, his session list, Sonnet 5.5 Medium, "Samin · Ultra", context 10%, 3 connectors
//   to reconnect, +3,401 −218 changes. Implies the light theme.
//
// The Settings > Claude Code rows, labels, descriptions, defaults and order come from the installed
// app bundle (Claude 4.16336.0, ion-dist.asar; see review/claude-settings-path.md in the v2 work dir).

const sessionsRows: SettingsRow[] = [
  {
    section: 'Sessions',
    label: 'Dynamic workflows',
    desc: 'Let Claude run multiple agents in parallel for complex tasks. Workflows can use a lot of your usage limit quickly.',
    on: true,
  },
  {
    section: 'Sessions',
    label: 'Prompt suggestions',
    desc: 'Show a suggested next prompt in the message box after Claude replies. Suggestions add a little to your usage.',
    on: true,
  },
  { section: 'Sessions', label: 'Summary and next steps', desc: 'Show Claude’s short summary and suggested next steps after Claude finishes. Applies to new sessions.', on: true },
  {
    section: 'Sessions',
    label: 'Switch models in Claude Code on this computer',
    desc: 'When a message is flagged, switch without asking. When off, Claude asks first, or stops if it can’t ask.',
    on: true,
  },
  {
    section: 'Sessions',
    label: 'Output style',
    desc: 'How Claude structures its responses in Code sessions. Applies to new sessions; the session menu can override it for a single session.',
    control: 'select',
    value: 'Default',
  },
  {
    section: 'Sessions',
    label: 'Allow bypass permissions mode',
    desc: 'Bypass all permission checks and let Claude work uninterrupted. See best practices for safe usage',
    on: false,
  },
  {
    section: 'Sessions',
    label: 'Keep computer awake while Claude works',
    desc: 'Prevent your computer from sleeping while a Code session is running, so long tasks can finish. Your display can still turn off.',
    on: true,
  },
  { section: 'Sessions', label: 'Keep awake on battery power', on: true, indent: true },
  {
    section: 'Sessions',
    label: 'Archive inactive sessions',
    desc: 'Automatically archive local sessions after a period of no activity.',
    control: 'select',
    value: 'Never',
  },
  { section: 'Sessions', label: 'Worktree location', desc: 'Where to store Git worktrees for isolated coding sessions on this computer.', control: 'select', value: 'Inside project' },
  { section: 'Sessions', label: 'Local sandbox', desc: 'Runs commands from Claude Code in an isolated sandbox. Applies to new sessions.', on: false },
];

const claudeCodePage: SettingsRow[] = [
  { section: 'Claude Code', label: 'Branch prefix', desc: 'Prefix added to branch names for both local and cloud sessions.', control: 'input', value: 'claude' },
  ...sessionsRows,
  { section: 'On this computer', label: 'Permission requests', desc: 'Claude needs your approval to use a tool.', control: 'select', value: 'Banners' },
  { section: 'On this computer', label: 'Questions', desc: 'Claude is asking you to choose between options.', control: 'select', value: 'Banners' },
  { section: 'On this computer', label: 'Task complete', desc: 'Claude finished and is waiting for your input.', control: 'select', value: 'Banners' },
  { section: 'On this computer', label: 'Notification sound', desc: 'Played when an OS banner is shown.', control: 'select', value: 'System sound' },
  { section: 'On this computer', label: 'Draw attention on notifications', desc: 'Bounce the Dock icon when Claude needs your attention and the app isn’t focused.', on: false },
  { section: 'Remote Control', label: 'Connect new sessions to Remote Control', on: false },
  { section: 'Pull requests', label: 'Auto-archive after PR merge or close', on: false },
  { section: 'Pull requests', label: 'Open pull requests in browser', desc: 'Open pull request links in your default browser instead of the in-app viewer.', on: false },
];

// Settings modal nav (modal layout of the app: "Preferences", "This computer", "Customize").
const lightSettings: DesktopData['settings'] = {
  nav: [
    { label: 'General', group: 'Preferences', icon: 'settings' },
    { label: 'Privacy', icon: 'shield' },
    { label: 'Billing', icon: 'credit-card' },
    { label: 'Usage', icon: 'gauge' },
    { label: 'Capabilities', icon: 'hammer' },
    { label: 'Memory', icon: 'brain' },
    { label: 'Claude Code', icon: 'code-xml' },
    { label: 'Cowork', icon: 'list-checks' },
    { label: 'Import & export', icon: 'download' },
    { label: 'Claude in Chrome', icon: 'mouse-pointer-2' },
    { label: 'System', group: 'This computer', icon: 'monitor' },
    { label: 'Extensions', icon: 'puzzle' },
    { label: 'Developer', icon: 'wrench' },
    { label: 'Plugins', group: 'Customize', icon: 'blocks' },
    { label: 'Skills', icon: 'scroll-text' },
    { label: 'Connectors', icon: 'cable' },
  ],
  pages: {
    'Claude Code': claudeCodePage,
    General: [
      { section: 'Appearance', label: 'Color mode', control: 'select', value: 'Light' },
      { section: 'Appearance', label: 'Chat font', control: 'select', value: 'Default' },
      { section: 'Notifications', label: 'Response completions', desc: 'Get notified when Claude has finished a response.', on: true },
    ],
  },
};

const lightCommands: DesktopData['commands'] = [
  { name: 'autocompact', desc: 'Show context usage or set when auto-compact runs', hint: '[auto|<tokens>]' },
  { name: 'autocompact', desc: 'Set the auto-compact window (your custom command)', tag: 'Custom command' },
  { name: 'auto-mode-setup', desc: 'Set up auto mode' },
  { name: 'gui-automation', desc: 'Drive desktop apps with screenshots and clicks' },
  { name: 'plugin-authoring', desc: 'Make a mod: a pane, a status line, a slash command or a hook' },
  { name: 'workflow-authoring', desc: 'Write a workflow script' },
  { name: 'agent-desktop-macos', desc: 'Control macOS apps' },
  { name: 'browser-use', desc: 'Drive a browser' },
  { name: 'rea:audit_residual_unknowns (MCP)', desc: 'MCP prompt' },
  { name: 'run-skill-generator', desc: 'Generate a skill' },
  { name: 'update-config', desc: 'Configure the Claude Code harness via settings.json' },
  { name: 'ytstudio', desc: 'YouTube Studio helper' },
  { name: 'context', desc: 'Show context usage' },
  { name: 'usage', desc: 'Show plan usage limits' },
  { name: 'config', desc: 'Open Claude Code settings' },
  { name: 'compact', desc: 'Summarize the conversation so far to free up context' },
  { name: 'model', desc: 'Switch the model' },
];

// Keys every light render gets (theme: light with the fictional world, or preset: samin).
export const lightData: Partial<DesktopData> = {
  theme: 'light',
  settings: lightSettings,
  commands: [...lightCommands, ...defaultData.commands.filter((c) => !lightCommands.some((l) => l.name === c.name))],
  models: [{ name: 'Opus 5.5', key: '1' }, { name: 'Fable 5.1', key: '2' }, { name: 'Sonnet 5.5', key: '3' }, { name: 'Haiku 5.5', key: '4' }],
  efforts: ['Low', 'Medium', 'High', 'Extra high', 'Max'],
  connectorsNote: '1 to authenticate',
  changes: { added: '+412', removed: '−36' },
  effort: 'Medium',
};

const hi: Message[] = [
  { kind: 'meta', text: 'Started on this computer · ai-youtube-course', link: 'Save as environment' },
  { role: 'user', text: 'hi' },
  { kind: 'notice', text: 'Claude Code notice' },
  { role: 'assistant', text: 'Hi Samin! What do you want to work on today?' },
  { kind: 'notice', text: 'Claude Code notice' },
];

// His real setup, as recorded.
export const saminData: Partial<DesktopData> = {
  ...lightData,
  preset: 'samin',
  user: { name: 'Samin', plan: 'Ultra', initial: 's' },
  pinned: [],
  sections: [
    {
      name: 'ai-youtube-course',
      sessions: [
        { id: 'new-session', title: 'New session' },
        { id: 'mcp-costs', title: 'MCP server/plugin token costs' },
        { id: 'trading-carousel', title: 'Trading carousel with Claude', status: 'unread' },
        { id: 'hermes-trader-intro', title: 'Hermes Trader intro character editing' },
        { id: 'hermes-trader', title: 'Hermes Trader and WAN 3.0 clips' },
        { id: 'multica', title: 'Multica onboarding' },
        { id: 'poppy-vault', title: 'Poppy YouTube saves vault' },
        { id: 'blotato-connect', title: 'Blotato connection' },
        { id: 'blotato', title: 'Blotato MCP integration' },
        { id: 'poppy-mcp', title: 'Poppy MCP workspace setup' },
        { id: 'sceneforge', title: 'SceneForge tips video editing' },
        { id: 'ai-course', title: 'AI YouTube course setup' },
        { id: 'ai-course-2', title: 'AI YouTube course setup' },
      ],
    },
  ],
  messages: hi,
  chats: { 'new-session': hi },
  model: 'Sonnet 5.5',
  effort: 'Medium',
  mode: 'Auto',
  placeholder: 'Type / for commands',
  greeting: 'Evening, Samin',
  environment: { location: 'This computer', folder: 'ai-youtube-course', drive: '~/Documents', branch: 'main' },
  startedOn: 'Started on this computer · ai-youtube-course',
  context: {
    pct: 10,
    used: '101.8k',
    total: '1M',
    rows: [
      { label: 'Messages', size: '25.4k', pct: '2.5%', color: '#207bdf' },
      { label: 'Memory files', size: '16.1k', pct: '1.6%', color: '#f0712f', dotted: true },
      { label: 'System tools', size: '13.2k', pct: '1.3%', color: '#01b790' },
      { label: 'MCP tools', size: '8.1k', pct: '0.8%', color: '#f2a400', dotted: true },
      { label: 'Skills', size: '18.9k', pct: '1.9%', color: '#858585', dotted: true },
      { label: 'System prompt', size: '20.1k', pct: '2.0%', color: '#c1c1c1' },
      { label: 'Free space', size: '898.2k', pct: '89.8%', color: '#ececec' },
    ],
  },
  connectors: [
    { name: 'Gmail', letter: 'G', status: 'Reconnect' },
    { name: 'Google Drive', letter: 'D', status: 'Reconnect' },
    { name: 'Notion', letter: 'N', status: 'Reconnect' },
  ],
  connectorsNote: '3 to reconnect',
  changes: { added: '+3,401', removed: '−218' },
};

// Resolve the scene's `data:` into full data (engine hook `resolveData`): defaults, then the light
// layer or the samin preset, then the scene's own keys. Idempotent.
export const resolveDesktopData = (raw: Record<string, any> | undefined): DesktopData => {
  const r = raw ?? {};
  const layer = r.preset === 'samin' ? saminData : r.theme === 'light' ? lightData : {};
  return { ...defaultData, ...layer, ...r } as DesktopData;
};
