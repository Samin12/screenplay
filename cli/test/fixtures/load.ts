// Shared synthetic fixtures for cli tests: ~79 s of words (fps 30), aroll.json with two cuts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileEdit, type ArollJson, type CompileInput, type CompileResult } from '../../compile.ts';
import type { Word } from '../../anchors.ts';

export const FIXTURES = path.dirname(fileURLToPath(import.meta.url));
export const words: Word[] = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'words.out.json'), 'utf8'));
export const aroll: ArollJson = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'aroll.json'), 'utf8'));
export const basicYaml = fs.readFileSync(path.join(FIXTURES, 'basic.edit.yaml'), 'utf8');

export const FPS = 30;
export const F = (s: number) => Math.round(s * FPS);
export const w = (id: string) => {
  const x = words.find((y) => y.id === id);
  if (!x) throw new Error(`no ${id}`);
  return x;
};

// The fixtures describe the full-frame reference look unless a test asks for another.
export function compile(yaml: string, opts: Partial<CompileInput> = {}): CompileResult {
  const withLook = /^look:/m.test(yaml) ? yaml : `${yaml}\nlook: reference\n`;
  return compileEdit({ yaml: withLook, words, aroll, arollVideo: true, ...opts });
}

export const errors = (r: CompileResult) => r.diags.filter((d) => d.level === 'error');
export const warnings = (r: CompileResult) => r.diags.filter((d) => d.level === 'warn');

// Strip the common indentation of a template literal so YAML can be written inline.
export function y(strings: TemplateStringsArray, ...vals: unknown[]): string {
  const raw = strings.reduce((s, str, i) => s + str + (i < vals.length ? String(vals[i]) : ''), '');
  const lines = raw.replace(/^\n/, '').split('\n');
  const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(ind)).join('\n');
}

// One app scene on the _fixture replica starting at w41 ("When") until the end. Beats are YAML
// flow mappings, e.g. '{ at: "show panel", click: toggle }'; extra lines go into the scene mapping.
export const appScene = (beats: string[], extra: string[] = []) =>
  ['scenes:', '  - kind: talking', '    at: w0', '  - kind: app', '    at: w41', '    app: _fixture', ...extra.map((l) => `    ${l}`), '    beats:', ...beats.map((b) => `      - ${b}`)].join('\n');
