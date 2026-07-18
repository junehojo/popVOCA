/* VocaPoP 공용 UI — design-reference/vp-shared-pink.jsx 이식 (VPButton 3D 푸시, VPProgress) */
import React, { useRef, useEffect, useState } from 'react';
import { Animated, Easing, Pressable, View, Text, Modal, PanResponder, AccessibilityInfo } from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { VP, ff, ls } from './theme';
import { Icon } from './Icon';

/* 영어 단어 발음 (TTS) — 화면 공통. rate 인자로 '천천히 듣기'(듣기 퀴즈 길게 누르기) 지원 */
let _speakTimer = null;
export function speak(text, rate = 0.95) {
  if (!text) return;
  if (_speakTimer) clearTimeout(_speakTimer);
  try { Speech.stop(); } catch (e) {}
  // stop() 직후 바로 speak 하면 안드 TTS가 새 발화까지 끊어 '소리 안 남'(레이스) → 살짝 늦춰서 발화
  _speakTimer = setTimeout(() => {
    _speakTimer = null;
    try { Speech.speak(String(text), { language: 'en-US', rate, pitch: 1.0 }); } catch (e) {}
  }, 90);
}

/* TTS 엔진 워밍업 — 첫 speak는 안드 TTS 엔진 바인딩에 1~2초 걸림(카드 뜨고 늦게 나오던 원인).
   앱 시작 시 1회 호출해 미리 깨움(소리 없음). */
export function warmTTS() {
  try { const p = Speech.getAvailableVoicesAsync && Speech.getAvailableVoicesAsync(); p && p.catch && p.catch(() => {}); } catch (e) {}
}

/* ── 햅틱 (항상 켜짐, 은은하게) — 키 모멘트에만 호출 ── */
export const hTap = () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {} };
export const hMed = () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {} };
export const hSel = () => { try { Haptics.selectionAsync(); } catch (e) {} };   // 피커 디텐트 틱 (계단 "도로로록")
export const hOk  = () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {} };
export const hBad = () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch (e) {} };

/* ── 효과음 (설정 '효과음' 토글로 on/off) ── */
const SFX_FILES = {
  correct: require('./assets/sfx/correct.wav'),
  wrong: require('./assets/sfx/wrong.wav'),
  flip: require('./assets/sfx/flip.wav'),
  complete: require('./assets/sfx/complete.wav'),
};
let SFX_ON = true;
const _sounds = {};
let _audioReady = false;
async function _ensureAudio() {
  if (_audioReady) return;
  _audioReady = true;
  try { await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true, staysActiveInBackground: false }); } catch (e) {}
  for (const k in SFX_FILES) {
    try { const { sound } = await Audio.Sound.createAsync(SFX_FILES[k], { volume: 0.9 }); _sounds[k] = sound; } catch (e) {}
  }
}
/* App에서 settings.sound 바뀔 때 호출 (setTheme/setFontScale 패턴) */
export function setSfxEnabled(on) { SFX_ON = !!on; if (on) _ensureAudio(); }
export async function playSfx(name) {
  if (!SFX_ON) return;
  try {
    await _ensureAudio();
    const s = _sounds[name];
    if (s) await s.replayAsync();
  } catch (e) {}
}

