import { useFocusEffect, type RouteProp } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, Share, View } from 'react-native';
import { addCost, eventItems, getEvent, listCosts, listProducts, listSales, recordSale, RepoError, setEventItem, updateEvent, voidSale } from '../db/repo';
import { salesToCsv } from '../domain/export';
import { averageOrder, hourly, payMix, settle, topProducts } from '../domain/settlement';
import { formatMoney, saleTotal } from '../domain/money';
import type { EventCost, EventInfo, PayMethod, Product, Sale } from '../domain/types';
import { t, type StringKey } from '../i18n';
import { useApp } from '../state';
import { Btn, Card, Chip, Field, H, num, P, Row, Screen, Stepper } from '../ui/kit';

type Tab = 'prep' | 'sell' | 'result';
const PAYS: PayMethod[] = ['cash', 'transfer', 'mobile', 'card', 'other'];
const LOCALE: Record<string, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN' };

export default function EventScreen({ route }: { route: RouteProp<{ Event: { eventId: string } }, 'Event'> }) {
  const { db, lang } = useApp();
  const eid = route.params.eventId;
  const [tab, setTab] = useState<Tab>('prep');
  const [ev, setEv] = useState<EventInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<{ productId: string; qty: number }[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [costs, setCosts] = useState<EventCost[]>([]);

  const load = useCallback(async () => {
    setEv(await getEvent(db, eid)); setProducts(await listProducts(db)); setItems(await eventItems(db, eid));
    setSales(await listSales(db, eid)); setCosts(await listCosts(db, eid));
  }, [db, eid]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!ev) return <Screen />;
  const money = (n: number) => formatMoney(n, ev.currency, LOCALE[lang]);
  const seg: Tab[] = ['prep', 'sell', 'result'];
  return (
    <Screen>
      <Row style={{ padding: 12, gap: 8, justifyContent: 'flex-start' }}>
        {seg.map((s) => <Chip key={s} label={t(lang, `event.${s}` as StringKey)} on={tab === s} onPress={() => setTab(s)} />)}
      </Row>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }} keyboardShouldPersistTaps="handled">
        {tab === 'prep' && <Prep ev={ev} products={products} items={items} costs={costs} reload={load} money={money} />}
        {tab === 'sell' && <Sell ev={ev} products={products} items={items} sales={sales} reload={load} money={money} />}
        {tab === 'result' && <Result ev={ev} sales={sales} costs={costs} money={money} />}
      </ScrollView>
    </Screen>
  );
}

function Prep({ ev, products, items, costs, reload, money }: { ev: EventInfo; products: Product[]; items: { productId: string; qty: number }[]; costs: EventCost[]; reload: () => Promise<void>; money: (n: number) => string }) {
  const { db, lang } = useApp();
  const [hyp, setHyp] = useState(ev.hypothesis);
  const [cl, setCl] = useState(''); const [ca, setCa] = useState('');
  const qty = (pid: string) => items.find((i) => i.productId === pid)?.qty ?? 0;
  return (
    <>
      <Card>
        <Field label={t(lang, 'event.hyp')} value={hyp} onChangeText={setHyp} maxLength={200} onEndEditing={() => void updateEvent(db, ev.id, { hypothesis: hyp })} />
        <Row><P>{t(lang, 'event.team')}</P><Stepper value={ev.teamSize} max={50} onChange={(n) => void updateEvent(db, ev.id, { teamSize: Math.max(1, n) }).then(reload)} /></Row>
        <Row>
          {ev.status === 'prep' && <Btn label={t(lang, 'event.start')} onPress={() => void updateEvent(db, ev.id, { status: 'live' }).then(reload)} />}
          {ev.status === 'live' && <Btn label={t(lang, 'event.end')} kind="accent" onPress={() => void updateEvent(db, ev.id, { status: 'done' }).then(reload)} />}
        </Row>
      </Card>
      <Card>
        <H>{t(lang, 'inv.title')}</H>
        {products.length === 0 && <P muted>{t(lang, 'inv.add')} →</P>}
        {products.map((p) => (
          <Row key={p.id}><View style={{ flex: 1 }}><P bold>{p.name}</P><P muted>{p.owner} · {money(p.price)} · {t(lang, 'inv.stock')} {p.stock}</P></View>
            <Stepper value={qty(p.id)} max={p.stock} onChange={(n) => void setEventItem(db, ev.id, p.id, n).then(reload)} /></Row>
        ))}
      </Card>
      <Card>
        <H>{t(lang, 'settle.cost')}</H>
        {costs.map((c) => <Row key={c.id}><P>{c.label}</P><P bold>{money(c.amount)}</P></Row>)}
        <Field label={t(lang, 'settle.cost')} value={cl} onChangeText={setCl} maxLength={40} />
        <Field label={t(lang, 'inv.price')} value={ca} onChangeText={setCa} keyboardType="number-pad" maxLength={9} />
        <Btn small kind="line" label={t(lang, 'common.save')} disabled={!cl.trim() || !num(ca)} onPress={() => void addCost(db, ev.id, cl, num(ca)).then(() => { setCl(''); setCa(''); return reload(); })} />
      </Card>
    </>
  );
}

