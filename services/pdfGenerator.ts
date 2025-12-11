import { PDFDocument, rgb, PDFPage } from 'pdf-lib';
import { Student, DailyRecord, SchoolSettings, ScheduleItem } from '../types';
import { getStatusLabel } from '../constants';

// --- Configuration ---
const ARABIC_FONT_STACK = '"Cairo", "Tajawal", "IBM Plex Sans Arabic", "Segoe UI", "Arial", sans-serif';

// --- Color Palette matching the design ---
const COLORS = {
  primary: rgb(0.09, 0.29, 0.49),
  primaryLight: rgb(0.2, 0.45, 0.65),
  accent: rgb(0.0, 0.74, 0.65),
  white: rgb(1, 1, 1),
  pageBackground: rgb(0.98, 0.98, 0.99),
  studentInfoBg: rgb(0.95, 0.97, 0.99),
  studentInfoBorder: rgb(0.85, 0.91, 0.96),
  headerPrimary: rgb(0.09, 0.29, 0.49),
  headerAttendance: rgb(0.0, 0.74, 0.65),
  headerHomework: rgb(1.0, 0.60, 0.20),
  headerParticipation: rgb(0.55, 0.27, 0.77),
  headerBehavior: rgb(0.29, 0.69, 0.31),
  tableRowEven: rgb(1, 1, 1),
  tableRowOdd: rgb(0.98, 0.99, 1.0),
  borderLight: rgb(0.93, 0.94, 0.95),
  textPrimary: rgb(0.13, 0.13, 0.13),
  textSecondary: rgb(0.45, 0.45, 0.45),
  textLight: rgb(0.62, 0.62, 0.62),
  messageBoxBg: rgb(0.95, 0.99, 0.97),
  messageBoxBorder: rgb(0.8, 0.94, 0.88),
  graphBoxBg: rgb(0.97, 0.96, 0.99),
  graphBoxBorder: rgb(0.88, 0.85, 0.92),
  footerBg: rgb(0.09, 0.29, 0.49),
  footerText: rgb(0.95, 0.95, 0.95),
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
 * Draw checkmark symbol
 */
async function drawCheckmark(
  pdfDoc: PDFDocument,
  page: PDFPage,
  x: number,
  y: number,
  size: number,
  color: { r: number; g: number; b: number }
) {
  const checkImg = await textToImage('✓', {
    fontSize: size,
    color: `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`,
    align: 'center',
    isBold: true
  });
  const checkEmb = await pdfDoc.embedPng(checkImg.buffer);
  page.drawImage(checkEmb, {
    x: x - checkImg.width / 2,
    y: y - checkImg.height / 2,
    width: checkImg.width,
    height: checkImg.height
  });
}

/**
 * Load image from URL
 */
async function loadImage(pdfDoc: PDFDocument, imageUrl: string): Promise<any> {
  try {
    if (!imageUrl) return null;
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const imageBytes = new Uint8Array(arrayBuffer);
    
    if (imageUrl.toLowerCase().endsWith('.png')) {
      return await pdfDoc.embedPng(imageBytes);
    } else {
      return await pdfDoc.embedJpg(imageBytes);
    }
  } catch (error) {
    console.warn('Error loading image:', error);
    return null;
  }
}

/**
 * Get status text in Arabic (using system constants)
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
    // Use getStatusLabel from constants
    return getStatusLabel(status) || '-';
  }
}

/**
 * Get status badge color
 */
function getStatusBadgeColor(status: string, type: 'attendance' | 'academic'): { r: number; g: number; b: number } {
  if (type === 'attendance') {
    switch(status) {
      case 'present': return { r: 0.0, g: 0.74, b: 0.65 }; // Teal
      case 'excused': return { r: 0.95, g: 0.75, b: 0.3 }; // Yellow
      case 'absent': return { r: 0.95, g: 0.4, b: 0.4 }; // Red
      default: return { r: 0.7, g: 0.7, b: 0.7 }; // Gray
    }
  } else {
    switch(status) {
      case 'excellent': return { r: 0.29, g: 0.69, b: 0.31 }; // Green
      case 'good': return { r: 0.4, g: 0.7, b: 0.9 }; // Blue
      case 'average': return { r: 0.95, g: 0.75, b: 0.3 }; // Yellow
      case 'poor': return { r: 0.95, g: 0.4, b: 0.4 }; // Red
      default: return { r: 0.7, g: 0.7, b: 0.7 }; // Gray
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
  height: number = 22
) {
  // Draw badge background
  page.drawRectangle({
    x: x - width / 2,
    y: y - height / 2,
    width: width,
    height: height,
    color: rgb(color.r, color.g, color.b),
    borderColor: rgb(color.r, color.g, color.b),
    borderWidth: 1,
  });

  // Draw badge text
  const badgeTextImg = await textToImage(text, {
    fontSize: 9, color: '#FFFFFF', align: 'center', isBold: true, maxWidth: width - 5
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
 * Generate PDF Report with dynamic data from system
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
      slogan: settings.slogan || 'التميز .. غايتنا',
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
    
    page.drawRectangle({
      x: 0,
      y: height - 144,
      width: width,
      height: 4,
      color: COLORS.accent,
    });

    // Top Right: Kingdom, Ministry, Region, School (from settings)
    const kingdomText = 'المملكة العربية السعودية';
    const ministryText = safeSettings.ministry;
    const regionText = safeSettings.region;
    const schoolNameText = safeSettings.name;

    const kingdomImg = await textToImage(kingdomText, {
      fontSize: 11, color: '#17496D', align: 'right', isBold: true
    });
    const ministryImg = await textToImage(ministryText, {
      fontSize: 10, color: '#2B2B2B', align: 'right', isBold: true
    });
    const regionImg = await textToImage(regionText, {
      fontSize: 9, color: '#737373', align: 'right'
    });
    const schoolNameImg = await textToImage(schoolNameText, {
      fontSize: 12, color: '#17496D', align: 'right', isBold: true
    });

    const kEmb = await pdfDoc.embedPng(kingdomImg.buffer);
    const mEmb = await pdfDoc.embedPng(ministryImg.buffer);
    const rEmb = await pdfDoc.embedPng(regionImg.buffer);
    const sEmb = await pdfDoc.embedPng(schoolNameImg.buffer);

    let rightY = cursorY;
    page.drawImage(kEmb, { x: width - margin - kingdomImg.width, y: rightY, width: kingdomImg.width, height: kingdomImg.height });
    rightY -= 20;
    page.drawImage(mEmb, { x: width - margin - ministryImg.width, y: rightY, width: ministryImg.width, height: ministryImg.height });
    rightY -= 18;
    page.drawImage(rEmb, { x: width - margin - regionImg.width, y: rightY, width: regionImg.width, height: regionImg.height });
    rightY -= 20;
    page.drawImage(sEmb, { x: width - margin - schoolNameImg.width, y: rightY, width: schoolNameImg.width, height: schoolNameImg.height });

    // Top Left: Report Title and Date
    const reportTitle = 'المتابعة اليومي';
    const reportTitleImg = await textToImage(reportTitle, {
      fontSize: 16, color: '#17496D', align: 'left', isBold: true
    });
    const dateInfoImg = await textToImage(`${dayName} - ${dateStr}`, {
      fontSize: 10, color: '#737373', align: 'left', isBold: false
    });

    const rtEmb = await pdfDoc.embedPng(reportTitleImg.buffer);
    const diEmb = await pdfDoc.embedPng(dateInfoImg.buffer);

    let leftY = cursorY;
    page.drawImage(rtEmb, { x: margin, y: leftY, width: reportTitleImg.width, height: reportTitleImg.height });
    leftY -= 22;
    page.drawImage(diEmb, { x: margin, y: leftY, width: dateInfoImg.width, height: dateInfoImg.height });

    // Center: Logo (from settings)
    if (safeSettings.logoUrl) {
      const logo = await loadImage(pdfDoc, safeSettings.logoUrl);
      if (logo) {
        const logoSize = 70;
        const logoX = width / 2 - logoSize / 2;
        const logoY = cursorY - 25;
        
        page.drawRectangle({
          x: logoX - 3,
          y: logoY - 3,
          width: logoSize + 6,
          height: logoSize + 6,
          color: rgb(0.95, 0.95, 0.95),
        });
        
        page.drawImage(logo, {
          x: logoX,
          y: logoY,
          width: logoSize,
          height: logoSize,
        });
      }
    }

    // ================= STUDENT INFO CARD =================
    cursorY -= 120;
    const cardHeight = 55;
    
    page.drawRectangle({
      x: margin + 2,
      y: cursorY - cardHeight - 2,
      width: contentWidth,
      height: cardHeight,
      color: rgb(0.92, 0.92, 0.93),
    });
    
    page.drawRectangle({
      x: margin,
      y: cursorY - cardHeight,
      width: contentWidth,
      height: cardHeight,
      color: COLORS.studentInfoBg,
      borderColor: COLORS.studentInfoBorder,
      borderWidth: 1.5,
    });
    
    page.drawRectangle({
      x: margin,
      y: cursorY - cardHeight,
      width: 5,
      height: cardHeight,
      color: COLORS.accent,
    });

    // Student info (from student object)
    const studentNameText = `أسم الطالب : ${student.name}`;
    const phoneText = `رقم الجوال : ${student.parentPhone || '-'}`;

    const nameImg = await textToImage(studentNameText, {
      fontSize: 12, color: '#2B2B2B', align: 'right', isBold: true
    });
    const phoneImg = await textToImage(phoneText, {
      fontSize: 11, color: '#737373', align: 'right'
    });

    const nameEmb = await pdfDoc.embedPng(nameImg.buffer);
    const phoneEmb = await pdfDoc.embedPng(phoneImg.buffer);

    let infoY = cursorY - 18;
    const infoRightX = width - margin - 15;
    
    page.drawImage(nameEmb, { 
      x: infoRightX - nameImg.width, 
      y: infoY, 
      width: nameImg.width, 
      height: nameImg.height 
    });
    
    infoY -= 18;
    page.drawImage(phoneEmb, { 
      x: infoRightX - phoneImg.width, 
      y: infoY, 
      width: phoneImg.width, 
      height: phoneImg.height 
    });

    // ================= TABLE =================
    cursorY -= (cardHeight + 25);
    
    // Filter schedule for the day (from schedule prop)
    const dailySchedule = schedule.filter(s => s.day === dayName).sort((a, b) => a.period - b.period);
    
    const tableY = cursorY;
    const rowHeight = 38;
    const headerHeight = 45;
    const numRows = Math.min(dailySchedule.length, 7);
    
    const colWidths = {
      serial: contentWidth * 0.07,
      subject: contentWidth * 0.23,
      teacher: contentWidth * 0.18,
      attendance: contentWidth * 0.13,
      homework: contentWidth * 0.13,
      participation: contentWidth * 0.13,
      behavior: contentWidth * 0.13,
    };

    // Table headers
    const headers = [
      { text: 'م', width: colWidths.serial, bg: COLORS.headerPrimary, textColor: '#FFFFFF' },
      { text: 'المادة ( الجدول )', width: colWidths.subject, bg: COLORS.headerPrimary, textColor: '#FFFFFF' },
      { text: 'اسم المعلم', width: colWidths.teacher, bg: COLORS.headerPrimary, textColor: '#FFFFFF' },
      { text: 'الحضور', width: colWidths.attendance, bg: COLORS.headerAttendance, textColor: '#FFFFFF' },
      { text: 'الواجبات', width: colWidths.homework, bg: COLORS.headerHomework, textColor: '#FFFFFF' },
      { text: 'المشاركة', width: colWidths.participation, bg: COLORS.headerParticipation, textColor: '#FFFFFF' },
      { text: 'السلوك', width: colWidths.behavior, bg: COLORS.headerBehavior, textColor: '#FFFFFF' },
    ];

    // Draw headers
    let headerX = width - margin;
    for (const header of headers) {
      page.drawRectangle({
        x: headerX - header.width,
        y: tableY - headerHeight,
        width: header.width,
        height: headerHeight,
        color: header.bg,
      });
      
      const hImg = await textToImage(header.text, {
        fontSize: 11, 
        color: header.textColor, 
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
          color: rgb(1, 1, 1),
          opacity: 0.3
        });
      }
      
      headerX -= header.width;
    }

    // Draw rows (using record data - not sessions)
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
        color: COLORS.borderLight
      });

      let cellX = width - margin;
      
      // Serial number (period from schedule)
      const serialNum = String(session.period);
      const serialImg = await textToImage(serialNum, {
        fontSize: 11, color: '#FFFFFF', align: 'center', isBold: true
      });
      const serialEmb = await pdfDoc.embedPng(serialImg.buffer);
      
      const circleSize = 24;
      const circleX = cellX - colWidths.serial / 2;
      const circleY = rowY - rowHeight / 2;
      
      page.drawCircle({
        x: circleX,
        y: circleY,
        size: circleSize / 2,
        color: COLORS.primary,
      });
      
      page.drawImage(serialEmb, {
        x: circleX - serialImg.width / 2,
        y: circleY - serialImg.height / 2,
        width: serialImg.width,
        height: serialImg.height
      });
      cellX -= colWidths.serial;

      // Subject (from schedule)
      const subjectText = session.subject || '-';
      const subjectImg = await textToImage(subjectText, {
        fontSize: 11, color: '#2B2B2B', align: 'right', maxWidth: colWidths.subject - 15, isBold: true
      });
      const subjectEmb = await pdfDoc.embedPng(subjectImg.buffer);
      page.drawImage(subjectEmb, {
        x: cellX - subjectImg.width - 8,
        y: rowY - rowHeight / 2 - subjectImg.height / 2,
        width: subjectImg.width,
        height: subjectImg.height
      });
      cellX -= colWidths.subject;

      // Teacher (from schedule)
      const teacherText = session.teacher || '-';
      const teacherImg = await textToImage(teacherText, {
        fontSize: 10, color: '#737373', align: 'right', maxWidth: colWidths.teacher - 15
      });
      const teacherEmb = await pdfDoc.embedPng(teacherImg.buffer);
      page.drawImage(teacherEmb, {
        x: cellX - teacherImg.width - 8,
        y: rowY - rowHeight / 2 - teacherImg.height / 2,
        width: teacherImg.width,
        height: teacherImg.height
      });
      cellX -= colWidths.teacher;

      // Attendance (from record.attendance - applies to all sessions if present)
      if (record.attendance === 'present') {
        await drawCheckmark(pdfDoc, page, cellX - colWidths.attendance / 2, rowY - rowHeight / 2, 14, { r: 0.1, g: 0.6, b: 0.2 });
      }
      cellX -= colWidths.attendance;

      // Homework (from record.homework - only if present)
      if (record.attendance === 'present' && record.homework && record.homework !== 'none') {
        const homeworkText = getStatusText(record.homework, 'academic');
        const homeworkColor = getStatusBadgeColor(record.homework, 'academic');
        await drawStatusBadge(
          pdfDoc, page, homeworkText, homeworkColor,
          cellX - colWidths.homework / 2, rowY - rowHeight / 2, 45
        );
      }
      cellX -= colWidths.homework;

      // Participation (from record.participation - only if present)
      if (record.attendance === 'present' && record.participation && record.participation !== 'none') {
        const participationText = getStatusText(record.participation, 'academic');
        const participationColor = getStatusBadgeColor(record.participation, 'academic');
        await drawStatusBadge(
          pdfDoc, page, participationText, participationColor,
          cellX - colWidths.participation / 2, rowY - rowHeight / 2, 55
        );
      }
      cellX -= colWidths.participation;

      // Behavior (from record.behavior - only if present)
      if (record.attendance === 'present' && record.behavior && record.behavior !== 'none') {
        const behaviorText = getStatusText(record.behavior, 'academic');
        const behaviorColor = getStatusBadgeColor(record.behavior, 'academic');
        await drawStatusBadge(
          pdfDoc, page, behaviorText, behaviorColor,
          cellX - colWidths.behavior / 2, rowY - rowHeight / 2, 55
        );
      }
      cellX -= colWidths.behavior;

      rowY -= rowHeight;
    }

    // ================= BOTTOM SECTION =================
    cursorY = rowY - 25;
    const boxHeight = 100;
    const boxWidth = (contentWidth - 15) / 2;

    // Left box: Counselor message (from settings.reportGeneralMessage)
    if (safeSettings.reportGeneralMessage) {
      page.drawRectangle({
        x: margin + 1,
        y: cursorY - boxHeight - 1,
        width: boxWidth,
        height: boxHeight,
        color: rgb(0.90, 0.90, 0.91),
      });
      
      page.drawRectangle({
        x: margin,
        y: cursorY - boxHeight,
        width: boxWidth,
        height: boxHeight,
        color: COLORS.messageBoxBg,
        borderColor: COLORS.messageBoxBorder,
        borderWidth: 1.5,
      });
      
      page.drawRectangle({
        x: margin,
        y: cursorY - 4,
        width: boxWidth,
        height: 4,
        color: COLORS.headerBehavior,
      });

      const counselorTitleText = 'رسالة الموجه الطلابي :';
      const counselorMessageText = safeSettings.reportGeneralMessage;

      const counselorTitleImg = await textToImage(counselorTitleText, {
        fontSize: 12, color: '#17496D', align: 'right', isBold: true
      });
      const counselorMsgImg = await textToImage(counselorMessageText, {
        fontSize: 10, color: '#2B2B2B', align: 'right', maxWidth: boxWidth - 25
      });

      const ctEmb = await pdfDoc.embedPng(counselorTitleImg.buffer);
      const cmEmb = await pdfDoc.embedPng(counselorMsgImg.buffer);

      page.drawImage(ctEmb, {
        x: margin + boxWidth - counselorTitleImg.width - 12,
        y: cursorY - 22,
        width: counselorTitleImg.width,
        height: counselorTitleImg.height
      });

      page.drawImage(cmEmb, {
        x: margin + boxWidth - counselorMsgImg.width - 12,
        y: cursorY - 48,
        width: counselorMsgImg.width,
        height: counselorMsgImg.height
      });
    }

    // Right box: Performance indicator
    page.drawRectangle({
      x: margin + boxWidth + 15 + 1,
      y: cursorY - boxHeight - 1,
      width: boxWidth,
      height: boxHeight,
      color: rgb(0.90, 0.90, 0.91),
    });
    
    page.drawRectangle({
      x: margin + boxWidth + 15,
      y: cursorY - boxHeight,
      width: boxWidth,
      height: boxHeight,
      color: COLORS.graphBoxBg,
      borderColor: COLORS.graphBoxBorder,
      borderWidth: 1.5,
    });
    
    page.drawRectangle({
      x: margin + boxWidth + 15,
      y: cursorY - 4,
      width: boxWidth,
      height: 4,
      color: COLORS.headerParticipation,
    });

    const performanceTitleText = 'الرسم البياني';
    const performanceSubText = 'مؤشر الأداء';

    const graphTitleImg = await textToImage(performanceTitleText, {
      fontSize: 12, color: '#17496D', align: 'right', isBold: true
    });
    
    const performanceTextImg = await textToImage(performanceSubText, {
      fontSize: 9, color: '#737373', align: 'center'
    });

    const gtEmb = await pdfDoc.embedPng(graphTitleImg.buffer);
    const ptEmb = await pdfDoc.embedPng(performanceTextImg.buffer);

    page.drawImage(gtEmb, {
      x: margin + boxWidth + 15 + boxWidth - graphTitleImg.width - 12,
      y: cursorY - 22,
      width: graphTitleImg.width,
      height: graphTitleImg.height
    });

    page.drawImage(ptEmb, {
      x: margin + boxWidth + 15 + boxWidth / 2 - performanceTextImg.width / 2,
      y: cursorY - boxHeight / 2 - performanceTextImg.height / 2,
      width: performanceTextImg.width,
      height: performanceTextImg.height
    });

    // ================= FOOTER =================
    const footerY = 40;
    const footerHeight = 35;
    
    page.drawRectangle({
      x: 0,
      y: footerY,
      width: width,
      height: footerHeight,
      color: COLORS.footerBg,
    });
    
    page.drawRectangle({
      x: 0,
      y: footerY + footerHeight,
      width: width,
      height: 2,
      color: COLORS.accent,
    });

    const platformName = 'منصة التتبع الالكتروني';
    const whatsappPhone = safeSettings.whatsappPhone || '-';
    const slogan = safeSettings.slogan || 'تميزكم ... غايتنا';
    
    const footerText = `يصدر هذا التقرير من ${platformName} - رقم واتساب المدرسة : ${whatsappPhone} - ${slogan}`;
    const footerImg = await textToImage(footerText, {
      fontSize: 9, color: '#F0F0F0', align: 'center', maxWidth: contentWidth
    });
    const footerEmb = await pdfDoc.embedPng(footerImg.buffer);
    
    page.drawImage(footerEmb, {
      x: width / 2 - footerImg.width / 2,
      y: footerY + footerHeight / 2 - footerImg.height / 2,
      width: footerImg.width,
      height: footerImg.height
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
