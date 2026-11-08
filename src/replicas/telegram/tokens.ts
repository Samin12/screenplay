// Telegram Desktop, Tinted Night theme. Colours sampled from Samin's screen recording; every size is
// the real size in points (his window at 1806 pt across the recording) times PT.

export const PT = 1.6; // body text 14 pt -> 22 px, the panel look's minimum
export const pt = (n: number) => Math.round(n * PT);
export const fs = (n: number) => n * PT; // font sizes stay unrounded so line widths and wraps match his

// Telegram Desktop's bundled face. Registered in src/theme/fonts.ts.
export const FONT_TG = '"Open Sans", "Inter", system-ui, sans-serif';
export const FONT_IOS = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif';

export const C = {
  titleBar: '#222d38',
  titleText: '#b9c2cb',
  window: '#131e29', // sidebar, header, topic bar, composer
  main: '#0a131f',
  line: '#05101b',
  bubble: '#14232f',
  out: '#275076',
  selected: '#275076',
  search: '#222d3a',
  pill: '#1e2d3b',
  text: '#ffffff',
  muted: '#7a8c9f', // topic tabs, "258 messages"
  rowMuted: '#8b99a8', // sidebar previews and times
  icon: '#707b86',
  pin: '#4d5d6c',
  pinSelected: '#8fb6d8',
  placeholder: '#53616c',
  time: '#6a7886',
  outTime: '#7da8d3',
  tick: '#72bcfd',
  name: '#f9548f',
  adminText: '#529967',
  adminBg: '#1f3435',
  stampText: '#e3b860',
  stampBg: '#3b3222',
  active: '#64adee', // active topic, typing status
  underline: '#4881b7',
  link: '#65b2ed',
  cardBg: '#30293c',
  cardBar: '#f0528a',
  cardName: '#ff5491',
  badge: '#3c82be',
  badgeMuted: '#3a4f60',
  jump: '#192836',
  thumb: '#222731',
  backdrop: '#161514', // behind the phone
};

export const L = {
  titleBar: pt(22),
  header: pt(58),
  topics: pt(39),
  composer: pt(50),
  sidebar: pt(351),
  sidebarShare: 0.3, // share of a narrow plate (the panel) the sidebar may take
  row: pt(68),
  rowForum: pt(88),
  rowAvatar: pt(51),
};

// Sizes of the message list, the one part both views share.
export type Metrics = {
  font: string;
  size: number;
  line: number;
  nameWeight: number;
  small: number;
  tag: number;
  padX: number;
  padTop: number;
  padBottom: number;
  radius: number;
  tail: number;
  avatar: number;
  avatarX: number;
  bubbleX: number;
  bubbleMax: number;
  outRight: number;
  gap: number;
  groupGap: number;
  listPad: number;
  pillH: number;
  pillSize: number;
};

export const DESKTOP: Metrics = {
  font: FONT_TG,
  size: fs(14),
  line: pt(19),
  nameWeight: 600,
  small: fs(14),
  tag: fs(14),
  padX: pt(12),
  padTop: pt(7),
  padBottom: pt(8),
  radius: pt(13),
  tail: pt(9),
  avatar: pt(37),
  avatarX: pt(14),
  bubbleX: pt(62),
  bubbleMax: pt(472),
  outRight: pt(26),
  gap: pt(10),
  groupGap: pt(2),
  listPad: pt(8),
  pillH: pt(25),
  pillSize: fs(14),
};

export const PHONE: Metrics = {
  font: FONT_IOS,
  size: 22,
  line: 29,
  nameWeight: 600,
  small: 15,
  tag: 15,
  padX: 16,
  padTop: 9,
  padBottom: 9,
  radius: 22,
  tail: 11,
  avatar: 44,
  avatarX: 8,
  bubbleX: 62,
  bubbleMax: 394,
  outRight: 12,
  gap: 12,
  groupGap: 3,
  listPad: 12,
  pillH: 32,
  pillSize: 17,
};
