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
  textColor: string = '#000000',
  width?: number
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
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;

      // Measure text
      const metrics = ctx.measureText(text);
      const textWidth = width || Math.max(metrics.width, 10);
      const textHeight = fontSize * 1.5;

      // Set canvas size with padding
      canvas.width = Math.ceil(textWidth) + 30;
      canvas.height = Math.ceil(textHeight) + 20;

      // Clear and redraw with correct size
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;

      // Draw text centered
      ctx.fillText(text, canvas.width - 15, canvas.height / 2);

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
  textColor: string = '#000000',
  width?: number,
  align: 'right' | 'center' | 'left' = 'right'
): Promise<void> {
  try {
    const imageBytes = await textToImage(text, fontSize, isBold, textColor, width);
    const image = await page.doc.embedPng(imageBytes);
    const pdfY = pageHeight - y;
    
    // Calculate x position based on alignment
    let xPos = x;
    if (align === 'center' && width) {
      xPos = x + (width - image.width) / 2;
    } else if (align === 'right' && width) {
      xPos = x + width - image.width;
    }
    
    page.drawImage(image, {
      x: xPos,
      y: pdfY - image.height / 2,
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
 * Draw a colored rectangle with rounded corners effect
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
  borderWidth: number = 1.5
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
    borderWidth: borderColor ? borderWidth : 0,
  });
}

/**
 * Draw text on PDF page with proper alignment
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
  boldFont: PDFFont,
  width?: number,
  align: 'right' | 'center' | 'left' = 'right'
): Promise<void> {
  if (!text) return;
  
  const color = rgb(textColor.r, textColor.g, textColor.b);
  
  if (containsArabic(text)) {
    const colorStr = `rgb(${Math.round(textColor.r * 255)}, ${Math.round(textColor.g * 255)}, ${Math.round(textColor.b * 255)})`;
    await drawArabicText(page, text, x, y, fontSize, isBold, pageHeight, colorStr, width, align);
  } else {
    const font = isBold ? boldFont : regularFont;
    const pdfY = pageHeight - y;
    
    // Calculate x position based on alignment
    let xPos = x;
    if (align === 'center' && width) {
      xPos = x + width / 2;
    } else if (align === 'right' && width) {
      xPos = x + width;
    }
    
    try {
      page.drawText(text, {
        x: xPos,
        y: pdfY,
        size: fontSize,
        font: font,
        color: color,
        maxWidth: width,
      });
    } catch (error) {
      console.warn(`Error drawing text "${text}":`, error);
    }
  }
}

/**
 * Load and embed image from URL
 */
async function loadImage(pdfDoc: PDFDocument, imageUrl: string): Promise<any> {
  try {
    if (!imageUrl) return null;
    
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    const imageBytes = new Uint8Array(arrayBuffer);
    
    // Try to determine image type
    if (imageUrl.toLowerCase().endsWith('.png')) {
      return await pdfDoc.embedPng(imageBytes);
    } else if (imageUrl.toLowerCase().endsWith('.jpg') || imageUrl.toLowerCase().endsWith('.jpeg')) {
      return await pdfDoc.embedJpg(imageBytes);
    } else {
      // Try PNG first, then JPG
      try {
        return await pdfDoc.embedPng(imageBytes);
      } catch {
        return await pdfDoc.embedJpg(imageBytes);
      }
    }
  } catch (error) {
    console.warn('Error loading image:', error);
    return null;
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
          border: { r: 0.2, g: 0.6, b: 0.3 },
          text: { r: 0.1, g: 0.5, b: 0.2 }
        };
      case 'excused': 
        return {
          bg: { r: 1.0, g: 0.98, b: 0.9 },
          border: { r: 0.8, g: 0.6, b: 0.2 },
          text: { r: 0.7, g: 0.5, b: 0.1 }
        };
      case 'absent': 
        return {
          bg: { r: 1.0, g: 0.95, b: 0.95 },
          border: { r: 0.8, g: 0.3, b: 0.3 },
          text: { r: 0.7, g: 0.2, b: 0.2 }
        };
      default: 
        return {
          bg: { r: 0.95, g: 0.95, b: 0.95 },
          border: { r: 0.6, g: 0.6, b: 0.6 },
          text: { r: 0.4, g: 0.4, b: 0.4 }
        };
    }
  } else {
    switch(status) {
      case 'excellent': 
        return {
          bg: { r: 0.9, g: 0.98, b: 0.98 },
          border: { r: 0.1, g: 0.6, b: 0.6 },
          text: { r: 0.05, g: 0.5, b: 0.5 }
        };
      case 'good': 
        return {
          bg: { r: 0.9, g: 0.95, b: 1.0 },
          border: { r: 0.1, g: 0.5, b: 0.8 },
          text: { r: 0.05, g: 0.4, b: 0.7 }
        };
      case 'average': 
        return {
          bg: { r: 1.0, g: 0.98, b: 0.9 },
          border: { r: 0.8, g: 0.6, b: 0.2 },
          text: { r: 0.7, g: 0.5, b: 0.1 }
        };
      case 'poor': 
        return {
          bg: { r: 1.0, g: 0.95, b: 0.95 },
          border: { r: 0.8, g: 0.3, b: 0.3 },
          text: { r: 0.7, g: 0.2, b: 0.2 }
        };
      default: 
        return {
          bg: { r: 0.95, g: 0.95, b: 0.95 },
          border: { r: 0.6, g: 0.6, b: 0.6 },
          text: { r: 0.4, g: 0.4, b: 0.4 }
        };
    }
  }
}

