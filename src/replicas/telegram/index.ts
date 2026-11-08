import type { ReplicaDef } from '../../app/replica';
import { mergeData } from '../_shared/kit';
import { Telegram } from './Telegram';
import { defaultData, defaultState } from './defaults';
import type { TelegramData } from './types';

// Target names with <...> are patterns: <id> is a message or chat id from data, <slug> is the name
// lower-cased with non-alphanumerics turned into "-" ("Agent Squad" -> "agent-squad"), <k> is 1-based.
export const telegram: ReplicaDef = {
  id: 'telegram',
  title: 'Telegram (dark): state.view desktop = his Telegram Desktop forum group with topic tabs and chat list; phone = the same topic chat on an iPhone',
  size: [1920, 1080],
  tone: 'dark',
  component: Telegram,
  defaults: { data: defaultData as unknown as Record<string, unknown>, state: defaultState as unknown as Record<string, unknown> },
  resolveData: (d) => mergeData(defaultData, d as Partial<TelegramData>, ['group', 'bot']) as unknown as Record<string, unknown>,
  targets: {
    // messages, both views
    messages: 'the whole message column',
    'msg-<id>': 'one message bubble, e.g. msg-risk, msg-update, msg-friday, msg-daily, msg-tsla-ask, msg-tsla-reply',
    'msg-<id>-title': 'the semibold first line, e.g. msg-risk-title',
    'msg-<id>-line-<k>': 'kth line of the message text, blank lines not counted; hugs the text, e.g. msg-risk-line-2',
    'msg-<id>-name': 'the sender name in pink (first bubble of a group)',
    'msg-<id>-admin': 'the green "admin" tag',
    'msg-<id>-stamp': 'the amber data.stamp pill ("Recreated") left of the admin tag',
    'msg-<id>-avatar': 'the avatar beside a bubble (last bubble of a group)',
    'msg-<id>-card': 'the link preview card',
    'msg-<id>-time': 'the time at the bottom right of the bubble',
    'msg-<id>-tick': 'the read/sent ticks of a "me" message',
    'msg-<id>-reactions': 'the reactions row',
    'msg-<id>-reaction-<k>': 'kth reaction pill',
    'date-<id>': 'the date pill above a message, e.g. date-risk',
    'date-sticky': 'the floating date pill (state.stickyDate)',
    avatar: 'the first bot avatar in the thread',
    typing: 'the "Hermes is typing" bubble in the thread (state.typing: true)',
    'scroll-down': 'the round "back to newest" button (shows while state.scroll > 0)',
    empty: '"No messages here yet" pill of an empty topic',
    // header + composer, both views
    header: 'the bar above the thread',
    'header-title': 'the topic name',
    'header-status': '"258 messages", or "Hermes is typing" with state.typing',
    composer: 'the whole composer bar (type with key: composer on it or on composer-text)',
    'composer-text': 'the text field of the composer',
    attach: 'the paperclip',
    send: 'the right composer button: mic when empty, blue paper plane with text',
    // desktop
    window: 'desktop: the whole window',
    titlebar: 'desktop: macOS title bar ("Trading – (421)")',
    chat: 'desktop: everything right of the sidebar',
    topics: 'desktop: the whole topic tab bar',
    'topics-view': 'desktop: the box icon at the left of the tabs',
    'topic-<slug>': 'desktop: a topic tab: topic-all, topic-general, topic-trading, topic-alerts, topic-research, topic-reviews',
    'header-search': 'desktop: magnifier in the header',
    'panel-toggle': 'desktop: side-panel icon in the header',
    'header-more': 'desktop: three dots in the header',
    commands: 'desktop: the "/" box in the composer (hidden while there is text)',
    emoji: 'desktop: the smiley in the composer',
    sidebar: 'desktop: the whole chat list (state.sidebar)',
    menu: 'desktop: hamburger at the top of the sidebar',
    search: 'desktop: the search field',
    archived: 'desktop: the "Archived chats" row',
    'chat-<id>': 'desktop: a chat row, e.g. chat-hermes-team, chat-hermes, chat-market-pulse',
    folders: 'desktop: the folder tabs above the chat list (data.folders)',
    'folder-<slug>': 'desktop: one folder tab',
    // phone
    phone: 'phone: the iPhone, body included (lift or zoom it)',
    screen: 'phone: the screen',
    'status-bar': 'phone: clock, signal and battery',
    back: 'phone: "‹ Hermes Team" back button',
    'header-avatar': 'phone: the group avatar in the nav bar',
  },
  stateDoc: {
    view: "'desktop' (default) | 'phone'",
    sidebar: 'boolean (default true): desktop chat list. false gives the thread the whole width',
    topic: 'topic slug shown, e.g. trading (null = data.topic). data.threads holds the other topics; a topic with no thread shows the empty pill',
    upto: 'number | message id | null: messages shown, a count or up to and including that id (null = all). Raising it with `set` animates the new bubbles in',
    append: 'messages added after the thread, e.g. after send: set {composer: "", append: [{id: ask, from: me, time: "9:02 AM", text: ...}]}. Growing it animates them in',
    typing: 'boolean | "header": "Hermes is typing" under the title, and as a bubble in the thread; "header" = only under the title',
    scroll: 'number: px scrolled up from the newest message (tween it). 0 = newest above the composer',
    composer: 'string: composer text (type into it with key: composer; caret shows while typing)',
    stickyDate: 'string | null: the floating date pill at the top of the thread while a long message is on screen, e.g. "November 2"',
    folder: 'name of the active folder tab (data.folders)',
  },
};
