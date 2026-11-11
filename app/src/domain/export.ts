import { saleTotal } from './money';
import type { Sale } from './types';

/**
 * CSV/엑셀 수식 주입 방어: 셀이 = + - @ 탭 CR 로 시작하면 엑셀이 수식으로 실행할 수 있다.
 * (상품명·담당자·메모는 사용자가 입력하므로, 공유받은 사람의 엑셀에서 실행되지 않게 앞에 ' 를 붙인다.)
 */
export function csvCell(v: string | number): string {
  let s = String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const row = (cells: (string | number)[]) => cells.map(csvCell).join(',');

export function salesToCsv(sales: Sale[], eventName: string): string {
  const head = ['event', 'time', 'order', 'product', 'owner', 'settle', 'qty', 'unit_price', 'line_total', 'pay', 'discount', 'extra', 'order_total', 'voided'];
  const out = [row(head)];
  for (const s of [...sales].sort((a, b) => a.at - b.at)) {
    s.lines.forEach((l, i) => out.push(row([
      eventName, new Date(s.at).toISOString(), s.id.slice(0, 8), l.name, l.owner, l.settle, l.qty, l.unitPrice, l.qty * l.unitPrice,
      s.pay, i === 0 ? s.discount : 0, i === 0 ? s.extra : 0, i === 0 ? saleTotal(s) : '', s.voidedAt ? 'Y' : '',
    ])));
  }
  return out.join('\r\n') + '\r\n';
}
