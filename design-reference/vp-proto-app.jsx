/* VocaPoP Prototype · 라우팅 + 상태 추적 + 모든 화면 */

const { useState, useEffect, useReducer, useMemo, useRef } = React;

/* ─────────────────────────────────────────────
   상태 머신 (reducer)
   ───────────────────────────────────────────── */
const initialState = {
  screen: 'home',          // home | wordbook | preview | cardR1 | cardR1End | cardR2 | cardDone | quizIntro | quiz | quizReview | resultScore | resultStage
  /* ── 두 트랙 진행 모델 ──
     체크 트랙: 단어체크(카드/오버레이)를 끝낸 걸음. 연속으로 자유롭게 전진, 퀴즈가 막지 않음.
     정복 트랙: 퀴즈까지 통과한 걸음. 체크보다 뒤처질 수 있음(=정복 대기). */
  checkedCount: 8,         // 체크(훑기) 끝낸 걸음 수 — 1..checkedCount 가 체크됨. 다음 체크 = checkedCount+1
  conqueredSet: [1, 2, 3, 4, 5], // 퀴즈까지 통과해 '정복'한 걸음 번호들 (6·7·8은 체크만 됨 = 정복 대기)
  activeStage: 9,          // 풀스크린 흐름(미리보기·카드·퀴즈·결과)이 다루는 걸음
  cardR1Idx: 0,
  cardR1Results: {},       // {wordId: 'know'|'dontknow'}
  cardR2Queue: [],         // 현재 남은 단어 큐 (동적)
  cardR2InitialIds: [],    // 2R 시작 시 초기 단어 ID 세트
  cardR2DoneIds: [],       // 이미 기억한 단어 IDs
  cardR2Results: {},       // {wordId: 'know'|'still'} — 마지막 응답
  quizIdx: 0,
  quizResults: {},         // {wordId: 'correct'|'wrong'}
  reviewQueue: [],         // 오답 wordId 배열
  reviewIdx: 0,
  checkedIds: [2, 9, 18],  // 단어장 즐겨찾기 (★)
  unknownIds: [7, 12, 16], // 단어장 '몰라요' 표시 — 카드 몰라요 + 단어장 스와이프 (데모 시드)
  knownIds: [1, 3, 5, 11], // 단어장 '알아요' 표시 — 카드/오버레이 알아요 + 단어장 스와이프 (데모 시드)
  hardIds: [2, 14],        // 오답노트 누적 — 퀴즈 오답 시드 + 수동
  dismissedNoteIds: [],    // 오답노트에서 "외웠어요"로 내보낸 단어
  wrongCounts: { 2: 3, 14: 4 }, // {wordId: 퀴즈에서 틀린 횟수}
  streak: 7,               // 연속 학습일
  points: 1240,            // 누적 포인트(XP)
  dailyGoal: 20,           // 하루 목표 단어 수
  todayLearned: 12,        // 오늘 학습한 단어 수
  pausedScreen: null,      // 중간에 그만둔 화면 (이어하기용)
  dark: false,             // 다크 모드
  detailWordId: null,      // 열려있는 단어 상세 (오버레이)
  noteReviewQueue: [],     // 오답 복습 세션 단어 큐(스납샷)
  noteReviewIdx: 0,
  noteReviewResults: {},   // {wordId: 'correct'|'wrong'}
  noteReviewRemoved: [],   // 이번 세션에서 수동으로 무언 단어
  toast: null,             // {key, msg, undo} 일시 알림
  overlayIdx: 0,           // 플로팅 미니카드 현재 인덱스 (1라운드)
  overlayResults: {},      // {wordId: 'know'|'dontknow'} 플로팅 1라운드 결과
  overlayRound: 1,         // 1 | 2(재시험) | 'transition'(다음 걸음으로 넘어가는 중)
  overlayR2Queue: [],      // 재시험 대기 단어 id 큐 (동적)
  overlayR2Initial: 0,     // 재시험 시작 시 단어 수
  overlayStage: 9,         // 오버레이에서 지금 체크 중인 걸음 번호
  overlayJustStage: null,  // 방금 막 끝낸 걸음 번호 (전환 인터스티셜용)
  overlayLastKnow: 0,      // 방금 끝낸 걸음의 '바로 알아요' 수
  overlayLastDk: 0,        // 방금 끝낸 걸음의 '몰라요' 수
};

