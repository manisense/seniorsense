# Pill Reminders Feature

This feature allows users to set up and manage medication reminders. It integrates with Supabase for secure storage and uses Expo Notifications for reminder alerts.

## Features

- Create, read, update, and delete medication reminders
- Set multiple times for each medication
- Configure dosage, medication type, and frequency
- Track medication status (taken, skipped, missed)
- Receive notifications for upcoming medications
- Snooze notifications
- View upcoming medications on the home screen
- Support for different frequency types (daily, weekly, specific days)

## Setup

1. Create a Supabase account and project at [https://supabase.com](https://supabase.com)
2. Run the SQL migration in `supabase/migrations/20240725_reminders.sql` to create the necessary tables and policies
3. Add your Supabase URL and anon key to the `.env` file:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## Components

- `RemindersScreen`: Main screen for managing reminders
- Home screen integration: Shows upcoming reminders
- `ReminderCard`: Component for displaying a reminder

## Database Schema

The `reminders` table has the following structure:

- `id`: UUID (primary key)
- `user_id`: UUID (foreign key to auth.users)
- `medicine_name`: TEXT
- `dosage`: TEXT
- `dose_type`: TEXT
- `illness_type`: TEXT
- `frequency`: JSONB
- `start_date`: TIMESTAMPTZ
- `end_date`: TIMESTAMPTZ
- `times`: JSONB
- `is_active`: BOOLEAN
- `notification_settings`: JSONB
- `doses`: JSONB
- `notifications`: JSONB
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

## Row Level Security

The database is configured with Row Level Security (RLS) to ensure users can only access their own reminders:

- Users can only view their own reminders
- Users can only insert their own reminders
- Users can only update their own reminders
- Users can only delete their own reminders

## Services

### ReminderService

The `reminderService` provides the following methods:

- `getReminders()`: Get all reminders for the current user
- `saveReminder(reminder)`: Save a reminder
- `saveReminders(reminders)`: Save multiple reminders
- `deleteReminder(reminderId)`: Delete a reminder
- `syncReminders()`: Sync local reminders with Supabase

### NotificationService

The `notificationService` provides methods for managing notifications:

- `requestPermissions()`: Request notification permissions
- `scheduleNotification(content, trigger)`: Schedule a notification
- `setupNotifications()`: Set up notification handler
- `cancelNotification(notificationId)`: Cancel a notification

## Offline Support

The app provides offline support through AsyncStorage:

- When offline or not authenticated, reminders are stored locally
- When online and authenticated, reminders are synchronized with Supabase
- Local reminders are migrated to Supabase when the user authenticates

## Types

The feature uses the following types:

- `Reminder`: The main reminder type
- `ReminderDose`: Represents a dose of medication
- `ReminderNotification`: Represents a notification for a reminder
- `ReminderFrequency`: Represents the frequency of a reminder
- `ReminderNotificationSettings`: Settings for notifications
- `DoseType`: Types of medication (pill, tablet, capsule, etc.)
- `FrequencyType`: Types of frequency (daily, weekly, etc.)
- `ReminderStatus`: Status of a dose (taken, skipped, missed)

## Usage

1. Create a new reminder by tapping the + button on the RemindersScreen
2. Fill in the medication details, dosage, and timing
3. Save the reminder
4. Receive notifications at the scheduled times
5. Mark medications as taken, skipped, or missed
6. View upcoming medications on the home screen 