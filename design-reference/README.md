# VocaPoP — 원본 디자인 프로토타입 (RN 이식용 정답지)

이 폴더는 VocaPoP 앱의 **확정된 디자인·모션 원본**이다. HTML + React(브라우저 Babel/JSX)로 작성됐고, **실제 RN 앱은 이것과 시각적으로·모션까지 똑같아야 한다.** 동작 로직(1걸음만 열림, 로컬 저장 등)은 RN 쪽 규칙을 따르되 **디자인/레이아웃/애니메이션은 이 프로토타입을 픽셀 단위로 따른다.**

## 어떻게 보나
- 진입점: `VocaPoP Prototype.html` — 이게 아래 `vp-*.jsx`들을 순서대로 로드한다. 브라우저로 열면 실제로 동작한다(폰 프레임 안에서).
- 코드를 정독해서 색/크기/간격/모션 수치를 그대로 가져와라. 스크린샷만 보지 말고 **소스의 숫자**를 베껴라.

## 파일 역할
- `vp-proto-app.jsx` — 루트. **상태/리듀서, 색 토큰(VP.*), 폰트 스택, localStorage 저장 로직**. 디자인 토큰의 원천.
- `vp-proto-onboarding.jsx` — 첫 진입 온보딩.
- `vp-proto-screens-1.jsx` — **홈 계단**(가장 중요). 걸음 버튼(5상태), 선택=하단 기준 고정, 위로 28px씩 좁아지는 폭 테이퍼, 상단 그라데이션 마스킹, **걸음 선택 말풍선**(핑크 채움+흰 버튼), 데일리 목표 카드.
- `vp-proto-screens-2.jsx` — **플래시카드 체크 화면 + 퀴즈 + 결과**. 카드 스와이프(알아요/몰라요), 탭 플립, 진행바, 전환 애니메이션.
- `vp-proto-overlay.jsx` — **플로팅 학습 오버레이**(앱 내 버전). 미니 카드, 드래그, 스와이프. RN 안드로이드 네이티브 오버레이의 디자인 레퍼런스로 사용.
- `vp-proto-wordbook.jsx` — 단어장(알아요/몰라요/미표시 색 구분, 검색).
- `vp-proto-notereview.jsx` — 오답노트/복습.
- `vp-proto-detail.jsx` — 단어 상세.
- `vp-proto-screens-stats.jsx` — 통계.
- `vp-proto-data.jsx` — (구) 더미 단어. 실제 데이터는 RN 쪽 `assets/vocab_merged.json` 사용.
- `vp-vocab-data.js` — 2,864단어 전체(이 프로토타입이 실제로 쓰는 데이터). 형식 참고용.

## 반드시 그대로 옮길 것 (체크리스트)
1. **색 토큰** — `vp-proto-app.jsx`의 `VP` 객체(accent #FF5BB8, accentDeep #E83FA1, accentSoft #FFE3F3, 텍스트/보더/배경 등) 전부.
2. **타이포** — 폰트 스택, 각 요소 fontSize/fontWeight/letterSpacing.
3. **홈 계단 기하** — `P_ABOVE/P_BELOW/P_SLOT_H/P_SLOT_GAP/P_STRIDE/P_SELECTED_BOTTOM` 상수, 폭 테이퍼(선택 4칸 아래 A = 좌우 20px, 위로 28px씩 좁게), box-sizing border-box, 상단 마스킹 그라데이션.
4. **걸음 5상태 디자인** — 비활성/오늘(현재)/선택/체크완료/정복. 좌측 원형 아이콘칩 + 우측 라벨/배지, 핑크 테두리 없음.
5. **말풍선** — 핑크 배경 + 흰 버튼 + 흰 글자, 테두리·그림자 없음, 아래/위 자동 뒤집기, 첫 탭=가운데로·둘째 탭=열기.
6. **플래시카드 모션** — 스와이프 임계/회전/색 틴트, 탭 플립, 진행바, 완료 전환.
7. **간격·반경·그림자** — 카드 radius, 그림자 offset/blur, 패딩/마진 px 값.

## 작업 방식 권장
- 화면 단위로: **홈 → 플래시카드 → 퀴즈 → 결과 → 단어장 → 오답노트 → 통계 → 오버레이** 순.
- 각 화면 옮긴 뒤 프로토타입(브라우저)과 **나란히 비교**하며 수치 보정.
- 모션은 프로토타입의 transition/animation 타이밍(예: `.3s cubic-bezier(.2,.85,.3,1.01)`)을 RN Animated/Reanimated로 등가 변환.
