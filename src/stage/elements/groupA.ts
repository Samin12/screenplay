import type React from 'react';
import type { ElementType } from '../../types';
import type { ElementProps } from '../ElementView';
import { IconList } from './groupA/IconList';
import { Bullets } from './groupA/Bullets';
import { Chips } from './groupA/Chips';
import { Flow } from './groupA/Flow';
import { Tree } from './groupA/Tree';
import { Compare } from './groupA/Compare';
import { Counter } from './groupA/Counter';
import { Stat } from './groupA/Stat';
import { Lower } from './groupA/Lower';
import { Cta } from './groupA/Cta';

// Group A elements (lists, diagrams, numbers). Owned by the stage-elements-A work package.
export const groupA: Partial<Record<ElementType, React.FC<ElementProps<any>>>> = {
  iconlist: IconList,
  bullets: Bullets,
  chips: Chips,
  flow: Flow,
  tree: Tree,
  compare: Compare,
  counter: Counter,
  stat: Stat,
  lower: Lower,
  cta: Cta,
};
