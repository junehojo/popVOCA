/* VocaPoP 설정 — design-reference/vp-proto-screens-stats.jsx (ProtoSettings) 픽셀 이식.
   동작(설정 토글·하루목표·진행초기화)은 로컬저장 유지, 디자인만 프로토 일치.
   ⚠️ 다크모드 토글은 값만 저장 — 실제 다크 테마(앱 전체 토큰 교체)는 별도 트랙. */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Animated, Easing, Alert, Platform, PermissionsAndroid, Share } from 'react-native';
import { VP, ff, ls } from './theme';
import { Icon } from './Icon';
import { TabBar } from './Home';
/* ★시트 3종(도메인·잠금·알림시간)을 ui.js BottomSheet(340ms 슬라이드업)로 통일 — fade Modal 폐기 */
import { VPButton, BottomSheet } from './ui';
import { TOTAL, wordsForStage, startedIds, confusingIds, WELL_KNOWN_IVL } from './data';
import * as Overlay from './modules/vocapop-overlay';
import { ensureNotifPermission, sendTestNotification } from './notifications';
import { DOMAINS, domainLabel } from './personal';

const FONT_LABELS = { small: '작게', normal: '보통', large: '크게' };
/* ★알림 시간 — 순환 탭 폐기, 시트 칩 그리드로. 아침·점심 학습 패턴까지 커버 */
const NOTI_HOURS = [7, 8, 12, 19, 20, 21, 22];
/* ★12시는 '오후 12시'가 중의적(자정 오인) — 관용 표기 '낮 12시'로 */
const notiHourLabel = (h) => (h < 12 ? `오전 ${h}시` : h === 12 ? `낮 12시` : `오후 ${h - 12}시`);

/* 잠금학습 설정 시트 옵션들 */
const LOCK_MODES = [{ v: 'quiz', l: '1탭 퀴즈' }, { v: 'flash', l: '플래시카드' }];
const LOCK_FREQS = [{ v: 0, l: '화면 켤 때마다' }, { v: 15, l: '15분마다' }, { v: 30, l: '30분마다' }, { v: 60, l: '1시간마다' }];
const LOCK_SCOPES = [
  { v: 'confusing', l: '헷갈리는 단어' },
  { v: 'started', l: '학습한 단어 전체' },
  { v: 'fav', l: '즐겨찾기' },
  { v: 'new', l: '안 배운 단어' },
  { v: 'all', l: '전체 단어' },
];

function SheetChip({ on, label, onPress }) {
  return (
    /* ★단어장 FilterChip과 규격 통일 (pH 12/pV 8/border 1.5/비활성 bg) — 같은 pill 칩인데 4개 값이 전부 달랐음 */
    <Pressable onPress={onPress} style={{
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
      backgroundColor: on ? VP.accent : VP.bg, borderWidth: on ? 0 : 1.5, borderColor: VP.border,
    }}>
      <Text style={{ fontSize: 13, fontFamily: ff(700), color: on ? '#fff' : VP.textSub }}>{label}</Text>
    </Pressable>
  );
}

function ChipGroup({ title, options, value, onSelect }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontFamily: ff(700), color: VP.textSub, letterSpacing: ls(-0.01, 13), marginBottom: 8 }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        {options.map(o => <SheetChip key={String(o.v)} on={value === o.v} label={o.l} onPress={() => onSelect(o.v)} />)}
      </View>
    </View>
  );
}

/* ★예문 도메인 선택 — 관심 분야를 고르면 예문·빈칸 문장이 그 분야 문장으로 바뀐다.
   문항 보기(quiz_bank)는 손검수 그대로 — 예문만 교체되므로 정답 품질은 유지.
   ★즉시 닫힘 → 선택 반영(칩 accent 채움)을 300ms 보여준 뒤 닫기 — '적용됐다' 확인 프레임 제공 */
