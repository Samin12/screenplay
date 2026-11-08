// OpenUsage (light, macOS menu-bar panel). Palette and grid measured from Samin's 3612x2648 Retina
// capture of OpenUsage 0.7.16 (media/screen/openusage.png and the raw screen recording at 16-45 s).
// K = 1.62 px per macOS point: the 320 pt panel is 518 px wide, metric names ~22 px, and the panel
// still shows the Total Spend card plus the whole first account card (down to Usage Trend) above
// the footer on a 1080-high plate.

export const K = 1.62; // px per macOS point
export const pt = (n: number) => Math.round(n * K * 10) / 10;
// sizes first tuned at 1.75 px/pt (Inter vs SF widths), rescaled to K
export const px = (n: number) => Math.round(n * (K / 1.75) * 10) / 10;

export const C = {
  // desktop + menu bar (his wallpaper tints the translucent menu bar blue)
  wallTop: '#1d4280',
  wallBottom: '#6d9bd8',
  menubar: 'rgba(29,66,128,0.78)',
  menuText: '#ffffff',
  stripPill: 'rgba(255,255,255,0.17)',
  // panel
  panel: '#fdfdfd',
  panelEdge: 'rgba(0,0,0,0.30)',
  card: '#f6f6f6',
  cardLine: 'rgba(0,0,0,0.022)',
  capsule: '#ebebeb',
  thumb: '#fefefe',
  track: '#dedede',
  hair: 'rgba(0,0,0,0.08)',
  text: '#131313',
  secondary: '#6d6d6d',
  tertiary: '#aeaeae',
  icon: '#717171',
  blue: '#0a84fd', // meters, sparkline (systemBlue as captured)
  accent: '#0a7aff', // buttons, switches, back chevron, selection
  yellow: '#ff9f0a',
  red: '#ff3b30',
  flame: '#ff5b4f',
  footerBg: 'rgba(250,250,250,0.92)',
  // menus and sheets
  menu: 'rgba(246,246,246,0.97)',
  menuLine: 'rgba(0,0,0,0.12)',
  menuSel: '#2f80f7',
  sheet: '#fbfbfb',
  field: '#ffffff',
  button: '#ffffff',
  // provider colours in the Total Spend ring (Claude terracotta, OpenAI green ... as captured)
  provider: {
    claude: '#d97650',
    claude2: '#9c8458',
    claude3: '#c9a27a',
    codex: '#10a37f',
    cursor: '#1d1d1f',
    grok: '#8e8e93',
    opencode: '#5a5a5f',
    antigravity: '#4285f4',
    copilot: '#6e40c9',
  } as Record<string, string>,
};

// Layout grid in px (macOS points x 1.75).
export const L = {
  menuH: px(52), // menu bar height (60 px on his 2x capture)
  panelW: pt(320), // 560
  margin: pt(14), // panel side margin = card inset
  cardR: pt(12), // card corner radius
  panelR: pt(13),
  cardPad: pt(14),
  // metric block: label 17 pt line, 4 pt, 5 pt bar, 3.5 pt, 16 pt sub line; blocks 64 pt apart
  labelLine: pt(17),
  barGapTop: pt(4),
  barH: pt(5),
  barGapBottom: pt(3.5),
  subLine: pt(16),
  blockGap: pt(18.5),
  // type (pt x 1.75; Inter reads a touch wider than SF so a few sizes are trimmed)
  fLabel: px(23.5), // 14 pt semibold metric names
  fSub: px(22), // 13 pt values, resets
  fHeader: px(25.5), // 15 pt bold account header
  fPlan: px(20.5), // 12 pt plan
  fSmall: px(19), // 11 pt footer
  fMenu: px(22.5), // 13 pt menu bar / menus
  footerH: pt(50),
  topBarH: pt(44), // Accounts / Settings navigation bar
  rowH: pt(40), // list row (22 pt + 9 pt padding x 2)
};