/* 토스트 생성 — key를 올려 타이머 리셋 */
function mkToast(state, msg, undo) {
  return { key: ((state.toast && state.toast.key) || 0) + 1, msg, undo: undo || null };
}

/* 현재 오답노트에 남은 단어 id 집합 — 퀴즈 오답만 (+ 수동 추가, − 수동 제거) */
function computeNoteIds(state) {
  const set = new Set(state.hardIds);
  Object.entries(state.quizResults).forEach(([id, r]) => { if (r === 'wrong') set.add(Number(id)); });
  state.dismissedNoteIds.forEach(id => set.delete(id));
  return set;
}

/* unknownIds(단어장 '몰라요')에 추가/제거하는 헬퍼 */
function setUnknown(list, wordId, on) {
  const has = list.includes(wordId);
  if (on && !has) return [...list, wordId];
  if (!on && has) return list.filter(id => id !== wordId);
  return list;
}

const STAGE_TOTAL = 144; // 정상까지 총 걸음

/* 정복 대기 걸음 수 = 체크는 됐지만 퀴즈 안 푼 걸음 */
function pendingQuizCount(state) {
  const conq = new Set(state.conqueredSet);
  let n = 0;
  for (let s = 1; s <= state.checkedCount; s++) if (!conq.has(s)) n++;
  return n;
}
/* 가장 오래된(작은 번호) 정복 대기 걸음 — 없으면 null */
function firstPendingStage(state) {
  const conq = new Set(state.conqueredSet);
  for (let s = 1; s <= state.checkedCount; s++) if (!conq.has(s)) return s;
  return null;
}

/* 한 걸음의 단어체크가 끝났을 때 — '다음 걸음으로 넘어가는 중'(transition) 상태로.
   체크 트랙(checkedCount)을 전진시키고, 퀴즈는 길을 막지 않는다(정복 대기로 쌓일 뿐). */
