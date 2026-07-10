# popVOCA 퀴즈 전수 검토 결과 (전 137걸음 · 2,724문항)

한 문항씩(보기 4개 전부) 직접 읽고 판단. 검출기/정규식 없이 수동 검토.
1~86걸음·87~137걸음 모두 정확한 ref로 확정. **✅ 전부 수정 적용됨** (2026-06-09, data.js·Quiz.js·vocab_merged.json[.bak8 백업]).

ref 표기: `걸음.번호` (예: 6.17 = 6걸음 17번). 강/중/약 = 모호함 정도.

---

## A. 진짜 "답 모호" 문제 (오답이 실제로도 정답)

### A-1. 동의어 충돌 (뜻/단어 유형 — 정답·오답이 같은 뜻)
| ref | 충돌 쌍 | 겹치는 뜻 | 정도 |
|---|---|---|---|
| 1.9 | worth ↔ merit | 가치 | 약 |
| 2.12 | hostile ↔ vicious | 공격적인 | 약 |
| 47.7 | magnificent ↔ superior | 뛰어난/훌륭한 | 강 |
| 66.0 | proficient ↔ exceptional | 뛰어난 | 강 |
| 66.6 | distinguished ↔ exceptional | 뛰어난 | 강 |
| 82.4 | maintenance ↔ perennial | 지속 | 약 |
| 116.14 | memorize ↔ retain | 기억하다 | 강 |

*66걸음엔 exceptional/proficient/distinguished가 한 묶음으로 깔려 충돌이 겹침.*

### A-2. 문맥 적합 (뜻은 다르나 빈칸 문장에 오답도 자연스러움)
| ref | 정답 ↔ 가능한 오답 | 문장 | 정도 |
|---|---|---|---|
| 6.17 | inventory ↔ stock | "checked the ___ before placing a new order" | 강 |
| 9.14 | outfit ↔ costume | "chose a professional ___ for the presentation" | 중 |
| 10.14 | government ↔ insurance | "works in a ___ office in the city center" | 강 |
| 32.11 | release ↔ draft | "will ___ its annual report next week" | 약 |
| 33.11 | fruitful ↔ valuable | "proved to be ___ for both companies" | 중 |
| 45.5 | possession ↔ warehouse | "keeps all important documents in her ___" | 약~중 |
| 50.2 | ownership ↔ lease | "The ___ of the building was transferred" | 강 |
| 58.8 | negative ↔ insignificant | "will have a ___ effect on our profits" | 중 |
| 62.14 | hatred ↔ lack | "Her ___ of dishonesty makes her trusted" | 강 |
| 65.11 | element ↔ portion | "Each ___ of the plan must be considered" | 강 |
| 66.14 | masterpiece ↔ celebrity | "exhibit features several ___" | 약~중 |
| 133.2 | principally ↔ widely | "The fund is ___ used for research" | 중 |

---

## B. 데이터·예문 오류 (개별 수정)

### B-1. 틀린 뜻 (gloss 오류)
| ref | 단어 | 문제 |
|---|---|---|
| 13.15 | carousel | 뜻 "미국영어" ← 완전 깨짐 (회전목마/수하물 컨베이어). carousel이 오답으로 깔린 모든 13걸음 문항 오염 |
| 79.8 | patron | 뜻 "관객" → 수호성인/후원자 |
| 105.2 | balk | 뜻 "방해하다" → 주저하다/멈칫하다 |
| 50.5 | precedence | 뜻 "전례" → 우선(함) ("전례"는 precedent) |
| 133.17 | pollution | 뜻에 "불법, 범죄" 잘못 붙음 (오염만 맞음) |
| 49.2 | burial | 뜻 "묘지" → 매장/장례 (사소) |

### B-2. 뜻이 예문 의미를 못 담음 (다의어 누락)
| ref | 단어 | 글로스 | 예문 속 뜻 |
|---|---|---|---|
| 12.17 | flora | 식물지 | gut/intestinal flora = 장내 세균총 |
| 40.8 | humanity | 인간성, 인류 | a humanity = 인문학 |
| 40.14 | moderation | 알맞음 | moderation of a forum = 중재/관리 |
| 56.5 | mock | 조롱하다(동) | History mock = 모의고사(명) |
| 62.8 | discharge | 짐을 내리다, 해방하다 | discharge powers/duties = 직무 수행 |
| 69.2 | troop | 군대(명) | trooped into the room = 무리지어 가다(동) |
| 76.8 | faculty | 능력, 재능 | faculty of Science = 학부/단과대학 |
| 84.8 | tint | 연하게 칠하다(동) | different tints = 색조(명) |
| 88.11 | adopt | 채용하다 | adopt a baby = 입양 |
| 100.17 | pasture | 목장(명) | pastured oxen = 방목(동) |
| 136.14 | consonant | 자음 | consonant tones/chords = 협화음 |

