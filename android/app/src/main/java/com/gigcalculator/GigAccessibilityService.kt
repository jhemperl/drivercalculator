package com.gigcalculator

import android.accessibilityservice.AccessibilityService
import android.os.Bundle
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class GigAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "GigAccessibilityService"
        private val TARGET_PACKAGES = setOf("com.doordash.driverapp", "com.ubercab.driver")
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d(TAG, "GigAccessibilityService connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val eventType = event.eventType
        if (eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
            eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            return
        }

        val packageName = event.packageName?.toString() ?: return
        if (packageName !in TARGET_PACKAGES) return

        Log.d(TAG, "Event from target package: $packageName, type: $eventType")

        val rootNode = rootInActiveWindow ?: return
        val allText = extractTextFromNode(rootNode)

        // Regex for payout: $X.XX or $X,XXX.XX
        val payoutRegex = Regex("""\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?""")
        // Regex for miles: X.X mi or X miles
        val milesRegex = Regex("""\d+(?:\.\d+)?\s*(?:mi|miles)""", RegexOption.IGNORE_CASE)

        val payoutMatch = payoutRegex.find(allText)
        val milesMatch = milesRegex.find(allText)

        if (payoutMatch != null && milesMatch != null) {
            val payoutStr = payoutMatch.value.replace("$", "").replace(",", "")
            val milesStr = milesMatch.value.replace(Regex("""\s*(?:mi|miles)""", RegexOption.IGNORE_CASE), "")

            val payout = payoutStr.toDoubleOrNull()
            val miles = milesStr.toDoubleOrNull()

            if (payout != null && miles != null) {
                Log.d(TAG, "Offer detected - Payout: \$$payout, Miles: $miles")
                emitOfferEvent(payout, miles)
            }
        }
    }

    override fun onInterrupt() {
        Log.d(TAG, "GigAccessibilityService interrupted")
    }

    private fun extractTextFromNode(node: AccessibilityNodeInfo?): String {
        if (node == null) return ""

        val sb = StringBuilder()

        // Get text from this node
        node.text?.let { sb.append(it).append(" ") }
        node.contentDescription?.let { sb.append(it).append(" ") }

        // Recursively get text from children
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { child ->
                sb.append(extractTextFromNode(child))
                // Note: don't recycle child nodes obtained from getChild() on older APIs
                // but on API 26+ it's managed by the framework
            }
        }

        return sb.toString()
    }

    private fun emitOfferEvent(payout: Double, miles: Double) {
        val reactContext = reactApplicationContext ?: return

        val params = Bundle().apply {
            putDouble("payout", payout)
            putDouble("miles", miles)
        }

        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onGigOfferDetected", Arguments.fromBundle(params))
    }

    private val reactApplicationContext: ReactContext?
        get() {
            return try {
                val activityThreadClass = Class.forName("android.app.ActivityThread")
                val currentActivityThread = activityThreadClass.getMethod("currentActivityThread").invoke(null)
                val activitiesField = activityThreadClass.getDeclaredField("mActivities")
                activitiesField.isAccessible = true
                val activities = activitiesField.get(currentActivityThread) as? android.util.ArrayMap<*, *> ?: return null

                for (activityRecord in activities.values) {
                    if (activityRecord == null) continue
                    val activityRecordClass = activityRecord.javaClass
                    val activityField = activityRecordClass.getDeclaredField("activity")
                    activityField.isAccessible = true
                    val activity = activityField.get(activityThread)
                    if (activity is com.facebook.react.ReactActivity) {
                        val reactContextField = activity.javaClass.superclass?.getDeclaredField("mReactInstanceManager")
                            ?: continue
                        reactContextField.isAccessible = true
                        val reactInstanceManager = reactContextField.get(activity) ?: continue
                        val reactContextMethod = reactInstanceManager.javaClass.getMethod("getCurrentReactContext")
                        return reactContextMethod.invoke(reactInstanceManager) as? ReactContext
                    }
                }
                null
            } catch (e: Exception) {
                Log.e(TAG, "Failed to get ReactContext", e)
                null
            }
        }
}
