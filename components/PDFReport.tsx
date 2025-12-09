
import React from 'react';
import { Student, DailyRecord, SchoolSettings, ScheduleItem } from '../types';
import { getStatusLabel } from '../constants';
import { X, Printer, User, Share2, Phone, CalendarCheck, BookOpen, UserCheck, Star, FileText, BarChart3 } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface PDFReportProps {
  student: Student;
  record: DailyRecord;
  settings: SchoolSettings;
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleItem[]; 
}

export const PDFReport: React.FC<PDFReportProps> = ({ student, record, settings, isOpen, onClose, schedule }) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppOpen = () => {
      const msg = encodeURIComponent(`السلام عليكم،\n\nمرفق لكم تقرير المتابعة اليومي للطالب: ${student.name}\n\nنأمل الاطلاع عليه وشكراً لتعاونكم.`);
      window.open(`https://wa.me/${student.parentPhone}?text=${msg}`, '_blank');
  };

  // Date Formatting
  const today = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const dayName = today.toLocaleDateString('ar-SA', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('ar-SA', dateOptions);

  // Filter schedule for today
  const dailySchedule = schedule.filter(s => s.day === dayName).sort((a, b) => a.period - b.period);

  // Helper for status colors/labels
  const getStatusDisplay = (status: string, type: 'attendance' | 'academic') => {
      if (type === 'attendance') {
        switch(status) {
            case 'present': return { text: 'حاضر', bg: 'bg-green-50', border: 'border-green-200', textCol: 'text-green-800', icon: <UserCheck size={14}/> };
            case 'excused': return { text: 'مستأذن', bg: 'bg-yellow-50', border: 'border-yellow-200', textCol: 'text-yellow-800', icon: <UserCheck size={14}/> };
            case 'absent': return { text: 'غائب', bg: 'bg-red-50', border: 'border-red-200', textCol: 'text-red-800', icon: <X size={14}/> };
            default: return { text: '-', bg: 'bg-gray-50', border: 'border-gray-200', textCol: 'text-gray-800', icon: <User size={14}/> };
        }
      } else {
        // For participation, homework, behavior
        switch(status) {
            case 'excellent': return { text: 'متميز', bg: 'bg-teal-50', border: 'border-teal-200', textCol: 'text-teal-800' };
            case 'good': return { text: 'جيد', bg: 'bg-blue-50', border: 'border-blue-200', textCol: 'text-blue-800' };
            case 'average': return { text: 'متوسط', bg: 'bg-yellow-50', border: 'border-yellow-200', textCol: 'text-yellow-800' };
            case 'poor': return { text: 'ضعيف', bg: 'bg-red-50', border: 'border-red-200', textCol: 'text-red-800' };
            default: return { text: '-', bg: 'bg-gray-50', border: 'border-gray-100', textCol: 'text-gray-300' };
        }
      }
  };

  const attendanceInfo = getStatusDisplay(record.attendance, 'attendance');
  const participationInfo = getStatusDisplay(record.participation, 'academic');
  const homeworkInfo = getStatusDisplay(record.homework, 'academic');
  const behaviorInfo = getStatusDisplay(record.behavior, 'academic');

  // Chart Data Preparation
  const scoreMap: Record<string, number> = { excellent: 100, good: 75, average: 50, poor: 25, none: 0 };
  
  // Calculate specific scores, defaulting to 0 if absent
  const partScore = record.attendance === 'present' ? (scoreMap[record.participation] || 0) : 0;
  const homeScore = record.attendance === 'present' ? (scoreMap[record.homework] || 0) : 0;
  const behScore = record.attendance === 'present' ? (scoreMap[record.behavior] || 0) : 0;

  const chartData = [
    { subject: 'المشاركة', A: partScore, fullMark: 100 },
    { subject: 'الواجبات', A: homeScore, fullMark: 100 },
    { subject: 'السلوك', A: behScore, fullMark: 100 },
  ];

  // Calculate Average Score
  const totalScore = (partScore + homeScore + behScore) / 3;
  let performanceLevel = 'غير محدد';
  if (record.attendance === 'present') {
      if (totalScore >= 90) performanceLevel = 'ممتاز';
      else if (totalScore >= 75) performanceLevel = 'جيد جداً';
      else if (totalScore >= 60) performanceLevel = 'جيد';
      else performanceLevel = 'يحتاج متابعة';
  }

  // QR Code URL Generator
  const qrCodeUrl = settings.reportLink 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(settings.reportLink)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto print:bg-white print:p-0 p-2 md:p-4">
      
      {/* Controls - Hidden in Print */}
      <div className="fixed top-2 left-2 right-2 md:top-4 md:left-4 md:w-72 flex flex-col gap-2 md:gap-3 print:hidden bg-white p-3 md:p-5 rounded-xl shadow-2xl z-50 border border-gray-100 animate-in fade-in slide-in-from-left-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                <Printer size={16} className="text-teal-600 md:w-[18px] md:h-[18px]"/>
                <span>لوحة التصدير</span>
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-50 p-1.5 md:p-1 rounded-md flex-shrink-0"><X size={16} className="md:w-[18px] md:h-[18px]"/></button>
        </div>
        
        <div className="space-y-3">
            <button onClick={handlePrint} className="flex items-center justify-center gap-2 bg-gray-900 text-white w-full py-3 rounded-lg hover:bg-black font-bold shadow-lg transition-all active:scale-95">
            <Printer size={18} />
            طباعة / حفظ PDF
            </button>
            
            <button onClick={handleWhatsAppOpen} className="flex items-center justify-center gap-2 bg-green-600 text-white w-full py-3 rounded-lg hover:bg-green-700 font-bold shadow-lg transition-all active:scale-95">
            <Share2 size={18} />
            فتح واتساب
            </button>
            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 leading-relaxed border border-blue-100">
                <strong>ملاحظة:</strong> قم بحفظ التقرير كملف PDF أولاً، ثم استخدم زر الواتساب لإرسال الملف لولي الأمر.
            </div>
        </div>
      </div>

      {/* A4 Paper Styling - Responsive */}
      <div className="bg-white w-full max-w-[210mm] min-h-[297mm] mx-auto my-4 md:my-8 relative shadow-2xl print:shadow-none print:w-full print:h-screen print:my-0 overflow-y-auto overflow-x-hidden flex flex-col text-black print:overflow-visible">
        
        {/* Official Frame Border */}
        <div className="absolute inset-0 border-[3px] border-double border-gray-300 m-2 pointer-events-none rounded-sm"></div>
        <div className="absolute inset-0 border border-gray-200 m-3 pointer-events-none rounded-sm"></div>

        <div className="p-10 flex-1 flex flex-col h-full relative z-10">
            
            {/* 1. Official Header */}
            <header className="flex justify-between items-start mb-6 border-b-2 border-gray-100 pb-4">
                <div className="text-right space-y-1.5 w-1/3">
                    <p className="font-bold text-xs text-gray-500">المملكة العربية السعودية</p>
                    <p className="font-bold text-sm text-gray-800">{settings.ministry}</p>
                    <p className="font-bold text-sm text-gray-800">{settings.region}</p>
                    <p className="font-bold text-base text-teal-800 mt-1">{settings.name}</p>
                </div>
                
                <div className="w-1/3 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 mb-2">
                        <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain drop-shadow-sm" />
                    </div>
                    <h1 className="text-xl font-black text-gray-800 border-b-2 border-teal-600 pb-1 px-4">
                        تقرير متابعة يومي
                    </h1>
                </div>

                <div className="text-left w-1/3 space-y-2 pt-2">
                    <div className="flex flex-col items-end text-sm">
                        <span className="text-gray-500 text-xs">تاريخ التقرير</span>
                        <span className="font-bold text-gray-800">{dateStr}</span>
                        <span className="text-gray-500 text-xs">{dayName}</span>
                    </div>
                    {settings.whatsappPhone && (
                        <div className="flex items-center justify-end gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded inline-block">
                             <span>{settings.whatsappPhone}</span>
                             <Phone size={12} />
                        </div>
                    )}
                </div>
            </header>

            {/* 2. Student Information Table */}
            <section className="mb-4 md:mb-6">
                <div className="bg-white border border-gray-300 rounded-lg overflow-hidden flex flex-col md:flex-row shadow-sm">
                     {/* Avatar & Name */}
                     <div className="bg-gray-50 p-3 md:p-4 border-b md:border-b-0 md:border-l border-gray-300 flex flex-row md:flex-col items-center md:justify-center justify-between md:w-32 w-full md:text-center">
                         <div className="flex items-center gap-3 md:flex-col">
                             {student.avatar ? (
                                 <img src={student.avatar} className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-white shadow-sm object-cover md:mb-2" />
                             ) : (
                                 <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 flex items-center justify-center md:mb-2"><User size={20} className="md:w-6 md:h-6 text-gray-400"/></div>
                             )}
                             <div className="md:hidden">
                                 <p className="text-xs font-bold text-gray-900">{student.name}</p>
                                 <p className="text-[10px] text-gray-500">الصف: {student.classGrade}</p>
                             </div>
                         </div>
                         <span className="text-[10px] md:text-xs font-bold text-gray-500">رقم الملف: {student.id}</span>
                     </div>
                     
                     {/* Details Grid */}
                     <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
                         <div className="hidden md:flex border-b border-l border-gray-200 p-3 flex-col justify-center">
                             <span className="text-[10px] text-gray-500 font-bold mb-1">الاسم الرباعي</span>
                             <span className="text-sm font-bold text-gray-900">{student.name}</span>
                         </div>
                         <div className="border-b md:border-b-0 md:border-l border-gray-200 p-3 flex flex-col justify-center">
                             <span className="text-[10px] text-gray-500 font-bold mb-1">الصف / الفصل</span>
                             <span className="text-sm font-bold text-gray-900">{student.classGrade}</span>
                         </div>
                         <div className="border-b md:border-b-0 md:border-l border-gray-200 p-3 flex flex-col justify-center">
                             <span className="text-[10px] text-gray-500 font-bold mb-1">جوال ولي الأمر</span>
                             <span className="text-sm font-bold text-gray-900 font-mono break-all" dir="ltr">{student.parentPhone}</span>
                         </div>
                         <div className="p-3 flex flex-col justify-center bg-gray-50/50">
                             <span className="text-[10px] text-gray-500 font-bold mb-1">حالة التقرير</span>
                             <span className="text-sm font-bold text-teal-700">معتمد من المدرسة</span>
                         </div>
                     </div>
                </div>
            </section>

            {/* 3. Daily Status Summary & Chart */}
            <section className="mb-4 md:mb-6">
                <div className="flex items-center gap-2 mb-3 text-teal-700 font-bold text-xs md:text-sm border-b border-gray-100 pb-1 w-fit">
                    <Star size={14} className="md:w-4 md:h-4" />
                    ملخص الأداء والمستوى اليومي
                </div>
                
                <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                    {/* Left Side: Stats Cards */}
                    <div className="w-full md:w-2/3 grid grid-cols-2 gap-2 md:gap-3 content-start">
                        {/* Attendance */}
                        <div className={`border rounded-lg p-2 md:p-3 text-center flex flex-col items-center justify-center gap-1 ${attendanceInfo.bg} ${attendanceInfo.border}`}>
                            <span className="text-[10px] md:text-xs font-bold text-gray-500">الحضور</span>
                            <div className={`font-black text-xs md:text-sm ${attendanceInfo.textCol} flex items-center gap-1`}>
                                {attendanceInfo.icon}
                                {attendanceInfo.text}
                            </div>
                        </div>
                        {/* Participation */}
                        <div className={`border rounded-lg p-2 md:p-3 text-center flex flex-col items-center justify-center gap-1 ${participationInfo.bg} ${participationInfo.border}`}>
                            <span className="text-[10px] md:text-xs font-bold text-gray-500">المشاركة</span>
                            <div className={`font-black text-xs md:text-sm ${participationInfo.textCol}`}>{participationInfo.text}</div>
                        </div>
                        {/* Homework */}
                        <div className={`border rounded-lg p-2 md:p-3 text-center flex flex-col items-center justify-center gap-1 ${homeworkInfo.bg} ${homeworkInfo.border}`}>
                            <span className="text-[10px] md:text-xs font-bold text-gray-500">الواجبات</span>
                            <div className={`font-black text-xs md:text-sm ${homeworkInfo.textCol}`}>{homeworkInfo.text}</div>
                        </div>
                        {/* Behavior */}
                        <div className={`border rounded-lg p-2 md:p-3 text-center flex flex-col items-center justify-center gap-1 ${behaviorInfo.bg} ${behaviorInfo.border}`}>
                            <span className="text-[10px] md:text-xs font-bold text-gray-500">السلوك</span>
                            <div className={`font-black text-xs md:text-sm ${behaviorInfo.textCol}`}>{behaviorInfo.text}</div>
                        </div>
                    </div>

                    {/* Right Side: Performance Chart */}
                    <div className="w-full md:w-1/3 border border-gray-200 rounded-lg p-2 bg-white relative flex flex-col items-center justify-center min-h-[150px] md:min-h-[120px]">
                        <div className="absolute top-2 right-2 text-[10px] text-gray-400 font-bold flex items-center gap-1">
                            <BarChart3 size={10} className="md:w-3 md:h-3" />
                            مؤشر الأداء
                        </div>
                        {record.attendance === 'present' ? (
                            <div className="w-full h-[150px] md:h-[120px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                        <PolarGrid stroke="#e5e7eb" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 'bold' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar
                                            name="Student"
                                            dataKey="A"
                                            stroke="#0d9488"
                                            fill="#0d9488"
                                            fillOpacity={0.5}
                                            isAnimationActive={false} // Important for printing
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                                <div className="text-center -mt-2">
                                    <span className="text-[10px] text-gray-500">التقدير العام: </span>
                                    <span className="text-xs font-bold text-teal-700">{performanceLevel}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <span className="text-xs">لا يوجد تقييم (غائب)</span>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 4. Detailed Schedule Table */}
            <section className="mb-4 md:mb-6 flex-1">
                 <div className="flex items-center gap-2 mb-2 text-teal-700 font-bold text-xs md:text-sm border-b border-gray-100 pb-1 w-fit">
                    <CalendarCheck size={14} className="md:w-4 md:h-4" />
                    كشف المتابعة والحصص الدراسية
                </div>
                
                <div className="overflow-x-auto -mx-2 md:mx-0 print:overflow-visible">
                    <table className="w-full border-collapse text-[10px] md:text-xs text-center border border-gray-300 rounded-lg overflow-hidden min-w-full">
                        <thead className="bg-gray-100 text-gray-700">
                            <tr>
                                <th className="border border-gray-300 p-1.5 md:p-2 w-8 font-bold text-[10px] md:text-xs">م</th>
                                <th className="border border-gray-300 p-1.5 md:p-2 font-bold text-right text-[10px] md:text-xs">المادة</th>
                                <th className="border border-gray-300 p-1.5 md:p-2 font-bold text-right w-1/4 text-[10px] md:text-xs">المعلم</th>
                                <th className="border border-gray-300 p-1.5 md:p-2 font-bold w-16 text-[10px] md:text-xs">الحضور</th>
                                <th className="border border-gray-300 p-1.5 md:p-2 font-bold w-16 text-[10px] md:text-xs">المشاركة</th>
                                <th className="border border-gray-300 p-1.5 md:p-2 font-bold w-16 text-[10px] md:text-xs">الواجبات</th>
                                <th className="border border-gray-300 p-1.5 md:p-2 font-bold w-16 text-[10px] md:text-xs">السلوك</th>
                                <th className="border border-gray-300 p-1.5 md:p-2 font-bold w-1/5 text-[10px] md:text-xs">ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dailySchedule.length > 0 ? dailySchedule.map((session, idx) => (
                                <tr key={idx} className="bg-white hover:bg-gray-50">
                                    <td className="border border-gray-300 p-1.5 md:p-2 font-bold bg-gray-50 text-[10px] md:text-xs">{session.period}</td>
                                    <td className="border border-gray-300 p-1.5 md:p-2 font-bold text-gray-800 text-right text-[10px] md:text-xs">{session.subject}</td>
                                    <td className="border border-gray-300 p-1.5 md:p-2 text-gray-600 font-medium text-right text-[9px] md:text-[10px]">{session.teacher}</td>
                                    
                                    {/* Status Columns - Populated with Daily Record for Visual Representation */}
                                    <td className="border border-gray-300 p-1">
                                        <div className={`text-[9px] md:text-[10px] font-bold py-0.5 md:py-1 px-1 rounded-sm ${attendanceInfo.bg} ${attendanceInfo.textCol}`}>
                                            {attendanceInfo.text}
                                        </div>
                                    </td>
                                    <td className="border border-gray-300 p-1">
                                         {record.attendance === 'present' ? (
                                            <div className={`text-[9px] md:text-[10px] font-bold py-0.5 md:py-1 rounded-sm ${participationInfo.bg} ${participationInfo.textCol}`}>
                                                {participationInfo.text}
                                            </div>
                                         ) : <span className="text-gray-300 text-[9px]">-</span>}
                                    </td>
                                    <td className="border border-gray-300 p-1">
                                        {record.attendance === 'present' ? (
                                            <div className={`text-[9px] md:text-[10px] font-bold py-0.5 md:py-1 rounded-sm ${homeworkInfo.bg} ${homeworkInfo.textCol}`}>
                                                {homeworkInfo.text}
                                            </div>
                                        ) : <span className="text-gray-300 text-[9px]">-</span>}
                                    </td>
                                    <td className="border border-gray-300 p-1">
                                        {record.attendance === 'present' ? (
                                            <div className={`text-[9px] md:text-[10px] font-bold py-0.5 md:py-1 rounded-sm ${behaviorInfo.bg} ${behaviorInfo.textCol}`}>
                                                {behaviorInfo.text}
                                            </div>
                                        ) : <span className="text-gray-300 text-[9px]">-</span>}
                                    </td>
                                    <td className="border border-gray-300 p-1 text-[8px] md:text-[9px] text-gray-600 leading-relaxed break-words whitespace-pre-wrap max-w-[120px] md:max-w-none">
                                       {record.notes || '-'}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={8} className="p-4 md:p-6 text-center text-gray-400 italic text-xs md:text-sm">لا توجد حصص مسجلة في الجدول لهذا اليوم</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* 5. Notes & Messages Section */}
            <section className="mt-auto space-y-3 md:space-y-4">
                
                {/* General Daily Notes */}
                {record.notes && (
                    <div className="border border-gray-300 rounded-lg p-2 md:p-3 bg-white relative">
                        <div className="absolute -top-2.5 md:-top-3 right-2 md:right-3 bg-white px-2 text-[10px] md:text-xs font-bold text-teal-700 flex items-center gap-1">
                            <FileText size={12} className="md:w-3.5 md:h-3.5" />
                            الملاحظات العامة على اليوم الدراسي
                        </div>
                        <p className="text-xs md:text-sm font-medium leading-relaxed text-gray-800 mt-2 md:mt-1 p-1 break-words whitespace-pre-wrap">{record.notes}</p>
                    </div>
                )}

                 {/* Counselor/Admin Message */}
                 {settings.reportGeneralMessage && (
                     <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-2 md:p-3 relative">
                        <div className="absolute -top-2.5 md:-top-3 right-2 md:right-3 bg-white px-2 text-[10px] md:text-xs font-bold text-blue-700 flex items-center gap-1 border border-blue-100 rounded-full">
                            <BookOpen size={12} className="md:w-3.5 md:h-3.5" />
                            رسالة الموجه الطلابي / الإدارة
                        </div>
                        <p className="text-[10px] md:text-xs text-blue-900 mt-2 md:mt-1 leading-relaxed text-center font-medium">
                            "{settings.reportGeneralMessage}"
                        </p>
                     </div>
                )}
            </section>

            {/* 6. Footer & Signatures */}
            <footer className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-end px-4 mb-4">
                    <div className="text-center">
                        <p className="text-xs font-bold text-gray-500 mb-8">وكيل الشؤون التعليمية</p>
                        <div className="h-px w-32 bg-gray-300"></div>
                        <p className="text-[10px] text-gray-400 mt-1">التوقيع</p>
                    </div>
                    
                    <div className="text-center flex flex-col items-center">
                         {qrCodeUrl ? (
                             <img src={qrCodeUrl} alt="QR" className="w-16 h-16 mix-blend-multiply mb-1" />
                         ) : (
                             <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-[10px] text-gray-400 mb-1">مكان الختم</div>
                         )}
                         <span className="text-[9px] text-gray-400">ختم المدرسة</span>
                    </div>

                    <div className="text-center">
                        <p className="text-xs font-bold text-gray-500 mb-8">مدير المدرسة</p>
                        <div className="h-px w-32 bg-gray-300"></div>
                        <p className="text-[10px] text-gray-400 mt-1">التوقيع</p>
                    </div>
                </div>

                {/* Bottom Strip */}
                <div className="bg-gray-100 text-gray-500 py-2 px-4 rounded text-[10px] flex justify-between items-center border border-gray-200">
                    <span className="font-bold">{settings.slogan}</span>
                    <div className="flex gap-4">
                        <span>صدر عن: نظام التتبع الذكي</span>
                        {settings.whatsappPhone && <span dir="ltr">Contact: {settings.whatsappPhone}</span>}
                    </div>
                </div>
            </footer>

        </div>
      </div>
    </div>
  );
};
