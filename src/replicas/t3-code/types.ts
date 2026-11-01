export type BadgeColor = 'green' | 'amber' | 'blue' | 'violet' | 'pink';

export type Project = {
  id: string;
  name: string;
  badge?: string; // 2-letter badge ("BP"); omitted when `icon` is set
  color?: BadgeColor;
  icon?: string; // lucide icon on a white tile (agent-style projects, e.g. "Hermes")
};

export type Thread = {
  id: string;
  title: string;
  project: string; // project id
  time: string; // "22h", "7m", "1d"
  pinned?: boolean;
  agent?: 'claude' | 'codex' | 'other';
  agentTag?: string; // tiny tag under the agent glyph ("C2", "HE")
  branches?: number; // worktree/branch count (purple)
  editing?: boolean; // unsent draft: pencil + amber tint
  settled?: boolean; // listed under "Settled"
};

export type Message =
  | { role: 'user'; text: string; more?: boolean } // more: "Show full message"
  | { role: 'assistant'; text: string } // \n\n paragraphs, `code`, **bold**, [[target|text]]
  | { kind: 'worked'; text: string } // "Worked for 50m 9s ›" + hairline
  | { kind: 'video'; poster?: string; video?: string; videoStart?: number; duration: string; time?: string; progress?: number; tall?: boolean }
  | { kind: 'code'; label?: string; lines: string[] }
  | { kind: 'meta'; text: string }; // copy icon + timestamp

export type T3Data = {
  appName: string;
  projects: Project[];
  threads: Thread[];
  messages: Message[]; // chat of the active thread (unless `chats` has it)
  chats: Record<string, Message[]>;
  model: string;
  modelTag: string;
  mode: string;
  access: string;
  placeholder: string;
  gitLabel: string;
};

export type T3State = {
  active: string | null;
  scroll: number; // chat scrolled down by px
  prompt: string;
  upto: number | null;
  append: Message[];
  scrollPill: boolean; // "Scroll to end" pill above the composer
};
