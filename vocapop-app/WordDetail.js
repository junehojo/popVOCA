/* VocaPoP 단어 상세 — design-reference/vp-proto-detail.jsx (WordDetail) 픽셀 이식.
   바텀시트 모달: 단어+발음 · 학습상태 뱃지 · 뜻(번호) · 예문 · 하단 액션(헷갈려요 담기 + ★) · 이전/다음.
   protoSheetUp(.34s cubic-bezier(.2,.9,.3,1.05)) 슬라이드업 + 백드롭 탭 닫기 + grabber 팬으로 끌어내려 닫기.
   ★기존 호출부(Result.js 등) 하위호환: onConfusing/onPrev/onNext는 전부 optional — 없으면 기존 즐겨찾기 단독 레이아웃 그대로. */
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Animated, Easing, Modal, StyleSheet, Dimensions, PanResponder } from 'react-native';
import * as Speech from 'expo-speech';
import { VP, ff, ls } from './theme';
import { Icon } from './Icon';
import { VPButton, SpeakButton, useReducedMotion } from './ui';
import { meaningList, exampleOf, exampleKorOf, WELL_KNOWN_IVL } from './data';
import { UnderlinedKor } from './Quiz';

const SCREEN_H = Dimensions.get('window').height;

/* 펄스 발음 버튼 (재생 중 통통) */
function PulseSpeak({ text }) {
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
    if (tmr.current) clearTimeout(tmr.current);
    try { Speech.stop(); } catch (e) {}
    tmr.current = setTimeout(() => {
      try { Speech.speak(String(text), { language: 'en-US', rate: 0.95, onStart: () => setOn(true), onDone: () => setOn(false), onStopped: () => setOn(false), onError: () => setOn(false) }); }   // ★rate 0.92→0.95: 공용 speak()와 통일
      catch (e) { setOn(false); }
    }, 90);
  };
  return (
    /* ★a11y — 무명 버튼이었음. 46px라 hitSlop은 시각 유지용 최소만 */
    <Pressable onPress={press} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${text} 발음 듣기`}>
      <Animated.View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center', transform: [{ scale: sc }] }}>
        <Icon name="speaker" size={22} color={VP.accent} />
      </Animated.View>
    </Pressable>
  );
}

export default function WordDetail({ word, isFav, ivl = 0, hideFav, onToggleFav, onClose, onConfusing, onPrev, onNext }) {
  const ty = useRef(new Animated.Value(SCREEN_H)).current;   // 화면 아래에서 시작 → 슬라이드업 (grabber 팬도 같은 값 공유)
  const op = useRef(new Animated.Value(0)).current;
  const cop = useRef(new Animated.Value(1)).current;         // ★이전/다음 단어 교체 크로스페이드용 콘텐츠 opacity
  const reduced = useReducedMotion();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: reduced ? 0 : 220, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: reduced ? 0 : 340, easing: Easing.bezier(0.2, 0.9, 0.3, 1.05), useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(op, { toValue: 0, duration: reduced ? 0 : 170, useNativeDriver: true }),
      Animated.timing(ty, { toValue: SCREEN_H, duration: reduced ? 0 : 230, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onClose && onClose());
  };
  // ★PanResponder(1회 생성)가 첫 렌더의 close를 캡처하지 않도록 최신 참조 유지
  const closeRef = useRef(close); closeRef.current = close;

  // ★이전/다음 — 시트를 닫지 않고 단어만 교체(120ms 페이드). 첫 마운트는 건너뜀(열림 모션과 중복 방지)
  const firstWord = useRef(true);
  useEffect(() => {
    if (firstWord.current) { firstWord.current = false; return; }
    cop.setValue(0);
    Animated.timing(cop, { toValue: 1, duration: reduced ? 0 : 120, useNativeDriver: true }).start();
  }, [word && word.id]);

  // ★grabber 실제 팬 — 지금까진 그려만 놓은 거짓 어포던스였음. 120px 이상(또는 빠른 플릭) 끌어내리면 닫힘
  const grabPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
    onPanResponderMove: (_, g) => { if (g.dy > 0) ty.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120 || g.vy > 0.5) closeRef.current();
      else Animated.spring(ty, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 240 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(ty, { toValue: 0, useNativeDriver: true }).start(),
  })).current;

  if (!word) return null;
  const meanings = meaningList(word);
  const ex = exampleOf(word);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="닫기">
          <Animated.View style={{ flex: 1, backgroundColor: 'rgba(8,10,16,0.45)', opacity: op }} />
        </Pressable>

        <Animated.View style={{
          backgroundColor: VP.bg, borderTopLeftRadius: VP.rSheet, borderTopRightRadius: VP.rSheet,
          maxHeight: '88%', transform: [{ translateY: ty }],
        }}>
          {/* grabber — 스크롤과 안 싸우게 ScrollView 밖으로 분리 + 팬 핸들 (터치 높이 ~27 + 폭 전체) */}
          <View {...grabPan.panHandlers} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 12 }}>
            <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: VP.border }} />
          </View>

          <Animated.View style={{ opacity: cop, flexShrink: 1 }}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }} bounces={false}>
              {/* 품사 + #ID */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {/* ★품사 textMute→textSub(정보), #ID textMute→textFaint(장식): 1.6:1 일괄 탈출 */}
                <Text style={{ fontSize: 12, color: VP.textSub, fontStyle: 'italic' }}>{word.pos || ''}</Text>
                <Text style={{ fontSize: 11, color: VP.textFaint, fontFamily: ff(600) }}>#{String(word.id).padStart(3, '0')}</Text>
              </View>

              {/* 단어 + 발음 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                {/* ★40→44: 히어로 단어 크기를 플래시카드·퀴즈(44)와 통일 */}
                <Text style={{ flex: 1, fontSize: 44, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.03, 44) }}>{word.word}</Text>
                <PulseSpeak text={word.word} />
              </View>
              {word.pronunciation ? <Text style={{ fontSize: 14, color: VP.textSub, marginTop: 2 }}>{word.pronunciation}</Text> : null}

              {/* 학습 상태 (박스) — 졸업 / 외우는 중 */}
              {ivl >= WELL_KNOWN_IVL ? (
                <View style={{ marginTop: 14, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: VP.okSoft }}>
                  <Icon name="check" size={13} color={VP.okDeep} />
                  <Text style={{ fontSize: 12, fontFamily: ff(700), color: VP.okDeep }}>다 외운 단어예요</Text>
                </View>
              ) : ivl > 0 ? (
                <View style={{ marginTop: 14, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: VP.accentSoft }}>
                  <Icon name="flame" size={13} color={VP.accent} />
                  <Text style={{ fontSize: 12, fontFamily: ff(700), color: VP.accentDeep }}>아직 헷갈리는 단어 · 복습에 계속 나와요</Text>
                </View>
              ) : null}

              {/* 뜻 */}
              <View style={{ marginTop: 18, gap: 10 }}>
                {meanings.map((m, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: VP.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 11, fontFamily: ff(700), color: '#fff' }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 18, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 18) }}>{m}</Text>
                  </View>
                ))}
              </View>

              {/* 예문 */}
              {ex ? (
                <View style={{ marginTop: 18 }}>
                  <Text style={{ fontSize: 13, fontFamily: ff(700), color: VP.textSub, letterSpacing: ls(-0.01, 13), marginBottom: 8 }}>예문</Text>
                  <View style={{ padding: 16, backgroundColor: VP.surface, borderRadius: 14, borderWidth: 1, borderColor: VP.divider }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <Text style={{ flex: 1, fontSize: 15, color: VP.text, lineHeight: 23, fontStyle: 'italic' }}>"{ex}"</Text>
                      <SpeakButton text={ex} size={34} />
                    </View>
                    {exampleKorOf(word) ? (
                      <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: VP.divider }}>
                        <UnderlinedKor text={exampleKorOf(word)} style={{ fontSize: 13, color: VP.textSub, lineHeight: 20 }} />
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {/* ★하단 액션 — onConfusing이 오면 2버튼(헷갈려요 담기 + ★아이콘). '외운 정도 표시'라는 핵심 행동이
                  시트엔 없어서 목록으로 돌아가 스와이프해야 했던 동선 절단의 수정. 미전달 시 기존 즐겨찾기 단독(하위호환). */}
              {onConfusing ? (
                <View style={{ marginTop: 22, flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => { onConfusing(); close(); }}   // 닫아야 아래 Undo 토스트가 보임(모달이 가림)
                    accessibilityRole="button" accessibilityLabel="헷갈려요에 담기"
                    style={{
                      flex: 1, height: 52, borderRadius: VP.rLg, backgroundColor: VP.surface,
                      borderWidth: 1.5, borderColor: VP.pushRing,
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                    <Icon name="flame" size={16} color={VP.accent} />
                    <Text style={{ fontSize: 15, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 15) }}>헷갈려요에 담기</Text>
                  </Pressable>
                  {hideFav ? null : (
                    <Pressable onPress={onToggleFav}
                      accessibilityRole="button" accessibilityLabel={isFav ? '즐겨찾기 해제' : '즐겨찾기에 추가'} accessibilityState={{ selected: !!isFav }}
                      style={{
                        width: 52, height: 52, borderRadius: VP.rLg, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: isFav ? VP.accentSoft : VP.surface,
                        borderWidth: isFav ? 0 : 1.5, borderColor: VP.pushRing,
                      }}>
                      <Icon name={isFav ? 'star' : 'star-line'} size={22} color={isFav ? VP.accent : VP.textSub} />
                    </Pressable>
                  )}
                </View>
              ) : hideFav ? null : (
                /* 즐겨찾기 단독 (공유 수집 단어·기존 호출부) */
                <View style={{ marginTop: 22 }}>
                  <VPButton
                    variant={isFav ? 'accent' : 'soft'}
                    icon={isFav ? 'star' : 'star-line'}
                    label={isFav ? '즐겨찾기 됨' : '즐겨찾기에 추가'}
                    onPress={onToggleFav}
                  />
                </View>
              )}

              {/* ★이전/다음 — 목록 왕복 없이 시트 안에서 연속 탐색 (호출부가 현재 필터 목록 기준으로 전달) */}
              {(onPrev || onNext) ? (
                <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Pressable disabled={!onPrev} onPress={onPrev}
                    accessibilityRole="button" accessibilityLabel="이전 단어" accessibilityState={{ disabled: !onPrev }}
                    style={{ width: 44, height: 44, borderRadius: VP.rMd, backgroundColor: VP.surface2, alignItems: 'center', justifyContent: 'center', opacity: onPrev ? 1 : 0.4 }}>
                    <Icon name="chevron-left" size={22} color={VP.text} />
                  </Pressable>
                  <Text style={{ fontSize: 12, fontFamily: ff(600), color: VP.textFaint }}>목록에서 이동</Text>
                  <Pressable disabled={!onNext} onPress={onNext}
                    accessibilityRole="button" accessibilityLabel="다음 단어" accessibilityState={{ disabled: !onNext }}
                    style={{ width: 44, height: 44, borderRadius: VP.rMd, backgroundColor: VP.surface2, alignItems: 'center', justifyContent: 'center', opacity: onNext ? 1 : 0.4 }}>
                    <Icon name="chevron-right" size={22} color={VP.text} />
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
