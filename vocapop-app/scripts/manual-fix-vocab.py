#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
popVOCA 2차 데이터 교정 — Claude가 vocab_merged.json 전체(2,769개)를 한글로 직접 통독하며
찾은 오류(깨진 띄어쓰기 / 오역 / 오타 / 영어·농담 찌꺼기 / 번호·괄호 아티팩트 / 잘못된 품사)를
일괄 교정. 키는 num이 아니라 word(영단어) — num 결번 때문에 안전하게 단어로 매칭.
korean / meanings[].meaning / pos 세 군데를 동시에 일관되게 맞춤.

사용:  python3 manual-fix-vocab.py            # dry-run (변경 미저장)
       python3 manual-fix-vocab.py --write    # 적용 (.bak2 백업 후 저장)
"""
import json, sys, shutil, os

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, '..', 'assets', 'vocab_merged.json')
WRITE = '--write' in sys.argv

with open(PATH, encoding='utf-8') as f:
    data = json.load(f)

# word -> [entries]
WIDX = {}
for e in data:
    WIDX.setdefault(e['word'], []).append(e)

# ── 1) TEXT_FIX: 부분 문자열 치환(나머지 뜻은 유지), 품사 변화 없음 ──
#    (word, old_substr, new_substr)
TEXT_FIX = [
    ("merit",        "받을 만 하다",            "받을 만하다"),
    ("decent",       "나쁘 지 않은",            "나쁘지 않은"),
    ("chronicle",    "이 야기하다",             "이야기하다"),
    ("rehearse",     "반복해서 말 하다",        "반복해서 말하다"),
    ("outdated",     "뒤떨 어진",               "뒤떨어진"),
    ("distraught",   "정신없 는",               "정신없는"),
    ("damage",       "피해를 입히 다",          "피해를 입히다"),
    ("noble",        "숭고 한",                 "숭고한"),
    ("mandate",      "위임하 다",               "위임하다"),
    ("sever",        "절단하 다",               "절단하다"),
    ("provoke",      "유발하 다",               "유발하다"),
    ("admit",        "인 정하다",               "인정하다"),
    ("optical",      "시각과 관련 된",          "시각과 관련된"),
    ("optical",      "관 련된",                 "관련된"),
    ("raise",        "증가시 키다",             "증가시키다"),
    ("capable",      "할수있는",                "할 수 있는"),
    ("prefer",       "선호하 다",               "선호하다"),
    ("prefer",       "비 교적",                 "비교적"),
    ("dresser",      "입히 는 사람",            "입히는 사람"),
    ("concentrate",  "모으 다",                 "모으다"),
    ("dispatch",     "보내다. 재빨리",          "보내다, 재빨리"),
    ("relieve",      "덜어주다., 업무",         "덜어주다, 업무"),
]

# ── 2) REWRITE: korean 전체 교체 + meanings 재생성. new_pos=None이면 품사 유지 ──
#    (word, new_korean, new_pos)
REWRITE = [
    # (a) 깨진 띄어쓰기/슬래시/번호/괄호/영어찌꺼기 정리 — 품사 유지(None)
    ("damn",            "헐뜯다, 저주하다", None),
    ("deal",            "나누어 주다, 분배하다", None),
    ("handle",          "다루다, 손잡이", None),
    ("investigate",     "조사하다, 연구하다", None),
    ("abuse",           "남용, 남용하다, 욕하다", None),
    ("available",       "이용할 수 있는", None),
    ("heroin",          "헤로인(마약의 일종)", None),
    ("border",          "가장자리, 경계, 접하다", None),
    ("clutch",          "붙잡음, 꽉 잡다", None),
    ("facade",          "외관, 허울, 정면", None),
    ("appear",          "나타나다, ~인 듯하다", None),
    ("instrumental",    "수단이 되는, 도움이 되는", None),
    ("representatives", "대표자, 대리인, 대표하는", None),
    ("detergent",       "세제(세탁·식기용)", None),
    ("insert",          "끼워 넣다, 삽입물", None),
    ("perform",         "이행하다, 실행하다", None),
    ("covert",          "은밀한, 숨는 장소", None),
    ("dictate",         "구술하다, 요구하다", None),
    ("consolidated",    "강화하다", None),
    ("function",        "기능, 의식, 작용하다", None),
    ("institution",     "설립, 학회, 공공시설", None),
    ("charcoal",        "숯, 목탄으로 그리다", None),
    ("exhale",          "내뿜다, 증발시키다", None),
    ("impress",         "감동시키다, 감명을 주다", None),
    ("clot",            "엉긴 덩어리, 바보", None),
    ("instrument",      "기계, 악기, 증서", None),
    ("mock",            "조롱하다, 비웃다", None),
    ("intake",          "받아들이는 곳, 섭취량", None),
    ("hemisphere",      "(지구·뇌의) 반구", None),
    ("discharge",       "짐을 내리다, 해방하다", None),
    ("phosphorus",      "인(화학 원소)", None),
    ("pacify",          "진정시키다, 만족시키다", None),
    ("formula",         "판에 박은 말, 방식, 공식", None),
    ("ingenuity",       "독창력, 정교함", None),
    ("ensure",          "안전하게 하다, 보증하다", None),
    ("ignorance",       "무지, 무식", None),
    ("inherit",         "상속하다, 물려받다", None),
    ("clutter",         "어수선함, 어지르다", None),
    ("embody",          "구현하다, 구체화하다", None),
    ("crystalline",     "수정 같은, 투명한", None),
    ("assemble",        "모으다, 조립하다", None),
    ("excessive",       "과도한, 지나친", None),
    ("fountain",        "분수, 샘", None),
    ("indulge",         "빠지다, 만족시키다", None),
    ("inevitable",      "피할 수 없는", None),
    ("influential",     "영향력이 있는, 세력 있는", None),
    ("participate",     "참여하다, 관여하다", None),
    ("overtook",        "추월했다, 앞질렀다", None),
    ("assess",          "평가하다, 사정하다", None),
    ("define",          "정의를 내리다, 규정짓다", None),
    ("demonstrate",     "증명하다, 설명하다", None),
    ("optimism",        "낙관주의, 낙천주의", None),
    ("irresponsibility","무책임, 무책임함", None),
    ("centrifugal",     "원심력을 이용하는", None),
    ("disturbance",     "방해, 소란, 동요", None),
    ("spur",            "자극하다, 촉진시키다", None),
    ("contradict",      "부정하다, 모순되다", None),
    ("affluence",       "풍족함, 부유함", None),
    ("persist",         "고집하다, 주장하다, 지속하다", None),
    ("amenity",         "편의시설, 쾌적함", None),
    ("ascendancy",      "지배권, 우세", None),
    ("consume",         "다 써버리다, 소멸시키다", None),
    ("baffle",          "당황하게 하다, 좌절시키다", None),
    ("probability",     "확률, 개연성, 가능성", None),
    ("barbel",          "(물고기의) 수염", None),
    ("subconscious",    "잠재의식", None),
    ("borax",           "붕사, 싸구려 물건", None),
    ("deduce",          "결론을 끌어내다, 연역하다", None),
    ("irritation",      "짜증, 염증, 자극", None),
    ("intelligible",    "이해하기 쉬운, 이해할 수 있는", None),
    ("elective",        "선거에 의한, 선택 과목", None),
    ("inundate",        "침수시키다, 몰려오다", None),
    ("originate",       "시작하다, 비롯하다", None),
    ("invertebrate",    "무척추동물", None),
    ("italics",         "이탤릭체, 기울임꼴", None),
    ("licensee",        "면허 받은 사람", None),
    ("forestry",        "임업, 산림학", None),
    ("metallurgy",      "야금학", None),
    ("constitute",      "구성하다, 임명하다", None),
    ("passerines",      "참새목의 새, 명금류", None),
    ("impair",          "손상시키다, 약화시키다", None),
    ("protrude",        "내밀다, 튀어나오다", None),
    ("slat",            "가느다란 널빤지, 살", None),
    ("typescripts",     "타이프로 친 문서", None),
    ("variability",     "변하기 쉬움, 변화성", None),
    ("fume",            "연기, 매연; 몹시 화내다", "(명)(동)"),

    # (b) 품사 + 뜻 동시 교정 (잘못된 품사 / 오역 / 오타 포함)
    ("naive",           "단순한, 믿기 쉬운", "(형)"),
    ("see",             "(시대, 장소, 사건 등이) 일어나다", "(동)"),
    ("hence",           "그러한 이유, 그러므로, 지금부터", "(부)"),
    ("otherwise",       "그렇지 않으면", "(부)"),
    ("painfully",       "아파하여, 고생하여", "(부)"),
    ("once",            "일단 ~하면; 한때", "(부)"),
    ("ignite",          "점화하다, 불을 붙이다", "(동)"),
    ("naughty",         "말썽꾸러기의, 장난꾸러기의", "(형)"),
    ("beyond",          "~을 넘어서, ~을 지나서", "(전)"),
    ("plus",            "~을 더하여", "(전)"),
    ("gently",          "완만하게, 부드럽게", "(부)"),
    ("social",          "사회적인, 사교적인", "(형)"),
    ("desperate",       "자포자기의, 절망적인", "(형)"),
    ("original",        "최초의, 독창적인", "(형)"),
    ("intricate",       "정교한, 복잡한", "(형)"),
    ("despite",         "~에도 불구하고", "(전)"),
    ("brood",           "알을 품다, 곰곰이 생각하다", "(동)"),
    ("extraordinary",   "이상한, 비상한", "(형)"),
    ("COO",             "최고 운영 책임자", "(명)"),
    ("somewhat",        "어느 정도, 약간", "(부)"),
    ("designated",      "지정된, 지명된", "(형)"),
    ("withered",        "시든, 지친", "(형)"),
    ("nuclear",         "원자핵의, 핵의", "(형)"),
    ("negative",        "부정의, 반대의", "(형)"),
    ("similar",         "비슷한, 유사한", "(형)"),
    ("fully",           "완전히, 충분히", "(부)"),
    ("afterwards",      "나중에, 그 후에", "(부)"),
    ("dub",             "(이름·별명을) 붙이다, 더빙하다", "(동)"),
    ("alpine",          "알프스산맥의, 고산의", "(형)"),
    ("chic",            "세련된, 우아한", "(형)"),
    ("fertile",         "작물이 풍부한, 창의력이 풍부한", "(형)"),
    ("inventive",       "창의적인, 독창적인", "(형)"),
    ("religious",       "종교상의, 종교적인", "(형)"),
    ("corrupted",       "부정한, 부패한", "(형)"),
    ("orientation",     "방향, (새 환경에 대한) 적응, 오리엔테이션", "(명)"),
    ("comatose",        "혼수상태의", "(형)"),
    ("addict",          "중독시키다", "(동)"),
    ("divine",          "신의, 신성한", "(형)"),
    ("brisk",           "활발한, 빠른", "(형)"),
    ("marital",         "결혼의, 부부의", "(형)"),
    ("demanding",       "힘든, 까다로운", "(형)"),
    ("adorned",         "장식된, 꾸며진", "(형)"),
    ("blunt",           "무딘, 퉁명스러운", "(형)"),
    ("proposal",        "제안, 청혼", "(명)"),
    ("tedious",         "지루한, 더딘", "(형)"),
    ("sought",          "추구했다, 찾았다", "(동)"),
    ("generator",       "발전기, 생성기", "(명)"),
    ("contrary",        "반대의, 정반대의", "(형)"),
    ("theoretical",     "이론상의, 이론적인", "(형)"),
    ("severe",          "심각한, 극심한, 엄격한", "(형)"),
    ("ridge",           "산등성이, 능선", "(명)"),
    ("emotion",         "감정, 정서", "(명)"),
    ("immune",          "면역의, 면제된", "(형)"),
    ("dull",            "무딘, 둔한, 따분한, 흐릿한", "(형)"),
    ("southbound",      "남행의, 남쪽으로 가는", "(형)"),
    ("summary",         "요약, 개요", "(명)"),
    ("profoundly",      "심오하게, 깊이", "(부)"),
    ("incumbent",       "현직의", "(형)"),
    ("sprout",          "새싹, 싹이 트다", "(명)"),
    ("robust",          "튼튼한, 강건한", "(형)"),
    ("nutritional",     "영양의, 영양상의", "(형)"),
    ("nocturnal",       "야행성의", "(형)"),
    ("dynamic",         "동력의, 역학의, 역동적인", "(형)"),
    ("inherent",        "타고난, 내재된", "(형)"),
    ("collapse",        "붕괴하다, 무너지다, 쓰러지다", "(동)"),
    ("knowledgeable",   "아는 것이 많은, 박식한", "(형)"),
    ("fertilized",      "수정된, 비옥해진", "(형)"),
    ("encounter",       "마주치다, 직면하다, 조우", "(동)"),
    ("exclusive",       "독점적인, 배타적인", "(형)"),
    ("tremendous",      "엄청난, 거대한", "(형)"),
    ("optimistic",      "낙관적인, 낙천적인", "(형)"),
    ("elliptical",      "타원형의", "(형)"),
    ("evoke",           "불러일으키다, 환기시키다", "(동)"),
    ("prolific",        "다작의, 다산의, 풍부한", "(형)"),
    ("melt",            "녹다, 녹이다, 용해되다", "(동)"),
    ("voracious",       "게걸스러운, 탐욕스러운", "(형)"),
    ("external",        "외부의", "(형)"),
    ("annual",          "1년의, 해마다의", "(형)"),
    ("parietal",        "정수리의, 두정골의", "(형)"),
    ("detrimentally",   "해롭게", "(부)"),
    ("intuitively",     "직관적으로", "(부)"),
    ("inspect",         "점검하다, 검사하다", "(동)"),
    ("respectable",     "존경할 만한, 훌륭한, 상당한", "(형)"),
    ("exorbitant",      "터무니없이 비싼, 과도한", "(형)"),
    ("opaque",          "불투명한", "(형)"),
    ("foretell",        "예언하다, 예측하다", "(동)"),
    ("averse",          "싫어하는, 반대하는", "(형)"),
    ("prevail",         "만연하다, 우세하다, 이기다", "(동)"),
    ("combustible",     "타기 쉬운, 가연성의", "(형)"),
    ("accordingly",     "그에 따라, 따라서", "(부)"),
    ("postal",          "우편의, 우체국의", "(형)"),
    ("porous",          "구멍이 많은, 다공성의", "(형)"),
    ("sheer",           "순전한, 순수한", "(형)"),
    ("indentation",     "들여쓰기, 움푹 들어간 곳", "(명)"),
    ("frustrate",       "좌절시키다, 화나게 하다, 지치게 하다", "(동)"),
    ("environmental",   "주위의, 환경의", "(형)"),
    ("formerly",        "전에는, 이전에", "(부)"),
    ("mediocre",        "평범한, 보통의", "(형)"),
    ("advisor",         "조언자, 고문, 자문", "(명)"),
    ("historic",        "역사상의, 역사적으로 중요한", "(형)"),
    ("aberrant",        "도리를 벗어난, 일탈적인", "(형)"),
    ("serene",          "고요한, 잔잔한", "(형)"),
    ("pharmacist",      "약사", "(명)"),
    ("pliable",         "유연한, 유순한", "(형)"),
    ("high-tech",       "첨단 기술의, 최신 기술의", "(형)"),
    ("climatic",        "기후상의, 기후의", "(형)"),
    ("insufficient",    "불충분한", "(형)"),
    ("regional",        "지역의, 지방의", "(형)"),
    ("inadequate",      "부적당한, 불충분한", "(형)"),
    ("inconsistency",   "불일치, 모순, 비일관성", "(명)"),
    ("steep",           "가파른, 비탈진", "(형)"),
    ("hazardous",       "위험한, 모험적인", "(형)"),
    ("adroit",          "능숙한, 솜씨 좋은", "(형)"),
    ("aeronautic",      "항공학의, 항공의", "(형)"),
    ("extinct",         "멸종된, 꺼진", "(형)"),
    ("hasty",           "성급한, 서두르는", "(형)"),
    ("momentarily",     "잠시, 순간적으로", "(부)"),
    ("arable",          "경작할 수 있는, 경작에 적합한", "(형)"),
    ("assertiveness",   "단호하게 주장하는 능력, 적극성", "(명)"),
    ("controversial",   "논쟁의, 논란이 많은", "(형)"),
    ("audio-visual",    "시청각의", "(형)"),
    ("aural",           "청각의, 귀의", "(형)"),
    ("impartial",       "공평한, 공정한", "(형)"),
    ("simultaneously",  "동시에", "(부)"),
    ("concave",         "오목한", "(형)"),
    ("uneven",          "고르지 않은, 불균등한", "(형)"),
    ("integrate",       "통합하다, 포함하다, 완전하게 하다", "(동)"),
    ("hexagonal",       "육각형의", "(형)"),
    ("hierarchical",    "위계적인, 계층적인", "(형)"),
    ("inauthentic",     "실물이 아닌, 진짜가 아닌", "(형)"),
    ("worn-out",        "닳아 해진, 낡은", "(형)"),
    ("individualistic", "개인주의적인, 이기주의적인", "(형)"),
    ("aboriginal",      "원주민의, 토착의", "(형)"),
    ("temperate",       "온화한, 절제하는", "(형)"),
    ("pallid",          "창백한", "(형)"),
    ("prefabricate",    "조립식으로 만들다, 미리 제조하다", "(동)"),
    ("re-envision",     "다시 구상하다", "(동)"),
    ("refundable",      "환불 가능한", "(형)"),
    ("sensory-deprived","감각이 상실된, 감각이 박탈된", "(형)"),
    ("solvents",        "용매, 용제", "(명)"),
    ("subtotal",        "소계, 부분합", "(명)"),
    ("overleaf",        "뒷면에, 다음 페이지에", "(부)"),
]

# ── 3) POS_FIX: 품사만 교정(뜻 텍스트 유지) ──
#    (word, new_pos)
POS_FIX = [
    ("admirably",      "(부)"),
    ("independently",  "(부)"),
]

# ───────────────────────── 적용 ─────────────────────────
errors = []
changes = []  # (cat, word, old_pos, old_kor, new_pos, new_kor)

def resolve(word):
    lst = WIDX.get(word)
    if not lst:
        errors.append(f"[MISSING] '{word}' 단어 없음")
        return None
    if len(lst) > 1:
        errors.append(f"[AMBIG] '{word}' 항목 {len(lst)}개 (num={[x['num'] for x in lst]}) — 수동 처리 필요")
        return None
    return lst[0]

def sync_meanings_text(e, old, new):
    """meanings[].meaning 안의 old를 new로 (있는 곳만)"""
    for m in e.get('meanings', []):
        if isinstance(m, dict) and m.get('meaning') and old in m['meaning']:
            m['meaning'] = m['meaning'].replace(old, new)

# 1) TEXT_FIX
for word, old, new in TEXT_FIX:
    e = resolve(word)
    if not e:
        continue
    if old not in (e.get('korean') or ''):
        errors.append(f"[NOMATCH] '{word}' korean에 '{old}' 없음 → 현재: {e.get('korean')!r}")
        continue
    before = e['korean']
    e['korean'] = before.replace(old, new)
    sync_meanings_text(e, old, new)
    changes.append(("띄어쓰기/정리", word, e.get('pos'), before, e.get('pos'), e['korean']))

# 2) REWRITE
for word, new_kor, new_pos in REWRITE:
    e = resolve(word)
    if not e:
        continue
    before_pos, before_kor = e.get('pos'), e.get('korean')
    pos = new_pos if new_pos else e.get('pos')
    e['korean'] = new_kor
    if new_pos:
        e['pos'] = new_pos
    segs = [s.strip() for s in new_kor.split(';') if s.strip()]
    e['meanings'] = [{"pos": pos, "meaning": s} for s in segs]
    cat = "품사+뜻 교정" if new_pos else "뜻 정리/오역 교정"
    changes.append((cat, word, before_pos, before_kor, e.get('pos'), e['korean']))

# 3) POS_FIX
for word, new_pos in POS_FIX:
    e = resolve(word)
    if not e:
        continue
    before_pos = e.get('pos')
    e['pos'] = new_pos
    for m in e.get('meanings', []):
        if isinstance(m, dict):
            m['pos'] = new_pos
    changes.append(("품사만 교정", word, before_pos, e.get('korean'), new_pos, e.get('korean')))

# ───────────────────────── 리포트 ─────────────────────────
from collections import Counter
cats = Counter(c[0] for c in changes)
print(f"총 교정 대상: {len(changes)}개 / 오류: {len(errors)}개\n")
for cat in ["띄어쓰기/정리", "뜻 정리/오역 교정", "품사+뜻 교정", "품사만 교정"]:
    rows = [c for c in changes if c[0] == cat]
    if not rows:
        continue
    print(f"\n========== {cat} ({len(rows)}개) ==========")
    for _, word, op, ok, np, nk in rows:
        posnote = "" if op == np else f"  [품사 {op} → {np}]"
        print(f"  {word:18s} {ok!r}  →  {nk!r}{posnote}")

if errors:
    print("\n########## ⚠️ 오류 (적용 안 됨) ##########")
    for x in errors:
        print("  " + x)

if WRITE:
    if not errors:
        bak = PATH + '.bak2'
        if not os.path.exists(bak):
            shutil.copy(PATH, bak)
            print(f"\n백업 생성: {os.path.basename(bak)}")
        with open(PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ 적용 완료 → {os.path.basename(PATH)} ({len(changes)}개 교정)")
    else:
        print("\n❌ 오류가 있어 저장 보류. 오류 먼저 해결하세요.")
else:
    print("\n(dry-run — 저장 안 함. 적용하려면 --write)")
