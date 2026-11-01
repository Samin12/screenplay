import React, { createContext, useContext } from 'react';
import { themes, type Theme } from './tokens';
import type { Look, ThemeName } from '../types';
import { setTextMetrics } from '../stage/elements/groupA/kit';

const Ctx = createContext<Theme>(themes['ember-dark']);
const LookCtx = createContext<Look>('reference');

export const ThemeProvider: React.FC<{ name: ThemeName; look?: Look; children: React.ReactNode }> = ({ name, look = 'reference', children }) => {
  // The width tables are Outfit and Newsreader; Inter runs wider, so measure it conservatively.
  setTextMetrics(name === 'velour' ? { display: 1.1, serif: 1.24 } : { display: 1, serif: 1 });
  return (
    <LookCtx.Provider value={look}>
      <Ctx.Provider value={themes[name] ?? themes['ember-dark']}>{children}</Ctx.Provider>
    </LookCtx.Provider>
  );
};

export const useTheme = () => useContext(Ctx);
export const useLook = () => useContext(LookCtx);
