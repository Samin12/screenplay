// One place that turns a chapter into the string viewers read: the path card's large title and the
// YouTube chapters line are both this, so they can never drift apart. Plain data: the CLI imports it.

export type ChapterLike = { title: string; label?: string };

// "Tip 7" + "One folder, sorted" -> "Tip 7: One folder, sorted". No label -> the title alone.
export const chapterHeading = (c: ChapterLike): string => (c.label ? `${c.label}: ${c.title}` : c.title).replace(/\*/g, '');

// The same string split for drawing: the label part (with its colon) takes the accent colour.
export const chapterHeadingParts = (c: ChapterLike): { label: string; rest: string } => {
  const full = chapterHeading(c);
  if (!c.label) return { label: '', rest: full };
  const cut = c.label.replace(/\*/g, '').length + 1; // through the colon
  return { label: full.slice(0, cut), rest: full.slice(cut).trimStart() };
};

// Rows of the path card: an item with `group` starts or joins that row; an item without one stays in
// the row of the item before it. Returns chapter indices per row, in order.
export function chapterRows(chapters: { group?: string }[]): number[][] {
  const rows: number[][] = [];
  let cur: string | undefined;
  chapters.forEach((c, i) => {
    const g = c.group ?? cur;
    if (rows.length === 0 || g !== cur) rows.push([]);
    cur = g;
    rows[rows.length - 1].push(i);
  });
  return rows;
}
