// Media pipeline commands for `screenplay <cmd> ...argv` (dispatched by cli/screenplay.ts).
//   init        create the work dir and source.json (camera/mic or a Borumi bundle via cutroom)
//   transcribe  whisper.cpp word-level transcript → words.json
//   cut         detect fillers, stutters, false starts, retakes → cuts.yaml + review.md
//   aroll       render the cut talking head → aroll.mp4, aroll.json, words.out.json
//   face        follow the head through aroll.mp4 → face.json (the camera tile tracks it)
//   brief       print the kept transcript, one sentence per line with word ids and output times
import { CliError } from '../util.ts';
import { aroll as arollCmd } from './aroll.ts';
import { brief as briefCmd } from './brief.ts';
import { cut as cutCmd } from './cut.ts';
import { face as faceCmd } from './face.ts';
import { init as initCmd } from './init.ts';
import { transcribe as transcribeCmd } from './transcribe.ts';
import { UsageError } from './util.ts';

type Cmd = (argv: string[]) => Promise<void>;

/** Expected failures (bad usage, missing files, ffmpeg/whisper errors) surface as clean CLI errors; bugs keep their stack. */
const wrap =
  (fn: Cmd): Cmd =>
  async (argv) => {
    try {
      await fn(argv);
    } catch (e) {
      if (e instanceof CliError) throw e;
      if (e instanceof UsageError || (e instanceof Error && e.constructor === Error)) throw new CliError(e.message);
      throw e;
    }
  };

export const init = wrap(initCmd);
export const transcribe = wrap(transcribeCmd);
export const cut = wrap(cutCmd);
export const aroll = wrap(arollCmd);
export const brief = wrap(briefCmd);
export const face = wrap(faceCmd);
export { UsageError };
