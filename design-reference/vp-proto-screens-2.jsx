/* VocaPoP Prototype · 퀴즈 + 결과 */

/* ─────────────────────────────────────────────
   6. 퀴즈 — 3유형 순환
   ───────────────────────────────────────────── */
function ProtoQuiz({ state, dispatch }) {
  const words = wordsForStage(state.activeStage);
  const word = words[state.quizIdx];
  const type = QUIZ_CYCLE[state.quizIdx % QUIZ_CYCLE.length];
  const progress = ((state.quizIdx + 1) / words.length) * 100;
  return (
    <QuizScreen
      key={state.quizIdx}
      type={type}
      word={word}
      pool={words}
      progress={progress}
      onBack={() => dispatch({ type: 'PAUSE' })}
      onSubmit={(isCorrect) => dispatch({ type: 'QUIZ_ANSWER', wordId: word.id, correct: isCorrect })}
      onNext={() => dispatch({ type: 'QUIZ_NEXT' })}
      noteOnWrong={true}
    />
  );
}

function ProtoQuizReview({ state, dispatch }) {
  const [shown, setShown] = useState(false);
  const wordId = state.reviewQueue[state.reviewIdx];
  const word = wordsForStage(state.activeStage).find(w => w.id === wordId);
  const total = state.reviewQueue.length;
  useEffect(() => { setShown(false); }, [state.reviewIdx]);
  if (!word) return null;

  return (
    <ProtoShell
      top={<ProtoTopBar
        onBack={() => dispatch({ type: 'GOTO_RESULT_STAGE' })}
        icon={<Icon name="repeat" size={16} />}
        label="틀린 단어 복습"
        right={`${state.reviewIdx + 1} / ${total}`}
        progress={((state.reviewIdx + 1) / total) * 100}
        progressColor={VP.accent}
      />}
      footer={<ProtoFooter>
        {!shown ? (
          <VPButton variant="primary" onClick={() => setShown(true)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              뜻 확인 <Icon name="rotate" size={16} />
            </span>
          </VPButton>
        ) : (
          <VPButton variant="accent" onClick={() => dispatch({ type: 'REVIEW_NEXT' })}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {state.reviewIdx + 1 === total ? '결과 보기' : '다음'} <Icon name="arrow-right" size={16} />
            </span>
          </VPButton>
        )}
      </ProtoFooter>}
    >
      <div style={{
        flex: 1, margin: '8px 20px 12px',
        background: VP.surface, borderRadius: 24,
        padding: '24px',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{
            padding: '4px 10px', fontSize: 11, fontWeight: 700,
            background: VP.bad, color: '#fff', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}><Icon name="x" size={10} strokeWidth={3} /> 다시 보기</span>
          <span style={{ fontSize: 11, color: VP.textMute, fontWeight: 600 }}>#{String(word.id).padStart(3, '0')}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: VP.textMute, fontStyle: 'italic' }}>{word.pos}</div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.03em', textAlign: 'center' }}>{word.word}</div>
        </div>

        {shown ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {word.meanings.map((m, i) => (
                <div key={i} style={{ fontSize: 18, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: VP.accent, color: '#fff', fontSize: 10, fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>{i + 1}</span>
                  {m}
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 'auto',
              padding: '12px 14px',
              background: VP.bg, borderRadius: 12,
              fontSize: 14, color: VP.textSub, lineHeight: 1.5, fontStyle: 'italic',
            }}>"{word.ex}"</div>
          </>
        ) : (
          <div style={{
            marginTop: 'auto',
            textAlign: 'center', color: VP.textMute,
            fontSize: 13,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icon name="lightbulb" size={14} />
            뜻을 먼저 떠올려본 다음 확인하세요
          </div>
        )}
      </div>
    </ProtoShell>
  );
}

/* ─────────────────────────────────────────────
   QuizScreen — 한 문제 (유형별 분기)
   ───────────────────────────────────────────── */
function QuizScreen({ type, word, pool, progress, onBack, onSubmit, onNext, noteOnWrong }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // 옵션 4개 (정답 + 오답 3) — 안정적인 순서
  const options = useMemo(() => {
    const src = pool || PROTO_WORDS;
    const distractors = pickDistractors(src, word.id, 3);
    return shuffle4(word, distractors, word.id);
  }, [word.id]);

  const isCorrect = submitted && selected != null && options[selected].id === word.id;

  const handleSelect = (i) => {
    if (submitted) return;
    setSelected(i);
    const correct = options[i].id === word.id;
    setSubmitted(true);
    onSubmit(correct);
  };
  const handleNext = () => {
    setSelected(null);
    setSubmitted(false);
    onNext();
  };

  // 유형별 렌더
  let prompt, optionRender;
  if (type === 'meaning') {
    prompt = (
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <div style={{ fontSize: 12, color: VP.textMute, fontWeight: 600, letterSpacing: '.06em', marginBottom: 12 }}>
          이 단어의 뜻은?
        </div>
        <div style={{ fontSize: 11, color: VP.textMute, fontStyle: 'italic', marginBottom: 4 }}>{word.pos}</div>
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-.03em' }}>{word.word}</div>
      </div>
    );
    optionRender = (opt) => opt.meanings[0];
  } else if (type === 'word') {
    prompt = (
      <div style={{ textAlign: 'center', marginTop: 32, padding: '0 20px' }}>
        <div style={{ fontSize: 12, color: VP.textMute, fontWeight: 600, letterSpacing: '.06em', marginBottom: 12 }}>
          이 뜻을 가진 단어는?
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.3 }}>
          {word.meanings.join(' · ')}
        </div>
      </div>
    );
    optionRender = (opt) => opt.word;
  } else { // blank
    const blanked = word.ex.replace(new RegExp(`\\b${word.word}\\w*\\b`, 'i'), '_____');
    prompt = (
      <div style={{ textAlign: 'center', marginTop: 32, padding: '0 20px' }}>
        <div style={{ fontSize: 12, color: VP.textMute, fontWeight: 600, letterSpacing: '.06em', marginBottom: 12 }}>
          빈칸에 들어갈 단어는?
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.015em', lineHeight: 1.5, color: VP.text }}>
          "{blanked}"
        </div>
      </div>
    );
    optionRender = (opt) => opt.word;
  }

  const typeLabel = type === 'meaning' ? '뜻 고르기' : type === 'word' ? '단어 고르기' : '빈칸 채우기';
  const typeIcon = type === 'meaning' ? 'book-open' : type === 'word' ? 'letters' : 'pencil';

  return (
    <ProtoShell
      top={<ProtoTopBar
        onBack={onBack}
        icon={<Icon name={typeIcon} size={16} />}
        label={typeLabel}
        progress={progress}
        progressColor={VP.accent}
      />}
      footer={null}
    >
      {prompt}

      <div style={{ flex: 1, padding: '24px 20px 12px', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'flex-end' }}>
        {options.map((opt, i) => {
          const isPicked = selected === i;
          const isAnswer = opt.id === word.id;
          let bg = VP.bg, color = VP.text, ring = VP.pushRing, shade = VP.pushShade;
          if (submitted) {
            if (isAnswer) { bg = VP.ok; color = '#fff'; ring = null; shade = VP.okDeep; }
            else if (isPicked) { bg = VP.bad; color = '#fff'; ring = null; shade = VP.badDeep; }
            else { bg = VP.bg; color = VP.textMute; }
          } else if (isPicked) {
            bg = VP.bg; ring = VP.borderStrong; shade = VP.borderStrong;
          }

          return (
            <button
              key={opt.id}
              disabled={submitted}
              onClick={() => handleSelect(i)}
              style={{
                height: 56,
                background: bg, color, border: 'none',
                borderRadius: 14,
                padding: '0 18px',
                fontSize: 16, fontWeight: 700, letterSpacing: '-.02em',
                fontFamily: VPFontStack,
                cursor: submitted ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: [ring ? `inset 0 0 0 1.5px ${ring}` : null, shade ? `0 4px 0 0 ${shade}` : null].filter(Boolean).join(', '),
                transition: 'background .15s ease, color .15s ease, box-shadow .15s ease',
              }}
            >
              <span>{optionRender(opt)}</span>
              {submitted && isAnswer && <Icon name="check-bold" size={18} />}
              {submitted && isPicked && !isAnswer && <Icon name="x" size={18} strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>

      {submitted && (
        <FeedbackSheet
          correct={isCorrect}
          word={word}
          onNext={handleNext}
          noteOnWrong={noteOnWrong}
        />
      )}
    </ProtoShell>
  );
}

function FeedbackSheet({ correct, word, onNext, noteOnWrong }) {
  const bg = correct ? (VP.okSoft || '#E6F8EE') : (VP.badSoft || '#FFE7EA');
  const fg = correct ? '#1A6E3C' : '#9C2231';
  const dot = correct ? VP.ok : VP.bad;
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      background: bg, color: fg,
      padding: '22px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
      display: 'flex', flexDirection: 'column', gap: 14,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      animation: 'protoSheetUp .36s cubic-bezier(.2,.9,.3,1.05) both',
      zIndex: 10,
      boxShadow: '0 -8px 24px rgba(0,0,0,.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{
          width: 40, height: 40, borderRadius: '50%',
          background: dot, color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{correct ? <Icon name="check-bold" size={20} /> : <Icon name="x" size={20} strokeWidth={2.5} />}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.02em' }}>{correct ? '정답이에요!' : '아쉬워요'}</div>
          <div style={{ fontSize: 13, opacity: .75, marginTop: 3, lineHeight: 1.4 }}>
            <span style={{ fontWeight: 700 }}>{word.word}</span> · {word.meanings.slice(0, 2).join(', ')}
          </div>
        </div>
      </div>

      {!correct && noteOnWrong && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
          background: 'rgba(255,255,255,.55)', color: fg,
          padding: '6px 11px', borderRadius: 999, fontSize: 12, fontWeight: 700,
        }}>
          <Icon name="flame" size={13} /> 오답노트에 담았어요
        </div>
      )}

      <VPButton variant={correct ? 'ok' : 'bad'} onClick={onNext}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          다음 <Icon name="arrow-right" size={16} />
        </span>
      </VPButton>
    </div>
  );
}

/* ─────────────────────────────────────────────
   7. 결과 화면 - 점수
   ───────────────────────────────────────────── */
function ProtoResultScore({ state, dispatch }) {
  const right = Object.values(state.quizResults).filter(r => r === 'correct').length;
  const wrong = Object.values(state.quizResults).filter(r => r === 'wrong').length;
  const total = wordsForStage(state.activeStage).length;
  const acc = Math.round((right / total) * 100);
  const xp = right * 10 + (wrong === 0 ? 50 : 0);

  return (
    <ProtoShell
      footer={<ProtoFooter>
        <VPButton variant="accent" onClick={() => dispatch({ type: 'GOTO_RESULT_STAGE' })}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            계단 보기 <Icon name="arrow-right" size={16} />
          </span>
        </VPButton>
      </ProtoFooter>}
    >
      <div style={{ paddingTop: 'env(safe-area-inset-top, 32px)' }}>
        <div style={{ padding: '20px 20px 6px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: VP.textMute, fontWeight: 700, letterSpacing: '.08em' }}>
            {state.activeStage}걸음 · 정복 결과
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px 8px', gap: 14 }}>
        <Donut value={acc} />
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.025em' }}>
          {acc === 100 ? '완벽해요!' : acc >= 80 ? '잘했어요!' : acc >= 60 ? '괜찮아요' : '연습 더 해요'}
        </div>
        <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360 }}>
          <Stat label="맞춤" value={right} color={VP.ok} />
          <Stat label="틀림" value={wrong} color={VP.bad} />
          <Stat label="XP" value={`+${xp}`} color={VP.accent} />
        </div>
      </div>
    </ProtoShell>
  );
}

function Donut({ value }) {
  const r = 60;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  return (
    <div style={{ position: 'relative', width: 160, height: 160 }}>
      <svg viewBox="0 0 160 160" width="160" height="160">
        <circle cx="80" cy="80" r={r} stroke={VP.surface2} strokeWidth="14" fill="none" />
        <circle cx="80" cy="80" r={r} stroke={VP.accent} strokeWidth="14" fill="none"
          strokeDasharray={c} strokeDashoffset={offset}
          transform="rotate(-90 80 80)" strokeLinecap="round" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: VP.textMute, fontWeight: 600, marginTop: 2 }}>정확도 %</div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{
      flex: 1, padding: '12px 8px',
      background: VP.surface, borderRadius: 12,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: '-.025em' }}>{value}</div>
      <div style={{ fontSize: 11, color: VP.textSub, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   8. 결과 화면 — Stage 진척
   ───────────────────────────────────────────── */
function ProtoResultStage({ state, dispatch }) {
  const stage = state.activeStage;
  const words = wordsForStage(stage);
  const review = state.cardR2InitialIds.length;          // 1R에서 몰랐던 수
  const fresh = words.length - review;                   // 바로 알았던 수
  // 이번 정복을 반영한 정복 수 (아직 reducer 전이라 미리 계산)
  const conqueredAfter = state.conqueredSet.includes(stage) ? state.conqueredSet.length : state.conqueredSet.length + 1;
  return (
    <ProtoShell
      footer={<ProtoFooter>
        <VPButton variant="accent" onClick={() => dispatch({ type: 'CONQUER_STAGE' })}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            홈으로 <Icon name="arrow-right" size={16} />
          </span>
        </VPButton>
      </ProtoFooter>}
    >
      <div style={{ paddingTop: 'env(safe-area-inset-top, 32px)' }}>
        <div style={{ padding: '20px 20px 6px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: VP.textMute, fontWeight: 700, letterSpacing: '.08em' }}>
            {stage}걸음 정복!
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '12px 24px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
        {/* 두 트랙 현황 */}
        <div style={{ display: 'flex', gap: 10 }}>
          <TrackStat icon="check" tint={VP.ok} tintSoft={VP.okSoft} tintDeep={VP.okDeep}
            label="훑은 걸음" value={state.checkedCount} suffix={`/ ${STAGE_TOTAL}`} />
          <TrackStat icon="mountain" tint={VP.accent} tintSoft={VP.accentSoft} tintDeep={VP.accentDeep}
            label="정복한 걸음" value={conqueredAfter} suffix={`/ ${STAGE_TOTAL}`} />
        </div>

        <div style={{
          padding: '16px',
          background: VP.surface, border: `1px solid ${VP.divider}`,
          borderRadius: 16,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: VP.textSub, fontWeight: 700, letterSpacing: '.02em',
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: 4,
              background: VP.accent, color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon name="trending-up" size={11} strokeWidth={2.5} /></span>
            방금 이 걸음에서
          </div>
          <div style={{ fontSize: 15, color: VP.text, fontWeight: 700, lineHeight: 1.4 }}>
            신규 {fresh} + 복습 {review} = <span style={{ color: VP.accent }}>{words.length}문제</span> 인출하고 정복했어요
          </div>
          {state.checkedCount > conqueredAfter && (
            <div style={{ fontSize: 13, color: VP.textSub, lineHeight: 1.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              아직 <span style={{ color: VP.accent, fontWeight: 700 }}>{state.checkedCount - conqueredAfter}걸음</span>이 정복 대기 중이에요
            </div>
          )}
        </div>
      </div>
    </ProtoShell>
  );
}

/* 트랙 현황 통계 카드 */
function TrackStat({ icon, tint, tintSoft, tintDeep, label, value, suffix }) {
  return (
    <div style={{
      flex: 1, padding: '16px 14px',
      background: VP.surface, border: `1px solid ${VP.divider}`, borderRadius: 16,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <span style={{
        width: 30, height: 30, borderRadius: 9,
        background: tintSoft, color: tint,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name={icon} size={17} color={tint} /></span>
      <div style={{ fontSize: 12, color: VP.textSub, fontWeight: 700, marginTop: 2 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: tintDeep, letterSpacing: '-.03em' }}>{value}</span>
        <span style={{ fontSize: 12, color: VP.textMute, fontWeight: 600 }}>{suffix}</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  ProtoQuiz, ProtoQuizReview, QuizScreen, FeedbackSheet,
  ProtoResultScore, ProtoResultStage, Donut, Stat, TrackStat,
});
