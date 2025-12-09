// Files API functions
import { SharedFile, FileType, FileCategory, FileAccessLevel } from '../../types';
import { supabase } from '../supabase';
import { CONFIG } from '../../config';

/**
 * Get all files accessible to the current user
 */
export const getFiles = async (): Promise<SharedFile[]> => {
  try {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get files error:', error);
      throw error;
    }
    return (data || []).map(mapFileFromDB) as SharedFile[];
  } catch (error) {
    console.error('Get files exception:', error);
    return [];
  }
};

/**
 * Upload a file (returns the file URL)
 * Note: This assumes files are uploaded to Supabase Storage
 * You may need to adjust this based on your storage setup
 */
export const uploadFile = async (
  file: File,
  name: string,
  description: string | undefined,
  fileType: FileType,
  accessLevel: FileAccessLevel
): Promise<string> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Determine file category from file extension
    const fileCategory = getFileCategory(file.name);

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${CONFIG.FILES.STORAGE_BUCKET}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(CONFIG.FILES.STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(CONFIG.FILES.STORAGE_BUCKET)
      .getPublicUrl(filePath);

    // Create file record in database
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert([{
        name,
        description,
        file_url: publicUrl,
        file_type: fileType,
        file_category: fileCategory,
        file_size: file.size,
        access_level: accessLevel,
        uploaded_by: user.id
      }])
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Try to delete uploaded file if DB insert fails
      await supabase.storage.from('files').remove([filePath]);
      throw dbError;
    }

    return publicUrl;
  } catch (error) {
    console.error('Upload file exception:', error);
    throw error;
  }
};

/**
 * Update a file record
 */
export const updateFile = async (
  fileId: string,
  updates: {
    name?: string;
    description?: string;
    file_type?: FileType;
    access_level?: FileAccessLevel;
  }
): Promise<SharedFile | null> => {
  try {
    const { data, error } = await supabase
      .from('files')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId)
      .select()
      .single();

    if (error) {
      console.error('Update file error:', error);
      throw error;
    }
    return mapFileFromDB(data);
  } catch (error) {
    console.error('Update file exception:', error);
    return null;
  }
};

/**
 * Delete a file
 */
export const deleteFile = async (fileId: string): Promise<boolean> => {
  try {
    // First get the file to get the storage path
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('file_url')
      .eq('id', fileId)
      .single();

    if (fetchError) {
      console.error('Fetch file error:', fetchError);
      throw fetchError;
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      console.error('Delete file error:', dbError);
      throw dbError;
    }

      // Try to delete from storage (extract path from URL)
      if (file?.file_url) {
        try {
          const url = new URL(file.file_url);
          const pathParts = url.pathname.split('/');
          const bucketIndex = pathParts.findIndex(part => part === CONFIG.FILES.STORAGE_BUCKET);
          if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
            const filePath = pathParts.slice(bucketIndex + 1).join('/');
            await supabase.storage.from(CONFIG.FILES.STORAGE_BUCKET).remove([filePath]);
          }
        } catch (storageError) {
          console.warn('Failed to delete file from storage:', storageError);
          // Don't throw - file is already deleted from DB
        }
      }

    return true;
  } catch (error) {
    console.error('Delete file exception:', error);
    return false;
  }
};

/**
 * Determine file category from filename
 */
function getFileCategory(filename: string): FileCategory {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return 'excel';
  } else if (['doc', 'docx'].includes(ext)) {
    return 'word';
  } else if (ext === 'pdf') {
    return 'pdf';
  } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return 'image';
  } else {
    return 'other';
  }
}

/**
 * Map database file to SharedFile type
 */
function mapFileFromDB(data: any): SharedFile {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    file_url: data.file_url,
    file_type: data.file_type,
    file_category: data.file_category,
    file_size: data.file_size,
    access_level: data.access_level,
    uploaded_by: data.uploaded_by,
    created_at: new Date(data.created_at),
    updated_at: new Date(data.updated_at)
  };
}

