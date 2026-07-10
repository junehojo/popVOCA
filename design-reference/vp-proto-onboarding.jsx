/* VocaPoP Prototype · 첫 실행 온보딩 (1회성) */

const ONBOARD_KEY = 'vocapop:proto:onboarded:v1';
const ONBOARD_SLIDES = [
  { icon: 'mountain', title: '한 걸음씩 계단을 올라요', desc: '한 걸음은 단어 20개. 카드와 퀴즈를 모두 통과하면 다음 걸음이 열려요.' },
  { icon: 'cards',    title: '카드로 익히고 퀴즈로 확인', desc: '헷갈리면 다시 보고, 맞히면 통과. 직접 떠올리는 인출 연습으로 오래 기억해요.' },
  { icon: 'flame',    title: '틀린 단어는 오답노트로', desc: '틀린 단어가 자동으로 모여요. 복습해서 직접 빼면 끝. 즐겨찾기는 단어장에 쌓여요.' },
];

function ProtoOnboarding() {
  const [show, setShow] = useState(() => {
    try { return !localStorage.getItem(ONBOARD_KEY); } catch (e) { return true; }
  });
  const [idx, setIdx] = useState(0);
  if (!show) return null;

  const finish = () => {
    try { localStorage.setItem(ONBOARD_KEY, '1'); } catch (e) {}
    setShow(false);
  };
  const last = idx === ONBOARD_SLIDES.length - 1;
  const s = ONBOARD_SLIDES[idx];

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: VP.bg, color: VP.text, fontFamily: VPFontStack,
      display: 'flex', flexDirection: 'column',
      paddingTop: 'env(safe-area-inset-top, 14px)',
      animation: 'protoFade .25s ease',
    }}>
      {/* 건너뛰기 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px' }}>
        <button onClick={finish} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: VP.textSub, fontSize: 14, fontWeight: 600, fontFamily: VPFontStack,
          padding: '8px 10px',
        }}>건너뛰기</button>
      </div>

      {/* 본문 */}
      <div key={idx} style={{
        flex: 1, padding: '0 32px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22,
        textAlign: 'center', animation: 'protoFade .25s ease',
      }}>
        <div style={{
          width: 104, height: 104, borderRadius: 28,
          background: VP.accentSoft, color: VP.accent,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name={s.icon} size={48} /></div>
        <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.25 }}>{s.title}</div>
        <div style={{ fontSize: 15, color: VP.textSub, lineHeight: 1.6, maxWidth: 300 }}>{s.desc}</div>
      </div>

      {/* 점 인디케이터 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 7, padding: '0 0 22px' }}>
        {ONBOARD_SLIDES.map((_, i) => (
          <span key={i} style={{
            width: i === idx ? 22 : 7, height: 7, borderRadius: 999,
            background: i === idx ? VP.accent : VP.border,
            transition: 'width .25s ease, background .25s ease',
          }} />
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: '0 24px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        <VPButton variant="accent" onClick={() => last ? finish() : setIdx(idx + 1)}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {last ? '시작하기' : '다음'} <Icon name="arrow-right" size={16} />
          </span>
        </VPButton>
      </div>
    </div>
  );
}

Object.assign(window, { ProtoOnboarding });
