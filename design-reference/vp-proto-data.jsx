/* VocaPoP Prototype · 20단어 1 Stage 실제 학습 흐름
   상태 추적: 카드 1→2 라운드, 퀴즈 20문제, 오답 복습, 결과 */

const PROTO_WORDS = [
  { id:  1, word: 'acquire',    pos: 'v',   meanings: ['얻다', '취득하다', '익히다'],         ex: 'She acquired fluent English in two years.' },
  { id:  2, word: 'abandon',    pos: 'v',   meanings: ['버리다', '포기하다', '떠나다'],         ex: 'They had to abandon their plan.' },
  { id:  3, word: 'analyze',    pos: 'v',   meanings: ['분석하다', '검토하다'],                ex: 'Let me analyze the data first.' },
  { id:  4, word: 'approach',   pos: 'v/n', meanings: ['다가가다', '접근법'],                  ex: 'A new approach to learning.' },
  { id:  5, word: 'benefit',    pos: 'n/v', meanings: ['이익', '혜택', '이득을 보다'],          ex: 'Both sides will benefit from this.' },
  { id:  6, word: 'concern',    pos: 'n/v', meanings: ['걱정', '관심사', '관련되다'],           ex: 'My main concern is safety.' },
  { id:  7, word: 'demand',     pos: 'v/n', meanings: ['요구하다', '수요'],                    ex: 'They demanded an apology.' },
  { id:  8, word: 'emerge',     pos: 'v',   meanings: ['나타나다', '떠오르다', '드러나다'],      ex: 'The truth slowly emerged.' },
  { id:  9, word: 'evident',    pos: 'a',   meanings: ['분명한', '명백한'],                    ex: 'His talent was evident from a young age.' },
  { id: 10, word: 'function',   pos: 'n/v', meanings: ['기능', '작동하다'],                    ex: 'The new feature functions well.' },
  { id: 11, word: 'genuine',    pos: 'a',   meanings: ['진짜의', '진심의', '진정한'],           ex: 'He showed genuine interest.' },
  { id: 12, word: 'hesitate',   pos: 'v',   meanings: ['망설이다', '주저하다'],                ex: 'Don\u2019t hesitate to ask.' },
  { id: 13, word: 'impact',     pos: 'n/v', meanings: ['영향', '충격', '영향을 주다'],          ex: 'The impact was huge.' },
  { id: 14, word: 'justify',    pos: 'v',   meanings: ['정당화하다', '해명하다'],              ex: 'How do you justify this?' },
  { id: 15, word: 'maintain',   pos: 'v',   meanings: ['유지하다', '주장하다'],                ex: 'She maintains a healthy diet.' },
  { id: 16, word: 'negotiate',  pos: 'v',   meanings: ['협상하다', '교섭하다'],                ex: 'We negotiated a better deal.' },
  { id: 17, word: 'observe',    pos: 'v',   meanings: ['관찰하다', '준수하다'],                ex: 'Observe the changes carefully.' },
  { id: 18, word: 'potential',  pos: 'a/n', meanings: ['잠재력 있는', '잠재력'],                ex: 'She has great potential.' },
  { id: 19, word: 'reveal',     pos: 'v',   meanings: ['드러내다', '폭로하다'],                ex: 'The study revealed new facts.' },
  { id: 20, word: 'sustain',    pos: 'v',   meanings: ['지속하다', '견디다', '지탱하다'],        ex: 'This pace is hard to sustain.' },
];

/* 다음 걸음(10걸음)용 더미 세트 — 오버레이 자동 이어가기 데모용.
   id는 101~120으로 분리해 1세트와 충돌하지 않게 함 */
