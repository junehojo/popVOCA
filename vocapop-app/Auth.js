/* VocaPoP 로그인/회원가입 — 이메일+비밀번호 (Supabase Auth, floe/notesync 와 같은 계정).
   로그인하면 App.js 의 onAuthStateChange 가 동기화를 시작한다.
   ★중앙 페이드 다이얼로그 → ui.js BottomSheet: 앱의 모든 시트와 모션 문법(340ms 슬라이드업) 통일. */
import React, { useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, ScrollView, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Svg, { Path } from 'react-native-svg';
import { VP, ff, ls } from './theme';
import { Icon } from './Icon';
import { VPButton, BottomSheet } from './ui';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/* ★Supabase 에러 한글화 — 영문 원문 노출은 신뢰를 깎는다. 메시지 패턴 → 행동 가능한 한국어 안내 */
const ERROR_MAP = [
  [/invalid login credentials/i, '이메일 또는 비밀번호가 맞지 않아요'],
  [/already registered|already been registered/i, '이미 가입된 이메일이에요 · 로그인해 보세요'],
  [/at least 6 characters/i, '비밀번호는 6자 이상이어야 해요'],
  [/email not confirmed/i, '메일함에서 인증을 완료해 주세요'],
  [/rate limit|too many requests/i, '잠시 후 다시 시도해 주세요'],
];
const toKo = (e) => {
  const m = (e && e.message) || '';
  for (const [re, ko] of ERROR_MAP) if (re.test(m)) return ko;
  return '문제가 생겼어요 · 잠시 후 다시 시도해 주세요';
};

/* ★구글 브랜드 G 로고 — 외부 이미지 없이 4색 패스 로컬 구현 (신뢰 체인: 진짜 구글 버튼처럼 보여야 탭한다) */
function GoogleLogo({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

/* ★가입 고지용 로컬 문서 — 호스팅 페이지가 없으므로 외부 URL 대신 간단 요약 시트 (전문은 설정 > 정보) */
const AUTH_DOCS = {
  terms: {
    title: '이용약관',
    body: 'popVOCA는 토플 단어 학습 앱이에요. 로그인은 기기 간 동기화를 위한 선택 사항이고, 서비스는 있는 그대로 제공돼요.\n\n전문은 설정 > 정보 > 이용약관에서 볼 수 있어요.',
  },
  privacy: {
    title: '개인정보처리방침',
    body: '수집하는 데이터는 이메일(로그인 시)과 학습 진도(Supabase 동기화)뿐이에요. 동기화에만 쓰고, 광고·추적 목적 수집은 없어요. 설정 > 진행 초기화로 지울 수 있어요.\n\n전문은 설정 > 정보 > 개인정보처리방침에서 볼 수 있어요.',
  },
};

export default function AuthSheet({ visible, onClose }) {
  const [mode, setMode] = useState('signin');   // signin | signup
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [doc, setDoc] = useState(null);   // 'terms' | 'privacy' | null
  /* ★닫힘 애니메이션 동안 문서 내용 유지용 캐시 */
  const lastDoc = useRef(null);
  if (doc) lastDoc.current = doc;
  const d = lastDoc.current ? AUTH_DOCS[lastDoc.current] : null;

  /* ★busy 중엔 닫기 무시(백드롭 탭·팬 포함) — 요청 중 이탈로 상태가 붕 뜨는 것 방지 */
  const requestClose = () => { if (busy) return; onClose(); };

  /* ★보더 추가: 필드가 배경색만으로는 존재감이 약해 버튼과의 시각 위계가 뒤집혀 보였음 */
  const input = {
    backgroundColor: VP.surface2, borderRadius: 12, borderWidth: 1, borderColor: VP.divider,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: VP.text, fontFamily: ff(500),
  };

  const submit = async () => {
    if (!email.trim() || !pw) { setErr('이메일과 비밀번호를 입력하세요.'); return; }
    setErr(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pw });
        if (error) throw error;
        if (!data.session) { setInfo('확인 메일을 보냈어요. 메일 링크를 누른 뒤 로그인하세요.'); setMode('signin'); }
        else { reset(); onClose(); }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) throw error;
        reset(); onClose();
      }
    } catch (e) {
      setErr(toKo(e));
    } finally { setBusy(false); }
  };

  const reset = () => { setEmail(''); setPw(''); setShowPw(false); setErr(''); setInfo(''); };

  /* ★비밀번호 재설정 — 성공/실패와 무관하게 같은 안내(계정 존재 여부 노출 방지) */
  const forgotPw = async () => {
    if (!email.trim()) { setInfo(''); setErr('이메일을 먼저 입력해 주세요'); return; }
    setErr(''); setBusy(true);
    try { await supabase.auth.resetPasswordForEmail(email.trim()); } catch (e) {}
    setBusy(false);
    setInfo('재설정 메일을 보냈어요 — 받은편지함을 확인하세요');
  };

  // 구글 OAuth(웹플로우): 인앱 브라우저로 동의 → vocapop://auth-callback 로 코드 받기 → 세션 교환
  const signInWithGoogle = async () => {
    setErr(''); setInfo(''); setBusy(true);
    try {
      const redirectTo = Linking.createURL('auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type === 'success' && res.url) {
        // implicit 플로우: 토큰이 URL 프래그먼트(#access_token=…&refresh_token=…)로 온다
        const frag = res.url.includes('#') ? res.url.split('#')[1] : '';
        const p = new URLSearchParams(frag);
        const access_token = p.get('access_token');
        const refresh_token = p.get('refresh_token');
        if (access_token && refresh_token) {
          const { error: e2 } = await supabase.auth.setSession({ access_token, refresh_token });
          if (e2) throw e2;
        }
        reset(); onClose();
      }
    } catch (e) {
      setErr(toKo(e));
    } finally { setBusy(false); }
  };

  const busyLabel = mode === 'signup' ? '가입하는 중' : '로그인하는 중';
  const underline = { textDecorationLine: 'underline' };

  return (
    <>
      <BottomSheet visible={visible} onClose={requestClose}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mountain" size={28} color={VP.accent} />
          </View>
        </View>
        <Text style={{ fontSize: 20, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 20), textAlign: 'center', marginTop: 12 }}>
          {mode === 'signup' ? '계정 만들기' : '로그인'}
        </Text>
        {/* ★'오답노트'는 존재하지 않는 기능명 — 실제 가치(백업·이어하기)로 카피 교정 */}
        <Text style={{ fontSize: 13, color: VP.textSub, textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
          진도·헷갈리는 단어·즐겨찾기를 안전하게 백업하고, 다른 기기에서 이어서 학습해요.
        </Text>

        {/* ★구글 브랜드 버튼 — 밝은 면(라이트=흰색) + 4색 G 로고. VP.surface라 다크에서도 대비 유지 */}
        <Pressable onPress={busy ? undefined : signInWithGoogle} disabled={busy}
          accessibilityRole="button" accessibilityLabel="구글로 계속하기" accessibilityState={{ disabled: busy }}
          style={{
            marginTop: 16, height: 52, borderRadius: VP.rMd, borderWidth: 1.5, borderColor: VP.border,
            backgroundColor: VP.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 8, opacity: busy ? 0.4 : 1,
          }}>
          <GoogleLogo size={18} />
          <Text style={{ fontSize: 15, fontFamily: ff(600), color: VP.text }}>구글로 계속하기</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: VP.divider }} />
          {/* ★textMute→textSub: 안내 텍스트 대비 규칙 */}
          <Text style={{ marginHorizontal: 10, fontSize: 12, color: VP.textSub, fontFamily: ff(600) }}>또는 이메일로</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: VP.divider }} />
        </View>

        <TextInput value={email} onChangeText={setEmail} placeholder="이메일" placeholderTextColor={VP.textSub}
          autoCapitalize="none" autoCorrect={false} keyboardType="email-address" style={[input, { marginTop: 12 }]} />
        {/* ★비밀번호 표시 토글(44×44) + '6자 이상' 헬퍼 상시 — 가입 실패를 사전에 예방 */}
        <View style={{ marginTop: 12 }}>
          <TextInput value={pw} onChangeText={setPw} placeholder="비밀번호" placeholderTextColor={VP.textSub}
            secureTextEntry={!showPw} autoCapitalize="none" autoCorrect={false} style={[input, { paddingRight: 48 }]} />
          <Pressable onPress={() => setShowPw(v => !v)} hitSlop={4}
            accessibilityRole="button" accessibilityLabel={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={showPw ? 'eye-off' : 'eye'} size={18} color={VP.textSub} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <Text style={{ flex: 1, fontSize: 12, fontFamily: ff(500), color: VP.textSub }}>6자 이상</Text>
          {mode === 'signin' ? (
            /* ★비밀번호 재설정 진입점 — 로그인 실패 시 유일한 출구. accentAA로 소형 핑크 텍스트 AA 확보 */
            <Pressable onPress={busy ? undefined : forgotPw} hitSlop={8}
              accessibilityRole="button" accessibilityLabel="비밀번호 재설정 메일 보내기"
              style={{ height: 32, justifyContent: 'center' }}>
              <Text style={{ fontSize: 13, fontFamily: ff(600), color: VP.accentAA }}>비밀번호를 잊었나요?</Text>
            </Pressable>
          ) : null}
        </View>

        {err ? <Text style={{ color: VP.bad, fontSize: 13, marginTop: 8, fontFamily: ff(600), lineHeight: 18 }}>{err}</Text> : null}
        {info ? <Text style={{ color: VP.accentDeep, fontSize: 13, marginTop: 8, fontFamily: ff(600), lineHeight: 18 }}>{info}</Text> : null}

        <View style={{ marginTop: 14 }}>
          {/* ★busy: 라벨이 진행형으로 바뀌고 스피너 동반 — '눌렸나?' 불확실성 제거 */}
          <VPButton variant="accent" disabled={busy} onPress={busy ? undefined : submit}
            label={busy ? busyLabel : (mode === 'signup' ? '회원가입' : '로그인')}>
            {busy ? <ActivityIndicator size={Platform.OS === 'android' ? 16 : 'small'} color="#fff" /> : null}
          </VPButton>
        </View>
        {mode === 'signup' ? (
          /* ★가입 고지 — 동의 문구와 문서 진입점(밑줄 탭)을 CTA 바로 아래에 */
          <Text style={{ fontSize: 11, fontFamily: ff(500), color: VP.textSub, textAlign: 'center', marginTop: 10, lineHeight: 16 }}>
            가입하면{' '}
            <Text accessibilityRole="link" onPress={() => setDoc('terms')} style={underline}>이용약관</Text>
            {'·'}
            <Text accessibilityRole="link" onPress={() => setDoc('privacy')} style={underline}>개인정보처리방침</Text>
            에 동의하게 돼요
          </Text>
        ) : null}
        <Pressable onPress={() => { setErr(''); setInfo(''); setMode(mode === 'signup' ? 'signin' : 'signup'); }} hitSlop={8}
          accessibilityRole="button" style={{ marginTop: 14, minHeight: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, color: VP.textSub, fontFamily: ff(600) }}>
            {mode === 'signup' ? '이미 계정이 있어요 · 로그인' : '계정이 없어요 · 회원가입'}
          </Text>
        </Pressable>
      </BottomSheet>

      {/* 약관·방침 요약 시트 — 가입 시트 위에 겹쳐 뜬다 */}
      <BottomSheet visible={!!doc} onClose={() => setDoc(null)}>
        {d ? (
          <>
            <Text style={{ fontSize: 18, fontFamily: ff(700), color: VP.text, letterSpacing: ls(-0.02, 18), marginBottom: 10 }}>{d.title}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              <Text style={{ fontSize: 13, color: VP.textSub, lineHeight: 20 }}>{d.body}</Text>
            </ScrollView>
          </>
        ) : null}
      </BottomSheet>
    </>
  );
}
