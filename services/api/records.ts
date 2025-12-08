// Daily records API functions
import { DailyRecord } from '../../types';
import { supabase } from '../supabase';

/**
 * Get all daily records
 */
export const getDailyRecords = async (): Promise<Record<string, DailyRecord>> => {
  try {
    const { data, error } = await supabase
      .from('daily_records')
      .select('*');

    if (error) throw error;

    // Convert array to record object
    const records: Record<string, DailyRecord> = {};
    (data || []).forEach(record => {
      records[record.id] = record as DailyRecord;
    });
    return records;
  } catch (error) {
    console.error('Get daily records error:', error);
    return {};
  }
};

/**
 * Save daily records (insert or update)
 */
export const saveDailyRecords = async (records: Record<string, DailyRecord>): Promise<void> => {
  try {
    const recordsArray = Object.values(records).map(r => ({
      ...r,
      id: r.id || `${r.studentId}_${r.date}`
    }));

    const { data: existingRecords } = await supabase
      .from('daily_records')
      .select('id');

    const existingIds = new Set((existingRecords || []).map(r => r.id));

    const toInsert = recordsArray.filter(r => !existingIds.has(r.id));
    const toUpdate = recordsArray.filter(r => existingIds.has(r.id));

    if (toInsert.length > 0) {
      await supabase.from('daily_records').insert(toInsert);
    }
    if (toUpdate.length > 0) {
      for (const record of toUpdate) {
        await supabase
          .from('daily_records')
          .update(record)
          .eq('id', record.id);
      }
    }
  } catch (error) {
    console.error('Save daily records error:', error);
    throw error;
  }
};

/**
 * Get completed sessions
 */
export const getCompletedSessions = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('completed_sessions')
      .select('session_id');

    if (error) throw error;
    return (data || []).map(item => item.session_id);
  } catch (error) {
    console.error('Get completed sessions error:', error);
    return [];
  }
};

/**
 * Mark session as completed
 */
export const markSessionComplete = async (sessionId: string): Promise<void> => {
  try {
    await supabase
      .from('completed_sessions')
      .insert([{ session_id: sessionId }]);
  } catch (error) {
    console.error('Mark session complete error:', error);
    // Ignore if already exists
  }
};

