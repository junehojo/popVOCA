/* VocaPoP 퀴즈 — design-reference/vp-proto-screens-2.jsx (QuizScreen, FeedbackSheet) 이식.
   3유형(뜻/단어/빈칸) + 3D 푸시 보기 + 하단 피드백 시트.
   QuizView(순수)를 분리해 걸음 퀴즈(QuizScreen)와 오답 복습(NoteReview)이 공유한다. */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, Animated, Easing, TextInput, Keyboard } from 'react-native';
import { VP, ff, ls } from './theme';
import { Icon } from './Icon';
import { ProtoTopBar, VPButton, SpeakButton, speak, useReducedMotion } from './ui';
import { wordsForStage, meaningList, exampleOf, exampleKorOf, pickOptions, BY_ID, quizMetaFor, stageIdxOf, quizSlotForBox } from './data';

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

/* 단어의 굴절형까지 잡는 정규식 — blankExample(빈칸 가리기)과 BoldWordEn(예문 강조)이 공유.
   implies/activities/procrastinating 처럼 어간이 바뀌는 형태도 매칭 */
function wordFormsRegex(w) {
  if (!w) return null;
  const forms = [w];
  if (/y$/i.test(w)) forms.push(w.slice(0, -1) + 'ies', w.slice(0, -1) + 'ied');
  if (/e$/i.test(w)) forms.push(w.slice(0, -1) + 'ing', w.slice(0, -1) + 'ed');
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const alt = forms.sort((a, b) => b.length - a.length).map(esc).join('|'); // 긴 형태 우선
  try { return new RegExp('\\b(?:' + alt + ')\\w*\\b', 'gi'); } catch (e) { return null; }
}

function blankExample(word) {
  const ex = exampleOf(word);
  if (!ex || !word.word) return ex;
  const w = word.word;
  const re = wordFormsRegex(w);
  if (re) {
    const out = ex.replace(re, '_____');   // 전체 치환(정답 노출 방지)
    if (out !== ex) return out;
  }
  return ex.includes(w) ? ex.split(w).join('_____') : ex;
}

/* ★예문 속 정답 단어(굴절형 포함)를 700으로 강조 — 피드백 시트 예문 블록용 */
function BoldWordEn({ text, word, style }) {
  const re = wordFormsRegex(word);
  if (!re) return <Text style={style}>{text}</Text>;
  let parts;
  try { parts = String(text || '').split(new RegExp('(' + re.source + ')', 'gi')); }
  catch (e) { return <Text style={style}>{text}</Text>; }
  return (
    <Text style={style}>
      {parts.map((p, i) => (i % 2 === 1 ? <Text key={i} style={{ fontFamily: ff(700) }}>{p}</Text> : p))}
    </Text>
  );
}

/* 3D 푸시 보기 버튼 */
function QuizOption({ label, onPress, disabled, submitted, isPicked, isAnswer }) {
  let bg = VP.bg, color = VP.text, ring = VP.pushRing, shade = VP.pushShade, icon = null;
  if (submitted) {
    if (isAnswer) { bg = VP.ok; color = '#fff'; ring = null; shade = VP.okDeep; icon = <Icon name="check-bold" size={18} color="#fff" />; }
    else if (isPicked) { bg = VP.bad; color = '#fff'; ring = null; shade = VP.badDeep; icon = <Icon name="x" size={18} color="#fff" strokeWidth={2.5} />; }
    else { bg = VP.bg; color = VP.textFaint; }   // ★textMute→textFaint: 제출 후 비활성 보기 = 의도적 저강조(장식/비활성 전용 토큰)
  } else if (isPicked) {
    ring = VP.borderStrong; shade = VP.borderStrong;
  }
  return (
    /* ★height 56 고정→minHeight 56 + 라벨 2줄 허용: 긴 뜻 보기가 잘리던 문제(말줄임 오답 유도) */
    <Pressable disabled={disabled} onPress={onPress} style={{ minHeight: 56 }}>
      {/* ★radius 14→16(rLg 토큰 스냅)·라벨 16→17: VPButton lg와 동일 규격으로 — 같은 화면에서 버튼 곡률·글자 크기가 달랐음 */}
      {shade ? <View style={{ position: 'absolute', left: 0, right: 0, top: 4, bottom: -4, borderRadius: 16, backgroundColor: shade }} /> : null}
      <View style={{ minHeight: 56, borderRadius: 16, backgroundColor: bg, borderWidth: ring ? 1.5 : 0, borderColor: ring || 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 8 }}>
        <Text numberOfLines={2} style={{ flex: 1, fontSize: 17, fontFamily: ff(700), color, letterSpacing: ls(-0.02, 17), lineHeight: 22 }}>{label}</Text>
        {icon}
      </View>
    </Pressable>
  );
}

