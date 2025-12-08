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
    avatar: profile.avatar
  } as User;
};

/**
 * Fetches a user profile from the database by user ID
 */
export const fetchUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !profile) {
      console.warn('No profile found for user id', userId, error);
      return null;
    }
    
    return mapProfileToUser(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
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

