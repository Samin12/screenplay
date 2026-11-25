import React from 'react';
import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import type { Timeline } from '../types';

// The A-roll's sound. Normally one track. With chapter breathers it plays in pieces: at each breather
// the voice stops, room tone from the recording fills the gap (never digital silence), an optional
// click plays inside it and fades before the first word, and the voice carries on where it stopped.

type Aroll = NonNullable<Timeline['aroll']>;

// Source frame of the A-roll shown/heard at output frame F (inside a breather: the pause frame).
export function arollFrame(aroll: Aroll, F: number): number {
  let f = F;
  (aroll.breathers ?? []).forEach((b, j) => {
    if (F >= b.at + b.frames) f = F - (j + 1) * b.frames;
    else if (F >= b.at) f = b.at - j * b.frames;
  });
  return f;
}

export const ArollAudio: React.FC<{ aroll: Aroll }> = ({ aroll }) => {
  const { fps } = useVideoConfig();
  const br = aroll.breathers ?? [];
  if (br.length === 0) return <Audio src={staticFile(aroll.src)} />;
  const pieces: { from: number; len: number; src: number }[] = [];
  let from = 0;
  br.forEach((b, j) => {
    if (b.at > from) pieces.push({ from, len: b.at - from, src: from - j * b.frames });
    from = b.at + b.frames;
  });
  if (aroll.durationInFrames > from) pieces.push({ from, len: aroll.durationInFrames - from, src: from - br.reduce((s, b) => s + b.frames, 0) });
  return (
    <>
      {pieces.map((p) => (
        <Sequence key={`v${p.from}`} from={p.from} durationInFrames={p.len} layout="none">
          <Audio src={staticFile(aroll.src)} startFrom={p.src} />
        </Sequence>
      ))}
      {br.map((b) => {
        const fade = Math.max(1, Math.round(0.25 * fps));
        const stop = Math.round(b.frames * 0.95);
        return (
          <Sequence key={`b${b.at}`} from={b.at} durationInFrames={b.frames} layout="none">
            {aroll.tone ? <Audio src={staticFile(aroll.tone)} /> : null}
            {aroll.click ? <Audio src={staticFile(aroll.click)} volume={(f) => Math.max(0, Math.min(1, (stop - f) / fade))} /> : null}
          </Sequence>
        );
      })}
    </>
  );
};
