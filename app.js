require('dotenv').config();

export default {
  expo: {
    name: "Senior Wellness",
    slug: "senior-wellness-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./src/assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "bundleIdentifier": "com.seniorsense.app",
      "supportsTablet": true,
      "infoPlist": {
        "NSContactsUsageDescription": "This app needs access to contacts to select emergency contacts.",
        "NSLocationWhenInUseUsageDescription": "This app needs access to location to send in emergency situations.",
        "NSLocationAlwaysUsageDescription": "This app needs access to location to send in emergency situations.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "This app needs access to location to send in emergency situations.",
        "NSMicrophoneUsageDescription": "This app needs access to microphone for emergency calls and text-to-speech.",
        "NSSpeechRecognitionUsageDescription": "This app needs access to speech recognition for voice commands in emergency.",
        "LSApplicationQueriesSchemes": [
          "tel",
          "sms"
        ]
      }
    },
    "android": {
      "package": "com.seniorsense.app",
      "adaptiveIcon": {
        "foregroundImage": "./src/assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "android.permission.READ_CONTACTS",
        "android.permission.WRITE_CONTACTS",
        "android.permission.READ_PHONE_STATE",
        "android.permission.SEND_SMS",
        "android.permission.CALL_PHONE",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.READ_SMS",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.RECORD_AUDIO"
      ]
    },
    "web": {
      "favicon": "./src/assets/favicon.png"
    },
    "newArchEnabled": true,
    "plugins": [
      [
        "expo-contacts",
        {
          "contactsPermission": "Allow $(PRODUCT_NAME) to access your contacts."
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location."
        }
      ],
      "expo-system-ui",
      "expo-notifications",
      [
        "expo-image-picker",
        {
          "photosPermission": "The app needs access to your photos to identify medicines.",
          "cameraPermission": "The app needs access to your camera to take photos of medicines."
        }
      ],
      [
        "expo-media-library",
        {
          "photosPermission": "The app needs access to your photos to save identified medicine images.",
          "savePhotosPermission": "The app needs access to save photos to your gallery."
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "The app needs access to your camera to take photos of medicines."
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "1fa43a4b-6b8b-4c46-8725-93c17f4b0f3f"
      },
      "GEMINI_API_KEY": process.env.GEMINI_API_KEY
    }
  }
}
