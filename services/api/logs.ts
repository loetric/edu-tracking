// Logs API functions
import { LogEntry } from '../../types';
import { supabase } from '../supabase';

/**
 * Get all logs
 */
export const getLogs = async (): Promise<LogEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data || []).map(l => ({
      id: l.id,
      timestamp: new Date(l.timestamp),
      action: l.action,
      details: l.details || '',
      user: l.user || ''
    })) as LogEntry[];
  } catch (error) {
    console.error('Get logs error:', error);
    return [];
  }
};

/**
 * Add a log entry
 */
export const addLog = async (log: LogEntry): Promise<void> => {
  try {
    const payload: any = {
      timestamp: log.timestamp?.toISOString() || new Date().toISOString(),
      action: log.action,
      details: log.details || '',
      user: log.user
    };

    // Don't include id - let database generate UUID automatically
    // The id field in LogEntry is for frontend use only

    const { error } = await supabase
      .from('logs')
      .insert([payload]);

    if (error) {
      console.error('Supabase insert log error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Add log error:', error);
  }
};

