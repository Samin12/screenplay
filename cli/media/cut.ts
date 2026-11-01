// screenplay cut <work> [--accept 1,3,5-7] [--max-gap 0.18] [--window 20]
import fs from 'node:fs';
import path from 'node:path';
import { allCuts, formatCutsYaml, formatReview, parseAccept, readCuts } from './cutsfile.ts';
import { detectCuts } from './detect.ts';
import { cutMask } from './ranges.ts';
import type { CutRange, Proposal, Word } from './types.ts';
import { flagNum, flagStr, loadWords, log, parseArgs, UsageError, workDir } from './util.ts';

const USAGE = 'screenplay cut <work> [--accept 1,3,5-7] [--max-gap 0.18] [--window 20]';

const same = (a: CutRange, b: CutRange) => a.from === b.from && a.to === b.to;

function seconds(words: Word[], ranges: CutRange[]): number {
  const mask = cutMask(words.length, ranges);
  return words.reduce((s, w, k) => s + (mask[k] ? w.end - w.start : 0), 0);
}

export async function cut(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  const work = workDir(args, USAGE);
  const words = loadWords(work);
  const file = path.join(work, 'cuts.yaml');
  const cuts = readCuts(file);
  if (args.flags['max-gap'] !== undefined) cuts.maxGap = flagNum(args, 'max-gap', cuts.maxGap);
  if (cuts.maxGap < 0.05 || cuts.maxGap > 2) throw new UsageError('--max-gap should be between 0.05 and 2 seconds');

  const proposals = detectCuts(words, { window: flagNum(args, 'window', 20) });
  const confident = proposals.filter((p) => p.confident);
  const ambiguous = proposals.filter((p) => !p.confident);
  cuts.cuts = confident.map((p) => ({ from: p.from, to: p.to, why: p.why }));

  const acceptSpec = flagStr(args, 'accept');
  if (acceptSpec) {
    for (const k of parseAccept(acceptSpec)) {
      const p: Proposal | undefined = ambiguous[k - 1];
      if (!p) throw new UsageError(`--accept ${k}: review.md has ${ambiguous.length} proposal(s)`);
      if (!cuts.accepted.some((a) => same(a, p))) cuts.accepted.push({ from: p.from, to: p.to, why: `${p.why} (review #${k})` });
    }
  }
  const stale = [...cuts.accepted, ...cuts.manual, ...cuts.keep].filter((r) => r.to >= words.length);
  if (stale.length) log(`warning: ${stale.length} range(s) in cuts.yaml point past the last word (s${words.length - 1}): words.json changed?`);

  fs.writeFileSync(file, formatCutsYaml(cuts, words));
  fs.writeFileSync(path.join(work, 'review.md'), formatReview(work, words, ambiguous, confident, (p) => cuts.accepted.some((a) => same(a, p))));

  const applied = allCuts(cuts);
  const removed = cutMask(words.length, applied, cuts.keep).filter(Boolean).length;
  log(`cuts.yaml: ${confident.length} automatic cut(s) (${seconds(words, cuts.cuts).toFixed(1)} s of speech), ${cuts.accepted.length} accepted, ${cuts.manual.length} manual; ${removed} of ${words.length} words removed; pauses > ${cuts.maxGap} s trimmed by aroll`);
  for (const p of confident) log(`  - s${p.from}-s${p.to} ${p.why}: ${p.note ?? ''}`.slice(0, 220));
  log(`review.md: ${ambiguous.length} proposal(s) to decide${ambiguous.length ? ` (accept with --accept 1,2,...)` : ''}`);
  ambiguous.forEach((p, k) => log(`  ${k + 1}. s${p.from}-s${p.to} ${p.kind}${cuts.accepted.some((a) => same(a, p)) ? ' [accepted]' : ''}: ${p.note ?? ''}`.slice(0, 220)));
}
