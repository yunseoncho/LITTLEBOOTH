import React from 'react';
import { Alert, ScrollView, Switch } from 'react-native';
import { LANGS, t } from '../i18n';
import { useAppLock } from '../security/AppLock';
import { useApp } from '../state';
import { Btn, Card, Chip, H, P, Row, Screen } from '../ui/kit';

const NAME = { ko: '한국어', en: 'English', ja: '日本語', zh: '简体中文' } as const;

export default function SettingsScreen() {
  const { lang, setLang, resetApp } = useApp();
  const lock = useAppLock();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card>
          <H>{t(lang, 'set.lang')}</H>
          <Row style={{ justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap' }}>{LANGS.map((l) => <Chip key={l} label={NAME[l]} on={l === lang} onPress={() => setLang(l)} />)}</Row>
        </Card>
        <Card>
          <H>{t(lang, 'lock.title')}</H>
          <Row><P>{t(lang, 'lock.enable')}</P><Switch value={lock.enabled} disabled={!lock.available} onValueChange={(v) => void lock.setEnabled(v)} /></Row>
          {!lock.available && <P muted>{t(lang, 'lock.unavailable')}</P>}
        </Card>
        <Card><H>{t(lang, 'set.privacy')}</H><P>{t(lang, 'set.privacy.body')}</P></Card>
        <Btn kind="danger" label={t(lang, 'set.wipe')} onPress={() => Alert.alert(t(lang, 'set.wipe'), t(lang, 'set.wipe.confirm'), [
          { text: t(lang, 'common.cancel'), style: 'cancel' }, { text: t(lang, 'common.delete'), style: 'destructive', onPress: () => void resetApp() }])} />
      </ScrollView>
    </Screen>
  );
}
