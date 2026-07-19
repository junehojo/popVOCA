/* VocaPoP 온보딩 — 6스텝 → 4스텝 재구성 (디자인 크리틱 반영).
   ①메커니즘(계단 목업) ②잠금화면(목업+켜기 토글) ③알림(권한 이중 CTA) ④도메인 선택(예문 미리보기).
   완료 플래그는 App.js 상태(onboarded)에 저장 → 재실행 시 스킵.
   onDone({domain, wantLock}) — 도메인과 잠금화면 학습 의사를 App.js가 설정에 반영.
   스와이프 좌/우 = 다음/이전, 하드웨어 백 = 이전 스텝. */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Animated, Easing, PanResponder, BackHandler } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { VP, ff, ls, rgba } from './theme';
import { Icon } from './Icon';
import { VPButton, hTap, useReducedMotion } from './ui';
import { DOMAINS } from './personal';
import { ensureNotifPermission } from './notifications';
import * as Overlay from './modules/vocapop-overlay';

const TOTAL = 4;   // 0 메커니즘 · 1 잠금화면 · 2 알림 · 3 도메인

/* ★스텝3 벨 아이콘 — Icon.js에 bell류가 없어 로컬로 그림(Icon.js는 이 작업 범위 밖이라 수정 금지).
   Icon.js와 동일한 feather 스타일(stroke 2/round)로 시각 통일 */
function BellIcon({ size = 48, color }) {
  const k = { stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...k} d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path {...k} d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  );
}

/* ★스텝1 목업 — 추상 아이콘 대신 실제 홈 화면(계단+형광펜 카드)의 미니어처를 순수 View로.
   장식이므로 스크린리더에서 통째로 숨김(제목·설명이 내용을 다 전달) */
function StairMockup() {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{
      width: 224, borderRadius: VP.rXl, borderWidth: 1, borderColor: VP.border,
      backgroundColor: VP.surface, padding: 14, gap: 8,
    }}>
      {/* 계단 행 3개 — 위가 잠금(다음 걸음), 아래로 내려올수록 지나온 걸음. 좌우 오프셋으로 '계단' 실루엣 */}
      <View style={{ alignSelf: 'flex-end', width: 160, height: 34, borderRadius: VP.rMd, backgroundColor: VP.surface2, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 6 }}>
        <Icon name="lock" size={13} color={VP.textFaint} />
        {/* ★'보'→'걸음': 홈·통계 등 앱 전체 용어와 통일 */}
        <Text style={{ fontSize: 11, fontFamily: ff(600), color: VP.textFaint }}>3걸음</Text>
      </View>
      <View style={{ alignSelf: 'center', width: 160, height: 34, borderRadius: VP.rMd, backgroundColor: VP.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 }}>
        <Text style={{ fontSize: 11, fontFamily: ff(700), color: '#fff' }}>2걸음</Text>
        <Text style={{ fontSize: 11, fontFamily: ff(800), color: '#fff' }}>시작</Text>
      </View>
      <View style={{ alignSelf: 'flex-start', width: 160, height: 34, borderRadius: VP.rMd, backgroundColor: VP.okSoft, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 6 }}>
        <Icon name="check-bold" size={13} color={VP.okDeep} />
        <Text style={{ fontSize: 11, fontFamily: ff(700), color: VP.okDeep }}>1걸음 완료</Text>
      </View>
      {/* 형광펜 하이라이트된 단어 카드 — '헷갈린 단어가 모인다'의 시각 증거 */}
      <View style={{ marginTop: 4, borderRadius: VP.rMd, borderWidth: 1, borderColor: VP.border, backgroundColor: VP.surface, padding: 10, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={{ fontSize: 14, fontFamily: ff(800), color: VP.text, backgroundColor: rgba(VP.accent, 0.28), paddingHorizontal: 3 }}>abandon</Text>
        <Text style={{ fontSize: 12, fontFamily: ff(500), color: VP.textSub }}>버리다, 포기하다</Text>
      </View>
    </View>
  );
}