/* 몰라요 escape — 4유형 공용. ★'몰라요'→'모르겠어요, 정답 보기': 결과(정답 공개)를 라벨에 명시.
   밑줄 제거·textMute→textSub(탭 가능한 텍스트는 4.5:1), 높이 44 터치 타깃 */
function DontknowButton({ onPress, label = '모르겠어요, 정답 보기' }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}
      style={{ alignSelf: 'center', marginTop: 12, height: 44, justifyContent: 'center', paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 14, color: VP.textSub, fontFamily: ff(600) }}>{label}</Text>
    </Pressable>
  );
}

/* ★문항 전환 모션 — word.id 변경 시 문제 블록 fade+8px 상승 200ms, 보기 40ms 스태거 페이드인.
   유형 회전 시 화면이 뚝 끊기던 전환에 연속성 부여. reduce-motion이면 즉시 표시 */
function useItemTransition(key, count = 4) {
  const reduced = useReducedMotion();
  const q = useRef(new Animated.Value(1)).current;
  const opts = useRef(Array.from({ length: count }, () => new Animated.Value(1))).current;
  useEffect(() => {
    if (reduced) { q.setValue(1); opts.forEach(a => a.setValue(1)); return; }
    q.setValue(0); opts.forEach(a => a.setValue(0));
    Animated.parallel([
      Animated.timing(q, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.stagger(40, opts.map(a => Animated.timing(a, { toValue: 1, duration: 160, useNativeDriver: true }))),
    ]).start();
  }, [key, reduced]);
  const qStyle = { opacity: q, transform: [{ translateY: q.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] };
  return { qStyle, opts };
}

/* ★스펠 오답 진단 — 내 입력을 글자 단위로 채점: 맞은 글자는 본문색, 틀린 글자는 빨강+취소선.
   아래에 정답 철자 700 — '어디가 틀렸는지'를 재타이핑 없이 눈으로 교정 */
function SpellDiff({ attempt, target }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 18, fontFamily: ff(600), letterSpacing: 1 }}>
        {String(attempt || '').split('').map((c, i) => {
          const ok = !!target[i] && c.toLowerCase() === target[i].toLowerCase();
          return <Text key={i} style={{ color: ok ? VP.text : VP.bad, textDecorationLine: ok ? 'none' : 'line-through' }}>{c}</Text>;
        })}
      </Text>
      <Text style={{ fontSize: 20, fontFamily: ff(700), color: VP.text, letterSpacing: 1 }}>{target}</Text>
    </View>
  );
}

/* 하단 정답/오답 시트 — protoSheetUp(아래에서 슬라이드업).
   ★전 유형 공통 확장: 뜻 + 예문 블록(정답 단어 강조) 항상 표시, 오답 시 ★즐겨찾기 토글(저장 의도 최고점),
   스펠 오답 시 SpellDiff, mc-뜻 오답 시 선택 보기의 출처 단어 1줄. */
