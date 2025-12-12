import React, { useState, useMemo, useEffect } from 'react';
import { Student, DailyRecord, SchoolSettings } from '../types';
import { Calendar, Users, AlertTriangle, Filter, Search, Clock, TrendingUp, FileText, Download, XCircle, CheckCircle, Printer } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

interface AbsenceManagementProps {
  students: Student[];
  records: Record<string, DailyRecord>;
  settings?: SchoolSettings;
}

type AbsenceFilterType = 
  | 'today' 
  | 'three-days' 
  | 'week' 
  | 'repeated' 
  | 'excused' 
  | 'unexcused'
  | 'all';

interface AbsentStudentInfo {
  student: Student;
  absenceDays: number;
  consecutiveDays: number;
  lastAbsenceDate: string;
  records: DailyRecord[];
  isExcused: boolean;
}

export const AbsenceManagement: React.FC<AbsenceManagementProps> = ({ students, records, settings }) => {
  const [filterType, setFilterType] = useState<AbsenceFilterType>('today');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Get unique classes from settings (without 'all')
  const uniqueClasses = useMemo(() => {
    if (settings?.classGrades && settings.classGrades.length > 0) {
      return settings.classGrades.sort();
    }
    return [];
  }, [settings]);

  // Set initial class to first class
  useEffect(() => {
    if (uniqueClasses.length > 0 && !selectedClass) {
      setSelectedClass(uniqueClasses[0]);
    }
  }, [uniqueClasses, selectedClass]);

  // Convert records object to array
  const recordsArray = useMemo(() => {
    return Object.values(records);
  }, [records]);

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Calculate date range for filter
  const getDateRange = (filter: AbsenceFilterType): { start: string; end: string } => {
    const end = new Date();
    let start = new Date();
    
    switch (filter) {
      case 'today':
        return { start: today, end: today };
      case 'three-days':
        start.setDate(start.getDate() - 2);
        return { start: start.toISOString().split('T')[0], end: today };
      case 'week':
        start.setDate(start.getDate() - 6);
        return { start: start.toISOString().split('T')[0], end: today };
      case 'repeated':
        start.setMonth(start.getMonth() - 1);
        return { start: start.toISOString().split('T')[0], end: today };
      default:
        return { start: dateRange.start, end: dateRange.end };
    }
  };

  // Calculate consecutive absence days for a student
  const calculateConsecutiveDays = (studentId: string, endDate: string): number => {
    const studentRecords = recordsArray
      .filter(r => r.studentId === studentId && r.date <= endDate)
      .sort((a, b) => b.date.localeCompare(a.date));
    
    if (studentRecords.length === 0) return 0;
    
    let consecutive = 0;
    let currentDate = new Date(endDate);
    
    for (let i = 0; i < 30; i++) { // Check up to 30 days back
      const dateStr = currentDate.toISOString().split('T')[0];
      const record = studentRecords.find(r => r.date === dateStr);
      
      if (record && (record.attendance === 'absent' || record.attendance === 'excused')) {
        consecutive++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return consecutive;
  };

  // Get absent students based on filter
  const absentStudents = useMemo(() => {
    const range = getDateRange(filterType);
    const filteredRecords = recordsArray.filter(r => {
      const recordDate = r.date;
      return recordDate >= range.start && recordDate <= range.end && 
             (r.attendance === 'absent' || r.attendance === 'excused');
    });

    // Group by student
    const studentMap = new Map<string, AbsentStudentInfo>();
    
    filteredRecords.forEach(record => {
      const student = students.find(s => s.id === record.studentId);
      if (!student) return;
      
      if (!studentMap.has(record.studentId)) {
        studentMap.set(record.studentId, {
          student,
          absenceDays: 0,
          consecutiveDays: 0,
          lastAbsenceDate: record.date,
          records: [],
          isExcused: record.attendance === 'excused'
        });
      }
      
      const info = studentMap.get(record.studentId)!;
      info.records.push(record);
      info.absenceDays++;
      if (record.date > info.lastAbsenceDate) {
        info.lastAbsenceDate = record.date;
      }
      if (record.attendance === 'excused') {
        info.isExcused = true;
      }
    });

    // Calculate consecutive days
    studentMap.forEach((info, studentId) => {
      info.consecutiveDays = calculateConsecutiveDays(studentId, range.end);
    });

    let result = Array.from(studentMap.values());

    // Apply additional filters
    if (filterType === 'excused') {
      result = result.filter(info => info.isExcused);
    } else if (filterType === 'unexcused') {
      result = result.filter(info => !info.isExcused);
    } else if (filterType === 'three-days') {
      result = result.filter(info => info.consecutiveDays >= 3);
    } else if (filterType === 'repeated') {
      result = result.filter(info => info.absenceDays >= 3);
    }

    // Filter by class
    if (selectedClass) {
      result = result.filter(info => 
        info.student.classGrade === selectedClass || 
        info.student.classGrade.startsWith(selectedClass + '/') ||
        info.student.classGrade.startsWith(selectedClass + '_')
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(info => 
        info.student.name.toLowerCase().includes(query) ||
        info.student.id.toLowerCase().includes(query) ||
        (info.student.studentNumber && info.student.studentNumber.toLowerCase().includes(query))
      );
    }

    // Sort by consecutive days (descending), then by absence days
    result.sort((a, b) => {
      if (b.consecutiveDays !== a.consecutiveDays) {
        return b.consecutiveDays - a.consecutiveDays;
      }
      return b.absenceDays - a.absenceDays;
    });

    return result;
  }, [filterType, selectedClass, searchQuery, recordsArray, students, dateRange]);

  const filterOptions = [
    { value: 'today', label: 'الغائبون اليوم', icon: Calendar },
    { value: 'three-days', label: '3 أيام متتالية', icon: TrendingUp },
    { value: 'week', label: 'أسبوع', icon: Clock },
    { value: 'repeated', label: 'متكررون (3+ مرات)', icon: AlertTriangle },
    { value: 'excused', label: 'مسأذنون', icon: CheckCircle },
    { value: 'unexcused', label: 'غائب', icon: XCircle },
    { value: 'all', label: 'الكل', icon: Users },
  ];

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getAbsenceBadgeColor = (consecutiveDays: number): string => {
    if (consecutiveDays >= 5) return 'bg-red-100 text-red-800 border-red-300';
    if (consecutiveDays >= 3) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="text-teal-600" size={24} />
            إدارة الغياب
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">استعراض وإدارة غياب الطلاب</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-bold shadow-md text-xs md:text-sm print:hidden self-start md:self-center"
        >
          <Printer size={16} />
          <span>طباعة</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4 space-y-3 md:space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          {/* Filter Type */}
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">نوع الفلتر</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2">
              {filterOptions.map(option => {
                const Icon = option.icon;
                const isActive = filterType === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFilterType(option.value as AbsenceFilterType)}
                    className={`flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2 md:p-3 rounded-lg border-2 transition-all ${
                      isActive
                        ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={16} className="sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
                    <span className="text-[9px] sm:text-[10px] md:text-xs font-medium text-center leading-tight">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
          {/* Class Filter */}
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">الفصل</label>
            <CustomSelect
              value={selectedClass || (uniqueClasses.length > 0 ? uniqueClasses[0] : '')}
              onChange={setSelectedClass}
              options={uniqueClasses.map(c => ({ value: c, label: c }))}
              placeholder="اختر الفصل"
              className="text-xs md:text-sm"
            />
          </div>

          {/* Search */}
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">بحث</label>
            <div className="relative">
              <Search className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو الرقم..."
                className="w-full pr-8 sm:pr-10 pl-3 sm:pl-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600 font-medium">إجمالي الغائبين</p>
              <p className="text-2xl md:text-3xl font-bold text-red-700 mt-1">{absentStudents.length}</p>
            </div>
            <Users className="text-red-400" size={32} />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-600 font-medium">3+ أيام متتالية</p>
              <p className="text-2xl md:text-3xl font-bold text-orange-700 mt-1">
                {absentStudents.filter(s => s.consecutiveDays >= 3).length}
              </p>
            </div>
            <AlertTriangle className="text-orange-400" size={32} />
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-medium">مسأذنون</p>
              <p className="text-2xl md:text-3xl font-bold text-blue-700 mt-1">
                {absentStudents.filter(s => s.isExcused).length}
              </p>
            </div>
            <CheckCircle className="text-blue-400" size={32} />
          </div>
        </div>
      </div>

      {/* Absent Students List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-3 md:p-4 border-b border-gray-200">
          <h2 className="text-base md:text-lg font-bold text-gray-800">
            قائمة الغائبين ({absentStudents.length})
          </h2>
        </div>
        
        {absentStudents.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <Users className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500 text-sm md:text-base">لا يوجد طلاب غائبين حسب الفلتر المحدد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-right text-xs font-bold text-gray-700">الطالب</th>
                  <th className="p-3 text-right text-xs font-bold text-gray-700">الفصل</th>
                  <th className="p-3 text-center text-xs font-bold text-gray-700">أيام الغياب</th>
                  <th className="p-3 text-center text-xs font-bold text-gray-700">متتالية</th>
                  <th className="p-3 text-center text-xs font-bold text-gray-700">آخر غياب</th>
                  <th className="p-3 text-center text-xs font-bold text-gray-700">الحالة</th>
                  <th className="p-3 text-center text-xs font-bold text-gray-700">رقم ولي الأمر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {absentStudents.map((info) => (
                  <tr key={info.student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {info.student.avatar ? (
                          <img 
                            src={info.student.avatar} 
                            alt={info.student.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                            <span className="text-teal-600 font-bold text-xs">
                              {info.student.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm text-gray-900">{info.student.name}</p>
                          {info.student.studentNumber && (
                            <p className="text-xs text-gray-500">#{info.student.studentNumber}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-gray-700">{info.student.classGrade}</td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        {info.absenceDays}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${getAbsenceBadgeColor(info.consecutiveDays)}`}>
                        {info.consecutiveDays} يوم
                      </span>
                    </td>
                    <td className="p-3 text-center text-xs text-gray-600">
                      {formatDate(info.lastAbsenceDate)}
                    </td>
                    <td className="p-3 text-center">
                      {info.isExcused ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle size={12} />
                          مسأذن
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle size={12} />
                          بدون عذر
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <a 
                        href={`https://wa.me/${info.student.parentPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-700 font-medium text-sm hover:underline"
                      >
                        {info.student.parentPhone}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

