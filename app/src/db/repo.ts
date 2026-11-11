import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { canSell } from '../domain/inventory';
import { isValidAmount, isValidQty } from '../domain/money';
import type { EventCost, EventInfo, EventStatus, PayMethod, Product, ProductStatus, Sale, SaleLine, SettleKind } from '../domain/types';

export class RepoError extends Error {
  constructor(public code: 'INVALID' | 'NO_STOCK' | 'NOT_FOUND', msg?: string) { super(msg ?? code); }
}
const id = () => Crypto.randomUUID();
const PAYS: PayMethod[] = ['cash', 'transfer', 'mobile', 'card', 'other'];
const text = (s: string, max = 80) => s.trim().slice(0, max); // 길이 제한: 비정상적으로 긴 입력이 저장·화면을 깨지 않게

/* ---------- events ---------- */
type EventRow = { id: string; name: string; date: string; place: string; status: EventStatus; team_size: number; hypothesis: string; currency: string };
const toEvent = (r: EventRow): EventInfo => ({ id: r.id, name: r.name, date: r.date, place: r.place, status: r.status, teamSize: r.team_size, hypothesis: r.hypothesis, currency: r.currency });

export async function listEvents(db: SQLiteDatabase): Promise<EventInfo[]> {
  return (await db.getAllAsync<EventRow>('SELECT * FROM events ORDER BY date DESC, rowid DESC')).map(toEvent);
}
export async function getEvent(db: SQLiteDatabase, eid: string): Promise<EventInfo | null> {
  const r = await db.getFirstAsync<EventRow>('SELECT * FROM events WHERE id = ?', eid);
  return r ? toEvent(r) : null;
}
export async function createEvent(db: SQLiteDatabase, e: { name: string; date: string; place?: string; teamSize?: number; currency?: string }) {
  const name = text(e.name);
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) throw new RepoError('INVALID', 'event');
  const team = e.teamSize ?? 1;
  if (!Number.isInteger(team) || team < 1 || team > 50) throw new RepoError('INVALID', 'team');
  const eid = id();
  await db.runAsync('INSERT INTO events(id,name,date,place,team_size,currency) VALUES(?,?,?,?,?,?)', eid, name, e.date, text(e.place ?? ''), team, e.currency ?? 'KRW');
  return eid;
}
export async function updateEvent(db: SQLiteDatabase, eid: string, p: Partial<Pick<EventInfo, 'hypothesis' | 'teamSize' | 'status' | 'place' | 'name'>>) {
  if (p.hypothesis !== undefined) await db.runAsync('UPDATE events SET hypothesis=? WHERE id=?', text(p.hypothesis, 200), eid);
  if (p.teamSize !== undefined) {
    if (!Number.isInteger(p.teamSize) || p.teamSize < 1 || p.teamSize > 50) throw new RepoError('INVALID', 'team');
    await db.runAsync('UPDATE events SET team_size=? WHERE id=?', p.teamSize, eid);
  }
  if (p.status !== undefined) await db.runAsync('UPDATE events SET status=? WHERE id=?', p.status, eid);
  if (p.place !== undefined) await db.runAsync('UPDATE events SET place=? WHERE id=?', text(p.place), eid);
  if (p.name !== undefined && text(p.name)) await db.runAsync('UPDATE events SET name=? WHERE id=?', text(p.name), eid);
}

/* ---------- products ---------- */
type ProductRow = { id: string; code: string; name: string; category: string; owner: string; consigned: number; settle: SettleKind; price: number; stock: number; status: ProductStatus };
const toProduct = (r: ProductRow): Product => ({ ...r, consigned: r.consigned === 1 });

export async function listProducts(db: SQLiteDatabase, includeInactive = false): Promise<Product[]> {
  const rows = await db.getAllAsync<ProductRow>(`SELECT * FROM products ${includeInactive ? '' : "WHERE status='active'"} ORDER BY code, name`);
  return rows.map(toProduct);
}
export async function addProduct(db: SQLiteDatabase, p: { name: string; price: number; stock: number; owner: string; settle: SettleKind; consigned?: boolean; category?: string; code?: string }) {
  const name = text(p.name), owner = text(p.owner, 40);
  if (!name || !owner || !isValidAmount(p.price) || !Number.isInteger(p.stock) || p.stock < 0 || p.stock > 99999) throw new RepoError('INVALID', 'product');
  const pid = id();
  await db.runAsync('INSERT INTO products(id,code,name,category,owner,consigned,settle,price,stock) VALUES(?,?,?,?,?,?,?,?,?)',
    pid, text(p.code ?? '', 20), name, text(p.category ?? '', 40), owner, p.consigned ? 1 : 0, p.settle, p.price, p.stock);
  return pid;
}
/** 삭제는 상태 변경이다. 지우면 과거 판매·정산 기록이 깨진다. (ADR-0002) */
export const setProductStatus = (db: SQLiteDatabase, pid: string, status: ProductStatus) =>
  db.runAsync('UPDATE products SET status=? WHERE id=?', status, pid);

