
import { Student, DailyRecord, LogEntry, SchoolSettings, ScheduleItem, ChatMessage, User, Substitution } from '../types';
import { INITIAL_SETTINGS, INITIAL_USERS } from '../constants';

// محاكاة قاعدة البيانات في الذاكرة
// الآن تبدأ بقوائم فارغة لضمان أن البيانات تأتي من الإدخال الفعلي فقط
let db = {
    settings: { ...INITIAL_SETTINGS },
    users: [...INITIAL_USERS], // يحتوي فقط على المستخدم admin
    students: [] as Student[],
    schedule: [] as ScheduleItem[],
    dailyRecords: {} as Record<string, DailyRecord>,
    chatMessages: [] as ChatMessage[],
    logs: [] as LogEntry[],
    completedSessions: [] as string[],
    substitutions: [] as Substitution[],
};

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    // --- Authentication & Users ---
    login: async (username: string, password: string): Promise<User | null> => {
        await delay(500); // Simulate network latency
        const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
        return user || null;
    },

    registerSchool: async (schoolName: string, adminName: string, adminUser: User): Promise<void> => {
        await delay(800);
        db.settings.name = schoolName;
        db.users.push(adminUser);
    },

    getUsers: async (): Promise<User[]> => {
        await delay(300);
        return [...db.users];
    },

    updateUsers: async (users: User[]): Promise<void> => {
        await delay(500);
        db.users = users;
    },

    // --- Settings ---
    getSettings: async (): Promise<SchoolSettings> => {
        await delay(200);
        return { ...db.settings };
    },

    updateSettings: async (settings: SchoolSettings): Promise<void> => {
        await delay(500);
        db.settings = settings;
    },

    // --- Students ---
    getStudents: async (): Promise<Student[]> => {
        await delay(400);
        return [...db.students];
    },

    importStudents: async (newStudents: Student[]): Promise<void> => {
        await delay(1000);
        db.students = [...db.students, ...newStudents];
    },

    updateStudentChallenge: async (studentId: string, challenge: any): Promise<void> => {
        await delay(300);
        db.students = db.students.map(s => s.id === studentId ? { ...s, challenge } : s);
    },

    // --- Schedule ---
    getSchedule: async (): Promise<ScheduleItem[]> => {
        await delay(300);
        return [...db.schedule];
    },

    updateSchedule: async (schedule: ScheduleItem[]): Promise<void> => {
        await delay(600);
        db.schedule = schedule;
    },

    getSubstitutions: async (): Promise<Substitution[]> => {
        await delay(200);
        return [...db.substitutions];
    },

    assignSubstitute: async (substitution: Substitution): Promise<void> => {
        await delay(400);
        db.substitutions.push(substitution);
    },

    // --- Daily Records & Tracking ---
    getDailyRecords: async (): Promise<Record<string, DailyRecord>> => {
        await delay(300);
        return { ...db.dailyRecords };
    },

    saveDailyRecords: async (records: Record<string, DailyRecord>): Promise<void> => {
        await delay(800);
        db.dailyRecords = { ...db.dailyRecords, ...records };
    },

    getCompletedSessions: async (): Promise<string[]> => {
        await delay(200);
        return [...db.completedSessions];
    },

    markSessionComplete: async (sessionId: string): Promise<void> => {
        await delay(200);
        if (!db.completedSessions.includes(sessionId)) {
            db.completedSessions.push(sessionId);
        }
    },

    // --- Chat & Logs ---
    getMessages: async (): Promise<ChatMessage[]> => {
        await delay(200);
        return [...db.chatMessages].map(m => ({...m, timestamp: new Date(m.timestamp)}));
    },

    sendMessage: async (message: ChatMessage): Promise<void> => {
        await delay(200);
        db.chatMessages.push(message);
    },

    getLogs: async (): Promise<LogEntry[]> => {
        await delay(300);
        return [...db.logs].map(l => ({...l, timestamp: new Date(l.timestamp)}));
    },

    addLog: async (log: LogEntry): Promise<void> => {
        // Logs might be fire-and-forget, minimal delay
        db.logs.unshift(log);
    }
};
