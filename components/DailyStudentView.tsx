import React, { useState, useMemo } from 'react';
import { Student, DailyRecord } from '../types';
import { Calendar, Printer, Send, Filter, Search, X, Download } from 'lucide-react';
import { getStatusLabel, getStatusColor, getAttendanceLabel } from '../constants';
import { CustomSelect } from './CustomSelect';
import { BulkReportModal } from './BulkReportModal';
import { SchoolSettings } from '../types';

interface DailyStudentViewProps {
  students: Student[];
  records: Record<string, DailyRecord>;
  settings: SchoolSettings;
  onSendReports?: (records: Record<string, DailyRecord>) => void;
}

export const DailyStudentView: React.FC<DailyStudentViewProps> = ({ 
  students, 
  records, 
  settings,
  onSendReports 
}) => {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Get unique classes from settings only (not from student data)
  const uniqueClasses = useMemo(() => {
    const classesFromSettings = settings?.classGrades && settings.classGrades.length > 0
      ? settings.classGrades
      : [];
    return ['all', ...classesFromSettings.sort()];
  }, [settings]);

  // Filter records by date range
  const filteredRecords = useMemo(() => {
    let dateFilter: { start: string; end: string } = { start: '', end: '' };
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    switch (dateRange) {
      case 'today':
        dateFilter = { start: todayStr, end: todayStr };
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        dateFilter = { start: weekStart.toISOString().split('T')[0], end: todayStr };
        break;
      case 'month':
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 30);
        dateFilter = { start: monthStart.toISOString().split('T')[0], end: todayStr };
        break;
      case 'custom':
        dateFilter = { start: startDate, end: endDate };
        break;
    }

    return Object.values(records).filter(r => {
      const recordDate = r.date;
      return recordDate >= dateFilter.start && recordDate <= dateFilter.end;
    });
  }, [records, dateRange, startDate, endDate]);

  // Get students with records
  const studentsWithRecords = useMemo(() => {
    const studentIds = new Set(filteredRecords.map(r => r.studentId));
    let filtered = students.filter(s => studentIds.has(s.id));

    // Filter by class
    if (selectedClass !== 'all') {
      filtered = filtered.filter(s => s.classGrade === selectedClass);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.studentNumber?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [students, filteredRecords, selectedClass, searchQuery]);

  // Group records by student
  const studentRecordsMap = useMemo(() => {
    const map: Record<string, DailyRecord[]> = {};
    studentsWithRecords.forEach(student => {
      map[student.id] = filteredRecords.filter(r => r.studentId === student.id);
    });
    return map;
  }, [studentsWithRecords, filteredRecords]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendAll = () => {
    const recordsToSend: Record<string, DailyRecord> = {};
    studentsWithRecords.forEach(student => {
      const latestRecord = studentRecordsMap[student.id]?.[studentRecordsMap[student.id].length - 1];
      if (latestRecord) {
        recordsToSend[student.id] = latestRecord;
      }
    });
    setShowBulkModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Calendar size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">استعراض الطلاب اليومية</h2>
            <p className="text-gray-500 text-sm">عرض وتتبع بيانات الطلاب لفترة زمنية محددة</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 flex-shrink-0">
              <Filter size={14} className="text-teal-600" />
              <span className="font-medium text-gray-700 text-xs">الفلاتر:</span>
            </div>

            {/* Date Range */}
            <div className="w-[150px] flex-shrink-0">
              <CustomSelect
                value={dateRange}
                onChange={(value) => setDateRange(value as 'today' | 'week' | 'month' | 'custom')}
                options={[
                  { value: 'today', label: 'اليوم' },
                  { value: 'week', label: 'آخر أسبوع' },
                  { value: 'month', label: 'آخر شهر' },
                  { value: 'custom', label: 'فترة مخصصة' }
                ]}
                className="w-full text-xs"
              />
            </div>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <>
                <div className="w-[140px] flex-shrink-0">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
                  />
                </div>
                <span className="text-xs text-gray-500">إلى</span>
                <div className="w-[140px] flex-shrink-0">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
                  />
                </div>
              </>
            )}

            {/* Class Filter */}
            <div className="w-[120px] flex-shrink-0">
              <CustomSelect
                value={selectedClass}
                onChange={(value) => setSelectedClass(value)}
                options={uniqueClasses.map(c => ({ 
                  value: c, 
                  label: c === 'all' ? 'جميع الفصول' : c 
                }))}
                className="w-full text-xs"
              />
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[150px]">
              <div className="relative">
                <Search size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم أو الرقم..."
                  className="w-full pr-8 pl-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute top-1 left-1 text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-bold shadow-md text-xs print:hidden"
              >
                <Printer size={16} />
                <span>طباعة</span>
              </button>
              <button
                onClick={handleSendAll}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-bold shadow-md text-xs print:hidden"
                disabled={studentsWithRecords.length === 0}
              >
                <Send size={16} />
                <span>إرسال الكل</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {studentsWithRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right print:border-2 print:border-gray-800">
              <thead className="bg-gray-50 print:bg-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 print:text-black">الطالب</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 print:text-black">الصف</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 print:text-black">عدد السجلات</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 print:text-black">آخر سجل</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 print:hidden">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {studentsWithRecords.map((student) => {
                  const studentRecords = studentRecordsMap[student.id] || [];
                  const latestRecord = studentRecords[studentRecords.length - 1];

                  return (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-200 print:hidden">
                            <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-800">{student.name}</p>
                            {student.studentNumber && (
                              <p className="text-xs text-gray-500">#{student.studentNumber}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.classGrade || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{studentRecords.length}</td>
                      <td className="px-4 py-3">
                        {latestRecord ? (
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(latestRecord.attendance)}`}>
                              {getAttendanceLabel(latestRecord.attendance)}
                            </span>
                            <p className="text-xs text-gray-500">{latestRecord.date}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">لا توجد بيانات</span>
                        )}
                      </td>
                      <td className="px-4 py-3 print:hidden">
                        <button
                          onClick={() => {
                            const recordsToSend: Record<string, DailyRecord> = {};
                            if (latestRecord) {
                              recordsToSend[student.id] = latestRecord;
                            }
                            setShowBulkModal(true);
                          }}
                          className="text-teal-600 hover:text-teal-700 bg-teal-50 px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                        >
                          <Send size={14} className="inline mr-1" />
                          إرسال
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-bold">لا توجد بيانات للفترة المحددة</p>
          </div>
        )}
      </div>

      {/* Bulk Report Modal */}
      {showBulkModal && (
        <BulkReportModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          students={studentsWithRecords}
          records={Object.fromEntries(
            studentsWithRecords.map(student => {
              const latestRecord = studentRecordsMap[student.id]?.[studentRecordsMap[student.id].length - 1];
              return [student.id, latestRecord || {} as DailyRecord];
            }).filter(([_, record]) => Object.keys(record).length > 0)
          )}
          schoolName={settings.name}
          schoolPhone={settings.whatsappPhone}
        />
      )}
    </div>
  );
};

