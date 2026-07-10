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
  return (
    <View style={{ width: 160, height: 160 }}>
      <Svg width={160} height={160} viewBox="0 0 160 160">
        <Circle cx={80} cy={80} r={r} stroke={VP.surface2} strokeWidth={14} fill="none" />
        <AnimatedCircle cx={80} cy={80} r={r} stroke={VP.accent} strokeWidth={14} fill="none"
          strokeDasharray={`${c}`} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 80 80)" />
      </Svg>
      <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 44, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.04, 44) }}>{value}</Text>
        <Text style={{ fontSize: 12, color: VP.textMute, fontFamily: ff(600), marginTop: 2 }}>정확도 %</Text>
      </View>
    </View>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, backgroundColor: VP.surface, borderRadius: 12, alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontFamily: ff(800), color, letterSpacing: ls(-0.025, 20) }}>{value}</Text>
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
  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <View style={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 6, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: VP.textMute, fontFamily: ff(700), letterSpacing: ls(0.08, 12) }}>퀴즈 점검 결과</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, gap: 14 }}>
        <Donut value={acc} />
        <Text style={{ fontSize: 30, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 30) }}>{title}</Text>
        <View style={{ flexDirection: 'row', gap: 8, width: '100%', maxWidth: 360 }}>
          <Stat label="맞춤" value={right} color={VP.ok} />
          <Stat label="틀림" value={wrong} color={VP.bad} />
          <Stat label="획득 ⭐" value={`+${earned}`} color={VP.accent} />
        </View>
      </View>
      <ProtoFooter>
        <VPButton variant="accent" label={state.quizReturn === 'vocab' ? '단어장으로' : '홈으로'} iconRight="arrow-right" onPress={() => dispatch({ type: 'GO', screen: state.quizReturn || 'home' })} />
      </ProtoFooter>
    </View>
  );
}

