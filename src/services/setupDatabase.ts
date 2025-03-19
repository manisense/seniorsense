/**
 * Database setup script
 * This can be run in development to ensure the database has the correct structure
 */

import supabase from './supabase';

export async function setupRemindersTable() {
  try {
    console.log('Checking if reminders table exists...');
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Authentication error:', userError || 'No user found');
      return false;
    }
    
    console.log('✅ Authenticated as:', user.email);

    // Try to query the reminders table
    const { error: tableCheckError } = await supabase
      .from('reminders')
      .select('count')
      .limit(1);
      
    // If the table doesn't exist, let's try to create it
    if (tableCheckError && tableCheckError.message.includes('relation "reminders" does not exist')) {
      console.log('⚠️ Reminders table does not exist. Attempting to create it...');
      
      // Create the reminders table using SQL
      const { error: createTableError } = await supabase.rpc('create_reminders_table');
      
      if (createTableError) {
        console.error('❌ Failed to create reminders table:', createTableError);
        
        // If the RPC doesn't exist, provide guidance
        console.log(`
You need to create a stored procedure in Supabase to create the table.
          
You can run the following SQL in the Supabase SQL Editor:

CREATE OR REPLACE FUNCTION create_reminders_table()
RETURNS void AS $$
BEGIN
  -- Create the reminders table
  CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    dose_type TEXT NOT NULL,
    illness_type TEXT,
    frequency JSONB NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    times JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notification_settings JSONB NOT NULL,
    doses JSONB NOT NULL DEFAULT '[]'::JSONB,
    notifications JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Create an index on user_id for faster queries
  CREATE INDEX IF NOT EXISTS reminders_user_id_idx ON reminders(user_id);

  -- Add Row Level Security policies
  ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

  -- Policy for selecting reminders (users can only see their own reminders)
  CREATE POLICY reminders_select_policy ON reminders
    FOR SELECT USING (auth.uid() = user_id);

  -- Policy for inserting reminders (users can only insert their own reminders)
  CREATE POLICY reminders_insert_policy ON reminders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  -- Policy for updating reminders (users can only update their own reminders)
  CREATE POLICY reminders_update_policy ON reminders
    FOR UPDATE USING (auth.uid() = user_id);

  -- Policy for deleting reminders (users can only delete their own reminders)
  CREATE POLICY reminders_delete_policy ON reminders
    FOR DELETE USING (auth.uid() = user_id);

  -- Function to update the updated_at column
  CREATE OR REPLACE FUNCTION update_reminder_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Create a trigger to automatically update the updated_at column
  CREATE TRIGGER update_reminder_updated_at_trigger
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_reminder_updated_at();

  -- Grant permissions to authenticated users
  GRANT ALL ON reminders TO authenticated;
  GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated; 
END;
$$ LANGUAGE plpgsql;
        `);
        
        return false;
      }
      
      console.log('✅ Created reminders table successfully');
    } else if (tableCheckError) {
      console.error('❌ Error checking reminders table:', tableCheckError);
      return false;
    } else {
      console.log('✅ Reminders table already exists');
    }
    
    // Test inserting a record to verify column structure
    const now = new Date().toISOString();
    const testRecord = {
      id: `test-setup-${Date.now()}`,
      user_id: user.id,
      medicine_name: 'SETUP TEST - SAFE TO DELETE',
      dosage: '10mg',
      dose_type: 'pill',
      illness_type: 'test',
      frequency: JSON.stringify({ type: 'daily' }),
      start_date: now,
      end_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      times: JSON.stringify(['09:00']),
      is_active: true,
      notification_settings: JSON.stringify({ 
        sound: 'default', 
        vibration: true, 
        snoozeEnabled: false, 
        defaultSnoozeTime: 10 
      }),
      doses: JSON.stringify([]),
      notifications: JSON.stringify([]),
      created_at: now,
      updated_at: now
    };
    
    const { error: insertError } = await supabase
      .from('reminders')
      .insert(testRecord);
      
    if (insertError) {
      console.error('❌ Test insert failed:', insertError);
      
      if (insertError.message.includes('violates not-null constraint')) {
        console.error('❌ Table is missing required columns or has different constraints');
        
        // Try to get table structure
        const { data, error: structureError } = await supabase
          .from('reminders')
          .select('*')
          .limit(1);
          
        if (structureError) {
          console.error('❌ Failed to get table structure:', structureError);
        } else if (data && data.length > 0) {
          console.log('✅ Existing table columns:', Object.keys(data[0]));
          console.log('⚠️ You might need to update your table structure to match the expected schema');
        }
      }
      
      return false;
    }
    
    console.log('✅ Test record inserted successfully');
    
    // Clean up test record
    const { error: deleteError } = await supabase
      .from('reminders')
      .delete()
      .eq('id', testRecord.id);
      
    if (deleteError) {
      console.error('❌ Failed to clean up test record:', deleteError);
    } else {
      console.log('✅ Test record cleaned up successfully');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during database setup:', error);
    return false;
  }
} 