/* ★스텝2 목업 — 어두운 잠금화면 프레임 + 흰 단어 카드 + 1탭 퀴즈 보기 2개.
   잠금화면 자체를 재현하는 그림이라 라이트/다크 무관 고정색 사용(장식 전용) */
function LockMockup() {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{
      width: 224, borderRadius: VP.rXl, borderWidth: 1, borderColor: VP.border,
      backgroundColor: '#171B26', padding: 14, alignItems: 'center', gap: 10,
    }}>
      <Text style={{ fontSize: 22, fontFamily: ff(700), color: '#fff', letterSpacing: ls(0.02, 22) }}>9:41</Text>
      <View style={{ alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderRadius: VP.rMd, padding: 12, gap: 8 }}>
        <Text style={{ fontSize: 16, fontFamily: ff(800), color: '#1F2430', textAlign: 'center' }}>resilient</Text>
        <View style={{ backgroundColor: '#F6F8FF', borderRadius: VP.rSm, paddingVertical: 7, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, fontFamily: ff(600), color: '#697083' }}>회복력 있는</Text>
        </View>
        <View style={{ backgroundColor: '#F6F8FF', borderRadius: VP.rSm, paddingVertical: 7, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, fontFamily: ff(600), color: '#697083' }}>무모한</Text>
        </View>
      </View>
    </View>
  );
}

/* ★스텝4 도메인별 실예문 — '분야를 고르면 예문이 이렇게 바뀐다'를 즉시 증명(하드코딩 1건).
   타깃 단어는 accent 700으로 분리 렌더 */
const DOMAIN_EXAMPLES = {
  default: { pre: 'He needed a short ', word: 'rest', post: ' after the long walk.', kor: '긴 산책 후에 그는 짧은 휴식이 필요했어요.' },
  dev: { pre: 'The API ', word: 'returns', post: ' an error code when the request fails.', kor: '요청이 실패하면 API가 오류 코드를 반환해요.' },
  med: { pre: 'The patient showed a rapid ', word: 'recovery', post: ' after treatment.', kor: '환자는 치료 후 빠른 회복을 보였어요.' },
  biz: { pre: 'The team ', word: 'revised', post: ' the proposal before the client meeting.', kor: '팀은 고객 미팅 전에 제안서를 수정했어요.' },
  news: { pre: 'The government ', word: 'announced', post: ' a new policy on housing.', kor: '정부는 주택에 관한 새 정책을 발표했어요.' },
  academic: { pre: 'The study ', word: 'examines', post: ' the effect of sleep on memory.', kor: '이 연구는 수면이 기억에 미치는 영향을 조사해요.' },
};

function DomainPreviewCard({ domain }) {
  const ex = DOMAIN_EXAMPLES[domain || 'default'] || DOMAIN_EXAMPLES.default;
  return (
    <View style={{ backgroundColor: VP.surface2, borderRadius: VP.rMd, padding: 12, alignSelf: 'stretch', maxWidth: 320, marginTop: 14 }}>
      <Text style={{ fontSize: 14, fontFamily: ff(500), color: VP.text, lineHeight: 21, letterSpacing: ls(-0.01, 14) }}>
        {ex.pre}<Text style={{ fontFamily: ff(700), color: VP.accent }}>{ex.word}</Text>{ex.post}
      </Text>
      <Text style={{ fontSize: 12, fontFamily: ff(500), color: VP.textSub, lineHeight: 18, marginTop: 4 }}>{ex.kor}</Text>
    </View>
  );
}

/* 도메인 선택 칩 — ★pV 10→14(48dp 터치 타깃), 단일 선택군이므로 radio 롤 */
function DomainChip({ on, label, onPress }) {
  return (
    <Pressable onPress={() => { hTap(); onPress(); }}
      accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected: on }}
      style={{
        paddingHorizontal: 14, paddingVertical: 14, borderRadius: 999,
        backgroundColor: on ? VP.accent : VP.surface, borderWidth: on ? 0 : 1.5, borderColor: VP.border,
      }}>
      <Text style={{ fontSize: 14, fontFamily: ff(700), color: on ? '#fff' : VP.textSub }}>{label}</Text>
    </Pressable>
  );
}

