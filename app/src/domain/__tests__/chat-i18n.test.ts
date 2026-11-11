import { START, node, type ChatContext } from '../chat';
import { LANGS, STRINGS } from '../../i18n/strings';
import { t } from '../../i18n/translate';

const tokens = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const ctx: ChatContext = { total: '₩433,000', orders: 48, top: { name: '포스터', qty: 12 }, low: { name: '스티커', left: 2 }, hypothesis: '체험 손님을 판매 부스로 유도하기' };

describe('i18n 완전성', () => {
  test('모든 언어가 모든 키를 가진다', () => {
    const base = Object.keys(STRINGS.ko).sort();
    for (const l of LANGS) expect(Object.keys(STRINGS[l]).sort()).toEqual(base);
  });
  test('빈 문자열이 없고, {자리표시자}가 언어마다 같다', () => {
    for (const k of Object.keys(STRINGS.ko) as (keyof typeof STRINGS.ko)[]) {
      const want = tokens(STRINGS.ko[k]);
      for (const l of LANGS) { expect(STRINGS[l][k].trim()).not.toBe(''); expect(tokens(STRINGS[l][k])).toEqual(want); }
    }
  });
  test('치환', () => {
    expect(t('en', 'chat.top', { name: 'Poster', qty: 3 })).toBe('The best seller was Poster. 3 sold.');
  });
});

describe('캐릭터톡 대본', () => {
  const walk = (c: ChatContext) => {
    const seen = new Set<string>(); const q = [START];
    while (q.length) {
      const id = q.shift()!; if (seen.has(id)) continue; seen.add(id);
      const nd = node(id, c);
      for (const l of LANGS) {
        expect(STRINGS[l][nd.textKey]).toBeDefined();
        for (const need of tokens(STRINGS.ko[nd.textKey])) expect(nd.params).toHaveProperty(need);
      }
      for (const ch of nd.choices) { expect(STRINGS.ko[ch.labelKey]).toBeDefined(); q.push(ch.next); }
    }
    return seen;
  };
  test('모든 장면이 끝(end)까지 이어지고 키·자리표시자가 빠지지 않는다 (데이터가 있을 때)', () => {
    expect([...walk(ctx)].sort()).toEqual(['end', 'goal', 'goal.no', 'goal.yes', 'start', 'stock', 'top']);
  });
  test('데이터가 없을 때도 막히지 않는다', () => {
    const seen = walk({ total: '0', orders: 0 });
    expect(seen.has('end')).toBe(true);
  });
  test('끝 장면에는 선택지가 없다', () => {
    expect(node('end', ctx).choices).toEqual([]);
  });
});
