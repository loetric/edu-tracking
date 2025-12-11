// Settings API functions
import { SchoolSettings, User } from '../../types';
import { INITIAL_SETTINGS } from '../../constants';
import { supabase } from '../supabase';

/**
 * Register school (create initial settings)
 */
export const registerSchool = async (
  schoolName: string,
  adminName: string,
  adminUser?: User
): Promise<void> => {
  try {
    const { data: settingsData } = await supabase
      .from('settings')
      .select('id')
      .limit(1)
      .single();

    if (settingsData) {
      await supabase
        .from('settings')
        .update({ name: schoolName })
        .eq('id', settingsData.id);
    } else {
      await supabase
        .from('settings')
        .insert([{ name: schoolName, ...INITIAL_SETTINGS }]);
    }
  } catch (error) {
    console.error('Register school error:', error);
    throw error;
  }
};

/**
 * Get school settings
 * Throws error if settings not found - never returns mock data
 */
export const getSettings = async (): Promise<SchoolSettings> => {
  try {
    // Force fresh fetch by adding timestamp to prevent caching
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Get settings error:', error);
      // If it's a "not found" error, that's okay - settings might not exist yet
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        throw new Error('لا توجد بيانات مدرسة في قاعدة البيانات');
      }
      throw new Error('فشل في تحميل بيانات المدرسة من قاعدة البيانات');
    }
    
    if (!data) {
      throw new Error('لا توجد بيانات مدرسة في قاعدة البيانات');
    }
    
    // Parse classGrades if it's a string (JSON)
    const parsedData = { ...data };
    if (parsedData.classGrades && typeof parsedData.classGrades === 'string') {
      try {
        parsedData.classGrades = JSON.parse(parsedData.classGrades);
      } catch (e) {
        console.error('Error parsing classGrades:', e);
        parsedData.classGrades = [];
      }
    }
    
    // Ensure classGrades is an array
    if (parsedData.classGrades && !Array.isArray(parsedData.classGrades)) {
      parsedData.classGrades = [];
    }
    
    return parsedData as SchoolSettings;
  } catch (error) {
    console.error('Get settings error:', error);
    throw error; // Re-throw to let caller handle
  }
};

/**
 * Update school settings
 */
export const updateSettings = async (settings: SchoolSettings): Promise<void> => {
  try {
    const { data: existingSettings } = await supabase
      .from('settings')
      .select('id')
      .limit(1)
      .single();

    // Ensure classGrades is properly formatted
    const settingsToSave: any = { ...settings };
    
    // Handle classGrades - convert to JSON if it's an array
    if (settingsToSave.classGrades && Array.isArray(settingsToSave.classGrades)) {
      // Filter out empty values and convert to JSON string for Supabase
      const cleanClassGrades = settingsToSave.classGrades.filter(g => g && g.trim().length > 0);
      // Supabase JSONB columns can accept arrays directly, but we'll ensure it's clean
      settingsToSave.classGrades = cleanClassGrades;
    } else if (!settingsToSave.classGrades) {
      // If classGrades is not provided, set it to empty array
      settingsToSave.classGrades = [];
    }
    
    // Ensure academicYear is included (can be null/empty)
    if (!settingsToSave.hasOwnProperty('academicYear')) {
      settingsToSave.academicYear = settings.academicYear || null;
    }

    if (existingSettings) {
      // Only update fields that exist in the database
      // If classGrades column doesn't exist, exclude it from update
      const updateData: any = { ...settingsToSave };
      
      // Try to update, if classGrades column doesn't exist, update without it
      const { error } = await supabase
        .from('settings')
        .update(updateData)
        .eq('id', existingSettings.id);
      
      if (error) {
        // If error is about missing column, try without it
        if (error.code === 'PGRST204') {
          if (error.message?.includes('classGrades')) {
            console.warn('classGrades column not found, updating without it. Please run migration: sql/add_class_grades_column.sql');
            delete updateData.classGrades;
          } else if (error.message?.includes('academicYear')) {
            console.warn('academicYear column not found, updating without it. Please run migration: sql/add_academic_year_to_settings.sql');
            delete updateData.academicYear;
          } else if (error.message?.includes('principalName') || error.message?.includes('educationalAffairsOfficer') || error.message?.includes('stampUrl')) {
            console.warn('New school info columns not found, updating without them. Please run migration: sql/add_school_info_fields.sql');
            delete updateData.principalName;
            delete updateData.educationalAffairsOfficer;
            delete updateData.stampUrl;
          } else {
            console.error('Update settings error:', error);
            throw error;
          }
          
          const { error: retryError } = await supabase
            .from('settings')
            .update(updateData)
            .eq('id', existingSettings.id);
          
          if (retryError) {
            console.error('Update settings error (retry):', retryError);
            throw retryError;
          }
        } else {
          console.error('Update settings error:', error);
          throw error;
        }
      }
    } else {
      // For insert, exclude classGrades if column doesn't exist
      const insertData: any = { ...settingsToSave };
      const { error } = await supabase
        .from('settings')
        .insert([insertData]);
      
      if (error) {
        // If error is about missing column, try without it
        if (error.code === 'PGRST204') {
          if (error.message?.includes('classGrades')) {
            console.warn('classGrades column not found, inserting without it. Please run migration: sql/add_class_grades_column.sql');
            delete insertData.classGrades;
          } else if (error.message?.includes('academicYear')) {
            console.warn('academicYear column not found, inserting without it. Please run migration: sql/add_academic_year_to_settings.sql');
            delete insertData.academicYear;
          } else if (error.message?.includes('principalName') || error.message?.includes('educationalAffairsOfficer') || error.message?.includes('stampUrl')) {
            console.warn('New school info columns not found, inserting without them. Please run migration: sql/add_school_info_fields.sql');
            delete insertData.principalName;
            delete insertData.educationalAffairsOfficer;
            delete insertData.stampUrl;
          } else {
            console.error('Insert settings error:', error);
            throw error;
          }
          
          const { error: retryError } = await supabase
            .from('settings')
            .insert([insertData]);
          
          if (retryError) {
            console.error('Insert settings error (retry):', retryError);
            throw retryError;
          }
        } else {
          console.error('Insert settings error:', error);
          throw error;
        }
      }
    }
  } catch (error) {
    console.error('Update settings error:', error);
    throw error;
  }
};