export async function eventItems(db: SQLiteDatabase, eid: string) {
  return (await db.getAllAsync<{ product_id: string; qty: number }>('SELECT product_id, qty FROM event_items WHERE event_id=?', eid)).map((r) => ({ productId: r.product_id, qty: r.qty }));
}
export async function setEventItem(db: SQLiteDatabase, eid: string, pid: string, qty: number) {
  if (!Number.isInteger(qty) || qty < 0 || qty > 99999) throw new RepoError('INVALID', 'qty');
  await db.runAsync('INSERT INTO event_items(event_id,product_id,qty) VALUES(?,?,?) ON CONFLICT(event_id,product_id) DO UPDATE SET qty=excluded.qty', eid, pid, qty);
}

/* ---------- sales ---------- */
export async function recordSale(db: SQLiteDatabase, input: { eventId: string; pay: PayMethod; items: { productId: string; qty: number }[]; discount?: number; extra?: number; at?: number }) {
  const discount = input.discount ?? 0, extra = input.extra ?? 0;
  if (!PAYS.includes(input.pay) || !isValidAmount(discount) || !isValidAmount(extra) || input.items.length === 0) throw new RepoError('INVALID', 'sale');
  const sid = id();
  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT INTO sales(id,event_id,at,pay,discount,extra) VALUES(?,?,?,?,?,?)', sid, input.eventId, input.at ?? Date.now(), input.pay, discount, extra);
    let idx = 0;
    for (const it of input.items) {
      if (!isValidQty(it.qty)) throw new RepoError('INVALID', 'qty');
      const r = await db.getFirstAsync<ProductRow>('SELECT * FROM products WHERE id=?', it.productId);
      if (!r) throw new RepoError('NOT_FOUND', it.productId);
      const p = toProduct(r);
      if (!canSell(p, it.qty)) throw new RepoError('NO_STOCK', p.name); // 트랜잭션이 롤백되어 판매 기록도 남지 않는다
      await db.runAsync('UPDATE products SET stock = stock - ? WHERE id=?', it.qty, p.id);
      // 담당자·정산 구분·단가를 이 시점 값으로 복사한다(이후 상품을 고쳐도 과거 정산이 바뀌지 않게)
      await db.runAsync('INSERT INTO sale_lines(sale_id,idx,product_id,name,owner,settle,qty,unit_price) VALUES(?,?,?,?,?,?,?,?)', sid, idx++, p.id, p.name, p.owner, p.settle, it.qty, p.price);
    }
  });
  return sid;
}
/** 판매 취소: 삭제하지 않고 취소 시각을 남기고 재고를 되돌린다. */
export async function voidSale(db: SQLiteDatabase, sid: string) {
  await db.withTransactionAsync(async () => {
    const s = await db.getFirstAsync<{ voided_at: number | null }>('SELECT voided_at FROM sales WHERE id=?', sid);
    if (!s) throw new RepoError('NOT_FOUND', sid);
    if (s.voided_at != null) return;
    await db.runAsync('UPDATE sales SET voided_at=? WHERE id=?', Date.now(), sid);
    await db.runAsync('UPDATE products SET stock = stock + (SELECT l.qty FROM sale_lines l WHERE l.sale_id=? AND l.product_id=products.id) WHERE id IN (SELECT product_id FROM sale_lines WHERE sale_id=?)', sid, sid);
  });
}
type SaleRow = { id: string; event_id: string; at: number; pay: PayMethod; discount: number; extra: number; voided_at: number | null };
type LineRow = { sale_id: string; product_id: string; name: string; owner: string; settle: SettleKind; qty: number; unit_price: number };
export async function listSales(db: SQLiteDatabase, eid: string): Promise<Sale[]> {
  const sales = await db.getAllAsync<SaleRow>('SELECT * FROM sales WHERE event_id=? ORDER BY at DESC', eid);
  const lines = await db.getAllAsync<LineRow>('SELECT l.* FROM sale_lines l JOIN sales s ON s.id=l.sale_id WHERE s.event_id=? ORDER BY l.sale_id, l.idx', eid);
  const by = new Map<string, SaleLine[]>();
  for (const l of lines) (by.get(l.sale_id) ?? by.set(l.sale_id, []).get(l.sale_id)!).push({ productId: l.product_id, name: l.name, owner: l.owner, settle: l.settle, qty: l.qty, unitPrice: l.unit_price });
  return sales.map((s) => ({ id: s.id, eventId: s.event_id, at: s.at, pay: s.pay, discount: s.discount, extra: s.extra, voidedAt: s.voided_at, lines: by.get(s.id) ?? [] }));
}

/* ---------- costs ---------- */
export async function listCosts(db: SQLiteDatabase, eid: string): Promise<EventCost[]> {
  return (await db.getAllAsync<{ id: string; event_id: string; label: string; amount: number }>('SELECT * FROM costs WHERE event_id=?', eid)).map((r) => ({ id: r.id, eventId: r.event_id, label: r.label, amount: r.amount }));
}
export async function addCost(db: SQLiteDatabase, eid: string, label: string, amount: number) {
  if (!text(label) || !isValidAmount(amount)) throw new RepoError('INVALID', 'cost');
  await db.runAsync('INSERT INTO costs(id,event_id,label,amount) VALUES(?,?,?,?)', id(), eid, text(label), amount);
}
