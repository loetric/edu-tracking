
import React, { useState } from 'react';
import { api } from '../services/api';
import { SchoolSettings, User, Role, ScheduleItem } from '../types';
import { PasswordReset } from './PasswordReset';
import { Save, Image as ImageIcon, Database, BookOpen, Plus, Upload, Phone, Trash2, AlertTriangle, Users, UserPlus, Shield, X, Clock, Calendar, Check } from 'lucide-react';
import { AVAILABLE_TEACHERS } from '../constants';

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
  const [formData, setFormData] = useState<SchoolSettings>(settings);
    const [activeTab, setActiveTab] = useState<'general' | 'users' | 'password' | 'setup'>('general');
  
  // User Management State
    const [newUser, setNewUser] = useState<Partial<User & { email?: string }>>({ role: 'teacher', name: '', username: '', password: '', email: '' });
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Schedule Management State
  const [newSession, setNewSession] = useState<Partial<ScheduleItem>>({ day: 'الأحد', period: 1, subject: '', classRoom: '', teacher: '' });
  const [isAddingSession, setIsAddingSession] = useState(false);

  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const periods = [1, 2, 3, 4, 5, 6, 7];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    alert('تم حفظ إعدادات المدرسة بنجاح');
  };

  const handleAddUser = async () => {
      if (!newUser.username || !newUser.password || !newUser.name || !newUser.role || !newUser.email) {
          alert('الرجاء تعبئة جميع الحقول');
          return;
      }

      setIsAddingUser(false);
      try {
          const created = await api.signUp(newUser.email!, newUser.password || '', { username: newUser.username!, name: newUser.name!, role: newUser.role as Role, avatar: `https://ui-avatars.com/api/?name=${newUser.name}&background=random` });
          if (!created) {
              alert('فشل في إنشاء حساب المستخدم');
              return;
          }
          onUpdateUsers([...users, created]);
          setNewUser({ role: 'teacher', name: '', username: '', password: '', email: '' });
          alert('تم إضافة المستخدم بنجاح');
      } catch (err) {
          console.error('Add user error', err);
          alert('حدث خطأ أثناء إنشاء المستخدم');
      }
  };

  const handleDeleteUser = (id: string) => {
      if(window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
          onUpdateUsers(users.filter(u => u.id !== id));
      }
  };

  const handleAddSession = () => {
      if (newSession.day && newSession.period && newSession.subject && newSession.classRoom && newSession.teacher && onUpdateSchedule) {
          const sessionToAdd: ScheduleItem = {
              id: Date.now().toString(),
              day: newSession.day,
              period: newSession.period,
              subject: newSession.subject,
              classRoom: newSession.classRoom,
              teacher: newSession.teacher
          };
          onUpdateSchedule([...schedule, sessionToAdd]);
          setNewSession({ ...newSession, subject: '', classRoom: '' }); // Keep day/teacher/period possibly
          setIsAddingSession(false);
          alert('تم إضافة الحصة للجدول بنجاح');
      } else {
          alert('الرجاء تعبئة جميع بيانات الحصة');
      }
  };

  const handleDeleteSession = (id: string) => {
      if(window.confirm('هل أنت متأكد من حذف هذه الحصة من الجدول؟') && onUpdateSchedule) {
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
              <div className="grid grid-cols-2 gap-6">
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
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 flex items-center gap-2 shadow-sm"
                   >
                       <UserPlus size={16} />
                       إضافة مستخدم جديد
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
                               <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as Role})} className="w-full border rounded p-2 text-sm">
                                   <option value="teacher">معلم</option>
                                   <option value="counselor">موجه طلابي</option>
                                   <option value="admin">مدير / إداري</option>
                               </select>
                           </div>
                       </div>
                       <div className="flex justify-end gap-2 pt-2">
                           <button onClick={() => setIsAddingUser(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded">إلغاء</button>
                           <button onClick={handleAddUser} className="px-4 py-2 text-sm bg-teal-600 text-white rounded font-bold hover:bg-teal-700">حفظ المستخدم</button>
                       </div>
                   </div>
               )}

               <div className="overflow-hidden rounded-lg border border-gray-200">
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
                                   <td className="p-4 flex items-center gap-3">
                                       <img src={user.avatar} className="w-8 h-8 rounded-full" alt="" />
                                       <span className="font-bold text-gray-800">{user.name}</span>
                                   </td>
                                   <td className="p-4 font-mono text-gray-600">{user.username}</td>
                                   <td className="p-4">
                                       <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                           user.role === 'admin' ? 'bg-red-100 text-red-700' :
                                           user.role === 'counselor' ? 'bg-purple-100 text-purple-700' :
                                           'bg-blue-100 text-blue-700'
                                       }`}>
                                           {user.role === 'admin' ? 'مدير' : user.role === 'counselor' ? 'موجه' : 'معلم'}
                                       </span>
                                   </td>
                                   <td className="p-4">
                                       <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-full transition-colors">
                                           <Trash2 size={16} />
                                       </button>
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           </div>
        )}

                {activeTab === 'password' && (
                    <div className="space-y-6 animate-in fade-in">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">إدارة إعادة تعيين كلمات المرور</h2>
                        <PasswordReset users={users.map(u => ({ id: u.id, username: u.username, email: (u as any).email, name: u.name, role: u.role }))} />
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
                             <select 
                                value={newSession.day} 
                                onChange={e => setNewSession({...newSession, day: e.target.value})} 
                                className="w-full border rounded p-2 text-sm"
                             >
                                 {days.map(d => <option key={d} value={d}>{d}</option>)}
                             </select>
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">رقم الحصة</label>
                             <select 
                                value={newSession.period} 
                                onChange={e => setNewSession({...newSession, period: parseInt(e.target.value)})} 
                                className="w-full border rounded p-2 text-sm"
                             >
                                 {periods.map(p => <option key={p} value={p}>{p}</option>)}
                             </select>
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
                             <input 
                                type="text" 
                                value={newSession.classRoom} 
                                onChange={e => setNewSession({...newSession, classRoom: e.target.value})} 
                                className="w-full border rounded p-2 text-sm" 
                                placeholder="مثال: الرابع / أ" 
                             />
                         </div>
                         <div className="md:col-span-2">
                             <label className="block text-xs font-bold text-gray-500 mb-1">المعلم</label>
                             <select 
                                value={newSession.teacher} 
                                onChange={e => setNewSession({...newSession, teacher: e.target.value})} 
                                className="w-full border rounded p-2 text-sm"
                             >
                                 <option value="">اختر المعلم...</option>
                                 {allTeachers.map(t => <option key={t} value={t}>{t}</option>)}
                             </select>
                         </div>
                     </div>
                     <div className="flex justify-end gap-2 pt-2">
                         <button onClick={() => setIsAddingSession(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded">إلغاء</button>
                         <button onClick={handleAddSession} className="px-4 py-2 text-sm bg-blue-600 text-white rounded font-bold hover:bg-blue-700">حفظ الحصة</button>
                     </div>
                 </div>
             )}

             {/* Schedule List */}
             <div className="overflow-hidden rounded-lg border border-gray-200">
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
          </div>
        )}
      </div>
    </div>
  );
};
