
import { Student, DailyRecord, LogEntry, SchoolSettings, ScheduleItem, ChatMessage, User, Substitution, Role } from '../types';
import { INITIAL_SETTINGS, INITIAL_USERS } from '../constants';
import { supabase } from './supabase';

export const api = {
    // --- Auth (Supabase Auth) ---
    signIn: async (email: string, password: string): Promise<User | null> => {
        try {
            const res = await supabase.auth.signInWithPassword({ email, password });
            if (res.error) {
                console.error('Supabase auth signIn error:', res.error);
                return null;
            }
            const user = res.data.user;
            if (!user) return null;
            // Fetch profile from profiles table
            const { data: profile, error: pErr } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (pErr) {
                console.warn('No profile found for user id', user.id, pErr);
                return null;
            }
            return {
                id: profile.id,
                username: profile.username,
                name: profile.name,
                role: profile.role,
                avatar: profile.avatar
            } as User;
        } catch (error) {
            console.error('signIn exception:', error);
            return null;
        }
    },

    signUp: async (email: string, password: string, profile: { username: string; name: string; role: Role; avatar?: string; }): Promise<User | null> => {
        try {
            const res = await supabase.auth.signUp({ email, password });
            if (res.error) {
                console.error('Supabase auth signUp error:', res.error);
                return null;
            }
            const user = res.data.user;
            if (!user) return null;
            // create profile
            const payload = {
                id: user.id,
                username: profile.username,
                name: profile.name,
                role: profile.role,
                avatar: profile.avatar
            };
            const { error: pErr } = await supabase.from('profiles').insert([payload]);
            if (pErr) {
                console.error('Error creating profile:', pErr);
            }
            return {
                id: payload.id,
                username: payload.username,
                name: payload.name,
                role: payload.role,
                avatar: payload.avatar
            } as User;
        } catch (error) {
            console.error('signUp exception:', error);
            return null;
        }
    },

    signOut: async (): Promise<void> => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('signOut error:', error);
        }
    },
    // --- Authentication & Users ---
    login: async (username: string, password: string): Promise<User | null> => {
        try {
            // Try to resolve an email for this username via `profiles` table
            const { data: profileRow, error: profileErr } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .limit(1)
                .single();

            let email: string | undefined = undefined;
            if (profileRow && (profileRow as any).email) {
                email = (profileRow as any).email;
            }

            // If the provided username looks like an email, use it
            if (!email && username.includes('@')) {
                email = username;
            }

            // Fallback: check legacy `users` table for an email field
            if (!email) {
                const { data: legacyUser } = await supabase
                    .from('users')
                    .select('*')
                    .eq('username', username)
                    .limit(1)
                    .single();
                if (legacyUser && (legacyUser as any).email) email = (legacyUser as any).email;
            }

            if (!email) {
                console.warn('No email found for username; cannot sign in via Supabase Auth:', username);
                return null;
            }

            const res = await supabase.auth.signInWithPassword({ email, password });
            if (res.error) {
                console.error('Supabase signIn error:', res.error);
                return null;
            }
            const supUser = res.data.user;
            if (!supUser) return null;

            // Fetch canonical profile
            const { data: finalProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', supUser.id)
                .limit(1)
                .single();

            if (!finalProfile) {
                // If no profile, return a minimal User object using auth user data
                return {
                    id: supUser.id,
                    username: username,
                    name: supUser.user_metadata?.full_name || username,
                    role: null,
                    avatar: supUser.user_metadata?.avatar_url || undefined
                } as User;
            }

            return {
                id: finalProfile.id,
                username: finalProfile.username,
                name: finalProfile.name,
                role: (finalProfile.role || null) as Role,
                avatar: finalProfile.avatar
            } as User;
        } catch (err) {
            console.error('Login exception:', err);
            return null;
        }
    },

    registerSchool: async (schoolName: string, adminName: string, adminUser?: User): Promise<void> => {
        try {
            // Update settings only
            const { data: settingsData } = await supabase
                .from('settings')
                .select('id')
                .limit(1)
                .single();

            if (settingsData) {
                await supabase
                    .from('settings')
                    .update({ name: schoolName })
                    .eq('id', settingsData.id);
            } else {
                await supabase
                    .from('settings')
                    .insert([{ name: schoolName, ...INITIAL_SETTINGS }]);
            }

            // NOTE: user profiles should be created via Supabase Auth + profiles table
        } catch (error) {
            console.error('Register school error:', error);
            throw error;
        }
    },

    getUsers: async (): Promise<User[]> => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*');

            if (error) throw error;
            return data as User[];
        } catch (error) {
            console.error('Get users error:', error);
            return [];
        }
    },

    updateUsers: async (users: User[]): Promise<void> => {
        try {
            // Delete existing users and insert new ones
            await supabase.from('users').delete().neq('id', '');
            await supabase.from('users').insert(users);
        } catch (error) {
            console.error('Update users error:', error);
            throw error;
        }
    },

    // --- Settings ---
    getSettings: async (): Promise<SchoolSettings> => {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .limit(1)
                .single();

            if (error || !data) return INITIAL_SETTINGS;
            return data as SchoolSettings;
        } catch (error) {
            console.error('Get settings error:', error);
            return INITIAL_SETTINGS;
        }
    },

    updateSettings: async (settings: SchoolSettings): Promise<void> => {
        try {
            const { data: existingSettings } = await supabase
                .from('settings')
                .select('id')
                .limit(1)
                .single();

            if (existingSettings) {
                await supabase
                    .from('settings')
                    .update(settings)
                    .eq('id', existingSettings.id);
            } else {
                await supabase
                    .from('settings')
                    .insert([settings]);
            }
        } catch (error) {
            console.error('Update settings error:', error);
            throw error;
        }
    },

    // --- Students ---
    getStudents: async (): Promise<Student[]> => {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*');

            if (error) throw error;
            return data as Student[];
        } catch (error) {
            console.error('Get students error:', error);
            return [];
        }
    },

    importStudents: async (newStudents: Student[]): Promise<void> => {
        try {
            await supabase
                .from('students')
                .insert(newStudents);
        } catch (error) {
            console.error('Import students error:', error);
            throw error;
        }
    },

    updateStudentChallenge: async (studentId: string, challenge: any): Promise<void> => {
        try {
            await supabase
                .from('students')
                .update({ challenge })
                .eq('id', studentId);
        } catch (error) {
            console.error('Update student challenge error:', error);
            throw error;
        }
    },

    // --- Schedule ---
    getSchedule: async (): Promise<ScheduleItem[]> => {
        try {
            const { data, error } = await supabase
                .from('schedule')
                .select('*');

            if (error) throw error;
            return data as ScheduleItem[];
        } catch (error) {
            console.error('Get schedule error:', error);
            return [];
        }
    },

    updateSchedule: async (schedule: ScheduleItem[]): Promise<void> => {
        try {
            // Delete existing schedule and insert new one
            await supabase.from('schedule').delete().neq('id', '');
            await supabase.from('schedule').insert(schedule);
        } catch (error) {
            console.error('Update schedule error:', error);
            throw error;
        }
    },

    getSubstitutions: async (): Promise<Substitution[]> => {
        try {
            const { data, error } = await supabase
                .from('substitutions')
                .select('*');

            if (error) throw error;
            return data as Substitution[];
        } catch (error) {
            console.error('Get substitutions error:', error);
            return [];
        }
    },

    assignSubstitute: async (substitution: Substitution): Promise<void> => {
        try {
            await supabase
                .from('substitutions')
                .insert([substitution]);
        } catch (error) {
            console.error('Assign substitute error:', error);
            throw error;
        }
    },

    // --- Daily Records & Tracking ---
    getDailyRecords: async (): Promise<Record<string, DailyRecord>> => {
        try {
            const { data, error } = await supabase
                .from('daily_records')
                .select('*');

            if (error) throw error;
            
            // Convert array to record object
            const records: Record<string, DailyRecord> = {};
            (data as any[]).forEach(record => {
                records[record.id] = record as DailyRecord;
            });
            return records;
        } catch (error) {
            console.error('Get daily records error:', error);
            return {};
        }
    },

    saveDailyRecords: async (records: Record<string, DailyRecord>): Promise<void> => {
        try {
            const recordsArray = Object.values(records);
            const { data: existingRecords } = await supabase
                .from('daily_records')
                .select('id');

            const existingIds = new Set((existingRecords as any[])?.map(r => r.id) || []);
            
            const toInsert = recordsArray.filter(r => !existingIds.has(r.id));
            const toUpdate = recordsArray.filter(r => existingIds.has(r.id));

            if (toInsert.length > 0) {
                await supabase.from('daily_records').insert(toInsert);
            }
            if (toUpdate.length > 0) {
                for (const record of toUpdate) {
                    await supabase
                        .from('daily_records')
                        .update(record)
                        .eq('id', record.id);
                }
            }
        } catch (error) {
            console.error('Save daily records error:', error);
            throw error;
        }
    },

    getCompletedSessions: async (): Promise<string[]> => {
        try {
            const { data, error } = await supabase
                .from('completed_sessions')
                .select('session_id');

            if (error) throw error;
            return (data as any[]).map(item => item.session_id);
        } catch (error) {
            console.error('Get completed sessions error:', error);
            return [];
        }
    },

    markSessionComplete: async (sessionId: string): Promise<void> => {
        try {
            await supabase
                .from('completed_sessions')
                .insert([{ session_id: sessionId }]);
        } catch (error) {
            console.error('Mark session complete error:', error);
            // Ignore if already exists
        }
    },

    // --- Chat & Logs ---
    getMessages: async (): Promise<ChatMessage[]> => {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .order('timestamp', { ascending: true });

            if (error) throw error;
            return (data as any[]).map(m => ({
                ...m,
                timestamp: new Date(m.timestamp)
            })) as ChatMessage[];
        } catch (error) {
            console.error('Get messages error:', error);
            return [];
        }
    },

    sendMessage: async (message: ChatMessage): Promise<void> => {
        try {
            await supabase
                .from('chat_messages')
                .insert([{
                    ...message,
                    timestamp: message.timestamp?.toISOString() || new Date().toISOString()
                }]);
        } catch (error) {
            console.error('Send message error:', error);
            throw error;
        }
    },

    getLogs: async (): Promise<LogEntry[]> => {
        try {
            const { data, error } = await supabase
                .from('logs')
                .select('*')
                .order('timestamp', { ascending: false });

            if (error) throw error;
            return (data as any[]).map(l => ({
                id: l.id,
                timestamp: new Date(l.timestamp),
                action: l.action,
                details: l.details,
                user: l.username || l.user || ''
            })) as LogEntry[];
        } catch (error) {
            console.error('Get logs error:', error);
            return [];
        }
    },

    addLog: async (log: LogEntry): Promise<void> => {
        try {
            const payload: any = {
                timestamp: log.timestamp?.toISOString() || new Date().toISOString(),
                action: log.action,
                details: log.details
            };
            // Only include id if provided (avoid inserting null into UUID column)
            if (log.id) payload.id = log.id;
            // Map frontend 'user' field to DB 'user' column (DB schema uses 'user')
            if ((log as any).user) payload.user = (log as any).user;

            const { data, error } = await supabase
                .from('logs')
                .insert([payload]);
            if (error) {
                console.error('Supabase insert log error:', error);
                throw error;
            }
        } catch (error) {
            console.error('Add log error:', error);
        }
    }
};