function Sell({ ev, products, items, sales, reload, money }: { ev: EventInfo; products: Product[]; items: { productId: string; qty: number }[]; sales: Sale[]; reload: () => Promise<void>; money: (n: number) => string }) {
  const { db, lang } = useApp();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [pay, setPay] = useState<PayMethod>('transfer');
  const [disc, setDisc] = useState(''); const [extra, setExtra] = useState('');
  const shown = useMemo(() => (items.length ? products.filter((p) => items.some((i) => i.productId === p.id)) : products), [products, items]);
  const lines = shown.filter((p) => cart[p.id] > 0);
  const subtotal = lines.reduce((a, p) => a + p.price * cart[p.id], 0);
  const total = Math.max(0, subtotal + num(extra) - num(disc));

  const add = (p: Product) => {
    if ((cart[p.id] ?? 0) >= p.stock) return Alert.alert(p.name, t(lang, 'sell.nostock'));
    setCart({ ...cart, [p.id]: (cart[p.id] ?? 0) + 1 });
  };
  const submit = async () => {
    try {
      await recordSale(db, { eventId: ev.id, pay, items: lines.map((p) => ({ productId: p.id, qty: cart[p.id] })), discount: num(disc), extra: num(extra) });
      setCart({}); setDisc(''); setExtra(''); await reload();
    } catch (e) {
      Alert.alert(t(lang, 'sell.done'), e instanceof RepoError && e.code === 'NO_STOCK' ? `${e.message}: ${t(lang, 'sell.nostock')}` : 'Invalid');
      await reload();
    }
  };
  return (
    <>
      <Row style={{ flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' }}>
        {shown.map((p) => <Chip key={p.id} label={`${p.name} · ${money(p.price)} (${p.stock})`} onPress={() => add(p)} />)}
      </Row>
      <Card>
        <H>{t(lang, 'sell.cart')}</H>
        {lines.length === 0 && <P muted>{t(lang, 'sell.empty')}</P>}
        {lines.map((p) => <Row key={p.id}><P>{p.name}</P><Stepper value={cart[p.id]} max={p.stock} onChange={(n) => setCart({ ...cart, [p.id]: n })} /></Row>)}
        <Row style={{ gap: 8 }}>
          <View style={{ flex: 1 }}><Field label={t(lang, 'sell.discount')} value={disc} onChangeText={setDisc} keyboardType="number-pad" maxLength={9} /></View>
          <View style={{ flex: 1 }}><Field label={t(lang, 'sell.extra')} value={extra} onChangeText={setExtra} keyboardType="number-pad" maxLength={9} /></View>
        </Row>
        <Row style={{ flexWrap: 'wrap', justifyContent: 'flex-start', gap: 6 }}>{PAYS.map((m) => <Chip key={m} label={t(lang, `pay.${m}` as StringKey)} on={pay === m} onPress={() => setPay(m)} />)}</Row>
        <Btn label={`${t(lang, 'sell.done')} · ${money(total)}`} onPress={submit} disabled={lines.length === 0} kind="accent" />
      </Card>
      {sales.slice(0, 20).map((s) => (
        <Card key={s.id} style={{ opacity: s.voidedAt ? 0.45 : 1 }}>
          <Row><P bold>{new Date(s.at).toTimeString().slice(0, 5)} · {t(lang, `pay.${s.pay}` as StringKey)}</P><P bold>{money(saleTotal(s))}</P></Row>
          <P muted>{s.lines.map((l) => `${l.name}×${l.qty}`).join(', ')}</P>
          {!s.voidedAt && <Btn small kind="line" label={t(lang, 'sell.void')} onPress={() => Alert.alert(t(lang, 'sell.void'), '', [{ text: t(lang, 'common.cancel') }, { text: t(lang, 'sell.void'), style: 'destructive', onPress: () => void voidSale(db, s.id).then(reload) }])} />}
        </Card>
      ))}
    </>
  );
}

function Result({ ev, sales, costs, money }: { ev: EventInfo; sales: Sale[]; costs: EventCost[]; money: (n: number) => string }) {
  const { lang } = useApp();
  const r = settle(sales, costs, ev.teamSize);
  const mix = payMix(sales), top = topProducts(sales), h = hourly(sales);
  const peak = h.indexOf(Math.max(...h));
  return (
    <>
      <Card>
        <Row><P>{t(lang, 'result.total')}</P><H>{money(r.total)}</H></Row>
        <Row><P>{t(lang, 'result.orders')}</P><P bold>{r.orders}</P></Row>
        <Row><P>{t(lang, 'result.avg')}</P><P bold>{money(averageOrder(sales))}</P></Row>
        <Row><P>{t(lang, 'result.discount')}</P><P bold>−{money(r.discount)}</P></Row>
        {Math.max(...h) > 0 && <P muted>{peak}:00 · {h[peak]}</P>}
      </Card>
      <Card>
        <H>{t(lang, 'result.settle')}</H>
        <P muted>{t(lang, 'settle.personal')}</P>
        {Object.entries(r.personal).map(([o, v]) => <Row key={o}><P>{o}</P><P bold>{money(v)}</P></Row>)}
        <Row><P bold>{t(lang, 'settle.personal')}</P><P bold>{money(r.personalTotal)}</P></Row>
        <P muted>{t(lang, 'settle.joint')}</P>
        {Object.entries(r.jointByOwner).map(([o, v]) => <Row key={o}><P>{o}</P><P>{money(v)}</P></Row>)}
        <Row><P>{t(lang, 'result.discount')}</P><P>−{money(r.discount)}</P></Row>
        <Row><P>{t(lang, 'settle.cost')}</P><P>−{money(r.costs)}</P></Row>
        <Row><P bold>{t(lang, 'settle.joint')}</P><P bold>{money(r.jointNet)}</P></Row>
        <Row><P bold>{t(lang, 'settle.perhead')} (÷{r.teamSize})</P><H>{money(r.perHead)}</H></Row>
        {r.remainder !== 0 && <Row><P muted>{t(lang, 'settle.rest')}</P><P muted>{money(r.remainder)}</P></Row>}
      </Card>
      <Card>
        <H>{t(lang, 'result.mix')}</H>
        {(Object.keys(mix) as PayMethod[]).map((m) => <Row key={m}><P>{t(lang, `pay.${m}` as StringKey)} · {mix[m]!.count}</P><P bold>{money(mix[m]!.amount)}</P></Row>)}
        <H>{t(lang, 'result.top')}</H>
        {top.map((x) => <Row key={x.name}><P>{x.name}</P><P bold>{x.qty}</P></Row>)}
      </Card>
      <Btn kind="line" label={t(lang, 'set.export')} onPress={() => void Share.share({ title: `${ev.name}.csv`, message: salesToCsv(sales, ev.name) })} />
    </>
  );
}
