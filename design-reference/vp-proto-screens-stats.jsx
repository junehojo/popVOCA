/* VocaPoP Prototype · 통계 + 설정 */

/* ─────────────────────────────────────────────
   통계 — 스테이지 2까지 거친 상태 기준 데모 데이터
   ───────────────────────────────────────────── */
const STATS_WEEK = [
  { d: '월', n: 12 },
  { d: '화', n: 20 },
  { d: '수', n: 0  },
  { d: '목', n: 20 },
  { d: '금', n: 16 },
  { d: '토', n: 20 },
  { d: '일', n: 8, today: true },
];

const STAGE_LOG = [
  { stage: 2, date: '5월 30일', acc: 88, words: 20 },
  { stage: 1, date: '5월 28일', acc: 95, words: 20 },
];

function ProtoStats({ state, dispatch }) {
  const done = state.conqueredSet.length;             // 정복한(퀴즈까지 통과) 걸음 수
  const currentCheck = state.checkedCount + 1;        // 지금 체크 중인 걸음
  const learned = done * 20;                          // 외운 단어(정복 기준)
  const favCount = state.checkedIds.length;
  const noteCount = (() => {
    const set = new Set(state.hardIds);
    state.dismissedNoteIds.forEach(id => set.delete(id));
    return set.size;
  })();
  const avgAcc = Math.round(STAGE_LOG.reduce((s, x) => s + x.acc, 0) / STAGE_LOG.length);
  const maxN = Math.max(...STATS_WEEK.map(x => x.n), 1);
  const hasProgress = done > 0;   // 완료한 스테이지가 하나라도 있어야 통계가 의미 있음

  return (
    <ProtoShell>
      <SubHeader title="통계" onBack={() => dispatch({ type: 'GOTO', screen: 'home' })} />

      {!hasProgress ? <StatsZero dispatch={dispatch} /> : (
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px calc(24px + env(safe-area-inset-bottom, 0px))' }}>

        {/* 요약 3 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          <StatCard big={learned} label="외운 단어" icon="book-open" />
          <StatCard big={`${state.streak ?? 7}일`} label="연속 학습" icon="flame" accent />
          <StatCard big={`${avgAcc}%`} label="평균 정답률" icon="check-bold" />
        </div>

        {/* 주간 활동 */}
        <SectionCard title="이번 주 학습" right={`${STATS_WEEK.reduce((s, x) => s + x.n, 0)}단어`}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 116, paddingTop: 8 }}>
            {STATS_WEEK.map((x, i) => {
              const h = x.n === 0 ? 4 : Math.round((x.n / maxN) * 92);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: x.today ? VP.accent : VP.textMute, height: 12 }}>
                    {x.n > 0 ? x.n : ''}
                  </div>
                  <div style={{
                    width: '100%', maxWidth: 22, height: h, borderRadius: 7,
                    background: x.n === 0 ? VP.surface2 : (x.today ? VP.accent : VP.accentSoft),
                    transition: 'height .3s ease',
                  }} />
                  <div style={{ fontSize: 11, fontWeight: x.today ? 700 : 500, color: x.today ? VP.accent : VP.textSub }}>{x.d}</div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* 스테이지 진행 */}
        <SectionCard title="지금까지 오른 걸음" right={`${done} / 100`}>
          <div style={{ marginTop: 4 }}>
            <div style={{ height: 8, background: VP.surface2, borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${done}%`, height: '100%', background: VP.accent, borderRadius: 999 }} />
            </div>
            <div style={{ fontSize: 12, color: VP.textSub, marginTop: 8 }}>
              지금은 <span style={{ color: VP.text, fontWeight: 700 }}>{currentCheck}걸음째</span> 오르는 중이에요
            </div>
          </div>
        </SectionCard>

        {/* 오답 / 즐겨찾기 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <MiniLink icon="flame" iconColor={VP.accent} label="오답노트" value={`${noteCount}개`} onClick={() => dispatch({ type: 'GOTO', screen: 'notes' })} />
          <MiniLink icon="star" iconColor={VP.accent} label="즐겨찾기" value={`${favCount}개`} onClick={() => dispatch({ type: 'GOTO', screen: 'wordbook' })} />
        </div>

        {/* 학습 기록 */}
        <SectionCard title="학습 기록">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {STAGE_LOG.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${VP.divider}`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: VP.accentSoft, color: VP.accent,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 13,
                }}>{s.stage}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.02em' }}>{s.stage}걸음째 완료</div>
                  <div style={{ fontSize: 12, color: VP.textSub }}>{s.date} · 단어 {s.words}개</div>
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 800,
                  color: s.acc >= 90 ? VP.ok : VP.text,
                }}>{s.acc}%</div>
              </div>
            ))}
          </div>
        </SectionCard>

      </div>
      )}

      <TabBar active="stats" dispatch={dispatch} />
    </ProtoShell>
  );
}

