
import React, { useState } from 'react';
import { Student, DailyRecord } from '../types';
import { X, Send, Check, Users, Loader } from 'lucide-react';
import { getStatusLabel, getAttendanceLabel } from '../constants';

interface BulkReportModalProps {
  students: Student[];
  records: Record<string, DailyRecord>;
  isOpen: boolean;
  onClose: () => void;
  schoolName: string;
  schoolPhone?: string;
}

export const BulkReportModal: React.FC<BulkReportModalProps> = ({ students, records, isOpen, onClose, schoolName, schoolPhone }) => {
  const { confirm, alert, confirmModal, alertModal } = useModal();
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [isSendingAll, setIsSendingAll] = useState(false);

  if (!isOpen) return null;

  const constructMessage = (student: Student, record: DailyRecord | undefined) => {
    // Prepare Reply Link
    const schoolPhoneClean = schoolPhone?.replace(/[^0-9]/g, '') || '';
    const replyLink = schoolPhoneClean ? `https://wa.me/${schoolPhoneClean}` : '';

    return `
🏫 *${schoolName}*
👤 ولي أمر الطالب: *${student.name}*

السلام عليكم ورحمة الله،
مرفق لكم ملف PDF يحتوي على تقرير المتابعة اليومي للطالب.

نرجو التكرم بالاطلاع عليه.
${replyLink ? `\n👇 للرد على المدرسة:\n${replyLink}` : ''}
    `.trim();
  };

  const sendReport = (student: Student) => {
    const record = records[student.id];
    const message = constructMessage(student, record);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${student.parentPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    setSentIds(prev => prev.includes(student.id) ? prev : [...prev, student.id]);
  };

  const handleSendAll = async () => {
      const confirmSend = await confirm({
        title: 'إرسال التقارير الجماعية',
        message: "سيقوم النظام بفتح محادثة واتساب لكل طالب.\n\n⚠️ يجب عليك إرفاق ملف الـ PDF يدوياً لكل طالب بعد فتح المحادثة.\n\nهل تود البدء؟",
        type: 'info',
        confirmText: 'بدء',
        cancelText: 'إلغاء'
      });
      
      if (!confirmSend) return;

      setIsSendingAll(true);
      const remainingStudents = students.filter(s => !sentIds.includes(s.id));

      if (remainingStudents.length === 0) {
          alert({ message: "تم إرسال التقارير لجميع الطلاب مسبقاً.", type: 'info' });
          setIsSendingAll(false);
          return;
      }

      // Process one by one with a delay to attempt to bypass basic blocking and allow user to send
      for (const student of remainingStudents) {
          // Check if user cancelled midway (simulated by checking if modal still open, though effect persists)
          sendReport(student);
          
          // Wait 3 seconds before next one to give user time to focus and attach (simulate usage)
          await new Promise(resolve => setTimeout(resolve, 3000)); 
      }
      setIsSendingAll(false);
      alert({ message: "انتهت عملية فتح المحادثات.", type: 'success' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-teal-50 rounded-t-xl">
          <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Users className="text-teal-600" />
                  إرسال التقارير (واتساب - ملفات)
              </h2>
              <p className="text-sm text-gray-500">سيتم فتح الواتساب وعليك إرفاق ملف الـ PDF لكل طالب</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Bulk Action Bar */}
        <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center">
            <div className="text-sm text-gray-600">
                الحالة: <span className="font-bold">{sentIds.length}</span> من <span className="font-bold">{students.length}</span> تم الفتح
            </div>
            <button 
                onClick={handleSendAll}
                disabled={isSendingAll || sentIds.length === students.length}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow-sm transition-all ${
                    isSendingAll 
                    ? 'bg-gray-100 text-gray-400 cursor-wait' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                }`}
            >
                {isSendingAll ? <Loader className="animate-spin" size={18}/> : <Send size={18} className="rtl:rotate-180"/>}
                {isSendingAll ? 'جاري الفتح...' : 'بدء المراسلة للكل'}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
           {students.map(student => {
               const isSent = sentIds.includes(student.id);
               return (
                   <div key={student.id} className={`flex items-center justify-between bg-white p-3 mb-2 rounded border transition-colors ${isSent ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                       <div className="flex items-center gap-3">
                           <div className={`w-2 h-2 rounded-full ${isSent ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                           <div>
                               <div className="font-bold text-gray-700">{student.name}</div>
                               <div className="text-xs text-gray-400 flex items-center gap-1">
                                   <span>{student.parentPhone}</span>
                               </div>
                           </div>
                       </div>
                       <button 
                         onClick={() => sendReport(student)}
                         disabled={isSent || isSendingAll}
                         className={`flex items-center gap-2 px-4 py-1.5 rounded text-sm font-bold transition-colors ${
                             isSent 
                             ? 'bg-transparent text-green-600 cursor-default' 
                             : 'bg-teal-600 text-white hover:bg-teal-700'
                         }`}
                       >
                           {isSent ? <><Check size={16}/> تم الفتح</> : <><Send size={14} className="rtl:rotate-180"/> فتح المحادثة</>}
                       </button>
                   </div>
               );
           })}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white rounded-b-xl flex justify-end">
             <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold">
                 إغلاق
             </button>
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
    </div>
  );
};
