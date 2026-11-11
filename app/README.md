# app — 리틀부스 iOS 앱

Expo SDK 58 (React Native 0.88) + TypeScript. 데이터는 **기기 안 암호화 SQLite**에만 저장하고 서버·계정·분석 도구가 없다.
결정 배경: [ADR-0004](../docs/decisions/0004-native-app-stack.md), [ADR-0005](../docs/decisions/0005-v1-no-monetization.md). 보안: [보안 계획](../docs/security/security-plan.md).

## 구조
```
src/domain/    프레임워크와 무관한 순수 로직 (정산·재고·금액·내보내기·캐릭터톡 대본) + 테스트
src/db/        SQLCipher 열기·마이그레이션(schema.ts)·저장소(repo.ts: 입력 검증, 트랜잭션)
src/security/  DB 키(키체인), 앱 잠금(Face ID/암호), 앱 전환기 블러
src/i18n/      ko / en / ja / zh(간체) 문자열 — 원어민 검수 전 초안
src/screens/   행사(준비·판매·결과) · 재고 · 캐릭터톡 · 설정
```

## 명령
```bash
npm ci                 # 설치 (npm install 대신 lockfile 고정)
npm test               # 도메인 테스트 (정산 규칙은 서코 정산표 합계 구조로 검증)
npm run typecheck
npm run export:ios     # JS 번들이 컴파일되는지 확인 (네이티브 빌드 아님)
```
> `expo install`은 이 클라우드 세션에서 막혀 있다(api.expo.dev 차단). 의존성 버전은 `node_modules/expo/bundledNativeModules.json`의 SDK 호환 목록을 따른다.

## 개발 환경 제약 — 꼭 읽기
- **암호화 DB(SQLCipher)는 Expo Go에서 동작하지 않는다.** 개발 빌드(`eas build --profile development`) 또는 `expo prebuild` 후 Xcode 빌드가 필요하다. Expo Go에서는 경고를 띄우고 암호화 없이 열린다(`__DEV__`일 때만). **릴리스 빌드는 암호화가 꺼져 있으면 DB를 열지 않는다.**
- 이 저장소의 CI/클라우드 환경에서는 iOS 네이티브 빌드·실기기 테스트를 하지 못했다. 화면과 Face ID·SQLCipher 동작은 **실기기에서 아직 검증되지 않았다.**
- `bundleIdentifier: com.littlebooth.app`은 **임시값**이다. 소유한 도메인 기준으로 확정하고 Apple Developer에 등록해야 한다.

## 아직 없는 것 (출시 전 필수는 docs/plans/ios-launch.md)
앱 아이콘·스플래시 최종본, 암호화 백업 내보내기/가져오기, 엑셀(xlsx) 내보내기(현재 CSV), 독자 캐릭터 그림, 접근성 점검, 실기기 테스트.