/**
 * Generate a professional PDF report from scratch
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

    // Colors - Professional palette
    const primaryColor = { r: 0.05, g: 0.4, b: 0.5 }; // Teal-800
    const secondaryColor = { r: 0.15, g: 0.15, b: 0.15 }; // Gray-900
    const accentColor = { r: 0.1, g: 0.6, b: 0.7 }; // Teal-600
    const lightGray = { r: 0.96, g: 0.96, b: 0.96 };
    const borderGray = { r: 0.75, g: 0.75, b: 0.75 };
    const textGray = { r: 0.3, g: 0.3, b: 0.3 };

    // ============================================
    // HEADER SECTION - Professional Design
    // ============================================
    const headerY = height - 20;
    const headerHeight = 110;
    
    // Header background with gradient effect
    drawRectangle(page, 0, headerY, width, headerHeight,
      { r: 0.98, g: 0.99, b: 1.0 }, height);
    
    // Top decorative line
    page.drawLine({
      start: { x: 0, y: headerY },
      end: { x: width, y: headerY },
      thickness: 4,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });

    // Bottom border of header
    page.drawLine({
      start: { x: 50, y: headerY - headerHeight },
      end: { x: width - 50, y: headerY - headerHeight },
      thickness: 1.5,
      color: rgb(borderGray.r, borderGray.g, borderGray.b),
    });

    // Load and draw logo (center)
    if (safeSettings.logoUrl) {
      try {
        const logo = await loadImage(pdfDoc, safeSettings.logoUrl);
        if (logo) {
          const logoSize = 50;
          const logoX = width / 2 - logoSize / 2;
          const logoY = headerY - 30;
          page.drawImage(logo, {
            x: logoX,
            y: height - logoY - logoSize,
            width: logoSize,
            height: logoSize,
          });
        }
      } catch (error) {
        console.warn('Could not load logo:', error);
      }
    }

    // Kingdom of Saudi Arabia (top right)
    await drawText(page, 'المملكة العربية السعودية', width - 60, headerY - 25, 9, true, height,
      textGray, helveticaFont, helveticaBoldFont);

    // Ministry (right side)
    await drawText(page, safeSettings.ministry, width - 60, headerY - 40, 10, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont);

    // Region (right side, below ministry)
    await drawText(page, safeSettings.region, width - 60, headerY - 55, 9, false, height,
      textGray, helveticaFont, helveticaBoldFont);

    // School name (center, large and prominent)
    await drawText(page, safeSettings.name, width / 2, headerY - 50, 20, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');

    // Report title (center, below school name)
    await drawText(page, 'تقرير متابعة يومي', width / 2, headerY - 75, 16, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');

    // Date section (left side)
    await drawText(page, 'تاريخ التقرير', 60, headerY - 25, 9, false, height,
      textGray, helveticaFont, helveticaBoldFont);
    await drawText(page, dateStr, 60, headerY - 40, 11, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont);
    await drawText(page, dayName, 60, headerY - 55, 9, false, height,
      textGray, helveticaFont, helveticaBoldFont);

    // Academic year (if available)
    if (safeSettings.academicYear) {
      await drawText(page, `العام الدراسي: ${safeSettings.academicYear}`, 60, headerY - 70, 9, false, height,
        textGray, helveticaFont, helveticaBoldFont);
    }

    // School WhatsApp (if available, left side)
    if (safeSettings.whatsappPhone) {
      await drawText(page, `واتساب: ${safeSettings.whatsappPhone}`, 60, headerY - 85, 8, false, height,
        textGray, helveticaFont, helveticaBoldFont);
    }

    // ============================================
    // STUDENT INFORMATION SECTION
    // ============================================
    const studentSectionY = headerY - headerHeight - 25;
    
    // Section title with underline
    await drawText(page, 'معلومات الطالب', width / 2, studentSectionY, 15, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');
    
    // Underline for section title
    page.drawLine({
      start: { x: width / 2 - 60, y: studentSectionY - 5 },
      end: { x: width / 2 + 60, y: studentSectionY - 5 },
      thickness: 2,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });

    // Student info box
    const studentBoxY = studentSectionY - 25;
    const studentBoxHeight = 90;
    const studentBoxPadding = 15;
    
    // Background box with border
    drawRectangle(page, 50, studentBoxY, width - 100, studentBoxHeight,
      { r: 1.0, g: 1.0, b: 1.0 }, height, { r: 0.2, g: 0.2, b: 0.2 }, 2);

    // Inner light background
    drawRectangle(page, 52, studentBoxY - 2, width - 104, studentBoxHeight - 4,
      lightGray, height);

    // Student name (right side, top)
    await drawText(page, 'الاسم الرباعي:', width - 70, studentBoxY + 65, 10, false, height,
      textGray, helveticaFont, helveticaBoldFont);
    await drawText(page, student.name, width - 70, studentBoxY + 50, 13, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont);

    // Class (right side, middle)
    await drawText(page, 'الفصل:', width - 70, studentBoxY + 30, 10, false, height,
      textGray, helveticaFont, helveticaBoldFont);
    await drawText(page, student.classGrade || 'غير محدد', width - 70, studentBoxY + 15, 11, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont);

    // Student ID (right side, bottom)
    await drawText(page, 'رقم الملف:', width - 70, studentBoxY - 5, 10, false, height,
      textGray, helveticaFont, helveticaBoldFont);
    await drawText(page, student.id, width - 70, studentBoxY - 20, 10, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont);

    // Parent phone (left side, top)
    await drawText(page, 'جوال ولي الأمر:', 70, studentBoxY + 65, 10, false, height,
      textGray, helveticaFont, helveticaBoldFont);
    await drawText(page, student.parentPhone || 'غير متوفر', 70, studentBoxY + 50, 11, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont);

    // Status badge (left side, middle)
    const badgeY = studentBoxY + 25;
    const badgeWidth = 120;
    const badgeHeight = 25;
    drawRectangle(page, 70, badgeY, badgeWidth, badgeHeight,
      { r: 0.9, g: 0.98, b: 0.95 }, height, { r: 0.1, g: 0.5, b: 0.3 }, 1.5);
    await drawText(page, 'معتمد من المدرسة', 70 + badgeWidth / 2, badgeY + badgeHeight / 2, 9, true, height,
      { r: 0.05, g: 0.5, b: 0.3 }, helveticaFont, helveticaBoldFont, badgeWidth, 'center');

    // ============================================
    // PERFORMANCE INDICATORS SECTION
    // ============================================
    const performanceSectionY = studentBoxY - studentBoxHeight - 25;
    
    // Section title
    await drawText(page, 'ملخص الأداء والمستوى اليومي', width / 2, performanceSectionY, 15, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');
    
    // Underline
    page.drawLine({
      start: { x: width / 2 - 80, y: performanceSectionY - 5 },
      end: { x: width / 2 + 80, y: performanceSectionY - 5 },
      thickness: 2,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });

    // Performance cards
    const cardY = performanceSectionY - 30;
    const cardWidth = 115;
    const cardHeight = 60;
    const cardSpacing = 12;
    const totalCardsWidth = (cardWidth * 4) + (cardSpacing * 3);
    const startX = (width - totalCardsWidth) / 2 + totalCardsWidth;

    // Attendance card
    const attendanceColors = getStatusColors(record.attendance, 'attendance');
    drawRectangle(page, startX - cardWidth, cardY, cardWidth, cardHeight,
      attendanceColors.bg, height, attendanceColors.border, 2);
    await drawText(page, 'الحضور', startX - cardWidth / 2, cardY + 45, 9, false, height,
      textGray, helveticaFont, helveticaBoldFont, cardWidth, 'center');
    await drawText(page, getStatusText(record.attendance, 'attendance'),
      startX - cardWidth / 2, cardY + 25, 14, true, height, attendanceColors.text, helveticaFont, helveticaBoldFont, cardWidth, 'center');

    // Participation card
    const participationColors = getStatusColors(record.participation, 'academic');
    drawRectangle(page, startX - cardWidth * 2 - cardSpacing, cardY, cardWidth, cardHeight,
      participationColors.bg, height, participationColors.border, 2);
    await drawText(page, 'المشاركة', startX - cardWidth * 1.5 - cardSpacing, cardY + 45, 9, false, height,
      textGray, helveticaFont, helveticaBoldFont, cardWidth, 'center');
    await drawText(page, getStatusText(record.participation, 'academic'),
      startX - cardWidth * 1.5 - cardSpacing, cardY + 25, 14, true, height, participationColors.text, helveticaFont, helveticaBoldFont, cardWidth, 'center');

    // Homework card
    const homeworkColors = getStatusColors(record.homework, 'academic');
    drawRectangle(page, startX - cardWidth * 3 - cardSpacing * 2, cardY, cardWidth, cardHeight,
      homeworkColors.bg, height, homeworkColors.border, 2);
    await drawText(page, 'الواجبات', startX - cardWidth * 2.5 - cardSpacing * 2, cardY + 45, 9, false, height,
      textGray, helveticaFont, helveticaBoldFont, cardWidth, 'center');
    await drawText(page, getStatusText(record.homework, 'academic'),
      startX - cardWidth * 2.5 - cardSpacing * 2, cardY + 25, 14, true, height, homeworkColors.text, helveticaFont, helveticaBoldFont, cardWidth, 'center');

    // Behavior card
    const behaviorColors = getStatusColors(record.behavior, 'academic');
    drawRectangle(page, startX - cardWidth * 4 - cardSpacing * 3, cardY, cardWidth, cardHeight,
      behaviorColors.bg, height, behaviorColors.border, 2);
    await drawText(page, 'السلوك', startX - cardWidth * 3.5 - cardSpacing * 3, cardY + 45, 9, false, height,
      textGray, helveticaFont, helveticaBoldFont, cardWidth, 'center');
    await drawText(page, getStatusText(record.behavior, 'academic'),
      startX - cardWidth * 3.5 - cardSpacing * 3, cardY + 25, 14, true, height, behaviorColors.text, helveticaFont, helveticaBoldFont, cardWidth, 'center');

    // ============================================
    // SCHEDULE SECTION
    // ============================================
    const scheduleSectionY = cardY - cardHeight - 30;
    
    // Section title
    await drawText(page, 'كشف المتابعة والحصص الدراسية', width / 2, scheduleSectionY, 15, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');
    
    // Underline
    page.drawLine({
      start: { x: width / 2 - 100, y: scheduleSectionY - 5 },
      end: { x: width / 2 + 100, y: scheduleSectionY - 5 },
      thickness: 2,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });

    // Filter schedule for the day
    const dailySchedule = schedule.filter(s => s.day === dayName).sort((a, b) => a.period - b.period);

    if (dailySchedule.length > 0) {
      const tableY = scheduleSectionY - 25;
      const rowHeight = 28;
      const headerHeight = 32;
      const tableWidth = width - 100;
      
      // Table header background
      drawRectangle(page, 50, tableY - headerHeight, tableWidth, headerHeight,
        { r: 0.15, g: 0.4, b: 0.5 }, height, { r: 0.1, g: 0.3, b: 0.4 }, 2);

      // Header text (white)
      const headerTextColor = { r: 1.0, g: 1.0, b: 1.0 };
      const colWidth = tableWidth / 4;
      await drawText(page, 'م', 50 + colWidth * 0.5, tableY - 20, 11, true, height,
        headerTextColor, helveticaFont, helveticaBoldFont, colWidth, 'center');
      await drawText(page, 'المادة', 50 + colWidth * 1.5, tableY - 20, 11, true, height,
        headerTextColor, helveticaFont, helveticaBoldFont, colWidth, 'center');
      await drawText(page, 'المعلم', 50 + colWidth * 2.5, tableY - 20, 11, true, height,
        headerTextColor, helveticaFont, helveticaBoldFont, colWidth, 'center');
      await drawText(page, 'الفصل', 50 + colWidth * 3.5, tableY - 20, 11, true, height,
        headerTextColor, helveticaFont, helveticaBoldFont, colWidth, 'center');

      // Table rows
      for (let i = 0; i < Math.min(dailySchedule.length, 7); i++) {
        const session = dailySchedule[i];
        const rowY = tableY - headerHeight - (i + 1) * rowHeight;
        
        // Row background (alternating)
        const rowBg = i % 2 === 0 ? { r: 1.0, g: 1.0, b: 1.0 } : lightGray;
        drawRectangle(page, 50, rowY, tableWidth, rowHeight,
          rowBg, height, borderGray, 1);

        // Period number (centered)
        await drawText(page, String(session.period), 50 + colWidth * 0.5, rowY + rowHeight / 2, 11, true, height,
          secondaryColor, helveticaFont, helveticaBoldFont, colWidth, 'center');
        
        // Subject (centered)
        await drawText(page, session.subject || '-', 50 + colWidth * 1.5, rowY + rowHeight / 2, 10, false, height,
          secondaryColor, helveticaFont, helveticaBoldFont, colWidth, 'center');
        
        // Teacher (centered)
        await drawText(page, session.teacher || '-', 50 + colWidth * 2.5, rowY + rowHeight / 2, 10, false, height,
          textGray, helveticaFont, helveticaBoldFont, colWidth, 'center');
        
        // Classroom (centered)
        await drawText(page, session.classRoom || '-', 50 + colWidth * 3.5, rowY + rowHeight / 2, 10, false, height,
          textGray, helveticaFont, helveticaBoldFont, colWidth, 'center');
      }
    }

    // ============================================
    // NOTES SECTION
    // ============================================
    const notesY = scheduleSectionY - (dailySchedule.length > 0 ? 250 : 50);
    
    // Section title
    await drawText(page, 'ملاحظات', width / 2, notesY, 15, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');
    
    // Underline
    page.drawLine({
      start: { x: width / 2 - 40, y: notesY - 5 },
      end: { x: width / 2 + 40, y: notesY - 5 },
      thickness: 2,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });

    // Notes box
    const notesBoxY = notesY - 25;
    const notesBoxHeight = 70;
    
    drawRectangle(page, 50, notesBoxY, width - 100, notesBoxHeight,
      { r: 1.0, g: 1.0, b: 1.0 }, height, { r: 0.2, g: 0.2, b: 0.2 }, 2);

    // Inner background
    drawRectangle(page, 52, notesBoxY - 2, width - 104, notesBoxHeight - 4,
      lightGray, height);

    if (record.notes) {
      await drawText(page, record.notes, width / 2, notesBoxY + notesBoxHeight / 2, 11, false, height,
        secondaryColor, helveticaFont, helveticaBoldFont, width - 120, 'center');
    } else {
      await drawText(page, 'لا توجد ملاحظات', width / 2, notesBoxY + notesBoxHeight / 2, 11, false, height,
        textGray, helveticaFont, helveticaBoldFont, width - 120, 'center');
    }

    // ============================================
    // GENERAL MESSAGE SECTION (if available)
    // ============================================
    if (safeSettings.reportGeneralMessage) {
      const messageY = notesBoxY - notesBoxHeight - 25;
      
      await drawText(page, 'رسالة الموجه', width / 2, messageY, 13, true, height,
        primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');

      const messageBoxY = messageY - 25;
      const messageBoxHeight = 50;
      
      drawRectangle(page, 50, messageBoxY, width - 100, messageBoxHeight,
        { r: 0.95, g: 0.97, b: 1.0 }, height, { r: 0.1, g: 0.5, b: 0.8 }, 2);

      await drawText(page, safeSettings.reportGeneralMessage, width / 2, messageBoxY + messageBoxHeight / 2, 10, false, height,
        { r: 0.05, g: 0.4, b: 0.7 }, helveticaFont, helveticaBoldFont, width - 120, 'center');
    }

    // ============================================
    // FOOTER
    // ============================================
    const footerY = 50;
    
    // Footer line
    page.drawLine({
      start: { x: 50, y: footerY + 25 },
      end: { x: width - 50, y: footerY + 25 },
      thickness: 1.5,
      color: rgb(borderGray.r, borderGray.g, borderGray.b),
    });

    // Footer text
    await drawText(page, 'هذا التقرير معتمد من المدرسة', width / 2, footerY + 10, 10, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');

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
