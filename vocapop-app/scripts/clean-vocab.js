/* 단어 데이터 정리 — 구(phrase) 제거 + 함수어 제거 + 띄어쓰기 복원 + 품사태그 정리.
   node scripts/clean-vocab.js        → dry-run(변경 미리보기, 저장 안 함)
   node scripts/clean-vocab.js --write → 실제 적용(백업 후 저장) */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'assets', 'vocab_merged.json');
const WRITE = process.argv.includes('--write');
const V = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// 단어로 보기 어려운 함수어(관사/전치사/접속사 등) — 단어장에서 제거
const FUNCTION_WORDS = new Set(['as', 'of', 'the', 'a', 'an', 'to', 'in', 'on', 'at', 'for',
  'so', 'or', 'and', 'but', 'if', 'than', 'that', 'this', 'it', 'is', 'be', 'by', 'with', 'from', 'into', 'up', 'out']);

// 띄어쓰기 복원: 낱글자로 분리된 한글을 단어로 합친다
function fixSpacing(str) {
  if (!str) return str;
  // 연속된 단음절 한글만 한 단어로 병합 ("단 순 한"→"단순한", "위 조 하 다"→"위조하다", "행 동"→"행동").
  // 외톨이 단음절("더 낮은"의 "더")이나 구분자는 안 건드림 — '더'·'것'·'길' 같은 진짜 한글자 단어를
  // 잘못 붙이면 오히려 오류가 되므로, 확실히 깨진 연속 낱글자만 안전하게 복원.
  const raw = str.split(/ +/);
  const out = [];
  for (const t of raw) {
    // 단음절 한글 + 선택적 꼬리 구두점("스,", "한.") 도 단음절로 취급 → 구두점에 막힌 연속 낱글자도 병합
    const m = t.match(/^([가-힣])([,;.]?)$/);
    const prev = out[out.length - 1];
    if (m && prev && prev.open) {
      prev.v += m[1] + m[2];
      if (m[2]) prev.open = false;   // 꼬리 구두점이 붙으면 그 단어 run 종료
    } else if (m) {
      out.push({ v: m[1] + m[2], open: !m[2] });
    } else {
      out.push({ v: t, open: false });
    }
  }
  return out.map(x => x.v).join(' ').trim();
}

// 뜻 앞의 문법 태그 제거: "구)~로써", "(s+v)일단", "(절)~" 등
const LEAD_TAG = /^\s*[\(（]?(구|절|접|전|관|대|수|감|s\s*\+\s*v)[\)）]\s*/i;
function cleanMeaning(m) {
  let s = String(m || '');
  s = s.replace(LEAD_TAG, '');
  s = fixSpacing(s);
  return s.trim();
}

let removedPhrase = [], removedFunc = [], spacingFixed = [], tagFixed = [];

const kept = V.filter(w => {
  if (w.phrase === true) { removedPhrase.push(w.word); return false; }
  if (FUNCTION_WORDS.has(String(w.word).toLowerCase().trim())) { removedFunc.push(w.word); return false; }
  return true;
});

for (const w of kept) {
  const beforeKorean = w.korean;
  if (Array.isArray(w.meanings)) {
    w.meanings = w.meanings.map(mm => {
      const before = mm.meaning;
      const after = cleanMeaning(before);
      if (LEAD_TAG.test(String(before))) tagFixed.push([w.word, before, after]);
      return { ...mm, meaning: after };
    });
    w.korean = w.meanings.map(mm => mm.meaning).filter(Boolean).join('; ');
  } else if (w.korean) {
    w.korean = w.korean.split(';').map(s => cleanMeaning(s)).filter(Boolean).join('; ');
  }
  if (beforeKorean !== w.korean) spacingFixed.push([w.word, beforeKorean, w.korean]);
}

console.log(`총 ${V.length} → 유지 ${kept.length} (제거 ${V.length - kept.length})`);
console.log(`\n[1] 구/숙어(phrase) 제거: ${removedPhrase.length}개`);
console.log('   ' + removedPhrase.slice(0, 20).join(', ') + (removedPhrase.length > 20 ? ' …' : ''));
console.log(`\n[2] 함수어 제거: ${removedFunc.length}개 → ${removedFunc.join(', ')}`);
console.log(`\n[3] 품사태그 정리: ${tagFixed.length}개`);
tagFixed.slice(0, 6).forEach(([w, b, a]) => console.log(`   [${w}] "${b}" → "${a}"`));
console.log(`\n[4] 텍스트 정리(띄어쓰기 등): ${spacingFixed.length}개 — 샘플:`);
spacingFixed.slice(0, 18).forEach(([w, b, a]) => console.log(`   [${w}]\n      전: ${b}\n      후: ${a}`));

if (WRITE) {
  fs.writeFileSync(FILE + '.bak', JSON.stringify(V, null, 0));   // 원본 백업
  fs.writeFileSync(FILE, JSON.stringify(kept));
  console.log(`\n✅ 적용됨. 백업: vocab_merged.json.bak (원본 ${V.length}개), 새 파일 ${kept.length}개`);
} else {
  console.log('\n(dry-run — 저장 안 함. 적용하려면 --write)');
}
