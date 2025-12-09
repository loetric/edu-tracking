
import React, { useState } from 'react';
import { ScheduleItem, Role, Subject } from '../types';
import { Calendar, Clock, Check, AlertTriangle, Lock, UserPlus, X, RefreshCw, Filter, ChevronDown, User, BookOpen, CheckCircle } from 'lucide-react';

interface TeacherScheduleProps {
  schedule: ScheduleItem[];
  completedSessions?: string[]; 
  onAssignSubstitute?: (scheduleId: string, teacher: string) => void;
  role?: Role;
  availableTeachers?: string[]; // Dynamic list of teachers
}

export const TeacherSchedule: React.FC<TeacherScheduleProps> = ({ schedule, completedSessions = [], onAssignSubstitute, role, availableTeachers = [], subjects = [], onUpdateSchedule }) => {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const periods = [1, 2, 3, 4, 5, 6];
  const [selectedSessionForSub, setSelectedSessionForSub] = useState<ScheduleItem | null>(null);
  
  // Filters for Admin
  const [filterType, setFilterType] = useState<'all' | 'teacher' | 'class' | 'subject'>('all');
  const [filterValue, setFilterValue] = useState<string>('');

  // Extract unique values for filters
  const uniqueTeachers = Array.from(new Set(schedule.map(s => s.teacher || s.originalTeacher || ''))).filter(Boolean).sort();
  const uniqueClasses = Array.from(new Set(schedule.map(s => s.classRoom))).sort();
  const uniqueSubjects = Array.from(new Set(schedule.map(s => s.subject))).sort();

  // Get sessions based on filters
  const getSessions = (day: string, period: number) => {
    let sessions = schedule.filter(s => s.day === day && s.period === period);
    
    if (role === 'admin' && filterType !== 'all' && filterValue) {
        if (filterType === 'teacher') {
            sessions = sessions.filter(s => s.teacher === filterValue || s.originalTeacher === filterValue);
        } else if (filterType === 'class') {
            sessions = sessions.filter(s => s.classRoom === filterValue);
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
      if (onAssignSubstitute && role === 'admin') {
          setSelectedSessionForSub(session);
      }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-in fade-in relative">
      
      {/* Substitute Modal */}
      {selectedSessionForSub && onAssignSubstitute && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-96 animate-in zoom-in-95">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <h3 className="font-bold text-lg text-gray-800">إسناد حصة احتياط</h3>
                          <p className="text-sm text-gray-500 mt-1">
                              الحصة {selectedSessionForSub.period} - {selectedSessionForSub.subject} ({selectedSessionForSub.classRoom})
                          </p>
                      </div>
                      <button onClick={() => setSelectedSessionForSub(null)} className="text-gray-400 hover:text-red-500">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
                      <p className="font-bold text-gray-600 mb-1">المعلم الأساسي:</p>
                      <p className="text-red-600 font-bold">{selectedSessionForSub.originalTeacher || selectedSessionForSub.teacher}</p>
                  </div>

                  <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">اختر المعلم البديل (المكلف):</label>
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                          {availableTeachers.filter(t => t !== (selectedSessionForSub.originalTeacher || selectedSessionForSub.teacher)).map(teacher => (
                              <button
                                key={teacher}
                                onClick={() => {
                                    onAssignSubstitute(selectedSessionForSub.id, teacher);
                                    setSelectedSessionForSub(null);
                                }}
                                className="text-right px-4 py-2 rounded-lg border border-gray-200 hover:bg-teal-50 hover:border-teal-500 hover:text-teal-700 transition-colors text-sm font-bold flex items-center justify-between group"
                              >
                                  {teacher}
                                  <UserPlus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                          ))}
                      </div>
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
                        {role === 'admin' ? 'الجدول الدراسي العام' : 'جدولي الدراسي'}
                    </h2>
                    <p className="text-gray-500">
                        {role === 'admin' 
                            ? 'نظرة شاملة على جميع الحصص الدراسية' 
                            : 'الحصص المسندة إليك خلال الأسبوع'}
                    </p>
                </div>
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-bold bg-gray-50 p-3 rounded-lg border border-gray-200 self-start md:self-center">
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

        {/* Admin Filters */}
        {role === 'admin' && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-4 items-center animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-gray-600 font-bold text-sm">
                    <Filter size={18} />
                    <span>تصفية العرض حسب:</span>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                    <button 
                        onClick={() => { setFilterType('all'); setFilterValue(''); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterType === 'all' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                    >
                        الكل
                    </button>
                    <button 
                        onClick={() => { setFilterType('teacher'); setFilterValue(uniqueTeachers[0] || ''); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterType === 'teacher' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                    >
                        المعلم
                    </button>
                    <button 
                        onClick={() => { setFilterType('class'); setFilterValue(uniqueClasses[0] || ''); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterType === 'class' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                    >
                        الصف
                    </button>
                </div>

                {filterType !== 'all' && (
                    <div className="relative flex-1 w-full">
                        <ChevronDown className="absolute top-3 right-3 text-gray-400 pointer-events-none" size={16} />
                        <select
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            className="w-full bg-white border-gray-300 rounded-lg py-2 pl-4 pr-10 text-sm font-bold focus:ring-teal-500 focus:border-teal-500 appearance-none border"
                        >
                            {filterType === 'teacher' 
                                ? uniqueTeachers.map(t => <option key={t} value={t}>{t}</option>)
                                : uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)
                            }
                        </select>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Desktop Schedule */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-4 bg-gray-50 border-b border-gray-200 text-right min-w-[100px] font-bold text-gray-700">اليوم</th>
              {periods.map(p => (
                <th key={p} className="p-4 bg-gray-50 border-b border-gray-200 border-r border-gray-100 text-center font-bold text-gray-700 min-w-[160px]">
                  <div className="flex flex-col items-center">
                    <span className="text-sm">الحصة {p}</span>
                    <span className="text-[10px] font-normal text-gray-400 mt-1 flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                      <Clock size={10} /> 45 دقيقة
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day} className="hover:bg-gray-50/30 transition-colors">
                <td className="p-2 md:p-4 border-b border-gray-200 font-bold text-gray-800 bg-white sticky right-0 z-10 text-xs md:text-sm">{day}</td>
                {periods.map(period => {
                  const sessions = getSessions(day, period);
                  
                  return (
                    <td key={`${day}-${period}`} className="p-1 md:p-2 border-b border-r border-gray-100 align-top h-24 md:h-32 w-32 md:w-40 bg-gray-50/10">
                      {sessions.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {sessions.map((session, idx) => {
                                const isCompleted = completedSessions.includes(session.id);
                                return (
                                    <div 
                                        key={session.id}
                                        onClick={() => role === 'admin' && handleSessionClick(session)}
                                        className={`border-l-4 p-2 rounded-r-lg transition-all relative group shadow-sm text-xs ${getSessionStyle(session)} ${isCompleted ? 'border-l-green-500' : session.isSubstituted ? 'border-l-purple-500' : 'border-l-red-400'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold line-clamp-1">{session.subject}</span>
                                            {isCompleted && <Check size={10} className="text-green-600"/>}
                                            {!isCompleted && session.isSubstituted && <RefreshCw size={10} className="text-purple-600"/>}
                                        </div>
                                        
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1 opacity-90">
                                                <User size={10} />
                                                <span className="truncate max-w-[100px]">{session.teacher}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-75">
                                                <BookOpen size={10} />
                                                <span>{session.classRoom}</span>
                                            </div>
                                        </div>

                                        {role === 'admin' && !session.isSubstituted && !isCompleted && (
                                            <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-gray-800 text-white text-[9px] px-1 rounded cursor-pointer">بديل</div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                      ) : (
                        <div className="h-full border border-dashed border-gray-200 rounded-lg flex items-center justify-center opacity-30">
                          <Lock size={14} />
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
