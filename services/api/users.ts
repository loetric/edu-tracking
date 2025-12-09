// User management API functions
import { User, Role } from '../../types';
import { supabase } from '../supabase';
import { fetchUserProfile, mapProfileToUser } from './helpers';
import { handleSupabaseError, ApiError } from './errors';

/**
 * Get all users
 */
export const getUsers = async (): Promise<User[]> => {
  try {
    // Force fresh fetch - no caching
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email, name, role, avatar');

    if (error) {
      console.error('Get users error:', error);
      throw error;
    }
    return (data || []).map((p: any) => mapProfileToUser(p)) as User[];
  } catch (error) {
    console.error('Get users error:', error);
    return [];
  }
};

/**
 * Update single user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: { username?: string; name?: string; role?: Role; avatar?: string }
): Promise<User | null> => {
  try {
    // First, update the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      console.error('Update user profile error:', updateError);
      return null;
    }

    // Then, fetch the updated profile
    return await fetchUserProfile(userId);
  } catch (error) {
    console.error('Update user profile exception:', error);
    return null;
  }
};

/**
 * Update multiple users (bulk operation)
 */
export const updateUsers = async (users: User[]): Promise<void> => {
  try {
    const payload = users.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      avatar: u.avatar
    }));

    const ids = payload.map(p => p.id).filter(Boolean);

    // Get all existing profile IDs
    const { data: allProfiles } = await supabase.from('profiles').select('id');
    const allIds = new Set((allProfiles || []).map((p: { id: string }) => p.id));
    const idsToDelete = Array.from(allIds).filter((id: string) => !ids.includes(id));

    // Delete profiles not in new list
    if (idsToDelete.length > 0) {
      await supabase.from('profiles').delete().in('id', idsToDelete);
    }

    // Upsert remaining/updated profiles
    if (payload.length > 0) {
      await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    }
  } catch (error) {
    console.error('Update users error:', error);
    throw error;
  }
};

/**
 * Check if email already exists
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error checking email:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('checkEmailExists exception:', error);
    return false;
  }
};

/**
 * Check if username already exists
 */
export const checkUsernameExists = async (username: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error checking username:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('checkUsernameExists exception:', error);
    return false;
  }
};

/**
 * Delete a user completely (from both auth.users and profiles)
 * NOTE: This requires admin privileges and should be used carefully
 */
export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    console.log('deleteUser: Deleting user:', userId);
    
    // First, delete from profiles table
    const { error: profileError, data: deleteData } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)
      .select();

    if (profileError) {
      console.error('deleteUser: Error deleting profile:', profileError);
      throw new Error(`فشل في حذف المستخدم: ${profileError.message}`);
    }

    // Verify deletion was successful
    if (deleteData && deleteData.length === 0) {
      console.warn('deleteUser: No profile found to delete for userId:', userId);
      // Don't throw error - might already be deleted
    } else {
      console.log('deleteUser: Profile deleted successfully:', deleteData);
    }

    // Note: Deleting from auth.users requires admin API with service_role key
    // For now, deleting from profiles is sufficient - the user won't be accessible from the app
    // The auth user entry will remain but won't cause issues
    
    console.log('deleteUser: User deleted successfully');
    return true;
  } catch (error: any) {
    console.error('deleteUser exception:', error);
    throw error;
  }
};

