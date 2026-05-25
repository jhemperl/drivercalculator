package com.gigcalculator

import android.accessibilityservice.AccessibilityService
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class GigAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "GigAccessibilityService"
        private val TARGET_PACKAGES = mapOf(
            "com.doordash.driverapp" to "DoorDash",
            "com.ubercab.driver" to "Uber"
        )
        private val PAYOUT_REGEX = Regex("""\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)""")
        private val MILES_REGEX = Regex("""(\d+(?:\.\d+)?)\s*(?:mi|miles)""", RegexOption.IGNORE_CASE)
        private val TIME_REGEX = Regex("""(\d+)\s*(?:min|mins|minutes)""", RegexOption.IGNORE_CASE)
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d(TAG, "GigAccessibilityService connected and monitoring Uber/DoorDash")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: return
        val appName = TARGET_PACKAGES[packageName] ?: return

        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
            event.eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            return
        }

        val rootNode = rootInActiveWindow ?: return
        
        val textElements = mutableListOf<String>()
        extractText(rootNode, textElements)
        val allText = textElements.joinToString("|").lowercase()

        val payoutMatches = PAYOUT_REGEX.findAll(allText).toList()
        val milesMatches = MILES_REGEX.findAll(allText).toList()
        val timeMatches = TIME_REGEX.findAll(allText).toList()

        if (payoutMatches.isNotEmpty() && milesMatches.isNotEmpty()) {
            val payout = payoutMatches
                .mapNotNull { it.groupValues[1].replace(",", "").toDoubleOrNull() }
                .filter { it > 1.0 }
                .maxOrNull()

            val miles = milesMatches
                .mapNotNull { it.groupValues[1].toDoubleOrNull() }
                .maxOrNull()

            val timeMinutes = if (timeMatches.isNotEmpty()) {
                timeMatches
                    .mapNotNull { it.groupValues[1].toDoubleOrNull() }
                    .maxOrNull()
            } else null

            if (payout != null && miles != null && miles > 0.1) {
                if (shouldEmit(payout, miles, appName, timeMinutes)) {
                    Log.d(TAG, "[$appName] Detected: $$payout / $miles mi / ${timeMinutes ?: "est"} min")
                    emitOfferEvent(payout, miles, appName, timeMinutes)
                }
            }
        }
    }

    private var lastPayout = 0.0
    private var lastMiles = 0.0
    private var lastApp = ""
    private var lastTime = 0.0
    private var lastEmitTime = 0L

    private fun shouldEmit(payout: Double, miles: Double, app: String, time: Double?): Boolean {
        val now = System.currentTimeMillis()
        val currentTime = time ?: 0.0
        if (payout == lastPayout && miles == lastMiles && app == lastApp && currentTime == lastTime && (now - lastEmitTime) < 5000) {
            return false
        }
        lastPayout = payout
        lastMiles = miles
        lastApp = app
        lastTime = currentTime
        lastEmitTime = now
        return true
    }

    private fun extractText(node: AccessibilityNodeInfo?, elements: MutableList<String>) {
        if (node == null) return
        node.text?.let { elements.add(it.toString()) }
        node.contentDescription?.let { elements.add(it.toString()) }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            extractText(child, elements)
        }
    }

    private fun emitOfferEvent(payout: Double, miles: Double, appName: String, timeMinutes: Double?) {
        // onAccessibilityEvent runs on a background thread — dispatch to main thread
        mainHandler.post {
            try {
                val reactApp = application as? ReactApplication
                val context = reactApp?.reactNativeHost?.reactInstanceManager?.currentReactContext
                if (context != null && context.hasActiveCatalystInstance()) {
                    val params = Arguments.createMap().apply {
                        putDouble("payout", payout)
                        putDouble("miles", miles)
                        putString("appName", appName)
                        if (timeMinutes != null) {
                            putDouble("timeMinutes", timeMinutes)
                        }
                    }
                    context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onGigOfferDetected", params)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Emit failed", e)
            }
        }
    }

    override fun onInterrupt() {}

    private val mainHandler = Handler(Looper.getMainLooper())
}
