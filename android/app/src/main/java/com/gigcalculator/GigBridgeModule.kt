package com.gigcalculator

import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class GigBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "GigBridge"

    @ReactMethod
    fun isAccessibilityServiceEnabled(promise: Promise) {
        val context = reactApplicationContext
        val expectedComponentName = "${context.packageName}/${GigAccessibilityService::class.java.canonicalName}"
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )
        val isEnabled = enabledServices?.contains(expectedComponentName) == true
        promise.resolve(isEnabled)
    }

    @ReactMethod
    fun simulateOffer(payout: Double, miles: Double, appName: String, timeMinutes: Double) {
        val params = Arguments.createMap().apply {
            putDouble("payout", payout)
            putDouble("miles", miles)
            putString("appName", appName)
            putDouble("timeMinutes", timeMinutes)
        }

        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onGigOfferDetected", params)
    }

    // --- Mandatory methods for NativeEventEmitter ---
    @ReactMethod
    fun addListener(eventName: String) {
        // Keep: Required by React Native
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep: Required by React Native
    }
    // ------------------------------------------------

    @ReactMethod
    fun sendOfferData(payout: Double, miles: Double) {
        val params = Arguments.createMap().apply {
            putDouble("payout", payout)
            putDouble("miles", miles)
        }

        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onGigOfferDetected", params)
    }
}
