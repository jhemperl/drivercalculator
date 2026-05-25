package com.gigcalculator

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class FloatingOverlayModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val OVERLAY_SIZE_DP = 70
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
    fun isPermissionGranted(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(reactApplicationContext)) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactApplicationContext.packageName}")
                )
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(false)
            } else {
                promise.resolve(true)
            }
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun createOverlay() {
        val context = reactApplicationContext ?: return
        
        // Check permission first
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            return
        }

        if (overlayView != null) return // Already created

        windowManager = context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager ?: return

        val sizePx = dpToPx(OVERLAY_SIZE_DP.toFloat()).toInt()

        val layoutParams = WindowManager.LayoutParams(
            sizePx,
            sizePx,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 100
            y = 200
        }

        val container = FrameLayout(context).apply {
            val bg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#2196F3"))
                setStroke(dpToPx(2f).toInt(), Color.WHITE)
            }
            background = bg
            elevation = 10f
        }

        val textView = TextView(context).apply {
            text = "Waiting..."
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
            gravity = Gravity.CENTER
            maxLines = 3
            setPadding(8, 8, 8, 8)
        }

        container.addView(textView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        container.setOnTouchListener { v, event ->
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

        mainHandler.post {
            try {
                windowManager?.addView(container, layoutParams)
            } catch (e: Exception) {
                overlayView = null
                overlayTextView = null
            }
        }
    }

    @ReactMethod
    fun updateOverlay(text: String, color: String) {
        val view = overlayView ?: return
        val textView = overlayTextView ?: return

        view.post {
            textView.text = text
            val bg = view.background as? GradientDrawable
            try {
                val colorInt = when (color.lowercase()) {
                    "green" -> Color.parseColor("#2E7D32")
                    "red" -> Color.parseColor("#C62828")
                    "yellow" -> Color.parseColor("#F9A825")
                    else -> Color.parseColor(color)
                }
                bg?.setColor(colorInt)
            } catch (e: Exception) {
                bg?.setColor(Color.parseColor("#2196F3"))
            }
        }
    }

    @ReactMethod
    fun removeOverlay() {
        val view = overlayView ?: return
        mainHandler.post {
            try {
                windowManager?.removeView(view)
            } catch (_: Exception) { }
            overlayView = null
            overlayTextView = null
        }
    }

    override fun onCatalystInstanceDestroy() {
        removeOverlay()
        super.onCatalystInstanceDestroy()
    }

    private val mainHandler = android.os.Handler(android.os.Looper.getMainLooper())

    private fun dpToPx(dp: Float): Float {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp,
            reactApplicationContext.resources.displayMetrics
        )
    }
}
