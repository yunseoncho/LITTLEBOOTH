import type { StringKey } from '../i18n/strings';

/**
 * AI 없는 캐릭터톡. 장부 숫자로 문장을 채우는 대본(상태 머신)이다.
 * 자유 입력이 없으므로 입력 검증·콘텐츠 신고가 필요 없고, 네트워크도 쓰지 않는다. (ADR-0005)
 */
export interface ChatContext {
  total: string; // 이미 통화·언어에 맞게 포맷된 문자열
  orders: number;
  top?: { name: string; qty: number };
  low?: { name: string; left: number };
  hypothesis?: string;
}
export interface ChatChoice { labelKey: StringKey; next: string }
export interface ChatNode { id: string; textKey: StringKey; params: Record<string, string | number>; choices: ChatChoice[] }

export const START = 'start';

export function node(id: string, c: ChatContext): ChatNode {
  const more = (skip: string): ChatChoice[] =>
    ([
      { labelKey: 'chat.c.top', next: 'top' },
      { labelKey: 'chat.c.stock', next: 'stock' },
      { labelKey: 'chat.c.goal', next: 'goal' },
    ] as ChatChoice[]).filter((x) => x.next !== skip).concat({ labelKey: 'chat.c.bye', next: 'end' });

  switch (id) {
    case 'start':
      return { id, textKey: 'chat.end.1', params: { total: c.total, orders: c.orders }, choices: more('') };
    case 'top':
      return c.top
        ? { id, textKey: 'chat.top', params: { name: c.top.name, qty: c.top.qty }, choices: more('top') }
        : { id, textKey: 'chat.top.none', params: {}, choices: more('top') };
    case 'stock':
      return c.low
        ? { id, textKey: 'chat.stock.low', params: { name: c.low.name, left: c.low.left }, choices: more('stock') }
        : { id, textKey: 'chat.stock.ok', params: {}, choices: more('stock') };
    case 'goal':
      return c.hypothesis
        ? { id, textKey: 'chat.goal', params: { hyp: c.hypothesis }, choices: [
            { labelKey: 'chat.c.yes', next: 'goal.yes' }, { labelKey: 'chat.c.no', next: 'goal.no' } ] }
        : { id, textKey: 'chat.goal.none', params: {}, choices: more('goal') };
    case 'goal.yes':
      return { id, textKey: 'chat.goal.yes', params: {}, choices: more('goal') };
    case 'goal.no':
      return { id, textKey: 'chat.goal.no', params: {}, choices: more('goal') };
    default:
      return { id: 'end', textKey: 'chat.bye', params: {}, choices: [] };
  }
}
