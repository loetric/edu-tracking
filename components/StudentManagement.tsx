import React, { useState } from 'react';
import { Student, SchoolSettings } from '../types';
import { UserPlus, Upload, Search, Filter, X, Edit2, Trash2 } from 'lucide-react';
import { ExcelImporter } from './ExcelImporter';
import { useModal } from '../hooks/useModal';
import { ConfirmModal } from './ConfirmModal';
import { AlertModal } from './AlertModal';

interface StudentManagementProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (studentId: string, updates: Partial<Student>) => void;
  onDeleteStudent: (studentId: string) => void;
  onImportStudents: (students: Student[]) => void;
  settings: SchoolSettings;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ students, onAddStudent, onUpdateStudent, onDeleteStudent, onImportStudents, settings }) => {
  const { confirm, alert, confirmModal, alertModal } = useModal();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassGrade, setFilterClassGrade] = useState<string>('');
  const [filterChallenge, setFilterChallenge] = useState<string>('');
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    id: '',
    name: '',
    classGrade: '',
    parentPhone: '',
    challenge: 'none',
    avatar: `https://ui-avatars.com/api/?name=طالب&background=random`,
    studentNumber: ''
  });

  // Get available class grades from settings or from students
  const availableClassGrades = settings?.classGrades && settings.classGrades.length > 0
    ? settings.classGrades
    : Array.from(new Set(students.map(s => s.classGrade))).sort();

  // Get unique class grades for filter (from actual student data)
  const uniqueClassGrades = Array.from(new Set(students.map(s => s.classGrade))).sort();
  
  // Get unique challenges for filter
  const uniqueChallenges = Array.from(new Set(students.map(s => s.challenge || 'none'))).sort();

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchTerm || 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentPhone.includes(searchTerm);
    
    const matchesClassGrade = !filterClassGrade || student.classGrade === filterClassGrade;
    const matchesChallenge = !filterChallenge || (student.challenge || 'none') === filterChallenge;
    
    return matchesSearch && matchesClassGrade && matchesChallenge;
  });

  const handleAddStudentSubmit = () => {
    if (!newStudent.id || !newStudent.name || !newStudent.classGrade || !newStudent.parentPhone) {
      alert({ message: 'الرجاء تعبئة جميع الحقول المطلوبة', type: 'warning' });
      return;
    }

    // Check if student ID already exists
    if (students.some(s => s.id === newStudent.id)) {
      alert({ message: 'رقم الطالب مسجل مسبقاً', type: 'error' });
      return;
    }

    onAddStudent({
      id: newStudent.id,
      name: newStudent.name,
      classGrade: newStudent.classGrade,
      parentPhone: newStudent.parentPhone,
      challenge: newStudent.challenge || 'none',
      avatar: newStudent.avatar || `https://ui-avatars.com/api/?name=${newStudent.name}&background=random`,
      studentNumber: newStudent.studentNumber || newStudent.id
    } as Student);
    
    // Reset form
    setNewStudent({
      id: '',
      name: '',
      classGrade: '',
      parentPhone: '',
      challenge: 'none',
      avatar: `https://ui-avatars.com/api/?name=طالب&background=random`,
      studentNumber: ''
    });
    setShowAddForm(false);
    alert({ message: 'تم إضافة الطالب بنجاح!', type: 'success' });
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setNewStudent({
      id: student.id,
      name: student.name,
      classGrade: student.classGrade,
      parentPhone: student.parentPhone,
      challenge: student.challenge || 'none',
      avatar: student.avatar || `https://ui-avatars.com/api/?name=${student.name}&background=random`,
      studentNumber: student.studentNumber || student.id
    });
    setShowAddForm(true);
  };

  const handleDeleteStudent = async (student: Student) => {
    const shouldDelete = await confirm({
      title: 'حذف الطالب',
      message: `هل أنت متأكد من حذف الطالب "${student.name}" (${student.id})؟\n\nسيتم حذف جميع بيانات الطالب بما في ذلك السجلات والتقارير المرتبطة به.`,
      type: 'warning',
      confirmText: 'حذف',
      cancelText: 'إلغاء'
    });
    
    if (shouldDelete) {
      onDeleteStudent(student.id);
    }
  };

  const handleUpdateStudentSubmit = () => {
    if (!editingStudent) return;
    
    if (!newStudent.name || !newStudent.classGrade || !newStudent.parentPhone) {
      alert({ message: 'الرجاء تعبئة جميع الحقول المطلوبة', type: 'warning' });
      return;
    }

    // Check if student ID already exists (if changed)
    if (newStudent.id !== editingStudent.id && students.some(s => s.id === newStudent.id)) {
      alert({ message: 'رقم الطالب مسجل مسبقاً', type: 'error' });
      return;
    }

    onUpdateStudent(editingStudent.id, {
      id: newStudent.id,
      name: newStudent.name,
      classGrade: newStudent.classGrade,
      parentPhone: newStudent.parentPhone,
      challenge: newStudent.challenge || 'none',
      avatar: newStudent.avatar || `https://ui-avatars.com/api/?name=${newStudent.name}&background=random`
    });
    
    // Reset form
    setEditingStudent(null);
    setNewStudent({
      id: '',
      name: '',
      classGrade: '',
      parentPhone: '',
      challenge: 'none',
      avatar: `https://ui-avatars.com/api/?name=طالب&background=random`
    });
    setShowAddForm(false);
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
    setNewStudent({
      id: '',
      name: '',
      classGrade: '',
      parentPhone: '',
      challenge: 'none',
      avatar: `https://ui-avatars.com/api/?name=طالب&background=random`
    });
    setShowAddForm(false);
  };

  const handleImport = async (newStudents: Student[]) => {
    // Check for duplicate IDs
    const existingIds = new Set(students.map(s => s.id));
    const duplicates = newStudents.filter(s => existingIds.has(s.id));
    
    if (duplicates.length > 0) {
      const duplicateIds = duplicates.map(s => s.id).join(', ');
      const shouldContinue = await confirm({
        title: 'أرقام مكررة',
        message: `يوجد ${duplicates.length} طالب برقم مسجل مسبقاً: ${duplicateIds}\n\nهل تريد المتابعة وتخطي المكررات؟`,
        type: 'warning',
        confirmText: 'نعم، تخطي المكررات',
        cancelText: 'إلغاء'
      });
      
      if (!shouldContinue) {
        return;
      }
      // Remove duplicates
      newStudents = newStudents.filter(s => !existingIds.has(s.id));
    }
    
    onImportStudents(newStudents);
    setShowImportForm(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterClassGrade('');
    setFilterChallenge('');
  };

  const hasActiveFilters = searchTerm || filterClassGrade || filterChallenge;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">إدارة الطلاب</h2>
            <p className="text-gray-500 text-sm mt-1">
              إجمالي الطلاب: <span className="font-bold text-teal-600">{students.length}</span>
              {hasActiveFilters && (
                <span className="mr-2">
                  | النتائج المفلترة: <span className="font-bold text-blue-600">{filteredStudents.length}</span>
                </span>
              )}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowImportForm(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-bold shadow-sm"
            >
              <UserPlus size={18} />
              <span className="text-sm">إضافة طالب</span>
            </button>
            
            <button
              onClick={() => {
                setShowImportForm(!showImportForm);
                setShowAddForm(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-sm"
            >
              <Upload size={18} />
              <span className="text-sm">استيراد من Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Student Form */}
      {showAddForm && (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">{editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">رقم الطالب * (أرقام فقط - بحد أقصى 10)</label>
              <input
                type="text"
                value={newStudent.id || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                  setNewStudent({ ...newStudent, id: value });
                }}
                disabled={!!editingStudent}
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="مثال: 12345"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">اسم الطالب * (حروف فقط - بحد أقصى 50)</label>
              <input
                type="text"
                value={newStudent.name || ''}
                onChange={(e) => {
                  // Allow Arabic and English letters, spaces, and common Arabic characters
                  const value = e.target.value.replace(/[^a-zA-Z\u0600-\u06FF\s\u0640]/g, '').slice(0, 50);
                  setNewStudent({ ...newStudent, name: value });
                }}
                maxLength={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                placeholder="مثال: أحمد محمد علي"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">الصف *</label>
              {availableClassGrades.length > 0 ? (
                <select
                  value={newStudent.classGrade || ''}
                  onChange={(e) => setNewStudent({ ...newStudent, classGrade: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 bg-white"
                >
                  <option value="">اختر الصف</option>
                  {availableClassGrades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={newStudent.classGrade || ''}
                  onChange={(e) => setNewStudent({ ...newStudent, classGrade: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                  placeholder="مثال: الرابع الابتدائي"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">رقم ولي الأمر * (أرقام فقط - بحد أقصى 13)</label>
              <input
                type="tel"
                value={newStudent.parentPhone || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 13);
                  setNewStudent({ ...newStudent, parentPhone: value });
                }}
                maxLength={13}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                placeholder="مثال: 966500000000"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={editingStudent ? handleCancelEdit : () => setShowAddForm(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={editingStudent ? handleUpdateStudentSubmit : handleAddStudentSubmit}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              {editingStudent ? 'حفظ التعديلات' : 'إضافة'}
            </button>
          </div>
        </div>
      )}

      {/* Import Form */}
      {showImportForm && (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">استيراد الطلاب من Excel</h3>
            <button
              onClick={() => setShowImportForm(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <ExcelImporter onImport={handleImport} />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <span className="font-bold text-gray-700">الفلاتر:</span>
          </div>
          
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالاسم، الرقم، أو الجوال..."
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Class Grade Filter */}
          <select
            value={filterClassGrade}
            onChange={(e) => setFilterClassGrade(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 bg-white"
          >
            <option value="">جميع الصفوف</option>
            {uniqueClassGrades.map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>

          {/* Challenge Filter */}
          <select
            value={filterChallenge}
            onChange={(e) => setFilterChallenge(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 bg-white"
          >
            <option value="">جميع الحالات</option>
            {uniqueChallenges.map(challenge => (
              <option key={challenge} value={challenge}>
                {challenge === 'none' ? 'لا يوجد' : challenge}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={16} />
              <span className="text-sm">مسح الفلاتر</span>
            </button>
          )}
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <div className="flex">
            {/* Sidebar with sequential numbers */}
            <div className="w-16 bg-gray-50 border-l border-gray-200 flex-shrink-0">
              <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-3 py-4">
                <span className="text-xs font-bold text-gray-500">#</span>
              </div>
              <div className="divide-y divide-gray-100">
                {filteredStudents.map((student) => {
                  // Get the index from the original students array (before filtering)
                  const originalIndex = students.findIndex(s => s.id === student.id);
                  const sequentialNumber = originalIndex >= 0 ? originalIndex + 1 : 0;
                  return (
                    <div key={student.id} className="px-3 py-4 text-center">
                      <span className="text-xs font-medium text-gray-500">{sequentialNumber}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Main table */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">رقم الطالب</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">الاسم</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">الصف</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">رقم ولي الأمر</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">الحالة</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-700">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">
                          {student.studentNumber || student.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-800">{student.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.classGrade}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.parentPhone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        student.challenge === 'none' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {student.challenge === 'none' ? 'عادي' : student.challenge}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditStudent(student)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                          <span>تحرير</span>
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                          <span>حذف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    {hasActiveFilters ? 'لا توجد نتائج تطابق الفلاتر' : 'لا يوجد طلاب مسجلين'}
                  </td>
                </tr>
              )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => {
              // Get the index from the original students array (before filtering)
              const originalIndex = students.findIndex(s => s.id === student.id);
              const sequentialNumber = originalIndex >= 0 ? originalIndex + 1 : 0;
              return (
              <div key={student.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-gray-500">{sequentialNumber}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-base">{student.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">رقم: {student.studentNumber || student.id}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    student.challenge === 'none' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {student.challenge === 'none' ? 'عادي' : student.challenge}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-bold">الصف:</span> {student.classGrade}
                  </p>
                  {student.parentPhone && (
                    <p className="text-sm text-gray-600">
                      <span className="font-bold">الجوال:</span> {student.parentPhone}
                    </p>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleEditStudent(student)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                  >
                    <Edit2 size={14} />
                    <span>تحرير</span>
                  </button>
                  <button
                    onClick={() => handleDeleteStudent(student)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-gray-400">
              {hasActiveFilters ? 'لا توجد نتائج تطابق الفلاتر' : 'لا يوجد طلاب مسجلين'}
            </div>
          )}
        </div>
      </div>
      
      {/* Modals */}
      {confirmModal.isOpen && confirmModal.options && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.options.title || 'تأكيد'}
          message={confirmModal.options.message}
          type={confirmModal.options.type || 'warning'}
          confirmText={confirmModal.options.confirmText || 'تأكيد'}
          cancelText={confirmModal.options.cancelText || 'إلغاء'}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}
      
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

