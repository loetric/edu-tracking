import React, { useState, useMemo } from 'react';
import { Student, DailyRecord, SchoolSettings } from '../types';
import { AlertCircle, TrendingUp, TrendingDown, CheckCircle, XCircle, Printer, Filter, Search, X } from 'lucide-react';
import { getStatusLabel, getStatusColor } from '../constants';
import { CustomSelect } from './CustomSelect';

interface BehaviorTrackingProps {
  students: Student[];
  records: Record<string, DailyRecord>;
  settings: SchoolSettings;
}

type BehaviorCategory = 'excellent' | 'good' | 'needs_attention';

export const BehaviorTracking: React.FC<BehaviorTrackingProps> = ({ students, records, settings }) => {
  const [selectedCategory, setSelectedCategory] = useState<BehaviorCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Get unique classes from settings only (not from student data)
  const uniqueClasses = useMemo(() => {
    const classesFromSettings = settings?.classGrades && settings.classGrades.length > 0
      ? settings.classGrades
      : [];
    return ['all', ...classesFromSettings.sort()];
  }, [settings]);

  // Categorize students based on behavior records
  const categorizedStudents = useMemo(() => {
    const categorized: Record<BehaviorCategory, Student[]> = {
      excellent: [],
      good: [],
      needs_attention: []
    };

    students.forEach(student => {
      // Get all behavior records for this student
      const studentRecords = Object.values(records).filter(r => r.studentId === student.id);
      
      if (studentRecords.length === 0) {
        // No records - default to good
        categorized.good.push(student);
        return;
      }

      // Calculate average behavior score
      const behaviorScores = studentRecords
        .filter(r => r.attendance === 'present')
        .map(r => {
          switch (r.behavior) {
            case 'excellent': return 5;
            case 'good': return 4;
            case 'average': return 3;
            case 'poor': return 1;
            default: return 0;
          }
        });

      if (behaviorScores.length === 0) {
        categorized.good.push(student);
        return;
      }

      const avgScore = behaviorScores.reduce((sum, score) => sum + score, 0) / behaviorScores.length;

      // Categorize based on average
      if (avgScore >= 4.5) {
        categorized.excellent.push(student);
      } else if (avgScore >= 3.5) {
        categorized.good.push(student);
      } else {
        categorized.needs_attention.push(student);
      }
    });

    return categorized;
  }, [students, records]);

  // Filter students - require class filter
  const filteredStudents = useMemo(() => {
    // Don't show any students if no class is selected
    if (selectedClass === 'all') {
      return [];
    }

    let filtered: Student[] = [];

    if (selectedCategory === 'all') {
      filtered = [
        ...categorizedStudents.excellent,
        ...categorizedStudents.good,
        ...categorizedStudents.needs_attention
      ];
    } else {
      filtered = categorizedStudents[selectedCategory];
    }

    // Filter by class (required)
    filtered = filtered.filter(s => s.classGrade === selectedClass);

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.studentNumber?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [categorizedStudents, selectedCategory, selectedClass, searchQuery]);

  const getCategoryLabel = (cat: BehaviorCategory): string => {
    switch (cat) {
      case 'excellent': return 'ممتاز';
      case 'good': return 'جيد';
      case 'needs_attention': return 'يحتاج إلى متابعة';
      default: return '';
    }
  };

  const getCategoryColor = (cat: BehaviorCategory): string => {
    switch (cat) {
      case 'excellent': return 'bg-green-50 border-green-200 text-green-800';
      case 'good': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'needs_attention': return 'bg-orange-50 border-orange-200 text-orange-800';
      default: return '';
    }
  };

  const getCategoryIcon = (cat: BehaviorCategory) => {
    switch (cat) {
      case 'excellent': return <CheckCircle size={20} className="text-green-600" />;
      case 'good': return <TrendingUp size={20} className="text-blue-600" />;
      case 'needs_attention': return <AlertCircle size={20} className="text-orange-600" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <AlertCircle size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">متابعة الحالات السلوكية</h2>
            <p className="text-gray-500 text-sm">بناءً على ملاحظات المعلمين المرصودة</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium mb-1">ممتاز</p>
                <h3 className="text-2xl font-bold text-green-800">{categorizedStudents.excellent.length}</h3>
              </div>
              <CheckCircle size={32} className="text-green-600" />
            </div>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium mb-1">جيد</p>
                <h3 className="text-2xl font-bold text-blue-800">{categorizedStudents.good.length}</h3>
              </div>
              <TrendingUp size={32} className="text-blue-600" />
            </div>
          </div>
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium mb-1">يحتاج إلى متابعة</p>
                <h3 className="text-2xl font-bold text-orange-800">{categorizedStudents.needs_attention.length}</h3>
              </div>
              <AlertCircle size={32} className="text-orange-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 flex-shrink-0">
              <Filter size={14} className="text-teal-600" />
              <span className="font-medium text-gray-700 text-xs">الفلاتر:</span>
            </div>
            
            {/* Category Filter */}
            <div className="w-[150px] flex-shrink-0">
              <CustomSelect
                value={selectedCategory}
                onChange={(value) => setSelectedCategory(value as BehaviorCategory | 'all')}
                options={[
                  { value: 'all', label: 'جميع الفئات' },
                  { value: 'excellent', label: 'ممتاز' },
                  { value: 'good', label: 'جيد' },
                  { value: 'needs_attention', label: 'يحتاج إلى متابعة' }
                ]}
                className="w-full text-xs"
                disabled={selectedClass === 'all'}
              />
            </div>

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

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-bold shadow-md text-xs print:hidden"
            >
              <Printer size={16} />
              <span>طباعة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {selectedClass === 'all' ? (
          <div className="p-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <Filter size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-bold">الرجاء اختيار صف لعرض الطلاب</p>
            </div>
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 print:bg-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700">الطالب</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700">الصف</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700">التقييم السلوكي</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 print:hidden">الفئة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student) => {
                  const studentRecords = Object.values(records).filter(r => r.studentId === student.id && r.attendance === 'present');
                  const latestRecord = studentRecords[studentRecords.length - 1];
                  const category = selectedCategory === 'all' 
                    ? (categorizedStudents.excellent.includes(student) ? 'excellent' :
                       categorizedStudents.good.includes(student) ? 'good' : 'needs_attention')
                    : selectedCategory;

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
                      <td className="px-4 py-3">
                        {latestRecord ? (
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(latestRecord.behavior)}`}>
                            {getStatusLabel(latestRecord.behavior)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">لا توجد بيانات</span>
                        )}
                      </td>
                      <td className="px-4 py-3 print:hidden">
                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border-2 ${getCategoryColor(category)}`}>
                          {getCategoryIcon(category)}
                          {getCategoryLabel(category)}
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
            <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-bold">لا توجد نتائج</p>
          </div>
        )}
      </div>
    </div>
  );
};

