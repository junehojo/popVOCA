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

const FONT_LABELS = { small: '작게', normal: '보통', large: '크게' };

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
    <Pressable onPress={onPress} style={{
      paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999,
      backgroundColor: on ? VP.accent : VP.surface2, borderWidth: on ? 0 : 1, borderColor: VP.border,
    }}>
      <Text style={{ fontSize: 13, fontFamily: ff(700), color: on ? '#fff' : VP.textSub }}>{label}</Text>
    </Pressable>
  );
}

function ChipGroup({ title, options, value, onSelect }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, fontFamily: ff(800), color: VP.textSub, marginBottom: 8 }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        {options.map(o => <SheetChip key={String(o.v)} on={value === o.v} label={o.l} onPress={() => onSelect(o.v)} />)}
      </View>
    </View>
  );
}

/* 잠금학습 설정 — 한 장짜리 바텀시트 (방식·빈도·출제 범위 + 미리보기) */
function LockSheet({ visible, s, set, onClose }) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(8,10,16,0.45)' }} onPress={onClose} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: VP.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 24 }}>
        <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 12 }}>
          <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: VP.border }} />
        </View>
        <Text style={{ fontSize: 18, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.02, 18), marginBottom: 14 }}>잠금학습 설정</Text>
        <ChipGroup title="방식" options={LOCK_MODES} value={s.lockMode || 'quiz'} onSelect={(v) => set('lockMode', v)} />
        <ChipGroup title="빈도" options={LOCK_FREQS} value={s.lockInterval == null ? 30 : s.lockInterval} onSelect={(v) => set('lockInterval', v)} />
        <ChipGroup title="출제 범위" options={LOCK_SCOPES} value={s.lockScope || 'confusing'} onSelect={(v) => set('lockScope', v)} />
        <Text style={{ fontSize: 11.5, color: VP.textMute, lineHeight: 16, marginTop: -6, marginBottom: 14 }}>선택한 범위에 단어가 없으면 학습한 단어 → 전체 순으로 대신 나와요</Text>
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
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16,
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
  const Btn = ({ dis, onPress, name }) => (
    <Pressable onPress={dis ? undefined : onPress} disabled={dis} style={{
      width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
      backgroundColor: dis ? 'transparent' : VP.surface2, borderWidth: 1.5, borderColor: VP.border,
    }}>
      <Icon name={name} size={16} color={dis ? VP.textMute : VP.text} />
    </Pressable>
  );
  return (
    <RowBase icon="mountain" label="하루 목표">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Btn dis={value <= 5} onPress={() => onChange(value - 5)} name="chevron-left" />
        <Text style={{ minWidth: 56, textAlign: 'center', fontSize: 14, fontFamily: ff(800), color: VP.text }}>{value}단어</Text>
        <Btn dis={value >= 60} onPress={() => onChange(value + 5)} name="chevron-right" />
      </View>
    </RowBase>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 12, fontFamily: ff(800), color: VP.textSub, letterSpacing: ls(-0.01, 12), paddingHorizontal: 4, paddingBottom: 8 }}>{title}</Text>
      <View style={{ backgroundColor: VP.surface, borderRadius: 16, borderWidth: 1, borderColor: VP.divider, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

export default function Settings({ state, dispatch, account, onOverlay, onReset }) {
  const [lockSheet, setLockSheet] = useState(false);
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
        {/* 프로필 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: VP.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: VP.divider, marginBottom: 18 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: VP.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22, fontFamily: ff(800), color: '#fff' }}>나</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 17, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.02, 17) }}>나의 단어 여정</Text>
            <Text style={{ fontSize: 13, color: VP.textSub, marginTop: 2 }}>{currentCheck}걸음째 체크 중 · 외운 단어 {learned}개</Text>
          </View>
          <Icon name="chevron-right" size={18} color={VP.textMute} />
        </View>

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
          {showOverlay ? <NavRow icon="pip" label="플로팅 학습 — 다른 앱 위에" onPress={openOverlay} /> : null}
          <ToggleRow icon="speaker" label="발음 자동 재생" on={s.autoPlay} onChange={(v) => set('autoPlay', v)} />
          <ToggleRow icon="party" label="효과음" on={s.sound} onChange={(v) => set('sound', v)} />
          <ToggleRow icon="lightbulb" label="복습 알림 · 매일 저녁 8시" on={s.noti !== false} onChange={onNotiToggle} last />
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
          <ToggleRow icon="star" label="다크 모드" on={s.dark} onChange={(v) => set('dark', v)} />
          <NavRow icon="letters" label="글자 크기" value={FONT_LABELS[s.fontSize || 'normal']} last
            onPress={() => { const o = ['small', 'normal', 'large']; set('fontSize', o[(o.indexOf(s.fontSize || 'normal') + 1) % 3]); }} />
        </SettingsGroup>

        <SettingsGroup title="데이터">
          <NavRow icon="book" label="학습 기록 내보내기" onPress={exportLog} />
          <NavRow icon="repeat" label="진행 초기화" danger last onPress={confirmReset} />
        </SettingsGroup>

        <SettingsGroup title="정보">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 15, fontFamily: ff(600), color: VP.textSub }}>버전</Text>
            <Text style={{ fontSize: 13, fontFamily: ff(600), color: VP.textMute }}>1.1.1</Text>
          </View>
        </SettingsGroup>

      </ScrollView>

      <TabBar active="settings" dispatch={dispatch} />

      <LockSheet visible={lockSheet} s={s} set={set} onClose={() => setLockSheet(false)} />
    </View>
  );
}
