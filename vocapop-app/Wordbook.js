/* VocaPoP 단어장 — 검색 + 필터칩(전체/즐겨찾기) + 형광펜 진척도 + ← 헷갈려요 스와이프(취소 토스트)
   + '헷갈리는 단어' 전용 덱(플래시카드 복습 / 테스트).
   '헷갈리는'은 저장 목록이 아니라 박스 SRS(ivl<64) 파생 뷰 — 낮은 박스(헷갈리는)부터, 64 도달 시 자동 졸업. */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, TextInput, FlatList, ScrollView, Animated, PanResponder } from 'react-native';
import { VP, ff, ls, rgba, isDark } from './theme';
import { Icon } from './Icon';
import { VPButton, SpeakButton, ListEmpty } from './ui';
import { TabBar } from './Home';
import { VOCAB, BY_ID, TOTAL, meaningList, confusingIds, confusingStrength } from './data';
import WordDetail from './WordDetail';

/* 필터 칩 */
function FilterChip({ children, active, tone, onPress }) {
  let bg = VP.bg, color = VP.textSub, ring = VP.border;
  if (active) {
    ring = null; color = '#fff';
    bg = tone === 'accent' ? VP.accent : VP.text;
  }
  return (
    <Pressable onPress={onPress} style={{
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
      backgroundColor: bg, borderWidth: ring ? 1.5 : 0, borderColor: ring || 'transparent',
      flexDirection: 'row', alignItems: 'center', gap: 4,
    }}>
      <Text style={{ fontSize: 13, fontFamily: ff(700), color, letterSpacing: ls(-0.01, 13) }}>{children}</Text>
    </Pressable>
  );
}

/* 형광펜 단어 행 — ← 헷갈려요(박스1, 형광펜 진해짐) / 익혔어요 → (박스↑, 형광펜 연해짐) */
function WordbookRow({ word, ivl, isFav, onConfusing, onKnownStep, onFav, onTap }) {
  const tx = useRef(new Animated.Value(0)).current;
  const TH = 64;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),   // 좌우 끌기 가로채기
    onPanResponderMove: (e, g) => tx.setValue(Math.max(-120, Math.min(120, g.dx))),
    onPanResponderRelease: (e, g) => {
      if (g.dx < -TH) onConfusing();
      else if (g.dx > TH) onKnownStep();
      else if (Math.abs(g.dx) < 8) onTap();
      Animated.spring(tx, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(tx, { toValue: 0, useNativeDriver: true }).start(),
  })).current;
  const opConfusing = tx.interpolate({ inputRange: [-70, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const opKnown = tx.interpolate({ inputRange: [0, 70], outputRange: [0, 1], extrapolate: 'clamp' });

  // 형광펜: 헷갈리는 정도(0~1)→알파. ivl>=64(졸업)·미시작 단어는 형광펜 없음. 다크는 가독성 위해 더 옅게.
  const strength = confusingStrength(ivl);
  const dk = isDark();
  const a0 = dk ? 0.07 : 0.10, a1 = dk ? 0.26 : 0.34;
  const hi = strength > 0 ? rgba(VP.accent, a0 + strength * (a1 - a0)) : 'transparent';

  return (
    <View style={{ marginBottom: 8, borderRadius: 12, overflow: 'hidden' }}>
      {/* 뒤 배경 — ← 헷갈려요(핑크) / 익혔어요(초록) → */}
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 12, backgroundColor: VP.accentSoft, opacity: opConfusing }} />
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 12, backgroundColor: VP.okSoft, opacity: opKnown }} />
      <Animated.View style={{ position: 'absolute', right: 18, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 5, opacity: opConfusing }}>
        <Icon name="flame" size={13} color={VP.accent} />
        <Text style={{ fontSize: 13, fontFamily: ff(900), color: VP.accentDeep }}>헷갈려요</Text>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 18, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 5, opacity: opKnown }}>
        <Icon name="check" size={14} color={VP.okDeep} />
        <Text style={{ fontSize: 13, fontFamily: ff(900), color: VP.okDeep }}>익혔어요</Text>
      </Animated.View>

      {/* 앞 카드 */}
      <Animated.View {...pan.panHandlers} style={{
        transform: [{ translateX: tx }],
        backgroundColor: VP.surface, borderRadius: 12,
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 12, paddingLeft: 14, paddingRight: 6,
      }}>
        <Pressable onPress={onTap} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 40 }}>
            <Text numberOfLines={1} style={{ fontSize: 10.5, color: VP.textMute, fontFamily: ff(600) }}>#{String(word.id).padStart(3, '0')}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* 형광펜 — 단어 자체에 칠 (marginLeft -5 + padding 5 로 글자 x위치는 항상 일정) */}
              <View style={{ backgroundColor: hi, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 0, marginLeft: -5 }}>
                <Text style={{ fontSize: 17, lineHeight: 19, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.01, 17) }}>{word.word}</Text>
              </View>
              <Text style={{ fontSize: 11, color: VP.textMute, fontStyle: 'italic', marginLeft: 6 }}>{word.pos}</Text>
            </View>
            <Text numberOfLines={1} style={{ fontSize: 13, color: VP.textSub, marginTop: 2 }}>{meaningList(word).join(' · ')}</Text>
          </View>
        </Pressable>
        <SpeakButton text={word.word} size={36} />
        <Pressable onPress={onFav} hitSlop={4} style={{
          width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
          backgroundColor: isFav ? VP.accentSoft : 'transparent',
        }}>
          <Icon name={isFav ? 'star' : 'star-line'} size={20} color={isFav ? VP.accent : VP.textMute} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

