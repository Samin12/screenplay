import React from 'react';
import { Img, staticFile } from 'remotion';
import type { UiState } from '../../app/replica';
import { easeOut, msToFrames, progress } from '../../lib/anim';
import { motion } from '../../theme/tokens';
import { Ico } from '../_shared/kit';
import { BotAvatar, Tail, Ticks, TypingDots } from './Glyphs';
import { C, type Metrics } from './tokens';
import { parseLines, type Span } from './text';
import type { TelegramData, TgMessage } from './types';

// The thread: date pills, bubbles, typing row, drawn the same in both views at different Metrics.
// Anchored to the bottom like the real app, newest message above the composer; `scroll` moves up.

const Spans: React.FC<{ spans: Span[] }> = ({ spans }) => (
  <>
    {spans.map((s, i) =>
      s.kind === 'link' ? (
        <span key={i} style={{ color: C.link }}>
          {s.text}
        </span>
      ) : s.kind === 'bold' ? (
        <strong key={i} style={{ fontWeight: 600 }}>
          {s.text}
        </strong>
      ) : (
        <React.Fragment key={i}>{s.text}</React.Fragment>
      ),
    )}
  </>
);

const Stamp: React.FC<{ m: TgMessage; M: Metrics; ghost?: boolean }> = ({ m, M, ghost }) => {
  const out = m.from === 'me';
  const color = out ? C.outTime : C.time;
  return (
    <span
      data-target={ghost ? undefined : `msg-${m.id}-time`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: M.small * 0.25,
        font: `400 ${M.small}px/${M.line}px ${M.font}`,
        color,
        whiteSpace: 'nowrap',
        visibility: ghost ? 'hidden' : undefined,
        marginLeft: ghost ? M.padX : undefined,
        height: M.line,
        verticalAlign: 'bottom',
      }}
    >
      {m.time}
      {out ? (
        <span data-target={ghost ? undefined : `msg-${m.id}-tick`} style={{ display: 'inline-flex' }}>
          <Ticks status={m.status} size={M.small * 0.95} color={C.tick} />
        </span>
      ) : null}
    </span>
  );
};

const Card: React.FC<{ m: TgMessage; M: Metrics }> = ({ m, M }) => {
  const card = m.card!;
  return (
    <div
      data-target={`msg-${m.id}-card`}
      style={{ marginTop: M.line * 0.32, borderRadius: M.radius * 0.45, background: C.cardBg, overflow: 'hidden', display: 'flex', font: `400 ${M.size}px/${M.line}px ${M.font}`, color: C.text }}
    >
      <div style={{ width: Math.max(4, M.radius * 0.24), background: C.cardBar, flexShrink: 0 }} />
      <div style={{ padding: `${M.line * 0.22}px ${M.padX * 0.8}px ${M.line * 0.28}px`, minWidth: 0 }}>
        <div style={{ color: C.cardName, fontWeight: 600 }}>{card.site}</div>
        <div style={{ fontWeight: 600 }}>{card.title}</div>
        {card.desc ? <div>{card.desc}</div> : null}
        {card.image ? <Img src={staticFile(card.image)} style={{ width: '100%', display: 'block', borderRadius: M.radius * 0.4, marginTop: M.line * 0.3 }} /> : null}
      </div>
    </div>
  );
};

const Reactions: React.FC<{ m: TgMessage; M: Metrics }> = ({ m, M }) => (
  <div data-target={`msg-${m.id}-reactions`} style={{ display: 'flex', flexWrap: 'wrap', gap: M.gap * 0.45, marginTop: M.line * 0.3, paddingRight: M.small * 6 }}>
    {m.reactions!.map((r, i) => (
      <div
        key={i}
        data-target={`msg-${m.id}-reaction-${i + 1}`}
        style={{ height: M.line * 1.05, padding: `0 ${M.padX * 0.55}px`, borderRadius: M.line, background: m.from === 'me' ? 'rgba(255,255,255,0.14)' : '#22384c', display: 'flex', alignItems: 'center', gap: M.small * 0.35, font: `600 ${M.small}px ${M.font}`, color: m.from === 'me' ? '#fff' : C.active }}
      >
        <span style={{ fontSize: M.small * 1.1 }}>{r.emoji}</span>
        {r.count}
      </div>
    ))}
  </div>
);

