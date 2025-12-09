// Error handling utilities
import { CONFIG, formatRateLimitError, extractWaitTime } from '../../config';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Handles Supabase errors and converts them to ApiError
 */
export const handleSupabaseError = (error: any): ApiError => {
  // Rate limiting error
  if (error.status === 429) {
    const waitTime = extractWaitTime(error.message || '');
    return new ApiError(
      'RATE_LIMIT',
      formatRateLimitError(waitTime),
      429,
      error
    );
  }

  // User already exists
  if (
    error.message?.includes('already registered') ||
    error.message?.includes('already exists') ||
    error.message?.includes('User already registered')
  ) {
    return new ApiError(
      'USER_EXISTS',
      CONFIG.ERRORS.EMAIL_EXISTS,
      409,
      error
    );
  }

  // Invalid email - check multiple variations
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';
  
  console.log('=== handleSupabaseError: Checking for email error ===', {
    errorMessage,
    errorCode,
    fullError: error
  });

  if (
    errorMessage.includes('invalid email') ||
    errorMessage.includes('email format') ||
    errorMessage.includes('email is invalid') ||
    errorMessage.includes('email must be') ||
    errorMessage.includes('invalid email address') ||
    errorMessage.includes('email address') && errorMessage.includes('invalid') ||
    errorCode === 'invalid_email' ||
    errorCode === 'email_address_invalid' ||
    errorCode === 'validation_failed' ||
    errorCode === 'invalid_request' ||
    (error.status === 400 && errorMessage.includes('email'))
  ) {
    console.log('=== handleSupabaseError: Detected email validation error ===');
    // Provide more specific error message if Supabase rejects the email
    let errorMsg = CONFIG.ERRORS.INVALID_EMAIL;
    if (errorCode === 'email_address_invalid' || errorMessage.includes('email address') && errorMessage.includes('invalid')) {
      // Supabase has stricter validation - might reject common test emails
      errorMsg = 'البريد الإلكتروني غير مقبول من قبل النظام. يرجى استخدام بريد إلكتروني صحيح وصالح.';
    }
    return new ApiError(
      'INVALID_EMAIL',
      errorMsg,
      400,
      error
    );
  }

  // Password errors
  if (error.message?.includes('Password') || error.message?.includes('password')) {
    return new ApiError(
      'INVALID_PASSWORD',
      CONFIG.ERRORS.INVALID_PASSWORD,
      400,
      error
    );
  }

  // Invalid login credentials
  if (
    error.message?.includes('Invalid login credentials') ||
    error.message?.includes('Wrong password')
  ) {
    return new ApiError(
      'WRONG_PASSWORD',
      CONFIG.ERRORS.WRONG_PASSWORD,
      401,
      error
    );
  }

  // Generic error
  return new ApiError(
    'UNKNOWN_ERROR',
    error.message || CONFIG.ERRORS.GENERIC_ERROR,
    error.status || 500,
    error
  );
};

/**
 * Wraps an async function with error handling
 */
export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    console.error(errorMessage || 'Error in API call:', error);
    throw handleSupabaseError(error);
  }
};

