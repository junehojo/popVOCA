/* VocaPoP Prototype · 플로팅 미니카드 오버레이
   다른 앱(동영상) 위에 떠서 플래시카드를 넘기는 모드 — 알아요/몰라요만, 퀴즈 없음 */

/* ─────────────────────────────────────────────
   배경: 다른 앱 (가상의 세로 동영상 앱) — 항상 다크
   ───────────────────────────────────────────── */
const HOST = {
  bg: '#0E0F13', surface: '#1A1B21', surface2: '#23252D',
  text: '#F3F4F7', sub: '#9A9DA8', mute: '#5C606C', line: '#2A2C34',
  accent: '#FF4D67',
};

function HostVideoApp() {
  const [playing, setPlaying] = useState(true);
  return (
    <div style={{
      position: 'absolute', inset: 0, background: HOST.bg, color: HOST.text,
      fontFamily: VPFontStack, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* 상태바 */}
      <div style={{
        height: 44, padding: '0 24px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 14, fontWeight: 600, color: HOST.text, paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <span>9:41</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', opacity: .9 }}>
          <span style={{ fontSize: 12 }}>●●●●</span>
          <span style={{
            width: 22, height: 11, border: `1.5px solid ${HOST.text}`, borderRadius: 3, position: 'relative',
          }}><span style={{ position: 'absolute', inset: 1.5, background: HOST.text, borderRadius: 1 }} /></span>
        </div>
      </div>

      {/* 앱 상단바 */}
      <div style={{ height: 46, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <Icon name="chevron-left" size={22} color={HOST.text} />
        <div style={{ flex: 1 }} />
        <Icon name="search" size={19} color={HOST.text} />
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: HOST.surface2 }} />
      </div>

      {/* 동영상 (16:9) */}
      <div
        onClick={() => setPlaying(p => !p)}
        style={{
          position: 'relative', width: '100%', paddingBottom: '56.25%', flexShrink: 0,
          background: 'linear-gradient(135deg, #2B2230 0%, #1C2230 55%, #122024 100%)',
          overflow: 'hidden', cursor: 'pointer',
        }}>
        {/* 줄무늬 플레이스홀더 */}
        <div style={{
          position: 'absolute', inset: 0, opacity: .35,
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 2px, transparent 2px 11px)',
        }} />
        {/* 중앙 재생/일시정지 */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 54, height: 54, borderRadius: '50%', background: 'rgba(0,0,0,.42)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            {playing
              ? <span style={{ display: 'inline-flex', gap: 5 }}><span style={{ width: 5, height: 18, background: '#fff', borderRadius: 1 }} /><span style={{ width: 5, height: 18, background: '#fff', borderRadius: 1 }} /></span>
              : <Icon name="play" size={24} color="#fff" />}
          </div>
        </div>
        {/* 스크러버 */}
        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,.85)', marginBottom: 5, fontWeight: 600 }}>
            <span>1:12</span><span>4:38</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,.28)', borderRadius: 2, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '26%', background: HOST.accent, borderRadius: 2 }} />
            <div style={{ position: 'absolute', left: '26%', top: '50%', width: 10, height: 10, marginLeft: -5, marginTop: -5, borderRadius: '50%', background: HOST.accent }} />
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '14px 16px 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35, letterSpacing: '-.02em' }}>
          고양이가 키보드 위에서 잠드는 영상 모음 🐱 (ASMR)
        </div>
        <div style={{ fontSize: 12.5, color: HOST.sub, marginTop: 6, fontWeight: 500 }}>
          조회수 128만회 · 3일 전
        </div>

        {/* 채널 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 16 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#5C6BFF,#9A4DFF)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>데일리냥 TV</div>
            <div style={{ fontSize: 11.5, color: HOST.sub }}>구독자 24.1만명</div>
          </div>
          <div style={{
            height: 34, padding: '0 16px', borderRadius: 999, background: HOST.text, color: HOST.bg,
            display: 'inline-flex', alignItems: 'center', fontSize: 13, fontWeight: 800,
          }}>구독</div>
        </div>

        {/* 액션 행 */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {[
            { ic: 'heart', t: '2.4만' },
            { ic: 'comment', t: '댓글' },
            { ic: 'share', t: '공유' },
            { ic: 'star-line', t: '저장' },
          ].map((a, i) => (
            <div key={i} style={{
              flex: 1, height: 40, borderRadius: 10, background: HOST.surface,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 12.5, fontWeight: 600, color: HOST.text,
            }}>
              <Icon name={a.ic} size={16} color={HOST.text} />{a.t}
            </div>
          ))}
        </div>

        {/* 다음 동영상 (배경 채움) */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14, opacity: .9 }}>
          {[['#3A2E4A', '강아지가 처음 눈을 본 날 ❄️', '멍멍라이프 · 조회수 88만회'],
            ['#2E3A4A', '캠핑 브이로그 | 비 오는 숲속의 밤', '자연한입 · 조회수 41만회']].map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 11 }}>
              <div style={{ width: 132, height: 74, borderRadius: 10, background: r[0], flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: .3, backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 10px)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{r[1]}</div>
                <div style={{ fontSize: 11, color: HOST.sub, marginTop: 5 }}>{r[2]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   걸음 전환 카드 — 한 걸음 체크가 끝나면 뜬다.
   자동 진행 없음: 사용자가 직접 '다음 걸음 체크'를 눌러야 넘어간다.
   ───────────────────────────────────────────── */
function OverlayTransition({ state, dispatch }) {
  const justStage = state.overlayJustStage;
  const nextStage = justStage + 1;
  const know = state.overlayLastKnow;
  const dk = state.overlayLastDk;

  return (
    <div style={{ padding: '20px 16px 14px', textAlign: 'center' }}>
      <div style={{
        width: 46, height: 46, borderRadius: '50%', margin: '0 auto 10px',
        background: VP.okSoft || VP.accentSoft, color: VP.ok,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name="check" size={24} color={VP.ok} /></div>

      <div style={{ fontSize: 18, fontWeight: 800, color: VP.text, letterSpacing: '-.03em' }}>
        {justStage}걸음 완료
      </div>
      <div style={{ fontSize: 12.5, color: VP.textSub, marginTop: 4, marginBottom: 16 }}>
        바로 알아요 <b style={{ color: VP.okDeep }}>{know}</b> · 몰라요 <b style={{ color: VP.bad }}>{dk}</b>
      </div>

      {/* 다음 걸음 체크 — 직접 눌러야 넘어감 */}
      <button onClick={() => dispatch({ type: 'OVERLAY_NEXT_STAGE' })} style={miniBtn('accent')}>
        <Icon name="pip" size={15} /> {nextStage}걸음 이어서 체크
      </button>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={() => dispatch({ type: 'OVERLAY_RESTART' })} style={{
          ...miniBtn('default'), height: 38, fontSize: 12.5,
        }}>
          <Icon name="rotate" size={13} /> 다시 체크해보기
        </button>
        <button onClick={() => dispatch({ type: 'CLOSE_OVERLAY' })} style={{
          ...miniBtn('default'), height: 38, fontSize: 12.5, flex: '0 0 92px',
        }}>
          그만하기
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   플로팅 미니카드 (드래그 가능)
   ───────────────────────────────────────────── */
function ProtoOverlay({ state, dispatch }) {
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const dragRef = useRef(null);
  const [pos, setPos] = useState(null);     // {left, top} px — null이면 기본(하단 중앙)
  const [dragging, setDragging] = useState(false);
  const [overTrash, setOverTrash] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [dragX, setDragX] = useState(0);       // 카드 좌우 스와이프 이동량
  const [grabbing, setGrabbing] = useState(false);
  const [noSlide, setNoSlide] = useState(false);
  const [r2Flash, setR2Flash] = useState(false);
  const swipeRef = useRef(null);

  const idx = state.overlayIdx;
  const round = state.overlayRound;
  const isR2 = round === 2;
  const transition = round === 'transition';
  const words = wordsForStage(state.overlayStage);
  const word = isR2
    ? words.find(w => w.id === state.overlayR2Queue[0])
    : words[idx];
  const wordKey = isR2 ? state.overlayR2Queue[0] : idx;
  const knowCount = Object.values(state.overlayResults).filter(r => r === 'know').length;
  const dkCount = Object.values(state.overlayResults).filter(r => r === 'dontknow').length;
  const pending = Math.max(0, state.checkedCount - state.conqueredSet.length);

  // 진행 표시
  const r2done = state.overlayR2Initial - state.overlayR2Queue.length;
  const progPct = isR2
    ? (r2done / Math.max(1, state.overlayR2Initial)) * 100
    : (idx / words.length) * 100;
  const progLabel = isR2 ? `남은 ${state.overlayR2Queue.length}` : `${idx + 1}/${words.length}`;
  const remaining = isR2 ? state.overlayR2Queue.length : (words.length - idx);

  // 단어가 바뀌면 앞면으로 + 스와이프 초기화
  useEffect(() => { setFlipped(false); setDragX(0); setGrabbing(false); }, [wordKey, round]);
  // 힌트 자동 숨김
  useEffect(() => { const t = setTimeout(() => setShowHint(false), 4200); return () => clearTimeout(t); }, []);
  // 재시험 시작 알림
  useEffect(() => {
    if (round === 2) { setR2Flash(true); const t = setTimeout(() => setR2Flash(false), 2400); return () => clearTimeout(t); }
  }, [round]);

  // 드래그
  useEffect(() => {
    if (!dragging) return;
    const move = (e) => {
      const d = dragRef.current; if (!d) return;
      let nl = d.startLeft + (e.clientX - d.startX);
      let nt = d.startTop + (e.clientY - d.startY);
      nl = Math.max(8, Math.min(d.cw - d.cardW - 8, nl));
      nt = Math.max(8, Math.min(d.ch - d.cardH - 8, nt));
      setPos({ left: nl, top: nt });
      // 손가락(포인터) 위치가 하단 중앙 × 존에 들어왔는지
      const px = e.clientX - d.cleft, py = e.clientY - d.ctop;
      const over = Math.hypot(px - d.cw / 2, py - (d.ch - 78)) < 82;
      d.over = over;
      setOverTrash(over);
    };
    const up = () => {
      const d = dragRef.current;
      setDragging(false);
      setOverTrash(false);
      if (d && d.over) dispatch({ type: 'CLOSE_OVERLAY' }); // × 존에 떨구면 닫기
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [dragging]);

  const startDrag = (e) => {
    const c = containerRef.current.getBoundingClientRect();
    const card = cardRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startLeft: card.left - c.left, startTop: card.top - c.top,
      cw: c.width, ch: c.height, cardW: card.width, cardH: card.height,
      cleft: c.left, ctop: c.top, over: false,
    };
    setPos({ left: card.left - c.left, top: card.top - c.top });
    setShowHint(false);
    setDragging(true);
    e.preventDefault();
  };

  const posStyle = pos
    ? { left: pos.left, top: pos.top }
    : { left: 'calc(50% - 133px)', bottom: 26 };

  // ── 카드 스와이프 (← 몰라요 / 알아요 →) ──
  const SWIPE_TH = 60;
  const onSwipeDown = (e) => {
    swipeRef.current = { x: e.clientX, y: e.clientY, moved: 0, active: true };
    setGrabbing(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const onSwipeMove = (e) => {
    const s = swipeRef.current; if (!s || !s.active) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    s.moved = Math.max(s.moved, Math.abs(dx), Math.abs(dy));
    setDragX(dx);
  };
  const commitSwipe = (choice) => {
    setGrabbing(false);
    setDragX(choice === 'know' ? 360 : -360);   // 옆으로 날아감
    setTimeout(() => {
      // 가로 슬라이드 없이 제자리로 되돌리고 → 다음 카드는 아래에서 올라옴(리마운트)
      setNoSlide(true);
      setDragX(0);
      setFlipped(false);
      dispatch({ type: 'OVERLAY_ANSWER', choice });
      requestAnimationFrame(() => requestAnimationFrame(() => setNoSlide(false)));
    }, 200);
  };
  const onSwipeUp = (e) => {
    const s = swipeRef.current; if (!s || !s.active) return;
    s.active = false;
    setGrabbing(false);
    const dx = e.clientX - s.x;
    if (dx > SWIPE_TH) commitSwipe('know');
    else if (dx < -SWIPE_TH) commitSwipe('dontknow');
    else if (s.moved < 8) { setFlipped(f => !f); setDragX(0); }
    else setDragX(0);
  };
  const opL = Math.min(Math.max(-dragX / 80, 0), 1);
  const opR = Math.min(Math.max(dragX / 80, 0), 1);

  return (
    <div ref={containerRef} style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden', fontFamily: VPFontStack,
      touchAction: 'none', userSelect: dragging ? 'none' : 'auto',
    }}>
      <HostVideoApp />

      {/* 맥락 힌트 — 잠깐 떴다 사라짐 */}
      {showHint && (
        <div style={{
          position: 'absolute', top: 'calc(56px + env(safe-area-inset-top, 0px))', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(15,16,19,.82)', color: '#fff', backdropFilter: 'blur(4px)',
          padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
          boxShadow: '0 8px 24px rgba(0,0,0,.4)', zIndex: 40,
          animation: 'protoBannerIn .4s ease both', pointerEvents: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="pip" size={14} color="#fff" /> 끌어서 옮기고 · 아래 ×로 끌면 닫혀요
        </div>
      )}

      {/* 재시험 시작 알림 */}
      {r2Flash && (
        <div style={{
          position: 'absolute', top: 'calc(56px + env(safe-area-inset-top, 0px))', left: '50%', transform: 'translateX(-50%)',
          background: VP.bad, color: '#fff',
          padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
          boxShadow: '0 8px 24px rgba(0,0,0,.4)', zIndex: 41, pointerEvents: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="repeat" size={14} color="#fff" /> 재시험! 몰랐던 {state.overlayR2Initial}개 다시 밀어요
        </div>
      )}

      {/* ── 드래그-투-닫기 × 존 (끌고 있을 때만) ── */}
      {dragging && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 38, transform: `translateX(-50%) scale(${overTrash ? 1.18 : 1})`,
          width: 60, height: 60, borderRadius: '50%', zIndex: 45,
          background: overTrash ? VP.bad : 'rgba(15,16,19,.66)',
          color: '#fff', backdropFilter: 'blur(4px)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: overTrash ? `0 0 0 8px ${VP.bad}33, 0 10px 30px rgba(0,0,0,.45)` : '0 8px 24px rgba(0,0,0,.4)',
          transition: 'transform .16s cubic-bezier(.3,.9,.4,1.2), background .15s, box-shadow .15s',
          pointerEvents: 'none',
        }}>
          <Icon name="x" size={overTrash ? 28 : 24} color="#fff" />
        </div>
      )}

      {/* ── 떠 있는 미니카드 ── */}
      {true && (
        <div
          ref={cardRef}
          style={{
            position: 'absolute', ...posStyle, width: 266, zIndex: 50,
            background: VP.surface, borderRadius: 22,
            border: `1px solid ${VP.border}`,
            boxShadow: `0 18px 48px rgba(0,0,0,.42), 0 0 0 1px ${VP.accentSoft}`,
            overflow: 'hidden',
            opacity: overTrash ? 0.45 : 1, transition: 'opacity .15s ease',
          }}>

          {transition ? (
            <OverlayTransition state={state} dispatch={dispatch} />
          ) : (
            <div style={{ padding: '10px 12px 12px' }}>
              {/* 진행 줄 = 드래그 손잡이 (끌어서 옮기고, 아래 ×로 끌면 닫힘) */}
              <div
                onPointerDown={startDrag}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9,
                  cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none',
                }}>
                <Icon name="grip" size={14} color={VP.textMute} />
                <div style={{ flex: 1, height: 4, background: VP.surface2, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${progPct}%`, height: '100%', background: isR2 ? VP.bad : VP.accent, borderRadius: 999, transition: 'width .3s ease' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: isR2 ? VP.bad : VP.textSub }}>{progLabel}</span>
              </div>

              {/* 스와이프 무대 — 끌어서 ← 몰라요 / 알아요 → */}
              <div style={{ position: 'relative', height: 104 }}>
                {/* 코너 스탬프 */}
                <div style={{
                  position: 'absolute', top: 7, left: 7, zIndex: 6, pointerEvents: 'none',
                  padding: '2px 8px', borderRadius: 7, border: `2px solid ${VP.bad}`, color: VP.bad,
                  fontSize: 11, fontWeight: 900, transform: 'rotate(-11deg)',
                  opacity: opL, transition: grabbing ? 'none' : 'opacity .15s',
                }}>몰라요</div>
                <div style={{
                  position: 'absolute', top: 7, right: 7, zIndex: 6, pointerEvents: 'none',
                  padding: '2px 8px', borderRadius: 7, border: `2px solid ${VP.ok}`, color: VP.okDeep,
                  fontSize: 11, fontWeight: 900, transform: 'rotate(11deg)',
                  opacity: opR, transition: grabbing ? 'none' : 'opacity .15s',
                }}>알아요</div>

                {/* 스와이프 레이어 (드래그 + 옆으로 날리기) */}
                <div
                  onPointerDown={onSwipeDown}
                  onPointerMove={onSwipeMove}
                  onPointerUp={onSwipeUp}
                  onPointerCancel={onSwipeUp}
                  style={{
                    position: 'absolute', inset: 0,
                    transform: `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`,
                    transition: (grabbing || noSlide) ? 'none' : 'transform .22s cubic-bezier(.3,.8,.4,1)',
                    cursor: grabbing ? 'grabbing' : 'grab', touchAction: 'none',
                  }}>
                  {/* 다음 카드 — 아래에서 올라옴 (wordKey 바뀌면 리마운트되어 재생) */}
                  <RiseCard key={`rise-${round}-${wordKey}`}>
                    <div style={{
                      position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d',
                      transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      transition: 'transform .5s cubic-bezier(.4,.1,.2,1)',
                    }}>
                      {/* 앞면 */}
                      <div style={miniFace(false)}>
                        <span style={{ fontSize: 10.5, color: VP.textMute, fontStyle: 'italic' }}>{word.pos}</span>
                        <span style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-.03em', color: VP.text, textAlign: 'center' }}>{word.word}</span>
                      </div>
                      {/* 뒷면 */}
                      <div style={{ ...miniFace(true) }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: VP.text, letterSpacing: '-.02em' }}>{word.word}</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
                          {word.meanings.map((m, i) => (
                            <span key={i} style={{
                              fontSize: 12.5, fontWeight: 700, color: VP.accentDeep,
                              background: VP.accentSoft, padding: '3px 9px', borderRadius: 999,
                            }}>{m}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </RiseCard>
                  {/* 색 링 오버레이 (드래그 중 틴트) */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 16, pointerEvents: 'none',
                    border: `2.5px solid ${dragX >= 0 ? VP.ok : VP.bad}`,
                    opacity: Math.max(opL, opR) * 0.9,
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* 다음 카드가 아래에서 올라오는 래퍼 — 기본(정착) 상태가 보이는 상태,
   마운트 시에만 잠깐 아래로 내려가 있다가 트랜지션으로 올라온다.
   (CSS animation+fill 대신 트랜지션을 써서 타임라인이 멈춰도 최종 상태는 항상 보임) */
function RiseCard({ children }) {
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setEntering(false), 20);
    return () => clearTimeout(id);
  }, []);
  return (
    <div style={{
      position: 'absolute', inset: 0, perspective: 1000,
      transform: entering ? 'translateY(40px) scale(.93)' : 'translateY(0) scale(1)',
      opacity: entering ? 0 : 1,
      transition: 'transform .3s cubic-bezier(.2,.85,.3,1.05), opacity .24s ease',
    }}>{children}</div>
  );
}

/* 미니 버튼 스타일 */
function miniBtn(variant) {
  const map = {
    default: { bg: VP.bg, color: VP.text, border: `1px solid ${VP.border}` },
    accent:  { bg: VP.accent, color: '#fff', border: 'none' },
    ok:      { bg: VP.ok, color: '#fff', border: 'none' },
    bad:     { bg: VP.badSoft, color: VP.badDeep, border: 'none' },
  };
  const v = map[variant] || map.default;
  return {
    flex: 1, height: 46, borderRadius: 12, cursor: 'pointer',
    fontFamily: VPFontStack, fontSize: 14.5, fontWeight: 800, letterSpacing: '-.02em',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    background: v.bg, color: v.color, border: v.border,
  };
}

/* 미니 카드 면 스타일 */
function miniFace(back) {
  return {
    position: 'absolute', inset: 0,
    background: back ? VP.surface2 : VP.bg,
    border: `1.5px solid ${VP.border}`, borderRadius: 16,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
    padding: '12px 16px', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    transform: back ? 'rotateY(180deg)' : 'none', overflow: 'hidden',
  };
}

Object.assign(window, { ProtoOverlay, HostVideoApp });
