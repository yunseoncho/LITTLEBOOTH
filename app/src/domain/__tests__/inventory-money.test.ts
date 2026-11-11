import { canSell, displayStatus, lowStock, stockDelta, brought } from '../inventory';
import { formatMoney, isValidAmount, isValidQty, saleTotal, MAX_AMOUNT } from '../money';
import type { Product, Sale } from '../types';

const prod = (o: Partial<Product> = {}): Product =>
  ({ id: 'p', code: '1', name: 'n', category: 'c', owner: 'A', consigned: false, settle: 'personal', price: 1000, stock: 5, status: 'active', ...o });

describe('inventory', () => {
  test('재고 0이면 자동으로 소진, 반환·폐기·삭제는 그 상태가 우선', () => {
    expect(displayStatus(prod({ stock: 0 }))).toBe('soldout');
    expect(displayStatus(prod({ stock: 0, status: 'returned' }))).toBe('returned');
    expect(displayStatus(prod())).toBe('active');
  });
  test('재고보다 많이 팔 수 없고, 판매 중이 아니면 팔 수 없다', () => {
    expect(canSell(prod({ stock: 2 }), 3)).toBe(false);
    expect(canSell(prod({ stock: 2 }), 2)).toBe(true);
    expect(canSell(prod({ status: 'disposed' }), 1)).toBe(false);
    expect(canSell(prod(), 0)).toBe(false);
  });
  test('판매는 재고를 줄이고, 취소된 판매는 변화가 없다', () => {
    const lines = [{ productId: 'p', name: 'n', owner: 'A', settle: 'personal' as const, qty: 3, unitPrice: 1000 }];
    expect(stockDelta({ lines, voidedAt: null })).toEqual({ p: -3 });
    expect(stockDelta({ lines, voidedAt: 5 })).toEqual({ p: 0 });
  });
  test('소진 임박 목록은 적게 남은 순', () => {
    const l = lowStock([prod({ id: 'a', stock: 3 }), prod({ id: 'b', stock: 1 }), prod({ id: 'c', stock: 9 }), prod({ id: 'd', stock: 0 })]);
    expect(l.map((p) => p.id)).toEqual(['b', 'a']);
  });
  test('반입 대비 판매·잔여', () => {
    const sales = [{ id: 's', eventId: 'e', at: 0, pay: 'cash', discount: 0, extra: 0, voidedAt: null,
      lines: [{ productId: 'p', name: 'n', owner: 'A', settle: 'personal', qty: 4, unitPrice: 1 }] }] as Sale[];
    expect(brought([{ productId: 'p', qty: 10 }], sales)).toEqual([{ productId: 'p', brought: 10, sold: 4, left: 6 }]);
  });
});

describe('money', () => {
  test('입력 검증: 정수·범위', () => {
    for (const bad of [-1, 1.5, NaN, Infinity, '100', null, MAX_AMOUNT + 1]) expect(isValidAmount(bad)).toBe(false);
    for (const ok of [0, 1, 4500, MAX_AMOUNT]) expect(isValidAmount(ok)).toBe(true);
    expect(isValidQty(0)).toBe(false); expect(isValidQty(1)).toBe(true); expect(isValidQty(10_000)).toBe(false);
  });
  test('결제액은 음수가 되지 않는다', () => {
    expect(saleTotal({ lines: [], extra: 0, discount: 500 })).toBe(0);
  });
  test('통화별 자릿수: 원·엔은 그대로, 달러·위안은 최소 단위(센트·펀)', () => {
    expect(formatMoney(433_000, 'KRW', 'ko-KR')).toContain('433,000');
    expect(formatMoney(1250, 'JPY', 'ja-JP')).toContain('1,250');
    expect(formatMoney(1250, 'USD', 'en-US')).toBe('$12.50');
    expect(formatMoney(1250, 'CNY', 'zh-CN')).toContain('12.50');
  });
});
