// Validation utilities
import { CONFIG } from '../../config';

/**
 * Validates email format
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'البريد الإلكتروني مطلوب' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: CONFIG.ERRORS.INVALID_EMAIL };
  }

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

