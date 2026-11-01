// screenplay brief <work> [--from wA] [--to wB]
// The kept transcript, one sentence per line: `w123 [01:02.3] Sentence text.`
import fs from 'node:fs';
import path from 'node:path';
import { makePlan } from './aroll.ts';
import { capitalise, endsClause, endsSentence, joinWords } from './text.ts';
import type { OutWord } from './types.ts';
import { flagStr, fmtTime, log, parseArgs, readJson, UsageError, workDir } from './util.ts';

const USAGE = 'screenplay brief <work> [--from wA] [--to wB]';

/** Groups words into sentences; very long sentences break at a comma (or a pause) so anchors stay close. */
export function sentences(words: OutWord[], maxWords = 28): OutWord[][] {
  const out: OutWord[][] = [];
  let cur: OutWord[] = [];
  words.forEach((w, k) => {
    cur.push(w);
    const next = words[k + 1];
    const pause = next ? next.start - w.end : 0;
    const long = cur.length >= maxWords || (cur.length >= maxWords / 2 && (endsClause(w.text) || pause > 0.5));
    if (!next || endsSentence(w.text) || (long && (endsClause(w.text) || pause > 0.3 || cur.length >= maxWords * 1.5))) {
      out.push(cur);
      cur = [];
    }
  });
  return out;
}

export function briefLines(words: OutWord[]): string[] {
  return sentences(words).map((s) => `${s[0].id} [${fmtTime(s[0].start)}] ${capitalise(joinWords(s.map((w) => w.text)))}`);
}

function wid(v: string | undefined, fallback: number): number {
  if (v === undefined) return fallback;
  const m = /^w?(\d+)$/i.exec(v.trim());
  if (!m) throw new UsageError(`bad word id "${v}" (expected w<number>)`);
  return Number(m[1]);
}

export async function brief(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  const work = workDir(args, USAGE);
  const file = path.join(work, 'words.out.json');
  const mtime = (f: string) => (fs.existsSync(path.join(work, f)) ? fs.statSync(path.join(work, f)).mtimeMs : 0);
  let words: OutWord[];
  if (fs.existsSync(file) && mtime('words.out.json') >= Math.max(mtime('cuts.yaml'), mtime('words.json'))) words = readJson<OutWord[]>(file);
  else {
    log('(words.out.json missing or older than cuts.yaml: times computed from the current cuts; run `screenplay aroll` to render)');
    words = (await makePlan(work)).outWords;
  }
  const from = wid(flagStr(args, 'from'), 0);
  const to = wid(flagStr(args, 'to'), Infinity);
  const sel = words.filter((w) => {
    const n = Number(w.id.slice(1));
    return n >= from && n <= to;
  });
  process.stdout.write(briefLines(sel).join('\n') + '\n');
}