function DomainSheet({ visible, s, set, onClose }) {
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={{ fontSize: 18, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 18), marginBottom: 6 }}>예문 도메인</Text>
      <Text style={{ fontSize: 13, color: VP.textSub, lineHeight: 19, marginBottom: 14 }}>
        고른 분야의 문장으로 예문과 빈칸 문제가 바뀌어요. 단어와 보기(정답·오답)는 그대로예요.
      </Text>
      <ChipGroup title="분야" options={DOMAINS} value={s.domain || null}
        onSelect={(v) => { set('domain', v); clearTimeout(timer.current); timer.current = setTimeout(onClose, 300); }} />
      {/* ★textMute→textSub: 기능 안내 캡션은 대비 규칙상 textSub */}
      <Text style={{ fontSize: 12, color: VP.textSub, lineHeight: 17 }}>아직 준비 중인 분야는 일상 예문이 나와요 · 오프라인에서도 동작</Text>
    </BottomSheet>
  );
}

/* 잠금학습 설정 — 한 장짜리 바텀시트 (방식·빈도·출제 범위 + 미리보기) */
function LockSheet({ visible, s, set, onClose }) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={{ fontSize: 18, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 18), marginBottom: 14 }}>잠금학습 설정</Text>
      <ChipGroup title="방식" options={LOCK_MODES} value={s.lockMode || 'quiz'} onSelect={(v) => set('lockMode', v)} />
      <ChipGroup title="빈도" options={LOCK_FREQS} value={s.lockInterval == null ? 30 : s.lockInterval} onSelect={(v) => set('lockInterval', v)} />
      <ChipGroup title="출제 범위" options={LOCK_SCOPES} value={s.lockScope || 'confusing'} onSelect={(v) => set('lockScope', v)} />
      {/* ★textMute→textSub: 폴백 규칙 안내는 장식이 아니라 기능 설명 */}
      <Text style={{ fontSize: 12, color: VP.textSub, lineHeight: 17, marginTop: -6, marginBottom: 14 }}>선택한 범위에 단어가 없으면 학습한 단어 → 전체 순으로 대신 나와요</Text>
      <VPButton variant="accent" size="md" icon="pip" label="이 설정으로 미리보기" onPress={() => { onClose(); setTimeout(() => Overlay.showLockCard(), 350); }} />
    </BottomSheet>
  );
}

/* ★알림 시간 시트 — 행 탭 순환(현재값을 다 눌러봐야 아는 UI)을 칩 그리드 선택으로 교체 */
function NotiSheet({ visible, s, set, onClose }) {
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={{ fontSize: 18, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 18), marginBottom: 6 }}>알림 시간</Text>
      <Text style={{ fontSize: 13, color: VP.textSub, lineHeight: 19, marginBottom: 14 }}>매일 이 시간에 복습 알림을 보내요.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
        {NOTI_HOURS.map((h) => (
          <SheetChip key={h} on={(s.notiHour || 20) === h} label={notiHourLabel(h)}
            onPress={() => { set('notiHour', h); clearTimeout(timer.current); timer.current = setTimeout(onClose, 300); }} />
        ))}
      </View>
    </BottomSheet>
  );
}

/* ★이용약관·개인정보처리방침 — 실제 호스팅 페이지가 없으므로 외부 URL 대신 로컬 문서 시트.
   수집 데이터·목적·보관·삭제를 솔직하고 짧게 고지 */
const DOCS = {
  terms: {
    title: '이용약관',
    body: 'popVOCA는 토플 단어 학습을 돕는 앱이에요.\n\n'
      + '· 계정 없이도 모든 학습 기능을 쓸 수 있어요. 로그인은 기기 간 동기화를 위한 선택 사항이에요.\n'
      + '· 단어·예문 등 학습 콘텐츠는 개인 학습 용도로만 제공돼요.\n'
      + '· 서비스는 있는 그대로 제공되며, 사전 안내 후 기능이 바뀌거나 종료될 수 있어요.\n'
      + '· 계속 사용하면 이 약관에 동의한 것으로 봐요.',
  },
  privacy: {
    title: '개인정보처리방침',
    body: '수집하는 데이터\n'
      + '· 이메일 주소(로그인 시) — 계정 식별에만 사용해요.\n'
      + '· 학습 진도(체크·복습 상태·즐겨찾기·설정) — 로그인 시 Supabase에 동기화 저장돼요.\n\n'
      + '목적과 보관\n'
      + '· 기기 간 학습 이어하기(동기화)에만 사용해요. 광고·추적 목적의 수집은 없어요.\n'
      + '· 로그인하지 않으면 모든 기록은 이 기기에만 저장돼요.\n\n'
      + '삭제\n'
      + '· 설정 > 진행 초기화로 학습 기록을 지울 수 있어요. 로그인 상태면 클라우드 기록도 함께 지워져요.\n'
      + '· 로그아웃하면 동기화가 중단되고, 기록은 기기와 클라우드에 남아요.',
  },
};

