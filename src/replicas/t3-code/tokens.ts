// T3 Code (dark) palette and layout grid, measured from Samin's 3470x2454 screen recording
// (Borumi bundle "6 usecases raw", recording 7f2d6884) and scaled by 0.51 so body text is ~23 px on
// a 1920x1080 plate (the recording itself is a zoomed UI, so this keeps the real proportions).

export const C = {
  side: '#000000', // sidebar (pure black)
  sideLine: '#1a1a1a', // sidebar right edge
  main: '#0a0a0a', // chat pane
  header: '#080808',
  sel: '#1c1c1c', // selected thread row
  hover: '#121212',
  editing: '#0a0600', // row with an unsent draft (amber tint)
  text: '#cccccc', // assistant prose
  textHi: '#ffffff', // header title, user text, code
  selText: '#e2e2e5', // selected thread title
  muted: '#868686', // project names, times, "Worked for", crumbs
  dim: '#696969', // composer placeholder
  faint: '#656565', // composer footer pickers
  bubble: '#111111', // user message
  bubbleLine: '#191919',
  code: '#0d0d0d',
  codeLine: '#1a1a1a',
  inline: '#161616',
  composer: '#121212',
  composerLine: '#1c1c1c',
  tray: '#0f0f0f',
  btnLine: '#222222',
  send: '#284a9f',
  purple: '#b0a0ed', // branch counts
  claude: '#c8613f', // Claude starburst in rows and the model picker
  green: { bg: '#0a200d', fg: '#2bd46a' },
  amber: { bg: '#261b00', fg: '#f7c904' },
  blue: { bg: '#0b1630', fg: '#5b9be0' },
  violet: { bg: '#1a1030', fg: '#b0a0ed' },
  pink: { bg: '#2a0d1c', fg: '#f472b6' },
  marker: 'rgba(244,97,28,0.32)',
};

export const L = {
  W: 1920,
  H: 1080,
  barH: 80, // shared title bar height (traffic lights / breadcrumb row)
  sideW: 410,
  searchY: 121, // centre of the Search row
  rowTop0: 163, // top of the first thread row box
  rowH: 121,
  rowPitch: 134,
  footerH: 64,
  colMax: 1240, // chat column max width
  composerH: 80,
  trayH: 50,
  composerBottom: 32, // tray bottom margin
  body: 23,
  small: 20,
  mono: 20,
};
