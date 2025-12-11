import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import { Student, DailyRecord, SchoolSettings, ScheduleItem } from '../types';
import { getStatusLabel } from '../constants';

/**
 * Convert Arabic text to image using Canvas
 * This is needed because pdf-lib doesn't support Arabic fonts by default
 */
async function textToImage(text: string, fontSize: number = 12, isBold: boolean = false): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set font - use system fonts that support Arabic
      const fontFamily = 'Arial, "Segoe UI", "Tahoma", "Arabic Typesetting", sans-serif';
      const fontWeight = isBold ? 'bold' : 'normal';
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#000000';

      // Measure text
      const metrics = ctx.measureText(text);
      const textWidth = Math.max(metrics.width, 10); // Ensure minimum width
      const textHeight = fontSize * 1.5; // Add some padding for line height

      // Set canvas size with padding
      canvas.width = Math.ceil(textWidth) + 20; // Add padding
      canvas.height = Math.ceil(textHeight) + 10;

      // Clear and redraw with correct size
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#000000';

      // Draw text
      ctx.fillText(text, canvas.width - 10, 5);

      // Convert to blob then to array buffer
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        blob.arrayBuffer().then(buffer => {
          resolve(new Uint8Array(buffer));
        }).catch(reject);
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Embed text as image in PDF (for Arabic support)
 */
