import type { ReplicaDef } from '../../app/replica';
import { T3Code } from './T3Code';
import { defaultData, defaultState } from './defaults';

// Target names with <...> are patterns: <id> is a thread id from data.threads, <n> is 1-based,
// <name> is the name you give a [[name|text]] span inside message text.
export const t3Code: ReplicaDef = {
  id: 't3-code',
  title: 'T3 Code desktop app (dark, macOS): project/thread sidebar, chat with inline video player, composer with model/mode/access tray',
  size: [1920, 1080],
  tone: 'dark',
  component: T3Code,
  defaults: { data: defaultData as unknown as Record<string, unknown>, state: defaultState as unknown as Record<string, unknown> },
  targets: {
    window: 'the whole app window',
    // sidebar
    sidebar: 'whole left sidebar',
    brand: '"T3 Code" wordmark (top-left, next to the traffic lights); lift it when he names the app',
    'sidebar-toggle': 'collapse-sidebar icon (top-left)',
    search: 'Search row (icon + label)',
    'new-folder': 'folder icon right of Search',
    'add-project': 'folder-plus icon right of Search',
    'new-thread': 'new thread (pencil) icon right of Search',
    'thread-<id>': 'a thread row (project label, title, agent glyph), e.g. thread-edit-video',
    'thread-<id>-title': 'just the title line of a thread row',
    'section-settled': '"Settled" group header',
    settings: 'gear icon in the sidebar footer',
    'tool-diff': 'git/diff icon in the sidebar footer',
    'tool-usage': 'usage (bar chart) icon in the sidebar footer',
    'tool-refresh': 'refresh icon (sidebar footer, right)',
    'sidebar-footer': 'the sidebar footer icon bar',
    // header
    header: 'breadcrumb header bar above the chat',
    'crumb-project': 'project badge + name in the header ("BP Borumi Projects")',
    'crumb-title': 'active thread title in the header',
    'header-add': '"+" button (header right)',
    'open-in': 'open-in-editor split button (Finder icon + chevron)',
    'init-git': '"Initialize Git" button',
    'toggle-terminal': 'bottom-panel toggle icon',
    'toggle-panel': 'right-panel toggle icon',
    // chat
    main: 'main pane (everything right of the sidebar)',
    messages: 'the message column',
    'msg-<n>': 'nth message of the active thread (prose block, user bubble, video card, code block, "Worked for" line)',
    'msg-<n>-p<k>': 'kth paragraph of an assistant message',
    'msg-<n>-line-<k>': 'kth line of a code block message',
    '<name>': 'a [[name|text]] span inside message text (one line; use for mark/callout on a phrase), e.g. hl-borumi',
    'scroll-pill': '"Scroll to end" pill above the composer (state.scrollPill)',
    composer: 'prompt box (type with key: prompt)',
    attach: 'paperclip button in the composer',
    send: 'blue send button',
    'model-picker': '"Claude Opus 5.5" picker under the composer (Claude starburst + chevron)',
    'mode-picker': '"Ultracode" picker under the composer',
    'access-picker': '"Full access" picker under the composer',
  },
  stateDoc: {
    active: 'thread id shown in the chat, highlighted in the sidebar and named in the header',
    scroll: 'number: chat scrolled down by px (0 = top of the thread)',
    prompt: 'string: composer text (type into it with key: prompt; caret shows while typing)',
    upto: 'number | null: show only the first N messages (reveal step by step)',
    append: 'messages appended after the thread (e.g. after send: set {prompt: "", append: [{role: user, text: ...}]})',
    scrollPill: 'boolean: show the "Scroll to end" pill above the composer',
  },
};
