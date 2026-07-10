# popVOCA — TOEFL 단어 학습 앱

## 이게 뭔지
**popVOCA** (패키지 `com.vocapop.app`) — 토플 단어 학습 앱. **Expo SDK 51 / React Native 0.74.5**. 단어 2,640개, 세션 기반 박스 SRS, 퀴즈 6유형, **안드로이드 네이티브 잠금화면 학습 + 플로팅 오버레이(다른 앱 위 학습)**. **안드로이드 우선** — 오버레이·잠금 기능은 Kotlin 네이티브라 안드 전용(iOS는 빌드는 되지만 그 기능은 숨김).

## 실행 방법 (안드로이드)
필요: **Node 18+, JDK 17, Android SDK**(platform 34 + build-tools + 에뮬레이터 AVD 또는 USB 디버깅 켠 실기기). 없으면 Claude가 설치해줄 수 있음.

1. `npm install` — (node_modules는 zip에 없음, 여기서 재생성)
2. `npx expo run:android` — **dev 클라이언트 빌드 + 에뮬/기기 설치 + Metro 시작**. ⚠️ **Expo Go로는 안 됨**(커스텀 네이티브 모듈 때문). 첫 빌드는 몇 분 걸림.
3. 이후 **JS만 고치면 Metro가 hot-reload**. Kotlin(네이티브) 고치면 `npx expo run:android`로 재빌드 필요.

**릴리스 APK**: `cd android && ./gradlew :app:assembleRelease` → `android/app/build/outputs/apk/release/app-release.apk` (debug keystore로 서명, 폰에 바로 설치 가능).

## 구조 (뭐가 어디 있나)
- **App.js** — 루트. `useReducer` 하나로 전체 상태 관리. 화면 전환 = `screen` 문자열(`home`/`preview`/`card`/`cardR1End`/`cardDone`/`quiz`/`result`/`vocab`/`stats`/`settings`) + 모달. **React Navigation 안 씀.** 리듀서가 모든 상태(boxes·세션·settings…) 보유. AsyncStorage 저장 + Supabase 클라우드 동기화 + 하드웨어 뒤로가기 처리.
- **data.js** — 단어 로딩 + **모든 학습 로직**(박스 `boxAfterCard`/`boxAfterQuiz`, `buildSession`, 퀴즈 유형 회전 `quizSlotFor`, 동결 문제은행 접근). 학습 메커니즘의 단일 진실 원천.
- **theme.js** — 🎨 **디자인 토큰.** `VP` = 색 팔레트(라이트+다크, 게터 객체라 자동 전환), `ff(굵기)` = Pretendard 폰트, `ls()` = 자간. **색·타이포 바꾸려면 여기.**
- **ui.js** — 공용 컴포넌트(VPButton, SpeakButton, ProtoTopBar, VPProgress) + 효과음/햅틱 헬퍼.
- **Icon.js** — SVG 아이콘(react-native-svg).
- 화면 컴포넌트: `Home.js` `Flashcard.js` `Quiz.js`(+타일/듣기/스펠 유형) `Result.js` `Wordbook.js` `Stats.js` `Settings.js` `WordDetail.js` `Onboarding.js`.
- **modules/vocapop-overlay/** — 커스텀 네이티브 모듈(Kotlin, 안드). 플로팅 오버레이 + 잠금화면 학습카드. `index.ts` = JS 브리지.
- **assets/**: `vocab_merged.json`(단어 2,640) · `quiz_bank.json`(**손검수된 동결 퀴즈 보기 — 함부로 재생성 X**) · `fonts/`(Pretendard) · `sfx/`(효과음).
- 데이터: `supabase.js` `sync.js` `notifications.js` `Auth.js` (Supabase anon 키는 클라이언트 공개용이라 포함돼도 안전, 공용 dev 백엔드).

## 디자인 작업 노트
- 스타일은 전부 인라인 `style={{...}}`에서 `VP.*` 토큰을 읽음(게터라 라이트/다크 자동). **전역 리스타일 = theme.js의 `VP_LIGHT`/`VP_DARK` 편집.**
- 폰트 = **Pretendard**(`assets/fonts`, expo-font). 굵기 `ff(400~800)`.
- **원본 디자인 프로토타입이 `../design-reference/`에 있음** — `VocaPoP Prototype.html`을 브라우저로 열면 정답지. RN 화면들은 이걸 픽셀 이식한 것. **시각 레퍼런스로 사용.**
- 브랜드 액센트 = 핑크 `#FF5BB8`(로고의 "pop").

## 규칙 (지켜주면 좋음)
- **변경 의도를 주석으로** — 비자명한 수정마다 왜 그렇게 했는지 ★주석. 이 코드베이스가 그거에 의존함.
- **데이터 파괴적 편집 전 백업**(`vocab_merged.json`/`quiz_bank.json`은 .bak 먼저). 특히 `quiz_bank.json` 보기는 손으로 검수한 거라 재생성하면 그 노고가 날아감.
- 단어 데이터의 `num` 순서 = 학습 진도 id에 매핑됨. 영향 이해 없이 재정렬 금지.
- 안드 우선 — 오버레이·잠금은 Kotlin이라 그 기능 손대면 네이티브 재빌드. 에뮬/기기서 확인.

## 현재 상태
동작·배포됨 (**v18 / versionCode 18**). 박스 SRS · 퀴즈 6유형(4지선다 뜻/단어/빈칸 + 글자타일 + 듣고맞히기 + 스펠링(힌트)) · 잠금화면 학습 · 플로팅 오버레이(좌우 스와이프=답, 위로=이전) · 복습 알림 · 세션 저장+이어하기 · 하드웨어 뒤로가기 · Supabase 클라우드 동기화.
