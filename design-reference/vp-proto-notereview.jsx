/* VocaPoP Prototype · 오답 복습 세션 (오답노트 전용 학습 루프) */

function ProtoNoteReview({ state, dispatch }) {
  const queue = state.noteReviewQueue;
  const wordId = queue[state.noteReviewIdx];
  const word = PROTO_WORDS.find(w => w.id === wordId);
  const type = QUIZ_CYCLE[state.noteReviewIdx % QUIZ_CYCLE.length];
  const progress = ((state.noteReviewIdx + 1) / queue.length) * 100;
  if (!word) return null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <QuizScreen
        key={state.noteReviewIdx}
        type={type}
        word={word}
        progress={progress}
        onBack={() => dispatch({ type: 'GOTO', screen: 'notes' })}
        onSubmit={(isCorrect) => dispatch({ type: 'NOTE_REVIEW_ANSWER', wordId: word.id, correct: isCorrect })}
        onNext={() => dispatch({ type: 'NOTE_REVIEW_NEXT' })}
      />
      {/* 상단 — 복습 세션 배지 + 수동 빼기 버튼 */}
      <div style={{
        position: 'absolute', top: 'calc(env(safe-area-inset-top, 12px) + 6px)', left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 56px', pointerEvents: 'none',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '.04em',
          color: VP.accent, background: VP.accentSoft,
          padding: '4px 10px', borderRadius: 999,
        }}>오답 복습 · {state.noteReviewIdx + 1}/{queue.length}</span>
        <button
          onClick={() => dispatch({ type: 'REVIEW_REMOVE', wordId: word.id })}
          style={{
            pointerEvents: 'auto', minHeight: 34,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 700,
            color: VP.textSub, background: VP.surface,
            border: `1.5px solid ${VP.border}`, borderRadius: 999,
            padding: '7px 13px', cursor: 'pointer', fontFamily: VPFontStack,
          }}>
          <Icon name="check" size={13} /> 노트에서 빼기
        </button>
      </div>
    </div>
  );
}

function ProtoNoteReviewDone({ state, dispatch }) {
  const total = state.noteReviewQueue.length;
  const removed = state.noteReviewRemoved.length;
  const correctCnt = Object.values(state.noteReviewResults).filter(r => r === 'correct').length;
  const wrongCnt = Object.values(state.noteReviewResults).filter(r => r === 'wrong').length;
  const remaining = computeNoteIds(state).size; // 아직 노트에 남은 단어
  const allCleared = remaining === 0;

  return (
    <ProtoShell
      footer={<ProtoFooter>
        {!allCleared && (
          <VPButton variant="accent" onClick={() => dispatch({ type: 'START_NOTE_REVIEW' })}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              남은 {remaining}개 다시 복습 <Icon name="repeat" size={16} />
            </span>
          </VPButton>
        )}
        <VPButton variant={allCleared ? 'accent' : 'soft'} onClick={() => dispatch({ type: 'GOTO', screen: 'notes' })}>
          오답노트로
        </VPButton>
      </ProtoFooter>}
    >
      <div style={{
        flex: 1, padding: '0 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
        textAlign: 'center',
      }}>
        <div style={{
          width: 84, height: 84, borderRadius: '50%',
          background: VP.accentSoft, color: VP.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name={allCleared ? 'party' : 'trending-up'} size={40} /></div>

        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.025em' }}>
          {allCleared ? '오답노트를 다 비웠어요!' : '복습 완료'}
        </div>
        <div style={{ fontSize: 15, color: VP.textSub, lineHeight: 1.6, maxWidth: 296 }}>
          맞힌 단어는 틀린 횟수가 줄었어요.
          {removed > 0
            ? <> 이번에 <span style={{ color: VP.accent, fontWeight: 800 }}>{removed}개</span>를 노트에서 빀어요.</>
            : <> 단어는 직접 빼기 전까지 노트에 남아 있어요.</>}
        </div>

        <div style={{ width: '100%', maxWidth: 300, display: 'flex', gap: 8 }}>
          <ReviewStat label="맞춤" value={correctCnt} color={VP.ok} />
          <ReviewStat label="틀림" value={wrongCnt} color={VP.bad} />
          <ReviewStat label="빀" value={removed} color={VP.accent} />
          <ReviewStat label="남음" value={remaining} color={VP.textSub} />
        </div>
      </div>
    </ProtoShell>
  );
}

function ReviewStat({ label, value, color }) {
  return (
    <div style={{
      flex: 1, padding: '12px 8px',
      background: VP.surface, borderRadius: 12, border: `1px solid ${VP.divider}`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-.025em' }}>{value}</div>
      <div style={{ fontSize: 11, color: VP.textSub, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

Object.assign(window, { ProtoNoteReview, ProtoNoteReviewDone, ReviewStat });
