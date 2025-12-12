import React, { useState, useMemo, useEffect } from 'react';
import { Student, DailyRecord, ScheduleItem } from '../types';
import { Calendar, Printer, Send, Filter, Search, X, Download, Eye } from 'lucide-react';
import { getStatusLabel, getStatusColor, getAttendanceLabel } from '../constants';
import { CustomSelect } from './CustomSelect';
import { BulkReportModal } from './BulkReportModal';
import { SchoolSettings } from '../types';
import { generatePDFReport } from '../services/pdfGenerator';
import { useModal } from '../hooks/useModal';

interface DailyStudentViewProps {
  students: Student[];
  records: Record<string, DailyRecord>;
  settings?: SchoolSettings;
  onSendReports?: (records: Record<string, DailyRecord>) => void;
  initialClassFilter?: string | null; // Initial class filter when navigating from dashboard
  schedule?: ScheduleItem[]; // Schedule for PDF generation
}

export const DailyStudentView: React.FC<DailyStudentViewProps> = ({ 
  students, 
  records, 
  settings,
  onSendReports,
  initialClassFilter,
  schedule = []
}) => {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  // Set initial class to first class if no initialClassFilter is provided
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (initialClassFilter) return initialClassFilter;
    const classesFromSettings = settings?.classGrades && settings.classGrades.length > 0
      ? settings.classGrades
      : [];
    return classesFromSettings.length > 0 ? classesFromSettings.sort()[0] : '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewStudentName, setPreviewStudentName] = useState<string>('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<string | null>(null);
  const { alert } = useModal();
  
  // Get unique classes from settings only (not from student data) - without 'all' option
  const uniqueClasses = useMemo(() => {
    const classesFromSettings = settings?.classGrades && settings.classGrades.length > 0
      ? settings.classGrades
      : [];
    return classesFromSettings.sort();
  }, [settings]);
  
  // Set initial class filter when component mounts or when initialClassFilter changes
  useEffect(() => {
    if (initialClassFilter) {
      setSelectedClass(initialClassFilter);
    } else if (uniqueClasses.length > 0 && selectedClass === '') {
      // Auto-select first class if no initial filter and no class selected
      setSelectedClass(uniqueClasses[0]);
    }
  }, [initialClassFilter, uniqueClasses]);

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

    return Object.values(records).filter((r: DailyRecord) => {
      const recordDate = r.date;
      return recordDate >= dateFilter.start && recordDate <= dateFilter.end;
    });
  }, [records, dateRange, startDate, endDate]);

  // Get all students in the selected class (not just those with records)
  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Filter by class (always filter, no 'all' option)
    if (selectedClass) {
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
  }, [students, selectedClass, searchQuery]);

  // Group records by student
  const studentRecordsMap = useMemo(() => {
    const map: Record<string, DailyRecord[]> = {};
    filteredStudents.forEach(student => {
      map[student.id] = filteredRecords.filter(r => r.studentId === student.id);
    });
    return map;
  }, [filteredStudents, filteredRecords]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendAll = () => {
    const recordsToSend: Record<string, DailyRecord> = {};
    filteredStudents.forEach(student => {
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

            {/* Class Filter - First filter, no 'all' option */}
            {uniqueClasses.length > 0 && (
              <div className="w-[160px] flex-shrink-0">
                <CustomSelect
                  value={selectedClass || uniqueClasses[0]}
                  onChange={(value) => setSelectedClass(value)}
                  options={uniqueClasses.map(c => ({ 
                    value: c, 
                    label: c 
                  }))}
                  className="w-full text-xs"
                />
              </div>
            )}

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
                disabled={filteredStudents.length === 0}
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
        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right print:border-2 print:border-gray-800">
              <thead className="bg-gray-50 print:bg-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 print:text-black">الطالب</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 print:text-black">الفصل</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 print:text-black">عدد السجلات</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 print:text-black">آخر سجل</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 print:hidden">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student) => {
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
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              if (!latestRecord) {
                                alert({ message: `لا توجد بيانات مرصودة للطالب ${student.name}`, type: 'warning' });
                                return;
                              }
                              if (!settings || !settings.name) {
                                alert({ message: 'إعدادات المدرسة غير متوفرة. يرجى التحقق من الإعدادات.', type: 'error' });
                                return;
                              }
                              
                              try {
                                setIsGeneratingPreview(student.id);
                                // Generate PDF for preview
                                const pdfBytes = await generatePDFReport(student, latestRecord, settings, schedule);
                                const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
                                const pdfUrl = URL.createObjectURL(blob);
                                
                                setPreviewPdfUrl(pdfUrl);
                                setPreviewStudentName(student.name);
                              } catch (error) {
                                console.error('Error generating PDF:', error);
                                alert({ message: `حدث خطأ أثناء توليد تقرير ${student.name}. يرجى المحاولة مرة أخرى.`, type: 'error' });
                              } finally {
                                setIsGeneratingPreview(null);
                              }
                            }}
                            disabled={isGeneratingPreview === student.id}
                            className="text-blue-600 hover:text-blue-700 bg-blue-50 px-2 md:px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            title="معاينة التقرير"
                          >
                            {isGeneratingPreview === student.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                <span>جاري التحميل...</span>
                              </>
                            ) : (
                              <>
                                <Eye size={14} />
                                معاينة
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              // Set selected student and open modal for this student only
                              setSelectedStudentForReport(student);
                              setShowBulkModal(true);
                            }}
                            className="text-teal-600 hover:text-teal-700 bg-teal-50 px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <Send size={14} />
                            إرسال
                          </button>
                        </div>
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

      {/* Bulk Report Modal - Show only selected student if one is selected */}
      {showBulkModal && (
        <BulkReportModal
          isOpen={showBulkModal}
          onClose={() => {
            setShowBulkModal(false);
            setSelectedStudentForReport(null);
          }}
          students={selectedStudentForReport 
            ? [selectedStudentForReport] 
            : filteredStudents}
          records={selectedStudentForReport && studentRecordsMap[selectedStudentForReport.id]
            ? {
                [selectedStudentForReport.id]: studentRecordsMap[selectedStudentForReport.id][studentRecordsMap[selectedStudentForReport.id].length - 1]
              }
            : Object.fromEntries(
                filteredStudents.map(student => {
                  const latestRecord = studentRecordsMap[student.id]?.[studentRecordsMap[student.id].length - 1];
                  return [student.id, latestRecord || {} as DailyRecord];
                }).filter(([_, record]) => Object.keys(record).length > 0)
              )}
          schoolName={settings?.name || 'المدرسة'}
          schoolPhone={settings?.whatsappPhone}
          settings={settings || {} as SchoolSettings}
          schedule={schedule}
        />
      )}

      {/* PDF Preview Modal */}
      {previewPdfUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-2 md:p-4" 
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              URL.revokeObjectURL(previewPdfUrl);
              setPreviewPdfUrl(null);
              setPreviewStudentName('');
            }
          }}
          style={{ touchAction: 'none' }}
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-auto max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between z-10 rounded-t-xl">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                <Eye size={20} className="text-blue-600" />
                <span>معاينة التقرير - {previewStudentName}</span>
              </h2>
              <div className="flex items-center gap-2">
                <a
                  href={previewPdfUrl}
                  download={`تقرير_${previewStudentName}.pdf`}
                  className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-bold"
                >
                  <Download size={16} />
                  <span className="hidden md:inline">تحميل</span>
                </a>
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold"
                >
                  <Printer size={16} />
                  <span className="hidden md:inline">فتح في نافذة جديدة</span>
                </a>
                <button
                  onClick={() => {
                    URL.revokeObjectURL(previewPdfUrl);
                    setPreviewPdfUrl(null);
                    setPreviewStudentName('');
                  }}
                  className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* PDF Content */}
            <div className="flex-1 overflow-y-auto p-2 md:p-4">
              <iframe
                src={previewPdfUrl}
                className="w-full h-full min-h-[400px] md:min-h-[600px] border border-gray-200 rounded-lg"
                title={`معاينة التقرير - ${previewStudentName}`}
                style={{ 
                  minHeight: '400px',
                  maxHeight: 'calc(95vh - 120px)'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

