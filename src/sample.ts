import type { Timeline } from './types';

// A tiny hand-written timeline for Studio and smoke tests (no talking head). Real timelines come
// from `screenplay compile`.
export const sampleTimeline: Timeline = {
  version: 1,
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 420,
  look: 'reference',
  theme: 'ember-dark',
  aroll: null,
  camera: { focus: [0.5, 0.4], zoom: 1, mirror: false },
  webcam: [],
  badges: [],
  chapterGrid: { heading: 'Features', logo: true },
  chapters: [{ index: 0, title: 'Session rail', icon: 'panel-right', frame: 0 }],
  scenes: [
    {
      id: 's1',
      kind: 'app',
      from: 0,
      duration: 330,
      transitionIn: 'cut',
      transitionOut: 'blur',
      plate: { type: 'replica', app: '_fixture', data: {} },
      state: {},
      camera: { scale: 1 },
      actions: [
        { do: 'click', frame: 30, target: 'toggle', tooltip: 'Show panel', set: { panel: true } },
        { do: 'callout', frame: 50, end: 120, target: 'panel', text: 'Session rail', side: 'left', dim: true },
        { do: 'lift', frame: 130, end: 190, target: 'card-2' },
        { do: 'click', frame: 205, target: 'item-3', set: { active: 3 } },
        { do: 'type', frame: 230, end: 280, key: 'prompt', text: 'Audit my memory files and trim them', target: 'composer', lift: true },
        { do: 'mark', frame: 295, end: 330, target: 'item-3', style: 'ring' },
      ],
    },
    {
      id: 's2',
      kind: 'stage',
      from: 330,
      duration: 90,
      transitionIn: 'blur',
      transitionOut: 'cut',
      layout: 'center',
      title: { text: 'Nested sessions', frame: 5, end: 90 },
      elements: [],
    },
  ],
};
