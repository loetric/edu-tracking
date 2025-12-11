import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Upload } from 'lucide-react';

/**
 * Helper component to visually determine PDF field positions
 * This component allows you to upload the PDF template and click on positions
 * to get the coordinates
 */
export const PDFPositionHelper: React.FC<{ onSave: (positions: any) => void }> = ({ onSave }) => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [clickedPositions, setClickedPositions] = useState<Array<{ x: number; y: number; field: string }>>([]);
  const [currentField, setCurrentField] = useState<string>('studentName');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);

  const fields = [
    { key: 'studentName', label: 'اسم الطالب' },
    { key: 'studentClass', label: 'الفصل' },
    { key: 'studentId', label: 'رقم الملف' },
    { key: 'parentPhone', label: 'جوال ولي الأمر' },
    { key: 'reportDate', label: 'تاريخ التقرير' },
    { key: 'dayName', label: 'اسم اليوم' },
    { key: 'schoolName', label: 'اسم المدرسة' },
    { key: 'ministry', label: 'الوزارة' },
    { key: 'region', label: 'الإدارة التعليمية' },
    { key: 'schoolPhone', label: 'رقم واتساب المدرسة' },
    { key: 'attendance', label: 'الحضور' },
    { key: 'participation', label: 'المشاركة' },
    { key: 'homework', label: 'الواجبات' },
    { key: 'behavior', label: 'السلوك' },
    { key: 'notes', label: 'الملاحظات' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    // Convert to PDF coordinates (assuming A4: 595x842 points)
    const pdfX = (x / rect.width) * 595;
    const pdfY = 842 - ((y / rect.height) * 842); // Flip Y axis
    
    setClickedPositions(prev => [...prev, { x: pdfX, y: pdfY, field: currentField }]);
  };

  const handleSave = () => {
    const positions: any = {};
    clickedPositions.forEach(pos => {
      positions[pos.field] = {
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        fontSize: 12,
        font: 'regular' as const
      };
    });
    onSave(positions);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">مساعد تحديد مواضع الحقول في PDF</h2>
          <button onClick={() => {/* close */}} className="text-gray-400 hover:text-red-500">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-bold text-blue-800 mb-2">التعليمات:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
              <li>ارفع ملف PDF القالب</li>
              <li>اختر الحقل من القائمة</li>
              <li>انقر على موضع الحقل في الصورة</li>
              <li>كرر العملية لجميع الحقول</li>
              <li>احفظ المواضع</li>
            </ol>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رفع ملف PDF القالب
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
            />
          </div>

          {pdfUrl && (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <iframe
                src={pdfUrl}
                className="w-full h-96 border border-gray-200 rounded"
                title="PDF Preview"
              />
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {fields.map(field => (
              <button
                key={field.key}
                onClick={() => setCurrentField(field.key)}
                className={`p-2 rounded-lg border-2 transition-colors ${
                  currentField === field.key
                    ? 'border-teal-500 bg-teal-50 text-teal-700 font-bold'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {field.label}
              </button>
            ))}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-bold text-gray-800 mb-2">الحقل المحدد: {fields.find(f => f.key === currentField)?.label}</h3>
            <p className="text-sm text-gray-600">انقر على موضع الحقل في ملف PDF أعلاه</p>
          </div>

          {clickedPositions.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-bold text-green-800 mb-2">المواضع المحددة:</h3>
              <div className="space-y-1 text-sm">
                {clickedPositions.map((pos, idx) => (
                  <div key={idx} className="text-green-700">
                    {fields.find(f => f.key === pos.field)?.label}: x={Math.round(pos.x)}, y={Math.round(pos.y)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={clickedPositions.length === 0}
              className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download size={18} />
              حفظ المواضع
            </button>
            <button
              onClick={() => setClickedPositions([])}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300"
            >
              مسح الكل
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

