
import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertTriangle, Download } from 'lucide-react';
import { Student } from '../types';

interface ExcelImporterProps {
  onImport: (newStudents: Student[]) => void;
}

export const ExcelImporter: React.FC<ExcelImporterProps> = ({ onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) processFile(files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setError(null);
    setSuccess(false);

    // Basic check for CSV extension
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError("الرجاء رفع ملف بصيغة CSV.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let text = event.target?.result as string;
        
        // Remove Byte Order Mark (BOM) if present (common in Excel CSVs)
        if (text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1);
        }

        const lines = text.split(/\r\n|\n/); // Split by newline
        const newStudents: Student[] = [];
        
        // Skip header (index 0)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Basic split by comma (doesn't handle quoted commas, but good enough for simple list)
          const parts = line.split(',');
          
          if (parts.length >= 2) { // At least Name and Class
            newStudents.push({
              id: `imported-${Date.now()}-${i}`,
              name: parts[0].trim(),
              classGrade: parts[1]?.trim() || 'عام',
              parentPhone: parts[2]?.trim().replace(/[^0-9]/g, '') || '', // Clean phone number
              challenge: 'none', // Default to none
              avatar: `https://picsum.photos/id/${(100 + i) % 1000}/50/50`
            });
          }
        }

        if (newStudents.length === 0) {
           setError("لم يتم العثور على بيانات صالحة. تأكد من أن الملف يحتوي على أسماء الطلاب.");
        } else {
           onImport(newStudents);
           setSuccess(true);
           // Clear input
           if (fileInputRef.current) fileInputRef.current.value = '';
        }
      } catch (err) {
        console.error(err);
        setError("حدث خطأ أثناء قراءة الملف. تأكد من أنه ملف نصي (CSV) صالح.");
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Mock template download
  const downloadTemplate = () => {
    // Add BOM for Excel to open Arabic correctly
    const bom = "\uFEFF"; 
    const csvContent = bom + "اسم الطالب,الصف,رقم ولي الأمر\nأحمد محمد علي,الرابع/ب,966500000000\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_template.csv';
    a.click();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">استيراد بيانات الطلاب</h2>
          <p className="text-gray-500 mt-2">قم برفع ملف Excel (CSV) يحتوي على: الاسم، الصف، ورقم الجوال</p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 transition-colors cursor-pointer ${
            isDragging 
              ? 'border-teal-500 bg-teal-50' 
              : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".csv"
            onChange={handleFileSelect}
          />
          <Upload className="mx-auto text-gray-400 mb-4" size={40} />
          <p className="font-medium text-gray-700">اضغط للرفع أو اسحب الملف هنا</p>
          <p className="text-sm text-gray-400 mt-2">CSV فقط (الحد الأقصى 5MB)</p>
        </div>

        <div className="mt-6 flex justify-center">
            <button 
                onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
                className="flex items-center gap-2 text-sm text-teal-600 hover:underline"
            >
                <Download size={14} />
                تحميل نموذج الملف (Excel)
            </button>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-3 animate-pulse">
            <Check size={20} />
            <span>تم استيراد البيانات بنجاح!</span>
          </div>
        )}
      </div>
    </div>
  );
};
