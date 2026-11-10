"""데모 계정 예시 데이터 생성기.
- 모든 숫자는 결제 단위 기록에서 계산되도록 만든다 (합계·재고·정산이 서로 맞음).
- 이 데이터는 가상의 예시다. 실제 계정 데이터에는 쓰지 않는다 (ADR-0003).
사용: python3 demo_gen.py  → ../../prototype/demo-data.js
"""
import json, random, os
from collections import Counter, defaultdict
R = random.Random(20261110)

# ---------------- 상품 ----------------
# id, 이름, 카테고리, 아이콘, 가격, 원가, 소유자, 장르, 정산, 최초 등록 수량, 인기 가중치
PRODUCTS = [
 ('p1','고양이 아크릴 키링 · 치즈','키링','ring',6000,2300,'서진','고양이','개인',40,10),
 ('p7','고양이 아크릴 키링 · 고등어','키링','ring',6000,2300,'서진','고양이','개인',30,7),
 ('p9','고양이 아크릴 키링 · 턱시도','키링','ring',6000,2300,'서진','고양이','개인',30,6),
 ('p2','고양이 씰스티커','스티커','paper',3500,900,'서진','고양이','개인',60,9),
 ('p10','고양이 일상 엽서','엽서','card',2000,350,'서진','고양이','개인',80,6),
 ('p3','엽서 3종 세트','엽서','card',5000,1000,'서진','오리지널','개인',40,6),
 ('p4','떡메모지 · 체크리스트','문구','paper',3500,1200,'서진','오리지널','개인',40,4),
 ('p11','고양이 아크릴 스탠드','아크릴','badge',12000,4200,'서진','고양이','개인',15,3),
 ('p5','식물 마스킹테이프','문구','paper',4500,1500,'하윤','식물','개인',30,4),
 ('p6','식물 핀뱃지','뱃지','badge',3000,1100,'하윤','식물','개인',40,5),
 ('p8','식물 스티커 세트','스티커','paper',4000,1000,'하윤','식물','개인',50,6),
 ('p12','디저트 키링','키링','ring',6500,2500,'하윤','디저트','개인',25,5),
 ('p13','콜라보 포스터 A3','포스터','card',8000,1800,'공동','오리지널','공동',20,3),
]
P = {p[0]: dict(zip(['id','name','cat','ic','price','cost','owner','genre','settle','init','w'], p)) for p in PRODUCTS}
POPT = {'선물 포장': 500, '쇼핑백': 200}

# ---------------- 행사 ----------------
# id, 이름, big, cap, 날짜, 장소, 상태, 방문(예상), 구매 전환, 영업시간, 장르 가중, 반입 비율
EVENTS = [
 dict(id='e0',title='여의도 한강 플리마켓 1회',big='첫발',cap='플리마켓 1회',date=(2026,9,28),place='여의나루역 앞',status='done',
      visits=150,conv=.27,hours=(11,18),aff={'고양이':1.0,'식물':1.1,'디저트':1.2,'오리지널':.9},pay={'계좌이체':.42,'현금':.38,'카드':.2},
      goal='처음 참가하는 마켓에서 무엇이 먼저 팔릴까?',color='--c5',
      checklist=['테이블보·집게','거스름돈 5만 원','가격표 출력','카드 단말기 충전']),
 dict(id='e3',title='홍대 일러스트 마켓',big='홍대',cap='일러스트 마켓',date=(2026,10,12),place='홍대 상상마당',status='done',
      visits=240,conv=.31,hours=(12,19),aff={'고양이':1.3,'식물':.9,'디저트':.8,'오리지널':1.4},pay={'계좌이체':.55,'카드':.33,'현금':.12},
      goal='엽서 세트를 앞줄에 두면 객단가가 오를까?',color='--c4',
      checklist=['테이블보','카드 단말기','엽서 세트 앞줄 진열','포스터 거치대']),
 dict(id='e2',title='여의도 한강 플리마켓 2회',big='한강',cap='플리마켓 2회',date=(2026,10,26),place='여의나루역 앞',status='done',
      visits=186,conv=.29,hours=(11,18),aff={'고양이':1.1,'식물':1.1,'디저트':1.3,'오리지널':.9},pay={'계좌이체':.5,'현금':.3,'카드':.2},
      goal='2개 이상 사면 1,000원 할인하면 키링 묶음 구매가 늘어날까?',color='--c3',
      checklist=['테이블보','단말기','거스름돈','할인 안내판']),
 dict(id='e4',title='망원 주말 마켓',big='망원',cap='주말 마켓',date=(2026,11,10),place='망원 한강공원',status='live',
      visits=0,conv=.30,hours=(11,15),aff={'고양이':1.2,'식물':1.0,'디저트':1.1,'오리지널':1.0},pay={'계좌이체':.55,'카드':.25,'현금':.15,'카카오페이':.05},
      goal='키링을 눈높이에 두면 문의가 늘어날까?',color='--c2',
      checklist=['테이블보·집게','카드 단말기 충전','거스름돈 5만 원','가격표 출력']),
 dict(id='e1',title='성수 굿즈 팝업',big='성수',cap='굿즈 팝업',date=(2026,11,22),date2=(2026,11,23),place='성수동 연무장길',status='prep',
      goal='실내 조명에서 엽서 세트가 더 잘 팔릴까?',color='--c1',
      checklist=['테이블보·집게','카드 단말기 충전','키링 40개 포장','가격표 출력']),
]
HW = {11:5,12:9,13:12,14:11,15:9,16:8,17:6,18:3}

