
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { SchoolSettings, User, Role, ScheduleItem, Subject, Student } from '../types';
import { PasswordReset } from './PasswordReset';
import { Save, Image as ImageIcon, Database, BookOpen, Plus, Upload, Phone, Trash2, AlertTriangle, Users, UserPlus, Shield, X, Calendar, Check, Edit2, RotateCcw, FileText } from 'lucide-react';
import { AVAILABLE_TEACHERS } from '../constants';
import { useModal } from '../hooks/useModal';
import { ConfirmModal } from './ConfirmModal';
import { AlertModal } from './AlertModal';
import { CustomSelect } from './CustomSelect';

interface SchoolSettingsProps {
  settings: SchoolSettings;
  users: User[];
  schedule?: ScheduleItem[];
  currentUser: User | null;
  students?: Student[]; // Add students prop to extract class grades
  subjects?: Subject[]; // Subjects from database (passed from App.tsx)
  onSave: (settings: SchoolSettings) => void;
  onUpdateUsers: (users: User[]) => void;
  onUpdateSchedule?: (schedule: ScheduleItem[]) => void;
  onUpdateSubjects?: () => void; // Callback to reload subjects in App.tsx
  onReset?: () => void;
}

export const SchoolSettingsForm: React.FC<SchoolSettingsProps> = ({ settings, users, schedule = [], currentUser, students = [], subjects: propSubjects = [], onSave, onUpdateUsers, onUpdateSchedule, onUpdateSubjects, onReset }) => {
  const { confirm, alert, confirmModal, alertModal } = useModal();
  const [formData, setFormData] = useState<SchoolSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'academic' | 'reports'>('general');
  const [academicSubTab, setAcademicSubTab] = useState<'classes' | 'subjects' | 'setup'>('classes');
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  
  // Class Grades Management State
  const [classGrades, setClassGrades] = useState<string[]>(settings?.classGrades || []);
  const [newClassGrade, setNewClassGrade] = useState('');
  
  // Update classGrades when settings change
  useEffect(() => {
    if (settings?.classGrades) {
      setClassGrades(settings.classGrades);
    }
  }, [settings?.classGrades]);

  // Sync classGrades from settings when tab is opened (no auto-add from students)
  useEffect(() => {
    if ((activeTab === 'academic' && academicSubTab === 'classes') && settings?.classGrades && settings.classGrades.length > 0 && classGrades.length === 0) {
      // Sync from settings only
      setClassGrades(settings.classGrades);
    }
  }, [activeTab, academicSubTab, settings?.classGrades]); // Only sync from settings, no auto-add from students
  
  // Subjects Management State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState<Partial<Subject>>({ name: '', code: '', description: '' });
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  
  // Load subjects on mount and when tab changes
  // Also use propSubjects immediately if available
  useEffect(() => {
    if (activeTab === 'academic' && academicSubTab === 'subjects') {
      // If propSubjects are available, use them immediately, otherwise load
      if (propSubjects && propSubjects.length > 0) {
        setSubjects(propSubjects);
        setIsLoadingSubjects(false);
      } else {
        loadSubjects();
      }
    }
  }, [activeTab, academicSubTab, propSubjects]);

  // Use propSubjects if available, otherwise use local subjects state
  const availableSubjects = propSubjects.length > 0 ? propSubjects : subjects;
  
  const loadSubjects = async () => {
    setIsLoadingSubjects(true);
    try {
      const loadedSubjects = await api.getSubjects();
      setSubjects(loadedSubjects);
    } catch (error) {
      console.error('Failed to load subjects:', error);
      alert({ message: 'فشل في تحميل المواد الدراسية', type: 'error' });
    } finally {
      setIsLoadingSubjects(false);
    }
  };
  
  // User Management State
    const [newUser, setNewUser] = useState<Partial<User & { email?: string }>>({ role: 'teacher', name: '', username: '', password: '', email: '' });
  const [emailError, setEmailError] = useState<string>('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  
  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});

  // Schedule Management State
  const [newSession, setNewSession] = useState<Partial<ScheduleItem>>({ day: 'الأحد', period: 1, subject: '', classRoom: '', teacher: '' });
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [editingSession, setEditingSession] = useState<ScheduleItem | null>(null);

  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const periods = [1, 2, 3, 4, 5, 6, 7];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, classGrades });
    alert({ message: 'تم حفظ إعدادات المدرسة بنجاح', type: 'success' });
  };

  const handleSave = () => {
    onSave({ ...formData, classGrades });
    alert({ message: 'تم حفظ إعدادات التقارير بنجاح', type: 'success' });
  };

  const handleAddClassGrade = async () => {
    if (!newClassGrade.trim()) {
      alert({ message: 'الرجاء إدخال اسم الفصل', type: 'warning' });
      return;
    }
    if (classGrades.includes(newClassGrade.trim())) {
      alert({ message: 'هذا الفصل مسجل مسبقاً', type: 'warning' });
      return;
    }
    const updatedClassGrades = [...classGrades, newClassGrade.trim()];
    setClassGrades(updatedClassGrades);
    setNewClassGrade('');
    
    // Save immediately to database
    try {
      await onSave({ ...formData, classGrades: updatedClassGrades });
      alert({ message: 'تم إضافة الفصل وحفظه بنجاح', type: 'success' });
    } catch (error) {
      console.error('Error saving class grade:', error);
      alert({ message: 'تم إضافة الفصل محلياً، لكن فشل الحفظ. يرجى المحاولة مرة أخرى.', type: 'warning' });
    }
  };

  const handleDeleteClassGrade = async (grade: string) => {
    const shouldDelete = await confirm({
      title: 'حذف الفصل',
      message: `هل أنت متأكد من حذف الفصل "${grade}"؟\n\nسيتم حذف هذا الفصل من القائمة فقط، ولن يتم حذف بيانات الطلاب المرتبطة به.`,
      type: 'warning',
      confirmText: 'حذف',
      cancelText: 'إلغاء'
    });
    
    if (shouldDelete) {
      const updatedClassGrades = classGrades.filter(g => g !== grade);
      setClassGrades(updatedClassGrades);
      
      // Save immediately to database
      try {
        await onSave({ ...formData, classGrades: updatedClassGrades });
        alert({ message: 'تم حذف الفصل وحفظه بنجاح', type: 'success' });
      } catch (error) {
        console.error('Error saving class grade deletion:', error);
        alert({ message: 'تم حذف الفصل محلياً، لكن فشل الحفظ. يرجى المحاولة مرة أخرى.', type: 'warning' });
      }
    }
  };

  // Subjects Management Functions
  const handleAddSubject = async () => {
    if (!newSubject.name?.trim()) {
      alert({ message: 'الرجاء إدخال اسم المادة', type: 'warning' });
      return;
    }

    try {
      const addedSubject = await api.addSubject({
        name: newSubject.name.trim(),
        code: newSubject.code?.trim() || undefined,
        description: newSubject.description?.trim() || undefined
      });

      if (addedSubject) {
        // Reload subjects from database to ensure consistency
        await loadSubjects();
        // Notify parent to reload subjects
        if (onUpdateSubjects) {
          await onUpdateSubjects();
        }
        setNewSubject({ name: '', code: '', description: '' });
        alert({ message: 'تم إضافة المادة بنجاح', type: 'success' });
      }
    } catch (error: any) {
      console.error('Add subject error:', error);
      alert({ message: error?.message || 'فشل في إضافة المادة', type: 'error' });
    }
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setNewSubject({
      name: subject.name,
      code: subject.code || '',
      description: subject.description || ''
    });
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject || !newSubject.name?.trim()) {
      alert({ message: 'الرجاء إدخال اسم المادة', type: 'warning' });
      return;
    }

    try {
      const updatedSubject = await api.updateSubject(editingSubject.id, {
        name: newSubject.name.trim(),
        code: newSubject.code?.trim() || undefined,
        description: newSubject.description?.trim() || undefined
      });

      if (updatedSubject) {
        // Reload subjects from database to ensure consistency
        await loadSubjects();
        // Notify parent to reload subjects
        if (onUpdateSubjects) {
          await onUpdateSubjects();
        }
        setEditingSubject(null);
        setNewSubject({ name: '', code: '', description: '' });
        alert({ message: 'تم تحديث المادة بنجاح', type: 'success' });
      }
    } catch (error: any) {
      console.error('Update subject error:', error);
      alert({ message: error?.message || 'فشل في تحديث المادة', type: 'error' });
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    const shouldDelete = await confirm({
      title: 'حذف المادة',
      message: `هل أنت متأكد من حذف المادة "${subject?.name}"؟\n\nسيتم حذف هذه المادة من القائمة فقط، ولن يتم حذف الجداول الدراسية المرتبطة بها.`,
      type: 'warning',
      confirmText: 'حذف',
      cancelText: 'إلغاء'
    });

    if (shouldDelete) {
      try {
        const deleted = await api.deleteSubject(subjectId);
        if (deleted) {
          // Reload subjects from database to ensure consistency
          await loadSubjects();
          // Notify parent to reload subjects
          if (onUpdateSubjects) {
            await onUpdateSubjects();
          }
          alert({ message: 'تم حذف المادة بنجاح', type: 'success' });
        }
      } catch (error: any) {
        console.error('Delete subject error:', error);
        alert({ message: error?.message || 'فشل في حذف المادة', type: 'error' });
      }
    }
  };

  const handleAddUser = async () => {
      console.log('=== handleAddUser: Starting ===');
      console.log('=== handleAddUser: newUser data ===', {
          username: newUser.username,
          name: newUser.name,
          role: newUser.role,
          email: newUser.email,
          passwordLength: newUser.password?.length
      });

      if (!newUser.username || !newUser.password || !newUser.name || !newUser.role || !newUser.email) {
          console.warn('=== handleAddUser: Missing fields ===');
          alert({ message: 'الرجاء تعبئة جميع الحقول', type: 'warning' });
          return;
      }

      // Validate email before submission - use the same validation function as API
      const emailToValidate = (newUser.email || '').trim();
      console.log('=== handleAddUser: Email to validate ===', {
          original: newUser.email,
          trimmed: emailToValidate,
          length: emailToValidate.length
      });

      if (!emailToValidate) {
          console.warn('=== handleAddUser: Email is empty ===');
          setEmailError('البريد الإلكتروني مطلوب');
          alert({ message: 'الرجاء إدخال بريد إلكتروني صحيح', type: 'warning' });
          return;
      }

      // Use the same regex as validation.ts for consistency
      const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const regexTest = emailRegex.test(emailToValidate);
      console.log('=== handleAddUser: Regex test ===', {
          email: emailToValidate,
          regexTest: regexTest,
          match: emailToValidate.match(emailRegex)
      });

      if (!regexTest) {
          console.warn('=== handleAddUser: Email regex failed ===', emailToValidate);
          setEmailError('صيغة البريد الإلكتروني غير صحيحة');
          alert({ message: 'صيغة البريد الإلكتروني غير صحيحة. يرجى التحقق من الإدخال', type: 'warning' });
          return;
      }

      // Additional validation checks
      if (emailToValidate.length > 254) {
          console.warn('=== handleAddUser: Email too long ===', emailToValidate.length);
          setEmailError('البريد الإلكتروني طويل جداً');
          alert({ message: 'البريد الإلكتروني طويل جداً (الحد الأقصى 254 حرف)', type: 'warning' });
          return;
      }

      if (emailToValidate.startsWith('.') || emailToValidate.startsWith('@') || emailToValidate.endsWith('.')) {
          console.warn('=== handleAddUser: Email starts/ends with invalid char ===');
          setEmailError('صيغة البريد الإلكتروني غير صحيحة');
          alert({ message: 'صيغة البريد الإلكتروني غير صحيحة', type: 'warning' });
          return;
      }

      console.log('=== handleAddUser: All validations passed, calling api.signUp ===');
      setIsAddingUser(false);
      setEmailError('');
      try {
          console.log('=== handleAddUser: Calling api.signUp with ===', {
              email: emailToValidate,
              passwordLength: newUser.password?.length,
              username: newUser.username,
              name: newUser.name,
              role: newUser.role
          });
          
          const result = await api.signUp(
              emailToValidate, 
              newUser.password || '', 
              { 
                  username: newUser.username!, 
                  name: newUser.name!, 
                  role: newUser.role as Role, 
                  avatar: `https://ui-avatars.com/api/?name=${newUser.name}&background=random` 
              }
          );
          
          console.log('=== handleAddUser: Sign up result ===', result);
          
          if (result.error) {
              console.error('=== handleAddUser: Sign up error ===', result.error);
              // Check if error is about email
              const isEmailError = result.error.includes('البريد') || 
                                  result.error.includes('email') || 
                                  result.error.includes('Email') ||
                                  result.error.includes('إلكتروني') ||
                                  result.error.toLowerCase().includes('invalid email');
              
              if (isEmailError) {
                  // Extract the main error message (first line) for the input field
                  const firstLine = result.error.split('\n')[0];
                  setEmailError(firstLine);
                  // Show full error message in alert
                  alert({ 
                      message: result.error, 
                      type: 'error',
                      title: 'خطأ في البريد الإلكتروني'
                  });
              } else {
                  alert({ message: result.error, type: 'error' });
              }
              setIsAddingUser(true); // Re-open form on error
              return;
          }
          
          if (!result.user) {
              alert({ message: 'فشل في إنشاء حساب المستخدم', type: 'error' });
              setIsAddingUser(true);
              return;
          }
          
          // Add user to local state without calling updateUsers
          // The profile was already created by trigger, so we just add it to the list
          // Calling updateUsers would try to upsert all profiles, which may fail for new users
          onUpdateUsers([...users, result.user]);
          
          // Refresh users list from database to ensure consistency
          // This is safer than trying to update all profiles at once
          try {
              const allUsers = await api.getUsers();
              onUpdateUsers(allUsers);
          } catch (refreshError) {
              console.warn('Failed to refresh users list, using local state:', refreshError);
              // If refresh fails, still use the local state
          }
          
          setNewUser({ role: 'teacher', name: '', username: '', password: '', email: '' });
          setEmailError('');
          alert({ message: 'تم إضافة المستخدم بنجاح', type: 'success' });
      } catch (err: any) {
          console.error('Add user error', err);
          alert({ message: err?.message || 'حدث خطأ أثناء إنشاء المستخدم', type: 'error' });
          setIsAddingUser(true);
      }
  };

  const handleDeleteUser = async (id: string) => {
      const userToDelete = users.find(u => u.id === id);
      
      // Prevent deleting the current logged-in user
      if (userToDelete?.id === currentUser?.id) {
          alert({ 
              message: 'لا يمكنك حذف حسابك الخاص. يرجى استخدام حساب آخر لحذف هذا المستخدم.', 
              type: 'warning' 
          });
          return;
      }
      
      const shouldDelete = await confirm({
        title: 'حذف المستخدم',
        message: `هل أنت متأكد من حذف المستخدم "${userToDelete?.name || 'غير معروف'}"؟\n\nسيتم حذف المستخدم بشكل كامل من النظام ولا يمكن التراجع عن هذا الإجراء.`,
        type: 'danger',
        confirmText: 'حذف',
        cancelText: 'إلغاء'
      });
      
      if (shouldDelete) {
          try {
              console.log('handleDeleteUser: Deleting user:', id);
              
              // Delete from database first
              const deleted = await api.deleteUser(id);
              
              if (!deleted) {
                  throw new Error('فشل في حذف المستخدم من قاعدة البيانات');
              }
              
              console.log('handleDeleteUser: User deleted from database, updating local state');
              
              // Update local state by calling onUpdateUsers with filtered list
              // This will trigger api.updateUsers which will sync the database
              const updatedUsers = users.filter(u => u.id !== id);
              
              // Refresh users list from database to ensure consistency
              try {
                  const allUsers = await api.getUsers();
                  console.log('handleDeleteUser: Refreshed users from database:', allUsers.length);
                  await onUpdateUsers(allUsers);
              } catch (refreshError) {
                  console.warn('handleDeleteUser: Failed to refresh users, using local state:', refreshError);
                  // If refresh fails, still update local state
                  await onUpdateUsers(updatedUsers);
              }
              
              console.log('handleDeleteUser: User deleted successfully');
              alert({ message: 'تم حذف المستخدم بنجاح', type: 'success' });
          } catch (error: any) {
              console.error('handleDeleteUser: Delete user error:', error);
              alert({ 
                  message: error?.message || 'فشل في حذف المستخدم. يرجى المحاولة مرة أخرى.', 
                  type: 'error' 
              });
          }
      }
  };

  const handleEditUser = (user: User) => {
      setEditingUser(user);
      setEditFormData({
          name: user.name,
          username: user.username,
          role: user.role,
          avatar: user.avatar,
          email: user.email
      });
  };

    const handleSaveEdit = async () => {
        if (!editingUser) return;
        
        // Show confirmation dialog
        const confirmMessage = `هل أنت متأكد من تحديث بيانات ${editingUser.name}؟\n\nالاسم: ${editFormData.name || editingUser.name}\nاسم المستخدم: ${editFormData.username || editingUser.username}\nالصلاحية: ${editFormData.role === 'admin' ? 'مدير' : editFormData.role === 'counselor' ? 'موجه' : 'معلم'}`;
        
        const shouldUpdate = await confirm({
          title: 'تحديث بيانات المستخدم',
          message: confirmMessage,
          type: 'warning',
          confirmText: 'تحديث',
          cancelText: 'إلغاء'
        });
        
        if (!shouldUpdate) {
            return;
        }
        
        try {
            const updated = await api.updateUserProfile(editingUser.id, {
                name: editFormData.name,
                username: editFormData.username,
                role: editFormData.role,
                avatar: editFormData.avatar,
                email: editFormData.email
            });
            
            if (updated) {
                const updatedUsers = users.map(u => u.id === editingUser.id ? updated : u);
                onUpdateUsers(updatedUsers);
                setEditingUser(null);
                setEditFormData({});
                
                // Show success message
                const successMsg = document.createElement('div');
                successMsg.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
                successMsg.innerHTML = '<span>✓</span> <span>تم تحديث بيانات المستخدم بنجاح</span>';
                document.body.appendChild(successMsg);
                setTimeout(() => {
                    successMsg.remove();
                }, 3000);
            } else {
                const errorMsg = document.createElement('div');
                errorMsg.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
                errorMsg.innerHTML = '<span>✗</span> <span>فشل في تحديث بيانات المستخدم. يرجى التحقق من الصلاحيات</span>';
                document.body.appendChild(errorMsg);
                setTimeout(() => {
                    errorMsg.remove();
                }, 4000);
            }
        } catch (err: any) {
            console.error('Edit user error', err);
            const errorMsg = document.createElement('div');
            errorMsg.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
            errorMsg.innerHTML = `<span>✗</span> <span>${err?.message || 'حدث خطأ أثناء تحديث بيانات المستخدم'}</span>`;
            document.body.appendChild(errorMsg);
            setTimeout(() => {
                errorMsg.remove();
            }, 4000);
        }
    };


  const handleEditSession = (session: ScheduleItem) => {
      setEditingSession(session);
      setNewSession({
          day: session.day,
          period: session.period,
          subject: session.subject,
          classRoom: session.classRoom,
          teacher: session.teacher
      });
      setIsAddingSession(true);
  };

  const handleCancelEdit = () => {
      setEditingSession(null);
      setNewSession({ day: 'الأحد', period: 1, subject: '', classRoom: '', teacher: '' });
      setIsAddingSession(false);
  };

  const handleAddSession = async () => {
      // التحقق من البيانات المطلوبة
      if (!newSession.day || !newSession.period || !newSession.subject || !newSession.classRoom || !newSession.teacher) {
          alert({ message: 'الرجاء تعبئة جميع بيانات الحصة المطلوبة', type: 'warning' });
          return;
      }

      // التحقق من وجود العام الدراسي
      if (!formData.academicYear || formData.academicYear.trim() === '') {
          alert({ message: 'الرجاء تحديد العام الدراسي في الإعدادات العامة أولاً', type: 'warning' });
          return;
      }

      if (!onUpdateSchedule) {
          alert({ message: 'خطأ في النظام: لا يمكن حفظ الحصة', type: 'error' });
          return;
      }

      try {
          // Trim and normalize teacher name to ensure consistency
          const normalizedTeacher = (newSession.teacher || '').trim().replace(/\s+/g, ' ');
          const normalizedClassRoom = (newSession.classRoom || '').trim();
          const academicYear = formData.academicYear.trim();
          
          let updatedSchedule: ScheduleItem[];
          
          if (editingSession) {
              // Update existing session - التحقق من التعارضات (استثناء الحصة الحالية)
              const otherSessions = schedule.filter(s => s.id !== editingSession.id);
              
              // التحقق من تعارض المعلم
              const teacherConflict = otherSessions.find(s => 
                  s.day === newSession.day && 
                  s.period === newSession.period && 
                  (s.teacher === normalizedTeacher || s.originalTeacher === normalizedTeacher) &&
                  (s.academicYear === academicYear || !s.academicYear)
              );
              
              if (teacherConflict) {
                  alert({ 
                      message: `لا يمكن تحديث الحصة: المعلم "${normalizedTeacher}" لديه حصة أخرى في ${teacherConflict.day} - الحصة ${teacherConflict.period} (${teacherConflict.subject} - ${teacherConflict.classRoom})`, 
                      type: 'error' 
                  });
                  return;
              }
              
              // التحقق من تعارض الفصل
              const classConflict = otherSessions.find(s => 
                  s.day === newSession.day && 
                  s.period === newSession.period && 
                  s.classRoom === normalizedClassRoom &&
                  (s.academicYear === academicYear || !s.academicYear)
              );
              
              if (classConflict) {
                  alert({ 
                      message: `لا يمكن تحديث الحصة: الفصل "${normalizedClassRoom}" لديه حصة أخرى في ${classConflict.day} - الحصة ${classConflict.period} (${classConflict.subject} - معلم: ${classConflict.teacher || classConflict.originalTeacher})`, 
                      type: 'error' 
                  });
                  return;
              }

              // Update existing session
              updatedSchedule = schedule.map(s => 
                  s.id === editingSession.id 
                      ? {
                          ...s,
                          day: newSession.day!,
                          period: newSession.period!,
                          subject: newSession.subject!.trim(),
                          classRoom: normalizedClassRoom,
                          teacher: normalizedTeacher,
                          academicYear: academicYear
                      }
                      : s
              );
              console.log('handleAddSession: Updating session, schedule length:', updatedSchedule.length);
          } else {
              // Add new session - التحقق من التعارضات
              // التحقق من تعارض المعلم
              const teacherConflict = schedule.find(s => 
                  s.day === newSession.day && 
                  s.period === newSession.period && 
                  (s.teacher === normalizedTeacher || s.originalTeacher === normalizedTeacher) &&
                  (s.academicYear === academicYear || !s.academicYear)
              );
              
              if (teacherConflict) {
                  alert({ 
                      message: `لا يمكن إضافة الحصة: المعلم "${normalizedTeacher}" لديه حصة أخرى في ${teacherConflict.day} - الحصة ${teacherConflict.period} (${teacherConflict.subject} - ${teacherConflict.classRoom})`, 
                      type: 'error' 
                  });
                  return;
              }
              
              // التحقق من تعارض الفصل
              const classConflict = schedule.find(s => 
                  s.day === newSession.day && 
                  s.period === newSession.period && 
                  s.classRoom === normalizedClassRoom &&
                  (s.academicYear === academicYear || !s.academicYear)
              );
              
              if (classConflict) {
                  alert({ 
                      message: `لا يمكن إضافة الحصة: الفصل "${normalizedClassRoom}" لديه حصة أخرى في ${classConflict.day} - الحصة ${classConflict.period} (${classConflict.subject} - معلم: ${classConflict.teacher || classConflict.originalTeacher})`, 
                      type: 'error' 
                  });
                  return;
              }

              // Add new session
              const sessionToAdd: ScheduleItem = {
                  id: Date.now().toString(),
                  day: newSession.day,
                  period: newSession.period,
                  subject: newSession.subject.trim(),
                  classRoom: normalizedClassRoom,
                  teacher: normalizedTeacher,
                  academicYear: academicYear
              };
              updatedSchedule = [...schedule, sessionToAdd];
              console.log('handleAddSession: Adding session, new schedule length:', updatedSchedule.length);
          }
          
          await onUpdateSchedule(updatedSchedule);
          setNewSession({ day: 'الأحد', period: 1, subject: '', classRoom: '', teacher: '' });
          setEditingSession(null);
          setIsAddingSession(false);
          alert({ message: editingSession ? 'تم تحديث الحصة بنجاح' : 'تم إضافة الحصة بنجاح', type: 'success' });
      } catch (error) {
          console.error('handleAddSession: Error saving session:', error);
          alert({ message: editingSession ? 'فشل في تحديث الحصة. يرجى المحاولة مرة أخرى.' : 'فشل في إضافة الحصة. يرجى المحاولة مرة أخرى.', type: 'error' });
      }
  };

  const handleDeleteSession = async (id: string) => {
      const shouldDelete = await confirm({
        title: 'حذف الحصة',
        message: 'هل أنت متأكد من حذف هذه الحصة من الجدول؟',
        type: 'warning',
        confirmText: 'حذف',
        cancelText: 'إلغاء'
      });
      
      if (shouldDelete && onUpdateSchedule) {
          try {
              const updatedSchedule = schedule.filter(s => s.id !== id);
              console.log('handleDeleteSession: Deleting session, new schedule length:', updatedSchedule.length);
              await onUpdateSchedule(updatedSchedule);
              // Success message is shown in onUpdateSchedule
          } catch (error) {
              console.error('handleDeleteSession: Error deleting session:', error);
              alert({ message: 'فشل في حذف الحصة. يرجى المحاولة مرة أخرى.', type: 'error' });
          }
      }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Combine teachers from available constant + current users who are teachers
  const allTeachers = Array.from(new Set([
      ...AVAILABLE_TEACHERS,
      ...users.filter(u => u.role === 'teacher').map(u => u.name)
  ]));

  return (
    <div className="max-w-4xl mx-auto px-2 md:px-4">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl overflow-hidden shadow-sm">
        <div className="flex flex-wrap gap-2 md:gap-3 border-b border-gray-200 pb-2">
          <button onClick={() => setActiveTab('general')} className={`px-3 md:px-4 py-2 md:py-2.5 font-bold text-xs md:text-sm transition-colors rounded-t-lg ${activeTab === 'general' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:bg-gray-50'}`}>إعدادات المدرسة</button>
          <button onClick={() => setActiveTab('users')} className={`px-3 md:px-4 py-2 md:py-2.5 font-bold text-xs md:text-sm transition-colors rounded-t-lg ${activeTab === 'users' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:bg-gray-50'}`}>إدارة المستخدمين والصلاحيات</button>
          <div className="w-full md:w-px h-px md:h-6 bg-gray-300 my-1 md:my-0"></div>
          <button onClick={() => { setActiveTab('academic'); setAcademicSubTab('classes'); }} className={`px-3 md:px-4 py-2 md:py-2.5 font-bold text-xs md:text-sm transition-colors rounded-t-lg ${activeTab === 'academic' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:bg-gray-50'}`}>التعريفات الأكاديمية</button>
          <div className="w-full md:w-px h-px md:h-6 bg-gray-300 my-1 md:my-0"></div>
          <button onClick={() => setActiveTab('reports')} className={`px-3 md:px-4 py-2 md:py-2.5 font-bold text-xs md:text-sm transition-colors rounded-t-lg ${activeTab === 'reports' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:bg-gray-50'}`}>إعدادات التقارير</button>
        </div>
      </div>

      {/* Academic Sub-Tabs */}
      {activeTab === 'academic' && (
        <div className="flex border-b border-gray-200 mb-4 bg-white rounded-t-xl overflow-hidden shadow-sm">
          <div className="flex flex-wrap gap-2 md:gap-3 border-b border-gray-200 pb-2">
            <button onClick={() => setAcademicSubTab('classes')} className={`px-3 md:px-4 py-2 md:py-2.5 font-bold text-xs md:text-sm transition-colors rounded-t-lg ${academicSubTab === 'classes' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>تعريف الفصول</button>
            <button onClick={() => setAcademicSubTab('subjects')} className={`px-3 md:px-4 py-2 md:py-2.5 font-bold text-xs md:text-sm transition-colors rounded-t-lg ${academicSubTab === 'subjects' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>تعريف المواد الدراسية</button>
            <button onClick={() => setAcademicSubTab('setup')} className={`px-3 md:px-4 py-2 md:py-2.5 font-bold text-xs md:text-sm transition-colors rounded-t-lg ${academicSubTab === 'setup' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>إعداد الجدول الدراسي</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        
        {activeTab === 'general' && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              إعدادات المدرسة
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المدرسة *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border"
                  placeholder="مثال: مدرسة الابتدائية الأولى"
                />
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العام الدراسي *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 1445-1446"
                    value={formData.academicYear || ''}
                    onChange={e => setFormData({...formData, academicYear: e.target.value})}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border"
                  />
                  <p className="text-xs text-gray-500 mt-1">يستخدم لتحديد العام الدراسي للحصص والجداول</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم مدير المدرسة</label>
                <input
                  type="text"
                  value={formData.principalName || ''}
                  onChange={e => setFormData({...formData, principalName: e.target.value})}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border"
                  placeholder="مثال: أ. محمد بن أحمد العلي"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم المدرسة</label>
                <div className="relative">
                    <Phone size={16} className="absolute top-3 right-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="966500000000"
                      value={formData.whatsappPhone || ''}
                      onChange={e => setFormData({...formData, whatsappPhone: e.target.value})}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 pr-10 border"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-1">يستخدم هذا الرقم في تذييل التقارير كمرجع لولي الأمر</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">شعار المدرسة</label>
                <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="relative w-20 h-20 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                      {formData.logoUrl ? (
                          <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                          <ImageIcon className="text-gray-300" size={32} />
                      )}
                  </div>
                  <div className="flex-1">
                      <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2 shadow-sm transition-colors text-sm font-bold mb-2">
                        <Upload size={16} />
                        رفع صورة الشعار
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-400">يفضل استخدام صورة مربعة بخلفية شفافة (PNG, JPG)</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ختم المدرسة</label>
                <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="relative w-20 h-20 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                      {formData.stampUrl ? (
                          <img src={formData.stampUrl} alt="Stamp" className="w-full h-full object-contain" />
                      ) : (
                          <ImageIcon className="text-gray-300" size={32} />
                      )}
                  </div>
                  <div className="flex-1">
                      <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2 shadow-sm transition-colors text-sm font-bold mb-2">
                        <Upload size={16} />
                        رفع صورة الختم
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setFormData({ ...formData, stampUrl: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-400">يرفع ختم المدرسة كصورة (PNG, JPG)</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-4">
                <button
                  type="submit"
                  className="w-full flex justify-center items-center gap-2 bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition-colors font-bold shadow-md"
                >
                  <Save size={20} />
                  حفظ إعدادات المدرسة
                </button>

                {onReset && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="w-full flex justify-center items-center gap-2 bg-red-50 text-red-600 py-3 rounded-lg hover:bg-red-100 transition-colors font-bold shadow-sm border border-red-100"
                    >
                        <Trash2 size={20} />
                        حذف كافة البيانات (إعادة ضبط المصنع)
                    </button>
                )}
              </div>
            </form>
          </>
        )}

        {activeTab === 'users' && (
           <div className="space-y-6 animate-in fade-in">
               <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                   <div>
                       <h3 className="font-bold text-gray-800">قائمة المستخدمين</h3>
                       <p className="text-xs text-gray-500">إدارة حسابات المعلمين والإداريين</p>
                   </div>
                   <div className="flex items-center gap-2">
                       <button 
                        onClick={() => setShowPasswordResetModal(true)}
                        className="bg-orange-600 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold hover:bg-orange-700 flex items-center gap-1.5 md:gap-2 shadow-sm"
                        title="استعادة كلمة المرور"
                       >
                           <RotateCcw size={14} className="md:w-4 md:h-4 flex-shrink-0" />
                           <span className="hidden sm:inline">استعادة كلمة المرور</span>
                           <span className="sm:hidden">استعادة</span>
                       </button>
                       <button 
                        onClick={() => setIsAddingUser(!isAddingUser)}
                        className="bg-teal-600 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold hover:bg-teal-700 flex items-center gap-1.5 md:gap-2 shadow-sm"
                       >
                           <UserPlus size={14} className="md:w-4 md:h-4 flex-shrink-0" />
                           <span className="hidden sm:inline">إضافة مستخدم جديد</span>
                           <span className="sm:hidden">إضافة</span>
                       </button>
                   </div>
               </div>

               {isAddingUser && (
                   <div className="bg-white border-2 border-teal-100 p-6 rounded-xl shadow-sm space-y-4">
                       <h4 className="font-bold text-teal-800">بيانات المستخدم الجديد</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                               <label className="block text-xs font-bold text-gray-500 mb-1">الاسم الكامل</label>
                               <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="مثال: أ. محمد العلي" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 mb-1">اسم المستخدم (للدخول)</label>
                               <input type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="username" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 mb-1">البريد الإلكتروني *</label>
                               <input 
                                   type="email" 
                                   value={newUser.email || ''} 
                                   onChange={e => {
                                       const emailValue = e.target.value; // Don't trim on input, allow user to type
                                       setNewUser({...newUser, email: emailValue});
                                       
                                       // Real-time validation
                                       const trimmedValue = emailValue.trim();
                                       if (!trimmedValue) {
                                           setEmailError('البريد الإلكتروني مطلوب');
                                       } else {
                                           // Use the same regex as validation.ts
                                           const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                                           if (!emailRegex.test(trimmedValue)) {
                                               setEmailError('صيغة البريد الإلكتروني غير صحيحة');
                                           } else {
                                               setEmailError('');
                                           }
                                       }
                                   }}
                                   onBlur={e => {
                                       // Trim on blur
                                       const trimmedValue = e.target.value.trim();
                                       if (trimmedValue !== e.target.value) {
                                           setNewUser({...newUser, email: trimmedValue});
                                       }
                                   }}
                                   className={`w-full border rounded p-2 text-sm ${emailError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-teal-500 focus:ring-teal-500'}`} 
                                   placeholder="user@example.com" 
                               />
                               {emailError && (
                                   <p className="text-xs text-red-600 mt-1">{emailError}</p>
                               )}
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 mb-1">كلمة المرور</label>
                               <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="******" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 mb-1">الدور / الصلاحية</label>
                               <CustomSelect
                                 value={newUser.role || 'teacher'}
                                 onChange={(value) => setNewUser({...newUser, role: value as Role})}
                                 options={[
                                   { value: 'teacher', label: 'معلم' },
                                   { value: 'counselor', label: 'موجه طلابي' },
                                   { value: 'admin', label: 'مدير / إداري' }
                                 ]}
                                 className="w-full"
                               />
                           </div>
                       </div>
                       <div className="flex justify-end gap-2 pt-2">
                           <button onClick={() => setIsAddingUser(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded">إلغاء</button>
                           <button onClick={handleAddUser} className="px-4 py-2 text-sm bg-teal-600 text-white rounded font-bold hover:bg-teal-700">حفظ المستخدم</button>
                       </div>
                   </div>
               )}

               {/* Edit User Modal */}
               {editingUser && (
                   <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                       <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                           <div className="flex justify-between items-center border-b pb-3">
                               <h3 className="text-xl font-bold text-gray-800">تعديل بيانات المستخدم</h3>
                               <button onClick={() => { setEditingUser(null); setEditFormData({}); }} className="text-gray-400 hover:text-gray-600">
                                   <X size={20} />
                               </button>
                           </div>
                           
                           <div className="space-y-4">
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 mb-1">الاسم الكامل</label>
                                   <input 
                                       type="text" 
                                       value={editFormData.name || ''} 
                                       onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
                                       className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                                       placeholder="مثال: أ. محمد العلي" 
                                   />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 mb-1">اسم المستخدم</label>
                                   <input 
                                       type="text" 
                                       value={editFormData.username || ''} 
                                       onChange={e => setEditFormData({...editFormData, username: e.target.value})} 
                                       className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono" 
                                       placeholder="username" 
                                   />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 mb-1">البريد الإلكتروني</label>
                                   <input 
                                       type="email" 
                                       value={editFormData.email || ''} 
                                       onChange={e => setEditFormData({...editFormData, email: e.target.value})} 
                                       className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                                       placeholder="user@example.com" 
                                   />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 mb-1">الدور / الصلاحية</label>
                                   <CustomSelect
                                     value={editFormData.role || 'teacher'}
                                     onChange={(value) => setEditFormData({...editFormData, role: value as Role})}
                                     options={[
                                       { value: 'teacher', label: 'معلم' },
                                       { value: 'counselor', label: 'موجه طلابي' },
                                       { value: 'admin', label: 'مدير / إداري' }
                                     ]}
                                     className="w-full"
                                   />
                               </div>
                           </div>
                           
                           <div className="flex justify-end gap-2 pt-4 border-t">
                               <button 
                                   onClick={() => { setEditingUser(null); setEditFormData({}); }} 
                                   className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg font-bold"
                               >
                                   إلغاء
                               </button>
                               <button 
                                   onClick={handleSaveEdit} 
                                   className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 flex items-center gap-2"
                               >
                                   <Save size={16} />
                                   حفظ التعديلات
                               </button>
                           </div>
                       </div>
                   </div>
               )}

               {/* Desktop Table */}
               <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200">
                   <table className="w-full text-right text-sm">
                       <thead className="bg-gray-50 text-gray-500 font-bold">
                           <tr>
                               <th className="p-4">الاسم</th>
                               <th className="p-4">اسم المستخدم</th>
                               <th className="p-4">البريد الإلكتروني</th>
                               <th className="p-4">الصلاحية</th>
                               <th className="p-4">إجراءات</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                           {users.map(user => (
                               <tr key={user.id} className="hover:bg-gray-50">
                                   <td className="p-3 md:p-4 flex items-center gap-2 md:gap-3">
                                       <img src={user.avatar} className="w-7 h-7 md:w-8 md:h-8 rounded-full flex-shrink-0" alt="" />
                                       <span className="font-bold text-gray-800 text-sm md:text-base">{user.name}</span>
                                   </td>
                                   <td className="p-3 md:p-4 font-mono text-gray-600 text-xs md:text-sm">{user.username}</td>
                                   <td className="p-3 md:p-4">
                                       <span className="text-gray-600 text-xs md:text-sm break-all">{user.email || 'غير متوفر'}</span>
                                   </td>
                                   <td className="p-3 md:p-4">
                                       <span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-bold ${
                                           user.role === 'admin' ? 'bg-red-100 text-red-700' :
                                           user.role === 'counselor' ? 'bg-purple-100 text-purple-700' :
                                           'bg-blue-100 text-blue-700'
                                       }`}>
                                           {user.role === 'admin' ? 'مدير' : user.role === 'counselor' ? 'موجه' : 'معلم'}
                                       </span>
                                   </td>
                                   <td className="p-3 md:p-4">
                                       <div className="flex items-center gap-1.5 md:gap-2">
                                           <button 
                                               onClick={() => handleEditUser(user)} 
                                               className="text-teal-600 hover:text-teal-700 bg-teal-50 p-1.5 md:p-2 rounded-full transition-colors flex-shrink-0"
                                               title="تعديل"
                                           >
                                               <Edit2 size={14} className="md:w-4 md:h-4" />
                                           </button>
                                           <button 
                                               onClick={() => handleDeleteUser(user.id)} 
                                               className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 md:p-2 rounded-full transition-colors flex-shrink-0"
                                               title="حذف"
                                           >
                                               <Trash2 size={14} className="md:w-4 md:h-4" />
                                           </button>
                                       </div>
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>

               {/* Mobile Cards */}
               <div className="md:hidden space-y-3">
                   {users.map(user => (
                       <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                           <div className="flex items-center justify-between mb-3">
                               <div className="flex items-center gap-3">
                                   <img src={user.avatar} className="w-10 h-10 rounded-full" alt="" />
                                   <div>
                                       <p className="font-bold text-gray-800">{user.name}</p>
                                       <p className="text-xs text-gray-500 font-mono">{user.username}</p>
                                       <p className="text-xs text-gray-400 break-all">{user.email || 'غير متوفر'}</p>
                                   </div>
                               </div>
                               <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                   user.role === 'admin' ? 'bg-red-100 text-red-700' :
                                   user.role === 'counselor' ? 'bg-purple-100 text-purple-700' :
                                   'bg-blue-100 text-blue-700'
                               }`}>
                                   {user.role === 'admin' ? 'مدير' : user.role === 'counselor' ? 'موجه' : 'معلم'}
                               </span>
                           </div>
                           <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                               <button 
                                   onClick={() => handleEditUser(user)} 
                                   className="flex-1 flex items-center justify-center gap-2 text-teal-600 hover:text-teal-700 bg-teal-50 py-2 rounded-lg transition-colors text-sm font-bold"
                               >
                                   <Edit2 size={16} />
                                   تعديل
                               </button>
                               <button 
                                   onClick={() => handleDeleteUser(user.id)} 
                                   className="flex-1 flex items-center justify-center gap-2 text-red-500 hover:text-red-700 bg-red-50 py-2 rounded-lg transition-colors text-sm font-bold"
                               >
                                   <Trash2 size={16} />
                                   حذف
                               </button>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
        )}


        {activeTab === 'academic' && academicSubTab === 'classes' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div>
                <h3 className="font-bold text-gray-800">تعريف الفصول الدراسية</h3>
                <p className="text-xs text-gray-500">إضافة وإدارة قائمة الفصول التي ستظهر في جميع النماذج</p>
              </div>
            </div>

            <div className="bg-white border-2 border-teal-100 p-6 rounded-xl shadow-sm space-y-4">
              <h4 className="font-bold text-teal-800 flex items-center gap-2">
                <BookOpen size={18}/>
                إضافة فصل جديد
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newClassGrade}
                  onChange={e => setNewClassGrade(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddClassGrade()}
                  className="flex-1 border rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="مثال: الرابع الابتدائي"
                />
                <button
                  onClick={handleAddClassGrade}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 flex items-center gap-2"
                >
                  <Plus size={16} />
                  إضافة
                </button>
              </div>
            </div>

            {/* Class Grades List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {classGrades.length > 0 ? (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-sm font-bold text-gray-700">الفصل</th>
                          <th className="px-6 py-4 text-sm font-bold text-gray-700">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {classGrades.sort().map((grade, index) => (
                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-800">{grade}</td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleDeleteClassGrade(grade)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                                <span>حذف</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden divide-y divide-gray-100">
                    {classGrades.sort().map((grade, index) => (
                      <div key={index} className="p-4">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-800">{grade}</span>
                          <button
                            onClick={() => handleDeleteClassGrade(grade)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-gray-400">
                  <BookOpen size={48} className="mx-auto mb-2 opacity-20" />
                  <p>لم يتم إضافة أي فصول حتى الآن</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-2">
                <strong>ملاحظة:</strong> الفصول المعرفة هنا ستظهر في قوائم الاختيار عند إضافة أو تعديل بيانات الطلاب، مما يضمن اتساق البيانات في النظام.
              </p>
              <p className="text-xs text-blue-700">
                <strong>مهم:</strong> يتم حفظ التغييرات تلقائياً عند إضافة أو حذف فصل.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'academic' && academicSubTab === 'subjects' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div>
                <h3 className="font-bold text-gray-800">تعريف المواد الدراسية</h3>
                <p className="text-xs text-gray-500">إضافة وإدارة قائمة المواد الدراسية التي ستظهر في جميع النماذج</p>
              </div>
            </div>

            {/* Add Subject Form */}
            <div className="bg-white border-2 border-teal-100 p-6 rounded-xl shadow-sm space-y-4">
              <h4 className="font-bold text-teal-800 flex items-center gap-2">
                <BookOpen size={18}/>
                {editingSubject ? 'تعديل المادة' : 'إضافة مادة جديدة'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">اسم المادة *</label>
                  <input
                    type="text"
                    value={newSubject.name || ''}
                    onChange={e => setNewSubject({...newSubject, name: e.target.value})}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="مثال: الرياضيات"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">رمز المادة (اختياري)</label>
                  <input
                    type="text"
                    value={newSubject.code || ''}
                    onChange={e => setNewSubject({...newSubject, code: e.target.value})}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="مثال: MATH"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1">الوصف (اختياري)</label>
                  <textarea
                    value={newSubject.description || ''}
                    onChange={e => setNewSubject({...newSubject, description: e.target.value})}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="وصف المادة..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {editingSubject && (
                  <button
                    onClick={() => {
                      setEditingSubject(null);
                      setNewSubject({ name: '', code: '', description: '' });
                    }}
                    className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
                  >
                    إلغاء
                  </button>
                )}
                <button
                  onClick={editingSubject ? handleUpdateSubject : handleAddSubject}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 flex items-center gap-2"
                >
                  <Plus size={16} />
                  {editingSubject ? 'حفظ التعديلات' : 'إضافة'}
                </button>
              </div>
            </div>

            {/* Subjects List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {isLoadingSubjects ? (
                <div className="p-12 text-center text-gray-400">
                  <p>جاري التحميل...</p>
                </div>
              ) : (subjects.length > 0 || (propSubjects && propSubjects.length > 0)) ? (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-sm font-bold text-gray-700">اسم المادة</th>
                          <th className="px-6 py-4 text-sm font-bold text-gray-700">الرمز</th>
                          <th className="px-6 py-4 text-sm font-bold text-gray-700">الوصف</th>
                          <th className="px-6 py-4 text-sm font-bold text-gray-700">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(subjects.length > 0 ? subjects : propSubjects || []).map((subject) => (
                          <tr key={subject.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-800">{subject.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{subject.code || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{subject.description || '-'}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditSubject(subject)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                                >
                                  <Edit2 size={14} />
                                  <span>تعديل</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteSubject(subject.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                >
                                  <Trash2 size={14} />
                                  <span>حذف</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden divide-y divide-gray-100">
                    {(subjects.length > 0 ? subjects : propSubjects || []).map((subject) => (
                      <div key={subject.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-gray-800">{subject.name}</h3>
                            {subject.code && <p className="text-xs text-gray-500 mt-0.5">الرمز: {subject.code}</p>}
                            {subject.description && <p className="text-xs text-gray-600 mt-1">{subject.description}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditSubject(subject)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                          >
                            <Edit2 size={12} />
                            <span>تعديل</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSubject(subject.id)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 size={12} />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-gray-400">
                  <BookOpen size={48} className="mx-auto mb-2 opacity-20" />
                  <p>لم يتم إضافة أي مواد حتى الآن</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>ملاحظة:</strong> المواد المعرفة هنا ستظهر في قوائم الاختيار عند إضافة أو تعديل الجداول الدراسية، مما يضمن اتساق البيانات في النظام.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white border-2 border-teal-100 p-6 rounded-xl shadow-sm">
              <h3 className="font-bold text-teal-800 mb-4 flex items-center gap-2">
                <FileText size={20} />
                إعدادات التقارير وتصميماتها
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                قم بتخصيص تصميمات التقارير وإعداداتها لتتناسب مع احتياجات المدرسة
              </p>

              <div className="space-y-6">
                {/* Header Section */}
                <div className="border-b border-gray-200 pb-6">
                  <h4 className="font-bold text-gray-800 mb-4">إعدادات الترويسة</h4>
                  
                  {/* Header Preview */}
                  <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-500 mb-3">معاينة الترويسة (كما ستظهر في التقرير):</h3>
                    <div className="bg-white border border-gray-300 p-4 rounded flex justify-between items-center text-center">
                      <div className="text-right w-1/3 space-y-1">
                         <p className="font-bold text-gray-800 text-sm">المملكة العربية السعودية</p>
                         <p className="font-bold text-gray-800 text-sm">{formData.ministry}</p>
                         <p className="font-bold text-gray-800 text-sm">{formData.region}</p>
                         <p className="font-bold text-gray-800 text-sm">{formData.name}</p>
                      </div>
                      <div className="w-1/3 flex justify-center">
                         {formData.logoUrl ? (
                             <img src={formData.logoUrl} alt="Logo" className="h-20 w-20 object-contain" />
                         ) : (
                             <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center">
                                 <ImageIcon className="text-gray-400" />
                             </div>
                         )}
                      </div>
                      <div className="w-1/3 text-left">
                         <p className="text-gray-500 text-xs">التاريخ: 1445/XX/XX</p>
                         <p className="text-teal-600 font-bold text-xs mt-2">{formData.slogan}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">السطر الثاني (الوزارة)</label>
                      <input
                        type="text"
                        value={formData.ministry}
                        onChange={e => setFormData({...formData, ministry: e.target.value})}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">السطر الثالث (الإدارة التعليمية)</label>
                      <input
                        type="text"
                        value={formData.region}
                        onChange={e => setFormData({...formData, region: e.target.value})}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border"
                      />
                    </div>
                  </div>



                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">الشعار</label>
                    <input
                      type="text"
                      value={formData.slogan}
                      onChange={e => setFormData({...formData, slogan: e.target.value})}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border"
                      placeholder="مثال: نحو تعليم متميز"
                    />
                  </div>
                </div>

                {/* Report General Message */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    رسالة عامة في التقارير
                  </label>
                  <textarea
                    value={formData.reportGeneralMessage || ''}
                    onChange={(e) => setFormData({...formData, reportGeneralMessage: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-h-[100px]"
                    placeholder="اكتب رسالة عامة تظهر في جميع تقارير الطلاب..."
                  />
                  <p className="text-xs text-gray-500 mt-1">هذه الرسالة ستظهر في جميع تقارير الطلاب</p>
                </div>

                {/* Report Link */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    رابط خارجي (يتحول لباركود)
                  </label>
                  <input
                    type="url"
                    value={formData.reportLink || ''}
                    onChange={(e) => setFormData({...formData, reportLink: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="https://example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">سيتم تحويل هذا الرابط إلى باركود في التقرير</p>
                </div>

                {/* Report Design Settings */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-bold text-gray-800 mb-4">إعدادات التصميم</h4>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>تنسيق التقرير:</strong> يتم عرض التقرير بتنسيق PDF احترافي يتضمن:
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mr-4">
                        <li>معلومات المدرسة والترويسة</li>
                        <li>بيانات الطالب الأساسية</li>
                        <li>سجل الحضور والغياب</li>
                        <li>تقييمات المشاركة والواجبات والسلوك</li>
                        <li>ملاحظات المعلم</li>
                        <li>الرسالة العامة والرابط (إن وجد)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSave}
                    className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2 font-bold shadow-sm"
                  >
                    <Save size={18} />
                    حفظ إعدادات التقارير
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'academic' && academicSubTab === 'setup' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                 <div>
                     <h3 className="font-bold text-gray-800">الجدول المدرسي العام</h3>
                     <p className="text-xs text-gray-500">إضافة وتعديل الحصص للمعلمين</p>
                 </div>
                 <button 
                  onClick={() => {
                      if (isAddingSession && editingSession) {
                          handleCancelEdit();
                      } else {
                          setIsAddingSession(!isAddingSession);
                          setEditingSession(null);
                          setNewSession({ day: 'الأحد', period: 1, subject: '', classRoom: '', teacher: '' });
                      }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                 >
                     <Plus size={16} />
                     {isAddingSession && !editingSession ? 'إلغاء' : 'إضافة حصة جديدة'}
                 </button>
             </div>

             {isAddingSession && (
                 <div className="bg-white border-2 border-blue-100 p-6 rounded-xl shadow-sm space-y-4">
                     <h4 className="font-bold text-blue-800 flex items-center gap-2">
                        <BookOpen size={18}/>
                        {editingSession ? 'تعديل الحصة الدراسية' : 'تفاصيل الحصة الدراسية'}
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">اليوم</label>
                             <CustomSelect
                               value={newSession.day || 'الأحد'}
                               onChange={(value) => setNewSession({...newSession, day: value})}
                               options={days.map(d => ({ value: d, label: d }))}
                               className="w-full"
                             />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">رقم الحصة</label>
                             <CustomSelect
                               value={String(newSession.period || 1)}
                               onChange={(value) => setNewSession({...newSession, period: parseInt(value)})}
                               options={periods.map(p => ({ value: String(p), label: String(p) }))}
                               className="w-full"
                             />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">المادة</label>
                             {availableSubjects.length > 0 ? (
                               <CustomSelect
                                 value={newSession.subject || ''}
                                 onChange={(value) => setNewSession({...newSession, subject: value})}
                                 options={[
                                   { value: '', label: 'اختر المادة...' },
                                   ...availableSubjects.map(s => ({ value: s.name, label: s.name }))
                                 ]}
                                 placeholder="اختر المادة..."
                                 className="w-full"
                               />
                             ) : (
                               <div className="w-full border border-orange-300 rounded p-2.5 text-sm bg-orange-50 text-orange-700">
                                 <p className="text-xs font-medium">لا توجد مواد دراسية محددة</p>
                                 <p className="text-[10px] mt-1 text-orange-600">يرجى إضافة المواد الدراسية من تبويب "تعريف المواد الدراسية" أولاً</p>
                               </div>
                             )}
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">الفصل</label>
                             {classGrades.length > 0 ? (
                               <CustomSelect
                                 value={newSession.classRoom || ''}
                                 onChange={(value) => setNewSession({...newSession, classRoom: value})}
                                 options={[
                                   { value: '', label: 'اختر الفصل...' },
                                   ...classGrades.sort().map(grade => ({ value: grade, label: grade }))
                                 ]}
                                 placeholder="اختر الفصل..."
                                 className="w-full"
                               />
                             ) : (
                               <input 
                                 type="text" 
                                 value={newSession.classRoom || ''} 
                                 onChange={e => setNewSession({...newSession, classRoom: e.target.value})} 
                                 className="w-full border rounded p-2 text-sm" 
                                 placeholder="مثال: الرابع الابتدائي" 
                               />
                             )}
                         </div>
                         <div className="md:col-span-2">
                             <label className="block text-xs font-bold text-gray-500 mb-1">المعلم</label>
                             <CustomSelect
                               value={newSession.teacher || ''}
                               onChange={(value) => setNewSession({...newSession, teacher: value})}
                               options={[
                                 { value: '', label: 'اختر المعلم...' },
                                 ...allTeachers.map(t => ({ value: t, label: t }))
                               ]}
                               placeholder="اختر المعلم..."
                               className="w-full"
                             />
                         </div>
                     </div>
                     <div className="flex justify-end gap-2 pt-2">
                         <button onClick={handleCancelEdit} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded">إلغاء</button>
                         <button onClick={handleAddSession} className="px-4 py-2 text-sm bg-blue-600 text-white rounded font-bold hover:bg-blue-700">
                             {editingSession ? 'حفظ التعديلات' : 'حفظ الحصة'}
                         </button>
                     </div>
                 </div>
             )}

             {/* Schedule List - Desktop */}
             <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200">
                {schedule.length > 0 ? (
                 <table className="w-full text-right text-sm">
                     <thead className="bg-gray-50 text-gray-500 font-bold">
                         <tr>
                             <th className="p-4">اليوم والحصة</th>
                             <th className="p-4">المادة</th>
                             <th className="p-4">الفصل</th>
                             <th className="p-4">المعلم</th>
                             <th className="p-4">إجراءات</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {schedule.sort((a,b) => {
                             // Sort by day then period
                             const dayOrder: Record<string, number> = { 'الأحد': 1, 'الاثنين': 2, 'الثلاثاء': 3, 'الأربعاء': 4, 'الخميس': 5 };
                             const diff = (dayOrder[a.day] || 0) - (dayOrder[b.day] || 0);
                             if (diff !== 0) return diff;
                             return a.period - b.period;
                         }).map(item => (
                             <tr key={item.id} className="hover:bg-gray-50">
                                 <td className="p-4">
                                     <div className="flex items-center gap-2">
                                         <span className="font-bold text-gray-700">{item.day}</span>
                                         <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">حصة {item.period}</span>
                                     </div>
                                 </td>
                                 <td className="p-4 font-bold text-blue-800">{item.subject}</td>
                                 <td className="p-4 text-gray-600">{item.classRoom}</td>
                                 <td className="p-4 text-sm">{item.teacher}</td>
                                 <td className="p-4">
                                     <div className="flex items-center gap-2">
                                         <button 
                                             onClick={() => handleEditSession(item)} 
                                             className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded-full transition-colors"
                                             title="تعديل"
                                         >
                                             <Edit2 size={16} />
                                         </button>
                                         <button 
                                             onClick={() => handleDeleteSession(item.id)} 
                                             className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-full transition-colors"
                                             title="حذف"
                                         >
                                             <Trash2 size={16} />
                                         </button>
                                     </div>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
                ) : (
                    <div className="p-8 text-center text-gray-400">
                        <Calendar size={48} className="mx-auto mb-2 opacity-20" />
                        <p>لم يتم إضافة أي حصص للجدول حتى الآن</p>
                    </div>
                )}
             </div>

             {/* Schedule List - Mobile */}
             <div className="md:hidden space-y-3">
                {schedule.length > 0 ? (
                    schedule.sort((a,b) => {
                        const dayOrder: Record<string, number> = { 'الأحد': 1, 'الاثنين': 2, 'الثلاثاء': 3, 'الأربعاء': 4, 'الخميس': 5 };
                        const diff = (dayOrder[a.day] || 0) - (dayOrder[b.day] || 0);
                        if (diff !== 0) return diff;
                        return a.period - b.period;
                    }).map(item => (
                        <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-700">{item.day}</span>
                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">حصة {item.period}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleEditSession(item)} 
                                        className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded-full transition-colors"
                                        title="تعديل"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteSession(item.id)} 
                                        className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-full transition-colors"
                                        title="حذف"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1 text-sm">
                                <p><span className="font-bold text-blue-800">المادة:</span> {item.subject}</p>
                                <p><span className="font-bold text-gray-600">الفصل:</span> {item.classRoom}</p>
                                <p><span className="font-bold text-gray-600">المعلم:</span> {item.teacher}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center text-gray-400 bg-white rounded-lg border border-gray-200">
                        <Calendar size={48} className="mx-auto mb-2 opacity-20" />
                        <p>لم يتم إضافة أي حصص للجدول حتى الآن</p>
                    </div>
                )}
             </div>
          </div>
        )}
      </div>
      
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

      {/* Password Reset Modal */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-orange-600 p-4 md:p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <RotateCcw size={24} />
                <h3 className="text-lg md:text-xl font-bold">استعادة كلمة المرور</h3>
              </div>
              <button
                onClick={() => setShowPasswordResetModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <PasswordReset 
                users={users.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role }))} 
                onClose={() => setShowPasswordResetModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
