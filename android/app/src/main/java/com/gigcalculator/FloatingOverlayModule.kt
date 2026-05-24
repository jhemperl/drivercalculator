package com.gigcalculator

import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class FloatingOverlayModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val OVERLAY_SIZE_DP = 60
    }

    private var overlayView: FrameLayout? = null
    private var overlayTextView: TextView? = null
    private var windowManager: WindowManager? = null

    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f

    override fun getName(): String = "FloatingOverlay"

    @ReactMethod
    fun createOverlay() {
        val context = reactApplicationContext ?: return
        if (overlayView != null) return // Already created

        windowManager = context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager ?: return

        val sizePx = dpToPx(OVERLAY_SIZE_DP.toFloat()).toInt()

        val layoutParams = WindowManager.LayoutParams(
            sizePx,
            sizePx,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            x = dpToPx(16f).toInt()
            y = dpToPx(100f).toInt()
        }

        val container = FrameLayout(context).apply {
            val bg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#2196F3"))
            }
            background = bg
            elevation = 8f
        }

        val textView = TextView(context).apply {
            text = ""
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
            gravity = Gravity.CENTER
            maxLines = 2
            setPadding(4, 4, 4, 4)
        }

        container.addView(textView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        // Make draggable
        container.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = layoutParams.x
                    initialY = layoutParams.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    layoutParams.x = initialX + (event.rawX - initialTouchX).toInt()
                    layoutParams.y = initialY + (event.rawY - initialTouchY).toInt()
                    windowManager?.updateViewLayout(container, layoutParams)
                    true
                }
                else -> false
            }
        }

        overlayView = container
        overlayTextView = textView

        try {
            windowManager?.addView(container, layoutParams)
        } catch (e: Exception) {
            overlayView = null
            overlayTextView = null
        }
    }

    @ReactMethod
    fun updateOverlay(text: String, color: String) {
        val view = overlayView ?: return
        val textView = overlayTextView ?: return

        view.post {
            textView.text = text

            val bg = view.background as? GradientDrawable
            bg?.setColor(Color.parseColor(color))
        }
    }

    @ReactMethod
    fun removeOverlay() {
        val view = overlayView ?: return
        try {
            windowManager?.removeView(view)
        } catch (_: Exception) { }
        overlayView = null
        overlayTextView = null
    }

    private fun dpToPx(dp: Float): Float {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp,
            reactApplicationContext?.resources?.displayMetrics
        )
    }
}
