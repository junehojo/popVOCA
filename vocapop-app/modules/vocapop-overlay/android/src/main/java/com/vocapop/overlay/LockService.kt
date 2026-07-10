package com.vocapop.overlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import android.os.SystemClock

/**
 * popVOCA 잠금화면 학습 트리거 — 포그라운드 서비스로 떠서 화면 켜짐(SCREEN_ON / USER_PRESENT)을 듣고,
 * 설정 빈도(intervalMin)에 맞춰 LockCardActivity를 띄운다. (앱의 '다른 앱 위에 표시' 권한이
 * 백그라운드 액티비티 실행 제한을 면제해 잠금화면서도 실행 가능.)
 */
class LockService : Service() {
  private val prefs by lazy { getSharedPreferences("popvoca_lock", Context.MODE_PRIVATE) }
  private var receiver: BroadcastReceiver? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    startForeground(NOTIF_ID, buildNotification())
    receiver = object : BroadcastReceiver() {
      override fun onReceive(c: Context?, i: Intent?) {
        // 화면이 켜질 때(=폰을 깨울 때)만. USER_PRESENT(잠금 푸는 순간)는 안 듣는다 → 쓰는 중엔 안 뜸.
        if (i?.action == Intent.ACTION_SCREEN_ON) maybeShow()
      }
    }
    val f = IntentFilter(Intent.ACTION_SCREEN_ON)
    if (Build.VERSION.SDK_INT >= 34) registerReceiver(receiver, f, Context.RECEIVER_NOT_EXPORTED)
    else registerReceiver(receiver, f)
  }

  private fun maybeShow() {
    if (!prefs.getBoolean("enabled", false)) return
    // 잠금화면이 떠 있을 때만 — 잠금 풀고 폰 쓰는 중엔 절대 안 뜬다
    val km = getSystemService(Context.KEYGUARD_SERVICE) as android.app.KeyguardManager
    if (!km.isKeyguardLocked) return
    val intervalMin = prefs.getInt("intervalMin", 30)
    val now = SystemClock.elapsedRealtime()
    val last = prefs.getLong("lastShown", 0L)
    val minGap = if (intervalMin <= 0) 60_000L else intervalMin * 60_000L // '뜰 때마다'도 최소 1분 간격
    if (last in 1..now && now - last < minGap) return   // last>now = 재부팅으로 클록 리셋 → 무시하고 표시
    prefs.edit().putLong("lastShown", now).apply()
    try {
      val ai = Intent(this, LockCardActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_HISTORY or Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
      startActivity(ai)
    } catch (_: Exception) {}
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

  override fun onDestroy() {
    super.onDestroy()
    try { receiver?.let { unregisterReceiver(it) } } catch (_: Exception) {}
  }

  private fun buildNotification(): Notification {
    val chId = "popvoca_lock"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val ch = NotificationChannel(chId, "잠금화면 학습", NotificationManager.IMPORTANCE_MIN).apply { setShowBadge(false) }
      nm.createNotificationChannel(ch)
    }
    val launch = packageManager.getLaunchIntentForPackage(packageName) ?: Intent()
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    val pi = PendingIntent.getActivity(this, 0, launch, flags)
    val b = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, chId)
      else @Suppress("DEPRECATION") Notification.Builder(this)
    return b.setContentTitle("popVOCA 잠금학습 켜짐")
      .setContentText("화면을 켤 때 단어가 떠요")
      .setSmallIcon(applicationInfo.icon)
      .setContentIntent(pi)
      .setOngoing(true)
      .build()
  }

  companion object { const val NOTIF_ID = 4827 }
}
