export type CostTab = 'today' | 'yesterday' | '30-days';

// A row on an account card.
export type Metric =
  // limit with a bar: left = % left (null = "No data": empty track, "—" / "No data")
  | {
      kind?: 'limit';
      label: string;
      left?: number | null;
      resets?: string; // "Resets in 18h 45m"
      note?: string; // right of the name: "Limit reached", "Limit in 3h 5m", "~22% left at reset"
      flame?: boolean; // red flame before the note (limit reached / will run out)
      tone?: 'blue' | 'yellow' | 'red'; // bar colour (default blue)
      tick?: number; // even-pace tick on the bar, % of the track from the left
    }
  // 30-day token bar chart ("Usage Trend"); bars null = "No data"
  | { kind: 'trend'; label?: string; bars?: number[] | null }
  // one-line value: "Today  $49.85 · 35.8M tokens", "Extra Usage  Disabled"
  | { kind: 'value'; label: string; value?: string | null };

export type Account = {
  id: string; // e.g. "claude-work"; targets account-<id>, limit-<id>-<slug>, trend-<id>
  provider: string; // claude | codex | cursor | grok | antigravity | copilot | devin | ollama | opencode | openrouter | zai
  label?: string; // account name beside the provider ("you@work.com", "Personal")
  title?: string; // dashboard header override (default "Claude — <label>" or the provider name)
  legend?: string; // name in the Total Spend legend (default = title; truncates like the app)
  plan?: string; // "Max 20x", "Pro 200", "Ultra"
  color?: string; // ring colour (default by provider)
  metrics: Metric[]; // Always Visible rows
  more?: Metric[]; // On Demand rows behind the caret (Today / Yesterday / Last 30 Days ...)
  links?: string[]; // quick-link buttons at the bottom of the open card ("Usage")
  spend?: Partial<Record<CostTab, number>>; // dollars, for the Total Spend ring
};

export type StripItem = { provider: string; values: string[]; account?: string }; // 1 value, or 2 stacked

export type MenuItem = '-' | { label: string; icon?: string; key?: string; danger?: boolean; disabled?: boolean };

export type OUData = {
  appName: string;
  version: string; // "0.7.16"
  nextUpdate: string; // "Next update in 5m"
  footer: 'options' | 'ellipsis'; // 0.7.16 "Options ⌄" pill (his) or the newer round "⋯" button
  activeApp: string; // bold app name in the menu bar
  appMenus: string[];
  clock: string;
  desktop: { image?: string }; // a screenshot (work-dir path) drawn under the menu bar instead of the wallpaper
  strip: StripItem[]; // OpenUsage's menu-bar strip
  costTitle: string; // "Cost"
  accounts: Account[];
  providers: { id: string; name: string }[]; // Add Account picker, in the app's order
  optionsMenu: MenuItem[];
  statusMenu: MenuItem[]; // right-click on the menu-bar strip
  deviceCode: string; // Copilot / Grok device-code sign-in
};

export type OUState = {
  open: boolean;
  view: 'popup' | 'accounts' | 'account' | 'settings';
  tab: CostTab;
  menu: null | 'options' | 'status';
  menuHover: string | null; // slug of the highlighted menu item
  accounts: string[] | null; // ids of the accounts added (null = every account in data)
  account: string | null; // account page (view 'account')
  expanded: string[]; // account cards with their caret open
  scroll: number; // dashboard scroll, px
  scrollTo: string | null; // account id: scroll the dashboard so that account's section is at the top (wins over scroll)
  sheet: null | 'add' | 'signin';
  provider: string | null; // provider being signed in to (sheet 'signin')
  pickHover: string | null; // highlighted provider row in the Add Account list
  signin: 'preparing' | 'waiting' | 'signing' | 'error';
  code: string; // pasted code / API key (type with key: code)
  settingsTab: 'general' | 'display' | 'alerts' | 'advanced';
  toggles: Record<string, boolean>; // settings switches by slug
};
