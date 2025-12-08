
import React, { useState, useEffect } from 'react';
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
import { InternalChat } from './components/InternalChat';
import { BulkReportModal } from './components/BulkReportModal';
import { Student, DailyRecord, LogEntry, Role, SchoolSettings, ChallengeType, ChatMessage, ScheduleItem, Substitution, User } from './types';
import { AVAILABLE_TEACHERS } from './constants';
import { CONFIG } from './config';
import { MessageCircle, Menu, Bell, Loader2 } from 'lucide-react';
import { api } from './services/api';
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null); // Null until loaded
  const [users, setUsers] = useState<User[]>([]);
  
  // Dynamic Schedule State
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentRecords, setCurrentRecords] = useState<Record<string, DailyRecord>>({});
  const [completedSessions, setCompletedSessions] = useState<string[]>([]);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // PDF & Modal States
  const [pdfData, setPdfData] = useState<{student: Student, record: DailyRecord} | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // --- Check for existing session on mount ---
  useEffect(() => {
    const checkSession = async () => {
      try {
        // First check if there's a session in storage (faster)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // If session exists, get user profile (with longer timeout)
          const timeoutPromise = new Promise<null>((resolve) => 
            setTimeout(() => resolve(null), CONFIG.TIMEOUTS.SESSION_CHECK)
          );
          
          const userPromise = api.getCurrentUser();
          const user = await Promise.race([userPromise, timeoutPromise]);
          
          if (user) {
            setCurrentUser(user);
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
        // Don't block - allow app to continue
      }
    };
    checkSession();
  }, []);

  // --- Listen to auth state changes ---
  useEffect(() => {
    let isMounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        // User signed in, token refreshed, or initial session loaded - update user state
        if (session?.user) {
          try {
            const user = await api.getCurrentUser();
            if (user && isMounted) {
              setCurrentUser(user);
            }
          } catch (error) {
            console.error("Error getting user in auth state change:", error);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out - clear state
        if (isMounted) {
          setCurrentUser(null);
          setStudents([]);
          setLogs([]);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // --- Initial System Load (Settings & Users) ---
  useEffect(() => {
    const initSystem = async () => {
      try {
        // Load settings and users from database - no timeout to allow for slow connections
        // Load them separately to handle errors independently
        let fetchedSettings: SchoolSettings | null = null;
        let fetchedUsers: User[] = [];
        
        try {
          fetchedSettings = await api.getSettings();
        } catch (settingsError: any) {
          console.error("Failed to load settings", settingsError);
          // Continue even if settings fail - we'll retry later
        }
        
        try {
          fetchedUsers = await api.getUsers();
        } catch (usersError: any) {
          console.error("Failed to load users", usersError);
          // Continue with empty users array
        }
        
        if (fetchedSettings) {
          setSettings(fetchedSettings);
        }
        setUsers(fetchedUsers);
        
        // If settings failed, retry after a delay
        if (!fetchedSettings) {
          setTimeout(async () => {
            try {
              const retrySettings = await api.getSettings();
              setSettings(retrySettings);
            } catch (retryError) {
              console.error("Retry failed to load settings", retryError);
            }
          }, 2000);
        }
      } catch (error: any) {
        console.error("Failed to load system data", error);
        // Don't use mock data - keep settings as null
        setUsers([]);
      } finally {
        setIsAppLoading(false);
      }
    };
    initSystem();
  }, []);

  // --- Data Loading on Login ---
  useEffect(() => {
    if (currentUser) {
      const loadDashboardData = async () => {
        setIsDataLoading(true);
        try {
          // Always refresh settings and users from database first
          // Load them separately to handle errors independently
          let freshSettings: SchoolSettings | null = null;
          let freshUsers: User[] = [];
          
          try {
            freshSettings = await api.getSettings();
          } catch (settingsError: any) {
            console.error("Failed to load settings in dashboard", settingsError);
            // Continue even if settings fail
          }
          
          try {
            freshUsers = await api.getUsers();
          } catch (usersError: any) {
            console.error("Failed to load users in dashboard", usersError);
            // Continue with empty users array
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
            fetchedSubs
          ] = await Promise.all([
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
          await supabase.auth.signOut();
      } catch (error) {
          console.error('Logout error:', error);
      } finally {
          setCurrentUser(null);
          setStudents([]); // Clear sensitive data from state
          setLogs([]);
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

  const handleImport = async (newStudents: Student[]) => {
    setIsDataLoading(true);
    try {
      await api.importStudents(newStudents);
      setStudents(prev => [...prev, ...newStudents]);
      handleAddLog('استيراد بيانات', `تم استيراد ${newStudents.length} طلاب جدد`);
      setTimeout(() => setActiveTab('tracking'), 500);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleSaveRecords = async (records: Record<string, DailyRecord>) => {
    setIsDataLoading(true);
    try {
      await api.saveDailyRecords(records);
      setCurrentRecords(prev => ({ ...prev, ...records }));
      const count = Object.keys(records).length;
      handleAddLog('حفظ بيانات يومية', `تم حفظ تقييمات لـ ${count} طلاب`);
      alert({ message: CONFIG.SUCCESS.DATA_SAVED, type: 'success' });
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleSessionEnter = async (session: ScheduleItem) => {
      if (!completedSessions.includes(session.id)) {
          setCompletedSessions(prev => [...prev, session.id]); // Optimistic
          await api.markSessionComplete(session.id);
          
          if(session.isSubstituted) {
              handleAddLog('دخول حصة (احتياط)', `قام ${session.teacher} (بديل) بالدخول لحصة ${session.subject} - ${session.classRoom}`);
          } else {
              handleAddLog('دخول حصة', `قام ${session.teacher} بالدخول لبدء حصة ${session.subject} - ${session.classRoom}`);
          }
      }
  };

  const handleSendReport = (student: Student, record: DailyRecord) => {
    setPdfData({ student, record });
    if (currentUser?.role === 'admin') {
         handleAddLog('عرض تقرير', `تم فتح معاينة تقرير PDF للطالب ${student.name}`);
    }
  };

  const handleUpdateChallenge = async (studentId: string, challenge: ChallengeType) => {
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, challenge } : s)); // Optimistic
      await api.updateStudentChallenge(studentId, challenge);
      handleAddLog('تحديث حالة', 'قام الموجه بتحديث حالة طالب');
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

  const handleBulkReportClick = (records: Record<string, DailyRecord>) => {
      setCurrentRecords(prev => ({...prev, ...records}));
      setBulkModalOpen(true);
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
        `• إعدادات المدرسة\n\n` +
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
      const today = new Date().toISOString().split('T')[0];
      const newSub: Substitution = {
          id: Date.now().toString(),
          date: today,
          scheduleItemId,
          substituteTeacher: newTeacher
      };
      setSubstitutions(prev => [...prev, newSub]); // Optimistic
      await api.assignSubstitute(newSub);
      handleAddLog('إسناد احتياط', `تم إسناد حصة احتياط للمعلم ${newTeacher}`);
  };

  // --- Data Processing for View ---

  const getEffectiveSchedule = () => {
      const today = new Date().toISOString().split('T')[0];
      return schedule.map(item => {
          const sub = substitutions.find(s => s.scheduleItemId === item.id && s.date === today);
          if (sub) {
              return { 
                  ...item, 
                  teacher: sub.substituteTeacher, 
                  originalTeacher: item.teacher, 
                  isSubstituted: true 
              };
          }
          return item;
      });
  };

  // Loading Screen
  if (isAppLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50" dir="rtl">
        <Loader2 size={CONFIG.UI.LOADER_SIZE_LARGE} className="text-teal-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-700">{CONFIG.LOADING.APP}</h2>
        <p className="text-gray-400 mt-2">{CONFIG.LOADING.APP_SUBTITLE}</p>
      </div>
    );
  }
  
  // If settings not loaded yet but user is logged in, allow app to continue
  // Settings will be loaded in the background or we'll use defaults
  // Only block if we're still in initial load phase
  if (!settings && !currentUser && isAppLoading) {
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

  // Auth Screen
  if (!currentUser) {
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
        settings={settings} 
        users={users} 
      />
    );
  }

  const effectiveSchedule = getEffectiveSchedule();
  
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
    if (isDataLoading) {
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
               />;
      case 'tracking':
        return (
          <StudentTracker 
            students={students} 
            onSave={handleSaveRecords}
            isAdmin={currentUser.role === 'admin'}
            role={currentUser.role}
            onBulkReport={currentUser.role === 'admin' ? handleBulkReportClick : undefined}
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
            onImportStudents={handleImport}
          />
        );
      case 'import':
        return <ExcelImporter onImport={handleImport} />;
      case 'archive':
        return <ArchiveLog logs={logs} />;
      case 'settings':
        return (
            <SchoolSettingsForm 
                settings={settings} 
                users={users}
                schedule={schedule}
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
                onUpdateSchedule={async (s) => { 
                   await api.updateSchedule(s); 
                   setSchedule(s); 
                   handleAddLog('تعديل جدول', 'تم تحديث الجدول الدراسي العام'); 
                }}
                onReset={handleResetData} 
            />
        );
      case 'schedule':
        return (
            <TeacherSchedule 
                schedule={currentUser.role === 'admin' ? effectiveSchedule : currentSchedule} 
                completedSessions={completedSessions} 
                onAssignSubstitute={currentUser.role === 'admin' ? handleAssignSubstitute : undefined}
                role={currentUser.role}
                availableTeachers={allTeachers}
            />
        );
      case 'reports':
         return currentUser.role === 'counselor' ? 
            <CounselorView 
                students={students} 
                onUpdateChallenge={handleUpdateChallenge} 
                settings={settings}
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
            <StudentTracker 
                students={students} 
                role={currentUser.role} 
                onSave={() => {}} 
                onSendReport={(s, r) => setPdfData({student: s, record: r})} 
                schedule={currentSchedule}
                onSessionEnter={handleSessionEnter}
                completedSessions={completedSessions}
            />;
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
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row overflow-x-hidden" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden bg-white p-3 shadow-sm border-b border-gray-100 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-2 flex-1 min-w-0">
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg flex-shrink-0"
            >
                <Menu size={CONFIG.UI.MENU_ICON_SIZE} />
            </button>
            <span className="font-bold text-gray-800 truncate text-sm">{settings.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
             <div className="relative p-1">
                <Bell size={CONFIG.UI.BELL_ICON_SIZE} className="text-gray-500" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
             </div>
             <img src={currentUser.avatar} alt="User" className={`w-${CONFIG.UI.AVATAR_SIZE} h-${CONFIG.UI.AVATAR_SIZE} rounded-full border border-gray-200 flex-shrink-0`} />
        </div>
      </div>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        role={currentUser.role} 
        onLogout={handleLogout} 
        settings={settings} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      {pdfData && (
        <PDFReport 
            isOpen={!!pdfData} 
            onClose={() => setPdfData(null)} 
            student={pdfData.student} 
            record={pdfData.record}
            settings={settings}
            schedule={schedule}
        />
      )}

      <BulkReportModal 
          isOpen={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          students={students}
          records={currentRecords}
          schoolName={settings.name}
          schoolPhone={settings.whatsappPhone}
      />

      <InternalChat 
          messages={chatMessages} 
          onSendMessage={handleSendMessage} 
          role={currentUser.role} 
          currentUserName={currentUser.name}
      />

      {/* Main Content Area */}
      <main className="flex-1 md:mr-64 p-4 md:p-8 transition-all duration-300 print:hidden w-full max-w-[100vw] overflow-x-hidden">
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
                </h1>
                <p className="text-gray-500 text-sm mt-1">{settings.name}</p>
            </div>
            
            <div className="flex items-center gap-4">
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