function finishOverlayStage(state, results) {
  const know = Object.values(results).filter(r => r === 'know').length;
  const dk = Object.values(results).filter(r => r === 'dontknow').length;
  const checkedCount = Math.min(STAGE_TOTAL, Math.max(state.checkedCount, state.overlayStage));
  return {
    ...state,
    checkedCount,
    overlayRound: 'transition',
    overlayJustStage: state.overlayStage,
    overlayLastKnow: know,
    overlayLastDk: dk,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'OPEN_OVERLAY':
      // 다른 앱 위 플로팅 미니카드 — 체크 트랙의 다음 걸음부터 세션 시작
      return { ...state, screen: 'overlay', overlayStage: state.checkedCount + 1, overlayIdx: 0, overlayResults: {}, overlayRound: 1, overlayR2Queue: [], overlayR2Initial: 0, overlayJustStage: null, overlayLastKnow: 0, overlayLastDk: 0 };
    case 'CLOSE_OVERLAY':
      return { ...state, screen: 'home' };
    case 'OVERLAY_ANSWER': {
      const dontknow = action.choice === 'dontknow';
      const words = wordsForStage(state.overlayStage);

      /* ── 1라운드: 20장 전체 훑기 ── */
      if (state.overlayRound === 1) {
        const word = words[state.overlayIdx];
        if (!word) return state;
        const overlayResults = { ...state.overlayResults, [word.id]: action.choice };
        // 몰라요 → 몰라요 표시 / 알아요 → 알아요 표시(서로 배타) + 오늘 학습 +1
        const unknownIds = setUnknown(state.unknownIds, word.id, dontknow);
        const knownIds = setUnknown(state.knownIds, word.id, !dontknow);
        const todayLearned = dontknow ? state.todayLearned : state.todayLearned + 1;
        const nextIdx = state.overlayIdx + 1;
        const base = { ...state, overlayResults, unknownIds, knownIds, todayLearned, overlayIdx: nextIdx };
        if (nextIdx >= words.length) {
          // 1라운드 끝 — 몰랐던 단어 모아 재시험
          const queue = words.filter(w => overlayResults[w.id] === 'dontknow').map(w => w.id);
          if (queue.length === 0) return finishOverlayStage(base, overlayResults);
          return { ...base, overlayRound: 2, overlayR2Queue: queue, overlayR2Initial: queue.length };
        }
        return base;
      }

      /* ── 2라운드(재시험): 몰랐던 단어만, 다 맞힐 때까지 순환 ── */
      if (state.overlayRound === 2) {
        const queue = state.overlayR2Queue;
        const wordId = queue[0];
        if (action.choice === 'know') {
          const newQueue = queue.slice(1);
          const todayLearned = state.todayLearned + 1;
          const unknownIds = setUnknown(state.unknownIds, wordId, false);
          const knownIds = setUnknown(state.knownIds, wordId, true);
          if (newQueue.length === 0) {
            return finishOverlayStage({ ...state, overlayR2Queue: newQueue, todayLearned, unknownIds, knownIds }, state.overlayResults);
          }
          return { ...state, overlayR2Queue: newQueue, todayLearned, unknownIds, knownIds };
        }
        // 아직 몰라요 → 큐 뒤(1~2장 뒤)로 보내 다시 등장
        const rest = queue.slice(1);
        const insertAt = Math.min(2, rest.length);
        const newQueue = [...rest.slice(0, insertAt), wordId, ...rest.slice(insertAt)];
        const unknownIds = setUnknown(state.unknownIds, wordId, true);
        const knownIds = setUnknown(state.knownIds, wordId, false);
        return { ...state, overlayR2Queue: newQueue, unknownIds, knownIds };
      }

      return state;
    }
    case 'OVERLAY_NEXT_STAGE':
      // 전환 인터스티셜 → 다음 걸음 체크 바로 시작 (오버레이 안에서 무중단)
      return { ...state, overlayStage: state.overlayStage + 1, overlayIdx: 0, overlayResults: {}, overlayRound: 1, overlayR2Queue: [], overlayR2Initial: 0, overlayJustStage: null };
    case 'OVERLAY_RESTART':
      return { ...state, overlayIdx: 0, overlayResults: {}, overlayRound: 1, overlayR2Queue: [], overlayR2Initial: 0 };
    case 'GOTO':
      return { ...state, screen: action.screen };
    case 'PAUSE':
      // 학습 중 나가기 — 현재 화면을 기억해두고 홈으로 (진행상황은 그대로 유지)
      return { ...state, pausedScreen: state.screen, screen: 'home' };
    case 'RESUME':
      return { ...state, screen: state.pausedScreen || 'home', pausedScreen: null };
    case 'DISMISS_RESUME':
      return { ...state, pausedScreen: null };
    case 'SET_DARK':
      return { ...state, dark: action.value };
    case 'OPEN_DETAIL':
      return { ...state, detailWordId: action.wordId };
    case 'CLOSE_DETAIL':
      return { ...state, detailWordId: null };
    case 'START_NOTE_REVIEW': {
      // 현재 오답노트에 남은 단어 스납샷 (자주 틀린 순)
      const set = computeNoteIds(state);
      const queue = PROTO_WORDS.filter(w => set.has(w.id))
        .sort((a, b) => (state.wrongCounts[b.id] || 1) - (state.wrongCounts[a.id] || 1))
        .map(w => w.id);
      if (queue.length === 0) return state;
      return { ...state, screen: 'noteReview', noteReviewQueue: queue, noteReviewIdx: 0, noteReviewResults: {}, noteReviewRemoved: [] };
    }
    case 'NOTE_REVIEW_ANSWER': {
      const results = { ...state.noteReviewResults, [action.wordId]: action.correct ? 'correct' : 'wrong' };
      const cur = state.wrongCounts[action.wordId] || 1;
      // 맞히면 횟수 −1(최소 0), 틀리면 +1 — 자동 제거는 없음(수동만)
      const nextCount = action.correct ? Math.max(0, cur - 1) : cur + 1;
      return {
        ...state,
        noteReviewResults: results,
        wrongCounts: { ...state.wrongCounts, [action.wordId]: nextCount },
      };
    }
    case 'REVIEW_REMOVE': {
      // 복습 중 수동으로 노트에서 빼기 + 다음으로
      const wordId = action.wordId;
      const dismissedNoteIds = state.dismissedNoteIds.includes(wordId)
        ? state.dismissedNoteIds : [...state.dismissedNoteIds, wordId];
      const noteReviewRemoved = state.noteReviewRemoved.includes(wordId)
        ? state.noteReviewRemoved : [...state.noteReviewRemoved, wordId];
      const nextIdx = state.noteReviewIdx + 1;
      const base = { ...state, dismissedNoteIds, noteReviewRemoved, toast: mkToast(state, '노트에서 뺐어요', { type: 'UNDO_DISMISS_NOTE', wordId }) };
      if (nextIdx >= state.noteReviewQueue.length) {
        return { ...base, screen: 'noteReviewDone' };
      }
      return { ...base, noteReviewIdx: nextIdx };
    }
    case 'NOTE_REVIEW_NEXT': {
      const nextIdx = state.noteReviewIdx + 1;
      if (nextIdx >= state.noteReviewQueue.length) {
        return { ...state, screen: 'noteReviewDone' };
      }
      return { ...state, noteReviewIdx: nextIdx };
    }
    case 'START_STAGE':
      // 체크 트랙의 다음 걸음(checkedCount+1)을 풀스크린 카드로 체크 시작
      return {
        ...initialState,
        checkedCount: state.checkedCount,
        conqueredSet: state.conqueredSet,
        activeStage: action.stage || (state.checkedCount + 1),
        // 장기 보관 컬렉션은 스테이지를 새로 시작해도 유지
        checkedIds: state.checkedIds,
        unknownIds: state.unknownIds,
        knownIds: state.knownIds,
        hardIds: state.hardIds,
        dismissedNoteIds: state.dismissedNoteIds,
        wrongCounts: state.wrongCounts,
        streak: state.streak,
        points: state.points,
        dailyGoal: state.dailyGoal,
        todayLearned: state.todayLearned,
        dark: state.dark,
        screen: 'preview',
      };
    case 'CARD_R1_ANSWER': {
      const next = { ...state.cardR1Results, [action.wordId]: action.choice };
      // 몰라요 → 몰라요 표시 / 알아요 → 알아요 표시 (서로 배타)
      const isDk = action.choice === 'dontknow';
      const unknownIds = setUnknown(state.unknownIds, action.wordId, isDk);
      const knownIds = setUnknown(state.knownIds, action.wordId, !isDk);
      const words = wordsForStage(state.activeStage);
      const nextIdx = state.cardR1Idx + 1;
      if (nextIdx >= words.length) {
        const queue = words.filter(w => next[w.id] === 'dontknow').map(w => w.id);
        if (queue.length === 0) {
          const checkedCount = Math.min(STAGE_TOTAL, Math.max(state.checkedCount, state.activeStage));
          return { ...state, cardR1Results: next, unknownIds, knownIds, checkedCount, screen: 'cardDone' };
        }
        return { ...state, cardR1Results: next, unknownIds, knownIds, cardR2Queue: queue, screen: 'cardR1End' };
      }
      return { ...state, cardR1Results: next, unknownIds, knownIds, cardR1Idx: nextIdx };
    }
    case 'START_CARD_R2':
      return {
        ...state,
        screen: 'cardR2',
        cardR2InitialIds: state.cardR2Queue,
        cardR2DoneIds: [],
      };
    case 'CARD_R2_ANSWER': {
      const queue = state.cardR2Queue;
      const wordId = queue[0];
      const results = { ...state.cardR2Results, [wordId]: action.choice };
      if (action.choice === 'know') {
        const newQueue = queue.slice(1);
        const newDone = [...state.cardR2DoneIds, wordId];
        const unknownIds = setUnknown(state.unknownIds, wordId, false);
        const knownIds = setUnknown(state.knownIds, wordId, true);
        if (newQueue.length === 0) {
          const checkedCount = Math.min(STAGE_TOTAL, Math.max(state.checkedCount, state.activeStage));
          return { ...state, cardR2Queue: newQueue, cardR2DoneIds: newDone, cardR2Results: results, unknownIds, knownIds, checkedCount, screen: 'cardDone' };
        }
        return { ...state, cardR2Queue: newQueue, cardR2DoneIds: newDone, cardR2Results: results, unknownIds, knownIds };
      }
      // still — 단어를 큐 뒤쳐으로, 1~2장 이후에 다시 등장
      const rest = queue.slice(1);
      const insertAt = Math.min(2, rest.length);
      const newQueue = [...rest.slice(0, insertAt), wordId, ...rest.slice(insertAt)];
      const unknownIds = setUnknown(state.unknownIds, wordId, true);
      const knownIds = setUnknown(state.knownIds, wordId, false);
      return { ...state, cardR2Queue: newQueue, cardR2Results: results, unknownIds, knownIds };
    }
    case 'START_QUIZ': {
      // 특정 걸음을 정복(퀴즈)하러 — 지정 없으면 가장 오래된 정복 대기 걸음
      const stage = action.stage || firstPendingStage(state) || state.activeStage;
      return { ...state, activeStage: stage, screen: 'quiz', quizIdx: 0, quizResults: {} };
    }
    case 'QUIZ_ANSWER': {
      const next = { ...state.quizResults, [action.wordId]: action.correct ? 'correct' : 'wrong' };
      const wrongCounts = action.correct
        ? state.wrongCounts
        : { ...state.wrongCounts, [action.wordId]: (state.wrongCounts[action.wordId] || 0) + 1 };
      return { ...state, quizResults: next, wrongCounts, todayLearned: state.todayLearned + 1 };
    }
    case 'SET_GOAL':
      return { ...state, dailyGoal: Math.max(5, Math.min(60, action.value)) };
    case 'QUIZ_NEXT': {
      const qwords = wordsForStage(state.activeStage);
      const nextIdx = state.quizIdx + 1;
      if (nextIdx >= qwords.length) {
        const wrongIds = qwords.filter(w => state.quizResults[w.id] === 'wrong').map(w => w.id);
        if (wrongIds.length === 0) {
          return { ...state, screen: 'resultScore' };
        }
        return { ...state, reviewQueue: wrongIds, reviewIdx: 0, screen: 'quizReview' };
      }
      return { ...state, quizIdx: nextIdx };
    }
    case 'REVIEW_NEXT': {
      const nextIdx = state.reviewIdx + 1;
      if (nextIdx >= state.reviewQueue.length) {
        return { ...state, screen: 'resultScore' };
      }
      return { ...state, reviewIdx: nextIdx };
    }
    case 'GOTO_RESULT_STAGE':
      return { ...state, screen: 'resultStage' };
    case 'TOGGLE_CHECK': {
      const has = state.checkedIds.includes(action.wordId);
      const checkedIds = has ? state.checkedIds.filter(id => id !== action.wordId) : [...state.checkedIds, action.wordId];
      return {
        ...state, checkedIds,
        toast: mkToast(state, has ? '즐겨찾기에서 뺐어요' : '즐겨찾기에 추가했어요', { type: 'TOGGLE_CHECK', wordId: action.wordId }),
      };
    }
    case 'TOGGLE_HARD': {
      const has = state.hardIds.includes(action.wordId);
      return { ...state, hardIds: has ? state.hardIds.filter(id => id !== action.wordId) : [...state.hardIds, action.wordId] };
    }
    case 'MARK_UNKNOWN': {
      // 단어장에서 좌우 스와이프로 '몰라요/알아요' 표시 (서로 배타)
      const unknownIds = setUnknown(state.unknownIds, action.wordId, action.value);
      const knownIds = setUnknown(state.knownIds, action.wordId, !action.value);
      if (unknownIds === state.unknownIds && knownIds === state.knownIds) return state;
      return {
        ...state, unknownIds, knownIds,
        toast: mkToast(state, action.value ? '몰라요로 표시했어요' : '알아요로 표시했어요',
          { type: 'MARK_UNKNOWN', wordId: action.wordId, value: !action.value }),
      };
    }
    case 'DISMISS_NOTE': {
      // 오답노트에서 제거(외웠어요) — dismissed에만 추가(undo 쉬움)
      return {
        ...state,
        dismissedNoteIds: state.dismissedNoteIds.includes(action.wordId)
          ? state.dismissedNoteIds : [...state.dismissedNoteIds, action.wordId],
        toast: mkToast(state, '오답노트에서 뺐어요', { type: 'UNDO_DISMISS_NOTE', wordId: action.wordId }),
      };
    }
    case 'UNDO_DISMISS_NOTE':
      return {
        ...state,
        dismissedNoteIds: state.dismissedNoteIds.filter(id => id !== action.wordId),
        toast: null,
      };
    case 'HIDE_TOAST':
      return { ...state, toast: null };
    case 'RESET_PROGRESS':
      return {
        ...initialState,
        checkedCount: 0,
        conqueredSet: [],
        activeStage: 1,
        checkedIds: [],
        unknownIds: [],
        knownIds: [],
        hardIds: [],
        dismissedNoteIds: [],
        wrongCounts: {},
        streak: 0,
        points: 0,
        dailyGoal: state.dailyGoal,
        todayLearned: 0,
        dark: state.dark,
        screen: 'home',
      };
    case 'CONQUER_STAGE': {
      // 퀴즈까지 통과 → 정복 트랙 전진(activeStage 걸음을 conqueredSet에 추가). 체크 트랙은 그대로.
      const cqwords = wordsForStage(state.activeStage);
      const right = Object.values(state.quizResults).filter(r => r === 'correct').length;
      const allCorrect = right === cqwords.length;
      const earnedXp = right * 10 + (allCorrect ? 50 : 0);
      const conqueredSet = state.conqueredSet.includes(state.activeStage)
        ? state.conqueredSet
        : [...state.conqueredSet, state.activeStage];
      return { ...initialState,
        checkedCount: state.checkedCount,
        conqueredSet,
        activeStage: state.activeStage,
        screen: 'home',
        checkedIds: state.checkedIds,
        unknownIds: state.unknownIds,
        knownIds: state.knownIds,
        hardIds: state.hardIds,
        dismissedNoteIds: state.dismissedNoteIds,
        wrongCounts: state.wrongCounts,
        streak: state.streak + 1,
        points: state.points + earnedXp,
        dailyGoal: state.dailyGoal,
        todayLearned: state.todayLearned,
        dark: state.dark,
      };
    }
    default:
      return state;
  }
}

