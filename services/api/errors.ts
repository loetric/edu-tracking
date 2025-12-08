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

  // Invalid email
  if (error.message?.includes('Invalid email')) {
    return new ApiError(
      'INVALID_EMAIL',
      CONFIG.ERRORS.INVALID_EMAIL,
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

