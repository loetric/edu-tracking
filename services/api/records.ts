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
    // Ensure all records have an id
    const recordsArray = Object.values(records).map(r => ({
      ...r,
      id: r.id || `${r.studentId}_${r.date}`
    }));

    // Get existing records to check which ones need update vs insert
    const { data: existingRecords, error: fetchError } = await supabase
      .from('daily_records')
      .select('id');

    if (fetchError) {
      console.error('Error fetching existing records:', fetchError);
      throw fetchError;
    }

    const existingIds = new Set((existingRecords || []).map(r => r.id));

    const toInsert = recordsArray.filter(r => !existingIds.has(r.id));
    const toUpdate = recordsArray.filter(r => existingIds.has(r.id));

    // Insert new records
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('daily_records').insert(toInsert);
      if (insertError) {
        console.error('Error inserting records:', insertError);
        throw insertError;
      }
    }

    // Update existing records
    if (toUpdate.length > 0) {
      for (const record of toUpdate) {
        const { error: updateError } = await supabase
          .from('daily_records')
          .update({
            attendance: record.attendance,
            participation: record.participation,
            homework: record.homework,
            behavior: record.behavior,
            notes: record.notes
          })
          .eq('id', record.id);
        
        if (updateError) {
          console.error('Error updating record:', updateError, record);
          throw updateError;
        }
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

