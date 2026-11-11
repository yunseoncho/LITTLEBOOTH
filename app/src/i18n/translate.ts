import { STRINGS, type Lang, type StringKey } from './strings';

export function t(lang: Lang, key: StringKey, params?: Record<string, string | number>): string {
  let s = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  if (params) for (const k of Object.keys(params)) s = s.split(`{${k}}`).join(String(params[k]));
  return s;
}
