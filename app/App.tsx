import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DbOpenError, openDb, wipeAll } from './src/db';
import { detectLang, LANGS, t, type Lang } from './src/i18n';
import EventScreen from './src/screens/EventScreen';
import EventsScreen from './src/screens/EventsScreen';
import ChatScreen from './src/screens/ChatScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { AppLockProvider } from './src/security/AppLock';
import { AppProvider } from './src/state';
import { Btn, C } from './src/ui/kit';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const LANG_KEY = 'lb.lang';

function Tabs({ lang }: { lang: Lang }) {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: C.dark }}>
      <Tab.Screen name="Events" component={EventsScreen} options={{ title: t(lang, 'tab.events') }} />
      <Tab.Screen name="Inventory" component={InventoryScreen} options={{ title: t(lang, 'inv.title') }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: t(lang, 'tab.chat') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t(lang, 'tab.settings') }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [lang, setLangState] = useState<Lang>(detectLang());
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [err, setErr] = useState<DbOpenError | Error | null>(null);

  const open = useCallback(async () => {
    try { setErr(null); setDb(await openDb()); } catch (e) { setErr(e as Error); }
  }, []);
  useEffect(() => {
    void (async () => {
      const saved = await SecureStore.getItemAsync(LANG_KEY).catch(() => null);
      if (saved && (LANGS as string[]).includes(saved)) setLangState(saved as Lang);
      await open();
    })();
  }, [open]);

  const setLang = (l: Lang) => { setLangState(l); void SecureStore.setItemAsync(LANG_KEY, l); };
  const resetApp = useCallback(async () => { await wipeAll(db ?? undefined); setDb(null); await open(); }, [db, open]);

  if (err) {
    // 복호화할 수 없거나 암호화가 꺼진 빌드: 데이터를 조용히 새로 만들지 않고 사용자에게 알린다.
    const mismatch = err instanceof DbOpenError && err.code === 'KEY_MISMATCH';
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 14, backgroundColor: C.bg }}>
        <Text style={{ fontSize: 20, fontWeight: '800' }}>{t(lang, 'app.name')}</Text>
        <Text style={{ fontSize: 15, color: C.sub, lineHeight: 22 }}>
          {mismatch ? 'The saved data cannot be decrypted on this device (for example after restoring to a new phone). Your old data is unreadable; you can reset and start fresh.' : `Could not open secure storage (${(err as DbOpenError).code ?? 'ERROR'}). Please update the app.`}
        </Text>
        {mismatch && <Btn kind="danger" label={t(lang, 'set.wipe')} onPress={() => void wipeAll().then(open)} />}
      </View>
    );
  }
  if (!db) return null;

  return (
    <SafeAreaProvider>
      <AppLockProvider lang={lang}>
        <AppProvider value={{ db, lang, setLang, resetApp }}>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="Tabs" options={{ headerShown: false }}>{() => <Tabs lang={lang} />}</Stack.Screen>
              <Stack.Screen name="Event" component={EventScreen as never} options={{ title: '' }} />
            </Stack.Navigator>
          </NavigationContainer>
          <StatusBar style="dark" />
        </AppProvider>
      </AppLockProvider>
    </SafeAreaProvider>
  );
}
