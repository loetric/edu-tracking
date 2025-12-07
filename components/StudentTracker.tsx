
import React, { useState, useEffect } from 'react';
import { Student, DailyRecord, StatusType, AttendanceStatus, Role, ScheduleItem } from '../types';
import { getStatusColor, getStatusLabel, getChallengeColor, getChallengeLabel } from '../constants';
import { Send, CheckCircle, AlertCircle, Save, Users, Eye, Clock, Calendar, Printer, MousePointerClick, Lock, Hourglass, CheckCircle2 } from 'lucide-react';

interface StudentTrackerProps {
  students: Student[];
  onSave: (records: Record<string, DailyRecord>) => void;
  onSendReport: (student: Student, record: DailyRecord) => void;
  onBulkReport?: (records: Record<string, DailyRecord>) => void;
  isAdmin?: boolean;
  role?: Role;
  schedule?: ScheduleItem[];
  onSessionEnter?: (session: ScheduleItem) => void;
  completedSessions?: string[]; // To know which sessions are graded
}

export const StudentTracker: React.FC<StudentTrackerProps> = ({ 
  students, 
  onSave, 
  onSendReport, 
  onBulkReport, 
  isAdmin, 
  role, 
  schedule, 
  onSessionEnter,
  completedSessions = []
}) => {
  // Local state to hold temporary changes before saving
  const [records, setRecords] = useState<Record<string, DailyRecord>>({});
  const [currentDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState<ScheduleItem | null>(null);

  // Get today's day name in Arabic
  const dayName = new Date().toLocaleDateString('ar-SA', { weekday: 'long' });
  
  // Filter sessions logic:
  let displayedSessions: ScheduleItem[] = [];
  
  if (schedule) {
      // Show ALL sessions for today sorted by period
      const todaySessions = schedule.filter(s => s.day === dayName).sort((a,b) => a.period - b.period);
      displayedSessions = todaySessions;
  }

  const handleSessionClick = (session: ScheduleItem) => {
      setSelectedSession(session);
      if (onSessionEnter && !isAdmin) { // Only teacher triggers "Enter Session" logic
          onSessionEnter(session);
      }
  };

  const handleStatusChange = (studentId: string, field: keyof DailyRecord, value: any) => {
    // Only Teacher can edit
    if (isAdmin) return; 

    setRecords(prev => {
      // 1. Get current record or create default "Present/Excellent" record
      const existingRecord = prev[studentId];
      const baseRecord: DailyRecord = existingRecord ? { ...existingRecord } : {
        studentId,
        date: currentDate,
        attendance: 'present',
        participation: 'excellent',
        homework: 'excellent',
        behavior: 'excellent',
        notes: ''
      };

      // 2. Prepare the update
      const updatedRecord = { ...baseRecord, [field]: value };

      // 3. Apply Automation Logic based on Attendance
      if (field === 'attendance') {
        if (value === 'absent' || value === 'excused') {
          // If absent/excused, set all metrics to 'none' (Negative/Inactive state)
          updatedRecord.participation = 'none';
          updatedRecord.homework = 'none';
          updatedRecord.behavior = 'none';
        } else if (value === 'present') {
          // If switching back to present, reset 'none' fields to 'excellent' for quick grading
          if (updatedRecord.participation === 'none') updatedRecord.participation = 'excellent';
          if (updatedRecord.homework === 'none') updatedRecord.homework = 'excellent';
          if (updatedRecord.behavior === 'none') updatedRecord.behavior = 'excellent';
        }
      }

      return {
        ...prev,
        [studentId]: updatedRecord
      };
    });
  };

  // Default record structure uses 'excellent' and 'present' as the default state for rendering
  const getRecord = (id: string): DailyRecord => records[id] || { 
    studentId: id, 
    date: currentDate,
    attendance: 'present', 
    participation: 'excellent', 
    homework: 'excellent', 
    behavior: 'excellent',
    notes: '' 
  };

  // Filter students based on selected session class
  const displayedStudents = selectedSession 
    ? students.filter(s => s.classGrade.trim() === selectedSession.classRoom.trim())
    : [];

  const handlePrintList = () => {
    window.print();
  };

  const StatusSelect = ({ value, onChange, disabled }: { value: StatusType, onChange: (val: StatusType) => void, disabled?: boolean }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as StatusType)}
      disabled={disabled || isAdmin} // Disabled for Admin
      className={`block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-1.5 px-2 transition-colors ${getStatusColor(value)} ${(disabled || isAdmin) ? 'opacity-90 cursor-not-allowed bg-opacity-50' : ''}`}
    >
      <option value="excellent">متميز (5)</option>
      <option value="good">جيد (4)</option>
      <option value="average">متوسط (3)</option>
      <option value="poor">ضعيف (1)</option>
      <option value="none">غير محدد</option>
    </select>
  );

  const isSessionCompleted = (sessionId: string) => completedSessions.includes(sessionId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
              {isAdmin ? 'متابعة التقارير اليومية (لوحة المدير)' : 'المتابعة اليومية (الرصد)'}
          </h2>
          <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
              <Calendar size={14}/> 
              {dayName} - {new Date().toLocaleDateString('ar-SA')}
          </p>
        </div>
        
        <div className="flex gap-2">
            {/* Print Button for All Users */}
            <button
                onClick={handlePrintList}
                disabled={!selectedSession}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm font-bold border ${!selectedSession ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'}`}
                title="طباعة قائمة الطلاب"
            >
                <Printer size={18} />
                <span className="hidden md:inline">طباعة القائمة</span>
            </button>

            {isAdmin && onBulkReport && (
                <button
                    onClick={() => onBulkReport(records)}
                    disabled={!selectedSession || !isSessionCompleted(selectedSession.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-shadow shadow-md text-sm font-bold ${(!selectedSession || !isSessionCompleted(selectedSession.id)) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                    <Users size={16} />
                    <span>إرسال تقارير جماعية</span>
                </button>
            )}

            {!isAdmin && (
                <button
                onClick={() => onSave(records)}
                disabled={!selectedSession}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-shadow shadow-md font-bold ${!selectedSession ? 'bg-gray-300 text-gray-100' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                >
                <Save size={18} />
                <span>حفظ الكل</span>
                </button>
            )}
        </div>
      </div>

      {/* Schedule Tabs */}
      {schedule && (
          <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm overflow-x-auto print:hidden">
              <div className="flex items-center gap-2 min-w-max">
                  <div className="text-sm font-bold text-gray-400 pl-4 border-l border-gray-100 ml-2 py-2">
                      {isAdmin ? 'جدول الحصص اليومي:' : 'حصصي اليوم:'}
                  </div>
                  {displayedSessions.length > 0 ? displayedSessions.map(session => {
                      const completed = isSessionCompleted(session.id);
                      return (
                      <button
                        key={session.id}
                        onClick={() => handleSessionClick(session)}
                        className={`flex flex-col items-start gap-1 px-4 py-2 rounded-lg transition-all text-sm border ${
                            selectedSession?.id === session.id 
                            ? 'bg-teal-50 border-teal-500 shadow-md transform scale-105 z-10' 
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                          <div className="flex items-center justify-between w-full gap-3">
                              <span className={`text-[10px] font-bold px-1.5 rounded ${selectedSession?.id === session.id ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'}`}>حـ {session.period}</span>
                              {isAdmin && (
                                  completed 
                                  ? <CheckCircle2 size={14} className="text-green-500" />
                                  : <Hourglass size={14} className="text-orange-400" />
                              )}
                          </div>
                          <span className={`font-bold ${selectedSession?.id === session.id ? 'text-teal-900' : 'text-gray-700'}`}>{session.subject}</span>
                          <div className="flex items-center gap-1 w-full">
                                <span className="text-[10px] bg-black/5 px-1.5 rounded">{session.classRoom}</span>
                                {isAdmin && <span className="text-[10px] text-gray-500 truncate max-w-[80px]">{session.teacher}</span>}
                          </div>
                      </button>
                  )}) : (
                      <div className="text-gray-400 text-sm italic px-4 flex items-center gap-2">
                          <Lock size={14} />
                          لا يوجد حصص مسجلة في الجدول لهذا اليوم
                      </div>
                  )}
              </div>
          </div>
      )}

      {selectedSession ? (
          <div className={`p-4 rounded-lg flex items-center justify-between gap-2 text-sm animate-in fade-in slide-in-from-top-2 border ${
              isAdmin && !isSessionCompleted(selectedSession.id) 
              ? 'bg-orange-50 border-orange-200 text-orange-800' 
              : 'bg-blue-50 border-blue-100 text-blue-800'
          }`}>
              <div className="flex items-center gap-2">
                <Clock size={20} />
                {isAdmin 
                    ? <span className="flex items-center gap-1 text-base">
                        تقرير <strong>{selectedSession.classRoom}</strong> - مادة {selectedSession.subject}
                        <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full mr-2 border border-black/5">
                            المعلم: {selectedSession.teacher}
                        </span>
                      </span>
                    : <span className="flex items-center gap-1 text-base">يتم الآن رصد الدرجات لـ: <strong>{selectedSession.subject}</strong> - الصف <strong>{selectedSession.classRoom}</strong></span>
                }
              </div>
              
              {isAdmin && !isSessionCompleted(selectedSession.id) && (
                  <span className="font-bold bg-white px-3 py-1 rounded-full text-xs shadow-sm flex items-center gap-1 text-orange-600">
                      <Hourglass size={14} />
                      بانتظار رصد المعلم
                  </span>
              )}
               {isAdmin && isSessionCompleted(selectedSession.id) && (
                  <span className="font-bold bg-green-100 px-3 py-1 rounded-full text-xs shadow-sm flex items-center gap-1 text-green-700 border border-green-200">
                      <CheckCircle2 size={14} />
                      مكتمل وجاهز للإرسال
                  </span>
              )}
          </div>
      ) : (
          <div className="bg-white border-2 border-dashed border-gray-200 p-12 rounded-xl text-center text-gray-400 flex flex-col items-center justify-center h-64">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <MousePointerClick size={32} className="text-gray-400" />
              </div>
              <p className="font-bold text-lg text-gray-600">لم يتم اختيار حصة</p>
              <p className="text-sm mt-2">
                  الرجاء الضغط على إحدى الحصص في الشريط العلوي لعرض التفاصيل
              </p>
          </div>
      )}

      {selectedSession && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-2 print:border-gray-800 animate-in fade-in">
             {isAdmin && !isSessionCompleted(selectedSession.id) && (
                <div className="absolute inset-0 bg-white/60 z-10 flex flex-col items-center justify-center backdrop-blur-[2px]">
                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200 text-center max-w-md">
                        <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Clock size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">البيانات غير متوفرة بعد</h3>
                        <p className="text-gray-500 text-sm mb-4">
                            لم يقم المعلم ({selectedSession.teacher}) برصد درجات هذه الحصة حتى الآن.
                        </p>
                        <button 
                            className="text-teal-600 font-bold text-sm hover:underline"
                            onClick={() => setSelectedSession(null)}
                        >
                            العودة للجدول
                        </button>
                    </div>
                </div>
            )}
            
            <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
                <thead className="bg-gray-50 print:bg-gray-200">
                <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">الطالب</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">الحضور</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">المشاركة</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">الواجبات</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">السلوك</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">ملاحظات</th>
                    {isAdmin && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:hidden">إجراءات</th>
                    )}
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100 print:divide-gray-300">
                {displayedStudents.length > 0 ? displayedStudents.map((student) => {
                    const record = getRecord(student.id);
                    // Get row color based on challenge
                    const challengeClass = student.challenge !== 'none' ? getChallengeColor(student.challenge) : '';
                    const isAbsent = record.attendance !== 'present';

                    return (
                    <tr key={student.id} className={`hover:bg-gray-50 transition-colors ${challengeClass} ${student.challenge !== 'none' ? 'border-l-4 border-l-current' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 relative print:hidden">
                            <img className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm" src={student.avatar} alt="" />
                            {student.challenge !== 'none' && (
                                <div className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow-sm border" title={getChallengeLabel(student.challenge)}>
                                <AlertCircle size={14} className="text-red-500" />
                                </div>
                            )}
                            </div>
                            <div className="mr-4">
                            <div className="text-sm font-bold text-gray-900">{student.name}</div>
                            <div className="text-xs text-gray-500 print:hidden">{student.classGrade}</div>
                            {student.challenge !== 'none' && (
                                <span className="text-[10px] bg-white bg-opacity-50 px-1 rounded text-gray-600 border border-gray-200 mt-1 inline-block print:border-black">
                                    {getChallengeLabel(student.challenge)}
                                </span>
                            )}
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap w-32">
                        <select
                            value={record.attendance}
                            onChange={(e) => handleStatusChange(student.id, 'attendance', e.target.value)}
                            disabled={isAdmin}
                            className={`block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-1.5 px-2 font-bold print:appearance-none print:bg-transparent print:border-0 ${
                            record.attendance === 'present' ? 'bg-green-100 text-green-800' : 
                            record.attendance === 'excused' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                            } ${isAdmin ? 'opacity-100' : ''}`}
                        >
                            <option value="present">حاضر</option>
                            <option value="excused">مستأذن</option>
                            <option value="absent">غائب</option>
                        </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap w-32">
                        <StatusSelect 
                            value={record.participation} 
                            onChange={(val) => handleStatusChange(student.id, 'participation', val)}
                            disabled={isAbsent} 
                        />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap w-32">
                        <StatusSelect 
                            value={record.homework} 
                            onChange={(val) => handleStatusChange(student.id, 'homework', val)} 
                            disabled={isAbsent}
                        />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap w-32">
                        <StatusSelect 
                            value={record.behavior} 
                            onChange={(val) => handleStatusChange(student.id, 'behavior', val)} 
                            disabled={isAbsent}
                        />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <input
                            type="text"
                            placeholder={isAdmin ? "" : "أضف ملاحظة..."}
                            value={record.notes}
                            disabled={isAdmin}
                            onChange={(e) => handleStatusChange(student.id, 'notes', e.target.value)}
                            className={`text-sm border-gray-300 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 w-full print:border-0 print:bg-transparent ${isAdmin ? 'bg-transparent border-none' : ''}`}
                        />
                        </td>
                        
                        {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium print:hidden">
                            <button
                            onClick={() => onSendReport(student, record)}
                            className="text-teal-600 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 p-2 rounded-full transition-colors flex items-center gap-1 group"
                            title="إرسال التقرير لولي الأمر"
                            >
                            <Send size={18} className="group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                            </button>
                        </td>
                        )}
                    </tr>
                    );
                }) : (
                    <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-gray-400">
                            <div className="flex flex-col items-center gap-2">
                                <Users size={40} className="opacity-20" />
                                <p>لا يوجد طلاب مسجلين في هذا الفصل ({selectedSession?.classRoom})</p>
                            </div>
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        </div>
      )}
    </div>
  );
};
