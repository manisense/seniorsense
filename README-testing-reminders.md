# Testing the Pill Reminders Feature

This guide provides step-by-step instructions for testing the pill reminders feature to ensure it's working correctly, with special focus on notification delivery and sound/vibration alerts.

## Prerequisites

1. Make sure your Supabase project is set up and running
2. Ensure you're logged into the app (if testing authenticated features)
3. Make sure notifications are enabled on your device:
   - iOS: Settings > Notifications > [Your App Name]
   - Android: Settings > Apps > [Your App Name] > Notifications
4. Check that your device is not in silent/do not disturb mode when testing sounds
5. For Android users, ensure the app has the necessary permissions:
   - Notification permission
   - Vibration permission (for physical feedback)
   - Auto-start permission (on some devices, to ensure notifications work in background)

## Testing Steps

### 1. Quick Notification Test

1. Navigate to the Reminders screen 
2. Look for a bell icon in the bottom-right corner of the screen
3. Tap the bell icon to send a test notification
4. You should receive a notification within a few seconds
5. Verify that the notification:
   - Has a title and body
   - Makes a sound
   - Vibrates your device (if supported)

If this test fails, there may be issues with your notification permissions or device settings.

### 2. Creating a New Reminder

1. Navigate to the Reminders screen
2. Tap the "+" button to add a new reminder
3. Fill in the following details:
   - Medicine Name (e.g., "Test Medicine")
   - Dose Type (e.g., "Pill")
   - Number of doses per day (e.g., 1)
   - Times (e.g., current time + 1 minute)
   - Ensure "Sound" is enabled
4. Tap "Add Reminder" to save
5. You should immediately receive a confirmation notification that the reminder has been set
6. Wait for the scheduled time (should be about 1 minute later)
7. Verify that you receive the pill reminder notification with:
   - The correct medicine name
   - Sound and vibration
   - Accurate dosage information

### 3. Verifying Storage in Supabase

1. After creating a reminder, check if data was saved to Supabase
2. If you're logged in, the reminder should be stored in the `reminders` table
3. If not logged in, it should be stored in local storage but still function correctly

### 4. Testing Notification Triggers

1. Set up multiple reminders with different times
2. Verify each notification triggers at the correct time
3. Test reminder notifications in different app states:
   - When the app is open
   - When the app is in the background
   - When the app is closed completely

### 5. Managing Reminders

1. Edit an existing reminder:
   - Change the time
   - Update the notification settings (sound on/off)
   - Save changes
2. Verify the updated reminder notification works as expected
3. Delete a reminder and confirm no notifications are sent for it

## Troubleshooting

### Notifications Not Working

If notifications aren't appearing:

1. **Check Permissions**: Make sure the app has notification permissions
2. **Device Settings**: Verify that the device isn't in Do Not Disturb or Silent mode
3. **Background Restrictions**: Some Android devices restrict background apps, check battery settings
4. **Test Notification**: Use the bell icon on the Reminders screen to send an immediate test notification
5. **Check Console Logs**: Look for error messages related to notifications in the console logs
6. **Channel Settings**: For Android, check if notification channels are properly set up in device settings

### Reminders Not Saving to Supabase

1. **Authentication**: Check if you're properly logged in
2. **Network Connection**: Verify internet connectivity
3. **Console Logs**: Look for error messages related to Supabase operations
4. **Fallback**: Even without Supabase connection, reminders should work with local storage

## Expected Behavior

When working correctly, the pill reminder feature should:

1. Allow creation, editing, and deletion of reminders
2. Send punctual notifications at scheduled times
3. Play sounds and vibrate the device when notifications are delivered
4. Store reminder information securely (in Supabase when authenticated, local storage otherwise)
5. Show a complete list of reminders in the Reminders screen
6. Update the home screen with upcoming reminders
7. Persist reminders between app restarts

If you encounter any issues that aren't resolved by the troubleshooting steps, please report them with detailed information about your device, operating system, and the specific steps that led to the problem. 