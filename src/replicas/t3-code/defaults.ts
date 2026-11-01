import type { T3Data, T3State } from './types';

// Fictional, coherent defaults (one small agency's coding threads). Edits override `data`.
export const defaultData: T3Data = {
  appName: 'T3 Code',
  projects: [
    { id: 'orchard', name: 'Orchard Lane', badge: 'OL', color: 'green' },
    { id: 'saltmarsh', name: 'Saltmarsh Swim', badge: 'SS', color: 'amber' },
    { id: 'hearth', name: 'Hearthbook', badge: 'HB', color: 'blue' },
    { id: 'ops', name: 'Ops agent', icon: 'bot' },
  ],
  threads: [
    { id: 'standup', title: 'Morning standup notes', project: 'ops', time: '1d', pinned: true, agent: 'other', agentTag: 'OP' },
    { id: 'checkout', title: 'Fix the checkout flow', project: 'orchard', time: '12m', agent: 'claude', agentTag: 'C2', branches: 2 },
    { id: 'booking', title: 'Class booking calendar', project: 'saltmarsh', time: '48m', agent: 'claude', agentTag: 'C2', editing: true },
    { id: 'recipes', title: 'Recipe import from PDFs', project: 'hearth', time: '3h', agent: 'claude', agentTag: 'C2' },
    { id: 'loyalty', title: 'Loyalty card emails', project: 'orchard', time: '21h', agent: 'claude', agentTag: 'C2' },
    { id: 'old-1', title: 'Rename product images', project: 'orchard', time: '2d', settled: true },
    { id: 'old-2', title: 'Pool schedule export', project: 'saltmarsh', time: '3d', settled: true },
  ],
  messages: [
    { kind: 'worked', text: 'Worked for 12m 4s' },
    {
      role: 'assistant',
      text: 'The checkout flow is fixed. Guest checkout now keeps the cart when the card is declined, and the [[hl-fix|retry button works on mobile]]. I ran the full test suite and clicked through the flow on a phone-sized preview.',
    },
    { kind: 'code', label: 'text', lines: ['tests   148 passed', 'preview checkout.orchardlane.test'] },
    { kind: 'meta', text: '10/9 4:48 PM' },
    { role: 'user', text: 'Great. Now add Apple Pay to the same page and keep the design exactly as it is.' },
  ],
  chats: {},
  model: 'Claude Opus 5.5',
  modelTag: 'C2',
  mode: 'Ultracode',
  access: 'Full access',
  placeholder: 'Ask for changes, send follow-ups, or attach images',
  gitLabel: 'Initialize Git',
};

export const defaultState: T3State = {
  active: 'checkout',
  scroll: 0,
  prompt: '',
  upto: null,
  append: [],
  scrollPill: false,
};
