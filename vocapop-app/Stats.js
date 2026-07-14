/* VocaPoP 통계 — design-reference/vp-proto-screens-stats.jsx (ProtoStats) 픽셀 이식.
   ★ 데모 데이터가 아니라 실제 학습기록(dailyLog/stageLog/boxes)으로 그린다.
   처음엔 비어 보이는 게 정상 — 학습할수록 채워진다. */
import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { VP, ff, ls } from './theme';
import { Icon } from './Icon';
import { VPButton } from './ui';
import { TabBar } from './Home';
import { TOTAL, confusingIds, WELL_KNOWN_IVL } from './data';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const dkey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* 외우는 단계 분포 — ivl 1·2·4·8·16·32·64+ 7칸. 오른쪽 끝(다 외움)만 초록. */
function BoxDist({ boxes }) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  Object.values(boxes).forEach(b => {
    if (!b || !b.ivl) return;
    counts[Math.min(6, Math.round(Math.log2(Math.max(1, b.ivl))))]++;
  });
  const max = Math.max(1, ...counts);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, paddingTop: 6 }}>
        {counts.map((n, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontFamily: ff(700), color: n ? (i === 6 ? VP.okDeep : VP.accent) : VP.textMute, height: 15 }}>{n > 0 ? n : ''}</Text>
            <View style={{ width: 22, height: n ? Math.max(8, Math.round((n / max) * 72)) : 4, borderRadius: 7, marginTop: 4, backgroundColor: n ? (i === 6 ? VP.ok : VP.accent) : VP.surface2 }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ fontSize: 11, color: VP.textMute, fontFamily: ff(600) }}>이제 막</Text>
        <Text style={{ fontSize: 11, color: VP.textMute, fontFamily: ff(600) }}>다 외움</Text>
      </View>
    </View>
  );
}

