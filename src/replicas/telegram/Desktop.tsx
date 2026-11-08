import React from 'react';
import { caretOn, isHover, isPressed, usePlateSize, type UiState } from '../../app/replica';
import { Caret, Ico, TrafficLights, fill, slug } from '../_shared/kit';
import { ArchiveGlyph, BotAvatar, KindGlyph, InitialsAvatar, PaperPlane, PinGlyph, SlashBox, SmileGlyph, TabsGlyph, TeamAvatar, TypingDots } from './Glyphs';
import { JumpButton, ThreadList } from './Messages';
import { C, DESKTOP, FONT_TG, L, fs, pt } from './tokens';
import type { TelegramData, TelegramState, TgChat, TgMessage, TgTopic } from './types';

// The whole window, as in his recording: title bar, chat list, then header, topic tabs, thread and
// composer. Reflows to the plate: on the panel the sidebar narrows, and the tabs run off the edge.

const iconBtn = (ui: UiState, target: string, size: number, children: React.ReactNode, style?: React.CSSProperties) => (
  <div
    data-target={target}
    style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: fill(ui, target, { hover: 'rgba(255,255,255,0.05)', pressed: 'rgba(255,255,255,0.09)' }), flexShrink: 0, ...style }}
  >
    {children}
  </div>
);

const Badge: React.FC<{ n: number; muted?: boolean }> = ({ n, muted }) => (
  <div style={{ minWidth: pt(20), height: pt(20), padding: `0 ${pt(6)}px`, boxSizing: 'border-box', borderRadius: pt(10), background: muted ? C.badgeMuted : C.badge, color: '#fff', font: `600 ${fs(12.5)}px/${pt(20)}px ${FONT_TG}`, textAlign: 'center', flexShrink: 0 }}>{n}</div>
);

const ChatAvatar: React.FC<{ chat: TgChat; data: TelegramData; size: number }> = ({ chat, data, size }) => {
  if (chat.avatar === 'team') return <TeamAvatar size={size} />;
  if (chat.avatar === 'bot') return <BotAvatar size={size} src={data.bot.avatar} />;
  if (chat.avatar) return <BotAvatar size={size} src={chat.avatar} />;
  return <InitialsAvatar size={size} text={chat.initials ?? chat.name[0]} color={chat.color} />;
};

const ChatRow: React.FC<{ chat: TgChat; data: TelegramData; ui: UiState }> = ({ chat, data, ui }) => {
  const t = `chat-${chat.id}`;
  const selected = chat.id === data.activeChat;
  const forum = chat.kind === 'forum';
  const subColor = selected ? '#fff' : C.rowMuted;
  const line: React.CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 };
  return (
    <div
      data-target={t}
      style={{ height: forum ? L.rowForum : L.row, boxSizing: 'border-box', display: 'flex', alignItems: forum ? 'flex-start' : 'center', padding: `${forum ? pt(10) : 0}px ${pt(12)}px 0 ${pt(10)}px`, gap: pt(13), background: fill(ui, t, { hover: '#1a2633', active: selected, activeBg: C.selected }), flexShrink: 0 }}
    >
      <ChatAvatar chat={chat} data={data} size={L.rowAvatar} />
      <div style={{ flex: 1, minWidth: 0, font: `400 ${fs(14)}px/${pt(19)}px ${FONT_TG}`, display: 'flex', flexDirection: 'column', gap: forum ? pt(4) : pt(7) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: pt(5) }}>
          {chat.kind && chat.kind !== 'user' ? <KindGlyph kind={chat.kind} size={pt(16)} /> : null}
          <span style={{ ...line, fontWeight: 600, color: '#fff' }}>{chat.name}</span>
          <span style={{ color: selected ? '#fff' : C.rowMuted, flexShrink: 0, fontSize: fs(13.5) }}>{chat.time}</span>
        </div>
        {forum ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: pt(8) }}>
            <span style={{ ...line, color: '#fff' }}>
              {data.topics
                .filter((x) => x.icon)
                .slice(0, 3)
                .map((x) => (
                  <span key={x.name} style={{ marginRight: pt(12) }}>
                    {x.icon} {x.name}
                  </span>
                ))}
            </span>
            {chat.pinned ? <PinGlyph size={pt(15)} color={selected ? C.pinSelected : C.pin} /> : null}
          </div>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: pt(8) }}>
          <span style={{ ...line, color: subColor }}>
            {chat.previewFrom ? <span style={{ color: selected ? '#fff' : C.link }}>{chat.previewFrom}: </span> : null}
            {chat.preview}
          </span>
          {chat.unread ? <Badge n={chat.unread} muted={chat.muted} /> : null}
          {chat.pinned && !forum ? <PinGlyph size={pt(15)} color={selected ? C.pinSelected : C.pin} /> : null}
        </div>
      </div>
    </div>
  );
};

