import React from 'react';
import { icons, type LucideProps } from 'lucide-react';

// Lucide icon by kebab-case name ("panel-right", "git-branch"). Unknown names render a dot so a typo
// never crashes a render; `screenplay check` warns about them.
const toPascal = (s: string) => s.replace(/(^|[-_ ])(\w)/g, (_, __, c: string) => c.toUpperCase());

export const iconExists = (name: string) => toPascal(name) in icons;

export const Icon: React.FC<{ name?: string; size: number; color: string; strokeWidth?: number } & Omit<LucideProps, 'ref' | 'stroke' | 'strokeWidth'>> = ({ name, size, color, strokeWidth = 2, ...rest }) => {
  const C = name ? (icons as Record<string, React.FC<LucideProps>>)[toPascal(name)] : undefined;
  if (!C) return <svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={size / 6} fill={color} /></svg>;
  return <C size={size} color={color} strokeWidth={strokeWidth} {...rest} />;
};
