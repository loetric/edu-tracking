import React, { useState, useEffect } from 'react';
import { SubstitutionRequest, ScheduleItem } from '../types';
import { CheckCircle, XCircle, Clock, AlertCircle, Filter, Search, X, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useModal } from '../hooks/useModal';
import { CustomSelect } from './CustomSelect';

interface SubstitutionRequestsAdminProps {
  schedule: ScheduleItem[];
  onRequestUpdate?: () => void;
  onRemoveSubstitute?: (scheduleItemId: string) => void;
}

export const SubstitutionRequestsAdmin: React.FC<SubstitutionRequestsAdminProps> = ({
  schedule,
  onRequestUpdate,
  onRemoveSubstitute
}) => {
  const { alert, alertModal, confirm, confirmModal } = useModal();
  const [allRequests, setAllRequests] = useState<SubstitutionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAllRequests();
  }, []);

  const loadAllRequests = async () => {
    setIsLoading(true);
    try {
      const requests = await api.getSubstitutionRequests();
      setAllRequests(requests);
    } catch (error) {
      console.error('Error loading requests:', error);
      alert({ message: 'فشل في تحميل طلبات الإسناد', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const getSessionInfo = (scheduleItemId: string) => {
    return schedule.find(s => s.id === scheduleItemId);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'accepted': return 'مقبول';
      case 'rejected': return 'مرفوض';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'accepted': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleCancelRequest = async (request: SubstitutionRequest) => {
    const shouldCancel = await confirm({
      title: 'إلغاء طلب الإسناد',
      message: request.status === 'accepted' 
        ? 'هذا الطلب مقبول بالفعل وتم إسناد الحصة. هل تريد إلغاء الطلب وإلغاء الإسناد؟'
        : 'هل أنت متأكد من إلغاء هذا الطلب؟',
      type: 'warning',
      confirmText: 'نعم، إلغاء',
      cancelText: 'إلغاء'
    });

    if (!shouldCancel) return;

    try {
      // If request is accepted, also remove the actual substitution
      if (request.status === 'accepted' && onRemoveSubstitute) {
        await onRemoveSubstitute(request.scheduleItemId);
      }

      // Delete the request
      await api.deleteSubstitutionRequest(request.id);
      
      // Update local state
      setAllRequests(prev => prev.filter(r => r.id !== request.id));
      
      // Reload requests
      if (onRequestUpdate) {
        onRequestUpdate();
      }
      
      alert({ message: 'تم إلغاء طلب الإسناد بنجاح', type: 'success' });
    } catch (error) {
      console.error('Error canceling request:', error);
      alert({ message: 'فشل في إلغاء طلب الإسناد', type: 'error' });
    }
  };

  const filteredRequests = allRequests.filter(request => {
    const matchStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchSearch = searchQuery.trim() === '' || 
      request.substituteTeacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (getSessionInfo(request.scheduleItemId)?.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (getSessionInfo(request.scheduleItemId)?.classRoom || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
        <p className="text-sm">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">إدارة طلبات الإسناد</h3>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالمعلم أو المادة أو الفصل..."
                className="w-full pr-8 pl-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1 left-1 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="w-full md:w-48">
            <CustomSelect
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as typeof statusFilter)}
              options={[
                { value: 'all', label: 'جميع الحالات' },
                { value: 'pending', label: 'في الانتظار' },
                { value: 'accepted', label: 'مقبول' },
                { value: 'rejected', label: 'مرفوض' }
              ]}
              className="w-full"
            />
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length > 0 ? (
          <div className="space-y-3">
            {filteredRequests.map(request => {
              const sessionInfo = getSessionInfo(request.scheduleItemId);
              
              return (
                <div key={request.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {request.status === 'pending' && <Clock size={16} className="text-orange-500" />}
                          {request.status === 'accepted' && <CheckCircle size={16} className="text-green-500" />}
                          {request.status === 'rejected' && <XCircle size={16} className="text-red-500" />}
                          <span className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(request.status)}`}>
                            {getStatusLabel(request.status)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCancelRequest(request)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                          title="إلغاء الطلب"
                        >
                          <Trash2 size={14} />
                          <span>إلغاء</span>
                        </button>
                      </div>
                      
                      {sessionInfo ? (
                        <>
                          <p className="text-sm font-bold text-gray-800 mb-1">
                            {sessionInfo.subject} - {sessionInfo.classRoom}
                          </p>
                          <p className="text-xs text-gray-500 mb-1">
                            {sessionInfo.day} - الحصة {sessionInfo.period}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-600">معلومات الحصة غير متوفرة</p>
                      )}
                      
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-600">
                          <span className="font-bold">المعلم البديل:</span> {request.substituteTeacher}
                        </p>
                        <p className="text-xs text-gray-500">
                          <span className="font-bold">تاريخ الطلب:</span> {new Date(request.requestedAt).toLocaleString('ar-SA')}
                        </p>
                        {request.respondedAt && (
                          <p className="text-xs text-gray-500">
                            <span className="font-bold">تاريخ الرد:</span> {new Date(request.respondedAt).toLocaleString('ar-SA')}
                          </p>
                        )}
                        {request.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-xs font-bold text-red-700 mb-1">سبب الرفض:</p>
                            <p className="text-xs text-red-600">{request.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد طلبات إسناد</p>
          </div>
        )}
      </div>
      
      {alertModal.isOpen && <AlertModal {...alertModal} />}
      {confirmModal.isOpen && confirmModal.options && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{confirmModal.options.title || 'تأكيد'}</h3>
            <p className="text-gray-600 mb-6 whitespace-pre-line">{confirmModal.options.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  if (confirmModal.onCancel) confirmModal.onCancel();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-bold transition-colors"
              >
                {confirmModal.options.cancelText || 'إلغاء'}
              </button>
              <button
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                }}
                className={`px-4 py-2 text-white rounded-lg font-bold transition-colors ${
                  confirmModal.options.type === 'danger' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                {confirmModal.options.confirmText || 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

