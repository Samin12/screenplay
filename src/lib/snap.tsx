import React, { createContext, useContext } from 'react';

// A scene that enters or leaves on a hard layout switch draws whatever is on screen at that edge
// complete: an element that starts with the scene skips its blur-in, one that lasts to the scene's
// end skips its blur-out. Without this a hard cut would land on a half-faded frame.

export type Snap = { in: boolean; out: boolean; duration: number };
const Ctx = createContext<Snap>({ in: false, out: false, duration: 0 });
export const SnapProvider = Ctx.Provider;
export const useSnap = () => useContext(Ctx);

// The start / end to hand to an envelope helper: far in the past or `undefined` when that edge snaps.
export function snapEdges(snap: Snap, start: number, end: number): { start: number; end: number | undefined; snapIn: boolean; snapOut: boolean } {
  const snapIn = snap.in && start <= 1;
  const snapOut = snap.out && end >= snap.duration - 1;
  return { start: snapIn ? -100000 : start, end: snapOut ? undefined : end, snapIn, snapOut };
}
