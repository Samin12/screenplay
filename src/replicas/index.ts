import type { ReplicaDef } from '../app/replica';
import { fixtureApp } from './_fixture/FixtureApp';
import { claudeDesktop } from './claude-desktop';
import { terminal } from './terminal';
import { browser } from './browser';
import { t3Code } from './t3-code';

// Replica library. Each entry is a reusable, data-driven copy of an app's UI.
// See docs/REPLICAS.md for the contract and how to add one.
export const replicas: Record<string, ReplicaDef> = {
  [fixtureApp.id]: fixtureApp,
  [claudeDesktop.id]: claudeDesktop,
  [terminal.id]: terminal,
  [browser.id]: browser,
  [t3Code.id]: t3Code,
};
