export type TgCard = { site: string; title: string; desc?: string; image?: string };

export type TgMessage = {
  id: string;
  from: 'bot' | 'me';
  name?: string; // defaults to data.bot.name
  time: string;
  date?: string; // date pill drawn above this message, "November 2"
  title?: string; // first line, semibold
  text?: string; // \n lines; **bold**, [label](url), bare https:// links; bullets are lines starting "• "
  card?: TgCard; // link preview
  reactions?: { emoji: string; count: number }[];
  status?: 'read' | 'sent' | 'sending'; // from: 'me' only
  illustrative?: boolean; // written for the video, never sent by the real bot
  stamp?: boolean; // false hides data.stamp on this bubble
};

export type TgTopic = { name: string; icon?: string; count?: number };

export type TgChat = {
  id: string;
  name: string;
  kind?: 'user' | 'group' | 'bot' | 'channel' | 'forum';
  preview?: string;
  previewFrom?: string; // blue "Assistant:" prefix
  time?: string;
  unread?: number;
  muted?: boolean; // grey badge
  pinned?: boolean;
  initials?: string;
  color?: number; // peer colour index, 0..6
  avatar?: 'bot' | 'team' | string; // the drawn ones, or a work-dir image
};

export type TelegramData = {
  group: { title: string; unread: number };
  bot: { name: string; tag: string | null; color: string; avatar?: string };
  topics: TgTopic[];
  messages: TgMessage[]; // the thread of data.topic
  topic: string; // slug of the topic data.messages belongs to
  threads: Record<string, TgMessage[]>; // other topics, by slug
  activeChat: string;
  archived: { title: string; preview: string; unread: number } | null;
  chats: TgChat[];
  folders: string[]; // folder tabs above the chat list; empty hides them (his setup has none)
  placeholder: string;
  phonePlaceholder: string;
  clock: string; // phone status bar
  bubbleW: number | null; // bubble width in px; null = his real 472 pt
  stamp: string | null; // pill beside the sender name of every bot bubble, e.g. "Recreated"; null = none
};

export type TelegramState = {
  view: 'desktop' | 'phone';
  sidebar: boolean;
  topic: string | null;
  upto: number | string | null;
  append: TgMessage[];
  typing: boolean | 'header';
  scroll: number;
  composer: string;
  stickyDate: string | null;
  folder: string | null;
};
