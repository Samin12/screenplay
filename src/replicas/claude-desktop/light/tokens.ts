// Claude Desktop, light mode, Code tab: Samin's own setup ("samin" look), measured from his screen
// recording (3612x2648 retina stills, app zoomed in). Scale: his window (3724 retina px wide incl.
// ~52 px off-screen on the left) fills the 1920 plate, so 1 design px = 1.94 retina px and the UI
// sits at the same size as his screen shown full-width. The plate is 16:9, so the window is shorter
// than his (fewer sidebar rows, less empty chat), everything else lines up.
//
// Type: SF Pro (BlinkMacSystemFont resolves to SF in Chrome on macOS; Inter elsewhere). His app is
// zoomed, so glyphs carry 15 px tracking at ~23 px: font sizes match his cap heights and a small
// positive letter-spacing (0.022em) matches his line widths (both within ~2%).

export const FONT_SF = 'BlinkMacSystemFont, "Inter", system-ui, sans-serif';
export const FONT_SF_MONO = 'ui-monospace, "SF Mono", Menlo, "JetBrains Mono", monospace';
export const TRACK = '0.022em';

export const LC = {
  bg: '#fdfdfd', // main pane, title bar, rail, cards
  white: '#ffffff', // composer
  text: '#141414', // primary text (his darkest glyph pixels sit at #050505-#141414)
  dim: '#6a6a6a', // secondary text (his #515151 glyph cores read as #6a6a6a at video size): meta line, notices, "Medium", "~/Documents", usage labels
  faint: '#777777', // composer placeholder
  line: '#dddddd', // title bar bottom hairline
  sideLine: '#d2d2d2', // sidebar right edge
  railLine: '#e2e2e2', // rail left edge
  divider: '#ececec', // rail section dividers (his #f0f0f0 at 2x reads lighter at 1x)
  rule: '#d4d4d4', // usage card table rules
  cardLine: '#e9e9e9', // context / usage card border
  sel: '#d2d2d2', // selected sidebar row
  hover: 'rgba(0,0,0,0.05)', // hovered row / icon button (alpha-1)
  press: 'rgba(0,0,0,0.10)', // pressed (alpha-2)
  btn: '#f0f0f0', // Create PR, Cancel
  btnSel: '#e5e5e5', // active title-bar button (rail toggle while the rail is open)
  bubble: '#f2f2f2', // user message
  menu: '#fdfdfd',
  menuLine: '#d6d6d6',
  menuHover: '#e4e4e4', // highlighted slash row
  pickerOn: '#e1e1e1', // model picker while its menu is open
  sep: '#e8e8e8', // menu separators
  blue: '#2a78d6', // switch on, checks, bars (cds blue-450)
  barBlue: '#207bdf', // usage / context bar fill as rendered
  barTrackBlue: '#e5eefa', // usage bar track when it has a fill
  barTrack: '#f0f0f0', // empty usage bar
  track: '#e6e6e6', // context mini bar track
  cmdSlash: '#7f9fcc', // "/" of a slash command in a bubble
  cmd: '#2160b5', // slash command name in a bubble / composer
  green: '#1b8a32',
  red: '#c0163b',
  pill: '#e5eefa', // "Buy credits"
  pillText: '#1d5fb8',
  switchOff: '#e3e3e3', // switch track off (neutral-900 at 10% over white)
  scrim: 'rgba(0,0,0,0.40)', // modal backdrop (his #fdfdfd -> #979797)
  primaryBtn: '#777777', // "Switch model" (as recorded)
  tip: '#0a0a0a', // black tooltip
  legend: { messages: '#207bdf', memory: '#f0712f', system: '#01b790', mcp: '#f2a400', skills: '#858585', other: '#c1c1c1', free: '#ececec' },
};

// Vibrancy sidebar: his wallpaper shows through, bluish at the top fading to warm grey.
export const SIDEBAR_BG =
  'linear-gradient(180deg, #d3dff4 0px, #dee7f3 46px, #e1e7f2 90px, #e4e8f0 140px, #e7e9ed 200px, #e9e9ec 260px, #ebebeb 380px, #ebebeb 860px, #e9e8e8 960px, #e8e6e7 1030px, #e6e2e3 1080px)';

export const LL = {
  titleH: 72,
  sideW: 414, // incl. the 1 px right edge
  railW: 521,
  // sidebar
  navTop: 106, // centre of the first nav row
  pitch: 55.3, // row pitch (nav and sessions)
  rowH: 52,
  rowX: 14, // selected pill inset
  textX: 32, // session text x
  footerH: 81,
  // chat column
  colPad: 77, // main pane edge -> chat column
  colMax: 1198, // his column max width at his zoom (measured without the rail)
  composerOut: 26, // composer is wider than the column by this on each side
  composerH: 74,
  composerBottom: 66, // window bottom -> composer bottom
  modelRowY: 34.5, // window bottom -> model line centre
  // rail
  railPadL: 28,
  railPadR: 27,
};

// Font sizes (design px), from his cap heights + line widths.
export const FS = {
  row: 23, // sidebar rows, nav, title, rail rows, menus
  chat: 24.6, // messages, composer
  small: 21.3, // rail headers, model line, secondary meta, usage labels
  header: 20.4, // sidebar project header
  tiny: 18.9, // "· Ultra", "Buy credits"
  meta: 21.3, // "Started on this computer ..."
};
