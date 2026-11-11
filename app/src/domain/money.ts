import type { Sale, SaleLine } from './types';

// 통화별 소수 자릿수(ISO 4217 minor unit). 목록에 없으면 2.
const EXPONENT: Record<string, number> = { KRW: 0, JPY: 0, CNY: 2, USD: 2, TWD: 2, HKD: 2, EUR: 2 };
export const exponentOf = (cur: string) => EXPONENT[cur.toUpperCase()] ?? 2;

export const MAX_AMOUNT = 100_000_000; // 입력 상한(오입력·오버플로 방지)

/** 금액 입력 검증: 0 이상 정수, 상한 이내. */
export function isValidAmount(n: unknown): n is number {
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= MAX_AMOUNT;
}
export function isValidQty(n: unknown): n is number {
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 1 && n <= 9999;
}

export function formatMoney(amount: number, currency: string, locale = 'ko-KR'): string {
  const e = exponentOf(currency);
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: e, maximumFractionDigits: e }).format(amount / 10 ** e);
}

export const lineTotal = (l: SaleLine) => l.qty * l.unitPrice;
export const linesTotal = (lines: SaleLine[]) => lines.reduce((a, l) => a + lineTotal(l), 0);
export const saleTotal = (s: Pick<Sale, 'lines' | 'extra' | 'discount'>) => Math.max(0, linesTotal(s.lines) + s.extra - s.discount);
export const isActiveSale = (s: Sale) => s.voidedAt == null;
