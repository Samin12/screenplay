// Data and state shapes for the claude-desktop replica. Everything is optional in edit.yaml: the
// plate's `data` is merged over defaults (shallow), and the scene's `state` over default state.

export type SessionStatus = 'working' | 'done' | 'waiting' | 'unread';

export type Session = {
  id: string;
  title: string;
  status?: SessionStatus;
  icon?: 'code' | 'chat' | 'none';
  children?: Session[];
  collapsed?: boolean;
};

export type Section = { name: string; sessions: Session[] };

export type Step = { text: string; status?: 'done' | 'active' | 'pending' | 'failed'; sub?: { name: string; status?: string } };

export type Message =
  | { role: 'user'; text: string; attachments?: Attachment[] } // attachments: chips above the bubble (light theme)
  | { role: 'assistant'; text: string }
  | { kind: 'activity'; text: string; open?: boolean; items?: string[] }
  | { kind: 'steps'; items: Step[] }
  | { kind: 'sessions'; text: string; open?: boolean; items: { title: string; status?: string }[] }
  | { kind: 'notice'; text: string; icon?: string }
  | { kind: 'table'; title?: string; columns: string[]; rows: { cells: string[]; bar?: number; on?: boolean; tone?: 'muted' | 'warn' | 'good' | 'bad' }[]; footer?: [string, string] }
  | { kind: 'checklist'; title: string; items: { text: string; sub?: string; status?: 'ok' | 'warn' | 'bad' | 'fixed'; note?: string }[] }
  | { kind: 'thinking'; text?: string }
  // light theme only (the dark theme skips these):
  | { kind: 'meta'; text: string; link?: string } // "Started on this computer · ai-youtube-course · Save as environment"
  | { kind: 'context'; used: string; total: string; pct: number; when?: string } // /context output card
  | { kind: 'usage'; title?: string; limits: UsageLimit[]; session?: { cells: string[]; extra?: string }; breakdown?: { model: string; rows: [string, string][] }; whats?: { range: string; scope: string; note: string; always?: [string, string]; rows: { label: string; pct: number }[] } } // /usage output card
  | { kind: 'limit'; text: string; sub?: string; on?: boolean } // usage-limit card with the "Auto-continue when limits reset" switch
  | { kind: 'code'; title?: string; text: string } // code block card (settings.json, a command)
  | { kind: 'image'; src: string; title?: string; meta?: string; w?: number; h?: number; maxH?: number } // an image Claude made (storyboard, contact sheet): file header + the picture
  | { kind: 'video'; src: string; title?: string; meta?: string; start?: number; w?: number; h?: number; maxH?: number } // a video Claude made, playing from when it appears (muted)
  | { kind: 'progress'; text: string; pct?: number; meta?: string }; // a progress card ("Rendering 4K · 480 frames"); without pct it follows state.progress (tween it)

export type Attachment = { name: string; icon?: string; meta?: string }; // a file or folder chip ("trmnl/", "SKILL.md")

export type UsageLimit = { label: string; reset: string; pct: number };

export type MenuItem = string | { label: string; key?: string; sub?: string[]; danger?: boolean; icon?: string };

export type ContextRow = { label: string; size: string; pct: string; color?: string; dotted?: boolean };

export type SettingsRow = {
  label: string;
  desc?: string;
  on?: boolean; // default switch position (light settings); state.toggles overrides
  control?: 'switch' | 'select' | 'input' | 'none';
  value?: string; // select / input value
  section?: string; // light settings: section heading this row sits under
  indent?: boolean;
};

export type ModelItem = { name: string; key?: string };

export type DesktopData = {
  theme?: 'dark' | 'light'; // light = his Claude Desktop (Code tab, light mode); default dark
  preset?: 'samin'; // samin = his real setup (sessions, ai-youtube-course, Sonnet 5.5 Medium, Ultra); implies light
  menubar?: boolean; // light: draw a macOS menu bar strip above the window
  chrome: 'mac' | 'windows';
  windowTitle?: string; // title bar text when state.active is not a known session
  stamp?: string | null; // light: amber pill in the title bar, e.g. "Recreated" (the window is rebuilt for the video)
  user: { name: string; plan: string; initial?: string };
  nav: { label: string; icon: string }[];
  pinned: Session[];
  sections: Section[];
  messages: Message[];
  chats: Record<string, Message[]>;
  model: string;
  effort: string;
  mode: string;
  placeholder: string;
  greeting: string;
  environment: { location: string; folder: string; drive?: string; branch?: string };
  changes?: { added: string; removed: string } | null; // light rail "Changes" (+3,401 −218, Create PR)
  connectorsNote?: string; // light rail: right side of "Connectors" ("3 to reconnect")
  models?: ModelItem[]; // light model menu rows
  efforts?: string[]; // light model menu: Effort submenu
  startedOn?: string; // light: "Started on this computer · <folder>" meta line under the title
  context: { pct: number; used: string; total: string; rows: ContextRow[] };
  connectors: { name: string; letter?: string; status: string }[];
  outputs: { name: string; meta: string; icon?: string }[];
  commands: { name: string; desc: string; tag?: string; hint?: string }[]; // tag: grey label in the light slash menu ("Custom command"); hint: argument hint shown after the command in the composer
  menu: MenuItem[];
  moreMenu: MenuItem[];
  settings: { nav: (string | { label: string; group?: string; icon?: string })[]; pages: Record<string, SettingsRow[]> };
  ribbon: { week: { pct: string; reset: string }; window: { pct: string; reset: string }; cache: { label: string; left: string } };
  agents: { title: string; stats: [string, string][]; running: { name: string; tier: string; model: string; effort: string; done: number; total: number; meta: string; color?: string }[]; finished: number };
};

export type DesktopState = {
  chatScroll?: number; // px the chat has scrolled (animate with the tween verb)
  tab: 'chat' | 'code';
  active: string | null;
  rail: boolean;
  remote: boolean;
  prompt: string;
  menu: null | { for: string; items?: MenuItem[]; hover?: string; placement?: 'below' | 'above' | 'right' };
  view: 'chat' | 'settings';
  settingsPage: string;
  toggles: Record<string, boolean>;
  slash: null | (string | { name: string; desc?: string; tag?: string })[];
  slashHover: string | null;
  append: Message[];
  upto: number | null;
  sidebar: boolean;
  sidebarScroll: number;
  contextFull: boolean;
  ribbon: boolean;
  panel: null | 'agents';
  // light theme
  modelMenu?: null | boolean | 'effort' | 'more'; // model menu above the model picker; 'effort' opens the Effort submenu
  modelHover?: string | null; // row highlighted in the model menu ("Haiku 5.5", "Effort", "High")
  dialog?: null | { kind: 'switch-model'; from?: string; to?: string; dontAsk?: boolean }; // "Switch model?" dialog
  userMenu?: boolean; // user menu above the sidebar footer (Settings ⌘, ...)
  settingsScroll?: number; // px the settings page scrolled
  settingsHover?: string | null; // settings row highlighted (label)
  slashTip?: boolean; // tooltip next to the highlighted slash row
  connectorsOpen?: boolean; // light rail: Connectors section expanded
  progress?: number; // 0..100: progress cards without their own pct (tween it)
};
