import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Student, DailyRecord, Role, ScheduleItem } from '../types';
import { CheckCircle2, XCircle, AlertTriangle, Send, TrendingUp, Users, CalendarCheck, Clock, Check } from 'lucide-react';

interface DashboardStatsProps {
  students: Student[];
  records?: Record<string, DailyRecord>;
  onSendReminder: (message: string) => void;
  role?: Role;
  completedSessions?: string[];
  schedule: ScheduleItem[]; // Prop is required now
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ students, records = {}, onSendReminder, role, completedSessions = [], schedule }) => {
  // Mock data for the chart with better curve
  const data = [
    { name: 'الأحد', performance: 65 },
    { name: 'الاثنين', performance: 72 },
    { name: 'الثلاثاء', performance: 68 },
    { name: 'الأربعاء', performance: 85 },
    { name: 'الخميس', performance: 80 },
  ];

  // Logic to determine Class Readiness (Completion of Grading)
  const dayName = new Date().toLocaleDateString('ar-SA', { weekday: 'long' });
  
  // Use the passed schedule prop
  const todaysSessions = schedule.filter(s => s.day === dayName);
  
  // Group sessions by class
  // Explicitly cast to string[] to prevent unknown type inference from Set
  const uniqueClasses = Array.from(new Set(todaysSessions.map(s => s.classRoom))) as string[];
  
  const classStatus = uniqueClasses.map(className => {
      const classSessions = todaysSessions.filter(s => s.classRoom === className);
      const total = classSessions.length;
      const completedCount = classSessions.filter(s => completedSessions.includes(s.id)).length;
      
      // Determine responsible teachers (unique)
      // Explicitly type teachers as string[] to avoid inference issues
      const teachers: string[] = Array.from(new Set(classSessions.map(s => s.teacher).filter((t): t is string => !!t)));

      return {
          className,
          isReady: total > 0 && total === completedCount,
          progress: completedCount,
          total,
          teachers,
          lastSessionId: classSessions[classSessions.length - 1]?.id // ID of the last session
      };
  });

  const handleReminderClick = (teacherName: string, className: string) => {
      const msg = `تذكير: ${teacherName}، نرجو التكرم بسرعة رصد الدرجات والمتابعة اليومية للفصل (${className}).`;
      onSendReminder(msg);
      alert(`تم إرسال التذكير إلى ${teacherName} في نظام التواصل الداخلي.`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">إجمالي الطلاب</p>
                    <h4 className="text-3xl font-bold text-gray-800">{students.length}</h4>
                </div>
                <div className="p-4 bg-teal-50 text-teal-600 rounded-xl">
                    <Users size={24} />
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">نسبة الحضور اليوم</p>
                    <h4 className="text-3xl font-bold text-gray-800">92%</h4>
                </div>
                <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
                    <CalendarCheck size={24} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">الأداء العام</p>
                    <h4 className="text-3xl font-bold text-green-600">ممتاز</h4>
                </div>
                <div className="p-4 bg-green-50 text-green-600 rounded-xl">
                    <TrendingUp size={24} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">تنبيهات السلوك</p>
                    <h4 className="text-3xl font-bold text-orange-500">3</h4>
                </div>
                <div className="p-4 bg-orange-50 text-orange-600 rounded-xl">
                    <AlertTriangle size={24} />
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            {/* Teachers Monitoring Table (Only for Admin) */}
            {role === 'admin' && (
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Clock size={20} className="text-teal-600" />
                                متابعة اكتمال الرصد اليومي ({dayName})
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">يظهر الفصل "مكتمل" عند رصد جميع حصص الجدول الدراسي لهذا اليوم</p>
                        </div>
                    </div>
                    
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-bold text-xs">الفصل</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-bold text-xs">نسبة الإنجاز</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-bold text-xs">حالة التقرير</th>
                                    <th className="px-4 md:px-6 py-3 md:py-4 font-bold text-xs">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {classStatus.length > 0 ? classStatus.map((item) => (
                                    <tr key={item.className} className={`transition-colors ${item.isReady ? 'bg-green-50/30' : 'hover:bg-gray-50'}`}>
                                        <td className="px-6 py-4 font-bold text-gray-800">
                                            <div className="flex flex-col">
                                                <span className="text-base">{item.className}</span>
                                                <span className="text-xs text-gray-400 font-normal">
                                                    المعلمين: {item.teachers.join('، ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-gray-200 rounded-full max-w-[100px] overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${item.isReady ? 'bg-green-500' : 'bg-blue-500'}`} 
                                                        style={{ width: `${(item.progress / item.total) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-bold text-gray-600">
                                                    {item.progress}/{item.total}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.isReady ? (
                                                <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full w-fit">
                                                    <CheckCircle2 size={16} />
                                                    <span className="font-bold text-xs">جاهز للإرسال</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 bg-gray-100 text-gray-500 px-3 py-1 rounded-full w-fit">
                                                    <Clock size={16} />
                                                    <span className="font-bold text-xs">جاري الرصد...</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.isReady ? (
                                                <button 
                                                    className="flex items-center gap-2 text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                                    onClick={() => alert(`سيتم توجيهك لصفحة إرسال التقارير الجماعية للفصل ${item.className}`)}
                                                >
                                                    <Send size={14} className="rtl:rotate-180"/>
                                                    إرسال التقارير
                                                </button>
                                            ) : (
                                                 <button 
                                                    onClick={() => handleReminderClick(item.teachers[0] || '', item.className)}
                                                    className="flex items-center gap-2 text-orange-600 hover:text-white hover:bg-orange-500 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-orange-200"
                                                >
                                                    <Send size={14} className="rtl:rotate-180"/>
                                                    استعجال المعلمين
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-400">لا توجد حصص مجدولة لهذا اليوم</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3 p-4">
                        {classStatus.map((item) => (
                            <div key={item.className} className={`bg-white border rounded-lg p-3 md:p-4 ${item.isReady ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-2 gap-2">
                                    <p className="font-bold text-gray-800 text-sm md:text-base truncate flex-1">{item.className}</p>
                                    {item.isReady && <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 md:w-5 md:h-5" />}
                                </div>
                                <p className="text-xs text-gray-500 mb-3 line-clamp-2">المعلمين: {item.teachers.join('، ')}</p>
                                <div className="mb-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] md:text-xs font-bold text-gray-600">نسبة الإنجاز</span>
                                        <span className="text-[10px] md:text-xs font-bold text-gray-600">{item.progress}/{item.total}</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${item.isReady ? 'bg-green-500' : 'bg-blue-500'}`} 
                                            style={{ width: `${(item.progress / item.total) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                                {item.isReady && (
                                    <button className="w-full bg-teal-600 text-white py-2.5 md:py-2 rounded-lg text-xs md:text-sm font-bold hover:bg-teal-700 flex items-center justify-center gap-1.5">
                                        <FileText size={12} className="md:w-4 md:h-4 flex-shrink-0" />
                                        <span>عرض التقرير</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Performance Chart (Takes up full width if not admin) */}
            <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col ${role !== 'admin' ? 'lg:col-span-3' : ''}`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800">تحليل الأداء الأسبوعي</h3>
                </div>
                <div className="flex-1 min-h-[250px] w-full">
                    {/* Give ResponsiveContainer an explicit height to avoid width/height -1 warnings */}
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                cursor={{ stroke: '#0d9488', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="performance" 
                                stroke="#0d9488" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorPerf)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">متوسط الأداء لهذا الأسبوع <span className="text-teal-600 font-bold">78%</span></p>
                </div>
            </div>
        </div>
    </div>
  );
};