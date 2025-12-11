import { PDFDocument, rgb, PDFPage } from 'pdf-lib';
import { Student, DailyRecord, SchoolSettings, ScheduleItem } from '../types';
import { getStatusLabel } from '../constants';

// --- Configuration ---
const ARABIC_FONT_STACK = '"Cairo", "Tajawal", "IBM Plex Sans Arabic", "Segoe UI", "Arial", sans-serif';

// --- Color Palette matching the new design ---
const COLORS = {
  // Page colors
  pageBackground: rgb(0.96, 0.97, 0.98),
  white: rgb(1, 1, 1),
  
  // Header colors
  headerText: rgb(0.29, 0.32, 0.35),
  headerTextLight: rgb(0.55, 0.58, 0.62),
  
  // Title colors
  titlePrimary: rgb(0.09, 0.29, 0.49),
  titleUnderline: rgb(0.0, 0.74, 0.65),
  
  // Student card
  studentCardBg: rgb(0.93, 0.98, 0.96),
  studentCardBorder: rgb(0.75, 0.90, 0.85),
  studentCardAccent: rgb(0.0, 0.74, 0.65),
  
  // Summary boxes
  summaryBoxBg: rgb(0.93, 0.98, 0.96),
  summaryBoxBorder: rgb(0.75, 0.90, 0.85),
  
  // Table
  tableHeaderBg: rgb(0.95, 0.96, 0.97),
  tableHeaderText: rgb(0.30, 0.32, 0.34),
  tableBorder: rgb(0.88, 0.90, 0.92),
  tableRowEven: rgb(1, 1, 1),
  tableRowOdd: rgb(0.99, 0.99, 0.99),
  
  // Status colors
  statusPresent: rgb(0.0, 0.74, 0.65),
  statusExcellent: rgb(0.0, 0.74, 0.65),
  statusGood: rgb(0.4, 0.7, 0.9),
  statusAverage: rgb(0.95, 0.75, 0.3),
  statusPoor: rgb(0.95, 0.4, 0.4),
  
  // Text
  textPrimary: rgb(0.13, 0.13, 0.13),
  textSecondary: rgb(0.45, 0.47, 0.49),
  
  // Footer
  footerBg: rgb(0.96, 0.97, 0.98),
  footerText: rgb(0.55, 0.58, 0.62),
  footerBorder: rgb(0.88, 0.90, 0.92),
};

/**
 * Convert Arabic text to high-resolution image
 */
async function textToImage(
  text: string,
  options: {
    fontSize?: number;
    color?: string;
    align?: 'right' | 'center' | 'left';
    maxWidth?: number;
    isBold?: boolean;
  } = {}
): Promise<{ buffer: Uint8Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      const { 
        fontSize = 12, 
        color = '#000000', 
        align = 'right', 
        maxWidth = 500, 
        isBold = false 
      } = options;

      const scale = 3;
      const fontWeight = isBold ? '700' : '400';
      ctx.font = `${fontWeight} ${fontSize * scale}px ${ARABIC_FONT_STACK}`;

      // Text wrapping
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = words[0] || '';
      const scaledMaxWidth = maxWidth * scale;

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + ' ' + word).width;
        if (width < scaledMaxWidth) {
          currentLine += ' ' + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);

      const lineHeight = fontSize * 1.6 * scale;
      const canvasWidth = scaledMaxWidth + (10 * scale);
      const canvasHeight = (lines.length * lineHeight) + (10 * scale);

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      ctx.scale(1, 1);
      ctx.font = `${fontWeight} ${fontSize * scale}px ${ARABIC_FONT_STACK}`;
      ctx.fillStyle = color;
      ctx.textBaseline = 'middle';

      lines.forEach((line, index) => {
        const y = (index * lineHeight) + (lineHeight / 2) + (5 * scale);
        let x = 0;
        
        if (align === 'right') {
          x = canvasWidth - (5 * scale);
          ctx.textAlign = 'right';
        } else if (align === 'center') {
          x = canvasWidth / 2;
          ctx.textAlign = 'center';
        } else {
          x = (5 * scale);
          ctx.textAlign = 'left';
        }
        
        ctx.fillText(line, x, y);
      });

      canvas.toBlob((blob) => {
        if (!blob) reject(new Error('Blob creation failed'));
        else blob.arrayBuffer().then(buf => resolve({ 
          buffer: new Uint8Array(buf), 
          width: canvasWidth / scale, 
          height: canvasHeight / scale 
        }));
      }, 'image/png');
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Draw star icon
 */
