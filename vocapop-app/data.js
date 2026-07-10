/* 단어 데이터 + 공용 헬퍼 (App.js / 화면들이 공유) */
import RAW_VOCAB from './assets/vocab_merged.json';
import QUIZ_BANK from './assets/quiz_bank.json';   // 사전 생성·검수된 걸음 퀴즈 문제은행(보기 포함)

// 데이터엔 id가 없고 고유한 num이 있음 → num을 id로 사용 (없으면 순번 fallback)
export const VOCAB = RAW_VOCAB.map((w, i) => ({ ...w, id: w.id ?? w.num ?? (i + 1) }));
export const BY_ID = {};
VOCAB.forEach(w => { BY_ID[w.id] = w; });
export const BY_WORD = {};
VOCAB.forEach(w => { if (!(w.word in BY_WORD)) BY_WORD[w.word] = w; });

// 사전 생성된 걸음 퀴즈 보기(검수 완료) — 런타임 생성 대신 동결된 보기를 사용
const _BANK = {};
QUIZ_BANK.forEach(q => { _BANK[q.s * 1000 + q.i] = q; });
// 걸음 s(1-base)·문제 idx(0-base)의 보기 4개(표시 순서, 단어 객체). 없으면 null → 호출부가 pickOptions로 폴백
export const quizOptionsFor = (stage, idx) => {
  const q = _BANK[stage * 1000 + idx];
  if (!q || !Array.isArray(q.o)) return null;
  const opts = q.o.map(id => BY_ID[id]).filter(Boolean);
  return opts.length === 4 ? opts : null;
};

// 단어 id → VOCAB 전역 인덱스 → 그 단어가 정답인 (걸음, 번호)
const _IDX = {}; VOCAB.forEach((w, i) => { _IDX[w.id] = i; });
export const stageIdxOf = (id) => { const i = _IDX[id]; return i == null ? null : { stage: Math.floor(i / 20) + 1, idx: i % 20 }; };
// 단어의 동결 퀴즈 문제(유형+보기 4개) — 그 단어가 정답인 문항을 그대로 재사용(검수된 보기)
export const quizMetaFor = (id) => {
  const p = stageIdxOf(id); if (!p) return null;
  const q = _BANK[p.stage * 1000 + p.idx]; if (!q) return null;
  const options = q.o.map(x => BY_ID[x]).filter(Boolean);
  return options.length === 4 ? { type: q.t, options } : null;
};

export const TOTAL = Math.ceil(VOCAB.length / 20);     // 걸음(섹션) 수
// C2 고난도 도전구간이 시작되는 섹션 (재정렬로 C2가 맨 뒤에 몰려 있음) — 데이터에서 계산
export const C2_START_STAGE = (() => { const i = VOCAB.findIndex(w => w.cefr === 'C2'); return i < 0 ? TOTAL + 1 : Math.floor(i / 20) + 1; })();
export const wordsForStage = (s) => VOCAB.slice((s - 1) * 20, s * 20);
export const meaningOf = (w) => (w && w.korean ? String(w.korean).split(';')[0] : '');
// 뜻 목록(번호 매김용): meanings 배열({pos,meaning}) → 문자열 배열, 없으면 korean 분할
export const meaningList = (w) => {
  if (!w) return [];
  if (Array.isArray(w.meanings) && w.meanings.length) return w.meanings.map(m => (typeof m === 'string' ? m : m.meaning)).filter(Boolean);
  return w.korean ? String(w.korean).split(';').map(s => s.trim()).filter(Boolean) : [];
};
export const exampleOf = (w) => (w && (w.example || w.exampleBlank)) || '';

// 오답 후보에서 제외할 단어 판정용 ───────────────────────────────
// (1) 뜻이 겹치는 동의어 → 둘 다 정답이 되는 모호함 방지 (예: inventory/stock, magnificent/superior)
const _MSTOP = new Set(['있는', '없는', '하는', '되는', '대한', '위한', '또는', '그', '수', '것', '등', '때', '및', '적', '형', '명', '동', '부']);
const _mtokens = (w) => {
  const out = new Set();
  String(meaningList(w).join(' ')).split(/[^가-힣]+/).forEach(t => { if (t.length >= 2 && !_MSTOP.has(t)) out.add(t); });
  return out;
};
// (2) 뜻은 다르나 빈칸 문장에 둘 다 들어맞는 문맥 충돌쌍 (수동 검토로 확정)
const _AVOID = {};
[['government', 'insurance'], ['hatred', 'lack'], ['negative', 'insignificant'], ['fruitful', 'valuable'],
 ['release', 'draft'], ['possession', 'warehouse'], ['ownership', 'lease'], ['masterpiece', 'celebrity'],
 ['principally', 'widely'], ['hostile', 'vicious'], ['maintenance', 'perennial'],
 ['unsurpassed', 'unrivaled']]  // 비길/비할 데 없는 — 표기만 다른 동의어(토큰 필터 미검출분)
  .forEach(([a, b]) => { (_AVOID[a] = _AVOID[a] || []).push(b); (_AVOID[b] = _AVOID[b] || []).push(a); });