function FeedbackSheet({ correct, word, note, onNext, onHeight, fav, onToggleFav, spellAttempt, pickedWord }) {
  const bg = correct ? VP.okSoft : VP.badSoft;
  const fg = correct ? VP.okDeep : VP.badDeep;   // 토큰 — 다크모드에서도 대비 유지
  const dot = correct ? VP.ok : VP.bad;
  const reduced = useReducedMotion();
  const ty = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  const started = useRef(false);
  const onLayout = (e) => {
    if (started.current) return;
    started.current = true;
    const h = e.nativeEvent.layout.height || 240;
    onHeight && onHeight(h);
    if (reduced) { ty.setValue(0); op.setValue(1); return; }   // ★reduce-motion: 즉시 표시
    ty.setValue(h); op.setValue(0.6);
    Animated.parallel([
      Animated.timing(ty, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  };
  const meanings = meaningList(word).slice(0, 2).join(', ');
  return (
    <Animated.View onLayout={onLayout} accessibilityLiveRegion="polite" style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      backgroundColor: bg, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28,
      borderTopLeftRadius: VP.rSheet, borderTopRightRadius: VP.rSheet, gap: 16,
      transform: [{ translateY: ty }], opacity: op,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: dot, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
          {correct ? <Icon name="check-bold" size={20} color="#fff" /> : <Icon name="x" size={20} color="#fff" strokeWidth={2.5} />}
        </View>
        {/* ★판정+단어+뜻 통합 라벨 — 스크린리더가 시트 등장을 한 문장으로 읽게 */}
        <View style={{ flex: 1 }} accessible accessibilityLabel={`${correct ? '정답' : '오답'}, ${word.word}, ${meanings}`}>
          <Text style={{ fontSize: 17, fontFamily: ff(700), color: fg, letterSpacing: ls(-0.02, 17) }}>{correct ? '정답이에요!' : '아쉬워요'}</Text>
          <Text style={{ fontSize: 13, color: fg, opacity: 0.75, marginTop: 3, lineHeight: 18 }}>
            <Text style={{ fontFamily: ff(700) }}>{word.word}</Text> · {meanings}
          </Text>
          {note ? <Text style={{ fontSize: 12, color: fg, opacity: 0.7, marginTop: 4 }}>{note}</Text> : null}
          {/* mc-뜻 오답: 보기(단어 객체)에서 출처 역추적 가능 — '왜 틀렸는지'를 한 줄로 */}
          {pickedWord ? <Text style={{ fontSize: 12, color: fg, opacity: 0.7, marginTop: 4 }}>선택한 뜻은 «{pickedWord.word}»의 뜻이에요</Text> : null}
        </View>
        {/* ★오답 순간이 저장 의도 최고점 — 헤더에서 바로 즐겨찾기 */}
        {!correct && onToggleFav ? (
          <Pressable onPress={onToggleFav} hitSlop={6}
            accessibilityRole="button" accessibilityState={{ selected: !!fav }}
            accessibilityLabel={fav ? '즐겨찾기에서 빼기' : '즐겨찾기에 추가'}
            style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
            <Icon name={fav ? 'star' : 'star-line'} size={22} color={fav ? VP.warning : fg} />
          </Pressable>
        ) : null}
      </View>
      {spellAttempt ? <SpellDiff attempt={spellAttempt} target={word.word} /> : null}
      {exampleOf(word) ? (
        /* ★유형 분기 제거 — 오답/정답 직후가 문맥 학습의 적기라 예문을 항상 보여준다 */
        <View style={{ backgroundColor: VP.surface2, borderRadius: VP.rMd, padding: 12, gap: 4 }}>
          <BoldWordEn text={exampleOf(word)} word={word.word} style={{ fontSize: 13, lineHeight: 20, color: VP.text }} />
          {exampleKorOf(word) ? <UnderlinedKor text={exampleKorOf(word)} style={{ fontSize: 12, color: VP.textSub, lineHeight: 18 }} /> : null}
        </View>
      ) : null}
      {/* ★오답 '다음' bad(빨강)→accent — 대형 빨강 버튼은 파괴적 액션 관습이라 '누르면 안 될 것' 같았음 */}
      <VPButton variant={correct ? 'ok' : 'accent'} label="다음" iconRight="arrow-right" onPress={onNext} />
    </Animated.View>
  );
}

/* ★2R 진행 표시 — 연속 바 대신 '틀린 문항 수'만큼의 dot 세그먼트(해결=accent 채움, 남은=테두리).
   오답이 재삽입돼도 채운 칸은 되돌리지 않는다 — 전진만 보여 재도전 동기 유지, 남은 수는 우측 숫자가 맡음 */
function RetrySegments({ total, remaining }) {
  const solved = Math.max(0, (total || 0) - (remaining || 0));
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: Math.max(1, total || 0) }).map((_, i) => (
        <View key={i} style={{
          flex: 1, height: 6, borderRadius: VP.rPill,
          backgroundColor: i < solved ? VP.accent : 'transparent',
          borderWidth: i < solved ? 0 : 1, borderColor: VP.border,
        }} />
      ))}
    </View>
  );
}

/* 순수 퀴즈 화면 — props로 단어/유형/콜백을 받는다. right = 상단 우측 라벨(재도전 라운드 표시용)
   segments = {total, remaining} 있으면 진행바 대신 2R dot 세그먼트. fav/onToggleFav = 피드백 시트 즐겨찾기 */
