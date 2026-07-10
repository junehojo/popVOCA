/* VocaPoP 플래시카드 + 카드완료 — design-reference/vp-proto-screens-1.jsx (FlashCardBase, ProtoCardDone) 이식.
   3D 플립(rotateY .55s), 두꺼운 카드 그림자, 앞/뒤면. 동작은 RN 리듀서(2라운드) 그대로. */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Animated, Easing } from 'react-native';
import { VP, ff, ls } from './theme';
import { Icon } from './Icon';
import { VPButton, ProtoTopBar, ProtoFooter, SpeakButton, speak, playSfx, hTap } from './ui';
import { BY_ID, wordsForStage, meaningList, exampleOf } from './data';
import { UnderlinedKor } from './Quiz';
import * as Overlay from './modules/vocapop-overlay';

/* ───── 플래시카드 ───── */
export function FlashcardScreen({ state, dispatch, onOverlay }) {
  const isR2 = state.cardRound === 2;
  const session = state.cardSession || [];
  const word = isR2 ? BY_ID[state.cardQueue[0]] : (session[state.cardIdx] && BY_ID[session[state.cardIdx].id]);
  const review = !!((session.find(c => word && c.id === word.id) || {}).review);   // 복습 단어 뱃지용
  const sessionLen = session.length || 1;

  const [flipped, setFlipped] = useState(false);
  const flip = useRef(new Animated.Value(0)).current;
  // 단어 바뀌면 앞면으로 리셋(애니메이션 없이)
  useEffect(() => { flip.setValue(0); setFlipped(false); }, [word && word.id, state.cardRound]);
  // 카드 나올 때마다 발음 자동 재생 (설정 '발음 자동 재생' 켜져 있으면) — 오버레이 카드 넘길 때도 같이
  useEffect(() => {
    if (word && state.settings && state.settings.autoPlay) speak(word.word);
  }, [word && word.id]);
  useEffect(() => {
    Animated.timing(flip, { toValue: flipped ? 1 : 0, duration: 550, easing: Easing.bezier(0.4, 0.1, 0.2, 1), useNativeDriver: true }).start();
  }, [flipped]);

  if (!word) return null;

  const total = isR2 ? (state.cardR2Initial || state.cardQueue.length || 1) : sessionLen;
  const progress = isR2
    ? (((state.cardR2Initial || total) - state.cardQueue.length) / (state.cardR2Initial || total)) * 100
    : ((state.cardIdx + 1) / sessionLen) * 100;
  const progressLabel = isR2 ? `남은 ${state.cardQueue.length}` : `${state.cardIdx + 1} / ${sessionLen}`;

  const frontRot = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRot = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const faceBase = {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1.5, borderColor: VP.border, borderRadius: 24,
    paddingHorizontal: 24, paddingVertical: 28,
    backfaceVisibility: 'hidden', overflow: 'hidden',
  };
  const onAnswer = (choice) => dispatch({ type: 'CARD_ANSWER', id: word.id, choice });
  const overlayBtn = Overlay.isSupported() && onOverlay ? () => onOverlay(state.activeStage, true) : undefined;
  // R1에서 한 장이라도 답했으면 '이전 카드'로 정정 가능 (R2 드릴은 큐가 섞여 이전 개념 없음)
  const canPrev = !isR2 && state.cardIdx > 0 && (state.cardHistory || []).length > 0;
  const prevBtn = canPrev ? (
    <Pressable onPress={() => { hTap(); dispatch({ type: 'CARD_PREV' }); }} hitSlop={6} style={{
      width: 56, height: 56, borderRadius: 14, backgroundColor: VP.surface2,
      borderWidth: 1.5, borderColor: VP.border, alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name="arrow-left" size={20} color={VP.textSub} />
    </Pressable>
  ) : null;

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

      {/* 카드 무대 */}
      <Pressable onPress={() => { hTap(); playSfx('flip'); setFlipped(f => !f); }} style={{ flex: 1, marginHorizontal: 20, marginTop: 8, marginBottom: 12 }}>
        {/* 카드 바닥 그림자 (0 4px 0 0 cardShade) */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 4, bottom: -4, borderRadius: 24, backgroundColor: VP.cardShade }} />
        {/* 앞면 */}
        <Animated.View style={[faceBase, { backgroundColor: VP.bg, transform: [{ perspective: 1400 }, { rotateY: frontRot }] }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: isR2 ? VP.accent : VP.surface }}>
              <Text style={{ fontSize: 11, fontFamily: ff(700), color: isR2 ? '#fff' : VP.textSub, letterSpacing: ls(0.02, 11) }}>{isR2 ? '2R · 다시' : '1R'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {review && <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: VP.accentSoft, marginRight: 6 }}><Text style={{ fontSize: 10, fontFamily: ff(800), color: VP.accent }}>복습</Text></View>}
              <Text style={{ fontSize: 11, fontFamily: ff(600), color: VP.textMute }}>#{String(word.id).padStart(3, '0')}</Text>
            </View>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 11, fontStyle: 'italic', color: VP.textMute, marginBottom: 12 }}>{word.pos}</Text>
            <Text style={{ fontSize: 44, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.03, 44), textAlign: 'center' }}>{word.word}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
              {word.pronunciation ? <Text style={{ fontSize: 14, color: VP.textMute }}>{word.pronunciation}</Text> : null}
              <SpeakButton text={word.word} size={34} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: VP.textMute, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
              <Icon name="rotate" size={13} color={VP.textMute} />
            </View>
            <Text style={{ fontSize: 13, color: VP.textMute }}>탭해서 뒤집기</Text>
          </View>
        </Animated.View>
        {/* 뒷면 */}
        <Animated.View style={[faceBase, { backgroundColor: VP.surface, transform: [{ perspective: 1400 }, { rotateY: backRot }] }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: VP.bg }}>
              <Text style={{ fontSize: 11, fontFamily: ff(700), color: VP.textSub, letterSpacing: ls(0.02, 11) }}>뒷면</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {review && <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: VP.accentSoft, marginRight: 6 }}><Text style={{ fontSize: 10, fontFamily: ff(800), color: VP.accent }}>복습</Text></View>}
              <Text style={{ fontSize: 11, fontFamily: ff(600), color: VP.textMute }}>#{String(word.id).padStart(3, '0')}</Text>
            </View>
          </View>
          <View style={{ flex: 1, paddingTop: 8 }}>
            <View style={{ marginBottom: 18 }}>
              <Text style={{ fontSize: 11, fontStyle: 'italic', color: VP.textMute, marginBottom: 6 }}>{word.pos}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ flex: 1, fontSize: 28, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 28) }}>{word.word}</Text>
                <SpeakButton text={word.word} size={34} />
              </View>
              {word.pronunciation ? <Text style={{ fontSize: 13, color: VP.textMute, marginTop: 2 }}>{word.pronunciation}</Text> : null}
            </View>
            <View style={{ gap: 8 }}>
              {meaningList(word).map((m, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: VP.accent, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                    <Text style={{ fontSize: 10, fontFamily: ff(700), color: '#fff' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 18, fontFamily: ff(600), color: VP.text, letterSpacing: ls(-0.02, 18) }}>{m}</Text>
                </View>
              ))}
            </View>
            {!!exampleOf(word) && (
              <View style={{ marginTop: 'auto', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: VP.bg, borderRadius: 12, borderWidth: 1, borderColor: VP.divider }}>
                <Text style={{ fontSize: 14, color: VP.textSub, fontStyle: 'italic', lineHeight: 21 }}>"{exampleOf(word)}"</Text>
                {word.exampleKor ? (
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: VP.divider }}>
                    <UnderlinedKor text={word.exampleKor} style={{ fontSize: 13, color: VP.textSub, lineHeight: 19 }} />
                  </View>
                ) : null}
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
            <Icon name="rotate" size={12} color={VP.textMute} />
            <Text style={{ fontSize: 12, color: VP.textMute, marginLeft: 6 }}>탭하면 앞면으로</Text>
          </View>
        </Animated.View>
      </Pressable>

      {/* 푸터 — canPrev면 좌측에 '이전 카드'(답 정정) 버튼 */}
      {flipped ? (
        <ProtoFooter>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {prevBtn}
            <VPButton variant="default" full={false} style={{ flex: 1 }} label={isR2 ? '아직 어려워요' : '몰라요'} onPress={() => onAnswer('dontknow')} />
            <VPButton variant="accent" full={false} style={{ flex: 1 }} label={isR2 ? '기억했어요!' : '알아요'} onPress={() => onAnswer('know')} />
          </View>
        </ProtoFooter>
      ) : (
        <ProtoFooter>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {prevBtn}
            <VPButton variant="primary" full={false} style={{ flex: 1 }} label="뜻 보기" iconRight="rotate" onPress={() => { playSfx('flip'); setFlipped(true); }} />
          </View>
        </ProtoFooter>
      )}
    </View>
  );
}

