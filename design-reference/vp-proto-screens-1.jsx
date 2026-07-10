/* VocaPoP Prototype · 공통 셸 + 홈/미리보기/카드 */

/* ─────────────────────────────────────────────
   ProtoShell — 풀스크린 컨테이너 + 공통 헤더
   ───────────────────────────────────────────── */
function ProtoShell({ children, top, footer }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: VP.bg,
      color: VP.text,
      fontFamily: VPFontStack,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {top}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
        {children}
      </div>
      {footer}
    </div>
  );
}

function ProtoTopBar({ onBack, icon, label, right, progress, progressColor, onOverlay }) {
  return (
    <div style={{ paddingTop: 'env(safe-area-inset-top, 12px)' }}>
      <div style={{
        padding: '14px 20px 10px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, border: 'none', background: 'transparent',
          color: VP.text, cursor: 'pointer', padding: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 10,
        }}>
          <Icon name="x" size={20} />
        </button>
        <div style={{
          flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: 14, fontWeight: 700, color: VP.text, letterSpacing: '-.02em',
        }}>
          {icon}
          {label}
        </div>
        {onOverlay && (
          <button onClick={onOverlay} aria-label="플로팅으로 전환" title="플로팅으로 — 다른 앱 위에서" style={{
            width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
            background: VP.accentSoft, color: VP.accent, padding: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="pip" size={18} /></button>
        )}
        <div style={{
          minWidth: 44, textAlign: 'right',
          fontSize: 13, color: VP.textSub, fontWeight: 600,
        }}>{right || ''}</div>
      </div>
      {typeof progress === 'number' && (
        <div style={{ padding: '0 20px 8px' }}>
          <div style={{ height: 4, background: VP.surface2, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${progress}%`, height: '100%',
              background: progressColor || VP.accent,
              borderRadius: 999,
              transition: 'width .3s ease',
            }}/>
          </div>
        </div>
      )}
    </div>
  );
}

function ProtoFooter({ children }) {
  return (
    <div style={{
      padding: '12px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
      display: 'flex', gap: 10, flexDirection: 'column',
    }}>{children}</div>
  );
}

/* ─────────────────────────────────────────────
   1. 홈 — 두루마리 스크롤 계단
   ───────────────────────────────────────────── */
const P_TOTAL = 144;
const P_ABOVE = 12;
const P_BELOW = 5;
const P_CURRENT_SLOT = P_ABOVE;
const P_TOTAL_SLOTS = P_ABOVE + 1 + P_BELOW;
const P_SLOT_H = 44;
const P_SLOT_GAP = 12;
const P_STRIDE = P_SLOT_H + P_SLOT_GAP;
const P_SELECTED_BOTTOM = 4 * P_STRIDE + 10; // 선택 걸음을 하단에서 고정 거리만큼 (+10 위로)
const P_BASE_W = 252;

function protoSlotWidth(slotIdx) {
  const d = slotIdx - P_CURRENT_SLOT;
  return P_BASE_W + d * 28;
}

function ProtoHome({ state, dispatch }) {
  const checkedCount = state.checkedCount;
  const conquered = new Set(state.conqueredSet);
  const currentCheck = Math.min(P_TOTAL, checkedCount + 1);
  const pending = pendingQuizCount(state);
  const [focused, setFocused] = useState(currentCheck);
  const [popover, setPopover] = useState(null); // 말풍선이 열린 걸음 번호
  const stairRef = useRef(null);
  const [contentW, setContentW] = useState(0); // 계단 컨테이너 내부 폭 (A의 최대폭)
  // 스크롤로 다른 걸음이 중앙에 오면 말풍선 닫기
  useEffect(() => { if (popover != null && popover !== focused) setPopover(null); }, [focused]); // eslint-disable-line
  // 컨테이너 너비 측정 → A(선택 4칸 아래) 폭 = 좌우 20px 여백으로 꽉 차게
  useEffect(() => {
    const el = stairRef.current; if (!el) return;
    const update = () => setContentW(el.clientWidth - 40);
    update();
    let ro; if (window.ResizeObserver) { ro = new ResizeObserver(update); ro.observe(el); }
    else window.addEventListener('resize', update);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', update); };
  }, []);
  const stageStateOf = (n) => conquered.has(n) ? 'conquered' : (n <= checkedCount ? 'checked' : (n === currentCheck ? 'current' : 'locked'));
  const scrollAccum = useRef(0);
  const touchY = useRef(null);
  const moveHist = useRef([]);
  const flingRef = useRef(null);
  const clampStage = (p) => Math.max(1, Math.min(P_TOTAL, p));
  const stopFling = () => { if (flingRef.current) { cancelAnimationFrame(flingRef.current); flingRef.current = null; } };
  useEffect(() => stopFling, []);

  const onWheel = (e) => {
    e.preventDefault();
    stopFling();
    scrollAccum.current += e.deltaY;
    const T = 42;
    while (Math.abs(scrollAccum.current) >= T) {
      const dir = scrollAccum.current > 0 ? -1 : 1;
      scrollAccum.current -= (scrollAccum.current > 0 ? T : -T);
      setFocused(p => clampStage(p + dir));
    }
  };
  const onTouchStart = (e) => {
    stopFling();
    touchY.current = e.touches[0].clientY;
    moveHist.current = [{ t: performance.now(), y: touchY.current }];
  };
  const onTouchMove = (e) => {
    if (touchY.current == null) return;
    const y = e.touches[0].clientY;
    moveHist.current.push({ t: performance.now(), y });
    if (moveHist.current.length > 8) moveHist.current.shift();
    const dy = y - touchY.current;
    if (Math.abs(dy) > 36) {
      const dir = dy > 0 ? -1 : 1;
      setFocused(p => clampStage(p + dir));
      touchY.current = y;
    }
  };
  // 손가락을 떼면 속도를 이어받아 관성으로 계속 흐르다 마찰로 멈춤
  const onTouchEnd = () => {
    const h = moveHist.current;
    touchY.current = null;
    if (h.length < 2) return;
    const b = h[h.length - 1];
    const a = h.find(p => b.t - p.t <= 100) || h[0];
    const dt = b.t - a.t || 16;
    let rate = -((b.y - a.y) / dt) * 1000 / P_STRIDE; // 걸음/초
    if (Math.abs(rate) < 7) return;                   // 약한 스와이프는 관성 없음
    rate = Math.max(-55, Math.min(55, rate));
    let last = performance.now();
    let acc = 0;
    const spin = (now) => {
      const d = (now - last) / 1000; last = now;
      acc += rate * d;
      while (Math.abs(acc) >= 1) {
        const dir = acc > 0 ? 1 : -1;
        acc -= dir;
        setFocused(p => clampStage(p + dir));
      }
      rate *= Math.pow(0.045, d);   // 마찰 — 빠르게 감속
      if (Math.abs(rate) > 4) flingRef.current = requestAnimationFrame(spin);
      else flingRef.current = null;
    };
    flingRef.current = requestAnimationFrame(spin);
  };

  const margin = 2;
  const minN = Math.max(1, focused - P_BELOW - margin);
  const maxN = Math.min(P_TOTAL, focused + P_ABOVE + margin);
  const visible = [];
  for (let n = minN; n <= maxN; n++) {
    let st;
    if (conquered.has(n)) st = 'conquered';
    else if (n <= checkedCount) st = 'checked';   // 체크는 됐지만 정복(퀴즈) 안 함
    else if (n === currentCheck) st = 'current';   // 다음에 체크할 걸음
    else st = 'locked';                            // 아직 안 옴
    visible.push({ n, state: st });
  }
  const containerH = P_TOTAL_SLOTS * P_STRIDE - P_SLOT_GAP;

  return (
    <ProtoShell>
      {/* 헤더 */}
      <div style={{ paddingTop: 'env(safe-area-inset-top, 14px)' }}>
        <div style={{
          padding: '14px 20px 10px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h1 style={{
            margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-.03em',
          }}>VocaPo<span style={{ color: VP.accent }}>P</span></h1>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => dispatch({ type: 'OPEN_OVERLAY' })} aria-label="플로팅 학습" style={{
              width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: VP.accentSoft, color: VP.accent, fontFamily: VPFontStack,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}><Icon name="pip" size={18} /></button>
            <span style={{
              padding: '6px 12px', fontSize: 13, fontWeight: 700,
              background: VP.accentSoft, borderRadius: 999, color: VP.accent,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}><Icon name="flame" size={13} /> {state.streak}</span>
            <span style={{
              padding: '6px 12px', fontSize: 13, fontWeight: 700,
              background: VP.accentSoft, borderRadius: 999, color: VP.accent,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}><Icon name="star" size={13} /> {state.points.toLocaleString()}</span>
          </div>
        </div>
        <div style={{ padding: '0 20px 4px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: VP.textSub, fontWeight: 500 }}>
            훑은 <span style={{ color: VP.text, fontWeight: 700 }}>{checkedCount}</span> · 정복 <span style={{ color: VP.accent, fontWeight: 700 }}>{state.conqueredSet.length}</span> <span style={{ color: VP.textMute }}>/ {P_TOTAL}걸음</span>
          </div>
        </div>
      </div>

      <DailyGoalCard state={state} dispatch={dispatch} />

      {state.pausedScreen && (
        <ResumeBanner state={state} dispatch={dispatch} />
      )}

      {!state.pausedScreen && pending > 0 && (
        <ConquerBanner state={state} dispatch={dispatch} pending={pending} />
      )}

      <div
        ref={stairRef}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          padding: '0 20px',
          maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,.25) 5%, black 16%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,.25) 5%, black 16%, black 100%)',
        }}
      >
        <div style={{ position: 'relative', height: '100%' }}>
          {visible.map(s => {
            const rel = s.n - focused;
            const slotIdx = P_CURRENT_SLOT - rel;
            const bottomPos = P_SELECTED_BOTTOM + rel * P_STRIDE;
            const width = rel >= -4 ? `calc(100% - ${(rel + 4) * 28}px)` : '100%';
            const isCenter = rel === 0;
            const isUser = s.n === currentCheck;
            // 가운데 슬롯에서: 현재=체크 시작 / 정복대기=퀴즈 / 그 외=선택만
            const canTap = isCenter && (s.state === 'current' || s.state === 'checked');

            return (
              <ProtoStageRow
                key={s.n}
                stage={s}
                bottom={bottomPos}
                width={width}
                visible={true}
                isCenter={isCenter}
                isUser={isUser}
                onClick={() => {
                  if (popover != null) {            // 말풍선 열림 → 해제 + (다른 버튼이면) 그 버튼을 가운데로 (한 번에)
                    setPopover(null);
                    if (s.n !== focused) setFocused(s.n);
                    return;
                  }
                  if (s.n === focused) {            // 이미 가운데 → 말풍선 열기
                    if (s.state !== 'locked') setPopover(s.n);
                  } else {
                    setFocused(s.n);                // 가운데로 끌어오기만
                  }
                }}
              />
            );
          })}
          <StagePopover stage={popover} stageState={popover!=null?stageStateOf(popover):null} dispatch={dispatch} onClose={() => setPopover(null)} anchorRef={stairRef} />
        </div>
      </div>

      <TabBar active="home" dispatch={dispatch} />
    </ProtoShell>
  );
}

/* ─────────────────────────────────────────────
   걸음 팝오버 — 플래시카드/퀴즈 선택 (듀오링고식 말풍선)
   ───────────────────────────────────────────── */
function popBtn(kind) {
  const base = { width: '100%', height: 44, borderRadius: 12, border: 'none',
    cursor: kind === 'off' ? 'default' : 'pointer', fontFamily: VPFontStack,
    fontSize: 14, fontWeight: 800, letterSpacing: '-.02em',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 8 };
  if (kind === 'card') return { ...base, background: '#fff', color: VP.accentDeep };
  if (kind === 'quiz') return { ...base, background: '#fff', color: VP.accentDeep };
  return { ...base, background: 'rgba(255,255,255,.22)', color: 'rgba(255,255,255,.72)' }; // off(비활성)
}
function StagePopover({ stage, stageState, dispatch, onClose, anchorRef }) {
  if (stage == null) return null;
  const quizOn = stageState === 'checked' || stageState === 'conquered';
  const cardLabel = stageState === 'current' ? '플래시카드' : '플래시카드 다시 보기';
  const sub = stageState === 'current' ? '아직 체크 전이에요'
    : stageState === 'conquered' ? '정복 완료 — 복습할까요?'
    : '체크 완료 · 퀴즈로 정복하세요';
  // 중앙 슬롯(선택된 걸음)의 화면 위치를 기준으로 fixed 배치 + 공간 부족하면 위로 뒤집기
  const c = anchorRef && anchorRef.current && anchorRef.current.getBoundingClientRect();
  const nodeTop = c ? c.bottom - P_SELECTED_BOTTOM - P_SLOT_H : 300;
  const nodeBottom = nodeTop + P_SLOT_H;
  const cx = c ? c.left + c.width / 2 : (window.innerWidth / 2);
  const below = (window.innerHeight - nodeBottom) > 200;
  const POP_W = 238;
  const wrap = below
    ? { top: nodeBottom + 12, transform: 'translateX(-50%)' }
    : { top: nodeTop - 12, transform: 'translateX(-50%) translateY(-100%)' };
  return (
    <>
      <div style={{ position: 'fixed', left: cx, ...wrap, zIndex: 71, width: POP_W }}>
       <div style={{ position: 'relative', animation: 'protoBannerIn .22s cubic-bezier(.2,.9,.3,1.05) both' }}>
        <div style={{ position: 'absolute', [below ? 'top' : 'bottom']: -6, left: '50%', marginLeft: -7, width: 14, height: 14,
          background: VP.accent, transform: below ? 'rotate(45deg)' : 'rotate(225deg)' }} />
        <div style={{ background: VP.accent, borderRadius: 16, padding: '14px 14px 12px', position: 'relative' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-.02em' }}>{stage}걸음</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.85)', marginTop: 2 }}>{sub}</div>
          <button onClick={() => { dispatch({ type: 'START_STAGE', stage }); onClose(); }} style={popBtn('card')}>
            <Icon name="cards" size={16} /> {cardLabel}
          </button>
          <button disabled={!quizOn} onClick={() => { if (quizOn) { dispatch({ type: 'START_QUIZ', stage }); onClose(); } }} style={popBtn(quizOn ? 'quiz' : 'off')}>
            <Icon name={quizOn ? 'pencil' : 'lock'} size={15} /> {quizOn ? '퀴즈' : '퀴즈 (카드 먼저)'}
          </button>
        </div>
       </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   하단 탭바 — 주요 5면 공통 네비게이션
   ───────────────────────────────────────────── */
function TabBar({ active, dispatch }) {
  const items = [
    { key: 'home',     icon: 'mountain',     label: '홈' },
    { key: 'wordbook', icon: 'wordbook',     label: '단어장' },
    { key: 'notes',    icon: 'flame-circle', label: '오답노트' },
    { key: 'stats',    icon: 'chart',        label: '통계' },
    { key: 'settings', icon: 'settings',     label: '설정' },
  ];
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around',
      borderTop: `1px solid ${VP.divider}`, background: VP.bg,
      padding: '6px 6px calc(6px + env(safe-area-inset-bottom, 0px))',
    }}>
      {items.map(it => {
        const on = active === it.key;
        return (
          <button key={it.key} onClick={() => { if (!on) dispatch({ type: 'GOTO', screen: it.key }); }}
            style={{
              flex: 1, minHeight: 48,
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              padding: '6px 0', color: on ? VP.accent : VP.textSub, fontFamily: VPFontStack,
            }}>
            <Icon name={it.icon} size={22} />
            <span style={{ fontSize: 10.5, fontWeight: on ? 800 : 600, color: on ? VP.accent : VP.textSub, letterSpacing: '-.01em' }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   이어하기 알림 배너 — 학습 중 그만뒀을 때 홈에 표시
   ───────────────────────────────────────────── */
function resumeInfo(state) {
  const s = state.pausedScreen;
  const stage = `${state.activeStage}걸음째`;
  if (s === 'preview')   return { label: '단어 미리보기',        sub: `${stage} · 20단어 훑어보기` };
  if (s === 'cardR1')    return { label: '플래시카드',           sub: `${stage} · ${state.cardR1Idx + 1}/${wordsForStage(state.activeStage).length}장` };
  if (s === 'cardR1End') return { label: '플래시카드 2라운드',   sub: `${stage} · ${state.cardR2Queue.length}개 다시 외우기` };
  if (s === 'cardR2')    return { label: '플래시카드 2라운드',   sub: `${stage} · ${state.cardR2Queue.length}개 남음` };
  if (s === 'cardDone')  return { label: '걸음 체크 완료',       sub: `${stage} · 퀴즈로 정복하기` };
  if (s === 'quiz')      return { label: '퀴즈',                 sub: `${stage} · ${state.quizIdx + 1}/${wordsForStage(state.activeStage).length}문제` };
  return { label: '학습', sub: stage };
}

function ResumeBanner({ state, dispatch }) {
  const info = resumeInfo(state);
  return (
    <div style={{ padding: '6px 20px 10px' }}>
      <div role="button" tabIndex={0}
        onClick={() => dispatch({ type: 'RESUME' })}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dispatch({ type: 'RESUME' }); } }}
        style={{
        position: 'relative',
        background: VP.surface,
        borderRadius: 16,
        border: `1px solid ${VP.accentSoft}`,
        boxShadow: `0 1px 0 ${VP.accentSoft} inset, 0 8px 22px ${VP.accent}22`,
        padding: '14px 14px 14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderLeft: `3px solid ${VP.accent}`,
        cursor: 'pointer',
        animation: 'protoBannerIn .42s cubic-bezier(.2,.9,.3,1.05) both',
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: VP.accentSoft, color: VP.accent,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name="play" size={18} /></div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-.02em', color: VP.text }}>
            이어서 학습할까요?
          </div>
          <div style={{
            fontSize: 12, color: VP.textSub, marginTop: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{info.label} · {info.sub}</div>
        </div>

        <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'RESUME' }); }} style={{
          flexShrink: 0,
          height: 36, padding: '0 16px',
          background: VP.accent, color: '#fff',
          border: 'none', borderRadius: 10, cursor: 'pointer',
          fontFamily: VPFontStack, fontWeight: 800, fontSize: 13,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>이어하기 <Icon name="arrow-right" size={14} /></button>

        <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DISMISS_RESUME' }); }} aria-label="닫기" style={{
          position: 'absolute', top: 4, right: 4,
          width: 34, height: 34, padding: 0,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: VP.textMute,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name="x" size={15} /></button>
      </div>
    </div>
  );
}

/* 정복 대기 배너 — 체크는 했지만 퀴즈 안 푼 걸음이 있을 때 */
function ConquerBanner({ state, dispatch, pending }) {
  const next = firstPendingStage(state);
  return (
    <div style={{ padding: '6px 20px 10px' }}>
      <div role="button" tabIndex={0}
        onClick={() => dispatch({ type: 'START_QUIZ' })}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dispatch({ type: 'START_QUIZ' }); } }}
        style={{
          background: VP.surface, borderRadius: 16,
          border: `1px solid ${VP.divider}`,
          padding: '12px 12px 12px 14px',
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
        }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: VP.accentSoft, color: VP.accent,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name="pencil" size={17} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-.02em', color: VP.text }}>
            정복 대기 <span style={{ color: VP.accent }}>{pending}걸음</span>
          </div>
          <div style={{ fontSize: 12, color: VP.textSub, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            체크는 끝났어요 · 퀴즈로 마무리하면 정복 {next ? `· ${next}걸음부터` : ''}
          </div>
        </div>
        <span style={{
          flexShrink: 0, height: 34, padding: '0 14px',
          background: VP.accent, color: '#fff', borderRadius: 10,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontWeight: 800, fontSize: 13,
        }}>퀴즈 <Icon name="arrow-right" size={14} /></span>
      </div>
    </div>
  );
}

/* 데일리 목표 링 — 오늘 학습량 */
function DailyGoalCard({ state, dispatch }) {
  const goal = state.dailyGoal;
  const done = Math.min(state.todayLearned, goal);
  const pct = goal > 0 ? done / goal : 0;
  const reached = state.todayLearned >= goal;
  const r = 17, c = 2 * Math.PI * r;
  return (
    <div style={{ padding: '6px 20px 8px' }}>
      <button onClick={() => dispatch({ type: 'GOTO', screen: 'stats' })} style={{
        width: '100%', background: VP.surface, border: `1px solid ${VP.divider}`,
        borderRadius: 14, padding: '12px 14px', cursor: 'pointer', fontFamily: VPFontStack,
        display: 'flex', alignItems: 'center', gap: 13,
      }}>
        <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
          <svg viewBox="0 0 44 44" width="44" height="44">
            <circle cx="22" cy="22" r={r} stroke={VP.surface2} strokeWidth="5" fill="none" />
            <circle cx="22" cy="22" r={r} stroke={VP.accent} strokeWidth="5" fill="none"
              strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
              transform="rotate(-90 22 22)" strokeLinecap="round" style={{ transition: 'stroke-dashoffset .4s ease' }} />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: reached ? VP.accent : VP.text,
          }}>{reached ? <Icon name="check-bold" size={18} /> : <span style={{ fontSize: 13, fontWeight: 800 }}>{Math.round(pct * 100)}</span>}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-.02em', color: VP.text }}>
            {reached ? '오늘 목표 달성!' : '오늘의 목표'}
          </div>
          <div style={{ fontSize: 12, color: VP.textSub, marginTop: 1 }}>
            단어 <span style={{ color: VP.text, fontWeight: 700 }}>{state.todayLearned}</span> / {goal}개
          </div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '5px 10px', borderRadius: 999,
          background: VP.accentSoft, color: VP.accent, fontSize: 12, fontWeight: 800,
        }}><Icon name="flame" size={13} /> {state.streak}일</span>
      </button>
    </div>
  );
}

/* 데일리 목표 링 끝 */
function ProtoStageRow({ stage, bottom, width, visible, isCenter, isUser, onClick }) {
  const [pressed, setPressed] = useState(false);
  const rowRef = useRef(null);
  const { n, state } = stage;
  const isConquered = state === 'conquered';
  const isChecked = state === 'checked';
  const isCurrent = state === 'current';
  const isLocked = state === 'locked';
  const centerActionable = isCenter && (isCurrent || isChecked); // 체크/퀴즈 시작 가능
  const centerInert = isCenter && !centerActionable;             // 정복완료·미래 — 강조만
  // 중앙에 새로 들어온 순간 살짝 "팝" 스케일로 선택감을 준다 (액션 가능할 때만)
  useEffect(() => {
    if (centerActionable && rowRef.current && rowRef.current.animate) {
      rowRef.current.animate(
        [
          { transform: 'translateY(0) scale(1)' },
          { transform: 'translateY(0) scale(1.07)', offset: .45 },
          { transform: 'translateY(0) scale(1)' },
        ],
        { duration: 300, easing: 'cubic-bezier(.34,1.45,.5,1)' }
      );
    }
  }, [isCenter]);
  let bg, color, shade, border = null, chipBg, chipCol, chipIcon, rightNode = null;
  if (centerActionable) {
    bg = VP.accent; color = '#fff'; shade = VP.accentDeep;
    chipBg = 'rgba(255,255,255,.24)'; chipCol = '#fff'; chipIcon = isChecked ? 'pencil' : 'play';
    rightNode = <span style={{ fontSize: 12, fontWeight: 800 }}>{isChecked ? '퀴즈' : '체크'}</span>;
  } else if (isConquered) {
    bg = VP.accentSoft; color = VP.accentDeep; shade = VP.doneShade;
    chipBg = VP.accent; chipCol = '#fff'; chipIcon = 'check-bold';
    rightNode = <Icon name="check-bold" size={13} color={VP.accentDeep} />;
  } else if (isCurrent) {
    bg = VP.surface; color = VP.accentDeep; shade = VP.accentSoft; border = VP.border;
    chipBg = VP.accentSoft; chipCol = VP.accent; chipIcon = 'play';
    rightNode = <span style={{ fontSize: 11, fontWeight: 800, color: VP.accent }}>오늘</span>;
  } else if (isChecked) {
    bg = VP.surface; color = VP.text; shade = '#E6EAF3'; border = VP.border;
    chipBg = VP.accentSoft; chipCol = VP.accentDeep; chipIcon = 'pencil';
    rightNode = <span style={{ fontSize: 11, fontWeight: 800, color: VP.accentDeep }}>퀴즈</span>;
  } else { // 미래(잠김)
    bg = VP.surface2; color = VP.textMute; shade = '#E3E7F0';
    chipBg = '#E7EBF3'; chipCol = VP.textMute; chipIcon = 'lock';
  }

  const liftBase = 4;
  const lift = pressed ? 0 : liftBase;

  return (
    <div
      ref={rowRef}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => { setPressed(false); }}
      onClick={onClick}
      style={{
        position: 'absolute', boxSizing: 'border-box',
        bottom, right: 0, width, height: P_SLOT_H,
        background: bg, color,
        borderRadius: 12,
        boxShadow: [border ? `inset 0 0 0 1px ${border}` : null, `0 ${lift}px 0 0 ${shade}`].filter(Boolean).join(', '),
        opacity: visible ? 1 : 0,
        transform: `translateY(${liftBase - lift}px)`,
        transformOrigin: 'right center',
        transition: 'bottom .3s cubic-bezier(.2,.85,.3,1.01), width .3s cubic-bezier(.2,.85,.3,1.01), opacity .26s, transform 120ms ease, box-shadow 120ms ease',
        cursor: centerInert ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px',
        fontSize: isCenter ? 14 : 13,
        fontWeight: isCenter ? 700 : 600,
        letterSpacing: '-.02em',
        zIndex: isUser ? 5 : 1,
      }}
    >
      {isUser && (
        <span style={{
          position: 'absolute', left: -1, top: -14, zIndex: 10,
          pointerEvents: 'none', transformOrigin: 'bottom left',
          animation: 'protoMeFlag 2.8s ease-in-out infinite',
        }}>
          {/* 깃대 */}
          <span style={{
            position: 'absolute', left: 0, top: 0, width: 3, height: 36,
            background: VP.flagDeep, borderRadius: 2,
            boxShadow: `0 3px 6px ${VP.flagDeep}40`,
          }} />
          {/* 깃발 천 — 왼쪽 빈 공간으로 펄럭 */}
          <span style={{
            position: 'absolute', left: -30, top: 2, width: 30, height: 19,
            background: VP.flag,
            clipPath: 'polygon(0 50%, 22% 0, 100% 0, 100% 100%, 22% 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 6,
            boxShadow: `0 3px 8px ${VP.flag}55`,
          }}>
            <span style={{ color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: '-.02em' }}>나</span>
          </span>
          {/* 꼭대기 장식 */}
          <span style={{
            position: 'absolute', left: -1.5, top: -3, width: 6, height: 6,
            borderRadius: '50%', background: VP.flagDeep,
          }} />
        </span>
      )}
      <span style={{
        width: isCenter ? 27 : 24, height: isCenter ? 27 : 24, borderRadius: '50%', flexShrink: 0,
        background: chipBg, color: chipCol,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name={chipIcon} size={isCenter ? 15 : 13} color={chipCol} /></span>
      <span style={{ flex: 1, marginLeft: 9 }}>{n}걸음</span>
      {rightNode && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, opacity: isCenter ? 1 : .85 }}>{rightNode}</span>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   2. 미리보기 — 20단어 한 페이지 리스트
   ───────────────────────────────────────────── */
function ProtoPreview({ state, dispatch }) {
  return (
    <ProtoShell
      top={<ProtoTopBar
        onBack={() => dispatch({ type: 'PAUSE' })}
        icon={<Icon name="book-open" size={16} />}
        label={`미리보기 · ${state.activeStage}걸음째`}
      />}
      footer={<ProtoFooter>
        <VPButton variant="accent" onClick={() => dispatch({ type: 'GOTO', screen: 'cardR1' })}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            카드로 시작 <Icon name="arrow-right" size={16} />
          </span>
        </VPButton>
      </ProtoFooter>}
    >
      <div style={{ padding: '0 20px 8px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.025em' }}>이번에 외울 20단어</div>
        <div style={{ fontSize: 13, color: VP.textSub, marginTop: 4 }}>
          가볍게 훑어보기 — 다 외우지 않아도 OK
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 16px' }}>
        {wordsForStage(state.activeStage).map(w => (
          <div key={w.id} style={{
            padding: '12px 14px', marginBottom: 8,
            background: VP.surface, borderRadius: 12,
            display: 'flex', alignItems: 'baseline', gap: 12,
          }}>
            <div style={{ fontSize: 11, color: VP.textMute, fontWeight: 600, width: 28 }}>#{String(w.id).padStart(3, '0')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em' }}>{w.word}</span>
                <span style={{ fontSize: 11, color: VP.textMute, fontStyle: 'italic' }}>{w.pos}</span>
              </div>
              <div style={{ fontSize: 13, color: VP.textSub, marginTop: 2, lineHeight: 1.4 }}>
                {w.meanings.join(' · ')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ProtoShell>
  );
}

/* ─────────────────────────────────────────────
   3. 카드 — 1라운드 (20장) + 2라운드 공통
   ───────────────────────────────────────────── */
function ProtoCardR1({ state, dispatch }) {
  const words = wordsForStage(state.activeStage);
  const word = words[state.cardR1Idx];
  const progress = ((state.cardR1Idx + 1) / words.length) * 100;
  return (
    <FlashCardBase
      round={1}
      progress={progress}
      progressLabel={`${state.cardR1Idx + 1} / ${words.length}`}
      word={word}
      onBack={() => dispatch({ type: 'PAUSE' })}
      onAnswer={(choice) => dispatch({ type: 'CARD_R1_ANSWER', wordId: word.id, choice })}
      onOverlay={() => dispatch({ type: 'OPEN_OVERLAY' })}
    />
  );
}

function ProtoCardR2({ state, dispatch }) {
  const wordId = state.cardR2Queue[0];
  const word = wordsForStage(state.activeStage).find(w => w.id === wordId);
  const initial = state.cardR2InitialIds.length || 1;
  const done = state.cardR2DoneIds.length;
  const remaining = state.cardR2Queue.length;
  const progress = (done / initial) * 100;
  return (
    <FlashCardBase
      round={2}
      progress={progress}
      progressLabel={`남은 ${remaining}`}
      word={word}
      onBack={() => dispatch({ type: 'PAUSE' })}
      onAnswer={(choice) => dispatch({ type: 'CARD_R2_ANSWER', wordId: word.id, choice })}
      onOverlay={() => dispatch({ type: 'OPEN_OVERLAY' })}
    />
  );
}

function FlashCardBase({ round, progress, progressLabel, word, onBack, onAnswer, onOverlay }) {
  const [flipped, setFlipped] = useState(false);
  const [noAnim, setNoAnim] = useState(false);
  const isR2 = round === 2;
  // 단어가 바뀌면 애니메이션 없이 앞면으로
  useEffect(() => {
    setNoAnim(true);
    setFlipped(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setNoAnim(false));
    });
    return () => cancelAnimationFrame(id);
  }, [word && word.id]);
  if (!word) return null;

  const faceStyle = {
    position: 'absolute', inset: 0,
    background: VP.bg,
    border: `1.5px solid ${VP.border}`,
    borderRadius: 24,
    padding: '28px 24px',
    display: 'flex', flexDirection: 'column',
    boxShadow: `0 1px 0 ${VP.cardShade} inset, 0 4px 0 0 ${VP.cardShade}`,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    overflow: 'hidden',
  };

  return (
    <ProtoShell
      top={<ProtoTopBar
        onBack={onBack}
        icon={<Icon name="cards" size={16} />}
        label={isR2 ? '플래시카드 · 2라운드' : '플래시카드'}
        right={progressLabel}
        progress={progress}
        progressColor={isR2 ? VP.accent : VP.text}
        onOverlay={onOverlay}
      />}
      footer={flipped ? (
        <ProtoFooter>
          <div style={{ display: 'flex', gap: 10 }}>
            <VPButton variant="default" style={{ flex: 1 }} onClick={() => onAnswer(isR2 ? 'still' : 'dontknow')}>
              {isR2 ? '아직 어려워요' : '몰라요'}
            </VPButton>
            <VPButton variant="accent" style={{ flex: 1 }} onClick={() => onAnswer('know')}>
              {isR2 ? '기억했어요!' : '알아요'}
            </VPButton>
          </div>
        </ProtoFooter>
      ) : (
        <ProtoFooter>
          <VPButton variant="primary" onClick={() => setFlipped(true)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              뜻 보기 <Icon name="rotate" size={16} />
            </span>
          </VPButton>
        </ProtoFooter>
      )}
    >
      {/* 카드 무대 — 3D 플립 */}
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          flex: 1, margin: '8px 20px 12px',
          perspective: 1400,
          cursor: 'pointer',
          position: 'relative',
        }}>
        <div style={{
          position: 'relative',
          width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: noAnim ? 'none' : 'transform .55s cubic-bezier(.4,.1,.2,1)',
        }}>
          {/* 앞면 */}
          <div style={faceStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 700,
                background: isR2 ? VP.accent : VP.surface, color: isR2 ? '#fff' : VP.textSub,
                borderRadius: 999, letterSpacing: '.02em',
              }}>{isR2 ? '2R · 다시' : '1R'}</span>
              <span style={{ fontSize: 11, color: VP.textMute, fontWeight: 600 }}>#{String(word.id).padStart(3, '0')}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ fontSize: 11, color: VP.textMute, fontStyle: 'italic' }}>{word.pos}</div>
              <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-.03em', textAlign: 'center' }}>{word.word}</div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: VP.textMute, fontSize: 13,
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                border: `1.5px solid ${VP.textMute}`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name="rotate" size={13} /></span>
              탭해서 뒤집기
            </div>
          </div>

          {/* 뒷면 */}
          <div style={{
            ...faceStyle,
            background: VP.surface,
            transform: 'rotateY(180deg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 700,
                background: VP.bg, color: VP.textSub,
                borderRadius: 999, letterSpacing: '.02em',
              }}>뒷면</span>
              <span style={{ fontSize: 11, color: VP.textMute, fontWeight: 600 }}>#{String(word.id).padStart(3, '0')}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 8, minHeight: 0 }}>
              <div>
                <div style={{ fontSize: 11, color: VP.textMute, fontStyle: 'italic', marginBottom: 6 }}>{word.pos}</div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.025em' }}>{word.word}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {word.meanings.map((m, i) => (
                  <div key={i} style={{
                    fontSize: 18, fontWeight: 600,
                    color: VP.text, letterSpacing: '-.02em',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: VP.accent, color: '#fff',
                      fontSize: 10, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>{i + 1}</span>
                    {m}
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 'auto',
                padding: '12px 14px',
                background: VP.bg, borderRadius: 12,
                border: `1px solid ${VP.divider}`,
                fontSize: 14, color: VP.textSub, lineHeight: 1.5, fontStyle: 'italic',
              }}>"{word.ex}"</div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              color: VP.textMute, fontSize: 12, marginTop: 12,
            }}>
              <Icon name="rotate" size={12} /> 탭하면 앞면으로
            </div>
          </div>
        </div>
      </div>
    </ProtoShell>
  );
}

/* ─────────────────────────────────────────────
   4. 카드 1R 종료 → 2R 안내
   ───────────────────────────────────────────── */
function ProtoCardR1End({ state, dispatch }) {
  const count = state.cardR2Queue.length;
  return (
    <ProtoShell
      top={<ProtoTopBar
        onBack={() => dispatch({ type: 'PAUSE' })}
        icon={<Icon name="cards" size={16} />}
        label="플래시카드"
        right="1R 완료"
      />}
      footer={<ProtoFooter>
        <VPButton variant="accent" onClick={() => dispatch({ type: 'START_CARD_R2' })}>
          이제 다 외워볼까요
        </VPButton>
      </ProtoFooter>}
    >
      <div style={{
        flex: 1, padding: '0 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
        textAlign: 'center',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: VP.accentSoft, color: VP.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name="repeat" size={36} /></div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.025em' }}>다 외울 때까지</div>
        <div style={{ fontSize: 15, color: VP.textSub, lineHeight: 1.6, maxWidth: 280 }}>
          방금 <span style={{ color: VP.text, fontWeight: 700 }}>몰라요</span>로 체크한 <span style={{ color: VP.accent, fontWeight: 700 }}>{count}개</span>를<br/>
          기억할 때까지 보여드려요
        </div>
        <div style={{
          padding: '10px 14px',
          background: VP.surface, borderRadius: 12,
          fontSize: 12, color: VP.textSub, fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="lightbulb" size={14} /> 아직 어려운 단어는 다시 등장해요
        </div>
      </div>
    </ProtoShell>
  );
}

/* ─────────────────────────────────────────────
   5. 카드 완료 → 퀴즈
   ───────────────────────────────────────────── */
function ProtoCardDone({ state, dispatch }) {
  const ranR2 = state.cardR2InitialIds.length > 0;
  const stage = state.activeStage;
  return (
    <ProtoShell
      top={<ProtoTopBar
        onBack={() => dispatch({ type: 'GOTO', screen: 'home' })}
        icon={<Icon name="cards" size={16} />}
        label="플래시카드"
        right="체크 완료"
      />}
      footer={<ProtoFooter>
        <VPButton variant="accent" onClick={() => dispatch({ type: 'START_QUIZ', stage })}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="pencil" size={16} /> 퀴즈로 정복하기
          </span>
        </VPButton>
        <div style={{ display: 'flex', gap: 10 }}>
          <VPButton variant="default" style={{ flex: 1 }} onClick={() => dispatch({ type: 'START_STAGE' })}>
            다음 걸음 체크
          </VPButton>
          <VPButton variant="default" style={{ flex: 1 }} onClick={() => dispatch({ type: 'GOTO', screen: 'home' })}>
            홈으로
          </VPButton>
        </div>
      </ProtoFooter>}
    >
      <div style={{
        flex: 1, padding: '0 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
        textAlign: 'center',
      }}>
        <div style={{
          width: 76, height: 76, borderRadius: '50%',
          background: VP.okSoft, color: VP.ok,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name="check" size={38} color={VP.ok} /></div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.025em' }}>{stage}걸음 체크 완료!</div>
          <div style={{ fontSize: 14, color: VP.textSub, marginTop: 6, lineHeight: 1.5 }}>
            20단어를 다 훑었어요. 퀴즈로 정복하거나,<br/>다음 걸음을 바로 이어서 체크해도 돼요.
          </div>
        </div>
        <div style={{
          width: '100%', maxWidth: 300,
          display: 'flex', flexDirection: 'column', gap: 10,
          padding: '14px 16px',
          background: VP.surface, borderRadius: 14,
          textAlign: 'left',
        }}>
          <TrackRow done label="체크" sub={`카드 1R${ranR2 ? ` + 2R ${state.cardR2InitialIds.length}개` : ''} 완료`} />
          <TrackRow label="정복" sub="퀴즈 통과하면 완료 — 안 해도 진행 OK" />
        </div>
      </div>
    </ProtoShell>
  );
}

/* 두 트랙 상태 한 줄 */
function TrackRow({ done, label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <span style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        background: done ? VP.ok : 'transparent',
        border: done ? 'none' : `1.5px dashed ${VP.textMute}`,
        color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>{done ? <Icon name="check-bold" size={14} /> : <Icon name="pencil" size={13} color={VP.textMute} />}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: done ? VP.text : VP.textSub, letterSpacing: '-.02em' }}>{label}</div>
        <div style={{ fontSize: 12, color: VP.textMute, marginTop: 1 }}>{sub}</div>
      </div>
      {done && <span style={{ fontSize: 11, fontWeight: 800, color: VP.okDeep, background: VP.okSoft, padding: '3px 9px', borderRadius: 999 }}>완료</span>}
    </div>
  );
}

function Step({ done, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: done ? 1 : .5 }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        background: done ? VP.text : 'transparent',
        border: done ? 'none' : `1.5px solid ${VP.textMute}`,
        color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>{done && <Icon name="check-bold" size={13} />}</span>
      <span style={{ fontSize: 14, fontWeight: done ? 600 : 500 }}>{label}</span>
    </div>
  );
}

Object.assign(window, {
  ProtoShell, ProtoTopBar, ProtoFooter,
  ProtoHome, TabBar, DailyGoalCard, ResumeBanner, ConquerBanner, resumeInfo, ProtoStageRow, ProtoPreview,
  ProtoCardR1, ProtoCardR2, FlashCardBase,
  ProtoCardR1End, ProtoCardDone, Step, TrackRow,
});