export function QuizView({ type, word, pool, options: fixedOptions, progress, right, onBack, onResult, onNext, overlayTop, segments, fav, onToggleFav }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [sheetH, setSheetH] = useState(0);   // 피드백 시트 높이(보기 끌어올림용)
  const [wrapH, setWrapH] = useState(0);     // ★보기 래퍼 높이 — 센터 배치 여백(slack) 계산용
  const [optBox, setOptBox] = useState(null); // ★보기 그룹 {y,h} (transform 무관한 레이아웃 좌표)
  const optLift = useRef(new Animated.Value(0)).current;
  const { qStyle, opts: optAnims } = useItemTransition(word && word.id);
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
  // mc-뜻 오답일 때만 출처 역추적(보기=단어 객체라 가능). 몰라요(selected=null)는 해당 없음
  const pickedWord = submitted && !isCorrect && selected != null && type === 'meaning' ? options[selected] : null;

  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <ProtoTopBar onBack={onBack} icon={<Icon name={typeIcon} size={16} color={VP.text} />} label={typeLabel} right={right}
        progress={segments ? undefined : progress} progressColor={VP.accent} />
      {segments ? <RetrySegments total={segments.total} remaining={segments.remaining} /> : null}

      {/* 문제 — ★marginTop 32→28: 4개 퀴즈 유형의 상단 간격 통일(유형 회전 시 문제가 위아래로 튀던 문제) */}
      <Animated.View style={[{ marginTop: 28, paddingHorizontal: 20, alignItems: 'center' }, qStyle]}>
        {/* ★킥커 양수 자간 제거: 한글은 양수 자간에서 글자가 흩어져 보임. textMute→textSub(안내 문구 대비) */}
        <Text style={{ fontSize: 12, color: VP.textSub, fontFamily: ff(600), marginBottom: 12 }}>
          {type === 'meaning' ? '이 단어의 뜻은?' : type === 'word' ? '이 뜻을 가진 단어는?' : '빈칸에 들어갈 단어는?'}
        </Text>
        {type === 'meaning' ? (
          <>
            <Text style={{ fontSize: 11, color: VP.textSub, fontStyle: 'italic', marginBottom: 4 }}>{word.pos}</Text>
            {/* ★긴 단어 자동 축소 — 44px 고정이라 13자+ 단어가 잘리던 문제 */}
            <Text adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.6}
              style={{ width: '100%', fontSize: 44, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.03, 44), textAlign: 'center' }}>{word.word}</Text>
          </>
        ) : type === 'word' ? (
          /* ★26→22: 뜻 지문 크기를 타일/스펠 유형(22)과 통일 — 한 세션에서 유형 회전 시 지문 크기가 튀었음 */
          <Text style={{ fontSize: 22, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 22), lineHeight: 30, textAlign: 'center' }}>{meaningList(word).join(' · ')}</Text>
        ) : (
          <Text style={{ fontSize: 20, fontFamily: ff(600), color: VP.text, letterSpacing: ls(-0.015, 20), lineHeight: 30, textAlign: 'center' }}>"{blankExample(word)}"</Text>
        )}
      </Animated.View>

      {/* 보기 — ★flex-end→center: 문제/보기 사이 죽은 공간을 위아래로 배분. 제출 시 slack 차감 리프트로 시트 위에 얹힘 */}
      <View onLayout={(e) => setWrapH(e.nativeEvent.layout.height)}
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12, justifyContent: 'center' }}>
        <Animated.View onLayout={(e) => setOptBox({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}
          style={{ gap: 10, transform: [{ translateY: optLift }] }}>
          {options.map((opt, i) => (
            <Animated.View key={opt.id} style={{ opacity: optAnims[i] || 1 }}>
              <QuizOption label={optionLabel(opt)} disabled={submitted}
                submitted={submitted} isPicked={selected === i} isAnswer={opt.id === word.id}
                onPress={() => handleSelect(i)} />
            </Animated.View>
          ))}
        </Animated.View>
        {/* 제출 후에도 자리 유지(opacity) — 조건부 제거 시 센터 재정렬로 보기가 점프함 */}
        <View style={{ opacity: submitted ? 0 : 1 }} pointerEvents={submitted ? 'none' : 'auto'}>
          <DontknowButton onPress={handleDontknow} />
        </View>
      </View>

      {submitted && <FeedbackSheet correct={isCorrect} word={word} onNext={onNext} onHeight={setSheetH}
        fav={fav} onToggleFav={onToggleFav} pickedWord={pickedWord} />}

      {overlayTop}
    </View>
  );
}

