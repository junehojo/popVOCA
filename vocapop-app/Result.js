/* VocaPoP 결과 — design-reference/vp-proto-screens-2.jsx (ResultScore, ResultStage) 이식.
   도넛 점수 + 트랙 통계 카드. */
import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { VP, ff, ls } from './theme';
import { Icon } from './Icon';
import { VPButton, ProtoFooter } from './ui';
import { wordsForStage } from './data';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function Donut({ value }) {
  const r = 60, c = 2 * Math.PI * r;
  const prog = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(prog, { toValue: value, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value]);
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
        <Text style={{ fontSize: 44, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.04, 44) }}>{value}</Text>
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
      <Text style={{ fontSize: 11, color: VP.textSub, fontFamily: ff(600), marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export function ResultScore({ state, dispatch }) {
  const vals = Object.values(state.quizResults);
  const right = vals.filter(r => r === 'o').length;
  const wrong = vals.filter(r => r === 'x').length;
  const total = (state.quizQueue && state.quizQueue.length) || wordsForStage(state.activeStage).length;
  const acc = total ? Math.round((right / total) * 100) : 0;
  const earned = right * 5;   // 실제 적립 포인트(정답당 ⭐+5)와 동일하게 표시
  const title = acc === 100 ? '완벽해요!' : acc >= 80 ? '잘했어요!' : acc >= 60 ? '괜찮아요' : '연습 더 해요';
  // ★재도전 완주(mastery loop) — 1R에서 틀렸던 문항을 2R에서 전부 맞히고 온 경우.
  //   점수(acc)는 첫 시도 기준 그대로 두고, "끝내 다 맞혔다"는 성취를 별도 배지로 보상.
  const redeemed = (state.quizRetryInitial || 0) > 0 && (!state.quizRetry || state.quizRetry.length === 0);
  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      {/* ★오버라인을 센터 그룹 안으로 — 상단에 고립돼 링과 ~465px 떨어져 떠 있었음. 링+판정+스탯이 한 그룹으로 광학 중앙 */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, gap: 14 }}>
        <Text style={{ fontSize: 12, color: VP.textMute, fontFamily: ff(700), marginBottom: 2 }}>퀴즈 점검 결과</Text>
        <Donut value={acc} />
        <Text style={{ fontSize: 28, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 28) }}>{title}</Text>
        {redeemed ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: VP.okSoft, marginTop: -4 }}>
            <Icon name="check-bold" size={13} color={VP.okDeep} />
            <Text style={{ fontSize: 13, fontFamily: ff(700), color: VP.okDeep }}>틀렸던 {state.quizRetryInitial}개, 다시 풀어 전부 해결!</Text>
          </View>
        ) : null}
        {/* ★'맞춤'(커스텀으로 오독)→'정답', '틀림'→'오답', '획득 ⭐'(유일한 이모지)→star 아이콘+'포인트' */}
        <View style={{ flexDirection: 'row', gap: 8, width: '100%', maxWidth: 360 }}>
          <Stat label="정답" value={right} color={VP.ok} />
          <Stat label="오답" value={wrong} color={VP.bad} />
          <Stat label="포인트" value={`+${earned}`} color={VP.accent} icon="star" />
        </View>
      </View>
      <ProtoFooter>
        {/* ★오답이 있으면 즉시 복습 경로 제공 — '틀림 N'을 보여주고도 후속 액션이 홈뿐이라 학습 루프가 끊겼음 */}
        {wrong > 0 ? (
          <VPButton variant="soft" icon="flame" label="헷갈리는 단어 복습하기" onPress={() => dispatch({ type: 'START_CONFUSING_REVIEW' })} />
        ) : null}
        <VPButton variant="accent" label={state.quizReturn === 'vocab' ? '단어장으로' : '홈으로'} iconRight="arrow-right" onPress={() => dispatch({ type: 'GO', screen: state.quizReturn || 'home' })} />
      </ProtoFooter>
    </View>
  );
}

