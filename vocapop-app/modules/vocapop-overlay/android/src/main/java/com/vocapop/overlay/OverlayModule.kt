package com.vocapop.overlay

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.speech.tts.TextToSpeech
import java.util.Locale
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.abs
import kotlin.math.max

/**
 * popVOCA 플로팅 학습 오버레이 (Android 전용) — 앱 카드 플로우의 "원격 뷰".
 * 앱이 setCard 로 현재 단어를 밀어주고, 스와이프(← 몰라요 / 알아요 →)는 onOverlayAnswer 로 보고한다.
 * → 인앱 플래시카드와 같은 세션을 실시간으로 똑같이 따라간다. 시작 시 앱은 배경으로.
 */
class OverlayModule : Module() {
  private var overlayView: View? = null
  private var wm: WindowManager? = null
  private var params: WindowManager.LayoutParams? = null
  private var tts: TextToSpeech? = null   // 오버레이 발음 듣기(🔊 버튼)

  private fun ensureTts() {
    if (tts != null) return
    try { tts = TextToSpeech(ctx) { ok -> if (ok == TextToSpeech.SUCCESS) try { tts?.language = Locale.US } catch (_: Exception) {} } } catch (_: Exception) {}
  }
  private fun speakWord() {
    try { ensureTts(); tts?.speak(curWord, TextToSpeech.QUEUE_FLUSH, null, "vpov") } catch (_: Exception) {}
  }

  // 현재 카드 + 뷰 참조 (setCard 로 갱신)
  private var curWord = ""; private var curKorean = ""; private var curPos = ""; private var curLabel = ""; private var curPct = 0f
  private var revealed = false
  private var faceRef: LinearLayout? = null
  private var labelRef: TextView? = null
  private var fillRef: View? = null
  private var restRef: View? = null
  private var stampDKRef: TextView? = null
  private var stampKnowRef: TextView? = null

  // VP 토큰 — setColors(dark)
  private var cSurface = 0; private var cBg = 0; private var cSurface2 = 0; private var cBorder = 0
  private var cText = 0; private var cTextSub = 0; private var cTextMute = 0
  private var cAccent = 0; private var cAccentDeep = 0; private var cAccentSoft = 0
  private var cOk = 0; private var cBad = 0

  private fun setColors(dark: Boolean) {
    if (dark) {
      cSurface = Color.parseColor("#171A21"); cBg = Color.parseColor("#0E1015"); cSurface2 = Color.parseColor("#1E222B")
      cBorder = Color.parseColor("#2A2F3A"); cText = Color.parseColor("#ECEFF6"); cTextSub = Color.parseColor("#9BA3B4")
      cTextMute = Color.parseColor("#596072"); cAccent = Color.parseColor("#FF5BB8"); cAccentDeep = Color.parseColor("#FF8AD0")
      cAccentSoft = Color.parseColor("#2E1F2A"); cOk = Color.parseColor("#3FD589"); cBad = Color.parseColor("#FF6B7E")
    } else {
      cSurface = Color.parseColor("#FFFFFF"); cBg = Color.parseColor("#FCFDFF"); cSurface2 = Color.parseColor("#F6F8FF")
      cBorder = Color.parseColor("#E8ECF5"); cText = Color.parseColor("#1F2430"); cTextSub = Color.parseColor("#697083")
      cTextMute = Color.parseColor("#C8CEDA"); cAccent = Color.parseColor("#FF5BB8"); cAccentDeep = Color.parseColor("#E83FA1")
      cAccentSoft = Color.parseColor("#FFE3F3"); cOk = Color.parseColor("#35C97B"); cBad = Color.parseColor("#FF5A6E")
    }
  }

  private val ctx: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No context")

  private fun lockPrefs() = ctx.getSharedPreferences("popvoca_lock", Context.MODE_PRIVATE)

