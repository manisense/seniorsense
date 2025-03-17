# Medicine History Feature

This feature allows users to save and view their medicine identification history. It integrates with Supabase for secure storage and retrieval of medicine information.

## Features

- Save medicine identification results to Supabase
- View history of identified medicines
- Search through medicine history
- View detailed information about previously identified medicines
- Share, copy, and listen to medicine information
- Delete unwanted history items

## Setup

1. Create a Supabase account and project at [https://supabase.com](https://supabase.com)
2. Run the SQL migration in `supabase/migrations/20240720_medicine_history.sql` to create the necessary tables and policies
3. Add your Supabase URL and anon key to the `.env` file:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## Components

- `MedicineIdentifierScreen`: Main screen for identifying medicines, with option to save to history
- `MedicineHistoryScreen`: Screen for viewing and searching medicine history
- `MedicineHistoryDetailScreen`: Screen for viewing detailed information about a specific medicine

## Database Schema

The `medicine_history` table has the following structure:

- `id`: UUID (primary key)
- `user_id`: UUID (foreign key to auth.users)
- `medicine_name`: TEXT
- `response_text`: TEXT
- `image_url`: TEXT (nullable)
- `created_at`: TIMESTAMP WITH TIME ZONE
- `updated_at`: TIMESTAMP WITH TIME ZONE

## Row Level Security

The database is configured with Row Level Security (RLS) to ensure users can only access their own medicine history:

- Users can only view their own medicine history
- Users can only insert their own medicine history
- Users can only update their own medicine history
- Users can only delete their own medicine history

## API

The `medicineHistoryService` provides the following methods:

- `saveMedicineHistory(medicineName, responseText, imageUrl)`: Save a medicine to history
- `getMedicineHistory()`: Get all medicine history for the current user
- `getMedicineHistoryById(id)`: Get a specific medicine history item
- `deleteMedicineHistory(id)`: Delete a medicine history item
- `searchMedicineHistory(query)`: Search medicine history by name 