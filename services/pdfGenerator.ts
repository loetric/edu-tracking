import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import { Student, DailyRecord, SchoolSettings, ScheduleItem } from '../types';

/**
 * Convert Arabic text to image using Canvas
 * This is needed because pdf-lib doesn't support Arabic fonts by default
 */
async function textToImage(
  text: string, 
  fontSize: number = 12, 
  isBold: boolean = false,
  textColor: string = '#000000'
): Promise<Uint8Array> {
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
      const fontFamily = 'Arial, "Segoe UI", "Tahoma", "Arabic Typesetting", "Noto Sans Arabic", sans-serif';
      const fontWeight = isBold ? 'bold' : 'normal';
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillStyle = textColor;

      // Measure text
      const metrics = ctx.measureText(text);
      const textWidth = Math.max(metrics.width, 10);
      const textHeight = fontSize * 1.5;

      // Set canvas size with padding
      canvas.width = Math.ceil(textWidth) + 20;
      canvas.height = Math.ceil(textHeight) + 10;

      // Clear and redraw with correct size
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillStyle = textColor;

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
  pageHeight: number,
  textColor: string = '#000000'
): Promise<void> {
  try {
    const imageBytes = await textToImage(text, fontSize, isBold, textColor);
    const image = await page.doc.embedPng(imageBytes);
    const pdfY = pageHeight - y;
    
    page.drawImage(image, {
      x: x,
      y: pdfY - image.height * 0.75,
      width: image.width,
      height: image.height,
    });
  } catch (error) {
    console.warn(`Error drawing Arabic text "${text}":`, error);
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
 * Draw a colored rectangle
 */
function drawRectangle(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  backgroundColor: { r: number; g: number; b: number },
  pageHeight: number,
  borderColor?: { r: number; g: number; b: number },
  borderRadius?: number
): void {
  const pdfY = pageHeight - y;
  
  // Draw background rectangle
  page.drawRectangle({
    x: x,
    y: pdfY - height,
    width: width,
    height: height,
    color: rgb(backgroundColor.r, backgroundColor.g, backgroundColor.b),
    borderColor: borderColor ? rgb(borderColor.r, borderColor.g, borderColor.b) : undefined,
    borderWidth: borderColor ? 1.5 : 0,
  });
}

/**
 * Draw text on PDF page
 */
async function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  isBold: boolean,
  pageHeight: number,
  textColor: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 },
  regularFont: PDFFont,
  boldFont: PDFFont
): Promise<void> {
  if (!text) return;
  
  const color = rgb(textColor.r, textColor.g, textColor.b);
  
  if (containsArabic(text)) {
    const colorStr = `rgb(${Math.round(textColor.r * 255)}, ${Math.round(textColor.g * 255)}, ${Math.round(textColor.b * 255)})`;
    await drawArabicText(page, text, x, y, fontSize, isBold, pageHeight, colorStr);
  } else {
    const font = isBold ? boldFont : regularFont;
    const pdfY = pageHeight - y;
    
    try {
      page.drawText(text, {
        x: x,
        y: pdfY - fontSize,
        size: fontSize,
        font: font,
        color: color,
      });
    } catch (error) {
      console.warn(`Error drawing text "${text}":`, error);
    }
  }
}

/**
 * Get status text in Arabic
 */
function getStatusText(status: string, type: 'attendance' | 'academic'): string {
  if (type === 'attendance') {
    switch(status) {
      case 'present': return 'حاضر';
      case 'excused': return 'مستأذن';
      case 'absent': return 'غائب';
      default: return '-';
    }
  } else {
    switch(status) {
      case 'excellent': return 'متميز';
      case 'good': return 'جيد';
      case 'average': return 'متوسط';
      case 'poor': return 'ضعيف';
      default: return '-';
    }
  }
}

/**
 * Get status colors
 */
