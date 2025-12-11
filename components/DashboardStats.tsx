import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Student, DailyRecord, Role, ScheduleItem, SchoolSettings } from '../types';
import { CheckCircle, XCircle, AlertTriangle, Send, TrendingUp, Users, CalendarCheck, Clock, Check, FileText, UserX, X, User } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { AlertModal } from './AlertModal';
import { getChallengeLabel, getChallengeColor } from '../constants';

interface DashboardStatsProps {
  students: Student[];
  records?: Record<string, DailyRecord>;
  onSendReminder: (message: string) => void;
  role?: Role;
  completedSessions?: string[];
  schedule: ScheduleItem[]; // Prop is required now
  settings?: SchoolSettings; // Settings to get classGrades from
  onBulkReport?: (className: string) => void; // Function to navigate to reports page with class filter
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ students, records = {}, onSendReminder, role, completedSessions = [], schedule, settings, onBulkReport }) => {
  const { alert, alertModal } = useModal();
  const [showAbsentStudents, setShowAbsentStudents] = useState(false);
  const [showBehaviorAlerts, setShowBehaviorAlerts] = useState(false);
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Helper function to calculate performance score
  const calculatePerformanceScore = (status: string): number => {
    switch (status) {
      case 'excellent': return 5;
      case 'good': return 4;
      case 'average': return 3;
      case 'poor': return 1;
      case 'none': return 0;
      default: return 0;
    }
  };
  
  const getPerformanceLabel = (score: number): string => {
    if (score >= 4.5) return 'ممتاز';
    if (score >= 3.5) return 'جيد جداً';
    if (score >= 2.5) return 'جيد';
    if (score >= 1.5) return 'مقبول';
    return 'يحتاج تحسين';
  };
  
  const getPerformanceColor = (score: number): string => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-blue-600';
    if (score >= 2.5) return 'text-yellow-600';
    if (score >= 1.5) return 'text-orange-600';
    return 'text-red-600';
  };
  
  // Get today's records (with proper typing)
  const todayRecords = Object.values(records).filter((r): r is DailyRecord => {
    const record = r as DailyRecord;
    return record.date === today;
  });
  
  // Calculate attendance rate for today
  const totalTodayRecords = todayRecords.length;
  const presentCount = todayRecords.filter(r => r.attendance === 'present').length;
  const absentCount = todayRecords.filter(r => r.attendance === 'absent' || r.attendance === 'excused').length;
  const attendanceRate = totalTodayRecords > 0 
    ? Math.round((presentCount / totalTodayRecords) * 100) 
    : 0;
  const absenceRate = totalTodayRecords > 0
    ? Math.round((absentCount / totalTodayRecords) * 100)
    : 0;
  
  // Get absent students for today
  const absentStudentIds = todayRecords
    .filter(r => r.attendance === 'absent' || r.attendance === 'excused')
    .map(r => r.studentId);
  const absentStudents = students.filter(s => absentStudentIds.includes(s.id));
  
  // Calculate average performance for today
  let overallPerformanceScore = 0;
  if (totalTodayRecords > 0) {
    const validRecords = todayRecords.filter(r => r.attendance === 'present');
    if (validRecords.length > 0) {
      const participationAvg = validRecords.reduce((sum, r) => sum + calculatePerformanceScore(r.participation), 0) / validRecords.length;
      const homeworkAvg = validRecords.reduce((sum, r) => sum + calculatePerformanceScore(r.homework), 0) / validRecords.length;
      const behaviorAvg = validRecords.reduce((sum, r) => sum + calculatePerformanceScore(r.behavior), 0) / validRecords.length;
      overallPerformanceScore = (participationAvg + homeworkAvg + behaviorAvg) / 3;
    }
  }
  
  const overallPerformanceLabel = getPerformanceLabel(overallPerformanceScore);
  const overallPerformanceColor = getPerformanceColor(overallPerformanceScore);
  
  // Count behavior alerts (students with challenges)
  const behaviorAlertsCount = students.filter(s => s.challenge && s.challenge !== 'none').length;
  
  // Calculate weekly performance chart data from records
  const getWeekStartDate = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday as week start
    return new Date(d.setDate(diff));
  };
  
  const weekStart = getWeekStartDate(new Date());
  const daysOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  
  const weeklyData = daysOfWeek.map((dayName, index) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + index);
    const dateStr = dayDate.toISOString().split('T')[0];
    
    // Get records for this day (with proper typing)
    const dayRecords = Object.values(records).filter((r): r is DailyRecord => {
      const record = r as DailyRecord;
      return record.date === dateStr;
    });
    const validDayRecords = dayRecords.filter(r => r.attendance === 'present');
    
    let dayPerformance = 0;
    if (validDayRecords.length > 0) {
      const participationAvg = validDayRecords.reduce((sum, r) => sum + calculatePerformanceScore(r.participation), 0) / validDayRecords.length;
      const homeworkAvg = validDayRecords.reduce((sum, r) => sum + calculatePerformanceScore(r.homework), 0) / validDayRecords.length;
      const behaviorAvg = validDayRecords.reduce((sum, r) => sum + calculatePerformanceScore(r.behavior), 0) / validDayRecords.length;
      dayPerformance = ((participationAvg + homeworkAvg + behaviorAvg) / 3) * 20; // Convert to percentage (0-100)
    }
    
    return {
      name: dayName,
      performance: Math.round(dayPerformance)
    };
  });
  
  // Calculate average weekly performance
  const weeklyAverage = weeklyData.length > 0
    ? Math.round(weeklyData.reduce((sum, d) => sum + d.performance, 0) / weeklyData.length)
    : 0;

  // Logic to determine Class Readiness (Completion of Grading)
  const dayName = new Date().toLocaleDateString('ar-SA', { weekday: 'long' });
  
  // Use the passed schedule prop
  const todaysSessions = schedule.filter(s => s.day === dayName);
  
  // Get classes from settings only (not from schedule data)
  // Use classGrades from settings, but filter to only show classes that have sessions today
  const allClassesFromSettings = settings?.classGrades && settings.classGrades.length > 0
    ? [...settings.classGrades].sort()
    : [];
  
  // Get classes that have sessions today (for filtering)
  const classesWithSessionsToday = Array.from(new Set(todaysSessions.map(s => s.classRoom))) as string[];
  
  // Use classes from settings, but only show those that have sessions today
  // This ensures we only show classes defined in settings, and only if they have sessions
  const uniqueClasses = allClassesFromSettings.filter(className => 
    classesWithSessionsToday.some(sessionClass => 
      sessionClass === className || sessionClass.startsWith(className)
    )
  );
  
  const classStatus = uniqueClasses.map(className => {
      const classSessions = todaysSessions.filter(s => s.classRoom === className);
      const total = classSessions.length;
      const completedCount = classSessions.filter(s => completedSessions.includes(s.id)).length;
      
      // Determine responsible teachers with substitution info
      // Collect all teachers (original and substitute) with their substitution status
      interface TeacherInfo {
        name: string;
        isSubstituted: boolean;
        originalTeacher?: string;
      }
      
      const teacherMap = new Map<string, TeacherInfo>();
      
      classSessions.forEach(s => {
        if (s.isSubstituted && s.originalTeacher && s.teacher) {
          // Add original teacher
          if (!teacherMap.has(s.originalTeacher)) {
            teacherMap.set(s.originalTeacher, {
              name: s.originalTeacher,
              isSubstituted: false
            });
          }
          // Add substitute teacher
          if (!teacherMap.has(s.teacher)) {
            teacherMap.set(s.teacher, {
              name: s.teacher,
              isSubstituted: true,
              originalTeacher: s.originalTeacher
            });
          }
        } else if (s.teacher) {
          // Regular teacher (not substituted)
          if (!teacherMap.has(s.teacher)) {
            teacherMap.set(s.teacher, {
              name: s.teacher,
              isSubstituted: false
            });
          }
        }
      });
      
      const teachers: TeacherInfo[] = Array.from(teacherMap.values());

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
      alert({ message: `تم إرسال التذكير إلى ${teacherName} في نظام التواصل الداخلي.`, type: 'success' });
  };

  // Helper to get first teacher name for reminder
  const getFirstTeacherName = (teachers: Array<{ name: string; isSubstituted: boolean; originalTeacher?: string }>): string => {
      if (teachers.length === 0) return '';
      const firstTeacher = teachers[0];
      return firstTeacher.isSubstituted && firstTeacher.originalTeacher 
          ? firstTeacher.originalTeacher 
          : firstTeacher.name;
  };

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
            <div className="bg-white p-2 md:p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="min-w-0 flex-1">
                    <p className="text-gray-500 text-[9px] md:text-[10px] font-medium mb-0.5 truncate break-words whitespace-normal">إجمالي الطلاب</p>
                    <h4 className="text-lg md:text-xl font-bold text-gray-800">{students.length}</h4>
                </div>
                <div className="p-1.5 md:p-2 bg-teal-50 text-teal-600 rounded-lg flex-shrink-0">
                    <Users size={14} className="md:w-4 md:h-4" />
                </div>
            </div>
            
            <div className="bg-white p-2 md:p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="min-w-0 flex-1">
                    <p className="text-gray-500 text-[9px] md:text-[10px] font-medium mb-0.5 truncate break-words whitespace-normal">نسبة الحضور اليوم</p>
                    <h4 className="text-lg md:text-xl font-bold text-gray-800">
                      {totalTodayRecords > 0 ? `${attendanceRate}%` : '0%'}
                    </h4>
                    {totalTodayRecords === 0 && (
                      <p className="text-[8px] md:text-[10px] text-gray-400 mt-0.5">لا توجد بيانات</p>
                    )}
                </div>
                <div className="p-1.5 md:p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                    <CalendarCheck size={14} className="md:w-4 md:h-4" />
                </div>
            </div>
            
            <button
              onClick={() => setShowAbsentStudents(true)}
              className="bg-white p-2 md:p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
            >
                <div className="min-w-0 flex-1">
                    <p className="text-gray-500 text-[9px] md:text-[10px] font-medium mb-0.5 truncate break-words whitespace-normal">نسبة الغياب اليوم</p>
                    <h4 className="text-lg md:text-xl font-bold text-red-600">
                      {totalTodayRecords > 0 ? `${absenceRate}%` : '0%'}
                    </h4>
                    {totalTodayRecords > 0 && absentCount > 0 && (
                      <p className="text-[8px] md:text-[10px] text-gray-400 mt-0.5">{absentCount} طالب</p>
                    )}
                    {totalTodayRecords === 0 && (
                      <p className="text-[8px] md:text-[10px] text-gray-400 mt-0.5">لا توجد بيانات</p>
                    )}
                </div>
                <div className="p-1.5 md:p-2 bg-red-50 text-red-600 rounded-lg flex-shrink-0">
                    <UserX size={14} className="md:w-4 md:h-4" />
                </div>
            </button>

            <div className="bg-white p-2 md:p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="min-w-0 flex-1">
                    <p className="text-gray-500 text-[9px] md:text-[10px] font-medium mb-0.5 truncate break-words whitespace-normal">الأداء العام</p>
                    <h4 className={`text-base md:text-lg font-bold ${overallPerformanceColor} truncate`}>
                      {totalTodayRecords > 0 ? overallPerformanceLabel : 'لا توجد بيانات'}
                    </h4>
                    {totalTodayRecords > 0 && (
                      <p className="text-[8px] md:text-[10px] text-gray-400 mt-0.5">
                        {overallPerformanceScore.toFixed(1)}/5.0
                      </p>
                    )}
                </div>
                <div className="p-1.5 md:p-2 bg-green-50 text-green-600 rounded-lg flex-shrink-0">
                    <TrendingUp size={14} className="md:w-4 md:h-4" />
                </div>
            </div>

            <button
              onClick={() => {
                const studentsWithChallenges = students.filter(s => s.challenge && s.challenge !== 'none');
                if (studentsWithChallenges.length > 0) {
                  setShowBehaviorAlerts(true);
                } else {
                  alert({ message: 'لا توجد تنبيهات سلوك حالياً', type: 'info' });
                }
              }}
              className="bg-white p-2 md:p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
            >
                <div className="min-w-0 flex-1">
                    <p className="text-gray-500 text-[9px] md:text-[10px] font-medium mb-0.5 truncate break-words whitespace-normal">تنبيهات السلوك</p>
                    <h4 className="text-lg md:text-xl font-bold text-orange-500">{behaviorAlertsCount}</h4>
                    {behaviorAlertsCount === 0 && (
                      <p className="text-[8px] md:text-[10px] text-gray-400 mt-0.5">لا توجد تنبيهات</p>
                    )}
                </div>
                <div className="p-1.5 md:p-2 bg-orange-50 text-orange-600 rounded-lg flex-shrink-0">
                    <AlertTriangle size={14} className="md:w-4 md:h-4" />
                </div>
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-8">
            {/* Teachers Monitoring Table (Only for Admin) */}
            {role === 'admin' && (
                <div className="lg:col-span-2 bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-2 md:p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs md:text-sm font-bold text-gray-800 flex items-center gap-1 md:gap-1.5">
                                <Clock size={12} className="md:w-4 md:h-4 text-teal-600 flex-shrink-0" />
                                <span className="truncate break-words whitespace-normal">متابعة اكتمال الرصد اليومي ({dayName})</span>
                            </h3>
                            <p className="text-[9px] md:text-[10px] text-gray-500 mt-0.5 break-words whitespace-normal">يظهر الفصل "مكتمل" عند رصد جميع حصص الجدول الدراسي لهذا اليوم</p>
                        </div>
                    </div>
                    
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-right text-xs border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border-b border-gray-200">
                                <tr>
                                    <th className="px-3 py-2.5 font-bold text-[10px] border-r border-gray-200 first:rounded-tr-lg">الفصل</th>
                                    <th className="px-3 py-2.5 font-bold text-[10px] border-r border-gray-200">نسبة الإنجاز</th>
                                    <th className="px-3 py-2.5 font-bold text-[10px] border-r border-gray-200">حالة التقرير</th>
                                    <th className="px-3 py-2.5 font-bold text-[10px] last:rounded-tl-lg">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {classStatus.length > 0 ? classStatus.map((item, index) => (
                                    <tr key={item.className} className={`transition-all duration-200 border-b border-gray-100 last:border-b-0 ${item.isReady ? 'bg-green-50/30 hover:bg-green-50/50' : 'hover:bg-gray-50/80'}`}>
                                        <td className="px-3 py-2.5 font-bold text-gray-800 border-r border-gray-200">
                                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                <span className="text-[13px] font-semibold">{item.className}</span>
                                                {item.isReady && (
                                                    <span className="text-[8px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">تم الرصد</span>
                                                )}
                                                <span className="text-[9px] text-gray-500 font-normal flex items-center gap-1">
                                                    {item.teachers.map((teacherInfo, idx) => (
                                                        <span key={idx} className={`flex items-center gap-0.5 ${teacherInfo.isSubstituted ? 'text-purple-700 font-medium' : 'text-gray-600'}`}>
                                                            {idx > 0 && <span className="mx-0.5">•</span>}
                                                            <User size={9} className="flex-shrink-0 text-gray-400" />
                                                            {teacherInfo.isSubstituted && teacherInfo.originalTeacher 
                                                                ? `${teacherInfo.originalTeacher} (احتياط: ${teacherInfo.name})`
                                                                : teacherInfo.name}
                                                        </span>
                                                    ))}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 border-r border-gray-200">
                                            <div className="flex items-center gap-1.5">
                                                <div className="flex-1 h-2 bg-gray-200 rounded-full max-w-[60px] overflow-hidden shadow-inner">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${item.isReady ? 'bg-green-500' : 'bg-blue-500'}`} 
                                                        style={{ width: `${(item.progress / item.total) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-[9px] font-bold text-gray-600 whitespace-nowrap">
                                                    {item.progress}/{item.total}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 border-r border-gray-200">
                                            {item.isReady ? (
                                                <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full w-fit whitespace-nowrap shadow-sm border border-green-200">
                                                    <CheckCircle size={10} className="flex-shrink-0" />
                                                    <span className="font-bold text-[9px]">جاهز للإرسال</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-1 rounded-full w-fit whitespace-nowrap shadow-sm border border-gray-200">
                                                    <Clock size={10} className="flex-shrink-0" />
                                                    <span className="font-bold text-[9px]">جاري الرصد...</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {item.isReady ? (
                                                <button 
                                                    className="flex items-center gap-1 text-white bg-teal-600 hover:bg-teal-700 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                                                    onClick={() => {
                                                        if (onBulkReport) {
                                                            // Navigate to reports page with class filter
                                                            onBulkReport(item.className);
                                                        } else {
                                                            alert({ message: `سيتم توجيهك لصفحة إرسال التقارير الجماعية للفصل ${item.className}`, type: 'info' });
                                                        }
                                                    }}
                                                >
                                                    <Send size={10} className="rtl:rotate-180 flex-shrink-0"/>
                                                    <span>إرسال التقارير</span>
                                                </button>
                                            ) : (
                                                 <button 
                                                    onClick={() => handleReminderClick(getFirstTeacherName(item.teachers), item.className)}
                                                    className="flex items-center gap-1 text-orange-600 hover:text-white hover:bg-orange-500 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all duration-200 border border-orange-200 shadow-sm hover:shadow-md whitespace-nowrap"
                                                >
                                                    <Send size={10} className="rtl:rotate-180 flex-shrink-0"/>
                                                    <span>استعجال المعلمين</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-4 md:p-8 py-6 md:py-8 text-center text-gray-400 text-xs md:text-sm">لا توجد حصص مجدولة لهذا اليوم</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-2 p-3">
                        {classStatus.length > 0 ? classStatus.map((item) => (
                            <div key={item.className} className={`bg-white border rounded-xl p-3 shadow-sm transition-all duration-200 ${item.isReady ? 'border-green-200 bg-green-50/30' : 'border-gray-200 hover:shadow-md'}`}>
                                <div className="flex items-center justify-between mb-1.5 gap-2">
                                    <p className="font-bold text-gray-800 text-sm truncate flex-1">{item.className}</p>
                                    {item.isReady && (
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <span className="text-[9px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">تم الرصد</span>
                                            <CheckCircle size={12} className="text-green-600" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 mb-1.5 text-[9px] text-gray-500 flex-wrap">
                                    {item.teachers.map((teacherInfo, idx) => (
                                        <span key={idx} className={`flex items-center gap-0.5 ${teacherInfo.isSubstituted ? 'text-purple-700 font-medium' : 'text-gray-600'}`}>
                                            {idx > 0 && <span className="mx-0.5">•</span>}
                                            <User size={8} className="flex-shrink-0 text-gray-400" />
                                            {teacherInfo.isSubstituted && teacherInfo.originalTeacher 
                                                ? `${teacherInfo.originalTeacher} (احتياط: ${teacherInfo.name})`
                                                : teacherInfo.name}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${item.isReady ? 'bg-green-500' : 'bg-blue-500'}`} 
                                            style={{ width: `${(item.progress / item.total) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-[9px] font-bold text-gray-600 whitespace-nowrap">{item.progress}/{item.total}</span>
                                </div>
                                {item.isReady ? (
                                    <button 
                                        onClick={() => {
                                            if (onBulkReport) {
                                                onBulkReport(item.className);
                                            }
                                        }}
                                        className="w-full bg-teal-600 text-white py-1.5 rounded-lg text-[9px] font-bold hover:bg-teal-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-1 whitespace-nowrap"
                                    >
                                        <Send size={9} className="rtl:rotate-180 flex-shrink-0" />
                                        <span>إرسال التقارير</span>
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleReminderClick(getFirstTeacherName(item.teachers), item.className)}
                                        className="w-full text-orange-600 hover:text-white hover:bg-orange-500 py-1.5 rounded-lg text-[10px] font-bold transition-colors border border-orange-200 flex items-center justify-center gap-1"
                                    >
                                        <Send size={10} className="rtl:rotate-180 flex-shrink-0"/>
                                        <span>استعجال</span>
                                    </button>
                                )}
                            </div>
                        )) : (
                            <div className="p-6 text-center text-gray-400 text-xs">لا توجد حصص مجدولة لهذا اليوم</div>
                        )}
                    </div>
                </div>
            )}

            {/* Performance Chart (Takes up full width if not admin) */}
            <div className={`bg-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden ${role !== 'admin' ? 'lg:col-span-3' : ''}`}>
                <div className="flex justify-between items-center mb-3 md:mb-6">
                    <h3 className="text-sm md:text-lg font-bold text-gray-800">تحليل الأداء الأسبوعي</h3>
                </div>
                <div className="flex-1 min-h-[200px] md:min-h-[250px] w-full overflow-hidden">
                    {/* Give ResponsiveContainer an explicit height to avoid width/height -1 warnings */}
                    <ResponsiveContainer width="100%" height={200} className="md:h-[250px]">
                        <AreaChart 
                            data={weeklyData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                        >
                            <defs>
                                <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid 
                                strokeDasharray="3 3" 
                                vertical={false} 
                                stroke="#e5e7eb" 
                                strokeWidth={1}
                            />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 11, fill: '#6b7280', fontWeight: 500}} 
                                dy={10}
                                padding={{ left: 5, right: 5 }}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 11, fill: '#6b7280', fontWeight: 500}}
                                width={45}
                                domain={[0, 100]}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    borderRadius: '12px', 
                                    border: '1px solid #e5e7eb', 
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                    backgroundColor: '#ffffff',
                                    padding: '8px 12px',
                                    direction: 'rtl',
                                    textAlign: 'right'
                                }}
                                cursor={{ stroke: '#0d9488', strokeWidth: 1, strokeDasharray: '4 4' }}
                                labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '4px' }}
                                formatter={(value: number) => [`${value}%`, 'الأداء']}
                                labelFormatter={(label) => `اليوم: ${label}`}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="performance" 
                                stroke="#0d9488" 
                                strokeWidth={2.5}
                                fillOpacity={1} 
                                fill="url(#colorPerf)"
                                dot={{ fill: '#0d9488', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, stroke: '#0d9488', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-3 md:mt-4 text-center">
                    <p className="text-xs md:text-sm text-gray-500">
                      متوسط الأداء لهذا الأسبوع{' '}
                      <span className="text-teal-600 font-bold">
                        {weeklyAverage}%
                      </span>
                      {weeklyAverage === 0 && (
                        <span className="text-gray-400 text-xs block mt-1">
                          (لا توجد بيانات كافية)
                        </span>
                      )}
                    </p>
                </div>
            </div>
        </div>
        
        {/* Alert Modal */}
        {alertModal.isOpen && alertModal.options && (
          <AlertModal
            isOpen={alertModal.isOpen}
            message={alertModal.options.message}
            type={alertModal.options.type || 'info'}
            duration={alertModal.options.duration || 3000}
            onClose={alertModal.onClose}
          />
        )}

        {/* Absent Students Modal */}
        {showAbsentStudents && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-red-600 p-4 md:p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <UserX size={24} />
                  <div>
                    <h3 className="text-lg md:text-xl font-bold">الطلاب الغائبين اليوم</h3>
                    <p className="text-sm text-red-100 mt-1">{absentCount} طالب</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAbsentStudents(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {absentStudents.length > 0 ? (
                  <div className="space-y-2">
                    {absentStudents.map((student) => {
                      const record = todayRecords.find(r => r.studentId === student.id);
                      return (
                        <div
                          key={student.id}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3 md:p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-800 text-sm md:text-base truncate">
                              {student.name}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-xs md:text-sm text-gray-600">
                              <span className="truncate">{student.classGrade || 'غير محدد'}</span>
                              {student.studentNumber && (
                                <span className="text-gray-400">#{student.studentNumber}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-3 py-1 rounded-full text-xs md:text-sm font-bold ${
                              record?.attendance === 'excused' 
                                ? 'bg-yellow-100 text-yellow-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {record?.attendance === 'excused' ? 'مسأذن' : 'غائب'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <UserX size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-bold">لا يوجد طلاب غائبين اليوم</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Behavior Alerts Modal */}
        {showBehaviorAlerts && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4 overflow-y-auto"
            onClick={(e) => e.target === e.currentTarget && setShowBehaviorAlerts(false)}
            style={{ touchAction: 'none' }}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] my-auto overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-orange-600 p-4 md:p-6 text-white flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                  <AlertTriangle size={20} className="md:w-6 md:h-6 flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-base md:text-xl font-bold">تنبيهات السلوك</h3>
                    <p className="text-xs md:text-sm text-orange-100 mt-1">{behaviorAlertsCount} طالب</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBehaviorAlerts(false)}
                  className="p-1.5 md:p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                >
                  <X size={18} className="md:w-5 md:h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
                {students.filter(s => s.challenge && s.challenge !== 'none').length > 0 ? (
                  <div className="space-y-2">
                    {students
                      .filter(s => s.challenge && s.challenge !== 'none')
                      .map((student) => (
                        <div
                          key={student.id}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3 md:p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-800 text-sm md:text-base truncate">
                              {student.name}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-xs md:text-sm text-gray-600">
                              <span className="truncate">{student.classGrade || 'غير محدد'}</span>
                              {student.studentNumber && (
                                <span className="text-gray-400">#{student.studentNumber}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-3 py-1 rounded-full text-xs md:text-sm font-bold ${getChallengeColor(student.challenge)}`}>
                              {getChallengeLabel(student.challenge)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertTriangle size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-bold">لا توجد تنبيهات سلوك حالياً</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};