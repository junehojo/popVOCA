/* VocaPoP 결과 — design-reference/vp-proto-screens-2.jsx (ResultScore) 이식 + 리디자인.
   도넛 점수(카운트업) + 스탯 + 오답 리스트(즉시 저장·복습 루프) + 맥락형 CTA. */
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Animated, Easing, Pressable, ScrollView, Dimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { VP, ff, ls } from './theme';
import { Icon } from './Icon';
import { VPButton, ProtoFooter, SpeakButton, useReducedMotion } from './ui';
import { wordsForStage, BY_ID, meaningList, TOTAL } from './data';
import WordDetail from './WordDetail';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SCREEN_H = Dimensions.get('window').height;

/* ★일회성 컨페티 — 만점/재도전 완주의 '해결' 순간에만. 새 의존성 없이 Animated 12개 파티클 낙하+회전 1.2s.
   pointerEvents none이라 터치 방해 없음. reduce-motion 사용자는 호출부에서 렌더 자체를 생략. */
function Confetti() {
  // ★useState 이니셜라이저로 1회만 생성 — useRef(expr)는 매 렌더 expr을 평가해 랜덤이 낭비됨
  const [parts] = useState(() => Array.from({ length: 12 }, (_, i) => ({
    x: 8 + Math.random() * 244,
    delay: Math.random() * 280,
    rot: (180 + Math.random() * 360) * (Math.random() < 0.5 ? -1 : 1),
    w: 6 + Math.round(Math.random() * 4),
    color: [VP.accent, VP.ok, VP.accentSoft][i % 3],
    a: new Animated.Value(0),
  })));
  useEffect(() => {
    Animated.parallel(parts.map(p =>
      Animated.timing(p.a, { toValue: 1, duration: 1200, delay: p.delay, easing: Easing.in(Easing.quad), useNativeDriver: true })
    )).start();
  }, []);
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: -50, top: -34, width: 260, height: 220 }}>
      {parts.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: p.x, top: 0,
          width: p.w, height: Math.round(p.w * 1.6), borderRadius: 2, backgroundColor: p.color,
          opacity: p.a.interpolate({ inputRange: [0, 0.08, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: p.a.interpolate({ inputRange: [0, 1], outputRange: [0, 210] }) },
            { rotate: p.a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
          ],
        }} />
      ))}
    </View>
  );
}

function Donut({ value, reduced }) {
  const r = 60, c = 2 * Math.PI * r;
  const prog = useRef(new Animated.Value(0)).current;
  // ★중앙 숫자 카운트업 — 링만 차오르고 숫자는 즉시 박혀 있어 모션이 분리돼 보였음.
  //   같은 Animated.Value의 listener로 숫자를 링과 동기(750ms). reduce-motion이면 즉시 최종값.
  const [disp, setDisp] = useState(0);
  useEffect(() => {
    if (reduced) { prog.setValue(value); setDisp(value); return; }
    const sub = prog.addListener(({ value: v }) => setDisp(Math.round(v)));
    Animated.timing(prog, { toValue: value, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => prog.removeListener(sub);
  }, [value, reduced]);
  const offset = prog.interpolate({ inputRange: [0, 100], outputRange: [c, 0], extrapolate: 'clamp' });
  // ★80% 이상이면 링을 초록으로 — 65%와 100%가 같은 핑크라 '잘했다'는 상향 보상이 없었음 (낮은 점수는 중립 유지, 빨강 처벌은 과함)
  const ring = value >= 80 ? VP.ok : VP.accent;
  return (
    <View style={{ width: 160, height: 160 }}>
      <Svg width={160} height={160} viewBox="0 0 160 160">
        <Circle cx={80} cy={80} r={r} stroke={VP.surface2} strokeWidth={14} fill="none" />
        <AnimatedCircle cx={80} cy={80} r={r} stroke={ring} strokeWidth={14} fill="none"
          strokeDasharray={`${c}`} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 80 80)" />
      </Svg>
      <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 44, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.04, 44) }}>{disp}</Text>
        <Text style={{ fontSize: 12, color: VP.textMute, fontFamily: ff(600), marginTop: 2 }}>정확도 %</Text>
      </View>
    </View>
  );
}

