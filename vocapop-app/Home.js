/* VocaPoP 홈 — design-reference/vp-proto-screens-1.jsx (ProtoHome) 픽셀 이식.
   두루마리 계단 + 5상태 + 보라 깃발 + 데일리목표 링 + 말풍선 + 탭바.
   동작(1걸음만 열림, 로컬저장)은 RN 리듀서 그대로, 디자인만 프로토타입. */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, PanResponder, LayoutAnimation, Platform, UIManager, Animated, Easing } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';
import { VP, ff, ls } from './theme';
import { hTap, hSel } from './ui';
import { Icon } from './Icon';
import { TOTAL, C2_START_STAGE, wordsForStage, dueReviewIds } from './data';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* 계단 기하 상수 (프로토타입 그대로) */
const P_TOTAL = TOTAL;   // 실제 섹션 수
const P_ABOVE = 12;
const P_BELOW = 5;
const P_SLOT_H = 44;
const P_STRIDE = 56;                  // 44 + 12
const P_SELECTED_BOTTOM = 4 * P_STRIDE + 10; // 234

const clampStage = (p) => Math.max(1, Math.min(P_TOTAL, p));

/* ───── 걸음 한 칸 ───── */
function StepRow({ n, st, rel, contentW, isUser, onPress }) {
  const isCenter = rel === 0;
  const bottom = P_SELECTED_BOTTOM + rel * P_STRIDE;
  const width = rel >= -4 ? contentW - (rel + 4) * 28 : contentW;
  const centerActionable = isCenter && (st === 'current' || st === 'done');

  // 중앙에 새로 들어온 actionable 걸음은 살짝 "팝"(scale 1→1.07→1)으로 선택감 — 프로토 [isCenter] 트리거
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!(isCenter && centerActionable)) return;
    pop.setValue(0);
    Animated.sequence([   // 폭(wAnim)과 같은 노드에 얹으므로 둘 다 JS 드라이버(혼용 불가)
      Animated.timing(pop, { toValue: 1, duration: 135, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(pop, { toValue: 0, duration: 165, easing: Easing.bezier(0.34, 1.45, 0.5, 1), useNativeDriver: false }),
    ]).start();
  }, [isCenter]);
  const popScale = pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });

  // 걸음 폭은 거리(rel)에 따라 달라짐 → 스크롤로 rel 바뀔 때 폭을 .3s 트윈 (프로토 transition: width)
  const wAnim = useRef(new Animated.Value(width)).current;
  useEffect(() => {
    Animated.timing(wAnim, { toValue: width, duration: 300, easing: Easing.bezier(0.2, 0.85, 0.3, 1.01), useNativeDriver: false }).start();
  }, [width]);

  // C2 고난도 도전구간(C2_START_STAGE~)은 빨강/불꽃 테마, 그 외는 핑크(accent)
  const challenge = n >= C2_START_STAGE;
  const A = challenge ? { main: VP.bad, soft: VP.badSoft, deep: VP.badDeep, shade: VP.badShade } : { main: VP.accent, soft: VP.accentSoft, deep: VP.accentDeep, shade: VP.accentSoft };
  let bg, color, shade, border = null, chipBg, chipCol, chipIcon, right = null;
  if (centerActionable) {   // 가운데 활성(현재/완료) — 큰 버튼
    bg = A.main; color = '#fff'; shade = A.deep;
    chipBg = 'rgba(255,255,255,0.24)'; chipCol = '#fff';
    chipIcon = challenge ? 'flame' : (st === 'done' ? 'pencil' : 'play');
    right = <Text style={{ fontSize: 12, fontFamily: ff(800), color: '#fff' }}>{st === 'done' ? '퀴즈' : (challenge ? '도전' : '체크')}</Text>;
  } else if (st === 'current') {
    bg = A.soft; color = A.deep; shade = A.shade; border = VP.border;
    chipBg = challenge ? A.main : VP.accentSoft; chipCol = challenge ? '#fff' : VP.accent; chipIcon = challenge ? 'flame' : 'play';
    right = <Text style={{ fontSize: 11, fontFamily: ff(800), color: A.deep }}>오늘</Text>;
  } else if (st === 'done') {
    bg = VP.surface; color = VP.text; shade = VP.border; border = VP.border;
    chipBg = A.soft; chipCol = A.deep; chipIcon = challenge ? 'flame' : 'pencil';
    right = <Text style={{ fontSize: 11, fontFamily: ff(800), color: A.deep }}>{challenge ? '도전' : '퀴즈'}</Text>;
  } else { // locked — 일반: 회색+자물쇠 / C2 도전: 연한 빨강+불꽃
    bg = challenge ? A.soft : VP.surface2; color = challenge ? A.deep : VP.textMute; shade = challenge ? A.shade : VP.border;
    chipBg = challenge ? A.main : VP.border; chipCol = challenge ? '#fff' : VP.textMute; chipIcon = challenge ? 'flame' : 'lock';
  }

  const chip = isCenter ? 27 : 24;
  const dim = challenge && st === 'locked';   // 잠긴 도전구간: 글자·아이콘도 그림자처럼 연하게
  return (
    <Animated.View style={{ position: 'absolute', right: 0, bottom, width: wAnim, height: P_SLOT_H + 4, zIndex: isUser ? 5 : 1, transform: [{ scale: popScale }] }}>
      {/* 두꺼운 바닥 그림자 (0 4px 0 0 shade) */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 4, height: P_SLOT_H, borderRadius: 12, backgroundColor: shade }} />
      {/* 면 */}
      <Pressable onPress={onPress} style={({ pressed }) => ({
        position: 'absolute', top: 0, left: 0, right: 0, height: P_SLOT_H,
        borderRadius: 12, backgroundColor: bg,
        borderWidth: border ? 1 : 0, borderColor: border || 'transparent',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14,
        transform: [{ translateY: pressed ? 2 : 0 }, { scale: pressed ? 0.985 : 1 }],
      })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', opacity: dim ? 0.45 : 1 }}>
          <View style={{ width: chip, height: chip, borderRadius: chip / 2, backgroundColor: chipBg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={chipIcon} size={isCenter ? 15 : 13} color={chipCol} />
          </View>
          <Text style={{ marginLeft: 9, color, fontSize: isCenter ? 14 : 13, fontFamily: ff(isCenter ? 700 : 600), letterSpacing: ls(-0.02, 14) }}>{n}걸음</Text>
        </View>
        {right}
      </Pressable>
      {isUser && <MeFlag />}
    </Animated.View>
  );
}

/* ───── "나" 깃발 (보라, 펄럭임) ───── */
function MeFlag() {
  const wave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(wave, { toValue: 1, duration: 1400, useNativeDriver: true }),
      Animated.timing(wave, { toValue: 0, duration: 1400, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const rotate = wave.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-5deg'] });
  return (
    <Animated.View style={{ position: 'absolute', left: -1, top: -14, transform: [{ rotate }] }} pointerEvents="none">
      {/* 깃대 */}
      <View style={{ position: 'absolute', left: 0, top: 0, width: 3, height: 36, backgroundColor: VP.flagDeep, borderRadius: 2 }} />
      {/* 꼭대기 장식 */}
      <View style={{ position: 'absolute', left: -1.5, top: -3, width: 6, height: 6, borderRadius: 3, backgroundColor: VP.flagDeep }} />
      {/* 깃발 천 (펜넌트) */}
      <View style={{ position: 'absolute', left: -30, top: 2, width: 30, height: 19 }}>
        <Svg width={30} height={19} viewBox="0 0 30 19">
          <Polygon points="0,9.5 6.6,0 30,0 30,19 6.6,19" fill={VP.flag} />
        </Svg>
        <Text style={{ position: 'absolute', left: 6, right: 0, top: 0, bottom: 0, textAlign: 'center', textAlignVertical: 'center', color: '#fff', fontSize: 10, fontFamily: ff(900) }}>나</Text>
      </View>
    </Animated.View>
  );
}

/* ───── 데일리 목표 링 ───── */
function DailyGoalCard({ state, dispatch }) {
  const goal = state.dailyGoal || 20;
  const done = Math.min(state.todayLearned || 0, goal);
  const pct = goal > 0 ? done / goal : 0;
  const reached = (state.todayLearned || 0) >= goal;
  const r = 17, c = 2 * Math.PI * r;
  const prog = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(prog, { toValue: pct, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct]);
  const dashoffset = prog.interpolate({ inputRange: [0, 1], outputRange: [c, 0] });
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 }}>
      <Pressable onPress={() => dispatch({ type: 'GO', screen: 'stats' })} style={{
        backgroundColor: VP.surface, borderWidth: 1, borderColor: VP.divider, borderRadius: 14,
        paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center',
      }}>
        <View style={{ width: 44, height: 44 }}>
          <Svg width={44} height={44} viewBox="0 0 44 44">
            <Circle cx={22} cy={22} r={r} stroke={VP.surface2} strokeWidth={5} fill="none" />
            <AnimatedCircle cx={22} cy={22} r={r} stroke={VP.accent} strokeWidth={5} fill="none"
              strokeDasharray={`${c}`} strokeDashoffset={dashoffset} strokeLinecap="round"
              transform="rotate(-90 22 22)" />
          </Svg>
          <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            {reached ? <Icon name="check-bold" size={18} color={VP.accent} /> : <Text style={{ fontSize: 11, fontFamily: ff(800), color: VP.text }}>{Math.round(pct * 100)}%</Text>}
          </View>
        </View>
        <View style={{ flex: 1, marginLeft: 13 }}>
          <Text style={{ fontSize: 13, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.02, 13) }}>{reached ? '오늘 목표 달성!' : '오늘의 목표'}</Text>
          <Text style={{ fontSize: 12, color: VP.textSub, marginTop: 1 }}>단어 <Text style={{ color: VP.text, fontFamily: ff(700) }}>{state.todayLearned || 0}</Text> / {goal}개</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: VP.accentSoft }}>
          <Icon name="flame" size={13} color={VP.accent} />
          <Text style={{ marginLeft: 4, fontSize: 12, fontFamily: ff(800), color: VP.accent }}>{state.streak}일</Text>
        </View>
      </Pressable>
    </View>
  );
}

