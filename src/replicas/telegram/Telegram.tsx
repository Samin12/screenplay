import React from 'react';
import type { ReplicaProps } from '../../app/replica';
import { Desktop } from './Desktop';
import { Phone } from './Phone';
import { arrivals, visibleCount } from './text';
import type { TelegramData, TelegramState } from './types';

export const Telegram: React.FC<ReplicaProps<TelegramData, TelegramState>> = ({ data, state, ui }) => {
  const topic = state.topic ?? data.topic;
  const base = data.threads[topic] ?? (topic === data.topic || topic === 'all' ? data.messages : []);
  const shown = base.slice(0, visibleCount(base, state.upto));
  const append = state.append ?? [];
  const thread = [...shown, ...append];
  const arrived = arrivals(base, append, ui.changes);
  const View = state.view === 'phone' ? Phone : Desktop;
  return <View data={data} state={state} ui={ui} topic={topic} thread={thread} arrivals={arrived} />;
};