// 퀴즈 보기 4개(정답 + 오답 3), id 기반 결정적(안정) 순서
export const pickOptions = (pool, answer) => {
  const others = pool.filter(w => w.id !== answer.id);
  const ansTok = _mtokens(answer);
  const avoid = _AVOID[String(answer.word || '').toLowerCase()] || [];
  const collide = (w) => {
    for (const t of _mtokens(w)) if (ansTok.has(t)) return true;     // 동의어
    return avoid.indexOf(String(w.word || '').toLowerCase()) !== -1;  // 문맥 충돌쌍
  };
  let cand = others.filter(w => !collide(w));
  if (cand.length < 3) cand = others;                                 // 후보 부족 시 원복(안전)
  const h = (w) => (w.id * 7919 + answer.id * 31) % 1000;
  const dis = [...cand].sort((a, b) => h(a) - h(b)).slice(0, 3);
  return [answer, ...dis]
    .map((w, i) => ({ w, k: (w.id * 17 + answer.id * 13 + i * 101) % 100 }))
    .sort((a, b) => a.k - b.k)
    .map(o => o.w);
};

/* ───────── 세션 기반 박스 SRS (학습 메커니즘 개편) ─────────
   간격(ivl) 1→2→4→8→16→32→64→128… (세션 단위, 상한·졸업 없음).
   due = 이 단어가 다시 나올 세션 번호. boxes = { id: {ivl, due} }. */
export const WELL_KNOWN_IVL = 64;   // ivl>=64 = '잘 아는'(졸업) · 미만 = '외우는 중'='헷갈리는'. (첫 알아요=64 직행이라 이미 아는 단어는 바로 졸업)

// 플래시카드 답(알아요/몰라요) → 새 박스. prev 없으면 '새 단어 첫 답'(알아요=64 직행).
export function boxAfterCard(prev, choice, clock) {
  const ivl = choice === 'know' ? (prev ? prev.ivl * 2 : 64) : 1;
  return { ivl, due: clock + ivl };
}
// 퀴즈 한 문항 결과 → 박스. slot=문항종류, outcome=결과.
//  outcome: 'correct'(깨끗한 정답) | 'hintCorrect'(힌트 보고 맞춤) | 'wrong' | 'dontknow'(몰라요)
//  · 객관식/타일/스펠 정답 = 카드처럼 직행(첫 알아요 64, 이후 ×2)
//  · 듣기 정답 = 박스 영향 없음(틀리면 박스1)
//  · 힌트 보고 맞춤 = 봐버린 거니까 박스1 · 오답·몰라요 = 박스1
export function boxAfterQuiz(prev, slot, outcome, clock) {
  if (outcome === 'correct') {
    if (slot === 'listen') return undefined;            // 듣기 정답 = 무영향
    return boxAfterCard(prev, 'know', clock);            // 직행
  }
  return { ivl: 1, due: clock + 1 };                     // hintCorrect / wrong / dontknow
}