/* 듣고 맞히기 — TTS로 단어 듣고 뜻 4개 중 고르기. 정답=박스 무영향, 오답/몰라요=박스1 */
function ListenQuiz({ word, options, progress, onBack, onResult, onNext, fav, onToggleFav }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [sheetH, setSheetH] = useState(0);
  const [wrapH, setWrapH] = useState(0);
  const [optBox, setOptBox] = useState(null);
  const optLift = useRef(new Animated.Value(0)).current;
  const { qStyle, opts: optAnims } = useItemTransition(word && word.id);
  const reduced = useReducedMotion();
  // ★재생 중 시각 피드백 — speak 헬퍼에 종료 콜백이 없어 재생 길이를 근사(천천히는 더 길게)
  const [playing, setPlaying] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const playTmr = useRef(null);
  const play = (rate) => {
    if (!word) return;
    speak(word.word, rate);
    setPlaying(true);
    if (playTmr.current) clearTimeout(playTmr.current);
    playTmr.current = setTimeout(() => setPlaying(false), rate && rate < 0.9 ? 2400 : 1400);
  };
  useEffect(() => {
    setSelected(null); setSubmitted(false); setSheetH(0);
    const t = setTimeout(() => play(), 350);   // 마운트 시 한 번 자동 재생
    return () => { clearTimeout(t); if (playTmr.current) clearTimeout(playTmr.current); };
  }, [word && word.id]);
  // ★scale 펄스(1→1.06, 600ms 왕복) — '지금 소리가 나고 있음'을 시각으로도 (청각 단서뿐이던 화면)
  useEffect(() => {
    let loop;
    if (playing && !reduced) {
      loop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 300, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]));
      loop.start();
    } else pulse.setValue(1);
    return () => { if (loop) loop.stop(); };
  }, [playing, reduced]);
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
      <Animated.View style={[{ marginTop: 28, paddingHorizontal: 20, alignItems: 'center' }, qStyle]}>
        <Text style={{ fontSize: 12, color: VP.textSub, fontFamily: ff(600), marginBottom: 20 }}>들리는 단어의 뜻은?</Text>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          {/* ★길게 누르면 speak(word, 0.6) 천천히 재생 — 빠른 TTS를 못 알아듣던 청취 보조 */}
          <Pressable onPress={() => play()} onLongPress={() => play(0.6)} delayLongPress={350}
            accessibilityRole="button" accessibilityLabel="단어 다시 듣기, 길게 누르면 천천히 재생"
            style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: playing ? 3 : 0, borderColor: VP.accent }}>
            <Icon name="speaker" size={42} color={VP.accent} />
          </Pressable>
        </Animated.View>
        <Text style={{ fontSize: 12, color: VP.textSub, marginTop: 12 }}>탭해서 다시 듣기 · 길게 눌러 천천히</Text>
      </Animated.View>
      <View onLayout={(e) => setWrapH(e.nativeEvent.layout.height)}
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12, justifyContent: 'center' }}>
        <Animated.View onLayout={(e) => setOptBox({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}
          style={{ gap: 10, transform: [{ translateY: optLift }] }}>
          {options.map((opt, i) => (
            <Animated.View key={opt.id} style={{ opacity: optAnims[i] || 1 }}>
              <QuizOption label={meaningList(opt)[0] || opt.korean} disabled={submitted}
                submitted={submitted} isPicked={selected === i} isAnswer={opt.id === word.id} onPress={() => pick(i)} />
            </Animated.View>
          ))}
        </Animated.View>
        <View style={{ opacity: submitted ? 0 : 1 }} pointerEvents={submitted ? 'none' : 'auto'}>
          <DontknowButton onPress={() => { setSelected(null); setSubmitted(true); onResult('dontknow'); }} />
        </View>
      </View>
      {submitted && <FeedbackSheet correct={isCorrect} word={word} onNext={onNext} onHeight={setSheetH} fav={fav} onToggleFav={onToggleFav} />}
    </View>
  );
}

