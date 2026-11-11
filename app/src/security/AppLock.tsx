import * as LocalAuth from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { t, type Lang } from '../i18n';
import { getLockPref, setLockPref } from './dbKey';

const RELOCK_MS = 60_000; // 백그라운드에서 1분 넘게 있다 돌아오면 다시 잠근다

interface LockCtx { available: boolean; enabled: boolean; setEnabled: (on: boolean) => Promise<void> }
const Ctx = createContext<LockCtx>({ available: false, enabled: false, setEnabled: async () => {} });
export const useAppLock = () => useContext(Ctx);

export function AppLockProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(false);
  const [enabled, setEn] = useState(false);
  const [locked, setLocked] = useState(true);
  const leftAt = useRef<number | null>(null);

  const auth = useCallback(async () => {
    const r = await LocalAuth.authenticateAsync({ promptMessage: t(lang, 'lock.reason') });
    return r.success;
  }, [lang]);

  useEffect(() => {
    (async () => {
      const level = await LocalAuth.getEnrolledLevelAsync(); // 암호만 있어도 SECRET
      const av = level !== LocalAuth.SecurityLevel.NONE;
      const want = av && (await getLockPref());
      setAvailable(av); setEn(want); setLocked(want); setReady(true);
    })();
    // 앱 전환기·백그라운드 스냅샷에서 내용이 보이지 않게 블러 (iOS)
    ScreenCapture.enableAppSwitcherProtectionAsync(1).catch(() => {});
    return () => { ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {}); };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') leftAt.current = Date.now();
      if (s === 'active' && enabled && leftAt.current && Date.now() - leftAt.current > RELOCK_MS) setLocked(true);
      if (s === 'active') leftAt.current = null;
    });
    return () => sub.remove();
  }, [enabled]);

  useEffect(() => { if (ready && locked) void auth().then((ok) => ok && setLocked(false)); }, [ready, locked, auth]);

  const setEnabled = useCallback(async (on: boolean) => {
    if (on && !available) return;
    if (!on && !(await auth())) return; // 끄려면 먼저 인증 — 잠금이 풀려 있는 폰을 집어 든 사람이 끌 수 없게
    await setLockPref(on); setEn(on);
  }, [available, auth]);

  if (!ready) return null;
  if (locked) {
    return (
      <View style={s.wrap}>
        <Text style={s.title}>{t(lang, 'app.name')}</Text>
        <Text style={s.sub}>{t(lang, 'lock.title')}</Text>
        <Pressable style={s.btn} onPress={() => void auth().then((ok) => ok && setLocked(false))}>
          <Text style={s.btnT}>{t(lang, 'lock.unlock')}</Text>
        </Pressable>
      </View>
    );
  }
  return <Ctx.Provider value={{ available, enabled, setEnabled }}>{children}</Ctx.Provider>;
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#141416', alignItems: 'center', justifyContent: 'center', gap: 14 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  sub: { color: '#b3b3b9', fontSize: 15 },
  btn: { marginTop: 12, backgroundColor: '#fff', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12 },
  btnT: { color: '#141416', fontWeight: '700', fontSize: 16 },
});
