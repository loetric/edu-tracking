import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import { Student, DailyRecord, SchoolSettings, ScheduleItem } from '../types';

/**
 * Convert Arabic text to image using Canvas with modern fonts
 * This is needed because pdf-lib doesn't support Arabic fonts by default
 */
async function textToImage(
  text: string, 
  fontSize: number = 12, 
  isBold: boolean = false,
  textColor: string = '#000000',
  maxWidth?: number
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

      // Modern Arabic fonts - prioritize modern, clean fonts
      const fontFamily = '"Cairo", "Tajawal", "Almarai", "IBM Plex Sans Arabic", "Noto Sans Arabic", "Segoe UI", Arial, sans-serif';
      const fontWeight = isBold ? '700' : '400';
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;

      // Word-wrapping with proper line breaks
      const words = text.replace(/\n/g, ' \n ').split(' ');
      const lines: string[] = [];
      let currentLine = '';
      const limit = maxWidth ? maxWidth - 40 : undefined; // padding accounted
      
      for (const word of words) {
        if (word === '\n') {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = '';
          continue;
        }
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = ctx.measureText(testLine).width;
        if (limit && testWidth > limit) {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine.trim()) lines.push(currentLine.trim());

      const textWidth = maxWidth || Math.max(...lines.map(l => ctx.measureText(l).width), 10);
      const lineHeight = fontSize * 1.6; // Better line spacing
      const textHeight = lines.length * lineHeight;

      // Set canvas size with padding
      canvas.width = Math.ceil(textWidth) + 40;
      canvas.height = Math.ceil(textHeight) + 30;

      // Clear and redraw with correct size
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;

      // Draw wrapped text with proper spacing
      lines.forEach((line, idx) => {
        const y = (canvas.height - textHeight) / 2 + idx * lineHeight + lineHeight / 2;
        ctx.fillText(line, canvas.width - 20, y);
      });

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
    } else if (align === 'right') {
      xPos = width ? x + width - image.width - 10 : x - image.width;
    } else if (align === 'center' && !width) {
      xPos = x - image.width / 2;
    } else if (align === 'left') {
      xPos = x + 10;
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
 * Draw a colored rectangle with modern styling
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
  borderWidth: number = 1.5,
  borderRadius: number = 0
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
    } else if (align === 'left') {
      xPos = x;
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
 * Get status colors - Modern, vibrant colors
 */
function getStatusColors(status: string, type: 'attendance' | 'academic') {
  if (type === 'attendance') {
    switch(status) {
      case 'present': 
        return {
          bg: { r: 0.93, g: 0.98, b: 0.94 },
          border: { r: 0.2, g: 0.7, b: 0.3 },
          text: { r: 0.1, g: 0.6, b: 0.2 }
        };
      case 'excused': 
        return {
          bg: { r: 1.0, g: 0.98, b: 0.92 },
          border: { r: 0.9, g: 0.7, b: 0.3 },
          text: { r: 0.8, g: 0.6, b: 0.1 }
        };
      case 'absent': 
        return {
          bg: { r: 1.0, g: 0.94, b: 0.94 },
          border: { r: 0.9, g: 0.4, b: 0.4 },
          text: { r: 0.8, g: 0.3, b: 0.3 }
        };
      default: 
        return {
          bg: { r: 0.96, g: 0.96, b: 0.96 },
          border: { r: 0.7, g: 0.7, b: 0.7 },
          text: { r: 0.5, g: 0.5, b: 0.5 }
        };
    }
  } else {
    switch(status) {
      case 'excellent': 
        return {
          bg: { r: 0.88, g: 0.98, b: 0.98 },
          border: { r: 0.1, g: 0.7, b: 0.7 },
          text: { r: 0.05, g: 0.6, b: 0.6 }
        };
      case 'good': 
        return {
          bg: { r: 0.88, g: 0.94, b: 1.0 },
          border: { r: 0.1, g: 0.6, b: 0.9 },
          text: { r: 0.05, g: 0.5, b: 0.8 }
        };
      case 'average': 
        return {
          bg: { r: 1.0, g: 0.98, b: 0.88 },
          border: { r: 0.9, g: 0.7, b: 0.3 },
          text: { r: 0.8, g: 0.6, b: 0.1 }
        };
      case 'poor': 
        return {
          bg: { r: 1.0, g: 0.94, b: 0.94 },
          border: { r: 0.9, g: 0.4, b: 0.4 },
          text: { r: 0.8, g: 0.3, b: 0.3 }
        };
      default: 
        return {
          bg: { r: 0.96, g: 0.96, b: 0.96 },
          border: { r: 0.7, g: 0.7, b: 0.7 },
          text: { r: 0.5, g: 0.5, b: 0.5 }
        };
    }
  }
}

/**
 * Generate a modern, elegant PDF report
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

    // Modern color palette - Elegant and professional
    const primaryColor = { r: 0.08, g: 0.48, b: 0.65 }; // Modern blue-teal
    const secondaryColor = { r: 0.15, g: 0.15, b: 0.18 }; // Dark charcoal
    const accentColor = { r: 0.92, g: 0.96, b: 0.99 }; // Light sky
    const lightGray = { r: 0.98, g: 0.98, b: 0.99 };
    const borderGray = { r: 0.85, g: 0.87, b: 0.89 };
    const textGray = { r: 0.45, g: 0.48, b: 0.52 };
    const white = { r: 1.0, g: 1.0, b: 1.0 };

    // Layout constants
    const margin = 40;
    const contentWidth = width - margin * 2;

    // Page background - subtle gradient effect
    drawRectangle(page, 0, height, width, height, { r: 0.99, g: 0.995, b: 1.0 }, height);

    // ============================================
    // ELEGANT HEADER SECTION
    // ============================================
    const headerY = height - margin;
    const headerHeight = 130;

    // Header background with elegant border
    drawRectangle(page, margin, headerY, contentWidth, headerHeight, accentColor, height, borderGray, 2);
    
    // Top accent stripe
    drawRectangle(page, margin, headerY, contentWidth, 6, primaryColor, height);

    // Logo (centered, prominent)
    if (safeSettings.logoUrl) {
      try {
        const logo = await loadImage(pdfDoc, safeSettings.logoUrl);
        if (logo) {
          const logoSize = 60;
          const logoX = margin + contentWidth / 2 - logoSize / 2;
          const logoY = headerY - 20;
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

    // Kingdom of Saudi Arabia (top right, elegant)
    await drawText(page, 'المملكة العربية السعودية', width - margin - 10, headerY - 15, 9, true, height,
      textGray, helveticaFont, helveticaBoldFont);

    // Ministry (right side, prominent)
    await drawText(page, safeSettings.ministry, width - margin - 10, headerY - 30, 11, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont);

    // Region (right side, below ministry)
    await drawText(page, safeSettings.region, width - margin - 10, headerY - 45, 10, false, height,
      textGray, helveticaFont, helveticaBoldFont);

    // School name (center, large and elegant)
    await drawText(page, safeSettings.name, margin + contentWidth / 2, headerY - 35, 22, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');

    // Report title (center, below school name)
    await drawText(page, 'تقرير متابعة يومي', margin + contentWidth / 2, headerY - 58, 16, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');

    // Date section (left side, organized)
    await drawText(page, 'تاريخ التقرير', margin + 10, headerY - 15, 9, false, height,
      textGray, helveticaFont, helveticaBoldFont);
    await drawText(page, dateStr, margin + 10, headerY - 30, 11, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont);
    await drawText(page, dayName, margin + 10, headerY - 45, 10, false, height,
      textGray, helveticaFont, helveticaBoldFont);

    // Academic year (if available)
    if (safeSettings.academicYear) {
      await drawText(page, `العام الدراسي: ${safeSettings.academicYear}`, margin + 10, headerY - 60, 9, false, height,
        textGray, helveticaFont, helveticaBoldFont);
    }

    // School WhatsApp (if available)
    if (safeSettings.whatsappPhone) {
      await drawText(page, `واتساب: ${safeSettings.whatsappPhone}`, margin + 10, headerY - 75, 8, false, height,
        textGray, helveticaFont, helveticaBoldFont);
    }

    // ============================================
    // STUDENT INFORMATION SECTION - Modern Cards
    // ============================================
    const studentSectionY = headerY - headerHeight - 20;
    
    // Section title with elegant underline
    await drawText(page, 'معلومات الطالب', margin + contentWidth / 2, studentSectionY, 16, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');
    
    // Elegant underline
    page.drawLine({
      start: { x: margin + contentWidth / 2 - 70, y: studentSectionY - 6 },
      end: { x: margin + contentWidth / 2 + 70, y: studentSectionY - 6 },
      thickness: 2.5,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });

    // Student info box - Modern card design
    const studentBoxY = studentSectionY - 25;
    const studentBoxHeight = 95;
    
    // Card background with elegant border
    drawRectangle(page, margin, studentBoxY, contentWidth, studentBoxHeight,
      white, height, { r: 0.2, g: 0.2, b: 0.2 }, 2);

    // Inner subtle background
    drawRectangle(page, margin + 2, studentBoxY - 2, contentWidth - 4, studentBoxHeight - 4,
      lightGray, height);

    // Student name (right side, top) - Prominent
    await drawText(page, 'الاسم الرباعي:', width - margin - 15, studentBoxY + 70, 10, false, height,
      textGray, helveticaFont, helveticaBoldFont);
    await drawText(page, student.name, width - margin - 15, studentBoxY + 55, 14, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont);

    // Class (right side, middle)
    await drawText(page, 'الفصل:', width - margin - 15, studentBoxY + 35, 10, false, height,
      textGray, helveticaFont, helveticaBoldFont);
    await drawText(page, student.classGrade || 'غير محدد', width - margin - 15, studentBoxY + 20, 12, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont);

    // Student ID (right side, bottom)
    await drawText(page, 'رقم الملف:', width - margin - 15, studentBoxY + 5, 10, false, height,
      textGray, helveticaFont, helveticaBoldFont);
    await drawText(page, student.id, width - margin - 15, studentBoxY - 10, 10, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont);

    // Parent phone (left side, top)
    await drawText(page, 'جوال ولي الأمر:', margin + 15, studentBoxY + 70, 10, false, height,
      textGray, helveticaFont, helveticaBoldFont);
    await drawText(page, student.parentPhone || 'غير متوفر', margin + 15, studentBoxY + 55, 11, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont);

    // Status badge (left side, elegant)
    const badgeY = studentBoxY + 30;
    const badgeWidth = 140;
    const badgeHeight = 28;
    drawRectangle(page, margin + 15, badgeY, badgeWidth, badgeHeight,
      { r: 0.9, g: 0.98, b: 0.94 }, height, { r: 0.1, g: 0.6, b: 0.3 }, 2);
    await drawText(page, 'معتمد من المدرسة', margin + 15 + badgeWidth / 2, badgeY + badgeHeight / 2, 10, true, height,
      { r: 0.05, g: 0.6, b: 0.3 }, helveticaFont, helveticaBoldFont, badgeWidth, 'center');

    // ============================================
    // PERFORMANCE INDICATORS - Modern Grid
    // ============================================
    const performanceSectionY = studentBoxY - studentBoxHeight - 25;
    
    // Section title
    await drawText(page, 'ملخص الأداء والمستوى اليومي', margin + contentWidth / 2, performanceSectionY, 16, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');
    
    // Elegant underline
    page.drawLine({
      start: { x: margin + contentWidth / 2 - 100, y: performanceSectionY - 6 },
      end: { x: margin + contentWidth / 2 + 100, y: performanceSectionY - 6 },
      thickness: 2.5,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });

    // Performance cards - Modern 2x2 grid
    const cardY = performanceSectionY - 30;
    const cardWidth = 120;
    const cardHeight = 65;
    const cardSpacing = 15;
    const totalCardsWidth = (cardWidth * 2) + cardSpacing;
    const totalCardsHeight = (cardHeight * 2) + cardSpacing;
    const cardsStartX = margin + (contentWidth - totalCardsWidth) / 2 + totalCardsWidth;

    // Attendance card (top right)
    const attendanceColors = getStatusColors(record.attendance, 'attendance');
    drawRectangle(page, cardsStartX - cardWidth, cardY, cardWidth, cardHeight,
      attendanceColors.bg, height, attendanceColors.border, 2.5);
    await drawText(page, 'الحضور', cardsStartX - cardWidth / 2, cardY + 50, 10, false, height,
      textGray, helveticaFont, helveticaBoldFont, cardWidth, 'center');
    await drawText(page, getStatusText(record.attendance, 'attendance'),
      cardsStartX - cardWidth / 2, cardY + 30, 16, true, height, attendanceColors.text, helveticaFont, helveticaBoldFont, cardWidth, 'center');

    // Participation card (top left)
    const participationColors = getStatusColors(record.participation, 'academic');
    drawRectangle(page, cardsStartX - cardWidth * 2 - cardSpacing, cardY, cardWidth, cardHeight,
      participationColors.bg, height, participationColors.border, 2.5);
    await drawText(page, 'المشاركة', cardsStartX - cardWidth * 1.5 - cardSpacing, cardY + 50, 10, false, height,
      textGray, helveticaFont, helveticaBoldFont, cardWidth, 'center');
    await drawText(page, getStatusText(record.participation, 'academic'),
      cardsStartX - cardWidth * 1.5 - cardSpacing, cardY + 30, 16, true, height, participationColors.text, helveticaFont, helveticaBoldFont, cardWidth, 'center');

    // Homework card (bottom right)
    const homeworkColors = getStatusColors(record.homework, 'academic');
    drawRectangle(page, cardsStartX - cardWidth, cardY - cardHeight - cardSpacing, cardWidth, cardHeight,
      homeworkColors.bg, height, homeworkColors.border, 2.5);
    await drawText(page, 'الواجبات', cardsStartX - cardWidth / 2, cardY - cardSpacing + 20, 10, false, height,
      textGray, helveticaFont, helveticaBoldFont, cardWidth, 'center');
    await drawText(page, getStatusText(record.homework, 'academic'),
      cardsStartX - cardWidth / 2, cardY - cardSpacing, 16, true, height, homeworkColors.text, helveticaFont, helveticaBoldFont, cardWidth, 'center');

    // Behavior card (bottom left)
    const behaviorColors = getStatusColors(record.behavior, 'academic');
    drawRectangle(page, cardsStartX - cardWidth * 2 - cardSpacing, cardY - cardHeight - cardSpacing, cardWidth, cardHeight,
      behaviorColors.bg, height, behaviorColors.border, 2.5);
    await drawText(page, 'السلوك', cardsStartX - cardWidth * 1.5 - cardSpacing, cardY - cardSpacing + 20, 10, false, height,
      textGray, helveticaFont, helveticaBoldFont, cardWidth, 'center');
    await drawText(page, getStatusText(record.behavior, 'academic'),
      cardsStartX - cardWidth * 1.5 - cardSpacing, cardY - cardSpacing, 16, true, height, behaviorColors.text, helveticaFont, helveticaBoldFont, cardWidth, 'center');

    // ============================================
    // SCHEDULE SECTION - Elegant Table
    // ============================================
    const scheduleSectionY = cardY - totalCardsHeight - 30;
    
    // Section title
    await drawText(page, 'كشف المتابعة والحصص الدراسية', margin + contentWidth / 2, scheduleSectionY, 16, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');
    
    // Elegant underline
    page.drawLine({
      start: { x: margin + contentWidth / 2 - 120, y: scheduleSectionY - 6 },
      end: { x: margin + contentWidth / 2 + 120, y: scheduleSectionY - 6 },
      thickness: 2.5,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });

    // Filter schedule for the day
    const dailySchedule = schedule.filter(s => s.day === dayName).sort((a, b) => a.period - b.period);

    if (dailySchedule.length > 0) {
      const tableY = scheduleSectionY - 25;
      const rowHeight = 30;
      const headerHeight = 35;
      const tableWidth = contentWidth;
      
      // Table header - Modern dark header
      drawRectangle(page, margin, tableY - headerHeight, tableWidth, headerHeight,
        primaryColor, height, { r: 0.05, g: 0.35, b: 0.5 }, 2);

      // Header text (white, centered)
      const headerTextColor = white;
      const colWidth = tableWidth / 4;
      await drawText(page, 'م', margin + colWidth * 0.5, tableY - 20, 12, true, height,
        headerTextColor, helveticaFont, helveticaBoldFont, colWidth, 'center');
      await drawText(page, 'المادة', margin + colWidth * 1.5, tableY - 20, 12, true, height,
        headerTextColor, helveticaFont, helveticaBoldFont, colWidth, 'center');
      await drawText(page, 'المعلم', margin + colWidth * 2.5, tableY - 20, 12, true, height,
        headerTextColor, helveticaFont, helveticaBoldFont, colWidth, 'center');
      await drawText(page, 'الفصل', margin + colWidth * 3.5, tableY - 20, 12, true, height,
        headerTextColor, helveticaFont, helveticaBoldFont, colWidth, 'center');

      // Table rows - Elegant alternating
      for (let i = 0; i < Math.min(dailySchedule.length, 6); i++) {
        const session = dailySchedule[i];
        const rowY = tableY - headerHeight - (i + 1) * rowHeight;
        
        // Row background (alternating)
        const rowBg = i % 2 === 0 ? white : lightGray;
        drawRectangle(page, margin, rowY, tableWidth, rowHeight,
          rowBg, height, borderGray, 1);

        // Period number (centered)
        await drawText(page, String(session.period), margin + colWidth * 0.5, rowY + rowHeight / 2, 12, true, height,
          secondaryColor, helveticaFont, helveticaBoldFont, colWidth, 'center');
        
        // Subject (centered)
        await drawText(page, session.subject || '-', margin + colWidth * 1.5, rowY + rowHeight / 2, 11, false, height,
          secondaryColor, helveticaFont, helveticaBoldFont, colWidth, 'center');
        
        // Teacher (centered)
        await drawText(page, session.teacher || '-', margin + colWidth * 2.5, rowY + rowHeight / 2, 11, false, height,
          textGray, helveticaFont, helveticaBoldFont, colWidth, 'center');
        
        // Classroom (centered)
        await drawText(page, session.classRoom || '-', margin + colWidth * 3.5, rowY + rowHeight / 2, 11, false, height,
          textGray, helveticaFont, helveticaBoldFont, colWidth, 'center');
      }
    }

    // ============================================
    // NOTES SECTION - Elegant Box
    // ============================================
    const notesY = scheduleSectionY - (dailySchedule.length > 0 ? 250 : 50);
    
    // Section title
    await drawText(page, 'ملاحظات', margin + contentWidth / 2, notesY, 16, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');
    
    // Elegant underline
    page.drawLine({
      start: { x: margin + contentWidth / 2 - 50, y: notesY - 6 },
      end: { x: margin + contentWidth / 2 + 50, y: notesY - 6 },
      thickness: 2.5,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });

    // Notes box - Modern card
    const notesBoxY = notesY - 25;
    const notesBoxHeight = 75;
    
    drawRectangle(page, margin, notesBoxY, contentWidth, notesBoxHeight,
      white, height, { r: 0.2, g: 0.2, b: 0.2 }, 2);

    // Inner background
    drawRectangle(page, margin + 2, notesBoxY - 2, contentWidth - 4, notesBoxHeight - 4,
      lightGray, height);

    if (record.notes) {
      await drawText(page, record.notes, margin + contentWidth / 2, notesBoxY + notesBoxHeight / 2, 11, false, height,
        secondaryColor, helveticaFont, helveticaBoldFont, contentWidth - 30, 'center');
    } else {
      await drawText(page, 'لا توجد ملاحظات', margin + contentWidth / 2, notesBoxY + notesBoxHeight / 2, 11, false, height,
        textGray, helveticaFont, helveticaBoldFont, contentWidth - 30, 'center');
    }

    // ============================================
    // GENERAL MESSAGE SECTION (if available)
    // ============================================
    if (safeSettings.reportGeneralMessage) {
      const messageY = notesBoxY - notesBoxHeight - 25;
      
      await drawText(page, 'رسالة الموجه', margin + contentWidth / 2, messageY, 14, true, height,
        primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');

      const messageBoxY = messageY - 25;
      const messageBoxHeight = 55;
      
      drawRectangle(page, margin, messageBoxY, contentWidth, messageBoxHeight,
        { r: 0.92, g: 0.96, b: 1.0 }, height, { r: 0.1, g: 0.6, b: 0.9 }, 2);

      await drawText(page, safeSettings.reportGeneralMessage, margin + contentWidth / 2, messageBoxY + messageBoxHeight / 2, 10, false, height,
        { r: 0.05, g: 0.5, b: 0.8 }, helveticaFont, helveticaBoldFont, contentWidth - 30, 'center');
    }

    // ============================================
    // ELEGANT FOOTER
    // ============================================
    const footerY = 45;
    
    // Footer line
    page.drawLine({
      start: { x: margin, y: footerY + 25 },
      end: { x: width - margin, y: footerY + 25 },
      thickness: 1.5,
      color: rgb(borderGray.r, borderGray.g, borderGray.b),
    });

    // Footer text
    await drawText(page, 'هذا التقرير معتمد من المدرسة', margin + contentWidth / 2, footerY + 10, 10, true, height,
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
