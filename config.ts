// Application Configuration
// All hardcoded values should be moved here for easier maintenance

export const CONFIG = {
  // Timeouts (in milliseconds)
  TIMEOUTS: {
    SESSION_CHECK: 5000,
    DATA_LOAD: 10000,
    PROFILE_WAIT: 500,
    PROFILE_UPDATE_WAIT: 300,
    AUTO_SCROLL_DELAY: 100,
  },

  // Password validation
  PASSWORD: {
    MIN_LENGTH: 6,
  },

  // UI Dimensions (pixels)
  UI: {
    LOADER_SIZE_LARGE: 48,
    LOADER_SIZE_MEDIUM: 40,
    MENU_ICON_SIZE: 22,
    BELL_ICON_SIZE: 20,
    AVATAR_SIZE: 8, // Tailwind class: w-8 h-8
    CHAT_BUTTON_ICON_SIZE: 18,
    CHAT_BUTTON_ICON_SIZE_MD: 24,
    CHAT_HEADER_ICON_SIZE: 11,
    CHAT_HEADER_ICON_SIZE_MD: 14,
    CHAT_CLOSE_ICON_SIZE: 12,
    CHAT_CLOSE_ICON_SIZE_MD: 16,
    CHAT_SEND_ICON_SIZE: 12,
    CHAT_SEND_ICON_SIZE_MD: 16,
    CHAT_BUTTON_MIN_SIZE: 36,
    CHAT_BUTTON_MIN_SIZE_MD: 40,
  },

  // Colors (Tailwind classes)
  COLORS: {
    PRIMARY: 'teal-600',
    PRIMARY_HOVER: 'teal-700',
    PRIMARY_ACTIVE: 'teal-800',
    PRIMARY_LIGHT: 'teal-100',
    PRIMARY_DARK: 'teal-900',
    BACKGROUND: 'gray-50',
    WHITE: 'white',
    GRAY_LIGHT: 'gray-100',
    GRAY_MEDIUM: 'gray-200',
    GRAY_DARK: 'gray-500',
    GRAY_TEXT: 'gray-400',
    GRAY_TEXT_DARK: 'gray-700',
    GRAY_TEXT_DARKER: 'gray-800',
    RED: 'red-500',
  },

  // Chat Configuration
  CHAT: {
    MOBILE_WIDTH: 'calc(100vw - 1.5rem)',
    DESKTOP_WIDTH: '18rem', // w-72
    MOBILE_MAX_HEIGHT: 'calc(50vh - max(0.5rem, env(safe-area-inset-bottom)))',
    DESKTOP_MAX_HEIGHT: '20rem', // max-h-[320px]
    MOBILE_BOTTOM: 'max(0.5rem, env(safe-area-inset-bottom))',
    MESSAGE_MAX_WIDTH_MOBILE: '75%',
    MESSAGE_MAX_WIDTH_DESKTOP: '80%',
    SCROLL_DELAY: 100,
  },

  // Routes
  ROUTES: {
    RESET_PASSWORD: '/reset-password',
  },

  // Locale
  LOCALE: {
    DEFAULT: 'ar-SA',
    TIME_FORMAT: { hour: '2-digit' as const, minute: '2-digit' as const },
  },

  // Error Messages
  ERRORS: {
    PASSWORD_TOO_SHORT: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    REGISTRATION_FAILED: 'فشل في إنشاء حساب المسؤول. يرجى المحاولة مرة أخرى.',
    LOGIN_FAILED: 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.',
    MESSAGE_SEND_FAILED: 'فشل في إرسال الرسالة. يرجى المحاولة مرة أخرى.',
    TIMEOUT: 'Timeout',
    USER_NOT_FOUND: 'اسم المستخدم غير موجود',
    PROFILE_NOT_FOUND: 'ملف المستخدم غير موجود',
    EMAIL_EXISTS: 'البريد الإلكتروني مسجل مسبقاً',
    INVALID_EMAIL: 'البريد الإلكتروني غير صحيح',
    INVALID_PASSWORD: 'كلمة المرور غير صحيحة. يجب أن تكون 6 أحرف على الأقل',
    WRONG_PASSWORD: 'كلمة المرور غير صحيحة',
    RATE_LIMIT_DEFAULT: '18',
    RATE_LIMIT_MESSAGE: 'تم تجاوز عدد المحاولات. يرجى الانتظار {time} ثانية قبل المحاولة مرة أخرى',
    GENERIC_ERROR: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى',
    RESET_PASSWORD_FAILED: 'فشل في إرسال رابط إعادة تعيين كلمة المرور',
    PROFILE_CREATE_FAILED: 'فشل في إنشاء ملف المستخدم. يرجى المحاولة مرة أخرى',
    EMAIL_CONFIRMATION_PENDING: 'تم إنشاء المستخدم. إذا كان البريد الإلكتروني يحتاج تأكيد، يرجى التحقق من بريدك الإلكتروني. أو حاول تسجيل الدخول مباشرة',
  },

  // Success Messages
  SUCCESS: {
    DATA_SAVED: 'تم حفظ البيانات في قاعدة البيانات بنجاح!',
  },

  // Loading Messages
  LOADING: {
    APP: 'جارٍ التحميل...',
    APP_SUBTITLE: 'يرجى الانتظار قليلاً',
    DATA: 'جارٍ التحميل...',
  },

  // Real-time Subscription
  REALTIME: {
    CHANNEL_NAME: 'chat_messages_realtime',
    TABLE: 'chat_messages',
    SCHEMA: 'public',
  },

  // Temporary Message ID Prefix
  TEMP_MESSAGE_PREFIX: 'temp-',
} as const;

// Helper function to format rate limit error message
export const formatRateLimitError = (waitTime: string = CONFIG.ERRORS.RATE_LIMIT_DEFAULT): string => {
  return CONFIG.ERRORS.RATE_LIMIT_MESSAGE.replace('{time}', waitTime);
};

// Helper function to extract wait time from error message
export const extractWaitTime = (message: string): string => {
  const match = message.match(/(\d+)\s*seconds?/);
  return match?.[1] || CONFIG.ERRORS.RATE_LIMIT_DEFAULT;
};

