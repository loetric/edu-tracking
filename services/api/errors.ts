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
    if (errorCode === 'email_address_invalid' || (errorMessage.includes('email address') && errorMessage.includes('invalid'))) {
      // Supabase has stricter validation - rejects common test emails and disposable emails
      // Check if it's a common test email
      const testEmails = ['test@gmail.com', 'test@test.com', 'admin@test.com', 'user@example.com'];
      const isTestEmail = testEmails.some(testEmail => errorMessage.toLowerCase().includes(testEmail.toLowerCase()));
      
      if (isTestEmail) {
        errorMsg = 'البريد الإلكتروني "test@gmail.com" أو الإيميلات التجريبية الأخرى غير مسموحة لأسباب أمنية.\n' +
                   'يرجى استخدام بريد إلكتروني حقيقي وصالح (مثل: yourname@gmail.com أو yourname@company.com)';
      } else {
        errorMsg = 'البريد الإلكتروني غير مقبول من قبل النظام.\n' +
                   'قد يكون السبب:\n' +
                   '• استخدام بريد إلكتروني تجريبي أو مؤقت\n' +
                   '• البريد الإلكتروني محظور من قبل النظام\n' +
                   '• يرجى استخدام بريد إلكتروني حقيقي وصالح';
      }
    }
    return new ApiError(
      'INVALID_EMAIL',
      errorMsg,
      400,
      error
    );
  }

  // Database errors during user creation
  if (
    errorMessage.includes('database error') ||
    errorMessage.includes('database error saving') ||
    errorCode === 'unexpected_failure' ||
    (error.status === 500 && errorMessage.includes('user'))
  ) {
    console.log('=== handleSupabaseError: Detected database error during user creation ===');
    return new ApiError(
      'DATABASE_ERROR',
      'حدث خطأ في قاعدة البيانات أثناء إنشاء المستخدم. يرجى التحقق من:\n' +
      '• أن trigger function موجودة وتعمل بشكل صحيح\n' +
      '• أن RLS policies تسمح بإنشاء profiles\n' +
      '• أن جميع الحقول المطلوبة موجودة',
      500,
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

