package com.vocapop.overlay

import android.graphics.Canvas
import android.graphics.ColorFilter
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.RectF
import android.graphics.drawable.Drawable

/** 앱 톤에 맞춘 단색 확성기 아이콘 (이모지 🔊 대체) — 잠금카드·플로팅 오버레이 공용.
 *  res/R 의존 없이 Canvas로 직접 그려서 Expo 모듈 빌드 리소스 설정과 무관하게 동작. */
fun speakerIcon(color: Int): Drawable = object : Drawable() {
  override fun draw(canvas: Canvas) {
    val b = bounds
    val w = b.width().toFloat()
    val h = b.height().toFloat()
    val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { setColor(color); style = Paint.Style.FILL }
    val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      setColor(color); style = Paint.Style.STROKE; strokeWidth = h * 0.085f
      strokeCap = Paint.Cap.ROUND; strokeJoin = Paint.Join.ROUND
    }
    // 혼(woofer): 좌측 사각 + 우측 삼각
    val horn = Path().apply {
      moveTo(b.left + w * 0.15f, b.top + h * 0.40f)
      lineTo(b.left + w * 0.30f, b.top + h * 0.40f)
      lineTo(b.left + w * 0.48f, b.top + h * 0.24f)
      lineTo(b.left + w * 0.48f, b.top + h * 0.76f)
      lineTo(b.left + w * 0.30f, b.top + h * 0.60f)
      lineTo(b.left + w * 0.15f, b.top + h * 0.60f)
      close()
    }
    canvas.drawPath(horn, fill)
    // 음파 2줄
    canvas.drawArc(RectF(b.left + w * 0.40f, b.top + h * 0.34f, b.left + w * 0.72f, b.top + h * 0.66f), -55f, 110f, false, stroke)
    canvas.drawArc(RectF(b.left + w * 0.42f, b.top + h * 0.21f, b.left + w * 0.90f, b.top + h * 0.79f), -50f, 100f, false, stroke)
  }
  override fun setAlpha(alpha: Int) {}
  override fun setColorFilter(cf: ColorFilter?) {}
  @Deprecated("deprecated in base class") override fun getOpacity() = PixelFormat.TRANSLUCENT
}
