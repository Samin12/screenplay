import React, { useLayoutEffect, useRef, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { PlateSizeProvider, type ReplicaDef, type UiState } from './replica';
import type { Rects } from './logic';

// Renders the replica once per UI state, invisibly, and measures every [data-target] element.
// Rects are in replica design pixels and are corrected for any ancestor transform (Studio preview
// scaling, scene blur-scale), so they are stable across preview and render.
//
// delayRender holds the frame until fonts are ready and measurement has run, so every frame in
// every render tab sees the same rects.

export const useMeasuredTargets = (def: ReplicaDef, data: Record<string, unknown>, states: Record<string, unknown>[], size: [number, number] = def.size) => {
  const [rects, setRects] = useState<Rects[] | null>(null);
  const [handle] = useState(() => delayRender(`measure ${def.id}`, { timeoutInMilliseconds: 60000 }));
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const key = JSON.stringify(states);

  useLayoutEffect(() => {
    let cancelled = false;
    const run = async () => {
      await document.fonts.ready;
      // one extra frame so layout settles after font swap
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const out: Rects[] = refs.current.map((root) => {
        const r: Rects = {};
        if (!root) return r;
        const rr = root.getBoundingClientRect();
        const k = size[0] / (rr.width || size[0]);
        root.querySelectorAll<HTMLElement>('[data-target]').forEach((el) => {
          const b = el.getBoundingClientRect();
          const name = el.dataset.target!;
          if (r[name]) return; // first match wins
          r[name] = { x: (b.left - rr.left) * k, y: (b.top - rr.top) * k, w: b.width * k, h: b.height * k };
        });
        return r;
      });
      if (!cancelled) {
        setRects(out);
        continueRender(handle);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const ui: UiState = { frame: 0, fps: 30, measuring: true };
  const Comp = def.component;
  const measurer = (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden>
      {states.map((st, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          style={{ position: 'absolute', left: 0, top: 0, width: size[0], height: size[1], visibility: 'hidden' }}
        >
          <PlateSizeProvider value={size}>
            <Comp data={data} state={st} ui={ui} />
          </PlateSizeProvider>
        </div>
      ))}
    </div>
  );
  return { rects, measurer };
};
