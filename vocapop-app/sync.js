/* VocaPoP 서버 동기화 — 유저당 상태 블롭 1행(vocapop_state).
   사인인 시 클라우드+로컬을 손실 없이 병합(집합=합집합·카운터=max·로그=합침),
   이후 상태 변경 시 push(App.js 디바운스). 충돌 단순화: 마지막 쓰기가 아니라 '많을수록 보존'. */
import { supabase } from './supabase';

const uniq = (a = [], b = []) => Array.from(new Set([...(a || []), ...(b || [])]));
const maxMap = (a = {}, b = {}) => {
  const o = { ...(a || {}) };
  for (const k in (b || {})) o[k] = Math.max(o[k] || 0, b[k] || 0);
  return o;
};

/** 클라우드 + 로컬 병합 (둘 중 하나 없으면 다른 쪽) */
export function mergeState(local, cloud) {
  if (!cloud) return local;
  if (!local) return cloud;

  // dailyLog: 날짜별 max
  const dailyLog = maxMap(local.dailyLog, cloud.dailyLog);
  // stageLog: stage-ts 키로 합집합
  const seen = new Set();
  const stageLog = [...(local.stageLog || []), ...(cloud.stageLog || [])].filter((s) => {
    const k = `${s.stage}-${s.ts}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  // boxes(박스 SRS): id별로 ivl 큰(더 진전된) 쪽 보존
  const boxes = { ...(cloud.boxes || {}) };
  for (const id in (local.boxes || {})) {
    const l = local.boxes[id];
    const c = boxes[id];
    if (!c || (l && (l.ivl || 0) >= (c.ivl || 0))) boxes[id] = l;
  }

  return {
    ...local,
    ...cloud,
    favorites: uniq(local.favorites, cloud.favorites),
    checkedCount: Math.max(local.checkedCount || 0, cloud.checkedCount || 0),
    points: Math.max(local.points || 0, cloud.points || 0),
    boxes,
    sessionNo: Math.max(local.sessionNo || 0, cloud.sessionNo || 0),
    dailyLog,
    stageLog,
    dailyGoal: cloud.dailyGoal || local.dailyGoal,
    settings: { ...(local.settings || {}), ...(cloud.settings || {}) },
    onboarded: !!(local.onboarded || cloud.onboarded),
    wbTutorialSeen: !!(local.wbTutorialSeen || cloud.wbTutorialSeen),
  };
}

/** 클라우드 상태 읽기. 없으면 null. 테이블 미생성 등 에러는 throw */
export async function pullState(userId) {
  const { data, error } = await supabase
    .from('vocapop_state')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? data.data : null;
}

/** 로컬 상태 블롭을 클라우드에 upsert */
export async function pushState(userId, blob) {
  const { error } = await supabase
    .from('vocapop_state')
    .upsert({ user_id: userId, data: blob, updated_at: new Date().toISOString() });
  if (error) throw error;
}
