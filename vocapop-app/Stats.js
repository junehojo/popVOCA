/* VocaPoP 통계 — design-reference/vp-proto-screens-stats.jsx (ProtoStats) 픽셀 이식.
   ★ 데모 데이터가 아니라 실제 학습기록(dailyLog/stageLog/boxes)으로 그린다.
   처음엔 비어 보이는 게 정상 — 학습할수록 채워진다.
   ★섹션 순서: 요약 → 자기효능감(승격) → 최근 7일 → 걸음 진행 → 외우는 단계 → 미니링크 → 학습 기록
     — '성장 서사'를 최상단에, 총량·기록은 아래로. */
import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { VP, ff, ls, rgba } from './theme';
import { Icon } from './Icon';
import { VPButton } from './ui';
import { TabBar } from './Home';
import { TOTAL, confusingIds, WELL_KNOWN_IVL } from './data';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const dkey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* 외우는 단계 분포 — ★7칸(ivl 1·2·4·8…)→3칸으로 축약.
   7칸은 로그 눈금을 아는 사람에게만 읽혔음 — '이제 막(1~4)/거의 다(8~32)/다 외움(64+)' 3단계 서사로.
   각 칸 하단 라벨 필수·막대 maxWidth 56·gap 12 고정 → '최근 7일'(량 차트)과 시각적으로 구분. */