/* ───── 카드 완료 ───── */
export function CardDoneScreen({ state, dispatch }) {
  const stage = state.activeStage;
  const reviewN = (state.cardSession || []).filter(c => c.review).length;
  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <ProtoTopBar onBack={() => dispatch({ type: 'GO', screen: 'home' })} icon={<Icon name="cards" size={16} color={VP.text} />} label="플래시카드" right="체크 완료" />
      <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: VP.okSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={38} color={VP.ok} strokeWidth={2.5} />
        </View>
        <Text style={{ fontSize: 24, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 24), marginTop: 16 }}>{stage}걸음 체크 완료!</Text>
        <Text style={{ fontSize: 14, color: VP.textSub, marginTop: 6, textAlign: 'center', lineHeight: 21 }}>새 단어 20개{reviewN > 0 ? ` + 복습 ${reviewN}개` : ''}를 다 훑었어요.{'\n'}퀴즈로 점검하거나, 다음 걸음을 이어서 체크해도 돼요.</Text>
        <View style={{ width: '100%', maxWidth: 300, marginTop: 16, padding: 16, backgroundColor: VP.surface, borderRadius: 14, gap: 10 }}>
          <TrackRow done label="체크" sub="카드 학습 완료" />
          <TrackRow label="퀴즈 점검" sub="선택 — 안 해도 진행 OK" />
        </View>
      </View>
      <ProtoFooter>
        <VPButton variant="accent" icon="pencil" label="퀴즈로 점검하기" onPress={() => dispatch({ type: 'START_QUIZ', stage })} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <VPButton variant="default" full={false} style={{ flex: 1 }} label="다음 걸음 체크" onPress={() => dispatch({ type: 'START_CARD', stage: state.checkedCount + 1 })} />
          <VPButton variant="default" full={false} style={{ flex: 1 }} label="홈으로" onPress={() => dispatch({ type: 'GO', screen: 'home' })} />
        </View>
      </ProtoFooter>
    </View>
  );
}

