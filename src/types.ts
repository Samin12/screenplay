// The compiled timeline: everything Remotion needs, with every anchor already resolved to frames.
// The CLI (cli/compile.ts) builds this from edit.yaml + words.json. Frames inside a scene are
// relative to that scene's start. Remotion never sees words or anchors.

export type ThemeName = 'velour' | 'ember-dark' | 'clay-light';

// panel: the house layout (visuals in a left panel, creator in a fixed tile on the right).
// reference: the full-frame layouts of the reverse-engineered "Claude 2.0" edit.
export type Look = 'panel' | 'reference';

export type Rect = { x: number; y: number; w: number; h: number };

export type WebcamMode = 'tile' | 'full' | 'pip' | 'pip-right' | 'pip-square' | 'hero' | 'plug' | 'hidden';

export type WebcamKey = { frame: number; mode: WebcamMode };

export type Transition = 'blur' | 'cut' | 'flash' | 'fade';

export type Timeline = {
  version: 1;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  look: Look;
  theme: ThemeName;
  // Cut talking-head video (audio included), path relative to the public dir (the work dir).
  aroll: { src: string; durationInFrames: number; cuts: number[] } | null;
  camera: { focus: [number, number]; zoom: number; mirror: boolean; track?: { fps: number; x: number[] } };
  webcam: WebcamKey[];
  badges: StepBadge[]; // panel look: what the badge above the tile says, from each frame on
  chapterGrid: { heading: string; logo: boolean };
  chapters: ChapterInfo[];
  scenes: Scene[];
};

export type StepBadge = { frame: number; eyebrow: string; title: string; step: number; total: number };

export type ChapterInfo = { index: number; title: string; icon: string; frame: number };

type SceneBase = {
  id: string;
  from: number;
  duration: number;
  transitionIn: Transition;
  transitionOut: Transition;
};

export type TalkingScene = SceneBase & { kind: 'talking'; dim: number; elements: Element[] };

export type StageScene = SceneBase & {
  kind: 'stage';
  layout: 'hero-left' | 'center';
  title: { text: string; frame: number; end: number; sub?: string } | null;
  elements: Element[];
};

export type ChapterScene = SceneBase & { kind: 'chapter'; index: number };

export type Plate =
  | { type: 'replica'; app: string; data: Record<string, unknown> }
  | { type: 'image'; src: string; size: [number, number]; targets: Record<string, Rect>; tone?: 'dark' | 'light' }
  | { type: 'video'; src: string; size: [number, number]; startFrom: number; targets: Record<string, Rect>; tone?: 'dark' | 'light' };

export type AppScene = SceneBase & {
  kind: 'app';
  plate: Plate;
  state: Record<string, unknown>;
  // Initial camera: scale 1 shows the whole plate fitted to the frame.
  camera: { scale: number; target?: string; rect?: Rect };
  actions: Action[];
};

export type PlugScene = SceneBase & {
  kind: 'plug';
  media: { frame: number; src: string; type: 'image' | 'video'; scroll?: { from: number; to: number; start: number; end: number } }[];
};

export type BoardNode = {
  id: string;
  frame: number; // camera arrives here
  x: number; // world position (center)
  y: number;
  scale: number; // camera scale when focused on this node
  element: Element;
};

export type BoardScene = SceneBase & { kind: 'board'; nodes: BoardNode[]; line: boolean };

// A mark on a proof image, in media pixels. ring also dims the rest of the image.
export type ImageMark = Rect & { frame: number; style?: 'marker' | 'box' | 'ring' };

export type Scene = TalkingScene | StageScene | ChapterScene | AppScene | PlugScene | BoardScene;

// ---------- App actions (frames relative to scene start) ----------

export type Action =
  | { do: 'move'; frame: number; target: string; tooltip?: string }
  | { do: 'click'; frame: number; target: string; tooltip?: string; set?: Record<string, unknown>; ring?: boolean }
  | { do: 'type'; frame: number; end: number; key: string; text: string; target?: string; lift?: boolean }
  | { do: 'set'; frame: number; set: Record<string, unknown> }
  | { do: 'tween'; frame: number; end: number; key: string; to: number; from?: number }
  | { do: 'callout'; frame: number; end: number; target: string; text: string; sub?: string; side: 'left' | 'right' | 'top' | 'bottom'; dim: boolean }
  | { do: 'lift'; frame: number; end: number; target: string; scale?: number; to?: [number, number] }
  | { do: 'explode'; frame: number; end: number; targets: string[]; labels: string[] }
  | { do: 'focus'; frame: number; end: number; target: string }
  | { do: 'zoom'; frame: number; end: number; target?: string; rect?: Rect; scale: number }
  | { do: 'mark'; frame: number; end: number; target: string; style: 'ring' | 'marker' | 'underline' }
  | { do: 'title'; frame: number; end: number; text: string; sub?: string }
  | { do: 'show'; frame: number; end: number; element: Element };

// ---------- Stage elements (frames relative to scene start) ----------
// Every element enters at `frame` and leaves at `end`. Items inside an element carry their own
// `frame` so they can land on the exact word.

export type Item = { text: string; frame: number; icon?: string; sub?: string; tone?: Tone };
export type Tone = 'accent' | 'good' | 'bad' | 'info' | 'warn' | 'muted';

export type Element =
  | { type: 'title'; frame: number; end: number; text: string; sub?: string; logo?: string; size?: 'xl' | 'l' | 'm' }
  | { type: 'iconlist'; frame: number; end: number; items: Item[] }
  | { type: 'bullets'; frame: number; end: number; title?: string; items: Item[] }
  | { type: 'chips'; frame: number; end: number; items: Item[] }
  | { type: 'flow'; frame: number; end: number; nodes: Item[]; arrows?: { label?: string; tone?: Tone; frame?: number }[]; direction?: 'row' | 'loop' }
  | { type: 'tree'; frame: number; end: number; root: Item; children: Item[] }
  | { type: 'compare'; frame: number; end: number; columns: { title: string; icon?: string; frame: number; rows: Item[]; highlight?: boolean; highlightFrame?: number }[] }
  | { type: 'counter'; frame: number; end: number; value: number; prefix?: string; suffix?: string; label?: string; decimals?: number }
  | { type: 'keys'; frame: number; end: number; keys: string[]; label?: string; press?: number }
  | { type: 'table'; frame: number; end: number; columns: string[]; rows: { label: string; cells: string[]; icon?: string }[]; highlight?: { column: number; frame: number; span?: number } }
  | { type: 'tweet'; frame: number; end: number; name: string; handle: string; avatar?: string; text: string; mark?: { phrase: string; frame: number }; sticker?: { text: string; frame: number }; label?: { text: string; frame: number }; meta?: string; verified?: boolean }
  | { type: 'sticker'; frame: number; end: number; text: string; rotate?: number }
  | { type: 'image'; frame: number; end: number; src: string; start?: number; caption?: string; source?: string; url?: string; crop?: Rect; highlight?: ImageMark; highlights?: ImageMark[]; size?: [number, number] }
  | { type: 'prompt'; frame: number; end: number; text: string; label?: string; cps?: number }
  | { type: 'grid'; frame: number; end: number; count: number; columns: number; lit: { index: number; frame: number; span?: number }[]; label?: string }
  | { type: 'stat'; frame: number; end: number; items: Item[] }
  | { type: 'quote'; frame: number; end: number; text: string; by?: string; mark?: { phrase: string; frame: number } }
  | { type: 'lower'; frame: number; end: number; title: string; sub?: string }
  | { type: 'cta'; frame: number; end: number; text: string; sub?: string; icon?: string };

export type ElementType = Element['type'];
