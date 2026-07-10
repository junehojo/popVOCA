# VocaPoP (Expo / React Native)

토플 통합 단어장 학습 앱. 코어는 Expo(React Native), **플로팅 학습 오버레이는 안드로이드 네이티브** 기능(다른 앱 위에 단어 카드 띄우기)이다. iOS는 Apple 정책상 이 기능 미지원(메뉴 자동 숨김).

## 들어있는 것
- `App.js` — 코어 앱 전체(홈 계단 / 플래시카드 체크 / 퀴즈 / 결과). 신규 사용자는 **1걸음만 열림**, 진도·단어 체크 기록은 **로컬(AsyncStorage) 저장**.
- `assets/vocab_merged.json` — 2,864단어(발음·뜻·영영정의·예문·CEFR). 20단어 = 1걸음 → 약 144걸음.
- `modules/vocapop-overlay/` — **로컬 네이티브 모듈**. 안드로이드 SYSTEM_ALERT_WINDOW 오버레이(Kotlin) + iOS no-op 스텁.
- 홈엔 오버레이 버튼 없음. **플래시카드 학습 화면**에서 "🪟 플로팅 학습" 버튼으로 켠다(현재 레슨 단어로).

## 사전 준비 (네 컴퓨터)
- Node 18+, **Android Studio**(SDK/에뮬레이터), 실기기면 USB 디버깅.
- iOS도 빌드하려면 **Mac + Xcode**.
- (배포 시) Expo 계정 + EAS CLI: `npm i -g eas-cli`

## 1) 설치
```bash
cd vocapop-app
npm install
```

## 2) 네이티브 프로젝트 생성 (A안 = prebuild)
네이티브 모듈(오버레이)을 쓰므로 Expo Go가 아니라 **dev build**가 필요하다.
```bash
npx expo prebuild        # android/ ios/ 네이티브 폴더 생성 (로컬 모듈 자동 링크)
```
> 권한은 모듈의 AndroidManifest(SYSTEM_ALERT_WINDOW)가 자동 병합된다.

## 3) 실행 (안드로이드)
```bash
npx expo run:android     # 에뮬레이터/기기에 dev build 설치 + 실행
```
- 앱 → 아무 걸음 → 플래시카드 → "🪟 플로팅 학습" → 권한 허용 → 홈버튼으로 나가서 다른 앱 위에 카드가 떠 있는지 확인.

## 4) 실행 (iOS, 선택)
```bash
npx expo run:ios         # 오버레이 버튼은 자동으로 숨겨짐
```

## 5) 배포용 빌드 (EAS)
```bash
eas build -p android --profile preview   # APK/AAB
eas build -p ios --profile preview       # (Mac/계정 필요)
```

## 제품 동작 메모
- **체크 트랙 vs 정복 트랙**: 플래시카드를 끝내면 그 걸음이 "체크"됨(다음 걸음 열림). 퀴즈까지 통과하면 "정복". 퀴즈는 체크 전엔 잠김.
- **로컬 저장 키**: `vocapop:v1` (checkedCount, conquered, known, unknown, points, streak).
- 진도 초기화: 앱 데이터 삭제 또는 코드에서 `RESET` 디스패치.

## 다음 작업(확장 여지)
- 단어장/오답노트/통계 화면, SRS 복습 스케줄, 발음 TTS(`expo-speech`), 로그인+서버 동기화.
- 오버레이에서 알아요/몰라요 결과를 앱으로 되돌려 진도에 반영(현재는 복습 표시용).
- 오버레이 디자인(버블 최소화/펼치기, 진행바)을 프로토타입 수준으로 다듬기 — 온디바이스에서 Claude Code로 반복 권장.

## 주의
- 이 코드는 디자인 환경에서 작성됐고 **여기선 빌드·실행 검증을 못 한다.** 네 머신(Android Studio / Claude Code)에서 `expo run:android`로 돌리며 다듬어라. 특히 네이티브 Kotlin 오버레이는 기기에서 미세 조정이 필요할 수 있다.