function StatsZero({ dispatch }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '24px 32px calc(40px + env(safe-area-inset-bottom, 0px))', gap: 14,
    }}>
      <div style={{
        width: 88, height: 88, borderRadius: '50%',
        background: VP.accentSoft, color: VP.accent,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name="mountain" size={40} /></div>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.025em', color: VP.text }}>
        아직 학습 기록이 없어요
      </div>
      <div style={{ fontSize: 14, color: VP.textSub, lineHeight: 1.55, maxWidth: 260 }}>
        첫 걸음을 내딘으면 외운 단어, 연속 학습, 정답률이 여기에 차곡차곡 쌓여요.
      </div>
      <div style={{ width: '100%', maxWidth: 240, marginTop: 6 }}>
        <VPButton variant="accent" onClick={() => dispatch({ type: 'START_STAGE' })}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon name="play" size={16} /> 첫 걸음 내딘기
          </span>
        </VPButton>
      </div>
    </div>
  );
}

function StatCard({ big, label, icon, accent }) {
  return (
    <div style={{
      background: VP.surface, borderRadius: 14, padding: '14px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      border: `1px solid ${VP.divider}`,
    }}>
      <Icon name={icon} size={18} color={accent ? VP.accent : VP.textSub} />
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.03em', marginTop: 2 }}>{big}</div>
      <div style={{ fontSize: 11, color: VP.textSub, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function SectionCard({ title, right, children }) {
  return (
    <div style={{
      background: VP.surface, borderRadius: 16, padding: '14px 16px', marginBottom: 14,
      border: `1px solid ${VP.divider}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-.02em' }}>{title}</span>
        {right && <span style={{ fontSize: 12, color: VP.accent, fontWeight: 700 }}>{right}</span>}
      </div>
      {children}
    </div>
  );
}

function MiniLink({ icon, iconColor, label, value, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: VP.surface, borderRadius: 14, padding: '14px 16px',
      border: `1px solid ${VP.divider}`, cursor: 'pointer', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 10, fontFamily: VPFontStack,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: VP.accentSoft, color: iconColor,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name={icon} size={17} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: VP.textSub, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.02em' }}>{value}</div>
      </div>
      <Icon name="chevron-right" size={16} color={VP.textMute} />
    </button>
  );
}

/* ─────────────────────────────────────────────
   설정
   ───────────────────────────────────────────── */
const SETTINGS_KEY = 'vocapop:proto:settings:v1';
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { noti: true, autoPlay: true, sound: true, dark: false };
}

function ProtoSettings({ state, dispatch }) {
  const [s, setS] = useState(loadSettings);
  const set = (k, v) => {
    setS(prev => {
      const next = { ...prev, [k]: v };
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  return (
    <ProtoShell>
      <SubHeader title="설정" onBack={() => dispatch({ type: 'GOTO', screen: 'home' })} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px calc(24px + env(safe-area-inset-bottom, 0px))' }}>

        {/* 프로필 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: VP.surface, borderRadius: 16, padding: '16px',
          border: `1px solid ${VP.divider}`, marginBottom: 18,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: VP.accent, color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800,
          }}>나</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.02em' }}>나의 단어 여정</div>
            <div style={{ fontSize: 13, color: VP.textSub }}>{currentCheck}걸음째 체크 중 · 정복 {done}걸음</div>
          </div>
          <Icon name="chevron-right" size={18} color={VP.textMute} />
        </div>

        <SettingsGroup title="학습">
          <GoalStepperRow value={state.dailyGoal} onChange={(v) => dispatch({ type: 'SET_GOAL', value: v })} />
          <NavRow icon="pip" label="플로팅 학습 — 다른 앱 위에" onClick={() => dispatch({ type: 'OPEN_OVERLAY' })} />
          <ToggleRow icon="speaker" label="발음 자동 재생" on={s.autoPlay} onChange={(v) => set('autoPlay', v)} />
          <ToggleRow icon="party" label="효과음" on={s.sound} onChange={(v) => set('sound', v)} />
          <ToggleRow icon="lightbulb" label="복습 알림" on={s.noti} onChange={(v) => set('noti', v)} last />
        </SettingsGroup>

        <SettingsGroup title="화면">
          <ToggleRow icon="star" label="다크 모드" on={state.dark} onChange={(v) => dispatch({ type: 'SET_DARK', value: v })} />
          <NavRow icon="letters" label="글자 크기" value="보통" last />
        </SettingsGroup>

        <SettingsGroup title="데이터">
          <NavRow icon="book" label="학습 기록 내보내기" />
          <NavRow
            icon="repeat" label="진행 초기화" danger last
            onClick={() => {
              if (window.confirm('학습 진행을 모두 초기화할까요? 되돌릴 수 없어요.')) {
                dispatch({ type: 'RESET_PROGRESS' });
              }
            }}
          />
        </SettingsGroup>

        <SettingsGroup title="정보">
          <NavRow icon="lightbulb" label="이용약관" />
          <NavRow icon="book-open" label="오픈소스 라이선스" />
          <div style={{
            padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: VP.textSub }}>버전</span>
            <span style={{ fontSize: 13, color: VP.textMute, fontWeight: 600 }}>1.0.0</span>
          </div>
        </SettingsGroup>

        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <span style={{ fontSize: 13, color: VP.bad, fontWeight: 700, cursor: 'pointer' }}>로그아웃</span>
        </div>

      </div>

      <TabBar active="settings" dispatch={dispatch} />
    </ProtoShell>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: VP.textSub, letterSpacing: '-.01em', padding: '0 4px 8px' }}>{title}</div>
      <div style={{ background: VP.surface, borderRadius: 16, border: `1px solid ${VP.divider}`, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function RowBase({ icon, label, danger, last, children, onClick }) {
  const color = danger ? VP.bad : VP.text;
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px',
        borderBottom: last ? 'none' : `1px solid ${VP.divider}`,
        cursor: onClick ? 'pointer' : 'default',
      }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: danger ? VP.badSoft : VP.surface2,
        color: danger ? VP.bad : VP.textSub,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name={icon} size={16} /></div>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color, letterSpacing: '-.02em' }}>{label}</span>
      {children}
    </div>
  );
}

function NavRow({ icon, label, value, danger, last, onClick }) {
  return (
    <RowBase icon={icon} label={label} danger={danger} last={last} onClick={onClick}>
      {value && <span style={{ fontSize: 14, color: VP.textSub, fontWeight: 600 }}>{value}</span>}
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
  const btn = (dis, onClick, name) => (
    <button onClick={onClick} disabled={dis} style={{
      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
      background: dis ? 'transparent' : VP.surface2,
      color: dis ? VP.textMute : VP.text,
      border: `1.5px solid ${VP.border}`, cursor: dis ? 'default' : 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
      fontSize: 18, fontWeight: 700, fontFamily: VPFontStack,
    }}><Icon name={name} size={16} /></button>
  );
  return (
    <RowBase icon="mountain" label="하루 목표">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {btn(value <= 5, () => onChange(value - 5), 'chevron-left')}
        <span style={{ minWidth: 56, textAlign: 'center', fontSize: 14, fontWeight: 800, color: VP.text }}>{value}단어</span>
        {btn(value >= 60, () => onChange(value + 5), 'chevron-right')}
      </div>
    </RowBase>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-label="토글"
      style={{
        width: 46, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: on ? VP.accent : VP.border,
        position: 'relative', padding: 0, flexShrink: 0,
        transition: 'background .2s ease',
      }}>
      <span style={{
        position: 'absolute', top: 3, left: on ? 21 : 3,
        width: 22, height: 22, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        transition: 'left .2s cubic-bezier(.3,.9,.3,1)',
      }} />
    </button>
  );
}

/* 서브 페이지 공통 헤더 (← + 타이틀) */
function SubHeader({ title, onBack }) {
  return (
    <div style={{ paddingTop: 'env(safe-area-inset-top, 14px)' }}>
      <div style={{
        padding: '14px 20px 10px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-.025em' }}>{title}</h1>
      </div>
    </div>
  );
}

Object.assign(window, {
  ProtoStats, ProtoSettings, SubHeader,
  StatCard, SectionCard, MiniLink, SettingsGroup, RowBase, NavRow, ToggleRow, GoalStepperRow, Toggle,
});
