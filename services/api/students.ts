// Students API functions
import { Student, ChallengeType } from '../../types';
import { supabase } from '../supabase';

/**
 * Get all students
 */
export const getStudents = async (): Promise<Student[]> => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*');

    if (error) throw error;
    return (data || []) as Student[];
  } catch (error) {
    console.error('Get students error:', error);
    return [];
  }
};

/**
 * Import students (bulk insert)
 */
export const importStudents = async (newStudents: Student[]): Promise<void> => {
  try {
    await supabase
      .from('students')
      .insert(newStudents);
  } catch (error) {
    console.error('Import students error:', error);
    throw error;
  }
};

/**
 * Add a single student
 */
export const addStudent = async (student: Student): Promise<void> => {
  try {
    await supabase
      .from('students')
      .insert([student]);
  } catch (error) {
    console.error('Add student error:', error);
    throw error;
  }
};

/**
 * Update student challenge status
 */
export const updateStudentChallenge = async (
  studentId: string,
  challenge: ChallengeType
): Promise<void> => {
  try {
    await supabase
      .from('students')
      .update({ challenge })
      .eq('id', studentId);
  } catch (error) {
    console.error('Update student challenge error:', error);
    throw error;
  }
};

/**
 * Update student data
 */
export const updateStudent = async (
  studentId: string,
  updates: Partial<Student>
): Promise<Student | null> => {
  try {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', studentId)
      .select()
      .single();

    if (error) {
      console.error('Update student error:', error);
      return null;
    }

    return data as Student;
  } catch (error) {
    console.error('Update student exception:', error);
    return null;
  }
};