/* 원형 발음 버튼 (단어장/오답노트 행에서 공용) — 재생 중 protoPulse(통통) */
export function SpeakButton({ text, size = 38 }) {
  const [on, setOn] = useState(false);
  const sc = useRef(new Animated.Value(1)).current;
  const tmr = useRef(null);
  useEffect(() => {
    let loop;
    if (on) {
      loop = Animated.loop(Animated.sequence([
        Animated.timing(sc, { toValue: 1.14, duration: 350, useNativeDriver: true }),
        Animated.timing(sc, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]));
      loop.start();
    } else { sc.setValue(1); }
    return () => { if (loop) loop.stop(); };
  }, [on]);
  const press = () => {
    hTap();
    if (tmr.current) clearTimeout(tmr.current);
    try { Speech.stop(); } catch (e) {}
    tmr.current = setTimeout(() => {
      try { Speech.speak(String(text), { language: 'en-US', rate: 0.95, pitch: 1.0, onStart: () => setOn(true), onDone: () => setOn(false), onStopped: () => setOn(false), onError: () => setOn(false) }); }
      catch (e) { setOn(false); }
    }, 90);
  };
  return (
    /* ★S4: hitSlop을 사이즈 기반으로 — 36px 버튼도 44px 터치 타깃 보장. a11y 라벨로 '무명 버튼' 해소 */
    <Pressable onPress={press} hitSlop={Math.max(6, Math.ceil((44 - size) / 2))}
      accessibilityRole="button" accessibilityLabel={`${text} 발음 듣기`} style={{ flexShrink: 0 }}>
      <Animated.View style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: VP.accentSoft,
        alignItems: 'center', justifyContent: 'center', transform: [{ scale: sc }],
      }}>
        <Icon name="speaker" size={Math.round(size * 0.46)} color={VP.accent} />
      </Animated.View>
    </Pressable>
  );
}

/* ★radius를 토큰(rLg 16/rMd 12)에 스냅 — 기존 14/10은 radii 토큰 밖 임의값이라 화면마다 드리프트 원인.
   lg 폰트 16→17: 주요 CTA 라벨을 리스트 타이틀(17)과 같은 단계로 — 스케일 통합 */
const SIZES = {
  lg: { height: 56, fontSize: 17, radius: 16, padX: 20 },
  md: { height: 48, fontSize: 15, radius: 12, padX: 18 },
  sm: { height: 40, fontSize: 14, radius: 12, padX: 14 },
};
/* 3D 푸시 버튼. icon(좌)/label/iconRight(우) 조합. 누르면 면이 lift만큼 내려가 그림자를 덮음.
   VARIANTS 는 VP 게터를 렌더 시점에 읽도록 컴포넌트 안에서 구성(다크모드 즉시 반영). */
export function VPButton({ label, icon, iconRight, children, variant = 'default', size = 'lg', onPress, disabled, full = true, style }) {
  const sz = SIZES[size] || SIZES.lg;
  const VARIANTS = {
    default:  { bg: VP.bg,          color: VP.text,   shade: VP.pushShade,   weight: 700, ring: VP.pushRing },
    primary:  { bg: VP.text,        color: VP.onText, shade: VP.textShade,   weight: 800 },
    /* ★S1: accent 배경을 cta(#E83FA1)로 — 흰 라벨 대비 2.8→3.7:1 (전 CTA 일괄 상향) */
    accent:   { bg: VP.cta,         color: '#fff',    shade: VP.ctaShade,    weight: 800 },
    ghost:    { bg: 'transparent',  color: VP.text,   shade: 'transparent',  weight: 600 },
    soft:     { bg: VP.surface,     color: VP.text,   shade: VP.pushShade,   weight: 700, ring: VP.pushRing },
    ok:       { bg: VP.ok,          color: '#fff',    shade: VP.okDeep,      weight: 800 },
    /* ★플래시카드 '알아요' 편향 제거용 — 몰라요(soft)와 채도를 맞춘 soft 톤, 정오 semantic만 남김 */
    okSoft:   { bg: VP.okSoft,      color: VP.okDeep, shade: VP.pushShade,   weight: 800, ring: VP.pushRing },
    bad:      { bg: VP.bad,         color: '#fff',    shade: VP.badDeep,     weight: 800 },
  };
  const v = VARIANTS[variant] || VARIANTS.default;
  const liftBase = variant === 'ghost' ? 0 : 4;   // ★5→4: QuizOption·StepRow·플래시카드 그림자가 전부 4px — 3D 깊이 통일
  const ty = useRef(new Animated.Value(0)).current;
  const animate = (to) => Animated.timing(ty, { toValue: to, duration: 80, useNativeDriver: true }).start();
  const iconSize = sz.fontSize;

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={typeof label === 'string' ? label : undefined}
      onPressIn={() => { animate(liftBase); hTap(); }}
      onPressOut={() => animate(0)}
      onPress={onPress}
      /* ★disabled 시각 상태 — Pressable만 막고 활성과 똑같이 보이던 컴포넌트 공백 해소 */
      style={[{ width: full ? '100%' : undefined, height: sz.height + liftBase, opacity: disabled ? 0.4 : 1 }, style]}
    >
      {liftBase > 0 && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: liftBase, height: sz.height, borderRadius: sz.radius, backgroundColor: v.shade }} />
      )}
      <Animated.View style={{
        height: sz.height, borderRadius: sz.radius, backgroundColor: v.bg,
        borderWidth: v.ring ? 1.5 : 0, borderColor: v.ring || 'transparent',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingHorizontal: sz.padX,
        transform: [{ translateY: ty }],
      }}>
        {icon ? <Icon name={icon} size={iconSize} color={v.color} /> : null}
        {label != null ? (
          <Text style={{ color: v.color, fontSize: sz.fontSize, fontFamily: ff(v.weight), letterSpacing: ls(-0.02, sz.fontSize) }}>{label}</Text>
        ) : null}
        {children}
        {iconRight ? <Icon name={iconRight} size={iconSize} color={v.color} /> : null}
      </Animated.View>
    </Pressable>
  );
}

