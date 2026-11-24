import type { FinderData, FinderState } from './types';

// Neutral fictional defaults: a brand kit folder. No real names, drives or paths.
export const defaultData: FinderData = {
  title: 'Brand Kit',
  path: 'Macintosh HD/Users/you/Documents/Brand Kit',
  view: 'icon',
  date: 'Today at 9:41 AM',
  search: true,
  stamp: null,
  items: [
    { id: 'logos', name: 'logos', kind: 'folder', meta: '4 items' },
    { id: 'photos', name: 'product photos', kind: 'folder', meta: '12 items' },
    { id: 'footage', name: 'footage', kind: 'folder', meta: '6 items' },
    { id: 'hero', name: 'hero.png', kind: 'image', meta: '3840 × 2160' },
    { id: 'teaser', name: 'teaser.mp4', kind: 'video', meta: '00:16' },
    { id: 'voiceover', name: 'voiceover.wav', kind: 'audio', meta: '00:42' },
    { id: 'brief', name: 'brief.md', kind: 'doc', meta: '2 KB' },
    { id: 'scene', name: 'scene.ts', kind: 'code', meta: '8 KB' },
  ],
  sidebar: [
    { section: 'Favorites', items: [{ name: 'Recents', icon: 'clock' }, { name: 'Applications', icon: 'layout-grid' }, { name: 'Desktop', icon: 'monitor' }, { name: 'Documents', icon: 'file', active: true }, { name: 'Downloads', icon: 'circle-arrow-down' }] },
    { section: 'Locations', items: [{ name: 'iCloud Drive', icon: 'cloud' }, { name: 'Macintosh HD', icon: 'hard-drive' }] },
  ],
};

export const defaultState: FinderState = {
  view: null,
  path: null,
  items: null,
  shown: null,
  upto: null,
  selected: null,
  moved: null,
  newFolder: null,
  rename: null,
  names: {},
  drag: null,
  dropTarget: null,
  scroll: 0,
};