/* 글자 타일 조립 — 섞인 알파벳을 탭해 단어 완성. 정답=직행, 오답/몰라요=박스1 */
function TileQuiz({ word, progress, onBack, onResult, onNext, fav, onToggleFav }) {
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
  const { qStyle } = useItemTransition(word && word.id);
  useEffect(() => { setPlaced([]); setSubmitted(false); setSheetH(0); }, [word && word.id]);
  if (!word) return null;
  const charOf = (key) => { const t = tiles.find(x => x.key === key); return t ? t.ch : ''; };
  // ★마지막 글자 배치 시 자동 채점 폐기 — 실수 배치를 고칠 새 없이 채점되던 문제. 명시적 '확인'으로만 제출
  const place = (key) => {
    if (submitted || placed.length >= target.length) return;
    setPlaced([...placed, key]);
  };
  const confirm = () => {
    if (submitted || placed.length !== target.length) return;
    const ok = placed.map(charOf).join('').toLowerCase() === target.toLowerCase();
    setFbCorrect(ok); setSubmitted(true); onResult(ok ? 'correct' : 'wrong');
  };
  const available = tiles.filter(t => !placed.includes(t.key));
  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <ProtoTopBar onBack={onBack} icon={<Icon name="letters" size={16} color={VP.text} />} label="글자 맞추기" progress={progress} progressColor={VP.accent} />
      <Animated.View style={[{ marginTop: 28, paddingHorizontal: 20, alignItems: 'center' }, qStyle]}>
        {/* ★'놓은 글자는 탭해서 빼요' 병기 — 슬롯 탭 제거가 숨은 기능이었음(어포던스 부재) */}
        <Text style={{ fontSize: 12, color: VP.textSub, fontFamily: ff(600), marginBottom: 6 }}>이 뜻의 단어를 만드세요 · 놓은 글자는 탭해서 빼요</Text>
        <Text style={{ fontSize: 11, color: VP.textSub, fontStyle: 'italic' }}>{word.pos}</Text>
        {/* ★23→22 + 자간: 지문 크기를 다른 유형과 통일 */}
        <Text style={{ fontSize: 22, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 22), textAlign: 'center', lineHeight: 30, marginTop: 2 }}>{meaningList(word).join(' · ')}</Text>
      </Animated.View>
      {/* ★슬롯+타일을 한 그룹으로 중앙 배치 — 기존엔 슬롯은 상단·타일은 바닥으로 찢어져(~950px 간격)
          조작할 때마다 시선·손가락이 화면 전체를 왕복했음. 몰라요만 하단 고정 유지 */}
      <View style={{ flex: 1, justifyContent: 'center', gap: 36 }}>
        {/* 정답 슬롯 — ★38×48→44×52: 탭해서 빼는 인터랙티브 요소라 44px 터치 타깃 확보 */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 20 }}>
          {Array.from({ length: target.length }).map((_, i) => {
            const key = placed[i];
            const filled = key !== undefined;
            return (
              <Pressable key={i} onPress={() => filled && !submitted && setPlaced(placed.filter((_, j) => j !== i))} disabled={submitted || !filled}
                accessibilityRole="button"
                accessibilityLabel={filled ? `${i + 1}번째 글자 ${charOf(key)}, 탭해서 빼기` : `${i + 1}번째 칸 비어 있음`}
                style={{ width: 44, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: filled ? VP.accent : VP.surface, borderWidth: filled ? 0 : 1.5, borderColor: VP.border, borderStyle: filled ? 'solid' : 'dashed' }}>
                <Text style={{ fontSize: 20, fontFamily: ff(700), color: filled ? '#fff' : VP.textFaint }}>{filled ? charOf(key) : ''}</Text>
              </Pressable>
            );
          })}
        </View>
        {/* 타일 뱅크 — ★42×50→44×52: 슬롯과 규격 통일 + 터치 타깃 */}
        <View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 20 }}>
            {available.map(t => (
              <Pressable key={t.key} onPress={() => place(t.key)} disabled={submitted}
                accessibilityRole="button" accessibilityLabel={`글자 ${t.ch}`}
                style={{ minWidth: 44, height: 52, paddingHorizontal: 6, borderRadius: 12, backgroundColor: VP.bg, borderWidth: 1.5, borderColor: VP.pushRing, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22, fontFamily: ff(700), color: VP.text }}>{t.ch}</Text>
              </Pressable>
            ))}
          </View>
          {/* ★'다시 놓기' — 한 글자씩 빼는 것 말고 전체 리셋 경로. 놓은 게 없으면 faint(비활성) */}
          <Pressable onPress={() => setPlaced([])} disabled={submitted || placed.length === 0} hitSlop={8}
            accessibilityRole="button" accessibilityLabel="다시 놓기"
            accessibilityState={{ disabled: submitted || placed.length === 0 }}
            style={{ alignSelf: 'center', marginTop: 4, height: 44, justifyContent: 'center', paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 13, color: placed.length ? VP.textSub : VP.textFaint, fontFamily: ff(600) }}>다시 놓기</Text>
          </Pressable>
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, opacity: submitted ? 0 : 1 }} pointerEvents={submitted ? 'none' : 'auto'}>
        <VPButton variant="accent" label="확인" disabled={placed.length !== target.length} onPress={confirm} />
      </View>
      <View style={{ paddingBottom: 12, opacity: submitted ? 0 : 1 }} pointerEvents={submitted ? 'none' : 'auto'}>
        <DontknowButton onPress={() => { setFbCorrect(false); setSubmitted(true); onResult('dontknow'); }} />
      </View>
      {submitted && <FeedbackSheet correct={fbCorrect} word={word} onNext={onNext} onHeight={setSheetH} fav={fav} onToggleFav={onToggleFav} />}
    </View>
  );
}

/* 스펠링 타이핑 — 뜻 보고 단어 입력.
   정답=직행, 힌트보고정답=박스1, 오답·몰라요=박스1 */
