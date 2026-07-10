package com.vocapop.overlay

import android.app.Activity
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import java.util.Locale
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject

/**
 * popVOCA 잠금화면 학습 카드 — 화면이 켜질 때 LockService가 띄운다.
 * 잠금 위에 표시(setShowWhenLocked) + 화면 켜기. 간단 미션(1탭 퀴즈 / 플래시카드) 끝내면 닫힘.
 * 박스 단어 풀·모드·결과는 SharedPreferences("popvoca_lock")로 앱과 공유.
 */
class LockCardActivity : Activity() {
  private val prefs by lazy { getSharedPreferences("popvoca_lock", Context.MODE_PRIVATE) }
  private var answered = false
  private var tts: TextToSpeech? = null
  private var mode = "quiz"   // 결과에 실어 보냄 — 앱이 퀴즈/플래시 박스 룰을 다르게 적용

  private var cSurface = 0; private var cBg = 0; private var cSurface2 = 0; private var cBorder = 0
  private var cText = 0; private var cTextSub = 0; private var cTextMute = 0
  private var cAccent = 0; private var cAccentDeep = 0; private var cAccentSoft = 0
  private var cOk = 0; private var cBad = 0; private var cOkSoft = 0; private var cBadSoft = 0

  private data class WK(val w: String, val k: String, val p: String = "", val pr: String = "", val filler: Boolean = false)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true); setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
          or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
          or WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
      )
    }
    setColors(prefs.getBoolean("dark", false))
    // 발음 듣기용 TTS (버튼 탭 시에만 재생 — 잠금화면서 갑자기 소리 안 나게 자동재생은 안 함)
    tts = TextToSpeech(this) { ok -> if (ok == TextToSpeech.SUCCESS) try { tts?.language = Locale.US } catch (_: Exception) {} }
    val pool = parsePool()
    if (pool.isEmpty()) { finish(); return }
    // 출제는 범위 단어(main)에서만 — 필러(f)는 퀴즈 오답 보기 후보로만 쓰임
    val mains = pool.filter { !it.filler }.ifEmpty { pool }
    val item = mains[(Math.random() * mains.size).toInt().coerceIn(0, mains.size - 1)]
    mode = prefs.getString("mode", "quiz") ?: "quiz"
    setContentView(buildRoot(item, pool, mode))
  }

  override fun onUserLeaveHint() { super.onUserLeaveHint(); finish() }   // 홈/최근앱 누르면 카드 닫힘(급할 때 탈출)

  private fun speak(w: String) {
    try { tts?.speak(w, TextToSpeech.QUEUE_FLUSH, null, "vplock") } catch (_: Exception) {}
  }

  override fun onDestroy() {
    super.onDestroy()
    try { tts?.shutdown() } catch (_: Exception) {}
    tts = null
  }

  private fun parsePool(): List<WK> {
    val out = ArrayList<WK>()
    try {
      val arr = JSONArray(prefs.getString("pool", "[]"))
      for (i in 0 until arr.length()) {
        val o = arr.getJSONObject(i)
        val w = o.optString("w"); val k = o.optString("k"); val p = o.optString("p")
        if (w.isNotEmpty() && k.isNotEmpty()) out.add(WK(w, k, p, o.optString("pr"), o.optInt("f", 0) == 1))
      }
    } catch (_: Exception) {}
    return out
  }

  private fun firstMeaning(k: String): String =
    k.split(";", ",", "·", "/").map { it.trim() }.firstOrNull { it.isNotEmpty() } ?: k

  private fun recordResult(word: String, correct: Boolean) {
    if (answered) return
    answered = true
    try {
      val arr = JSONArray(prefs.getString("results", "[]"))
      arr.put(JSONObject().put("w", word).put("correct", correct).put("m", mode))
      prefs.edit().putString("results", arr.toString()).apply()
    } catch (_: Exception) {}
  }

  private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
  private fun dpf(v: Float) = v * resources.displayMetrics.density
  private fun rr(color: Int, radius: Float, stroke: Int = 0, sc: Int = Color.TRANSPARENT) =
    GradientDrawable().apply { cornerRadius = dpf(radius); setColor(color); if (stroke > 0) setStroke(dp(stroke), sc) }

  private fun setColors(d: Boolean) {
    if (d) {
      cSurface = Color.parseColor("#171A21"); cBg = Color.parseColor("#0E1015"); cSurface2 = Color.parseColor("#1E222B")
      cBorder = Color.parseColor("#2A2F3A"); cText = Color.parseColor("#ECEFF6"); cTextSub = Color.parseColor("#9BA3B4")
      cTextMute = Color.parseColor("#596072"); cAccent = Color.parseColor("#FF5BB8"); cAccentDeep = Color.parseColor("#FF8AD0")
      cAccentSoft = Color.parseColor("#2E1F2A"); cOk = Color.parseColor("#3FD589"); cBad = Color.parseColor("#FF6B7E")
      cOkSoft = Color.parseColor("#152D20"); cBadSoft = Color.parseColor("#341F24")
    } else {
      cSurface = Color.parseColor("#FFFFFF"); cBg = Color.parseColor("#FCFDFF"); cSurface2 = Color.parseColor("#F6F8FF")
      cBorder = Color.parseColor("#E8ECF5"); cText = Color.parseColor("#1F2430"); cTextSub = Color.parseColor("#697083")
      cTextMute = Color.parseColor("#C8CEDA"); cAccent = Color.parseColor("#FF5BB8"); cAccentDeep = Color.parseColor("#E83FA1")
      cAccentSoft = Color.parseColor("#FFE3F3"); cOk = Color.parseColor("#35C97B"); cBad = Color.parseColor("#FF5A6E")
      cOkSoft = Color.parseColor("#E6F8EE"); cBadSoft = Color.parseColor("#FFE7EA")
    }
  }

  private fun closeSoon(delay: Long = 950) { window.decorView.postDelayed({ if (!isFinishing) finish() }, delay) }

  private fun buildRoot(item: WK, pool: List<WK>, mode: String): View {
    val root = FrameLayout(this).apply { setBackgroundColor(Color.parseColor("#A6000000")) }   // 바깥 탭으론 안 닫음(너무 쉬워서) — 닫기는 홈/뒤로/나중에
    val card = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL; setPadding(dp(22), dp(20), dp(22), dp(16))
      background = rr(cSurface, 24f); elevation = dpf(18f); isClickable = true   // 카드 안 탭은 안 닫힘(바깥만)
    }
    card.addView(TextView(this).apply {
      text = "popVOCA · 잠금학습"; setTextColor(cAccent); textSize = 11.5f; setTypeface(typeface, Typeface.BOLD)
      gravity = Gravity.CENTER
    })
    val subline = listOf(item.p, item.pr).filter { it.isNotEmpty() }.joinToString("  ")   // "(형)  /ˈhɑstəl/"
    card.addView(TextView(this).apply {
      text = item.w; setTextColor(cText); textSize = 33f; setTypeface(typeface, Typeface.BOLD)
      gravity = Gravity.CENTER; setPadding(0, dp(12), 0, dp(2))
    })
    // 품사·발음기호 + 🔊 발음 듣기 버튼 한 줄
    val sub = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
    if (subline.isNotEmpty()) sub.addView(TextView(this).apply {
      text = subline; setTextColor(cTextMute); textSize = 12f
    })
    sub.addView(ImageView(this).apply {
      setImageDrawable(speakerIcon(cAccent))
      background = rr(cAccentSoft, 999f); setPadding(dp(7), dp(7), dp(7), dp(7)); isClickable = true
      setOnClickListener { speak(item.w) }
    }, LinearLayout.LayoutParams(dp(30), dp(30)).apply { leftMargin = if (subline.isNotEmpty()) dp(8) else 0 })
    card.addView(sub, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
      gravity = Gravity.CENTER_HORIZONTAL; bottomMargin = dp(12)
    })
    if (mode == "flash") buildFlash(card, item) else buildQuiz(card, item, pool)
    card.addView(TextView(this).apply {
      text = "나중에"; setTextColor(cTextMute); textSize = 12.5f; gravity = Gravity.CENTER
      setPadding(0, dp(14), 0, dp(2)); isClickable = true; setOnClickListener { finish() }
    })
    root.addView(card, FrameLayout.LayoutParams(dp(300), FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER))
    return root
  }

  // ── 1탭 퀴즈: 뜻 보기 3개 중 정답 탭 ──
  private fun buildQuiz(card: LinearLayout, item: WK, pool: List<WK>) {
    card.addView(TextView(this).apply {
      text = "이 단어의 뜻은?"; setTextColor(cTextMute); textSize = 12.5f; gravity = Gravity.CENTER
      setPadding(0, 0, 0, dp(12))
    })
    val correct = firstMeaning(item.k)
    val distractors = pool.filter { it.w != item.w }.map { firstMeaning(it.k) }
      .filter { it != correct }.distinct().shuffled().take(3)   // 정답 1 + 오답 3 = 보기 4개(나머지 퀴즈와 통일)
    val options = (listOf(correct) + distractors).shuffled()
    val btns = ArrayList<TextView>()
    for (opt in options) {
      val b = TextView(this).apply {
        text = opt; setTextColor(cText); textSize = 16f; setTypeface(typeface, Typeface.BOLD)
        gravity = Gravity.CENTER_VERTICAL; setPadding(dp(16), dp(15), dp(16), dp(15))
        background = rr(cBg, 14f, 1, cBorder); isClickable = true
      }
      b.setOnClickListener {
        if (answered) return@setOnClickListener
        val isRight = opt == correct
        recordResult(item.w, isRight)
        for (x in btns) {
          val xr = x.text == correct
          if (xr) { x.background = rr(cOk, 14f); x.setTextColor(Color.WHITE) }
          else if (x === b) { x.background = rr(cBad, 14f); x.setTextColor(Color.WHITE) }
          else { x.alpha = 0.5f }
          x.isClickable = false
        }
        closeSoon(if (isRight) 300L else 950L)   // 정답=짧게 슥, 오답=정답 확인할 시간
      }
      btns.add(b)
      card.addView(b, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(9) })
    }
  }

  // ── 플래시카드: 뜻 보고 알아요/몰라요 ──
  private fun buildFlash(card: LinearLayout, item: WK) {
    val meaning = TextView(this).apply {
      text = "탭해서 뜻 보기"; setTextColor(cTextSub); textSize = 15f; gravity = Gravity.CENTER
      setPadding(dp(14), dp(16), dp(14), dp(16)); background = rr(cBg, 14f, 1, cBorder); isClickable = true
    }
    val btnRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; visibility = View.GONE }
    val dk = TextView(this).apply {
      text = "몰라요"; setTextColor(Color.WHITE); textSize = 15f; setTypeface(typeface, Typeface.BOLD)
      gravity = Gravity.CENTER; setPadding(0, dp(14), 0, dp(14)); background = rr(cBad, 14f); isClickable = true
      setOnClickListener { recordResult(item.w, false); finish() }
    }
    val kn = TextView(this).apply {
      text = "알아요"; setTextColor(Color.WHITE); textSize = 15f; setTypeface(typeface, Typeface.BOLD)
      gravity = Gravity.CENTER; setPadding(0, dp(14), 0, dp(14)); background = rr(cOk, 14f); isClickable = true
      setOnClickListener { recordResult(item.w, true); finish() }
    }
    meaning.setOnClickListener {
      meaning.text = item.k; meaning.setTextColor(cText); meaning.setTypeface(meaning.typeface, Typeface.BOLD)
      btnRow.visibility = View.VISIBLE
    }
    card.addView(meaning, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    btnRow.addView(dk, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { rightMargin = dp(5) })
    btnRow.addView(kn, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { leftMargin = dp(5) })
    card.addView(btnRow, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(10) })
  }
}