### B-3. 글로스 오타/혼동
| ref | 단어 | 문제 |
|---|---|---|
| 21.2 | located | "위치한 분사 위치를 찾다" (띄어쓰기·품사 뭉개짐) |
| 58.x | discreet | "사려 깊은, 분별 있는 분리된" — "분리된"은 discrete 혼동(잘못 붙음) |
| 134.8 | tailer | → tailor 철자 오류 (재단사) |

### B-4. 깨진/부적절 예문
| ref | 단어 | 문제 |
|---|---|---|
| 2.2 | deal | "three deal of grain" (의미 불성립) |
| 2.11 | shoot | "to shoot a gun" (글로스는 싹/가지뿐, 쏘다 누락) |
| 7.5 | irony | "an irony taste" (풍자 뜻과 안 맞음) |
| 79.17 | charcoal | "____: &nbsp;" (빈 예문) |
| 94.17 | ape | "We were ape over the new look" (문법 깨짐) |
| 52.2 | generator | "can ___ enough power" (동사 generate 필요, 명사형) |
| 126.5 | contaminate | "This water is contaminate" → contaminated |
| 136.5 | signpost | "wasn't signpost" → signposted |

### B-5. 빈칸이 안 비워짐 (정답 노출)
| ref | 단어 | 문장 |
|---|---|---|
| 98.11 | imply | "The report **implies** that sales will increase..." |
| 122.14 | activity | "...a range of outdoor **activities**." |
| 126.17 | procrastinate | "She has a habit of **procrastinating**..." |

---

## 집계
- A 진짜 모호: 19건 (동의어 7 + 문맥 12)
- B 데이터 오류: 약 30건

## 적용된 수정 (2026-06-09)
1. **A-1 동의어 충돌** → `data.js` `pickOptions`: 정답과 뜻 토큰이 겹치는 후보를 오답에서 제외(동의어 차단). worth/merit, magnificent/superior, proficient·distinguished/exceptional, memorize/retain, inventory/stock, element/portion, outfit/costume 등 일괄 해결.
2. **A-2 문맥 적합** → `data.js` `pickOptions`: 문맥 충돌쌍 `_AVOID`(11쌍) 명시 회피. *예문을 고치지 않고 오답 후보에서만 빼는 방식 채택 — 예문을 바꾸면 해시가 또 다른 적합 단어를 뽑을 위험이 있어 결정적 회피가 더 안전.*
   → 전 2,724문항 시뮬: 보기 4개·정답 포함·중복 없음, fallback 0, 충돌 19건 전부 제거 확인.
3. **B 데이터 오류** → `vocab_merged.json` 33개 항목 직접 교정(뜻·예문·철자). 예문 교체 시 원본 `example`+`exampleBlank` 동시 수정 → 빈칸추론 문장 자동 반영.
4. **B-5 빈칸 노출** → `Quiz.js` `blankExample`: 굴절형(implies/activities/procrastinating)까지 가리고 전체 치환(중복 출현 누출 방지). 전수 스캔 결과 정답 노출 0.
5. **추가 발견(스캔)**: 빈 예문 eucalyptus·almond, &nbsp; 잔여 induce·annual, 철자오류 chaperone(예문) — 모두 교정.

## 2차 정독 (수정 후 재검, 2026-06-09)
오답 필터가 오답 후보를 바꾸면서 *새* 문맥충돌이 생길 수 있어, 수정된 데이터+새 pickOptions로 **빈칸형 817문항을 현재 상태로 다시 생성해 전수 정독**. 4건 추가 발견 → 예문 구체화로 해소(`.bak9`):
- `18.5` consistency↔investment, `25.8` genuine↔local, `52.5` portable↔popular, `53.2` urine↔separate
- 회피쌍 대신 **예문을 정답만 들어맞게 수정**(해시 재배치에 안전). 예: urine "The nurse collected a urine sample to check his kidney function."
- 전체 재검증 0: 무결성·아티팩트·뜻불일치(실)·빈칸실패·정답노출·보기·동의어잔존 모두 0/2,724.

