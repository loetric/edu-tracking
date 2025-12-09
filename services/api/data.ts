// Data management API functions
import { supabase } from '../supabase';

/**
 * Delete all students data
 */
export const deleteAllStudents = async (): Promise<void> => {
  try {
    // Delete all students using a more reliable method
    // First, get all student IDs to ensure we can delete them
    const { data: students, error: fetchError } = await supabase
      .from('students')
      .select('id');
    
    if (fetchError) throw fetchError;
    
    if (students && students.length > 0) {
      // Delete in batches if needed (Supabase has a limit on .in() array size)
      const batchSize = 1000;
      for (let i = 0; i < students.length; i += batchSize) {
        const batch = students.slice(i, i + batchSize);
        const ids = batch.map(s => s.id);
        const { error } = await supabase
          .from('students')
          .delete()
          .in('id', ids);
        
        if (error) throw error;
      }
    }
  } catch (error) {
    console.error('Delete all students error:', error);
    throw error;
  }
};

/**
 * Delete all schedule data
 */
export const deleteAllSchedule = async (): Promise<void> => {
  try {
    const { error } = await supabase
      .from('schedule')
      .delete()
      .neq('id', ''); // Delete all rows
    
    if (error) throw error;
  } catch (error) {
    console.error('Delete all schedule error:', error);
    throw error;
  }
};

/**
 * Delete all daily records (reports)
 */
export const deleteAllDailyRecords = async (): Promise<void> => {
  try {
    const { error } = await supabase
      .from('daily_records')
      .delete()
      .neq('id', ''); // Delete all rows
    
    if (error) throw error;
  } catch (error) {
    console.error('Delete all daily records error:', error);
    throw error;
  }
};

/**
 * Delete all chat messages
 */
export const deleteAllChatMessages = async (): Promise<void> => {
  try {
    console.log('deleteAllChatMessages: Starting deletion...');
    
    // Get all message IDs first, then delete them
    const { data: messages, error: fetchError } = await supabase
      .from('chat_messages')
      .select('id');
    
    if (fetchError) {
      console.error('deleteAllChatMessages: Error fetching messages:', fetchError);
      throw fetchError;
    }
    
    if (messages && messages.length > 0) {
      console.log(`deleteAllChatMessages: Found ${messages.length} messages to delete`);
      const ids = messages.map(m => m.id);
      
      // Delete in batches if needed (Supabase has limits)
      const batchSize = 100;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const { error, data: deletedData } = await supabase
          .from('chat_messages')
          .delete()
          .in('id', batch)
          .select();
        
        if (error) {
          console.error(`deleteAllChatMessages: Error deleting batch ${i / batchSize + 1}:`, error);
          throw error;
        }
        
        console.log(`deleteAllChatMessages: Deleted batch ${i / batchSize + 1}, ${deletedData?.length || 0} messages deleted`);
      }
      
      // Verify deletion
      const { data: remaining, error: verifyError } = await supabase
        .from('chat_messages')
        .select('id')
        .limit(1);
      
      if (verifyError) {
        console.warn('deleteAllChatMessages: Error verifying deletion:', verifyError);
      } else if (remaining && remaining.length > 0) {
        console.warn('deleteAllChatMessages: Some messages still remain after deletion');
        // Try one more time with a direct delete all
        const { error: finalError } = await supabase
          .from('chat_messages')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that matches all)
        
        if (finalError) {
          console.error('deleteAllChatMessages: Final deletion attempt failed:', finalError);
        }
      } else {
        console.log('deleteAllChatMessages: All messages deleted successfully');
      }
    } else {
      console.log('deleteAllChatMessages: No messages to delete');
    }
  } catch (error) {
    console.error('deleteAllChatMessages: Exception:', error);
    throw error;
  }
};

/**
 * Delete all logs
 */
export const deleteAllLogs = async (): Promise<void> => {
  try {
    // Get all log IDs first, then delete them
    const { data: logEntries, error: fetchError } = await supabase
      .from('logs')
      .select('id');
    
    if (fetchError) throw fetchError;
    
    if (logEntries && logEntries.length > 0) {
      const ids = logEntries.map(l => l.id);
      const { error } = await supabase
        .from('logs')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('Delete all logs error:', error);
    throw error;
  }
};

/**
 * Delete all completed sessions
 */
export const deleteAllCompletedSessions = async (): Promise<void> => {
  try {
    // Get all session IDs first, then delete them
    const { data: sessions, error: fetchError } = await supabase
      .from('completed_sessions')
      .select('id');
    
    if (fetchError) throw fetchError;
    
    if (sessions && sessions.length > 0) {
      const ids = sessions.map(s => s.id);
      const { error } = await supabase
        .from('completed_sessions')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('Delete all completed sessions error:', error);
    throw error;
  }
};

/**
 * Delete all substitutions
 */
export const deleteAllSubstitutions = async (): Promise<void> => {
  try {
    const { error } = await supabase
      .from('substitutions')
      .delete()
      .neq('id', ''); // Delete all rows
    
    if (error) throw error;
  } catch (error) {
    console.error('Delete all substitutions error:', error);
    throw error;
  }
};

/**
 * Delete all data except users and settings
 * This deletes: students, schedule, daily_records, chat_messages, logs, completed_sessions, substitutions
 * This preserves: profiles (users), settings
 */
export const deleteAllData = async (): Promise<void> => {
  try {
    // Delete in order (respecting foreign keys if any)
    await Promise.all([
      deleteAllStudents(),
      deleteAllSchedule(),
      deleteAllDailyRecords(),
      deleteAllChatMessages(),
      deleteAllLogs(),
      deleteAllCompletedSessions(),
      deleteAllSubstitutions()
    ]);
  } catch (error) {
    console.error('Delete all data error:', error);
    throw error;
  }
};