  override fun definition() = ModuleDefinition {
    Name("VocapopOverlay")

    Events("onOverlayAnswer")

    Function("requestPermission") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return@Function true
      if (Settings.canDrawOverlays(ctx)) return@Function true
      val i = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + ctx.packageName)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      ctx.startActivity(i)
      Settings.canDrawOverlays(ctx)
    }

    Function("start") { word: String, korean: String, pos: String, label: String, pct: Double, dark: Boolean ->
      appContext.activityProvider?.currentActivity?.runOnUiThread {
        curWord = word; curKorean = korean; curPos = pos; curLabel = label; curPct = pct.toFloat()
        showOverlay(dark)
      } ?: run { curWord = word; curKorean = korean; curPos = pos; curLabel = label; curPct = pct.toFloat(); showOverlay(dark) }
    }

    Function("setCard") { word: String, korean: String, pos: String, label: String, pct: Double ->
      appContext.activityProvider?.currentActivity?.runOnUiThread { updateCard(word, korean, pos, label, pct.toFloat()) }
    }

    Function("stop") {
      appContext.activityProvider?.currentActivity?.runOnUiThread { removeOverlay() } ?: removeOverlay()
    }

    // ───── 잠금화면 학습 (LockService + LockCardActivity) ─────
    Function("isLockSupported") { Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP }

    Function("setLockConfig") { enabled: Boolean, mode: String, intervalMin: Int, dark: Boolean ->
      lockPrefs().edit().putBoolean("enabled", enabled).putString("mode", mode)
        .putInt("intervalMin", intervalMin).putBoolean("dark", dark).apply()
      val si = Intent(ctx, LockService::class.java)
      if (enabled) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(si) else ctx.startService(si)
      } else {
        ctx.stopService(si)
      }
    }

    Function("setLockPool") { json: String ->
      lockPrefs().edit().putString("pool", json).apply()
    }

    Function("showLockCard") {   // 미리보기/지금 보기 — 잠금 여부 무관하게 카드 띄움
      try {
        val ai = Intent(ctx, LockCardActivity::class.java)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_HISTORY)
        ctx.startActivity(ai)
      } catch (_: Exception) {}
    }

    Function("pullLockResults") {
      val p = lockPrefs()
      val r = p.getString("results", "[]") ?: "[]"
      p.edit().putString("results", "[]").apply()
      r
    }

    Function("requestBatteryExemption") {
      try {
        val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !pm.isIgnoringBatteryOptimizations(ctx.packageName)) {
          val i = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + ctx.packageName))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          ctx.startActivity(i)
        }
      } catch (_: Exception) {}
    }

    Function("isBatteryExempt") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return@Function true
      try {
        val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
        pm.isIgnoringBatteryOptimizations(ctx.packageName)
      } catch (_: Exception) { false }
    }

    OnDestroy {
      removeOverlay()
      try { tts?.shutdown() } catch (_: Exception) {}
      tts = null
    }
  }

  private fun dp(v: Int): Int = (v * ctx.resources.displayMetrics.density).toInt()
  private fun dpf(v: Float): Float = v * ctx.resources.displayMetrics.density

  private fun roundRect(color: Int, radiusDp: Float, strokeDp: Int = 0, strokeColor: Int = Color.TRANSPARENT): GradientDrawable =
    GradientDrawable().apply { cornerRadius = dpf(radiusDp); setColor(color); if (strokeDp > 0) setStroke(dp(strokeDp), strokeColor) }

  private fun splitMeanings(korean: String): List<String> =
    korean.split(";", ",", "·", "/").map { it.trim() }.filter { it.isNotEmpty() }.take(3)

  private fun chip(text: String): TextView = TextView(ctx).apply {
    this.text = text; setTextColor(cAccentDeep); textSize = 12.5f; setTypeface(typeface, Typeface.BOLD)
    background = roundRect(cAccentSoft, 999f); setPadding(dp(9), dp(3), dp(9), dp(3))
  }

  private fun stamp(text: String, color: Int, rot: Float): TextView = TextView(ctx).apply {
    this.text = text; setTextColor(color); textSize = 12f; setTypeface(typeface, Typeface.BOLD)
    background = roundRect(Color.TRANSPARENT, 7f, 2, color); setPadding(dp(8), dp(2), dp(8), dp(2)); rotation = rot; alpha = 0f
  }

  // 현재 cur* 로 면 내용 다시 그림
  private fun renderFace() {
    val face = faceRef ?: return
    face.removeAllViews()
    face.background = roundRect(if (revealed) cSurface2 else cBg, 16f, 1, cBorder)
    if (!revealed) {
      face.addView(TextView(ctx).apply { text = curPos; setTextColor(cTextMute); textSize = 10.5f; setTypeface(typeface, Typeface.ITALIC) })
      face.addView(TextView(ctx).apply {
        text = curWord; setTextColor(cText); textSize = 29f; setTypeface(typeface, Typeface.BOLD); gravity = Gravity.CENTER
      }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(6) })
    } else {
      face.addView(TextView(ctx).apply { text = curWord; setTextColor(cText); textSize = 15f; setTypeface(typeface, Typeface.BOLD) })
      val chips = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER }
      for ((i, m) in splitMeanings(curKorean).withIndex()) {
        chips.addView(chip(m), LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { if (i > 0) leftMargin = dp(5) })
      }
      face.addView(chips, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(10) })
    }
    labelRef?.text = curLabel
    (fillRef?.layoutParams as? LinearLayout.LayoutParams)?.weight = curPct.coerceIn(0f, 1f)
    (restRef?.layoutParams as? LinearLayout.LayoutParams)?.weight = (1f - curPct).coerceIn(0f, 1f)
    fillRef?.requestLayout(); restRef?.requestLayout()
  }

  // 앱이 다음 카드를 밀어줌 → 아래에서 솟아오르며 교체
  private fun updateCard(word: String, korean: String, pos: String, label: String, pct: Float) {
    curWord = word; curKorean = korean; curPos = pos; curLabel = label; curPct = pct; revealed = false
    val face = faceRef ?: return
    renderFace()
    face.translationX = 0f; face.rotation = 0f
    stampDKRef?.alpha = 0f; stampKnowRef?.alpha = 0f
    face.translationY = dpf(34f); face.alpha = 0f
    face.animate().translationY(0f).alpha(1f).setDuration(260).start()
  }

  private fun showOverlay(dark: Boolean) {
    removeOverlay()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(ctx)) return
    setColors(dark)
    revealed = false
    wm = ctx.getSystemService(Context.WINDOW_SERVICE) as WindowManager

    val card = LinearLayout(ctx).apply {
      orientation = LinearLayout.VERTICAL; setPadding(dp(12), dp(10), dp(12), dp(12))
      background = roundRect(cSurface, 22f, 1, cAccentSoft); elevation = dpf(12f)
    }

    val topRow = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
    val grip = TextView(ctx).apply { text = "≡"; setTextColor(cTextMute); textSize = 15f }
    val track = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL; background = roundRect(cSurface2, 999f) }
    val fill = View(ctx).apply { background = roundRect(cAccent, 999f) }; fillRef = fill
    val rest = View(ctx); restRef = rest
    track.addView(fill, LinearLayout.LayoutParams(0, dp(4), 0.05f))
    track.addView(rest, LinearLayout.LayoutParams(0, dp(4), 0.95f))
    val label = TextView(ctx).apply { setTextColor(cTextSub); textSize = 11f; setTypeface(typeface, Typeface.BOLD) }; labelRef = label
    val speakBtn = ImageView(ctx).apply {
      setImageDrawable(speakerIcon(cAccent))
      background = roundRect(cAccentSoft, 999f); setPadding(dp(5), dp(5), dp(5), dp(5)); isClickable = true
      setOnClickListener { speakWord() }
    }
    val closeBtn = TextView(ctx).apply { text = "✕"; setTextColor(cTextMute); textSize = 14f; setPadding(dp(8), dp(2), dp(2), dp(2)); isClickable = true }
    topRow.addView(grip, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { rightMargin = dp(8) })
    topRow.addView(track, LinearLayout.LayoutParams(0, dp(4), 1f))
    topRow.addView(label, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { leftMargin = dp(8) })
    topRow.addView(speakBtn, LinearLayout.LayoutParams(dp(26), dp(26)).apply { leftMargin = dp(6) })
    topRow.addView(closeBtn, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { leftMargin = dp(4) })

    val stage = FrameLayout(ctx)
    val face = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; minimumHeight = dp(104); setPadding(dp(16), dp(12), dp(16), dp(12)) }
    faceRef = face
    val stampDK = stamp("몰라요", cBad, -11f); stampDKRef = stampDK
    val stampKnow = stamp("알아요", cOk, 11f); stampKnowRef = stampKnow
    stage.addView(face, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT))
    stage.addView(stampDK, FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.TOP or Gravity.START).apply { topMargin = dp(7); leftMargin = dp(7) })
    stage.addView(stampKnow, FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.TOP or Gravity.END).apply { topMargin = dp(7); rightMargin = dp(7) })

    val hint = TextView(ctx).apply {
      text = "← 몰라요 / 알아요 →   ·   ↑ 이전   ·   탭 뜻"
      setTextColor(cTextMute); textSize = 10.5f; gravity = Gravity.CENTER; setPadding(0, dp(8), 0, dp(2))
    }
    hint.postDelayed({ hint.animate().alpha(0f).setDuration(400).start() }, 4200)

    fun resetFace() {
      face.animate().translationX(0f).translationY(0f).rotation(0f).setDuration(160).start()
      stampDK.animate().alpha(0f).setDuration(150).start()
      stampKnow.animate().alpha(0f).setDuration(150).start()
    }
    // 스와이프 확정 → 옆으로 날리고 답 보고 (다음 카드는 앱이 setCard 로 올림)
    fun commit(choice: String) {
      val dir = if (choice == "know") 1 else -1
      face.animate().translationX(dir * dpf(420f)).rotation(dir * 16f).alpha(0.25f).setDuration(170).withEndAction {
        sendEvent("onOverlayAnswer", mapOf("choice" to choice))
      }.start()
    }

    var sx = 0f; var sy = 0f; var moved = 0f
    val th = dpf(60f)
    face.setOnTouchListener { _, e ->
      when (e.action) {
        MotionEvent.ACTION_DOWN -> { sx = e.rawX; sy = e.rawY; moved = 0f; true }
        MotionEvent.ACTION_MOVE -> {
          val dx = e.rawX - sx; val dy = e.rawY - sy
          moved = max(moved, max(abs(dx), abs(dy)))
          if (abs(dy) > abs(dx) && dy < 0f) {            // 위로 끌기 = 이전 단어 (아래 스와이프는 알림 셰이드와 충돌)
            face.translationY = dy * 0.5f; face.translationX = 0f; face.rotation = 0f
            stampKnow.alpha = 0f; stampDK.alpha = 0f
          } else {
            face.translationX = dx; face.translationY = 0f; face.rotation = dx * 0.04f
            stampKnow.alpha = (dx / dpf(80f)).coerceIn(0f, 1f)
            stampDK.alpha = (-dx / dpf(80f)).coerceIn(0f, 1f)
          }
          true
        }
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
          val dx = e.rawX - sx; val dy = e.rawY - sy
          if (abs(dx) >= abs(dy) && dx > th) commit("know")
          else if (abs(dx) >= abs(dy) && dx < -th) commit("dontknow")
          else if (dy < -th && -dy > abs(dx)) { sendEvent("onOverlayAnswer", mapOf("choice" to "prev")); resetFace() }   // ↑ 이전
          else if (moved < dpf(10f)) { revealed = !revealed; renderFace(); resetFace() }
          else resetFace()
          true
        }
        else -> false
      }
    }
    closeBtn.setOnClickListener { removeOverlay() }

    card.addView(topRow)
    card.addView(stage, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(9) })
    card.addView(hint)
    renderFace()

    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
    val p = WindowManager.LayoutParams(dp(266), WindowManager.LayoutParams.WRAP_CONTENT, type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE, android.graphics.PixelFormat.TRANSLUCENT)
      .apply { gravity = Gravity.TOP or Gravity.START; x = dp(16); y = dp(120) }
    params = p

    var downX = 0f; var downY = 0f; var ix = 0; var iy = 0
    topRow.setOnTouchListener { _, e ->
      when (e.action) {
        MotionEvent.ACTION_DOWN -> { downX = e.rawX; downY = e.rawY; ix = p.x; iy = p.y; true }
        MotionEvent.ACTION_MOVE -> { p.x = ix + (e.rawX - downX).toInt(); p.y = iy + (e.rawY - downY).toInt(); wm?.updateViewLayout(card, p); true }
        else -> false
      }
    }

    overlayView = card
    wm?.addView(card, p)
    ensureTts()   // 첫 🔊 탭이 바로 나오게 미리 초기화
    appContext.activityProvider?.currentActivity?.moveTaskToBack(true)
  }

  private fun removeOverlay() {
    overlayView?.let { try { wm?.removeView(it) } catch (_: Exception) {} }
    overlayView = null; faceRef = null; labelRef = null; fillRef = null; restRef = null; stampDKRef = null; stampKnowRef = null
  }
}
