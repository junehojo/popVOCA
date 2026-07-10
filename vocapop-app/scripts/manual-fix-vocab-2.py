#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
popVOCA 데이터 교정 2차 패스 — 1차(manual-fix-vocab.py) 적용 후, audit로 추가 발견한
'정독 때 놓친 깨진 띄어쓰기' + 남은 영어찌꺼기/번호아티팩트를 마저 교정.
1차와 동일하게 word 키 매칭, korean/meanings/pos 동기화.
사용: python3 manual-fix-vocab-2.py [--write]
"""
import json, sys, shutil, os
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, '..', 'assets', 'vocab_merged.json')
WRITE = '--write' in sys.argv
with open(PATH, encoding='utf-8') as f:
    data = json.load(f)
WIDX = {}
for e in data:
    WIDX.setdefault(e['word'], []).append(e)

# 깨진 띄어쓰기 — 부분 치환 (word, old, new)
TEXT_FIX = [
    ("flip",          "던지 다", "던지다"),
    ("furnished",     "제공하 다", "제공하다"),
    ("remain",        "유지하 다", "유지하다"),
    ("dramatic",      "자극하 는", "자극하는"),
    ("parade",        "과시 하다", "과시하다"),
    ("crawl",         "서행 하다", "서행하다"),
    ("exchange",      "환전 하다", "환전하다"),
    ("steel",         "준 비하다", "준비하다"),
    ("gain",          "증가하 다", "증가하다"),
    ("tradition",     "이야 기", "이야기"),
    ("refill",        "보충하 다", "보충하다"),
    ("starve",        "굶주리 다", "굶주리다"),
    ("subscribe",     "신청하 다", "신청하다"),
    ("corrupt",       "타락시 키다", "타락시키다"),
    ("improvise",     "임시변통 하다", "임시변통하다"),
    ("maintain",      "유지 하다", "유지하다"),
    ("accommodate",   "수용하 다", "수용하다"),
    ("accommodate",   "충족시키 다", "충족시키다"),
    ("burden",        "짐을 지우 다", "짐을 지우다"),
    ("conspire",      "꾸 미다", "꾸미다"),
    ("conspire",      "일어나 다", "일어나다"),
    ("conspire",      "작용 하다", "작용하다"),
    ("rage",          "지속 되다", "지속되다"),
    ("exploded",      "폭발 하다", "폭발하다"),
    ("universal",     "보편적 인", "보편적인"),
    ("universal",     "만인에 게", "만인에게"),
    ("restless",      "불안 한", "불안한"),
    ("glow",          "빛을 발 하다", "빛을 발하다"),
    ("entrust",       "위임 하다", "위임하다"),
    ("detain",        "붙들 다", "붙들다"),
    ("flour",         "뿌리 다", "뿌리다"),
    ("sew",           "바느질 하다", "바느질하다"),
    ("accelerate",    "빠르 게", "빠르게"),
    ("volunteer",     "자원하 다", "자원하다"),
    ("depress",       "우울 하게", "우울하게"),
    ("associate",     "교제 하다", "교제하다"),
    ("lottery",       "의존하 는", "의존하는"),
    ("exquisite",     "섬세 한", "섬세한"),
    ("idle",          "한가 한", "한가한"),
    ("household",     "사용하 는", "사용하는"),
    ("durable",       "견고 한", "견고한"),
    ("fold",          "중단하 다", "중단하다"),
    ("embarrass",     "어리둥절하게 하 다", "어리둥절하게 하다"),
    ("diversify",     "다각화하 다", "다각화하다"),
    ("letterhead",    "인쇄 된", "인쇄된"),
    ("letterhead",    "편지 머리 글", "편지 머리글"),
    ("amphitheater",  "경 기장", "경기장"),
    ("restructure",   "재편성 하다", "재편성하다"),
    ("streamline",    "효율화하 다", "효율화하다"),
    ("linger",        "오래 머무르 다", "오래 머무르다"),
    ("vaccinate",     "접종하 다", "접종하다"),
    ("occupy",        "주의를 차지하 다", "주의를 차지하다"),
    ("facilitate",    "촉진 하다", "촉진하다"),
    ("scatter",       "흩뿌리 다", "흩뿌리다"),
    ("assert",        "강하게 주장 하다", "강하게 주장하다"),
    ("customize",     "조정하 다", "조정하다"),
    ("disfigure",     "손상하 다", "손상하다"),
    ("specify",       "명시하 다", "명시하다"),
    ("socialize",     "조성하 다", "조성하다"),
    ("detach",        "분리되 다", "분리되다"),
    ("inarticulate",  "잘하지 못하 는", "잘하지 못하는"),
    ("attain",        "도 달하다", "도달하다"),
    ("attain",        "맞이하 다", "맞이하다"),
    ("compile",       "편집 하다", "편집하다"),
    ("oversupply",    "많이 공급 하다", "많이 공급하다"),
    ("enrich",        "강화 하다", "강화하다"),
    ("short-cut",     "끝 내다", "끝내다"),
    ("discourage",    "못 하게 하다", "못하게 하다"),
    ("afford",        "(time, money 등을)", "(시간·돈 등을)"),
    ("episode",       "한회", "한 회"),
]

# 영어찌꺼기/번호 — 전체 교체 (word, new_korean, new_pos)
REWRITE = [
    ("symmetrical", "대칭의, 균형 잡힌", "(형)"),
    ("backing",     "지지, 후원", None),
    ("counteract",  "상쇄시키다, 대응하다", None),
    ("fragment",    "조각, 파편", None),
    ("undergo",     "(변화나 안 좋은 일을) 겪다", None),
    ("impact",      "영향, 충돌, 충격", None),
    ("friction",    "의견 불일치, 마찰", None),
    ("cricket",     "크리켓(스포츠), 귀뚜라미", None),
    ("porcelain",   "자기, 도자기", None),
    ("presentation","행사, 증정, 발표", None),
    ("prospect",    "기회, 전망, 예상", None),
]

errors, changes = [], []
def resolve(word):
    lst = WIDX.get(word)
    if not lst: errors.append(f"[MISSING] {word}"); return None
    if len(lst) > 1: errors.append(f"[AMBIG] {word} num={[x['num'] for x in lst]}"); return None
    return lst[0]
def sync(e, old, new):
    for m in e.get('meanings', []):
        if isinstance(m, dict) and m.get('meaning') and old in m['meaning']:
            m['meaning'] = m['meaning'].replace(old, new)

for word, old, new in TEXT_FIX:
    e = resolve(word)
    if not e: continue
    if old not in (e.get('korean') or ''):
        errors.append(f"[NOMATCH] {word}: '{old}' 없음 → {e.get('korean')!r}"); continue
    b = e['korean']; e['korean'] = b.replace(old, new); sync(e, old, new)
    changes.append(("띄어쓰기", word, b, e['korean'], e['pos'], e['pos']))

for word, nk, np in REWRITE:
    e = resolve(word)
    if not e: continue
    bp, bk = e['pos'], e['korean']
    pos = np if np else e['pos']
    e['korean'] = nk
    if np: e['pos'] = np
    e['meanings'] = [{"pos": pos, "meaning": s.strip()} for s in nk.split(';') if s.strip()]
    changes.append(("영어/번호 정리", word, bk, nk, bp, e['pos']))

print(f"2차 교정: {len(changes)}개 / 오류 {len(errors)}개\n")
for cat in ["띄어쓰기", "영어/번호 정리"]:
    rows = [c for c in changes if c[0]==cat]
    print(f"\n===== {cat} ({len(rows)}) =====")
    for _, w, ok, nk, op, npos in rows:
        note = "" if op==npos else f"  [품사 {op}→{npos}]"
        print(f"  {w:16s} {ok!r} → {nk!r}{note}")
if errors:
    print("\n## 오류 ##")
    for x in errors: print("  "+x)

if WRITE and not errors:
    bak = PATH + '.bak3'
    if not os.path.exists(bak): shutil.copy(PATH, bak); print(f"\n백업: {os.path.basename(bak)}")
    with open(PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ 2차 적용 완료 ({len(changes)}개)")
elif WRITE:
    print("\n❌ 오류로 저장 보류")
else:
    print("\n(dry-run)")
