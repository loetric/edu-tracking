// Authentication API functions
import { User, Role } from '../../types';
import { CONFIG } from '../../config';
import { supabase } from '../supabase';
import { fetchUserProfile, fetchUserProfileByEmail, resolveEmailFromUsername } from './helpers';
import { handleSupabaseError, ApiError } from './errors';
import { validateEmail, validatePassword } from './validation';

/**
 * Get current authenticated user from session
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    console.log('getCurrentUser: Checking session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('getCurrentUser: Session error:', sessionError);
      return null;
    }
    
    if (!session?.user) {
      console.log('getCurrentUser: No session or user');
      return null;
    }
    
    console.log('getCurrentUser: Session found, userId:', session.user.id);
    const user = await fetchUserProfile(session.user.id);
    
    if (user) {
      console.log('getCurrentUser: User profile loaded:', user.name);
    } else {
      console.warn('getCurrentUser: fetchUserProfile returned null');
    }
    
    return user;
  } catch (error) {
    console.error('getCurrentUser exception:', error);
    // Re-throw to allow retry logic in calling code
    throw error;
  }
};

/**
 * Sign in with email and password
 */
export const signIn = async (email: string, password: string): Promise<User | null> => {
  try {
    const res = await supabase.auth.signInWithPassword({ email, password });
    if (res.error) {
      console.error('Supabase auth signIn error:', res.error);
      return null;
    }
    
    const user = res.data.user;
    if (!user) return null;
    
    return await fetchUserProfile(user.id);
  } catch (error) {
    console.error('signIn exception:', error);
    return null;
  }
};

/**
 * Sign up a new user
 */
export const signUp = async (
  email: string,
  password: string,
  profile: { username: string; name: string; role: Role; avatar?: string }
): Promise<{ user: User | null; error: string | null }> => {
  try {
    console.log('=== signUp: Starting ===');
    console.log('=== signUp: Input email ===', {
      email: email,
      type: typeof email,
      length: email?.length,
      charCodes: email?.split('').map(c => c.charCodeAt(0))
    });

    // Trim and validate email
    const trimmedEmail = (email || '').trim();
    console.log('=== signUp: Trimmed email ===', {
      trimmed: trimmedEmail,
      length: trimmedEmail.length,
      originalLength: email?.length
    });

    if (!trimmedEmail) {
      console.warn('=== signUp: Email is empty after trim ===');
      return { user: null, error: 'البريد الإلكتروني مطلوب' };
    }

    // Validate inputs
    console.log('=== signUp: Calling validateEmail ===');
    const emailValidation = validateEmail(trimmedEmail);
    console.log('=== signUp: Email validation result ===', emailValidation);
    
    if (!emailValidation.valid) {
      console.error('=== signUp: Email validation failed ===', emailValidation.error);
      return { user: null, error: emailValidation.error || 'البريد الإلكتروني غير صحيح' };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return { user: null, error: passwordValidation.error };
    }

    // Sign up with user metadata so trigger can use it
    const res = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          username: profile.username,
          full_name: profile.name,
          role: profile.role,
          avatar_url: profile.avatar
        }
      }
    });

    if (res.error) {
      console.error('Supabase auth signUp error:', res.error);
      console.error('Error details:', {
        message: res.error.message,
        status: res.error.status,
        code: res.error.code,
        email: trimmedEmail
      });
      const apiError = handleSupabaseError(res.error);
      return { user: null, error: apiError.message };
    }

    // Handle case where user is created but email confirmation is pending
    let userId: string | null = null;

    if (res.data.user) {
      userId = res.data.user.id;
    } else {
      // User might be created but email confirmation pending
      // Wait a bit for trigger to create profile, then check by email
      await new Promise(resolve => setTimeout(resolve, CONFIG.TIMEOUTS.PROFILE_WAIT));
      const profileByEmail = await fetchUserProfileByEmail(trimmedEmail);
      if (profileByEmail) {
        userId = profileByEmail.id;
      }
    }

    if (!userId) {
      // Check if profile was created by trigger (by email)
      const profileCheck = await fetchUserProfileByEmail(trimmedEmail);

      if (profileCheck) {
        return { user: profileCheck, error: null };
      }

      // User created in auth but profile not found
      return {
        user: null,
        error: CONFIG.ERRORS.EMAIL_CONFIRMATION_PENDING
      };
    }

    // Trigger will auto-create profile, but we update it with exact values
    const payload = {
      id: userId,
      username: profile.username,
      name: profile.name,
      role: profile.role,
      avatar: profile.avatar
    };

    // Wait a moment for trigger to potentially create profile
    await new Promise(resolve => setTimeout(resolve, CONFIG.TIMEOUTS.PROFILE_UPDATE_WAIT));

    // Check if profile already exists (created by trigger)
    const existingProfile = await fetchUserProfile(userId);
    
    if (existingProfile) {
      console.log('=== signUp: Profile already exists (created by trigger), updating if needed ===');
      // Profile exists, check if we need to update it
      const needsUpdate = 
        existingProfile.username !== payload.username ||
        existingProfile.name !== payload.name ||
        existingProfile.role !== payload.role ||
        existingProfile.avatar !== payload.avatar;
      
      if (needsUpdate) {
        console.log('=== signUp: Profile needs update, attempting update ===');
        // Try to update the profile
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            username: payload.username,
            name: payload.name,
            role: payload.role,
            avatar: payload.avatar
          })
          .eq('id', userId);
        
        if (updateErr) {
          console.error('=== signUp: Error updating profile ===', updateErr);
          // If update fails, return existing profile anyway
          // The user can update it later
          return { user: existingProfile, error: null };
        }
        
        // Return updated profile
        return { user: { ...existingProfile, ...payload }, error: null };
      }
      
      // Profile exists and doesn't need update
      return { user: existingProfile, error: null };
    }
    
    // Profile doesn't exist, try to create it
    console.log('=== signUp: Profile does not exist, attempting to create ===');
    const { error: pErr } = await supabase
      .from('profiles')
      .insert([payload]);

    if (pErr) {
      console.error('=== signUp: Error creating profile ===', pErr);
      console.error('=== signUp: Error details ===', {
        code: pErr.code,
        message: pErr.message,
        details: pErr.details,
        hint: pErr.hint
      });
      
      // Check if profile was created by trigger in the meantime
      await new Promise(resolve => setTimeout(resolve, 1000));
      const profileCheck = await fetchUserProfile(userId);
      
      if (profileCheck) {
        console.log('=== signUp: Profile found after error (created by trigger) ===');
        return { user: profileCheck, error: null };
      }
      
      return { user: null, error: CONFIG.ERRORS.PROFILE_CREATE_FAILED };
    }

    return {
      user: {
        id: payload.id,
        username: payload.username,
        name: payload.name,
        role: payload.role,
        avatar: payload.avatar
      } as User,
      error: null
    };
  } catch (error: any) {
    console.error('signUp exception:', error);
    const apiError = error instanceof ApiError ? error : handleSupabaseError(error);
    return {
      user: null,
      error: apiError.message || CONFIG.ERRORS.GENERIC_ERROR
    };
  }
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('signOut error:', error);
  }
};

