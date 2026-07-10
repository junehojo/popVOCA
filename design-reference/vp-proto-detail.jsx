/* VocaPoP Prototype · 단어 상세 시트 + 발음(TTS) */

function vpSpeak(text, cb) {
  cb = cb || {};
  try {
    if (!('speechSynthesis' in window)) { cb.onend && cb.onend(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.92;
    u.pitch = 1;
    u.onstart = () => cb.onstart && cb.onstart();
    u.onend = () => cb.onend && cb.onend();
    u.onerror = () => cb.onend && cb.onend();
    window.speechSynthesis.speak(u);
  } catch (e) { cb.onend && cb.onend(); }
}

/* 인라인 발음 버튼 (리스트 행에서 사용) — 재생 중 리듬 */
function SpeakButton({ text, size = 36, onClick }) {
  const [on, setOn] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); vpSpeak(text, { onstart: () => setOn(true), onend: () => setOn(false) }); onClick && onClick(); }}
      aria-label="발음 듣기"
      style={{
        width: size, height: size, flexShrink: 0,
        background: 'transparent', color: on ? VP.accent : VP.textSub,
        border: 'none', borderRadius: 10, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: 0,
        animation: on ? 'protoPulse .7s ease-in-out infinite' : 'none',
      }}>
      <Icon name="speaker" size={Math.round(size * 0.5)} />
    </button>
  );
}

/* 단어 상세 — 바텀시트 오버레이 */
function WordDetail({ state, dispatch }) {
  const word = PROTO_WORDS.find(w => w.id === state.detailWordId);
  if (!word) return null;

  const isFav = state.checkedIds.includes(word.id);
  const wrongCount = state.wrongCounts[word.id] || 0;
  const [spk, setSpk] = useState(false);

  const close = () => dispatch({ type: 'CLOSE_DETAIL' });

  return (
    <div
      onClick={close}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: 'rgba(8,10,16,.45)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        animation: 'protoFade .2s ease',
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: VP.bg,
          borderTopLeftRadius: 26, borderTopRightRadius: 26,
          padding: '10px 22px calc(24px + env(safe-area-inset-bottom, 0px))',
          animation: 'protoSheetUp .34s cubic-bezier(.2,.9,.3,1.05) both',
          maxHeight: '88%', overflowY: 'auto',
        }}>
        {/* grabber */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 14px' }}>
          <div style={{ width: 40, height: 5, borderRadius: 999, background: VP.border }} />
        </div>

        {/* 헤더 — 품사 + 닫기 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 12, color: VP.textMute, fontStyle: 'italic' }}>{word.pos}</span>
          <span style={{ fontSize: 11, color: VP.textMute, fontWeight: 600 }}>#{String(word.id).padStart(3, '0')}</span>
        </div>

        {/* 단어 + 발음 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.1 }}>{word.word}</div>
          <button
            onClick={() => vpSpeak(word.word, { onstart: () => setSpk(true), onend: () => setSpk(false) })}
            aria-label="발음 듣기"
            style={{
              width: 46, height: 46, flexShrink: 0,
              background: VP.accentSoft, color: VP.accent,
              border: 'none', borderRadius: 14, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              animation: spk ? 'protoPulse .7s ease-in-out infinite' : 'none',
            }}><Icon name="speaker" size={22} /></button>
        </div>

        {/* 틀린 기록 */}
        {wrongCount > 0 && (
          <div style={{
            marginTop: 14,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 11px', borderRadius: 999,
            background: VP.badSoft, color: VP.bad,
            fontSize: 12, fontWeight: 700,
          }}>
            <Icon name="flame" size={13} /> 지금까지 {wrongCount}번 틀린 단어예요
          </div>
        )}

        {/* 뜻 */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {word.meanings.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: VP.accent, color: '#fff', fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{i + 1}</span>
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em', color: VP.text }}>{m}</span>
            </div>
          ))}
        </div>

        {/* 예문 */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: VP.textSub, letterSpacing: '.04em', marginBottom: 8 }}>예문</div>
          <div style={{
            padding: '14px 16px',
            background: VP.surface, borderRadius: 14, border: `1px solid ${VP.divider}`,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <div style={{ flex: 1, fontSize: 15, color: VP.text, lineHeight: 1.55, fontStyle: 'italic' }}>"{word.ex}"</div>
            <SpeakButton text={word.ex} size={34} />
          </div>
        </div>

        {/* 액션 — 즐겨찾기 */}
        <div style={{ marginTop: 22 }}>
          <VPButton
            variant={isFav ? 'accent' : 'soft'}
            onClick={() => dispatch({ type: 'TOGGLE_CHECK', wordId: word.id })}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Icon name={isFav ? 'star' : 'star-line'} size={18} />
              {isFav ? '즐겨찾기 됨' : '즐겨찾기에 추가'}
            </span>
          </VPButton>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { vpSpeak, SpeakButton, WordDetail });
