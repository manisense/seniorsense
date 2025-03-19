/**
 * Supabase Test Service
 * Utility functions to test Supabase integration and diagnose issues
 */

import supabase from './supabase';

/**
 * Test connection to Supabase by fetching the authenticated user
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Authentication error:', userError);
      return false;
    }
    
    if (!user) {
      console.error('❌ No authenticated user found');
      return false;
    }
    
    console.log('✅ Authenticated as:', user.email);
    
    // Test simple query to verify database access
    const { data: remindersCount, error: countError } = await supabase
      .from('reminders')
      .select('count')
      .eq('user_id', user.id);
      
    if (countError) {
      console.error('❌ Database query error:', countError);
      
      // Check for specific error types
      if (countError.message.includes('relation "reminders" does not exist')) {
        console.error('❌ The reminders table does not exist in the database');
      } else if (countError.message.includes('permission denied')) {
        console.error('❌ Permission denied - check Row Level Security policies');
      }
      
      return false;
    }
    
    console.log('✅ Database query successful:', remindersCount);
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during connection test:', error);
    return false;
  }
}

/**
 * Get the column names from the reminders table
 */
export async function getTableColumns(): Promise<string[] | null> {
  try {
    console.log('🔍 Getting table columns...');
    
    // Test authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Authentication error:', userError);
      return null;
    }
    
    if (!user) {
      console.error('❌ No authenticated user found');
      return null;
    }
    
    // Try to get a record to examine its structure
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('❌ Error getting table columns:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ No records found in the table. Creating test record to check structure...');
      
      // Create a test record to get the structure
      const now = new Date().toISOString();
      const testRecord = {
        id: `test-columns-${Date.now()}`,
        user_id: user.id,
        medicine_name: 'COLUMNS TEST - SAFE TO DELETE',
        dosage: '10mg',
        dose_type: 'pill',
        illness_type: 'test',
        frequency: JSON.stringify({ type: 'daily' }),
        start_date: now,
        end_date: new Date(Date.now() + 86400000).toISOString(),
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
        console.error('❌ Error creating test record:', insertError);
        return null;
      }
      
      // Get the record we just created
      const { data: testData, error: testError } = await supabase
        .from('reminders')
        .select('*')
        .eq('id', testRecord.id)
        .limit(1);
        
      if (testError || !testData || testData.length === 0) {
        console.error('❌ Error retrieving test record:', testError || 'No data returned');
        return null;
      }
      
      // Clean up the test record
      await supabase
        .from('reminders')
        .delete()
        .eq('id', testRecord.id);
        
      // Return the columns from the test record
      return Object.keys(testData[0]);
    }
    
    // Return the columns from the existing record
    return Object.keys(data[0]);
  } catch (error) {
    console.error('❌ Unexpected error getting table columns:', error);
    return null;
  }
}

/**
 * Verify that the reminders table has the expected schema
 */
