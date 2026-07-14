/* 개인화 콘텐츠 — 도메인 예문 팩 로드 + 내 단어 뜻 보강.
   ★ 전부 '실패해도 조용히' 원칙: 테이블/Edge Function 미배포·오프라인이어도 기본 예문으로 동작.
   생성은 전부 서버 배치(Edge Function) — 앱 런타임엔 LLM 호출이 없어 로컬 우선 원칙 유지. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

/* 예문 도메인 — 사용자가 '고른' 관심 분야 (학습 부담 없이 맥락만 입히는 설계) */
export const DOMAINS = [
  { v: null, l: '기본' },
  { v: 'dev', l: '개발 · IT' },
  { v: 'med', l: '의학 · 바이오' },
  { v: 'biz', l: '비즈니스' },
  { v: 'news', l: '시사 · 뉴스' },
  { v: 'academic', l: '학술 · 논문' },
];
export const domainLabel = (v) => (DOMAINS.find(d => d.v === (v || null)) || DOMAINS[0]).l;

const packKey = (domain) => `vocapop:domainpack:${domain}`;

/** 도메인 예문 팩 로드 — 캐시 즉시 적용 → 원격 갱신 순. cb(pack, 단어수)
 *  pack = { word_id: { ex, kor } } — data.js setDomainPack에 주입돼 예문/빈칸 스템을 덮어씀 */
export async function loadDomainPack(domain, cb) {
  if (!domain) { cb({}, 0); return; }
  try {
    const raw = await AsyncStorage.getItem(packKey(domain));
    if (raw) { const p = JSON.parse(raw); cb(p, Object.keys(p).length); }
  } catch (e) {}
  try {
    const { data, error } = await supabase
      .from('vocapop_domain_bank')
      .select('word_id, example, example_kor')
      .eq('domain', domain).eq('status', 'ok')
      .limit(3000);
    if (error || !data || data.length === 0) return;   // 팩 미생성 — 캐시(있다면) 유지
    const pack = {};
    data.forEach(r => { if (r.example) pack[r.word_id] = { ex: r.example, kor: r.example_kor || '' }; });
    AsyncStorage.setItem(packKey(domain), JSON.stringify(pack)).catch(() => {});
    cb(pack, Object.keys(pack).length);
  } catch (e) {}
}

/** 커리큘럼 미등재 '내 단어' 뜻 보강 — lookup-word Edge Function (사전형 스키마).
 *  호출부(App.js)가 결과를 MYWORD_UPDATE로 병합. 실패 단어는 failed 마킹으로 무한 재시도 방지. */
const _inflight = new Set();
export async function enrichMyWords(myWords, onUpdate) {
  const pending = (myWords || [])
    .filter(m => m && !m.id && !m.korean && !m.failed && !_inflight.has(m.word))
    .slice(0, 3);   // 한 번에 3개까지 — 공유 폭주 시 요청 폭주 방지
  for (const m of pending) {
    _inflight.add(m.word);
    try {
      const { data, error } = await supabase.functions.invoke('lookup-word', { body: { word: m.word } });
      if (!error && data && data.korean) {
        onUpdate(m.word, {
          korean: data.korean, pos: data.pos || '',
          example: data.example || '', exampleKor: data.example_kor || data.exampleKor || '',
          pron: data.pronunciation || '',
        });
      } else onUpdate(m.word, { failed: 1 });
    } catch (e) { onUpdate(m.word, { failed: 1 }); }
    finally { _inflight.delete(m.word); }
  }
}
