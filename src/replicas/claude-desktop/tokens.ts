// Claude desktop (dark) palette, sampled from the reference at 1:1,
// and the layout grid. The UI is drawn at ~1.5x real size so body text is ~23-24 px on a 1920x1080 plate.

export const C = {
  bg: '#181818', // main pane + title bar + rail
  side: '#1f1f1f', // left sidebar
  sideLine: '#2c2c2c', // sidebar right edge
  titleLine: '#252525', // under the title bar
  sel: '#3d3d3d', // selected sidebar row
  hover: '#2c2c2c', // hovered row / icon button
  press: '#474747',
  bubble: '#2a2a2a', // user message
  composer: '#303030',
  composerLine: '#3a3a3a',
  card: '#181818', // rail cards / step cards (same as bg, drawn with a hairline)
  cardLine: '#272727',
  cardLineHi: '#2f2f2f',
  menu: '#262626',
  menuLine: '#363636',
  menuSep: '#373737',
  menuHover: '#333333',
  shortcut: '#6a6a6a',
  modal: '#202020',
  text: '#ececec',
  textHi: '#f7f7f7',
  dim: '#a1a1a1',
  faint: '#717171',
  track: '#2c2c2c',
  chip: '#262626',
  red: '#e4605f',
  amber: '#e0a43c',
  green: '#61bf6e',
  blue: '#5b9be0',
  toggle: '#4d79d3',
  accent: '#d97757', // Claude orange: logo, send button, a few active marks only
  legend: { messages: '#5e8bdc', memory: '#c46839', system: '#5faf8a', mcp: '#ba923b', other: '#a0a0a0', free: '#3a3a3a' },
};

export const L = {
  W: 1920,
  H: 1080,
  titleH: 60,
  sideW: 364,
  railW: 492,
  colMax: 1288, // composer width when the main pane is wide
  colPad: 42, // min side padding of the chat column
  body: 23, // body text
  small: 21,
  tiny: 19,
  section: 20,
};
