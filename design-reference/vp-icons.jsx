/* VocaPoP · SVG 아이콘 세트
   미니멀 stroke 라인 아이콘. 이모지 → <Icon name="..." /> 로 교체.
   사용: <Icon name="flame" size={16} /> · 색은 currentColor 상속 (color: 부모로 제어) */

function Icon({ name, size = 18, color, strokeWidth = 1.75, style = {} }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color || 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: { flexShrink: 0, display: 'inline-block', verticalAlign: '-0.125em', ...style },
  };
  // fill-style icons override stroke
  const filled = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: color || 'currentColor',
    style: { flexShrink: 0, display: 'inline-block', verticalAlign: '-0.125em', ...style },
  };

  switch (name) {
    /* ───── 시스템 ───── */
    case 'x':
      return <svg {...common}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'check':
      return <svg {...common}><polyline points="20 6 9 17 4 12"/></svg>;
    case 'check-bold':
      return <svg {...{...common, strokeWidth: 2.5}}><polyline points="20 6 9 17 4 12"/></svg>;

    /* ───── 화살표 ───── */
    case 'arrow-up':
      return <svg {...common}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
    case 'arrow-down':
      return <svg {...common}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
    case 'arrow-left':
      return <svg {...common}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
    case 'arrow-right':
      return <svg {...common}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
    case 'chevron-up':
      return <svg {...common}><polyline points="18 15 12 9 6 15"/></svg>;
    case 'chevron-down':
      return <svg {...common}><polyline points="6 9 12 15 18 9"/></svg>;
    case 'chevron-left':
      return <svg {...common}><polyline points="15 18 9 12 15 6"/></svg>;
    case 'chevron-right':
      return <svg {...common}><polyline points="9 18 15 12 9 6"/></svg>;
    case 'trending-up':
      return <svg {...common}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>;

    /* ───── 잠금 / 재생 ───── */
    case 'lock':
      return <svg {...common}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    case 'play':
      return <svg {...{...common, fill: color || 'currentColor'}}><polygon points="6 4 20 12 6 20 6 4"/></svg>;
    case 'play-line':
      return <svg {...common}><polygon points="6 4 20 12 6 20 6 4"/></svg>;

    /* ───── 학습 콘텐츠 ───── */
    case 'book':
      return <svg {...common}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg>;
    case 'book-open':
      return <svg {...common}><path d="M2 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15a1 1 0 0 0-1-1H2V5z"/><path d="M22 5a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v15a1 1 0 0 1 1-1h9V5z"/></svg>;
    case 'cards':
      return <svg {...common}><rect x="7" y="3" width="13" height="17" rx="2.5"/><path d="M16 6.5h-1.5A2.5 2.5 0 0 0 12 9v12.5H6A2 2 0 0 1 4 19.5V8"/></svg>;
    case 'pencil':
      return <svg {...common}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>;
    case 'letters': /* Aa */
      return <svg {...{...common, viewBox: '0 0 28 24'}}>
        <path d="M2 19l4.5-13 4.5 13"/>
        <line x1="3.5" y1="15" x2="9.5" y2="15"/>
        <path d="M22 19v-7.5a3 3 0 0 0-6 0v.5"/>
        <path d="M22 14.5h-3.5a2.25 2.25 0 0 0 0 4.5H22"/>
      </svg>;

    /* ───── 액션 / 상태 ───── */
    case 'repeat':
      return <svg {...common}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
    case 'rotate':
      return <svg {...common}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>;
    case 'flame':
      return <svg {...common}><path d="M12 2s5 5.5 5 10a5 5 0 0 1-10 0c0-1.6.7-3 1.6-4-.2 1.2.2 2.3 1 2.6C9 7.5 12 5 12 2z"/></svg>;
    case 'star':
      return <svg {...{...common, fill: color || 'currentColor'}}><polygon points="12 2 15.1 8.6 22 9.3 16.8 14 18.3 21 12 17.5 5.7 21 7.2 14 2 9.3 8.9 8.6 12 2"/></svg>;
    case 'star-line':
      return <svg {...common}><polygon points="12 2 15.1 8.6 22 9.3 16.8 14 18.3 21 12 17.5 5.7 21 7.2 14 2 9.3 8.9 8.6 12 2"/></svg>;
    case 'sparkle':
      return <svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>;
    case 'party': /* 🎉 - party popper */
      return <svg {...common}><path d="M3 21l5-13 8 8-13 5z"/><path d="M14 4l1-1M19 5l1.5-1.5M17 9l3 .5M16 13.5l3 2"/></svg>;
    case 'lightbulb':
      return <svg {...common}><path d="M9 18h6"/><path d="M10 21h4"/><path d="M8 14a5 5 0 1 1 8 0c-.7.8-1 1.6-1 2.5V18H9v-1.5c0-.9-.3-1.7-1-2.5z"/></svg>;
    case 'mountain':
      return <svg {...common}><path d="M2 21l7-13 4 7 3-4 6 10H2z"/></svg>;
    case 'pin': /* 위치 핀 — "여기가 나" */
      return <svg {...{...common, fill: color || 'currentColor', stroke: 'none'}}><path fillRule="evenodd" clipRule="evenodd" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 0 12 6.4a2.6 2.6 0 0 0 0 5.2z"/></svg>;

    /* ───── 메뉴 / 시스템 (탭 바) ───── */
    case 'wordbook': /* 단어장 — 책 + 책갈피 */
      return <svg {...common}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M14 2v8l-2.5-2L9 10V2"/></svg>;
    case 'flame-circle': /* 틀린 단어 — flame */
      return <svg {...common}><path d="M12 2s5 5.5 5 10a5 5 0 0 1-10 0c0-1.6.7-3 1.6-4-.2 1.2.2 2.3 1 2.6C9 7.5 12 5 12 2z"/></svg>;
    case 'chart':
      return <svg {...common}><line x1="4" y1="20" x2="4" y2="10"/><line x1="10" y1="20" x2="10" y2="4"/><line x1="16" y1="20" x2="16" y2="13"/><line x1="22" y1="20" x2="2" y2="20"/></svg>;
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case 'speaker':
      return <svg {...common}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>;
    case 'settings':
      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;

    case 'pip': /* 플로팅(작은 창) */
      return <svg {...common}><rect x="3" y="4" width="18" height="15" rx="2.5"/><rect x="12" y="11" width="7" height="6" rx="1.5" fill={color || 'currentColor'} stroke="none"/></svg>;
    case 'grip': /* 드래그 손잡이 */
      return <svg {...common}><circle cx="9" cy="7" r="1.3" fill={color||'currentColor'} stroke="none"/><circle cx="15" cy="7" r="1.3" fill={color||'currentColor'} stroke="none"/><circle cx="9" cy="12" r="1.3" fill={color||'currentColor'} stroke="none"/><circle cx="15" cy="12" r="1.3" fill={color||'currentColor'} stroke="none"/><circle cx="9" cy="17" r="1.3" fill={color||'currentColor'} stroke="none"/><circle cx="15" cy="17" r="1.3" fill={color||'currentColor'} stroke="none"/></svg>;
    case 'minimize':
      return <svg {...common}><line x1="6" y1="18" x2="18" y2="18"/></svg>;
    case 'heart':
      return <svg {...common}><path d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.5 12 20 12 20z"/></svg>;
    case 'comment':
      return <svg {...common}><path d="M21 11.5a8.5 8.5 0 0 1-12 7.7L3 21l1.8-6A8.5 8.5 0 1 1 21 11.5z"/></svg>;
    case 'share':
      return <svg {...common}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>;

    default:
      return <span style={{ fontSize: size, ...style }}>?</span>;
  }
}

Object.assign(window, { Icon });
