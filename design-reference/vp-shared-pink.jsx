/* VocaPop Hi-Fi · 공통 디자인 토큰 + 헬퍼 컴포넌트 */

/* 테마 비종속 토큰 (라운드 등) */
const VP_BASE = { rSm: 8, rMd: 12, rLg: 16, rXl: 20, rPill: 999 };

/* 라이트 팔레트 — Pearl White · Primary Pink · Sky · Mint */
const VP_LIGHT = {
  ...VP_BASE,
  bg: '#FCFDFF', surface: '#FFFFFF', surface2: '#F6F8FF',
  text: '#1F2430', textSub: '#697083', textMute: '#C8CEDA',
  border: '#E8ECF5', borderStrong: '#1F2430', divider: '#F1F4FB',
  accent: '#FF5BB8', accentDeep: '#E83FA1', accentSoft: '#FFE3F3',
  flag: '#6C4BFF', flagDeep: '#5536E8',
  violet: '#58C7FF', violetSoft: '#E4F6FF', mint: '#42DFA3', mintSoft: '#E1FAF0',
  ok: '#35C97B', okSoft: '#E6F8EE', okDeep: '#2AA565',
  bad: '#FF5A6E', badSoft: '#FFE7EA', badDeep: '#D43C4F',
  warning: '#FFB84D',
  // 3D 푸시 / 카드 그림자 + 대비색
  onText: '#FFFFFF', textShade: '#0A0E18',
  pushShade: '#D9DEEC', pushRing: '#E1E5F0', cardShade: '#D9DEEC',
  doneShade: '#FFC1DE',
};

/* 다크 팔레트 — 딩크 웰/서페이스, 핀크 액센트 유지 */
const VP_DARK = {
  ...VP_BASE,
  bg: '#14151B', surface: '#1D1F27', surface2: '#262932',
  text: '#F1F3F8', textSub: '#9AA1B2', textMute: '#565E70',
  border: '#2C2F3A', borderStrong: '#F1F3F8', divider: '#23262F',
  accent: '#FF5BB8', accentDeep: '#FF82CB', accentSoft: '#3A1E30',
  flag: '#9D86FF', flagDeep: '#7B5CFF',
  violet: '#58C7FF', violetSoft: '#1A2E3A', mint: '#42DFA3', mintSoft: '#173529',
  ok: '#3BD587', okSoft: '#15301F', okDeep: '#27A767',
  bad: '#FF6B7D', badSoft: '#3A1E22', badDeep: '#C94454',
  warning: '#FFB84D',
  onText: '#15161B', textShade: '#B7BCC8',
  pushShade: '#0A0C11', pushRing: '#333845', cardShade: '#0A0C11',
  doneShade: '#5A2A45',
};

/* 라이브 토큰 — 테마 전환 시 이 객체를 제자리 변이(참조 유지) */
const VP = { ...VP_LIGHT };
function applyTheme(dark) {
  Object.assign(VP, dark ? VP_DARK : VP_LIGHT);
}

