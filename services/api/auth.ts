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
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return null;
    }
    
    return await fetchUserProfile(session.user.id);
  } catch (error) {
    console.error('getCurrentUser exception:', error);
    return null;
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
    // Trim and validate email
    const trimmedEmail = (email || '').trim();
    if (!trimmedEmail) {
      return { user: null, error: 'البريد الإلكتروني مطلوب' };
    }

    // Validate inputs
    const emailValidation = validateEmail(trimmedEmail);
    if (!emailValidation.valid) {
      return { user: null, error: emailValidation.error };
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

    // Upsert to handle case where trigger already created it
    const { error: pErr } = await supabase
      .from('profiles')
      .upsert([payload], { onConflict: 'id' });

    if (pErr) {
      console.error('Error creating/updating profile:', pErr);

      // Check if profile exists anyway (maybe trigger created it)
      const existingProfile = await fetchUserProfile(userId);

      if (existingProfile) {
        return { user: existingProfile, error: null };
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