/* '헷갈려요' 담은 뒤 하단 취소 토스트 (3초 후 자동 사라짐, Gmail 보관 방식) */
function UndoToast({ toast, onUndo, onHide }) {
  const ty = useRef(new Animated.Value(70)).current;
  useEffect(() => {
    if (!toast) return;
    ty.setValue(70);
    Animated.spring(ty, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 7 }).start();
    const t = setTimeout(onHide, 3000);
    return () => clearTimeout(t);
  }, [toast && toast.seq]);
  if (!toast) return null;
  return (
    <Animated.View style={{
      position: 'absolute', left: 16, right: 16, bottom: 82,
      backgroundColor: VP.text, borderRadius: 14, paddingVertical: 12, paddingLeft: 16, paddingRight: 8,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      transform: [{ translateY: ty }],
      shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    }}>
      <Text numberOfLines={1} style={{ flex: 1, color: VP.bg, fontSize: 13.5, fontFamily: ff(600) }}>
        <Text style={{ fontFamily: ff(800) }}>{toast.word}</Text> {toast.msg}
      </Text>
      <Pressable onPress={onUndo} hitSlop={8} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
        <Text style={{ color: VP.accent, fontSize: 14, fontFamily: ff(800) }}>취소</Text>
      </Pressable>
    </Animated.View>
  );
}

/* 단어장 첫 방문 1회 — 좌우 스와이프 안내 (상시 배너 대신) */
function WbTutorial({ onClose }) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
      <View style={{ backgroundColor: VP.surface, borderRadius: 22, padding: 22, width: '100%', maxWidth: 340, gap: 14 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="cards" size={24} color={VP.accent} />
          </View>
          <Text style={{ fontSize: 18, fontFamily: ff(800), color: VP.text, marginTop: 10, letterSpacing: ls(-0.02, 18) }}>단어를 좌우로 밀어보세요</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: VP.accentSoft, borderRadius: 14 }}>
          <Icon name="arrow-left" size={20} color={VP.accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: ff(800), color: VP.accentDeep }}>왼쪽 = 헷갈려요</Text>
            <Text style={{ fontSize: 12, color: VP.accentDeep, opacity: 0.8, marginTop: 1, lineHeight: 17 }}>형광펜이 진해지고 복습 목록에 담겨요</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: VP.okSoft, borderRadius: 14 }}>
          <Icon name="arrow-right" size={20} color={VP.okDeep} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: ff(800), color: VP.okDeep }}>오른쪽 = 익혔어요</Text>
            <Text style={{ fontSize: 12, color: VP.okDeep, opacity: 0.9, marginTop: 1, lineHeight: 17 }}>형광펜이 연해지고 다 외우면 사라져요</Text>
          </View>
        </View>
        <VPButton variant="accent" size="md" label="알겠어요" onPress={onClose} />
      </View>
    </View>
  );
}

