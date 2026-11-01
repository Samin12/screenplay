import type { ThemeName, Tone } from '../types';

// Design tokens sampled from the reference edit (see docs/STYLE.md). Every component reads colours,
// fonts and timings from here, never from literals, so a whole video can switch theme in one line.

export type Theme = {
  name: ThemeName;
  bg: string; // stage background (centre)
  bgEdge: string; // vignette edge
  dot: string; // dot-grid dots
  dotBright: string; // dot-wave horizon dots
  text: string; // headings
  textDim: string; // secondary text
  textMuted: string;
  accent: string; // the one colour that means "look here"
  accentDeep: string; // dark tint of the accent for icon tiles
  accentGlow: string;
  card: string;
  cardBorder: string;
  cardRaised: string;
  scrim: string; // focus dim over UI
  tones: Record<Tone, string>;
  fonts: { display: string; serif: string; ui: string; mono: string };
  titleWeight: number;
  titleTracking: number; // em
};

const fonts = {
  display: '"Outfit", "Inter", system-ui, sans-serif',
  serif: '"Newsreader", "Source Serif 4", Georgia, serif',
  ui: '"Inter", system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
};

const inter = '"Inter", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

export const themes: Record<ThemeName, Theme> = {
  // The house palette: dark canvas, terracotta accent, Inter everywhere (Samin's velour style).
  velour: {
    name: 'velour',
    bg: '#181716',
    bgEdge: '#121212',
    dot: 'rgb(42,42,40)',
    dotBright: '#5a5754',
    text: '#F4F1EC',
    textDim: '#D9D4CC',
    textMuted: '#A39C91',
    accent: '#E2774E',
    accentDeep: '#3A241A',
    accentGlow: 'rgba(226,119,78,0.45)',
    card: '#1E1D1B',
    cardBorder: '#34322E',
    cardRaised: '#2A2825',
    scrim: 'rgba(0,0,0,0.62)',
    tones: {
      accent: '#E2774E',
      good: '#46B482',
      bad: '#E5564A',
      info: '#619fda',
      warn: '#E0B04F',
      muted: '#A39C91',
    },
    fonts: { display: inter, serif: inter, ui: inter, mono: fonts.mono },
    titleWeight: 800,
    titleTracking: -0.02,
  },
  'ember-dark': {
    name: 'ember-dark',
    bg: '#1b1915',
    bgEdge: '#110e0d',
    dot: '#2e2d29',
    dotBright: '#5a5754',
    text: '#f8f6f1',
    textDim: '#bebdb9',
    textMuted: '#8a8781',
    accent: '#f4611c',
    accentDeep: '#2a1a12',
    accentGlow: 'rgba(244,97,28,0.45)',
    card: '#25241f',
    cardBorder: '#3a3a32',
    cardRaised: '#2f2a25',
    scrim: 'rgba(0,0,0,0.62)',
    tones: {
      accent: '#f4611c',
      good: '#64d273',
      bad: '#e05363',
      info: '#619fda',
      warn: '#eca62a',
      muted: '#95948f',
    },
    fonts,
    titleWeight: 600,
    titleTracking: -0.01,
  },
  'clay-light': {
    name: 'clay-light',
    bg: '#f5f1e8',
    bgEdge: '#e9e3d6',
    dot: '#d9d2c3',
    dotBright: '#bfb6a4',
    text: '#1f1d1a',
    textDim: '#4a463f',
    textMuted: '#857f74',
    accent: '#d97757',
    accentDeep: '#f3dfd5',
    accentGlow: 'rgba(217,119,87,0.35)',
    card: '#fffdf8',
    cardBorder: '#e3dccd',
    cardRaised: '#ffffff',
    scrim: 'rgba(30,26,20,0.45)',
    tones: {
      accent: '#d97757',
      good: '#3f9d55',
      bad: '#c8444f',
      info: '#3c78c2',
      warn: '#c98a12',
      muted: '#857f74',
    },
    fonts,
    titleWeight: 600,
    titleTracking: -0.01,
  },
};

// Motion timings in milliseconds, measured on the reference.
export const motion = {
  blurIn: 220, // universal entrance: opacity + blur(14px -> 0), no translate
  blurOut: 200,
  blurPx: 14,
  calloutDot: 150,
  calloutLine: 200,
  calloutLabel: 200,
  lift: 480, // exploded clone flight
  camera: 450, // push-in / pull-back
  sceneBlur: 330, // blur dissolve between scenes
  webcamMorph: 450,
  chapterHold: 3400, // whole chapter grid card
  cursorBase: 350, // cursor move = base + distance / speed
  cursorSpeed: 1200, // px per second
  cursorDwell: 250, // arrive this long before the click lands on the word
  tooltipDelay: 330,
  stagger: 120,
};
