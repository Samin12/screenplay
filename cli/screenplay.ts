#!/usr/bin/env node
// screenplay: the CLI the editing agent drives.
//   media:   init transcribe cut aroll brief        (cli/media, owned by the media package)
//   edit:    compile check
//   look:    still sheet targets replicas
//   output:  render studio

import { CliError, c } from './util.ts';

type Cmd = (argv: string[]) => Promise<void>;

const HELP = `screenplay <command> [args]

Media (source footage -> work dir)
  init <work> --camera <video> [--mic <audio>]
                                       create a work dir (source.json)
  transcribe <work>                    words.json (source-time words)
  cut <work>                           propose cuts (cuts.yaml, review.md)
  aroll <work>                         render the cut talking head (aroll.mp4, aroll.json, words.out.json)
  face <work>                          follow the head so the camera tile tracks it (face.json; macOS)
  brief <work>                         print the transcript with w-ids for writing edit.yaml

Edit
  compile <work> [--quiet] [--json]    edit.yaml -> .screenplay/timeline.json (errors with YAML paths)
  check <work> [--json]                compile + lint (targets, icons, media, pacing, text); exit 1 on errors

Look
  still <work> --at <w12|"phrase"|o:sec|f:frame> [-o file.png]
  sheet <work> [--beats | --every 2s] [--from <anchor>] [--to <anchor>] [-o sheet.jpg]
                                       contact sheet(s), 4 columns, timestamps + scene/beat labels
  targets <work> --scene <n> [--at <anchor>] [-o file.png]
                                       app scene n's replica with every [data-target] outlined + named
  replicas [<id>] [--json]             replica ids, targets and state keys

Output
  render <work> [-o out.mp4] [--preview] [--from <anchor>] [--to <anchor>]
                                       h264 CRF 18 1080p (--preview: 720p, faster) + .chapters.txt + .srt
  studio <work>                        open Remotion Studio on the compiled timeline

Anchors: w123 | "a phrase" | "a phrase#2" | o:61.5 | f:1845, each with an optional " +0.4s" / " -1s".
Docs: docs/EDIT-YAML.md`;

const media = (name: string): Cmd => async (argv) => {
  let mod: Record<string, unknown>;
  try {
    mod = (await import('./media/index.ts')) as Record<string, unknown>;
  } catch (e) {
    throw new CliError(`media commands are not available (cli/media/index.ts failed to load: ${(e as Error).message.split('\n')[0]})`);
  }
  const fn = mod[name];
  if (typeof fn !== 'function') throw new CliError(`cli/media/index.ts does not export \`${name}\``);
  await (fn as Cmd)(argv);
};

const lazy = (file: string, name: string): Cmd => async (argv) => {
  const mod = (await import(file)) as Record<string, Cmd>;
  await mod[name](argv);
};

const COMMANDS: Record<string, Cmd> = {
  init: media('init'),
  transcribe: media('transcribe'),
  cut: media('cut'),
  aroll: media('aroll'),
  brief: media('brief'),
  face: media('face'),
  compile: lazy('./compile.ts', 'compileCommand'),
  check: lazy('./check.ts', 'checkCommand'),
  still: lazy('./render.ts', 'stillCommand'),
  sheet: lazy('./render.ts', 'sheetCommand'),
  targets: lazy('./render.ts', 'targetsCommand'),
  render: lazy('./render.ts', 'renderCommand'),
  studio: lazy('./render.ts', 'studioCommand'),
  replicas: lazy('./replicas.ts', 'replicasCommand'),
};

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(HELP);
    return;
  }
  const fn = COMMANDS[cmd];
  if (!fn) {
    console.error(`unknown command "${cmd}"\n\n${HELP}`);
    process.exitCode = 2;
    return;
  }
  if (rest.includes('--help') || rest.includes('-h')) {
    console.log(HELP.split('\n').filter((l) => l.includes(` ${cmd} `) || l.startsWith(`  ${cmd}`)).join('\n') || HELP);
    return;
  }
  await fn(rest);
}

main().catch((e) => {
  if (e instanceof CliError) console.error(`${c.red('error')} ${e.message}`);
  else console.error(e);
  process.exitCode = 1;
});
