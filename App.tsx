
import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { StudentTracker } from './components/StudentTracker';
import { DashboardStats } from './components/DashboardStats';
import { ExcelImporter } from './components/ExcelImporter';
import { ArchiveLog } from './components/ArchiveLog';
import { LoginScreen } from './components/LoginScreen';
import { SchoolSettingsForm } from './components/SchoolSettings';
import { TeacherSchedule } from './components/TeacherSchedule';
import { StudentManagement } from './components/StudentManagement';
import { PDFReport } from './components/PDFReport';
import { CounselorView } from './components/CounselorView';
import { BehaviorTracking } from './components/BehaviorTracking';
import { DailyStudentView } from './components/DailyStudentView';
import { InternalChat } from './components/InternalChat';
import { AbsenceManagement } from './components/AbsenceManagement';
import { BulkReportModal } from './components/BulkReportModal';
import { UserProfile } from './components/UserProfile';
import { FileSharing } from './components/FileSharing';
import { Student, DailyRecord, LogEntry, Role, SchoolSettings, ChallengeType, ChatMessage, ScheduleItem, Substitution, User, Subject } from './types';
import { AVAILABLE_TEACHERS } from './constants';
import { CONFIG } from './config';
import { MessageCircle, Menu, Bell, Loader2 } from 'lucide-react';
import { api } from './services/api';
import { fetchUserProfile } from './services/api/helpers';
import { supabase } from './services/supabase';
import { useModal } from './hooks/useModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AlertModal } from './components/AlertModal';

