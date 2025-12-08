
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { UserCog, Lock, User, Eye, EyeOff, LogIn, PlusCircle, School } from 'lucide-react';
import { Role, SchoolSettings, User as UserType } from '../types';

interface LoginScreenProps {
    onLogin: (user: UserType) => void;
    onRegister?: (schoolName: string, adminName: string, user: UserType, email: string) => void;
  settings: SchoolSettings;
  users: UserType[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onRegister, settings, users }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  
    // Login State
    const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Register State
  const [schoolName, setSchoolName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [regUsername, setRegUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  
  // Real-time validation state
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  
  // Debounce timers
  const emailCheckTimer = useRef<NodeJS.Timeout | null>(null);
  const usernameCheckTimer = useRef<NodeJS.Timeout | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

        // Call API login (handles username-to-email resolution)
        try {
            const result = await api.login(username, password);
            if (result.error) {
                setError(result.error);
            } else if (result.user) {
                await onLogin(result.user);
            } else {
                setError('بيانات الدخول غير صحيحة');
            }
        } catch (err: any) {
            setError(err?.message || 'خطأ في تسجيل الدخول');
            console.error('Login error', err);
        } finally {
            setLoading(false);
        }
  };

  // Real-time email validation
  useEffect(() => {
    if (emailCheckTimer.current) {
      clearTimeout(emailCheckTimer.current);
    }

    if (!regEmail || !isRegistering) {
      setEmailError('');
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail)) {
      setEmailError('صيغة البريد الإلكتروني غير صحيحة');
      return;
    }

    setIsCheckingEmail(true);
    emailCheckTimer.current = setTimeout(async () => {
      const exists = await api.checkEmailExists(regEmail);
      if (exists) {
        setEmailError('البريد الإلكتروني مسجل مسبقاً');
      } else {
        setEmailError('');
      }
      setIsCheckingEmail(false);
    }, 500); // Debounce 500ms

    return () => {
      if (emailCheckTimer.current) {
        clearTimeout(emailCheckTimer.current);
      }
    };
  }, [regEmail, isRegistering]);

  // Real-time username validation
  useEffect(() => {
    if (usernameCheckTimer.current) {
      clearTimeout(usernameCheckTimer.current);
    }

    if (!regUsername || !isRegistering) {
      setUsernameError('');
      return;
    }

    // Check local users first (faster)
    if (users.some(u => u.username.toLowerCase() === regUsername.toLowerCase())) {
      setUsernameError('اسم المستخدم مسجل مسبقاً');
      return;
    }

    setIsCheckingUsername(true);
    usernameCheckTimer.current = setTimeout(async () => {
      const exists = await api.checkUsernameExists(regUsername);
      if (exists) {
        setUsernameError('اسم المستخدم مسجل مسبقاً');
      } else {
        setUsernameError('');
      }
      setIsCheckingUsername(false);
    }, 500); // Debounce 500ms

    return () => {
      if (usernameCheckTimer.current) {
        clearTimeout(usernameCheckTimer.current);
      }
    };
  }, [regUsername, isRegistering, users]);

  const handleRegister = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      // Check for real-time validation errors
      if (emailError) {
          setError(emailError);
          setLoading(false);
          return;
      }

      if (usernameError) {
          setError(usernameError);
          setLoading(false);
          return;
      }

      if (regPassword !== regConfirmPassword) {
          setError('كلمات المرور غير متطابقة');
          setLoading(false);
          return;
      }
      
      if (!schoolName || !adminName || !regUsername || !regPassword || !regEmail) {
          setError('جميع الحقول مطلوبة');
          setLoading(false);
          return;
      }

      // Password validation (Supabase requires at least 6 characters)
      if (regPassword.length < 6) {
          setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
          setLoading(false);
          return;
      }

      if (onRegister) {
        const newUser: UserType = {
            id: Date.now().toString(), // Temp ID, backend should generate
            name: adminName,
            username: regUsername,
            password: regPassword,
            role: 'admin',
            avatar: `https://ui-avatars.com/api/?name=${adminName.replace(' ', '+')}&background=0D9488&color=fff`
        };
        onRegister && onRegister(schoolName, adminName, newUser, regEmail);
      }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 to-emerald-800 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col md:flex-row max-w-4xl w-full overflow-hidden min-h-[550px]">
        
