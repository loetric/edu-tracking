
import React, { useState, useEffect } from 'react';
import { Student, DailyRecord, StatusType, AttendanceStatus, Role, ScheduleItem } from '../types';
import { getStatusColor, getStatusLabel, getChallengeColor, getChallengeLabel } from '../constants';
import { Send, CheckCircle, AlertCircle, Save, Users, Eye, Clock, Calendar, Printer, MousePointerClick, Lock, Hourglass } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { useModal } from '../hooks/useModal';

interface StudentTrackerProps {
  students: Student[];
  records?: Record<string, DailyRecord>; // Current records from parent
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
  records: propRecords = {}, // Current records from parent
  onSave, 
  onSendReport, 
  onBulkReport,
  onAddStudent,
  isAdmin, 
  role, 
  schedule, 
  onSessionEnter,
  completedSessions = []
}) => {
  const { alert } = useModal();
  // Local state to hold temporary changes before saving
  const [records, setRecords] = useState<Record<string, DailyRecord>>({});
  const [currentDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState<ScheduleItem | null>(null);

  // Filter students based on selected session class
  // Match if classGrade equals classRoom, or if classRoom starts with classGrade (e.g., "الرابع الابتدائي/أ" matches "الرابع الابتدائي")
  const displayedStudents = selectedSession 
    ? students.filter(s => {
        const studentClass = s.classGrade?.trim() || '';
        const sessionClass = selectedSession.classRoom?.trim() || '';
        // Exact match
        if (studentClass === sessionClass) return true;
        // Match if session class starts with student class (e.g., "الرابع الابتدائي/أ" starts with "الرابع الابتدائي")
        if (sessionClass.startsWith(studentClass + '/') || sessionClass.startsWith(studentClass + '_')) return true;
        // Match if student class starts with session class
        if (studentClass.startsWith(sessionClass + '/') || studentClass.startsWith(sessionClass + '_')) return true;
        return false;
      })
    : [];

  // Load existing records for displayed students when session is selected
  useEffect(() => {
    if (selectedSession && displayedStudents.length > 0) {
      // Get records for students in this session
      const sessionRecords: Record<string, DailyRecord> = {};
      displayedStudents.forEach(student => {
        // Look for existing record in propRecords (by studentId and date)
        const existingRecord = Object.values(propRecords).find(
          r => r.studentId === student.id && r.date === currentDate
        );
        if (existingRecord) {
          sessionRecords[student.id] = existingRecord;
        }
      });
      
      // Merge with any local changes (preserve local edits)
      setRecords(prev => {
        const merged = { ...sessionRecords };
        // Keep local changes if they exist
        Object.keys(prev).forEach(key => {
          if (displayedStudents.some(s => s.id === key)) {
            merged[key] = prev[key];
          }
        });
        return merged;
      });
    } else if (!selectedSession) {
      // Clear records when no session is selected
      setRecords({});
    }
  }, [selectedSession, propRecords, currentDate, displayedStudents.length]);

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
      const recordId = existingRecord?.id || `${studentId}_${currentDate}`;
      const baseRecord: DailyRecord = existingRecord ? { ...existingRecord } : {
        id: recordId,
        studentId,
        date: currentDate,
        attendance: 'present',
        participation: 'excellent',
        homework: 'excellent',
        behavior: 'excellent',
        notes: ''
      };

      // 2. Prepare the update - ensure id is always present
      const updatedRecord: DailyRecord = { ...baseRecord, id: recordId, [field]: value };

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
    id: `${id}_${currentDate}`,
    studentId: id, 
    date: currentDate,
    attendance: 'present', 
    participation: 'excellent', 
    homework: 'excellent', 
    behavior: 'excellent',
    notes: '' 
  };

  const handlePrintList = () => {
    window.print();
  };

  const StatusSelect = ({ value, onChange, disabled }: { value: StatusType, onChange: (val: StatusType) => void, disabled?: boolean }) => (
    <CustomSelect
      value={value}
      onChange={(val) => onChange(val as StatusType)}
      disabled={disabled || isAdmin}
      options={[
        { value: 'excellent', label: 'متميز (5)' },
        { value: 'good', label: 'جيد (4)' },
        { value: 'average', label: 'متوسط (3)' },
        { value: 'poor', label: 'ضعيف (1)' },
        { value: 'none', label: 'غير محدد' }
      ]}
      className={`block w-full text-sm ${getStatusColor(value)} ${(disabled || isAdmin) ? 'opacity-90 cursor-not-allowed bg-opacity-50' : ''}`}
    />
  );

  const isSessionCompleted = (sessionId: string) => completedSessions.includes(sessionId);

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-2.5 md:p-4 rounded-xl shadow-sm border border-gray-100 gap-2 md:gap-4 print:hidden">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm md:text-xl font-bold text-gray-800">
              {isAdmin ? 'متابعة التقارير اليومية' : 'المتابعة اليومية'}
          </h2>
          <p className="text-gray-500 text-[10px] md:text-sm flex items-center gap-1 mt-0.5 md:mt-1">
              <Calendar size={10} className="md:w-[14px] md:h-[14px] flex-shrink-0"/> 
              <span className="truncate">{dayName} - {new Date().toLocaleDateString('ar-SA')}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap gap-1.5 md:gap-2 w-full md:w-auto">
            {/* Print Button for All Users */}
            <button
                onClick={handlePrintList}
                disabled={!selectedSession}
                className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg transition-colors shadow-sm font-bold border text-xs md:text-sm flex-1 md:flex-initial justify-center ${!selectedSession ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'}`}
                title="طباعة قائمة الطلاب"
            >
                <Printer size={12} className="md:w-[18px] md:h-[18px] flex-shrink-0" />
                <span className="hidden sm:inline text-[10px] md:text-sm">طباعة القائمة</span>
                <span className="sm:hidden text-[10px]">طباعة</span>
            </button>

            {isAdmin && onBulkReport && (
                <button
                    onClick={() => onBulkReport(records)}
                    disabled={!selectedSession || !isSessionCompleted(selectedSession.id)}
                    className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg transition-shadow shadow-md text-[10px] md:text-sm font-bold flex-1 md:flex-initial justify-center ${(!selectedSession || !isSessionCompleted(selectedSession.id)) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                    <Users size={12} className="md:w-4 md:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">إرسال تقارير جماعية</span>
                    <span className="sm:hidden">جماعي</span>
                </button>
            )}

            <button
                onClick={() => {
                    if (Object.keys(records).length > 0) {
                        onSave(records);
                    } else {
                        alert({ message: 'لا توجد بيانات للحفظ', type: 'warning' });
                    }
                }}
                disabled={!selectedSession || Object.keys(records).length === 0}
                className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-1.5 md:py-2 rounded-lg transition-shadow shadow-md font-bold text-xs md:text-sm flex-1 md:flex-initial justify-center ${!selectedSession || Object.keys(records).length === 0 ? 'bg-gray-300 text-gray-100 cursor-not-allowed' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
            >
                <Save size={14} className="md:w-[18px] md:h-[18px] flex-shrink-0" />
                <span>حفظ الكل</span>
            </button>
        </div>
      </div>

      {/* Schedule Tabs */}
      {schedule && (
          <div className="bg-white p-1.5 md:p-2 rounded-xl border border-gray-100 shadow-sm overflow-x-auto print:hidden">
              <div className="flex items-center gap-1.5 md:gap-2 min-w-max">
                  <div className="text-xs md:text-sm font-bold text-gray-400 pl-2 md:pl-4 border-l border-gray-100 ml-1 md:ml-2 py-1.5 md:py-2 flex-shrink-0">
                      {isAdmin ? 'جدول الحصص اليومي:' : 'حصصي اليوم:'}
                  </div>
                  {displayedSessions.length > 0 ? displayedSessions.map(session => {
                      const completed = isSessionCompleted(session.id);
                      return (
                      <button
                        key={session.id}
                        onClick={() => handleSessionClick(session)}
                        className={`flex flex-col items-start gap-0.5 md:gap-1 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg transition-all text-xs md:text-sm border flex-shrink-0 ${
                            selectedSession?.id === session.id 
                            ? 'bg-teal-50 border-teal-500 shadow-md transform scale-105 z-10' 
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                          <div className="flex items-center justify-between w-full gap-2 md:gap-3">
                              <span className={`text-[9px] md:text-[10px] font-bold px-1 md:px-1.5 rounded ${selectedSession?.id === session.id ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'}`}>حـ {session.period}</span>
                              {isAdmin && (
                                  completed 
                                  ? <CheckCircle size={10} className="md:w-[14px] md:h-[14px] text-green-500 flex-shrink-0" />
                                  : <Hourglass size={10} className="md:w-[14px] md:h-[14px] text-orange-400 flex-shrink-0" />
                              )}
                          </div>
                          <span className={`font-bold text-[10px] md:text-sm truncate max-w-[100px] md:max-w-none ${selectedSession?.id === session.id ? 'text-teal-900' : 'text-gray-700'}`}>{session.subject}</span>
                          <div className="flex items-center gap-1 w-full">
                                <span className="text-[9px] md:text-[10px] bg-black/5 px-1 md:px-1.5 rounded truncate">{session.classRoom}</span>
                                {isAdmin && <span className="text-[9px] md:text-[10px] text-gray-500 truncate max-w-[60px] md:max-w-[80px]">{session.teacher}</span>}
                          </div>
                      </button>
                  )}) : (
                      <div className="text-gray-400 text-xs md:text-sm italic px-2 md:px-4 flex items-center gap-1.5 md:gap-2">
                          <Lock size={12} className="md:w-[14px] md:h-[14px] flex-shrink-0" />
                          <span>لا يوجد حصص مسجلة في الجدول لهذا اليوم</span>
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
                    : <span className="flex items-center gap-1 text-base">يتم الآن رصد الدرجات لـ: <strong>{selectedSession.subject}</strong> - الفصل <strong>{selectedSession.classRoom}</strong></span>
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
                      <CheckCircle size={14} />
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
            
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right border-collapse">
                <thead className="bg-gray-50 print:bg-gray-200">
                <tr>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">الطالب</th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">الحضور</th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">المشاركة</th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">الواجبات</th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">السلوك</th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">ملاحظات</th>
                    {isAdmin && (
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider print:hidden">إجراءات</th>
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
                        <CustomSelect
                            value={record.attendance}
                            onChange={(value) => handleStatusChange(student.id, 'attendance', value)}
                            disabled={isAdmin}
                            options={[
                              { value: 'present', label: 'حاضر' },
                              { value: 'excused', label: 'مستأذن' },
                              { value: 'absent', label: 'غائب' }
                            ]}
                            className={`block w-full text-sm font-bold ${
                            record.attendance === 'present' ? 'bg-green-100 text-green-800' : 
                            record.attendance === 'excused' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                            } ${isAdmin ? 'opacity-100' : ''}`}
                        />
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
                        <td className="px-6 py-4">
                        <textarea
                            placeholder={isAdmin ? "" : "أضف ملاحظة..."}
                            value={record.notes}
                            disabled={isAdmin}
                            onChange={(e) => handleStatusChange(student.id, 'notes', e.target.value)}
                            rows={2}
                            className={`text-sm border-gray-300 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 w-full print:border-0 print:bg-transparent resize-none ${isAdmin ? 'bg-transparent border-none' : ''}`}
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

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {displayedStudents.length > 0 ? displayedStudents.map((student) => {
                    const record = getRecord(student.id);
                    const challengeClass = student.challenge !== 'none' ? getChallengeColor(student.challenge) : '';
                    const isAbsent = record.attendance !== 'present';

                    return (
                        <div key={student.id} className={`bg-white border rounded-lg p-4 shadow-sm ${challengeClass}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <img className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm" src={student.avatar} alt="" />
                                    <div>
                                        <p className="font-bold text-gray-800">{student.name}</p>
                                        {student.challenge !== 'none' && (
                                            <p className="text-xs text-gray-500">{getChallengeLabel(student.challenge)}</p>
                                        )}
                                    </div>
                                </div>
                                {isAbsent && (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">غائب</span>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">الحضور</p>
                                    <CustomSelect
                                        value={record.attendance}
                                        onChange={(value) => handleStatusChange(student.id, 'attendance', value as AttendanceStatus)}
                                        options={[
                                          { value: 'present', label: 'حاضر' },
                                          { value: 'absent', label: 'غائب' },
                                          { value: 'late', label: 'متأخر' }
                                        ]}
                                        className="w-full text-sm"
                                    />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">المشاركة</p>
                                    <CustomSelect
                                        value={record.participation}
                                        onChange={(value) => handleStatusChange(student.id, 'participation', value as StatusType)}
                                        options={[
                                          { value: 'excellent', label: 'ممتاز' },
                                          { value: 'good', label: 'جيد' },
                                          { value: 'average', label: 'متوسط' },
                                          { value: 'poor', label: 'ضعيف' }
                                        ]}
                                        className="w-full text-sm"
                                    />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">الواجبات</p>
                                    <CustomSelect
                                        value={record.homework}
                                        onChange={(value) => handleStatusChange(student.id, 'homework', value as StatusType)}
                                        options={[
                                          { value: 'excellent', label: 'ممتاز' },
                                          { value: 'good', label: 'جيد' },
                                          { value: 'average', label: 'متوسط' },
                                          { value: 'poor', label: 'ضعيف' }
                                        ]}
                                        className="w-full text-sm"
                                    />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">السلوك</p>
                                    <CustomSelect
                                        value={record.behavior}
                                        onChange={(value) => handleStatusChange(student.id, 'behavior', value as StatusType)}
                                        options={[
                                          { value: 'excellent', label: 'ممتاز' },
                                          { value: 'good', label: 'جيد' },
                                          { value: 'average', label: 'متوسط' },
                                          { value: 'poor', label: 'ضعيف' }
                                        ]}
                                        className="w-full text-sm"
                                    />
                                </div>
                            </div>
                            
                            <div className="mb-3">
                                <p className="text-xs text-gray-500 mb-1">ملاحظات</p>
                                <textarea
                                    value={record.notes || ''}
                                    onChange={(e) => handleStatusChange(student.id, 'notes', e.target.value)}
                                    placeholder="أضف ملاحظات..."
                                    className="w-full text-sm border rounded p-2 min-h-[60px]"
                                />
                            </div>

                            {isAdmin && (
                                <div className="flex gap-2 pt-2 border-t">
                                    <button
                                        onClick={() => onSendReport(student, record)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-teal-700"
                                    >
                                        <Send size={16} />
                                        إرسال تقرير
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                }) : (
                    <div className="p-8 text-center text-gray-400 bg-white rounded-lg border">
                        <Users size={40} className="mx-auto mb-2 opacity-20" />
                        <p>لا يوجد طلاب مسجلين في هذا الفصل ({selectedSession?.classRoom})</p>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
