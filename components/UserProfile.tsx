import React from 'react';
import { User as UserType } from '../types';
import { User, Mail, Shield, Calendar, Clock, X } from 'lucide-react';

interface UserProfileProps {
  user: UserType;
  onClose?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onClose }) => {
  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'مدير النظام';
      case 'teacher':
        return 'معلم';
      case 'counselor':
        return 'موجه طلابي';
      default:
        return 'مستخدم';
    }
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'teacher':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'counselor':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in fade-in">
      <div className="space-y-6">

        {/* User Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Username */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-teal-100 rounded-lg">
                <User size={18} className="text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold">اسم المستخدم</p>
                <p className="text-sm md:text-base font-bold text-gray-800 font-mono">{user.username}</p>
              </div>
            </div>
          </div>

          {/* Email */}
          {user.email && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold">البريد الإلكتروني</p>
                  <p className="text-sm md:text-base font-bold text-gray-800 break-all">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Role */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold">الصلاحية</p>
                <p className="text-sm md:text-base font-bold text-gray-800">{getRoleLabel(user.role)}</p>
              </div>
            </div>
          </div>

          {/* Subject (if teacher) */}
          {user.subject && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar size={18} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold">المادة الدراسية</p>
                  <p className="text-sm md:text-base font-bold text-gray-800">{user.subject}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6">
          <div className="flex items-start gap-3">
            <Clock size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm md:text-base font-bold text-blue-800 mb-1">معلومات الحساب</p>
              <p className="text-xs md:text-sm text-blue-700">
                هذا الحساب نشط ويمكنك الوصول إلى جميع الميزات المتاحة حسب صلاحياتك. 
                {user.role === 'admin' && ' لديك صلاحيات كاملة لإدارة النظام.'}
                {user.role === 'teacher' && ' يمكنك متابعة الطلاب وإرسال التقارير.'}
                {user.role === 'counselor' && ' يمكنك عرض التقارير وإدارة التحديات.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