const VPFontStack = `'Pretendard', 'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;

/* 폰 스크린 — 깔끔한 모바일 프레임 (베젤 없음, 그림자만) */
function VPScreen({ children, statusBar = true }) {
  return (
    <div style={{
      width: 390,
      height: 844,
      background: VP.bg,
      borderRadius: 32,
      boxShadow: '0 1px 0 rgba(0,0,0,.04), 0 12px 32px rgba(17,17,17,.06)',
      overflow: 'hidden',
      fontFamily: VPFontStack,
      color: VP.text,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {statusBar && <VPStatusBar />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

function VPStatusBar() {
  return (
    <div style={{
      height: 44,
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 15,
      fontWeight: 600,
      letterSpacing: '-.02em',
      color: VP.text,
      flexShrink: 0,
    }}>
      <span>9:41</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 13 }}>●●●●</span>
        <span style={{ fontSize: 13 }}>📶</span>
        <span style={{
          width: 24, height: 11, border: `1.5px solid ${VP.text}`, borderRadius: 3,
          position: 'relative', display: 'inline-block',
        }}>
          <span style={{
            position: 'absolute', inset: 1.5, background: VP.text, borderRadius: 1,
          }} />
        </span>
      </div>
    </div>
  );
}

/* 상단 헤더 — ✕ + 라벨(아이콘 + 텍스트) + 우측(진행도/카운트) */
function VPTopBar({ left = '✕', label, labelIcon, right, onlyLeft = false, leftIsCheck = false }) {
  return (
    <div style={{
      padding: '8px 20px 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexShrink: 0,
    }}>
      <button style={{
        width: 28, height: 28, border: 'none', background: 'transparent',
        cursor: 'pointer', fontSize: 18, color: VP.text, padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{left}</button>
      {!onlyLeft && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, marginLeft: 4 }}>
            {labelIcon && <span style={{ fontSize: 16 }}>{labelIcon}</span>}
            {label && <span style={{ fontSize: 15, fontWeight: 500, color: VP.textSub, letterSpacing: '-.02em' }}>{label}</span>}
          </div>
          <span style={{ fontSize: 15, fontWeight: 500, color: VP.textSub, letterSpacing: '-.02em' }}>{right}</span>
        </>
      )}
    </div>
  );
}

/* 페이지 타이틀 */
function VPTitle({ children, sub }) {
  return (
    <div style={{ padding: '0 24px 20px' }}>
      <h1 style={{
        margin: 0,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: '-.025em',
        lineHeight: 1.3,
        color: VP.text,
      }}>{children}</h1>
      {sub && (
        <p style={{
          margin: '6px 0 0',
          fontSize: 14,
          color: VP.textSub,
          letterSpacing: '-.02em',
        }}>{sub}</p>
      )}
    </div>
  );
}

/* 풀너비 풀폭 버튼 */
function VPButton({ children, variant = 'default', size = 'lg', icon, style = {}, full = true, onClick, disabled = false }) {
  const sizes = {
    lg: { height: 56, fontSize: 16, radius: 14, padX: 20 },
    md: { height: 48, fontSize: 15, radius: 12, padX: 18 },
    sm: { height: 40, fontSize: 14, radius: 10, padX: 14 },
  };
  const sz = sizes[size];

  // 3D Push — bg + shade(아래 단) 한 쌍
  const variants = {
    default:  { bg: VP.bg,      color: VP.text, shade: VP.pushShade,        weight: 700, ring: VP.pushRing },
    primary:  { bg: VP.text,    color: VP.onText, shade: VP.textShade,       weight: 800 },
    accent:   { bg: VP.accent,  color: '#fff',  shade: VP.accentDeep,      weight: 800 },
    ghost:    { bg: 'transparent', color: VP.text, shade: 'transparent',   weight: 600 },
    soft:     { bg: VP.surface, color: VP.text, shade: VP.pushShade,        weight: 700, ring: VP.pushRing },
    selected: { bg: VP.bg,      color: VP.text, shade: VP.borderStrong,    weight: 700, ring: VP.borderStrong },
    ok:       { bg: VP.ok,      color: '#fff',  shade: VP.okDeep,          weight: 800 },
    bad:      { bg: VP.bad,     color: '#fff',  shade: VP.badDeep,         weight: 800 },
  };
  const v = variants[variant];

  const [pressed, setPressed] = React.useState(false);
  const liftBase = variant === 'ghost' ? 0 : 5;
  const isDisabled = false;
  const lift = pressed ? 0 : liftBase;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
      width: full ? '100%' : 'auto',
      height: sz.height,
      borderRadius: sz.radius,
      background: v.bg,
      color: v.color,
      border: 'none',
      fontSize: sz.fontSize,
      fontWeight: v.weight,
      letterSpacing: '-.02em',
      fontFamily: VPFontStack,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: `0 ${sz.padX}px`,
      boxShadow: [
        v.ring ? `inset 0 0 0 1.5px ${v.ring}` : null,
        liftBase ? `0 ${lift}px 0 0 ${v.shade}` : null,
      ].filter(Boolean).join(', ') || 'none',
      transform: `translateY(${liftBase - lift}px)`,
      transition: 'transform 80ms ease, box-shadow 80ms ease',
      ...style,
    }}>
      {icon && <span style={{ fontSize: sz.fontSize + 2 }}>{icon}</span>}
      {children}
    </button>
  );
}

/* 가로 진행도 */
function VPProgress({ value = 0, height = 4, color = VP.accent, track = VP.surface2 }) {
  return (
    <div style={{
      width: '100%', height, background: track, borderRadius: height / 2, overflow: 'hidden',
    }}>
      <div style={{
        width: `${value}%`, height: '100%', background: color,
        transition: 'width .3s ease',
      }} />
    </div>
  );
}

/* 작은 칩 (필터/태그) */
function VPChip({ children, active = false, accent = false, style = {} }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '6px 12px',
      fontSize: 13,
      fontWeight: 500,
      letterSpacing: '-.02em',
      borderRadius: VP.rPill,
      background: active ? VP.text : (accent ? VP.accentSoft : VP.surface),
      color: active ? '#fff' : (accent ? VP.accent : VP.text),
      border: 'none',
      fontFamily: VPFontStack,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      ...style,
    }}>{children}</span>
  );
}

/* 단어 점 표시 (헷갈린 횟수) */
function VPDots({ count = 0, max = 5, size = 6 }) {
  if (count === 0) {
    return (
      <span style={{
        width: size, height: size, borderRadius: '50%',
        border: `1px solid ${VP.textMute}`, display: 'inline-block',
      }} />
    );
  }
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: Math.min(count, max) }).map((_, i) => (
        <span key={i} style={{
          width: size, height: size, borderRadius: '50%',
          background: VP.accent, display: 'inline-block',
        }} />
      ))}
    </span>
  );
}

/* 체크 아이콘 (체크된 단어 표시) */
function VPCheck({ on = false, size = 24 }) {
  if (on) {
    return (
      <span style={{
        width: size, height: size, borderRadius: 6,
        background: VP.text, color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}><Icon name="check-bold" size={size * 0.62} /></span>
    );
  }
  return (
    <span style={{
      width: size, height: size, borderRadius: 6,
      border: `1.5px solid ${VP.border}`,
      display: 'inline-block', flexShrink: 0,
    }} />
  );
}

/* 라벨 텍스트 (상단 카테고리 라벨) */
function VPLabelIcon({ icon, text }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 14,
      fontWeight: 500,
      color: VP.textSub,
      letterSpacing: '-.02em',
    }}>
      {icon && <span>{icon}</span>}
      {text}
    </span>
  );
}

Object.assign(window, { VP, VP_LIGHT, VP_DARK, applyTheme, VPFontStack, VPScreen, VPStatusBar, VPTopBar, VPTitle, VPButton, VPProgress, VPChip, VPDots, VPCheck, VPLabelIcon });
