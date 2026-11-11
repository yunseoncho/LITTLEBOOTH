import { getLocales } from 'expo-localization';
import { LANGS, STRINGS, type Lang, type StringKey } from './strings';

export type { Lang, StringKey };
export { LANGS };

/** 기기 언어 → 지원 언어. 모르면 en. 번체(zh-Hant)는 v1에서 간체로 대체하지 않고 en으로 둔다(오역 방지). */
export function detectLang(): Lang {
  const l = getLocales()[0];
  const code = l?.languageCode ?? 'en';
  if (code === 'ko') return 'ko';
  if (code === 'ja') return 'ja';
  if (code === 'zh' && (l?.languageScriptCode ?? 'Hans') === 'Hans') return 'zh';
  return 'en';
}

export { t } from './translate';
