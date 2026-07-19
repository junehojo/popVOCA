/* VocaPoP 단어장 — 검색 + 필터칩(전체/즐겨찾기/내 단어) + 형광펜 진척도 + ← 헷갈려요 스와이프(취소 토스트)
   + 걸음(20단어) 스티키 섹션 + 우측 패스트 스크롤 썸 + 위치 복원 + '헷갈리는 단어' 전용 덱.
   '헷갈리는'은 저장 목록이 아니라 박스 SRS(ivl<64) 파생 뷰 — 낮은 박스(헷갈리는)부터, 64 도달 시 자동 졸업. */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, TextInput, FlatList, ScrollView, Animated, PanResponder } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VP, ff, ls, rgba, isDark } from './theme';
import { Icon } from './Icon';
import { VPButton, SpeakButton, ListEmpty, InlineToast, hSel } from './ui';
import { TabBar } from './Home';
import { VOCAB, BY_ID, TOTAL, meaningList, confusingIds, confusingStrength } from './data';
import WordDetail from './WordDetail';

/* ★걸음 섹션·패스트 스크롤의 전제 — 행 높이 균일화(뜻 1줄 고정)로 픽셀 오프셋을 산술 계산 */
const STEP_N = 20;                                        // 걸음당 단어 수
const ROW_H = 68, ROW_MB = 8, ITEM_H = ROW_H + ROW_MB;    // 행 고정 높이 + 행 간격 = 셀 높이
const HDR_H = 36;                                         // 걸음 섹션 헤더 높이
const THUMB_H = 48;                                       // 패스트 스크롤 썸 높이
const LIST_PAD_B = 16;
const SEC_FULL = Math.floor(VOCAB.length / STEP_N);       // 20개 꽉 찬 섹션 수
const SEC_REM = VOCAB.length % STEP_N;                    // 마지막 섹션 잔여(0 = 전부 꽉 참)
const SEC_H = HDR_H + STEP_N * ITEM_H;                    // 꽉 찬 섹션 픽셀 높이
const CONTENT_H = SEC_FULL * SEC_H + (SEC_REM ? HDR_H + SEC_REM * ITEM_H : 0) + LIST_PAD_B;
const SCROLL_KEY = 'vocapop:wb:scroll';                   // 마지막 스크롤 오프셋(전체 뷰) 저장 키

/* SectionList 프레임 index → 픽셀 레이아웃.
   VirtualizedList의 섹션 프레임 순서 = [헤더, 아이템×n, (빈)푸터] 반복 — 푸터는 길이 0으로 계산에 포함해야 어긋나지 않는다 */
function sectionItemLayout(data, index) {
  const per = STEP_N + 2;                                 // 꽉 찬 섹션의 프레임 수(헤더+20+푸터)
  let s, i, offset;
  if (index < SEC_FULL * per) { s = Math.floor(index / per); i = index % per; offset = s * SEC_H; }
  else { s = SEC_FULL; i = index - SEC_FULL * per; offset = SEC_FULL * SEC_H; }
  const n = s < SEC_FULL ? STEP_N : SEC_REM;              // 이 섹션의 아이템 수
  if (i === 0) return { length: HDR_H, offset, index };
  if (i <= n) return { length: ITEM_H, offset: offset + HDR_H + (i - 1) * ITEM_H, index };
  return { length: 0, offset: offset + HDR_H + n * ITEM_H, index };   // 섹션 푸터(높이 0)
}

/* 필터 칩 */
function FilterChip({ children, active, tone, onPress }) {
  let bg = VP.bg, color = VP.textSub, ring = VP.border;
  if (active) {
    ring = null; color = '#fff';
    bg = tone === 'accent' ? VP.accent : VP.text;
  }
  return (
    <Pressable onPress={onPress} style={{
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
      backgroundColor: bg, borderWidth: ring ? 1.5 : 0, borderColor: ring || 'transparent',
      flexDirection: 'row', alignItems: 'center', gap: 4,
    }}>
      <Text style={{ fontSize: 13, fontFamily: ff(700), color, letterSpacing: ls(-0.01, 13) }}>{children}</Text>
    </Pressable>
  );
}

/* 형광펜 단어 행 — ← 헷갈려요(박스1, 형광펜 진해짐) / 익혔어요 → (박스↑, 형광펜 연해짐) / 롱프레스 = 인라인 액션 로우
   custom = 공유로 수집한 미등재 단어: 스와이프는 8px 러버밴드(숫자 id 기반 SRS/즐겨찾기 오염 방지) + 1회성 토스트 안내
   ★높이 ROW_H 고정 — 걸음 섹션 getItemLayout·패스트 스크롤 오프셋 산술의 전제(뜻은 1줄로 자름) */
