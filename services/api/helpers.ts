// Helper functions for API operations
import { User, Role } from '../../types';
import { supabase } from '../supabase';

/**
 * Maps a database profile to a User object
 */
export const mapProfileToUser = (profile: any): User => {
  return {
    id: profile.id,
    username: profile.username,
    name: profile.name,
    role: profile.role as Role,
    avatar: profile.avatar,
    email: profile.email || undefined // Include email if available
  } as User;
};

/**
 * Fetches a user profile from the database by user ID
 */
export const fetchUserProfile = async (userId: string): Promise<User | null> => {
  try {
    console.log('fetchUserProfile: Fetching profile for userId:', userId);
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.warn('fetchUserProfile: Error fetching profile:', error);
      console.warn('fetchUserProfile: Error code:', error.code, 'Error message:', error.message);
      // Don't return null immediately - might be RLS or network issue
      // Return null only if it's a clear "not found" error
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        console.warn('fetchUserProfile: Profile not found (PGRST116)');
        return null;
      }
      // For other errors, throw to allow retry logic
      throw error;
    }
    
    if (!profile) {
      console.warn('fetchUserProfile: No profile data returned for userId:', userId);
      return null;
    }
    
    console.log('fetchUserProfile: Profile found:', profile.name);
    return mapProfileToUser(profile);
  } catch (error) {
    console.error('fetchUserProfile: Exception:', error);
    // Re-throw to allow retry logic in calling code
    throw error;
  }
};

/**
 * Fetches a user profile by email
 */
export const fetchUserProfileByEmail = async (email: string): Promise<User | null> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();
    
    if (error || !profile) {
      return null;
    }
    
    return mapProfileToUser(profile);
  } catch (error) {
    console.error('Error fetching user profile by email:', error);
    return null;
  }
};

/**
 * Resolves email from username (checks if username is email or looks up in profiles)
 */
export const resolveEmailFromUsername = async (username: string): Promise<string | null> => {
  try {
    // If username looks like an email, use it directly
    if (username.includes('@')) {
      return username;
    }

    // Otherwise, look up in profiles table
    const { data: profileRow, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', username)
      .limit(1)
      .single();

    if (error || !profileRow?.email) {
      return null;
    }

    return profileRow.email;
  } catch (error) {
    console.error('Error resolving email from username:', error);
    return null;
  }
};

