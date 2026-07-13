/* VocaPoP 퀴즈 — design-reference/vp-proto-screens-2.jsx (QuizScreen, FeedbackSheet) 이식.
   3유형(뜻/단어/빈칸) + 3D 푸시 보기 + 하단 피드백 시트.
   QuizView(순수)를 분리해 걸음 퀴즈(QuizScreen)와 오답 복습(NoteReview)이 공유한다. */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, Animated, Easing, TextInput, Keyboard } from 'react-native';
import { VP, ff, ls } from './theme';
import { Icon } from './Icon';
import { ProtoTopBar, VPButton, SpeakButton, speak } from './ui';
import { wordsForStage, meaningList, exampleOf, pickOptions, BY_ID, quizMetaFor, stageIdxOf, quizSlotFor } from './data';

export const QUIZ_CYCLE = ['meaning', 'word', 'blank'];

/* 예문 해석에서 «...»로 표시된 정답 부분을 밑줄로 렌더 (여러 곳이면 다 밑줄) — WordDetail에서도 사용 */
export function UnderlinedKor({ text, style }) {
  const parts = String(text || '').split(/(«[^»]*»)/);
  return (
    <Text style={style}>
      {parts.map((p, i) => (
        p.length > 1 && p[0] === '«' && p[p.length - 1] === '»'
          ? <Text key={i} style={{ textDecorationLine: 'underline', fontFamily: ff(700) }}>{p.slice(1, -1)}</Text>
          : p
      ))}
    </Text>
  );
}

function blankExample(word) {
  const ex = exampleOf(word);
  if (!ex || !word.word) return ex;
  const w = word.word;
  // 굴절형까지 포함: implies/activities/procrastinating 처럼 어간이 바뀌는 형태도 가린다
  const forms = [w];
  if (/y$/i.test(w)) forms.push(w.slice(0, -1) + 'ies', w.slice(0, -1) + 'ied');
  if (/e$/i.test(w)) forms.push(w.slice(0, -1) + 'ing', w.slice(0, -1) + 'ed');
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const alt = forms.sort((a, b) => b.length - a.length).map(esc).join('|'); // 긴 형태 우선
  try {
    const out = ex.replace(new RegExp('\\b(?:' + alt + ')\\w*\\b', 'gi'), '_____'); // 전체 치환(정답 노출 방지)
    if (out !== ex) return out;
  } catch (e) {}
  return ex.includes(w) ? ex.split(w).join('_____') : ex;
}

/* 3D 푸시 보기 버튼 */
function QuizOption({ label, onPress, disabled, submitted, isPicked, isAnswer }) {
  let bg = VP.bg, color = VP.text, ring = VP.pushRing, shade = VP.pushShade, icon = null;
  if (submitted) {
    if (isAnswer) { bg = VP.ok; color = '#fff'; ring = null; shade = VP.okDeep; icon = <Icon name="check-bold" size={18} color="#fff" />; }
    else if (isPicked) { bg = VP.bad; color = '#fff'; ring = null; shade = VP.badDeep; icon = <Icon name="x" size={18} color="#fff" strokeWidth={2.5} />; }
    else { bg = VP.bg; color = VP.textMute; }
  } else if (isPicked) {
    ring = VP.borderStrong; shade = VP.borderStrong;
  }
  return (
    <Pressable disabled={disabled} onPress={onPress} style={{ height: 56 }}>
      {/* ★radius 14→16(rLg 토큰 스냅)·라벨 16→17: VPButton lg와 동일 규격으로 — 같은 화면에서 버튼 곡률·글자 크기가 달랐음 */}
      {shade ? <View style={{ position: 'absolute', left: 0, right: 0, top: 4, bottom: -4, borderRadius: 16, backgroundColor: shade }} /> : null}
      <View style={{ height: 56, borderRadius: 16, backgroundColor: bg, borderWidth: ring ? 1.5 : 0, borderColor: ring || 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 }}>
        <Text style={{ flex: 1, fontSize: 17, fontFamily: ff(700), color, letterSpacing: ls(-0.02, 17) }}>{label}</Text>
        {icon}
      </View>
    </Pressable>
  );
}

/* 잘 모르겠어요 / 몰라요 — 객관식·타일·듣기 공용 escape 버튼.
   ★기본 라벨 '몰라요'로 통일: 유형마다 '몰라요'/'잘 모르겠어요'가 섞여 다른 기능처럼 보였음 */
