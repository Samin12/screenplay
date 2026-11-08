import React from 'react';
import { caretOn, usePlateSize, type UiState } from '../../app/replica';
import { Caret, Ico, fill, slug } from '../_shared/kit';
import { PaperPlane, TeamAvatar, TypingDots } from './Glyphs';
import { JumpButton, ThreadList } from './Messages';
import { C, FONT_IOS, PHONE } from './tokens';
import type { TelegramData, TelegramState, TgMessage } from './types';

// "Text it from your phone": the same topic chat on an iPhone. Drawn at one fixed size and scaled to
// the plate's height, so it reads the same on the full frame and on the panel.

const BODY = { w: 494, h: 1040, bezel: 12 };
const SCREEN = { w: BODY.w - BODY.bezel * 2, h: BODY.h - BODY.bezel * 2, r: 58 };
const NAV = 72;
const STATUS = 62;

const StatusGlyphs: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <svg width="24" height="16" viewBox="0 0 24 16" style={{ display: 'block' }}>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 6.2} y={11 - i * 3.4} width="4.6" height={5 + i * 3.4} rx="1.1" fill="#fff" />
      ))}
    </svg>
    <Ico name="wifi" size={22} color="#fff" stroke={2.6} />
    <svg width="34" height="17" viewBox="0 0 34 17" style={{ display: 'block' }}>
      <rect x="0.7" y="0.7" width="29" height="15.6" rx="4.6" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.4" fill="none" />
      <rect x="2.6" y="2.6" width="25.2" height="11.8" rx="3" fill="#fff" />
      <path d="M31.4 5.8 V11.2 C32.6 10.8 33.4 9.8 33.4 8.5 C33.4 7.2 32.6 6.2 31.4 5.8 Z" fill="#fff" fillOpacity="0.5" />
    </svg>
  </div>
);

export const Phone: React.FC<{
  data: TelegramData;
  state: TelegramState;
  ui: UiState;
  topic: string;
  thread: TgMessage[];
  arrivals: Record<string, number>;
}> = ({ data, state, ui, topic, thread, arrivals }) => {
  const [W, H] = usePlateSize();
  const s = Math.min((H - 30) / BODY.h, (W - 30) / BODY.w);
  const active = topic === 'all' ? undefined : data.topics.find((t) => slug(t.name) === topic);
  const hasText = Boolean(state.composer);
  const scroll = Number(state.scroll) || 0;
  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', background: C.backdrop }}>
      <div
        data-target="phone"
        style={{ position: 'absolute', left: (W - BODY.w * s) / 2, top: (H - BODY.h * s) / 2, width: BODY.w, height: BODY.h, transformOrigin: '0 0', transform: `scale(${s})`, background: '#0b0c0e', borderRadius: SCREEN.r + BODY.bezel, boxShadow: '0 0 0 2px #3a3b3e, 0 0 0 4px #1a1b1d, 0 40px 90px rgba(0,0,0,0.6)' }}
      >
        <div data-target="screen" style={{ position: 'absolute', left: BODY.bezel, top: BODY.bezel, width: SCREEN.w, height: SCREEN.h, borderRadius: SCREEN.r, overflow: 'hidden', background: C.window, display: 'flex', flexDirection: 'column', fontFamily: FONT_IOS }}>
          {/* status bar + island */}
          <div data-target="status-bar" style={{ height: STATUS, flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 30px 0 44px', font: `600 21px ${FONT_IOS}`, color: '#fff' }}>
            {data.clock}
            <StatusGlyphs />
            <div style={{ position: 'absolute', left: (SCREEN.w - 136) / 2, top: 13, width: 136, height: 38, borderRadius: 19, background: '#000' }} />
          </div>
          {/* nav bar */}
          <div data-target="header" style={{ height: NAV, flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', padding: '0 14px 0 8px', borderBottom: `1px solid ${C.line}` }}>
            <div data-target="back" style={{ display: 'flex', alignItems: 'center', color: C.active, font: `400 21px ${FONT_IOS}` }}>
              <Ico name="chevron-left" size={36} color={C.active} stroke={2.2} />
              <span style={{ marginLeft: -4 }}>{data.group.title}</span>
            </div>
            <div style={{ position: 'absolute', left: 150, right: 76, textAlign: 'center', minWidth: 0 }}>
              <div data-target="header-title" style={{ font: `600 21px/26px ${FONT_IOS}`, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {active?.icon && active.icon !== '#' ? `${active.icon} ` : ''}
                {active?.name ?? data.group.title}
              </div>
              {state.typing ? (
                <div data-target="header-status" style={{ font: `400 16px/22px ${FONT_IOS}`, color: C.active, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {data.bot.name} is typing
                  <TypingDots frame={ui.frame} fps={ui.fps} size={4} color={C.active} gap={2.5} />
                </div>
              ) : (
                <div data-target="header-status" style={{ font: `400 16px/22px ${FONT_IOS}`, color: C.muted, whiteSpace: 'nowrap' }}>
                  {active?.count ?? thread.length} messages
                </div>
              )}
            </div>
            <div style={{ flex: 1 }} />
            <div data-target="header-avatar">
              <TeamAvatar size={50} />
            </div>
          </div>
          {/* thread */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <ThreadList messages={thread} arrivals={arrivals} typing={state.typing} scroll={scroll} stickyDate={state.stickyDate} data={data} ui={ui} M={PHONE} width={SCREEN.w} />
            {scroll > 0 ? <JumpButton size={54} right={12} bottom={14} bg={C.jump} /> : null}
          </div>
          {/* composer */}
          <div data-target="composer" style={{ flexShrink: 0, background: C.window, padding: '10px 12px 38px', display: 'flex', alignItems: 'flex-end', gap: 12, position: 'relative' }}>
            <div data-target="attach" style={{ width: 44, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Ico name="paperclip" size={30} color={C.icon} stroke={1.7} />
            </div>
            <div data-target="composer-text" style={{ flex: 1, minWidth: 0, minHeight: 46, boxSizing: 'border-box', padding: '8px 16px', borderRadius: 23, background: C.main, border: `1px solid #24313e`, font: `400 22px/28px ${FONT_IOS}`, color: hasText ? C.text : C.placeholder }}>
              {hasText ? state.composer : null}
              {ui.caret === 'composer' ? <Caret on={caretOn(ui, 'composer')} h={24} color={C.active} /> : null}
              {hasText ? null : data.phonePlaceholder}
            </div>
            <div data-target="send" style={{ width: 46, height: 46, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: hasText ? fill(ui, 'send', { base: C.active, hover: '#74b8f2', pressed: '#4f97d8' }) : 'transparent' }}>
              {hasText ? <PaperPlane size={26} color="#fff" /> : <Ico name="mic" size={30} color={C.icon} stroke={1.7} />}
            </div>
            <div style={{ position: 'absolute', left: (SCREEN.w - 176) / 2, bottom: 10, width: 176, height: 6, borderRadius: 3, background: '#fff' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
