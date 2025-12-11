// Schedule API functions
import { ScheduleItem, Substitution } from '../../types';
import { supabase } from '../supabase';

/**
 * Get all schedule items
 */
export const getSchedule = async (): Promise<ScheduleItem[]> => {
  try {
    const { data, error } = await supabase
      .from('schedule')
      .select('*');

    if (error) throw error;
    return (data || []) as ScheduleItem[];
  } catch (error) {
    console.error('Get schedule error:', error);
    return [];
  }
};

/**
 * Update schedule (replace all)
 */
export const updateSchedule = async (schedule: ScheduleItem[]): Promise<void> => {
  try {
    console.log('updateSchedule: Starting update with', schedule.length, 'items');
    
    // First, delete all existing schedule items
    const { error: deleteError } = await supabase
      .from('schedule')
      .delete()
      .neq('id', ''); // Delete all rows (neq('id', '') matches all rows)
    
    if (deleteError) {
      console.error('Delete schedule error:', deleteError);
      throw deleteError;
    }
    
    console.log('updateSchedule: Deleted existing schedule');
    
    // If schedule is empty, we're done
    if (schedule.length === 0) {
      console.log('updateSchedule: Schedule is empty, update complete');
      return;
    }
    
    // Prepare schedule items with created_at if missing
    const now = new Date().toISOString();
    const scheduleWithTimestamps = schedule.map(item => ({
      ...item,
      created_at: item.created_at || now
    }));
    
    // Then insert the new schedule
    const { data, error: insertError } = await supabase
      .from('schedule')
      .insert(scheduleWithTimestamps)
      .select();
    
    if (insertError) {
      console.error('Insert schedule error:', insertError);
      throw insertError;
    }
    
    console.log('updateSchedule: Successfully inserted', data?.length || 0, 'items');
  } catch (error) {
    console.error('Update schedule error:', error);
    throw error;
  }
};

/**
 * Get all substitutions
 */
export const getSubstitutions = async (): Promise<Substitution[]> => {
  try {
    const { data, error } = await supabase
      .from('substitutions')
      .select('*');

    if (error) throw error;
    return (data || []) as Substitution[];
  } catch (error) {
    console.error('Get substitutions error:', error);
    return [];
  }
};

/**
 * Assign substitute teacher
 */
export const assignSubstitute = async (substitution: Substitution): Promise<void> => {
  try {
    await supabase
      .from('substitutions')
      .insert([substitution]);
  } catch (error) {
    console.error('Assign substitute error:', error);
    throw error;
  }
};

/**
 * Remove substitute teacher assignment
 */
export const removeSubstitute = async (substitutionId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('substitutions')
      .delete()
      .eq('id', substitutionId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Remove substitute error:', error);
    throw error;
  }
};