export async function verifyTableSchema(): Promise<boolean> {
  try {
    console.log('🔍 Verifying table schema...');
    
    // Get the columns from the table
    const columns = await getTableColumns();
    
    if (!columns) {
      console.error('❌ Failed to get table columns');
      return false;
    }
    
    // Expected columns according to the schema
    const expectedColumns = [
      'id', 'user_id', 'medicine_name', 'dosage', 'dose_type', 'illness_type',
      'frequency', 'start_date', 'end_date', 'times', 'is_active', 
      'notification_settings', 'doses', 'notifications', 'created_at', 'updated_at'
    ];
    
    console.log('✅ Table columns:', columns.join(', '));
    console.log('🔍 Expected columns:', expectedColumns.join(', '));
    
    // Check if all expected columns exist
    const missingColumns = expectedColumns.filter(col => !columns.includes(col));
    
    if (missingColumns.length > 0) {
      console.error('❌ Missing columns:', missingColumns.join(', '));
      return false;
    }
    
    console.log('✅ All expected columns exist in the table');
    
    // Create a test record to verify data types
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Authentication error:', userError || 'No user found');
      return false;
    }
    
    const now = new Date().toISOString();
    const testRecord = {
      id: `test-schema-${Date.now()}`,
      user_id: user.id,
      medicine_name: 'SCHEMA TEST - SAFE TO DELETE',
      dosage: '10mg',
      dose_type: 'pill',
      illness_type: 'test',
      frequency: JSON.stringify({ type: 'daily' }),
      start_date: now,
      end_date: new Date(Date.now() + 86400000).toISOString(),
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
    
    // Try to insert the test record
    const { error: insertError } = await supabase
      .from('reminders')
      .insert(testRecord);
      
    if (insertError) {
      console.error('❌ Error inserting test record:', insertError);
      
      // Check for specific error types
      if (insertError.message.includes('invalid input syntax')) {
        console.error('❌ Data type mismatch - check that your column types match the expected schema');
      }
      
      return false;
    }
    
    console.log('✅ Test record created successfully');
    
    // Clean up the test record
    const { error: deleteError } = await supabase
      .from('reminders')
      .delete()
      .eq('id', testRecord.id);
      
    if (deleteError) {
      console.error('⚠️ Failed to clean up test record:', deleteError);
    } else {
      console.log('✅ Test record cleaned up successfully');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error verifying table schema:', error);
    return false;
  }
}

/**
 * Test saving a reminder to Supabase
 */
export async function testSaveReminder(): Promise<boolean> {
  try {
    console.log('🔍 Testing reminder save to Supabase...');
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Authentication error:', userError || 'No user found');
      return false;
    }
    
    // Create a test reminder
    const testReminder = {
      id: `test-${Date.now()}`,
      user_id: user.id,
      medicine_name: 'TEST MEDICINE - SAFE TO DELETE',
      dosage: '10mg',
      dose_type: 'pill',
      illness_type: 'test',
      frequency: JSON.stringify({ type: 'daily' }),
      start_date: new Date().toISOString(),
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Try to save the reminder
    const { error: saveError } = await supabase
      .from('reminders')
      .insert(testReminder);
      
    if (saveError) {
      console.error('❌ Failed to save test reminder:', saveError);
      
      // Check for specific error types
      if (saveError.message.includes('violates not-null constraint')) {
        console.error('❌ Missing required columns - check your table structure');
        console.error('Required fields:', Object.keys(testReminder).join(', '));
      } else if (saveError.message.includes('relation "reminders" does not exist')) {
        console.error('❌ The reminders table does not exist in the database');
      } else if (saveError.message.includes('permission denied')) {
        console.error('❌ Permission denied - check Row Level Security policies');
      } else if (saveError.message.includes('invalid input syntax')) {
        console.error('❌ Invalid input format - check data types');
      }
      
      return false;
    }
    
    console.log('✅ Test reminder saved successfully');
    
    // Clean up - delete the test reminder
    const { error: deleteError } = await supabase
      .from('reminders')
      .delete()
      .eq('id', testReminder.id);
      
    if (deleteError) {
      console.error('⚠️ Failed to clean up test reminder:', deleteError);
    } else {
      console.log('✅ Test reminder cleaned up successfully');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error testing reminder save:', error);
    return false;
  }
}

/**
 * Test complete reminder workflow from save to retrieve
 */
export async function testCompleteReminderFlow(): Promise<boolean> {
  try {
    console.log('🔍 Testing complete reminder workflow...');
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Authentication error:', userError || 'No user found');
      return false;
    }
    
    // Step 1: Create and save a test reminder
    const testId = `test-flow-${Date.now()}`;
    const testReminder = {
      id: testId,
      user_id: user.id,
      medicine_name: 'FLOW TEST - SAFE TO DELETE',
      dosage: '10mg',
      dose_type: 'pill',
      illness_type: 'test',
      frequency: JSON.stringify({ type: 'daily' }),
      start_date: new Date().toISOString(),
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Save the reminder
    const { error: saveError } = await supabase
      .from('reminders')
      .insert(testReminder);
      
    if (saveError) {
      console.error('❌ Failed to save test reminder:', saveError);
      return false;
    }
    
    console.log('✅ Step 1: Test reminder saved successfully');
    
    // Step 2: Retrieve the reminder
    const { data: retrievedData, error: retrieveError } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', testId);
      
    if (retrieveError || !retrievedData || retrievedData.length === 0) {
      console.error('❌ Failed to retrieve test reminder:', retrieveError || 'No data returned');
      return false;
    }
    
    console.log('✅ Step 2: Test reminder retrieved successfully');
    
    const retrievedReminder = retrievedData[0];
    console.log('Retrieved reminder data structure:');
    Object.keys(retrievedReminder).forEach(key => {
      console.log(`${key}: ${typeof retrievedReminder[key]} = ${JSON.stringify(retrievedReminder[key]).slice(0, 50)}...`);
    });
    
    // Step 3: Update the reminder
    const { error: updateError } = await supabase
      .from('reminders')
      .update({ 
        medicine_name: 'FLOW TEST UPDATED', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', testId);
      
    if (updateError) {
      console.error('❌ Failed to update test reminder:', updateError);
      return false;
    }
    
    console.log('✅ Step 3: Test reminder updated successfully');
    
    // Step 4: Delete the reminder
    const { error: deleteError } = await supabase
      .from('reminders')
      .delete()
      .eq('id', testId);
      
    if (deleteError) {
      console.error('❌ Failed to delete test reminder:', deleteError);
      return false;
    }
    
    console.log('✅ Step 4: Test reminder deleted successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during complete reminder flow test:', error);
    return false;
  }
} 