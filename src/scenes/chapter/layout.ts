// ChapterGrid geometry in the 1920x1080 design space. The reference grid is 11 tiles as 5 + 5 + 1,
// each about 325x203 with ~36 px column gaps and ~59 px row gaps, rows starting at y≈290. Other
// counts keep the same proportions and are re-fitted so the card always looks composed.

export type TileBox = { x: number; y: number; w: number; h: number; row: number; col: number };

export const DESIGN_W = 1920;
export const DESIGN_H = 1080;

const ASPECT = 1.6;
const GAP_X = 0.11; // of tile width
const GAP_Y = 0.29; // of tile height (rows of 4+ tighten to 0.2)

export function gridColumns(n: number): number {
  if (n <= 5) return Math.max(1, n); // one row
  if (n <= 10) return Math.ceil(n / 2); // two balanced rows: 3+3, 4+3 ... 5+5
  return n % 4 === 0 && n <= 16 ? 4 : 5; // 11 -> 5+5+1 (reference), 12 -> 4+4+4, 16 -> 4x4
}

export function gridLayout(n: number): { tiles: TileBox[]; w: number; h: number } {
  if (n <= 0) return { tiles: [], w: 0, h: 0 };
  const cols = gridColumns(n);
  const rows = Math.ceil(n / cols);
  const gapY = rows >= 4 ? 0.2 : GAP_Y;
  const top = rows >= 4 ? 232 : 255;
  const bottom = DESIGN_H - 35;
  const availW = DESIGN_W - 150;
  const availH = bottom - top;
  const maxW = n <= 2 ? 560 : n === 3 ? 500 : 440; // few chapters: bigger tiles so the card still fills
  const w = Math.min(maxW, availW / (cols + (cols - 1) * GAP_X), (availH / (rows + (rows - 1) * gapY)) * ASPECT);
  const h = w / ASPECT;
  const gx = w * GAP_X;
  const gy = h * gapY;
  const totalH = rows * h + (rows - 1) * gy;
  const centre = rows >= 3 ? 650 : rows === 2 ? 628 : 610;
  const y0 = Math.max(top, Math.min(bottom - totalH, centre - totalH / 2));
  const tiles: TileBox[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inRow = Math.min(cols, n - row * cols); // last row is centred
    const rowW = inRow * w + (inRow - 1) * gx;
    const x0 = (DESIGN_W - rowW) / 2;
    tiles.push({ x: x0 + col * (w + gx), y: y0 + row * (h + gy), w, h, row, col });
  }
  return { tiles, w, h };
}

// "11 Features" -> ["11", "Features"]; the logo tile goes between them. No leading number -> the
// logo leads the heading.
export function splitHeading(heading: string): { num: string | null; rest: string } {
  const m = heading.trim().match(/^(\d+)\s+(.+)$/);
  return m ? { num: m[1], rest: m[2] } : { num: null, rest: heading.trim() };
}
