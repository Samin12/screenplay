// The house layout ("panel look"), in final-frame pixels at 1920x1080: everything visual lives in the
// left panel, the creator stays in the same tile on the right, the step badge sits above the tile.
// Numbers are Samin's Borumi standard look (proof-first-video-editor, references/visual-system.md).
// Plain data: the CLI imports this too.

export const PANEL = { x: 19.2, y: 19.2, w: 1473.75, h: 1041.6, r: 19.2 } as const;
export const TILE = { x: 1529.5, y: 229.6, w: 353.9, h: 620.7, r: 19.2 } as const;
export const BADGE = { x: 1529.5, y: 48.6, w: 354, h: 150 } as const;

// App and stage scenes draw in a viewport with the panel's aspect, slightly smaller than the panel so
// UI text and diagrams come out at least as big as they were full frame (body text >= 22 px).
export const PANEL_VIEW: [number, number] = [1400, Math.round((1400 * PANEL.h) / PANEL.w)];

// Designs fixed at 1920x1080 (chapter grid, board, plug) scale in whole, centred vertically.
export const PANEL_SCALE = PANEL.w / 1920;

export const CANVAS_BG = '#121212';
export const PANEL_BG = '#181716';
export const DRIFT_PX_PER_S = 2.5;
