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
    // Delete existing schedule and insert new one
    await supabase.from('schedule').delete().neq('id', '');
    await supabase.from('schedule').insert(schedule);
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