function SpellQuiz({ word, progress, onBack, onResult, onNext, fav, onToggleFav }) {
  const target = word.word;
  const [val, setVal] = useState('');
  const [hintUsed, setHintUsed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sheetH, setSheetH] = useState(0);
  const [fb, setFb] = useState({ correct: false, note: null, attempt: null });
  const { qStyle } = useItemTransition(word && word.id);
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
    setFb({ correct: ok, note, attempt: ok ? null : val.trim() });   // 오답이면 입력을 SpellDiff로 진단
    setSubmitted(true); onResult(outcome);
  };
  // ★힌트→몰라요 '같은 자리 모핑' 폐기 — 버튼 기능이 탭 후 바뀌는 베이트 앤 스위치였음.
  //   처음부터 두 액션을 분리 배치하고, 힌트 비용('복습에 또 나와요')은 라벨에 선고지. 빨강 처리도 제거(색 의미 일관)
  const showHint = () => { if (submitted || hintUsed) return; setHintUsed(true); };
  const giveUp = () => {
    if (submitted) return;
    Keyboard.dismiss();
    setFb({ correct: false, note: null, attempt: null });
    setSubmitted(true); onResult('dontknow');
  };
  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <ProtoTopBar onBack={onBack} icon={<Icon name="pencil" size={16} color={VP.text} />} label="스펠링 입력" progress={progress} progressColor={VP.accent} />
      {/* ★pH 24→20: 6개 퀴즈 유형 중 이 화면만 24라 유형 회전 시 좌우가 4px씩 움직여 보였음.
          상단 고정 배치는 유지 — 키보드가 하단을 차지하므로 센터 배치가 오히려 어색함 (의도적 예외) */}
      <Animated.View style={[{ paddingHorizontal: 20, paddingTop: 28, alignItems: 'center' }, qStyle]}>
        <Text style={{ fontSize: 12, color: VP.textSub, fontFamily: ff(600), marginBottom: 6 }}>이 뜻의 단어를 입력하세요</Text>
        <Text style={{ fontSize: 11, color: VP.textSub, fontStyle: 'italic' }}>{word.pos}</Text>
        <Text style={{ fontSize: 22, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 22), textAlign: 'center', lineHeight: 30, marginTop: 2 }}>{meaningList(word).join(' · ')}</Text>
        {hintUsed ? (
          <Text style={{ fontSize: 14, color: VP.accent, fontFamily: ff(700), marginTop: 16 }}>
            첫 글자 <Text style={{ fontSize: 18 }}>{target[0].toUpperCase()}</Text>   ·   {target.length}글자
          </Text>
        ) : null}
        <TextInput
          value={val} onChangeText={setVal} autoCapitalize="none" autoCorrect={false} autoFocus
          editable={!submitted} onSubmitEditing={submit} returnKeyType="done" placeholder="단어 입력"
          placeholderTextColor={VP.textFaint} selectionColor={VP.accent}
          /* ★웹 기본 파란 focus outline 제거 — 핑크 테마 안에서 브랜드와 무관한 파랑이 튀었음 (RN-web 전용 속성, 네이티브 무해) */
          style={{ marginTop: 18, width: '100%', textAlign: 'center', fontSize: 28, fontFamily: ff(700), color: VP.text, borderBottomWidth: 2, borderBottomColor: VP.accent, paddingVertical: 8, outlineStyle: 'none' }} />
        {!submitted ? (
          <View style={{ width: '100%', marginTop: 22, gap: 10 }}>
            <VPButton variant="accent" label="확인" onPress={submit} disabled={!val.trim()} />
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
              <Pressable onPress={showHint} disabled={hintUsed} hitSlop={8}
                accessibilityRole="button" accessibilityState={{ disabled: hintUsed }}
                accessibilityLabel="첫 글자 보기, 힌트를 보면 복습에 또 나와요"
                style={{ height: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 14, color: hintUsed ? VP.textFaint : VP.textSub, fontFamily: ff(600) }}>첫 글자 보기 · 복습에 또 나와요</Text>
              </Pressable>
              <Pressable onPress={giveUp} hitSlop={8} accessibilityRole="button" accessibilityLabel="모르겠어요, 정답 보기"
                style={{ height: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 14, color: VP.textSub, fontFamily: ff(600) }}>모르겠어요, 정답 보기</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Animated.View>
      {submitted && <FeedbackSheet correct={fb.correct} word={word} note={fb.note} onNext={onNext} onHeight={setSheetH}
        fav={fav} onToggleFav={onToggleFav} spellAttempt={fb.attempt} />}
    </View>
  );
}

/* ★재도전 인터스티셜 — 1R 끝에 무예고로 2R 문항이 이어져 "버그난 줄 알았다"던 단절의 수정.
   '무엇을(틀린 N개) 왜(다 맞히면 완료) 다시 푸는지'를 전환 카드로 먼저 고지. X는 기존 PAUSE 그대로 */
function RetryIntro({ n, onBegin, onBack }) {
  return (
    <View style={{ flex: 1, backgroundColor: VP.bg }}>
      <ProtoTopBar onBack={onBack} icon={<Icon name="flame" size={16} color={VP.text} />} label="오답 재도전" />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <Icon name="flame" size={48} color={VP.accent} />
        </View>
        <Text style={{ fontSize: 22, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 22), textAlign: 'center' }}>잠깐, 틀린 {n}개만 다시 풀어요</Text>
        <Text style={{ fontSize: 14, color: VP.textSub, marginTop: 8, textAlign: 'center' }}>다 맞히면 오늘 퀴즈 완료예요</Text>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <VPButton variant="accent" label="재도전 시작" onPress={onBegin} />
      </View>
    </View>
  );
}

