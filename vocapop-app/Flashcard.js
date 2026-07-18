/* VocaPoP 플래시카드 + 카드완료 — design-reference/vp-proto-screens-1.jsx (FlashCardBase, ProtoCardDone) 이식.
   3D 플립(rotateY .55s), 두꺼운 카드 그림자, 앞/뒤면. 동작은 RN 리듀서(2라운드) 그대로. */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Animated, Easing } from 'react-native';
import * as Speech from 'expo-speech';
import { VP, ff, ls, rgba } from './theme';
import { Icon } from './Icon';
import { VPButton, ProtoTopBar, ProtoFooter, SpeakButton, speak, playSfx, hTap, InlineToast, MiniStatRow, useReducedMotion, ListEmpty } from './ui';
import { BY_ID, meaningList, exampleOf, exampleKorOf, TOTAL, dueReviewIds } from './data';
import { UnderlinedKor } from './Quiz';
import WordDetail from './WordDetail';
import * as Overlay from './modules/vocapop-overlay';

/* ───── 플래시카드 ───── */
export function FlashcardScreen({ state, dispatch, onOverlay }) {
  const isR2 = state.cardRound === 2;
  const session = state.cardSession || [];
  const word = isR2 ? BY_ID[state.cardQueue[0]] : (session[state.cardIdx] && BY_ID[session[state.cardIdx].id]);
  const review = !!((session.find(c => word && c.id === word.id) || {}).review);   // 복습 단어 뱃지용
  const sessionLen = session.length || 1;
  const reduced = useReducedMotion();

  const [flipped, setFlipped] = useState(false);
  const [toast, setToast] = useState(null);   // ★R2 재큐잉 피드백 토스트('이 단어는 곧 다시 나와요')
  const flip = useRef(new Animated.Value(0)).current;
  // ★플립 리셋 deps에 cardNonce 추가 — R2에서 같은 id가 재등장해도(잔여 1개 드릴 케이스)
  //   앞면으로 리셋된다. word.id만 보면 카드가 뒤집힌 채(뜻 노출) 다시 나오는 버그가 있었음.
  useEffect(() => { flip.setValue(0); setFlipped(false); }, [word && word.id, state.cardRound, state.cardNonce]);
  // 카드 나올 때마다 발음 자동 재생 — ★nonce deps로 같은 id 재등장에도 재생
  useEffect(() => {
    if (word && state.settings && state.settings.autoPlay) speak(word.word);
  }, [word && word.id, state.cardNonce]);
  useEffect(() => {
    Animated.timing(flip, { toValue: flipped ? 1 : 0, duration: reduced ? 0 : 550, easing: Easing.bezier(0.4, 0.1, 0.2, 1), useNativeDriver: true }).start();
  }, [flipped]);

  // ★카드 전환 모션 — 새 카드가 fade + translateX(24→0) 200ms로 들어와 '넘어갔다'는 신호를 준다.
  //   reduce-motion이면 즉시 표시.
  const inA = useRef(new Animated.Value(1)).current;
  const inX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) { inA.setValue(1); inX.setValue(0); return; }
    inA.setValue(0); inX.setValue(24);
    Animated.parallel([
      Animated.timing(inA, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(inX, { toValue: 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [state.cardNonce]);

  // ★flip 직후 '알아요'에 1→1.02 스프링 1회 — 색 편향 대신 모션으로만 시선 안내 (reduce-motion 시 생략)
  const knowScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!flipped || reduced) { knowScale.setValue(1); return; }
    Animated.sequence([
      Animated.spring(knowScale, { toValue: 1.02, damping: 9, stiffness: 260, useNativeDriver: true }),
      Animated.spring(knowScale, { toValue: 1, damping: 14, stiffness: 260, useNativeDriver: true }),
    ]).start();
  }, [flipped]);

  if (!word) return null;

  const total = isR2 ? (state.cardR2Initial || state.cardQueue.length || 1) : sessionLen;
  const progress = isR2
    ? (((state.cardR2Initial || total) - state.cardQueue.length) / (state.cardR2Initial || total)) * 100
    : ((state.cardIdx + 1) / sessionLen) * 100;
  /* ★'남은 3'→'남은 3개': 단위 없인 뱃지인지 카운트인지 모호 (크리틱 ⑨) */
  const progressLabel = isR2 ? `남은 ${state.cardQueue.length}개` : `${state.cardIdx + 1} / ${sessionLen}`;

  const frontRot = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRot = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const faceBase = {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1.5, borderColor: VP.border, borderRadius: 24,
    paddingHorizontal: 24, paddingVertical: 28,
    backfaceVisibility: 'hidden', overflow: 'hidden',
  };
  const onAnswer = (choice) => {
    // ★R2 재큐잉 피드백 — '아직 어려워요'가 어디로 가는지(곧 재등장) 즉시 알려줌
    if (isR2 && choice === 'dontknow') setToast('이 단어는 곧 다시 나와요');
    dispatch({ type: 'CARD_ANSWER', id: word.id, choice });
  };
  const overlayBtn = Overlay.isSupported() && onOverlay ? () => onOverlay(state.activeStage, true) : undefined;
  // R1에서 한 장이라도 답했으면 '이전 카드'로 정정 가능 (R2 드릴은 큐가 섞여 이전 개념 없음)
  const canPrev = !isR2 && state.cardIdx > 0 && (state.cardHistory || []).length > 0;
  const prevBtn = canPrev ? (
    <Pressable onPress={() => { hTap(); dispatch({ type: 'CARD_PREV' }); }} hitSlop={6}
      accessibilityRole="button" accessibilityLabel="이전 카드로 돌아가 답 정정"
      style={{
        width: 56, height: 56, borderRadius: 16, backgroundColor: VP.surface2,
        borderWidth: 1.5, borderColor: VP.border, alignItems: 'center', justifyContent: 'center',
      }}>
      <Icon name="arrow-left" size={20} color={VP.textSub} />
    </Pressable>
  ) : null;
  // ★푸터 고정 그리드 [56][flex1][flex1] — prevBtn이 없어도 56px 투명 슬롯 유지.
  //   카드마다 '알아요' 좌표가 흔들리면 반복 탭 리듬이 깨진다(좌표 기억 기반 조작).
  const slot56 = prevBtn || <View style={{ width: 56 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <ProtoTopBar
        onBack={() => dispatch({ type: 'PAUSE' })}
        icon={<Icon name="cards" size={16} color={VP.text} />}
        label={isR2 ? '플래시카드 · 2라운드' : '플래시카드'}
        right={progressLabel}
        progress={progress}
        progressColor={isR2 ? VP.accent : VP.text}
        onOverlay={overlayBtn}
      />

      {/* 카드 무대 — 전환 인 애니메이션 래퍼 */}
      <Animated.View style={{ flex: 1, marginHorizontal: 20, marginTop: 8, marginBottom: 12, opacity: inA, transform: [{ translateX: inX }] }}>
        <Pressable onPress={() => { hTap(); playSfx('flip'); setFlipped(f => !f); }} style={{ flex: 1 }}
          accessibilityRole="button"
          accessibilityLabel={flipped ? `${word.word} 뜻 카드 — 탭하면 앞면으로` : `${word.word} 카드 — 탭해 뜻 보기`}>
          {/* 카드 바닥 그림자 (0 4px 0 0 cardShade) */}
          <View style={{ position: 'absolute', left: 0, right: 0, top: 4, bottom: -4, borderRadius: 24, backgroundColor: VP.cardShade }} />
          {/* 앞면 — ★안 보이는 면은 스크린리더에서 숨김 + 터치도 차단(겹친 면의 버튼 오탭 방지) */}
          <Animated.View
            pointerEvents={flipped ? 'none' : 'auto'}
            importantForAccessibility={flipped ? 'no-hide-descendants' : 'auto'}
            accessibilityElementsHidden={flipped}
            style={[faceBase, { backgroundColor: VP.bg, transform: [{ perspective: 1400 }, { rotateY: frontRot }] }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: isR2 ? VP.accent : VP.surface }}>
                <Text style={{ fontSize: 11, fontFamily: ff(700), color: isR2 ? '#fff' : VP.textSub, letterSpacing: ls(0.02, 11) }}>{isR2 ? '2R · 다시' : '1R'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* ★한글 배지 10px+800은 획이 뭉개짐 → 11/700. accentSoft 위 작은 핑크는 accentAA로 AA 확보 */}
                {review && <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: VP.accentSoft, marginRight: 6 }}><Text style={{ fontSize: 11, fontFamily: ff(700), color: VP.accentAA }}>복습</Text></View>}
                {/* ★#번호는 의도적 저강조 장식 → textFaint (textMute 1.6:1은 장식조차 안 보임) */}
                <Text style={{ fontSize: 11, fontFamily: ff(600), color: VP.textFaint }}>#{String(word.id).padStart(3, '0')}</Text>
              </View>
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 11, fontStyle: 'italic', color: VP.textFaint, marginBottom: 12 }}>{word.pos}</Text>
              <Text style={{ fontSize: 44, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.03, 44), textAlign: 'center' }}>{word.word}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
                {/* ★발음기호 textMute→textSub — 학습 정보인데 1.6:1로 안 보였음 */}
                {word.pronunciation ? <Text style={{ fontSize: 14, color: VP.textSub }}>{word.pronunciation}</Text> : null}
                <SpeakButton text={word.word} size={34} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: VP.textSub, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                <Icon name="rotate" size={13} color={VP.textSub} />
              </View>
              {/* ★안내 문구 textMute→textSub + '무엇이 나오는지'를 말하는 문장으로 */}
              <Text style={{ fontSize: 13, color: VP.textSub }}>카드를 탭해 뜻 보기</Text>
            </View>
          </Animated.View>
          {/* 뒷면 */}
          <Animated.View
            pointerEvents={flipped ? 'auto' : 'none'}
            importantForAccessibility={flipped ? 'auto' : 'no-hide-descendants'}
            accessibilityElementsHidden={!flipped}
            style={[faceBase, { backgroundColor: VP.surface, transform: [{ perspective: 1400 }, { rotateY: backRot }] }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: VP.bg }}>
                <Text style={{ fontSize: 11, fontFamily: ff(700), color: VP.textSub, letterSpacing: ls(0.02, 11) }}>뒷면</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {review && <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: VP.accentSoft, marginRight: 6 }}><Text style={{ fontSize: 11, fontFamily: ff(700), color: VP.accentAA }}>복습</Text></View>}
                <Text style={{ fontSize: 11, fontFamily: ff(600), color: VP.textFaint }}>#{String(word.id).padStart(3, '0')}</Text>
              </View>
            </View>
            <View style={{ flex: 1, paddingTop: 8 }}>
              <View style={{ marginBottom: 18 }}>
                <Text style={{ fontSize: 11, fontStyle: 'italic', color: VP.textFaint, marginBottom: 6 }}>{word.pos}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ flex: 1, fontSize: 28, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 28) }}>{word.word}</Text>
                  <SpeakButton text={word.word} size={34} />
                </View>
                {word.pronunciation ? <Text style={{ fontSize: 13, color: VP.textSub, marginTop: 2 }}>{word.pronunciation}</Text> : null}
              </View>
              <View style={{ gap: 8 }}>
                {meaningList(word).map((m, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: VP.accent, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                      <Text style={{ fontSize: 11, fontFamily: ff(700), color: '#fff' }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 18, fontFamily: ff(600), color: VP.text, letterSpacing: ls(-0.02, 18) }}>{m}</Text>
                  </View>
                ))}
              </View>
              {/* ★marginTop 'auto'→24: 예문이 카드 바닥에 붙어 뜻과 ~550px 찢어져 있었음 — 뜻에 이어 한 흐름으로 */}
              {!!exampleOf(word) && (
                <View style={{ marginTop: 24, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: VP.bg, borderRadius: 12, borderWidth: 1, borderColor: VP.divider }}>
                  <Text style={{ fontSize: 14, color: VP.textSub, fontStyle: 'italic', lineHeight: 21 }}>"{exampleOf(word)}"</Text>
                  {exampleKorOf(word) ? (
                    <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: VP.divider }}>
                      <UnderlinedKor text={exampleKorOf(word)} style={{ fontSize: 13, color: VP.textSub, lineHeight: 19 }} />
                    </View>
                  ) : null}
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
              <Icon name="rotate" size={12} color={VP.textSub} />
              <Text style={{ fontSize: 12, color: VP.textSub, marginLeft: 6 }}>탭하면 앞면으로</Text>
            </View>
            {/* ★R2 보류 — 안 외워지는 한 단어가 드릴 완주를 막지 않게 '나중에'로 큐에서 빼는 탈출구.
                박스는 이미 1이라 다음 세션 복습으로 자연 재등장(학습 루프에서 사라지지 않음) */}
            {isR2 ? (
              <Pressable onPress={() => { hTap(); dispatch({ type: 'CARD_DEFER' }); }} hitSlop={8}
                accessibilityRole="button" accessibilityLabel="이 단어는 나중에 — 오늘 드릴에서 보류"
                style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, fontFamily: ff(600), color: VP.textSub }}>이 단어는 나중에</Text>
              </Pressable>
            ) : null}
          </Animated.View>
        </Pressable>
      </Animated.View>

      {/* 푸터 — 고정 그리드 [56 슬롯][flex1][flex1] gap 10 (R1·R2 동일) */}
      {flipped ? (
        <ProtoFooter>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {slot56}
            <VPButton variant="default" full={false} style={{ flex: 1 }} label={isR2 ? '아직 어려워요' : '몰라요'} onPress={() => onAnswer('dontknow')} />
            {/* ★'알아요' accent→okSoft — CTA급 채도가 답을 '알아요' 쪽으로 유도했음. 정오 semantic만 남긴다 */}
            <Animated.View style={{ flex: 1, transform: [{ scale: knowScale }] }}>
              <VPButton variant="okSoft" label={isR2 ? '기억했어요!' : '알아요'} onPress={() => onAnswer('know')} />
            </Animated.View>
          </View>
        </ProtoFooter>
      ) : (
        <ProtoFooter>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {slot56}
            <VPButton variant="primary" full={false} style={{ flex: 1 }} label="뜻 보기" iconRight="rotate" onPress={() => { playSfx('flip'); setFlipped(true); }} />
          </View>
        </ProtoFooter>
      )}

      <InlineToast text={toast} duration={1200} bottom={104} onDone={() => setToast(null)} />
    </View>
  );
}

