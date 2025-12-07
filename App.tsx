
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { StudentTracker } from './components/StudentTracker';
import { DashboardStats } from './components/DashboardStats';
import { ExcelImporter } from './components/ExcelImporter';
import { ArchiveLog } from './components/ArchiveLog';
import { LoginScreen } from './components/LoginScreen';
import { SchoolSettingsForm } from './components/SchoolSettings';
import { TeacherSchedule } from './components/TeacherSchedule';
import { PDFReport } from './components/PDFReport';
import { CounselorView } from './components/CounselorView';
import { InternalChat } from './components/InternalChat';
import { BulkReportModal } from './components/BulkReportModal';
import { Student, DailyRecord, LogEntry, Role, SchoolSettings, ChallengeType, ChatMessage, ScheduleItem, Substitution, User } from './types';
import { AVAILABLE_TEACHERS } from './constants';
import { MessageCircle, Menu, Bell, Loader2 } from 'lucide-react';
import { api } from './services/api';

const App: React.FC = () => {
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

  // --- Initial System Load (Settings & Users) ---
  useEffect(() => {
    const initSystem = async () => {
      try {
        const [fetchedSettings, fetchedUsers] = await Promise.all([
          api.getSettings(),
          api.getUsers()
        ]);
        setSettings(fetchedSettings);
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Failed to load system data", error);
        alert("فشل في الاتصال بقاعدة البيانات");
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
        } finally {
          setIsDataLoading(false);
        }
      };
      loadDashboardData();
    }
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
        // Create Auth user and profile via API
        const created = await api.signUp(email, user.password || '', { username: user.username, name: user.name, role: user.role, avatar: user.avatar });
        if (!created) {
          alert('فشل في إنشاء حساب المسؤول');
          setIsAppLoading(false);
          return;
        }

        // Create/Update settings
        await api.registerSchool(schoolName, adminName);

        const newSettings = await api.getSettings();
        setSettings(newSettings);
        setUsers(prev => [...prev, created]);
        setCurrentUser(created);
        setActiveTab('dashboard');
        handleAddLog('تسجيل مدرسة جديدة', `تم تسجيل مدرسة ${schoolName} بواسطة ${adminName}`);
      } catch (e) {
        console.error('Registration error', e);
        alert('فشل التسجيل');
      } finally {
        setIsAppLoading(false);
      }
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setStudents([]); // Clear sensitive data from state
      setLogs([]);
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
      alert('تم حفظ البيانات في قاعدة البيانات بنجاح!');
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
      const newMessage: ChatMessage = {
          id: Date.now().toString(),
          sender: currentUser?.name || 'مستخدم',
          text: text,
          timestamp: new Date()
      };
      setChatMessages(prev => [...prev, newMessage]); // Optimistic
      await api.sendMessage(newMessage);
  };

  const handleBulkReportClick = (records: Record<string, DailyRecord>) => {
      setCurrentRecords(prev => ({...prev, ...records}));
      setBulkModalOpen(true);
  };

  const handleResetData = () => {
      if (confirm('تنبيه: هذه الميزة تتطلب إعادة تهيئة قاعدة البيانات من السيرفر. هل تريد تحديث الصفحة؟')) {
          window.location.reload();
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
  if (isAppLoading || !settings) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50" dir="rtl">
        <Loader2 size={48} className="text-teal-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-700">جاري الاتصال بقاعدة البيانات...</h2>
        <p className="text-gray-400 mt-2">يرجى الانتظار قليلاً</p>
      </div>
    );
  }

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
  
  // Filter for the logged-in teacher using their name
  const currentSchedule = currentUser.role === 'teacher' 
      ? effectiveSchedule.filter(item => item.teacher === currentUser.name) 
      : effectiveSchedule;

  const allTeachers = Array.from(new Set([
    ...AVAILABLE_TEACHERS,
    ...users.filter(u => u.role === 'teacher').map(u => u.name)
  ]));

  const renderContent = () => {
    if (isDataLoading) {
       return (
         <div className="flex flex-col items-center justify-center h-96">
            <Loader2 size={40} className="text-teal-500 animate-spin mb-4" />
            <p className="text-gray-500 font-bold">جاري جلب البيانات...</p>
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
                   setSettings(s); 
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
                   setSettings(s); 
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
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden bg-white p-4 shadow-sm border-b border-gray-100 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -mr-2 text-gray-600 hover:bg-gray-50 rounded-lg"
            >
                <Menu size={24} />
            </button>
            <span className="font-bold text-gray-800 truncate max-w-[200px]">{settings.name}</span>
        </div>
        <div className="flex items-center gap-3">
             <div className="relative">
                <Bell size={20} className="text-gray-500" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
             </div>
             <img src={currentUser.avatar} alt="User" className="w-8 h-8 rounded-full border border-gray-200" />
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
    </div>
  );
};

export default App;
