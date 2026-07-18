/* VocaPoP 아이콘 — design-reference/vp-icons.jsx 의 SVG를 react-native-svg로 1:1 이식.
   stroke 라인 아이콘(viewBox 24, strokeWidth 1.75, round). 색은 color prop. */
import React from 'react';
import Svg, { Path, Polyline, Polygon, Line, Circle, Rect } from 'react-native-svg';

export function Icon({ name, size = 18, color = '#1F2430', strokeWidth = 1.75 }) {
  const v = { width: size, height: size, viewBox: '0 0 24 24' };
  const k = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    /* 시스템 */
    case 'x': return <Svg {...v}><Path {...k} d="M6 6l12 12M18 6L6 18" /></Svg>;
    case 'check': return <Svg {...v}><Polyline {...k} points="20 6 9 17 4 12" /></Svg>;
    case 'check-bold': return <Svg {...v}><Polyline {...k} strokeWidth={2.5} points="20 6 9 17 4 12" /></Svg>;
    /* 화살표 */
    case 'arrow-up': return <Svg {...v}><Line {...k} x1="12" y1="19" x2="12" y2="5" /><Polyline {...k} points="5 12 12 5 19 12" /></Svg>;
    case 'arrow-down': return <Svg {...v}><Line {...k} x1="12" y1="5" x2="12" y2="19" /><Polyline {...k} points="19 12 12 19 5 12" /></Svg>;
    case 'arrow-left': return <Svg {...v}><Line {...k} x1="19" y1="12" x2="5" y2="12" /><Polyline {...k} points="12 19 5 12 12 5" /></Svg>;
    case 'arrow-right': return <Svg {...v}><Line {...k} x1="5" y1="12" x2="19" y2="12" /><Polyline {...k} points="12 5 19 12 12 19" /></Svg>;
    case 'chevron-up': return <Svg {...v}><Polyline {...k} points="18 15 12 9 6 15" /></Svg>;
    case 'chevron-down': return <Svg {...v}><Polyline {...k} points="6 9 12 15 18 9" /></Svg>;
    case 'chevron-left': return <Svg {...v}><Polyline {...k} points="15 18 9 12 15 6" /></Svg>;
    case 'chevron-right': return <Svg {...v}><Polyline {...k} points="9 18 15 12 9 6" /></Svg>;
    case 'trending-up': return <Svg {...v}><Polyline {...k} points="3 17 9 11 13 15 21 7" /><Polyline {...k} points="14 7 21 7 21 14" /></Svg>;
    /* 잠금 / 재생 */
    case 'lock': return <Svg {...v}><Rect {...k} x="4" y="11" width="16" height="10" rx="2" /><Path {...k} d="M8 11V7a4 4 0 0 1 8 0v4" /></Svg>;
    case 'play': return <Svg {...v}><Polygon {...k} fill={color} points="6 4 20 12 6 20 6 4" /></Svg>;
    case 'play-line': return <Svg {...v}><Polygon {...k} points="6 4 20 12 6 20 6 4" /></Svg>;
    /* 학습 콘텐츠 */
    case 'book': return <Svg {...v}><Path {...k} d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17z" /><Path {...k} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /></Svg>;
    case 'book-open': return <Svg {...v}><Path {...k} d="M2 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15a1 1 0 0 0-1-1H2V5z" /><Path {...k} d="M22 5a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v15a1 1 0 0 1 1-1h9V5z" /></Svg>;
    case 'cards': return <Svg {...v}><Rect {...k} x="7" y="3" width="13" height="17" rx="2.5" /><Path {...k} d="M16 6.5h-1.5A2.5 2.5 0 0 0 12 9v12.5H6A2 2 0 0 1 4 19.5V8" /></Svg>;
    case 'pencil': return <Svg {...v}><Path {...k} d="M12 20h9" /><Path {...k} d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></Svg>;
    case 'letters': return <Svg width={size} height={size} viewBox="0 0 28 24"><Path {...k} d="M2 19l4.5-13 4.5 13" /><Line {...k} x1="3.5" y1="15" x2="9.5" y2="15" /><Path {...k} d="M22 19v-7.5a3 3 0 0 0-6 0v.5" /><Path {...k} d="M22 14.5h-3.5a2.25 2.25 0 0 0 0 4.5H22" /></Svg>;
    /* 액션 / 상태 */
    case 'repeat': return <Svg {...v}><Polyline {...k} points="17 1 21 5 17 9" /><Path {...k} d="M3 11V9a4 4 0 0 1 4-4h14" /><Polyline {...k} points="7 23 3 19 7 15" /><Path {...k} d="M21 13v2a4 4 0 0 1-4 4H3" /></Svg>;
    case 'rotate': return <Svg {...v}><Polyline {...k} points="1 4 1 10 7 10" /><Path {...k} d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></Svg>;
    case 'flame': case 'flame-circle': return <Svg {...v}><Path {...k} d="M12 2s5 5.5 5 10a5 5 0 0 1-10 0c0-1.6.7-3 1.6-4-.2 1.2.2 2.3 1 2.6C9 7.5 12 5 12 2z" /></Svg>;
    case 'star': return <Svg {...v}><Polygon {...k} fill={color} points="12 2 15.1 8.6 22 9.3 16.8 14 18.3 21 12 17.5 5.7 21 7.2 14 2 9.3 8.9 8.6 12 2" /></Svg>;
    case 'star-line': return <Svg {...v}><Polygon {...k} points="12 2 15.1 8.6 22 9.3 16.8 14 18.3 21 12 17.5 5.7 21 7.2 14 2 9.3 8.9 8.6 12 2" /></Svg>;
    /* ★moon 추가: 다크모드 행 아이콘이 star(즐겨찾기와 의미 충돌) → 관례대로 달 아이콘 */
    case 'moon': return <Svg {...v}><Path {...k} d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Svg>;
    case 'sparkle': return <Svg {...v}><Path {...k} d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></Svg>;
    case 'party': return <Svg {...v}><Path {...k} d="M3 21l5-13 8 8-13 5z" /><Path {...k} d="M14 4l1-1M19 5l1.5-1.5M17 9l3 .5M16 13.5l3 2" /></Svg>;
    case 'lightbulb': return <Svg {...v}><Path {...k} d="M9 18h6" /><Path {...k} d="M10 21h4" /><Path {...k} d="M8 14a5 5 0 1 1 8 0c-.7.8-1 1.6-1 2.5V18H9v-1.5c0-.9-.3-1.7-1-2.5z" /></Svg>;
    case 'mountain': return <Svg {...v}><Path {...k} d="M2 21l7-13 4 7 3-4 6 10H2z" /></Svg>;
    case 'pin': return <Svg {...v}><Path fill={color} fillRule="evenodd" clipRule="evenodd" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 0 12 6.4a2.6 2.6 0 0 0 0 5.2z" /></Svg>;
    /* 메뉴 / 탭바 */
    case 'wordbook': return <Svg {...v}><Path {...k} d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17z" /><Path {...k} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><Path {...k} d="M14 2v8l-2.5-2L9 10V2" /></Svg>;
    case 'chart': return <Svg {...v}><Line {...k} x1="4" y1="20" x2="4" y2="10" /><Line {...k} x1="10" y1="20" x2="10" y2="4" /><Line {...k} x1="16" y1="20" x2="16" y2="13" /><Line {...k} x1="22" y1="20" x2="2" y2="20" /></Svg>;
    case 'search': return <Svg {...v}><Circle {...k} cx="11" cy="11" r="7" /><Line {...k} x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>;
    case 'speaker': return <Svg {...v}><Polygon {...k} points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><Path {...k} d="M15.5 8.5a5 5 0 0 1 0 7" /><Path {...k} d="M18.5 5.5a9 9 0 0 1 0 13" /></Svg>;
    case 'settings': return <Svg {...v}><Circle {...k} cx="12" cy="12" r="3" /><Path {...k} d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Svg>;
    case 'pip': return <Svg {...v}><Rect {...k} x="3" y="4" width="18" height="15" rx="2.5" /><Rect x="12" y="11" width="7" height="6" rx="1.5" fill={color} /></Svg>;
    case 'minimize': return <Svg {...v}><Line {...k} x1="6" y1="18" x2="18" y2="18" /></Svg>;
    case 'heart': return <Svg {...v}><Path {...k} d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.5 12 20 12 20z" /></Svg>;
    /* 끌기 손잡이 (단어장 스와이프 안내) — 점 6개 */
    case 'grip': return <Svg {...v}>{[8, 12, 16].map(cy => [9, 15].map(cx => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.4" fill={color} stroke="none" />))}</Svg>;
    /* ★설정 개편용 5종 — 알림 시간(clock)·초기화(trash)·로그아웃(log-out)·비밀번호 표시 토글(eye/eye-off).
       feather 계열 패스를 기존 관례(viewBox 24 / stroke 1.75 / round)로 이식 */
    case 'clock': return <Svg {...v}><Circle {...k} cx="12" cy="12" r="9" /><Polyline {...k} points="12 7 12 12 15.5 14" /></Svg>;
    case 'trash': return <Svg {...v}><Polyline {...k} points="3 6 5 6 21 6" /><Path {...k} d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><Path {...k} d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><Line {...k} x1="10" y1="11" x2="10" y2="17" /><Line {...k} x1="14" y1="11" x2="14" y2="17" /></Svg>;
    case 'log-out': return <Svg {...v}><Path {...k} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><Polyline {...k} points="16 17 21 12 16 7" /><Line {...k} x1="21" y1="12" x2="9" y2="12" /></Svg>;
    case 'eye': return <Svg {...v}><Path {...k} d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><Circle {...k} cx="12" cy="12" r="3" /></Svg>;
    case 'eye-off': return <Svg {...v}><Path {...k} d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94M9.9 5.24A9.12 9.12 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><Line {...k} x1="1" y1="1" x2="23" y2="23" /></Svg>;
    default: return null;
  }
}
