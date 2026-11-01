import React from 'react';
import { usePlateSize, type ReplicaProps } from '../../app/replica';
import { FONT_UI, mergeData } from '../_shared/kit';
import { defaultData, defaultState } from './defaults';
import { ChatPane, Header } from './Main';
import { Sidebar } from './Sidebar';
import { C, L } from './tokens';
import type { Message, T3Data, T3State } from './types';

// T3 Code desktop app (dark, macOS). 1920x1080 plate; pure function of (data, state, ui).

export const T3Code: React.FC<ReplicaProps<Partial<T3Data>, Partial<T3State>>> = ({ data: raw, state: rawState, ui }) => {
  const data = mergeData(defaultData, raw, ['chats']);
  const state = { ...defaultState, ...rawState } as T3State;
  const [W, H] = usePlateSize();
  // active null = a fresh thread (empty chat); a thread with an entry in `chats` shows that chat.
  let messages: Message[] = !state.active ? [] : data.chats?.[state.active] ? data.chats[state.active] : data.messages;
  if (state.upto !== null && state.upto !== undefined) messages = messages.slice(0, Number(state.upto));
  if (state.append?.length) messages = [...messages, ...state.append];
  return (
    <div data-target="window" style={{ width: W, height: H, position: 'relative', overflow: 'hidden', background: C.main, fontFamily: FONT_UI, color: C.text, letterSpacing: '-0.005em' }}>
      <Sidebar data={data} state={state} ui={ui} />
      <ChatPane data={data} state={state} ui={ui} left={L.sideW} messages={messages} />
      <Header data={data} state={state} ui={ui} left={L.sideW} />
    </div>
  );
};
