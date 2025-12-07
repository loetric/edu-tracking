
import React, { useState } from 'react';
import { Student, ChallengeType, SchoolSettings } from '../types';
import { getChallengeColor, getChallengeLabel } from '../constants';
import { ShieldAlert, Heart, Coins, AlertOctagon, User, FileText, Settings, Save, Link as LinkIcon, MessageSquare, Filter, ChevronDown, Printer, Search, X, Edit } from 'lucide-react';

interface CounselorViewProps {
  students: Student[];
  onUpdateChallenge: (studentId: string, challenge: ChallengeType) => void;
  onViewReport: (student: Student) => void;
  settings?: SchoolSettings;
  onUpdateSettings?: (newSettings: SchoolSettings) => void;
}

export const CounselorView: React.FC<CounselorViewProps> = ({ students, onUpdateChallenge, onViewReport, settings, onUpdateSettings }) => {
  const [localSettings, setLocalSettings] = useState<Partial<SchoolSettings>>({
      reportGeneralMessage: settings?.reportGeneralMessage || '',
      reportLink: settings?.reportLink || ''
  });

  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedChallengeFilter, setSelectedChallengeFilter] = useState<string>('all');
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);

  // Extract unique classes
  const classes = ['all', ...Array.from(new Set(students.map(s => s.classGrade)))];

  const challengeTypes: { type: ChallengeType; label: string; icon: any; color: string }[] = [
    { type: 'none', label: 'طبيعي / لا يوجد', icon: User, color: 'bg-gray-100 text-gray-600 border-gray-200' },
    { type: 'sick', label: 'ظروف صحية', icon: Heart, color: 'bg-red-100 text-red-600 border-red-200' },
    { type: 'orphan', label: 'يتيم', icon: User, color: 'bg-purple-100 text-purple-600 border-purple-200' },
    { type: 'financial', label: 'ظروف مادية', icon: Coins, color: 'bg-blue-100 text-blue-600 border-blue-200' },
    { type: 'retest', label: 'إعادة اختبار', icon: AlertOctagon, color: 'bg-yellow-100 text-yellow-600 border-yellow-200' },
    { type: 'behavioral', label: 'متابعة سلوكية', icon: ShieldAlert, color: 'bg-orange-100 text-orange-600 border-orange-200' },
  ];

  const handleSaveSettings = () => {
      if (settings && onUpdateSettings) {
          onUpdateSettings({
              ...settings,
              reportGeneralMessage: localSettings.reportGeneralMessage,
              reportLink: localSettings.reportLink
          });
          alert('تم تحديث إعدادات التقرير بنجاح');
      }
  };

  const handlePrintList = () => {
      window.print();
  };

  // Filter Logic
  const filteredStudents = students.filter(student => {
      const matchClass = selectedClass === 'all' || student.classGrade === selectedClass;
      const matchChallenge = selectedChallengeFilter === 'all' 
          ? true 
          : selectedChallengeFilter === 'active_issues' // Special filter for any issue
              ? student.challenge !== 'none'
              : student.challenge === selectedChallengeFilter;
      
      return matchClass && matchChallenge;
  });

  return (
    <div className="space-y-6">
      
      {/* Settings Section (Collapsible or Top) */}
      {settings && onUpdateSettings && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:hidden">
              <details className="group">
                  <summary className="flex justify-between items-center font-bold text-gray-800 cursor-pointer list-none">
                      <span className="flex items-center gap-2">
                          <Settings size={20} className="text-teal-600"/>
                          إعدادات التقرير العام (رسالة الموجه والروابط)
                      </span>
                      <span className="transition group-open:rotate-180">
                          <ChevronDown size={20} />
                      </span>
                  </summary>
                  <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                <MessageSquare size={16} />
                                رسالة عامة في التقرير
                            </label>
                            <textarea 
                                value={localSettings.reportGeneralMessage}
                                onChange={(e) => setLocalSettings(prev => ({...prev, reportGeneralMessage: e.target.value}))}
                                className="w-full border-gray-300 rounded-lg p-3 text-sm focus:ring-teal-500 focus:border-teal-500 min-h-[80px]"
                                placeholder="اكتب ملاحظة تظهر في جميع تقارير الطلاب..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                <LinkIcon size={16} />
                                رابط خارجي (يتحول لباركود)
                            </label>
                            <input 
                                type="url"
                                value={localSettings.reportLink}
                                onChange={(e) => setLocalSettings(prev => ({...prev, reportLink: e.target.value}))}
                                className="w-full border-gray-300 rounded-lg p-3 text-sm focus:ring-teal-500 focus:border-teal-500 mb-2"
                                placeholder="https://example.com"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button 
                            onClick={handleSaveSettings}
                            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2 font-bold shadow-sm"
                        >
                            <Save size={18} />
                            حفظ الإعدادات
                        </button>
                    </div>
                  </div>
              </details>
          </div>
      )}

      {/* Filters & Actions Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              {/* Class Filter */}
              <div className="relative">
                  <Filter className="absolute top-3 right-3 text-gray-400" size={16} />
                  <select 
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="pl-4 pr-10 py-2.5 border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 w-full md:w-48 appearance-none bg-white border text-sm font-bold text-gray-700"
                  >
                      <option value="all">جميع الفصول</option>
                      {classes.filter(c => c !== 'all').map(c => (
                          <option key={c} value={c}>{c}</option>
                      ))}
                  </select>
              </div>

              {/* Challenge Filter */}
              <div className="relative">
                  <ShieldAlert className="absolute top-3 right-3 text-gray-400" size={16} />
                  <select 
                    value={selectedChallengeFilter}
                    onChange={(e) => setSelectedChallengeFilter(e.target.value)}
                    className="pl-4 pr-10 py-2.5 border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 w-full md:w-56 appearance-none bg-white border text-sm font-bold text-gray-700"
                  >
                      <option value="all">كافة الطلاب</option>
                      <option value="active_issues">جميع الحالات (لديهم تحديات)</option>
                      <option disabled>──────────</option>
                      {challengeTypes.filter(c => c.type !== 'none').map(c => (
                          <option key={c.type} value={c.type}>{c.label}</option>
                      ))}
                  </select>
              </div>
          </div>

          <button 
            onClick={handlePrintList}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-bold shadow-md"
          >
              <Printer size={18} />
              طباعة الكشف
          </button>
      </div>

      {/* Main List View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:border-none print:shadow-none">
          {/* Header for Print */}
          <div className="hidden print:block p-8 border-b border-gray-200 text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">كشف الطلاب - توجيه وإرشاد</h1>
              <p className="text-gray-500">
                  الفلتر: {selectedClass === 'all' ? 'جميع الفصول' : selectedClass} | 
                  التصنيف: {selectedChallengeFilter === 'all' ? 'الكل' : challengeTypes.find(c => c.type === selectedChallengeFilter)?.label}
              </p>
          </div>

          {filteredStudents.length > 0 ? (
            <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 font-bold">الطالب</th>
                            <th className="px-6 py-4 font-bold">الصف</th>
                            <th className="px-6 py-4 font-bold">حالة التحدي</th>
                            <th className="px-6 py-4 font-bold text-left print:hidden">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStudents.map(student => {
                            const challengeInfo = challengeTypes.find(c => c.type === student.challenge) || challengeTypes[0];
                            return (
                                <tr key={student.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 print:hidden">
                                                <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{student.name}</p>
                                                <p className="text-xs text-gray-400 font-mono print:text-gray-600">{student.parentPhone}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                                        {student.classGrade}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${challengeInfo.color}`}>
                                            <challengeInfo.icon size={12} />
                                            {challengeInfo.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-left print:hidden">
                                        <button 
                                            onClick={() => setSelectedStudentForEdit(student)}
                                            className="text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                                        >
                                            <Edit size={14} />
                                            تعديل الحالة
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {filteredStudents.map(student => {
                    const challengeInfo = challengeTypes.find(c => c.type === student.challenge) || challengeTypes[0];
                    return (
                        <div key={student.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                                    <div>
                                        <p className="font-bold text-gray-800">{student.name}</p>
                                        <p className="text-xs text-gray-400 font-mono">{student.parentPhone}</p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${challengeInfo.color}`}>
                                    <challengeInfo.icon size={12} />
                                    {challengeInfo.label}
                                </span>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <span className="text-sm font-medium text-gray-600">{student.classGrade}</span>
                                <button 
                                    onClick={() => setSelectedStudentForEdit(student)}
                                    className="text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                                >
                                    <Edit size={14} />
                                    تعديل الحالة
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            </>
          ) : (
             <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                 <Search size={48} className="mb-4 opacity-20" />
                 <p>لا يوجد طلاب يطابقون خيارات البحث الحالية.</p>
             </div>
          )}
          
          <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 font-bold">
              العدد الإجمالي: {filteredStudents.length} طالب
          </div>
      </div>

      {/* Edit Challenge Modal */}
      {selectedStudentForEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 overflow-hidden">
                  <div className="bg-teal-600 p-6 text-white flex justify-between items-start">
                      <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-white p-1 shadow-lg">
                              <img src={selectedStudentForEdit.avatar} className="w-full h-full rounded-full object-cover" />
                          </div>
                          <div>
                              <h3 className="text-xl font-bold">{selectedStudentForEdit.name}</h3>
                              <p className="text-teal-100 text-sm opacity-90">{selectedStudentForEdit.classGrade}</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedStudentForEdit(null)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="p-6">
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
    </div>
  );
};
