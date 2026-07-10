/* Supabase 클라이언트 (React Native) — floe/notesync 와 같은 공유 프로젝트.
   publishable(anon) 키는 클라이언트 노출 안전(데이터는 RLS로 보호). 세션은 AsyncStorage 에 저장. */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tlighukhkccuwmmvfuoq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_r4ZyLtRtuNnEjlrPV7QZ2w_V-foGDgP';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,   // RN: URL 세션 감지 끔
    flowType: 'implicit',        // RN엔 WebCrypto 없어 PKCE가 plain 폴백+경고 → 토큰을 프래그먼트로 받는 implicit 사용
  },
});
