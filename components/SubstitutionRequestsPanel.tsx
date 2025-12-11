import React, { useState, useEffect } from 'react';
import { SubstitutionRequest, ScheduleItem } from '../types';
import { CheckCircle, XCircle, Clock, AlertCircle, Send, X } from 'lucide-react';
import { api } from '../services/api';
import { useModal } from '../hooks/useModal';
import { AlertModal } from './AlertModal';

interface SubstitutionRequestsPanelProps {
  teacherName: string;
  schedule: ScheduleItem[];
  onRequestUpdate: () => void;
  onAccept: (request: SubstitutionRequest) => void;
}

export const SubstitutionRequestsPanel: React.FC<SubstitutionRequestsPanelProps> = ({
  teacherName,
  schedule,
  onRequestUpdate,
  onAccept
}) => {
  const { alert, alertModal } = useModal();
  const [pendingRequests, setPendingRequests] = useState<SubstitutionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadPendingRequests();
  }, [teacherName]);

  const loadPendingRequests = async () => {
    setIsLoading(true);
    try {
      const requests = await api.getPendingRequestsForTeacher(teacherName);
      setPendingRequests(requests);
    } catch (error) {
      console.error('Error loading pending requests:', error);
      alert({ message: 'فشل في تحميل طلبات الإسناد', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const getSessionInfo = (scheduleItemId: string) => {
    return schedule.find(s => s.id === scheduleItemId);
  };

  const handleAccept = async (request: SubstitutionRequest) => {
    try {
      await api.acceptSubstitutionRequest(request.id);
      
      // Create actual substitution
      const newSub = {
        id: Date.now().toString(),
        date: request.date,
        scheduleItemId: request.scheduleItemId,
        substituteTeacher: request.substituteTeacher
      };
      await api.assignSubstitute(newSub);
      
      // Update local state
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      onAccept(request);
      onRequestUpdate();
      
      alert({ message: 'تم قبول طلب الإسناد بنجاح', type: 'success' });
    } catch (error) {
      console.error('Error accepting request:', error);
      alert({ message: 'فشل في قبول طلب الإسناد', type: 'error' });
    }
  };

  const handleReject = async () => {
    if (!rejectingRequestId || !rejectionReason.trim()) {
      alert({ message: 'يرجى كتابة سبب الرفض', type: 'warning' });
      return;
    }

    try {
      await api.rejectSubstitutionRequest(rejectingRequestId, rejectionReason.trim());
      
      // Update local state
      setPendingRequests(prev => prev.filter(r => r.id !== rejectingRequestId));
      setShowRejectModal(false);
      setRejectingRequestId(null);
      setRejectionReason('');
      onRequestUpdate();
      
      alert({ message: 'تم رفض طلب الإسناد', type: 'success' });
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert({ message: 'فشل في رفض طلب الإسناد', type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
        <p className="text-sm">جاري التحميل...</p>
      </div>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        <CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">لا توجد طلبات إسناد قائمة</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-700 mb-3">طلبات الإسناد المعلقة</h3>
      
      {pendingRequests.map(request => {
        const sessionInfo = getSessionInfo(request.scheduleItemId);
        
        return (
          <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-orange-500" />
                  <span className="text-xs font-bold text-orange-600">في انتظار الرد</span>
                </div>
                {sessionInfo ? (
                  <>
                    <p className="text-sm font-bold text-gray-800 mb-1">
                      {sessionInfo.subject} - {sessionInfo.classRoom}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sessionInfo.day} - الحصة {sessionInfo.period}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      التاريخ: {new Date(request.date).toLocaleDateString('ar-SA')}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">معلومات الحصة غير متوفرة</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleAccept(request)}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-3 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
              >
                <CheckCircle size={14} />
                قبول
              </button>
              <button
                onClick={() => {
                  setRejectingRequestId(request.id);
                  setShowRejectModal(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 px-3 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
              >
                <XCircle size={14} />
                رفض
              </button>
            </div>
          </div>
        );
      })}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">رفض طلب الإسناد</h3>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingRequestId(null);
                  setRejectionReason('');
                }}
                className="text-gray-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                سبب الرفض <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب رفض طلب الإسناد..."
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 min-h-[100px]"
                dir="rtl"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingRequestId(null);
                  setRejectionReason('');
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleReject}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
              >
                رفض الطلب
              </button>
            </div>
          </div>
        </div>
      )}
      
      {alertModal.isOpen && <AlertModal {...alertModal} />}
    </div>
  );
};

