import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { getEvent, listCosts, listEvents, listProducts, listSales } from '../db/repo';
import { node, START, type ChatContext, type ChatNode } from '../domain/chat';
import { lowStock } from '../domain/inventory';
import { formatMoney } from '../domain/money';
import { settle, topProducts } from '../domain/settlement';
import { t, type StringKey } from '../i18n';
import { useApp } from '../state';
import { Btn, C, H, P, Screen } from '../ui/kit';

const LOCALE: Record<string, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN' };
interface Msg { me: boolean; text: string }

/** AI 없는 캐릭터 1명. 내 장부 숫자로 문장을 채우는 대본만 쓴다. 캐릭터 이름·그림은 IP 확정 전 임시. */
export default function ChatScreen() {
  const { db, lang } = useApp();
  const [ctx, setCtx] = useState<ChatContext | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [cur, setCur] = useState<ChatNode | null>(null);

  const say = useCallback((n: ChatNode, base: Msg[]) => {
    setCur(n); setMsgs([...base, { me: false, text: t(lang, n.textKey, n.params) }]);
  }, [lang]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const evs = await listEvents(db);
      const e = evs.find((x) => x.status === 'done') ?? evs[0];
      if (!e) { setCtx(null); setCur(null); setMsgs([]); return; }
      const ev = (await getEvent(db, e.id))!;
      const sales = await listSales(db, ev.id), costs = await listCosts(db, ev.id);
      const r = settle(sales, costs, ev.teamSize);
      const top = topProducts(sales, 1)[0], low = lowStock(await listProducts(db))[0];
      const c: ChatContext = { total: formatMoney(r.total, ev.currency, LOCALE[lang]), orders: r.orders, top: top && { name: top.name, qty: top.qty },
        low: low && { name: low.name, left: low.stock }, hypothesis: ev.hypothesis || undefined };
      setCtx(c); say(node(START, c), []);
    })();
  }, [db, lang, say]));

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <H>{t(lang, 'chat.title')}</H>
        {!ctx && <P muted>{t(lang, 'chat.none')}</P>}
        {msgs.map((m, i) => (
          <View key={i} style={{ alignSelf: m.me ? 'flex-end' : 'flex-start', maxWidth: '85%', backgroundColor: m.me ? C.dark : C.paper, borderWidth: m.me ? 0 : 1, borderColor: C.line, borderRadius: 16, padding: 12 }}>
            <Text style={{ color: m.me ? '#fff' : C.fg, fontSize: 16, lineHeight: 23 }}>{m.text}</Text>
          </View>
        ))}
        {ctx && cur?.choices.map((ch) => (
          <Btn key={ch.labelKey + ch.next} kind="line" label={t(lang, ch.labelKey as StringKey)}
            onPress={() => say(node(ch.next, ctx), [...msgs, { me: true, text: t(lang, ch.labelKey) }])} />
        ))}
      </ScrollView>
    </Screen>
  );
}
