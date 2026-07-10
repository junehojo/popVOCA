/* VocaPoP Prototype · 단어장(단어 + 즐겨찾기) & 오답노트(틀린 단어) */

/* ─────────────────────────────────────────────
   단어장 — 학습한 단어 + 즐겨찾기(★)만
   ───────────────────────────────────────────── */
function ProtoWordbook({ state, dispatch }) {
  const [filter, setFilter] = useState('all'); // all | fav | unknown
  const [query, setQuery] = useState('');

  const allWords = PROTO_WORDS;
  const favIds = state.checkedIds;
  const unknownIds = state.unknownIds;
  const knownIds = state.knownIds;

  let words = allWords;
  if (filter === 'fav') words = words.filter(w => favIds.includes(w.id));
  else if (filter === 'unknown') words = words.filter(w => unknownIds.includes(w.id));
  else if (filter === 'known') words = words.filter(w => knownIds.includes(w.id));

  if (query.trim()) {
    const q = query.toLowerCase();
    words = words.filter(w =>
      w.word.toLowerCase().includes(q) ||
      w.meanings.some(m => m.includes(q))
    );
  }

  const favCount = favIds.length;
  const unknownCount = unknownIds.length;
  const knownCount = knownIds.length;

  return (
    <ProtoShell>
      <div style={{ paddingTop: 'env(safe-area-inset-top, 14px)' }}>
        <div style={{
          padding: '14px 20px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-.025em' }}>단어장</h1>
            <span style={{
              fontSize: 11, fontWeight: 700, color: VP.accent,
              background: VP.accentSoft, padding: '3px 9px', borderRadius: 999,
            }}>{state.checkedCount + 1}걸음째</span>
          </div>
          <span style={{ fontSize: 13, color: VP.textSub, fontWeight: 600 }}>{allWords.length}개</span>
        </div>

        {/* 검색 */}
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{
            background: VP.surface,
            borderRadius: 12,
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon name="search" size={16} color={VP.textSub} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="단어 또는 뜻 검색"
              style={{
                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                fontSize: 15, color: VP.text, fontFamily: VPFontStack,
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: VP.textSub, padding: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name="x" size={14} /></button>
            )}
          </div>
        </div>

        {/* 필터 칩 — 전체 / 즐겨찾기 / 몰라요 */}
        <div style={{ padding: '0 20px 4px', display: 'flex', gap: 6 }}>
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            전체 {allWords.length}
          </FilterChip>
          <FilterChip active={filter === 'fav'} onClick={() => setFilter('fav')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name={filter === 'fav' ? 'star' : 'star-line'} size={12} /> 즐겨찾기 {favCount}
            </span>
          </FilterChip>
          <FilterChip active={filter === 'known'} accentOk onClick={() => setFilter('known')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="check" size={12} /> 알아요 {knownCount}
            </span>
          </FilterChip>
          <FilterChip active={filter === 'unknown'} accentBad onClick={() => setFilter('unknown')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="x" size={12} /> 몰라요 {unknownCount}
            </span>
          </FilterChip>
        </div>

        {/* 스와이프 안내 */}
        <div style={{ padding: '4px 20px 12px' }}>
          <div style={{
            fontSize: 11.5, color: VP.textMute, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="grip" size={12} color={VP.textMute} />
            카드처럼 — <span style={{ color: VP.bad, fontWeight: 800 }}>← 몰라요</span> / <span style={{ color: VP.okDeep, fontWeight: 800 }}>알아요 →</span> 밀어 표시
          </div>
        </div>
      </div>

      {/* 리스트 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px calc(16px + env(safe-area-inset-bottom, 0px))' }}>
        {words.length === 0 ? (
          <WordbookEmpty filter={filter} query={query} />
        ) : (
          words.map(w => (
            <WordbookRow
              key={w.id}
              word={w}
              isFav={favIds.includes(w.id)}
              isUnknown={unknownIds.includes(w.id)}
              isKnown={knownIds.includes(w.id)}
              onToggleFav={() => dispatch({ type: 'TOGGLE_CHECK', wordId: w.id })}
              onMarkUnknown={(value) => dispatch({ type: 'MARK_UNKNOWN', wordId: w.id, value })}
              onOpen={() => dispatch({ type: 'OPEN_DETAIL', wordId: w.id })}
            />
          ))
        )}
      </div>

      <TabBar active="wordbook" dispatch={dispatch} />
    </ProtoShell>
  );
}

function FilterChip({ children, active, accent, accentBad, accentOk, onClick }) {
  let bg, color, ring;
  if (active && accentBad) { bg = VP.bad; color = '#fff'; ring = null; }
  else if (active && accentOk) { bg = VP.ok; color = '#fff'; ring = null; }
  else if (active && accent) { bg = VP.accent; color = '#fff'; ring = null; }
  else if (active) { bg = VP.text; color = '#fff'; ring = null; }
  else { bg = VP.bg; color = VP.textSub; ring = VP.border; }
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px',
      fontSize: 13, fontWeight: 700, letterSpacing: '-.01em',
      borderRadius: 999,
      background: bg, color,
      border: ring ? `1.5px solid ${ring}` : 'none',
      cursor: 'pointer',
      fontFamily: VPFontStack,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>{children}</button>
  );
}

function WordbookRow({ word, isFav, isUnknown, isKnown, onToggleFav, onMarkUnknown, onOpen }) {
  const [dx, setDx] = useState(0);
  const [grabbing, setGrabbing] = useState(false);
  const sw = useRef(null);
  const SWIPE_TH = 56;

  const onDown = (e) => {
    sw.current = { x: e.clientX, y: e.clientY, moved: 0, active: true };
    setGrabbing(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const onMove = (e) => {
    const s = sw.current; if (!s || !s.active) return;
    const ddx = e.clientX - s.x, ddy = e.clientY - s.y;
    s.moved = Math.max(s.moved, Math.abs(ddx), Math.abs(ddy));
    // 세로 스크롤이 더 크면 스와이프 무시
    if (Math.abs(ddy) > Math.abs(ddx) + 6) { setDx(0); return; }
    setDx(Math.max(-120, Math.min(120, ddx)));
  };
  const onUp = (e) => {
    const s = sw.current; if (!s || !s.active) return;
    s.active = false;
    setGrabbing(false);
    const ddx = e.clientX - s.x;
    if (ddx > SWIPE_TH) onMarkUnknown(false);        // 오른쪽 → 알아요
    else if (ddx < -SWIPE_TH) onMarkUnknown(true);   // 왼쪽 → 몰라요
    else if (s.moved < 8) onOpen();                  // 탭 → 상세
    setDx(0);
  };

  const opUnknown = Math.min(Math.max(-dx / 70, 0), 1); // 왼쪽 끌기 = 몰라요
  const opKnow = Math.min(Math.max(dx / 70, 0), 1);      // 오른쪽 끌기 = 알아요

  return (
    <div style={{ position: 'relative', marginBottom: 8, borderRadius: 12, overflow: 'hidden' }}>
      {/* 뒤 배경 — 밀어낸 방향을 색으로 흔트 */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        background: dx < 0 ? VP.badSoft : (dx > 0 ? VP.okSoft || VP.surface2 : 'transparent'),
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px', pointerEvents: 'none',
      }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: VP.okDeep, opacity: opKnow }}>알아요</span>
        <span style={{ fontSize: 13, fontWeight: 900, color: VP.bad, opacity: opUnknown, marginLeft: 'auto' }}>몰라요</span>
      </div>

      {/* 앞 카드 — 끌릴 수 있고, 몰라요면 빨간 외곽 + 완드 틴트 */}
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          position: 'relative',
          padding: '12px 6px 12px 14px',
          background: isUnknown ? VP.badSoft : (isKnown ? (VP.okSoft || VP.surface) : VP.surface),
          borderRadius: 12,
          border: isUnknown ? `1.5px solid ${VP.bad}` : (isKnown ? `1.5px solid ${VP.ok}` : `1.5px solid transparent`),
          display: 'flex', alignItems: 'center', gap: 6,
          transform: `translateX(${dx}px)`,
          transition: grabbing ? 'none' : 'transform .22s cubic-bezier(.3,.8,.4,1), background .18s ease, border-color .18s ease',
          touchAction: 'pan-y', cursor: grabbing ? 'grabbing' : 'grab',
        }}>
        {/* 좌측 상태 막대 — 몰라요(빨강)/알아요(초록) */}
        {(isUnknown || isKnown) && (
          <span style={{
            position: 'absolute', left: 0, top: 8, bottom: 8, width: 3,
            background: isUnknown ? VP.bad : VP.ok, borderRadius: 999,
          }} />
        )}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, fontSize: 11, color: VP.textMute, fontWeight: 600 }}>
            #{String(word.id).padStart(3, '0')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em', color: VP.text }}>{word.word}</span>
              <span style={{ fontSize: 11, color: VP.textMute, fontStyle: 'italic' }}>{word.pos}</span>
              {isUnknown && (
                <span style={{
                  fontSize: 10, fontWeight: 800, color: VP.bad,
                  background: VP.surface, padding: '2px 7px', borderRadius: 999,
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                }}><Icon name="x" size={9} /> 몰라요</span>
              )}
              {isKnown && !isUnknown && (
                <span style={{
                  fontSize: 10, fontWeight: 800, color: VP.okDeep,
                  background: VP.surface, padding: '2px 7px', borderRadius: 999,
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                }}><Icon name="check" size={9} color={VP.okDeep} /> 알아요</span>
              )}
            </div>
            <div style={{
              fontSize: 13, color: VP.textSub, marginTop: 2, lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {word.meanings.join(' · ')}
            </div>
          </div>
        </div>

        <span onPointerDown={(e) => e.stopPropagation()} style={{ flexShrink: 0, display: 'inline-flex' }}>
          <SpeakButton text={word.word} size={36} />
        </span>

        {/* 즐겨찾기 토글 */}
        <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onToggleFav(); }} aria-label="즐겨찾기 토글" style={{
          width: 38, height: 38,
          background: isFav ? VP.accentSoft : 'transparent',
          color: isFav ? VP.accent : VP.textMute,
          border: 'none', borderRadius: 10, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: 0, flexShrink: 0,
        }}>
          <Icon name={isFav ? 'star' : 'star-line'} size={20} />
        </button>
      </div>
    </div>
  );
}

