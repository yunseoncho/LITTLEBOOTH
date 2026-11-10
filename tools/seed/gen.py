import json, random, sys
sys.path.insert(0,'.')
from seoco import P as SP, personal
random.seed(823)
IC={'엽서':'card','포토카드':'card','포스터':'card','스티커':'paper','떡메모지':'paper','떡메모지(소)':'paper','떡메모지(중)':'paper','메모스티커':'paper','씰스티커':'paper','마스킹테이프':'paper','키링':'ring','핀뱃지':'badge'}
products=[]; created=0
def addp(**k):
    global created
    base=dict(cost=0,memo='',color='',soldout=False,visible=True,tag='없음',ptype='고정 가격',opts=[],maker='',fav=False,deleted=False,tone='#f4f4f6')
    base.update(k); base['ic']=IC.get(k['cat'],'paper'); base['created']=created; created+=1
    products.append(base); return base
# ---- 서코 ----
sid={}
for code,name,cat,owner,price,stock,sold,genre in SP:
    pid='s'+code.replace('-','_') if code[0].isdigit() else ('s_gift' if code=='증정' else 's_bonus')
    sid[code]=pid
    p=addp(id=pid,code=code,name=name,cat=cat,owner=owner,genre=genre,price=price,stock=stock,settle='개인' if personal(code,owner) else '공동',
           logs=[{'at':'8. 20.','type':'최초 등록','q':stock+sold,'left':stock+sold},{'at':'8. 23.','type':'8월 서코 판매','q':-sold,'left':stock}] if sold else [{'at':'8. 20.','type':'최초 등록','q':stock,'left':stock}])
# units
units=[]
for code,name,cat,owner,price,stock,sold,genre in SP:
    if price>0: units+= [code]*sold
pr={c:p for c,_,_,_,p,_,_,_ in SP}
def take(codes):
    for c in codes: units.remove(c)
    return codes
fixed=[]  # (codes, discount, note)
fixed.append((take(['1-1','1-2','1-3','1-4','2-1','2-2','2-3','2-4']),3000,'세트A 멤버구인 완료!'))
fixed.append((take(['5-3','11-1','11-2']),3000,'세트C LP 수집가'))
fixed.append((take(['1-3','2-3','3-1','5-2','6-2']),2000,'세트B 봇치 5종'))
fixed.append((take(['7-2','7-3']),1000,'세트D 덴레제'))
kakao=[(take(['6-2']),0,''),(take(['14-1']),0,'')]
amt=lambda o:sum(pr[c] for c in o[0])-o[1]
# remaining units -> 42 orders, then pick 13 cash = 85000
best=None
for trial in range(20000):
    u=units[:]; random.shuffle(u)
    orders=[[x] for x in u[:42]]
    for x in u[42:]: random.choice(orders).append(x)
    allo=[(o,0,'') for o in orders]+fixed
    # choose 13 summing 85000 by random subset tries
    idx=list(range(len(allo)))
    for t in range(400):
        random.shuffle(idx); c=idx[:13]
        if sum(amt(allo[i]) for i in c)==85000:
            best=(allo,set(c)); break
    if best: break
assert best, 'no solution'
allo,cash=best
pay=[]
for i,o in enumerate(allo): pay.append((o,'현금' if i in cash else '계좌이체'))
pay+= [(o,'카카오페이') for o in kakao]
assert len(pay)==48 and sum(amt(o) for o,_ in pay)==433000
assert sum(amt(o) for o,m in pay if m=='현금')==85000 and sum(amt(o) for o,m in pay if m=='계좌이체')==330000
# times 10:30~16:50 weighted
W={10:4,11:8,12:12,13:13,14:11,15:8,16:5}
hours=[h for h in W for _ in range(W[h])]
times=sorted(f"{h:02d}:{random.randint(0,59):02d}" for h in [random.choice(hours) for _ in range(48)])
times=[t if t>='10:30' else '10:3'+t[-1] for t in times]; times.sort()
random.shuffle(pay)
bocchi=lambda o:any(next(p for p in SP if p[0]==c)[7]=='봇치더록' for c in o[0])
free=32; sales=[]
bo=[k for k,(o,m) in enumerate(pay) if bocchi(o)]
give={k:0 for k in bo}
while free>0:
    for k in bo:
        if free==0: break
        give[k]+=1; free-=1
for k,((codes,disc,note),m) in enumerate(pay):
    cnt={}
    for c in codes: cnt[sid[c]]=cnt.get(sid[c],0)+1
    if give.get(k): cnt['s_bonus']=give[k]
    sales.append(dict(items=[{'id':i,'q':q} for i,q in cnt.items()],opts={},discount=disc,extra=0,total=sum(pr[c] for c in codes)-disc,pay=m,type='현장',time=times[k],at=f"2026-08-23 {times[k]}:{random.randint(0,59):02d}",note=note))