const Bubble: React.FC<{ m: TgMessage; data: TelegramData; M: Metrics; max: number; head: boolean; tail: boolean }> = ({ m, data, M, max, head, tail }) => {
  const out = m.from === 'me';
  const lines = parseLines(m.text);
  const after = Boolean(m.card || m.reactions?.length); // the stamp gets its own row under these
  const lastLine = lines.reduce((acc, l, i) => (l.blank ? acc : i), -1);
  const bg = out ? C.out : C.bubble;
  const t = `msg-${m.id}`;
  return (
    <div
      data-target={t}
      style={{
        position: 'relative',
        width: 'fit-content',
        maxWidth: max,
        boxSizing: 'border-box',
        padding: `${M.padTop}px ${M.padX}px ${M.padBottom}px`,
        borderRadius: M.radius,
        ...(tail ? (out ? { borderBottomRightRadius: 0 } : { borderBottomLeftRadius: 0 }) : {}),
        background: bg,
        font: `400 ${M.size}px/${M.line}px ${M.font}`,
        color: C.text,
      }}
    >
      {tail ? <Tail side={out ? 'right' : 'left'} size={M.tail} color={bg} /> : null}
      {head && !out ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: M.padX * 2 }}>
          <span data-target={`${t}-name`} style={{ color: data.bot.color, fontWeight: M.nameWeight, whiteSpace: 'nowrap' }}>
            {m.name ?? data.bot.name}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: M.padX * 0.6 }}>
            {data.stamp && m.stamp !== false ? (
              <span data-target={`${t}-stamp`} style={{ font: `500 ${M.tag}px/${M.line * 0.92}px ${M.font}`, color: C.stampText, background: C.stampBg, borderRadius: M.line, padding: `0 ${M.tag * 0.5}px`, whiteSpace: 'nowrap' }}>
                {data.stamp}
              </span>
            ) : null}
            {data.bot.tag ? (
              <span data-target={`${t}-admin`} style={{ font: `400 ${M.tag}px/${M.line * 0.92}px ${M.font}`, color: C.adminText, background: C.adminBg, borderRadius: M.line, padding: `0 ${M.tag * 0.42}px`, whiteSpace: 'nowrap' }}>
                {data.bot.tag}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}
      {m.title ? (
        <div style={{ marginBottom: lines.length ? M.line : 0 }}>
          <span data-target={`${t}-title`} style={{ fontWeight: 600 }}>
            {m.title}
          </span>
        </div>
      ) : null}
      {lines.map((l, i) =>
        l.blank ? (
          <div key={i} style={{ height: M.line }} />
        ) : (
          <div key={i}>
            <span data-target={`${t}-line-${l.n}`}>
              <Spans spans={l.spans} />
            </span>
            {i === lastLine && !after ? <Stamp m={m} M={M} ghost /> : null}
          </div>
        ),
      )}
      {m.card ? <Card m={m} M={M} /> : null}
      {m.reactions?.length ? <Reactions m={m} M={M} /> : null}
      {after ? <div style={{ height: M.line * 0.98 }} /> : null}
      <div style={{ position: 'absolute', right: M.padX, bottom: M.padBottom * 0.8, display: 'flex' }}>
        <Stamp m={m} M={M} />
      </div>
    </div>
  );
};

// Telegram's arrival: the thread makes room and the bubble rises from behind the composer while it
// sharpens. `0fr` to `1fr` grows the row without knowing its height, so frames can render in any order.
const Arrive: React.FC<{ start: number | undefined; ui: UiState; children: React.ReactNode }> = ({ start, ui, children }) => {
  if (start === undefined || ui.measuring) return <>{children}</>;
  const p = progress(ui.frame, start, msToFrames(motion.blurIn + 60, ui.fps), easeOut);
  if (p >= 1) return <>{children}</>;
  const blur = (1 - p) * motion.blurPx;
  return (
    <div style={{ display: 'grid', gridTemplateRows: `${p}fr` }}>
      <div style={{ minHeight: 0, opacity: p, filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined }}>{children}</div>
    </div>
  );
};

const DatePill: React.FC<{ text: string; M: Metrics; target?: string; style?: React.CSSProperties }> = ({ text, M, target, style }) => (
  <div data-target={target} style={{ width: 'fit-content', height: M.pillH, padding: `0 ${M.pillH * 0.52}px`, borderRadius: M.pillH, background: C.pill, display: 'flex', alignItems: 'center', font: `600 ${M.pillSize}px ${M.font}`, color: C.text, whiteSpace: 'nowrap', ...style }}>
    {text}
  </div>
);

