#!/usr/bin/env node
// Builds this example's placeholder media. Nothing here is real footage:
//   aroll.mp4      a neutral gradient with a simple moving shape standing in for the presenter, and
//                  "speech" that is a short tone burst for every word in words.out.json over low room noise
//   media/*.png    four flat colour cards used as the photos in the Finder window
// Needs ffmpeg on PATH and Node 22+. Run:  node examples/ads-tutorial-mini/make-media.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const words = JSON.parse(fs.readFileSync(path.join(DIR, 'words.out.json'), 'utf8'));
const { duration, fps } = JSON.parse(fs.readFileSync(path.join(DIR, 'aroll.json'), 'utf8'));
fs.mkdirSync(path.join(DIR, 'media'), { recursive: true });

// ---- a tiny PNG writer (RGBA, no dependencies) ----
function png(file, w, h, pixel) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) raw.set(pixel(x, y), y * (w * 4 + 1) + 1 + x * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(w, 0);
  head.writeUInt32BE(h, 4);
  head.set([8, 6, 0, 0, 0], 8);
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
const cover = (d) => Math.max(0, Math.min(1, 0.5 - d)); // soft edge from a signed distance in px

// ---- the "presenter": a head and shoulders made of two flat shapes ----
const PW = 900;
const PH = 900;
png(path.join(DIR, 'media', '_presenter.png'), PW, PH, (x, y) => {
  const head = Math.hypot(x - 450, y - 300) - 150;
  const body = (Math.hypot((x - 450) / 1.25, (y - 900) / 1.0) - 330) * 1.0;
  const a = Math.max(cover(head), cover(body));
  const shade = head < body ? [232, 196, 160] : [86, 104, 132];
  return [shade[0], shade[1], shade[2], Math.round(255 * a)];
});

// ---- four "photos" for the Finder window ----
const cards = [
  ['photo-desk.png', [214, 138, 92], [246, 214, 170]],
  ['photo-shelf.png', [84, 132, 148], [190, 222, 214]],
  ['photo-box.png', [146, 118, 176], [226, 208, 236]],
  ['photo-label.png', [96, 148, 104], [214, 232, 190]],
];
for (const [name, a, b] of cards) {
  png(path.join(DIR, 'media', name), 640, 400, (x, y) => {
    const t = (x + y) / 1040;
    const inBox = Math.abs(x - 320) < 110 && Math.abs(y - 215) < 90;
    const c = inBox ? [250, 247, 240] : a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return [c[0], c[1], c[2], 255];
  });
}

// ---- the "voice": room noise plus a soft tone burst for every word ----
const SR = 48000;
const n = Math.round(duration * SR);
const pcm = new Float32Array(n);
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;
let lp = 0;
for (let i = 0; i < n; i++) {
  lp += 0.08 * (rnd() - lp); // low-passed noise: a quiet, steady room
  pcm[i] = lp * 0.012;
}
words.forEach((w, k) => {
  const f0 = 150 + ((k * 37) % 90);
  const a = Math.round(w.start * SR);
  const b = Math.min(n, Math.round(w.end * SR));
  for (let i = a; i < b; i++) {
    const t = (i - a) / SR;
    const env = Math.min(1, t / 0.02, (b - i) / SR / 0.04);
    pcm[i] += 0.16 * env * (Math.sin(2 * Math.PI * f0 * t) + 0.45 * Math.sin(2 * Math.PI * 2 * f0 * t) + 0.2 * Math.sin(2 * Math.PI * 3.01 * f0 * t));
  }
});
const wav = Buffer.alloc(44 + n * 2);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + n * 2, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(SR, 24);
wav.writeUInt32LE(SR * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), 44 + i * 2);
const voice = path.join(DIR, 'media', '_voice.wav');
fs.writeFileSync(voice, wav);

// ---- aroll.mp4 ----
const out = path.join(DIR, 'aroll.mp4');
const r = spawnSync(
  'ffmpeg',
  [
    '-v', 'error', '-y',
    '-f', 'lavfi', '-i', `gradients=s=1920x1080:c0=0x39465a:c1=0x1c222c:x0=0:y0=0:x1=1920:y1=1080:d=${duration}:r=${fps}`,
    '-loop', '1', '-framerate', String(fps), '-i', path.join(DIR, 'media', '_presenter.png'),
    '-i', voice,
    '-filter_complex', "[0:v][1:v]overlay=x='(W-w)/2+46*sin(t*0.9)':y='H-h+10+9*sin(t*1.7)',format=yuv420p[v]",
    '-map', '[v]', '-map', '2:a', '-t', String(duration), '-r', String(fps),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-g', String(fps), '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-movflags', '+faststart', out,
  ],
  { stdio: 'inherit' },
);
if (r.status !== 0) {
  console.error('ffmpeg failed: is it installed and on PATH?');
  process.exit(1);
}
console.log(`wrote ${path.relative(process.cwd(), out)} (${duration} s) and media/*.png`);
