import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { addProduct, listProducts, setProductStatus } from '../db/repo';
import { displayStatus } from '../domain/inventory';
import type { Product, SettleKind } from '../domain/types';
import { t, type StringKey } from '../i18n';
import { useApp } from '../state';
import { Btn, Card, Chip, Field, H, num, P, Row, Screen } from '../ui/kit';

export default function InventoryScreen() {
  const { db, lang } = useApp();
  const [list, setList] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', price: '', stock: '', owner: '', settle: 'personal' as SettleKind, consigned: false });
  const load = useCallback(() => { void listProducts(db, true).then((p) => setList(p.filter((x) => x.status !== 'deleted'))); }, [db]);
  useFocusEffect(load);

  const save = async () => {
    try { await addProduct(db, { name: f.name, price: num(f.price), stock: num(f.stock), owner: f.owner, settle: f.settle, consigned: f.consigned }); setF({ ...f, name: '', price: '', stock: '' }); setOpen(false); load(); }
    catch { Alert.alert(t(lang, 'inv.add'), `${t(lang, 'inv.name')} / ${t(lang, 'inv.owner')} / ${t(lang, 'inv.price')}`); }
  };
  const actions = (p: Product) => Alert.alert(p.name, '', [
    { text: t(lang, 'status.returned'), onPress: () => void setProductStatus(db, p.id, 'returned').then(load) },
    { text: t(lang, 'status.disposed'), onPress: () => void setProductStatus(db, p.id, 'disposed').then(load) },
    { text: t(lang, 'status.deleted'), style: 'destructive', onPress: () => void setProductStatus(db, p.id, 'deleted').then(load) },
    { text: t(lang, 'common.cancel'), style: 'cancel' },
  ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} keyboardShouldPersistTaps="handled">
        <Row><H>{t(lang, 'inv.title')}</H><Btn small label={t(lang, 'inv.add')} onPress={() => setOpen(!open)} /></Row>
        {open && (
          <Card>
            <Field label={t(lang, 'inv.name')} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} maxLength={80} />
            <Field label={t(lang, 'inv.owner')} value={f.owner} onChangeText={(v) => setF({ ...f, owner: v })} maxLength={40} />
            <Row style={{ gap: 8 }}>
              <View style={{ flex: 1 }}><Field label={t(lang, 'inv.price')} value={f.price} onChangeText={(v) => setF({ ...f, price: v })} keyboardType="number-pad" maxLength={9} /></View>
              <View style={{ flex: 1 }}><Field label={t(lang, 'inv.stock')} value={f.stock} onChangeText={(v) => setF({ ...f, stock: v })} keyboardType="number-pad" maxLength={5} /></View>
            </Row>
            <Row style={{ justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
              <Chip label={t(lang, 'inv.kind.personal')} on={f.settle === 'personal'} onPress={() => setF({ ...f, settle: 'personal' })} />
              <Chip label={t(lang, 'inv.kind.joint')} on={f.settle === 'joint'} onPress={() => setF({ ...f, settle: 'joint' })} />
              <Chip label={t(lang, 'inv.consigned')} on={f.consigned} onPress={() => setF({ ...f, consigned: !f.consigned })} />
            </Row>
            <Btn label={t(lang, 'common.save')} onPress={save} disabled={!f.name.trim() || !f.owner.trim()} />
          </Card>
        )}
        {list.map((p) => (
          <Card key={p.id}>
            <Row><P bold>{p.name}</P><P muted>{t(lang, `status.${displayStatus(p)}` as StringKey)}</P></Row>
            <Row><P muted>{p.owner}{p.consigned ? ` · ${t(lang, 'inv.consigned')}` : ''} · {t(lang, p.settle === 'joint' ? 'inv.kind.joint' : 'inv.kind.personal')}</P><P>{p.price} × {p.stock}</P></Row>
            {p.status === 'active' && <Btn small kind="line" label="⋯" onPress={() => actions(p)} />}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