function getStatusColors(status: string, type: 'attendance' | 'academic') {
  if (type === 'attendance') {
    switch(status) {
      case 'present': 
        return {
          bg: { r: 0.95, g: 0.98, b: 0.95 },
          border: { r: 0.8, g: 0.9, b: 0.8 },
          text: { r: 0.2, g: 0.5, b: 0.2 }
        };
      case 'excused': 
        return {
          bg: { r: 1.0, g: 0.98, b: 0.9 },
          border: { r: 0.95, g: 0.85, b: 0.7 },
          text: { r: 0.7, g: 0.5, b: 0.1 }
        };
      case 'absent': 
        return {
          bg: { r: 1.0, g: 0.95, b: 0.95 },
          border: { r: 0.9, g: 0.7, b: 0.7 },
          text: { r: 0.7, g: 0.2, b: 0.2 }
        };
      default: 
        return {
          bg: { r: 0.95, g: 0.95, b: 0.95 },
          border: { r: 0.8, g: 0.8, b: 0.8 },
          text: { r: 0.4, g: 0.4, b: 0.4 }
        };
    }
  } else {
    switch(status) {
      case 'excellent': 
        return {
          bg: { r: 0.9, g: 0.98, b: 0.98 },
          border: { r: 0.7, g: 0.9, b: 0.9 },
          text: { r: 0.1, g: 0.5, b: 0.5 }
        };
      case 'good': 
        return {
          bg: { r: 0.9, g: 0.95, b: 1.0 },
          border: { r: 0.7, g: 0.85, b: 0.95 },
          text: { r: 0.1, g: 0.4, b: 0.7 }
        };
      case 'average': 
        return {
          bg: { r: 1.0, g: 0.98, b: 0.9 },
          border: { r: 0.95, g: 0.85, b: 0.7 },
          text: { r: 0.7, g: 0.5, b: 0.1 }
        };
      case 'poor': 
        return {
          bg: { r: 1.0, g: 0.95, b: 0.95 },
          border: { r: 0.9, g: 0.7, b: 0.7 },
          text: { r: 0.7, g: 0.2, b: 0.2 }
        };
      default: 
        return {
          bg: { r: 0.95, g: 0.95, b: 0.95 },
          border: { r: 0.8, g: 0.8, b: 0.8 },
          text: { r: 0.4, g: 0.4, b: 0.4 }
        };
    }
  }
}

/**
 * Generate a modern PDF report from scratch
 */
