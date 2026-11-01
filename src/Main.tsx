import React from 'react';
import { AbsoluteFill, Audio, Freeze, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Scene, Timeline } from './types';
import { ThemeProvider } from './theme/ThemeContext';
import { SceneTransition, FlashOverlay, transitionOverlap } from './layers/SceneTransition';
import { WebcamLayer } from './layers/Webcam';
import { CanvasBackdrop, PanelFrame, PanelView } from './layers/Panel';
import { StepBadgeLayer } from './layers/StepBadge';
import { PANEL_VIEW } from './theme/panel';
import { AppSceneView } from './app/AppScene';
import { StageSceneView, TalkingOverlay } from './scenes/StageScene';
import { ChapterSceneView } from './scenes/ChapterScene';
import { PlugSceneView } from './scenes/PlugScene';
import { BoardSceneView } from './scenes/BoardScene';
import { themes } from './theme/tokens';
import './theme/fonts';

// Layer order (bottom to top): scene content -> talking head -> talking-head overlays -> flashes.
// In the panel look: canvas -> panel (all scene content) -> tile -> step badge -> chapter cards, which
// take the full screen for the moment the chapter switches, then cut back to the same layout.

const webcamAt = (timeline: Timeline, frame: number) => [...timeline.webcam].reverse().find((k) => k.frame <= frame)?.mode;

const SceneBody: React.FC<{ scene: Scene; timeline: Timeline }> = ({ scene, timeline }) => {
  const panel = timeline.look === 'panel';
  switch (scene.kind) {
    case 'app':
      return <AppSceneView scene={scene} webcam={webcamAt(timeline, scene.from + 12)} view={panel ? PANEL_VIEW : undefined} />;
    case 'stage':
      return <StageSceneView scene={scene} view={panel ? PANEL_VIEW : undefined} />;
    case 'chapter':
      return <ChapterSceneView scene={scene} chapters={timeline.chapters} heading={timeline.chapterGrid.heading} logo={timeline.chapterGrid.logo} />;
    case 'plug':
      return <PlugSceneView scene={scene} />;
    case 'board':
      return <BoardSceneView scene={scene} />;
    case 'talking':
      if (panel) return webcamAt(timeline, scene.from + 12) === 'full' ? null : <TalkingOverlay scene={scene} view={PANEL_VIEW} />;
      return <AbsoluteFill style={{ background: '#000' }} />;
  }
};

// During a dissolve's lead-in the incoming scene shows its first frame (scene-relative frame 0).
const LeadIn: React.FC<{ lead: number; children: React.ReactNode }> = ({ lead, children }) => {
  const f = useCurrentFrame();
  const body = (
    <Sequence from={lead} layout="none">
      {children}
    </Sequence>
  );
  return f < lead ? <Freeze frame={lead}>{body}</Freeze> : body;
};

export const Main: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const { fps } = useVideoConfig();
  const panel = timeline.look === 'panel';
  const bg = themes[timeline.theme]?.bgEdge ?? '#110e0d';
  const sceneLayer = (s: Scene) => {
    const lead = transitionOverlap(s.transitionIn, fps);
    const body = <SceneBody scene={s} timeline={timeline} />;
    const framed = !panel ? (
      body
    ) : s.kind === 'chapter' ? (
      <>
        <CanvasBackdrop from={s.from} />
        {body}
      </>
    ) : (
      <PanelView fill={s.kind === 'app' || s.kind === 'stage' || s.kind === 'talking'}>{body}</PanelView>
    );
    return (
      <Sequence key={s.id} from={s.from - lead} durationInFrames={s.duration + lead} name={`${s.kind}:${s.id}`}>
        <SceneTransition inT={s.transitionIn} outT={s.transitionOut} duration={s.duration} lead={lead}>
          <LeadIn lead={lead}>{framed}</LeadIn>
        </SceneTransition>
      </Sequence>
    );
  };
  return (
    <ThemeProvider name={timeline.theme} look={timeline.look}>
      <AbsoluteFill style={{ background: bg }}>
        {panel ? <PanelFrame>{timeline.scenes.filter((s) => s.kind !== 'chapter').map(sceneLayer)}</PanelFrame> : timeline.scenes.map(sceneLayer)}
        <WebcamLayer timeline={timeline} />
        {panel ? <StepBadgeLayer timeline={timeline} /> : null}
        {panel ? timeline.scenes.filter((s) => s.kind === 'chapter').map(sceneLayer) : null}
        {timeline.scenes
          .filter((s): s is Extract<Scene, { kind: 'talking' }> => s.kind === 'talking' && s.elements.length > 0 && (!panel || webcamAt(timeline, s.from + 12) === 'full'))
          .map((s) => (
            <Sequence key={`o-${s.id}`} from={s.from} durationInFrames={s.duration} name={`overlay:${s.id}`}>
              <TalkingOverlay scene={s} />
            </Sequence>
          ))}
        {timeline.scenes
          .filter((s) => s.transitionIn === 'flash')
          .map((s) => (
            <FlashOverlay key={`f-${s.id}`} at={s.from} />
          ))}
        {timeline.aroll ? <Audio src={staticFile(timeline.aroll.src)} /> : null}
      </AbsoluteFill>
    </ThemeProvider>
  );
};