async function drawStar(
  pdfDoc: PDFDocument,
  page: PDFPage,
  x: number,
  y: number,
  size: number,
  color: { r: number; g: number; b: number }
) {
  const starImg = await textToImage('★', {
    fontSize: size,
    color: `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`,
    align: 'center',
    isBold: false
  });
  const starEmb = await pdfDoc.embedPng(starImg.buffer);
  page.drawImage(starEmb, {
    x: x - starImg.width / 2,
    y: y - starImg.height / 2,
    width: starImg.width,
    height: starImg.height
  });
}

/**
 * Draw clipboard icon
 */
async function drawClipboard(
  pdfDoc: PDFDocument,
  page: PDFPage,
  x: number,
  y: number,
  size: number,
  color: { r: number; g: number; b: number }
) {
  const clipboardImg = await textToImage('📋', {
    fontSize: size,
    color: `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`,
    align: 'center',
    isBold: false
  });
  const clipboardEmb = await pdfDoc.embedPng(clipboardImg.buffer);
  page.drawImage(clipboardEmb, {
    x: x - clipboardImg.width / 2,
    y: y - clipboardImg.height / 2,
    width: clipboardImg.width,
    height: clipboardImg.height
  });
}

/**
 * Load image from URL
 */
async function loadImage(pdfDoc: PDFDocument, imageUrl: string): Promise<any> {
  try {
    if (!imageUrl || imageUrl.trim() === '') {
      return null;
    }
    
    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      if (imageUrl.includes('image/png')) {
        return await pdfDoc.embedPng(imageBytes);
      } else {
        return await pdfDoc.embedJpg(imageBytes);
      }
    }
    
    const response = await fetch(imageUrl, {
      mode: 'cors',
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const imageBytes = new Uint8Array(arrayBuffer);
    
    const contentType = response.headers.get('content-type') || '';
    const urlLower = imageUrl.toLowerCase();
    
    if (contentType.includes('png') || urlLower.includes('.png') || urlLower.includes('png')) {
      return await pdfDoc.embedPng(imageBytes);
    } else {
      return await pdfDoc.embedJpg(imageBytes);
    }
  } catch (error) {
    console.error('Error loading image:', error);
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
    return getStatusLabel(status) || '-';
  }
}

/**
 * Get status badge color
 */
function getStatusBadgeColor(status: string, type: 'attendance' | 'academic'): { r: number; g: number; b: number } {
  if (type === 'attendance') {
    switch(status) {
      case 'present': return { r: 0.0, g: 0.74, b: 0.65 };
      case 'excused': return { r: 0.95, g: 0.75, b: 0.3 };
      case 'absent': return { r: 0.95, g: 0.4, b: 0.4 };
      default: return { r: 0.7, g: 0.7, b: 0.7 };
    }
  } else {
    switch(status) {
      case 'excellent': return { r: 0.0, g: 0.74, b: 0.65 };
      case 'good': return { r: 0.4, g: 0.7, b: 0.9 };
      case 'average': return { r: 0.95, g: 0.75, b: 0.3 };
      case 'poor': return { r: 0.95, g: 0.4, b: 0.4 };
      default: return { r: 0.7, g: 0.7, b: 0.7 };
    }
  }
}

/**
 * Draw status badge
 */
async function drawStatusBadge(
  pdfDoc: PDFDocument,
  page: PDFPage,
  text: string,
  color: { r: number; g: number; b: number },
  x: number,
  y: number,
  width: number,
  height: number = 20
) {
  page.drawRectangle({
    x: x - width / 2,
    y: y - height / 2,
    width: width,
    height: height,
    color: rgb(color.r, color.g, color.b),
    borderColor: rgb(color.r, color.g, color.b),
    borderWidth: 1,
  });

  const badgeTextImg = await textToImage(text, {
    fontSize: 9, color: '#FFFFFF', align: 'center', isBold: false, maxWidth: width - 5
  });
  const badgeTextEmb = await pdfDoc.embedPng(badgeTextImg.buffer);
  page.drawImage(badgeTextEmb, {
    x: x - badgeTextImg.width / 2,
    y: y - badgeTextImg.height / 2,
    width: badgeTextImg.width,
    height: badgeTextImg.height
  });
}

/**
 * Generate PDF Report matching the new design
 */
export async function generatePDFReport(
  student: Student,
  record: DailyRecord,
  settings: SchoolSettings,
  schedule: ScheduleItem[]
): Promise<Uint8Array> {
  try {
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

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    
    const margin = 45;
    const contentWidth = width - (margin * 2);
    let cursorY = height - 35;

    // Safe settings with defaults from system
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
      classGrades: settings.classGrades || [],
      ...settings
    };

    // Date formatting
    const reportDate = record.date ? new Date(record.date) : new Date();
    const dateStr = reportDate.toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const dayName = reportDate.toLocaleDateString('ar-SA', { weekday: 'long' });

    // ================= HEADER SECTION =================
    page.drawRectangle({
      x: 0,
      y: height - 140,
      width: width,
      height: 140,
      color: COLORS.white,
    });

    // Right side - Kingdom info (all from settings)
    const headerTexts = [
      { text: 'المملكة العربية السعودية', bold: false },
      { text: safeSettings.ministry, bold: false },
      { text: safeSettings.region, bold: false },
      { text: safeSettings.name, bold: true }
    ];

    let rightY = cursorY;
    for (let i = 0; i < headerTexts.length; i++) {
      const item = headerTexts[i];
      const img = await textToImage(item.text, {
        fontSize: i === 3 ? 11 : 10,
        color: i === 3 ? '#2D3748' : '#718096',
        align: 'right',
        isBold: item.bold
      });
      const emb = await pdfDoc.embedPng(img.buffer);
      page.drawImage(emb, {
        x: width - margin - img.width,
        y: rightY,
        width: img.width,
        height: img.height
      });
      rightY -= 18;
    }

    // Left side - Report info and date
    const reportTitleImg = await textToImage('تقرير متابعة يومي', {
      fontSize: 16, color: '#17496D', align: 'left', isBold: true
    });
    const reportTitleEmb = await pdfDoc.embedPng(reportTitleImg.buffer);
    
    let leftY = cursorY;
    page.drawImage(reportTitleEmb, {
      x: margin,
      y: leftY + 5,
      width: reportTitleImg.width,
      height: reportTitleImg.height
    });
    
    // Draw underline for title
    page.drawLine({
      start: { x: margin, y: leftY + 3 },
      end: { x: margin + reportTitleImg.width, y: leftY + 3 },
      thickness: 3,
      color: COLORS.titleUnderline
    });

    // Date info - Top Left
    leftY -= 30;
    const dateInfoImg = await textToImage(`${dayName}\n${dateStr}`, {
      fontSize: 10, color: '#718096', align: 'left', isBold: false
    });
    const dateInfoEmb = await pdfDoc.embedPng(dateInfoImg.buffer);
    page.drawImage(dateInfoEmb, {
      x: margin,
      y: leftY,
      width: dateInfoImg.width,
      height: dateInfoImg.height
    });
    
    // Phone - Bottom Left (from settings)
    if (safeSettings.whatsappPhone) {
      leftY -= 25;
      const phoneImg = await textToImage(`📞 ${safeSettings.whatsappPhone}`, {
        fontSize: 9, color: '#A0AEC0', align: 'left', isBold: false
      });
      const phoneEmb = await pdfDoc.embedPng(phoneImg.buffer);
      page.drawImage(phoneEmb, {
        x: margin,
        y: leftY,
        width: phoneImg.width,
        height: phoneImg.height
      });
    }

    // Center - Logo (from settings)
    if (safeSettings.logoUrl) {
      const logo = await loadImage(pdfDoc, safeSettings.logoUrl);
      if (logo) {
        const logoSize = 65;
        const logoX = width / 2 - logoSize / 2;
        const logoY = cursorY - 15;
        
        const logoDims = logo.scale(1);
        const logoAspectRatio = logoDims.width / logoDims.height;
        let finalLogoWidth = logoSize;
        let finalLogoHeight = logoSize;
        
        if (logoAspectRatio > 1) {
          finalLogoHeight = logoSize / logoAspectRatio;
        } else {
          finalLogoWidth = logoSize * logoAspectRatio;
        }
        
        const adjustedLogoX = logoX + (logoSize - finalLogoWidth) / 2;
        const adjustedLogoY = logoY + (logoSize - finalLogoHeight) / 2;
        
        page.drawImage(logo, {
          x: adjustedLogoX,
          y: adjustedLogoY,
          width: finalLogoWidth,
          height: finalLogoHeight,
        });
      }
    }

    // ================= STUDENT INFO CARD =================
    cursorY -= 110;
    const cardHeight = 100;
    
    // Main card background
    page.drawRectangle({
      x: margin,
      y: cursorY - cardHeight,
      width: contentWidth,
      height: cardHeight,
      color: COLORS.studentCardBg,
      borderColor: COLORS.studentCardBorder,
      borderWidth: 1,
    });
    
    // Left accent bar
    page.drawRectangle({
      x: margin,
      y: cursorY - cardHeight,
      width: 4,
      height: cardHeight,
      color: COLORS.studentCardAccent,
    });

    // Student info - Right side (all from student object)
    const studentInfoTexts = [
      { label: 'الاسم الرباعي', value: student.name },
      { label: 'الفصل', value: student.classGrade || '-' },
      { label: 'جوال ولي الأمر', value: student.parentPhone || '-' },
      { label: 'رقم الملف', value: student.studentNumber || '-' }
    ];

    let infoY = cursorY - 15;
    for (const info of studentInfoTexts) {
      const labelImg = await textToImage(info.label, {
        fontSize: 10, color: '#718096', align: 'right', isBold: false
      });
      const valueImg = await textToImage(info.value, {
        fontSize: 11, color: '#2D3748', align: 'right', isBold: true
      });
      
      const labelEmb = await pdfDoc.embedPng(labelImg.buffer);
      const valueEmb = await pdfDoc.embedPng(valueImg.buffer);
      
      const infoRightX = width - margin - 15;
      page.drawImage(labelEmb, {
        x: infoRightX - labelImg.width,
        y: infoY,
        width: labelImg.width,
        height: labelImg.height
      });
      
      page.drawImage(valueEmb, {
        x: infoRightX - labelImg.width - valueImg.width - 10,
        y: infoY,
        width: valueImg.width,
        height: valueImg.height
      });
      
      infoY -= 20;
    }

    // Left side - Status badge with icon (from record)
    const statusCircleX = margin + 55;
    const statusCircleY = cursorY - cardHeight / 2;
    const statusCircleSize = 60;
    
    page.drawCircle({
      x: statusCircleX,
      y: statusCircleY,
      size: statusCircleSize / 2,
      color: COLORS.white,
      borderColor: COLORS.studentCardBorder,
      borderWidth: 2,
    });
    
    // Status text in circle (from record.attendance)
    const statusLabel = getStatusText(record.attendance, 'attendance');
    const statusIcon = record.attendance === 'present' ? '✓' : record.attendance === 'excused' ? '⚠' : '✗';
    const statusColor = record.attendance === 'present' ? '#0D9488' : record.attendance === 'excused' ? '#F59E0B' : '#EF4444';
    
    const statusTextImg = await textToImage(`${statusIcon}\n${statusLabel}`, {
      fontSize: 11, color: statusColor, align: 'center', isBold: true
    });
    const statusTextEmb = await pdfDoc.embedPng(statusTextImg.buffer);
    page.drawImage(statusTextEmb, {
      x: statusCircleX - statusTextImg.width / 2,
      y: statusCircleY - statusTextImg.height / 2,
      width: statusTextImg.width,
      height: statusTextImg.height
    });

    // ================= SUMMARY SECTION =================
    cursorY -= (cardHeight + 30);
    
    // Title with star icon
    const summaryTitleImg = await textToImage('ملخص الأداء والمستوى اليومي', {
      fontSize: 13, color: '#2D3748', align: 'right', isBold: true
    });
    const summaryTitleEmb = await pdfDoc.embedPng(summaryTitleImg.buffer);
    page.drawImage(summaryTitleEmb, {
      x: width - margin - summaryTitleImg.width - 25,
      y: cursorY,
      width: summaryTitleImg.width,
      height: summaryTitleImg.height
    });
    
    await drawStar(pdfDoc, page, width - margin - 12, cursorY + 7, 14, { r: 0.8, g: 0.6, b: 0.2 });

    cursorY -= 30;
    const summaryBoxHeight = 70;
    const summaryBoxWidth = (contentWidth - 30) / 4;

    // Summary items (all from record)
    const summaryItems = [
      { label: 'الحضور', value: getStatusText(record.attendance, 'attendance'), icon: '✓' },
      { label: 'المشاركة', value: record.participation && record.participation !== 'none' ? getStatusText(record.participation, 'academic') : '-', icon: '📊' },
      { label: 'الواجبات', value: record.homework && record.homework !== 'none' ? getStatusText(record.homework, 'academic') : '-', icon: '📝' },
      { label: 'السلوك', value: record.behavior && record.behavior !== 'none' ? getStatusText(record.behavior, 'academic') : '-', icon: '⭐' }
    ];

    let summaryX = width - margin;
    for (const item of summaryItems) {
      page.drawRectangle({
        x: summaryX - summaryBoxWidth,
        y: cursorY - summaryBoxHeight,
        width: summaryBoxWidth - 10,
        height: summaryBoxHeight,
        color: COLORS.summaryBoxBg,
        borderColor: COLORS.summaryBoxBorder,
        borderWidth: 1,
      });
      
      const labelImg = await textToImage(item.label, {
        fontSize: 10, color: '#718096', align: 'center', isBold: false
      });
      const valueImg = await textToImage(item.value, {
        fontSize: 12, color: '#0D9488', align: 'center', isBold: true
      });
      
      const labelEmb = await pdfDoc.embedPng(labelImg.buffer);
      const valueEmb = await pdfDoc.embedPng(valueImg.buffer);
      
      const boxCenterX = summaryX - summaryBoxWidth / 2 - 5;
      
      page.drawImage(labelEmb, {
        x: boxCenterX - labelImg.width / 2,
        y: cursorY - 20,
        width: labelImg.width,
        height: labelImg.height
      });
      
      page.drawImage(valueEmb, {
        x: boxCenterX - valueImg.width / 2,
        y: cursorY - 45,
        width: valueImg.width,
        height: valueImg.height
      });
      
      summaryX -= summaryBoxWidth;
    }

    // ================= TABLE SECTION =================
    cursorY -= (summaryBoxHeight + 30);
    
    // Title with clipboard icon
    const tableTitleImg = await textToImage('كشف المتابعة والحصص الدراسية', {
      fontSize: 13, color: '#2D3748', align: 'right', isBold: true
    });
    const tableTitleEmb = await pdfDoc.embedPng(tableTitleImg.buffer);
    page.drawImage(tableTitleEmb, {
      x: width - margin - tableTitleImg.width - 25,
      y: cursorY,
      width: tableTitleImg.width,
      height: tableTitleImg.height
    });
    
    await drawClipboard(pdfDoc, page, width - margin - 12, cursorY + 7, 14, { r: 0.0, g: 0.74, b: 0.65 });

    cursorY -= 35;
    // Filter schedule for the day (from schedule prop)
    const dailySchedule = schedule.filter(s => s.day === dayName).sort((a, b) => a.period - b.period);
    
    const tableY = cursorY;
    const rowHeight = 35;
    const headerHeight = 40;
    const numRows = Math.min(dailySchedule.length, 7);
    
    const colWidths = {
      serial: contentWidth * 0.08,
      subject: contentWidth * 0.22,
      teacher: contentWidth * 0.20,
      attendance: contentWidth * 0.125,
      homework: contentWidth * 0.125,
      participation: contentWidth * 0.125,
      behavior: contentWidth * 0.125,
    };

    const headers = [
      { text: 'م', width: colWidths.serial },
      { text: 'المادة', width: colWidths.subject },
      { text: 'المعلم', width: colWidths.teacher },
      { text: 'الحضور', width: colWidths.attendance },
      { text: 'الواجبات', width: colWidths.homework },
      { text: 'المشاركة', width: colWidths.participation },
      { text: 'السلوك', width: colWidths.behavior },
    ];

    // Draw table header
    let headerX = width - margin;
    for (const header of headers) {
      page.drawRectangle({
        x: headerX - header.width,
        y: tableY - headerHeight,
        width: header.width,
        height: headerHeight,
        color: COLORS.tableHeaderBg,
      });
      
      const hImg = await textToImage(header.text, {
        fontSize: 11,
        color: '#4A5568',
        align: 'center',
        isBold: true,
        maxWidth: header.width - 10
      });
      const hEmb = await pdfDoc.embedPng(hImg.buffer);
      
      page.drawImage(hEmb, {
        x: headerX - header.width / 2 - hImg.width / 2,
        y: tableY - headerHeight / 2 - hImg.height / 2,
        width: hImg.width,
        height: hImg.height
      });
      
      if (headerX < width - margin) {
        page.drawLine({
          start: { x: headerX, y: tableY },
          end: { x: headerX, y: tableY - headerHeight },
          thickness: 1,
          color: COLORS.tableBorder
        });
      }
      
      headerX -= header.width;
    }

    // Draw bottom border of header
    page.drawLine({
      start: { x: margin, y: tableY - headerHeight },
      end: { x: width - margin, y: tableY - headerHeight },
      thickness: 1.5,
      color: COLORS.tableBorder
    });

    // Draw rows (using schedule and record data)
    let rowY = tableY - headerHeight;
    for (let i = 0; i < numRows; i++) {
      const session = dailySchedule[i];
      const isEven = i % 2 === 0;
      
      page.drawRectangle({
        x: margin,
        y: rowY - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: isEven ? COLORS.tableRowEven : COLORS.tableRowOdd,
      });

      page.drawLine({
        start: { x: margin, y: rowY - rowHeight },
        end: { x: width - margin, y: rowY - rowHeight },
        thickness: 0.5,
        color: COLORS.tableBorder
      });

      let cellX = width - margin;
      
      // Serial number (from schedule.period)
      const serialNum = String(session.period);
      const serialImg = await textToImage(serialNum, {
        fontSize: 11, color: '#2D3748', align: 'center', isBold: true
      });
      const serialEmb = await pdfDoc.embedPng(serialImg.buffer);
      page.drawImage(serialEmb, {
        x: cellX - colWidths.serial / 2 - serialImg.width / 2,
        y: rowY - rowHeight / 2 - serialImg.height / 2,
        width: serialImg.width,
        height: serialImg.height
      });
      cellX -= colWidths.serial;

      // Subject (from schedule.subject)
      const subjectText = session.subject || '-';
      const subjectImg = await textToImage(subjectText, {
        fontSize: 11, color: '#2D3748', align: 'right', maxWidth: colWidths.subject - 15, isBold: true
      });
      const subjectEmb = await pdfDoc.embedPng(subjectImg.buffer);
      page.drawImage(subjectEmb, {
        x: cellX - subjectImg.width - 8,
        y: rowY - rowHeight / 2 - subjectImg.height / 2,
        width: subjectImg.width,
        height: subjectImg.height
      });
      cellX -= colWidths.subject;

      // Teacher (from schedule.teacher)
      const teacherText = session.teacher || '-';
      const teacherImg = await textToImage(teacherText, {
        fontSize: 10, color: '#718096', align: 'right', maxWidth: colWidths.teacher - 15
      });
      const teacherEmb = await pdfDoc.embedPng(teacherImg.buffer);
      page.drawImage(teacherEmb, {
        x: cellX - teacherImg.width - 8,
        y: rowY - rowHeight / 2 - teacherImg.height / 2,
        width: teacherImg.width,
        height: teacherImg.height
      });
      cellX -= colWidths.teacher;

      // Attendance (from record.attendance)
      if (record.attendance === 'present') {
        const attendanceText = getStatusText(record.attendance, 'attendance');
        const attendanceColor = getStatusBadgeColor(record.attendance, 'attendance');
        await drawStatusBadge(
          pdfDoc, page, attendanceText, attendanceColor,
          cellX - colWidths.attendance / 2, rowY - rowHeight / 2, 50
        );
      }
      cellX -= colWidths.attendance;

      // Homework (from record.homework)
      if (record.attendance === 'present' && record.homework && record.homework !== 'none') {
        const homeworkText = getStatusText(record.homework, 'academic');
        const homeworkColor = getStatusBadgeColor(record.homework, 'academic');
        await drawStatusBadge(
          pdfDoc, page, homeworkText, homeworkColor,
          cellX - colWidths.homework / 2, rowY - rowHeight / 2, 50
        );
      }
      cellX -= colWidths.homework;

      // Participation (from record.participation)
      if (record.attendance === 'present' && record.participation && record.participation !== 'none') {
        const participationText = getStatusText(record.participation, 'academic');
        const participationColor = getStatusBadgeColor(record.participation, 'academic');
        await drawStatusBadge(
          pdfDoc, page, participationText, participationColor,
          cellX - colWidths.participation / 2, rowY - rowHeight / 2, 50
        );
      }
      cellX -= colWidths.participation;

      // Behavior (from record.behavior)
      if (record.attendance === 'present' && record.behavior && record.behavior !== 'none') {
        const behaviorText = getStatusText(record.behavior, 'academic');
        const behaviorColor = getStatusBadgeColor(record.behavior, 'academic');
        await drawStatusBadge(
          pdfDoc, page, behaviorText, behaviorColor,
          cellX - colWidths.behavior / 2, rowY - rowHeight / 2, 50
        );
      }
      cellX -= colWidths.behavior;

      rowY -= rowHeight;
    }

    // ================= FOOTER SECTION =================
    const footerY = 50;
    const footerHeight = 50;
    
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: footerY + footerHeight,
      color: COLORS.footerBg,
    });
    
    page.drawLine({
      start: { x: 0, y: footerY + footerHeight },
      end: { x: width, y: footerY + footerHeight },
      thickness: 1,
      color: COLORS.footerBorder
    });

    // Footer left - School manager signature
    const managerTitleImg = await textToImage('مدير المدرسة', {
      fontSize: 10, color: '#718096', align: 'left', isBold: false
    });
    const managerTitleEmb = await pdfDoc.embedPng(managerTitleImg.buffer);
    page.drawImage(managerTitleEmb, {
      x: margin,
      y: footerY + 25,
      width: managerTitleImg.width,
      height: managerTitleImg.height
    });

    // Footer right - Educational affairs signature
    const affairsTitleImg = await textToImage('وكيل الشؤون التعليمية', {
      fontSize: 10, color: '#718096', align: 'right', isBold: false
    });
    const affairsTitleEmb = await pdfDoc.embedPng(affairsTitleImg.buffer);
    page.drawImage(affairsTitleEmb, {
      x: width - margin - affairsTitleImg.width,
      y: footerY + 25,
      width: affairsTitleImg.width,
      height: affairsTitleImg.height
    });

    // Footer center - Stamp placeholder
    const stampImg = await textToImage('مكان الختم', {
      fontSize: 9, color: '#A0AEC0', align: 'center', isBold: false
    });
    const stampEmb = await pdfDoc.embedPng(stampImg.buffer);
    
    page.drawRectangle({
      x: width / 2 - 40,
      y: footerY + 15,
      width: 80,
      height: 35,
      borderColor: rgb(0.85, 0.87, 0.89),
      borderWidth: 1,
      borderDashArray: [3, 3],
    });
    
    page.drawImage(stampEmb, {
      x: width / 2 - stampImg.width / 2,
      y: footerY + 28,
      width: stampImg.width,
      height: stampImg.height
    });

    return await pdfDoc.save();
  } catch (error) {
    console.error('PDF Generation Error:', error);
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
) {
  try {
    const pdfBytes = await generatePDFReport(student, record, settings, schedule);
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `تقرير_${student.name}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (e) {
    console.error('Download failed', e);
    throw e;
  }
}
