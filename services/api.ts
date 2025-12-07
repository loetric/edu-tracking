// API Service - Clean implementation matching database schema
import { Student, DailyRecord, LogEntry, SchoolSettings, ScheduleItem, ChatMessage, User, Substitution, Role } from '../types';
import { INITIAL_SETTINGS } from '../constants';
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
            
            if (pErr || !profile) {
                console.warn('No profile found for user id', user.id, pErr);
                return null;
            }
            
            return {
                id: profile.id,
                username: profile.username,
                name: profile.name,
                role: profile.role as Role,
                avatar: profile.avatar
            } as User;
        } catch (error) {
            console.error('signIn exception:', error);
            return null;
        }
    },

    signUp: async (email: string, password: string, profile: { username: string; name: string; role: Role; avatar?: string; }): Promise<User | null> => {
        try {
            // Validate password length
            if (!password || password.length < 6) {
                console.error('Password must be at least 6 characters');
                return null;
            }

            // Sign up with user metadata so trigger can use it
            const res = await supabase.auth.signUp({ 
                email, 
                password,
                options: {
                    data: {
                        username: profile.username,
                        full_name: profile.name,
                        role: profile.role,
                        avatar_url: profile.avatar
                    }
                }
            });
            if (res.error) {
                console.error('Supabase auth signUp error:', res.error);
                // Return more specific error info if needed
                return null;
            }
            const user = res.data.user;
            if (!user) return null;
            
            // Trigger will auto-create profile, but we update it with exact values
            // This ensures correct username, role, etc. (trigger might use defaults)
            const payload = {
                id: user.id,
                username: profile.username,
                name: profile.name,
                role: profile.role,
                avatar: profile.avatar
            };
            
            // Upsert to handle case where trigger already created it
            const { error: pErr } = await supabase
                .from('profiles')
                .upsert([payload], { onConflict: 'id' });
            
            if (pErr) {
                console.error('Error creating/updating profile:', pErr);
                return null;
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
            // Resolve email from username via profiles table
            const { data: profileRow, error: profileErr } = await supabase
                .from('profiles')
                .select('email')
                .eq('username', username)
                .limit(1)
                .single();

            let email: string | undefined = undefined;
            if (profileRow?.email) {
                email = profileRow.email;
            }

            // If username looks like an email, use it directly
            if (!email && username.includes('@')) {
                email = username;
            }

            if (!email) {
                console.warn('No email found for username:', username);
                return null;
            }

            // Sign in with email and password
            const res = await supabase.auth.signInWithPassword({ email, password });
            if (res.error) {
                console.error('Supabase signIn error:', res.error);
                return null;
            }
            
            const supUser = res.data.user;
            if (!supUser) return null;

            // Fetch profile
            const { data: finalProfile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', supUser.id)
                .single();

            if (profileError || !finalProfile) {
                console.error('Profile not found after login:', profileError);
                return null;
            }

            return {
                id: finalProfile.id,
                username: finalProfile.username,
                name: finalProfile.name,
                role: finalProfile.role as Role,
                avatar: finalProfile.avatar
            } as User;
        } catch (err) {
            console.error('Login exception:', err);
            return null;
        }
    },

    registerSchool: async (schoolName: string, adminName: string, adminUser?: User): Promise<void> => {
        try {
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
        } catch (error) {
            console.error('Register school error:', error);
            throw error;
        }
    },

    getUsers: async (): Promise<User[]> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, email, name, role, avatar');

            if (error) throw error;
            return (data || []).map((p: any) => ({
                id: p.id,
                username: p.username,
                name: p.name,
                role: p.role as Role,
                avatar: p.avatar,
            })) as User[];
        } catch (error) {
            console.error('Get users error:', error);
            return [];
        }
    },

    updateUsers: async (users: User[]): Promise<void> => {
        try {
            const payload = users.map(u => ({ 
                id: u.id, 
                username: u.username, 
                name: u.name, 
                role: u.role, 
                avatar: u.avatar 
            }));
            
            const ids = payload.map(p => p.id).filter(Boolean);
            
            // Get all existing profile IDs
            const { data: allProfiles } = await supabase.from('profiles').select('id');
            const allIds = new Set((allProfiles || []).map(p => p.id));
            const idsToDelete = Array.from(allIds).filter(id => !ids.includes(id));
            
            // Delete profiles not in new list
            if (idsToDelete.length > 0) {
                await supabase.from('profiles').delete().in('id', idsToDelete);
            }
            
            // Upsert remaining/updated profiles
            if (payload.length > 0) {
                await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
            }
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
            return (data || []) as Student[];
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
            return (data || []) as ScheduleItem[];
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
            return (data || []) as Substitution[];
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
            (data || []).forEach(record => {
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
            const recordsArray = Object.values(records).map(r => ({
                ...r,
                id: r.id || `${r.studentId}_${r.date}`
            }));
            
            const { data: existingRecords } = await supabase
                .from('daily_records')
                .select('id');

            const existingIds = new Set((existingRecords || []).map(r => r.id));
            
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
            return (data || []).map(item => item.session_id);
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
            return (data || []).map(m => ({
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
                    id: message.id,
                    sender: message.sender,
                    text: message.text,
                    timestamp: message.timestamp?.toISOString() || new Date().toISOString(),
                    isSystem: message.isSystem || false
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
            return (data || []).map(l => ({
                id: l.id,
                timestamp: new Date(l.timestamp),
                action: l.action,
                details: l.details || '',
                user: l.user || ''
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
                details: log.details || '',
                user: log.user
            };
            
            // Don't include id - let database generate UUID automatically
            // The id field in LogEntry is for frontend use only

            const { error } = await supabase
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

