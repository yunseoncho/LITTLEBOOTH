import { settle, payMix, topProducts, hourly, averageOrder } from '../settlement';
import type { EventCost, Sale, SaleLine } from '../types';

const line = (productId: string, owner: string, settleKind: 'personal' | 'joint', qty: number, unitPrice: number): SaleLine =>
  ({ productId, name: productId, owner, settle: settleKind, qty, unitPrice });
let n = 0;
const sale = (lines: SaleLine[], o: Partial<Sale> = {}): Sale =>
  ({ id: `s${++n}`, eventId: 'e1', at: new Date(2026, 7, 16, 11, 0).getTime(), pay: 'transfer', lines, discount: 0, extra: 0, voidedAt: null, ...o });

// 실제 서코 정산표의 합계 구조(개인 180,000 / 공동 상품 262,000 / 할인 9,000 → 공동 253,000 / 매출 433,000)를
// 가상의 담당자·상품으로 재현한 검증용 데이터. 실제 이름·기록은 넣지 않는다.
function seocoShape(): Sale[] {
  return [
    sale([line('p1', 'A', 'personal', 50, 2000), line('p2', 'B', 'personal', 40, 1000)]), // 개인 100,000 + 40,000
    sale([line('p3', 'C', 'personal', 20, 2000)]), // 개인 40,000 → 개인 합계 180,000
    sale([line('j1', 'C', 'joint', 22, 5000)], { discount: 4000 }), // 110,000
    sale([line('j2', 'D', 'joint', 17, 5000)], { discount: 5000 }), // 85,000
    sale([line('j3', 'E', 'joint', 67, 1000)]), // 67,000 → 공동 상품 262,000
  ];
}

describe('settle', () => {
  test('개인·공동 합계가 정산표 구조와 일치한다', () => {
    const r = settle(seocoShape(), [], 5);
    expect(r.personalTotal).toBe(180_000);
    expect(r.jointGross).toBe(262_000);
    expect(r.discount).toBe(9_000);
    expect(r.jointNet).toBe(253_000);
    expect(r.gross).toBe(442_000);
    expect(r.total).toBe(433_000);
    expect(r.total).toBe(r.personalTotal + r.jointNet); // 비용이 없으면 매출 = 개인 + 공동
    expect(r.personal).toEqual({ A: 100_000, B: 40_000, C: 40_000 });
    expect(r.jointByOwner).toEqual({ C: 110_000, D: 85_000, E: 67_000 });
    expect(r.perHead).toBe(50_600);
    expect(r.remainder).toBe(0);
  });

  test('비용은 공동 정산에서만 빠지고 매출에서는 빠지지 않는다', () => {
    const costs: EventCost[] = [{ id: 'c1', eventId: 'e1', label: '부스비', amount: 100_000 }];
    const r = settle(seocoShape(), costs, 5);
    expect(r.total).toBe(433_000);
    expect(r.jointNet).toBe(153_000);
    expect(r.perHead).toBe(30_600);
  });

  test('나누어 떨어지지 않으면 나머지를 따로 보여 준다', () => {
    const r = settle([sale([line('j', 'A', 'joint', 1, 10_000)])], [], 3);
    expect(r.perHead).toBe(3_333);
    expect(r.remainder).toBe(1);
    expect(r.perHead * 3 + r.remainder).toBe(r.jointNet);
  });

  test('추가금은 공동 쪽에 더해진다', () => {
    const r = settle([sale([line('p', 'A', 'personal', 1, 5000)], { extra: 500 })], [], 2);
    expect(r.jointGross).toBe(500);
    expect(r.total).toBe(5_500);
  });

  test('취소된 판매는 모든 집계에서 빠진다', () => {
    const all = [...seocoShape(), sale([line('x', 'A', 'personal', 99, 1000)], { voidedAt: 1 })];
    const r = settle(all, [], 5);
    expect(r.total).toBe(433_000);
    expect(r.orders).toBe(5);
    expect(payMix(all).transfer?.count).toBe(5);
  });

  test('인원이 0 이하여도 0으로 나누지 않는다', () => {
    expect(settle(seocoShape(), [], 0).teamSize).toBe(1);
  });

  test('손실이면 음수로 나눈다(0 방향)', () => {
    const r = settle([sale([line('j', 'A', 'joint', 1, 1000)])], [{ id: 'c', eventId: 'e1', label: 'x', amount: 4000 }], 2);
    expect(r.jointNet).toBe(-3000);
    expect(r.perHead).toBe(-1500);
  });
});

describe('stats', () => {
  test('결제수단 집계는 할인·추가금까지 반영한 결제액이다', () => {
    const m = payMix([sale([line('p', 'A', 'personal', 2, 1000)], { pay: 'cash', discount: 500 }), sale([line('p', 'A', 'personal', 1, 1000)], { pay: 'cash' })]);
    expect(m.cash).toEqual({ amount: 2500, count: 2 });
  });
  test('잘 팔린 상품은 수량 순', () => {
    const t = topProducts([sale([line('a', 'A', 'personal', 1, 9000), line('b', 'A', 'personal', 3, 100)])]);
    expect(t.map((x) => x.name)).toEqual(['b', 'a']);
  });
  test('시간대별 건수와 객단가', () => {
    const s1 = sale([line('a', 'A', 'personal', 1, 1000)]);
    const s2 = sale([line('a', 'A', 'personal', 1, 3000)], { at: new Date(2026, 7, 16, 14, 5).getTime() });
    const h = hourly([s1, s2]);
    expect(h[11]).toBe(1); expect(h[14]).toBe(1); expect(h.reduce((a, b) => a + b, 0)).toBe(2);
    expect(averageOrder([s1, s2])).toBe(2000);
  });
});
