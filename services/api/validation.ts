// Validation utilities
import { CONFIG } from '../../config';

/**
 * Validates email format
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  console.log('=== validateEmail: Starting validation ===', {
    email: email,
    type: typeof email,
    length: email?.length
  });

  if (!email || typeof email !== 'string') {
    console.warn('=== validateEmail: Email is not a string ===', email);
    return { valid: false, error: 'البريد الإلكتروني مطلوب' };
  }

  const trimmedEmail = email.trim();
  console.log('=== validateEmail: Trimmed email ===', {
    original: email,
    trimmed: trimmedEmail,
    originalLength: email.length,
    trimmedLength: trimmedEmail.length
  });

  if (trimmedEmail === '') {
    console.warn('=== validateEmail: Email is empty after trim ===');
    return { valid: false, error: 'البريد الإلكتروني مطلوب' };
  }

  // More comprehensive email regex that handles common cases
  // Allows: letters, numbers, dots, hyphens, underscores, plus signs before @
  // Requires: @ symbol, domain name, and TLD
  const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  const regexTest = emailRegex.test(trimmedEmail);
  console.log('=== validateEmail: Regex test ===', {
    email: trimmedEmail,
    regexTest: regexTest,
    match: trimmedEmail.match(emailRegex),
    charCodes: trimmedEmail.split('').map(c => `${c}(${c.charCodeAt(0)})`)
  });
  
  if (!regexTest) {
    console.error('=== validateEmail: Regex test failed ===', trimmedEmail);
    return { valid: false, error: CONFIG.ERRORS.INVALID_EMAIL };
  }

  // Additional checks
  if (trimmedEmail.length > 254) { // RFC 5321 limit
    console.warn('=== validateEmail: Email too long ===', trimmedEmail.length);
    return { valid: false, error: 'البريد الإلكتروني طويل جداً' };
  }

  if (trimmedEmail.startsWith('.') || trimmedEmail.startsWith('@') || trimmedEmail.endsWith('.')) {
    console.warn('=== validateEmail: Email starts/ends with invalid char ===');
    return { valid: false, error: CONFIG.ERRORS.INVALID_EMAIL };
  }

  console.log('=== validateEmail: Validation passed ===', trimmedEmail);
  return { valid: true };
};

/**
 * Validates password
 */
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password || password.length < CONFIG.PASSWORD.MIN_LENGTH) {
    return { valid: false, error: CONFIG.ERRORS.PASSWORD_TOO_SHORT };
  }

  return { valid: true };
};

/**
 * Validates username
 */
export const validateUsername = (username: string): { valid: boolean; error?: string } => {
  if (!username || username.trim() === '') {
    return { valid: false, error: 'اسم المستخدم مطلوب' };
  }

  if (username.length < 3) {
    return { valid: false, error: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' };
  }

  return { valid: true };
};

/**
 * Validates user name
 */
export const validateName = (name: string): { valid: boolean; error?: string } => {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'الاسم مطلوب' };
  }

  return { valid: true };
};