seoco=dict(id='seoco0823',title='8월 서코 일요일',big='서코',cap='코믹월드',date='2026. 8. 23.',place='일산 킨텍스 · BJ04, BJ05',booth='BJ04, BJ05',status='done',color='--c2',
  goal='봇치더록 세트 구성이 객단가를 올릴까?',visits=0,sales=sales,base={},pay={},start=times[0][:2]+':00',endAt='17:00',
  checklist=[{'t':'부스 배치도 확인 (BJ04·BJ05)','d':True},{'t':'세트 할인 안내판 출력','d':True},{'t':'결속밴드 포토카드 특전 준비','d':True},{'t':'개인정산 상품 체크','d':True}],
  items=[{'id':sid[p[0]],'q':p[5]+p[6]} for p in SP],
  notes=[{'at':'11:00','k':'공지','t':'봇치더록 구매 시 결속밴드 포카 증정'},{'at':'11:05','k':'공지','t':'인스타 팔로우 시 행운부적(록캣)·스티커(SWAY) 증정'}],
  review='', retros=[], settleNote='개인정산 상품은 담당자별로, 나머지는 공동정산 금액으로 집계')
# ---- 여의도 (Supabase test1234) ----
st=json.load(open(sys.argv[1] if len(sys.argv)>1 else 'ws_state.json')); ev=st['events'][0]
inv=st['inventory']; idmap={}
GEN={'씰스티커':'문구','떡메모지(소)':'문구','떡메모지(중)':'문구','메모스티커':'문구','마스킹테이프':'문구','엽서':'문구','동물 쿠키':'디저트','씬쿠키':'디저트','브라우니':'디저트','sway 티셔츠':'의류','vintage tee':'의류'}
for n,i in enumerate(inv):
    pid=f'y{n+1}'; idmap[i['id']]=pid
    logs=[{'at':l.get('at','')[5:10].replace('-','. ')+'.' if l.get('at') else '', 'type':l.get('type') or l.get('reason') or '기록','q':l.get('delta',l.get('qty',0)),'left':l.get('after',i['stock'])} for l in i.get('stockLogs',[])][:3]
    addp(id=pid,name=i['name'],cat=i['category'],owner=i['productOwner'],genre=GEN.get(i['category'],'잡화'),price=i.get('recommendedPrice') or 0,stock=i['stock'],
         settle='개인',memo=i.get('sourceEvent',''),logs=logs or [{'at':'10. 20.','type':'최초 등록','q':i['stock'],'left':i['stock']}])
emap={p['id']:idmap.get(p['inventoryId']) for p in ev['products']}
def kst(iso):
    h=int(iso[11:13])+9; return f"{h%24:02d}:{iso[14:16]}"
ysales=[]
for s in sorted(ev['sales'],key=lambda s:s['at']):
    cnt={}
    for l in s['lines']:
        pid=emap.get(l['productId']) or idmap.get(l.get('inventoryId'))
        cnt[pid]=cnt.get(pid,0)+l['qty']
    ysales.append(dict(items=[{'id':k,'q':v} for k,v in cnt.items()],opts={},discount=0,extra=0,total=sum(l['qty']*l['price'] for l in s['lines']),pay=s['payment'],type='현장',time=kst(s['at']),at=f"{s['at'][:10]} {kst(s['at'])}:{s['at'][17:19]}",note=s.get('memo',''),oid=s['id'][:8]))
ol=ev['operationLogs'][0]
yeo=dict(id='yeouido1024',title='여의도 음악축제',big='여의도',cap='음악축제',date='2026. 10. 24.',place='여의도',status='done',color='--c3',
  goal=ev['registeredHypotheses'][0]['goal'] if ev.get('registeredHypotheses') else '',visits=len([v for v in ev['visits'] if v['at'][:10]=='2026-10-24']),
  visitTimes=[kst(v['at']) for v in ev['visits'] if v['at'][:10]=='2026-10-24'],
  sales=ysales,base={},pay={},start=kst(ol['startedAt']),endAt=kst(ol['endedAt']),
  checklist=[{'t':c['text'],'d':c['done']} for c in ev['checklist']],
  items=[{'id':emap[p['id']],'q':p.get('initialStock',p['stock'])} for p in ev['products'] if emap.get(p['id'])],
  notes=[{'at':kst(h['at']),'k':'공지','t':f"교대: {h['staff']}"+(f" · {h['note']}" if h['note'] else '')} for h in ev['handovers']],
  review='', retros=[{'at':'10. 24.','t':'결과: '+ev['review']['result']}] if ev['review'].get('result') else [])
for p in products:
    if p['id'] in ('s3_1','s6_2','s1_3','s11_2','y51','y15'): p['fav']=True
data=dict(user=dict(id='test1234',name='test1234',booth='기묘한 케이블 타이'),products=products,events=[yeo,seoco])
open('../../prototype/account-test1234.js','w').write('/* test1234 계정 데이터: 여의도 음악축제(Supabase booth_workspaces, revision 107) + 8월 서코 일요일(재고표·정산표 기준 복원) */\nconst ACCOUNT_TEST1234 = '+json.dumps(data,ensure_ascii=False)+';\n')
print('products',len(products),'seoco sales',len(sales),sum(s['total'] for s in sales),'yeo sales',len(ysales),sum(s['total'] for s in ysales),'visits',yeo['visits'])
from collections import Counter
print(Counter(s['pay'] for s in sales), Counter(s['pay'] for s in ysales))
print('missing map',[k for k,v in emap.items() if not v][:3])
