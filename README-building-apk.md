# Building an APK for the Senior Wellness App

This guide explains how to build an APK for the Senior Wellness Android application using Expo's EAS Build service.

## Prerequisites

- Node.js and npm installed
- An Expo account (create one at [expo.dev](https://expo.dev))
- The project source code

## Steps to Build an APK

### 1. Install the EAS CLI

First, install the EAS CLI globally:

```bash
npm install -g eas-cli
```

### 2. Login to Expo

Login to your Expo account through the CLI:

```bash
eas login
```

### 3. Configure EAS Build

Create or ensure you have an `eas.json` file in your project root with the following configuration:

```json
{
  "cli": {
    "version": ">= 5.9.3"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 4. Configure the Project for EAS Build

Run the following command to configure your project:

```bash
eas build:configure --platform android
```

### 5. Install Expo Updates (if needed)

If you haven't installed expo-updates, the build process will prompt you to install it:

```bash
npx expo install expo-updates
```

### 6. Start the Build

Start the APK build using the preview profile:

```bash
eas build --platform android --profile preview
```

This will:
1. Upload your project to EAS Build
2. Build your APK on EAS's cloud servers
3. Provide a URL to download the APK when finished

The build process typically takes 10-15 minutes.

### 7. Download the APK

When the build completes, you'll get a URL to download your APK. You can also find all your builds by visiting the EAS website:

```
https://expo.dev/accounts/[your-username]/projects/senior-wellness-app/builds
```

## Installing the APK

1. Transfer the APK to your Android device (via email, file sharing, etc.)
2. On your device, navigate to the APK file and tap it
3. Allow installation from unknown sources if prompted
4. Follow on-screen instructions to install

## Troubleshooting

- **Build Failures**: Check the build logs for error details
- **Installation Issues**: Ensure "Install from Unknown Sources" is enabled on your device
- **App Crashes**: The preview build contains development features and may be less stable than production builds

## Creating a Production APK

For a production-ready APK, use:

```bash
eas build --platform android --profile production
```

This will create an optimized build suitable for distribution to end users.

## Additional Resources

- [EAS Build documentation](https://docs.expo.dev/build/introduction/)
- [Android app deployment guide](https://docs.expo.dev/distribution/app-stores/) 