/**
 * Login with username (resolves to email)
 */
export const login = async (
  username: string,
  password: string
): Promise<{ user: User | null; error: string | null }> => {
  try {
    // Resolve email from username
    const email = await resolveEmailFromUsername(username);

    if (!email) {
      console.warn('No email found for username:', username);
      return { user: null, error: CONFIG.ERRORS.USER_NOT_FOUND };
    }

    // Sign in with email and password
    const res = await supabase.auth.signInWithPassword({ email, password });
    if (res.error) {
      console.error('Supabase signIn error:', res.error);
      const apiError = handleSupabaseError(res.error);
      return { user: null, error: apiError.message };
    }

    const supUser = res.data.user;
    if (!supUser) {
      return { user: null, error: 'فشل في تسجيل الدخول' };
    }

    // Fetch profile
    const finalProfile = await fetchUserProfile(supUser.id);

    if (!finalProfile) {
      console.error('Profile not found after login');
      return { user: null, error: CONFIG.ERRORS.PROFILE_NOT_FOUND };
    }

    return { user: finalProfile, error: null };
  } catch (err: any) {
    console.error('Login exception:', err);
    const apiError = err instanceof ApiError ? err : handleSupabaseError(err);
    return { user: null, error: apiError.message || CONFIG.ERRORS.GENERIC_ERROR };
  }
};

/**
 * Reset user password (admin function)
 */
export const resetUserPassword = async (
  email: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${CONFIG.ROUTES.RESET_PASSWORD}`
    });

    if (error) {
      console.error('Reset password error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Reset password exception:', error);
    return { success: false, error: error?.message || CONFIG.ERRORS.RESET_PASSWORD_FAILED };
  }
};