/* ★진입 연출용 페이드업 래퍼 — delay 스태거, reduce-motion이면 즉시 표시 */
function FadeUp({ delay = 0, reduced, style, children }) {
  const a = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) { a.setValue(1); return; }
    Animated.timing(a, { toValue: 1, duration: 260, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [reduced]);
  return (
    <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/* ───── 카드 완료 ───── */
export function CardDoneScreen({ state, dispatch }) {
  const stage = state.activeStage;
  const reviewN = (state.cardSession || []).filter(c => c.review).length;
  const reduced = useReducedMotion();
  const knowN = Object.values(state.cardResults || {}).filter(r => r === 'know').length;
  const relearnN = state.cardR2Initial || 0;   // 2R 드릴을 돈 단어 수 = '다시 봐서 외운' 수
  // ★+NP는 실제 적립액 — 세션 시작 스냅샷(cardPointsBase)과의 차. 라벨 계산으로 부풀리지 않는다
  const earned = Math.max(0, (state.points || 0) - (state.cardPointsBase || 0));
  // ★종점 가드 — 마지막 걸음이면 '다음 걸음'이 없다. due 복습이 있으면 그 길을 soft로 안내
  const atEnd = stage >= TOTAL;
  const dueN = atEnd ? dueReviewIds(state.boxes, (state.sessionNo || 0) + 1, []).length : 0;

  // ★진입 연출 — 체크 스프링 + okSoft 확산 링 1회 + 스태거 페이드업.
  //   sfx·햅틱은 리듀서 finishCard가 이미 울렸으므로 여기선 시각 연출만 (중복 금지)
  const iconS = useRef(new Animated.Value(reduced ? 1 : 0.5)).current;
  const ringS = useRef(new Animated.Value(1)).current;
  const ringO = useRef(new Animated.Value(reduced ? 0 : 0.5)).current;
  useEffect(() => {
    if (reduced) { iconS.setValue(1); ringO.setValue(0); return; }
    Animated.spring(iconS, { toValue: 1, damping: 12, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.timing(ringS, { toValue: 96 / 76, duration: 500, useNativeDriver: true }),   // 76→96 확산
      Animated.timing(ringO, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [reduced]);

  const statItems = [{ n: knowN, label: '알아요' }];
  if (relearnN > 0) statItems.push({ n: relearnN, label: '다시 봐서 외움' });
  statItems.push({ n: `+${earned}P`, label: '포인트', color: VP.accentAA });

  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      {/* ★right '체크 완료' 제거 — 타이틀·트랙 카드와 같은 말 3번 반복이었음 */}
      <ProtoTopBar onBack={() => dispatch({ type: 'GO', screen: 'home' })} icon={<Icon name="cards" size={16} color={VP.text} />} label="플래시카드" />
      {/* ★pH 24→20: 화면 기본 패딩과 통일. 서브타이틀 둘째 문장 삭제 — 버튼이 이미 그 선택지를 말하고 있어 같은 메시지가 3번 반복됐음 */}
      {/* ★정중앙→상단 40% 앵커(스페이서 0.8:1.2) — 성과 카드가 하단 공백을 흡수해 무게중심이 안정 */}
      <View style={{ flex: 1, paddingHorizontal: 20, alignItems: 'center' }}>
        <View style={{ flex: 0.8 }} />
        <View style={{ width: 76, height: 76, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', width: 76, height: 76, borderRadius: 38, backgroundColor: VP.okSoft, opacity: ringO, transform: [{ scale: ringS }] }} />
          <Animated.View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: VP.okSoft, alignItems: 'center', justifyContent: 'center', transform: [{ scale: iconS }] }}>
            <Icon name="check" size={38} color={VP.ok} strokeWidth={2.5} />
          </Animated.View>
        </View>
        <FadeUp reduced={reduced} delay={60} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 24), marginTop: 16 }}>{stage}걸음 체크 완료!</Text>
          <Text style={{ fontSize: 14, color: VP.textSub, marginTop: 6, textAlign: 'center', lineHeight: 21 }}>새 단어 20개{reviewN > 0 ? ` + 복습 ${reviewN}개` : ''}를 다 훑었어요</Text>
        </FadeUp>
        <FadeUp reduced={reduced} delay={120} style={{ width: '100%', maxWidth: 300, marginTop: 16 }}>
          <MiniStatRow items={statItems} style={{ marginBottom: 10 }} />
        </FadeUp>
        <FadeUp reduced={reduced} delay={180} style={{ width: '100%', maxWidth: 300 }}>
          <View style={{ padding: 16, backgroundColor: VP.surface, borderRadius: VP.rLg, gap: 10 }}>
            {/* ★'체크/카드 학습 완료' 중복 정리 — 행이 한 일(카드 학습)과 결과(20단어 훑기)를 말하게 */}
            <TrackRow done label="카드 학습" sub="20단어 훑기 끝" />
            <TrackRow label="퀴즈 점검" sub="5분 · 안 해도 진도는 저장돼요" />
          </View>
        </FadeUp>
        <View style={{ flex: 1.2 }} />
      </View>
      <ProtoFooter>
        <VPButton variant="accent" icon="pencil" label="퀴즈로 점검하기" onPress={() => dispatch({ type: 'START_QUIZ', stage })} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {atEnd ? (
            dueN > 0 ? (
              <VPButton variant="soft" full={false} style={{ flex: 1 }} label="복습으로 다지기" onPress={() => dispatch({ type: 'START_DUE_REVIEW' })} />
            ) : null
          ) : (
            /* ★'다음 걸음 체크'→'다음 20단어 시작' — 누르면 뭐가 되는지 그대로 말하는 라벨 */
            <VPButton variant="default" full={false} style={{ flex: 1 }} label="다음 20단어 시작" onPress={() => dispatch({ type: 'START_CARD', stage: state.checkedCount + 1 })} />
          )}
          {/* ★ghost로 강등 — 성격이 정반대인 두 액션(새 학습 시작 vs 세션 종료)이 같은 무게였음 → accent/default/ghost 3단 위계 */}
          <VPButton variant="ghost" full={false} style={{ flex: 1 }} label="홈으로" onPress={() => dispatch({ type: 'GO', screen: 'home' })} />
        </View>
      </ProtoFooter>
    </View>
  );
}

function TrackRow({ done, label, sub }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, marginRight: 11, alignItems: 'center', justifyContent: 'center',
        // ★미완 표시는 '비활성' — textMute(1.6:1)→textFaint(3:1)로 존재는 보이게
        backgroundColor: done ? VP.ok : 'transparent', borderWidth: done ? 0 : 1.5, borderColor: VP.textFaint, borderStyle: done ? 'solid' : 'dashed' }}>
        <Icon name={done ? 'check-bold' : 'pencil'} size={done ? 14 : 13} color={done ? '#fff' : VP.textFaint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontFamily: ff(700), color: done ? VP.text : VP.textSub, letterSpacing: ls(-0.02, 14) }}>{label}</Text>
        {/* ★sub textMute→textSub — 다음 행동의 비용을 설명하는 안내 문구라 읽혀야 한다 */}
        <Text style={{ fontSize: 12, color: VP.textSub, marginTop: 1 }}>{sub}</Text>
      </View>
      {done && <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: VP.okSoft }}><Text style={{ fontSize: 11, fontFamily: ff(700), color: VP.okDeep }}>완료</Text></View>}
    </View>
  );
}