def ds(d): return f"{d[0]}. {d[1]}. {d[2]}."
def iso(d): return f"{d[0]}-{d[1]:02d}-{d[2]:02d}"

stock = {pid: p['init'] for pid, p in P.items()}
logs = defaultdict(list)
for pid, p in P.items(): logs[pid].append({'at': '9. 20.', 'type': '최초 등록', 'q': p['init'], 'left': p['init']})

out_events = []
for E in EVENTS:
    ev = dict(id=E['id'], title=E['title'], big=E['big'], cap=E['cap'], place=E['place'], status=E['status'], color=E['color'], goal=E['goal'],
              date=ds(E['date']) if 'date2' not in E else f"{ds(E['date'])} – {E['date2'][1]}. {E['date2'][2]}.", base={}, pay={}, notes=[], retros=[], sales=[], visits=0, visitTimes=[])
    md = f"{E['date'][1]}. {E['date'][2]}."
    # 재입고: 2회차 전 인기 키링 보충
    if E['id'] == 'e2':
        for pid, q in [('p1', 20), ('p2', 30)]:
            stock[pid] += q; logs[pid].append({'at': '10. 20.', 'type': '입고', 'q': q, 'left': stock[pid]})
    # 반입 수량: 남은 재고에서 인기 순으로
    items = []
    for pid, p in P.items():
        if E['status'] == 'prep': q = min(stock[pid], 10 if p['price'] < 6000 else 8)
        else: q = min(stock[pid], max(4, round(p['w'] * 2.2)))
        if q > 0: items.append({'id': pid, 'q': q})
    ev['items'] = items
    ev['checklist'] = [{'t': t, 'd': E['status'] != 'prep' or i in (0, 2)} for i, t in enumerate(E['checklist'])]
    if E['status'] == 'prep':
        out_events.append(ev); continue
    brought = {i['id']: i['q'] for i in items}; left = dict(brought)
    h0, h1 = E['hours']
    # 방문 시각
    nv = E['visits'] if E['status'] == 'done' else 68
    hrs = [h for h in range(h0, h1) for _ in range(HW.get(h, 3))]
    vt = sorted(f"{h:02d}:{R.randint(0,59):02d}" for h in (R.choice(hrs) for _ in range(nv)))
    ev['visits'] = nv; ev['visitTimes'] = vt
    # 구매: 방문자 중 일부가 결제
    sales = []
    buyers = [t for t in vt if R.random() < E['conv']]
    for t in buyers:
        n = R.choices([1, 2, 3], [55, 33, 12])[0]
        cart = Counter()
        for _ in range(n):
            pool = [pid for pid in left if left[pid] - cart[pid] > 0]
            if not pool: break
            w = [P[pid]['w'] * E['aff'].get(P[pid]['genre'], 1) for pid in pool]
            cart[R.choices(pool, w)[0]] += 1
        if not cart: continue
        for pid, q in cart.items(): left[pid] -= q
        sub = sum(P[pid]['price'] * q for pid, q in cart.items())
        opts = {}
        if R.random() < .08: opts['선물 포장'] = 1
        if R.random() < .05: opts['쇼핑백'] = 1
        extra = sum(POPT[k] * v for k, v in opts.items())
        disc = 1000 if (E['id'] in ('e2', 'e4') and sum(cart.values()) >= 2 and R.random() < .6) else 0
        pay = R.choices(list(E['pay']), list(E['pay'].values()))[0]
        sec = R.randint(0, 59)
        sales.append({'items': [{'id': k, 'q': v} for k, v in cart.items()], 'opts': opts, 'discount': disc, 'extra': extra,
                      'total': sub + extra - disc, 'pay': pay, 'type': '현장', 'time': t, 'at': f"{iso(E['date'])} {t}:{sec:02d}", 'note': ''})
    sales.sort(key=lambda s: s['at'])
    for k, s in enumerate(sales): s['oid'] = f"{E['id']}-{k+1:03d}"
    ev['sales'] = sales
    sold = Counter()
    for s in sales:
        for i in s['items']: sold[i['id']] += i['q']
    for pid, q in sold.items():
        stock[pid] -= q; logs[pid].append({'at': md, 'type': f"{E['title']} 판매", 'q': -q, 'left': stock[pid]})
    rev = sum(s['total'] for s in sales); aov = round(rev / max(1, len(sales)) / 10) * 10
    top = max(sold.items(), key=lambda kv: kv[1]) if sold else None
    hourc = Counter(int(s['time'][:2]) for s in sales); peak = max(hourc, key=hourc.get) if hourc else h0
    ev['start'] = f"{h0:02d}:{R.randint(0,9):02d}" if E['status'] else ''
    if E['status'] == 'done': ev['endAt'] = f"{h1:02d}:{R.randint(5,25):02d}"
    # 메모: 실제 기록과 맞는 내용만
    ev['notes'] = [{'at': f"{peak:02d}:{R.randint(5,40):02d}", 'k': '기록', 't': f"{peak}시대 손님이 몰림. 결제 대기 줄 생김"}]
    if top: ev['notes'].append({'at': f"{min(h1-1,peak+2):02d}:{R.randint(0,50):02d}", 'k': '기록', 't': f"{P[top[0]]['name']} 문의가 계속 들어옴"})
    outs = [pid for pid in brought if left[pid] == 0]
    if outs: ev['notes'].append({'at': f"{h1-1:02d}:{R.randint(0,40):02d}", 'k': '기록', 't': f"{P[outs[0]]['name']} 품절"})
    ev['notes'].insert(0, {'at': f"{h0:02d}:{R.randint(10,30):02d}", 'k': '공지', 't': '교대 순서: 서진 → 하윤 (점심 1시간)'})
    ev['notes'].sort(key=lambda n: n['at'])
    if E['status'] == 'done':
        ndisc = sum(1 for s in sales if s['discount'])
        ev['retros'] = [{'at': f"{md} {h1:02d}:40", 't': f"매출 {rev:,}원, 결제 {len(sales)}건, 객단가 {aov:,}원. {P[top[0]]['name']}이 {top[1]}개로 1위." + (f" 묶음 할인은 {ndisc}건 적용." if ndisc else '') + f" {peak}시대가 가장 바빴다."}]
    out_events.append(ev)

