import React from 'react';
import type { ReplicaDef, ReplicaProps } from '../../app/replica';
import { isHover, isPressed, caretOn } from '../../app/replica';

// Minimal replica used by tests and the sample timeline. Shows the conventions every replica follows.
const FixtureApp: React.FC<ReplicaProps> = ({ data, state, ui }) => (
  <div style={{ width: '100%', height: '100%', background: '#181818', color: '#e8e8e8', font: '500 26px Inter', display: 'flex' }}>
    <div style={{ width: 380, background: '#1f1f1f', padding: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {(data.items as string[]).map((it, i) => (
        <div key={it} data-target={`item-${i + 1}`} style={{ padding: '14px 18px', borderRadius: 12, background: state.active === i + 1 ? '#404040' : isHover(ui, `item-${i + 1}`) ? '#303030' : 'transparent' }}>
          {it}
        </div>
      ))}
    </div>
    <div style={{ flex: 1, position: 'relative', padding: 48 }}>
      <div data-target="toggle" style={{ position: 'absolute', right: 48, top: 40, padding: '12px 22px', borderRadius: 12, background: isPressed(ui, 'toggle') ? '#555' : isHover(ui, 'toggle') ? '#3a3a3a' : '#2a2a2a' }}>
        {state.panel ? 'Hide panel' : 'Show panel'}
      </div>
      <div style={{ fontSize: 44, fontWeight: 700, marginTop: 80 }}>{data.title as string}</div>
      <div data-target="composer" style={{ position: 'absolute', left: 48, right: state.panel ? 548 : 48, bottom: 48, height: 96, borderRadius: 24, background: '#303030', display: 'flex', alignItems: 'center', padding: '0 32px', color: state.prompt ? '#fff' : '#888' }}>
        {(state.prompt as string) || 'Type / for commands'}
        {caretOn(ui, 'prompt') ? <span style={{ width: 3, height: 34, background: '#fff', marginLeft: 3 }} /> : null}
      </div>
      {state.panel ? (
        <div data-target="panel" style={{ position: 'absolute', right: 48, top: 120, bottom: 48, width: 460, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {['Environment', 'Context', 'Connectors'].map((c, i) => (
            <div key={c} data-target={`card-${i + 1}`} style={{ background: '#202020', border: '1px solid #2c2c2c', borderRadius: 16, padding: 24, height: 200 }}>
              <div style={{ fontWeight: 700 }}>{c}</div>
              <div style={{ color: '#999', marginTop: 12, fontSize: 22 }}>Details about {c.toLowerCase()}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  </div>
);

export const fixtureApp: ReplicaDef = {
  id: '_fixture',
  title: 'Test fixture app',
  size: [1920, 1080],
  tone: 'dark',
  component: FixtureApp,
  defaults: { data: { title: 'Weekly client reports', items: ['Inbox', 'Reports', 'Drafts', 'Archive'] }, state: { panel: false, active: 1, prompt: '' } },
  targets: { 'item-N': 'sidebar row N', toggle: 'show/hide panel button', composer: 'prompt box', panel: 'right panel', 'card-N': 'panel card N' },
  stateDoc: { panel: 'boolean: right panel open', active: 'number: selected sidebar row', prompt: 'string: composer text' },
};
