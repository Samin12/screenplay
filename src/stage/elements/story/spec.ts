// Story element: plain data shared by the compiler (cli/story.ts) and the renderer (Story.tsx).
// Keep this file free of runtime imports: the CLI loads it under plain Node.
import type { StoryActorKind } from '../../../types';

// The story stage: a fixed virtual canvas the size of the panel's viewport. Actor x, y are in these px.
export const STORY_W = 1400;
export const STORY_H = 990;

// Illustrated props, drawn in SVG. Size = the drawing's own px; on stage they draw PROP_SCALE times
// that (times the actor's `scale`) so a figure reads on a phone. The label sits under the drawing.
export const PROP_SCALE = 1.35;
export const PROP_SIZE: Partial<Record<StoryActorKind, [number, number]>> = {
  person: [170, 230],
  car: [330, 150],
  taxi: [330, 250],
  building: [230, 320],
  office: [290, 320],
  document: [180, 220],
  stack: [230, 230],
  monitor: [300, 240],
  phone: [150, 270],
  notebook: [200, 250],
  drawer: [340, 240],
  plane: [300, 130],
  tower: [170, 330],
  headset: [150, 150],
};

export const STORY_KINDS: readonly StoryActorKind[] = [
  'icon',
  'person',
  'car',
  'taxi',
  'building',
  'office',
  'document',
  'stack',
  'monitor',
  'phone',
  'notebook',
  'drawer',
  'plane',
  'tower',
  'headset',
  'text',
  'box',
  'card',
  'counter',
  'meter',
  'image',
  'arrow',
  'path',
  'bubble',
  'badge',
  'sticker',
];

// Default timings in milliseconds.
export const STORY_MS = {
  enter: 280,
  pop: 320,
  exit: 220,
  draw: 480, // arrow draw-on
  camera: 700, // follow pan/zoom
  bubbleIn: 240,
  bubbleOut: 200,
  fade: 220, // highlight / dim in and out
  pulse: 600,
  shake: 520,
};