function TrackRow({ done, label, sub }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, marginRight: 11, alignItems: 'center', justifyContent: 'center',
        backgroundColor: done ? VP.ok : 'transparent', borderWidth: done ? 0 : 1.5, borderColor: VP.textMute, borderStyle: done ? 'solid' : 'dashed' }}>
        <Icon name={done ? 'check-bold' : 'pencil'} size={done ? 14 : 13} color={done ? '#fff' : VP.textMute} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontFamily: ff(800), color: done ? VP.text : VP.textSub, letterSpacing: ls(-0.02, 14) }}>{label}</Text>
        <Text style={{ fontSize: 12, color: VP.textMute, marginTop: 1 }}>{sub}</Text>
      </View>
      {done && <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: VP.okSoft }}><Text style={{ fontSize: 11, fontFamily: ff(800), color: VP.okDeep }}>완료</Text></View>}
    </View>
  );
}

/* ───── 단어 미리보기 (카드 전 20단어 훑기) ───── */
export function PreviewScreen({ state, dispatch }) {
  const words = wordsForStage(state.activeStage);
  const reviewN = (state.cardSession || []).filter(c => c.review).length;
  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <ProtoTopBar onBack={() => dispatch({ type: 'PAUSE' })} icon={<Icon name="book-open" size={16} color={VP.text} />} label={`미리보기 · ${state.activeStage}걸음째`} />
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 22) }}>이번에 외울 {words.length}단어</Text>
        <Text style={{ fontSize: 13, color: VP.textSub, marginTop: 4 }}>가볍게 훑어보기 — 다 외우지 않아도 OK{reviewN > 0 ? ` · 복습 ${reviewN}개가 카드에 섞여 나와요` : ''}</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        {words.map(w => (
          <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, backgroundColor: VP.surface, borderRadius: 12 }}>
            <Text numberOfLines={1} style={{ fontSize: 10.5, color: VP.textMute, fontFamily: ff(600), width: 40 }}>#{String(w.id).padStart(3, '0')}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 17, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.01, 17) }}>{w.word}</Text>
                <Text style={{ fontSize: 11, color: VP.textMute, fontStyle: 'italic' }}>{w.pos}</Text>
              </View>
              <Text style={{ fontSize: 13, color: VP.textSub, marginTop: 2, lineHeight: 18 }}>{meaningList(w).join(' · ')}</Text>
            </View>
            <SpeakButton text={w.word} size={32} />
          </View>
        ))}
      </ScrollView>
      <ProtoFooter>
        <VPButton variant="accent" label="카드로 시작" iconRight="arrow-right" onPress={() => dispatch({ type: 'GO', screen: 'card' })} />
      </ProtoFooter>
    </View>
  );
}

/* ───── 1라운드 끝 → 2라운드 전환 ───── */
export function CardR1EndScreen({ state, dispatch }) {
  const count = state.cardQueue.length;
  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <ProtoTopBar onBack={() => dispatch({ type: 'PAUSE' })} icon={<Icon name="cards" size={16} color={VP.text} />} label="플래시카드" right="1R 완료" />
      <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="repeat" size={36} color={VP.accent} />
        </View>
        <Text style={{ fontSize: 22, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 22) }}>다 외울 때까지</Text>
        <Text style={{ fontSize: 15, color: VP.textSub, lineHeight: 24, textAlign: 'center', maxWidth: 280 }}>
          방금 <Text style={{ color: VP.text, fontFamily: ff(700) }}>몰라요</Text>로 체크한 <Text style={{ color: VP.accent, fontFamily: ff(700) }}>{count}개</Text>를{'\n'}기억할 때까지 보여드려요
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: VP.surface, borderRadius: 12 }}>
          <Icon name="lightbulb" size={14} color={VP.textSub} />
          <Text style={{ fontSize: 12, color: VP.textSub, fontFamily: ff(500) }}>아직 어려운 단어는 다시 등장해요</Text>
        </View>
      </View>
      <ProtoFooter>
        <VPButton variant="accent" label="이제 다 외워볼까요" onPress={() => dispatch({ type: 'START_CARD_R2' })} />
      </ProtoFooter>
    </View>
  );
}