async function drawArabicText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  fontSize: number = 12,
  isBold: boolean = false,
  pageHeight: number
): Promise<void> {
  try {
    // Convert text to image
    const imageBytes = await textToImage(text, fontSize, isBold);
    
    // Embed image in PDF
    const image = await page.doc.embedPng(imageBytes);
    
    // Calculate position (y is from top, convert to bottom)
    const pdfY = pageHeight - y;
    
    // Draw image
    page.drawImage(image, {
      x: x,
      y: pdfY - image.height * 0.75, // Adjust for text baseline
      width: image.width,
      height: image.height,
    });
  } catch (error) {
    console.warn(`Error drawing Arabic text "${text}":`, error);
    // Fallback: try to draw as regular text (may not work for Arabic)
    try {
      const helveticaFont = await page.doc.embedFont(StandardFonts.Helvetica);
      const pdfY = pageHeight - y;
      page.drawText(text, {
        x: x,
        y: pdfY,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    } catch (fallbackError) {
      console.error('Fallback text drawing also failed:', fallbackError);
    }
  }
}

// Load PDF template
const TEMPLATE_PATH = '/templates/pdf/student_report_template.pdf';

// Field positions configuration
// NOTE: You need to inspect your PDF template and set the exact coordinates (x, y) for each field
// Coordinates are in points (1 inch = 72 points)
// Origin (0,0) is at bottom-left corner of the page
export interface FieldPosition {
  x: number;
  y: number;
  fontSize?: number;
  font?: 'regular' | 'bold';
  color?: { r: number; g: number; b: number };
  width?: number; // For text fields that might need wrapping
}

export interface TemplateFields {
  // Student Information
  studentName?: FieldPosition;
  studentClass?: FieldPosition;
  studentId?: FieldPosition;
  parentPhone?: FieldPosition;
  
  // Date
  reportDate?: FieldPosition;
  dayName?: FieldPosition;
  
  // School Information
  schoolName?: FieldPosition;
  ministry?: FieldPosition;
  region?: FieldPosition;
  schoolPhone?: FieldPosition;
  
  // Attendance & Performance
  attendance?: FieldPosition;
  participation?: FieldPosition;
  homework?: FieldPosition;
  behavior?: FieldPosition;
  
  // Notes
  notes?: FieldPosition;
  
  // Schedule (if multiple positions needed)
  schedule?: FieldPosition[];
  
  // QR Code (if applicable)
  qrCode?: FieldPosition;
}

// Default field positions - ESTIMATED POSITIONS
// These are estimated coordinates based on a typical student report layout
// Page size: A4 (595 x 842 points)
// IMPORTANT: You should adjust these positions after viewing your actual PDF template
//
// Layout assumption:
// - Top section: School info and header (y: 800-750)
// - Middle-top: Student info and date (y: 750-700)
// - Middle: Performance indicators (y: 600-550)
// - Middle-bottom: Schedule (y: 500-400)
// - Bottom: Notes (y: 400-300)
//
// To adjust: Open your PDF template, measure actual positions, and update these values
const DEFAULT_FIELDS: TemplateFields = {
  // ============================================
  // SCHOOL INFORMATION (Top Section)
  // ============================================
  schoolName: { x: 297, y: 800, fontSize: 16, font: 'bold' },      // اسم المدرسة (وسط الصفحة)
  ministry: { x: 297, y: 780, fontSize: 12, font: 'regular' },     // الوزارة (وسط الصفحة)
  region: { x: 297, y: 760, fontSize: 12, font: 'regular' },       // الإدارة التعليمية (وسط الصفحة)
  
  // ============================================
  // STUDENT INFORMATION (Top-Left Section)
  // ============================================
  studentName: { x: 80, y: 720, fontSize: 14, font: 'bold' },       // اسم الطالب
  studentClass: { x: 80, y: 700, fontSize: 12, font: 'regular' },   // الفصل
  studentId: { x: 80, y: 680, fontSize: 11, font: 'regular' },     // رقم الملف
  parentPhone: { x: 80, y: 660, fontSize: 11, font: 'regular' },   // جوال ولي الأمر
  
  // ============================================
  // DATE INFORMATION (Top-Right Section)
  // ============================================
  reportDate: { x: 450, y: 720, fontSize: 12, font: 'regular' },   // تاريخ التقرير
  dayName: { x: 450, y: 700, fontSize: 11, font: 'regular' },       // اسم اليوم
  schoolPhone: { x: 450, y: 680, fontSize: 11, font: 'regular' },   // رقم واتساب المدرسة
  
  // ============================================
  // PERFORMANCE INDICATORS (Middle Section)
  // ============================================
  // Assuming a table or grid layout
  attendance: { x: 100, y: 580, fontSize: 12, font: 'regular' },   // الحضور
  participation: { x: 200, y: 580, fontSize: 12, font: 'regular' }, // المشاركة
  homework: { x: 300, y: 580, fontSize: 12, font: 'regular' },     // الواجبات
  behavior: { x: 400, y: 580, fontSize: 12, font: 'regular' },      // السلوك
  
  // ============================================
  // SCHEDULE (Middle-Bottom Section)
  // ============================================
  // If schedule is displayed as a list, uncomment and adjust:
  schedule: [
    { x: 80, y: 500, fontSize: 10, font: 'regular' },  // الحصة 1
    { x: 80, y: 480, fontSize: 10, font: 'regular' },  // الحصة 2
    { x: 80, y: 460, fontSize: 10, font: 'regular' },  // الحصة 3
    { x: 80, y: 440, fontSize: 10, font: 'regular' },  // الحصة 4
    { x: 80, y: 420, fontSize: 10, font: 'regular' },  // الحصة 5
    { x: 80, y: 400, fontSize: 10, font: 'regular' },  // الحصة 6
    { x: 80, y: 380, fontSize: 10, font: 'regular' },  // الحصة 7
  ],
  
  // ============================================
  // NOTES (Bottom Section)
  // ============================================
  notes: { x: 80, y: 300, fontSize: 11, font: 'regular', width: 435 }, // الملاحظات (عرض كامل تقريباً)
};

/**
 * Load the PDF template
 */
async function loadTemplate(): Promise<PDFDocument> {
  try {
    const response = await fetch(TEMPLATE_PATH);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`);
    }
    const templateBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(templateBytes);
    return pdfDoc;
  } catch (error) {
    console.error('Error loading PDF template:', error);
    throw new Error('فشل في تحميل قالب التقرير. تأكد من وجود الملف في public/templates/pdf/');
  }
}

/**
 * Check if text contains Arabic characters
 */
function containsArabic(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
}

/**
 * Draw text on PDF page with field configuration
 * Uses image embedding for Arabic text since pdf-lib doesn't support Arabic fonts
 */
async function drawField(
  page: PDFPage,
  text: string,
  field: FieldPosition,
  regularFont: PDFFont,
  boldFont: PDFFont,
  pageHeight: number
): Promise<void> {
  if (!field || !text) return;
  
  const fontSize = field.fontSize || 12;
  const isBold = field.font === 'bold';
  
  // Check if text contains Arabic characters
  if (containsArabic(text)) {
    // Use image embedding for Arabic text
    await drawArabicText(page, text, field.x, field.y, fontSize, isBold, pageHeight);
  } else {
    // Use regular text drawing for non-Arabic text
    const font = isBold ? boldFont : regularFont;
    const color = field.color ? rgb(field.color.r, field.color.g, field.color.b) : rgb(0, 0, 0);
    const y = pageHeight - field.y;
    
    try {
      page.drawText(text, {
        x: field.x,
        y: y,
        size: fontSize,
        font: font,
        color: color,
        maxWidth: field.width,
      });
    } catch (error) {
      console.warn(`Error drawing field "${text}":`, error);
    }
  }
}

/**
 * Fill PDF template with student data
 */
export async function generatePDFReport(
  student: Student,
  record: DailyRecord,
  settings: SchoolSettings,
  schedule: ScheduleItem[],
  customFields?: Partial<TemplateFields>
): Promise<Uint8Array> {
  try {
    // Validate inputs
    if (!student || !student.name) {
      throw new Error('Student data is missing or invalid');
    }
    if (!record) {
      throw new Error('Record data is missing');
    }
    // Settings can be empty object, but we need at least an object
    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings data is missing');
    }
    // Schedule can be empty array, but must be an array
    if (!Array.isArray(schedule)) {
      throw new Error('Schedule data is missing or invalid');
    }

    // Load template
    const pdfDoc = await loadTemplate();
    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      throw new Error('PDF template has no pages');
    }
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Load fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Merge custom fields with defaults
    const fields: TemplateFields = { ...DEFAULT_FIELDS, ...customFields };

    // Ensure settings has default values if missing
    const safeSettings: SchoolSettings = {
      name: settings.name || 'المدرسة',
      ministry: settings.ministry || 'وزارة التعليم',
      region: settings.region || 'الإدارة العامة للتعليم',
      slogan: settings.slogan || '',
      logoUrl: settings.logoUrl || '',
      whatsappPhone: settings.whatsappPhone || '',
      reportGeneralMessage: settings.reportGeneralMessage || '',
      reportLink: settings.reportLink || '',
      academicYear: settings.academicYear || '',
      ...settings
    };

    // Date formatting
    const today = new Date();
    const dateStr = today.toLocaleDateString('ar-SA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const dayName = today.toLocaleDateString('ar-SA', { weekday: 'long' });

    // Helper function to get status text
    const getStatusText = (status: string, type: 'attendance' | 'academic'): string => {
      if (type === 'attendance') {
        switch(status) {
          case 'present': return 'حاضر';
          case 'excused': return 'مستأذن';
          case 'absent': return 'غائب';
          default: return '-';
        }
      } else {
        return getStatusLabel(status);
      }
    };

    // Fill in fields (all async to support Arabic text)
    if (fields.studentName) {
      await drawField(firstPage, student.name, fields.studentName, helveticaFont, helveticaBoldFont, height);
    }
    
    if (fields.studentClass) {
      await drawField(firstPage, student.classGrade || '', fields.studentClass, helveticaFont, helveticaBoldFont, height);
    }
    
    if (fields.studentId) {
      await drawField(firstPage, student.id, fields.studentId, helveticaFont, helveticaBoldFont, height);
    }
    
    if (fields.parentPhone) {
      await drawField(firstPage, student.parentPhone || '', fields.parentPhone, helveticaFont, helveticaBoldFont, height);
    }
    
    if (fields.reportDate) {
      await drawField(firstPage, dateStr, fields.reportDate, helveticaFont, helveticaBoldFont, height);
    }
    
    if (fields.dayName) {
      await drawField(firstPage, dayName, fields.dayName, helveticaFont, helveticaBoldFont, height);
    }
    
    if (fields.schoolName) {
      await drawField(firstPage, safeSettings.name || '', fields.schoolName, helveticaFont, helveticaBoldFont, height);
    }
    
    if (fields.ministry) {
      await drawField(firstPage, safeSettings.ministry || '', fields.ministry, helveticaFont, helveticaBoldFont, height);
    }
    
    if (fields.region) {
      await drawField(firstPage, safeSettings.region || '', fields.region, helveticaFont, helveticaBoldFont, height);
    }
    
    if (fields.schoolPhone && safeSettings.whatsappPhone) {
      await drawField(firstPage, safeSettings.whatsappPhone, fields.schoolPhone, helveticaFont, helveticaBoldFont, height);
    }
    
    if (fields.attendance) {
      await drawField(firstPage, getStatusText(record.attendance, 'attendance'), fields.attendance, helveticaFont, helveticaBoldFont, height);
    }
    
    if (fields.participation) {
      await drawField(firstPage, getStatusText(record.participation, 'academic'), fields.participation, helveticaFont, helveticaBoldFont, height);
    }
    
    if (fields.homework) {
      await drawField(firstPage, getStatusText(record.homework, 'academic'), fields.homework, helveticaFont, helveticaBoldFont, height);
    }
    
    if (fields.behavior) {
      await drawField(firstPage, getStatusText(record.behavior, 'academic'), fields.behavior, helveticaFont, helveticaBoldFont, height);
    }
    
    if (fields.notes) {
      await drawField(firstPage, record.notes || '', fields.notes, helveticaFont, helveticaBoldFont, height);
    }
    
    // Schedule (if multiple positions)
    if (fields.schedule && fields.schedule.length > 0) {
      const dailySchedule = schedule.filter(s => s.day === dayName).sort((a, b) => a.period - b.period);
      for (let index = 0; index < dailySchedule.length; index++) {
        const session = dailySchedule[index];
        if (fields.schedule && fields.schedule[index]) {
          const scheduleText = `${session.period} - ${session.subject} (${session.classRoom})`;
          await drawField(firstPage, scheduleText, fields.schedule[index], helveticaFont, helveticaBoldFont, height);
        }
      }
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Download PDF report
 */
export async function downloadPDFReport(
  student: Student,
  record: DailyRecord,
  settings: SchoolSettings,
  schedule: ScheduleItem[],
  customFields?: Partial<TemplateFields>
): Promise<void> {
  try {
    const pdfBytes = await generatePDFReport(student, record, settings, schedule, customFields);
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `تقرير_${student.name}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
}
