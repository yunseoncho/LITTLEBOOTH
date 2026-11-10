# 리틀부스 (LittleBooth)

행사를 도는 셀러를 위한 분석·성장 중심 부스 관리 서비스.

> 비공개 저장소: 프로토타입에 실제 판매자 이름·매출이 들어 있어요.

```
docs/      전략·계획·결정·일자별 기록   (docs/strategy, plans, decisions, journal, archive)
prototype/ HTML 프로토타입 (화면·흐름 시안, test1234 실데이터 + 데모)
tools/     데이터 변환 스크립트 (레거시 → 프로토타입)
app/       Flutter 프론트 (iOS → PC)
backend/   Firebase (Auth·Firestore·Functions·Storage)
```
- 전략: [타겟](docs/strategy/01-target.md) · [컨셉](docs/strategy/02-concept.md) · [차별점](docs/strategy/03-differentiation.md) · [BM](docs/strategy/04-business-model.md)
- [프로토타입 열기·로그인·데이터 출처](prototype/README.md) · [화면·기능 명세](docs/product/screens.md)
- [로드맵](docs/plans/roadmap.md) · 결정: [저장소 구조](docs/decisions/0001-repo-structure.md) · [재고 소유·상태](docs/decisions/0002-inventory-ownership-status.md) · [실데이터 원칙](docs/decisions/0003-real-data-only.md)
- 레거시 웹: `yunseoncho/mylittlebooth` 태그 `legacy-web-final`
