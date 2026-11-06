# ADR-0001 저장소 구조

- 결정: **모노레포 1개**, 최상위 3영역 `docs/` · `app/` · `backend/`
- 이유: 1인/소규모 팀, 문서·앱·백엔드 변경이 함께 움직임, 이슈/PR/CI 한 곳
- 대안: 레포 3개 → 버전 맞추기·PR 분산 비용이 크다. 팀이 커지면 분리.

## 브랜치 전략
- `main` = 항상 배포 가능. 직접 푸시 금지(PR)
- 작업 브랜치: `feat/…` `fix/…` `docs/…` `chore/…` (짧게 살고 PR 후 삭제)
- **"일자별 브랜치"는 쓰지 않는다**: 브랜치는 병합 충돌과 갈라진 이력만 만든다. 날짜 기록은 아래로 해결.
  - 일자별 기록 → `docs/journal/YYYY-MM/YYYY-MM-DD.md`
  - 시점 보존 → 태그 `v0.1.0`, `ios-1.0.0-b3`
  - 변경 이력 → `CHANGELOG.md` (Conventional Commits에서 생성)
- 커밋: Conventional Commits (`feat(app): …`, `docs(strategy): …`)

## 백엔드
- Firebase(Auth, Firestore, Functions, Storage) 사용. 상세는 `backend/README.md`