const Sidebar: React.FC<{ data: TelegramData; state: TelegramState; ui: UiState; width: number }> = ({ data, state, ui, width }) => (
  <div data-target="sidebar" style={{ width, flexShrink: 0, height: '100%', background: C.window, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: `${pt(1)}px solid ${C.line}`, boxSizing: 'border-box' }}>
    <div style={{ height: L.header, flexShrink: 0, display: 'flex', alignItems: 'center', padding: `0 ${pt(12)}px 0 ${pt(14)}px`, gap: pt(11) }}>
      {iconBtn(ui, 'menu', pt(30), <Ico name="menu" size={pt(23)} color={C.icon} stroke={1.5} />)}
      <div data-target="search" style={{ flex: 1, height: pt(38), borderRadius: pt(19), background: C.search, display: 'flex', alignItems: 'center', padding: `0 ${pt(17)}px`, font: `400 ${fs(14)}px ${FONT_TG}`, color: C.icon, minWidth: 0 }}>
        Search
      </div>
    </div>
    {data.folders.length ? (
      <div data-target="folders" style={{ display: 'flex', flexShrink: 0, gap: pt(16), padding: `0 ${pt(14)}px`, height: pt(32), alignItems: 'flex-end', borderBottom: `1px solid ${C.line}` }}>
        {data.folders.map((name, i) => {
          const on = state.folder ? slug(state.folder) === slug(name) : i === 0;
          return (
            <div key={name} data-target={`folder-${slug(name)}`} style={{ position: 'relative', paddingBottom: pt(7), font: `600 ${fs(14)}px ${FONT_TG}`, color: on ? C.active : C.muted, whiteSpace: 'nowrap' }}>
              {name}
              {on ? <div style={{ position: 'absolute', left: -pt(3), right: -pt(3), bottom: 0, height: pt(3), borderRadius: `${pt(3)}px ${pt(3)}px 0 0`, background: C.underline }} /> : null}
            </div>
          );
        })}
      </div>
    ) : null}
    {data.archived ? (
      <div data-target="archived" style={{ height: L.row, flexShrink: 0, display: 'flex', alignItems: 'center', padding: `0 ${pt(12)}px 0 ${pt(10)}px`, gap: pt(13), background: fill(ui, 'archived', { hover: '#1a2633' }) }}>
        <div style={{ width: L.rowAvatar, height: L.rowAvatar, borderRadius: '50%', background: '#3e566b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ArchiveGlyph size={pt(25)} hole="#3e566b" />
        </div>
        <div style={{ flex: 1, minWidth: 0, font: `600 ${fs(14)}px/${pt(19)}px ${FONT_TG}`, color: '#fff', display: 'flex', flexDirection: 'column', gap: pt(7) }}>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.archived.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: pt(8) }}>
            <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.archived.preview}</span>
            <Badge n={data.archived.unread} muted />
          </div>
        </div>
      </div>
    ) : null}
    {data.chats.map((chat) => (
      <ChatRow key={chat.id} chat={chat} data={data} ui={ui} />
    ))}
  </div>
);

const TopicTab: React.FC<{ topic: TgTopic; active: boolean; ui: UiState }> = ({ topic, active, ui }) => {
  const t = `topic-${slug(topic.name)}`;
  const emoji = topic.icon && topic.icon !== '#' ? topic.icon : null;
  const lit = active || isHover(ui, t) || isPressed(ui, t);
  return (
    <div data-target={t} style={{ position: 'relative', height: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', gap: pt(emoji ? 6 : 4), padding: `0 ${pt(3)}px`, color: active ? C.active : lit ? '#a7b6c4' : C.muted, font: `600 ${fs(14)}px ${FONT_TG}`, whiteSpace: 'nowrap' }}>
      {emoji ? <span style={{ fontSize: pt(16), lineHeight: 1 }}>{emoji}</span> : null}
      {topic.icon === '#' ? '# ' : null}
      {topic.name}
      {active ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: pt(3), borderRadius: `${pt(3)}px ${pt(3)}px 0 0`, background: C.underline }} /> : null}
    </div>
  );
};

