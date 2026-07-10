import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

// 안드로이드에만 존재하는 네이티브 오버레이 모듈. iOS/Expo Go에선 없으므로 안전하게 no-op.
let native: any = null;
try { native = requireNativeModule('VocapopOverlay'); } catch (e) { native = null; }

/** 이 기기에서 "다른 앱 위에 띄우기" 오버레이를 쓸 수 있는지 (안드로이드만 true) */
export function isSupported(): boolean {
  return Platform.OS === 'android' && !!native;
}

/** '다른 앱 위에 표시' 권한 요청. 허용되면 true */
export async function requestOverlayPermission(): Promise<boolean> {
  if (!native) return false;
  return await native.requestPermission();
}

/** 오버레이를 현재 카드 1장으로 띄운다(앱 카드 플로우의 원격 뷰). 시작 시 앱은 배경으로. */
export async function startOverlay(
  word: string, korean: string, pos: string, label: string, pct: number, dark: boolean
): Promise<void> {
  if (!native) return;
  await native.start(word, korean, pos, label, pct, dark);
}

/** 앱이 다음 카드를 밀어줌 — 오버레이가 아래에서 솟아오르며 교체 */
export async function setCard(
  word: string, korean: string, pos: string, label: string, pct: number
): Promise<void> {
  if (!native) return;
  await native.setCard(word, korean, pos, label, pct);
}

/** 플로팅 학습 종료 */
export async function stopOverlay(): Promise<void> {
  if (native) await native.stop();
}

/** 오버레이에서 알아요/몰라요 누를 때마다 호출 — 앱 진도에 반영하려면 구독한다.
 *  반환된 구독의 .remove() 로 해제. iOS/미지원이면 null. */
export function addAnswerListener(
  cb: (e: { choice: 'know' | 'dontknow' }) => void
): { remove: () => void } | null {
  if (!native) return null;
  return native.addListener('onOverlayAnswer', cb);
}

/* ───────── 잠금화면 학습 (LockService + LockCardActivity) ───────── */

/** 잠금화면 학습 지원 여부 (안드로이드만) */
export function isLockSupported(): boolean {
  try { return Platform.OS === 'android' && !!native && !!native.isLockSupported && native.isLockSupported(); }
  catch (e) { return false; }
}

/** 잠금화면 학습 켜기/끄기 + 모드(quiz|flash)/빈도(분, 0=뜰 때마다)/다크 → 서비스 시작·중지 */
export function setLockConfig(enabled: boolean, mode: 'quiz' | 'flash', intervalMin: number, dark: boolean): void {
  if (native && native.setLockConfig) native.setLockConfig(enabled, mode, intervalMin, dark);
}

/** 잠금화면에 보여줄 단어 풀 ([{w,k}]) — 박스 단어 우선 */
export function setLockPool(words: Array<{ w: string; k: string }>): void {
  if (native && native.setLockPool) native.setLockPool(JSON.stringify(words || []));
}

/** 잠금카드 직접 띄우기 (설정 미리보기 / 지금 보기) — 잠금 여부 무관 */
export function showLockCard(): void {
  if (native && native.showLockCard) native.showLockCard();
}

/** 잠금화면서 답한 결과를 가져오고 비운다 → [{w, correct}] */
export function pullLockResults(): Array<{ w: string; correct: boolean }> {
  if (!native || !native.pullLockResults) return [];
  try { return JSON.parse(native.pullLockResults() || '[]'); } catch (e) { return []; }
}

/** 배터리 최적화 제외 요청 (이 앱만 콕 집어) */
export function requestBatteryExemption(): void {
  if (native && native.requestBatteryExemption) native.requestBatteryExemption();
}

/** 배터리 최적화 제외돼 있나 */
export function isBatteryExempt(): boolean {
  if (!native || !native.isBatteryExempt) return true;
  try { return !!native.isBatteryExempt(); } catch (e) { return false; }
}