function BoxDist({ boxes }) {
  const counts = [0, 0, 0];
  Object.values(boxes).forEach(b => {
    if (!b || !b.ivl) return;
    if (b.ivl >= WELL_KNOWN_IVL) counts[2]++;        // 64+ = 다 외움(졸업)
    else if (b.ivl >= 8) counts[1]++;                // 8~32 = 거의 다
    else counts[0]++;                                // 1~4 = 이제 막
  });
  const max = Math.max(1, ...counts);
  /* ★'거의 다'는 accentSoft보다 진한 rgba(accent,0.45) — 이제 막(진한 핑크)→다 외움(초록) 사이 중간톤 */
  const cells = [
    { label: '이제 막', bar: VP.accent, num: VP.accent },
    { label: '거의 다', bar: rgba(VP.accent, 0.45), num: VP.accent },
    { label: '다 외움', bar: VP.ok, num: VP.okDeep },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', paddingTop: 6 }}>
      {cells.map((c, i) => {
        const n = counts[i];
        return (
          <View key={c.label} style={{ flex: 1, maxWidth: 88, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontFamily: ff(700), color: n ? c.num : VP.textFaint, height: 15 }}>{n > 0 ? n : ''}</Text>
            <View style={{ width: '100%', height: 72, justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
              <View style={{ width: '100%', maxWidth: 56, height: n ? Math.max(8, Math.round((n / max) * 72)) : 4, borderRadius: 7, backgroundColor: n ? c.bar : VP.surface2 }} />
            </View>
            <Text style={{ fontSize: 11, color: VP.textSub, fontFamily: ff(600), marginTop: 8 }}>{c.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ★22→20(Result 스탯 숫자와 통일)·radius 14→16(rLg 스냅)·아이콘 색 통일(가운데만 핑크라 이유 없는 강조였음)
   delta = {text, color} — 최근 정답률 카드용 '▲N%p' 병기 (없으면 미표시) */
function StatCard({ big, label, icon, delta }) {
  return (
    <View style={{ flex: 1, backgroundColor: VP.surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, borderColor: VP.divider }}>
      <Icon name={icon} size={18} color={VP.textSub} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
        <Text style={{ fontSize: 20, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 20) }}>{big}</Text>
        {delta ? <Text style={{ fontSize: 11, fontFamily: ff(700), color: delta.color }}>{delta.text}</Text> : null}
      </View>
      <Text style={{ fontSize: 11, color: VP.textSub, fontFamily: ff(600), marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function SectionCard({ title, right, children }) {
  return (
    <View style={{ backgroundColor: VP.surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: VP.divider }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        {/* ★카드 타이틀 15/700로 통일 (800 남용 정리 — 강조는 굵기 한 단계로 충분) */}
        <Text style={{ fontSize: 15, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 15) }}>{title}</Text>
        {/* ★S1 우측 수치 accent(2.8:1)→accentAA — 흰 배경 위 12px 핑크 텍스트 AA 확보 */}
        {right ? <Text style={{ fontSize: 12, color: VP.accentAA, fontFamily: ff(700) }}>{right}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function MiniLink({ icon, label, value, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label} ${value}`}
      style={{ flex: 1, backgroundColor: VP.surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: VP.divider, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={17} color={VP.accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 12, color: VP.textSub, fontFamily: ff(600) }}>{label}</Text>
        <Text style={{ fontSize: 17, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 17) }}>{value}</Text>
      </View>
      {/* ★chevron은 장식 — textMute(1.6:1) 대신 textFaint(의도적 저강조 3:1) */}
      <Icon name="chevron-right" size={16} color={VP.textFaint} />
    </Pressable>
  );
}

function StatsZero({ dispatch }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 40 }}>
      <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="mountain" size={40} color={VP.accent} />
      </View>
      <Text style={{ fontSize: 20, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 20), marginTop: 14, textAlign: 'center' }}>아직 학습 기록이 없어요</Text>
      <Text style={{ fontSize: 14, color: VP.textSub, lineHeight: 22, marginTop: 10, textAlign: 'center', maxWidth: 260 }}>
        첫 걸음을 내디디면 외운 단어, 연속 학습, 정답률이 여기에 차곡차곡 쌓여요.
      </Text>
      <View style={{ width: '100%', maxWidth: 240, marginTop: 18 }}>
        <VPButton variant="accent" icon="play" label="첫 걸음 내딛기" onPress={() => dispatch({ type: 'GO', screen: 'home' })} />
      </View>
    </View>
  );
}

export default function Stats({ state, dispatch }) {
  const done = state.checkedCount;                     // 체크 끝낸 걸음 수
  const currentCheck = Math.min(TOTAL, state.checkedCount + 1);
  const boxes = state.boxes || {};
  const learned = Object.values(boxes).filter(b => b && b.ivl >= WELL_KNOWN_IVL).length;   // 외운(졸업, ivl≥64) 단어
  const favCount = state.favorites.length;
  const noteCount = confusingIds(boxes).length;        // 헷갈리는(외우는 중) 단어
  const stageLog = state.stageLog || [];

  // ★'평균 정답률'→'최근 정답률' — 전체 평균은 초반 실수가 영원히 발목을 잡는 지표(성장 안 보임).
  //   최근 5회 평균 + 이전 5회(6~10번째) 대비 델타로 '지금 얼마나 나아졌나'를 보여준다.
  //   표본이 두 창 모두 5회씩 안 차면 델타 생략(노이즈), 델타 0이면 생략.
  const { recentAcc, accDelta } = useMemo(() => {
    const avg = (arr) => arr.reduce((s, x) => s + (x.acc || 0), 0) / arr.length;
    const r5 = stageLog.slice(-5);
    if (!r5.length) return { recentAcc: null, accDelta: null };
    const recent = Math.round(avg(r5));
    const p5 = stageLog.slice(-10, -5);
    if (r5.length < 5 || p5.length < 5) return { recentAcc: recent, accDelta: null };
    const d = Math.round(avg(r5) - avg(p5));
    return { recentAcc: recent, accDelta: d === 0 ? null : d };
  }, [stageLog]);

  // 최근 7일 — 실제 dailyLog
  const week = useMemo(() => {
    const out = [];
    const base = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base); d.setDate(base.getDate() - i);
      out.push({ d: DOW[d.getDay()], n: (state.dailyLog && state.dailyLog[dkey(d)]) || 0, today: i === 0 });
    }
    return out;
  }, [state.dailyLog]);
  const maxN = Math.max(...week.map(x => x.n), 1);
  const weekTotal = week.reduce((s, x) => s + x.n, 0);

  const recentLog = useMemo(() => [...stageLog].reverse().slice(0, 8), [stageLog]);
  const hasProgress = stageLog.length > 0 || state.checkedCount > 0 || Object.keys(boxes).length > 0 || weekTotal > 0;

  // ★자기효능감 서사 — 자기효능감은 장기 학습 성취의 강력한 예측변수(SLA 연구).
  //   '정답률'이 아니라 '성장'을 보여준다:
  //   (1) 다시 만나 이긴 단어 = 첫 시도에 틀렸지만 최근 시도는 맞힌 단어 수
  //   (2) 재노출 정답률 곡선 = 첫 만남 → 2번째 → 3번째+ 정답률 (인출 연습 효과 가시화)
  const ws = state.wordStats || {};
  const redeemedCount = useMemo(() => Object.values(ws).filter(x => x && x.fw === 1 && x.lc === 1).length, [state.wordStats]);
  const es = { e1: [0, 0], e2: [0, 0], e3: [0, 0], ...(state.expoStats || {}) };
  const expoPct = (b) => (b && b[1] >= 5 ? Math.round((b[0] / b[1]) * 100) : null);   // 표본 5개 미만이면 숨김(노이즈)

  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      {/* 헤더 */}
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 10 }}>
        <Text style={{ fontSize: 22, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 22) }}>통계</Text>
      </View>

      {!hasProgress ? <StatsZero dispatch={dispatch} /> : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 }}>
          {/* ① 요약 3카드 */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <StatCard big={learned} label="외운 단어" icon="book-open" />
            <StatCard big={`${state.streak}일`} label="연속 학습" icon="flame" />
            <StatCard big={recentAcc == null ? '–' : `${recentAcc}%`} label="최근 정답률" icon="check-bold"
              delta={accDelta != null ? {
                text: `${accDelta > 0 ? '▲' : '▼'}${Math.abs(accDelta)}%p`,
                color: accDelta > 0 ? VP.okDeep : VP.badDeep,
              } : null} />
          </View>

          {/* ② 다시 만나 이긴 단어 — 자기효능감 카드 ★최상단 승격 + 상시 표시(빈 상태 포함).
              '아직 없음'도 숨기지 않고 어떻게 쌓이는지 알려주는 게 동기 설계상 낫다. */}
          <SectionCard title="다시 만나 이긴 단어" right={redeemedCount > 0 ? `${redeemedCount}개` : ''}>
            {redeemedCount > 0 ? (
              <Text style={{ fontSize: 13, color: VP.textSub, lineHeight: 19 }}>
                처음엔 틀렸지만 지금은 맞히는 단어가 <Text style={{ fontFamily: ff(700), color: VP.okDeep }}>{redeemedCount}개</Text> — 다시 만나면 이겨요.
              </Text>
            ) : (
              <Text style={{ fontSize: 13, color: VP.textSub, lineHeight: 19 }}>퀴즈에서 틀린 단어를 다시 맞히면 여기 쌓여요.</Text>
            )}
            {/* ★재노출 타일 상시 표시 — 표본 미달 '—'는 무의미 기호였음 → 잠금 표시로 '5번 만나면 열린다'는 목표 제시 */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {[['첫 만남', es.e1], ['두 번째', es.e2], ['세 번째+', es.e3]].map(([label, b], i) => {
                const p = expoPct(b);
                return (
                  <View key={label} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12, backgroundColor: VP.surface2 }}>
                    {p == null ? (
                      <>
                        <Icon name="lock" size={12} color={VP.textSub} />
                        <Text style={{ fontSize: 11, color: VP.textSub, fontFamily: ff(600), marginTop: 3, textAlign: 'center', lineHeight: 14 }} numberOfLines={2}>5번 만나면{'\n'}열려요</Text>
                      </>
                    ) : (
                      <Text style={{ fontSize: 17, fontFamily: ff(700), color: i === 2 ? VP.okDeep : VP.text }}>{p}%</Text>
                    )}
                    <Text style={{ fontSize: 11, color: VP.textSub, fontFamily: ff(600), marginTop: 2 }}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </SectionCard>

          {/* ③ 최근 7일 — ★막대 최대 92→72: 값라벨+막대+요일라벨이 height를 넘쳐 겹치던 버그 수정분 유지.
              '오늘' 캡션 줄(높이 13)은 전 칸에 상시 예약 — 오늘만 있으면 레이아웃 시프트 */}
          <SectionCard title="최근 7일" right={`${weekTotal}단어`}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 132, paddingTop: 4 }}>
              {week.map((x, i) => {
                const h = x.n === 0 ? 4 : Math.round((x.n / maxN) * 72);
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, fontFamily: ff(700), color: VP.accentAA, height: 13 }}>{x.today ? '오늘' : ''}</Text>
                    {/* ★값 라벨: 오늘 accent(2.8:1)→accentAA, 비오늘 textMute(1.6:1)→textFaint(저강조 장식 3:1) */}
                    <Text style={{ fontSize: 11, fontFamily: ff(700), color: x.today ? VP.accentAA : VP.textFaint, height: 15 }}>{x.n > 0 ? x.n : ''}</Text>
                    <View style={{ width: 22, height: h, borderRadius: 7, marginTop: 6, backgroundColor: x.n === 0 ? VP.surface2 : (x.today ? VP.accent : VP.accentSoft) }} />
                    <Text style={{ fontSize: 11, marginTop: 6, fontFamily: ff(x.today ? 700 : 500), color: x.today ? VP.accentAA : VP.textSub }}>{x.d}</Text>
                  </View>
                );
              })}
            </View>
          </SectionCard>

          {/* ④ 걸음 진행 — ★'N / 132' 총량 헤드라인 폐기: 본문의 'N걸음째'(서수)와 헤더의 총량 분수가
              다른 셈법으로 보여 '1과 2가 어긋나는' 혼란을 만들었음. 서수 하나로 통일, 총량은 서브 텍스트로 강등 */}
          <SectionCard title={`지금 ${currentCheck}걸음째`}>
            <View style={{ height: 8, backgroundColor: VP.surface2, borderRadius: 999, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(0, Math.min(100, (done / TOTAL) * 100))}%`, height: '100%', backgroundColor: VP.accent, borderRadius: 999 }} />
            </View>
            <Text style={{ fontSize: 12, fontFamily: ff(500), color: VP.textSub, marginTop: 8 }}>
              전체 {TOTAL}걸음 중 {done}걸음 완료 · 단어 {done * 20}/{TOTAL * 20}
            </Text>
          </SectionCard>

          {/* ⑤ 외우는 단계 분포 — 3단계 요약 */}
          {Object.keys(boxes).length > 0 ? (
            <SectionCard title="외우는 단계" right={`학습 ${Object.keys(boxes).length}단어`}>
              <BoxDist boxes={boxes} />
            </SectionCard>
          ) : null}

          {/* ⑥ 오답 / 즐겨찾기 */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <MiniLink icon="flame" label="헷갈리는 단어" value={`${noteCount}개`} onPress={() => dispatch({ type: 'GO', screen: 'vocab', vocabView: 'confusing' })} />
            {/* ★즐겨찾기도 딥링크 통일 — 단어장 첫 탭이 아니라 즐겨찾기 뷰로 바로 */}
            <MiniLink icon="star" label="즐겨찾기" value={`${favCount}개`} onPress={() => dispatch({ type: 'GO', screen: 'vocab', vocabView: 'fav' })} />
          </View>

          {/* ⑦ 학습 기록 — ★좌측 원형 스테이지 배지 폐기: 숫자 중복(배지 N = 타이틀 N걸음째)이었음.
              정답률 도트(ok/accent/bad) + 'N걸음째 완료 · M%' 한 줄로 정보 밀도만 남김 */}
          <SectionCard title="학습 기록">
            {recentLog.length === 0 ? (
              <Text style={{ fontSize: 13, color: VP.textSub, lineHeight: 19, paddingVertical: 4 }}>
                <Text style={{ fontFamily: ff(700), color: VP.text }}>첫 퀴즈를 마치면</Text> 통계가 열려요 — 정답률과 함께 여기 기록돼요.
              </Text>
            ) : (
              recentLog.map((s, i) => (
                <View key={`${s.stage}-${s.ts}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: VP.divider }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.acc >= 80 ? VP.ok : (s.acc >= 60 ? VP.accent : VP.bad) }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 14, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 14) }}>{s.stage}걸음째 완료 · {s.acc}%</Text>
                    <Text style={{ fontSize: 12, color: VP.textSub, marginTop: 1 }}>{s.date} · 단어 {s.words}개</Text>
                  </View>
                </View>
              ))
            )}
          </SectionCard>
        </ScrollView>
      )}

      <TabBar active="stats" dispatch={dispatch} />
    </View>
  );
}