        {/* Right Side: Branding (Changes based on mode) */}
        <div className={`md:w-1/2 p-10 flex flex-col items-center justify-center text-center border-l border-gray-100 transition-colors duration-500 ${isRegistering ? 'bg-teal-50' : 'bg-gray-50'}`}>
           <div className="w-32 h-32 mb-6 bg-white rounded-full flex items-center justify-center overflow-hidden border-4 border-teal-100 shadow-md p-2">
            <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {isRegistering ? 'انضم إلينا الآن' : settings.name}
          </h1>
          <p className="text-teal-600 font-bold text-lg mb-6">{settings.slogan}</p>
          <div className="space-y-2 text-sm text-gray-500">
              <p>نظام التتبع التعليمي الذكي</p>
              <p>متابعة • تقارير • تواصل</p>
          </div>
          
          <button 
             onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
             className="mt-8 text-teal-700 font-bold hover:underline text-sm flex items-center gap-1"
          >
              {isRegistering ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'تسجيل مدرسة جديدة؟'}
          </button>
        </div>

        {/* Left Side: Form */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    {isRegistering ? <School className="text-teal-600" /> : <LogIn className="text-teal-600" />}
                    {isRegistering ? 'تسجيل مدرسة جديدة' : 'تسجيل الدخول'}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                    {isRegistering ? 'قم بإنشاء حساب لمدير المدرسة للبدء' : 'الرجاء إدخال بيانات حسابك للمتابعة'}
                </p>
            </div>

            {isRegistering ? (
                // Register Form
                <form onSubmit={handleRegister} className="space-y-4">
                     <div>
                        <label htmlFor="schoolName" className="block text-xs font-bold text-gray-700 mb-1">اسم المدرسة</label>
                        <input 
                            id="schoolName"
                            name="schoolName"
                            type="text" 
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
                            placeholder="مدرسة المستقبل الأهلية"
                        />
                    </div>
                    <div>
                        <label htmlFor="adminName" className="block text-xs font-bold text-gray-700 mb-1">اسم المدير (المسؤول)</label>
                        <input 
                            id="adminName"
                            name="adminName"
                            type="text" 
                            value={adminName}
                            onChange={(e) => setAdminName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
                            placeholder="أ. محمد عبدالله"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label htmlFor="regUsername" className="block text-xs font-bold text-gray-700 mb-1">اسم المستخدم</label>
                            <input 
                                id="regUsername"
                                name="regUsername"
                                type="text" 
                                value={regUsername}
                                onChange={(e) => setRegUsername(e.target.value)}
                                className={`w-full px-4 py-2 rounded-lg border outline-none text-sm ${
                                    usernameError 
                                        ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
                                        : 'border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
                                }`}
                                placeholder="admin_school"
                            />
                            {isCheckingUsername && (
                                <p className="text-xs text-gray-400 mt-1">جاري التحقق...</p>
                            )}
                            {usernameError && (
                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-red-500"></span>
                                    {usernameError}
                                </p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="regEmail" className="block text-xs font-bold text-gray-700 mb-1">البريد الإلكتروني</label>
                            <input
                                id="regEmail"
                                name="regEmail"
                                type="email"
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                                className={`w-full px-4 py-2 rounded-lg border outline-none text-sm ${
                                    emailError 
                                        ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
                                        : 'border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
                                }`}
                                placeholder="admin@example.com"
                            />
                            {isCheckingEmail && (
                                <p className="text-xs text-gray-400 mt-1">جاري التحقق...</p>
                            )}
                            {emailError && (
                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-red-500"></span>
                                    {emailError}
                                </p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="regPassword" className="block text-xs font-bold text-gray-700 mb-1">كلمة المرور</label>
                            <input 
                                id="regPassword"
                                name="regPassword"
                                type="password" 
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
                                placeholder="******"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="regConfirmPassword" className="block text-xs font-bold text-gray-700 mb-1">تأكيد كلمة المرور</label>
                        <input 
                            id="regConfirmPassword"
                            name="regConfirmPassword"
                            type="password" 
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
                            placeholder="******"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg hover:bg-teal-700 transition-all shadow-md active:scale-95 flex justify-center items-center gap-2 mt-2"
                    >
                        {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب والدخول'}
                    </button>
                </form>
            ) : (
                // Login Form
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-sm font-bold text-gray-700 mb-2">اسم المستخدم</label>
                        <div className="relative">
                            <User className="absolute top-3 right-3 text-gray-400" size={20} />
                            <input 
                                id="username"
                                name="username"
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pr-10 pl-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
                                placeholder="username"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">كلمة المرور</label>
                        <div className="relative">
                            <Lock className="absolute top-3 right-3 text-gray-400" size={20} />
                            <input 
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"} 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pr-10 pl-10 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
                                placeholder="••••••••"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute top-3 left-3 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg hover:bg-teal-700 transition-all shadow-md active:scale-95 flex justify-center items-center gap-2"
                    >
                        {loading ? (
                            <>جاري الدخول...</>
                        ) : (
                            <>دخول للنظام</>
                        )}
                    </button>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};
