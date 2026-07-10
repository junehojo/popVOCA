/* 복습 알림 (로컬) — 듀오링고식. 매일 저녁 8시에 1건만 유지:
   오늘 이미 학습했으면 내일 8시로 미루고, 내용은 헷갈리는 단어 수/스트릭으로 채운다.
   (반복 트리거 대신 '다음 1건'만 걸고 앱이 열릴 때마다 다시 계산 → 학습한 날은 알림 안 옴) */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// 앱이 떠 있는 동안에도 알림이 보이게 (테스트 알림 확인용)
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false }),
});

let channelReady = false;
async function ensureChannel() {
  if (channelReady || Platform.OS !== 'android') return;
  channelReady = true;
  try {
    await Notifications.setNotificationChannelAsync('review', {
      name: '복습 알림', importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch (e) {}
}

/** 알림 권한 확인/요청 (안드13+ 런타임 권한 포함) */
export async function ensureNotifPermission() {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return !!req.granted;
  } catch (e) { return false; }
}

const HOUR = 20;   // 저녁 8시

/** 다음 복습 알림 1건 재예약 (기존 예약 전부 취소 후) */
export async function scheduleReviewReminder({ enabled, studiedToday, confusingCount, streak }) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;
    await ensureChannel();
    const now = new Date();
    const t = new Date(now);
    t.setHours(HOUR, 0, 0, 0);
    if (studiedToday || t <= now) t.setDate(t.getDate() + 1);   // 오늘 했으면(또는 8시 지났으면) 내일
    const body = confusingCount > 0
      ? `헷갈리는 단어 ${confusingCount}개가 기다려요${streak > 0 ? ` · 🔥 ${streak}일 연속 지키기` : ''}`
      : (streak > 0 ? `오늘 한 걸음 — 🔥 ${streak}일 연속을 지켜요!` : '오늘 한 걸음, 20단어면 충분해요');
    await Notifications.scheduleNotificationAsync({
      content: { title: 'popVOCA 복습 시간', body, sound: false },
      trigger: { date: t, channelId: 'review' },
    });
  } catch (e) {}
}

/** 토글 켤 때 즉시 1건 — "알림이 이렇게 와요" 확인용 */
export async function sendTestNotification() {
  try {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: { title: 'popVOCA 알림이 켜졌어요', body: '매일 저녁 8시에 복습을 챙겨드릴게요', sound: false },
      trigger: null,
    });
  } catch (e) {}
}
