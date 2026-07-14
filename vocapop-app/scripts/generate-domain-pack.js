#!/usr/bin/env node
/* 도메인 예문 팩 배치 러너 — vocab_merged.json + quiz_bank.json(동결 오답)을 읽어
 * generate-domain-pack Edge Function에 12개씩 POST한다.
 *
 * 사용:
 *   SUPABASE_URL=https://tlighukhkccuwmmvfuoq.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/generate-domain-pack.js --domain dev [--from 1] [--to 2640] [--force]
 *
 * ★ 오답(distractors)은 quiz_bank의 손검수 보기에서 가져온다 — answerability 평가가
 *   "동결 보기 기준으로 정답이 유일한가"를 검증하므로 문항 품질이 유지된다.
 * ★ 이미 status=ok인 단어는 건너뜀 (--force로 재생성). 실패해도 이어서 진행. */
const fs = require('fs');
const path = require('path');

const VOCAB = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/vocab_merged.json'), 'utf8'));
const BANK = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/quiz_bank.json'), 'utf8'));

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const DOMAIN = opt('domain');
const FROM = parseInt(opt('from', '1'), 10);
const TO = parseInt(opt('to', String(VOCAB.length)), 10);
const FORCE = args.includes('--force');
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!DOMAIN || !URL || !KEY) {
  console.error('필요: --domain <dev|med|biz|news|academic> + env SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// 단어 인덱스 → (걸음, 문항) → 동결 보기에서 오답 3개 추출 (data.js stageIdxOf/quizMetaFor와 동일 규칙)
const byId = {}; VOCAB.forEach((w, i) => { byId[w.id ?? w.num ?? i + 1] = { ...w, _i: i }; });
const bank = {}; BANK.forEach(q => { bank[q.s * 1000 + q.i] = q; });
function distractorsOf(w) {
  const stage = Math.floor(w._i / 20) + 1, idx = w._i % 20;
  const q = bank[stage * 1000 + idx];
  if (!q || !Array.isArray(q.o)) return [];
  return q.o.filter(id => id !== (w.id ?? w.num)).map(id => byId[id] && byId[id].word).filter(Boolean).slice(0, 3);
}
const meaningsOf = (w) => Array.isArray(w.meanings) && w.meanings.length
  ? w.meanings.map(m => (typeof m === 'string' ? m : m.meaning)).filter(Boolean)
  : String(w.korean || '').split(';').map(s => s.trim()).filter(Boolean);

async function existingOk() {
  const set = new Set();
  let fromRow = 0;
  for (;;) {
    const r = await fetch(`${URL}/rest/v1/vocapop_domain_bank?domain=eq.${DOMAIN}&status=eq.ok&select=word_id&limit=1000&offset=${fromRow}`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    rows.forEach(x => set.add(x.word_id));
    fromRow += rows.length;
    if (rows.length < 1000) break;
  }
  return set;
}

(async () => {
  const done = FORCE ? new Set() : await existingOk();
  const targets = VOCAB
    .map((w, i) => ({ ...w, _i: i, id: w.id ?? w.num ?? i + 1 }))
    .filter(w => w.id >= FROM && w.id <= TO && !done.has(w.id));
  console.log(`domain=${DOMAIN} · 대상 ${targets.length}개 (건너뜀 ${done.size}개)`);

  let ok = 0, fail = 0;
  for (let i = 0; i < targets.length; i += 12) {
    const batch = targets.slice(i, i + 12).map(w => ({
      id: w.id, word: w.word, pos: w.pos || '', cefr: w.cefr || '',
      meanings: meaningsOf(w), distractors: distractorsOf(w),
    }));
    try {
      const r = await fetch(`${URL}/functions/v1/generate-domain-pack`, {
        method: 'POST',
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: DOMAIN, words: batch }),
      });
      const out = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(out));
      out.results.forEach(x => (x.ok ? ok++ : fail++));
      console.log(`  [${i + batch.length}/${targets.length}] ok=${ok} rejected=${fail}`);
    } catch (e) {
      console.error(`  batch ${i} 실패:`, e.message, '— 계속 진행');
    }
  }
  console.log(`완료 · 합격 ${ok} / 탈락 ${fail} (탈락분은 status=rejected로 기록 — 앱은 기본 예문 사용)`);
})();
