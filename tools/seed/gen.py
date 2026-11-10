import json, random, sys
sys.path.insert(0,'.')
from seoco import P as SP, personal
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
           logs=[])
# 사진: pjuhe99/bandsustain-comicworld public/products (카탈로그 번호 매핑 그대로) → prototype/products/<id>.jpg
import os
PHOTO_DIR=os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../prototype/products')
for p in products:
    if p['id'].startswith('s') and os.path.exists(os.path.join(PHOTO_DIR,p['id']+'.jpg')): p['photo']='products/'+p['id']+'.jpg'
# 원본 앱 상품표에 있던 특전 2종 (판매 기록 없음, 초기 수량만)
for pid,name,owner,q in [('s_setc_pin','세트 C 한정 핀뱃지','공동',5),('s_sway_sticker','인스타 팔로우 특전 · SWAY 스티커','한재민',30)]:
    addp(id=pid,code='특전',name=name,cat='특전',owner=owner,genre='특전',price=0,stock=q,settle='공동' if owner=='공동' else '개인',memo='원본 상품표의 초기 수량 (남은 수량 기록 없음)',logs=[])
    if os.path.exists(os.path.join(PHOTO_DIR,pid+'.jpg')): products[-1]['photo']='products/'+pid+'.jpg'
# 서코는 결제별 기록이 없음 → 상품별 판매량·결제수단 합계·세트 할인 합계만 사용 (임의 결제 생성 안 함)
seoco_base={sid[c]:sold for c,_,_,_,_,_,sold,_ in SP if sold}
seoco=dict(id='seoco0823',title='8월 서코 일요일',big='서코',cap='코믹월드',date='2026. 8.',dateNote='일요일 · 정확한 날짜 미입력',
  place='일산 킨텍스 · BJ04, BJ05',booth='BJ04, BJ05',status='done',color='--c2',
  goal='',visits=0,sales=[],base=seoco_base,noTime=True,ordersReal=48,discTotal=9000,
  discNote='세트 할인 합계 9,000원 (세트별 적용 횟수는 기록 없음)',
  payReal={'계좌이체':{'amt':330000,'n':33},'현금':{'amt':85000,'n':13},'카카오페이':{'amt':18000,'n':2}},
  pay={},start='',endAt='',checklist=[],
  items=[{'id':sid[p[0]],'q':p[5]+p[6]} for p in SP],
  notes=[],review='',retros=[],
  source='레거시 앱 재고표(판매가·재고·판매량) + 정산 화면 합계')
# ---- 여의도 (Supabase test1234) ----
st=json.load(open(sys.argv[1] if len(sys.argv)>1 else 'ws_state.json')); ev=st['events'][0]
inv=st['inventory']; idmap={}
GEN={'씰스티커':'문구','떡메모지(소)':'문구','떡메모지(중)':'문구','메모스티커':'문구','마스킹테이프':'문구','엽서':'문구','동물 쿠키':'디저트','씬쿠키':'디저트','브라우니':'디저트','sway 티셔츠':'의류','vintage tee':'의류'}
for n,i in enumerate(inv):
    pid=f'y{n+1}'; idmap[i['id']]=pid
    def kstd(iso):
        import datetime
        d=datetime.datetime.fromisoformat(iso.replace('Z','+00:00'))+datetime.timedelta(hours=9); return f"{d.month}. {d.day}. {d:%H:%M}"
    logs=[{'at':kstd(l['at']) if l.get('at') else '','type':l.get('type','기록'),'q':l.get('quantity',0),'left':l.get('remaining',i['stock'])} for l in i.get('stockLogs',[])]
    addp(id=pid,name=i['name'],cat=i['category'],owner=i['productOwner'],genre=GEN.get(i['category'],'잡화'),price=i.get('recommendedPrice') or 0,stock=i['stock'],
         settle='개인',memo=i.get('sourceEvent',''),logs=logs)
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
  source='레거시 Supabase test1234 기록(revision 107)', review='', retros=[{'at':'','t':'결과: '+ev['review']['result']}] if ev['review'].get('result') else [])
for p in products:
    if p['id'] in ('s3_1','s6_2','s1_3','s11_2','y51','y15'): p['fav']=True
data=dict(user=dict(id='test1234',name='test1234',booth='기묘한 케이블 타이'),products=products,events=[yeo,seoco])
open('../../prototype/account-test1234.js','w').write('/* test1234 계정 데이터: 여의도 음악축제(Supabase booth_workspaces, revision 107) + 8월 서코 일요일(재고표·정산표 기준 복원) */\nconst ACCOUNT_TEST1234 = '+json.dumps(data,ensure_ascii=False)+';\n')
print('products',len(products),'seoco units',sum(seoco_base.values()),'yeo sales',len(ysales),sum(s['total'] for s in ysales),'visits',yeo['visits'])
from collections import Counter
print(Counter(s['pay'] for s in ysales))
print('missing map',[k for k,v in emap.items() if not v][:3])