/* 가로 진행도 바 — value 변경 시 폭을 .32s 트윈 */
export function VPProgress({ value = 0, height = 4, color = VP.accent, track = VP.surface2, style }) {
  const v = Math.max(0, Math.min(100, value));
  const w = useRef(new Animated.Value(v)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: v, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [v]);
  const width = w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
  return (
    <View style={[{ width: '100%', height, backgroundColor: track, borderRadius: height / 2, overflow: 'hidden' }, style]}>
      <Animated.View style={{ width, height: '100%', backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

/* 공통 상단바 — ✕ + (아이콘+라벨) + (pip) + 우측 + 진행바 */
export function ProtoTopBar({ onBack, icon, label, right, progress, progressColor, onOverlay }) {
  return (
    <View>
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
        {/* ★✕ 36→44: 모든 학습 화면의 유일한 이탈 버튼인데 44px 터치 타깃 미달이었음. marginLeft -4로 좌측 시각 정렬 유지 */}
        <Pressable onPress={onBack} style={{ width: 44, height: 44, marginLeft: -4, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
          <Icon name="x" size={20} color={VP.text} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
          {label ? <Text style={{ marginLeft: icon ? 6 : 0, fontSize: 14, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 14) }}>{label}</Text> : null}
        </View>
        {onOverlay ? (
          <Pressable onPress={onOverlay} hitSlop={5} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
            <Icon name="pip" size={18} color={VP.accent} />
          </Pressable>
        ) : null}
        <View style={{ minWidth: 44, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 13, color: VP.textSub, fontFamily: ff(600) }}>{right || ''}</Text>
        </View>
      </View>
      {typeof progress === 'number' ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <VPProgress value={progress} height={4} color={progressColor || VP.accent} track={VP.surface2} />
        </View>
      ) : null}
    </View>
  );
}

/* 공통 하단 푸터 (버튼 영역) */
export function ProtoFooter({ children, style }) {
  return <View style={[{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, gap: 10 }, style]}>{children}</View>;
}

/* ★S3 reduce-motion 훅 — 시스템 '동작 줄이기' 켜진 사용자에겐 스프링/슬라이드 대신 즉시 표시 (WCAG 2.3.3) */
export function useReducedMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    let alive = true, sub;
    try { AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setRm(!!v); }).catch(() => {}); } catch (e) {}
    try { sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => setRm(!!v)); } catch (e) {}
    return () => { alive = false; if (sub && sub.remove) sub.remove(); };
  }, []);
  return rm;
}

/* ★S3 공용 바텀시트 — 시트 3종(WordDetail 슬라이드업 / Domain·Lock 페이드 / Auth 중앙 다이얼로그)의
   모션 문법을 340ms 슬라이드업 하나로 통일. grabber 팬으로 끌어내려 닫기(거짓 어포던스 해소). */
