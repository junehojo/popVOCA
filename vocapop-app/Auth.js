/* VocaPoP 로그인/회원가입 — 이메일+비밀번호 (Supabase Auth, floe/notesync 와 같은 계정).
   로그인하면 App.js 의 onAuthStateChange 가 동기화를 시작한다. */
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { VP, ff, ls } from './theme';
import { Icon } from './Icon';
import { VPButton } from './ui';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export default function AuthSheet({ visible, onClose }) {
  const [mode, setMode] = useState('signin');   // signin | signup
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  /* ★보더 추가: 필드가 배경색만으로는 존재감이 약해 버튼과의 시각 위계가 뒤집혀 보였음 */
  const input = {
    backgroundColor: VP.surface2, borderRadius: 12, borderWidth: 1, borderColor: VP.divider,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: VP.text, fontFamily: ff(500), marginTop: 12,
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
      setErr((e && e.message) || '문제가 생겼어요. 다시 시도해 주세요.');
    } finally { setBusy(false); }
  };

  const reset = () => { setEmail(''); setPw(''); setErr(''); setInfo(''); };

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
      setErr((e && e.message) || '구글 로그인에 실패했어요.');
    } finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(8,10,16,0.5)', justifyContent: 'center', paddingHorizontal: 28 }} onPress={onClose}>
          <Pressable onPress={() => {}} style={{ backgroundColor: VP.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: VP.divider }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: VP.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="mountain" size={28} color={VP.accent} />
              </View>
            </View>
            <Text style={{ fontSize: 20, fontFamily: ff(800), color: VP.text, letterSpacing: ls(-0.025, 20), textAlign: 'center', marginTop: 12 }}>
              {mode === 'signup' ? '계정 만들기' : '로그인'}
            </Text>
            <Text style={{ fontSize: 13, color: VP.textSub, textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
              진도·오답노트·복습을 기기 사이에서 동기화해요.
            </Text>

            <View style={{ marginTop: 16 }}>
              <VPButton variant="soft" label="Google로 계속하기" onPress={busy ? undefined : signInWithGoogle} disabled={busy} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: VP.divider }} />
              <Text style={{ marginHorizontal: 10, fontSize: 12, color: VP.textMute, fontFamily: ff(600) }}>또는 이메일로</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: VP.divider }} />
            </View>

            <TextInput value={email} onChangeText={setEmail} placeholder="이메일" placeholderTextColor={VP.textMute}
              autoCapitalize="none" autoCorrect={false} keyboardType="email-address" style={input} />
            <TextInput value={pw} onChangeText={setPw} placeholder="비밀번호" placeholderTextColor={VP.textMute}
              secureTextEntry style={input} />

            {err ? <Text style={{ color: VP.bad, fontSize: 13, marginTop: 10, fontFamily: ff(600), lineHeight: 18 }}>{err}</Text> : null}
            {info ? <Text style={{ color: VP.accentDeep, fontSize: 13, marginTop: 10, fontFamily: ff(600), lineHeight: 18 }}>{info}</Text> : null}

            <View style={{ marginTop: 16 }}>
              <VPButton variant="accent" label={busy ? '잠시만…' : (mode === 'signup' ? '회원가입' : '로그인')} onPress={busy ? undefined : submit} disabled={busy} />
            </View>
            <Pressable onPress={() => { setErr(''); setInfo(''); setMode(mode === 'signup' ? 'signin' : 'signup'); }} hitSlop={8} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: VP.textSub, fontFamily: ff(600) }}>
                {mode === 'signup' ? '이미 계정이 있어요 · 로그인' : '계정이 없어요 · 회원가입'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
