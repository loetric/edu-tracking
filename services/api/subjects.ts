// Subjects API functions
import { Subject } from '../../types';
import { supabase } from '../supabase';
import { handleSupabaseError } from './errors';

/**
 * Get all subjects
 */
export const getSubjects = async (): Promise<Subject[]> => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Get subjects error:', error);
      throw error;
    }
    return (data || []).map(s => ({
      ...s,
      created_at: s.created_at ? new Date(s.created_at) : undefined
    })) as Subject[];
  } catch (error) {
    console.error('Get subjects error:', error);
    return [];
  }
};

/**
 * Add a new subject
 */
export const addSubject = async (subject: Omit<Subject, 'id' | 'created_at'>): Promise<Subject | null> => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .insert([{
        name: subject.name,
        code: subject.code || null,
        description: subject.description || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Add subject error:', error);
      handleSupabaseError(error);
      return null;
    }

    return {
      ...data,
      created_at: data.created_at ? new Date(data.created_at) : undefined
    } as Subject;
  } catch (error) {
    console.error('Add subject exception:', error);
    throw error;
  }
};

/**
 * Update a subject
 */
export const updateSubject = async (
  subjectId: string,
  updates: Partial<Omit<Subject, 'id' | 'created_at'>>
): Promise<Subject | null> => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .update({
        name: updates.name,
        code: updates.code,
        description: updates.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', subjectId)
      .select()
      .single();

    if (error) {
      console.error('Update subject error:', error);
      handleSupabaseError(error);
      return null;
    }

    return {
      ...data,
      created_at: data.created_at ? new Date(data.created_at) : undefined
    } as Subject;
  } catch (error) {
    console.error('Update subject exception:', error);
    throw error;
  }
};

/**
 * Delete a subject
 */
export const deleteSubject = async (subjectId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId);

    if (error) {
      console.error('Delete subject error:', error);
      handleSupabaseError(error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete subject exception:', error);
    throw error;
  }
};

