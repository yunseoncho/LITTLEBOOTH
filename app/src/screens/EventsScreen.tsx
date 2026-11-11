import { useFocusEffect, type NavigationProp } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable } from 'react-native';
import { t } from '../i18n';
import { createEvent, listEvents } from '../db/repo';
import type { EventInfo } from '../domain/types';
import { useApp } from '../state';
import { Btn, Card, Field, H, num, P, Row, Screen } from '../ui/kit';

export default function EventsScreen({ navigation }: { navigation: NavigationProp<any> }) {
  const { db, lang } = useApp();
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [place, setPlace] = useState('');
  const [team, setTeam] = useState('1');

  useFocusEffect(useCallback(() => { void listEvents(db).then(setEvents); }, [db]));

  const add = async () => {
    try {
      const id = await createEvent(db, { name, date, place, teamSize: Math.max(1, num(team)) });
      setOpen(false); setName(''); setPlace('');
      navigation.navigate('Event', { eventId: id });
    } catch { Alert.alert(t(lang, 'events.add'), `${t(lang, 'event.name')} / ${t(lang, 'event.date')} (YYYY-MM-DD)`); }
  };

  return (
    <Screen style={{ padding: 16, gap: 12 }}>
      <Row><H>{t(lang, 'events.title')}</H><Btn small label={t(lang, 'events.add')} onPress={() => setOpen(!open)} kind="dark" /></Row>
      {open && (
        <Card>
          <Field label={t(lang, 'event.name')} value={name} onChangeText={setName} maxLength={80} />
          <Field label={`${t(lang, 'event.date')} (YYYY-MM-DD)`} value={date} onChangeText={setDate} maxLength={10} keyboardType="numbers-and-punctuation" />
          <Field label={t(lang, 'event.place')} value={place} onChangeText={setPlace} maxLength={80} />
          <Field label={t(lang, 'event.team')} value={team} onChangeText={setTeam} keyboardType="number-pad" maxLength={2} />
          <Btn label={t(lang, 'common.save')} onPress={add} disabled={!name.trim()} />
        </Card>
      )}
      <FlatList data={events} keyExtractor={(e) => e.id} contentContainerStyle={{ gap: 10 }}
        ListEmptyComponent={<P muted>{t(lang, 'events.empty')}</P>}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('Event', { eventId: item.id })}>
            <Card>
              <Row><P bold>{item.name}</P><P muted>{t(lang, `event.${item.status === 'prep' ? 'prep' : item.status === 'live' ? 'sell' : 'result'}`)}</P></Row>
              <P muted>{item.date}{item.place ? ` · ${item.place}` : ''} · {item.teamSize}</P>
            </Card>
          </Pressable>
        )} />
    </Screen>
  );
}
