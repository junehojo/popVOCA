/* VocaPoP 단어 상세 — design-reference/vp-proto-detail.jsx (WordDetail) 픽셀 이식.
   바텀시트 모달: 단어+발음 · 틀린기록 뱃지 · 뜻(번호) · 예문 · 즐겨찾기.
   protoSheetUp(.34s cubic-bezier(.2,.9,.3,1.05)) 슬라이드업 + 백드롭 탭 닫기. */
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Animated, Easing, Modal, StyleSheet, Dimensions } from 'react-native';
import * as Speech from 'expo-speech';
import { VP, ff, ls } from './theme';
import { Icon } from './Icon';
import { VPButton, SpeakButton } from './ui';
import { meaningList, exampleOf, WELL_KNOWN_IVL } from './data';
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
      try { Speech.speak(String(text), { language: 'en-US', rate: 0.92, onStart: () => setOn(true), onDone: () => setOn(false), onStopped: () => setOn(false), onError: () => setOn(false) }); }
      catch (e) { setOn(false); }
    }, 90);
  };
  return (
    <Pressable onPress={press} hitSlop={6}>
      <Animated.View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center', transform: [{ scale: sc }] }}>
        <Icon name="speaker" size={22} color={VP.accent} />
      </Animated.View>
    </Pressable>
  );
}

export default function WordDetail({ word, isFav, ivl = 0, onToggleFav, onClose }) {
  const ty = useRef(new Animated.Value(SCREEN_H)).current;   // 화면 아래에서 시작 → 슬라이드업
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 340, easing: Easing.bezier(0.2, 0.9, 0.3, 1.05), useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(op, { toValue: 0, duration: 170, useNativeDriver: true }),
      Animated.timing(ty, { toValue: SCREEN_H, duration: 230, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onClose && onClose());
  };

  if (!word) return null;
  const meanings = meaningList(word);
  const ex = exampleOf(word);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close}>
          <Animated.View style={{ flex: 1, backgroundColor: 'rgba(8,10,16,0.45)', opacity: op }} />
        </Pressable>

        <Animated.View style={{
          backgroundColor: VP.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26,
          maxHeight: '88%', transform: [{ translateY: ty }],
        }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 28 }} bounces={false}>
            {/* grabber */}
            <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 14 }}>
              <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: VP.border }} />
            </View>

            {/* 품사 + #ID */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 12, color: VP.textMute, fontStyle: 'italic' }}>{word.pos || ''}</Text>
              <Text style={{ fontSize: 11, color: VP.textMute, fontFamily: ff(600) }}>#{String(word.id).padStart(3, '0')}</Text>
            </View>

            {/* 단어 + 발음 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <Text style={{ flex: 1, fontSize: 40, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.03, 40) }}>{word.word}</Text>
              <PulseSpeak text={word.word} />
            </View>
            {word.pronunciation ? <Text style={{ fontSize: 14, color: VP.textMute, marginTop: 2 }}>{word.pronunciation}</Text> : null}

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
                <Text style={{ fontSize: 11, fontFamily: ff(800), color: VP.textSub, letterSpacing: ls(0.04, 11), marginBottom: 8 }}>예문</Text>
                <View style={{ padding: 16, backgroundColor: VP.surface, borderRadius: 14, borderWidth: 1, borderColor: VP.divider }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <Text style={{ flex: 1, fontSize: 15, color: VP.text, lineHeight: 23, fontStyle: 'italic' }}>"{ex}"</Text>
                    <SpeakButton text={ex} size={34} />
                  </View>
                  {word.exampleKor ? (
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: VP.divider }}>
                      <UnderlinedKor text={word.exampleKor} style={{ fontSize: 13.5, color: VP.textSub, lineHeight: 20 }} />
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* 즐겨찾기 */}
            <View style={{ marginTop: 22 }}>
              <VPButton
                variant={isFav ? 'accent' : 'soft'}
                icon={isFav ? 'star' : 'star-line'}
                label={isFav ? '즐겨찾기 됨' : '즐겨찾기에 추가'}
                onPress={onToggleFav}
              />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
