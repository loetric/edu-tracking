// Files API functions
import { SharedFile, FileType, FileCategory, FileAccessLevel } from '../../types';
import { supabase } from '../supabase';
import { CONFIG } from '../../config';

/**
 * Get all files accessible to the current user
 */
export const getFiles = async (): Promise<SharedFile[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false });

    if (filesError) {
      console.error('Get files error:', filesError);
      throw filesError;
    }

    // Get read status for each file
    const fileIds = (files || []).map(f => f.id);
    const { data: reads } = await supabase
      .from('file_reads')
      .select('file_id, user_id')
      .in('file_id', fileIds);

    // Map reads to files
    const filesWithReads = (files || []).map(file => {
      const fileReads = reads?.filter(r => r.file_id === file.id) || [];
      const readBy = fileReads.map(r => r.user_id);
      const isReadByCurrentUser = user ? readBy.includes(user.id) : false;
      return {
        ...mapFileFromDB(file),
        read_by: readBy,
        read_count: fileReads.length,
        is_read_by_current_user: isReadByCurrentUser
      };
    });

    return filesWithReads as SharedFile[];
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
    // File path should be just the fileName, not including bucket name
    const filePath = fileName;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(CONFIG.FILES.STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      // If bucket doesn't exist, provide a helpful error message
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
        throw new Error(`Bucket "${CONFIG.FILES.STORAGE_BUCKET}" غير موجود. يرجى إنشاء الـ bucket في Supabase Storage أولاً.`);
      }
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
    updated_at: new Date(data.updated_at),
    read_by: data.read_by || [],
    read_count: data.read_count || 0
  };
}

/**
 * Mark a file as read by the current user
 */
export const markFileAsRead = async (fileId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('file_reads')
      .insert({
        file_id: fileId,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      // If it's a duplicate key error, that's fine - file already marked as read
      if (error.code === '23505') {
        return true;
      }
      console.error('Mark file as read error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Mark file as read exception:', error);
    return false;
  }
};

/**
 * Get users who read a specific file
 */
export const getFileReaders = async (fileId: string): Promise<Array<{ id: string; name: string; role: string }>> => {
  try {
    // Try with foreign key first
    const { data, error } = await supabase
      .from('file_reads')
      .select(`
        user_id,
        profiles!file_reads_user_id_fkey (
          id,
          name,
          role
        )
      `)
      .eq('file_id', fileId)
      .order('read_at', { ascending: false });

    if (error) {
      // Fallback: get reads and profiles separately
      const { data: readsData, error: readsError } = await supabase
        .from('file_reads')
        .select('user_id')
        .eq('file_id', fileId)
        .order('read_at', { ascending: false });

      if (readsError) {
        console.error('Get file readers error:', readsError);
        return [];
      }

      const userIds = (readsData || []).map(r => r.user_id);
      if (userIds.length === 0) return [];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('id', userIds);

      return (profilesData || []).map(p => ({
        id: p.id,
        name: p.name || 'غير معروف',
        role: p.role || 'unknown'
      }));
    }

    return (data || []).map((item: any) => ({
      id: item.profiles?.id || item.user_id,
      name: item.profiles?.name || 'غير معروف',
      role: item.profiles?.role || 'unknown'
    }));
  } catch (error) {
    console.error('Get file readers exception:', error);
    return [];
  }
};