export async function generatePDFReport(
  student: Student,
  record: DailyRecord,
  settings: SchoolSettings,
  schedule: ScheduleItem[]
): Promise<Uint8Array> {
  try {
    // Validate inputs
    if (!student || !student.name) {
      throw new Error('Student data is missing or invalid');
    }
    if (!record) {
      throw new Error('Record data is missing');
    }
    if (!settings) {
      throw new Error('Settings data is missing');
    }
    if (!Array.isArray(schedule)) {
      throw new Error('Schedule data is missing or invalid');
    }

    // Create new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // A4 size: 595 x 842 points
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();

    // Load fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Safe settings with defaults
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
    const reportDate = record.date ? new Date(record.date) : new Date();
    const dateStr = reportDate.toLocaleDateString('ar-SA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const dayName = reportDate.toLocaleDateString('ar-SA', { weekday: 'long' });

    // Colors
    const primaryColor = { r: 0.1, g: 0.4, b: 0.5 }; // Teal-800
    const secondaryColor = { r: 0.2, g: 0.2, b: 0.2 }; // Gray-900
    const lightGray = { r: 0.95, g: 0.95, b: 0.95 };
    const borderGray = { r: 0.8, g: 0.8, b: 0.8 };

    // ============================================
    // HEADER SECTION
    // ============================================
    // Top border line
    page.drawLine({
      start: { x: 50, y: height - 30 },
      end: { x: width - 50, y: height - 30 },
      thickness: 2,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });

    // Ministry (top right)
    await drawText(page, safeSettings.ministry, width - 60, height - 50, 10, false, height, 
      { r: 0.4, g: 0.4, b: 0.4 }, helveticaFont, helveticaBoldFont);

    // Region (below ministry)
    await drawText(page, safeSettings.region, width - 60, height - 65, 10, false, height,
      { r: 0.4, g: 0.4, b: 0.4 }, helveticaFont, helveticaBoldFont);

    // School name (center, large and bold)
    await drawText(page, safeSettings.name, width / 2, height - 50, 18, true, height,
      primaryColor, helveticaFont, helveticaBoldFont);

    // Report title (center, below school name)
    await drawText(page, 'تقرير متابعة يومي', width / 2, height - 80, 16, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont);

    // Date (top left)
    await drawText(page, `تاريخ التقرير: ${dateStr}`, 60, height - 50, 11, false, height,
      { r: 0.3, g: 0.3, b: 0.3 }, helveticaFont, helveticaBoldFont);
    await drawText(page, `اليوم: ${dayName}`, 60, height - 65, 10, false, height,
      { r: 0.4, g: 0.4, b: 0.4 }, helveticaFont, helveticaBoldFont);

    // Academic year (if available)
    if (safeSettings.academicYear) {
      await drawText(page, `العام الدراسي: ${safeSettings.academicYear}`, 60, height - 80, 10, false, height,
        { r: 0.4, g: 0.4, b: 0.4 }, helveticaFont, helveticaBoldFont);
    }

    // ============================================
    // STUDENT INFORMATION SECTION
    // ============================================
    const studentSectionY = height - 120;
    
    // Section title
    await drawText(page, 'معلومات الطالب', width / 2, studentSectionY, 14, true, height,
      primaryColor, helveticaFont, helveticaBoldFont);

    // Student info box
    const studentBoxY = studentSectionY - 30;
    const studentBoxHeight = 80;
    
    // Background box
    drawRectangle(page, 50, studentBoxY, width - 100, studentBoxHeight, 
      { r: 0.98, g: 0.98, b: 0.98 }, height, borderGray);

    // Student name
    await drawText(page, `الاسم: ${student.name}`, width - 70, studentBoxY + 50, 13, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont);

    // Class
    await drawText(page, `الفصل: ${student.classGrade || 'غير محدد'}`, width - 70, studentBoxY + 30, 11, false, height,
      { r: 0.3, g: 0.3, b: 0.3 }, helveticaFont, helveticaBoldFont);

    // Student ID
    await drawText(page, `رقم الملف: ${student.id}`, width - 70, studentBoxY + 10, 10, false, height,
      { r: 0.4, g: 0.4, b: 0.4 }, helveticaFont, helveticaBoldFont);

    // Parent phone (left side)
    await drawText(page, `جوال ولي الأمر: ${student.parentPhone || 'غير متوفر'}`, 70, studentBoxY + 50, 11, false, height,
      { r: 0.3, g: 0.3, b: 0.3 }, helveticaFont, helveticaBoldFont);

    // School WhatsApp (if available)
    if (safeSettings.whatsappPhone) {
      await drawText(page, `واتساب المدرسة: ${safeSettings.whatsappPhone}`, 70, studentBoxY + 30, 10, false, height,
        { r: 0.4, g: 0.4, b: 0.4 }, helveticaFont, helveticaBoldFont);
    }

    // Status badge
    await drawText(page, 'معتمد من المدرسة', 70, studentBoxY + 10, 10, true, height,
      primaryColor, helveticaFont, helveticaBoldFont);

    // ============================================
    // PERFORMANCE INDICATORS SECTION
    // ============================================
    const performanceSectionY = studentBoxY - studentBoxHeight - 30;
    
    // Section title
    await drawText(page, 'ملخص الأداء والمستوى اليومي', width / 2, performanceSectionY, 14, true, height,
      primaryColor, helveticaFont, helveticaBoldFont);

    // Performance cards
    const cardY = performanceSectionY - 35;
    const cardWidth = 110;
    const cardHeight = 50;
    const cardSpacing = 15;
    const startX = width - 60;

    // Attendance card
    const attendanceColors = getStatusColors(record.attendance, 'attendance');
    drawRectangle(page, startX - cardWidth, cardY, cardWidth, cardHeight,
      attendanceColors.bg, height, attendanceColors.border);
    await drawText(page, 'الحضور', startX - cardWidth / 2, cardY + 35, 9, false, height,
      { r: 0.4, g: 0.4, b: 0.4 }, helveticaFont, helveticaBoldFont);
    await drawText(page, getStatusText(record.attendance, 'attendance'), 
      startX - cardWidth / 2, cardY + 15, 12, true, height, attendanceColors.text, helveticaFont, helveticaBoldFont);

    // Participation card
    const participationColors = getStatusColors(record.participation, 'academic');
    drawRectangle(page, startX - cardWidth * 2 - cardSpacing, cardY, cardWidth, cardHeight,
      participationColors.bg, height, participationColors.border);
    await drawText(page, 'المشاركة', startX - cardWidth * 1.5 - cardSpacing, cardY + 35, 9, false, height,
      { r: 0.4, g: 0.4, b: 0.4 }, helveticaFont, helveticaBoldFont);
    await drawText(page, getStatusText(record.participation, 'academic'),
      startX - cardWidth * 1.5 - cardSpacing, cardY + 15, 12, true, height, participationColors.text, helveticaFont, helveticaBoldFont);

    // Homework card
    const homeworkColors = getStatusColors(record.homework, 'academic');
    drawRectangle(page, startX - cardWidth * 3 - cardSpacing * 2, cardY, cardWidth, cardHeight,
      homeworkColors.bg, height, homeworkColors.border);
    await drawText(page, 'الواجبات', startX - cardWidth * 2.5 - cardSpacing * 2, cardY + 35, 9, false, height,
      { r: 0.4, g: 0.4, b: 0.4 }, helveticaFont, helveticaBoldFont);
    await drawText(page, getStatusText(record.homework, 'academic'),
      startX - cardWidth * 2.5 - cardSpacing * 2, cardY + 15, 12, true, height, homeworkColors.text, helveticaFont, helveticaBoldFont);

    // Behavior card
    const behaviorColors = getStatusColors(record.behavior, 'academic');
    drawRectangle(page, startX - cardWidth * 4 - cardSpacing * 3, cardY, cardWidth, cardHeight,
      behaviorColors.bg, height, behaviorColors.border);
    await drawText(page, 'السلوك', startX - cardWidth * 3.5 - cardSpacing * 3, cardY + 35, 9, false, height,
      { r: 0.4, g: 0.4, b: 0.4 }, helveticaFont, helveticaBoldFont);
    await drawText(page, getStatusText(record.behavior, 'academic'),
      startX - cardWidth * 3.5 - cardSpacing * 3, cardY + 15, 12, true, height, behaviorColors.text, helveticaFont, helveticaBoldFont);

    // ============================================
    // SCHEDULE SECTION
    // ============================================
    const scheduleSectionY = cardY - cardHeight - 30;
    
    // Section title
    await drawText(page, 'كشف المتابعة والحصص الدراسية', width / 2, scheduleSectionY, 14, true, height,
      primaryColor, helveticaFont, helveticaBoldFont);

    // Filter schedule for the day
    const dailySchedule = schedule.filter(s => s.day === dayName).sort((a, b) => a.period - b.period);

    if (dailySchedule.length > 0) {
      const tableY = scheduleSectionY - 30;
      const rowHeight = 25;
      const headerHeight = 30;
      
      // Table header background
      drawRectangle(page, 50, tableY - headerHeight, width - 100, headerHeight,
        { r: 0.9, g: 0.9, b: 0.9 }, height, borderGray);

      // Header text
      await drawText(page, 'م', width - 70, tableY - 20, 10, true, height,
        secondaryColor, helveticaFont, helveticaBoldFont);
      await drawText(page, 'المادة', width - 120, tableY - 20, 10, true, height,
        secondaryColor, helveticaFont, helveticaBoldFont);
      await drawText(page, 'المعلم', width - 250, tableY - 20, 10, true, height,
        secondaryColor, helveticaFont, helveticaBoldFont);
      await drawText(page, 'الفصل', width - 380, tableY - 20, 10, true, height,
        secondaryColor, helveticaFont, helveticaBoldFont);

      // Table rows
      for (let i = 0; i < Math.min(dailySchedule.length, 7); i++) {
        const session = dailySchedule[i];
        const rowY = tableY - headerHeight - (i + 1) * rowHeight;
        
        // Row background (alternating)
        if (i % 2 === 0) {
          drawRectangle(page, 50, rowY, width - 100, rowHeight,
            { r: 1.0, g: 1.0, b: 1.0 }, height, borderGray);
        } else {
          drawRectangle(page, 50, rowY, width - 100, rowHeight,
            { r: 0.98, g: 0.98, b: 0.98 }, height, borderGray);
        }

        // Period number
        await drawText(page, String(session.period), width - 70, rowY + 15, 10, false, height,
          { r: 0.3, g: 0.3, b: 0.3 }, helveticaFont, helveticaBoldFont);
        
        // Subject
        await drawText(page, session.subject || '-', width - 120, rowY + 15, 10, false, height,
          { r: 0.2, g: 0.2, b: 0.2 }, helveticaFont, helveticaBoldFont);
        
        // Teacher
        await drawText(page, session.teacher || '-', width - 250, rowY + 15, 10, false, height,
          { r: 0.3, g: 0.3, b: 0.3 }, helveticaFont, helveticaBoldFont);
        
        // Classroom
        await drawText(page, session.classRoom || '-', width - 380, rowY + 15, 10, false, height,
          { r: 0.3, g: 0.3, b: 0.3 }, helveticaFont, helveticaBoldFont);
      }
    }

    // ============================================
    // NOTES SECTION
    // ============================================
    const notesY = scheduleSectionY - (dailySchedule.length > 0 ? 200 : 50);
    
    // Section title
    await drawText(page, 'ملاحظات', width / 2, notesY, 14, true, height,
      primaryColor, helveticaFont, helveticaBoldFont);

    // Notes box
    const notesBoxY = notesY - 30;
    const notesBoxHeight = 60;
    
    drawRectangle(page, 50, notesBoxY, width - 100, notesBoxHeight,
      { r: 0.98, g: 0.98, b: 0.98 }, height, borderGray);

    if (record.notes) {
      await drawText(page, record.notes, width - 70, notesBoxY + 40, 11, false, height,
        { r: 0.2, g: 0.2, b: 0.2 }, helveticaFont, helveticaBoldFont);
    } else {
      await drawText(page, 'لا توجد ملاحظات', width - 70, notesBoxY + 40, 11, false, height,
        { r: 0.5, g: 0.5, b: 0.5 }, helveticaFont, helveticaBoldFont);
    }

    // ============================================
    // GENERAL MESSAGE SECTION (if available)
    // ============================================
    if (safeSettings.reportGeneralMessage) {
      const messageY = notesBoxY - notesBoxHeight - 20;
      
      await drawText(page, 'رسالة الموجه', width / 2, messageY, 12, true, height,
        primaryColor, helveticaFont, helveticaBoldFont);

      const messageBoxY = messageY - 25;
      const messageBoxHeight = 40;
      
      drawRectangle(page, 50, messageBoxY, width - 100, messageBoxHeight,
        { r: 0.95, g: 0.97, b: 1.0 }, height, { r: 0.7, g: 0.85, b: 0.95 });

      await drawText(page, safeSettings.reportGeneralMessage, width - 70, messageBoxY + 25, 10, false, height,
        { r: 0.1, g: 0.4, b: 0.7 }, helveticaFont, helveticaBoldFont);
    }

    // ============================================
    // FOOTER
    // ============================================
    const footerY = 50;
    
    // Footer line
    page.drawLine({
      start: { x: 50, y: footerY + 20 },
      end: { x: width - 50, y: footerY + 20 },
      thickness: 1,
      color: rgb(borderGray.r, borderGray.g, borderGray.b),
    });

    // Footer text
    await drawText(page, 'هذا التقرير معتمد من المدرسة', width / 2, footerY, 9, false, height,
      { r: 0.4, g: 0.4, b: 0.4 }, helveticaFont, helveticaBoldFont);

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
  schedule: ScheduleItem[]
): Promise<void> {
  try {
    const pdfBytes = await generatePDFReport(student, record, settings, schedule);
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
