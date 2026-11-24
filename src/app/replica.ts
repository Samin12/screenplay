import React from 'react';

// A replica is a code-built copy of an app's UI, rendered at a fixed design size. It is a pure
// function of (data, state, ui): no internal state, no effects, no CSS transitions (Remotion renders
// frames out of order, so anything time-based must come from props).
//
// Every element the edit may point at carries `data-target="name"`. The engine measures those
// elements in the browser, then drives the cursor, callouts, lifts, focus and zoom from the
// measured rects. Names are the replica's public API: list them in `targets`.

export type UiState = {
  hover?: string; // target the cursor is resting on
  pressed?: string; // target being clicked (a few frames)
  caret?: string; // state key currently being typed into (show a caret there)
  frame: number; // scene-relative frame, for blinking carets or spinners
  fps: number;
  measuring?: boolean; // the invisible copy used to measure targets: skip video and anything heavy
  cursor?: { x: number; y: number }; // scripted cursor position in plate px while it is on screen (drag ghosts follow it)
  changes?: Record<string, { frame: number; prev: unknown }>; // state key -> when `set` last changed it and from what, so a replica can animate what just appeared
};

export type ReplicaProps<D = Record<string, any>, S = Record<string, any>> = {
  data: D; // the fictional content of this video (sessions, messages, files...)
  state: S; // UI state that clicks change (panel open, toggle on, active tab...)
  ui: UiState;
};

export type ReplicaDef = {
  id: string;
  title: string;
  size: [number, number]; // design size in px; the camera fits it to the frame
  panelSize?: [number, number]; // plate in the panel look, if not the panel's viewport (panel aspect)
  tone: 'dark' | 'light';
  component: React.FC<ReplicaProps<any, any>>;
  defaults: { data: Record<string, any>; state: Record<string, any> };
  targets: Record<string, string>; // target name -> what it is (docs for the editing agent)
  stateDoc: Record<string, string>; // state key -> allowed values / meaning
  // Optional: build the full data from the scene's `data:` (presets, themes). Without it the engine
  // uses `{...defaults.data, ...plateData}`.
  resolveData?: (plateData: Record<string, any>) => Record<string, any>;
  // Optional: tone that depends on the data (e.g. a light theme of a dark app). Defaults to `tone`.
  toneOf?: (data: Record<string, any>) => 'dark' | 'light';
};

// Full data a replica is drawn with: its resolveData hook, else defaults merged with the scene data.
export const resolvePlateData = (def: ReplicaDef, plateData: Record<string, any> | undefined) =>
  def.resolveData ? def.resolveData(plateData ?? {}) : { ...def.defaults.data, ...(plateData ?? {}) };

// The plate a replica is being drawn on. The design size by default; the panel look asks for the
// panel's aspect instead, and replicas reflow into it (text stays the same size).
const PlateSize = React.createContext<[number, number]>([1920, 1080]);
export const PlateSizeProvider = PlateSize.Provider;
export const usePlateSize = () => React.useContext(PlateSize);

// Helpers replicas use for interactive styling.
export const isHover = (ui: UiState, id: string) => ui.hover === id;
export const isPressed = (ui: UiState, id: string) => ui.pressed === id;
export const caretOn = (ui: UiState, key: string) => ui.caret === key && Math.floor((ui.frame / ui.fps) * 2.2) % 2 === 0;
