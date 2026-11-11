# backend (Firebase)

Supabase → Firebase로 이동. 새 앱은 처음부터 Firebase로 만든다.

## 구성
- Auth: 이메일/Apple/Google (iOS는 Apple 로그인 필수 검토)
- Firestore: 사용자·행사·상품·판매 데이터
- Cloud Functions: 판매/재고 트랜잭션 검증, 정산 집계, AI 챗 프록시(키 서버 보관)
- Storage: 사진
- App Check, Security Rules 필수

## 데이터 모델 초안
```
users/{uid}
  events/{eventId}
    sales/{saleId}        # 주문 ID = 문서 ID (멱등)
    visits, memos
  products/{productId}
  stats/{eventId}         # Functions가 집계 (읽기 최적화)
```

## 주의
- 분석이 핵심인 서비스인데 Firestore는 임의 집계·조인에 약하다.
  → Functions 사전 집계 + 필요 시 BigQuery 내보내기(Firebase 확장)로 분석 계층을 둔다.
- 판매·재고 일관성은 Firestore 트랜잭션/배치로 보장, 취소는 삭제가 아니라 이력 문서.
- 레거시 이전: `legacy-web-final` 태그의 `database/supabase/`와 `domain.ts` 규칙 참조.

---
> **2026-11-11 갱신:** v1 iOS 앱은 서버 없이 기기 안 저장소만 쓴다([ADR-0004](../docs/decisions/0004-native-app-stack.md)).
> 위 Firebase 계획은 동기화·공유 정산 같은 서버 기능이 필요해질 때까지 **보류**한다. 그때는 CloudKit(사용자 iCloud 용량 사용, 개발자 비용 0)을 먼저 검토한다.