const App: React.FC = () => {
  // Modal hooks
  const { confirm, alert, confirmModal, alertModal } = useModal();
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  // Application State
  // Persist activeTab in localStorage to restore on refresh
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('edu-tracking-activeTab');
      return savedTab || 'dashboard';
    }
    return 'dashboard';
  });
  
  // Update localStorage when activeTab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('edu-tracking-activeTab', activeTab);
    }
  }, [activeTab]);
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null); // Null until loaded
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]); // Subjects for schedule and forms
  
  // Dynamic Schedule State
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentRecords, setCurrentRecords] = useState<Record<string, DailyRecord>>({});
  const [completedSessions, setCompletedSessions] = useState<string[]>([]);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [unreadFilesCount, setUnreadFilesCount] = useState<number>(0);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false); // Track if we're clearing chat to prevent real-time re-adding

  // PDF & Modal States
  const [pdfData, setPdfData] = useState<{student: Student, record: DailyRecord} | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [reportsClassFilter, setReportsClassFilter] = useState<string | null>(null); // Filter for reports page

  // --- Check for existing session on mount ---
  // CRITICAL: Check session immediately and load user if exists
  // Don't rely only on onAuthStateChange as INITIAL_SESSION may not fire reliably
  useEffect(() => {
    let isMounted = true;
    let sessionChecked = false;
    
    const checkAndLoadSession = async () => {
      try {
        console.log('=== checkAndLoadSession: Starting ===');
        
        // First, check localStorage for expired sessions
        // Chrome-specific: Wrap in try-catch as Chrome may block localStorage access
        let storedSession: string | null = null;
        try {
          storedSession = typeof window !== 'undefined' 
            ? localStorage.getItem('supabase.auth.token') 
            : null;
        } catch (storageError) {
          console.warn('=== checkAndLoadSession: localStorage access blocked (Chrome privacy mode?) ===', storageError);
          // Continue anyway - getUser() will handle it
        }
        
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession);
            if (parsed && parsed.expires_at) {
              const expiresAt = parsed.expires_at * 1000;
              const now = Date.now();
              // Add 5 minute buffer for Chrome's stricter token validation
              const bufferTime = 5 * 60 * 1000; // 5 minutes
              if (expiresAt < (now - bufferTime)) {
                console.warn('=== checkAndLoadSession: Stored session is expired, clearing ===');
                try {
                  if (typeof window !== 'undefined' && window.localStorage) {
                    const allStorageKeys = Object.keys(localStorage).filter(
                      key => key.includes('supabase') || key.includes('auth')
                    );
                    allStorageKeys.forEach(key => {
                      try {
                        localStorage.removeItem(key);
                      } catch (e) {
                        // Ignore individual removal errors
                      }
                    });
                    localStorage.removeItem('supabase.auth.token');
                  }
                } catch (clearError) {
                  console.warn('=== checkAndLoadSession: Failed to clear localStorage ===', clearError);
                }
                sessionChecked = true;
                if (isMounted) {
                  setCurrentUser(null);
                  setIsAppLoading(false);
                }
                return;
              }
            }
          } catch (parseError) {
            console.warn('=== checkAndLoadSession: Failed to parse stored session ===', parseError);
          }
        }
        
        // Chrome-specific: getUser() often times out even with valid session
        // Instead of using getUser() with timeout, rely on onAuthStateChange
        // which is more reliable in Chrome
        console.log('=== checkAndLoadSession: Skipping getUser() - relying on onAuthStateChange for Chrome ===');
        
        // Just clear loading state and let onAuthStateChange handle session
        // This prevents hanging on getUser() timeout
        sessionChecked = true;
        if (isMounted) {
          setIsAppLoading(false);
          // Don't set currentUser to null - let INITIAL_SESSION or SIGNED_IN handle it
        }
        return;
        
        // If we get here, no valid session was found
        sessionChecked = true;
        if (isMounted) {
          setCurrentUser(null);
          setIsAppLoading(false);
        }
      } catch (error) {
        console.error('=== checkAndLoadSession: Exception ===', error);
        sessionChecked = true;
        if (isMounted) {
          setIsAppLoading(false);
        }
      }
    };
    
    checkAndLoadSession();
    
    // Fallback timeout (increased for Chrome)
    const fallbackTimeout = setTimeout(() => {
      if (isMounted && !sessionChecked) {
        console.warn('=== checkAndLoadSession: Fallback timeout (10s) ===');
        sessionChecked = true;
        setIsAppLoading(false);
      }
    }, 10000); // Increased from 5s to 10s for Chrome
    
    return () => {
      isMounted = false;
      clearTimeout(fallbackTimeout);
    };
  }, []);

  // --- Listen to auth state changes ---
  useEffect(() => {
    let isMounted = true;
    let hasInitialSession = false;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      console.log('Auth state change:', event, session?.user?.id);
      
      // Handle INITIAL_SESSION only once - don't clear user on refresh
      if (event === 'INITIAL_SESSION') {
        if (hasInitialSession) {
          console.log('=== INITIAL_SESSION: Already handled, skipping ===');
          return; // Already handled
        }
        hasInitialSession = true;
        
        if (session?.user) {
          console.log('=== INITIAL_SESSION: Session found, userId:', session.user.id);
          try {
            // CRITICAL: Use fetchUserProfile directly with session.user.id
            // DO NOT use api.getCurrentUser() as it calls getSession() which hangs
            console.log('=== INITIAL_SESSION: Loading user profile directly ===');
            const user = await fetchUserProfile(session.user.id);
            
            if (user && isMounted) {
              console.log('=== INITIAL_SESSION: User loaded:', user.name);
              setCurrentUser(user);
              setIsAppLoading(false);
              setIsDataLoading(true);
            } else if (isMounted) {
              // Session exists but no profile - CRITICAL: Don't log out!
              console.warn('=== INITIAL_SESSION: Session exists but no profile found ===');
              console.warn('=== INITIAL_SESSION: NOT clearing currentUser - session is still valid ===');
              setIsAppLoading(false);
              // Retry after delay
              setTimeout(async () => {
                if (isMounted) {
                  try {
                    console.log('=== INITIAL_SESSION: Retrying profile fetch after delay ===');
                    const delayedUser = await fetchUserProfile(session.user.id);
                    if (delayedUser) {
                      console.log('=== INITIAL_SESSION: User profile loaded after delay:', delayedUser.name);
                      setCurrentUser(delayedUser);
                      setIsDataLoading(true);
                    }
                  } catch (err) {
                    console.warn('=== INITIAL_SESSION: Delayed user fetch failed ===', err);
                  }
                }
              }, 3000);
            }
          } catch (error) {
            console.error("=== INITIAL_SESSION: Exception ===", error);
            if (isMounted) {
              // Don't log out on error - session might still be valid
              setIsAppLoading(false);
              // Retry after delay
              setTimeout(async () => {
                if (isMounted && session?.user) {
                  try {
                    const retryUser = await fetchUserProfile(session.user.id);
                    if (retryUser) {
                      console.log('=== INITIAL_SESSION: User profile loaded on retry:', retryUser.name);
                      setCurrentUser(retryUser);
                      setIsDataLoading(true);
                    }
                  } catch (retryErr) {
                    console.warn('=== INITIAL_SESSION: Retry failed ===', retryErr);
                  }
                }
              }, 3000);
            }
          }
        } else if (isMounted) {
          // No session in INITIAL_SESSION - user is logged out
          console.log('=== INITIAL_SESSION: No session found - user is logged out ===');
          setCurrentUser(null);
          setIsAppLoading(false);
        }
        return; // Don't process INITIAL_SESSION further
      }
      
      // Handle SIGNED_IN and TOKEN_REFRESHED - these are the main events we care about
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('=== Auth event:', event, 'Session:', session?.user?.id, '===');
        if (session?.user) {
          // If currentUser is already set and matches, skip
          if (currentUser && currentUser.id === session.user.id) {
            console.log(`=== ${event}: currentUser already set, skipping ===`);
            setIsAppLoading(false);
            return;
          }
          
          try {
            console.log(`=== ${event}: Loading user profile ===`);
            // Use fetchUserProfile directly to avoid another getSession() call
            const user = await fetchUserProfile(session.user.id);
            if (user && isMounted) {
              console.log('=== User loaded in auth state change:', user.name, '===');
              setCurrentUser(user);
              setIsAppLoading(false);
              setIsDataLoading(true);
            } else if (isMounted) {
              console.warn(`=== ${event}: Session exists but no user profile ===`);
              console.warn('=== NOT clearing currentUser - session is still valid ===');
              setIsAppLoading(false);
            }
          } catch (error) {
            console.error(`=== Error getting user in ${event} ===`, error);
            if (isMounted) {
              setIsAppLoading(false);
            }
          }
        } else if (isMounted) {
          console.warn(`=== ${event}: No session in event ===`);
          setIsAppLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('=== User signed out explicitly ===');
        if (isMounted) {
          setCurrentUser(null);
          setStudents([]);
          setLogs([]);
          setIsAppLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Remove currentUser dependency to prevent re-subscription on refresh

  // --- Initial System Load (Settings & Users) ---
  // CRITICAL: Load settings even when user is not logged in
  // Settings should be publicly readable for login screen
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const initSystem = async () => {
      try {
        console.log('=== initSystem: Starting initial system load ===');
        // Load settings and users from database - with timeout to prevent hanging
        // Load them separately to handle errors independently
        let fetchedSettings: SchoolSettings | null = null;
        let fetchedUsers: User[] = [];
        
        // Set a timeout to ensure we don't hang forever
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn("Initial system load timeout - continuing anyway");
            setIsAppLoading(false);
          }
        }, 15000); // Increased to 15 seconds
        
        // Load settings FIRST - it's needed for login screen even without user
        console.log('=== initSystem: Loading settings ===');
        try {
          fetchedSettings = await Promise.race([
            api.getSettings(),
            new Promise<SchoolSettings | null>((resolve) => 
              setTimeout(() => {
                console.warn("Settings load timeout");
                resolve(null);
              }, 10000)
            )
          ]);
          if (fetchedSettings) {
            console.log('=== initSystem: Settings loaded successfully ===', fetchedSettings.name);
          } else {
            console.warn('=== initSystem: Settings load returned null ===');
          }
        } catch (settingsErr: any) {
          console.error("=== initSystem: Failed to load settings ===", settingsErr);
          // Retry settings after a delay
          setTimeout(async () => {
            if (isMounted) {
              try {
                console.log('=== initSystem: Retrying settings load ===');
                const retrySettings = await api.getSettings();
                if (isMounted && retrySettings) {
                  console.log('=== initSystem: Settings loaded on retry ===', retrySettings.name);
                  setSettings(retrySettings);
                }
              } catch (retryError) {
                console.error("=== initSystem: Retry failed to load settings ===", retryError);
              }
            }
          }, 2000);
        }
        
        // Load users in parallel (but only if we have a session)
        console.log('=== initSystem: Loading users ===');
        try {
          fetchedUsers = await Promise.race([
            api.getUsers().catch((err) => {
              // Users might fail if no session - that's okay
              console.warn("Failed to load users (might need auth):", err);
              return [];
            }),
            new Promise<User[]>((resolve) => 
              setTimeout(() => {
                console.warn("Users load timeout");
                resolve([]);
              }, 8000)
            )
          ]);
        } catch (usersErr: any) {
          console.warn("=== initSystem: Failed to load users ===", usersErr);
          fetchedUsers = [];
        }
        
        if (!isMounted) return;
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (isMounted) {
          if (fetchedSettings) {
            console.log('=== initSystem: Setting settings state ===', fetchedSettings.name);
            setSettings(fetchedSettings);
          } else {
            console.warn('=== initSystem: Settings not loaded, will use fallback ===');
          }
          setUsers(fetchedUsers);
        }
      } catch (error: any) {
        console.error("=== initSystem: Failed to load system data ===", error);
        if (isMounted) {
          // Don't use mock data - keep settings as null
          setUsers([]);
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (isMounted) {
          // Always clear loading - if user is logged in, onAuthStateChange will handle it
          console.log('=== initSystem: Clearing app loading state ===');
          setIsAppLoading(false);
        }
      }
    };
    
    initSystem();
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // --- Data Loading on Login or Refresh ---
  useEffect(() => {
    if (currentUser && !isAppLoading) {
      // Only load data if user is set and app is not loading
      const loadDashboardData = async () => {
        setIsDataLoading(true);
        try {
          // Always refresh settings and users from database first
          // Load them separately to handle errors independently
          let freshSettings: SchoolSettings | null = null;
          let freshUsers: User[] = [];
          
          // Retry logic for settings
          let settingsRetries = 3;
          while (settingsRetries > 0 && !freshSettings) {
            try {
              freshSettings = await api.getSettings();
              if (freshSettings) break;
            } catch (settingsError: any) {
              console.warn(`Failed to load settings in dashboard (${settingsRetries} retries left):`, settingsError);
              settingsRetries--;
              if (settingsRetries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
          
          if (!freshSettings) {
            console.error("Failed to load settings after retries");
          }
          
          // Retry logic for users
          let usersRetries = 3;
          while (usersRetries > 0) {
            try {
              freshUsers = await api.getUsers();
              break;
            } catch (usersError: any) {
              console.warn(`Failed to load users in dashboard (${usersRetries} retries left):`, usersError);
              usersRetries--;
              if (usersRetries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              } else {
                freshUsers = [];
              }
            }
          }
          
          if (freshSettings) {
            setSettings(freshSettings);
          }
          setUsers(freshUsers);
          
          // Then load other data in parallel
          const [
            fetchedStudents, 
            fetchedSchedule, 
            fetchedRecords, 
            fetchedLogs, 
            fetchedMessages,
            fetchedCompleted,
            fetchedSubs,
            fetchedSubjects
          ] = await Promise.all([
            api.getStudents(),
            api.getSchedule(),
            api.getDailyRecords(),
            api.getLogs(),
            api.getMessages(),
            api.getCompletedSessions(),
            api.getSubstitutions(),
            api.getSubjects()
          ]);

          setStudents(fetchedStudents);
          setSchedule(fetchedSchedule);
          setCurrentRecords(fetchedRecords);
          setLogs(fetchedLogs);
          setChatMessages(fetchedMessages);
          setCompletedSessions(fetchedCompleted);
          setSubstitutions(fetchedSubs);
          setSubjects(fetchedSubjects);
        } catch (error) {
          console.error("Error loading dashboard data", error);
          // Set empty arrays on error to allow app to continue
          setStudents([]);
          setSchedule([]);
          setCurrentRecords({});
          setLogs([]);
          setChatMessages([]);
          setCompletedSessions([]);
          setSubstitutions([]);
          setSubjects([]);
        } finally {
          setIsDataLoading(false);
        }
      };
      loadDashboardData();
    }
  }, [currentUser]);

  // --- Real-time subscription for chat messages ---
  useEffect(() => {
    if (!currentUser) {
      // Clear messages when user logs out
      setChatMessages([]);
      return;
    }

    let isMounted = true;

      const channel = supabase
      .channel(CONFIG.REALTIME.CHANNEL_NAME)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: CONFIG.REALTIME.SCHEMA, 
          table: CONFIG.REALTIME.TABLE 
        },
        async (payload) => {
          if (!isMounted) return;
          
          // Don't process real-time events if we're clearing chat
          if (isClearingChat) {
            console.log('Real-time subscription: Skipping event while clearing chat');
            return;
          }
          
          try {
            const newMessage = {
              ...payload.new,
              timestamp: new Date(payload.new.timestamp)
            } as ChatMessage;
            
            setChatMessages(prev => {
              // Avoid duplicates by checking ID first
              if (prev.some(m => m.id === newMessage.id)) {
                return prev;
              }
              
              // Remove any temp messages with same sender and text (in case real-time arrives after API response)
              const withoutTemp = prev.filter(m => {
                // Keep temp messages that don't match this new message
                if (m.id.startsWith(CONFIG.TEMP_MESSAGE_PREFIX)) {
                  // Remove temp message if it matches sender and text
                  return !(m.sender === newMessage.sender && m.text === newMessage.text);
                }
                return true;
              });
              
              // Add new message and sort by timestamp
              const updated = [...withoutTemp, newMessage];
              return updated.sort((a, b) => {
                const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                return timeA - timeB;
              });
            });
          } catch (error) {
            console.error('Error processing new message:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to chat messages real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to chat messages');
        } else if (status === 'TIMED_OUT') {
          console.warn('⏱️ Chat messages subscription timed out');
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // --- API Action Wrappers ---

  const handleAddLog = async (action: string, details: string) => {
    const newLog: LogEntry = {
      id: '', // Let database generate UUID
      timestamp: new Date(),
      action,
      details,
      user: currentUser?.name || 'مستخدم'
    };
    // Optimistic update
    setLogs(prev => [newLog, ...prev]);
    // Background API Call
    await api.addLog(newLog);
  };

  const handleLogin = async (user: User) => {
      // API Login Check is done inside LoginScreen component usually, 
      // but here we just set state after successful verification passed from child
      setCurrentUser(user);
      setActiveTab('dashboard');
      // Ensure loading is false after login
      setIsAppLoading(false);
      handleAddLog('تسجيل دخول', `قام ${user.name} بتسجيل الدخول`);
  };

  const handleRegister = async (schoolName: string, adminName: string, user: User, email: string) => {
      setIsAppLoading(true);
      try {
        // Validate password length
        if (!user.password || user.password.length < CONFIG.PASSWORD.MIN_LENGTH) {
          alert({ message: CONFIG.ERRORS.PASSWORD_TOO_SHORT, type: 'error' });
          setIsAppLoading(false);
          return;
        }

        // Create Auth user and profile via API
        const result = await api.signUp(email, user.password || '', { username: user.username, name: user.name, role: user.role, avatar: user.avatar });
        
        if (result.error) {
          alert({ message: result.error, type: 'error' });
          setIsAppLoading(false);
          return;
        }
        
        if (!result.user) {
          alert({ message: CONFIG.ERRORS.REGISTRATION_FAILED, type: 'error' });
          setIsAppLoading(false);
          return;
        }

        // Create/Update settings
        await api.registerSchool(schoolName, adminName);

        const newSettings = await api.getSettings();
        setSettings(newSettings);
        setUsers(prev => [...prev, result.user!]);
        setCurrentUser(result.user);
        setActiveTab('dashboard');
        handleAddLog('تسجيل مدرسة جديدة', `تم تسجيل مدرسة ${schoolName} بواسطة ${adminName}`);
      } catch (e: any) {
        console.error('Registration error', e);
        alert({ message: e?.message || CONFIG.ERRORS.GENERIC_ERROR, type: 'error' });
      } finally {
        setIsAppLoading(false);
      }
  };

  const handleLogout = async () => {
      try {
          console.log('=== handleLogout: Starting logout ===');
          // Sign out from Supabase
          await supabase.auth.signOut();
          
          // CRITICAL: Clear all Supabase-related localStorage items
          if (typeof window !== 'undefined') {
            const allStorageKeys = Object.keys(localStorage).filter(
              key => key.includes('supabase') || key.includes('auth')
            );
            console.log('=== handleLogout: Clearing storage keys ===', allStorageKeys);
            allStorageKeys.forEach(key => {
              localStorage.removeItem(key);
            });
            // Also clear the main session key explicitly
            localStorage.removeItem('supabase.auth.token');
          }
          
          console.log('=== handleLogout: Logout complete ===');
      } catch (error) {
          console.error('=== handleLogout: Logout error ===', error);
          // Even if signOut fails, clear local state and storage
          if (typeof window !== 'undefined') {
            const allStorageKeys = Object.keys(localStorage).filter(
              key => key.includes('supabase') || key.includes('auth')
            );
            allStorageKeys.forEach(key => localStorage.removeItem(key));
            localStorage.removeItem('supabase.auth.token');
          }
      } finally {
          setCurrentUser(null);
          setStudents([]); // Clear sensitive data from state
          setLogs([]);
          setIsAppLoading(false);
      }
  };

  const handleAddStudent = async (student: Student) => {
    setIsDataLoading(true);
    try {
      await api.addStudent(student);
      setStudents(prev => [...prev, student]);
      handleAddLog('إضافة طالب', `تم إضافة الطالب ${student.name}`);
      alert({ message: 'تم إضافة الطالب بنجاح!', type: 'success' });
    } catch (error) {
      console.error('Error adding student:', error);
      alert({ message: 'فشل في إضافة الطالب. يرجى المحاولة مرة أخرى.', type: 'error' });
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleUpdateStudent = async (studentId: string, updates: Partial<Student>) => {
    setIsDataLoading(true);
    try {
      const updated = await api.updateStudent(studentId, updates);
      if (updated) {
        setStudents(prev => prev.map(s => s.id === studentId ? updated : s));
        handleAddLog('تحديث طالب', `تم تحديث بيانات الطالب ${updated.name}`);
        alert({ message: 'تم تحديث بيانات الطالب بنجاح!', type: 'success' });
      } else {
        alert({ message: 'فشل في تحديث بيانات الطالب. يرجى المحاولة مرة أخرى.', type: 'error' });
      }
    } catch (error: any) {
      console.error('Error updating student:', error);
      const errorMessage = error?.message || 'فشل في تحديث بيانات الطالب. يرجى المحاولة مرة أخرى.';
      alert({ message: errorMessage, type: 'error' });
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleUpdateSchedule = async (newSchedule: ScheduleItem[]) => {
    setIsDataLoading(true);
    try {
      console.log('App: Updating schedule with', newSchedule.length, 'items');
      await api.updateSchedule(newSchedule);
      
      // Always reload from database to ensure consistency
      const freshSchedule = await api.getSchedule();
      console.log('App: Reloaded schedule from database:', freshSchedule.length, 'items');
      setSchedule(freshSchedule);
      
      handleAddLog('تعديل جدول', 'تم تحديث الجدول الدراسي العام');
      alert({ message: 'تم تحديث الجدول الدراسي بنجاح!', type: 'success' });
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      const errorMessage = error?.message || 'فشل في تحديث الجدول الدراسي. يرجى المحاولة مرة أخرى.';
      alert({ message: errorMessage, type: 'error' });
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const shouldDelete = await confirm({
      title: 'حذف طالب',
      message: `هل أنت متأكد من حذف الطالب ${student.name}؟\n\nهذا الإجراء لا يمكن التراجع عنه.`,
      type: 'danger',
      confirmText: 'نعم، احذف',
      cancelText: 'إلغاء'
    });

    if (!shouldDelete) return;

    setIsDataLoading(true);
    try {
      // Remove from local state immediately for better UX
      setStudents(prev => prev.filter(s => s.id !== studentId));
      
      // Delete from database
      await api.deleteStudent(studentId);
      
      // Wait a moment for database to commit
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Refresh students list from database to ensure consistency
      const updatedStudents = await api.getStudents();
      const stillExists = updatedStudents.some(s => s.id === studentId);
      
      if (stillExists) {
        // Student still exists - this shouldn't happen, but refresh the list
        setStudents(updatedStudents);
        alert({ 
          message: 'تحذير: يبدو أن الطالب لا يزال موجوداً. تم تحديث القائمة.', 
          type: 'warning' 
        });
      } else {
        // Deletion successful - use the refreshed list
        setStudents(updatedStudents);
        handleAddLog('حذف طالب', `تم حذف الطالب ${student.name}`);
        alert({ message: 'تم حذف الطالب بنجاح!', type: 'success' });
      }
    } catch (error: any) {
      console.error('Error deleting student:', error);
      
      // Refresh students list to ensure consistency
      try {
        const refreshedStudents = await api.getStudents();
        setStudents(refreshedStudents);
      } catch (refreshError) {
        console.error('Error refreshing students after delete failure:', refreshError);
      }
      
      const errorMessage = error?.message || 'فشل في حذف الطالب. يرجى المحاولة مرة أخرى.';
      alert({ message: errorMessage, type: 'error' });
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleImport = async (newStudents: Student[]): Promise<void> => {
    // Don't set global loading - ExcelImporter has its own loading state
    // setIsDataLoading(true);
    try {
      // Remove duplicates within the file itself first
      const seenIds = new Set<string>();
      const uniqueStudents = newStudents.filter(student => {
        if (seenIds.has(student.id)) {
          return false;
        }
        seenIds.add(student.id);
        return true;
      });

      const fileDuplicateCount = newStudents.length - uniqueStudents.length;

      if (uniqueStudents.length === 0) {
        alert({ 
          message: `جميع الطلاب في الملف مكررون (${newStudents.length} طالب)`, 
          type: 'warning' 
        });
        return;
      }

      // Extract unique class grades from imported students
      const importedClassGrades = Array.from(new Set(
        uniqueStudents
          .map(s => s.classGrade?.trim())
          .filter(grade => grade && grade.length > 0)
      ));

      // Import students (API will handle database duplicates)
      await api.importStudents(uniqueStudents);
      
      // Refresh students list from database to ensure consistency
      const updatedStudents = await api.getStudents();
      setStudents(updatedStudents);
      
      // Update class grades in settings if new ones were imported
      if (importedClassGrades.length > 0 && settings) {
        const currentClassGrades = settings.classGrades || [];
        const newClassGrades = importedClassGrades.filter(
          grade => !currentClassGrades.includes(grade)
        );
        
        if (newClassGrades.length > 0) {
          // Sort class grades for better organization
          const allClassGrades = [...currentClassGrades, ...newClassGrades].sort();
          const updatedSettings = { ...settings, classGrades: allClassGrades };
          await api.updateSettings(updatedSettings);
          // Refresh settings from database to ensure consistency
          const freshSettings = await api.getSettings();
          setSettings(freshSettings);
          
          handleAddLog('تحديث الفصول', `تم إضافة ${newClassGrades.length} فصل جديد تلقائياً من الملف المستورد`);
        }
      }
      
      // Calculate how many were actually imported
      const importedCount = uniqueStudents.length;
      const dbDuplicateCount = uniqueStudents.filter(s => 
        updatedStudents.some(existing => existing.id === s.id)
      ).length - (uniqueStudents.length - importedCount);
      
      let logMessage = `تم استيراد ${importedCount} طالب جديد`;
      if (fileDuplicateCount > 0 || dbDuplicateCount > 0) {
        logMessage += ` (تم تخطي ${fileDuplicateCount + dbDuplicateCount} طالب)`;
      }
      
      handleAddLog('استيراد بيانات', logMessage);
      
      let alertMessage = `تم استيراد ${importedCount} طالب بنجاح!`;
      if (fileDuplicateCount > 0 || dbDuplicateCount > 0) {
        const skippedDetails = [];
        if (fileDuplicateCount > 0) skippedDetails.push(`${fileDuplicateCount} مكرر في الملف`);
        if (dbDuplicateCount > 0) skippedDetails.push(`${dbDuplicateCount} موجود في النظام`);
        alertMessage += `\n\nتم تخطي ${fileDuplicateCount + dbDuplicateCount} طالب (${skippedDetails.join('، ')})`;
      }
      
      // Add message about auto-added class grades
      if (importedClassGrades.length > 0 && settings) {
        const newClassGrades = importedClassGrades.filter(
          grade => !(settings.classGrades || []).includes(grade)
        );
        if (newClassGrades.length > 0) {
          alertMessage += `\n\nتم إضافة ${newClassGrades.length} فصل جديد تلقائياً إلى قائمة الفصول: ${newClassGrades.join('، ')}`;
        }
      }
      
      alert({ message: alertMessage, type: 'success' });
      // Stay on students management page after import
    } catch (error: any) {
      console.error('Error importing students:', error);
      let errorMessage = 'فشل في استيراد الطلاب. يرجى المحاولة مرة أخرى.';
      
      if (error?.code === '23505') {
        errorMessage = 'فشل في الاستيراد: يوجد طلاب مكررون في الملف أو في النظام. يرجى التحقق من الملف وإزالة التكرارات.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      alert({ message: errorMessage, type: 'error' });
    }
    // Don't set loading to false - ExcelImporter handles its own loading state
    // finally {
    //   setIsDataLoading(false);
    // }
  };

  const handleSaveRecords = async (records: Record<string, DailyRecord>, sessionId?: string) => {
    console.log('handleSaveRecords called with:', records, 'sessionId:', sessionId);
    setIsDataLoading(true);
    try {
      console.log('Saving records to database...');
      await api.saveDailyRecords(records);
      console.log('Records saved successfully. Updating currentRecords...');
      setCurrentRecords(prev => {
        const updated = { ...prev, ...records };
        console.log('Updated currentRecords:', updated);
        return updated;
      });
      
      // Mark session as completed if sessionId is provided and not already completed
      if (sessionId && !completedSessions.includes(sessionId)) {
        setCompletedSessions(prev => [...prev, sessionId]);
        await api.markSessionComplete(sessionId);
      }
      
      const count = Object.keys(records).length;
      handleAddLog('حفظ بيانات يومية', `تم حفظ تقييمات لـ ${count} طلاب`);
      alert({ message: CONFIG.SUCCESS.DATA_SAVED, type: 'success' });
    } catch (error) {
      console.error('Error in handleSaveRecords:', error);
      alert({ message: 'حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.', type: 'error' });
      throw error; // Re-throw to let StudentTracker handle it
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleSessionEnter = async (session: ScheduleItem) => {
      // Only log the entry, don't mark as completed until records are saved
      // Session completion is handled in handleSaveRecords after saving attendance
      if(session.isSubstituted) {
          handleAddLog('دخول حصة (احتياط)', `قام ${session.teacher} (بديل) بالدخول لحصة ${session.subject} - ${session.classRoom}`);
      } else {
          handleAddLog('دخول حصة', `قام ${session.teacher} بالدخول لبدء حصة ${session.subject} - ${session.classRoom}`);
      }
  };

  const handleSendReport = (student: Student, record: DailyRecord) => {
    setPdfData({ student, record });
    if (currentUser?.role === 'admin') {
         handleAddLog('عرض تقرير', `تم فتح معاينة تقرير PDF للطالب ${student.name}`);
    }
  };

  const handleUpdateChallenge = async (studentId: string, challenge: ChallengeType) => {
      try {
          setStudents(prev => prev.map(s => s.id === studentId ? { ...s, challenge } : s)); // Optimistic
          await api.updateStudentChallenge(studentId, challenge);
          handleAddLog('تحديث حالة', 'قام الموجه بتحديث حالة طالب');
          alert({ message: 'تم تحديث حالة الطالب بنجاح', type: 'success' });
      } catch (error) {
          console.error('Error updating student challenge:', error);
          // Revert optimistic update
          setStudents(prev => prev.map(s => s.id === studentId ? { ...s, challenge: s.challenge } : s));
          alert({ 
              message: 'فشل في تحديث حالة الطالب. يرجى المحاولة مرة أخرى.', 
              type: 'error' 
          });
      }
  };

  const handleSendMessage = async (text: string) => {
      if (!currentUser || !text.trim()) return;
      
      const messageText = text.trim();
      const tempId = `${CONFIG.TEMP_MESSAGE_PREFIX}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      
      // Create temporary message for immediate display
      const tempMessage: ChatMessage = {
          id: tempId,
          sender: currentUser.name,
          text: messageText,
          timestamp: now
      };
      
      // Optimistic update - add message immediately (synchronous)
      setChatMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === tempId)) {
              return prev;
          }
          // Add to end and sort
          const updated = [...prev, tempMessage];
          return updated.sort((a, b) => {
              const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
              const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
              return timeA - timeB;
          });
      });
      
      // Force a micro-task to ensure state update is visible immediately
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      try {
          // Send message - database will generate UUID
          const createdMessage = await api.sendMessage({
              id: '',
              sender: currentUser.name,
              text: messageText,
              timestamp: now
          });
          
          if (createdMessage) {
              // Replace temp message with real message from database
              setChatMessages(prev => {
                  // Remove temp message
                  const withoutTemp = prev.filter(m => m.id !== tempId);
                  // Add real message only if not already present (from real-time)
                  if (!withoutTemp.some(m => m.id === createdMessage.id)) {
                      const updated = [...withoutTemp, createdMessage];
                      return updated.sort((a, b) => {
                          const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                          const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                          return timeA - timeB;
                      });
                  }
                  return withoutTemp;
              });
          }
      } catch (error) {
          console.error('Error sending message:', error);
          // Remove temp message on error
          setChatMessages(prev => prev.filter(m => m.id !== tempId));
          alert({ message: CONFIG.ERRORS.MESSAGE_SEND_FAILED, type: 'error' });
      }
  };

  const handleClearChat = async () => {
      if (!currentUser || currentUser.role !== 'admin') return;
      
      const shouldClear = await confirm({
          title: 'مسح سجل الدردشات',
          message: 'هل أنت متأكد من مسح جميع رسائل الدردشة؟\n\nهذا الإجراء لا يمكن التراجع عنه.',
          type: 'danger',
          confirmText: 'نعم، امسح',
          cancelText: 'إلغاء'
      });

      if (!shouldClear) return;

      setIsDataLoading(true);
      setIsClearingChat(true); // Prevent real-time subscription from re-adding messages
      
      try {
          console.log('handleClearChat: Deleting all chat messages...');
          
          // Delete from database
          await api.deleteAllChatMessages();
          
          console.log('handleClearChat: Messages deleted from database, clearing local state');
          
          // Clear local state immediately
          setChatMessages([]);
          
          // Wait a bit for database to process the deletion and prevent real-time events
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verify deletion by checking database
          const remainingMessages = await api.getMessages();
          if (remainingMessages.length > 0) {
              console.warn('handleClearChat: Some messages still remain, clearing again');
              // Try deleting again
              await api.deleteAllChatMessages();
              setChatMessages([]);
              // Wait again
              await new Promise(resolve => setTimeout(resolve, 500));
          } else {
              console.log('handleClearChat: All messages deleted successfully');
          }
          
          handleAddLog('مسح الدردشات', 'تم مسح جميع رسائل الدردشة');
          alert({ message: 'تم مسح جميع رسائل الدردشة بنجاح!', type: 'success' });
      } catch (error) {
          console.error('Error clearing chat:', error);
          alert({ message: 'فشل في مسح رسائل الدردشة. يرجى المحاولة مرة أخرى.', type: 'error' });
      } finally {
          setIsDataLoading(false);
          // Re-enable real-time subscription after a delay
          setTimeout(() => {
              setIsClearingChat(false);
          }, 2000);
      }
  };

  const handleBulkReportClick = (className: string) => {
      // Navigate to reports page with class filter
      setReportsClassFilter(className);
      setActiveTab('reports');
  };

  const handleResetData = async () => {
      const confirmMessage = `⚠️ تحذير: سيتم حذف جميع البيانات التالية:\n\n` +
        `• جميع بيانات الطلاب\n` +
        `• جميع الحصص والجداول\n` +
        `• جميع التقارير اليومية\n` +
        `• جميع الرسائل الداخلية\n` +
        `• جميع السجلات\n` +
        `• جميع الجلسات المكتملة\n` +
        `• جميع الاحتياطات\n\n` +
        `⚠️ سيتم الحفاظ على:\n` +
        `• بيانات المستخدمين والصلاحيات\n` +
        `• إعدادات المدرسة (بما في ذلك قائمة الفصول)\n\n` +
        `هل أنت متأكد من حذف جميع هذه البيانات؟\n` +
        `هذه العملية لا يمكن التراجع عنها!`;
      
      const firstConfirm = await confirm({
        title: 'حذف جميع البيانات',
        message: confirmMessage,
        type: 'danger' as const,
        confirmText: 'نعم، احذف',
        cancelText: 'إلغاء'
      });
      
      if (!firstConfirm) {
          return;
      }

      // Double confirmation
      const secondConfirm = await confirm({
        title: 'تأكيد نهائي',
        message: '⚠️ تأكيد نهائي: هل أنت متأكد تماماً من حذف جميع البيانات؟',
        type: 'danger' as const,
        confirmText: 'نعم، احذف',
        cancelText: 'إلغاء'
      });
      
      if (!secondConfirm) {
          return;
      }

      setIsDataLoading(true);
      try {
          await api.deleteAllData();
          
          // Clear local state
          setStudents([]);
          setSchedule([]);
          setCurrentRecords({});
          setChatMessages([]);
          setLogs([]);
          setCompletedSessions([]);
          setSubstitutions([]);
          
          handleAddLog('حذف البيانات', 'تم حذف جميع بيانات الطلاب والحصص والتقارير');
          alert({ message: '✅ تم حذف جميع البيانات بنجاح!\n\nتم الحفاظ على بيانات المستخدمين والإعدادات.', type: 'success' });
          
          // Refresh data
          if (currentUser) {
              const [fetchedStudents, fetchedSchedule, fetchedRecords, fetchedLogs, fetchedMessages, fetchedCompleted, fetchedSubs] = await Promise.all([
                  api.getStudents(),
                  api.getSchedule(),
                  api.getDailyRecords(),
                  api.getLogs(),
                  api.getMessages(),
                  api.getCompletedSessions(),
                  api.getSubstitutions()
              ]);
              
              setStudents(fetchedStudents);
              setSchedule(fetchedSchedule);
              setCurrentRecords(fetchedRecords);
              setLogs(fetchedLogs);
              setChatMessages(fetchedMessages);
              setCompletedSessions(fetchedCompleted);
              setSubstitutions(fetchedSubs);
          }
      } catch (error) {
          console.error('Error deleting data:', error);
          alert({ message: '❌ فشل في حذف البيانات. يرجى المحاولة مرة أخرى أو التحقق من الصلاحيات.', type: 'error' });
      } finally {
          setIsDataLoading(false);
      }
  };

  const handleAssignSubstitute = async (scheduleItemId: string, newTeacher: string) => {
      // Find the schedule item
      const scheduleItem = schedule.find(s => s.id === scheduleItemId);
      if (!scheduleItem) {
          alert({ message: 'لم يتم العثور على الحصة المحددة', type: 'error' });
          return;
      }
      
      // Check if session is already assigned to a substitute
      if (scheduleItem.isSubstituted) {
          alert({ message: 'هذه الحصة مسندة بالفعل لمعلم بديل. يجب إلغاء الإسناد الحالي أولاً قبل إسنادها لمعلم بديل آخر.', type: 'error' });
          return;
      }
      
      // Check if there's already a substitution in the database for this session
      const today = new Date().toISOString().split('T')[0];
      const existingSub = substitutions.find(sub => 
          sub.scheduleItemId === scheduleItemId && 
          sub.date === today
      );
      if (existingSub) {
          alert({ message: 'هذه الحصة مسندة بالفعل لمعلم بديل. يجب إلغاء الإسناد الحالي أولاً قبل إسنادها لمعلم بديل آخر.', type: 'error' });
          return;
      }
      
      // Get the original teacher
      const originalTeacher = scheduleItem.originalTeacher || scheduleItem.teacher;
      
      // Validate that substitute is different from original teacher
      if (newTeacher === originalTeacher) {
          alert({ message: 'لا يمكن إسناد الحصة للمعلم الأساسي نفسه. يرجى اختيار معلم بديل آخر.', type: 'error' });
          return;
      }
      const newSub: Substitution = {
          id: Date.now().toString(),
          date: today,
          scheduleItemId,
          substituteTeacher: newTeacher
      };
      setSubstitutions(prev => [...prev, newSub]); // Optimistic
      await api.assignSubstitute(newSub);
      handleAddLog('إسناد احتياط', `تم إسناد حصة احتياط للمعلم ${newTeacher}`);
      
      // Update schedule to reflect substitution
      const updatedSchedule = schedule.map(s => 
          s.id === scheduleItemId 
              ? { ...s, teacher: newTeacher, originalTeacher: s.teacher || s.originalTeacher, isSubstituted: true }
              : s
      );
      setSchedule(updatedSchedule);
  };

  const handleRemoveSubstitute = async (scheduleItemId: string) => {
      // Prevent multiple clicks
      if (isDataLoading) {
          return;
      }
      
      setIsDataLoading(true);
      try {
          // Find the substitution to remove - try multiple ways to find it
          let substitution = substitutions.find(sub => sub.scheduleItemId === scheduleItemId);
          
          // If not found in local state, try fetching from database
          if (!substitution) {
              const allSubs = await api.getSubstitutions();
              substitution = allSubs.find(sub => sub.scheduleItemId === scheduleItemId);
              if (substitution) {
                  // Update local state
                  setSubstitutions(allSubs);
              }
          }
          
          // Remove from database if found
          if (substitution && substitution.id) {
              try {
                  await api.removeSubstitute(substitution.id);
                  setSubstitutions(prev => prev.filter(sub => sub.id !== substitution!.id));
                  handleAddLog('إلغاء احتياط', 'تم إلغاء إسناد حصة احتياط');
              } catch (dbError) {
                  console.error('Error removing from database:', dbError);
                  // Continue to update UI even if DB removal fails
              }
          }
          
          // Always update schedule to remove substitution (optimistic update)
          const updatedSchedule = schedule.map(s => 
              s.id === scheduleItemId 
                  ? { ...s, teacher: s.originalTeacher || s.teacher, originalTeacher: undefined, isSubstituted: false }
                  : s
          );
          setSchedule(updatedSchedule);
          
          alert({ message: 'تم إلغاء إسناد المعلم الاحتياطي بنجاح', type: 'success' });
      } catch (error) {
          console.error('Error removing substitute:', error);
          alert({ message: 'فشل في إلغاء إسناد المعلم الاحتياطي. يرجى المحاولة مرة أخرى.', type: 'error' });
      } finally {
          setIsDataLoading(false);
      }
  };

  // --- Data Processing for View ---

  // Use useMemo to recalculate effective schedule when schedule or substitutions change
  const effectiveSchedule = React.useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      return schedule.map(item => {
          const sub = substitutions.find(s => s.scheduleItemId === item.id && s.date === today);
          if (sub) {
              return { 
                  ...item, 
                  teacher: sub.substituteTeacher, 
                  originalTeacher: item.teacher || item.originalTeacher, 
                  isSubstituted: true 
              };
          }
          // Clear substitution flags if no substitution exists
          return {
              ...item,
              isSubstituted: false,
              originalTeacher: item.originalTeacher || item.teacher
          };
      });
  }, [schedule, substitutions]);

  // Loading Screen - only show if we're loading and user is not logged in
  // Once user is logged in, allow app to continue even if some data is still loading
  if (isAppLoading && !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50" dir="rtl">
        <Loader2 size={CONFIG.UI.LOADER_SIZE_LARGE} className="text-teal-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-700">{CONFIG.LOADING.APP}</h2>
        <p className="text-gray-400 mt-2">{CONFIG.LOADING.APP_SUBTITLE}</p>
      </div>
    );
  }
  
  // If user is logged in but settings not loaded, create temporary settings
  // This prevents white screen while settings load in background
  const effectiveSettings = settings || {
    ministry: 'وزارة التعليم',
    region: 'الإدارة العامة للتعليم',
    name: 'المدرسة',
    slogan: '',
    logoUrl: '',
    whatsappPhone: '',
    reportGeneralMessage: '',
    reportLink: ''
  } as SchoolSettings;

  // Auth Screen - Check both currentUser and session to ensure consistency
  // This prevents issues on mobile where state might not sync properly
  const shouldShowLogin = !currentUser;
  
  if (shouldShowLogin) {
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
        settings={effectiveSettings} 
        users={users} 
      />
    );
  }
  
  // Filter for the logged-in teacher using their name (case-insensitive, trim whitespace, and normalize)
  const currentSchedule = currentUser.role === 'teacher' 
      ? effectiveSchedule.filter(item => {
          if (!item.teacher) return false;
          const itemTeacher = (item.teacher || '').trim().replace(/\s+/g, ' ');
          const currentUserName = (currentUser.name || '').trim().replace(/\s+/g, ' ');
          // Exact match (case-insensitive)
          if (itemTeacher.toLowerCase() === currentUserName.toLowerCase()) return true;
          // Also check if names match when normalized (remove extra spaces)
          const normalizedItem = itemTeacher.toLowerCase().replace(/\s+/g, ' ').trim();
          const normalizedUser = currentUserName.toLowerCase().replace(/\s+/g, ' ').trim();
          return normalizedItem === normalizedUser;
        }) 
      : effectiveSchedule;

  const allTeachers = Array.from(new Set([
    ...AVAILABLE_TEACHERS,
    ...users.filter(u => u.role === 'teacher').map(u => u.name)
  ]));

  const renderContent = () => {
    // Don't show global loading for import/students tabs - let components handle their own loading
    const tabsWithOwnLoading = ['import', 'students'];
    if (isDataLoading && !tabsWithOwnLoading.includes(activeTab)) {
       return (
         <div className="flex flex-col items-center justify-center h-96">
            <Loader2 size={CONFIG.UI.LOADER_SIZE_MEDIUM} className="text-teal-500 animate-spin mb-4" />
            <p className="text-gray-500 font-bold">{CONFIG.LOADING.DATA}</p>
         </div>
       );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardStats 
                  students={students} 
                  records={currentRecords} 
                  onSendReminder={(text) => handleSendMessage(text)}
                  role={currentUser.role}
                  completedSessions={completedSessions}
                  schedule={effectiveSchedule}
                  settings={effectiveSettings}
                  onBulkReport={currentUser.role === 'admin' ? handleBulkReportClick : undefined}
               />;
      case 'tracking':
        return (
          <StudentTracker 
            students={students} 
            records={currentRecords}
            onSave={handleSaveRecords}
            isAdmin={currentUser.role === 'admin'}
            role={currentUser.role}
            onBulkReport={currentUser.role === 'admin' ? (records: Record<string, DailyRecord>) => {
              // For StudentTracker, keep the old behavior (open modal with records)
              setCurrentRecords(prev => ({...prev, ...records}));
              setBulkModalOpen(true);
            } : undefined}
            onSendReport={handleSendReport}
            schedule={currentSchedule}
            onSessionEnter={handleSessionEnter}
            completedSessions={completedSessions}
          />
        );
      case 'students':
        return (
          <StudentManagement 
            students={students}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onImportStudents={handleImport}
            settings={effectiveSettings}
            role={currentUser.role}
          />
        );
      case 'import':
        return <ExcelImporter onImport={handleImport} />;
      case 'archive':
        return <ArchiveLog logs={logs} />;
      case 'settings':
        return (
            <SchoolSettingsForm 
                settings={effectiveSettings} 
                users={users}
                schedule={schedule}
                currentUser={currentUser}
                students={students}
                subjects={subjects}
                onSave={async (s) => { 
                   await api.updateSettings(s); 
                   // Always refresh from database to ensure consistency
                   const freshSettings = await api.getSettings();
                   setSettings(freshSettings);
                   handleAddLog('تعديل إعدادات', 'تم تحديث بيانات المدرسة'); 
                }} 
                onUpdateUsers={async (u) => { 
                   await api.updateUsers(u); 
                   setUsers(u); 
                   handleAddLog('إدارة مستخدمين', 'تم تحديث قائمة المستخدمين'); 
                }}
                onUpdateSubjects={async () => {
                  // Reload subjects from database after any subject change
                  const freshSubjects = await api.getSubjects();
                  setSubjects(freshSubjects);
                  handleAddLog('تعديل المواد', 'تم تحديث قائمة المواد الدراسية');
                }}
                onUpdateSchedule={async (s) => { 
                   try {
                     console.log('App: Updating schedule with', s.length, 'items');
                     await api.updateSchedule(s);
                     
                     // Always reload from database to ensure consistency
                     const freshSchedule = await api.getSchedule();
                     console.log('App: Reloaded schedule from database:', freshSchedule.length, 'items');
                     setSchedule(freshSchedule);
                     
                     handleAddLog('تعديل جدول', 'تم تحديث الجدول الدراسي العام');
                     alert({ message: 'تم تحديث الجدول الدراسي بنجاح!', type: 'success' });
                   } catch (error: any) {
                     console.error('App: Error updating schedule:', error);
                     alert({ message: error?.message || 'فشل في تحديث الجدول الدراسي. يرجى المحاولة مرة أخرى.', type: 'error' });
                     throw error; // Re-throw to prevent state update on error
                   }
                }}
                onReset={handleResetData} 
            />
        );
      case 'schedule':
        if (!currentUser) {
          return (
            <div className="flex flex-col items-center justify-center h-96">
              <Loader2 size={CONFIG.UI.LOADER_SIZE_MEDIUM} className="text-teal-500 animate-spin mb-4" />
              <p className="text-gray-500 font-bold">جارٍ التحميل...</p>
            </div>
          );
        }
        return (
            <TeacherSchedule 
                schedule={currentUser.role === 'admin' ? effectiveSchedule : currentSchedule} 
                completedSessions={completedSessions} 
                onAssignSubstitute={currentUser.role === 'admin' ? handleAssignSubstitute : undefined}
                onRemoveSubstitute={currentUser.role === 'admin' ? handleRemoveSubstitute : undefined}
                role={currentUser.role}
                subjects={subjects || []}
                onUpdateSchedule={currentUser.role === 'admin' ? handleUpdateSchedule : undefined}
                availableTeachers={allTeachers}
                settings={effectiveSettings}
                onSessionEnter={currentUser.role === 'teacher' ? handleSessionEnter : undefined}
            />
        );
      case 'reports':
         return currentUser.role === 'counselor' ? 
            <CounselorView 
                students={students} 
                onUpdateChallenge={handleUpdateChallenge} 
                settings={effectiveSettings}
                onUpdateSettings={async (s) => { 
                   await api.updateSettings(s);
                   // Always refresh from database to ensure consistency
                   const freshSettings = await api.getSettings();
                   setSettings(freshSettings);
                   handleAddLog('تعديل إعدادات التقرير', 'قام الموجه بتحديث رسالة التقرير'); 
                }}
                onViewReport={(s) => {
                    const r = currentRecords[s.id] || { 
                        studentId: s.id, 
                        date: new Date().toISOString().split('T')[0],
                        attendance: 'present', 
                        participation: 'excellent', 
                        homework: 'excellent', 
                        behavior: 'excellent', 
                        notes: '' 
                    };
                    setPdfData({student: s, record: r});
                }}
            /> :
            currentUser.role === 'admin' ? (
              <DailyStudentView
                students={students}
                records={currentRecords}
                settings={effectiveSettings}
                onSendReports={(records) => {
                  // Handle bulk send
                  setBulkModalOpen(true);
                }}
                initialClassFilter={reportsClassFilter}
                schedule={schedule}
              />
            ) : (
              <StudentTracker 
                students={students} 
                role={currentUser.role} 
                onSave={() => {}} 
                onSendReport={(s, r) => setPdfData({student: s, record: r})} 
                schedule={currentSchedule}
                onSessionEnter={handleSessionEnter}
                completedSessions={completedSessions}
              />
            );
      case 'behavior-tracking':
        return currentUser.role === 'counselor' ? (
          <BehaviorTracking 
            students={students}
            records={currentRecords}
            settings={effectiveSettings}
          />
        ) : null;
      case 'files':
        return <FileSharing role={currentUser.role} onAddLog={handleAddLog} onUnreadCountChange={setUnreadFilesCount} />;
      case 'absence':
        return currentUser.role === 'admin' ? (
          <AbsenceManagement 
            students={students}
            records={currentRecords}
            settings={effectiveSettings}
          />
        ) : null;
      case 'profile':
        return <UserProfile user={currentUser} />;
      default:
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MessageCircle size={64} className="mb-4 text-gray-200" />
                <p>الصفحة قيد التطوير</p>
            </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row overflow-x-hidden h-screen" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden bg-white p-2 shadow-sm border-b border-gray-100 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg flex-shrink-0"
            >
                <Menu size={18} />
            </button>
            <span className="font-bold text-gray-800 truncate text-xs">{effectiveSettings.name}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
             <div className="relative p-1">
                <Bell size={16} className="text-gray-500" />
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
             </div>
             <img src={currentUser.avatar} alt="User" className="w-7 h-7 rounded-full border border-gray-200 flex-shrink-0" />
        </div>
      </div>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        role={currentUser.role} 
        onLogout={handleLogout} 
        settings={effectiveSettings} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        unreadFilesCount={unreadFilesCount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      {pdfData && (
        <PDFReport 
            isOpen={!!pdfData} 
            onClose={() => setPdfData(null)} 
            student={pdfData.student} 
            record={pdfData.record}
            settings={effectiveSettings}
            schedule={schedule}
        />
      )}

      <BulkReportModal 
          isOpen={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          students={students}
          records={currentRecords}
          schoolName={effectiveSettings.name}
          schoolPhone={effectiveSettings.whatsappPhone}
          settings={effectiveSettings}
          schedule={schedule}
      />

      {/* Show Internal Chat only on dashboard */}
      {activeTab === 'dashboard' && (
        <InternalChat 
            messages={chatMessages} 
            onSendMessage={handleSendMessage} 
            role={currentUser.role} 
            currentUserName={currentUser.name}
            onClearChat={handleClearChat}
        />
      )}

      {/* Main Content Area */}
      <main className={`flex-1 p-2 md:p-4 lg:p-8 transition-all duration-300 print:hidden w-full max-w-[100vw] overflow-x-hidden overflow-y-auto ${isSidebarCollapsed ? 'md:mr-20' : 'md:mr-64'}`}>
        <header className="hidden md:flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    {activeTab === 'dashboard' && 'لوحة التحكم الرئيسية'}
                    {activeTab === 'tracking' && (currentUser.role === 'admin' ? 'إرسال التقارير (حصص اليوم)' : 'متابعة الطلاب')}
                    {activeTab === 'students' && 'إدارة الطلاب'}
                    {activeTab === 'import' && 'استيراد البيانات'}
                    {activeTab === 'archive' && 'سجل العمليات'}
                    {activeTab === 'settings' && 'إعدادات النظام'}
                    {activeTab === 'schedule' && (currentUser.role === 'admin' ? 'جدول الحصص العام (وإسناد الاحتياط)' : 'جدولي الدراسي')}
                    {activeTab === 'reports' && (currentUser.role === 'counselor' ? 'إعدادات التقارير والتحديات' : 'التقارير')}
                    {activeTab === 'files' && 'مشاركة الملفات'}
                    {activeTab === 'profile' && 'حسابي'}
                </h1>
                <p className="text-gray-500 text-sm mt-1">{effectiveSettings.name}</p>
            </div>
            <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-3 md:gap-4 bg-white p-2 md:p-3 rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="text-left hidden lg:block">
                      <p className="text-sm font-bold text-gray-800">
                          {currentUser.name}
                      </p>
                      <p className="text-xs text-gray-500">
                          {currentUser.role === 'admin' ? 'صلاحيات كاملة' : currentUser.role === 'teacher' ? 'معلم مادة' : 'توجيه وإرشاد'}
                      </p>
                  </div>
                  <div className="bg-white p-2 rounded-full shadow-sm border border-gray-100">
                      <img src={currentUser.avatar} alt="User" className="w-8 h-8 rounded-full" />
                  </div>
                </button>
            </div>
        </header>

        {renderContent()}
      </main>
      
      {/* Modals */}
      {confirmModal.isOpen && confirmModal.options && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.options.title || 'تأكيد'}
          message={confirmModal.options.message}
          type={confirmModal.options.type || 'warning'}
          confirmText={confirmModal.options.confirmText || 'تأكيد'}
          cancelText={confirmModal.options.cancelText || 'إلغاء'}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}
      
      {alertModal.isOpen && alertModal.options && (
        <AlertModal
          isOpen={alertModal.isOpen}
          message={alertModal.options.message}
          type={alertModal.options.type || 'info'}
          duration={alertModal.options.duration || 3000}
          onClose={alertModal.onClose}
        />
      )}
    </div>
  );
};

export default App;