function DocSheet({ doc, onClose }) {
  /* ★닫힘 애니메이션(220ms) 동안 내용이 사라지지 않게 마지막 문서를 캐시 */
  const last = useRef(null);
  if (doc) last.current = doc;
  const d = last.current ? DOCS[last.current] : null;
  return (
    <BottomSheet visible={!!doc} onClose={onClose}>
      {d ? (
        <>
          <Text style={{ fontSize: 18, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 18), marginBottom: 10 }}>{d.title}</Text>
          <ScrollView style={{ maxHeight: 420 }}>
            <Text style={{ fontSize: 13, color: VP.textSub, lineHeight: 20 }}>{d.body}</Text>
          </ScrollView>
        </>
      ) : null}
    </BottomSheet>
  );
}

function Toggle({ on, onChange }) {
  const a = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: on ? 1 : 0, duration: 200, easing: Easing.bezier(0.3, 0.9, 0.3, 1), useNativeDriver: false }).start();
  }, [on]);
  const backgroundColor = a.interpolate({ inputRange: [0, 1], outputRange: [VP.border, VP.accent] });
  const left = a.interpolate({ inputRange: [0, 1], outputRange: [3, 21] });
  return (
    <Pressable onPress={() => onChange(!on)} hitSlop={8}>
      <Animated.View style={{ width: 46, height: 28, borderRadius: 999, backgroundColor }}>
        <Animated.View style={{
          position: 'absolute', top: 3, left, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2,
        }} />
      </Animated.View>
    </Pressable>
  );
}

function RowBase({ icon, label, danger, last, children, onPress }) {
  const color = danger ? VP.bad : VP.text;
  const inner = (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: VP.divider,
    }}>
      <View style={{
        width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
        backgroundColor: danger ? VP.badSoft : VP.surface2,
      }}>
        <Icon name={icon} size={16} color={danger ? VP.bad : VP.textSub} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontFamily: ff(600), color, letterSpacing: ls(-0.02, 15) }}>{label}</Text>
      {children}
    </View>
  );
  if (!onPress) return inner;
  return <Pressable onPress={onPress} android_ripple={{ color: VP.divider }}>{inner}</Pressable>;
}

function NavRow({ icon, label, value, danger, last, onPress }) {
  return (
    <RowBase icon={icon} label={label} danger={danger} last={last} onPress={onPress}>
      {value ? <Text style={{ fontSize: 14, color: VP.textSub, fontFamily: ff(600) }}>{value}</Text> : null}
      <Icon name="chevron-right" size={16} color={VP.textMute} />
    </RowBase>
  );
}

function ToggleRow({ icon, label, on, onChange, last }) {
  return (
    <RowBase icon={icon} label={label} last={last}>
      <Toggle on={on} onChange={onChange} />
    </RowBase>
  );
}

function GoalStepperRow({ value, onChange }) {
  /* ★hitSlop 5 추가: 34px 스테퍼가 44px 터치 타깃 미달 — 반복 탭 컨트롤이라 더 치명적이었음. radius 9→8(rSm) */
  const Btn = ({ dis, onPress, name }) => (
    <Pressable onPress={dis ? undefined : onPress} disabled={dis} hitSlop={5} style={{
      width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
      backgroundColor: dis ? 'transparent' : VP.surface2, borderWidth: 1.5, borderColor: VP.border,
    }}>
      <Icon name={name} size={16} color={dis ? VP.textMute : VP.text} />
    </Pressable>
  );
  return (
    <RowBase icon="mountain" label="하루 목표">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Btn dis={value <= 5} onPress={() => onChange(value - 5)} name="chevron-left" />
        <Text style={{ minWidth: 56, textAlign: 'center', fontSize: 14, fontFamily: ff(700), color: VP.text }}>{value}단어</Text>
        <Btn dis={value >= 60} onPress={() => onChange(value + 5)} name="chevron-right" />
      </View>
    </RowBase>
  );
}

