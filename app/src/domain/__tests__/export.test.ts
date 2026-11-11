import { csvCell, salesToCsv } from '../export';
import type { Sale } from '../types';

describe('CSV 내보내기', () => {
  test('수식으로 시작하는 셀은 무력화한다', () => {
    for (const evil of ['=1+1', '+SUM(A1)', '-2', '@cmd', '\tx', '\rx']) expect(csvCell(evil).replace(/^"/, '').startsWith("'")).toBe(true);
    expect(csvCell('포스터')).toBe('포스터');
  });
  test('숫자(음수 포함)는 그대로 둔다', () => { expect(csvCell(-500)).toBe('-500'); });
  test('쉼표·따옴표·줄바꿈은 따옴표로 감싼다', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });
  test('판매 내역을 한 줄씩 내보내고 주문 합계는 첫 줄에만 쓴다', () => {
    const s: Sale = { id: 'abcdef123456', eventId: 'e', at: Date.UTC(2026, 7, 16, 2, 0), pay: 'cash', discount: 500, extra: 0, voidedAt: null,
      lines: [{ productId: 'p', name: '=HYPERLINK("x")', owner: 'A', settle: 'personal', qty: 2, unitPrice: 1000 }, { productId: 'q', name: 'b', owner: 'A', settle: 'joint', qty: 1, unitPrice: 500 }] };
    const lines = salesToCsv([s], '행사').trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("\"'=HYPERLINK");
    expect(lines[1]).toContain(',2000,cash,500,0,2000,');
    expect(lines[2]).toContain(',500,cash,0,0,,');
  });
});
