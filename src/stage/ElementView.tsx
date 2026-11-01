import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { Element, Rect } from '../types';
import { blurInOut } from '../lib/anim';
import { elementRegistry } from './elements';

// Renders one stage element inside `box` with the shared envelope (blur in at el.frame, blur out at
// el.end). The element itself only animates its inner items, each on its own word.

export type ElementProps<T extends Element['type'] = Element['type']> = {
  el: Extract<Element, { type: T }>;
  box: Rect; // where the element may draw, in output px
  frame: number; // scene-relative
  fps: number;
};

export const ElementView: React.FC<{ el: Element; box: Rect }> = ({ el, box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < el.frame - 1 || frame > el.end + Math.round(0.4 * fps)) return null;
  const Comp = elementRegistry[el.type] as React.FC<ElementProps> | undefined;
  const env = blurInOut(frame, fps, el.frame, el.end, { inMs: 260, outMs: 220 });
  return (
    <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, display: 'flex', alignItems: 'center', justifyContent: 'center', ...env }}>
      {Comp ? (
        <Comp el={el} box={box} frame={frame} fps={fps} />
      ) : (
        <div style={{ color: '#f66', font: '600 32px Inter' }}>Unknown element type: {el.type}</div>
      )}
    </div>
  );
};
