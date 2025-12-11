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

      // Set font - use system fonts that support Arabic
      const fontFamily = 'Arial, "Segoe UI", "Tahoma", "Arabic Typesetting", "Noto Sans Arabic", sans-serif';
      const fontWeight = isBold ? 'bold' : 'normal';
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;

      // Simple word-wrapping
      const words = text.replace(/\n/g, ' \n ').split(' ');
      const lines: string[] = [];
      let currentLine = '';
      const limit = maxWidth ? maxWidth - 30 : undefined; // padding accounted
      for (const word of words) {
        if (word === '\n') {
          lines.push(currentLine.trim());
          currentLine = '';
          continue;
        }
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = ctx.measureText(testLine).width;
        if (limit && testWidth > limit) {
          lines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine.trim()) lines.push(currentLine.trim());

      const textWidth = maxWidth || Math.max(...lines.map(l => ctx.measureText(l).width), 10);
      const lineHeight = fontSize * 1.5;
      const textHeight = lines.length * lineHeight;

      // Set canvas size with padding
      canvas.width = Math.ceil(textWidth) + 30;
      canvas.height = Math.ceil(textHeight) + 20;

      // Clear and redraw with correct size
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;

      // Draw wrapped text
      lines.forEach((line, idx) => {
        const y = (canvas.height - textHeight) / 2 + idx * lineHeight + lineHeight / 2;
        ctx.fillText(line, canvas.width - 15, y);
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
      xPos = width ? x + width - image.width : x - image.width;
    } else if (align === 'center' && !width) {
      xPos = x - image.width / 2;
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
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    
    // Calculate x position based on alignment
    let xPos = x;
    if (align === 'center') {
      xPos = width ? x + (width - textWidth) / 2 : x - textWidth / 2;
    } else if (align === 'right') {
      xPos = width ? x + width - textWidth : x - textWidth;
    }
    
    try {
      page.drawText(text, {
        x: xPos,
        y: pdfY - fontSize * 0.8,
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

    // Colors - Modern palette
    const primaryColor = { r: 0.07, g: 0.45, b: 0.62 }; // teal/blue
    const secondaryColor = { r: 0.12, g: 0.14, b: 0.18 }; // dark text
    const accentColor = { r: 0.88, g: 0.95, b: 0.99 }; // light sky
    const lightGray = { r: 0.97, g: 0.97, b: 0.98 };
    const borderGray = { r: 0.82, g: 0.84, b: 0.86 };
    const textGray = { r: 0.42, g: 0.45, b: 0.5 };

    // Layout helpers
    const margin = 45;
    const contentWidth = width - margin * 2;

    // Page background
    drawRectangle(page, 0, height, width, height, { r: 0.985, g: 0.99, b: 0.995 }, height);

    // ============================================
    // HEADER SECTION - Modern hero
    // ============================================
    const headerY = height - margin;
    const headerHeight = 140;

    // Hero background
    drawRectangle(page, margin, headerY, contentWidth, headerHeight, { r: 0.92, g: 0.96, b: 0.99 }, height, borderGray, 2);
    // Accent bar
    drawRectangle(page, margin, headerY, contentWidth, 10, { r: 0.07, g: 0.45, b: 0.62 }, height);

    // Logo (centered)
    if (safeSettings.logoUrl) {
      try {
        const logo = await loadImage(pdfDoc, safeSettings.logoUrl);
        if (logo) {
          const logoSize = 58;
          const logoX = margin + contentWidth / 2 - logoSize / 2;
          const logoY = headerY - 18;
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

    // School name & title
    await drawText(page, safeSettings.name, margin + contentWidth / 2, headerY - 30, 20, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');
    await drawText(page, 'تقرير متابعة يومي', margin + contentWidth / 2, headerY - 52, 15, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');

    // Right column (ministry/region)
    await drawText(page, 'المملكة العربية السعودية', margin + contentWidth - 10, headerY - 20, 9, true, height,
      textGray, helveticaFont, helveticaBoldFont, undefined, 'right');
    await drawText(page, safeSettings.ministry, margin + contentWidth - 10, headerY - 36, 10, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont, undefined, 'right');
    await drawText(page, safeSettings.region, margin + contentWidth - 10, headerY - 52, 9, false, height,
      textGray, helveticaFont, helveticaBoldFont, undefined, 'right');

    // Left column (date)
    await drawText(page, 'تاريخ التقرير', margin + 12, headerY - 18, 9, false, height,
      textGray, helveticaFont, helveticaBoldFont);
    await drawText(page, dateStr, margin + 12, headerY - 36, 11, true, height,
      secondaryColor, helveticaFont, helveticaBoldFont);
    await drawText(page, dayName, margin + 12, headerY - 52, 9, false, height,
      textGray, helveticaFont, helveticaBoldFont);
    if (safeSettings.academicYear) {
      await drawText(page, `العام الدراسي: ${safeSettings.academicYear}`, margin + 12, headerY - 68, 9, false, height,
        textGray, helveticaFont, helveticaBoldFont);
    }
    if (safeSettings.whatsappPhone) {
      await drawText(page, `واتساب: ${safeSettings.whatsappPhone}`, margin + 12, headerY - 84, 9, false, height,
        textGray, helveticaFont, helveticaBoldFont);
    }

    // ============================================
    // STUDENT INFORMATION SECTION
    // ============================================
    const studentSectionY = headerY - headerHeight - 25;
    await drawText(page, 'بيانات الطالب', margin + contentWidth / 2, studentSectionY, 15, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');
    page.drawLine({
      start: { x: margin + contentWidth / 2 - 70, y: studentSectionY - 6 },
      end: { x: margin + contentWidth / 2 + 70, y: studentSectionY - 6 },
      thickness: 2,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });

    const studentBoxY = studentSectionY - 24;
    const studentBoxHeight = 110;
    drawRectangle(page, margin, studentBoxY, contentWidth, studentBoxHeight,
      { r: 1, g: 1, b: 1 }, height, borderGray, 2);
    drawRectangle(page, margin + 2, studentBoxY - 2, contentWidth - 4, studentBoxHeight - 4,
      lightGray, height);

    // Two-column layout
    const colWidth = contentWidth / 2;
    const rightX = margin + contentWidth - 14;
    const leftX = margin + 14;
    const row1Y = studentBoxY + 78;
    const row2Y = studentBoxY + 54;
    const row3Y = studentBoxY + 30;

    // Right column: name / class / id
    await drawText(page, 'الاسم', rightX, row1Y, 10, false, height, textGray, helveticaFont, helveticaBoldFont, colWidth - 20, 'right');
    await drawText(page, student.name, rightX, row1Y - 12, 13, true, height, secondaryColor, helveticaFont, helveticaBoldFont, colWidth - 20, 'right');
    await drawText(page, 'الفصل', rightX, row2Y, 10, false, height, textGray, helveticaFont, helveticaBoldFont, colWidth - 20, 'right');
    await drawText(page, student.classGrade || 'غير محدد', rightX, row2Y - 12, 11, true, height, secondaryColor, helveticaFont, helveticaBoldFont, colWidth - 20, 'right');
    await drawText(page, 'رقم الملف', rightX, row3Y, 10, false, height, textGray, helveticaFont, helveticaBoldFont, colWidth - 20, 'right');
    await drawText(page, student.id, rightX, row3Y - 12, 10, true, height, secondaryColor, helveticaFont, helveticaBoldFont, colWidth - 20, 'right');

    // Left column: parent phone, whatsapp, badge
    await drawText(page, 'جوال ولي الأمر', leftX, row1Y, 10, false, height, textGray, helveticaFont, helveticaBoldFont, colWidth - 20, 'left');
    await drawText(page, student.parentPhone || 'غير متوفر', leftX, row1Y - 12, 11, true, height, secondaryColor, helveticaFont, helveticaBoldFont, colWidth - 20, 'left');
    if (safeSettings.whatsappPhone) {
      await drawText(page, 'واتساب المدرسة', leftX, row2Y, 10, false, height, textGray, helveticaFont, helveticaBoldFont, colWidth - 20, 'left');
      await drawText(page, safeSettings.whatsappPhone, leftX, row2Y - 12, 10, true, height, secondaryColor, helveticaFont, helveticaBoldFont, colWidth - 20, 'left');
    }
    const badgeY = studentBoxY + 14;
    drawRectangle(page, leftX, badgeY, 140, 26, { r: 0.9, g: 0.98, b: 0.95 }, height, { r: 0.12, g: 0.6, b: 0.4 }, 1.5);
    await drawText(page, 'معتمد من المدرسة', leftX + 70, badgeY + 13, 10, true, height,
      { r: 0.1, g: 0.5, b: 0.35 }, helveticaFont, helveticaBoldFont, 140, 'center');

    // ============================================
    // PERFORMANCE INDICATORS SECTION
    // ============================================
    const performanceSectionY = studentBoxY - 140;
    await drawText(page, 'ملخص الأداء والمستوى اليومي', margin + contentWidth / 2, performanceSectionY, 15, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');
    page.drawLine({
      start: { x: margin + contentWidth / 2 - 90, y: performanceSectionY - 6 },
      end: { x: margin + contentWidth / 2 + 90, y: performanceSectionY - 6 },
      thickness: 2,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });

    const cardWidth = (contentWidth - 30) / 2;
    const cardHeight = 70;
    const cardStartY = performanceSectionY - 30;
    const cardRowGap = 12;

    const cards = [
      { label: 'الحضور', value: getStatusText(record.attendance, 'attendance'), colors: getStatusColors(record.attendance, 'attendance') },
      { label: 'المشاركة', value: getStatusText(record.participation, 'academic'), colors: getStatusColors(record.participation, 'academic') },
      { label: 'الواجبات', value: getStatusText(record.homework, 'academic'), colors: getStatusColors(record.homework, 'academic') },
      { label: 'السلوك', value: getStatusText(record.behavior, 'academic'), colors: getStatusColors(record.behavior, 'academic') },
    ];

    for (let i = 0; i < cards.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * (cardWidth + 10);
      const y = cardStartY - row * (cardHeight + cardRowGap);
      drawRectangle(page, x, y, cardWidth, cardHeight, cards[i].colors.bg, height, cards[i].colors.border, 2);
      await drawText(page, cards[i].label, x + cardWidth / 2, y + cardHeight - 20, 10, false, height,
        textGray, helveticaFont, helveticaBoldFont, cardWidth, 'center');
      await drawText(page, cards[i].value, x + cardWidth / 2, y + cardHeight - 40, 14, true, height,
        cards[i].colors.text, helveticaFont, helveticaBoldFont, cardWidth, 'center');
    }

    // ============================================
    // SCHEDULE SECTION
    // ============================================
    const scheduleSectionY = cardStartY - (cardHeight + cardRowGap) * 2 - 30;
    await drawText(page, 'كشف المتابعة والحصص الدراسية', margin + contentWidth / 2, scheduleSectionY, 15, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');
    page.drawLine({
      start: { x: margin + contentWidth / 2 - 110, y: scheduleSectionY - 6 },
      end: { x: margin + contentWidth / 2 + 110, y: scheduleSectionY - 6 },
      thickness: 2,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });

    const dailySchedule = schedule.filter(s => s.day === dayName).sort((a, b) => a.period - b.period);

    if (dailySchedule.length > 0) {
      const tableY = scheduleSectionY - 24;
      const rowHeight = 30;
      const headerHeight = 34;
      const tableWidth = contentWidth;

      // Header
      drawRectangle(page, margin, tableY - headerHeight, tableWidth, headerHeight,
        { r: 0.1, g: 0.5, b: 0.65 }, height, { r: 0.08, g: 0.42, b: 0.55 }, 2);
      const headerTextColor = { r: 1, g: 1, b: 1 };
      const colWidth = tableWidth / 4;
      await drawText(page, 'م', margin + colWidth * 0.5, tableY - 20, 11, true, height,
        headerTextColor, helveticaFont, helveticaBoldFont, colWidth, 'center');
      await drawText(page, 'المادة', margin + colWidth * 1.5, tableY - 20, 11, true, height,
        headerTextColor, helveticaFont, helveticaBoldFont, colWidth, 'center');
      await drawText(page, 'المعلم', margin + colWidth * 2.5, tableY - 20, 11, true, height,
        headerTextColor, helveticaFont, helveticaBoldFont, colWidth, 'center');
      await drawText(page, 'الفصل', margin + colWidth * 3.5, tableY - 20, 11, true, height,
        headerTextColor, helveticaFont, helveticaBoldFont, colWidth, 'center');

      // Rows
      for (let i = 0; i < Math.min(dailySchedule.length, 7); i++) {
        const session = dailySchedule[i];
        const rowY = tableY - headerHeight - (i + 1) * rowHeight;
        const rowBg = i % 2 === 0 ? { r: 1, g: 1, b: 1 } : { r: 0.97, g: 0.98, b: 0.985 };
        drawRectangle(page, margin, rowY, tableWidth, rowHeight, rowBg, height, borderGray, 1);

        await drawText(page, String(session.period), margin + colWidth * 0.5, rowY + rowHeight / 2 + 4, 11, true, height,
          secondaryColor, helveticaFont, helveticaBoldFont, colWidth, 'center');
        await drawText(page, session.subject || '-', margin + colWidth * 1.5, rowY + rowHeight / 2 + 4, 10, false, height,
          secondaryColor, helveticaFont, helveticaBoldFont, colWidth, 'center');
        await drawText(page, session.teacher || '-', margin + colWidth * 2.5, rowY + rowHeight / 2 + 4, 10, false, height,
          textGray, helveticaFont, helveticaBoldFont, colWidth, 'center');
        await drawText(page, session.classRoom || '-', margin + colWidth * 3.5, rowY + rowHeight / 2 + 4, 10, false, height,
          textGray, helveticaFont, helveticaBoldFont, colWidth, 'center');
      }
    }

    // ============================================
    // NOTES SECTION
    // ============================================
    const notesY = scheduleSectionY - (dailySchedule.length > 0 ? 240 : 60);
    await drawText(page, 'ملاحظات', margin + contentWidth / 2, notesY, 15, true, height,
      primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');
    page.drawLine({
      start: { x: margin + contentWidth / 2 - 50, y: notesY - 6 },
      end: { x: margin + contentWidth / 2 + 50, y: notesY - 6 },
      thickness: 2,
      color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    });

    const notesBoxY = notesY - 26;
    const notesBoxHeight = 80;
    drawRectangle(page, margin, notesBoxY, contentWidth, notesBoxHeight,
      { r: 1, g: 1, b: 1 }, height, borderGray, 2);
    drawRectangle(page, margin + 2, notesBoxY - 2, contentWidth - 4, notesBoxHeight - 4,
      lightGray, height);

    const notesText = record.notes || 'لا توجد ملاحظات';
    await drawText(page, notesText, margin + contentWidth / 2, notesBoxY + notesBoxHeight / 2, 11, false, height,
      secondaryColor, helveticaFont, helveticaBoldFont, contentWidth - 40, 'center');

    // ============================================
    // GENERAL MESSAGE SECTION (if available)
    // ============================================
    if (safeSettings.reportGeneralMessage) {
      const messageY = notesBoxY - notesBoxHeight - 25;
      await drawText(page, 'رسالة الموجه', margin + contentWidth / 2, messageY, 13, true, height,
        primaryColor, helveticaFont, helveticaBoldFont, undefined, 'center');

      const messageBoxY = messageY - 24;
      const messageBoxHeight = 50;
      drawRectangle(page, margin, messageBoxY, contentWidth, messageBoxHeight,
        accentColor, height, { r: 0.14, g: 0.55, b: 0.72 }, 2);
      await drawText(page, safeSettings.reportGeneralMessage, margin + contentWidth / 2, messageBoxY + messageBoxHeight / 2, 10, false, height,
        { r: 0.05, g: 0.35, b: 0.55 }, helveticaFont, helveticaBoldFont, contentWidth - 30, 'center');
    }

    // ============================================
    // FOOTER
    // ============================================
    const footerY = 60;
    page.drawLine({
      start: { x: margin, y: footerY + 18 },
      end: { x: margin + contentWidth, y: footerY + 18 },
      thickness: 1.5,
      color: rgb(borderGray.r, borderGray.g, borderGray.b),
    });
    await drawText(page, 'هذا التقرير معتمد من المدرسة', margin + contentWidth / 2, footerY, 10, true, height,
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