const PROTO_WORDS_2 = [
  { id: 101, word: 'adapt',      pos: 'v',   meanings: ['적응하다', '조정하다'],               ex: 'Kids adapt to new schools fast.' },
  { id: 102, word: 'brief',      pos: 'a/v', meanings: ['간단한', 'briefing 하다'],            ex: 'Keep the email brief.' },
  { id: 103, word: 'capable',    pos: 'a',   meanings: ['할 수 있는', '유능한'],               ex: 'She is capable of more.' },
  { id: 104, word: 'decline',    pos: 'v/n', meanings: ['거절하다', '감소하다', '감소'],         ex: 'Sales declined last quarter.' },
  { id: 105, word: 'estimate',   pos: 'v/n', meanings: ['추정하다', '견적'],                   ex: 'We estimate a week of work.' },
  { id: 106, word: 'flexible',   pos: 'a',   meanings: ['유연한', '융통성 있는'],              ex: 'My schedule is flexible.' },
  { id: 107, word: 'gather',     pos: 'v',   meanings: ['모으다', '모이다', '짐작하다'],         ex: 'A crowd gathered outside.' },
  { id: 108, word: 'honor',      pos: 'n/v', meanings: ['명예', '존경하다'],                   ex: 'It is an honor to be here.' },
  { id: 109, word: 'indicate',   pos: 'v',   meanings: ['나타내다', '가리키다'],               ex: 'The sign indicates the exit.' },
  { id: 110, word: 'launch',     pos: 'v/n', meanings: ['시작하다', '출시하다', '출시'],         ex: 'They launched a new app.' },
  { id: 111, word: 'modify',     pos: 'v',   meanings: ['수정하다', '바꾸다'],                 ex: 'We modified the recipe.' },
  { id: 112, word: 'notify',     pos: 'v',   meanings: ['알리다', '통지하다'],                 ex: 'Please notify us early.' },
  { id: 113, word: 'occupy',     pos: 'v',   meanings: ['차지하다', '점령하다'],               ex: 'Books occupy the whole shelf.' },
  { id: 114, word: 'pursue',     pos: 'v',   meanings: ['추구하다', '뒤쫓다'],                 ex: 'She pursued a music career.' },
  { id: 115, word: 'reckon',     pos: 'v',   meanings: ['생각하다', '여기다', '계산하다'],       ex: 'I reckon it will rain.' },
  { id: 116, word: 'secure',     pos: 'a/v', meanings: ['안전한', '확보하다'],                 ex: 'We secured the funding.' },
  { id: 117, word: 'tolerate',   pos: 'v',   meanings: ['참다', '용인하다'],                   ex: 'I cannot tolerate the noise.' },
  { id: 118, word: 'utilize',    pos: 'v',   meanings: ['활용하다', '이용하다'],               ex: 'Utilize every resource.' },
  { id: 119, word: 'vague',      pos: 'a',   meanings: ['모호한', '막연한'],                   ex: 'His answer was vague.' },
  { id: 120, word: 'withdraw',   pos: 'v',   meanings: ['철회하다', '인출하다', '물러나다'],     ex: 'He withdrew his offer.' },
];

/* 걸음(stage)별 단어 세트 — 9걸음=세트1, 10걸음=세트2, 이후 번갈아(데모) */
const PROTO_STAGE_SETS = [PROTO_WORDS, PROTO_WORDS_2];
function wordsForStage(stage) {
  const n = PROTO_STAGE_SETS.length;
  const i = (((stage - 9) % n) + n) % n;
  return PROTO_STAGE_SETS[i];
}

const QUIZ_CYCLE = ['meaning', 'word', 'blank']; // 단어→뜻, 뜻→단어, 빈칸채우기

/* 정답이 아닌 단어 3개를 distractor로 뽑기 */
function pickDistractors(allWords, correctId, n = 3) {
  const pool = allWords.filter(w => w.id !== correctId);
  // 시드 기반 셔플 (안정성 위해)
  const sorted = [...pool].sort((a, b) => ((a.id * 7919 + correctId * 31) % 100) - ((b.id * 7919 + correctId * 31) % 100));
  return sorted.slice(0, n);
}

function shuffle4(correct, distractors, correctId) {
  // 4개를 안정적으로 섞어서 정답 위치도 정해짐
  const all = [correct, ...distractors];
  const seed = correctId;
  return all.map((item, i) => ({ item, sortKey: (i * 31 + seed * 17) % 13 })).sort((a, b) => a.sortKey - b.sortKey).map(x => x.item);
}

Object.assign(window, { PROTO_WORDS, PROTO_WORDS_2, PROTO_STAGE_SETS, wordsForStage, QUIZ_CYCLE, pickDistractors, shuffle4 });
