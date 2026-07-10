import React, { useEffect, useReducer, useRef, useState } from 'react';
import { View, SafeAreaView, StatusBar, Animated, Easing, AppState, BackHandler, ToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import * as NavigationBar from 'expo-navigation-bar';
import { FONT_ASSETS, VP, setTheme, setFontScale } from './theme';
import './applyFontScale';   // 모든 Text fontSize에 글자크기 배율 적용(Text.render 패치)
import { TOTAL, BY_ID, BY_WORD, wordsForStage, boxAfterCard, boxAfterQuiz, buildSession, startedIds, shuffle, confusingIds, dueReviewIds, lockPool } from './data';
import { scheduleReviewReminder } from './notifications';
import { setSfxEnabled, playSfx, hOk, hBad, warmTTS } from './ui';

/* 정답/오답 피드백 (햅틱+효과음) — 모든 답안 경로 공용 */
const answerFx = (ok) => { if (ok) { hOk(); playSfx('correct'); } else { hBad(); playSfx('wrong'); } };
import HomeScreen from './Home';
import { FlashcardScreen, CardDoneScreen, PreviewScreen, CardR1EndScreen } from './Flashcard';
import { QuizScreen } from './Quiz';
import { ResultScore } from './Result';
import Wordbook from './Wordbook';
import Stats from './Stats';
import Settings from './Settings';
import Onboarding from './Onboarding';
import * as Overlay from './modules/vocapop-overlay';
import { supabase } from './supabase';
import { mergeState, pullState, pushState } from './sync';
import AuthSheet from './Auth';

/* ───────── 날짜 / 연속일 헬퍼 (실제 학습기록용) ───────── */
const dkey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayKey = () => dkey(new Date());
const todayLabel = () => { const d = new Date(); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
// dailyLog에 기록이 있는 날을 오늘(없으면 어제)부터 거꾸로 세어 연속 학습일 계산
function computeStreak(dailyLog) {
  if (!dailyLog) return 0;
  let streak = 0;
  const d = new Date();
  if (!dailyLog[dkey(d)]) d.setDate(d.getDate() - 1);
  while (dailyLog[dkey(d)]) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}
// 오늘 카드로 학습한 단어 1개 누적 → dailyLog/todayLearned/streak 동기
function bumpDaily(state) {
  const t = todayKey();
  const dailyLog = { ...(state.dailyLog || {}), [t]: ((state.dailyLog && state.dailyLog[t]) || 0) + 1 };
  return { dailyLog, todayLearned: dailyLog[t], streak: computeStreak(dailyLog) };
}

// 카드 플로우의 현재 카드 단어 — 인앱 플래시카드와 플로팅 오버레이가 같은 걸 보여준다
// 라운드1 = 셔플된 세션(cardSession: 새 단어+복습), 라운드2 = 드릴(cardQueue: 몰라요 id)
function currentCardWord(state) {
  if (state.cardRound === 2) return BY_ID[state.cardQueue[0]];
  const c = state.cardSession[state.cardIdx];
  return c ? BY_ID[c.id] : undefined;
}
// 세션 카드가 복습 단어인지 (우상단 '복습' 뱃지용)
export function isReviewCard(state, id) {
  const c = state.cardSession && state.cardSession.find(x => x.id === id);
  return !!(c && c.review);
}

/* ───────── 상태 + 로컬 저장 ───────── */
const KEY = 'vocapop:v1';
const initial = {
  screen: 'home',
  checkedCount: 0,            // 체크(플래시카드) 끝낸 걸음 — 1..checkedCount
  activeStage: 1,            // 현재 학습 중인 걸음
  favorites: [],             // 즐겨찾기(★) 단어 id
  points: 0, streak: 0,
  todayLearned: 0, dailyGoal: 20,
  settings: { noti: true, autoPlay: true, sound: true, dark: false, lockEnabled: false, lockMode: 'quiz', lockInterval: 30, lockScope: 'confusing' },  // 로컬 설정(토글) + 잠금화면 학습
  onboarded: false,          // 첫 실행 온보딩 완료 여부
  wbTutorialSeen: false,     // 단어장 첫 방문 스와이프 튜토리얼 봤는지
  boxes: {},                 // 세션기반 박스 SRS {id:{ivl,due}} (학습 시작한 단어)
  sessionNo: 0,              // 세션 카운터(복습 클록) — 세션 완료마다 +1
  overlayStage: 0, overlayIdx: 0,    // 플로팅 오버레이 학습 위치(앱 진도와 연동)
  pausedScreen: null,                // 진행 중 그만둔 플로우 화면(홈 이어하기 배너)
  dailyLog: {},              // 'YYYY-MM-DD' → 그날 학습 단어 수 (주간 그래프)
  stageLog: [],              // 걸음 퀴즈 기록 [{stage,date,acc,words,ts}] (통계 학습기록/평균정답률)
  vocabView: null,           // 단어장 진입 시 열 뷰 ('confusing' = 헷갈리는 덱 바로)
  // 플래시카드 진행 (cardSession = 셔플된 세션 [{id,review}], cardQueue = 2R 드릴 id)
  cardRound: 1, cardIdx: 0, cardSession: [], cardQueue: [], cardResults: {}, cardR2Initial: 0,
  cardHistory: [],           // R1 답 기록 [{id,prevBox,know}] — '이전 카드'(답 정정)용, 비영속
  reviewMode: false,         // true = 복습 전용 플래시카드(진도 안 건드림)
  reviewReturn: 'vocab',     // 복습 전용 세션 끝나고 돌아갈 화면 (vocab=헷갈리는 덱 / home=오늘의 복습)
  // 퀴즈 진행 (quizQueue = 출제 대상 id, quizReturn = 끝나고 돌아갈 화면)
  quizIdx: 0, quizResults: {}, quizQueue: [], quizReturn: 'home',
  _loaded: false,
};
const persistKeys = ['checkedCount', 'favorites', 'points', 'streak', 'todayLearned', 'dailyGoal', 'dailyLog', 'stageLog', 'settings', 'onboarded', 'wbTutorialSeen', 'boxes', 'sessionNo', 'overlayStage', 'overlayIdx'];
// 진행 중이던 학습 세션 — 로컬에만 저장(클라우드 동기화 X). 앱을 닫았다 켜도 '이어하기'로 복원돼 진도가 안 날아감.
const sessionKeys = ['screen', 'pausedScreen', 'activeStage', 'reviewMode', 'reviewReturn',
  'cardRound', 'cardIdx', 'cardSession', 'cardQueue', 'cardResults', 'cardR2Initial',
  'quizIdx', 'quizResults', 'quizQueue', 'quizReturn'];
const FLOW_SCREENS = ['card', 'preview', 'cardR1End', 'quiz'];   // 학습 진행 화면(이어하기 대상)
const FONT_SCALE = { small: 0.9, normal: 1, large: 1.12 };   // 글자 크기 설정 배율
const addUniq = (a, n) => a.includes(n) ? a : [...a, n];
const rm = (a, n) => a.filter(x => x !== n);

function reducer(state, a) {
  switch (a.type) {
    case 'LOAD': {
      // 최초 로컬 로드만 세션도 복원. 클라우드 동기화 LOAD(_loaded=true)는 진도(persistKeys)만 갱신 — 진행 중 세션 안 건드림.
      const initialLoad = !state._loaded;
      const keys = initialLoad ? persistKeys.concat(sessionKeys) : persistKeys;   // 구버전 키(srs/known/unknown 등)는 버림(마이그레이션)
      const data = {};
      keys.forEach(k => { if (a.data && a.data[k] !== undefined) data[k] = a.data[k]; });
      const merged = { ...state, ...data, _loaded: true };
      merged.todayLearned = (merged.dailyLog && merged.dailyLog[todayKey()]) || 0;
      merged.streak = computeStreak(merged.dailyLog);
      if (initialLoad) {
        // 진행 중이던 학습 플로우(카드/퀴즈)를 홈 '이어하기' 배너로 복원. 항상 홈에서 시작.
        const hasSession = (merged.cardSession && merged.cardSession.length > 0) || (merged.quizQueue && merged.quizQueue.length > 0);
        const flow = FLOW_SCREENS.includes(merged.screen) ? merged.screen
                   : (FLOW_SCREENS.includes(merged.pausedScreen) ? merged.pausedScreen : null);
        merged.pausedScreen = (flow && hasSession) ? flow : null;
        merged.screen = 'home';
      }
      return merged;
    }
    case 'GO': return { ...state, screen: a.screen, vocabView: a.vocabView || null };
    case 'TOGGLE_FAV':
      return { ...state, favorites: state.favorites.includes(a.id) ? rm(state.favorites, a.id) : addUniq(state.favorites, a.id) };
    case 'MARK_CONFUSING': {   // 단어장 ← 스와이프 '헷갈려요' → 박스1(다음 세션 합류). prev는 Undo용으로 호출부가 보관.
      const clock = (state.sessionNo || 0) + 1;
      return { ...state, boxes: { ...state.boxes, [a.id]: { ivl: 1, due: clock + 1 } } };
    }
    case 'RESTORE_BOX': {   // '헷갈려요/익혔어요' 취소(Undo) — 직전 박스 복원(없었으면 제거)
      const boxes = { ...state.boxes };
      if (a.prev) boxes[a.id] = a.prev; else delete boxes[a.id];
      return { ...state, boxes };
    }
    case 'MARK_KNOWN_STEP': {   // 단어장 → 스와이프 '익혔어요' → 박스 한 단계 위(형광펜 연해짐). prev는 Undo용.
      const clock = (state.sessionNo || 0) + 1;
      return { ...state, boxes: { ...state.boxes, [a.id]: boxAfterCard(state.boxes[a.id], 'know', clock) } };
    }
    case 'SEEN_WB_TUTORIAL':
      return { ...state, wbTutorialSeen: true };
    case 'APPLY_LOCK_RESULTS': {   // 잠금화면서 답한 결과 → 박스 반영(정답 박스↑·오답 박스1)
      const results = a.results || [];
      if (!results.length) return state;
      const clock = (state.sessionNo || 0) + 1;
      const boxes = { ...state.boxes };
      let applied = 0;
      results.forEach(r => {
        const w = BY_WORD[r.w]; if (!w) return;
        applied++;
        // 잠금 퀴즈·플래시 둘 다: 정답=카드처럼 직행(64), 오답=박스1 (인앱 객관식과 동일)
        boxes[w.id] = boxAfterCard(boxes[w.id], r.correct ? 'know' : 'dontknow', clock);
      });
      // 잠금화면 학습도 '오늘 학습'에 집계 — 스트릭·목표 링·알림 스킵에 반영
      const t = todayKey();
      const dailyLog = { ...(state.dailyLog || {}), [t]: ((state.dailyLog && state.dailyLog[t]) || 0) + applied };
      return { ...state, boxes, dailyLog, todayLearned: dailyLog[t], streak: computeStreak(dailyLog) };
    }
    case 'START_DUE_REVIEW': {   // 홈 '오늘의 복습' — 새 단어 없이 due 복습만 (≤20, 낮은 박스 우선)
      const ids = dueReviewIds(state.boxes, (state.sessionNo || 0) + 1, [], 20);
      if (ids.length === 0) return state;
      const cardSession = shuffle(ids).map(id => ({ id, review: true }));
      return { ...state, screen: 'card', reviewMode: true, reviewReturn: 'home', cardRound: 1, cardIdx: 0, cardSession, cardQueue: [], cardResults: {}, cardHistory: [], cardR2Initial: 0, pausedScreen: null };
    }
    case 'START_CARD': {   // 세션 = 새 단어 20 + due 복습 ≤20 (랜덤 셔플). 미리보기부터.
      const cardSession = buildSession(a.stage, state.boxes, state.sessionNo);
      return { ...state, screen: 'preview', activeStage: a.stage, cardRound: 1, cardIdx: 0, cardSession, cardQueue: [], cardResults: {}, cardHistory: [], reviewMode: false, pausedScreen: null };
    }
    case 'START_CARD_R2':   // 1라운드 끝 → 2라운드(몰랐던 것 반복)
      return { ...state, cardRound: 2, cardIdx: 0, screen: 'card' };
    case 'CARD_PREV': {   // R1 직전 카드로 — 실수로 누른 답(박스·포인트·오늘학습)을 되돌리고 다시 답하게
      const h = state.cardHistory || [];
      if (state.cardRound !== 1 || state.cardIdx === 0 || h.length === 0) return state;
      const last = h[h.length - 1];
      const boxes = { ...state.boxes };
      if (last.prevBox) boxes[last.id] = last.prevBox; else delete boxes[last.id];
      const t = todayKey();
      const dailyLog = { ...(state.dailyLog || {}) };
      if (dailyLog[t]) { dailyLog[t] -= 1; if (dailyLog[t] <= 0) delete dailyLog[t]; }
      const cardResults = { ...state.cardResults };
      delete cardResults[last.id];
      return {
        ...state, boxes, cardResults, cardHistory: h.slice(0, -1), cardIdx: state.cardIdx - 1,
        points: Math.max(0, state.points - (last.know ? 2 : 0)),
        dailyLog, todayLearned: dailyLog[t] || 0, streak: computeStreak(dailyLog),
      };
    }
    case 'START_QUIZ': {
      // 출제 = 그 걸음(세션)의 20단어 전부(셔플). 각 단어는 자기 동결 문항으로 출제.
      const queue = shuffle(wordsForStage(a.stage).map(w => w.id));
      return { ...state, screen: 'quiz', activeStage: a.stage, quizIdx: 0, quizResults: {}, quizQueue: queue, quizReturn: 'home', pausedScreen: null };
    }
    case 'START_CONFUSING_REVIEW': {   // 단어장 '헷갈리는 단어' → 플래시카드 복습(박스 낮은 20개, 틀리면 박스1로 세션 합류)
      const ids = confusingIds(state.boxes).slice(0, 20);
      if (ids.length === 0) return state;
      const cardSession = shuffle(ids).map(id => ({ id, review: true }));
      return { ...state, screen: 'card', reviewMode: true, reviewReturn: 'vocab', cardRound: 1, cardIdx: 0, cardSession, cardQueue: [], cardResults: {}, cardHistory: [], cardR2Initial: 0, pausedScreen: null };
    }
    case 'START_CONFUSING_QUIZ': {   // 헷갈리는 단어 테스트 — 박스 낮은 20개, 동결 문항 재사용. 끝나면 단어장 복귀.
      const queue = confusingIds(state.boxes).slice(0, 20);
      if (queue.length === 0) return state;
      return { ...state, screen: 'quiz', quizIdx: 0, quizResults: {}, quizQueue: queue, quizReturn: 'vocab', pausedScreen: null };
    }
    case 'PAUSE':           // 플로우 중 뒤로 → 홈, 이어하기용으로 화면 기억
      return { ...state, pausedScreen: state.screen, screen: 'home' };
    case 'RESUME':
      return { ...state, screen: state.pausedScreen || 'home', pausedScreen: null };
    case 'DISMISS_RESUME':
      return { ...state, pausedScreen: null };
    case 'CARD_ANSWER': {
      const know = a.choice === 'know';
      answerFx(know);
      if (state.cardRound === 1) {
        // 라운드1 = 셔플된 세션(새 단어 + due 복습). 박스 갱신 (첫 알아요=64, 이후 ×2, 몰라요=1).
        const clock = state.sessionNo + 1;
        const boxes = { ...state.boxes, [a.id]: boxAfterCard(state.boxes[a.id], a.choice, clock) };
        const points = know ? state.points + 2 : state.points;
        const daily = bumpDaily(state);
        const results = { ...state.cardResults, [a.id]: a.choice };
        const next = state.cardIdx + 1;
        const cardHistory = [...(state.cardHistory || []), { id: a.id, prevBox: state.boxes[a.id], know }].slice(-40);   // '이전 카드' 정정용
        const base = { ...state, boxes, points, cardResults: results, cardHistory, ...daily };
        if (next >= state.cardSession.length) {
          const queue = state.cardSession.filter(c => results[c.id] === 'dontknow').map(c => c.id);   // 몰라요 → 드릴
          if (queue.length === 0) return finishCard(base);
          return { ...base, cardR2Initial: queue.length, cardQueue: queue, screen: 'cardR1End' };
        }
        return { ...base, cardIdx: next };
      } else { // 라운드2 = 드릴(몰라요 반복). 박스는 R1에서 이미 box1로 확정 → 여기선 큐만 관리.
        const q = state.cardQueue;
        const points = know ? state.points + 1 : state.points;
        if (know) {
          const nq = q.slice(1);
          if (nq.length === 0) return finishCard({ ...state, points, cardQueue: nq });
          return { ...state, points, cardQueue: nq };
        }
        const rest = q.slice(1);
        const at = Math.min(2, rest.length);
        return { ...state, points, cardQueue: [...rest.slice(0, at), q[0], ...rest.slice(at)] };
      }
    }
    case 'QUIZ_ANSWER': {
      // outcome: correct | hintCorrect | wrong | dontknow / slot: mc|tile|listen|spell (구버전 a.correct도 호환)
      const slot = a.slot || 'mc';
      const oc = a.outcome || (a.correct ? 'correct' : 'wrong');
      const gotWord = oc === 'correct' || oc === 'hintCorrect';
      answerFx(gotWord);
      const quizResults = { ...state.quizResults, [a.id]: gotWord ? 'o' : 'x' };
      const points = oc === 'correct' ? state.points + 5 : state.points;   // 깨끗한 정답만 +5
      const nb = boxAfterQuiz(state.boxes[a.id], slot, oc, state.sessionNo + 1);
      const boxes = nb ? { ...state.boxes, [a.id]: nb } : state.boxes;
      return { ...state, quizResults, points, boxes };
    }
    case 'QUIZ_NEXT': {
      const next = state.quizIdx + 1;
      if (next >= (state.quizQueue ? state.quizQueue.length : 0)) {
        // 걸음 퀴즈 완료 → 학습 기록(stageLog)에 정답률과 함께 기록 (헷갈리는 테스트는 걸음 단위가 아니라 제외)
        if (state.quizReturn !== 'vocab' && state.quizQueue && state.quizQueue.length) {
          playSfx('complete'); hOk();
          const right = Object.values(state.quizResults).filter(r => r === 'o').length;
          const acc = Math.round((right / state.quizQueue.length) * 100);
          const entry = { stage: state.activeStage, date: todayLabel(), acc, words: state.quizQueue.length, ts: todayKey() };
          return { ...state, stageLog: [...(state.stageLog || []), entry], screen: 'result' };
        }
        return { ...state, screen: 'result' };
      }
      return { ...state, quizIdx: next };
    }
    case 'FINISH_ONBOARDING':
      return { ...state, onboarded: true };
    case 'SET_GOAL':
      return { ...state, dailyGoal: Math.max(5, Math.min(60, a.value)) };
    case 'SET_SETTING':
      return { ...state, settings: { ...(state.settings || {}), [a.key]: a.value } };
    case 'RESET_PROGRESS':   // 진행만 초기화 — 하루목표·설정은 유지
      return { ...initial, dailyGoal: state.dailyGoal, settings: state.settings, _loaded: true };
    case 'RESET':
      return { ...initial, _loaded: true };
    default: return state;
  }
}
function finishCard(state) {
  // 복습 전용 세션: 진도(checkedCount) 안 건드림. 클록만 +1 후 출발한 화면(덱/홈)으로 복귀.
  if (state.reviewMode) {
    return { ...state, sessionNo: (state.sessionNo || 0) + 1, reviewMode: false, screen: state.reviewReturn || 'vocab' };
  }
  // 체크 트랙 전진 + 세션 완료 → 복습 클록(sessionNo) +1
  const checkedCount = Math.min(TOTAL, Math.max(state.checkedCount, state.activeStage));
  return { ...state, checkedCount, sessionNo: (state.sessionNo || 0) + 1, screen: 'cardDone' };
}

/* ───────── 앱 루트 ───────── */
export default function App() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [fontsLoaded] = useFonts(FONT_ASSETS);
  const [user, setUser] = useState(null);
  const [syncMsg, setSyncMsg] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const stateRef = useRef(state); stateRef.current = state;
  const syncedFor = useRef(null);
  const [overlayActive, setOverlayActive] = useState(false);
  const overlayShown = useRef(false);
  const lastOverlayKey = useRef(null);
  const backAt = useRef(0);   // 홈에서 두 번 눌러 종료
  // 안드로이드 하드웨어 뒤로가기 — 화면을 screen 상태로 직접 관리하므로 백도 직접 처리(안 하면 어디서든 앱이 꺼짐).
  // 학습 플로우는 일시정지(홈+이어하기), 그 외 화면은 홈으로, 홈에선 두 번 눌러야 종료. 모달(상세/로그인/잠금시트)은 각자 onRequestClose가 닫음.
  useEffect(() => {
    const onBack = () => {
      const st = stateRef.current;
      if (!st.onboarded) return true;                 // 온보딩 중엔 백으로 종료 막기
      const s = st.screen;
      if (s === 'card' || s === 'preview' || s === 'cardR1End' || s === 'quiz') {
        dispatch({ type: 'PAUSE' });                  // 카드/퀴즈 → 일시정지(홈에서 이어하기)
        return true;
      }
      if (s !== 'home') {
        dispatch({ type: 'GO', screen: 'home' });     // 결과/완료/단어장/통계/설정 → 홈
        return true;
      }
      const now = Date.now();                         // 홈: 실수 종료 방지 — 2초 내 두 번
      if (now - backAt.current < 2000) return false;  // 종료 허용
      backAt.current = now;
      ToastAndroid.show('한 번 더 누르면 종료돼요', ToastAndroid.SHORT);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);
  // 로드
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        dispatch({ type: 'LOAD', data: raw ? JSON.parse(raw) : {} });
      } catch (e) { dispatch({ type: 'LOAD', data: {} }); }
    })();
  }, []);
  useEffect(() => { warmTTS(); }, []);   // TTS 엔진 워밍업(첫 발음 콜드스타트 ~2초 줄임)
  // 잠금화면 학습 — 설정/박스/테마 바뀌면 네이티브에 단어풀·설정 push (서비스 시작/중지)
  useEffect(() => {
    if (!state._loaded || !Overlay.isLockSupported()) return;
    const s = state.settings || {};
    Overlay.setLockPool(lockPool(state.boxes, state.favorites, s.lockScope || 'confusing'));
    Overlay.setLockConfig(!!s.lockEnabled, s.lockMode || 'quiz', s.lockInterval == null ? 30 : s.lockInterval, !!s.dark);
  }, [state._loaded, state.settings && state.settings.lockEnabled, state.settings && state.settings.lockMode, state.settings && state.settings.lockInterval, state.settings && state.settings.lockScope, state.settings && state.settings.dark, state.boxes, state.favorites]);
  // 복습 알림(로컬) — 매일 저녁 8시 1건 유지. 오늘 학습했으면 내일로 미룸. 내용 = 헷갈리는 단어 수.
  useEffect(() => {
    if (!state._loaded) return;
    const s = state.settings || {};
    scheduleReviewReminder({
      enabled: s.noti !== false,
      studiedToday: ((state.dailyLog && state.dailyLog[todayKey()]) || 0) > 0,
      confusingCount: confusingIds(state.boxes).length,
      streak: state.streak || 0,
    });
  }, [state._loaded, state.settings && state.settings.noti, state.todayLearned, state.boxes, state.streak]);
  // 앱이 켜지거나 포그라운드로 돌아올 때: 잠금화면서 답한 결과를 박스에 반영
  useEffect(() => {
    if (!Overlay.isLockSupported()) return;
    const apply = () => { const r = Overlay.pullLockResults(); if (r && r.length) dispatch({ type: 'APPLY_LOCK_RESULTS', results: r }); };
    if (state._loaded) apply();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') apply(); });
    return () => sub.remove();
  }, [state._loaded]);
  // 저장 — 진도(persistKeys) + 진행 중 세션(sessionKeys) 둘 다 로컬에. 매 답·매 화면전환마다 기록돼 앱이 죽어도 안 날아감.
  useEffect(() => {
    if (!state._loaded) return;
    const data = {}; persistKeys.concat(sessionKeys).forEach(k => data[k] = state[k]);
    AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
  }, persistKeys.concat(sessionKeys).map(k => state[k]).concat(state._loaded));
  // 오버레이(다른 앱 위 학습)에서 알아요/몰라요/이전 → 앱 진도에 반영
  // 백그라운드라 JS 타이머는 멈추지만, 네이티브 스와이프 이벤트는 JS를 깨우므로 전환도 이벤트로 처리.
  useEffect(() => {
    const sub = Overlay.addAnswerListener(({ choice }) => {
      const st = stateRef.current;
      if (st.screen === 'cardR1End') { dispatch({ type: 'START_CARD_R2' }); return; }   // '다시 복습' 카드 → 밀면 2R 시작
      if (choice === 'prev') { dispatch({ type: 'CARD_PREV' }); return; }                 // ↓ 이전 단어(정정) — R1·idx>0에서만 반영
      const w = currentCardWord(st);
      if (w) dispatch({ type: 'CARD_ANSWER', id: w.id, choice });
    });
    return () => sub && sub.remove && sub.remove();
  }, []);
  // 오버레이 = 카드 플로우의 원격 뷰. 현재 카드를 밀어주고(start/setCard), 플로우 벗어나면 닫는다.
  const inCardFlow = state.screen === 'card' || state.screen === 'preview' || state.screen === 'cardR1End';
  const overlayCardKey = inCardFlow
    ? (state.screen === 'cardR1End'
        ? `r1end:${state.activeStage}`     // 전환 화면은 고유 키 → 직전 R1 카드와 안 겹쳐 effect가 돎
        : `${state.activeStage}:${state.cardRound}:${state.cardRound === 2 ? state.cardQueue[0] : state.cardIdx}`)
    : null;
  useEffect(() => {
    if (!overlayActive) return;
    if (!overlayCardKey) { Overlay.stopOverlay(); overlayShown.current = false; lastOverlayKey.current = null; setOverlayActive(false); return; }
    const st = stateRef.current;
    const dark = !!(st.settings && st.settings.dark);
    // 1R→2R 전환: 오버레이엔 인앱 '다시 보기' 버튼이 없으니, 안내 카드 잠깐 띄우고 자동으로 2R 진입
    if (st.screen === 'cardR1End') {
      const n = (st.cardQueue && st.cardQueue.length) || 0;
      const tWord = '다시 복습', tKor = `몰라요 ${n}개 · 밀어서 시작`;
      if (!overlayShown.current) { Overlay.startOverlay(tWord, tKor, '', '1R 완료', 1, dark); overlayShown.current = true; }
      else if (lastOverlayKey.current !== overlayCardKey) { Overlay.setCard(tWord, tKor, '', '1R 완료', 1); }
      lastOverlayKey.current = overlayCardKey;
      const t = setTimeout(() => { if (stateRef.current.screen === 'cardR1End') dispatch({ type: 'START_CARD_R2' }); }, 1700);
      return () => clearTimeout(t);
    }
    const w = currentCardWord(st);
    if (!w) return;
    const total = (st.cardSession && st.cardSession.length) || wordsForStage(st.activeStage).length;
    const isR2 = st.cardRound === 2;
    const label = isR2 ? `2R · 남은 ${st.cardQueue.length}` : `${st.cardIdx + 1}/${total}`;
    const pct = isR2 ? ((st.cardR2Initial - st.cardQueue.length) / Math.max(1, st.cardR2Initial)) : (st.cardIdx + 1) / total;
    if (!overlayShown.current) {
      Overlay.startOverlay(w.word, w.korean || '', w.pos || '', label, pct, !!(st.settings && st.settings.dark));
      overlayShown.current = true;
    } else if (lastOverlayKey.current !== overlayCardKey) {
      Overlay.setCard(w.word, w.korean || '', w.pos || '', label, pct);
    }
    lastOverlayKey.current = overlayCardKey;
  }, [overlayActive, overlayCardKey]);
  // 앱이 포그라운드로 돌아오면 플로팅 오버레이는 닫는다 — 앱을 보고 있으면 인앱 화면을 쓰면 되니
  // 홈/카드 위에 떠 있을 필요가 없다. 다시 띄우려면 pip 버튼. (오버레이는 '다른 앱 위' 학습 전용)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && overlayShown.current) {
        Overlay.stopOverlay();
        overlayShown.current = false; lastOverlayKey.current = null;
        setOverlayActive(false);
      }
    });
    return () => sub.remove();
  }, []);
  // 인증 상태 추적
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = (session && session.user) || null;
      setUser(u);
      if (!u) { syncedFor.current = null; setSyncMsg(''); }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  // 로그인 + 로컬 로드 완료 시 1회: 클라우드+로컬 병합 → 적용 → push
  useEffect(() => {
    if (!user || !state._loaded || syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    (async () => {
      try {
        setSyncMsg('동기화 중…');
        const cloud = await pullState(user.id);
        const localBlob = {}; persistKeys.forEach((k) => { localBlob[k] = stateRef.current[k]; });
        const merged = mergeState(localBlob, cloud);
        dispatch({ type: 'LOAD', data: merged });
        await pushState(user.id, merged);
        setSyncMsg('동기화됨 · 방금');
      } catch (e) {
        const miss = e && (e.code === '42P01' || /does not exist/.test(e.message || ''));
        setSyncMsg(miss ? '테이블이 없어요 — SQL 실행 필요' : '동기화 실패');
        if (miss) syncedFor.current = null;
      }
    })();
  }, [user, state._loaded]);
  // 상태 변경 시 클라우드로 push (디바운스 2s)
  useEffect(() => {
    if (!user || !state._loaded || syncedFor.current !== user.id) return;
    const t = setTimeout(() => {
      const blob = {}; persistKeys.forEach((k) => { blob[k] = state[k]; });
      pushState(user.id, blob).then(() => setSyncMsg('동기화됨 · 방금')).catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, persistKeys.map((k) => state[k]).concat([user]));

  // 다크모드: active 팔레트를 매 렌더 동기화 → VP 게터를 읽는 전 화면이 자동 반영
  const dark = !!(state.settings && state.settings.dark);
  setTheme(dark);
  setFontScale(FONT_SCALE[(state.settings && state.settings.fontSize) || 'normal'] || 1);
  setSfxEnabled(state.settings ? state.settings.sound !== false : true);   // '효과음' 토글 → 효과음 on/off
  // 하단 네비게이션 바도 테마 따라가게 (상태바는 아래 <StatusBar backgroundColor>가 처리)
  useEffect(() => {
    NavigationBar.setBackgroundColorAsync(VP.bg).catch(() => {});
    NavigationBar.setButtonStyleAsync(dark ? 'light' : 'dark').catch(() => {});
  }, [dark]);

  // 진행 초기화 — 로컬 + 클라우드 동시 (동기화가 옛 진도를 되살리는 것 방지)
  const resetProgress = () => {
    dispatch({ type: 'RESET_PROGRESS' });
    if (user) {
      const blob = {};
      persistKeys.forEach((k) => { blob[k] = initial[k]; });
      blob.dailyGoal = stateRef.current.dailyGoal;
      blob.settings = stateRef.current.settings;
      pushState(user.id, blob).then(() => setSyncMsg('동기화됨 · 방금')).catch(() => {});
    }
  };

  // 오버레이 열기 — 카드 플로우 시작(또는 진행중이면 그대로) + 오버레이 활성화
  const openOverlay = async (stage, inFlow) => {
    if (!Overlay.isSupported()) return;
    try {
      const ok = await Overlay.requestOverlayPermission();
      if (!ok) return;
      if (!inFlow) { dispatch({ type: 'START_CARD', stage }); dispatch({ type: 'GO', screen: 'card' }); }
      setOverlayActive(true);
    } catch (e) {}
  };

  if (!state._loaded || !fontsLoaded) return <View style={{ flex: 1, backgroundColor: VP.bg }} />;

  if (!state.onboarded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: VP.bg }}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={VP.bg} />
        <Onboarding onDone={() => dispatch({ type: 'FINISH_ONBOARDING' })} />
      </SafeAreaView>
    );
  }

  let body;
  if (state.screen === 'home') body = <HomeScreen state={state} dispatch={dispatch} onOverlay={openOverlay} />;
  else if (state.screen === 'preview') body = <PreviewScreen state={state} dispatch={dispatch} />;
  else if (state.screen === 'card') body = <FlashcardScreen state={state} dispatch={dispatch} onOverlay={openOverlay} />;
  else if (state.screen === 'cardR1End') body = <CardR1EndScreen state={state} dispatch={dispatch} />;
  else if (state.screen === 'cardDone') body = <CardDoneScreen state={state} dispatch={dispatch} />;
  else if (state.screen === 'quiz') body = <QuizScreen state={state} dispatch={dispatch} />;
  else if (state.screen === 'result') body = <ResultScore state={state} dispatch={dispatch} />;
  else if (state.screen === 'vocab') body = <Wordbook state={state} dispatch={dispatch} />;
  else if (state.screen === 'stats') body = <Stats state={state} dispatch={dispatch} />;
  else if (state.screen === 'settings') body = <Settings state={state} dispatch={dispatch} onOverlay={openOverlay} onReset={resetProgress} account={{ user, syncMsg, onLogin: () => setAuthOpen(true), onLogout: () => supabase.auth.signOut() }} />;
  else body = <HomeScreen state={state} dispatch={dispatch} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VP.bg }}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={VP.bg} />
      <ScreenFade screenKey={state.screen}>{body}</ScreenFade>
      <AuthSheet visible={authOpen} onClose={() => setAuthOpen(false)} />
    </SafeAreaView>
  );
}

/* 화면 전환 페이드인 (protoFade) — screen 바뀔 때마다 opacity/translateY 트윈 */
function ScreenFade({ screenKey, children }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [screenKey]);
  return (
    <Animated.View style={{ flex: 1, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}