/* ───── 단어 미리보기 (카드 전 20단어 훑기) ───── */
function PreviewSectionHeader({ label }) {
  return <Text style={{ fontSize: 12, fontFamily: ff(700), color: VP.textSub, letterSpacing: ls(0.02, 12), marginTop: 16, marginBottom: 8 }}>{label}</Text>;
}

function PreviewRow({ w, review, active, onPress, onLayout }) {
  return (
    /* ★행 전체가 상세로 가는 문 — 스피커만 탭 가능하던 행을 Pressable로. pressed 시 surface2 */
    <Pressable onPress={() => { hTap(); onPress(); }} onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={`${w.word}${review ? ', 복습 단어' : ''} — 탭해서 상세 보기`}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8,
        backgroundColor: pressed ? VP.surface2 : VP.surface, borderRadius: VP.rMd, overflow: 'hidden',
      })}>
      {/* ★전체 듣기 현재 행 인디케이터 — 좌측 2px accent 바 */}
      {active ? <View style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 2, borderRadius: 1, backgroundColor: VP.accent }} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 17, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.01, 17) }}>{w.word}</Text>
          {/* ★품사는 저강조 장식 → textFaint */}
          <Text style={{ fontSize: 11, color: VP.textFaint, fontStyle: 'italic' }}>{w.pos}</Text>
          {review ? (
            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: VP.rPill, backgroundColor: VP.accentSoft }}>
              <Text style={{ fontSize: 11, fontFamily: ff(700), color: VP.accentAA }}>복습</Text>
            </View>
          ) : null}
        </View>
        {/* ★뜻 1줄 고정 — 행 높이가 균일해야 훑기(스캔) 리듬이 생긴다. 전체 뜻은 행 탭 → 상세에서 */}
        <Text numberOfLines={1} style={{ fontSize: 13, color: VP.textSub, marginTop: 2, lineHeight: 18 }}>{meaningList(w).join(' · ')}</Text>
      </View>
      {/* 스피커는 자체 Pressable이 터치를 소비 — 행 탭(상세 열기)으로 전파되지 않는다 */}
      <SpeakButton text={w.word} size={32} />
    </Pressable>
  );
}