/* 퀴즈 래퍼 — 출제 = 학습 시작한 단어 전체(state.quizQueue).
   ★문항 종류는 quizSlotForBox — 그 단어의 박스 간격(ivl)에 맞춰 재인(mc/듣기)→조립(타일)→회상(스펠) 계단.
   ★ quizRound 2 = 오답 재도전(mastery loop): 1R에서 틀린 문항을 다 맞힐 때까지 재출제.
     재도전은 그 단어의 동결 4지선다로 재확인(타일/스펠 랜덤 재구성으로 인한 난이도 튐 방지). */
export function QuizScreen({ state, dispatch }) {
  const queue = state.quizQueue || [];
  const isRetry = state.quizRound === 2;
  const id = isRetry ? (state.quizRetry || [])[0] : queue[state.quizIdx];
  const word = id != null ? BY_ID[id] : null;
  if (!word) return null;
  const onBack = () => dispatch({ type: 'PAUSE' });
  // ★2R 진입 전 인터스티셜 — 문항 대신 전환 카드 먼저 (QUIZ_RETRY_BEGIN으로 해제)
  if (state.quizRetryIntro) {
    return <RetryIntro n={state.quizRetryInitial} onBegin={() => dispatch({ type: 'QUIZ_RETRY_BEGIN' })} onBack={onBack} />;
  }
  const meta = quizMetaFor(id);                               // {type, options} — 그 단어가 정답인 검수된 문항
  const total = queue.length || 1;
  // 1R = 연속 진행바. 2R = dot 세그먼트(RetrySegments)로 대체 — progress는 안 씀
  const progress = isRetry ? undefined : (Math.min(state.quizIdx + 1, total) / total) * 100;
  const segments = isRetry ? { total: state.quizRetryInitial, remaining: (state.quizRetry || []).length } : null;
  const slot = isRetry ? 'mc' : quizSlotForBox(state.boxes, id, state.quizIdx);
  const retryRight = isRetry ? `다시 · 남은 ${(state.quizRetry || []).length}` : undefined;
  // ★오답 순간 즐겨찾기 — 피드백 시트 헤더 토글이 dispatch (4유형 공통)
  const fav = (state.favorites || []).includes(id);
  const onToggleFav = () => dispatch({ type: 'TOGGLE_FAV', id });
  const onResult = (outcome) => dispatch({ type: 'QUIZ_ANSWER', id: word.id, slot, outcome });
  const onNext = () => dispatch({ type: 'QUIZ_NEXT' });
  if (slot === 'tile') return <TileQuiz word={word} progress={progress} onBack={onBack} onResult={onResult} onNext={onNext} fav={fav} onToggleFav={onToggleFav} />;
  if (slot === 'spell') return <SpellQuiz word={word} progress={progress} onBack={onBack} onResult={onResult} onNext={onNext} fav={fav} onToggleFav={onToggleFav} />;
  if (slot === 'listen') {
    const homeStage = stageIdxOf(id);
    const opts = (meta && meta.options) || pickOptions(wordsForStage(homeStage ? homeStage.stage : state.activeStage), word);
    return <ListenQuiz word={word} options={opts} progress={progress} onBack={onBack} onResult={onResult} onNext={onNext} fav={fav} onToggleFav={onToggleFav} />;
  }
  // 객관식(mc) — 동결 문항 그대로
  let type = (meta && meta.type) || QUIZ_CYCLE[state.quizIdx % QUIZ_CYCLE.length];
  // ★중간 구간(2<ivl<=16) mc는 blank형 우선 — 문맥 속 회상 유도. 예문 없으면 동결 유형 유지.
  //   보기 4개는 단어 객체라 유형이 바뀌어도 검수된 보기 그대로 재사용된다(라벨만 word로 표시).
  if (!isRetry) {
    const ivl = (state.boxes && state.boxes[id] && state.boxes[id].ivl) || 0;
    if (ivl > 2 && ivl <= 16 && exampleOf(word)) type = 'blank';
  }
  const options = meta && meta.options;
  const homeStage = stageIdxOf(id);
  const pool = options || wordsForStage(homeStage ? homeStage.stage : state.activeStage);
  return (
    <QuizView
      type={type} word={word} pool={pool} options={options} progress={progress} segments={segments} right={retryRight}
      onBack={onBack} onResult={onResult} onNext={onNext} fav={fav} onToggleFav={onToggleFav}
    />
  );
}
