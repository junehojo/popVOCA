/* VocaPoP 공용 UI — design-reference/vp-shared-pink.jsx 이식 (VPButton 3D 푸시, VPProgress) */
import React, { useRef, useEffect, useState } from 'react';
import { Animated, Easing, Pressable, View, Text } from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { VP, ff, ls } from './theme';
import { Icon } from './Icon';

/* 영어 단어 발음 (TTS) — 화면 공통 */
let _speakTimer = null;
export function speak(text) {
  if (!text) return;
  if (_speakTimer) clearTimeout(_speakTimer);
  try { Speech.stop(); } catch (e) {}
  // stop() 직후 바로 speak 하면 안드 TTS가 새 발화까지 끊어 '소리 안 남'(레이스) → 살짝 늦춰서 발화
  _speakTimer = setTimeout(() => {
    _speakTimer = null;
    try { Speech.speak(String(text), { language: 'en-US', rate: 0.95, pitch: 1.0 }); } catch (e) {}
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
    <Pressable onPress={press} hitSlop={6} style={{ flexShrink: 0 }}>
      <Animated.View style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: VP.accentSoft,
        alignItems: 'center', justifyContent: 'center', transform: [{ scale: sc }],
      }}>
        <Icon name="speaker" size={Math.round(size * 0.46)} color={VP.accent} />
      </Animated.View>
    </Pressable>
  );
}

const SIZES = {
  lg: { height: 56, fontSize: 16, radius: 14, padX: 20 },
  md: { height: 48, fontSize: 15, radius: 12, padX: 18 },
  sm: { height: 40, fontSize: 14, radius: 10, padX: 14 },
};
/* 3D 푸시 버튼. icon(좌)/label/iconRight(우) 조합. 누르면 면이 lift만큼 내려가 그림자를 덮음.
   VARIANTS 는 VP 게터를 렌더 시점에 읽도록 컴포넌트 안에서 구성(다크모드 즉시 반영). */
export function VPButton({ label, icon, iconRight, children, variant = 'default', size = 'lg', onPress, disabled, full = true, style }) {
  const sz = SIZES[size] || SIZES.lg;
  const VARIANTS = {
    default:  { bg: VP.bg,          color: VP.text,   shade: VP.pushShade,   weight: 700, ring: VP.pushRing },
    primary:  { bg: VP.text,        color: VP.onText, shade: VP.textShade,   weight: 800 },
    accent:   { bg: VP.accent,      color: '#fff',    shade: VP.accentDeep,  weight: 800 },
    ghost:    { bg: 'transparent',  color: VP.text,   shade: 'transparent',  weight: 600 },
    soft:     { bg: VP.surface,     color: VP.text,   shade: VP.pushShade,   weight: 700, ring: VP.pushRing },
    ok:       { bg: VP.ok,          color: '#fff',    shade: VP.okDeep,      weight: 800 },
    bad:      { bg: VP.bad,         color: '#fff',    shade: VP.badDeep,     weight: 800 },
  };
  const v = VARIANTS[variant] || VARIANTS.default;
  const liftBase = variant === 'ghost' ? 0 : 5;
  const ty = useRef(new Animated.Value(0)).current;
  const animate = (to) => Animated.timing(ty, { toValue: to, duration: 80, useNativeDriver: true }).start();
  const iconSize = sz.fontSize;

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => { animate(liftBase); hTap(); }}
      onPressOut={() => animate(0)}
      onPress={onPress}
      style={[{ width: full ? '100%' : undefined, height: sz.height + liftBase }, style]}
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
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={onBack} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
          <Icon name="x" size={20} color={VP.text} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
          {label ? <Text style={{ marginLeft: icon ? 6 : 0, fontSize: 14, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 14) }}>{label}</Text> : null}
        </View>
        {onOverlay ? (
          <Pressable onPress={onOverlay} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
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
      <Text style={{ fontSize: 16, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 16), textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontSize: 13, color: VP.textSub, lineHeight: 19, textAlign: 'center', marginTop: 6 }}>{sub}</Text>
      {cta ? (
        <View style={{ width: '100%', maxWidth: 240, marginTop: 16 }}>
          <VPButton variant="accent" size="md" icon={cta.icon} label={cta.label} onPress={cta.onClick} />
        </View>
      ) : null}
    </View>
  );
}
