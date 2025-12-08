// Data management API functions
import { supabase } from '../supabase';

/**
 * Delete all students data
 */
export const deleteAllStudents = async (): Promise<void> => {
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .neq('id', ''); // Delete all rows
    
    if (error) throw error;
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
    // Get all message IDs first, then delete them
    const { data: messages, error: fetchError } = await supabase
      .from('chat_messages')
      .select('id');
    
    if (fetchError) throw fetchError;
    
    if (messages && messages.length > 0) {
      const ids = messages.map(m => m.id);
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('Delete all chat messages error:', error);
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