function DontknowButton({ onPress, label = '몰라요' }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ alignSelf: 'center', marginTop: 16, paddingVertical: 8, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 14, color: VP.textMute, fontFamily: ff(600), textDecorationLine: 'underline' }}>{label}</Text>
    </Pressable>
  );
}

/* 하단 정답/오답 시트 — protoSheetUp(아래에서 슬라이드업) */
function FeedbackSheet({ correct, word, type, note, onNext, onHeight }) {
  const bg = correct ? VP.okSoft : VP.badSoft;
  const fg = correct ? VP.okDeep : VP.badDeep;   // 토큰 — 다크모드에서도 대비 유지
  const dot = correct ? VP.ok : VP.bad;
  const ty = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  const started = useRef(false);
  const onLayout = (e) => {
    if (started.current) return;
    started.current = true;
    const h = e.nativeEvent.layout.height || 240;
    onHeight && onHeight(h);
    ty.setValue(h); op.setValue(0.6);
    Animated.parallel([
      Animated.timing(ty, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  };
  return (
    <Animated.View onLayout={onLayout} style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      backgroundColor: bg, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28,
      borderTopLeftRadius: VP.rSheet, borderTopRightRadius: VP.rSheet, gap: 16,
      transform: [{ translateY: ty }], opacity: op,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: dot, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
          {correct ? <Icon name="check-bold" size={20} color="#fff" /> : <Icon name="x" size={20} color="#fff" strokeWidth={2.5} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontFamily: ff(700), color: fg, letterSpacing: ls(-0.02, 17) }}>{correct ? '정답이에요!' : '아쉬워요'}</Text>
          <Text style={{ fontSize: 13, color: fg, opacity: 0.75, marginTop: 3, lineHeight: 18 }}>
            <Text style={{ fontFamily: ff(700) }}>{word.word}</Text> · {meaningList(word).slice(0, 2).join(', ')}
          </Text>
          {note ? <Text style={{ fontSize: 12, color: fg, opacity: 0.7, marginTop: 4 }}>{note}</Text> : null}
        </View>
      </View>
      {type === 'blank' && word.exampleKor ? (
        <View style={{ paddingHorizontal: 12, paddingVertical: 12, backgroundColor: VP.bg, opacity: 0.92, borderRadius: 12 }}>
          <UnderlinedKor text={word.exampleKor} style={{ fontSize: 13, color: fg, lineHeight: 20 }} />
        </View>
      ) : null}
      <VPButton variant={correct ? 'ok' : 'bad'} label="다음" iconRight="arrow-right" onPress={onNext} />
    </Animated.View>
  );
}

/* 순수 퀴즈 화면 — props로 단어/유형/콜백을 받는다 */
export function QuizView({ type, word, pool, options: fixedOptions, progress, onBack, onResult, onNext, overlayTop }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [sheetH, setSheetH] = useState(0);   // 피드백 시트 높이(보기 끌어올림용)
  const [wrapH, setWrapH] = useState(0);     // ★보기 래퍼 높이 — 센터 배치 여백(slack) 계산용
  const [optBox, setOptBox] = useState(null); // ★보기 그룹 {y,h} (transform 무관한 레이아웃 좌표)
  const optLift = useRef(new Animated.Value(0)).current;
  // 동결 보기(fixedOptions)가 있으면 그대로 사용, 없으면(오답노트·SRS 동적 풀) pickOptions로 생성
  const computed = useMemo(() => pickOptions(pool, word), [word && word.id]); // eslint-disable-line
  const options = (fixedOptions && fixedOptions.length === 4) ? fixedOptions : computed;
  useEffect(() => { setSelected(null); setSubmitted(false); setSheetH(0); }, [word && word.id]);
  // ★보기를 flex-end→center로 옮기며(중앙 40%가 죽은 공간이던 문제) 리프트를 '시트에 가리는 만큼만'으로:
  //   기존 -sheetH 고정 리프트는 바닥 앵커 전제 — 센터 배치에선 아래 여백(slack)을 차감해야
  //   보기가 문제 블록을 침범하지 않고 시트 위에 정확히 얹힌다.
  useEffect(() => {
    const slack = (wrapH && optBox) ? Math.max(0, wrapH - (optBox.y + optBox.h)) : 0;
    const to = submitted && sheetH ? -Math.max(0, sheetH - slack + 8) : 0;   // +8: 시트 상단과 최소 간격
    Animated.timing(optLift, { toValue: to, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [submitted, sheetH, wrapH, optBox]);
  if (!word) return null;

  const isCorrect = submitted && selected != null && options[selected].id === word.id;
  const handleSelect = (i) => {
    if (submitted) return;
    setSelected(i); setSubmitted(true);
    onResult(options[i].id === word.id ? 'correct' : 'wrong');
  };
  const handleDontknow = () => {
    if (submitted) return;
    setSelected(null); setSubmitted(true);
    onResult('dontknow');
  };

  const optionLabel = (opt) => (type === 'meaning' ? (meaningList(opt)[0] || opt.korean) : opt.word);
  const typeLabel = type === 'meaning' ? '뜻 고르기' : type === 'word' ? '단어 고르기' : '빈칸 채우기';
  const typeIcon = type === 'meaning' ? 'book-open' : type === 'word' ? 'letters' : 'pencil';

  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <ProtoTopBar onBack={onBack} icon={<Icon name={typeIcon} size={16} color={VP.text} />} label={typeLabel} progress={progress} progressColor={VP.accent} />

      {/* 문제 — ★marginTop 32→28: 4개 퀴즈 유형의 상단 간격 통일(유형 회전 시 문제가 위아래로 튀던 문제) */}
      <View style={{ marginTop: 28, paddingHorizontal: 20, alignItems: 'center' }}>
        {/* ★킥커 양수 자간 제거: 한글은 양수 자간에서 글자가 흩어져 보임 (영문 오버라인 관행 오적용) */}
        <Text style={{ fontSize: 12, color: VP.textMute, fontFamily: ff(600), marginBottom: 12 }}>
          {type === 'meaning' ? '이 단어의 뜻은?' : type === 'word' ? '이 뜻을 가진 단어는?' : '빈칸에 들어갈 단어는?'}
        </Text>
        {type === 'meaning' ? (
          <>
            <Text style={{ fontSize: 11, color: VP.textMute, fontStyle: 'italic', marginBottom: 4 }}>{word.pos}</Text>
            <Text style={{ fontSize: 44, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.03, 44), textAlign: 'center' }}>{word.word}</Text>
          </>
        ) : type === 'word' ? (
          /* ★26→22: 뜻 지문 크기를 타일/스펠 유형(22)과 통일 — 한 세션에서 유형 회전 시 지문 크기가 튀었음 */
          <Text style={{ fontSize: 22, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 22), lineHeight: 30, textAlign: 'center' }}>{meaningList(word).join(' · ')}</Text>
        ) : (
          <Text style={{ fontSize: 20, fontFamily: ff(600), color: VP.text, letterSpacing: ls(-0.015, 20), lineHeight: 30, textAlign: 'center' }}>"{blankExample(word)}"</Text>
        )}
      </View>

      {/* 보기 — ★flex-end→center: 문제/보기 사이 죽은 공간을 위아래로 배분. 제출 시 slack 차감 리프트로 시트 위에 얹힘 */}
      <View onLayout={(e) => setWrapH(e.nativeEvent.layout.height)}
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12, justifyContent: 'center' }}>
        <Animated.View onLayout={(e) => setOptBox({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}
          style={{ gap: 10, transform: [{ translateY: optLift }] }}>
          {options.map((opt, i) => (
            <QuizOption key={opt.id} label={optionLabel(opt)} disabled={submitted}
              submitted={submitted} isPicked={selected === i} isAnswer={opt.id === word.id}
              onPress={() => handleSelect(i)} />
          ))}
        </Animated.View>
        {/* 제출 후에도 자리 유지(opacity) — 조건부 제거 시 센터 재정렬로 보기가 점프함 */}
        <View style={{ opacity: submitted ? 0 : 1 }} pointerEvents={submitted ? 'none' : 'auto'}>
          <DontknowButton onPress={handleDontknow} />
        </View>
      </View>

      {submitted && <FeedbackSheet correct={isCorrect} word={word} type={type} onNext={onNext} onHeight={setSheetH} />}

      {overlayTop}
    </View>
  );
}

/* 듣고 맞히기 — TTS로 단어 듣고 뜻 4개 중 고르기. 정답=박스 무영향, 오답/몰라요=박스1 */
function ListenQuiz({ word, options, progress, onBack, onResult, onNext }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [sheetH, setSheetH] = useState(0);
  const [wrapH, setWrapH] = useState(0);
  const [optBox, setOptBox] = useState(null);
  const optLift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    setSelected(null); setSubmitted(false); setSheetH(0);
    const t = setTimeout(() => speak(word.word), 350);   // 마운트 시 한 번 자동 재생
    return () => clearTimeout(t);
  }, [word && word.id]);
  // ★QuizView와 동일한 센터 배치 + slack 차감 리프트 (설명은 QuizView 참조)
  useEffect(() => {
    const slack = (wrapH && optBox) ? Math.max(0, wrapH - (optBox.y + optBox.h)) : 0;
    const to = submitted && sheetH ? -Math.max(0, sheetH - slack + 8) : 0;
    Animated.timing(optLift, { toValue: to, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [submitted, sheetH, wrapH, optBox]);
  if (!word) return null;
  const isCorrect = submitted && selected != null && options[selected].id === word.id;
  const pick = (i) => { if (submitted) return; setSelected(i); setSubmitted(true); onResult(options[i].id === word.id ? 'correct' : 'wrong'); };
  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <ProtoTopBar onBack={onBack} icon={<Icon name="speaker" size={16} color={VP.text} />} label="듣고 맞히기" progress={progress} progressColor={VP.accent} />
      <View style={{ marginTop: 28, paddingHorizontal: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: VP.textMute, fontFamily: ff(600), marginBottom: 20 }}>들리는 단어의 뜻은?</Text>
        <Pressable onPress={() => speak(word.word)} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="speaker" size={42} color={VP.accent} />
        </Pressable>
        <Text style={{ fontSize: 12, color: VP.textMute, marginTop: 12 }}>다시 들으려면 탭하세요</Text>
      </View>
      <View onLayout={(e) => setWrapH(e.nativeEvent.layout.height)}
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12, justifyContent: 'center' }}>
        <Animated.View onLayout={(e) => setOptBox({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}
          style={{ gap: 10, transform: [{ translateY: optLift }] }}>
          {options.map((opt, i) => (
            <QuizOption key={opt.id} label={meaningList(opt)[0] || opt.korean} disabled={submitted}
              submitted={submitted} isPicked={selected === i} isAnswer={opt.id === word.id} onPress={() => pick(i)} />
          ))}
        </Animated.View>
        <View style={{ opacity: submitted ? 0 : 1 }} pointerEvents={submitted ? 'none' : 'auto'}>
          <DontknowButton onPress={() => { setSelected(null); setSubmitted(true); onResult('dontknow'); }} />
        </View>
      </View>
      {submitted && <FeedbackSheet correct={isCorrect} word={word} type="" onNext={onNext} onHeight={setSheetH} />}
    </View>
  );
}

/* 글자 타일 조립 — 섞인 알파벳을 탭해 단어 완성. 정답=직행, 오답/몰라요=박스1 */
function TileQuiz({ word, progress, onBack, onResult, onNext }) {
  const target = word.word;
  const tiles = useMemo(() => {
    const base = target.split('').map((ch, i) => ({ ch, key: i }));
    let s = base;
    for (let t = 0; t < 8; t++) {
      s = base.slice().sort(() => Math.random() - 0.5);
      if (s.map(x => x.ch).join('') !== target) break;
    }
    return s;
  }, [word && word.id]);
  const [placed, setPlaced] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [sheetH, setSheetH] = useState(0);
  const [fbCorrect, setFbCorrect] = useState(false);
  useEffect(() => { setPlaced([]); setSubmitted(false); setSheetH(0); }, [word && word.id]);
  if (!word) return null;
  const charOf = (key) => { const t = tiles.find(x => x.key === key); return t ? t.ch : ''; };
  const place = (key) => {
    if (submitted) return;
    const next = [...placed, key];
    setPlaced(next);
    if (next.length === target.length) {
      const ok = next.map(charOf).join('').toLowerCase() === target.toLowerCase();
      setFbCorrect(ok); setSubmitted(true); onResult(ok ? 'correct' : 'wrong');
    }
  };
  const available = tiles.filter(t => !placed.includes(t.key));
  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <ProtoTopBar onBack={onBack} icon={<Icon name="letters" size={16} color={VP.text} />} label="글자 맞추기" progress={progress} progressColor={VP.accent} />
      <View style={{ marginTop: 28, paddingHorizontal: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: VP.textMute, fontFamily: ff(600), marginBottom: 6 }}>이 뜻의 단어를 만드세요</Text>
        <Text style={{ fontSize: 11, color: VP.textMute, fontStyle: 'italic' }}>{word.pos}</Text>
        {/* ★23→22 + 자간: 지문 크기를 다른 유형과 통일 */}
        <Text style={{ fontSize: 22, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 22), textAlign: 'center', lineHeight: 30, marginTop: 2 }}>{meaningList(word).join(' · ')}</Text>
      </View>
      {/* ★슬롯+타일을 한 그룹으로 중앙 배치 — 기존엔 슬롯은 상단·타일은 바닥으로 찢어져(~950px 간격)
          조작할 때마다 시선·손가락이 화면 전체를 왕복했음. 몰라요만 하단 고정 유지 */}
      <View style={{ flex: 1, justifyContent: 'center', gap: 36 }}>
        {/* 정답 슬롯 */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 20 }}>
          {Array.from({ length: target.length }).map((_, i) => {
            const key = placed[i];
            const filled = key !== undefined;
            return (
              <Pressable key={i} onPress={() => filled && !submitted && setPlaced(placed.filter((_, j) => j !== i))} disabled={submitted || !filled}
                style={{ width: 38, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: filled ? VP.accent : VP.surface, borderWidth: filled ? 0 : 1.5, borderColor: VP.border, borderStyle: filled ? 'solid' : 'dashed' }}>
                <Text style={{ fontSize: 20, fontFamily: ff(700), color: filled ? '#fff' : VP.textMute }}>{filled ? charOf(key) : ''}</Text>
              </Pressable>
            );
          })}
        </View>
        {/* 타일 뱅크 */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 20 }}>
          {available.map(t => (
            <Pressable key={t.key} onPress={() => place(t.key)} disabled={submitted}
              style={{ minWidth: 42, height: 50, paddingHorizontal: 6, borderRadius: 12, backgroundColor: VP.bg, borderWidth: 1.5, borderColor: VP.pushRing, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, fontFamily: ff(700), color: VP.text }}>{t.ch}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ paddingBottom: 12, opacity: submitted ? 0 : 1 }} pointerEvents={submitted ? 'none' : 'auto'}>
        <DontknowButton onPress={() => { setFbCorrect(false); setSubmitted(true); onResult('dontknow'); }} />
      </View>
      {submitted && <FeedbackSheet correct={fbCorrect} word={word} type="" onNext={onNext} onHeight={setSheetH} />}
    </View>
  );
}

