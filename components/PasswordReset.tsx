import React, { useState, useEffect } from 'react';
import { RotateCcw, Check, X, Loader2, Mail, User, Search } from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../services/supabase';

interface PasswordResetProps {
  users: Array<{ id: string; username: string; email?: string; name: string; role: string }>;
  onClose?: () => void;
}

interface UserWithEmail {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
}

export const PasswordReset: React.FC<PasswordResetProps> = ({ users, onClose }) => {
  const [usersWithEmail, setUsersWithEmail] = useState<UserWithEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [resettingFor, setResettingFor] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch emails for all users
  useEffect(() => {
    const fetchUserEmails = async () => {
      try {
        const userIds = users.map(u => u.id);
        if (userIds.length === 0) return;

        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        if (error) {
          console.error('Error fetching user emails:', error);
          return;
        }

        const usersWithEmails: UserWithEmail[] = users.map(user => {
          const profile = profiles?.find(p => p.id === user.id);
          return {
            ...user,
            email: profile?.email || user.email || 'غير متوفر'
          };
        });

        setUsersWithEmail(usersWithEmails);
      } catch (error) {
        console.error('Error fetching emails:', error);
      }
    };

    fetchUserEmails();
  }, [users]);

  const filteredUsers = usersWithEmail.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleResetPassword = async (user: UserWithEmail) => {
    if (!user.email || user.email === 'غير متوفر') {
      setMessage({ type: 'error', text: 'لا يوجد بريد إلكتروني مسجل لهذا المستخدم' });
      return;
    }

    if (!window.confirm(`هل تريد إرسال رابط إعادة تعيين كلمة المرور إلى ${user.name} (${user.email})؟`)) {
      return;
    }

    setResettingFor(user.id);
    setMessage(null);

    try {
      const result = await api.resetUserPassword(user.email);
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${user.email}`
        });
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'فشل في إرسال رابط إعادة تعيين كلمة المرور'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
      });
    } finally {
      setResettingFor(null);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير';
      case 'counselor': return 'موجه';
      case 'teacher': return 'معلم';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'counselor': return 'bg-purple-100 text-purple-700';
      case 'teacher': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-md" dir="rtl">
      <div className="flex items-center gap-2 mb-6">
        <RotateCcw className="text-teal-600" size={24} />
        <h3 className="text-xl font-bold text-gray-800">إعادة تعيين كلمة المرور</h3>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check size={20} />
          ) : (
            <X size={20} />
          )}
          {message.text}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث بالاسم، اسم المستخدم، أو البريد الإلكتروني..."
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 text-gray-500 font-bold">
            <tr>
              <th className="p-3 md:p-4 text-xs md:text-sm">الاسم</th>
              <th className="p-3 md:p-4 text-xs md:text-sm">اسم المستخدم</th>
              <th className="p-3 md:p-4 text-xs md:text-sm">البريد الإلكتروني</th>
              <th className="p-3 md:p-4 text-xs md:text-sm">الصلاحية</th>
              <th className="p-3 md:p-4 text-xs md:text-sm">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  {searchTerm ? 'لم يتم العثور على مستخدمين' : 'لا يوجد مستخدمين'}
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                        <User size={16} className="text-teal-600" />
                      </div>
                      <span className="font-bold text-gray-800">{user.name}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-gray-600">{user.username}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-gray-400" />
                      <span className={user.email === 'غير متوفر' ? 'text-gray-400 italic' : 'text-gray-700'}>
                        {user.email}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-bold ${getRoleColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleResetPassword(user)}
                      disabled={resettingFor === user.id || user.email === 'غير متوفر'}
                      className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 md:gap-2 ${
                        resettingFor === user.id || user.email === 'غير متوفر'
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95'
                      }`}
                    >
                      {resettingFor === user.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin md:w-4 md:h-4" />
                          <span className="hidden sm:inline">جاري الإرسال...</span>
                          <span className="sm:hidden">جاري...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw size={14} className="md:w-4 md:h-4" />
                          <span className="hidden sm:inline">إرسال رابط</span>
                          <span className="sm:hidden">إرسال</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500 text-right mt-4 p-3 bg-gray-50 rounded-lg">
        <strong>ملاحظة:</strong> سيتم إرسال رابط آمن إلى بريد المستخدم. سيكون الرابط صالحاً لمدة 24 ساعة.
      </p>
    </div>
  );
};
