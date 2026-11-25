// The compiled timeline: everything Remotion needs, with every anchor already resolved to frames.
// The CLI (cli/compile.ts) builds this from edit.yaml + words.json. Frames inside a scene are
// relative to that scene's start. Remotion never sees words or anchors.

export type ThemeName = 'velour' | 'ember-dark' | 'clay-light';

// panel: the house layout (visuals in a left panel, creator in a fixed tile on the right).
// reference: the full-frame layouts of the reverse-engineered "Claude 2.0" edit.
export type Look = 'panel' | 'reference';

export type Rect = { x: number; y: number; w: number; h: number };

export type WebcamMode = 'tile' | 'full' | 'pip' | 'pip-right' | 'pip-square' | 'hero' | 'plug' | 'hidden';

// `cut`: the head jumps to this mode on that frame instead of blur-morphing (a hard layout switch).
export type WebcamKey = { frame: number; mode: WebcamMode; cut?: true };

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
  // style 'path': every chapter as a tile in rows, done ones checked, later ones locked, and a line
  // that travels from the previous chapter to the new one (src/scenes/ChapterPath.tsx).
  chapterGrid: { heading: string; logo: boolean; style?: 'path' };
  chapters: ChapterInfo[];
  scenes: Scene[];
};

// `plain` / `hidden` come from a scene's `badge:` override: `plain` shows the eyebrow without the
// "· 3 / 10" count (step still lights the dashes), `hidden` draws no badge.
export type StepBadge = { frame: number; eyebrow: string; title: string; step: number; total: number; plain?: boolean; hidden?: boolean };

// `label` is the small eyebrow ("Tip 7", "Level 2"); `group` is the path card's row.
export type ChapterInfo = { index: number; title: string; icon: string; frame: number; label?: string; group?: string };

type SceneBase = {
  id: string;
  from: number;
  duration: number;
  transitionIn: Transition;
  transitionOut: Transition;
  // Panel look, per scene: 'full' = the visual fills the whole frame (no tile, no badge), 'him' = the
  // creator full frame. Absent = the panel layout.
  lay?: 'full' | 'him';
  // A hard layout switch on this edge: whatever is on screen at the scene's first / last frame is
  // drawn complete, with no entrance or exit envelope, so no frame of the switch is half faded.
  snapIn?: true;
  snapOut?: true;
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
  | { type: 'image'; src: string; size: [number, number]; targets: Record<string, Rect>; tone?: 'dark' | 'light'; blur?: PlateBlur[] }
  | { type: 'video'; src: string; size: [number, number]; startFrom: number; targets: Record<string, Rect>; tone?: 'dark' | 'light'; blur?: PlateBlur[] };

// A privacy blur on a screen plate: a rect in media pixels, on from `frame` to `end` (scene-relative).
export type PlateBlur = Rect & { frame: number; end: number };

export type AppScene = SceneBase & {
  kind: 'app';
  plate: Plate;
  state: Record<string, unknown>;
  // Initial camera: scale 1 shows the whole plate fitted to the frame.
  camera: { scale: number; target?: string; rect?: Rect };
  actions: Action[];
  // layout full: how much bigger than its design size a replica's UI draws (default 1.25).
  ui?: number;
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
  | { type: 'cta'; frame: number; end: number; text: string; sub?: string; icon?: string }
  | { type: 'story'; frame: number; end: number; title?: string; actors: StoryActor[]; beats: StoryBeat[] };

export type ElementType = Element['type'];

// ---------- Story: a little animated scene (analogies) ----------
// Actors stand on a fixed 1400x990 stage (x, y = the centre of the drawing, its label sits under it).
// Beats carry every bit of timing (frames relative to the scene start, like items); actors are static.

export type StoryActorKind =
  | 'icon' | 'person' | 'car' | 'taxi' | 'building' | 'office' | 'document' | 'stack' | 'monitor' | 'phone'
  | 'notebook' | 'drawer' | 'plane' | 'tower' | 'headset' | 'text' | 'box' | 'card' | 'counter' | 'meter'
  | 'image' | 'arrow' | 'path' | 'bubble' | 'badge' | 'sticker';

export type StoryPoint = string | [number, number]; // an actor id or [x, y]
export type StorySide = 'top' | 'bottom' | 'left' | 'right';

export type StoryActor = {
  id: string;
  kind: StoryActorKind;
  x: number;
  y: number;
  hidden?: boolean; // off stage until its first enter beat
  scale?: number;
  rotate?: number;
  flip?: boolean; // face left
  label?: string;
  role?: string;
  color?: string; // tone name or #hex
  text?: string;
  title?: string;
  lines?: string[];
  icon?: string;
  icons?: string[];
  tile?: boolean;
  value?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  pages?: number;
  count?: number;
  open?: boolean;
  wear?: 'tie' | 'headset' | 'glasses';
  style?: 'bar' | 'dial' | 'speech' | 'thought';
  size?: number;
  w?: number;
  h?: number;
  src?: string;
  from?: StoryPoint;
  to?: StoryPoint;
  curve?: number;
  dashed?: boolean;
  on?: string;
  side?: StorySide;
};

export type StorySwap = Partial<Pick<StoryActor, 'text' | 'label' | 'role' | 'title' | 'lines' | 'icon' | 'color' | 'pages' | 'count' | 'value' | 'open'>>;

export type StoryBeat =
  | { do: 'enter'; frame: number; actor: string; style?: 'blur' | 'pop'; pos?: [number, number] }
  | { do: 'exit'; frame: number; actor: string }
  | { do: 'move'; frame: number; dur: number; actor: string; to?: StoryPoint; by?: [number, number]; offset?: [number, number] }
  | { do: 'say'; frame: number; dur: number; actor: string; text: string; style?: 'speech' | 'thought'; side?: StorySide }
  | { do: 'count'; frame: number; dur: number; actor: string; to: number; ease?: 'linear' | 'smooth' }
  | { do: 'fill'; frame: number; dur: number; actor: string; to: number }
  | { do: 'highlight'; frame: number; dur: number; actor: string }
  | { do: 'pulse'; frame: number; actor: string }
  | { do: 'shake'; frame: number; actor: string }
  | { do: 'swap'; frame: number; actor: string; set: StorySwap }
  | { do: 'follow'; frame: number; dur?: number; actor?: string; rect?: [number, number, number, number]; scale?: number }
  | { do: 'dim'; frame: number; dur: number; keep: string[] };
