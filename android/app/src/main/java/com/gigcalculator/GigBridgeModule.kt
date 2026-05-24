package com.gigcalculator

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class GigBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "GigBridge"

    @ReactMethod
    fun sendOfferData(payout: Double, miles: Double) {
        val params = com.facebook.react.bridge.Arguments.createMap().apply {
            putDouble("payout", payout)
            putDouble("miles", miles)
        }

        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onGigOfferDetected", params)
    }
}
