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
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string }
  | { kind: 'activity'; text: string; open?: boolean; items?: string[] }
  | { kind: 'steps'; items: Step[] }
  | { kind: 'sessions'; text: string; open?: boolean; items: { title: string; status?: string }[] }
  | { kind: 'notice'; text: string; icon?: string }
  | { kind: 'table'; title?: string; columns: string[]; rows: { cells: string[]; bar?: number; on?: boolean; tone?: 'muted' | 'warn' | 'good' | 'bad' }[]; footer?: [string, string] }
  | { kind: 'checklist'; title: string; items: { text: string; sub?: string; status?: 'ok' | 'warn' | 'bad' | 'fixed'; note?: string }[] }
  | { kind: 'thinking'; text?: string };

export type MenuItem = string | { label: string; key?: string; sub?: string[]; danger?: boolean; icon?: string };

export type ContextRow = { label: string; size: string; pct: string; color?: string; dotted?: boolean };

export type DesktopData = {
  chrome: 'mac' | 'windows';
  windowTitle?: string; // title bar text when state.active is not a known session
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
  environment: { location: string; folder: string; drive?: string };
  context: { pct: number; used: string; total: string; rows: ContextRow[] };
  connectors: { name: string; letter?: string; status: string }[];
  outputs: { name: string; meta: string; icon?: string }[];
  commands: { name: string; desc: string }[];
  menu: MenuItem[];
  moreMenu: MenuItem[];
  settings: { nav: string[]; pages: Record<string, { label: string; desc?: string }[]> };
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
  slash: null | (string | { name: string; desc?: string })[];
  slashHover: string | null;
  append: Message[];
  upto: number | null;
  sidebar: boolean;
  sidebarScroll: number;
  contextFull: boolean;
  ribbon: boolean;
  panel: null | 'agents';
};
