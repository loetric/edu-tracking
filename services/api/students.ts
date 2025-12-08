// Students API functions
import { Student, ChallengeType } from '../../types';
import { supabase } from '../supabase';

/**
 * Get all students
 */
export const getStudents = async (): Promise<Student[]> => {
  try {
    // Force fresh fetch - no caching
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: true }); // Order by creation time to preserve import order

    if (error) {
      console.error('Get students error:', error);
      throw error;
    }
    return (data || []) as Student[];
  } catch (error) {
    console.error('Get students error:', error);
    return [];
  }
};

/**
 * Import students (bulk insert with duplicate handling)
 */
export const importStudents = async (newStudents: Student[]): Promise<void> => {
  try {
    if (newStudents.length === 0) return;

    // First, remove duplicates within the imported list itself
    // Keep the first occurrence of each ID
    const seenIds = new Set<string>();
    const uniqueStudents = newStudents.filter(student => {
      if (seenIds.has(student.id)) {
        return false; // Skip duplicate
      }
      seenIds.add(student.id);
      return true;
    });

    if (uniqueStudents.length === 0) {
      throw new Error('جميع الطلاب في الملف مكررون');
    }

    // Get existing student IDs to avoid duplicates with database
    const { data: existingStudents, error: fetchError } = await supabase
      .from('students')
      .select('id');

    if (fetchError) {
      console.error('Error fetching existing students:', fetchError);
      throw fetchError;
    }

    const existingIds = new Set((existingStudents || []).map(s => s.id));
    
    // Filter out students that already exist in database
    const studentsToInsert = uniqueStudents.filter(s => !existingIds.has(s.id));

    if (studentsToInsert.length === 0) {
      throw new Error('جميع الطلاب موجودون بالفعل في النظام');
    }

    // Insert only new students (one by one to preserve order from Excel)
    // This ensures created_at timestamps maintain the import order
    for (const student of studentsToInsert) {
      try {
        const { error } = await supabase
          .from('students')
          .insert([student]);
        
        if (error) {
          // If it's a duplicate key error, skip this student
          if (error.code === '23505') {
            console.warn(`Skipping duplicate student: ${student.id}`);
            continue;
          }
          throw error;
        }
        
        // Small delay to ensure created_at timestamps are sequential
        // This helps preserve the order from Excel file
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error: any) {
        // If it's a duplicate key error, skip this student
        if (error.code === '23505') {
          console.warn(`Skipping duplicate student: ${student.id}`);
          continue;
        }
        throw error;
      }
    }

    // Return info about skipped students
    const fileDuplicates = newStudents.length - uniqueStudents.length;
    const dbDuplicates = uniqueStudents.length - studentsToInsert.length;
    const totalSkipped = fileDuplicates + dbDuplicates;
    
    if (totalSkipped > 0) {
      console.warn(`${totalSkipped} طالب تم تخطيهم (${fileDuplicates} مكرر في الملف، ${dbDuplicates} موجود في قاعدة البيانات)`);
    }
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

/**
 * Delete a single student
 */
export const deleteStudent = async (studentId: string): Promise<void> => {
  try {
    // Delete the student directly
    const { error, data } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)
      .select('id');

    if (error) {
      console.error('Delete student error:', error);
      // Check if it's an RLS/permission error
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        throw new Error('فشل في حذف الطالب - لا توجد صلاحية للحذف. يرجى التحقق من إعدادات قاعدة البيانات.');
      }
      throw error;
    }

    // If no data returned, the student might not exist or deletion was blocked
    // But in Supabase, if deletion succeeds, data will contain the deleted row
    // If data is empty, it means no rows matched (student doesn't exist or RLS blocked it)
    if (!data || data.length === 0) {
      // Verify if student still exists
      const { data: checkData, error: checkError } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking student after delete:', checkError);
        // If we can't check, assume deletion failed
        throw new Error('فشل في التحقق من حذف الطالب');
      }
      
      if (checkData) {
        // Student still exists - deletion was blocked (likely RLS)
        throw new Error('فشل في حذف الطالب - قد تكون هناك مشكلة في الصلاحيات أو سياسات قاعدة البيانات');
      }
      // Student doesn't exist - deletion might have succeeded or student never existed
      // We'll consider this a success
    }
  } catch (error: any) {
    console.error('Delete student exception:', error);
    // If it's already our custom error, throw it as is
    if (error.message && error.message.includes('فشل')) {
      throw error;
    }
    // Otherwise, wrap it
    throw new Error(error?.message || 'فشل في حذف الطالب. يرجى المحاولة مرة أخرى.');
  }
};