/* ★글자 크기 — 순환 탭(다음 값이 안 보이는 UI) 폐기, 3분할 인라인 세그먼트로 즉시 선택 */
function FontSegmentRow({ value, onChange }) {
  const opts = ['small', 'normal', 'large'];
  return (
    <RowBase icon="letters" label="글자 크기" last>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {opts.map((o) => {
          const on = value === o;
          return (
            <Pressable key={o} onPress={() => onChange(o)} hitSlop={6}
              accessibilityRole="button" accessibilityLabel={`글자 크기 ${FONT_LABELS[o]}`} accessibilityState={{ selected: on }}
              style={{
                width: 56, height: 32, borderRadius: VP.rSm, alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? VP.text : VP.surface2,
              }}>
              {/* ★선택 라벨은 VP.bg — 라이트에선 흰색, 다크에선 어두운 잉크(밝은 VP.text 배경 위 대비 유지) */}
              <Text style={{ fontSize: 13, fontFamily: ff(700), color: on ? VP.bg : VP.textSub }}>{FONT_LABELS[o]}</Text>
            </Pressable>
          );
        })}
      </View>
    </RowBase>
  );
}

function SettingsGroup({ title, children, style }) {
  return (
    <View style={[{ marginBottom: 18 }, style]}>
      {/* ★섹션 라벨 12/800→13/700: 통계·설정·시트의 섹션 헤더가 14/12/11 3종이었음 → 13/700/textSub로 통일 */}
      <Text style={{ fontSize: 13, fontFamily: ff(700), color: VP.textSub, letterSpacing: ls(-0.01, 13), paddingHorizontal: 4, paddingBottom: 8 }}>{title}</Text>
      <View style={{ backgroundColor: VP.surface, borderRadius: 16, borderWidth: 1, borderColor: VP.divider, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

export default function Settings({ state, dispatch, account, onOverlay, onReset }) {
  const [lockSheet, setLockSheet] = useState(false);
  const [domainSheet, setDomainSheet] = useState(false);
  const [notiSheet, setNotiSheet] = useState(false);
  const [docSheet, setDocSheet] = useState(null);   // 'terms' | 'privacy' | null
  const learned = Object.values(state.boxes || {}).filter(b => b && b.ivl >= WELL_KNOWN_IVL).length;   // 외운(졸업) 단어
  const currentCheck = Math.min(TOTAL, state.checkedCount + 1);
  const s = state.settings || { noti: true, autoPlay: true, sound: true, dark: false };
  const set = (k, v) => dispatch({ type: 'SET_SETTING', key: k, value: v });
  const showOverlay = Overlay.isSupported();

  const openOverlay = () => onOverlay && onOverlay(currentCheck, false);

  // 잠금화면 학습 켤 때: 알림 권한(안드13+) + 배터리 최적화 제외(이 앱만) 요청
  const onLockToggle = async (v) => {
    if (v) {
      try {
        if (Platform.OS === 'android' && Number(Platform.Version) >= 33)
          await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
      } catch (e) {}
      Overlay.requestBatteryExemption();
    }
    set('lockEnabled', v);
  };

  // 복습 알림 토글 — 켤 때 권한 확인 + 즉시 테스트 알림 1건
  const onNotiToggle = async (v) => {
    if (v) {
      const ok = await ensureNotifPermission();
      if (!ok) { Alert.alert('알림 권한이 꺼져 있어요', '시스템 설정에서 popVOCA 알림을 허용해 주세요.'); return; }
      sendTestNotification();
    }
    set('noti', v);
  };

  // 학습 기록 내보내기 — 공유 시트로 텍스트 요약
  const exportLog = async () => {
    const lines = (state.stageLog || []).map((e) => `${e.ts} · ${e.stage}걸음 · 정답률 ${e.acc}%`);
    const msg = `popVOCA 학습 기록\n`
      + `🔥 연속 ${state.streak || 0}일 · ⭐ ${(state.points || 0).toLocaleString()}\n`
      + `체크 ${state.checkedCount}/${TOTAL}걸음 · 외운 단어 ${learned}개\n`
      + `학습 시작 ${startedIds(state.boxes).length}단어 · 헷갈리는 ${confusingIds(state.boxes).length}단어\n`
      + (lines.length ? `\n— 퀴즈 기록 —\n${lines.join('\n')}` : '');
    try { await Share.share({ message: msg }); } catch (e) {}
  };

  /* ★초기화 경고 구체화 — '무엇이·어디서' 지워지는지 로그인 여부에 맞춰 정확히 고지, 확인 버튼도 결과를 말하는 '모두 지우기'로 */
  const loggedIn = !!(account && account.user);
  const confirmReset = () => {
    Alert.alert('진행 초기화',
      loggedIn
        ? `${TOTAL.toLocaleString()}단어의 학습 기록이 모두 지워져요. 로그인된 다른 기기에서도 함께 지워지고, 되돌릴 수 없어요.`
        : `${TOTAL.toLocaleString()}단어의 학습 기록 등 이 기기의 기록이 모두 지워져요. 되돌릴 수 없어요.`,
      [
        { text: '취소', style: 'cancel' },
        { text: '모두 지우기', style: 'destructive', onPress: () => (onReset ? onReset() : dispatch({ type: 'RESET_PROGRESS' })) },
      ]);
  };

  /* ★로그아웃도 확인 한 번 — 파괴적이진 않지만 '기록이 사라지나' 불안을 카피로 해소 */
  const confirmLogout = () => {
    Alert.alert('로그아웃', '로그아웃할까요? 동기화가 중단되지만 기록은 이 기기와 클라우드에 남아요.', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', onPress: () => (account && account.onLogout ? account.onLogout() : null) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      {/* 헤더 */}
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 10 }}>
        <Text style={{ fontSize: 22, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 22) }}>설정</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 }}>
        {/* 프로필 — ★Pressable로: chevron이 있는데 눌리지 않는 죽은 어포던스였음. 내용(걸음·외운 단어)의 자연스러운 목적지인 통계로 연결 */}
        <Pressable onPress={() => dispatch({ type: 'GO', screen: 'stats' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: VP.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: VP.divider, marginBottom: 18 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: VP.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22, fontFamily: ff(800), color: '#fff' }}>나</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 17, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 17) }}>나의 단어 여정</Text>
            <Text style={{ fontSize: 13, color: VP.textSub, marginTop: 2 }}>{currentCheck}걸음째 체크 중 · 외운 단어 {learned}개</Text>
          </View>
          <Icon name="chevron-right" size={18} color={VP.textMute} />
        </Pressable>

        <SettingsGroup title="계정">
          {loggedIn ? (
            /* ★로그아웃은 최하단 '계정 관리' 그룹으로 이동 — 계정 그룹은 상태 표시만 */
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16 }}>
              <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check-bold" size={15} color={VP.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 14, fontFamily: ff(700), color: VP.text }}>{account.user.email}</Text>
                <Text style={{ fontSize: 12, color: VP.textSub, marginTop: 1 }}>{account.syncMsg || '동기화 켜짐'}</Text>
              </View>
            </View>
          ) : (
            <NavRow icon="repeat" label="로그인하고 기기 간 동기화" onPress={account ? account.onLogin : undefined} />
          )}
        </SettingsGroup>

        <SettingsGroup title="학습">
          <GoalStepperRow value={state.dailyGoal} onChange={(v) => dispatch({ type: 'SET_GOAL', value: v })} />
          {/* ★예문 도메인 — "내 분야 문장으로 배우기" 진입점 */}
          <NavRow icon="book-open" label="예문 도메인" value={domainLabel(s.domain)} onPress={() => setDomainSheet(true)} />
          {showOverlay ? <NavRow icon="pip" label="플로팅 학습 — 다른 앱 위에" onPress={openOverlay} /> : null}
          <ToggleRow icon="speaker" label="발음 자동 재생" on={s.autoPlay} onChange={(v) => set('autoPlay', v)} />
          <ToggleRow icon="party" label="효과음" on={s.sound} onChange={(v) => set('sound', v)} />
          <ToggleRow icon="lightbulb" label="복습 알림" on={s.noti !== false} onChange={onNotiToggle} last={s.noti === false} />
          {/* ★알림 시간 — 순환 탭 폐기, 시트에서 칩으로 선택. 아이콘 lightbulb→clock(복습 알림 행과 중복 해소) */}
          {s.noti !== false ? (
            <NavRow icon="clock" label="알림 시간" last value={notiHourLabel(s.notiHour || 20)} onPress={() => setNotiSheet(true)} />
          ) : null}
        </SettingsGroup>

        {Overlay.isLockSupported() ? (
          <SettingsGroup title="잠금화면 학습">
            <ToggleRow icon="cards" label="잠금화면에 단어 띄우기" on={!!s.lockEnabled} onChange={onLockToggle} last={!s.lockEnabled} />
            {s.lockEnabled ? (
              <>
                <NavRow icon="pencil" label="방식 · 빈도 · 출제 범위" onPress={() => setLockSheet(true)} />
                <RowBase icon="flame" label="배터리 최적화 제외 (권장)" last onPress={() => Overlay.requestBatteryExemption()}>
                  <Text style={{ fontSize: 13, color: VP.accent, fontFamily: ff(700) }}>열기</Text>
                </RowBase>
              </>
            ) : null}
          </SettingsGroup>
        ) : null}

        <SettingsGroup title="화면">
          {/* ★star→moon: 별은 즐겨찾기와 의미 충돌 — 다크모드 관례(달)로 */}
          <ToggleRow icon="moon" label="다크 모드" on={s.dark} onChange={(v) => set('dark', v)} />
          {/* ★순환 탭 → 인라인 세그먼트: 세 값이 다 보이고 한 번에 고른다 */}
          <FontSegmentRow value={s.fontSize || 'normal'} onChange={(v) => set('fontSize', v)} />
        </SettingsGroup>

        {/* ★진행 초기화를 데이터 그룹에서 분리 — 내보내기(안전)와 초기화(파괴)가 한 그룹에 있던 위험 배치 해소 */}
        <SettingsGroup title="데이터">
          <NavRow icon="book" label="학습 기록 내보내기" last onPress={exportLog} />
        </SettingsGroup>

        <SettingsGroup title="정보">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: VP.divider }}>
            <Text style={{ fontSize: 15, fontFamily: ff(600), color: VP.textSub }}>버전</Text>
            {/* ★textMute→textFaint: 장식성 정보는 의도적 저강조 토큰으로 */}
            <Text style={{ fontSize: 13, fontFamily: ff(600), color: VP.textFaint }}>1.1.1</Text>
          </View>
          {/* ★약관·방침 — 외부 URL 없이 로컬 문서 시트로 (호스팅 페이지가 없으므로) */}
          <Pressable onPress={() => setDocSheet('terms')} accessibilityRole="button" android_ripple={{ color: VP.divider }}
            style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: VP.divider }}>
            <Text style={{ flex: 1, fontSize: 15, fontFamily: ff(600), color: VP.textSub }}>이용약관</Text>
            <Icon name="chevron-right" size={16} color={VP.textMute} />
          </Pressable>
          <Pressable onPress={() => setDocSheet('privacy')} accessibilityRole="button" android_ripple={{ color: VP.divider }}
            style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingVertical: 12, paddingHorizontal: 16 }}>
            <Text style={{ flex: 1, fontSize: 15, fontFamily: ff(600), color: VP.textSub }}>개인정보처리방침</Text>
            <Icon name="chevron-right" size={16} color={VP.textMute} />
          </Pressable>
        </SettingsGroup>

        {/* ★계정 관리 — 파괴적·이탈성 액션을 최하단으로 격리(그룹 상단 마진 28). 아이콘도 결과를 말하게: repeat→trash, 로그아웃은 log-out */}
        <SettingsGroup title="계정 관리" style={{ marginTop: 10 /* 위 그룹 marginBottom 18과 합쳐 28 */ }}>
          {loggedIn ? <RowBase icon="log-out" label="로그아웃" onPress={confirmLogout} /> : null}
          <NavRow icon="trash" label="진행 초기화" danger last onPress={confirmReset} />
        </SettingsGroup>

      </ScrollView>

      <TabBar active="settings" dispatch={dispatch} />

      <LockSheet visible={lockSheet} s={s} set={set} onClose={() => setLockSheet(false)} />
      <DomainSheet visible={domainSheet} s={s} set={set} onClose={() => setDomainSheet(false)} />
      <NotiSheet visible={notiSheet} s={s} set={set} onClose={() => setNotiSheet(false)} />
      <DocSheet doc={docSheet} onClose={() => setDocSheet(null)} />
    </View>
  );
}
