
import React, { useState } from 'react';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { SchoolSettings, User, Role, ScheduleItem } from '../types';
import { PasswordReset } from './PasswordReset';
import { Save, Image as ImageIcon, Database, BookOpen, Plus, Upload, Phone, Trash2, AlertTriangle, Users, UserPlus, Shield, X, Calendar, Check, Edit2 } from 'lucide-react';
import { AVAILABLE_TEACHERS } from '../constants';
import { useModal } from '../hooks/useModal';
import { ConfirmModal } from './ConfirmModal';
import { AlertModal } from './AlertModal';
import { CustomSelect } from './CustomSelect';

interface SchoolSettingsProps {
  settings: SchoolSettings;
  users: User[];
  schedule?: ScheduleItem[];
  onSave: (settings: SchoolSettings) => void;
  onUpdateUsers: (users: User[]) => void;
  onUpdateSchedule?: (schedule: ScheduleItem[]) => void;
  onReset?: () => void;
}

export const SchoolSettingsForm: React.FC<SchoolSettingsProps> = ({ settings, users, schedule = [], onSave, onUpdateUsers, onUpdateSchedule, onReset }) => {
  const { confirm, alert, confirmModal, alertModal } = useModal();
  const [formData, setFormData] = useState<SchoolSettings>(settings);
    const [activeTab, setActiveTab] = useState<'general' | 'users' | 'password' | 'setup' | 'classes'>('general');
  
  // Class Grades Management State
  const [classGrades, setClassGrades] = useState<string[]>(settings?.classGrades || []);
  const [newClassGrade, setNewClassGrade] = useState('');
  
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

  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const periods = [1, 2, 3, 4, 5, 6, 7];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, classGrades });
    alert({ message: 'تم حفظ إعدادات المدرسة بنجاح', type: 'success' });
  };

  const handleAddClassGrade = () => {
    if (!newClassGrade.trim()) {
      alert({ message: 'الرجاء إدخال اسم الصف', type: 'warning' });
      return;
    }
    if (classGrades.includes(newClassGrade.trim())) {
      alert({ message: 'هذا الصف مسجل مسبقاً', type: 'warning' });
      return;
    }
    setClassGrades([...classGrades, newClassGrade.trim()]);
    setNewClassGrade('');
    alert({ message: 'تم إضافة الصف بنجاح', type: 'success' });
  };

  const handleDeleteClassGrade = async (grade: string) => {
    const shouldDelete = await confirm({
      title: 'حذف الصف',
      message: `هل أنت متأكد من حذف الصف "${grade}"؟\n\nسيتم حذف هذا الصف من القائمة فقط، ولن يتم حذف بيانات الطلاب المرتبطة به.`,
      type: 'warning',
      confirmText: 'حذف',
      cancelText: 'إلغاء'
    });
    
    if (shouldDelete) {
      setClassGrades(classGrades.filter(g => g !== grade));
      alert({ message: 'تم حذف الصف بنجاح', type: 'success' });
    }
  };

  const handleAddUser = async () => {
      if (!newUser.username || !newUser.password || !newUser.name || !newUser.role || !newUser.email) {
          alert({ message: 'الرجاء تعبئة جميع الحقول', type: 'warning' });
          return;
      }

      // Validate email before submission
      const emailToValidate = (newUser.email || '').trim();
      if (!emailToValidate) {
          setEmailError('البريد الإلكتروني مطلوب');
          alert({ message: 'الرجاء إدخال بريد إلكتروني صحيح', type: 'warning' });
          return;
      }

      // Use the same regex as validation.ts for consistency
      const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(emailToValidate)) {
          setEmailError('صيغة البريد الإلكتروني غير صحيحة');
          alert({ message: 'صيغة البريد الإلكتروني غير صحيحة. يرجى التحقق من الإدخال', type: 'warning' });
          return;
      }

      // Additional validation checks
      if (emailToValidate.length > 254) {
          setEmailError('البريد الإلكتروني طويل جداً');
          alert({ message: 'البريد الإلكتروني طويل جداً (الحد الأقصى 254 حرف)', type: 'warning' });
          return;
      }

      if (emailToValidate.startsWith('.') || emailToValidate.startsWith('@') || emailToValidate.endsWith('.')) {
          setEmailError('صيغة البريد الإلكتروني غير صحيحة');
          alert({ message: 'صيغة البريد الإلكتروني غير صحيحة', type: 'warning' });
          return;
      }

      setIsAddingUser(false);
      setEmailError('');
      try {
          console.log('Attempting to sign up user with email:', emailToValidate);
          const result = await api.signUp(emailToValidate, newUser.password || '', { username: newUser.username!, name: newUser.name!, role: newUser.role as Role, avatar: `https://ui-avatars.com/api/?name=${newUser.name}&background=random` });
          
          console.log('Sign up result:', result);
          
          if (result.error) {
              console.error('Sign up error:', result.error);
              setEmailError(result.error.includes('البريد') || result.error.includes('email') ? result.error : '');
              alert({ message: result.error, type: 'error' });
              setIsAddingUser(true); // Re-open form on error
              return;
          }
          
          if (!result.user) {
              alert({ message: 'فشل في إنشاء حساب المستخدم', type: 'error' });
              setIsAddingUser(true);
              return;
          }
          
          onUpdateUsers([...users, result.user]);
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
      const shouldDelete = await confirm({
        title: 'حذف المستخدم',
        message: 'هل أنت متأكد من حذف هذا المستخدم؟',
        type: 'danger',
        confirmText: 'حذف',
        cancelText: 'إلغاء'
      });
      
      if (shouldDelete) {
          onUpdateUsers(users.filter(u => u.id !== id));
      }
  };

  const handleEditUser = (user: User) => {
      setEditingUser(user);
      setEditFormData({
          name: user.name,
          username: user.username,
          role: user.role,
          avatar: user.avatar
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
                avatar: editFormData.avatar
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


  const handleAddSession = () => {
      if (newSession.day && newSession.period && newSession.subject && newSession.classRoom && newSession.teacher && onUpdateSchedule) {
          // Trim and normalize teacher name to ensure consistency
          const normalizedTeacher = (newSession.teacher || '').trim().replace(/\s+/g, ' ');
          const sessionToAdd: ScheduleItem = {
              id: Date.now().toString(),
              day: newSession.day,
              period: newSession.period,
              subject: newSession.subject.trim(),
              classRoom: newSession.classRoom.trim(),
              teacher: normalizedTeacher
          };
          onUpdateSchedule([...schedule, sessionToAdd]);
          setNewSession({ ...newSession, subject: '', classRoom: '' }); // Keep day/teacher/period possibly
          setIsAddingSession(false);
          alert({ message: 'تم إضافة الحصة للجدول بنجاح', type: 'success' });
      } else {
          alert({ message: 'الرجاء تعبئة جميع بيانات الحصة', type: 'warning' });
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
          onUpdateSchedule(schedule.filter(s => s.id !== id));
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
    <div className="max-w-4xl mx-auto">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl overflow-hidden shadow-sm">
        <button onClick={() => setActiveTab('general')} className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'general' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:bg-gray-50'}`}>الترويسة والبيانات العامة</button>
        <button onClick={() => setActiveTab('users')} className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'users' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:bg-gray-50'}`}>إدارة المستخدمين والصلاحيات</button>
        <button onClick={() => setActiveTab('password')} className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'password' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:bg-gray-50'}`}>إعادة تعيين كلمات المرور</button>
        <button onClick={() => setActiveTab('classes')} className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'classes' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:bg-gray-50'}`}>تعريف الفصول</button>
        <button onClick={() => setActiveTab('setup')} className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'setup' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:bg-gray-50'}`}>إعداد الجداول المدرسية</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        
        {activeTab === 'general' && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              إعدادات ترويسة التقارير
            </h2>
            
            {/* Header Preview */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
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
                   {formData.whatsappPhone && <p className="text-gray-400 text-[10px] mt-1">ت: {formData.whatsappPhone}</p>}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">السطر الرابع (اسم المدرسة)</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border"
                />
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم واتساب المدرسة (للتواصل)</label>
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

              <div className="pt-4 border-t border-gray-100 space-y-4">
                <button
                  type="submit"
                  className="w-full flex justify-center items-center gap-2 bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition-colors font-bold shadow-md"
                >
                  <Save size={20} />
                  حفظ إعدادات الترويسة
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
                   <button 
                    onClick={() => setIsAddingUser(!isAddingUser)}
                    className="bg-teal-600 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold hover:bg-teal-700 flex items-center gap-1.5 md:gap-2 shadow-sm"
                   >
                       <UserPlus size={14} className="md:w-4 md:h-4 flex-shrink-0" />
                       <span className="hidden sm:inline">إضافة مستخدم جديد</span>
                       <span className="sm:hidden">إضافة</span>
                   </button>
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
                               <label className="block text-xs font-bold text-gray-500 mb-1">البريد الإلكتروني</label>
                               <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="user@example.com" />
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

                {activeTab === 'password' && (
                    <div className="space-y-6 animate-in fade-in">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">إدارة إعادة تعيين كلمات المرور</h2>
                        <PasswordReset users={users.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role }))} />
                    </div>
                )}

        {activeTab === 'classes' && (
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
              <p className="text-sm text-blue-800">
                <strong>ملاحظة:</strong> الفصول المعرفة هنا ستظهر في قوائم الاختيار عند إضافة أو تعديل بيانات الطلاب، مما يضمن اتساق البيانات في النظام.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'setup' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                 <div>
                     <h3 className="font-bold text-gray-800">الجدول المدرسي العام</h3>
                     <p className="text-xs text-gray-500">إضافة وتعديل الحصص للمعلمين</p>
                 </div>
                 <button 
                  onClick={() => setIsAddingSession(!isAddingSession)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                 >
                     <Plus size={16} />
                     إضافة حصة جديدة
                 </button>
             </div>

             {isAddingSession && (
                 <div className="bg-white border-2 border-blue-100 p-6 rounded-xl shadow-sm space-y-4">
                     <h4 className="font-bold text-blue-800 flex items-center gap-2">
                        <BookOpen size={18}/>
                        تفاصيل الحصة الدراسية
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
                             <input 
                                type="text" 
                                value={newSession.subject} 
                                onChange={e => setNewSession({...newSession, subject: e.target.value})} 
                                className="w-full border rounded p-2 text-sm" 
                                placeholder="مثال: رياضيات" 
                            />
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
                         <button onClick={() => setIsAddingSession(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded">إلغاء</button>
                         <button onClick={handleAddSession} className="px-4 py-2 text-sm bg-blue-600 text-white rounded font-bold hover:bg-blue-700">حفظ الحصة</button>
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
                             <th className="p-4">حذف</th>
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
                                     <button onClick={() => handleDeleteSession(item.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-full transition-colors">
                                         <Trash2 size={16} />
                                     </button>
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
                                <button onClick={() => handleDeleteSession(item.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-full transition-colors">
                                    <Trash2 size={16} />
                                </button>
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
    </div>
  );
};
