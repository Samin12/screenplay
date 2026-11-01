import type React from 'react';
import type { ElementType } from '../../types';
import type { ElementProps } from '../ElementView';
import { Keys } from './groupB/Keys';
import { Table } from './groupB/Table';
import { Tweet } from './groupB/Tweet';
import { Sticker } from './groupB/Sticker';
import { ImageCard } from './groupB/ImageCard';
import { Prompt } from './groupB/Prompt';
import { Grid } from './groupB/Grid';
import { Quote } from './groupB/Quote';

// Group B elements (cards, keys, tables, media). Owned by the stage-elements-B work package.
export const groupB: Partial<Record<ElementType, React.FC<ElementProps<any>>>> = {
  keys: Keys,
  table: Table,
  tweet: Tweet,
  sticker: Sticker,
  image: ImageCard,
  prompt: Prompt,
  grid: Grid,
  quote: Quote,
};