function WordbookEmpty({ filter, query }) {
  // 단어장 '전체'는 항상 모든 단어가 들어 있어 비지 않는다.
  // 빈 상태가 나오는 경우는 ① 검색 결과 없음 ② 즐겨찾기 0개 둘뿐.
  if (query) {
    return <ListEmpty title="검색 결과 없음" sub={`'${query}'에 해당하는 단어가 없어요`} icon="search" />;
  }
  if (filter === 'unknown') {
    return (
      <ListEmpty
        title="몰라요로 표시한 단어가 없어요"
        sub="카드에서 몰라요를 누르거나, 단어를 왼쪽으로 밀면 여기 모여요"
        icon="x"
      />
    );
  }
  if (filter === 'known') {
    return (
      <ListEmpty
        title="알아요로 표시한 단어가 없어요"
        sub="카드에서 알아요를 누르거나, 단어를 오른쪽으로 밀면 여기 모여요"
        icon="check"
      />
    );
  }
  return (
    <ListEmpty
      title="즐겨찾기한 단어가 없어요"
      sub="단어 오른쪽 ★ 버튼을 눌러 자주 볼 단어를 모아보세요"
      icon="star-line"
    />
  );
}

/* ─────────────────────────────────────────────
   오답노트 — 퀴즈에서 틀린 단어만 자동 수집
   ───────────────────────────────────────────── */
