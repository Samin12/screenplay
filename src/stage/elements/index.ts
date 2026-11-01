import type React from 'react';
import type { ElementType } from '../../types';
import type { ElementProps } from '../ElementView';
import { Title } from './Title';
import { groupA } from './groupA';
import { groupB } from './groupB';

// type -> component. New element types: add the type to src/types.ts, the component to a group
// registry, and the authoring fields to cli/compile.ts.
export const elementRegistry: Partial<Record<ElementType, React.FC<ElementProps<any>>>> = {
  title: Title,
  ...groupA,
  ...groupB,
};