export function BottomSheet({ visible, onClose, children }) {
  const H = 700;   // 시작 오프셋(시트 최대 높이보다 크게)
  const y = useRef(new Animated.Value(H)).current;
  const [mounted, setMounted] = useState(visible);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(y, { toValue: 0, duration: reduced ? 0 : 340, easing: Easing.bezier(0.2, 0.9, 0.3, 1.05), useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(y, { toValue: H, duration: reduced ? 0 : 220, easing: Easing.in(Easing.quad), useNativeDriver: true })
        .start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [visible]);
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => { if (g.dy > 0) y.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120 || g.vy > 0.5) { closeRef.current && closeRef.current(); }
      else Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 240 }).start();
    },
  })).current;
  if (!mounted) return null;
  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={() => closeRef.current && closeRef.current()}>
      <Pressable onPress={() => closeRef.current && closeRef.current()} style={{ flex: 1, backgroundColor: 'rgba(10,14,24,0.45)', justifyContent: 'flex-end' }}>
        <Animated.View style={{ transform: [{ translateY: y }] }}>
          {/* 시트 본체 탭이 백드롭 onPress로 새지 않게 가로채기 */}
          <Pressable onPress={() => {}} style={{
            backgroundColor: VP.surface, borderTopLeftRadius: VP.rSheet, borderTopRightRadius: VP.rSheet,
            paddingHorizontal: 20, paddingBottom: 28,
          }}>
            <View {...pan.panHandlers} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 8 }}>
              <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: VP.border }} />
            </View>
            {children}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/* ★인라인 토스트 — 화면 내 1회성 피드백(진행 저장·R2 재큐잉 등). text가 truthy면 표시 후 자동 소멸 → onDone */
export function InlineToast({ text, duration = 1800, bottom = 28, onDone }) {
  const a = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(onDone); doneRef.current = onDone;
  useEffect(() => {
    if (!text) return;
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(a, { toValue: 0, duration: 220, useNativeDriver: true })
        .start(() => { doneRef.current && doneRef.current(); });
    }, duration);
    return () => clearTimeout(t);
  }, [text]);
  if (!text) return null;
  return (
    <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" style={{
      position: 'absolute', left: 20, right: 20, bottom, alignItems: 'center',
      opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
    }}>
      <View style={{ backgroundColor: VP.borderStrong, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, maxWidth: '100%' }}>
        <Text style={{ color: VP.bg, fontSize: 13, fontFamily: ff(600), letterSpacing: ls(-0.01, 13) }}>{text}</Text>
      </View>
    </Animated.View>
  );
}

/* ★미니 성과 카드 — R1End 정오 요약·걸음 완료 성과·결과 스탯 공용. items = [{n, label, color?}] 2~3셀 */
export function MiniStatRow({ items, style }) {
  return (
    <View accessible accessibilityLabel={items.map(it => `${it.label} ${it.n}`).join(', ')} style={[{
      flexDirection: 'row', backgroundColor: VP.surface, borderRadius: VP.rLg,
      borderWidth: 1, borderColor: VP.border, paddingVertical: 12,
    }, style]}>
      {items.map((it, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderLeftColor: VP.divider }}>
          <Text style={{ fontSize: 20, fontFamily: ff(800), color: it.color || VP.text, letterSpacing: ls(-0.02, 20) }}>{it.n}</Text>
          <Text style={{ fontSize: 12, color: VP.textSub, fontFamily: ff(600), marginTop: 4 }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

/* 리스트 빈 상태 (단어장/오답노트 공용) */
export function ListEmpty({ title, sub, icon, accent, cta }) {
  return (
    <View style={{ paddingVertical: 56, paddingHorizontal: 20, alignItems: 'center' }}>
      <View style={{
        width: 56, height: 56, borderRadius: 28, marginBottom: 8,
        backgroundColor: accent ? VP.accentSoft : VP.surface, alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={26} color={accent ? VP.accent : VP.textMute} />
      </View>
      <Text style={{ fontSize: 17, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 17), textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontSize: 13, color: VP.textSub, lineHeight: 19, textAlign: 'center', marginTop: 6 }}>{sub}</Text>
      {cta ? (
        <View style={{ width: '100%', maxWidth: 240, marginTop: 16 }}>
          <VPButton variant="accent" size="md" icon={cta.icon} label={cta.label} onPress={cta.onClick} />
        </View>
      ) : null}
    </View>
  );
}
