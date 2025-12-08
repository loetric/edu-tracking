
export type Role = 'admin' | 'counselor' | 'teacher' | null;

export interface User {
  id: string;
  username: string;
  password?: string; // Optional for display safety
  name: string;
  role: Role;
  avatar?: string;
  subject?: string; // For teachers
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
}

export type ChallengeType = 'none' | 'sick' | 'retest' | 'orphan' | 'financial' | 'behavioral' | 'other';

export interface Student {
  id: string;
  name: string;
  classGrade: string;
  parentPhone: string;
  challenge: ChallengeType; 
  avatar?: string;
  studentNumber?: string; // رقم الطالب الأصلي من الملف (للعرض)
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