## 3차 정독 (품사겹침 위험군 집중, 2026-06-09)
오답과 정답의 **품사가 겹치는 632문항**(문법상 이중정답 가능한 위험군)을 표시해 다시 전수 정독. 단서 없이 오답이 들어맞는 1건만 추가 발견 → 예문에 면접 단서 추가:
- `137.2` interviewee↔proponent: "The interviewee answered every question **from the hiring panel** confidently." (proponent는 hiring panel과 안 어울림)
- 나머지 ★경계 사례는 문장에 정답을 가리키는 단서가 있어(each summer→coastal, motivational speaker→inspiring 등) 건전한 문항으로 판단. **판단 기준 = 앱이 실제로 보여주는 글로스**(obscure 사전 뜻 아님).
- 빈칸형 817문항을 총 3회 정독(원본·수정후·품사위험군). 자동검증 부류(동의어·정답노출·깨진예문·무결성)는 전 구간 0 증명.

## 4차 정독 (동결 은행 전수 1문항씩, 꼼수 없이, 2026-06-09)
quiz_bank.json + vocab를 합쳐 `/tmp/all_q.txt`(전 2,724문항, 은행 표시 순서, 3유형 전부 — 뜻/단어/빈칸)로 덤프해 **1번~2,724번을 처음부터 끝까지 한 줄씩 직접 정독**. 빈칸형 포함 전부 다시 읽음.
- **추가 발견 1건**: `136.7` W "비길 데 없는, 탁월한"(unsurpassed)의 오답에 **unrivaled**("비할 데 없는, 유일무이한")가 깔림 → 사실상 동의어(둘 다 "견줄 데 없는"). 동의어 토큰 필터가 **비길/비할** 한 글자 차이로 못 걸렀음.
- **수정**: `data.js _AVOID`에 `['unsurpassed','unrivaled']` 추가 → 은행 재생성. **딱 136.7 한 문항만** 변경(unrivaled→nationality 국적), 나머지 2,723문항 byte-동일(복제 충실성 증명). 은행 백업 `quiz_bank.json.bak`.
- **전수 재검증 0**: 무결성·보기깨짐·동의어토큰겹침·빈칸미완성·정답노출·없는id 모두 0/2,724. "정밀 회피 불변식"(정답이 쌍 한쪽 & 다른쪽이 오답) 위반 0건(회피쌍이 보기에 나란히 보이는 10건은 전부 정답이 제3단어 → 무해).
- 빈칸형 총 4회 정독(원본·수정후·품사위험군·동결은행). 자동검증 부류는 전 구간 0 증명.

## 5차 정독 (동의어 전수 직접 대조 — 필터 무시, 2026-06-09)
"필터가 못 잡는 표기변형 동의어(비길/비할)는 사람이 읽어 잡아야 한다"는 지적 반영. **보기 선택은 유형 무관 동일**이므로 모든 정답의 오답 3개를 유형별로 덤프해 **2,724문항 전부 한 줄씩 직접 뜻 대조**:
- `/tmp/syn_word.txt`(953 단어형: 프롬프트뜻 vs 오답단어 뜻) · `/tmp/syn_meaning.txt`(954 뜻형: 프롬프트단어 vs 오답뜻) · `/tmp/syn_blank.txt`(817 빈칸형: 정답단어 vs 오답단어 뜻, 동의어면 빈칸에 둘 다 맞음).
- **추가 발견 0건.** 136.7(unsurpassed↔unrivaled, 4차 발견·수정) 외 사람이 "이것도 정답"이라 할 동의어 이중정답 없음.
- 거의 동일한 뜻을 가진 쌍들은 전부 (a)같은 걸음이면 토큰필터가 분리, (b)다른 걸음이면 애초에 한 문제에 안 모임 — 둘 다 **읽어서 직접 확인**: relevant/pertinent·persuade/convince·adequate/sufficient·memorize/retain·exceptional/proficient/distinguished·flooding/deluge·insufficient/inadequate·revitalize/re-energize·facilitate/expedite·traditional/customary 등.
- 같은 보기에 동의어 두 개가 나란히 있어도 **정답이 제3단어면 무해**(예: 92.11 sufficient+adequate 동시 오답, 정답=segment / 136.6·136.15 unsurpassed+unrivaled 동시 오답, 정답=scrutinize·variability).

**결론**: 사람이 "이것도 정답!"이라 할 동의어/이중정답 케이스는 **전 2,724문항을 내가 직접 읽어 대조**해 발견되는 족족 제거함(필터는 1차 거름망일 뿐, 최종 판단은 직접 정독). 다만 *수학적 0*은 여전히 장담 불가 — 내 판단이 놓친 미묘한 케이스가 있을 가능성은 원리상 남음(다만 전수 정독으로 그 확률을 최대한 낮춤). 발견 즉시 회피쌍·예문 수정으로 처리하는 체계.

남은 항목: APK 재빌드(승인 후 — 데이터·로직·은행 변경됨) · TTS 폰 검증 · SRS 푸시 · 새 학습 메커니즘(미구현, 별도 지시 대기).
