/* VocaPoP 온보딩 — design-reference/vp-proto-onboarding.jsx (ProtoOnboarding) 픽셀 이식.
   첫 실행 1회: 정보 5슬라이드 + ★도메인 선택 1스텝 + 점 인디케이터 + 다음·시작하기.
   완료 플래그는 App.js 상태(onboarded)에 저장 → 재실행 시 스킵.
   onDone(domain|null) — 마지막 스텝에서 고른 예문 도메인을 App.js가 설정에 반영. */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, Easing } from 'react-native';
import { VP, ff, ls } from './theme';
import { Icon } from './Icon';
import { VPButton, hTap } from './ui';
import { DOMAINS } from './personal';

const SLIDES = [
  { icon: 'mountain', title: '한 걸음씩 계단을 올라요', desc: '한 걸음은 새 단어 20개. 카드를 다 훑으면 다음 걸음이 열리고, 복습할 단어는 카드에 자동으로 섞여 나와요.' },
  { icon: 'cards', title: '카드로 익히고 퀴즈로 점검', desc: '몰라요 한 단어는 간격을 두고 다시 나와요. 직접 떠올리는 인출 연습으로 오래 기억해요.' },
  { icon: 'flame', title: '헷갈리는 단어는 형광펜으로', desc: '헷갈릴수록 형광펜이 진해지고 한곳에 모여요. 복습으로 맞히면 옅어지다, 다 외우면 사라져요.' },
  { icon: 'lock', title: '잠금화면이 단어장이 돼요', desc: '화면을 켤 때마다 잠금화면에 1탭 퀴즈가 떠요. 다른 앱 위에 플로팅 카드로도 학습 — 설정에서 켤 수 있어요.' },
  { icon: 'speaker', title: '듣고, 읽고, 챙겨드려요', desc: '모든 카드에 발음과 예문 한글 해석이 함께. 하루를 놓치면 저녁 8시에 복습 알림이 먼저 챙겨드려요.' },
];

/* ★도메인 선택 칩 — Settings SheetChip과 동일 규격 (pH 12/pV 8/pill/1.5 border) */
function DomainChip({ on, label, onPress }) {
  return (
    <Pressable onPress={() => { hTap(); onPress(); }} style={{
      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999,
      backgroundColor: on ? VP.accent : VP.surface, borderWidth: on ? 0 : 1.5, borderColor: VP.border,
    }}>
      <Text style={{ fontSize: 14, fontFamily: ff(700), color: on ? '#fff' : VP.textSub }}>{label}</Text>
    </Pressable>
  );
}

export default function Onboarding({ onDone }) {
  const [idx, setIdx] = useState(0);
  const [domain, setDomain] = useState(null);   // 마지막 스텝 선택값 (null = 기본)
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [idx]);

  // ★마지막 스텝 = 도메인 선택(인터랙티브) — 정보만 읽고 끝나지 않고 '내 분야'를 고르며 시작.
  //   설정 깊숙이 있던 예문 도메인의 첫 발견 지점. 기본값 선택돼 있어 강요 없음.
  const TOTAL = SLIDES.length + 1;
  const isDomainStep = idx === SLIDES.length;
  const s = SLIDES[Math.min(idx, SLIDES.length - 1)];

  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      {/* 건너뛰기 — ★pH 16→20: 화면 기본 패딩과 통일. 건너뛰면 도메인은 기본(null) */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 12 }}>
        <Pressable onPress={() => onDone(null)} hitSlop={8} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
          <Text style={{ fontSize: 14, fontFamily: ff(600), color: VP.textSub }}>건너뛰기</Text>
        </Pressable>
      </View>

      {/* 본문 (슬라이드 전환 시 페이드) */}
      <Animated.View style={{
        flex: 1, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', gap: 22,
        opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
      }}>
        {isDomainStep ? (
          <>
            <View style={{ width: 104, height: 104, borderRadius: 28, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="book-open" size={48} color={VP.accent} />
            </View>
            <Text textBreakStrategy="balanced" style={{ fontSize: 22, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 22), lineHeight: 30, textAlign: 'center' }}>어떤 분야 문장으로{'\n'}배울까요?</Text>
            <Text textBreakStrategy="balanced" style={{ fontSize: 15, color: VP.textSub, letterSpacing: ls(-0.01, 15), lineHeight: 24, textAlign: 'center', maxWidth: 300 }}>
              예문과 빈칸 문제가 고른 분야의 문장으로 나와요. 설정에서 언제든 바꿀 수 있어요.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 320 }}>
              {DOMAINS.map((d) => (
                <DomainChip key={String(d.v)} on={domain === d.v} label={d.l} onPress={() => setDomain(d.v)} />
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={{ width: 104, height: 104, borderRadius: 28, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={s.icon} size={48} color={VP.accent} />
            </View>
            {/* ★25→22(고아 크기 제거·화면 타이틀 단계와 통일), lineHeight 31→30. balanced: 한글이 음절 중간에서 꺾이던 문제 완화(안드) */}
            <Text textBreakStrategy="balanced" style={{ fontSize: 22, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 22), lineHeight: 30, textAlign: 'center' }}>{s.title}</Text>
            <Text textBreakStrategy="balanced" style={{ fontSize: 15, color: VP.textSub, letterSpacing: ls(-0.01, 15), lineHeight: 24, textAlign: 'center', maxWidth: 300 }}>{s.desc}</Text>
          </>
        )}
      </Animated.View>

      {/* 점 인디케이터 */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 24 }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <View key={i} style={{ width: i === idx ? 22 : 7, height: 7, borderRadius: 999, backgroundColor: i === idx ? VP.accent : VP.border }} />
        ))}
      </View>

      {/* CTA — ★pH 24→20: ProtoFooter(20)와 통일 */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <VPButton variant="accent" label={isDomainStep ? '시작하기' : '다음'} iconRight="arrow-right"
          onPress={() => (isDomainStep ? onDone(domain) : setIdx(idx + 1))} />
      </View>
    </View>
  );
}
