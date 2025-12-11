
import React, { useState } from 'react';
import { ScheduleItem, Role, Subject, SchoolSettings } from '../types';
import { Calendar, Clock, Check, AlertTriangle, Lock, UserPlus, X, RefreshCw, Filter, ChevronDown, User, BookOpen, CheckCircle, Printer } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

interface TeacherScheduleProps {
  schedule: ScheduleItem[];
  completedSessions?: string[]; 
  onAssignSubstitute?: (scheduleId: string, teacher: string) => void;
  onRemoveSubstitute?: (scheduleId: string) => void; // Function to remove substitute assignment
  role?: Role;
  availableTeachers?: string[]; // Dynamic list of teachers
  subjects?: Subject[]; // List of subjects for filtering
  onUpdateSchedule?: (schedule: ScheduleItem[]) => void;
  settings?: SchoolSettings; // Settings to get classGrades from
  onSessionEnter?: (session: ScheduleItem) => void; // For teacher to enter session tracking
}

export const TeacherSchedule: React.FC<TeacherScheduleProps> = ({ schedule, completedSessions = [], onAssignSubstitute, onRemoveSubstitute, role, availableTeachers = [], subjects = [], onUpdateSchedule, settings, onSessionEnter }) => {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const periods = [1, 2, 3, 4, 5, 6, 7];
  const [selectedSessionForSub, setSelectedSessionForSub] = useState<ScheduleItem | null>(null);
  
  // Filters for Admin
  const [filterType, setFilterType] = useState<'all' | 'teacher' | 'class' | 'subject'>('all');
  const [filterValue, setFilterValue] = useState<string>('');

  // Extract unique values for filters
  const uniqueTeachers = Array.from(new Set(schedule.map(s => s.teacher || s.originalTeacher || ''))).filter(Boolean).sort();
  // Use classGrades from settings only (not from schedule data)
  const uniqueClasses = settings?.classGrades && settings.classGrades.length > 0
    ? [...settings.classGrades].sort()
    : [];
  const uniqueSubjects = Array.from(new Set(schedule.map(s => s.subject))).sort();

  // Get sessions based on filters
  const getSessions = (day: string, period: number) => {
    let sessions = schedule.filter(s => s.day === day && s.period === period);
    
    if (role === 'admin' && filterType !== 'all' && filterValue) {
        if (filterType === 'teacher') {
            sessions = sessions.filter(s => s.teacher === filterValue || s.originalTeacher === filterValue);
        } else if (filterType === 'class') {
            // Filter by classGrade from settings - match if classRoom starts with or equals the selected classGrade
            sessions = sessions.filter(s => {
                const classRoom = s.classRoom || '';
                return classRoom === filterValue || classRoom.startsWith(filterValue + '/') || classRoom.startsWith(filterValue + '_');
            });
        } else if (filterType === 'subject') {
            sessions = sessions.filter(s => s.subject === filterValue);
        }
    }
    
    return sessions;
  };

  const isSessionTracked = (sessionId: string) => completedSessions.includes(sessionId);

  const getSessionStyle = (session: ScheduleItem) => {
      if (session.isSubstituted) {
         return 'bg-purple-50 border-purple-300 text-purple-900 shadow-sm ring-1 ring-purple-200';
      }
      if (completedSessions.includes(session.id)) {
          return 'bg-gradient-to-br from-green-50 to-green-100 border-green-300 text-green-800 shadow-sm';
      }
      return 'bg-white border-red-200 text-red-800 hover:bg-red-50 hover:border-red-300 shadow-sm cursor-pointer';
  };

  const handleSessionClick = (session: ScheduleItem) => {
      if (role === 'admin' && onAssignSubstitute) {
          setSelectedSessionForSub(session);
      } else if (role === 'teacher' && onSessionEnter) {
          // Teacher clicks to enter session tracking
          onSessionEnter(session);
      }
  };

  // Check if schedule is empty
  if (!schedule || schedule.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-in fade-in relative">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar size={64} className="text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            {role === 'admin' ? 'لا يوجد جداول دراسية' : 'لا يوجد جدول دراسي'}
          </h3>
          <p className="text-gray-500 max-w-md">
            {role === 'admin' 
              ? 'لم يتم إعداد الجداول الدراسية بعد. يرجى الذهاب إلى الإعدادات لإضافة الجداول الدراسية.'
              : 'لم يتم إعداد جدول دراسي لك بعد. يرجى التواصل مع مدير النظام.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-3 md:p-6 lg:p-8 animate-in fade-in relative">
      
      {/* Substitute Modal */}
      {selectedSessionForSub && onAssignSubstitute && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 md:p-4 overflow-y-auto"
            onClick={(e) => e.target === e.currentTarget && setSelectedSessionForSub(null)}
            style={{ touchAction: 'none' }}
            onTouchMove={(e) => e.stopPropagation()}
          >
              <div 
                className="bg-white rounded-xl shadow-2xl p-4 md:p-6 w-full max-w-md my-auto animate-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                  <div className="flex justify-between items-start mb-3 md:mb-4">
                      <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base md:text-lg text-gray-800">إسناد حصة احتياط</h3>
                          <p className="text-xs md:text-sm text-gray-500 mt-1 truncate">
                              الحصة {selectedSessionForSub.period} - {selectedSessionForSub.subject} ({selectedSessionForSub.classRoom})
                          </p>
                      </div>
                      <button onClick={() => setSelectedSessionForSub(null)} className="text-gray-400 hover:text-red-500 flex-shrink-0 p-1">
                          <X size={18} className="md:w-5 md:h-5" />
                      </button>
                  </div>

                  <div className="mb-3 md:mb-4 bg-gray-50 p-2.5 md:p-3 rounded-lg border border-gray-200 text-xs md:text-sm">
                      <p className="font-bold text-gray-600 mb-1">المعلم الأساسي:</p>
                      <p className="text-red-600 font-bold truncate">{selectedSessionForSub.originalTeacher || selectedSessionForSub.teacher}</p>
                      {selectedSessionForSub.isSubstituted && selectedSessionForSub.teacher && selectedSessionForSub.originalTeacher && (
                          <div className="mt-2 pt-2 border-t border-gray-300">
                              <p className="font-bold text-gray-600 mb-1">المعلم البديل الحالي:</p>
                              <p className="text-purple-600 font-bold truncate">{selectedSessionForSub.teacher}</p>
                          </div>
                      )}
                  </div>

                  {/* Show remove substitute button if session is already substituted */}
                  {selectedSessionForSub.isSubstituted && selectedSessionForSub.originalTeacher && onRemoveSubstitute && (
                      <div className="mb-4 md:mb-6">
                          <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  if (onRemoveSubstitute) {
                                      onRemoveSubstitute(selectedSessionForSub.id);
                                      setSelectedSessionForSub(null);
                                  }
                              }}
                              className="w-full bg-red-600 text-white py-2.5 md:py-3 rounded-lg font-bold hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                          >
                              <X size={16} />
                              <span>إلغاء الإسناد وإرجاع الحصة للمعلم الأساسي</span>
                          </button>
                      </div>
                  )}

                  <div className="mb-4 md:mb-6">
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">اختر المعلم البديل (المكلف):</label>
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                          {(() => {
                              // Get original teacher and current substitute (if any)
                              const originalTeacher = selectedSessionForSub.originalTeacher || selectedSessionForSub.teacher;
                              const currentSubstitute = selectedSessionForSub.isSubstituted ? selectedSessionForSub.teacher : null;
                              
                              // Filter teachers: exclude both original teacher and current substitute
                              const availableSubstitutes = availableTeachers.filter(t => {
                                  // Exclude original teacher
                                  if (t === originalTeacher) return false;
                                  // Exclude current substitute if exists
                                  if (currentSubstitute && t === currentSubstitute) return false;
                                  return true;
                              });
                              
                              // Filter by availability: teacher should not have a session at the same time
                              const availableAtTime = availableSubstitutes.filter(teacher => {
                                  // Check if this teacher has a session at the same day and period
                                  const hasConflict = schedule.some(s => 
                                      s.day === selectedSessionForSub.day && 
                                      s.period === selectedSessionForSub.period &&
                                      (s.teacher === teacher || s.originalTeacher === teacher) &&
                                      s.id !== selectedSessionForSub.id
                                  );
                                  return !hasConflict;
                              });
                              
                              return availableAtTime.length > 0 ? availableAtTime : availableSubstitutes;
                          })().map(teacher => (
                              <button
                                key={teacher}
                                onClick={() => {
                                    onAssignSubstitute(selectedSessionForSub.id, teacher);
                                    setSelectedSessionForSub(null);
                                }}
                                className="text-right px-3 md:px-4 py-2 rounded-lg border border-gray-200 hover:bg-teal-50 hover:border-teal-500 hover:text-teal-700 transition-colors text-xs md:text-sm font-bold flex items-center justify-between group"
                              >
                                  {teacher}
                                  <UserPlus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                          ))}
                      </div>
                      {(() => {
                          const originalTeacher = selectedSessionForSub.originalTeacher || selectedSessionForSub.teacher;
                          const currentSubstitute = selectedSessionForSub.isSubstituted ? selectedSessionForSub.teacher : null;
                          
                          // Filter teachers: exclude both original teacher and current substitute
                          const availableSubstitutes = availableTeachers.filter(t => {
                              if (t === originalTeacher) return false;
                              if (currentSubstitute && t === currentSubstitute) return false;
                              return true;
                          });
                          
                          const availableAtTime = availableSubstitutes.filter(teacher => {
                              const hasConflict = schedule.some(s => 
                                  s.day === selectedSessionForSub.day && 
                                  s.period === selectedSessionForSub.period &&
                                  (s.teacher === teacher || s.originalTeacher === teacher) &&
                                  s.id !== selectedSessionForSub.id
                              );
                              return !hasConflict;
                          });
                          
                          if (availableAtTime.length === 0 && availableSubstitutes.length > 0) {
                              return (
                                  <p className="text-xs text-yellow-600 mt-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                                      ⚠️ جميع المعلمين المتاحين لديهم حصص في نفس الوقت
                                  </p>
                              );
                          }
                          return null;
                      })()}
                  </div>
                  
                  <button 
                    onClick={() => setSelectedSessionForSub(null)}
                    className="w-full bg-gray-100 text-gray-600 py-2 rounded-lg font-bold hover:bg-gray-200"
                  >
                      إلغاء
                  </button>
              </div>
          </div>
      )}

      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                    <Calendar size={28} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {role === 'admin' && filterType === 'teacher' && filterValue
                            ? `جدول ${filterValue}`
                            : role === 'admin' 
                            ? 'الجدول الدراسي العام' 
                            : 'جدولي الدراسي'}
                    </h2>
                    {role === 'admin' && filterType === 'teacher' && filterValue ? (
                        <div className="mt-1">
                            <span className="inline-block bg-blue-50/60 text-blue-600 font-semibold px-2.5 py-1 rounded-md border border-blue-100 text-xs md:text-sm">
                                النصاب: {schedule.filter(s => (s.teacher === filterValue || s.originalTeacher === filterValue) && !s.isSubstituted).length} حصة
                            </span>
                        </div>
                    ) : role === 'admin' 
                        ? <p className="text-gray-500">نظرة شاملة على جميع الحصص الدراسية</p>
                        : (
                            <div className="mt-1">
                                <span className="inline-block bg-blue-50/60 text-blue-600 font-semibold px-2.5 py-1 rounded-md border border-blue-100 text-xs md:text-sm">
                                    النصاب: {schedule.filter(s => !s.isSubstituted).length} حصة - الحصص المسندة إليك خلال الأسبوع
                                </span>
                            </div>
                        )}
                </div>
            </div>
            
            {/* Print Button & Legend */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-bold shadow-md text-xs md:text-sm print:hidden"
                >
                    <Printer size={16} />
                    <span>طباعة الجدول</span>
                </button>
                <div className="flex items-center gap-4 text-xs font-bold bg-gray-50 p-3 rounded-lg border border-gray-200 self-start md:self-center print:hidden">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 ring-4 ring-green-100"></span>
                        <span className="text-gray-700">تم الدخول</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500 ring-4 ring-purple-100"></span>
                        <span className="text-gray-700">احتياط</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 ring-4 ring-red-100"></span>
                        <span className="text-gray-700">معلق</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Admin Filters */}
        {role === 'admin' && (
            <div className="bg-white p-2 md:p-3 rounded-lg border border-gray-100 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    {/* Filter Icon & Label */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <Filter size={12} className="text-teal-600 flex-shrink-0" />
                        <span className="font-medium text-gray-700 text-[10px] md:text-xs">الفلاتر:</span>
                    </div>
                    
                    {/* Filter Type Buttons */}
                    <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                        <button 
                            onClick={() => { setFilterType('all'); setFilterValue(''); }}
                            className={`px-2 py-1 rounded-md text-[10px] md:text-xs font-medium transition-colors ${filterType === 'all' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                        >
                            الكل
                        </button>
                        <button 
                            onClick={() => { 
                                setFilterType('teacher'); 
                                setFilterValue(uniqueTeachers[0] || ''); 
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] md:text-xs font-medium transition-colors ${filterType === 'teacher' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                        >
                            المعلم
                        </button>
                        <button 
                            onClick={() => { 
                                setFilterType('class'); 
                                setFilterValue(uniqueClasses[0] || ''); 
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] md:text-xs font-medium transition-colors ${filterType === 'class' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                        >
                            الفصل
                        </button>
                        <button 
                            onClick={() => { 
                                setFilterType('subject'); 
                                setFilterValue(uniqueSubjects[0] || ''); 
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] md:text-xs font-medium transition-colors ${filterType === 'subject' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                        >
                            المادة
                        </button>
                    </div>

                    {/* Filter Value Select */}
                    {filterType !== 'all' && (
                        <div className="w-[120px] md:w-[180px] flex-shrink-0">
                            <CustomSelect
                                value={filterValue}
                                onChange={(value) => setFilterValue(value)}
                                options={
                                    filterType === 'teacher' 
                                        ? uniqueTeachers.map(t => ({ value: t, label: t }))
                                        : filterType === 'class'
                                        ? uniqueClasses.map(c => ({ value: c, label: c }))
                                        : uniqueSubjects.map(s => ({ value: s, label: s }))
                                }
                                placeholder={`اختر ${filterType === 'teacher' ? 'المعلم' : filterType === 'class' ? 'الفصل' : 'المادة'}`}
                                className="w-full text-[10px] md:text-xs"
                            />
                        </div>
                    )}

                    {/* Quick Navigation Buttons */}
                    {filterType !== 'all' && filterValue && (
                        <div className="flex gap-1 flex-shrink-0">
                            <button
                                onClick={() => {
                                    if (filterType === 'teacher') {
                                        const currentIndex = uniqueTeachers.indexOf(filterValue);
                                        const prevIndex = currentIndex > 0 ? currentIndex - 1 : uniqueTeachers.length - 1;
                                        setFilterValue(uniqueTeachers[prevIndex]);
                                    } else if (filterType === 'class') {
                                        const currentIndex = uniqueClasses.indexOf(filterValue);
                                        const prevIndex = currentIndex > 0 ? currentIndex - 1 : uniqueClasses.length - 1;
                                        setFilterValue(uniqueClasses[prevIndex]);
                                    } else if (filterType === 'subject') {
                                        const currentIndex = uniqueSubjects.indexOf(filterValue);
                                        const prevIndex = currentIndex > 0 ? currentIndex - 1 : uniqueSubjects.length - 1;
                                        setFilterValue(uniqueSubjects[prevIndex]);
                                    }
                                }}
                                className="px-2 py-1 bg-white border border-gray-300 rounded-md text-[10px] md:text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                title="السابق"
                            >
                                ←
                            </button>
                            <button
                                onClick={() => {
                                    if (filterType === 'teacher') {
                                        const currentIndex = uniqueTeachers.indexOf(filterValue);
                                        const nextIndex = currentIndex < uniqueTeachers.length - 1 ? currentIndex + 1 : 0;
                                        setFilterValue(uniqueTeachers[nextIndex]);
                                    } else if (filterType === 'class') {
                                        const currentIndex = uniqueClasses.indexOf(filterValue);
                                        const nextIndex = currentIndex < uniqueClasses.length - 1 ? currentIndex + 1 : 0;
                                        setFilterValue(uniqueClasses[nextIndex]);
                                    } else if (filterType === 'subject') {
                                        const currentIndex = uniqueSubjects.indexOf(filterValue);
                                        const nextIndex = currentIndex < uniqueSubjects.length - 1 ? currentIndex + 1 : 0;
                                        setFilterValue(uniqueSubjects[nextIndex]);
                                    }
                                }}
                                className="px-2 py-1 bg-white border border-gray-300 rounded-md text-[10px] md:text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                title="التالي"
                            >
                                →
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Desktop Schedule */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-300 bg-white shadow-sm">
        <table className="w-full border-collapse text-xs table-fixed">
          <colgroup>
            <col className="w-[12%]" />
            {periods.map(() => <col key={Math.random()} className="w-[12.5%]" />)}
          </colgroup>
          <thead>
            <tr>
              <th className="p-2 bg-gray-50 border border-gray-300 text-right font-bold text-gray-800 text-xs sticky right-0 z-20">اليوم</th>
              {periods.map(p => (
                <th key={p} className="p-2 bg-gray-50 border border-gray-300 text-center font-bold text-gray-800">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs">ح {p}</span>
                    <span className="text-[9px] font-normal text-gray-600 flex items-center gap-0.5 bg-white px-1 py-0.5 rounded border border-gray-300">
                      <Clock size={8} /> 45د
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day} className="hover:bg-gray-50/50 transition-all duration-200">
                <td className="p-2 border border-gray-300 font-bold text-gray-800 bg-gray-50 sticky right-0 z-10 text-xs border-r-2 border-r-gray-400">{day}</td>
                {periods.map(period => {
                  const sessions = getSessions(day, period);
                  
                  return (
                    <td key={`${day}-${period}`} className="p-1 border border-gray-300 align-top min-h-[90px] bg-white">
                      {sessions.length > 0 ? (
                        <div className="flex flex-col gap-1">
                            {sessions.map((session, idx) => {
                                const isCompleted = completedSessions.includes(session.id);
                                return (
                                    <div 
                                        key={session.id}
                                        onClick={() => handleSessionClick(session)}
                                        className={`border border-gray-300 rounded-lg p-1.5 transition-all duration-300 relative group shadow-sm text-[9px] ${getSessionStyle(session)} ${isCompleted ? 'border-green-400 shadow-green-200/50 hover:shadow-green-300/70' : session.isSubstituted ? 'border-purple-400 shadow-purple-200/50 hover:shadow-purple-300/70' : 'border-red-400 shadow-red-200/50 hover:shadow-red-300/70'} ${(role === 'admin' || role === 'teacher') ? 'cursor-pointer hover:scale-[1.02]' : ''} hover:shadow-lg hover:border-opacity-80`}
                                    >
                                        <div className="flex justify-between items-start mb-0.5 gap-1">
                                            <span className="font-bold line-clamp-1 text-[9px] leading-tight flex-1">{session.subject}</span>
                                            {isCompleted && (
                                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                                    <span className="text-[7px] font-bold text-green-600 bg-green-100 px-1 py-0.5 rounded">تم الرصد</span>
                                                    <Check size={8} className="text-green-600"/>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-0.5">
                                            {session.isSubstituted && session.originalTeacher ? (
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-0.5">
                                                        <User size={7} className="flex-shrink-0" />
                                                        <span className="truncate text-[8px] font-bold leading-tight">
                                                            {session.originalTeacher}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        <RefreshCw size={7} className="text-purple-600 flex-shrink-0" />
                                                        <span className="truncate text-[7px] font-medium text-purple-700 leading-tight">
                                                            احتياط: {session.teacher}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-0.5">
                                                    <User size={7} className="flex-shrink-0" />
                                                    <span className="truncate text-[8px] leading-tight">
                                                        {session.teacher}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-0.5">
                                                <BookOpen size={7} className="flex-shrink-0" />
                                                <span className="text-[8px] leading-tight truncate">{session.classRoom}</span>
                                            </div>
                                        </div>

                                        {role === 'admin' && !session.isSubstituted && !isCompleted && (
                                            <div className="absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-gray-800 text-white text-[7px] px-1 py-0.5 rounded cursor-pointer">بديل</div>
                                            </div>
                                        )}
                                        {role === 'admin' && session.isSubstituted && session.originalTeacher && onRemoveSubstitute && (
                                            <div className="absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        if (onRemoveSubstitute) {
                                                            onRemoveSubstitute(session.id);
                                                        }
                                                    }}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    className="bg-red-600 text-white text-[7px] px-1 py-0.5 rounded cursor-pointer hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="التراجع عن الإسناد"
                                                    type="button"
                                                >
                                                    إلغاء
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                      ) : (
                        <div className="h-full min-h-[70px] border border-dashed border-gray-300 rounded-xl flex items-center justify-center opacity-40">
                          <Lock size={12} className="text-gray-300" />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Schedule - Simplified List */}
      <div className="md:hidden space-y-4">
        {days.map(day => {
          const daySessions = schedule.filter(s => s.day === day).sort((a, b) => a.period - b.period);
          if (daySessions.length === 0) return null;
          
          return (
            <div key={day} className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
              <h3 className="font-bold text-gray-800 mb-3 text-base md:text-lg">{day}</h3>
              <div className="space-y-2">
                {daySessions.map(session => {
                  const isCompleted = completedSessions.includes(session.id);
                  return (
                    <div key={session.id} className={`p-2.5 md:p-3 rounded-lg border ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <span className="text-[10px] md:text-xs bg-gray-200 px-2 py-1 rounded font-bold text-gray-600">حصة {session.period}</span>
                        {isCompleted && <CheckCircle size={14} className="text-green-600 flex-shrink-0 md:w-4 md:h-4" />}
                      </div>
                      <p className="font-bold text-blue-800 mb-1 text-sm md:text-base">{session.subject}</p>
                      <p className="text-xs md:text-sm text-gray-600">{session.classRoom}</p>
                      {session.isSubstituted && session.originalTeacher ? (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-[10px] md:text-xs text-gray-700 font-bold">المعلم: {session.originalTeacher}</p>
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1">
                              <RefreshCw size={10} className="text-purple-600" />
                              <p className="text-[10px] md:text-xs text-purple-700 font-medium">احتياط: {session.teacher}</p>
                            </div>
                            {role === 'admin' && onRemoveSubstitute && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  if (onRemoveSubstitute) {
                                    onRemoveSubstitute(session.id);
                                  }
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="text-red-600 hover:text-red-700 text-[9px] md:text-xs font-bold px-1.5 py-0.5 rounded border border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="التراجع عن الإسناد"
                                type="button"
                              >
                                إلغاء
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] md:text-xs text-gray-700 mt-1 font-bold">المعلم: {session.teacher}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