/* ───── 걸음 말풍선 ───── */
function StagePopover({ stage, stageState, dispatch, onClose }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (stage == null) return;
    a.setValue(0);
    Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 6, tension: 160 }).start();
  }, [stage]);
  if (stage == null) return null;
  const quizOn = stageState === 'done';
  const cardLabel = stageState === 'current' ? '플래시카드' : '플래시카드 다시 보기';
  const sub = stageState === 'current' ? '오늘의 학습 — 새 단어 + 복습'
    : '완료한 걸음 · 다시 보거나 퀴즈로 점검';
  const popBtn = (kind) => ({
    height: 44, borderRadius: 12, marginTop: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
    backgroundColor: kind === 'off' ? 'rgba(255,255,255,0.22)' : '#fff',
  });
  const popBtnText = (kind) => ({ fontSize: 14, fontFamily: ff(800), letterSpacing: ls(-0.02, 14), color: kind === 'off' ? 'rgba(255,255,255,0.72)' : VP.accentDeep, marginLeft: 7 });
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: P_SELECTED_BOTTOM + P_SLOT_H + 16, alignItems: 'center', zIndex: 71 }}>
      <Animated.View style={{ width: 238, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>
        <View style={{ backgroundColor: VP.accent, borderRadius: 16, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12 }}>
          <Text style={{ fontSize: 13, fontFamily: ff(800), color: '#fff', letterSpacing: ls(-0.02, 13) }}>{stage}걸음</Text>
          <Text style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{sub}</Text>
          <Pressable onPress={() => { dispatch({ type: 'START_CARD', stage }); onClose(); }} style={popBtn('card')}>
            <Icon name="cards" size={16} color={VP.accentDeep} />
            <Text style={popBtnText('card')}>{cardLabel}</Text>
          </Pressable>
          <Pressable disabled={!quizOn} onPress={() => { if (quizOn) { dispatch({ type: 'START_QUIZ', stage }); onClose(); } }} style={popBtn(quizOn ? 'quiz' : 'off')}>
            <Icon name={quizOn ? 'pencil' : 'lock'} size={15} color={quizOn ? VP.accentDeep : 'rgba(255,255,255,0.72)'} />
            <Text style={popBtnText(quizOn ? 'quiz' : 'off')}>{quizOn ? '퀴즈' : '퀴즈 (카드 먼저)'}</Text>
          </Pressable>
        </View>
        {/* 아래 화살표 */}
        <View style={{ alignSelf: 'center', width: 14, height: 14, backgroundColor: VP.accent, transform: [{ rotate: '45deg' }], marginTop: -7 }} />
      </Animated.View>
    </View>
  );
}