export function PreviewScreen({ state, dispatch }) {
  const session = state.cardSession || [];
  // ★2그룹 청킹 — '# 순번 나열' 대신 이번 세션의 구조(새 단어/복습)를 리스트가 직접 보여준다. id 순 정렬로 훑기 안정화
  const newWords = useMemo(() => session.filter(c => !c.review).map(c => BY_ID[c.id]).filter(Boolean).sort((a, b) => a.id - b.id), [session]);
  const reviewWords = useMemo(() => session.filter(c => c.review).map(c => BY_ID[c.id]).filter(Boolean).sort((a, b) => a.id - b.id), [session]);
  const allWords = useMemo(() => [...newWords, ...reviewWords], [newWords, reviewWords]);

  const [detail, setDetail] = useState(null);
  const [playIdx, setPlayIdx] = useState(-1);   // -1 = 정지, 0.. = 전체 듣기 현재 행
  const playing = playIdx >= 0;
  const scrollRef = useRef(null);
  const rowY = useRef({});   // 행 flat index → contentContainer 기준 y (전체 듣기 scrollTo용)

  // ★전체 듣기 — 1.8s 간격 순차 speak + 현재 행으로 스크롤. 타이머는 effect cleanup이 정리
  useEffect(() => {
    if (playIdx < 0) return;
    if (playIdx >= allWords.length) { setPlayIdx(-1); return; }
    speak(allWords[playIdx].word);
    const y = rowY.current[playIdx];
    if (scrollRef.current && y != null) { try { scrollRef.current.scrollTo({ y: Math.max(0, y - 140), animated: true }); } catch (e) {} }
    const t = setTimeout(() => setPlayIdx(i => (i < 0 ? -1 : i + 1)), 1800);
    return () => clearTimeout(t);
  }, [playIdx]);
  // 언마운트 시 재생 중이던 TTS 정리
  useEffect(() => () => { try { Speech.stop(); } catch (e) {} }, []);

  const stopPlay = () => { setPlayIdx(-1); try { Speech.stop(); } catch (e) {} };
  const togglePlay = () => { hTap(); if (playing) stopPlay(); else if (allWords.length) setPlayIdx(0); };
  // ★상세를 열면 전체 듣기 정지 — 상세의 발음 버튼과 TTS가 겹치지 않게
  const openDetail = (w) => { if (playing) stopPlay(); setDetail(w); };

  // ★빈 stage 가드 — 새 단어 0 + 복습 0이면 시작할 카드가 없다. 다음 행동(복습)으로 안내
  if (allWords.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: VP.bg }}>
        <ProtoTopBar onBack={() => dispatch({ type: 'PAUSE' })} icon={<Icon name="book-open" size={16} color={VP.text} />} label={`미리보기 · ${state.activeStage}걸음째`} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ListEmpty icon="book-open" title="모든 걸음을 마쳤어요" sub="이제 복습으로 다져요"
            cta={{ icon: 'repeat', label: '복습으로 다지기', onClick: () => dispatch({ type: 'START_DUE_REVIEW' }) }} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <ProtoTopBar onBack={() => dispatch({ type: 'PAUSE' })} icon={<Icon name="book-open" size={16} color={VP.text} />} label={`미리보기 · ${state.activeStage}걸음째`} />
      <View style={{ paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 22) }}>이번에 외울 {newWords.length}단어</Text>
          {/* ★복습 문구 제거 — 복습은 아래 섹션 헤더가 구조로 말해준다 */}
          <Text style={{ fontSize: 13, color: VP.textSub, marginTop: 4, lineHeight: 19 }}>가볍게 훑어보기 — 다 외우지 않아도 OK</Text>
        </View>
        {/* ★전체 듣기 pill — height 32 + hitSlop 6으로 44px 터치 타깃 확보. accentSoft 위 텍스트는 accentAA */}
        <Pressable onPress={togglePlay} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button" accessibilityLabel={playing ? '전체 듣기 정지' : '전체 듣기'} accessibilityState={{ selected: playing }}
          style={{ height: 32, paddingHorizontal: 12, borderRadius: VP.rPill, backgroundColor: VP.accentSoft, flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 10, marginBottom: 2 }}>
          <Icon name="speaker" size={13} color={VP.accentAA} />
          <Text style={{ fontSize: 13, fontFamily: ff(700), color: VP.accentAA }}>{playing ? '정지' : '전체 듣기'}</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          {newWords.length > 0 ? <PreviewSectionHeader label={`새 단어 ${newWords.length}`} /> : null}
          {newWords.map((w, i) => (
            <PreviewRow key={w.id} w={w} active={playIdx === i}
              onLayout={e => { rowY.current[i] = e.nativeEvent.layout.y; }}
              onPress={() => openDetail(w)} />
          ))}
          {reviewWords.length > 0 ? <PreviewSectionHeader label={`복습 ${reviewWords.length}`} /> : null}
          {reviewWords.map((w, i) => {
            const fi = newWords.length + i;
            return (
              <PreviewRow key={w.id} w={w} review active={playIdx === fi}
                onLayout={e => { rowY.current[fi] = e.nativeEvent.layout.y; }}
                onPress={() => openDetail(w)} />
            );
          })}
        </ScrollView>
        {/* ★스크롤 단서 — 하단 24px 페이드. 그라데이션 의존성 없이 rgba(bg) 3겹으로 근사 */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 24 }}>
          <View style={{ flex: 1, backgroundColor: rgba(VP.bg, 0.25) }} />
          <View style={{ flex: 1, backgroundColor: rgba(VP.bg, 0.55) }} />
          <View style={{ flex: 1, backgroundColor: rgba(VP.bg, 0.9) }} />
        </View>
      </View>
      <ProtoFooter>
        <VPButton variant="accent" label="카드로 시작" iconRight="arrow-right" onPress={() => { if (playing) stopPlay(); dispatch({ type: 'GO', screen: 'card' }); }} />
      </ProtoFooter>

      {/* 행 탭 → 단어 상세 (즐겨찾기·박스 상태 등 기존 동작 그대로) */}
      {detail ? (
        <WordDetail
          word={detail}
          isFav={(state.favorites || []).includes(detail.id)}
          ivl={(state.boxes && state.boxes[detail.id] && state.boxes[detail.id].ivl) || 0}
          onToggleFav={() => dispatch({ type: 'TOGGLE_FAV', id: detail.id })}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </View>
  );
}

