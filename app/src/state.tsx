import type { SQLiteDatabase } from 'expo-sqlite';
import React, { createContext, useContext } from 'react';
import type { Lang } from './i18n';

export interface AppState { db: SQLiteDatabase; lang: Lang; setLang: (l: Lang) => void; resetApp: () => Promise<void> }
const Ctx = createContext<AppState | null>(null);
export const AppProvider = Ctx.Provider;
export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppProvider missing');
  return v;
}