export const Desktop: React.FC<{
  data: TelegramData;
  state: TelegramState;
  ui: UiState;
  topic: string;
  thread: TgMessage[];
  arrivals: Record<string, number>;
}> = ({ data, state, ui, topic, thread, arrivals }) => {
  const [W, H] = usePlateSize();
  const sideW = state.sidebar ? Math.min(L.sidebar, Math.round(W * L.sidebarShare)) : 0;
  const chatW = W - sideW;
  const active = topic === 'all' ? undefined : data.topics.find((t) => slug(t.name) === topic);
  const scroll = Number(state.scroll) || 0;
  const typing = state.typing;
  const hasText = Boolean(state.composer);
  const count = active?.count;
  return (
    <div data-target="window" style={{ position: 'relative', width: W, height: H, overflow: 'hidden', background: C.window, fontFamily: FONT_TG }}>
      {/* title bar */}
      <div data-target="titlebar" style={{ height: L.titleBar, background: C.titleBar, display: 'flex', alignItems: 'center', padding: `0 ${pt(8)}px`, gap: pt(14) }}>
        <TrafficLights size={pt(11.5)} gap={pt(7.5)} />
        <div style={{ font: `600 ${fs(13)}px ${FONT_TG}`, color: C.titleText, whiteSpace: 'nowrap' }}>
          {active?.name ?? data.group.title} – ({data.group.unread})
        </div>
      </div>
      <div style={{ display: 'flex', height: H - L.titleBar }}>
        {state.sidebar ? <Sidebar data={data} state={state} ui={ui} width={sideW} /> : null}
        <div data-target="chat" style={{ width: chatW, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* header */}
          <div data-target="header" style={{ height: L.header, flexShrink: 0, display: 'flex', alignItems: 'center', padding: `0 ${pt(14)}px 0 ${pt(23)}px`, borderBottom: `1px solid #0c1722`, boxSizing: 'border-box' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>
                <span data-target="header-title" style={{ font: `600 ${fs(14)}px/${pt(22)}px ${FONT_TG}`, color: C.text }}>
                  {active?.name ?? data.group.title}
                </span>
              </div>
              <div>
                {typing ? (
                  <span data-target="header-status" style={{ display: 'inline-flex', alignItems: 'center', gap: pt(3), font: `400 ${fs(14)}px/${pt(20)}px ${FONT_TG}`, color: C.active }}>
                    {data.bot.name} is typing
                    <TypingDots frame={ui.frame} fps={ui.fps} size={pt(2.6)} color={C.active} />
                  </span>
                ) : (
                  <span data-target="header-status" style={{ font: `400 ${fs(14)}px/${pt(20)}px ${FONT_TG}`, color: C.muted }}>
                    {count ?? thread.length} messages
                  </span>
                )}
              </div>
            </div>
            {iconBtn(ui, 'header-search', pt(36), <Ico name="search" size={pt(21)} color={C.icon} stroke={1.5} />, { marginRight: pt(8) })}
            {iconBtn(ui, 'panel-toggle', pt(36), <Ico name="panel-right" size={pt(22)} color={C.icon} stroke={1.5} />, { marginRight: pt(4) })}
            {iconBtn(ui, 'header-more', pt(36), <Ico name="ellipsis-vertical" size={pt(23)} color={C.icon} stroke={2.2} />)}
          </div>
          {/* topic tabs */}
          <div data-target="topics" style={{ height: L.topics, flexShrink: 0, display: 'flex', alignItems: 'stretch', padding: `0 0 0 ${pt(24)}px`, gap: pt(14), overflow: 'hidden', borderBottom: `${pt(1)}px solid ${C.line}`, boxSizing: 'border-box' }}>
            <div data-target="topics-view" style={{ display: 'flex', alignItems: 'center', marginRight: pt(20) }}>
              <TabsGlyph size={pt(21)} color={C.icon} />
            </div>
            {data.topics.map((t) => (
              <TopicTab key={t.name} topic={t} active={slug(t.name) === topic} ui={ui} />
            ))}
          </div>
          {/* thread */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <ThreadList messages={thread} arrivals={arrivals} typing={typing} scroll={scroll} stickyDate={state.stickyDate} data={data} ui={ui} M={DESKTOP} width={chatW} />
            <div style={{ position: 'absolute', right: pt(3), width: pt(6), height: '28%', bottom: `${Math.min(68, 2 + scroll * 0.03)}%`, borderRadius: pt(3), background: C.thumb }} />
            {scroll > 0 ? <JumpButton size={pt(46)} right={pt(18)} bottom={pt(16)} bg={C.jump} /> : null}
          </div>
          {/* composer */}
          <div data-target="composer" style={{ minHeight: L.composer, flexShrink: 0, background: C.window, display: 'flex', alignItems: 'flex-end', boxSizing: 'border-box', padding: `0 ${pt(14)}px 0 ${pt(14)}px` }}>
            {iconBtn(ui, 'attach', pt(26), <Ico name="paperclip" size={pt(23)} color={C.icon} stroke={1.5} />, { marginBottom: pt(12), marginRight: pt(15) })}
            <div data-target="composer-text" style={{ flex: 1, minWidth: 0, padding: `${pt(15)}px 0 ${pt(16)}px`, font: `400 ${fs(14)}px/${pt(19)}px ${FONT_TG}`, color: hasText ? C.text : C.placeholder }}>
              {hasText ? state.composer : null}
              {ui.caret === 'composer' ? <Caret on={caretOn(ui, 'composer')} h={pt(17)} /> : null}
              {hasText ? null : data.placeholder}
            </div>
            {hasText ? null : iconBtn(ui, 'commands', pt(26), <SlashBox size={pt(23)} color={C.icon} />, { marginBottom: pt(12), marginRight: pt(21) })}
            {iconBtn(ui, 'emoji', pt(26), <SmileGlyph size={pt(24)} color={C.icon} />, { marginBottom: pt(12), marginRight: pt(21) })}
            {iconBtn(ui, 'send', pt(26), hasText ? <PaperPlane size={pt(23)} color={C.active} /> : <Ico name="mic" size={pt(24)} color={C.icon} stroke={1.5} />, { marginBottom: pt(12) })}
          </div>
        </div>
      </div>
    </div>
  );
};
