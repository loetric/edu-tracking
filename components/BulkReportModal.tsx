
import React, { useState } from 'react';
import { Student, DailyRecord, SchoolSettings, ScheduleItem } from '../types';
import { X, Send, Check, Users, Loader, FileText, Eye } from 'lucide-react';
import { getStatusLabel, getAttendanceLabel } from '../constants';
import { useModal } from '../hooks/useModal';
import { ConfirmModal } from './ConfirmModal';
import { AlertModal } from './AlertModal';
import { generatePDFReport } from '../services/pdfGenerator';

interface BulkReportModalProps {
  students: Student[];
  records: Record<string, DailyRecord>;
  isOpen: boolean;
  onClose: () => void;
  schoolName: string;
  schoolPhone?: string;
  settings: SchoolSettings;
  schedule: ScheduleItem[];
}

export const BulkReportModal: React.FC<BulkReportModalProps> = ({ 
  students, 
  records, 
  isOpen, 
  onClose, 
  schoolName, 
  schoolPhone,
  settings,
  schedule
}) => {
  const { confirm, alert, confirmModal, alertModal } = useModal();
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  // Filter only students with records (students who have been tracked)
  const studentsWithRecords = students.filter(student => {
    const record = records[student.id];
    return record && record.date === new Date().toISOString().split('T')[0];
  });

  if (!isOpen) return null;

  const constructMessage = (student: Student, record: DailyRecord | undefined) => {
    // Prepare Reply Link
    const schoolPhoneClean = schoolPhone?.replace(/[^0-9]/g, '') || '';
    const replyLink = schoolPhoneClean ? `https://wa.me/${schoolPhoneClean}` : '';
    
    // Get attendance status in Arabic
    const attendanceStatus = record?.attendance === 'present' ? 'حاضر' : 
                            record?.attendance === 'absent' ? 'غائب' : 
                            record?.attendance === 'excused' ? 'مستأذن' : 'غير محدد';

    return `
🏫 *${schoolName}*
👤 ولي أمر الطالب: *${student.name}*

السلام عليكم ورحمة الله،
مرفق لكم ملف PDF يحتوي على تقرير المتابعة اليومي للطالب.

📊 ملخص اليوم:
• الحضور: ${attendanceStatus}
• الفصل: ${student.classGrade}

📎 يرجى الاطلاع على الملف المرفق.

${replyLink ? `\n👇 للرد على المدرسة:\n${replyLink}` : ''}
    `.trim();
  };

  const previewReport = async (student: Student) => {
    try {
      const record = records[student.id];
      if (!record) {
        alert({ message: `لا توجد بيانات مرصودة للطالب ${student.name}`, type: 'warning' });
        return;
      }

      // Generate PDF report
      setGeneratingPdf(student.id);
      const pdfBytes = await generatePDFReport(student, record, settings, schedule);
      
      // Create blob and open in new window for preview
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(blob);
      
      // Open PDF in new window/tab for preview
      window.open(pdfUrl, '_blank');
      
      setGeneratingPdf(null);
    } catch (error) {
      console.error('Error generating PDF for preview:', error);
      setGeneratingPdf(null);
      alert({ 
        message: `حدث خطأ أثناء توليد تقرير ${student.name}. يرجى المحاولة مرة أخرى.`, 
        type: 'error' 
      });
    }
  };

  const sendReport = async (student: Student) => {
    try {
      const record = records[student.id];
      if (!record) {
        alert({ message: `لا توجد بيانات مرصودة للطالب ${student.name}`, type: 'warning' });
        return;
      }

      // Generate PDF report
      setGeneratingPdf(student.id);
      const pdfBytes = await generatePDFReport(student, record, settings, schedule);
      
      // Create blob and download link
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(blob);
      
      // Create temporary download link
      const link = document.createElement('a');
      link.href = pdfUrl;
      const fileName = `تقرير_${student.name}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      
      // Download the PDF first
      link.click();
      document.body.removeChild(link);
      
      // Wait a moment for download to start
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Clean up
      URL.revokeObjectURL(pdfUrl);
      
      // Construct WhatsApp message
      const message = constructMessage(student, record);
      const encodedMessage = encodeURIComponent(message);
      
      // Open WhatsApp
      // Note: WhatsApp Web doesn't support direct file attachment via URL
      // The user will need to attach the downloaded file manually
      const whatsappUrl = `https://wa.me/${student.parentPhone}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
      
      setSentIds(prev => prev.includes(student.id) ? prev : [...prev, student.id]);
      setGeneratingPdf(null);
      
      alert({ 
        message: `تم تحميل تقرير ${student.name}. يرجى إرفاق الملف في رسالة واتساب التي تم فتحها.`, 
        type: 'success',
        duration: 5000
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      setGeneratingPdf(null);
      alert({ 
        message: `حدث خطأ أثناء توليد تقرير ${student.name}. يرجى المحاولة مرة أخرى.`, 
        type: 'error' 
      });
    }
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
      const remainingStudents = studentsWithRecords.filter(s => !sentIds.includes(s.id));

      if (remainingStudents.length === 0) {
          alert({ message: "تم إرسال التقارير لجميع الطلاب المرصودة مسبقاً.", type: 'info' });
          setIsSendingAll(false);
          return;
      }

      // Process one by one with a delay to allow user to attach file in WhatsApp
      for (const student of remainingStudents) {
          await sendReport(student);
          
          // Wait 5 seconds before next one to give user time to attach file in WhatsApp
          await new Promise(resolve => setTimeout(resolve, 5000)); 
      }
      setIsSendingAll(false);
      alert({ message: "انتهت عملية إرسال التقارير. تأكد من إرفاق ملفات PDF في جميع رسائل واتساب.", type: 'success', duration: 6000 });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto p-2 md:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ touchAction: 'none' }}
      onTouchMove={(e) => {
        e.stopPropagation();
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] md:max-h-[80vh] my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-teal-50 rounded-t-xl flex-shrink-0">
          <div className="flex-1 min-w-0">
              <h2 className="text-base md:text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Users size={18} className="md:w-6 md:h-6 text-teal-600 flex-shrink-0" />
                  <span className="truncate">إرسال التقارير (واتساب - ملفات)</span>
              </h2>
              <p className="text-xs md:text-sm text-gray-500 mt-1">سيتم فتح الواتساب وعليك إرفاق ملف الـ PDF لكل طالب</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1">
            <X size={20} className="md:w-6 md:h-6" />
          </button>
        </div>

        {/* Bulk Action Bar */}
        <div className="p-3 md:p-4 bg-white border-b border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-0 flex-shrink-0">
            <div className="text-xs md:text-sm text-gray-600">
                الحالة: <span className="font-bold">{sentIds.length}</span> من <span className="font-bold">{studentsWithRecords.length}</span> تم الإرسال
                {studentsWithRecords.length === 0 && (
                  <span className="block text-red-600 font-bold mt-1">⚠️ لا توجد طلاب مرصودة بياناتهم</span>
                )}
            </div>
            <button 
                onClick={handleSendAll}
                disabled={isSendingAll || sentIds.length === studentsWithRecords.length || studentsWithRecords.length === 0}
                className={`flex items-center justify-center gap-2 px-4 md:px-6 py-2 rounded-lg font-bold text-xs md:text-sm shadow-sm transition-all ${
                    isSendingAll || studentsWithRecords.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-wait' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                }`}
            >
                {isSendingAll ? <Loader className="animate-spin" size={16} /> : <Send size={16} className="rtl:rotate-180"/>}
                <span>{isSendingAll ? 'جاري الإرسال...' : 'إرسال للكل'}</span>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-gray-50" style={{ WebkitOverflowScrolling: 'touch' }}>
           {studentsWithRecords.length === 0 ? (
             <div className="text-center py-12">
               <FileText size={48} className="mx-auto mb-4 text-gray-300" />
               <p className="text-gray-500 font-bold text-lg">لا توجد طلاب مرصودة بياناتهم</p>
               <p className="text-gray-400 text-sm mt-2">يرجى رصد بيانات الطلاب أولاً من صفحة المتابعة اليومية</p>
             </div>
           ) : (
             studentsWithRecords.map(student => {
               const isSent = sentIds.includes(student.id);
               const isGenerating = generatingPdf === student.id;
               const record = records[student.id];
               return (
                   <div key={student.id} className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 bg-white p-3 mb-2 rounded border transition-colors ${isSent ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                       <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                           <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isSent ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                           <div className="min-w-0 flex-1">
                               <div className="font-bold text-sm sm:text-base text-gray-700 truncate">{student.name}</div>
                               <div className="text-xs text-gray-400 flex items-center gap-1">
                                   <span className="truncate">{student.parentPhone}</span>
                                   {record && (
                                     <span className="text-teal-600 font-bold">• {record.attendance === 'present' ? 'حاضر' : record.attendance === 'absent' ? 'غائب' : 'مستأذن'}</span>
                                   )}
                               </div>
                           </div>
                       </div>
                       <div className="flex items-center gap-2 w-full sm:w-auto">
                           <button 
                             onClick={() => previewReport(student)}
                             disabled={isGenerating}
                             className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-bold transition-colors ${
                                 isGenerating
                                 ? 'bg-gray-100 text-gray-400 cursor-wait'
                                 : 'bg-blue-600 text-white hover:bg-blue-700'
                             }`}
                             title="معاينة التقرير"
                           >
                               {isGenerating ? (
                                 <><Loader className="animate-spin" size={14} /></>
                               ) : (
                                 <><Eye size={14} className="sm:w-4 sm:h-4"/> <span className="hidden sm:inline">معاينة</span></>
                               )}
                           </button>
                           <button 
                             onClick={() => sendReport(student)}
                             disabled={isSent || isSendingAll || isGenerating}
                             className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-bold transition-colors flex-1 sm:flex-initial ${
                                 isSent 
                                 ? 'bg-transparent text-green-600 cursor-default' 
                                 : isGenerating
                                 ? 'bg-yellow-100 text-yellow-700 cursor-wait'
                                 : 'bg-teal-600 text-white hover:bg-teal-700'
                             }`}
                           >
                               {isGenerating ? (
                                 <><Loader className="animate-spin" size={14} /> <span>جاري التوليد...</span></>
                               ) : isSent ? (
                                 <><Check size={14} className="sm:w-4 sm:h-4"/> <span>تم الإرسال</span></>
                               ) : (
                                 <><Send size={14} className="sm:w-4 sm:h-4 rtl:rotate-180"/> <span>إرسال</span></>
                               )}
                           </button>
                       </div>
                   </div>
               );
             })
           )}
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