/* ───── 하단 탭바 ───── */
const TABS = [
  { key: 'home', icon: 'mountain', label: '홈' },
  { key: 'vocab', icon: 'wordbook', label: '단어장' },
  { key: 'stats', icon: 'chart', label: '통계' },
  { key: 'settings', icon: 'settings', label: '설정' },
];
export function TabBar({ active, dispatch }) {
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: VP.divider, backgroundColor: VP.bg, paddingTop: 6, paddingBottom: 6, paddingHorizontal: 6 }}>
      {TABS.map(t => {
        const on = active === t.key;
        return (
          <Pressable key={t.key} onPress={() => { if (!on) dispatch({ type: 'GO', screen: t.key }); }}
            style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
            <Icon name={t.icon} size={22} color={on ? VP.accent : VP.textSub} />
            <Text style={{ marginTop: 3, fontSize: 10.5, fontFamily: ff(on ? 800 : 600), color: on ? VP.accent : VP.textSub }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───── 이어하기 배너 ───── */
function resumeLabel(state) {
  const s = state.pausedScreen;
  const stage = `${state.activeStage}걸음째`;
  const total = (state.cardSession && state.cardSession.length) || wordsForStage(state.activeStage).length;
  if (s === 'preview') return { label: '단어 미리보기', sub: stage };
  if (s === 'card') return { label: state.cardRound === 2 ? '플래시카드 2라운드' : '플래시카드', sub: `${stage} · ${state.cardRound === 2 ? `${state.cardQueue.length}개 남음` : `${state.cardIdx + 1}/${total}`}` };
  if (s === 'cardR1End') return { label: '플래시카드 2라운드', sub: `${stage} · ${state.cardQueue.length}개 다시 외우기` };
  if (s === 'quiz') return { label: '퀴즈', sub: `${stage} · ${state.quizIdx + 1}/${(state.quizQueue && state.quizQueue.length) || total}문제` };
  return { label: '학습', sub: stage };
}

function ResumeBanner({ state, dispatch }) {
  const info = resumeLabel(state);
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6 }}>
      <Pressable onPress={() => dispatch({ type: 'RESUME' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: VP.surface, borderRadius: 16, borderWidth: 1, borderColor: VP.accentSoft, borderLeftWidth: 3, borderLeftColor: VP.accent, paddingVertical: 14, paddingLeft: 16, paddingRight: 14 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="play" size={18} color={VP.accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.02, 14) }}>이어서 학습할까요?</Text>
          <Text numberOfLines={1} style={{ fontSize: 12, color: VP.textSub, marginTop: 1 }}>{info.label} · {info.sub}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 14, backgroundColor: VP.accent, borderRadius: 10 }}>
          <Text style={{ fontSize: 13, fontFamily: ff(800), color: '#fff' }}>이어하기</Text>
          <Icon name="arrow-right" size={14} color="#fff" />
        </View>
      </Pressable>
    </View>
  );
}

/* ───── 오늘의 복습 배너 — due 복습이 쌓여 있으면 새 단어 없이 복습만 시작 ───── */
function DueReviewBanner({ count, dispatch }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6 }}>
      <Pressable onPress={() => dispatch({ type: 'START_DUE_REVIEW' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: VP.surface, borderRadius: 16, borderWidth: 1, borderColor: VP.divider, paddingVertical: 12, paddingLeft: 14, paddingRight: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="repeat" size={17} color={VP.accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.02, 14) }}>복습 <Text style={{ color: VP.accent }}>{count}개</Text>가 기다려요</Text>
          <Text numberOfLines={1} style={{ fontSize: 12, color: VP.textSub, marginTop: 1 }}>새 단어 없이 복습만 빠르게 끝내요</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 14, backgroundColor: VP.accent, borderRadius: 10 }}>
          <Text style={{ fontSize: 13, fontFamily: ff(800), color: '#fff' }}>복습</Text>
          <Icon name="arrow-right" size={14} color="#fff" />
        </View>
      </Pressable>
    </View>
  );
}

