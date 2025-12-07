import React, { useState } from 'react';
import { RotateCcw, Check, X, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface PasswordResetProps {
  users: Array<{ id: string; username: string; email?: string; name: string; role: string }>;
  onClose?: () => void;
}

export const PasswordReset: React.FC<PasswordResetProps> = ({ users, onClose }) => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResetPassword = async () => {
    if (!selectedUser) {
      setMessage({ type: 'error', text: 'اختر مستخدماً أولاً' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const user = users.find(u => u.id === selectedUser);
      if (!user || !user.email) {
        throw new Error('بيانات المستخدم غير صحيحة');
      }

      // Call Supabase Admin API to generate reset link
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, username: user.username })
      });

      if (!response.ok) {
        throw new Error('فشل في إرسال رابط إعادة تعيين كلمة المرور');
      }

      setMessage({
        type: 'success',
        text: `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${user.email}`
      });
      setSelectedUser('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-md" dir="rtl">
      <div className="flex items-center gap-2 mb-6">
        <RotateCcw className="text-teal-600" size={24} />
        <h3 className="text-xl font-bold text-gray-800">إعادة تعيين كلمة المرور</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">اختر المستخدم</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
          >
            <option value="">-- اختر مستخدماً --</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.username}) - {user.email || 'بدون بريد'}
              </option>
            ))}
          </select>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
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

        <button
          onClick={handleResetPassword}
          disabled={loading || !selectedUser}
          className={`w-full py-2 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
            loading || !selectedUser
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95'
          }`}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              جاري الإرسال...
            </>
          ) : (
            <>
              <RotateCcw size={20} />
              إرسال رابط إعادة التعيين
            </>
          )}
        </button>

        <p className="text-sm text-gray-500 text-right">
          سيتم إرسال رابط آمن إلى بريد المستخدم. سيكون الرابط صالحاً لمدة 24 ساعة.
        </p>
      </div>
    </div>
  );
};