/* ★22→20(Result 스탯 숫자와 통일)·radius 14→16(rLg 스냅)·아이콘 색 통일(가운데만 핑크라 이유 없는 강조였음) */
function StatCard({ big, label, icon }) {
  return (
    <View style={{ flex: 1, backgroundColor: VP.surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, borderColor: VP.divider }}>
      <Icon name={icon} size={18} color={VP.textSub} />
      <Text style={{ fontSize: 20, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 20), marginTop: 6 }}>{big}</Text>
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
        {right ? <Text style={{ fontSize: 12, color: VP.accent, fontFamily: ff(700) }}>{right}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function MiniLink({ icon, label, value, onPress }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, backgroundColor: VP.surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: VP.divider, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={17} color={VP.accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 12, color: VP.textSub, fontFamily: ff(600) }}>{label}</Text>
        <Text style={{ fontSize: 17, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 17) }}>{value}</Text>
      </View>
      <Icon name="chevron-right" size={16} color={VP.textMute} />
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
  const avgAcc = stageLog.length ? Math.round(stageLog.reduce((s, x) => s + (x.acc || 0), 0) / stageLog.length) : 0;

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
  const hasExpo = expoPct(es.e1) != null;

  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      {/* 헤더 */}
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 10 }}>
        <Text style={{ fontSize: 22, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 22) }}>통계</Text>
      </View>

      {!hasProgress ? <StatsZero dispatch={dispatch} /> : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 }}>
          {/* 요약 3카드 */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <StatCard big={learned} label="외운 단어" icon="book-open" />
            <StatCard big={`${state.streak}일`} label="연속 학습" icon="flame" />
            <StatCard big={stageLog.length ? `${avgAcc}%` : '–'} label="평균 정답률" icon="check-bold" />
          </View>

          {/* 주간 활동 — ★막대 최대 92→72: 값라벨14+마진6+막대92+마진6+요일라벨15=133px가
              height 116을 넘쳐 flex-end 기준 위로 밀리며 헤더의 '{n}단어' 라벨과 겹치던 버그. BoxDist(72)와도 통일 */}
          <SectionCard title="이번 주 학습" right={`${weekTotal}단어`}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 116, paddingTop: 8 }}>
              {week.map((x, i) => {
                const h = x.n === 0 ? 4 : Math.round((x.n / maxN) * 72);
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontFamily: ff(700), color: x.today ? VP.accent : VP.textMute, height: 15 }}>{x.n > 0 ? x.n : ''}</Text>
                    <View style={{ width: 22, height: h, borderRadius: 7, marginTop: 6, backgroundColor: x.n === 0 ? VP.surface2 : (x.today ? VP.accent : VP.accentSoft) }} />
                    <Text style={{ fontSize: 11, marginTop: 6, fontFamily: ff(x.today ? 700 : 500), color: x.today ? VP.accent : VP.textSub }}>{x.d}</Text>
                  </View>
                );
              })}
            </View>
          </SectionCard>

          {/* 걸음 진행 */}
          <SectionCard title="지금까지 오른 걸음" right={`${done} / ${TOTAL}`}>
            <View style={{ height: 8, backgroundColor: VP.surface2, borderRadius: 999, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(0, Math.min(100, (done / TOTAL) * 100))}%`, height: '100%', backgroundColor: VP.accent, borderRadius: 999 }} />
            </View>
            <Text style={{ fontSize: 12, color: VP.textSub, marginTop: 8 }}>
              지금은 <Text style={{ color: VP.text, fontFamily: ff(700) }}>{currentCheck}걸음째</Text> 오르는 중이에요
            </Text>
          </SectionCard>

          {/* 외우는 단계 분포 — 박스(1→64)별 단어 수 */}
          {Object.keys(boxes).length > 0 ? (
            <SectionCard title="외우는 단계" right={`학습 ${Object.keys(boxes).length}단어`}>
              <BoxDist boxes={boxes} />
            </SectionCard>
          ) : null}

          {/* ★다시 만나 이긴 단어 — 자기효능감 카드 (퀴즈를 풀어야 쌓임) */}
          {(redeemedCount > 0 || hasExpo) ? (
            <SectionCard title="다시 만나 이긴 단어" right={redeemedCount > 0 ? `${redeemedCount}개` : ''}>
              {redeemedCount > 0 ? (
                <Text style={{ fontSize: 13, color: VP.textSub, lineHeight: 19 }}>
                  처음엔 틀렸지만 지금은 맞히는 단어가 <Text style={{ fontFamily: ff(700), color: VP.okDeep }}>{redeemedCount}개</Text> — 다시 만나면 이겨요.
                </Text>
              ) : null}
              {hasExpo ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: redeemedCount > 0 ? 12 : 0 }}>
                  {[['첫 만남', es.e1], ['두 번째', es.e2], ['세 번째+', es.e3]].map(([label, b], i) => {
                    const p = expoPct(b);
                    return (
                      <View key={label} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: VP.surface2 }}>
                        <Text style={{ fontSize: 17, fontFamily: ff(700), color: p == null ? VP.textMute : (i === 2 ? VP.okDeep : VP.text) }}>{p == null ? '—' : `${p}%`}</Text>
                        <Text style={{ fontSize: 11, color: VP.textSub, fontFamily: ff(600), marginTop: 2 }}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </SectionCard>
          ) : null}

          {/* 오답 / 즐겨찾기 */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <MiniLink icon="flame" label="헷갈리는 단어" value={`${noteCount}개`} onPress={() => dispatch({ type: 'GO', screen: 'vocab', vocabView: 'confusing' })} />
            <MiniLink icon="star" label="즐겨찾기" value={`${favCount}개`} onPress={() => dispatch({ type: 'GO', screen: 'vocab' })} />
          </View>

          {/* 학습 기록 */}
          <SectionCard title="학습 기록">
            {recentLog.length === 0 ? (
              <Text style={{ fontSize: 13, color: VP.textSub, lineHeight: 19, paddingVertical: 4 }}>
                걸음 <Text style={{ fontFamily: ff(700), color: VP.text }}>퀴즈를 마치면</Text> 정답률과 함께 여기 기록돼요.
              </Text>
            ) : (
              recentLog.map((s, i) => (
                <View key={`${s.stage}-${s.ts}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: VP.divider }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13, fontFamily: ff(700), color: VP.accent }}>{s.stage}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 14, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 14) }}>{s.stage}걸음째 완료</Text>
                    <Text style={{ fontSize: 12, color: VP.textSub, marginTop: 1 }}>{s.date} · 단어 {s.words}개</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontFamily: ff(700), color: (s.acc >= 90 ? VP.ok : VP.text) }}>{s.acc}%</Text>
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