function ProtoNotes({ state, dispatch }) {
  const [query, setQuery] = useState('');

  // 오답노트 = 퀴즈에서 틀린 단어만 (+ 수동 추가, 제거한 건 빼기)
  const noteIds = useMemo(() => {
    const set = new Set(state.hardIds);
    Object.entries(state.quizResults).forEach(([id, r]) => { if (r === 'wrong') set.add(Number(id)); });
    state.dismissedNoteIds.forEach(id => set.delete(id));
    return set;
  }, [state.hardIds, state.quizResults, state.dismissedNoteIds]);

  // 모든 오답은 퀴즈 출처 (빨강)
  const QUIZ_META = { full: '퀴즈 오답', icon: 'x', color: VP.bad, soft: VP.badSoft, deep: VP.badDeep };

  const countOf = (id) => state.wrongCounts[id] || 1;
  const allWords = PROTO_WORDS.filter(w => noteIds.has(w.id));

  let words = allWords;
  if (query.trim()) {
    const q = query.toLowerCase();
    words = words.filter(w =>
      w.word.toLowerCase().includes(q) || w.meanings.some(m => m.includes(q))
    );
  }
  // 자주 틀린 단어가 위로
  words = [...words].sort((a, b) => countOf(b.id) - countOf(a.id));
  const total = noteIds.size;

  return (
    <ProtoShell>
      <div style={{ paddingTop: 'env(safe-area-inset-top, 14px)' }}>
        <div style={{
          padding: '14px 20px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{
              margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-.025em',
              display: 'inline-flex', alignItems: 'center', gap: 7,
            }}>
              <Icon name="flame" size={20} color={VP.accent} /> 오답노트
            </h1>
          </div>
          <span style={{ fontSize: 13, color: VP.accent, fontWeight: 700 }}>{total}개</span>
        </div>

        <div style={{ padding: '0 20px 12px' }}>
          <div style={{ fontSize: 13, color: VP.textSub, lineHeight: 1.45 }}>
            <span style={{ color: VP.bad, fontWeight: 700 }}>퀴즈에서 틀린 단어</span>가 자동으로 모여요. 맞히면 횟수가 줄고, 빼는 건 직접 해요.
          </div>
        </div>

        {/* 복습 시작 — 오답만 모아 퀴즈 */}
        {total > 0 && !query.trim() && (
          <div style={{ padding: '0 20px 12px' }}>
            <VPButton variant="accent" size="md" onClick={() => dispatch({ type: 'START_NOTE_REVIEW' })}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Icon name="repeat" size={17} /> 오답 {total}개 모아 복습하기
              </span>
            </VPButton>
          </div>
        )}

        {/* 검색 */}
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{
            background: VP.surface, borderRadius: 12, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon name="search" size={16} color={VP.textSub} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="오답 단어 검색"
              style={{
                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                fontSize: 15, color: VP.text, fontFamily: VPFontStack,
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: VP.textSub, padding: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name="x" size={14} /></button>
            )}
          </div>
        </div>
      </div>

      {/* 리스트 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px calc(16px + env(safe-area-inset-bottom, 0px))' }}>
        {words.length === 0 ? (
          query
            ? <ListEmpty title="검색 결과 없음" sub={`'${query}'에 해당하는 단어가 없어요`} icon="search" />
            : <ListEmpty
                title="오답노트가 깨끗해요"
                sub="퀴즈에서 틀린 단어가 하나도 없어요. 오늘 학습을 이어가 볼까요?"
                icon="party"
                accent
                cta={{ label: `오늘 한 걸음 내딛기 · ${state.checkedCount + 1}걸음째`, icon: 'play', onClick: () => dispatch({ type: 'START_STAGE' }) }}
              />
        ) : (
          words.map(w => (
            <NoteRow
              key={w.id}
              word={w}
              meta={QUIZ_META}
              wrongCount={countOf(w.id)}
              onDismiss={() => dispatch({ type: 'DISMISS_NOTE', wordId: w.id })}
              onOpen={() => dispatch({ type: 'OPEN_DETAIL', wordId: w.id })}
            />
          ))
        )}
      </div>

      <TabBar active="notes" dispatch={dispatch} />
    </ProtoShell>
  );
}

function NoteRow({ word, meta, wrongCount, onDismiss, onOpen }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const hot = wrongCount >= 3;

  return (
    <div style={{
      marginBottom: 8,
      background: VP.surface,
      borderRadius: 12,
      borderLeft: `3px solid ${meta.color}`,
      overflow: 'hidden',
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 8px 12px 14px' }}>
        <button
          onClick={() => { setOpen(o => !o); setConfirm(false); }}
          style={{
            flex: 1, minWidth: 0,
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: VPFontStack, textAlign: 'left', padding: 0,
          }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em', color: VP.text }}>{word.word}</span>
            <span style={{ fontSize: 11, color: VP.textMute, fontStyle: 'italic' }}>{word.pos}</span>
            <span style={{
              fontSize: 10, fontWeight: 800, color: meta.color,
              background: meta.soft, padding: '2px 7px 2px 6px', borderRadius: 999,
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}><Icon name={meta.icon} size={10} /> {meta.full}</span>
          </div>
          <div style={{
            fontSize: 13, color: VP.textSub, marginTop: 2, lineHeight: 1.4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {word.meanings.join(' · ')}
          </div>
        </button>

        <span style={{
          flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '5px 9px', borderRadius: 999,
          background: hot ? VP.badSoft : VP.surface2,
          color: hot ? VP.bad : VP.textSub,
          fontSize: 12, fontWeight: 800,
        }}>
          <Icon name="x" size={12} />{wrongCount}회
        </span>
        <SpeakButton text={word.word} size={38} />
        <button onClick={() => { setOpen(o => !o); setConfirm(false); }} aria-label="펼치기" style={{
          width: 38, height: 38, flexShrink: 0, padding: 0,
          background: 'transparent', border: 'none', cursor: 'pointer', color: VP.textMute,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name={open ? 'chevron-up' : 'chevron-down'} size={17} /></button>
      </div>

      {/* 펼침 영역 */}
      {open && (
        <div style={{ padding: '0 14px 14px', animation: 'protoFade .18s ease' }}>
          <div style={{
            padding: '10px 12px', marginBottom: 12,
            background: VP.bg, borderRadius: 10, border: `1px solid ${VP.divider}`,
            fontSize: 13, color: VP.textSub, lineHeight: 1.5, fontStyle: 'italic',
          }}>"{word.ex}"</div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{
              fontSize: 12, color: VP.textSub,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <Icon name="flame" size={13} color={VP.accent} />
              지금까지 <span style={{ color: hot ? VP.bad : VP.text, fontWeight: 800 }}>{wrongCount}번</span> 틀렸어요
            </div>
            <button onClick={onOpen} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: VP.accent, fontWeight: 700, fontSize: 12, fontFamily: VPFontStack,
              display: 'inline-flex', alignItems: 'center', gap: 3, padding: 0,
            }}>자세히 보기 <Icon name="chevron-right" size={13} /></button>
          </div>

          {/* 2단계 확인 */}
          {!confirm ? (
            <button onClick={() => setConfirm(true)} style={{
              width: '100%', height: 40,
              background: 'transparent', color: VP.textSub,
              border: `1.5px solid ${VP.border}`, borderRadius: 10, cursor: 'pointer',
              fontFamily: VPFontStack, fontWeight: 700, fontSize: 13,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Icon name="check" size={14} /> 다 외웠어요 · 노트에서 빼기
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: 1, fontSize: 13, color: VP.text, fontWeight: 700 }}>정말 뺄까요?</span>
              <button onClick={() => setConfirm(false)} style={{
                height: 38, padding: '0 14px',
                background: 'transparent', color: VP.textSub,
                border: `1.5px solid ${VP.border}`, borderRadius: 10, cursor: 'pointer',
                fontFamily: VPFontStack, fontWeight: 700, fontSize: 13,
              }}>취소</button>
              <button onClick={onDismiss} style={{
                height: 38, padding: '0 16px',
                background: VP.accent, color: '#fff',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                fontFamily: VPFontStack, fontWeight: 800, fontSize: 13,
              }}>네, 뺄게요</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   공통 빈 상태
   ───────────────────────────────────────────── */
function ListEmpty({ title, sub, icon, accent, cta }) {
  return (
    <div style={{
      padding: '60px 20px',
      textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: accent ? VP.accentSoft : VP.surface,
        color: accent ? VP.accent : VP.textMute,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
      }}><Icon name={icon} size={26} /></div>
      <div style={{ fontSize: 16, fontWeight: 700, color: VP.text, letterSpacing: '-.02em' }}>{title}</div>
      <div style={{ fontSize: 13, color: VP.textSub, lineHeight: 1.4 }}>{sub}</div>
      {cta && (
        <div style={{ width: '100%', maxWidth: 236, marginTop: 16 }}>
          <VPButton variant="accent" size="md" onClick={cta.onClick}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              {cta.icon && <Icon name={cta.icon} size={16} />} {cta.label}
            </span>
          </VPButton>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  ProtoWordbook, ProtoNotes, FilterChip,
  WordbookRow, NoteRow, WordbookEmpty, ListEmpty,
});