export default function Wordbook({ state, dispatch }) {
  const [filter, setFilter] = useState('all'); // all | fav
  const [query, setQuery] = useState('');
  const [view, setView] = useState(state.vocabView === 'confusing' ? 'confusing' : 'list');   // list | confusing(헷갈리는 덱) — 통계 딥링크 지원
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState(null);     // {id, prev, word, seq}
  const seqRef = useRef(0);

  const favSet = useMemo(() => new Set(state.favorites), [state.favorites]);
  const boxes = state.boxes || {};
  const ivlOf = (id) => (boxes[id] ? boxes[id].ivl : 0);
  const confIds = useMemo(() => confusingIds(boxes), [state.boxes]);
  const confCount = confIds.length;
  const confWords = useMemo(() => confIds.map(id => BY_ID[id]).filter(Boolean), [state.boxes]);

  // 일반 리스트 (전체/즐겨찾기 + 검색)
  const words = useMemo(() => {
    let list = VOCAB;
    if (filter === 'fav') list = list.filter(w => favSet.has(w.id));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(w => (w.word && w.word.toLowerCase().includes(q)) || meaningList(w).some(m => m.toLowerCase().includes(q)));
    return list;
  }, [filter, query, favSet]);

  const markConfusing = (w) => {
    seqRef.current += 1;
    setToast({ id: w.id, prev: boxes[w.id], word: w.word, seq: seqRef.current, msg: '헷갈리는 단어에 담았어요' });
    dispatch({ type: 'MARK_CONFUSING', id: w.id });
  };
  const markKnownStep = (w) => {
    seqRef.current += 1;
    const msg = boxes[w.id] ? '익혔어요 · 형광펜이 연해졌어요' : '아는 단어로 표시했어요';   // 학습 전 단어는 형광펜이 없으니 문구 구분
    setToast({ id: w.id, prev: boxes[w.id], word: w.word, seq: seqRef.current, msg });
    dispatch({ type: 'MARK_KNOWN_STEP', id: w.id });
  };
  const undo = () => {
    if (toast) dispatch({ type: 'RESTORE_BOX', id: toast.id, prev: toast.prev });
    setToast(null);
  };

  const renderRow = ({ item: w }) => (
    <WordbookRow
      word={w} ivl={ivlOf(w.id)} isFav={favSet.has(w.id)}
      onConfusing={() => markConfusing(w)}
      onKnownStep={() => markKnownStep(w)}
      onFav={() => dispatch({ type: 'TOGGLE_FAV', id: w.id })}
      onTap={() => setDetail(w)}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      {view === 'confusing' ? (
        /* ───────── 헷갈리는 단어 덱 ───────── */
        <>
          <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable onPress={() => setView('list')} hitSlop={8} style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, marginLeft: -6 }}>
              <Icon name="chevron-left" size={22} color={VP.text} />
            </Pressable>
            <Icon name="flame" size={18} color={VP.accent} />
            <Text style={{ fontSize: 20, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 20) }}>헷갈리는 단어</Text>
            <View style={{ backgroundColor: VP.accentSoft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
              <Text style={{ fontSize: 11, fontFamily: ff(800), color: VP.accent }}>{confCount}개</Text>
            </View>
          </View>
          <Text style={{ paddingHorizontal: 20, paddingBottom: 12, fontSize: 12.5, color: VP.textSub, fontFamily: ff(600) }}>
            아직 많이 → 거의 잡음 · 형광펜이 옅어질수록 거의 외운 거예요
          </Text>

          {confCount > 0 ? (
            <View style={{ paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <VPButton variant="accent" size="md" icon="cards" label="플래시카드 복습" onPress={() => dispatch({ type: 'START_CONFUSING_REVIEW' })} />
              </View>
              <View style={{ flex: 1 }}>
                <VPButton variant="soft" size="md" icon="check" label="테스트" onPress={() => dispatch({ type: 'START_CONFUSING_QUIZ' })} />
              </View>
            </View>
          ) : null}

          <FlatList
            style={{ flex: 1 }}
            data={confWords}
            keyExtractor={(w) => String(w.id)}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, flexGrow: 1 }}
            initialNumToRender={14} windowSize={9} removeClippedSubviews
            renderItem={renderRow}
            ListEmptyComponent={<ListEmpty title="헷갈리는 단어가 없어요" sub="플래시카드에서 몰라요 하거나, 단어장에서 단어를 왼쪽으로 밀면 여기 모여요" icon="flame" accent />}
          />
        </>
      ) : (
        /* ───────── 일반 단어장 ───────── */
        <>
          <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 22, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 22) }}>단어장</Text>
              <View style={{ backgroundColor: VP.accentSoft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
                <Text style={{ fontSize: 11, fontFamily: ff(700), color: VP.accent }}>{Math.min(TOTAL, state.checkedCount + 1)}걸음째</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: VP.textSub, fontFamily: ff(600) }}>{VOCAB.length}개</Text>
          </View>

          {/* 검색 */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <View style={{ backgroundColor: VP.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="search" size={16} color={VP.textSub} />
              <TextInput value={query} onChangeText={setQuery} placeholder="단어 또는 뜻 검색" placeholderTextColor={VP.textMute}
                autoCorrect={false} autoCapitalize="none"
                style={{ flex: 1, paddingVertical: 9, fontSize: 15, color: VP.text, fontFamily: ff(500) }} />
              {query ? <Pressable onPress={() => setQuery('')} hitSlop={8}><Icon name="x" size={14} color={VP.textSub} /></Pressable> : null}
            </View>
          </View>

          {/* 필터 칩 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, paddingBottom: 6 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }} keyboardShouldPersistTaps="handled">
            <FilterChip active={filter === 'all'} onPress={() => setFilter('all')}>전체 {VOCAB.length}</FilterChip>
            <FilterChip active={filter === 'fav'} tone="accent" onPress={() => setFilter('fav')}>★ 즐겨찾기 {state.favorites.length}</FilterChip>
          </ScrollView>

          {/* 헷갈리는 단어 진입 카드 (검색 중엔 숨김) */}
          {!query.trim() ? (
            confCount > 0 ? (
              <Pressable onPress={() => setView('confusing')} style={{ marginHorizontal: 20, marginTop: 6, marginBottom: 8, padding: 14, borderRadius: 14, backgroundColor: VP.accentSoft, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: VP.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="flame" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: ff(800), color: VP.accentDeep, letterSpacing: ls(-0.02, 15) }}>헷갈리는 단어 {confCount}개</Text>
                  <Text style={{ fontSize: 12, color: VP.accentDeep, opacity: 0.8, marginTop: 1 }}>모아서 플래시카드·테스트로 복습</Text>
                </View>
                <Icon name="chevron-right" size={20} color={VP.accent} />
              </Pressable>
            ) : (
              <View style={{ marginHorizontal: 20, marginTop: 6, marginBottom: 8, padding: 14, borderRadius: 14, backgroundColor: VP.surface, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: VP.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="check" size={20} color={VP.textMute} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: ff(700), color: VP.textSub }}>헷갈리는 단어가 없어요 👏</Text>
                  <Text style={{ fontSize: 12, color: VP.textMute, marginTop: 1 }}>모르는 단어를 왼쪽으로 밀어 담아보세요</Text>
                </View>
              </View>
            )
          ) : null}

          {/* 리스트 (스와이프 안내는 첫 방문 튜토리얼로 이동) */}
          <FlatList
            style={{ flex: 1 }}
            data={words}
            keyExtractor={(w) => String(w.id)}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, flexGrow: 1 }}
            initialNumToRender={14} windowSize={9} removeClippedSubviews
            keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
            renderItem={renderRow}
            ListEmptyComponent={<ListEmpty {...(query
              ? { title: '검색 결과 없음', sub: `'${query}'에 해당하는 단어가 없어요`, icon: 'search' }
              : { title: '즐겨찾기한 단어가 없어요', sub: '단어 오른쪽 ★ 버튼을 눌러 자주 볼 단어를 모아보세요', icon: 'star-line' })} />}
          />
        </>
      )}

      <TabBar active="vocab" dispatch={dispatch} />
      <UndoToast toast={toast} onUndo={undo} onHide={() => setToast(null)} />

      {detail ? (
        <WordDetail
          word={detail}
          isFav={favSet.has(detail.id)}
          ivl={(boxes[detail.id] && boxes[detail.id].ivl) || 0}
          onToggleFav={() => dispatch({ type: 'TOGGLE_FAV', id: detail.id })}
          onClose={() => setDetail(null)}
        />
      ) : null}

      {!state.wbTutorialSeen ? <WbTutorial onClose={() => dispatch({ type: 'SEEN_WB_TUTORIAL' })} /> : null}
    </View>
  );
}
