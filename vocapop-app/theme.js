/* VocaPoP 디자인 토큰 — design-reference/vp-shared-pink.jsx 의 VP_LIGHT + 다크 팔레트.
   VP 는 게터 객체: 화면들은 VP.xxx 를 렌더 시점에 읽으므로, setTheme(dark) 로 active 만 바꾸면
   다음 렌더에서 전 화면이 자동으로 다크/라이트로 바뀐다 (화면 코드 수정 불필요).
   ⚠️ 모듈 로드 시점에 VP.xxx 를 상수로 캡처하면 안 됨(active 변경에 안 따라옴) — ui.js VARIANTS 는 render-time 으로 옮김. */

/* ★rSheet 추가: 바텀시트 상단 radius가 24/26 혼재였음 — 24 하나로 통일해 토큰화 */
const radii = { rSm: 8, rMd: 12, rLg: 16, rXl: 20, rSheet: 24, rPill: 999 };

const VP_LIGHT = {
  ...radii,
  bg: '#FCFDFF', surface: '#FFFFFF', surface2: '#F6F8FF',
  text: '#1F2430', textSub: '#697083', textMute: '#C8CEDA',
  border: '#E8ECF5', borderStrong: '#1F2430', divider: '#F1F4FB',
  accent: '#FF5BB8', accentDeep: '#E83FA1', accentSoft: '#FFE3F3',
  flag: '#6C4BFF', flagDeep: '#5536E8',
  violet: '#58C7FF', violetSoft: '#E4F6FF', mint: '#42DFA3', mintSoft: '#E1FAF0',
  ok: '#35C97B', okSoft: '#E6F8EE', okDeep: '#2AA565',
  bad: '#FF5A6E', badSoft: '#FFE7EA', badDeep: '#D43C4F', badShade: '#F7AEB6',
  warning: '#FFB84D',
  onText: '#FFFFFF', textShade: '#0A0E18',
  pushShade: '#D9DEEC', pushRing: '#E1E5F0', cardShade: '#D9DEEC',
  doneShade: '#FFC1DE',
};

const VP_DARK = {
  ...radii,
  bg: '#0E1015', surface: '#171A21', surface2: '#1E222B',
  text: '#ECEFF6', textSub: '#9BA3B4', textMute: '#596072',
  border: '#2A2F3A', borderStrong: '#ECEFF6', divider: '#23272F',
  accent: '#FF5BB8', accentDeep: '#FF8AD0', accentSoft: '#2E1F2A',
  flag: '#8B6FFF', flagDeep: '#6C4BFF',
  violet: '#58C7FF', violetSoft: '#16303C', mint: '#42DFA3', mintSoft: '#143026',
  ok: '#3FD589', okSoft: '#152D20', okDeep: '#74E6B1',
  bad: '#FF6B7E', badSoft: '#341F24', badDeep: '#FF9AA6', badShade: '#241319',
  warning: '#FFB84D',
  onText: '#FFFFFF', textShade: '#B8BECD',
  pushShade: '#070809', pushRing: '#2A2F3A', cardShade: '#070809',
  doneShade: '#2E1F2A',
};

let active = VP_LIGHT;

/** 게터 객체 — VP.text 는 항상 현재 active 팔레트에서 읽는다 */
export const VP = {};
Object.keys(VP_LIGHT).forEach((k) => {
  Object.defineProperty(VP, k, { get: () => active[k], enumerable: true, configurable: true });
});

/** App.js 에서 매 렌더 호출: 다크면 active=VP_DARK. 다음 렌더에서 전 화면 반영. */
export function setTheme(dark) { active = dark ? VP_DARK : VP_LIGHT; }
export function isDark() { return active === VP_DARK; }

/* 글자 크기 배율 — applyFontScale.js 가 모든 Text의 fontSize에 곱한다. App.js가 설정값으로 갱신 */
let _fontScale = 1;
export function setFontScale(s) { _fontScale = s || 1; }
export function getFontScale() { return _fontScale; }

/* Pretendard weight(숫자) → 폰트 패밀리 이름.
   RN은 커스텀 폰트의 굵기를 자동 매핑하지 못하므로 weight별 패밀리를 직접 고른다. */
export const FONT = {
  400: 'Pretendard-Regular',
  500: 'Pretendard-Medium',
  600: 'Pretendard-SemiBold',
  700: 'Pretendard-Bold',
  800: 'Pretendard-ExtraBold',
  900: 'Pretendard-Black',
};
export const ff = (w = 400) => FONT[w] || FONT[String(w)] || FONT[400];

/* App.js 의 useFonts 에 넘길 맵 */
export const FONT_ASSETS = {
  'Pretendard-Regular': require('./assets/fonts/Pretendard-Regular.ttf'),
  'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.ttf'),
  'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.ttf'),
  'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.ttf'),
  'Pretendard-ExtraBold': require('./assets/fonts/Pretendard-ExtraBold.ttf'),
  'Pretendard-Black': require('./assets/fonts/Pretendard-Black.ttf'),
};

/* letterSpacing: 웹은 em(폰트크기 비율), RN은 절대 px. 변환 헬퍼.
   예: -.02em on 14px → -0.28 */
export const ls = (em, fontSize) => em * fontSize;

/* #RRGGBB(+#RGB) + 알파(0~1) → 'rgba(r,g,b,a)' 문자열 (형광펜 등 반투명 틴트용). */
export const rgba = (hex, a) => {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h || '000000', 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