export const ThreadList: React.FC<{
  messages: TgMessage[];
  arrivals: Record<string, number>;
  typing: boolean | 'header';
  scroll: number;
  stickyDate: string | null;
  data: TelegramData;
  ui: UiState;
  M: Metrics;
  width: number; // width of the list, so bubbles fit
}> = ({ messages, arrivals, typing, scroll, stickyDate, data, ui, M, width }) => {
  const max = Math.min(data.bubbleW ?? M.bubbleMax, width - M.bubbleX - M.outRight);
  // Date pills sit over the bubble column, as his do, not over the whole chat.
  const pillLeft = M.bubbleX + max / 2;
  const showTyping = typing === true;
  let avatarGiven = false;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: C.main }}>
      <div data-target="messages" style={{ position: 'absolute', left: 0, right: 0, bottom: M.listPad - scroll, display: 'flex', flexDirection: 'column' }}>
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const out = m.from === 'me';
          const head = !prev || prev.from !== m.from || Boolean(m.date);
          const lastOfGroup = next ? next.from !== m.from || Boolean(next.date) : !(showTyping && !out);
          const marginTop = i === 0 && !m.date ? 0 : m.date ? M.gap * 1.1 : head ? M.gap : M.groupGap;
          const giveAvatar = !out && lastOfGroup;
          const avatarTarget = giveAvatar && !avatarGiven ? 'avatar' : undefined;
          if (avatarTarget) avatarGiven = true;
          return (
            <Arrive key={m.id} start={arrivals[m.id]} ui={ui}>
              <div style={{ paddingTop: marginTop }}>
                {m.date ? <DatePill text={m.date} M={M} target={`date-${m.id}`} style={{ marginLeft: pillLeft, transform: 'translateX(-50%)', marginBottom: M.gap * 1.1 }} /> : null}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: out ? 'flex-end' : 'flex-start', position: 'relative' }}>
                  {out ? null : giveAvatar ? (
                    <div data-target={avatarTarget} style={{ position: 'sticky', bottom: M.listPad, marginLeft: M.avatarX, marginRight: M.bubbleX - M.avatarX - M.avatar, flexShrink: 0 }}>
                      <div data-target={`msg-${m.id}-avatar`}>
                        <BotAvatar size={M.avatar} src={data.bot.avatar} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: M.bubbleX, flexShrink: 0 }} />
                  )}
                  <div style={{ minWidth: 0, marginRight: out ? M.outRight : 0 }}>
                    <Bubble m={m} data={data} M={M} max={max} head={head} tail={out ? lastOfGroup : giveAvatar} />
                  </div>
                </div>
              </div>
            </Arrive>
          );
        })}
        {showTyping ? (
          <div style={{ paddingTop: M.gap, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ marginLeft: M.avatarX, marginRight: M.bubbleX - M.avatarX - M.avatar, flexShrink: 0 }}>
              <BotAvatar size={M.avatar} src={data.bot.avatar} />
            </div>
            <div data-target="typing" style={{ position: 'relative', width: 'fit-content', padding: `${M.padTop}px ${M.padX}px ${M.padBottom}px`, borderRadius: M.radius, borderBottomLeftRadius: 0, background: C.bubble, display: 'flex', alignItems: 'center', gap: M.size * 0.45, font: `400 ${M.size}px/${M.line}px ${M.font}`, color: C.muted, whiteSpace: 'nowrap' }}>
              <Tail side="left" size={M.tail} color={C.bubble} />
              {data.bot.name} is typing
              <TypingDots frame={ui.frame} fps={ui.fps} size={M.size * 0.27} color={C.muted} />
            </div>
          </div>
        ) : null}
      </div>
      {stickyDate ? <DatePill text={stickyDate} M={M} target="date-sticky" style={{ position: 'absolute', top: M.listPad, left: pillLeft, transform: 'translateX(-50%)' }} /> : null}
      {messages.length === 0 && !showTyping ? (
        <div data-target="empty" style={{ position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%, -50%)', padding: `${M.pillH * 0.3}px ${M.pillH * 0.7}px`, borderRadius: M.pillH, background: C.pill, font: `600 ${M.pillSize}px ${M.font}`, color: C.text, whiteSpace: 'nowrap' }}>
          No messages here yet...
        </div>
      ) : null}
    </div>
  );
};

// The round "back to newest" button, shown while scrolled up.
export const JumpButton: React.FC<{ size: number; right: number; bottom: number; bg: string }> = ({ size, right, bottom, bg }) => (
  <div data-target="scroll-down" style={{ position: 'absolute', right, bottom, width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Ico name="chevron-down" size={size * 0.6} color="#c3ccd4" stroke={1.7} />
  </div>
);
