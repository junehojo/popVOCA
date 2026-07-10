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
      {shade ? <View style={{ position: 'absolute', left: 0, right: 0, top: 4, bottom: -4, borderRadius: 14, backgroundColor: shade }} /> : null}
      <View style={{ height: 56, borderRadius: 14, backgroundColor: bg, borderWidth: ring ? 1.5 : 0, borderColor: ring || 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 }}>
        <Text style={{ flex: 1, fontSize: 16, fontFamily: ff(700), color, letterSpacing: ls(-0.02, 16) }}>{label}</Text>
        {icon}
      </View>
    </Pressable>
  );
}

/* 잘 모르겠어요 / 몰라요 — 객관식·타일·듣기 공용 escape 버튼 */
function DontknowButton({ onPress, label = '잘 모르겠어요' }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ alignSelf: 'center', marginTop: 14, paddingVertical: 8, paddingHorizontal: 18 }}>
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
      backgroundColor: bg, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 28,
      borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 14,
      transform: [{ translateY: ty }], opacity: op,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: dot, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
          {correct ? <Icon name="check-bold" size={20} color="#fff" /> : <Icon name="x" size={20} color="#fff" strokeWidth={2.5} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontFamily: ff(800), color: fg, letterSpacing: ls(-0.02, 17) }}>{correct ? '정답이에요!' : '아쉬워요'}</Text>
          <Text style={{ fontSize: 13, color: fg, opacity: 0.75, marginTop: 3, lineHeight: 18 }}>
            <Text style={{ fontFamily: ff(700) }}>{word.word}</Text> · {meaningList(word).slice(0, 2).join(', ')}
          </Text>
          {note ? <Text style={{ fontSize: 12, color: fg, opacity: 0.7, marginTop: 4 }}>{note}</Text> : null}
        </View>
      </View>
      {type === 'blank' && word.exampleKor ? (
        <View style={{ paddingHorizontal: 13, paddingVertical: 11, backgroundColor: VP.bg, opacity: 0.92, borderRadius: 12 }}>
          <UnderlinedKor text={word.exampleKor} style={{ fontSize: 13.5, color: fg, lineHeight: 20 }} />
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
  const optLift = useRef(new Animated.Value(0)).current;
  // 동결 보기(fixedOptions)가 있으면 그대로 사용, 없으면(오답노트·SRS 동적 풀) pickOptions로 생성
  const computed = useMemo(() => pickOptions(pool, word), [word && word.id]); // eslint-disable-line
  const options = (fixedOptions && fixedOptions.length === 4) ? fixedOptions : computed;
  useEffect(() => { setSelected(null); setSubmitted(false); setSheetH(0); }, [word && word.id]);
  // 제출하면 보기를 시트 높이만큼 위로 올려, 내가 고른 보기가 피드백 시트에 안 가리게
  useEffect(() => {
    Animated.timing(optLift, { toValue: submitted && sheetH ? -sheetH : 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [submitted, sheetH]);
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

      {/* 문제 */}
      <View style={{ marginTop: 32, paddingHorizontal: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: VP.textMute, fontFamily: ff(600), letterSpacing: ls(0.06, 12), marginBottom: 12 }}>
          {type === 'meaning' ? '이 단어의 뜻은?' : type === 'word' ? '이 뜻을 가진 단어는?' : '빈칸에 들어갈 단어는?'}
        </Text>
        {type === 'meaning' ? (
          <>
            <Text style={{ fontSize: 11, color: VP.textMute, fontStyle: 'italic', marginBottom: 4 }}>{word.pos}</Text>
            <Text style={{ fontSize: 44, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.03, 44), textAlign: 'center' }}>{word.word}</Text>
          </>
        ) : type === 'word' ? (
          <Text style={{ fontSize: 26, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 26), lineHeight: 34, textAlign: 'center' }}>{meaningList(word).join(' · ')}</Text>
        ) : (
          <Text style={{ fontSize: 20, fontFamily: ff(600), color: VP.text, letterSpacing: ls(-0.015, 20), lineHeight: 30, textAlign: 'center' }}>"{blankExample(word)}"</Text>
        )}
      </View>

      {/* 보기 — 제출 시 위로 올라가 선택 보기가 시트에 안 가림 */}
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12, justifyContent: 'flex-end' }}>
        <Animated.View style={{ gap: 10, transform: [{ translateY: optLift }] }}>
          {options.map((opt, i) => (
            <QuizOption key={opt.id} label={optionLabel(opt)} disabled={submitted}
              submitted={submitted} isPicked={selected === i} isAnswer={opt.id === word.id}
              onPress={() => handleSelect(i)} />
          ))}
        </Animated.View>
        {!submitted ? <DontknowButton onPress={handleDontknow} label="몰라요" /> : null}
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
  const optLift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    setSelected(null); setSubmitted(false); setSheetH(0);
    const t = setTimeout(() => speak(word.word), 350);   // 마운트 시 한 번 자동 재생
    return () => clearTimeout(t);
  }, [word && word.id]);
  useEffect(() => {
    Animated.timing(optLift, { toValue: submitted && sheetH ? -sheetH : 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [submitted, sheetH]);
  if (!word) return null;
  const isCorrect = submitted && selected != null && options[selected].id === word.id;
  const pick = (i) => { if (submitted) return; setSelected(i); setSubmitted(true); onResult(options[i].id === word.id ? 'correct' : 'wrong'); };
  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <ProtoTopBar onBack={onBack} icon={<Icon name="speaker" size={16} color={VP.text} />} label="듣고 맞히기" progress={progress} progressColor={VP.accent} />
      <View style={{ marginTop: 30, paddingHorizontal: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: VP.textMute, fontFamily: ff(600), letterSpacing: ls(0.06, 12), marginBottom: 20 }}>들리는 단어의 뜻은?</Text>
        <Pressable onPress={() => speak(word.word)} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="speaker" size={42} color={VP.accent} />
        </Pressable>
        <Text style={{ fontSize: 12, color: VP.textMute, marginTop: 12 }}>다시 들으려면 탭하세요</Text>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, justifyContent: 'flex-end' }}>
        <Animated.View style={{ gap: 10, transform: [{ translateY: optLift }] }}>
          {options.map((opt, i) => (
            <QuizOption key={opt.id} label={meaningList(opt)[0] || opt.korean} disabled={submitted}
              submitted={submitted} isPicked={selected === i} isAnswer={opt.id === word.id} onPress={() => pick(i)} />
          ))}
        </Animated.View>
        {!submitted ? <DontknowButton onPress={() => { setSelected(null); setSubmitted(true); onResult('dontknow'); }} label="몰라요" /> : null}
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
        <Text style={{ fontSize: 12, color: VP.textMute, fontFamily: ff(600), letterSpacing: ls(0.06, 12), marginBottom: 6 }}>이 뜻의 단어를 만드세요</Text>
        <Text style={{ fontSize: 11, color: VP.textMute, fontStyle: 'italic' }}>{word.pos}</Text>
        <Text style={{ fontSize: 23, fontFamily: ff(700), color: VP.text, textAlign: 'center', lineHeight: 31, marginTop: 2 }}>{meaningList(word).join(' · ')}</Text>
      </View>
      {/* 정답 슬롯 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 26, paddingHorizontal: 20 }}>
        {Array.from({ length: target.length }).map((_, i) => {
          const key = placed[i];
          const filled = key !== undefined;
          return (
            <Pressable key={i} onPress={() => filled && !submitted && setPlaced(placed.filter((_, j) => j !== i))} disabled={submitted || !filled}
              style={{ width: 38, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                backgroundColor: filled ? VP.accent : VP.surface, borderWidth: filled ? 0 : 1.5, borderColor: VP.border, borderStyle: filled ? 'solid' : 'dashed' }}>
              <Text style={{ fontSize: 20, fontFamily: ff(700), color: filled ? '#fff' : VP.textMute }}>{filled ? charOf(key) : ''}</Text>
            </Pressable>
          );
        })}
      </View>
      {/* 타일 뱅크 */}
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 9, paddingHorizontal: 20 }}>
          {available.map(t => (
            <Pressable key={t.key} onPress={() => place(t.key)} disabled={submitted}
              style={{ minWidth: 42, height: 50, paddingHorizontal: 6, borderRadius: 12, backgroundColor: VP.bg, borderWidth: 1.5, borderColor: VP.pushRing, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, fontFamily: ff(700), color: VP.text }}>{t.ch}</Text>
            </Pressable>
          ))}
        </View>
        {!submitted ? <DontknowButton onPress={() => { setFbCorrect(false); setSubmitted(true); onResult('dontknow'); }} /> : null}
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
      <View style={{ paddingHorizontal: 24, paddingTop: 28, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: VP.textMute, fontFamily: ff(600), letterSpacing: ls(0.06, 12), marginBottom: 6 }}>이 뜻의 단어를 입력하세요</Text>
        <Text style={{ fontSize: 11, color: VP.textMute, fontStyle: 'italic' }}>{word.pos}</Text>
        <Text style={{ fontSize: 23, fontFamily: ff(700), color: VP.text, textAlign: 'center', lineHeight: 31, marginTop: 2 }}>{meaningList(word).join(' · ')}</Text>
        {hintUsed ? (
          <Text style={{ fontSize: 14, color: VP.accent, fontFamily: ff(700), marginTop: 16 }}>
            첫 글자 <Text style={{ fontSize: 18 }}>{target[0].toUpperCase()}</Text>   ·   {target.length}글자
          </Text>
        ) : null}
        <TextInput
          value={val} onChangeText={setVal} autoCapitalize="none" autoCorrect={false} autoFocus
          editable={!submitted} onSubmitEditing={submit} returnKeyType="done" placeholder="단어 입력"
          placeholderTextColor={VP.textMute}
          style={{ marginTop: 18, width: '100%', textAlign: 'center', fontSize: 28, fontFamily: ff(700), color: VP.text, borderBottomWidth: 2, borderBottomColor: VP.accent, paddingVertical: 8 }} />
        {!submitted ? (
          <View style={{ width: '100%', marginTop: 22, gap: 10 }}>
            <VPButton variant="accent" label="확인" onPress={submit} />
            <Pressable onPress={hintBtn} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 18 }}>
              <Text style={{ fontSize: 14, color: hintUsed ? VP.bad : VP.textMute, fontFamily: ff(600), textDecorationLine: 'underline' }}>
                {hintUsed ? '잘 모르겠어요' : '힌트 · 첫 글자 보기'}
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
