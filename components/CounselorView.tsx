
import React, { useState } from 'react';
import { Student, ChallengeType, SchoolSettings } from '../types';
import { getChallengeColor, getChallengeLabel } from '../constants';
import { ShieldAlert, Heart, Coins, AlertOctagon, User, FileText, Settings, Save, Link as LinkIcon, MessageSquare, Filter, ChevronDown, Printer, Search, X, Edit } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { AlertModal } from './AlertModal';
import { CustomSelect } from './CustomSelect';

interface CounselorViewProps {
  students: Student[];
  onUpdateChallenge: (studentId: string, challenge: ChallengeType) => void;
  onViewReport: (student: Student) => void;
  settings?: SchoolSettings;
  onUpdateSettings?: (newSettings: SchoolSettings) => void;
}

export const CounselorView: React.FC<CounselorViewProps> = ({ students, onUpdateChallenge, onViewReport, settings, onUpdateSettings }) => {
  const { alert, alertModal } = useModal();
  const [localSettings, setLocalSettings] = useState<Partial<SchoolSettings>>({
      reportGeneralMessage: settings?.reportGeneralMessage || ''
  });

  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedChallengeFilter, setSelectedChallengeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);

  // Get classes from settings only (not from student data)
  const classesFromSettings = settings?.classGrades && settings.classGrades.length > 0
    ? settings.classGrades
    : [];
  
  const classes = classesFromSettings.length > 0 ? ['all', ...classesFromSettings.sort()] : ['all'];

  const challengeTypes: { type: ChallengeType; label: string; icon: any; color: string }[] = [
    { type: 'none', label: 'طبيعي / لا يوجد', icon: User, color: 'bg-gray-100 text-gray-600 border-gray-200' },
    { type: 'sick', label: 'ظروف صحية', icon: Heart, color: 'bg-red-100 text-red-600 border-red-200' },
    { type: 'orphan', label: 'يتيم', icon: User, color: 'bg-purple-100 text-purple-600 border-purple-200' },
    { type: 'special', label: 'خاص', icon: ShieldAlert, color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
    { type: 'financial', label: 'ظروف مادية', icon: Coins, color: 'bg-blue-100 text-blue-600 border-blue-200' },
    { type: 'retest', label: 'إعادة اختبار', icon: AlertOctagon, color: 'bg-yellow-100 text-yellow-600 border-yellow-200' },
    { type: 'behavioral', label: 'متابعة سلوكية', icon: ShieldAlert, color: 'bg-orange-100 text-orange-600 border-orange-200' },
  ];

  const handleSaveSettings = () => {
      if (settings && onUpdateSettings) {
          onUpdateSettings({
              ...settings,
              reportGeneralMessage: localSettings.reportGeneralMessage
          });
          alert({ message: 'تم تحديث رسالة الموجه بنجاح', type: 'success' });
      }
  };

  const handlePrintList = () => {
      window.print();
  };

  // Filter Logic - Only show students when a class is selected (not 'all')
  const filteredStudents = students.filter(student => {
      // Require a specific class to be selected (not 'all')
      if (selectedClass === 'all') {
          return false; // Don't show any students until a class is selected
      }
      
      const matchClass = student.classGrade === selectedClass;
      const matchChallenge = selectedChallengeFilter === 'all' 
          ? true 
          : selectedChallengeFilter === 'active_issues' // Special filter for any issue
              ? student.challenge !== 'none'
              : student.challenge === selectedChallengeFilter;
      const matchSearch = searchQuery.trim() === '' || 
          student.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      
      return matchClass && matchChallenge && matchSearch;
  });

  // Group students by class
  const studentsByClass = filteredStudents.reduce((acc, student) => {
      const classGrade = student.classGrade || 'غير محدد';
      if (!acc[classGrade]) {
          acc[classGrade] = [];
      }
      acc[classGrade].push(student);
      return acc;
  }, {} as Record<string, Student[]>);

  // Sort classes alphabetically
  const sortedClasses = Object.keys(studentsByClass).sort();

  return (
    <div className="space-y-3 md:space-y-4 lg:space-y-6 overflow-x-hidden">
      
      {/* Settings Section (Collapsible or Top) */}
      {settings && onUpdateSettings && (
          <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100 print:hidden">
              <details className="group">
                  <summary className="flex justify-between items-center font-bold text-gray-800 cursor-pointer list-none">
                      <span className="flex items-center gap-2">
                          <MessageSquare size={20} className="text-teal-600"/>
                          رسالة الموجه في التقارير
                      </span>
                      <span className="transition group-open:rotate-180">
                          <ChevronDown size={20} />
                      </span>
                  </summary>
                  <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <MessageSquare size={18} className="text-teal-600" />
                                <span>رسالة عامة تظهر في جميع تقارير الطلاب</span>
                            </label>
                            <textarea 
                                value={localSettings.reportGeneralMessage || ''}
                                onChange={(e) => setLocalSettings(prev => ({...prev, reportGeneralMessage: e.target.value}))}
                                className="w-full border-2 border-gray-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-h-[120px] resize-y shadow-sm transition-all"
                                placeholder="اكتب رسالة عامة من الموجه تظهر في جميع تقارير الطلاب..."
                            />
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                <FileText size={12} />
                                هذه الرسالة ستظهر في قسم "رسالة الموجه الطلابي / الإدارة" في جميع التقارير
                            </p>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button 
                            onClick={handleSaveSettings}
                            className="bg-teal-600 text-white px-8 py-3 rounded-xl hover:bg-teal-700 flex items-center gap-2 font-bold shadow-md transition-all hover:shadow-lg"
                        >
                            <Save size={18} />
                            حفظ الرسالة
                        </button>
                    </div>
                  </div>
              </details>
          </div>
      )}

      {/* Filters & Actions Bar */}
      <div className="bg-gradient-to-r from-teal-50 to-blue-50 p-2 md:p-3 rounded-lg shadow-sm border border-teal-200 print:hidden">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {/* Filter Icon & Label */}
              <div className="flex items-center gap-1 flex-shrink-0">
                  <Filter size={12} className="text-teal-600 flex-shrink-0" />
                  <span className="font-medium text-gray-700 text-[10px] md:text-xs">الفلاتر:</span>
              </div>

              {/* Class Filter - Required */}
              <div className="w-[120px] md:w-[150px] flex-shrink-0">
                  <CustomSelect
                    value={selectedClass}
                    onChange={(value) => setSelectedClass(value)}
                    options={[
                      { value: 'all', label: 'اختر الفصل' },
                      ...classes.filter(c => c !== 'all').map(c => ({ value: c, label: c }))
                    ]}
                    placeholder="اختر الفصل"
                    className="w-full text-[10px] md:text-xs"
                  />
              </div>
              {selectedClass === 'all' && (
                  <span className="text-[9px] md:text-[10px] text-red-500 flex-shrink-0">* مطلوب</span>
              )}

              {/* Search by Name */}
              <div className="flex-1 min-w-[120px] md:min-w-[200px]">
                  <div className="relative">
                      <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={12} />
                      <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="بحث بالاسم..."
                          className="w-full pr-7 pl-2 py-1 text-[10px] md:text-xs border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
                          disabled={selectedClass === 'all'}
                      />
                      {searchQuery && (
                          <button
                              onClick={() => setSearchQuery('')}
                              className="absolute top-0.5 left-1 text-gray-400 hover:text-gray-600 p-0.5"
                          >
                              <X size={10} />
                          </button>
                      )}
                  </div>
              </div>

              {/* Challenge Filter */}
              <div className="w-[120px] md:w-[150px] flex-shrink-0">
                  <CustomSelect
                    value={selectedChallengeFilter}
                    onChange={(value) => setSelectedChallengeFilter(value)}
                    options={[
                      { value: 'all', label: 'كافة الطلاب' },
                      { value: 'active_issues', label: 'لديهم تحديات' },
                      ...challengeTypes.filter(c => c.type !== 'none').map(c => ({ value: c.type, label: c.label }))
                    ]}
                    placeholder="كافة الطلاب"
                    className="w-full text-[10px] md:text-xs"
                    disabled={selectedClass === 'all'}
                  />
              </div>

              {/* Print Button */}
              <button 
                onClick={handlePrintList}
                className="flex items-center gap-1 px-2 md:px-3 py-1 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors font-medium shadow-sm text-[10px] md:text-xs flex-shrink-0"
              >
                  <Printer size={12} />
                  <span>طباعة</span>
              </button>
          </div>
      </div>

      {/* Main List View - Grouped by Class */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:border-none print:shadow-none">
          {/* Header for Print */}
          <div className="hidden print:block p-4 md:p-6 border-b-2 border-gray-400 text-center bg-gray-100 mb-4">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">كشف الطلاب - توجيه وإرشاد</h1>
              <div className="flex flex-wrap justify-center gap-3 text-sm md:text-base text-gray-700 mb-3">
                  <span className="bg-white px-4 py-2 rounded-lg border-2 border-gray-400 font-bold">
                      {selectedClass === 'all' ? 'جميع الفصول' : `الفصل: ${selectedClass}`}
                  </span>
                  <span className="bg-white px-4 py-2 rounded-lg border-2 border-gray-400 font-bold">
                      {selectedChallengeFilter === 'all' ? 'كافة الطلاب' : challengeTypes.find(c => c.type === selectedChallengeFilter)?.label}
                  </span>
                  {searchQuery && (
                      <span className="bg-white px-4 py-2 rounded-lg border-2 border-gray-400 font-bold">
                          البحث: {searchQuery}
                      </span>
                  )}
              </div>
              <p className="text-xs md:text-sm text-gray-600 font-medium">
                  تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
          </div>

          {filteredStudents.length > 0 ? (
            <>
            {/* Desktop View - Grouped by Class */}
            <div className="hidden md:block">
                {sortedClasses.map(classGrade => {
                    const classStudents = studentsByClass[classGrade];
                    return (
                        <div key={classGrade} className="border-b border-gray-200 last:border-b-0 print:break-inside-avoid print:page-break-inside-avoid">
                            {/* Class Header */}
                            <div className="bg-gradient-to-r from-teal-50 to-teal-100 print:bg-gray-100 border-b-2 border-teal-300 print:border-gray-400 px-6 py-4 print:py-3">
                                <h2 className="text-lg md:text-xl font-bold text-teal-900 print:text-gray-900 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <span className="bg-teal-600 text-white px-3 py-1 rounded-lg text-sm print:bg-gray-600">الفصل</span>
                                        <span>{classGrade}</span>
                                    </span>
                                    <span className="text-sm font-normal text-teal-700 print:text-gray-700 bg-white px-3 py-1 rounded-full border border-teal-300 print:border-gray-400">
                                        {classStudents.length} طالب
                                    </span>
                                </h2>
                            </div>
                            
                            {/* Students Table for this Class */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead className="bg-gray-100 print:bg-gray-200 border-b-2 border-gray-300 print:border-gray-400">
                                        <tr>
                                            <th className="px-4 md:px-6 py-3 print:py-2 text-xs md:text-sm font-bold text-gray-800 print:text-gray-900 border-l border-gray-300 print:border-gray-400">م</th>
                                            <th className="px-4 md:px-6 py-3 print:py-2 text-xs md:text-sm font-bold text-gray-800 print:text-gray-900 border-l border-gray-300 print:border-gray-400">اسم الطالب</th>
                                            <th className="px-4 md:px-6 py-3 print:py-2 text-xs md:text-sm font-bold text-gray-800 print:text-gray-900 border-l border-gray-300 print:border-gray-400">رقم ولي الأمر</th>
                                            <th className="px-4 md:px-6 py-3 print:py-2 text-xs md:text-sm font-bold text-gray-800 print:text-gray-900">حالة التحدي</th>
                                            <th className="px-4 md:px-6 py-3 print:py-2 text-xs md:text-sm font-bold text-left print:hidden">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 print:divide-gray-300">
                                        {classStudents.map((student, index) => {
                                            const challengeInfo = challengeTypes.find(c => c.type === student.challenge) || challengeTypes[0];
                                            return (
                                                <tr key={student.id} className="hover:bg-gray-50 print:hover:bg-transparent transition-colors group print:break-inside-avoid print:page-break-inside-avoid border-b border-gray-100 print:border-gray-200">
                                                    <td className="px-4 md:px-6 py-3 print:py-2 text-center text-sm font-medium text-gray-600 print:text-gray-700 bg-gray-50 print:bg-gray-100 border-l border-gray-200 print:border-gray-300">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-4 md:px-6 py-3 print:py-2 border-l border-gray-200 print:border-gray-300">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-200 print:hidden flex-shrink-0">
                                                                <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-gray-800 text-sm md:text-base print:text-sm">{student.name}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-3 print:py-2 text-sm font-mono text-gray-700 print:text-gray-800 border-l border-gray-200 print:border-gray-300">
                                                        {student.parentPhone || '-'}
                                                    </td>
                                                    <td className="px-4 md:px-6 py-3 print:py-2">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 print:border-gray-400 ${challengeInfo.color} print:bg-white print:text-gray-800`}>
                                                            <challengeInfo.icon size={14} className="print:hidden" />
                                                            {challengeInfo.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-3 print:py-2 text-left print:hidden">
                                                        <button 
                                                            onClick={() => setSelectedStudentForEdit(student)}
                                                            className="text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                                                        >
                                                            <Edit size={14} />
                                                            تعديل
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Mobile View - Grouped by Class */}
            <div className="md:hidden space-y-4">
                {sortedClasses.map(classGrade => {
                    const classStudents = studentsByClass[classGrade];
                    return (
                        <div key={classGrade} className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Class Header */}
                            <div className="bg-teal-50 border-b border-teal-200 px-4 py-2.5">
                                <h2 className="text-base font-bold text-teal-800 flex items-center justify-between">
                                    <span>{classGrade}</span>
                                    <span className="text-xs font-normal text-teal-600">
                                        ({classStudents.length} طالب)
                                    </span>
                                </h2>
                            </div>
                            
                            {/* Students Cards for this Class */}
                            <div className="p-3 space-y-2">
                                {classStudents.map(student => {
                                    const challengeInfo = challengeTypes.find(c => c.type === student.challenge) || challengeTypes[0];
                                    return (
                                        <div key={student.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                            <div className="flex items-center justify-between mb-2 gap-2">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-gray-800 text-sm truncate">{student.name}</p>
                                                        <p className="text-xs text-gray-400 font-mono truncate">{student.parentPhone}</p>
                                                    </div>
                                                </div>
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border ${challengeInfo.color} flex-shrink-0`}>
                                                    <challengeInfo.icon size={10} />
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                                <span className="text-xs text-gray-600">{challengeInfo.label}</span>
                                                <button 
                                                    onClick={() => setSelectedStudentForEdit(student)}
                                                    className="text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                                                >
                                                    <Edit size={12} />
                                                    تعديل
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            </>
          ) : selectedClass === 'all' ? (
             <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                 <Filter size={48} className="mb-4 opacity-20" />
                 <p className="font-bold text-gray-600 mb-2">الرجاء اختيار فصل لعرض الطلاب</p>
                 <p className="text-sm text-gray-400">اختر الفصل من القائمة أعلاه لعرض قائمة الطلاب</p>
             </div>
          ) : (
             <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                 <Search size={48} className="mb-4 opacity-20" />
                 <p>لا يوجد طلاب يطابقون خيارات البحث الحالية.</p>
             </div>
          )}
          
          <div className="p-4 bg-gray-50 print:bg-gray-100 border-t border-gray-200 print:border-gray-300 text-xs md:text-sm text-gray-500 print:text-gray-700 font-bold">
              العدد الإجمالي: {filteredStudents.length} طالب
          </div>
      </div>

      {/* Edit Challenge Modal */}
      {selectedStudentForEdit && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4 overflow-y-auto print:hidden"
            onClick={(e) => e.target === e.currentTarget && setSelectedStudentForEdit(null)}
            style={{ touchAction: 'none' }}
            onTouchMove={(e) => e.stopPropagation()}
          >
              <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto animate-in zoom-in-95 duration-200 overflow-visible"
                onClick={(e) => e.stopPropagation()}
              >
                  <div className="bg-teal-600 p-4 md:p-6 text-white flex justify-between items-start flex-shrink-0">
                      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white p-1 shadow-lg flex-shrink-0">
                              <img src={selectedStudentForEdit.avatar} className="w-full h-full rounded-full object-cover" />
                          </div>
                          <div className="min-w-0">
                              <h3 className="text-base md:text-xl font-bold truncate">{selectedStudentForEdit.name}</h3>
                              <p className="text-teal-100 text-xs md:text-sm opacity-90">{selectedStudentForEdit.classGrade}</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedStudentForEdit(null)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors flex-shrink-0">
                          <X size={18} className="md:w-5 md:h-5" />
                      </button>
                  </div>

                  <div className="p-4 md:p-6">
                      <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <ShieldAlert size={18} className="text-teal-600" />
                          تحديد حالة الطالب / التحدي:
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-3 mb-6">
                          {challengeTypes.map(c => (
                              <button
                                key={c.type}
                                onClick={() => {
                                    onUpdateChallenge(selectedStudentForEdit.id, c.type);
                                    // Update local state to reflect change immediately without closing if needed, or close
                                    setSelectedStudentForEdit({...selectedStudentForEdit, challenge: c.type});
                                }}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-sm font-bold text-right ${
                                    selectedStudentForEdit.challenge === c.type
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-lg scale-105'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                              >
                                  <div className={`p-1.5 rounded-full ${selectedStudentForEdit.challenge === c.type ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                                      <c.icon size={16} />
                                  </div>
                                  {c.label}
                              </button>
                          ))}
                      </div>

                      <div className="border-t border-gray-100 pt-4 flex gap-3">
                          <button 
                            onClick={() => {
                                onViewReport(selectedStudentForEdit);
                                setSelectedStudentForEdit(null);
                            }}
                            className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 font-bold flex items-center justify-center gap-2"
                          >
                              <FileText size={18} />
                              عرض التقرير المفصل
                          </button>
                          <button 
                             onClick={() => setSelectedStudentForEdit(null)}
                             className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg hover:bg-teal-700 font-bold"
                          >
                              حفظ وإغلاق
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      
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
    </div>
  );
};
