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
    const settingsToSave = { ...settings };
    if (settingsToSave.classGrades && Array.isArray(settingsToSave.classGrades)) {
      // Supabase will handle JSON array automatically, but ensure it's clean
      settingsToSave.classGrades = settingsToSave.classGrades.filter(g => g && g.trim().length > 0);
    }

    if (existingSettings) {
      const { error } = await supabase
        .from('settings')
        .update(settingsToSave)
        .eq('id', existingSettings.id);
      
      if (error) {
        console.error('Update settings error:', error);
        throw error;
      }
    } else {
      const { error } = await supabase
        .from('settings')
        .insert([settingsToSave]);
      
      if (error) {
        console.error('Insert settings error:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Update settings error:', error);
    throw error;
  }
};

