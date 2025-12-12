import React, { useState, useMemo, useEffect } from 'react';
import { Student, SchoolSettings } from '../types';
import { UserPlus, Upload, Search, Filter, X, Edit2, Trash2 } from 'lucide-react';
import { ExcelImporter } from './ExcelImporter';
import { useModal } from '../hooks/useModal';
import { ConfirmModal } from './ConfirmModal';
import { AlertModal } from './AlertModal';
import { CustomSelect } from './CustomSelect';

interface StudentManagementProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (studentId: string, updates: Partial<Student>) => void;
  onDeleteStudent: (studentId: string) => void;
  onImportStudents: (students: Student[]) => Promise<void>;
  settings: SchoolSettings;
  role?: 'admin' | 'teacher' | 'counselor';
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ students, onAddStudent, onUpdateStudent, onDeleteStudent, onImportStudents, settings, role = 'admin' }) => {
  const { confirm, alert, confirmModal, alertModal } = useModal();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Initialize filterClassRoom with first class if available
  const [filterClassRoom, setFilterClassRoom] = useState<string>('');
  
  // Update filterClassRoom when settings change - always select first class
  useEffect(() => {
    if (settings?.classGrades && settings.classGrades.length > 0) {
      const classGradesArray = Array.isArray(settings.classGrades) 
        ? settings.classGrades 
        : (typeof settings.classGrades === 'string' ? JSON.parse(settings.classGrades) : []);
      if (classGradesArray.length > 0) {
        const firstClass = classGradesArray.sort()[0];
        if (firstClass && filterClassRoom !== firstClass) {
          setFilterClassRoom(firstClass);
        }
      }
    }
  }, [settings?.classGrades]);
  const [filterChallenge, setFilterChallenge] = useState<string>('');
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    id: '',
    name: '',
    classGrade: '',
    parentPhone: '',
    challenge: 'none',
    avatar: `https://ui-avatars.com/api/?name=طالب&background=random`,
    studentNumber: '',
    status: 'regular' // حالة الطالب: منتظم، منقطع، مفصول
  });

  // Get available class grades from settings only (not from student data)
  const availableClassGrades = settings?.classGrades && settings.classGrades.length > 0
    ? [...settings.classGrades].sort()
    : [];

  // Get unique class grades for filter (only from settings, not from student data)
  const uniqueClassGrades = settings?.classGrades && settings.classGrades.length > 0
    ? [...settings.classGrades].sort()
    : [];
  
  // Get class rooms (الفصول) from settings only (not from student data)
  const uniqueClassRooms = useMemo(() => {
    // Debug: log settings to see what we're getting
    console.log('=== StudentManagement Debug ===');
    console.log('settings:', settings);
    console.log('settings?.classGrades:', settings?.classGrades);
    console.log('typeof settings?.classGrades:', typeof settings?.classGrades);
    console.log('Array.isArray(settings?.classGrades):', Array.isArray(settings?.classGrades));
    
    if (!settings) {
      console.log('No settings object');
      return [];
    }
    
    if (!settings.classGrades) {
      console.log('No classGrades property in settings');
      return [];
    }
    
    // Handle string (JSON) case
    let classGradesArray = settings.classGrades;
    if (typeof settings.classGrades === 'string') {
      try {
        classGradesArray = JSON.parse(settings.classGrades);
        console.log('Parsed classGrades from string:', classGradesArray);
      } catch (e) {
        console.error('Error parsing classGrades string:', e);
        return [];
      }
    }
    
    if (!Array.isArray(classGradesArray)) {
      console.log('classGrades is not an array:', classGradesArray);
      return [];
    }
    
    if (classGradesArray.length === 0) {
      console.log('classGrades array is empty');
      return [];
    }
    
    const rooms = [...classGradesArray].filter(g => g && g.trim().length > 0).sort();
    console.log('Final uniqueClassRooms:', rooms);
    console.log('=== End Debug ===');
    return rooms;
  }, [settings?.classGrades]);
  
  // Get unique challenges for filter
  const uniqueChallenges = Array.from(new Set(students.map(s => s.challenge || 'none'))).sort();

  // Filter students - require classRoom filter
  const filteredStudents = filterClassRoom ? students.filter(student => {
    const matchesSearch = !searchTerm || 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentPhone.includes(searchTerm);
    
    // Match classRoom (الفصل) - match full classGrade
    const matchesClassRoom = student.classGrade === filterClassRoom;
    
    const matchesChallenge = !filterChallenge || (student.challenge || 'none') === filterChallenge;
    
    return matchesSearch && matchesClassRoom && matchesChallenge;
  }) : [];

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
      studentNumber: newStudent.studentNumber || newStudent.id,
      status: newStudent.status || 'regular' // حالة الطالب
    } as Student);
    
    // Reset form
    setNewStudent({
      id: '',
      name: '',
      classGrade: '',
      parentPhone: '',
      challenge: 'none',
      avatar: `https://ui-avatars.com/api/?name=طالب&background=random`,
      studentNumber: '',
      status: 'regular'
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
      studentNumber: student.studentNumber || student.id,
      status: student.status || 'regular' // حالة الطالب
    });
    // Don't open add form - edit form is now a separate modal
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
      avatar: newStudent.avatar || `https://ui-avatars.com/api/?name=${newStudent.name}&background=random`,
      status: newStudent.status || 'regular' // حالة الطالب
    });
    
    // Reset form
    setEditingStudent(null);
    setNewStudent({
      id: '',
      name: '',
      classGrade: '',
      parentPhone: '',
      challenge: 'none',
      avatar: `https://ui-avatars.com/api/?name=طالب&background=random`,
      studentNumber: '',
      status: 'regular'
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

  const handleImport = async (newStudents: Student[]): Promise<void> => {
    // Check for duplicate IDs
    const existingIds = new Set(students.map(s => s.id));
    const duplicates = newStudents.filter(s => existingIds.has(s.id));
    
    if (duplicates.length > 0) {
      // Show only count, not all IDs (to avoid very long messages)
      const duplicateCount = duplicates.length;
      const sampleIds = duplicates.slice(0, 3).map(s => s.id).join(', ');
      const moreText = duplicateCount > 3 ? ` و${duplicateCount - 3} طالب آخر` : '';
      
      const shouldContinue = await confirm({
        title: 'أرقام مكررة',
        message: `يوجد ${duplicateCount} طالب برقم مسجل مسبقاً في النظام${sampleIds ? ` (مثال: ${sampleIds}${moreText})` : ''}.\n\nهل تريد المتابعة وتخطي المكررات؟`,
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
    
    // Call onImportStudents and wait for it to complete
    await onImportStudents(newStudents);
    // Keep the form open so user can see the success message
    // User can manually close it if needed
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterClassRoom('');
    setFilterChallenge('');
  };

  const hasActiveFilters = searchTerm || filterClassRoom || filterChallenge;

  return (
    <div className="space-y-2 md:space-y-4 lg:space-y-6">
      {/* Header with Actions */}
      <div className="bg-white p-2.5 md:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-2xl font-bold text-gray-800">إدارة الطلاب</h2>
            <p className="text-gray-500 text-xs md:text-sm mt-0.5 md:mt-1">
              إجمالي الطلاب: <span className="font-bold text-teal-600">{students.length}</span>
              {hasActiveFilters && (
                <span className="mr-1 md:mr-2">
                  | النتائج المفلترة: <span className="font-bold text-blue-600">{filteredStudents.length}</span>
                </span>
              )}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-1.5 md:gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowImportForm(false);
              }}
              className="flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-bold shadow-sm text-xs md:text-sm flex-1 md:flex-initial"
            >
              <UserPlus size={16} className="md:w-[18px] md:h-[18px] flex-shrink-0" />
              <span>إضافة طالب</span>
            </button>
            
            <button
              onClick={() => {
                setShowImportForm(!showImportForm);
                setShowAddForm(false);
              }}
              className="flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-sm text-xs md:text-sm flex-1 md:flex-initial"
            >
              <Upload size={16} className="md:w-[18px] md:h-[18px] flex-shrink-0" />
              <span>استيراد من Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Student Form */}
      {showAddForm && !editingStudent && (
        <div className="bg-white p-3 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3 md:mb-4">
            <h3 className="text-sm md:text-lg font-bold text-gray-800">إضافة طالب جديد</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={16} className="md:w-5 md:h-5 text-gray-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">رقم الطالب * (أرقام فقط - بحد أقصى 10)</label>
              <input
                type="text"
                value={newStudent.id || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                  setNewStudent({ ...newStudent, id: value });
                }}
                maxLength={10}
                className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                placeholder="مثال: 12345"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">اسم الطالب * (حروف فقط - بحد أقصى 50)</label>
              <input
                type="text"
                value={newStudent.name || ''}
                onChange={(e) => {
                  // Allow Arabic and English letters, spaces, and common Arabic characters
                  const value = e.target.value.replace(/[^a-zA-Z\u0600-\u06FF\s\u0640]/g, '').slice(0, 50);
                  setNewStudent({ ...newStudent, name: value });
                }}
                maxLength={50}
                className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                placeholder="مثال: أحمد محمد علي"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">الفصل *</label>
              {availableClassGrades.length > 0 ? (
                <CustomSelect
                  value={newStudent.classGrade || ''}
                  onChange={(value) => setNewStudent({ ...newStudent, classGrade: value })}
                  options={[
                    { value: '', label: 'اختر الفصل' },
                    ...availableClassGrades.map(grade => ({ value: grade, label: grade }))
                  ]}
                  placeholder="اختر الفصل"
                  className="w-full text-sm"
                />
              ) : (
                <input
                  type="text"
                  value={newStudent.classGrade || ''}
                  onChange={(e) => setNewStudent({ ...newStudent, classGrade: e.target.value })}
                  className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                  placeholder="مثال: الرابع الابتدائي"
                />
              )}
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">رقم ولي الأمر * (أرقام فقط - بحد أقصى 13)</label>
              <input
                type="tel"
                value={newStudent.parentPhone || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 13);
                  setNewStudent({ ...newStudent, parentPhone: value });
                }}
                maxLength={13}
                className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                placeholder="مثال: 966500000000"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">حالة الطالب *</label>
              <CustomSelect
                value={newStudent.status || 'regular'}
                onChange={(value) => setNewStudent({ ...newStudent, status: value as 'regular' | 'dropped' | 'expelled' })}
                options={[
                  { value: 'regular', label: 'منتظم' },
                  { value: 'dropped', label: 'منقطع' },
                  { value: 'expelled', label: 'مفصول' }
                ]}
                placeholder="اختر الحالة"
                className="w-full text-sm"
              />
            </div>
          </div>
          <div className="mt-3 md:mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleAddStudentSubmit}
              className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              إضافة
            </button>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto overflow-x-hidden">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-3 md:p-6 flex justify-between items-center z-10">
              <h3 className="text-base md:text-2xl font-bold text-gray-800">تعديل بيانات الطالب</h3>
              <button
                onClick={handleCancelEdit}
                className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="إغلاق"
              >
                <X size={18} className="md:w-6 md:h-6 text-gray-500" />
              </button>
            </div>
            <div className="p-3 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">رقم الطالب * (أرقام فقط - بحد أقصى 10)</label>
                  <input
                    type="text"
                    value={newStudent.id || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      setNewStudent({ ...newStudent, id: value });
                    }}
                    disabled={true}
                    maxLength={10}
                    className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="مثال: 12345"
                  />
                  <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">لا يمكن تعديل رقم الطالب</p>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">اسم الطالب * (حروف فقط - بحد أقصى 50)</label>
                  <input
                    type="text"
                    value={newStudent.name || ''}
                    onChange={(e) => {
                      // Allow Arabic and English letters, spaces, and common Arabic characters
                      const value = e.target.value.replace(/[^a-zA-Z\u0600-\u06FF\s\u0640]/g, '').slice(0, 50);
                      setNewStudent({ ...newStudent, name: value });
                    }}
                    maxLength={50}
                    className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="مثال: أحمد محمد علي"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">الفصل *</label>
                  {availableClassGrades.length > 0 ? (
                    <CustomSelect
                      value={newStudent.classGrade || ''}
                      onChange={(value) => setNewStudent({ ...newStudent, classGrade: value })}
                      options={[
                        { value: '', label: 'اختر الفصل' },
                        ...availableClassGrades.map(grade => ({ value: grade, label: grade }))
                      ]}
                      placeholder="اختر الفصل"
                      className="w-full text-sm"
                    />
                  ) : (
                    <input
                      type="text"
                      value={newStudent.classGrade || ''}
                      onChange={(e) => setNewStudent({ ...newStudent, classGrade: e.target.value })}
                      className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                      placeholder="مثال: الرابع الابتدائي"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">رقم ولي الأمر * (أرقام فقط - بحد أقصى 13)</label>
                  <input
                    type="tel"
                    value={newStudent.parentPhone || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 13);
                      setNewStudent({ ...newStudent, parentPhone: value });
                    }}
                    maxLength={13}
                    className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="مثال: 966500000000"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">حالة الطالب *</label>
                  <CustomSelect
                    value={newStudent.status || 'regular'}
                    onChange={(value) => setNewStudent({ ...newStudent, status: value as 'regular' | 'dropped' | 'expelled' })}
                    options={[
                      { value: 'regular', label: 'منتظم' },
                      { value: 'dropped', label: 'منقطع' },
                      { value: 'expelled', label: 'مفصول' }
                    ]}
                    placeholder="اختر الحالة"
                    className="w-full text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 md:mt-6 flex justify-end gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 md:px-6 py-1.5 md:py-2 text-xs md:text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-bold"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleUpdateStudentSubmit}
                  className="px-4 md:px-6 py-1.5 md:py-2 text-xs md:text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-bold"
                >
                  حفظ التعديلات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 flex justify-between items-center z-10">
              <h3 className="text-xl md:text-2xl font-bold text-gray-800">استيراد الطلاب من Excel</h3>
              <button
                onClick={() => setShowImportForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="إغلاق"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 md:p-6">
              <ExcelImporter onImport={handleImport} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-2 md:p-3 rounded-lg shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-1.5 md:gap-3">
          {/* Filter Icon & Label - Hidden on mobile, shown on desktop */}
          <div className="hidden md:flex items-center gap-1 flex-shrink-0">
            <Filter size={14} className="text-gray-500 flex-shrink-0" />
            <span className="font-medium text-gray-600 text-xs">الفلاتر:</span>
          </div>
          
          {/* Class Room Filter (الفصول) - First */}
          <div className="flex-1 md:flex-initial md:w-[150px] min-w-[100px]">
            <CustomSelect
              value={filterClassRoom}
              onChange={(value) => {
                console.log('Filter changed to:', value);
                setFilterClassRoom(value);
              }}
              options={uniqueClassRooms.length > 0 ? [
                ...uniqueClassRooms.map(room => ({ value: room, label: room }))
              ] : [
                { value: '', label: 'لا توجد فصول - يرجى تعريف الفصول في الإعدادات' }
              ]}
              placeholder={uniqueClassRooms.length > 0 ? "اختر الفصل" : "لا توجد فصول"}
              className="w-full text-[11px] md:text-xs"
              disabled={false}
            />
          </div>

          {/* Search */}
          <div className="flex-1 md:flex-initial md:min-w-[200px] min-w-[100px]">
            <div className="relative">
              <Search size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث..."
                className="w-full pr-7 pl-2 py-1.5 text-[11px] md:text-xs border border-gray-300 rounded-md focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Challenge Filter */}
          {role !== 'admin' && (
            <div className="flex-1 md:flex-initial md:w-[150px] min-w-[100px]">
              <CustomSelect
                value={filterChallenge}
                onChange={(value) => setFilterChallenge(value)}
                options={[
                  { value: '', label: 'جميع الحالات' },
                  ...uniqueChallenges.map(challenge => ({ 
                    value: challenge, 
                    label: challenge === 'none' ? 'لا يوجد' : challenge 
                  }))
                ]}
                placeholder="جميع الحالات"
                className="w-full text-[11px] md:text-xs"
              />
            </div>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors border border-gray-200 flex-shrink-0"
            >
              <X size={10} className="flex-shrink-0" />
              <span>مسح</span>
            </button>
          )}
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-16 bg-gray-50 border-r border-gray-200 px-3 py-4 text-center sticky left-0 z-10">
                  <span className="text-xs font-bold text-gray-500">#</span>
                </th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700">رقم الطالب</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700">الاسم</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700">الفصل</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700">رقم ولي الأمر</th>
                {role === 'counselor' && (
                  <th className="px-6 py-4 text-sm font-bold text-gray-700">التحدي</th>
                )}
                <th className="px-6 py-4 text-sm font-bold text-gray-700">حالة الطالب</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!filterClassRoom ? (
                <tr>
                  <td colSpan={role === 'counselor' ? 8 : 7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Filter size={32} className="text-gray-300" />
                      <p className="text-sm font-bold text-gray-500">الرجاء اختيار فصل لعرض الطلاب</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  // Get the index from the original students array (before filtering)
                  const originalIndex = students.findIndex(s => s.id === student.id);
                  const sequentialNumber = originalIndex >= 0 ? originalIndex + 1 : 0;
                  return (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="w-16 bg-gray-50 border-r border-gray-200 px-3 py-4 text-center sticky left-0 z-10">
                        <span className="text-xs font-medium text-gray-500">{sequentialNumber}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        {student.studentNumber || student.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">{student.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{student.classGrade}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{student.parentPhone || '-'}</td>
                      {role === 'counselor' && (
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            student.challenge === 'none' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {student.challenge === 'none' ? 'عادي' : student.challenge}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          (student.status || 'regular') === 'regular'
                            ? 'bg-blue-100 text-blue-700'
                            : (student.status || 'regular') === 'dropped'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {(student.status || 'regular') === 'regular' ? 'منتظم' :
                           (student.status || 'regular') === 'dropped' ? 'منقطع' : 'مفصول'}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                          >
                            <Edit2 size={12} className="md:w-[14px] md:h-[14px] flex-shrink-0" />
                            <span>تحرير</span>
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student)}
                            className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 size={12} className="md:w-[14px] md:h-[14px] flex-shrink-0" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={role === 'counselor' ? 8 : 7} className="px-6 py-12 text-center text-gray-400">
                    {hasActiveFilters ? 'لا توجد نتائج تطابق الفلاتر' : 'لا يوجد طلاب مسجلين'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
              {!filterClassRoom ? (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <Filter size={32} className="text-gray-300" />
                <p className="text-sm font-bold text-gray-500">الرجاء اختيار فصل لعرض الطلاب</p>
              </div>
            </div>
          ) : filteredStudents.length > 0 ? (
            filteredStudents.map((student) => {
              // Get the index from the original students array (before filtering)
              const originalIndex = students.findIndex(s => s.id === student.id);
              const sequentialNumber = originalIndex >= 0 ? originalIndex + 1 : 0;
              return (
              <div key={student.id} className="p-3">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-gray-500">{sequentialNumber}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-800 text-sm truncate">{student.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">رقم: {student.studentNumber || student.id}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {role === 'counselor' && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                        student.challenge === 'none' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {student.challenge === 'none' ? 'عادي' : student.challenge}
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                      (student.status || 'regular') === 'regular'
                        ? 'bg-blue-100 text-blue-700'
                        : (student.status || 'regular') === 'dropped'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {(student.status || 'regular') === 'regular' ? 'منتظم' :
                       (student.status || 'regular') === 'dropped' ? 'منقطع' : 'مفصول'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 space-y-0.5">
                  <p className="text-xs text-gray-600">
                    <span className="font-bold">الفصل:</span> <span className="truncate block">{student.classGrade}</span>
                  </p>
                  {student.parentPhone && (
                    <p className="text-xs text-gray-600">
                      <span className="font-bold">الجوال:</span> <span className="font-mono">{student.parentPhone}</span>
                    </p>
                  )}
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  <button
                    onClick={() => handleEditStudent(student)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                  >
                    <Edit2 size={12} className="flex-shrink-0" />
                    <span>تحرير</span>
                  </button>
                  <button
                    onClick={() => handleDeleteStudent(student)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 size={12} className="flex-shrink-0" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
              );
            })
          ) : (
            <div className="p-8 md:p-12 text-center text-gray-400 text-xs md:text-sm">
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

