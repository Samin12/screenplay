import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import type { Timeline } from './types';
import { sampleTimeline } from './sample';
import { ToolCompositions } from './Targets';

// One composition. Its length, size and fps come from the compiled timeline passed as props
// (`screenplay render` passes work/.screenplay/timeline.json).
export const Root: React.FC = () => (
  <>
    <Composition
      id="Main"
      component={Main as unknown as React.FC<Record<string, unknown>>}
      defaultProps={{ timeline: sampleTimeline } as Record<string, unknown>}
      durationInFrames={sampleTimeline.durationInFrames}
      fps={30}
      width={1920}
      height={1080}
      calculateMetadata={({ props }) => {
        const t = (props as { timeline: Timeline }).timeline;
        return { durationInFrames: Math.max(1, t.durationInFrames), fps: t.fps, width: t.width, height: t.height };
      }}
    />
    {/* CLI tool compositions (screenplay targets / sheet / replicas), not part of the video */}
    <ToolCompositions />
  </>
);