/* ───── 1라운드 끝 → 2라운드 전환 ───── */
export function CardR1EndScreen({ state, dispatch }) {
  const count = state.cardQueue.length;
  const results = state.cardResults || {};
  const knowN = Object.values(results).filter(r => r === 'know').length;
  const dontN = Object.values(results).filter(r => r === 'dontknow').length;
  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <ProtoTopBar onBack={() => dispatch({ type: 'PAUSE' })} icon={<Icon name="cards" size={16} color={VP.text} />} label="플래시카드" right="1R 완료" />
      <View style={{ flex: 1, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="repeat" size={36} color={VP.accent} />
        </View>
        {/* ★'다 외울 때까지'(막연한 각오)→남은 일의 크기를 말하는 타이틀 */}
        <Text style={{ fontSize: 22, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 22) }}>몰랐던 {count}개만 한 번 더</Text>
        {/* ★실패 수 강조 accent→text/700 — 핑크는 '경고'로 읽혔음. 중립 강조로 톤 다운 */}
        <Text style={{ fontSize: 15, color: VP.textSub, lineHeight: 24, textAlign: 'center', maxWidth: 280 }}>
          <Text style={{ color: VP.text, fontFamily: ff(700) }}>기억했어요</Text>를 누를 때까지 반복해요{'\n'}— <Text style={{ color: VP.text, fontFamily: ff(700) }}>{count}개</Text>면 금방이에요
        </Text>
        {/* ★1R 정오 요약 — 방금 한 일의 결과를 숫자로 확인시켜 2R 동기 부여 */}
        <MiniStatRow items={[{ n: knowN, label: '알아요' }, { n: dontN, label: '몰라요' }]} style={{ width: '100%', maxWidth: 300 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: VP.surface, borderRadius: 12 }}>
          <Icon name="lightbulb" size={14} color={VP.textSub} />
          <Text style={{ fontSize: 12, color: VP.textSub, fontFamily: ff(500) }}>아직 어려운 단어는 다시 등장해요</Text>
        </View>
      </View>
      <ProtoFooter>
        {/* ★질문형 CTA('이제 다 외워볼까요')는 누르면 뭐가 되는지 모호 → 동작을 그대로 말하는 라벨 */}
        <VPButton variant="accent" label="2라운드 시작" iconRight="arrow-right" onPress={() => dispatch({ type: 'START_CARD_R2' })} />
      </ProtoFooter>
    </View>
  );
}
