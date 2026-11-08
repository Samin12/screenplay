import type { TelegramData, TelegramState, TgMessage } from './types';

// Demo content for "Hermes Trader". The daily check is his bot's real Aug 9 message, re-dated; the rest
// is written for the video in the bot's style, and the two marked `illustrative` are the hook ("before the
// vote, my bot literally told me this"). No invented returns. Every bot bubble carries the "Recreated"
// stamp. Topic and chat names are fictional (not his real topics) and links point nowhere real.

const SIGN_OFF = 'Everything can go to zero. Not financial advice.';

const messages: TgMessage[] = [
  {
    id: 'daily',
    from: 'bot',
    date: 'October 26',
    time: '9:00 AM',
    title: 'WATCH/NO TRADE',
    text: [
      '9am ET Alpaca paper portfolio check complete for Monday, Oct 26.',
      '',
      'Sources checked: 3 new research emails, Alpaca paper account/positions/open orders, market clock, latest quotes, trade journal, [STRATEGY.md](https://example.com/strategy), and triggers.json.',
      '',
      'Portfolio and guardrails:',
      '• Equity $14,519.60; cash $1,533.57 (10.56%), only $81.61 above the 10% floor.',
      '• Paper account ACTIVE and unblocked; 11 positions; 0 open orders.',
      '• GOOGL 20.63%, NVDA 18.77%, AVGO 11.48%, and PLTR 10.37% remain above the 10% single-name cap.',
      '',
      'Action: no order placed. None of the new emails is a TRADE_ALERT, and cash/concentration guardrails block a new add.',
      '',
      SIGN_OFF,
    ].join('\n'),
    card: { site: 'GitHub', title: 'hermes-trader/analysis/check-log.md at main' },
  },
  { id: 'tsla-ask', from: 'me', date: 'October 28', time: '6:42 PM', text: "Don't touch TSLA again, I don't like it.", status: 'read' },
  { id: 'tsla-reply', from: 'bot', time: '6:42 PM', text: 'Got it. TSLA is off the list.', reactions: [{ emoji: '👍', count: 1 }] },
  {
    id: 'friday',
    from: 'bot',
    date: 'October 30',
    time: '4:30 PM',
    title: 'FRIDAY REVIEW',
    text: [
      "Reviewed this week's paper trades.",
      '',
      "What hurt: copying a politician's trade reported 3 weeks late. The move was already over.",
      '',
      'Rule update: only copy trades reported in the last 7 days.',
      '',
      SIGN_OFF,
    ].join('\n'),
    card: { site: 'Dashboard', title: 'Hermes portfolio dashboard', desc: 'Positions, trade journal and weekly returns' },
  },
  {
    id: 'risk',
    from: 'bot',
    illustrative: true,
    date: 'November 2',
    time: '9:00 AM',
    title: 'RISK CHECK: midterms tomorrow',
    text: [
      'Polls point to Congress flipping. Expect big swings, most of all in AI and chip names.',
      '',
      'Action: trimmed NVDA and AVGO, moved more of the account into cash.',
      '',
      'Why: protect gains before the vote. We can buy back after.',
      '',
      SIGN_OFF,
    ].join('\n'),
  },
  {
    id: 'update',
    from: 'bot',
    illustrative: true,
    date: 'November 5',
    time: '4:12 PM',
    title: 'UPDATE: AI and chips sold off',
    text: ['AI and chip stocks fell hard today.', '', 'Our extra cash sat out most of the drop.', '', 'Watching for re-entry. No new orders.'].join('\n'),
  },
];

export const defaultData: TelegramData = {
  group: { title: 'Hermes Team', unread: 421 },
  bot: { name: 'Hermes', tag: 'admin', color: '#f9548f' },
  topics: [
    { name: 'All' },
    { name: 'General', icon: '#', count: 96 },
    { name: 'Trading', icon: '📈', count: 258 },
    { name: 'Alerts', icon: '🔔', count: 64 },
    { name: 'Research', icon: '⚡', count: 88 },
    { name: 'Reviews', icon: '📊', count: 41 },
  ],
  messages,
  topic: 'trading',
  threads: {
    general: [{ id: 'gateway', from: 'bot', date: 'November 6', time: '9:00 AM', text: '♻️ Gateway online. Hermes is back up and listening.' }],
  },
  activeChat: 'hermes-team',
  archived: { title: 'Archived chats', preview: 'Indie Founders Circle', unread: 3 },
  chats: [
    { id: 'orchard', name: 'Orchard Lane Coffee', kind: 'group', initials: 'OL', color: 1, preview: 'Fresh batch lands on Tuesday', time: '10/24/26', pinned: true },
    { id: 'hermes-team', name: 'Hermes Team', kind: 'forum', avatar: 'team', previewFrom: 'Hermes', preview: '♻️ Gateway online — Hermes is back', time: '9:00 AM', pinned: true },
    { id: 'hermes', name: 'Hermes', kind: 'bot', avatar: 'bot', preview: 'Backup finished. All clear.', time: '9/24/26', pinned: true },
    { id: 'market-pulse', name: 'Market Pulse', kind: 'channel', initials: 'MP', color: 3, preview: 'GM. Ignore the noise and keep your size small', time: '6:05 AM', unread: 59 },
    { id: 'maya', name: 'Maya Ortiz', initials: 'MO', color: 6, preview: 'Lunch on Thursday?', time: 'Thu', unread: 1 },
    { id: 'saltmarsh', name: 'Saltmarsh Swim Club', kind: 'group', initials: 'SS', color: 5, previewFrom: 'Coach', preview: 'Lanes open at six tomorrow', time: 'Tue', unread: 218, muted: true },
    { id: 'theo', name: 'Theo Park', initials: 'TP', color: 2, preview: 'Sent you the deck, tell me what you think', time: 'Sun', unread: 1 },
    { id: 'tidewell', name: 'Tidewell Pet Co', initials: 'TW', color: 4, preview: 'Your order is on its way', time: 'Sun', unread: 1 },
    { id: 'hearthbook', name: 'Hearthbook Support', kind: 'bot', initials: 'HB', color: 0, preview: 'Ticket closed. Thanks for reaching out.', time: '10/22/26', unread: 1 },
    { id: 'priya', name: 'Priya Nair', initials: 'PN', color: 3, preview: 'Priya Nair joined Telegram', time: '10/16/26', unread: 1 },
  ],
  folders: [],
  placeholder: 'Write a message...',
  phonePlaceholder: 'Message',
  clock: '9:41',
  bubbleW: null,
  stamp: 'Recreated',
};

export const defaultState: TelegramState = {
  view: 'desktop',
  sidebar: true,
  topic: null,
  upto: null,
  append: [],
  typing: false,
  scroll: 0,
  composer: '',
  stickyDate: null,
  folder: null,
};