/* ─────────────────────────────────────────────
   App — 라우터 + localStorage 영속화
   ───────────────────────────────────────────── */
const PROTO_STORAGE_KEY = 'vocapop:proto:state:v7';
const FLOW_SCREENS = new Set(['preview', 'cardR1', 'cardR1End', 'cardR2', 'cardDone', 'quiz']);

function loadInitialState() {
  try {
    const raw = localStorage.getItem(PROTO_STORAGE_KEY);
    if (!raw) return initialState;
    const saved = JSON.parse(raw);
    // 항상 home으로 시작 — 단, 학습 흐름 중이었다면 이어하기 배너를 띄운다
    const paused = saved.pausedScreen || (FLOW_SCREENS.has(saved.screen) ? saved.screen : null);
    return { ...initialState, ...saved, pausedScreen: paused, detailWordId: null, toast: null, screen: 'home' };
  } catch (e) {
    return initialState;
  }
}

function ProtoApp() {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);

  // 테마 적용 — 렌더 전 VP 토큰을 바꿔치워 하위 화면이 새 값을 읽게 함
  applyTheme(state.dark);
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) root.style.background = VP.bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', state.dark ? '#14151B' : '#FF5BB8');
  }, [state.dark]);

  // 토스트 자동 숨김
  useEffect(() => {
    if (!state.toast) return;
    const id = setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 3400);
    return () => clearTimeout(id);
  }, [state.toast && state.toast.key]);

  // 상태 변경 시 자동 저장
  useEffect(() => {
    try { localStorage.setItem(PROTO_STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }, [state]);

  const screen = state.screen;
  let content = null;

  if (screen === 'home') content = <ProtoHome state={state} dispatch={dispatch} />;
  else if (screen === 'wordbook') content = <ProtoWordbook state={state} dispatch={dispatch} />;
  else if (screen === 'notes') content = <ProtoNotes state={state} dispatch={dispatch} />;
  else if (screen === 'noteReview') content = <ProtoNoteReview state={state} dispatch={dispatch} />;
  else if (screen === 'noteReviewDone') content = <ProtoNoteReviewDone state={state} dispatch={dispatch} />;
  else if (screen === 'stats') content = <ProtoStats state={state} dispatch={dispatch} />;
  else if (screen === 'settings') content = <ProtoSettings state={state} dispatch={dispatch} />;
  else if (screen === 'overlay') content = <ProtoOverlay state={state} dispatch={dispatch} />;
  else if (screen === 'preview') content = <ProtoPreview state={state} dispatch={dispatch} />;
  else if (screen === 'cardR1') content = <ProtoCardR1 state={state} dispatch={dispatch} />;
  else if (screen === 'cardR1End') content = <ProtoCardR1End state={state} dispatch={dispatch} />;
  else if (screen === 'cardR2') content = <ProtoCardR2 state={state} dispatch={dispatch} />;
  else if (screen === 'cardDone') content = <ProtoCardDone state={state} dispatch={dispatch} />;
  else if (screen === 'quiz') content = <ProtoQuiz state={state} dispatch={dispatch} />;
  else if (screen === 'quizReview') content = <ProtoQuizReview state={state} dispatch={dispatch} />;
  else if (screen === 'resultScore') content = <ProtoResultScore state={state} dispatch={dispatch} />;
  else if (screen === 'resultStage') content = <ProtoResultStage state={state} dispatch={dispatch} />;

  return (
    <div key={screen} style={{ width: '100%', height: '100%', animation: 'protoFade .2s ease' }}>
      {content}
      {state.detailWordId != null && <WordDetail state={state} dispatch={dispatch} />}
      <ProtoToast toast={state.toast} dispatch={dispatch} />
      <ProtoOnboarding />
    </div>
  );
}

function ProtoToast({ toast, dispatch }) {
  if (!toast) return null;
  return (
    <div key={toast.key} style={{
      position: 'absolute', left: 0, right: 0, bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
      display: 'flex', justifyContent: 'center', zIndex: 60, pointerEvents: 'none', padding: '0 16px',
    }}>
      <div style={{
        pointerEvents: 'auto',
        display: 'flex', alignItems: 'center', gap: 4,
        maxWidth: '100%',
        background: VP.text, color: VP.onText,
        borderRadius: 14, padding: '10px 8px 10px 16px',
        boxShadow: '0 10px 30px rgba(0,0,0,.28)',
        animation: 'protoBannerIn .34s cubic-bezier(.2,.9,.3,1.05) both',
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.01em', whiteSpace: 'nowrap' }}>{toast.msg}</span>
        {toast.undo && (
          <button onClick={() => dispatch(toast.undo)} style={{
            marginLeft: 6, height: 34, padding: '0 14px',
            background: 'transparent', color: VP.accent,
            border: 'none', borderRadius: 10, cursor: 'pointer',
            fontFamily: VPFontStack, fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap',
          }}>실행취소</button>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ProtoApp, computeNoteIds, pendingQuizCount, firstPendingStage, STAGE_TOTAL });
