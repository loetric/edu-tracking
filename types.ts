
export type Role = 'admin' | 'counselor' | 'teacher' | null;

export interface User {
  id: string;
  username: string;
  password?: string; // Optional for display safety
  name: string;
  role: Role;
  avatar?: string;
  subject?: string; // For teachers
  email?: string; // Email address for user management
}

export interface SchoolSettings {
  name: string;
  logoUrl: string;
  ministry: string; // وزارة التعليم
  region: string; // الإدارة العامة للتعليم بمنطقة...
  slogan: string;
  whatsappPhone?: string; // New field for school WhatsApp number
  reportGeneralMessage?: string; // رسالة عامة تظهر في التقارير
  reportLink?: string; // رابط يتحول لباركود
  classGrades?: string[]; // قائمة الفصول المعرفة من قبل مدير النظام
  academicYear?: string; // العام الدراسي (مثال: 1445-1446)
}

export type ChallengeType = 'none' | 'sick' | 'retest' | 'orphan' | 'financial' | 'behavioral' | 'special' | 'other';
export type StudentStatus = 'regular' | 'dropped' | 'expelled'; // منتظم، منقطع، مفصول

export interface Student {
  id: string;
  name: string;
  classGrade: string;
  parentPhone: string;
  challenge: ChallengeType; 
  avatar?: string;
  studentNumber?: string; // رقم الطالب الأصلي من الملف (للعرض)
  status?: StudentStatus; // حالة الطالب: منتظم، منقطع، مفصول
}

export type StatusType = 'excellent' | 'good' | 'average' | 'poor' | 'none';
export type AttendanceStatus = 'present' | 'absent' | 'excused';

export interface DailyRecord {
  id?: string;
  studentId: string;
  date: string;
  attendance: AttendanceStatus;
  participation: StatusType;
  homework: StatusType;
  behavior: StatusType;
  notes: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  action: string;
  details: string;
  user: string;
}

export interface StatData {
  name: string;
  value: number;
}

export interface Subject {
  id: string;
  name: string;
  code?: string; // رمز المادة (اختياري)
  description?: string; // وصف المادة (اختياري)
  created_at?: Date;
}

export interface ScheduleItem {
  id: string;
  day: string;
  period: number;
  subject: string;
  classRoom: string;
  teacher?: string;
  // New fields for substitution logic
  originalTeacher?: string; 
  isSubstituted?: boolean;
  academicYear?: string; // العام الدراسي
  created_at?: string | Date; // ISO string or Date object
}

export interface Substitution {
  id: string;
  date: string; // YYYY-MM-DD
  scheduleItemId: string;
  substituteTeacher: string;
  reason?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  isSystem?: boolean;
}

export type FileType = 'general' | 'circular' | 'decision';
export type FileCategory = 'excel' | 'word' | 'pdf' | 'image' | 'other';
export type FileAccessLevel = 'public' | 'teachers' | 'counselors' | 'teachers_counselors';

export interface SharedFile {
  id: string;
  name: string;
  description?: string;
  file_url: string;
  file_type: FileType;
  file_category: FileCategory;
  file_size?: number;
  access_level: FileAccessLevel;
  uploaded_by?: string;
  created_at: Date;
  updated_at: Date;
  read_by?: string[]; // Array of user IDs who read this file
  read_count?: number; // Total number of readers
  is_read_by_current_user?: boolean; // Whether current user has read this file
}