/* ★보더 추가(통계 StatCard와 동일 규칙: 단독 카드는 divider 보더), 라벨 옆 아이콘 지원('획득 ⭐' 이모지 제거용) */
function Stat({ label, value, color, icon }) {
  return (
    <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, backgroundColor: VP.surface, borderRadius: 12, borderWidth: 1, borderColor: VP.divider, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {icon ? <Icon name={icon} size={14} color={color} /> : null}
        <Text style={{ fontSize: 20, fontFamily: ff(800), color, letterSpacing: ls(-0.025, 20) }}>{value}</Text>
      </View>
      <Text numberOfLines={1} style={{ fontSize: 11, color: VP.textSub, fontFamily: ff(600), marginTop: 2 }}>{label}</Text>
    </View>
  );
}

/* 오답 행 — 높이 56 surface 카드. 탭=상세, 우측 발음+★즐겨찾기 토글 */
function WrongRow({ w, isFav, onOpen, onToggleFav }) {
  const first = meaningList(w)[0] || '';
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${w.word}, ${first}, 상세 보기`}
      style={{
        height: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14, paddingRight: 8,
        backgroundColor: VP.surface, borderRadius: VP.rMd, borderWidth: 1, borderColor: VP.divider,
      }}>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 16, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.01, 16) }}>{w.word}</Text>
        <Text numberOfLines={1} style={{ fontSize: 13, color: VP.textSub, marginTop: 1 }}>{first}</Text>
      </View>
      <SpeakButton text={w.word} size={28} />
      {/* ★즐겨찾기 즉시 토글 — 상세를 열지 않고도 '나중에 볼 단어'로 저장. 36×44 + hitSlop으로 44px 타깃 */}
      <Pressable onPress={onToggleFav} hitSlop={{ top: 4, bottom: 4, left: 4, right: 6 }}
        accessibilityRole="button" accessibilityLabel={`${w.word} 즐겨찾기`} accessibilityState={{ selected: !!isFav }}
        style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={isFav ? 'star' : 'star-line'} size={20} color={isFav ? VP.accent : VP.textFaint} />
      </Pressable>
    </Pressable>
  );
}

export function ResultScore({ state, dispatch }) {
  const vals = Object.values(state.quizResults);
  const right = vals.filter(r => r === 'o').length;
  const wrong = vals.filter(r => r === 'x').length;
  const total = (state.quizQueue && state.quizQueue.length) || wordsForStage(state.activeStage).length;
  const acc = total ? Math.round((right / total) * 100) : 0;
  // ★earned=right*5 계산 폐기 — 힌트 정답(적립 0)·재도전 등과 어긋났음. 리듀서가 집계한 실제 적립 합을 표시.
  const earned = state.sessionEarned || 0;
  const hints = state.quizHintCount || 0;
  // ★재도전 완주(mastery loop) — 1R에서 틀렸던 문항을 2R에서 전부 맞히고 온 경우.
  //   점수(acc)는 첫 시도 기준 그대로 두고, "끝내 다 맞혔다"는 성취를 별도 배지로 보상.
  const redeemed = (state.quizRetryInitial || 0) > 0 && (!state.quizRetry || state.quizRetry.length === 0);
  // ★판정 카피를 전진 프레임으로 — '연습 더 해요'류 하향 판정 대신 다음 행동을 가리키는 문장
  const title = acc === 100 ? '완벽해요!'
    : acc >= 80 ? '훌륭해요'
    : acc >= 60 ? `${acc}% — ${wrong}개만 더 잡으면 돼요`
    : '다시 만나면 이길 수 있어요';

  const reduced = useReducedMotion();
  const [detail, setDetail] = useState(null);

  // 오답 리스트 데이터 — 1R 기준(quizResults). 재도전으로 해결됐어도 '이번에 틀렸던 단어'로 노출해 저장 루프 제공.
  const wrongWords = (state.quizQueue || []).filter(id => state.quizResults[id] === 'x').map(id => BY_ID[id]).filter(Boolean);
  const favSet = new Set(state.favorites || []);
  const allSaved = wrongWords.length > 0 && wrongWords.every(w => favSet.has(w.id));
  const saveAll = () => wrongWords.forEach(w => { if (!favSet.has(w.id)) dispatch({ type: 'TOGGLE_FAV', id: w.id }); });

  const celebrate = (acc === 100 || redeemed) && !reduced;
  const listScrolls = wrongWords.length > 4;   // 4행 초과 시 화면 34% 높이로 스크롤 + 하단 페이드

  // CTA 분기 — 오답이 남아 있으면 복습이 1순위, 해결됐으면 다음 진도가 1순위
  const showWrongCta = wrong > 0 && !redeemed;
  const canNext = state.quizReturn === 'home' && state.activeStage < TOTAL;
  const backLabel = state.quizReturn === 'vocab' ? '단어장으로' : '홈으로';
  const goBack = () => dispatch({ type: 'GO', screen: state.quizReturn || 'home' });

  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      {/* ★센터 그룹을 상단 앵커(paddingTop 32)로 전환 — 수직 중앙 배치로는 오답 리스트가 들어갈 공간이 없었음 */}
      <View style={{ flex: 1, alignItems: 'center', paddingTop: 32, paddingHorizontal: 20, gap: 14 }}>
        {/* ★도넛+타이틀+스탯을 하나의 accessible 그룹으로 — 스크린리더가 숫자 파편 대신 한 문장으로 읽음 */}
        <View accessible accessibilityLabel={`정확도 ${acc}퍼센트, 정답 ${right}, 오답 ${wrong}, 포인트 ${earned}점 적립`}
          style={{ alignItems: 'center', gap: 14, width: '100%' }}>
          {/* ★오버라인 textMute→textSub — 기능 안내 텍스트 대비 규칙(S1) */}
          <Text style={{ fontSize: 12, color: VP.textSub, fontFamily: ff(700), marginBottom: 2 }}>퀴즈 점검 결과</Text>
          <View style={{ width: 160, height: 160 }}>
            {celebrate ? <Confetti /> : null}
            <Donut value={acc} reduced={reduced} />
          </View>
          {/* ★타이틀+배지를 gap 10 서브그룹으로 — 배지 marginTop:-4 매직넘버 제거 */}
          <View style={{ alignItems: 'center', gap: 10 }}>
            {/* ★28→24: 문장형 판정 카피(60~79 구간)가 들어오면서 28px는 2줄 강제 — 한 단계 낮춰 1줄 유지 여지 확보 */}
            <Text style={{ fontSize: 24, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 24), textAlign: 'center' }}>{title}</Text>
            {redeemed ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: VP.okSoft }}>
                <Icon name="check-bold" size={13} color={VP.okDeep} />
                {/* ★'다시 풀어 전부 해결!'→망각곡선 다음 스텝을 가리키는 카피 — 성취를 내일 복습으로 연결 */}
                <Text style={{ flexShrink: 1, textAlign: 'center', fontSize: 13, fontFamily: ff(700), color: VP.okDeep }}>재도전으로 {state.quizRetryInitial}개 전부 해결 — 내일 복습에서 굳혀요</Text>
              </View>
            ) : null}
          </View>
          {/* ★'맞춤'(커스텀으로 오독)→'정답', '틀림'→'오답', '획득 ⭐'(유일한 이모지)→star 아이콘+'포인트' */}
          <View style={{ flexDirection: 'row', gap: 8, width: '100%', maxWidth: 360 }}>
            {/* ★힌트 보고 맞힌 문항 병기 — '정답 15'만 보면 적립 +NP와 안 맞아 보이는 정합 문제 해소 */}
            <Stat label={hints > 0 ? `정답 · 힌트 ${hints}` : '정답'} value={right} color={VP.ok} />
            <Stat label="오답" value={wrong} color={VP.bad} />
            <Stat label="포인트" value={`+${earned}`} color={VP.accent} icon="star" />
          </View>
        </View>

        {/* ★오답 리스트 — '오답 N'을 보여주고 끝나던 화면에서, 그 자리에서 듣고·저장하고·상세를 여는 정리 공간으로 */}
        {wrongWords.length > 0 ? (
          <View style={{ width: '100%', maxWidth: 360, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.01, 14) }}>이번에 틀린 단어 {wrongWords.length}</Text>
              <Pressable onPress={saveAll} disabled={allSaved} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button" accessibilityLabel={allSaved ? '모두 저장됨' : '틀린 단어 모두 즐겨찾기에 저장'}
                accessibilityState={{ disabled: allSaved }} style={{ opacity: allSaved ? 0.4 : 1 }}>
                <Text style={{ fontSize: 13, fontFamily: ff(700), color: allSaved ? VP.textFaint : VP.accentAA }}>{allSaved ? '저장됨' : '모두 저장'}</Text>
              </Pressable>
            </View>
            {listScrolls ? (
              <View style={{ maxHeight: Math.round(SCREEN_H * 0.34) }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 24 }}>
                  {wrongWords.map(w => (
                    <WrongRow key={w.id} w={w} isFav={favSet.has(w.id)} onOpen={() => setDetail(w)}
                      onToggleFav={() => dispatch({ type: 'TOGGLE_FAV', id: w.id })} />
                  ))}
                </ScrollView>
                {/* ★하단 페이드 — 잘린 행이 '더 있음'을 알리는 스크롤 어포던스 (새 의존성 없이 svg 그라디언트) */}
                <Svg pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} width="100%" height={28}>
                  <Defs>
                    <LinearGradient id="wrongFade" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={VP.bg} stopOpacity="0" />
                      <Stop offset="1" stopColor={VP.bg} stopOpacity="1" />
                    </LinearGradient>
                  </Defs>
                  <Rect x="0" y="0" width="100%" height="28" fill="url(#wrongFade)" />
                </Svg>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {wrongWords.map(w => (
                  <WrongRow key={w.id} w={w} isFav={favSet.has(w.id)} onOpen={() => setDetail(w)}
                    onToggleFav={() => dispatch({ type: 'TOGGLE_FAV', id: w.id })} />
                ))}
              </View>
            )}
          </View>
        ) : null}
      </View>

      <ProtoFooter>
        {showWrongCta ? (
          <>
            {/* ★1순위를 '이번 오답만' 즉시 복습으로 — 기존 '헷갈리는 단어 복습하기'는 전역 점프라 맥락이 끊겼음 */}
            <VPButton variant="accent" icon="flame" label={`틀린 ${wrong}개 바로 복습`} onPress={() => dispatch({ type: 'START_WRONG_REVIEW' })} />
            <VPButton variant="soft" label={backLabel} onPress={goBack} />
          </>
        ) : canNext ? (
          <>
            {/* ★오답이 해결된 상태에선 다음 진도가 자연스러운 1순위 — 홈 왕복 없이 학습 루프 연장 */}
            <VPButton variant="accent" label="다음 20단어 시작" iconRight="arrow-right"
              onPress={() => dispatch({ type: 'START_CARD', stage: Math.min(TOTAL, (state.checkedCount || 0) + 1) })} />
            <VPButton variant="ghost" label="홈으로" onPress={goBack} />
          </>
        ) : (
          <VPButton variant="accent" label={backLabel} iconRight="arrow-right" onPress={goBack} />
        )}
      </ProtoFooter>

      {detail ? (
        <WordDetail
          word={detail}
          isFav={favSet.has(detail.id)}
          ivl={(state.boxes && state.boxes[detail.id] && state.boxes[detail.id].ivl) || 0}
          onToggleFav={() => dispatch({ type: 'TOGGLE_FAV', id: detail.id })}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </View>
  );
}