/* ★점 인디케이터 추출 — 그룹에 진행 상황 라벨, 비활성 점은 border→textFaint(bg 위 3:1 확보) */
function StepDots({ total, idx }) {
  return (
    <View accessible accessibilityLabel={`${total}단계 중 ${idx + 1}단계`}
      style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{ width: i === idx ? 22 : 7, height: 7, borderRadius: VP.rPill, backgroundColor: i === idx ? VP.accent : VP.textFaint }} />
      ))}
    </View>
  );
}

export default function Onboarding({ onDone }) {
  const [idx, setIdx] = useState(0);
  const [domain, setDomain] = useState(null);     // 스텝4 선택값 (null = 일상)
  const [wantLock, setWantLock] = useState(false); // 스텝2 '잠금화면 학습 켜기' 의사 — App.js가 lockEnabled로
  const fade = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const notifBusy = useRef(false);
  const idxRef = useRef(0);
  idxRef.current = idx;

  // ★잠금화면 학습은 안드 네이티브 전용 — 웹/iOS에선 토글 자체를 숨김. 브리지 호출은 try/catch 가드
  const lockSupported = useMemo(() => {
    try { return Overlay.isLockSupported(); } catch (e) { return false; }
  }, []);

  const goNext = () => setIdx((i) => Math.min(i + 1, TOTAL - 1));
  const goPrev = () => setIdx((i) => Math.max(i - 1, 0));

  useEffect(() => {
    // ★모션 축소 설정이면 페이드 생략, 즉시 표시
    if (reduced) { fade.setValue(1); return; }
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [idx]);

  // ★하드웨어 백 = 이전 스텝. idx 0에서도 true 소비 — 온보딩 도중 실수로 앱이 꺼지지 않게
  useEffect(() => {
    const onBack = () => {
      if (idxRef.current > 0) setIdx((i) => Math.max(i - 1, 0));
      return true;
    };
    let sub = null;
    try { sub = BackHandler.addEventListener('hardwareBackPress', onBack); } catch (e) {}
    return () => { try { sub && sub.remove(); } catch (e) {} };
  }, []);

  // ★좌우 스와이프 페이지 넘김 — 수평 우세(dy 대비 1.5배)일 때만 잡아 칩 탭·세로 스크롤과 충돌 방지
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_, g) => {
      if (g.dx <= -48) setIdx((i) => Math.min(i + 1, TOTAL - 1));
      else if (g.dx >= 48) setIdx((i) => Math.max(i - 1, 0));
    },
  })).current;

  // ★스텝3 primary — 권한 요청을 기다렸다가(실패해도) 다음으로. busy 가드로 더블탭 중복 요청 방지
  const askNotif = async () => {
    if (notifBusy.current) return;
    notifBusy.current = true;
    try { await ensureNotifPermission(); } catch (e) {}
    notifBusy.current = false;
    setIdx(3);
  };

  const isDomainStep = idx === TOTAL - 1;
  const titleStyle = { fontSize: 22, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 22), lineHeight: 30, textAlign: 'center', marginTop: 24 };
  const descStyle = { fontSize: 15, fontFamily: ff(400), color: VP.textSub, letterSpacing: ls(-0.01, 15), lineHeight: 24, textAlign: 'center', maxWidth: 300, marginTop: 12 };

  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      {/* 건너뛰기 — 도메인 스텝에선 '기본으로 시작'(건너뜀=기본 선택임을 정직하게). 결과는 항상 객체로 */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 12 }}>
        <Pressable onPress={() => onDone({ domain: null, wantLock })} hitSlop={8}
          accessibilityRole="button" style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
          <Text style={{ fontSize: 14, fontFamily: ff(600), color: VP.textSub }}>
            {isDomainStep ? '기본으로 시작' : '건너뛰기'}
          </Text>
        </Pressable>
      </View>

      {/* 본문 — ★헤더~CTA 사이 공간에 세로 중앙 정렬. 상단 14% 앵커는 하단이 크게 비어 top-heavy했음.
          이 영역은 하단 footer가 상단보다 커서, 중앙 정렬 시 화면 중심보다 살짝 위(광학 중심)에 놓임 = 균형 배치 */}
      <Animated.View {...pan.panHandlers} style={{
        flex: 1, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center',
        opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
      }}>
        {idx === 0 && (
          <>
            <StairMockup />
            <Text textBreakStrategy="balanced" style={titleStyle}>한 걸음씩, 계단을 올라요</Text>
            <Text textBreakStrategy="balanced" style={descStyle}>한 걸음 = 새 단어 20개.{'\n'}헷갈린 단어는 형광펜으로 모여 다시 나와요.</Text>
          </>
        )}
        {idx === 1 && (
          <>
            <LockMockup />
            <Text textBreakStrategy="balanced" style={titleStyle}>잠금화면이 단어장이 돼요</Text>
            <Text textBreakStrategy="balanced" style={descStyle}>화면을 켤 때마다 단어 하나.{'\n'}다른 앱 위 플로팅 카드로도 배워요.</Text>
          </>
        )}
        {idx === 2 && (
          <>
            <View style={{ width: 104, height: 104, borderRadius: 28, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <BellIcon size={48} color={VP.accent} />
            </View>
            <Text textBreakStrategy="balanced" style={titleStyle}>하루를 놓쳐도 챙겨드릴게요</Text>
            <Text textBreakStrategy="balanced" style={descStyle}>복습할 단어가 쌓이면 저녁 8시에 알려드려요. 시간은 설정에서 바꿀 수 있어요.</Text>
          </>
        )}
        {idx === 3 && (
          <>
            <View style={{ width: 104, height: 104, borderRadius: 28, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="book-open" size={48} color={VP.accent} />
            </View>
            <Text textBreakStrategy="balanced" style={titleStyle}>어떤 분야 문장으로{'\n'}배울까요?</Text>
            <Text textBreakStrategy="balanced" style={descStyle}>예문과 빈칸 문제가 고른 분야의 문장으로 나와요. 설정에서 언제든 바꿀 수 있어요.</Text>
            {/* ★gap 8→10, 칩은 48dp — 라디오 그룹 */}
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, maxWidth: 320, marginTop: 20 }}>
              {DOMAINS.map((d) => (
                <DomainChip key={String(d.v)} on={domain === d.v} label={d.l} onPress={() => setDomain(d.v)} />
              ))}
            </View>
            {/* 기본값(일상)도 선택 상태이므로 미리보기는 항상 표시 — 고르면 즉시 예문이 바뀌는 걸 증명 */}
            <DomainPreviewCard domain={domain} />
          </>
        )}
      </Animated.View>

      <StepDots total={TOTAL} idx={idx} />

      {/* CTA 영역 */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 24, gap: 4 }}>
        {idx === 1 && lockSupported && (
          /* ★잠금화면 학습 사전 동의 토글 — 권한 팝업 없이 '의사'만 수집, 실제 켜기는 App.js가 처리 */
          <Pressable onPress={() => { hTap(); setWantLock((w) => !w); }}
            accessibilityRole="button" accessibilityState={{ selected: wantLock }}
            accessibilityLabel={wantLock ? '잠금화면 학습 켜짐, 탭하면 끔' : '잠금화면 학습 켜기'}
            style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 15, fontFamily: ff(700), color: wantLock ? VP.okDeep : VP.accentDeep }}>
              {wantLock ? '잠금화면 학습 켜짐 ✓' : '잠금화면 학습 켜기'}
            </Text>
          </Pressable>
        )}
        {idx === 2 ? (
          /* ★알림 스텝은 공용 '다음' 대신 이중 CTA — 허락을 구하는 맥락을 만든 뒤 시스템 팝업 */
          <>
            <Pressable onPress={() => { hTap(); goNext(); }} accessibilityRole="button"
              style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 15, fontFamily: ff(600), color: VP.textSub }}>나중에</Text>
            </Pressable>
            <VPButton variant="accent" label="알림 받기" onPress={askNotif} />
          </>
        ) : (
          <VPButton variant="accent" label={isDomainStep ? '시작하기' : '다음'} iconRight="arrow-right"
            onPress={() => (isDomainStep ? onDone({ domain, wantLock }) : goNext())} />
        )}
      </View>
    </View>
  );
}
