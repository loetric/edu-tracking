
import { SchoolSettings, User } from './types';

export const INITIAL_SETTINGS: SchoolSettings = {
  ministry: 'وزارة التعليم',
  region: 'الإدارة العامة للتعليم',
  name: 'المدرسة النموذجية',
  slogan: 'التميز .. غايتنا',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/ar/9/98/Ministry_of_Education_%28Saudi_Arabia%29.svg',
  whatsappPhone: '',
  reportGeneralMessage: '',
  reportLink: ''
};

// Note: Users are now managed via Supabase Auth and profiles table
// INITIAL_USERS removed - users are created through registration or Supabase Auth

// قائمة فارغة - المعلمون يجب إضافتهم من لوحة الإعدادات
export const AVAILABLE_TEACHERS: string[] = [];

// Helper to get color based on status
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'excellent': return 'bg-emerald-100 text-emerald-700 border-emerald-300 ring-1 ring-emerald-300';
    case 'good': return 'bg-blue-100 text-blue-700 border-blue-300 ring-1 ring-blue-300';
    case 'average': return 'bg-yellow-100 text-yellow-700 border-yellow-300 ring-1 ring-yellow-300';
    case 'poor': return 'bg-rose-100 text-rose-700 border-rose-300 ring-1 ring-rose-300';
    default: return 'bg-gray-50 text-gray-500 border-gray-200';
  }
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'excellent': return 'متميز';
    case 'good': return 'جيد';
    case 'average': return 'متوسط';
    case 'poor': return 'يحتاج تحسين';
    default: return '-';
  }
};

export const getAttendanceLabel = (status: string) => {
    switch (status) {
        case 'present': return '✅ حاضر';
        case 'absent': return '❌ غائب';
        case 'excused': return '⚠️ مستأذن';
        default: return 'حاضر';
    }
};

export const getChallengeColor = (challenge: string) => {
  switch (challenge) {
    case 'sick': return 'bg-red-50 border-red-200 shadow-sm';
    case 'retest': return 'bg-yellow-50 border-yellow-200 shadow-sm';
    case 'orphan': return 'bg-purple-50 border-purple-200 shadow-sm';
    case 'financial': return 'bg-blue-50 border-blue-200 shadow-sm';
    case 'behavioral': return 'bg-orange-50 border-orange-200 shadow-sm';
    case 'special': return 'bg-indigo-50 border-indigo-200 shadow-sm';
    case 'other': return 'bg-gray-50 border-gray-200 shadow-sm';
    default: return 'bg-white border-transparent';
  }
};

export const getChallengeLabel = (challenge: string) => {
  switch (challenge) {
    case 'sick': return 'ظروف صحية';
    case 'retest': return 'إعادة اختبار';
    case 'orphan': return 'يتيم';
    case 'financial': return 'ظروف مادية';
    case 'behavioral': return 'متابعة سلوكية';
    case 'special': return 'خاص';
    case 'other': return 'أخرى';
    default: return '';
  }
};
