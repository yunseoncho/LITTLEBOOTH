import { isActiveSale, linesTotal, saleTotal } from './money';
import type { EventCost, PayMethod, Sale } from './types';

export interface Settlement {
  orders: number;
  gross: number; // 상품 판매액(할인 전)
  discount: number;
  extra: number;
  total: number; // 매출 = gross + extra − discount
  personal: Record<string, number>; // 담당자별 개인 정산 금액(비용 차감 없음)
  personalTotal: number;
  jointByOwner: Record<string, number>; // 공동 정산 상품의 담당자별 판매액(참고용)
  jointGross: number; // 공동 상품 판매액 + 추가금
  costs: number;
  jointNet: number; // 공동 정산액 = jointGross − discount − costs
  teamSize: number;
  perHead: number; // 1인당(0 방향 내림)
  remainder: number; // 나누고 남은 금액
}

/**
 * 정산 규칙 (프로토타입 v73과 동일, 서코 실제 정산표로 검증):
 *  - 개인 정산 상품: 담당자에게 그대로 돌아간다(비용 차감 없음).
 *  - 공동 정산 상품 + 추가금 − 할인 − 비용 = 공동 정산액, 이를 n/1.
 *  - 매출 = 개인 합계 + 공동 정산액 + 비용 (비용은 정산에서만 빠지고 매출에서는 안 빠진다).
 */
export function settle(sales: Sale[], costs: EventCost[], teamSize: number): Settlement {
  const live = sales.filter(isActiveSale);
  const personal: Record<string, number> = {};
  const jointByOwner: Record<string, number> = {};
  let gross = 0, discount = 0, extra = 0, jointLines = 0;
  for (const s of live) {
    discount += s.discount;
    extra += s.extra;
    for (const l of s.lines) {
      const v = l.qty * l.unitPrice;
      gross += v;
      if (l.settle === 'personal') personal[l.owner] = (personal[l.owner] ?? 0) + v;
      else { jointLines += v; jointByOwner[l.owner] = (jointByOwner[l.owner] ?? 0) + v; }
    }
  }
  const costSum = costs.reduce((a, c) => a + c.amount, 0);
  const n = Math.max(1, Math.floor(teamSize));
  const jointGross = jointLines + extra;
  const jointNet = jointGross - discount - costSum;
  const perHead = Math.trunc(jointNet / n);
  const personalTotal = Object.values(personal).reduce((a, b) => a + b, 0);
  return {
    orders: live.length, gross, discount, extra,
    total: gross + extra - discount,
    personal, personalTotal, jointByOwner, jointGross,
    costs: costSum, jointNet, teamSize: n, perHead, remainder: jointNet - perHead * n,
  };
}

export type PayMix = Partial<Record<PayMethod, { amount: number; count: number }>>;
export function payMix(sales: Sale[]): PayMix {
  const m: PayMix = {};
  for (const s of sales.filter(isActiveSale)) {
    const e = (m[s.pay] ??= { amount: 0, count: 0 });
    e.amount += saleTotal(s);
    e.count += 1;
  }
  return m;
}

export function topProducts(sales: Sale[], limit = 5) {
  const t = new Map<string, { name: string; qty: number; amount: number }>();
  for (const s of sales.filter(isActiveSale)) for (const l of s.lines) {
    const e = t.get(l.productId) ?? { name: l.name, qty: 0, amount: 0 };
    e.qty += l.qty; e.amount += l.qty * l.unitPrice; t.set(l.productId, e);
  }
  return [...t.values()].sort((a, b) => b.qty - a.qty || b.amount - a.amount).slice(0, limit);
}

/** 시간대별 결제 건수(0~23시, 기기의 현지 시각 기준). */
export function hourly(sales: Sale[]): number[] {
  const h = Array<number>(24).fill(0);
  for (const s of sales.filter(isActiveSale)) h[new Date(s.at).getHours()]++;
  return h;
}

export const averageOrder = (sales: Sale[]) => {
  const live = sales.filter(isActiveSale);
  return live.length ? Math.round(live.reduce((a, s) => a + saleTotal(s), 0) / live.length) : 0;
};
export { linesTotal };
