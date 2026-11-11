# iOS 제출 계획 (v1.0)

현재 상태(2026-11-11): 앱 골격 완성 — 행사(준비·판매·결과)·재고·정산·AI 없는 캐릭터톡·앱 잠금·암호화 DB. 도메인 테스트 28건 통과, 타입체크 통과, iOS JS 번들 컴파일 확인, prebuild 네이티브 설정 확인. **실기기·네이티브 빌드는 아직 한 번도 돌려 보지 못했다.**

## 단계
| 단계 | 내용 | 막힘 요소 |
|---|---|---|
| A. 준비 | Apple Developer 가입, 번들 ID 확정, 이름·상표 검토 | **사람이 해야 함**(결제·본인 인증) |
| B. 개발 빌드 | `eas build --profile development` → 실기기 설치 → 보안 점검표(security-plan.md) | Apple 계정 |
| C. P0 기능 | 암호화 백업/복원, 아이콘·스플래시, 접근성, 번역 검수 | — |
| D. TestFlight | 내부 → 외부 베타(한국 20명) | 앱 심사(베타용) |
| E. 제출 | 스토어 정보·심사 노트·스크린샷, 심사 제출 | 개인정보 처리방침 URL |

## A. 준비 — 결정이 필요한 것
1. **개인 vs 조직 계정.** 개인 계정은 스토어의 판매자 이름에 **실명이 노출**된다. 조직 계정은 법인·사업자와 D-U-N-S 번호가 필요하다. (개인정보 노출을 피하려면 사업자 등록 후 조직 계정을 검토)
2. **번들 ID:** 현재 `com.littlebooth.app`은 임시값. 소유한 도메인 기준(`com.<도메인>.littlebooth`)으로 정한다.
3. **이름 검토:** "리틀부스 / LittleBooth / リトルブース / 小小摊位"의 상표·충돌. 특히 일본의 BOOTH(pixiv). KIPRIS·J-PlatPat·USPTO 검색. 앱 이름이 이미 쓰이고 있으면 App Store Connect에서 등록이 안 된다.
4. **독자 캐릭터 확정.** 기존 마스코트는 해외 유명 애니메이션 캐릭터에서 파생된 모양이라, **새 캐릭터가 확정되기 전에는 제출하지 않는다.** 앱 안의 캐릭터톡은 임시 이름·그림 없음 상태다.

## C. 출시 전 필수(P0) 구현 목록
- [ ] **암호화 백업 내보내기/가져오기**(비밀번호로 암호화한 파일). 없으면 폰을 바꿀 때 데이터를 잃는다(키가 기기 전용이라서).
- [ ] 앱 아이콘 1024px, 스플래시, 스크린샷 4개 언어
- [ ] **사용자 정의 결제수단**(나라별 서비스 이름)
- [ ] 내보내기 xlsx(현재 CSV) — 서코 정산표 형식
- [ ] 접근성: Dynamic Type, VoiceOver 레이블, 최소 터치 영역 44pt
- [ ] 번역 원어민 검수(일·중), 번체 중국어 정책 결정
- [ ] 오입력 방지 UX: 금액 입력 자릿수 안내, 판매 취소 확인
- [ ] 실기기 점검: 느린 기기·대용량(판매 1만 건) 성능, 오프라인, 앱 중단·복귀

## E. App Store Connect 입력 항목
| 항목 | 값·메모 |
|---|---|
| 앱 개인정보 | **데이터 수집 안 함** — 코드에 네트워크 요청이 없고 SDK가 없다는 점을 매 릴리스마다 재확인 |
| 개인정보 처리방침 URL | `landing/privacy.html` 게시 후 URL 입력(필수) |
| 수출 규정(암호화) | SQLCipher는 OS 제공이 아닌 오픈소스 암호화. 질문에 어떻게 답할지 **법무 확인 필요** — `ITSAppUsesNonExemptEncryption`은 일부러 비워 두어 빌드 때마다 질문이 뜨게 해 놓았다 |
| 연령 등급 | 사용자 생성 콘텐츠·외부 링크 없음, 캐릭터톡은 정해진 대본 |
| 지원 URL·연락처 | 랜딩 페이지 + 공개해도 되는 연락 이메일(개인 이메일 사용 금지) |
| 판매 국가 | 한국·일본·미국·영어권. **중국 본토는 제외**(ICP 확인 전) |
| 심사 노트 | 아래 참고 |

**심사 노트(초안)** — 영어로 쓴다:
> LittleBooth is a local-only sales ledger for people who sell physical goods at conventions and flea markets. It records cash/bank-transfer/mobile payments that happen outside the app; the app does not process, hold or transfer money, and has no in-app purchases, subscriptions, accounts or network calls. The character chat is a scripted, offline feature with fixed choices (no AI, no free text). Data is stored encrypted on device. No demo account is needed.

## 심사 위험 점검
| 항목 | 판단 |
|---|---|
| **4.2 최소 기능**(웹 감싼 앱) | 네이티브 UI + 기기 암호화 DB + Face ID로 충분히 독자적. 웹 래핑이 아님 |
| **3.1 결제** | 인앱결제 없음. 실물 상품 현장 결제는 기록만 한다(3.1.3(e) 취지: 앱 밖에서 소비되는 상품·서비스는 인앱결제 대상이 아님). 돈을 중개하지 않으므로 PG 불필요 |
| **5.1.1 개인정보·삭제** | 수집 없음, 앱 안 "모든 데이터 삭제" 제공 |
| **1.1 / 5.2 콘텐츠·지식재산** | 앱은 도구이고 판매자 책임. 캐릭터 IP는 독자 캐릭터 확정 후 |
| **2.1 완성도** | 실기기에서 충돌 없음, 빈 화면 없음, 모든 버튼 동작 |
| **4.8 Apple 로그인** | 로그인이 없어 해당 없음 |
> 가이드라인은 수시로 바뀐다. 이 표는 이번 조사(검색 결과)와 앱 설계에 근거한 **자체 점검**이며 심사 결과를 보장하지 않는다. 제출 직전에 [최신 가이드라인](https://developer.apple.com/app-store/review/guidelines/)을 다시 읽는다.

## 보안 점검 → docs/security/security-plan.md의 출시 전 점검표
