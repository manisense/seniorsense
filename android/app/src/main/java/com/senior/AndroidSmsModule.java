package com.senior;

import android.app.Activity;
import android.telephony.SmsManager;
import android.util.Log;
import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class AndroidSmsModule extends ReactContextBaseJavaModule {
    private static final String TAG = "AndroidSmsModule";
    private final ReactApplicationContext reactContext;

    public AndroidSmsModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return "AndroidSmsModule";
    }

    @ReactMethod
    public void sendDirectSMS(String phoneNumber, String message, Promise promise) {
        try {
            SmsManager smsManager = SmsManager.getDefault();
            smsManager.sendTextMessage(phoneNumber, null, message, null, null);
            Log.d(TAG, "SMS sent successfully to " + phoneNumber);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to send SMS", e);
            promise.reject("SMS_SEND_ERROR", e.getMessage());
        }
    }
}