import React, { useState, useEffect } from 'react';
import { SharedFile, FileType, FileAccessLevel, Role } from '../types';
import { 
  FileText, Upload, Edit, Trash2, Download, Search, X, 
  FileSpreadsheet, File, Image, FileType as FileTypeIcon,
  Filter, ChevronDown, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';
import { CustomSelect } from './CustomSelect';
import { CONFIG } from '../config';

interface FileSharingProps {
  role: Role;
  onAddLog?: (action: string, details: string) => void;
}

export const FileSharing: React.FC<FileSharingProps> = ({ role, onAddLog }) => {
  const { alert, confirm, alertModal, confirmModal } = useModal();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FileType | 'all'>('all');
  const [filterAccess, setFilterAccess] = useState<FileAccessLevel | 'all'>('all');
  
  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadType, setUploadType] = useState<FileType>('general');
  const [uploadAccess, setUploadAccess] = useState<FileAccessLevel>('public');
  const [isUploading, setIsUploading] = useState(false);
  
  // Edit form state
  const [editingFile, setEditingFile] = useState<SharedFile | null>(null);

  const isAdmin = role === 'admin';

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const { api } = await import('../services/api');
      const loadedFiles = await api.getFiles();
      setFiles(loadedFiles);
    } catch (error) {
      console.error('Error loading files:', error);
      alert({ message: 'فشل في تحميل الملفات', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    const maxSize = CONFIG.FILES.MAX_SIZE_MB * 1024 * 1024;
    if (file.size > maxSize) {
      alert({ 
        message: `حجم الملف كبير جداً. الحد الأقصى هو ${CONFIG.FILES.MAX_SIZE_MB} ميجابايت`, 
        type: 'error' 
      });
      return;
    }

    // Check file type
    if (!CONFIG.FILES.ALLOWED_TYPES.includes(file.type)) {
      alert({ 
        message: 'نوع الملف غير مدعوم. يرجى اختيار ملف PDF، Word، Excel، أو صورة', 
        type: 'error' 
      });
      return;
    }

    setUploadFile(file);
    if (!uploadName) {
      setUploadName(file.name);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) {
      alert({ message: 'الرجاء اختيار ملف وإدخال اسم', type: 'warning' });
      return;
    }

    setIsUploading(true);
    try {
      const { api } = await import('../services/api');
      await api.uploadFile(
        uploadFile,
        uploadName.trim(),
        uploadDescription.trim() || undefined,
        uploadType,
        uploadAccess
      );
      
      alert({ message: 'تم رفع الملف بنجاح', type: 'success' });
      onAddLog?.('رفع ملف', `تم رفع ملف: ${uploadName}`);
      
      // Reset form
      setShowUploadForm(false);
      setUploadFile(null);
      setUploadName('');
      setUploadDescription('');
      setUploadType('general');
      setUploadAccess('public');
      
      // Reload files
      await loadFiles();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert({ 
        message: error?.message || 'فشل في رفع الملف. يرجى المحاولة مرة أخرى', 
        type: 'error' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingFile) return;

    try {
      const { api } = await import('../services/api');
      const updated = await api.updateFile(editingFile.id, {
        name: uploadName.trim(),
        description: uploadDescription.trim() || undefined,
        file_type: uploadType,
        access_level: uploadAccess
      });

      if (updated) {
        alert({ message: 'تم تحديث الملف بنجاح', type: 'success' });
        onAddLog?.('تعديل ملف', `تم تعديل ملف: ${uploadName}`);
        setEditingFile(null);
        setUploadName('');
        setUploadDescription('');
        await loadFiles();
      } else {
        alert({ message: 'فشل في تحديث الملف', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating file:', error);
      alert({ message: 'فشل في تحديث الملف', type: 'error' });
    }
  };

  const handleDelete = async (file: SharedFile) => {
    const confirmed = await confirm({
      title: 'تأكيد الحذف',
      message: `هل أنت متأكد من حذف الملف "${file.name}"؟`,
      confirmText: 'حذف',
      cancelText: 'إلغاء'
    });

    if (!confirmed) return;

    try {
      const { api } = await import('../services/api');
      const success = await api.deleteFile(file.id);
      
      if (success) {
        alert({ message: 'تم حذف الملف بنجاح', type: 'success' });
        onAddLog?.('حذف ملف', `تم حذف ملف: ${file.name}`);
        await loadFiles();
      } else {
        alert({ message: 'فشل في حذف الملف', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert({ message: 'فشل في حذف الملف', type: 'error' });
    }
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'excel':
        return <FileSpreadsheet size={24} className="text-green-600" />;
      case 'word':
        return <FileText size={24} className="text-blue-600" />;
      case 'pdf':
        return <FileText size={24} className="text-red-600" />;
      case 'image':
        return <Image size={24} className="text-purple-600" />;
      default:
        return <File size={24} className="text-gray-600" />;
    }
  };

  const getFileTypeLabel = (type: FileType): string => {
    switch (type) {
      case 'general':
        return 'ملف عام';
      case 'circular':
        return 'تعميم';
      case 'decision':
        return 'قرار';
      default:
        return type;
    }
  };

  const getAccessLevelLabel = (level: FileAccessLevel): string => {
    switch (level) {
      case 'public':
        return 'العموم';
      case 'teachers':
        return 'المعلمون';
      case 'counselors':
        return 'الموجهون';
      case 'teachers_counselors':
        return 'المعلمون والموجهون';
      default:
        return level;
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'غير محدد';
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
  };

  // Filter files
  const filteredFiles = files.filter(file => {
    const matchSearch = searchQuery.trim() === '' || 
      file.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (file.description && file.description.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    const matchType = filterType === 'all' || file.file_type === filterType;
    const matchAccess = filterAccess === 'all' || file.access_level === filterAccess;
    return matchSearch && matchType && matchAccess;
  });

  // Group files by type
  const filesByType = filteredFiles.reduce((acc, file) => {
    if (!acc[file.file_type]) {
      acc[file.file_type] = [];
    }
    acc[file.file_type].push(file);
    return acc;
  }, {} as Record<FileType, SharedFile[]>);

  const sortedTypes: FileType[] = ['general', 'circular', 'decision'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الملفات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Upload Button */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">مشاركة الملفات</h2>
          <p className="text-sm text-gray-500 mt-1">إدارة ومشاركة الملفات مع المستخدمين</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setShowUploadForm(true);
              setEditingFile(null);
              setUploadFile(null);
              setUploadName('');
              setUploadDescription('');
              setUploadType('general');
              setUploadAccess('public');
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-bold shadow-md"
          >
            <Upload size={18} />
            <span className="hidden sm:inline">رفع ملف جديد</span>
            <span className="sm:hidden">رفع</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute top-3 right-3 text-gray-400 z-10 pointer-events-none" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الملفات..."
            className="w-full border-gray-300 rounded-lg py-2.5 pl-4 pr-10 text-sm focus:ring-teal-500 focus:border-teal-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute top-2.5 left-2 text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Type Filter */}
        <CustomSelect
          value={filterType}
          onChange={(value) => setFilterType(value as FileType | 'all')}
          options={[
            { value: 'all', label: 'جميع الأنواع' },
            { value: 'general', label: 'ملف عام' },
            { value: 'circular', label: 'تعميم' },
            { value: 'decision', label: 'قرار' }
          ]}
          className="w-full md:w-48"
        />

        {/* Access Level Filter */}
        <CustomSelect
          value={filterAccess}
          onChange={(value) => setFilterAccess(value as FileAccessLevel | 'all')}
          options={[
            { value: 'all', label: 'جميع المستويات' },
            { value: 'public', label: 'العموم' },
            { value: 'teachers', label: 'المعلمون' },
            { value: 'counselors', label: 'الموجهون' },
            { value: 'teachers_counselors', label: 'المعلمون والموجهون' }
          ]}
          className="w-full md:w-56"
        />
      </div>

      {/* Files List - Grouped by Type */}
      {filteredFiles.length > 0 ? (
        <div className="space-y-6">
          {sortedTypes.map(type => {
            const typeFiles = filesByType[type] || [];
            if (typeFiles.length === 0) return null;

            return (
              <div key={type} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Type Header */}
                <div className="bg-teal-50 border-b border-teal-200 px-6 py-3">
                  <h3 className="text-lg font-bold text-teal-800 flex items-center justify-between">
                    <span>{getFileTypeLabel(type)}</span>
                    <span className="text-sm font-normal text-teal-600">
                      ({typeFiles.length} ملف)
                    </span>
                  </h3>
                </div>

                {/* Files Grid */}
                <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeFiles.map(file => (
                    <div
                      key={file.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0">
                          {getFileIcon(file.file_category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 text-sm md:text-base truncate mb-1">
                            {file.name}
                          </h4>
                          {file.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                              {file.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                              {getAccessLevelLabel(file.access_level)}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                              {formatFileSize(file.file_size)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-teal-600 hover:text-teal-700 font-bold text-sm"
                        >
                          <Download size={16} />
                          <span>تحميل</span>
                        </a>
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingFile(file);
                                setUploadName(file.name);
                                setUploadDescription(file.description || '');
                                setUploadType(file.file_type);
                                setUploadAccess(file.access_level);
                                setShowUploadForm(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="تعديل"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(file)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <FileText size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">لا توجد ملفات متاحة</p>
        </div>
      )}

      {/* Upload/Edit Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-teal-600 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {editingFile ? 'تعديل ملف' : 'رفع ملف جديد'}
              </h3>
              <button
                onClick={() => {
                  setShowUploadForm(false);
                  setEditingFile(null);
                  setUploadFile(null);
                }}
                className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!editingFile && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    اختر الملف *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-500 transition-colors">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept={CONFIG.FILES.ALLOWED_TYPES.join(',')}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload size={32} className="text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {uploadFile ? uploadFile.name : 'انقر لاختيار ملف'}
                      </span>
                      <span className="text-xs text-gray-400">
                        الحد الأقصى: {CONFIG.FILES.MAX_SIZE_MB} ميجابايت
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  اسم الملف *
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="أدخل اسم الملف"
                  className="w-full border-gray-300 rounded-lg p-3 text-sm focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  الوصف (اختياري)
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="أدخل وصفاً للملف"
                  rows={3}
                  className="w-full border-gray-300 rounded-lg p-3 text-sm focus:ring-teal-500 focus:border-teal-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    نوع الملف *
                  </label>
                  <CustomSelect
                    value={uploadType}
                    onChange={(value) => setUploadType(value as FileType)}
                    options={[
                      { value: 'general', label: 'ملف عام' },
                      { value: 'circular', label: 'تعميم' },
                      { value: 'decision', label: 'قرار' }
                    ]}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    مستوى الوصول *
                  </label>
                  <CustomSelect
                    value={uploadAccess}
                    onChange={(value) => setUploadAccess(value as FileAccessLevel)}
                    options={[
                      { value: 'public', label: 'العموم' },
                      { value: 'teachers', label: 'المعلمون' },
                      { value: 'counselors', label: 'الموجهون' },
                      { value: 'teachers_counselors', label: 'المعلمون والموجهون' }
                    ]}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowUploadForm(false);
                    setEditingFile(null);
                    setUploadFile(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={editingFile ? handleEdit : handleUpload}
                  disabled={isUploading || !uploadName.trim() || (!editingFile && !uploadFile)}
                  className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg hover:bg-teal-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>جاري الرفع...</span>
                    </>
                  ) : (
                    <span>{editingFile ? 'حفظ التعديلات' : 'رفع الملف'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {alertModal.isOpen && alertModal.options && (
        <AlertModal
          isOpen={alertModal.isOpen}
          message={alertModal.options.message}
          type={alertModal.options.type || 'info'}
          duration={alertModal.options.duration || 3000}
          onClose={alertModal.onClose}
        />
      )}

      {confirmModal.isOpen && confirmModal.options && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.options.title}
          message={confirmModal.options.message}
          confirmText={confirmModal.options.confirmText}
          cancelText={confirmModal.options.cancelText}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}
    </div>
  );
};