/* 스펠링 타이핑 — 뜻 보고 단어 입력. 힌트(첫 글자) 누르면 그 버튼이 몰라요로 바뀜.
   정답=직행, 힌트보고정답=박스1, 오답·몰라요=박스1 */
function SpellQuiz({ word, progress, onBack, onResult, onNext }) {
  const target = word.word;
  const [val, setVal] = useState('');
  const [hintUsed, setHintUsed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sheetH, setSheetH] = useState(0);
  const [fb, setFb] = useState({ correct: false, note: null });
  useEffect(() => { setVal(''); setHintUsed(false); setSubmitted(false); setSheetH(0); }, [word && word.id]);
  if (!word) return null;
  const submit = () => {
    if (submitted || !val.trim()) return;
    Keyboard.dismiss();
    const ok = val.trim().toLowerCase() === target.toLowerCase();
    let outcome, note = null;
    if (ok && hintUsed) { outcome = 'hintCorrect'; note = '힌트를 봐서 복습에 또 나와요'; }
    else if (ok) outcome = 'correct';
    else outcome = 'wrong';
    setFb({ correct: ok, note }); setSubmitted(true); onResult(outcome);
  };
  const hintBtn = () => {
    if (submitted) return;
    if (!hintUsed) setHintUsed(true);                        // 첫 글자 공개 + 버튼이 몰라요로
    else { Keyboard.dismiss(); setFb({ correct: false, note: null }); setSubmitted(true); onResult('dontknow'); }
  };
  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <ProtoTopBar onBack={onBack} icon={<Icon name="pencil" size={16} color={VP.text} />} label="스펠링 입력" progress={progress} progressColor={VP.accent} />
      {/* ★pH 24→20: 6개 퀴즈 유형 중 이 화면만 24라 유형 회전 시 좌우가 4px씩 움직여 보였음.
          상단 고정 배치는 유지 — 키보드가 하단을 차지하므로 센터 배치가 오히려 어색함 (의도적 예외) */}
      <View style={{ paddingHorizontal: 20, paddingTop: 28, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: VP.textMute, fontFamily: ff(600), marginBottom: 6 }}>이 뜻의 단어를 입력하세요</Text>
        <Text style={{ fontSize: 11, color: VP.textMute, fontStyle: 'italic' }}>{word.pos}</Text>
        <Text style={{ fontSize: 22, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 22), textAlign: 'center', lineHeight: 30, marginTop: 2 }}>{meaningList(word).join(' · ')}</Text>
        {hintUsed ? (
          <Text style={{ fontSize: 14, color: VP.accent, fontFamily: ff(700), marginTop: 16 }}>
            첫 글자 <Text style={{ fontSize: 18 }}>{target[0].toUpperCase()}</Text>   ·   {target.length}글자
          </Text>
        ) : null}
        <TextInput
          value={val} onChangeText={setVal} autoCapitalize="none" autoCorrect={false} autoFocus
          editable={!submitted} onSubmitEditing={submit} returnKeyType="done" placeholder="단어 입력"
          placeholderTextColor={VP.textMute} selectionColor={VP.accent}
          /* ★웹 기본 파란 focus outline 제거 — 핑크 테마 안에서 브랜드와 무관한 파랑이 튀었음 (RN-web 전용 속성, 네이티브 무해) */
          style={{ marginTop: 18, width: '100%', textAlign: 'center', fontSize: 28, fontFamily: ff(700), color: VP.text, borderBottomWidth: 2, borderBottomColor: VP.accent, paddingVertical: 8, outlineStyle: 'none' }} />
        {!submitted ? (
          <View style={{ width: '100%', marginTop: 22, gap: 10 }}>
            <VPButton variant="accent" label="확인" onPress={submit} />
            <Pressable onPress={hintBtn} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 18 }}>
              <Text style={{ fontSize: 14, color: hintUsed ? VP.bad : VP.textMute, fontFamily: ff(600), textDecorationLine: 'underline' }}>
                {hintUsed ? '몰라요' : '힌트 · 첫 글자 보기'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {submitted && <FeedbackSheet correct={fb.correct} word={word} type="" note={fb.note} onNext={onNext} onHeight={setSheetH} />}
    </View>
  );
}

