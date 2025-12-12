import React, { useState, useEffect } from 'react';
import { SharedFile, FileType, FileAccessLevel, Role } from '../types';
import { 
  FileText, Upload, Edit, Trash2, Download, Search, X, 
  FileSpreadsheet, File, Image, FileType as FileTypeIcon,
  Filter, ChevronDown, AlertCircle, CheckCircle2, Eye, ExternalLink, Users, CheckCircle
} from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';
import { CustomSelect } from './CustomSelect';
import { CONFIG } from '../config';

interface FileSharingProps {
  role: Role;
  onAddLog?: (action: string, details: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

export const FileSharing: React.FC<FileSharingProps> = ({ role, onAddLog, onUnreadCountChange }) => {
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
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Edit form state
  const [editingFile, setEditingFile] = useState<SharedFile | null>(null);
  
  // Preview state
  const [previewFile, setPreviewFile] = useState<SharedFile | null>(null);
  const [showReadersModal, setShowReadersModal] = useState<SharedFile | null>(null);
  const [readers, setReaders] = useState<Array<{ id: string; name: string; role: string }>>([]);

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
      
      // Calculate unread files count
      const unreadCount = loadedFiles.filter(file => !file.is_read_by_current_user).length;
      if (onUnreadCountChange) {
        onUnreadCountChange(unreadCount);
      }
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
    setUploadProgress(0);
    
    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev; // Don't go to 100% until upload completes
        return prev + 5;
      });
    }, 500);

    try {
      const { api } = await import('../services/api');
      await api.uploadFile(
        uploadFile,
        uploadName.trim(),
        uploadDescription.trim() || undefined,
        uploadType,
        uploadAccess
      );
      
      setUploadProgress(100);
      clearInterval(progressInterval);
      
      alert({ message: 'تم رفع الملف بنجاح', type: 'success' });
      onAddLog?.('رفع ملف', `تم رفع ملف: ${uploadName}`);
      
      // Reset form
      setShowUploadForm(false);
      setUploadFile(null);
      setUploadName('');
      setUploadDescription('');
      setUploadType('general');
      setUploadAccess('public');
      setUploadProgress(0);
      
      // Reload files
      await loadFiles();
    } catch (error: any) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      console.error('Error uploading file:', error);
      
      let errorMessage = 'فشل في رفع الملف. يرجى المحاولة مرة أخرى';
      
      if (error?.message) {
        if (error.message.includes('timeout') || error.message.includes('انتهت مهلة')) {
          errorMessage = 'انتهت مهلة الاتصال. يرجى التحقق من سرعة الإنترنت والمحاولة مرة أخرى. إذا كان الملف كبيراً، يرجى تقليل حجمه.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'مشكلة في الاتصال بالإنترنت. يرجى التحقق من الاتصال والمحاولة مرة أخرى.';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert({ 
        message: errorMessage, 
        type: 'error' 
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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

  const handleFileClick = async (file: SharedFile) => {
    // Mark file as read when clicked
    if (!file.is_read_by_current_user) {
      try {
        const { api } = await import('../services/api');
        await api.markFileAsRead(file.id);
        // Reload files to update read status
        await loadFiles();
      } catch (error) {
        console.error('Error marking file as read:', error);
      }
    }
    setPreviewFile(file);
  };
  
  // Update unread count when files change
  useEffect(() => {
    if (onUnreadCountChange) {
      const unreadCount = files.filter(file => !file.is_read_by_current_user).length;
      onUnreadCountChange(unreadCount);
    }
  }, [files, onUnreadCountChange]);

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
        // Clear preview if deleted file was being viewed
        if (previewFile?.id === file.id) {
          setPreviewFile(null);
        }
      } else {
        alert({ message: 'فشل في حذف الملف', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert({ message: 'فشل في حذف الملف', type: 'error' });
    }
  };

  const handleShowReaders = async (file: SharedFile) => {
    try {
      const { api } = await import('../services/api');
      const readersList = await api.getFileReaders(file.id);
      setReaders(readersList);
      setShowReadersModal(file);
    } catch (error) {
      console.error('Error loading readers:', error);
      alert({ message: 'فشل في تحميل قائمة القراء', type: 'error' });
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

  // Sort files by created_at descending (newest first)
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

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
    <div className="space-y-2 md:space-y-3 lg:space-y-4">
      {/* Header and Upload Button */}
      <div className="bg-white p-3 md:p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">التعاميم</h2>
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

      {/* Email-like Layout: List on left, Content on right */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row h-[calc(100vh-200px)] md:h-[calc(100vh-250px)] min-h-[400px] md:min-h-[600px]">
        {/* Left Side: Announcements List */}
        <div className="w-full md:w-1/3 border-l md:border-l-0 md:border-r border-gray-200 flex flex-col">
          {/* Search and Filters */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="relative mb-2">
              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في التعاميم..."
                className="w-full pr-8 pl-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1.5 left-2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <CustomSelect
                  value={filterType}
                  onChange={(value) => setFilterType(value as FileType | 'all')}
                  options={[
                    { value: 'all', label: 'جميع الأنواع' },
                    { value: 'general', label: 'ملف عام' },
                    { value: 'circular', label: 'تعميم' },
                    { value: 'decision', label: 'قرار' }
                  ]}
                  className="w-full text-xs"
                />
              </div>
            </div>
          </div>

          {/* Announcements List */}
          <div className="flex-1 overflow-y-auto">
            {sortedFiles.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {sortedFiles.map(file => {
                  const isUnread = !file.is_read_by_current_user;
                  const isSelected = previewFile?.id === file.id;
                  
                  return (
                  <button
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    className={`w-full text-right p-4 hover:bg-gray-50 transition-colors border-r-4 ${
                      isSelected
                        ? 'bg-teal-50 border-r-teal-500' 
                        : isUnread
                        ? 'bg-blue-50/50 border-r-blue-500 border-l-2 border-l-blue-400'
                        : 'border-r-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        {file.description ? (
                          <>
                            <h4 className={`font-bold text-sm mb-1 line-clamp-2 ${
                              previewFile?.id === file.id ? 'text-teal-700' : 'text-gray-800'
                            }`}>
                              {file.description}
                            </h4>
                            <p className="text-xs text-gray-500 truncate mb-2">
                              {file.name}
                            </p>
                          </>
                        ) : (
                          <h4 className={`font-bold text-sm mb-1 truncate ${
                            previewFile?.id === file.id ? 'text-teal-700' : 'text-gray-800'
                          }`}>
                            {file.name}
                          </h4>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{getFileTypeLabel(file.file_type)}</span>
                          {file.created_at && (
                            <>
                              <span>•</span>
                              <span>{new Date(file.created_at).toLocaleDateString('ar-SA')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        {getFileIcon(file.file_category)}
                        {file.is_read_by_current_user && (
                          <CheckCircle2 size={14} className="text-green-500" />
                        )}
                        {file.read_count !== undefined && file.read_count > 0 && (
                          <span className="text-xs text-gray-400">{file.read_count}</span>
                        )}
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">لا توجد تعاميم</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: File Preview/Content */}
        <div className="w-full md:w-2/3 flex flex-col">
          {previewFile ? (
            <>
              {/* File Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    {previewFile.description ? (
                      <>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">{previewFile.description}</h3>
                        <p className="text-sm text-gray-500 mb-2">{previewFile.name}</p>
                      </>
                    ) : (
                      <h3 className="text-lg font-bold text-gray-800 mb-1">{previewFile.name}</h3>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        {getFileTypeLabel(previewFile.file_type)}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        {getAccessLevelLabel(previewFile.access_level)}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        {formatFileSize(previewFile.file_size)}
                      </span>
                      {previewFile.created_at && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                          {new Date(previewFile.created_at).toLocaleDateString('ar-SA', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setEditingFile(previewFile);
                            setUploadName(previewFile.name);
                            setUploadDescription(previewFile.description || '');
                            setUploadType(previewFile.file_type);
                            setUploadAccess(previewFile.access_level);
                            setShowUploadForm(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(previewFile)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                    {previewFile.read_count !== undefined && previewFile.read_count > 0 && role === 'admin' && (
                      <button
                        onClick={() => handleShowReaders(previewFile)}
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-1 text-xs font-bold"
                        title="عرض القراء"
                      >
                        <Users size={14} />
                        {previewFile.read_count} قراءة
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* File Content/Preview */}
              <div className="flex-1 overflow-y-auto p-2 md:p-4 bg-white">
                {previewFile.file_category === 'pdf' ? (
                  <div className="w-full h-full min-h-[400px] md:min-h-[500px] flex flex-col">
                    <iframe
                      src={previewFile.file_url}
                      className="w-full flex-1 border border-gray-200 rounded-lg"
                      title={previewFile.name}
                      style={{ 
                        minHeight: '400px',
                        maxHeight: 'calc(100vh - 200px)'
                      }}
                    />
                    <div className="mt-2 flex gap-2">
                      <a
                        href={previewFile.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-bold"
                      >
                        <Download size={16} />
                        <span>فتح في نافذة جديدة</span>
                      </a>
                    </div>
                  </div>
                ) : previewFile.file_category === 'image' ? (
                  <div className="flex items-center justify-center">
                    <img
                      src={previewFile.file_url}
                      alt={previewFile.name}
                      className="max-w-full max-h-[600px] rounded-lg shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <FileText size={64} className="mb-4 opacity-20" />
                    <p className="text-lg font-bold mb-2">معاينة غير متاحة</p>
                    <p className="text-sm mb-4">يرجى تحميل الملف لعرضه</p>
                  </div>
                )}
              </div>

              {/* Download Button */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <a
                  href={previewFile.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-bold shadow-md"
                >
                  <Download size={20} />
                  <span>تحميل الملف</span>
                </a>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <FileText size={64} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg font-bold">اختر تعميماً لعرضه</p>
                <p className="text-sm mt-2">انقر على أي تعميم من القائمة لعرض محتواه</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload/Edit Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
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

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-medium">جاري رفع الملف...</span>
                    <span className="text-teal-600 font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-teal-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    يرجى عدم إغلاق هذه النافذة حتى يكتمل الرفع
                  </p>
                </div>
              )}

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

      {/* Readers Modal */}
      {showReadersModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && (setShowReadersModal(null), setReaders([]))}
          style={{ touchAction: 'none' }}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] my-auto overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-teal-600 p-4 md:p-6 text-white flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                <Users size={20} className="md:w-6 md:h-6 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-base md:text-xl font-bold truncate">من قام بقراءة التعميم</h3>
                  <p className="text-xs md:text-sm text-teal-100 mt-1 truncate">{showReadersModal.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReadersModal(null);
                  setReaders([]);
                }}
                className="p-1.5 md:p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={18} className="md:w-5 md:h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
              {readers.length > 0 ? (
                <div className="space-y-2">
                  {readers.map((reader) => (
                    <div
                      key={reader.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 md:p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold">
                          {reader.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm md:text-base">
                            {reader.name}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {reader.role === 'admin' ? 'مدير' : reader.role === 'counselor' ? 'موجه' : 'معلم'}
                          </p>
                        </div>
                      </div>
                      <CheckCircle size={20} className="text-green-600" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-bold">لم يقرأ أحد هذا التعميم بعد</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