/* 계단 안착 스프링 — "은은하게 한 번 통". STEP_SPRING 만 바꿔서 에뮬에서 비교.
   damping 낮을수록 더 튐(너무 낮으면 통-통-통 여러 번 흔들려 싸 보임). 셋 다 한 번만 튀게 맞춤. */
const STEP_SPRINGS = {
  soft:   { stiffness: 300, damping: 26, mass: 1 },   // 속삭임 (~1.6px) — 거의 부드러운 안착
  gentle: { stiffness: 290, damping: 21, mass: 1 },   // 은은하게 한 번 통 (~5px)  ★추천
  pop:    { stiffness: 300, damping: 19, mass: 1 },   // 확실한 한 번 통 (~7px)
};
const STEP_SPRING = STEP_SPRINGS.gentle;   // ← 여기만 'soft' / 'gentle' / 'pop' 으로 바꿔 비교

/* ───── 홈 ───── */
export default function Home({ state, dispatch, onOverlay }) {
  const checkedCount = state.checkedCount;
  const currentCheck = Math.min(P_TOTAL, checkedCount + 1);
  const [focused, setFocused] = useState(currentCheck);
  const [popover, setPopover] = useState(null);
  const [contentW, setContentW] = useState(310);
  const lastMoveY = useRef(null);

  const stageStateOf = (n) => (n <= checkedCount ? 'done' : (n === currentCheck ? 'current' : 'locked'));

  // 계단 스택 슬라이드. 이동 중엔 오버슈트 없이 미끄러지고(glide),
  // "가운데로 끌려와 멈출 때"만 스프링으로 은은하게 한 번 통(settle).
  const slide = useRef(new Animated.Value(0)).current;
  const focusedRef = useRef(focused);
  useEffect(() => { focusedRef.current = focused; }, [focused]);
  const lastDir = useRef(1);

  const flingRef = useRef(null);
  const stopFling = () => { if (flingRef.current != null) { cancelAnimationFrame(flingRef.current); flingRef.current = null; } };
  useEffect(() => stopFling, []);

  const springSettle = () => { hTap(); Animated.spring(slide, { toValue: 0, ...STEP_SPRING, useNativeDriver: true }).start(); };

  // 이동 중(드래그·관성 도중): 오버슈트 없이 빠르게 따라붙기만 — 안 튐
  const glide = (delta) => {
    const cur = focusedRef.current;
    const nf = clampStage(cur + delta);
    const applied = nf - cur;
    if (applied === 0) return;
    hSel();   // 걸음 하나 넘을 때마다 디텐트 틱 — 플링 감속하며 "도로로록…록..통"
    focusedRef.current = nf; setFocused(nf); lastDir.current = applied > 0 ? 1 : -1;
    slide.setValue(-applied * P_STRIDE);
    Animated.timing(slide, { toValue: 0, duration: 170, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };

  // 멈출 때: 마지막 한 걸음만 스프링으로 통 (튐 크기는 이동 거리와 무관하게 늘 한 걸음치로 고정)
  const settle = (delta) => {
    const cur = focusedRef.current;
    const nf = clampStage(cur + delta);
    const applied = nf - cur;
    const dir = applied !== 0 ? (applied > 0 ? 1 : -1) : lastDir.current;
    if (applied !== 0) { focusedRef.current = nf; setFocused(nf); lastDir.current = dir; }
    const extra = Math.max(0, Math.abs(applied) - 1);   // 마지막 한 걸음 전까지 글라이드할 거리
    slide.setValue(applied !== 0 ? -applied * P_STRIDE : -dir * 0.3 * P_STRIDE);
    if (extra > 0) {                                     // 멀리 점프: 큰 거리는 글라이드 → 마지막 한 걸음만 스프링 통
      Animated.timing(slide, { toValue: -dir * P_STRIDE, duration: Math.min(460, 150 + extra * 16), easing: Easing.out(Easing.cubic), useNativeDriver: true })
        .start(({ finished }) => { if (finished) springSettle(); });
    } else {
      springSettle();
    }
  };

  // 손을 떼면 속도를 이어받아 관성으로 흐르다 마찰(0.045)로 멈춤 (프로토타입 물리)
  const startFling = (vy) => {
    let rate = (vy * 1000) / P_STRIDE;           // 걸음/초 (스크롤 방향 반대로: 아래로 끌면 focus 증가)
    if (Math.abs(rate) < 7) { settle(0); return; }   // 거의 안 던졌으면 제자리에서 살짝 통
    rate = Math.max(-55, Math.min(55, rate));
    let last = null, acc = 0;
    const spin = (now) => {
      if (last == null) last = now;
      const d = Math.min(0.05, (now - last) / 1000); last = now;
      acc += rate * d;
      let frameDelta = 0;
      while (Math.abs(acc) >= 1) { const dir = acc > 0 ? 1 : -1; acc -= dir; frameDelta += dir; }
      rate *= Math.pow(0.045, d);
      const stopping = Math.abs(rate) <= 4;
      if (frameDelta !== 0) (stopping ? settle : glide)(frameDelta);   // 이동 중엔 glide, 마지막 걸음만 스프링 통
      else if (stopping) settle(0);                                    // 잔여 이동 없이 멈추면 제자리 통
      flingRef.current = stopping ? null : requestAnimationFrame(spin);
    };
    setPopover(null);
    flingRef.current = requestAnimationFrame(spin);
  };

  // PanResponder는 useRef로 첫 렌더에 한 번만 생성돼 그때 클로저가 고정된다 →
  // 핸들러를 최신 ref(panImpl)로 위임해, Fast Refresh 로 glide/settle/STEP_SPRING 을 바꿔도
  // 즉시 반영되고 stale-closure("Property X doesn't exist") redbox 가 안 난다.
  const panImpl = useRef({});
  panImpl.current.grant = () => { stopFling(); lastMoveY.current = null; };
  panImpl.current.move = (g) => {
    if (lastMoveY.current == null) lastMoveY.current = g.moveY;
    const dy = g.moveY - lastMoveY.current;
    if (Math.abs(dy) > 36) { glide(dy > 0 ? 1 : -1); setPopover(null); lastMoveY.current = g.moveY; }
  };
  panImpl.current.release = (g) => { lastMoveY.current = null; startFling(g.vy); };
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (e, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) >= Math.abs(g.dx),
    onPanResponderGrant: () => panImpl.current.grant(),
    onPanResponderMove: (e, g) => panImpl.current.move(g),
    onPanResponderRelease: (e, g) => panImpl.current.release(g),
    onPanResponderTerminate: () => { lastMoveY.current = null; },
  })).current;

  const minN = Math.max(1, focused - P_BELOW - 2);
  const maxN = Math.min(P_TOTAL, focused + P_ABOVE + 2);
  const visible = [];
  for (let n = minN; n <= maxN; n++) visible.push(n);

  const onStepPress = (n) => {
    stopFling();
    if (popover != null) { setPopover(null); if (n !== focused) settle(n - focused); return; }
    if (n === focused) { if (stageStateOf(n) !== 'locked') setPopover(n); }
    else settle(n - focused);
  };

  const dueCount = dueReviewIds(state.boxes, (state.sessionNo || 0) + 1, []).length;   // 오늘(이번 클록) 기준 밀린 복습

  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      {/* 헤더 */}
      <View style={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 24, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.03, 24) }}><Text style={{ color: VP.accent }}>pop</Text>VOCA</Text>
        {/* 오버레이는 '다른 앱 위' 학습 전용 → 홈엔 버튼 없음. 카드 화면 / 설정에서 실행. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: VP.accentSoft, borderRadius: 999 }}>
          <Icon name="star" size={13} color={VP.accent} />
          <Text style={{ marginLeft: 5, fontSize: 13, fontFamily: ff(700), color: VP.accent }}>{(state.points || 0).toLocaleString()}</Text>
        </View>
      </View>
      <DailyGoalCard state={state} dispatch={dispatch} />

      {state.pausedScreen ? <ResumeBanner state={state} dispatch={dispatch} /> : null}
      {!state.pausedScreen && dueCount > 0 ? <DueReviewBanner count={dueCount} dispatch={dispatch} /> : null}

      {/* 계단 */}
      <View {...pan.panHandlers}
        onLayout={(e) => setContentW(e.nativeEvent.layout.width - 40)}
        style={{ flex: 1, overflow: 'hidden', paddingHorizontal: 20 }}>
        <Animated.View style={{ flex: 1, transform: [{ translateY: slide }] }}>
          {visible.map(n => (
            <StepRow key={n} n={n} st={stageStateOf(n)} rel={n - focused} contentW={contentW}
              isUser={n === currentCheck} onPress={() => onStepPress(n)} />
          ))}
          <StagePopover stage={popover} stageState={popover != null ? stageStateOf(popover) : null} dispatch={dispatch} onClose={() => setPopover(null)} />
        </Animated.View>
      </View>

      <TabBar active="home" dispatch={dispatch} />
    </View>
  );
}