/* 퀴즈 래퍼 — 출제 = 학습 시작한 단어 전체(state.quizQueue). 문항 종류는 quizSlotFor로 회전(객관식/타일/듣기/스펠). */
export function QuizScreen({ state, dispatch }) {
  const queue = state.quizQueue || [];
  const id = queue[state.quizIdx];
  const word = id != null ? BY_ID[id] : null;
  if (!word) return null;
  const meta = quizMetaFor(id);                               // {type, options} — 그 단어가 정답인 검수된 문항
  const total = queue.length || 1;
  const progress = (Math.min(state.quizIdx + 1, total) / total) * 100;
  const slot = quizSlotFor(state.quizIdx, word);
  const onResult = (outcome) => dispatch({ type: 'QUIZ_ANSWER', id: word.id, slot, outcome });
  const onBack = () => dispatch({ type: 'PAUSE' });
  const onNext = () => dispatch({ type: 'QUIZ_NEXT' });
  if (slot === 'tile') return <TileQuiz word={word} progress={progress} onBack={onBack} onResult={onResult} onNext={onNext} />;
  if (slot === 'spell') return <SpellQuiz word={word} progress={progress} onBack={onBack} onResult={onResult} onNext={onNext} />;
  if (slot === 'listen') {
    const homeStage = stageIdxOf(id);
    const opts = (meta && meta.options) || pickOptions(wordsForStage(homeStage ? homeStage.stage : state.activeStage), word);
    return <ListenQuiz word={word} options={opts} progress={progress} onBack={onBack} onResult={onResult} onNext={onNext} />;
  }
  // 객관식(mc) — 동결 문항 그대로
  const type = (meta && meta.type) || QUIZ_CYCLE[state.quizIdx % QUIZ_CYCLE.length];
  const options = meta && meta.options;
  const homeStage = stageIdxOf(id);
  const pool = options || wordsForStage(homeStage ? homeStage.stage : state.activeStage);
  return (
    <QuizView
      type={type} word={word} pool={pool} options={options} progress={progress}
      onBack={onBack} onResult={onResult} onNext={onNext}
    />
  );
}