prods = []
for k, (pid, p) in enumerate(P.items()):
    prods.append(dict(id=pid, name=p['name'], cat=p['cat'], ic=p['ic'], price=p['price'], cost=p['cost'], stock=stock[pid], tone='#f4f4f6',
                      owner=p['owner'], genre=p['genre'], settle=p['settle'], memo='', logs=logs[pid], color='', soldout=False, visible=True,
                      tag='인기' if pid == 'p1' else '신규' if pid == 'p12' else '없음', ptype='고정 가격', opts=['색상'] if p['cat'] == '키링' else [],
                      maker='', created=k, fav=pid in ('p1', 'p2', 'p3', 'p6', 'p8'), deleted=False))
# 정합성 확인
for e in out_events:
    for s in e['sales']:
        assert s['total'] == sum(P[i['id']]['price'] * i['q'] for i in s['items']) + s['extra'] - s['discount']
    sold = Counter()
    for s in e['sales']:
        for i in s['items']: sold[i['id']] += i['q']
    for i in e.get('items', []): assert sold[i['id']] <= i['q'] or e['status'] == 'prep'
for p in prods:
    assert p['stock'] >= 0 and p['logs'][-1]['left'] == p['stock']
data = {'user': {'id': 'demo', 'name': '데모', 'booth': '서진 & 하윤 (예시 부스)', 'me': ['서진']}, 'products': prods, 'events': out_events}
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../prototype/demo-data.js')
open(dst, 'w').write('/* 데모 계정 예시 데이터 (가상). tools/seed/demo_gen.py로 생성 — 결제 단위 기록에서 모든 합계가 계산됨 */\nconst DEMO_DATA = ' + json.dumps(data, ensure_ascii=False) + ';\n')
for e in out_events:
    rev = sum(s['total'] for s in e['sales'])
    print(e['id'], e['title'], e['status'], 'sales', len(e['sales']), 'rev', rev, 'visits', e['visits'])
print('stock', {p['id']: p['stock'] for p in prods})