function WordbookRow({ word, ivl, isFav, custom, failed, onConfusing, onKnownStep, onFav, onTap, onRetry, onCustomSwipe }) {
  const tx = useRef(new Animated.Value(0)).current;
  const [acts, setActs] = useState(false);   // 롱프레스 인라인 액션 로우 표시
  // ★콜백 ref — PanResponder는 1회 생성이라 첫 렌더의 콜백(과거 boxes 캡처)을 계속 잡던 stale 참조를 최신으로 유지
  const cb = useRef({});
  cb.current = { custom, onConfusing, onKnownStep, onTap, onCustomSwipe };
  const TH = 64;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),   // 좌우 끌기 가로채기
    onPanResponderMove: (e, g) => {
      // ★custom은 8px 러버밴드 — '움직이긴 하지만 담기진 않는다'를 촉각으로 알리고, 이유는 1회성 토스트가 설명
      if (cb.current.custom) tx.setValue(Math.max(-8, Math.min(8, g.dx * 0.25)));
      else tx.setValue(Math.max(-120, Math.min(120, g.dx)));
    },
    onPanResponderRelease: (e, g) => {
      const c = cb.current;
      if (c.custom) { if (Math.abs(g.dx) > 24 && c.onCustomSwipe) c.onCustomSwipe(); }
      else if (g.dx < -TH) c.onConfusing();
      else if (g.dx > TH) c.onKnownStep();
      else if (Math.abs(g.dx) < 8) c.onTap();
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
  // ★#번호 → 강도 게이지: 좌측 40px 슬롯에 세로바 3개(4×16). 연속값(알파)은 옆 행과 비교해야 읽혔음 — 3단 이산화로 절대 눈금 제공.
  //   채움색은 알파 틴트 대신 solid accent — 다크모드에서도 명확.
  const lvl = strength <= 0 ? 0 : strength > 0.67 ? 3 : strength > 0.34 ? 2 : 1;

  // 액션 로우는 5초 뒤 자동 닫힘 (행 위 오버레이라 밖 탭으로 닫을 수 없어서)
  useEffect(() => {
    if (!acts) return;
    const t = setTimeout(() => setActs(false), 5000);
    return () => clearTimeout(t);
  }, [acts]);

  return (
    <View style={{ height: ROW_H, marginBottom: ROW_MB, borderRadius: VP.rMd, overflow: 'hidden' }}>
      {/* 뒤 배경 — ← 헷갈려요(핑크) / 익혔어요(초록) → */}
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: VP.rMd, backgroundColor: VP.accentSoft, opacity: opConfusing }} />
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: VP.rMd, backgroundColor: VP.okSoft, opacity: opKnown }} />
      {/* ★900(Black)→700: 13px 소형 텍스트에 900은 획이 뭉개져 오히려 가독성 저하 */}
      <Animated.View style={{ position: 'absolute', right: 18, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 5, opacity: opConfusing }}>
        <Icon name="flame" size={13} color={VP.accent} />
        <Text style={{ fontSize: 13, fontFamily: ff(700), color: VP.accentDeep }}>헷갈려요</Text>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 18, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 5, opacity: opKnown }}>
        <Icon name="check" size={14} color={VP.okDeep} />
        <Text style={{ fontSize: 13, fontFamily: ff(700), color: VP.okDeep }}>익혔어요</Text>
      </Animated.View>

      {/* 앞 카드 */}
      <Animated.View {...pan.panHandlers} style={{
        transform: [{ translateX: tx }],
        backgroundColor: VP.surface, borderRadius: VP.rMd, height: ROW_H,
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingLeft: 14, paddingRight: 10,   // ★paddingRight 6→10: 우측 버튼이 카드 모서리에 붙어 보이던 것 완화
      }}>
        <Pressable onPress={onTap}
          onLongPress={custom ? undefined : () => { hSel(); setActs(true); }} delayLongPress={300}
          accessibilityRole="button"
          /* ★트리아지 3채널 — 스와이프(모터 스킬)·롱프레스 액션 로우(발견 가능)·a11y 액션(스크린리더)이 같은 3액션 */
          accessibilityActions={custom ? undefined : [
            { name: 'confusing', label: '헷갈려요에 담기' },
            { name: 'known', label: '익혔어요' },
            { name: 'detail', label: '상세 보기' },
          ]}
          onAccessibilityAction={custom ? undefined : (e) => {
            const n = e.nativeEvent.actionName;
            if (n === 'confusing') onConfusing();
            else if (n === 'known') onKnownStep();
            else if (n === 'detail') onTap();
          }}
          style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 40 }} accessible={false} importantForAccessibility="no-hide-descendants">
            {custom
              ? <Icon name="pip" size={14} color={VP.textFaint} />
              : (
                <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
                  {[1, 2, 3].map(i => (
                    <View key={i} style={{ width: 4, height: 16, borderRadius: 999, backgroundColor: i <= lvl ? VP.accent : VP.surface2 }} />
                  ))}
                </View>
              )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* 형광펜 — 단어 자체에 칠 (marginLeft -5 + padding 5 로 글자 x위치는 항상 일정) */}
              {/* ★lineHeight 19→21: 17px에 1.12배는 영문 디센더(g/y/p)가 잘리는 비율이었음 */}
              <View style={{ backgroundColor: hi, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 0, marginLeft: -5, flexShrink: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 17, lineHeight: 21, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.01, 17) }}>{word.word}</Text>
              </View>
              {/* ★품사 textMute→textSub: 1.6:1은 사실상 안 보이는 값이었음 */}
              <Text style={{ fontSize: 11, color: VP.textSub, fontStyle: 'italic', marginLeft: 6 }}>{word.pos}</Text>
            </View>
            {failed ? (
              /* ★수집 단어 뜻 로딩 실패 — 죽은 문구 대신 재시도 액션 칩 (failed:0 → enrich 이펙트가 다시 시도) */
              <Pressable onPress={onRetry} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                accessibilityRole="button" accessibilityLabel="뜻 다시 불러오기"
                style={{ alignSelf: 'flex-start', marginTop: 3, backgroundColor: VP.badSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: ff(600), color: VP.badDeep }}>뜻 불러오기 실패 · 탭해서 다시 시도</Text>
              </Pressable>
            ) : (
              <Text numberOfLines={1} style={{ fontSize: 13, lineHeight: 18, color: VP.textSub, marginTop: 2 }}>{meaningList(word).join(' · ')}</Text>
            )}
          </View>
        </Pressable>
        <SpeakButton text={word.word} size={36} />
        {!custom ? (
          /* ★38→44: ★는 행의 유일한 상시 버튼인데 44px 터치 타깃 미달이었음 */
          <Pressable onPress={onFav}
            accessibilityRole="button" accessibilityLabel={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'} accessibilityState={{ selected: !!isFav }}
            style={{
              width: 44, height: 44, borderRadius: VP.rMd, alignItems: 'center', justifyContent: 'center',
              backgroundColor: isFav ? VP.accentSoft : 'transparent',
            }}>
            <Icon name={isFav ? 'star' : 'star-line'} size={20} color={isFav ? VP.accent : VP.textFaint} />
          </Pressable>
        ) : (
          /* ★수집됨 배지 — custom 행이 '기능 빠진 행'이 아니라 '다른 상태의 행'임을 명시 */
          <View style={{ paddingHorizontal: 8, height: 22, borderRadius: 999, backgroundColor: VP.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
            <Text style={{ fontSize: 11, fontFamily: ff(600), color: VP.textSub }}>수집됨</Text>
          </View>
        )}

        {/* ★롱프레스 인라인 액션 로우 — 스와이프와 동일 dispatch를 '보이는 버튼'으로 (행 높이 고정 유지 위해 확장 대신 오버레이) */}
        {acts ? (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: VP.surface, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 }}>
            <Pressable onPress={() => { setActs(false); onConfusing(); }} accessibilityRole="button" accessibilityLabel="헷갈려요에 담기"
              style={{ flex: 1, height: 44, borderRadius: VP.rMd, backgroundColor: VP.accentSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Icon name="flame" size={13} color={VP.accentAA} />
              <Text style={{ fontSize: 12, fontFamily: ff(700), color: VP.accentAA }}>헷갈려요</Text>
            </Pressable>
            <Pressable onPress={() => { setActs(false); onKnownStep(); }} accessibilityRole="button" accessibilityLabel="익혔어요"
              style={{ flex: 1, height: 44, borderRadius: VP.rMd, backgroundColor: VP.okSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Icon name="check" size={13} color={VP.okDeep} />
              <Text style={{ fontSize: 12, fontFamily: ff(700), color: VP.okDeep }}>익혔어요</Text>
            </Pressable>
            <Pressable onPress={() => { setActs(false); onTap(); }} accessibilityRole="button" accessibilityLabel="상세 보기"
              style={{ flex: 1, height: 44, borderRadius: VP.rMd, backgroundColor: VP.surface2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Icon name="wordbook" size={13} color={VP.textSub} />
              <Text style={{ fontSize: 12, fontFamily: ff(700), color: VP.textSub }}>상세</Text>
            </Pressable>
            <Pressable onPress={() => setActs(false)} accessibilityRole="button" accessibilityLabel="닫기"
              style={{ width: 44, height: 44, borderRadius: VP.rMd, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={16} color={VP.textSub} />
            </Pressable>
          </View>
        ) : null}
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
  // ★좌우 16→20: 화면 기본 패딩과 정렬. radius 14→16 토큰 스냅. bottom 82→94: 하단 탭바·제스처 내비와 +12 여유
  return (
    <Animated.View style={{
      position: 'absolute', left: 20, right: 20, bottom: 94,
      backgroundColor: VP.text, borderRadius: 16, paddingVertical: 12, paddingLeft: 16, paddingRight: 8,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      transform: [{ translateY: ty }],
      shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    }}>
      <Text numberOfLines={1} style={{ flex: 1, color: VP.bg, fontSize: 13, fontFamily: ff(600) }}>
        <Text style={{ fontFamily: ff(700) }}>{toast.word}</Text> {toast.msg}
      </Text>
      {/* ★paddingVertical 6→12: 취소는 실수 복구의 유일한 출구인데 터치 높이가 26px였음 → 44 확보 */}
      <Pressable onPress={onUndo} hitSlop={8} accessibilityRole="button" accessibilityLabel="되돌리기" style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
        <Text style={{ color: VP.accent, fontSize: 14, fontFamily: ff(700) }}>취소</Text>
      </Pressable>
    </Animated.View>
  );
}

/* 단어장 첫 방문 1회 — 좌우 스와이프 안내 (상시 배너 대신) */
function WbTutorial({ onClose }) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
      <View style={{ backgroundColor: VP.surface, borderRadius: 20, padding: 20, width: '100%', maxWidth: 340, gap: 14 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="cards" size={24} color={VP.accent} />
          </View>
          <Text style={{ fontSize: 18, fontFamily: ff(700), color: VP.text, marginTop: 10, letterSpacing: ls(-0.02, 18) }}>단어를 좌우로 밀어보세요</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: VP.accentSoft, borderRadius: 14 }}>
          <Icon name="arrow-left" size={20} color={VP.accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: ff(700), color: VP.accentDeep }}>왼쪽 = 헷갈려요</Text>
            <Text style={{ fontSize: 12, color: VP.accentDeep, opacity: 0.8, marginTop: 1, lineHeight: 17 }}>형광펜이 진해지고 복습 목록에 담겨요</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: VP.okSoft, borderRadius: 14 }}>
          <Icon name="arrow-right" size={20} color={VP.okDeep} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: ff(700), color: VP.okDeep }}>오른쪽 = 익혔어요</Text>
            <Text style={{ fontSize: 12, color: VP.okDeep, opacity: 0.9, marginTop: 1, lineHeight: 17 }}>형광펜이 연해지고 다 외우면 사라져요</Text>
          </View>
        </View>
        <VPButton variant="accent" size="md" label="알겠어요" onPress={onClose} />
      </View>
    </View>
  );
}

export default function Wordbook({ state, dispatch }) {
  const [filter, setFilter] = useState(state.vocabView === 'mine' ? 'mine' : 'all'); // all | fav | mine(공유로 수집)
  const [query, setQuery] = useState('');
  const [view, setView] = useState(state.vocabView === 'confusing' ? 'confusing' : 'list');   // list | confusing(헷갈리는 덱) — 통계 딥링크 지원
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState(null);     // {id, prev, word, seq}
  const [mineToast, setMineToast] = useState(null);   // 수집 단어 스와이프 1회성 안내
  const seqRef = useRef(0);
  const mineHintShown = useRef(false);

  const favSet = useMemo(() => new Set(state.favorites), [state.favorites]);
  const boxes = state.boxes || {};
  const ivlOf = (id) => (boxes[id] ? boxes[id].ivl : 0);
  const confIds = useMemo(() => confusingIds(boxes), [state.boxes]);
  const confCount = confIds.length;
  // ★덱 내부 정렬을 confusingStrength 내림차순으로 명시 — 헤더 서브카피 '아직 많이 → 거의 잡음'과 순서 일치 보장
  const confWords = useMemo(() => {
    const sOf = (w) => confusingStrength(boxes[w.id] ? boxes[w.id].ivl : 0);
    return confIds.map(id => BY_ID[id]).filter(Boolean).sort((a, b) => sOf(b) - sOf(a));
  }, [state.boxes]);

  // ★내 단어(2-3) — 공유 시트로 수집한 단어. 커리큘럼 매칭은 원본 단어 객체로,
  //   미등재 단어는 의사(pseudo) 객체로 렌더 (_custom: 스와이프/★ 비활성 — SRS 오염 방지, _failed: 뜻 로딩 실패 → 재시도 칩)
  const myList = useMemo(() => (state.myWords || []).map(m => {
    if (m.id && BY_ID[m.id]) return BY_ID[m.id];
    return {
      id: `u:${m.word}`, word: m.word, pos: m.pos || '',
      korean: m.korean || (m.failed ? '뜻을 불러오지 못했어요' : '뜻 만드는 중이에요 · 잠시 후 채워져요'),
      example: m.example || '', exampleKor: m.exampleKor || '', pronunciation: m.pron || '',
      _custom: true, _failed: !m.korean && !!m.failed,
    };
  }), [state.myWords]);

  // 일반 리스트 (전체/즐겨찾기/내 단어 + 검색)
  const words = useMemo(() => {
    let list = VOCAB;
    if (filter === 'fav') list = list.filter(w => favSet.has(w.id));
    if (filter === 'mine') list = myList;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(w => (w.word && w.word.toLowerCase().includes(q)) || meaningList(w).some(m => m.toLowerCase().includes(q)));
    return list;
  }, [filter, query, favSet, myList]);

  // ★걸음(20단어) 스티키 섹션 — '전체' 뷰(검색어 없음)만. 검색/즐겨찾기/내 단어는 기존 평면 유지.
  //   스와이프 행 로직은 renderRow 공유라 그대로 보존 — SectionList는 RN 공식 스티키 경로라 FlatList 수동 헤더보다 안전.
  const sectioned = view !== 'confusing' && filter === 'all' && !query.trim();
  const sections = useMemo(() => {
    const out = [];
    for (let s = 1; s <= TOTAL; s++) out.push({ stage: s, data: VOCAB.slice((s - 1) * STEP_N, s * STEP_N) });
    return out;
  }, []);

  /* ── 패스트 스크롤 + 위치 복원 (전체 뷰 전용) ── */
  const listRef = useRef(null);
  const [listH, setListH] = useState(0);
  const [dragStage, setDragStage] = useState(0);          // 0 = 드래그 중 아님
  const scrollY = useRef(new Animated.Value(0)).current;  // 썸 위치(네이티브 드라이버)
  const scrollYRef = useRef(0);                           // JS측 현재 오프셋(썸 grant·저장용)
  const dragRef = useRef(0);
  const geo = useRef({ trackH: 1, maxScroll: 1, startTop: 0 });
  const maxScroll = Math.max(1, CONTENT_H - listH);
  const trackH = Math.max(1, listH - THUMB_H - 8);
  geo.current.trackH = trackH; geo.current.maxScroll = maxScroll;   // 렌더 시점 동기화(PanResponder가 ref로 읽음)
  const thumbY = scrollY.interpolate({ inputRange: [0, maxScroll], outputRange: [4, 4 + trackH], extrapolate: 'clamp' });

  const scrollToStage = (s, animated) => {
    try { listRef.current && listRef.current.scrollToLocation({ sectionIndex: s - 1, itemIndex: 0, animated: !!animated, viewOffset: 0 }); } catch (e) {}
  };
  // 스로틀 저장 — 매 프레임 setItem은 낭비라 600ms에 1회 + 언마운트 시 마지막 값
  const saveMeta = useRef({ t: 0, y: 0 });
  const saveOffset = (y) => {
    saveMeta.current.y = y;
    const now = Date.now();
    if (now - saveMeta.current.t > 600) {
      saveMeta.current.t = now;
      AsyncStorage.setItem(SCROLL_KEY, String(Math.round(y))).catch(() => {});
    }
  };
  useEffect(() => () => { AsyncStorage.setItem(SCROLL_KEY, String(Math.round(saveMeta.current.y))).catch(() => {}); }, []);
  const onScroll = useMemo(() => Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true, listener: (e) => { const y = e.nativeEvent.contentOffset.y; scrollYRef.current = y; saveOffset(y); } },
  ), []);
  // ★탭 재진입 위치 복원 — 저장값 로드 + 리스트 레이아웃 완료가 둘 다 되면 1회 점프(getItemLayout 덕에 원거리 점프 안전)
  const [restoreY, setRestoreY] = useState(0);
  const restoredRef = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(SCROLL_KEY).then(v => { const y = parseFloat(v || '0'); if (y > 0) setRestoreY(y); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (restoredRef.current || !restoreY || !listH || !sectioned) return;
    restoredRef.current = true;
    try {
      const sr = listRef.current && listRef.current.getScrollResponder && listRef.current.getScrollResponder();
      if (sr && sr.scrollTo) sr.scrollTo({ y: Math.min(restoreY, CONTENT_H - listH), animated: false });
    } catch (e) {}
  }, [restoreY, listH, sectioned]);
  // ★우측 엣지 썸 — 2,640단어 = 풀스크롤 수십 번이던 것을 드래그 한 번으로. 걸음 단위 디텐트(hSel 틱) + 좌측 버블.
  const fsPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      const g = geo.current;
      g.startTop = g.maxScroll > 0 ? (scrollYRef.current / g.maxScroll) * g.trackH : 0;
      const frac = g.trackH > 0 ? g.startTop / g.trackH : 0;
      const st = Math.max(1, Math.min(TOTAL, Math.round(frac * (TOTAL - 1)) + 1));
      dragRef.current = st; setDragStage(st);
    },
    onPanResponderMove: (e, gs) => {
      const g = geo.current;
      const top = Math.max(0, Math.min(g.trackH, g.startTop + gs.dy));
      const frac = g.trackH > 0 ? top / g.trackH : 0;
      const st = Math.max(1, Math.min(TOTAL, Math.round(frac * (TOTAL - 1)) + 1));
      if (st !== dragRef.current) {
        dragRef.current = st; setDragStage(st); hSel();
        try { listRef.current && listRef.current.scrollToLocation({ sectionIndex: st - 1, itemIndex: 0, animated: false, viewOffset: 0 }); } catch (err) {}
      }
    },
    onPanResponderRelease: () => { dragRef.current = 0; setDragStage(0); },
    onPanResponderTerminate: () => { dragRef.current = 0; setDragStage(0); },
  })).current;

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
  // ★수집 단어 스와이프 시도 — 러버밴드만으론 '왜 안 되지'가 남아 1회성 토스트로 이유 고지
  const onCustomSwipe = () => {
    if (mineHintShown.current) return;
    mineHintShown.current = true;
    setMineToast('수집한 단어는 뜻이 확정된 뒤 학습에 들어가요');
  };

  const renderRow = ({ item: w }) => (
    <WordbookRow
      word={w} ivl={w._custom ? 0 : ivlOf(w.id)} isFav={!w._custom && favSet.has(w.id)} custom={!!w._custom}
      failed={!!w._failed}
      onConfusing={() => { if (!w._custom) markConfusing(w); }}
      onKnownStep={() => { if (!w._custom) markKnownStep(w); }}
      onFav={() => { if (!w._custom) dispatch({ type: 'TOGGLE_FAV', id: w.id }); }}
      onTap={() => setDetail(w)}
      onRetry={() => dispatch({ type: 'MYWORD_UPDATE', word: w.word, fields: { failed: 0 } })}   // enrich 이펙트가 재시도
      onCustomSwipe={onCustomSwipe}
    />
  );

  // ★상세 시트 이전/다음 — 현재 보이는 필터 목록 기준으로 시트 유지한 채 단어 교체
  const detailList = view === 'confusing' ? confWords : words;
  const detailIdx = detail ? detailList.findIndex(w => String(w.id) === String(detail.id)) : -1;

  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      {view === 'confusing' ? (
        /* ───────── 헷갈리는 단어 덱 ───────── */
        <>
          <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable onPress={() => setView('list')} hitSlop={8} accessibilityRole="button" accessibilityLabel="단어장으로 돌아가기" style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, marginLeft: -6 }}>
              <Icon name="chevron-left" size={22} color={VP.text} />
            </Pressable>
            <Icon name="flame" size={18} color={VP.accent} />
            {/* ★20→22/800: 단어장 헤더와 타이틀 위계 통일 */}
            <Text style={{ fontSize: 22, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 22) }}>헷갈리는 단어</Text>
            <View style={{ backgroundColor: VP.accentSoft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
              {/* ★accent→accentAA: accentSoft 위 11px 핑크는 AA 미달이었음 */}
              <Text style={{ fontSize: 11, fontFamily: ff(700), color: VP.accentAA }}>{confCount}개</Text>
            </View>
          </View>
          <Text style={{ paddingHorizontal: 20, paddingBottom: 12, fontSize: 13, color: VP.textSub, fontFamily: ff(600) }}>
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
                {/* ★accent→accentAA: accentSoft 위 11px 핑크는 AA 미달이었음 */}
                <Text style={{ fontSize: 11, fontFamily: ff(700), color: VP.accentAA }}>{Math.min(TOTAL, state.checkedCount + 1)}걸음째</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: VP.textSub, fontFamily: ff(600) }}>{VOCAB.length}개</Text>
          </View>

          {/* 검색 */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <View style={{ backgroundColor: VP.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="search" size={16} color={VP.textSub} />
              {/* ★placeholder textMute→textSub: 안내 문구가 1.6:1이라 사실상 빈 칸으로 보였음 */}
              <TextInput value={query} onChangeText={setQuery} placeholder="단어 또는 뜻 검색" placeholderTextColor={VP.textSub}
                autoCorrect={false} autoCapitalize="none"
                style={{ flex: 1, paddingVertical: 9, fontSize: 15, color: VP.text, fontFamily: ff(500) }} />
              {query ? <Pressable onPress={() => setQuery('')} hitSlop={15} accessibilityRole="button" accessibilityLabel="검색어 지우기"><Icon name="x" size={14} color={VP.textSub} /></Pressable> : null}
            </View>
          </View>

          {/* 필터 칩 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, paddingBottom: 6 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }} keyboardShouldPersistTaps="handled">
            {/* ★즐겨찾기 활성색 tone="accent" 제거 — 같은 세그먼트에서 활성색이 칩마다 달라(다크/핑크) 상태 언어가 이원화됐음. ★ 아이콘만으로 구분 충분 */}
            <FilterChip active={filter === 'all'} onPress={() => setFilter('all')}>전체 {VOCAB.length}</FilterChip>
            <FilterChip active={filter === 'fav'} onPress={() => setFilter('fav')}>★ 즐겨찾기 {state.favorites.length}</FilterChip>
            {/* ★내 단어(2-3) — 공유 시트로 수집한 단어가 있을 때만 노출 */}
            {(state.myWords || []).length > 0 ? (
              <FilterChip active={filter === 'mine'} onPress={() => setFilter('mine')}>내 단어 {(state.myWords || []).length}</FilterChip>
            ) : null}
          </ScrollView>

          {/* 헷갈리는 단어 진입 카드 (검색 중엔 숨김) */}
          {!query.trim() ? (
            confCount > 0 ? (
              <Pressable onPress={() => setView('confusing')} style={{ marginHorizontal: 20, marginTop: 6, marginBottom: 8, padding: 14, borderRadius: 14, backgroundColor: VP.accentSoft, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: VP.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="flame" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: ff(700), color: VP.accentDeep, letterSpacing: ls(-0.02, 15) }}>헷갈리는 단어 {confCount}개</Text>
                  <Text style={{ fontSize: 12, color: VP.accentDeep, opacity: 0.8, marginTop: 1 }}>모아서 플래시카드·테스트로 복습</Text>
                </View>
                <Icon name="chevron-right" size={20} color={VP.accent} />
              </Pressable>
            ) : (
              <View style={{ marginHorizontal: 20, marginTop: 6, marginBottom: 8, padding: 14, borderRadius: 14, backgroundColor: VP.surface, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: VP.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="check" size={20} color={VP.textFaint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: ff(700), color: VP.textSub }}>헷갈리는 단어가 없어요 👏</Text>
                  {/* ★textMute→textSub + 롱프레스 경로 병기: 스와이프를 못 찾은 사용자에게 두 번째 문 안내 */}
                  <Text style={{ fontSize: 12, color: VP.textSub, marginTop: 1 }}>모르는 단어를 왼쪽으로 밀거나, 길게 눌러 담아보세요</Text>
                </View>
              </View>
            )
          ) : null}

          {/* 리스트 — 전체 뷰는 걸음 섹션(SectionList), 검색/즐겨찾기/내 단어는 평면(FlatList) */}
          {sectioned ? (
            <View style={{ flex: 1 }} onLayout={(e) => setListH(e.nativeEvent.layout.height)}>
              <Animated.SectionList
                ref={listRef}
                style={{ flex: 1 }}
                sections={sections}
                keyExtractor={(w) => String(w.id)}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: LIST_PAD_B }}
                stickySectionHeadersEnabled
                initialNumToRender={14} windowSize={9}
                /* removeClippedSubviews는 스티키 헤더와 충돌(안드 헤더 깜빡임)해 섹션 뷰에선 미사용 */
                keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
                renderItem={renderRow}
                getItemLayout={sectionItemLayout}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderSectionHeader={({ section }) => {
                  const learned = section.data.reduce((n, w) => n + (boxes[w.id] ? 1 : 0), 0);   // boxes에 있는 = 학습 시작(외움 진행)
                  return (
                    <View style={{ height: HDR_H, backgroundColor: VP.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontFamily: ff(700), color: VP.textSub }}>{section.stage}걸음</Text>
                      <Text style={{ fontSize: 12, fontFamily: ff(600), color: VP.textSub }}>{learned}/{section.data.length} 외움</Text>
                    </View>
                  );
                }}
              />
              {/* ★현재 걸음 점프 칩 — 위치 복원과 짝: '아무 데나'에서 '학습 앞줄'로 한 탭 복귀 */}
              <Pressable
                onPress={() => scrollToStage(Math.min(TOTAL, (state.checkedCount || 0) + 1), false)}
                accessibilityRole="button" accessibilityLabel="현재 걸음으로 이동" hitSlop={{ top: 6, bottom: 6 }}
                /* top은 스티키 헤더(36) 아래 — 헤더 우측 'M/20 외움' 라벨을 상시 가리지 않게 */
                style={{
                  position: 'absolute', top: HDR_H + 8, right: 40, height: 32, paddingHorizontal: 12, borderRadius: 999,
                  backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
                }}>
                <Text style={{ fontSize: 12, fontFamily: ff(700), color: VP.accentAA }}>현재 걸음으로</Text>
              </Pressable>
              {/* 패스트 스크롤 썸 (터치 폭 32) + 드래그 버블 */}
              {listH > 0 && CONTENT_H > listH ? (
                <>
                  {dragStage ? (
                    <Animated.View pointerEvents="none" style={{ position: 'absolute', right: 40, top: 0, height: THUMB_H, justifyContent: 'center', transform: [{ translateY: thumbY }] }}>
                      <View style={{ backgroundColor: VP.borderStrong, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
                        <Text style={{ color: VP.bg, fontSize: 13, fontFamily: ff(700) }}>{dragStage}걸음</Text>
                      </View>
                    </Animated.View>
                  ) : null}
                  <Animated.View {...fsPan.panHandlers} accessible={false} importantForAccessibility="no-hide-descendants"
                    style={{
                      position: 'absolute', right: 0, top: 0, width: 32, height: THUMB_H,
                      alignItems: 'center', justifyContent: 'center',
                      transform: [{ translateY: thumbY }],
                    }}>
                    <View style={{ width: 6, height: 36, borderRadius: 999, backgroundColor: dragStage ? VP.accent : VP.textFaint, opacity: dragStage ? 1 : 0.55 }} />
                  </Animated.View>
                </>
              ) : null}
            </View>
          ) : (
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
                : filter === 'mine'
                  ? { title: '수집한 단어가 없어요', sub: '다른 앱에서 모르는 단어를 선택해 popVOCA로 공유해 보세요', icon: 'pip' }
                  : { title: '즐겨찾기한 단어가 없어요', sub: '단어 오른쪽 ★ 버튼을 눌러 자주 볼 단어를 모아보세요', icon: 'star-line' })} />}
            />
          )}
        </>
      )}

      <TabBar active="vocab" dispatch={dispatch} />
      <UndoToast toast={toast} onUndo={undo} onHide={() => setToast(null)} />
      <InlineToast text={mineToast} bottom={94} onDone={() => setMineToast(null)} />

      {detail ? (
        <WordDetail
          word={detail}
          isFav={!detail._custom && favSet.has(detail.id)}
          ivl={(!detail._custom && boxes[detail.id] && boxes[detail.id].ivl) || 0}
          hideFav={!!detail._custom}
          onToggleFav={() => { if (!detail._custom) dispatch({ type: 'TOGGLE_FAV', id: detail.id }); }}
          onClose={() => setDetail(null)}
          /* ★시트 하단 2버튼·이전/다음 — custom은 SRS 미편입이라 onConfusing 미전달(버튼 미노출) */
          onConfusing={detail._custom ? undefined : () => markConfusing(detail)}
          onPrev={detailIdx > 0 ? () => setDetail(detailList[detailIdx - 1]) : undefined}
          onNext={detailIdx >= 0 && detailIdx < detailList.length - 1 ? () => setDetail(detailList[detailIdx + 1]) : undefined}
        />
      ) : null}

      {!state.wbTutorialSeen ? <WbTutorial onClose={() => dispatch({ type: 'SEEN_WB_TUTORIAL' })} /> : null}
    </View>
  );
}
