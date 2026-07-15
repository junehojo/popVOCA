/* VocaPoP 설정 — design-reference/vp-proto-screens-stats.jsx (ProtoSettings) 픽셀 이식.
   동작(설정 토글·하루목표·진행초기화)은 로컬저장 유지, 디자인만 프로토 일치.
   ⚠️ 다크모드 토글은 값만 저장 — 실제 다크 테마(앱 전체 토큰 교체)는 별도 트랙. */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Animated, Easing, Alert, Platform, PermissionsAndroid, Share, Modal } from 'react-native';
import { VP, ff, ls } from './theme';
import { Icon } from './Icon';
import { TabBar } from './Home';
import { VPButton } from './ui';
import { TOTAL, wordsForStage, startedIds, confusingIds, WELL_KNOWN_IVL } from './data';
import * as Overlay from './modules/vocapop-overlay';
import { ensureNotifPermission, sendTestNotification } from './notifications';
import { DOMAINS, domainLabel } from './personal';

const FONT_LABELS = { small: '작게', normal: '보통', large: '크게' };
// 알림 시간 순환 옵션 — 늦은 저녁 학습 패턴을 고려해 밤 10시까지 제공
const NOTI_HOURS = [19, 20, 21, 22];
const notiHourLabel = (h) => `저녁 ${h - 12}시`;

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
   문항 보기(quiz_bank)는 손검수 그대로 — 예문만 교체되므로 정답 품질은 유지. */
function DomainSheet({ visible, s, set, onClose }) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(8,10,16,0.45)' }} onPress={onClose} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: VP.bg, borderTopLeftRadius: VP.rSheet, borderTopRightRadius: VP.rSheet, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 }}>
        <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 12 }}>
          <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: VP.border }} />
        </View>
        <Text style={{ fontSize: 18, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 18), marginBottom: 6 }}>예문 도메인</Text>
        <Text style={{ fontSize: 13, color: VP.textSub, lineHeight: 19, marginBottom: 14 }}>
          고른 분야의 문장으로 예문과 빈칸 문제가 바뀌어요. 단어와 보기(정답·오답)는 그대로예요.
        </Text>
        <ChipGroup title="분야" options={DOMAINS} value={s.domain || null} onSelect={(v) => { set('domain', v); onClose(); }} />
        <Text style={{ fontSize: 12, color: VP.textMute, lineHeight: 17 }}>아직 준비 중인 분야는 일상 예문이 나와요 · 오프라인에서도 동작</Text>
      </View>
    </Modal>
  );
}

/* 잠금학습 설정 — 한 장짜리 바텀시트 (방식·빈도·출제 범위 + 미리보기) */
function LockSheet({ visible, s, set, onClose }) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(8,10,16,0.45)' }} onPress={onClose} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: VP.bg, borderTopLeftRadius: VP.rSheet, borderTopRightRadius: VP.rSheet, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 }}>
        <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 12 }}>
          <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: VP.border }} />
        </View>
        <Text style={{ fontSize: 18, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 18), marginBottom: 14 }}>잠금학습 설정</Text>
        <ChipGroup title="방식" options={LOCK_MODES} value={s.lockMode || 'quiz'} onSelect={(v) => set('lockMode', v)} />
        <ChipGroup title="빈도" options={LOCK_FREQS} value={s.lockInterval == null ? 30 : s.lockInterval} onSelect={(v) => set('lockInterval', v)} />
        <ChipGroup title="출제 범위" options={LOCK_SCOPES} value={s.lockScope || 'confusing'} onSelect={(v) => set('lockScope', v)} />
        <Text style={{ fontSize: 12, color: VP.textMute, lineHeight: 17, marginTop: -6, marginBottom: 14 }}>선택한 범위에 단어가 없으면 학습한 단어 → 전체 순으로 대신 나와요</Text>
        <VPButton variant="accent" size="md" icon="pip" label="이 설정으로 미리보기" onPress={() => { onClose(); setTimeout(() => Overlay.showLockCard(), 350); }} />
      </View>
    </Modal>
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

function SettingsGroup({ title, children }) {
  return (
    <View style={{ marginBottom: 18 }}>
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

  const confirmReset = () => {
    Alert.alert('진행 초기화', '학습 진행을 모두 초기화할까요? 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      { text: '초기화', style: 'destructive', onPress: () => (onReset ? onReset() : dispatch({ type: 'RESET_PROGRESS' })) },
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
          {account && account.user ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: VP.divider }}>
                <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="check-bold" size={15} color={VP.accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontFamily: ff(700), color: VP.text }}>{account.user.email}</Text>
                  <Text style={{ fontSize: 12, color: VP.textSub, marginTop: 1 }}>{account.syncMsg || '동기화 켜짐'}</Text>
                </View>
              </View>
              <RowBase icon="rotate" label="로그아웃" danger last onPress={account.onLogout} />
            </>
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
          {/* ★알림 시간 설정 — 고정 '저녁 8시' → 사용자가 순환 선택 (글자 크기 행과 같은 rotate 패턴) */}
          {s.noti !== false ? (
            <RowBase icon="lightbulb" label="알림 시간" last
              onPress={() => { const cur = NOTI_HOURS.indexOf(s.notiHour || 20); set('notiHour', NOTI_HOURS[(cur + 1) % NOTI_HOURS.length]); }}>
              <Text style={{ fontSize: 14, color: VP.textSub, fontFamily: ff(600) }}>{notiHourLabel(s.notiHour || 20)}</Text>
              <Icon name="rotate" size={14} color={VP.textMute} />
            </RowBase>
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
          {/* ★chevron(하위 화면 암시)→rotate: 실제 동작은 탭마다 값 순환이라 어포던스가 거짓이었음 */}
          <RowBase icon="letters" label="글자 크기" last
            onPress={() => { const o = ['small', 'normal', 'large']; set('fontSize', o[(o.indexOf(s.fontSize || 'normal') + 1) % 3]); }}>
            <Text style={{ fontSize: 14, color: VP.textSub, fontFamily: ff(600) }}>{FONT_LABELS[s.fontSize || 'normal']}</Text>
            <Icon name="rotate" size={14} color={VP.textMute} />
          </RowBase>
        </SettingsGroup>

        <SettingsGroup title="데이터">
          <NavRow icon="book" label="학습 기록 내보내기" onPress={exportLog} />
          <NavRow icon="repeat" label="진행 초기화" danger last onPress={confirmReset} />
        </SettingsGroup>

        <SettingsGroup title="정보">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 15, fontFamily: ff(600), color: VP.textSub }}>버전</Text>
            <Text style={{ fontSize: 13, fontFamily: ff(600), color: VP.textMute }}>1.1.1</Text>
          </View>
        </SettingsGroup>

      </ScrollView>

      <TabBar active="settings" dispatch={dispatch} />

      <LockSheet visible={lockSheet} s={s} set={set} onClose={() => setLockSheet(false)} />
      <DomainSheet visible={domainSheet} s={s} set={set} onClose={() => setDomainSheet(false)} />
    </View>
  );
}