// 퀴즈 문항 종류 회전 — 6문항마다 객관식3·타일1·듣기1·스펠1 (mc=동결 4지선다)
const QUIZ_SLOTS = ['mc', 'tile', 'mc', 'listen', 'mc', 'spell'];
export function quizSlotFor(idx, word) {
  let s = QUIZ_SLOTS[idx % QUIZ_SLOTS.length];
  // 타일·스펠은 단일 알파벳 단어 12자 이하만(하이픈·공백·긴 단어는 객관식으로 폴백)
  if ((s === 'tile' || s === 'spell') && !(word && /^[a-zA-Z]{1,12}$/.test(word.word))) s = 'mc';
  return s;
}
// 학습 시작한(=박스 있는) 단어 id 목록
export const startedIds = (boxes) => Object.keys(boxes || {}).map(Number);
// 잘 아는(ivl>=16) / 외우는 중 집계
export function knowledgeCounts(boxes) {
  let well = 0, learning = 0;
  Object.values(boxes || {}).forEach(b => { if (b && b.ivl >= WELL_KNOWN_IVL) well++; else learning++; });
  return { well, learning };
}
// 헷갈리는 정도 0~1 (1=가장 헷갈림=박스1 → 0 근접=거의 졸업). ivl>=WELL_KNOWN(64)이면 0 = 형광펜 사라짐. 단어장 형광펜 진하기용.
export function confusingStrength(ivl) {
  if (!ivl || ivl >= WELL_KNOWN_IVL) return 0;
  return 1 - Math.log2(ivl) / Math.log2(WELL_KNOWN_IVL);   // ivl 1→1.0, 2→0.83, 4→0.67, 8→0.5, 16→0.33, 32→0.17
}
// 헷갈리는 단어 = 학습 시작했고 아직 안 외운(ivl<64) id, 박스 낮은(헷갈리는) 순
export function confusingIds(boxes) {
  return Object.keys(boxes || {}).map(Number)
    .filter(id => boxes[id] && boxes[id].ivl < WELL_KNOWN_IVL)
    .sort((a, b) => boxes[a].ivl - boxes[b].ivl);
}
// 세션 클록 clock에서 복습 대상 id (낮은 박스=급한 것 우선, 새 단어 제외, limit개까지 / 초과분 이월)
export function dueReviewIds(boxes, clock, excludeIds, limit) {
  const ex = new Set((excludeIds || []).map(Number));
  return Object.keys(boxes || {}).map(Number)
    .filter(id => !ex.has(id) && boxes[id] && boxes[id].due <= clock)
    .sort((a, b) => boxes[a].ivl - boxes[b].ivl)
    .slice(0, limit);
}
// 배열 랜덤 셔플 (Fisher–Yates)
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// 잠금화면 단어 풀 — 출제 범위(scope) 선택. {w(영단어), k(뜻), p(품사), f:1=오답 보기 전용 필러(출제 안 됨)}.
// scope: confusing(헷갈리는, 기본)|started(학습한 전체)|fav(즐겨찾기)|new(안 배운 단어)|all(전체)
// 범위가 비면 학습한 단어 → 그래도 없으면 전체로 폴백. 8개 미만이면 보기(오답) 후보용 필러만 보충.
export function lockPool(boxes, favorites, scope = 'confusing', limit = 50) {
  const startedSet = new Set(startedIds(boxes));
  let pool;
  if (scope === 'started') pool = VOCAB.filter(w => startedSet.has(w.id));
  else if (scope === 'fav') { const fs = new Set(favorites || []); pool = VOCAB.filter(w => fs.has(w.id)); }
  else if (scope === 'new') pool = VOCAB.filter(w => !startedSet.has(w.id));
  else if (scope === 'all') pool = VOCAB;
  else { const cs = new Set(confusingIds(boxes)); pool = VOCAB.filter(w => cs.has(w.id)); }
  if (pool.length === 0) pool = VOCAB.filter(w => startedSet.has(w.id));   // 폴백 1: 학습한 단어
  if (pool.length === 0) pool = VOCAB;                                     // 폴백 2: 전체
  const main = shuffle(pool).slice(0, limit);
  const ids = new Set(main.map(w => w.id));
  const fill = main.length < 8 ? shuffle(VOCAB.filter(w => !ids.has(w.id))).slice(0, 8 - main.length) : [];
  return [
    ...main.map(w => ({ w: w.word, k: w.korean || '', p: w.pos || '', pr: w.pronunciation || '' })),
    ...fill.map(w => ({ w: w.word, k: w.korean || '', p: w.pos || '', pr: w.pronunciation || '', f: 1 })),
  ];
}
// 세션 카드 = 새 단어 20개 + due 복습 ≤20개, 랜덤 셔플. 각 카드 {id, review:bool}.
export function buildSession(stage, boxes, sessionNo) {
  const clock = sessionNo + 1;
  const newIds = wordsForStage(stage).map(w => w.id);
  const reviewIds = dueReviewIds(boxes, clock, newIds, 20);
  return shuffle([
    ...newIds.map(id => ({ id, review: false })),
    ...reviewIds.map(id => ({ id, review: true })),
  ]);
}
