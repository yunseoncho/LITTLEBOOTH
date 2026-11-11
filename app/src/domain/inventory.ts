import type { DisplayStatus, Product, Sale } from './types';
import { isActiveSale } from './money';

export const isLive = (p: Product) => p.status === 'active';
export function displayStatus(p: Product): DisplayStatus {
  if (p.status !== 'active') return p.status;
  return p.stock <= 0 ? 'soldout' : 'active';
}

/** 판매 가능 여부 검사. 재고보다 많이 팔 수 없다. */
export function canSell(p: Product, qty: number): boolean {
  return isLive(p) && qty >= 1 && p.stock >= qty;
}

/** 판매 한 건이 재고에 미치는 영향. 취소하면 되돌린다. */
export function stockDelta(sale: Pick<Sale, 'lines' | 'voidedAt'>): Record<string, number> {
  const d: Record<string, number> = {};
  const sign = sale.voidedAt == null ? -1 : 0; // 취소된 판매는 재고 변화 없음(원복 상태)
  for (const l of sale.lines) d[l.productId] = (d[l.productId] ?? 0) + sign * l.qty;
  return d;
}

/** 재고가 적게 남은 상품(소진 임박). */
export function lowStock(products: Product[], threshold = 3) {
  return products.filter((p) => isLive(p) && p.stock > 0 && p.stock <= threshold).sort((a, b) => a.stock - b.stock);
}

/** 행사별 반입 대비 판매·잔여. */
export function brought(items: { productId: string; qty: number }[], sales: Sale[]) {
  const sold = new Map<string, number>();
  for (const s of sales.filter(isActiveSale)) for (const l of s.lines) sold.set(l.productId, (sold.get(l.productId) ?? 0) + l.qty);
  return items.map((i) => ({ productId: i.productId, brought: i.qty, sold: sold.get(i.productId) ?? 0, left: i.qty - (sold.get(i.productId) ?? 0) }));
}
