import { PDFDocument, rgb, PDFPage } from 'pdf-lib';
import { Student, DailyRecord, SchoolSettings, ScheduleItem } from '../types';

// --- Configuration ---
const ARABIC_FONT_STACK = '"Cairo", "Tajawal", "IBM Plex Sans Arabic", "Segoe UI", "Arial", sans-serif';

// --- Color Palette matching the design ---
const COLORS = {
  primary: rgb(0.08, 0.48, 0.65),
  white: rgb(1, 1, 1),
  lightBlue: rgb(0.9, 0.95, 1.0),      // Student info bar
  lightGreen: rgb(0.9, 0.98, 0.95),    // Counselor message box
  lightPurple: rgb(0.95, 0.92, 0.98),  // Graph box
  lightOrange: rgb(1.0, 0.96, 0.9),    // Homework column
  attendanceBlue: rgb(0.85, 0.92, 1.0), // Attendance column
  participationPurple: rgb(0.92, 0.88, 0.98), // Participation column
  behaviorGreen: rgb(0.9, 0.98, 0.95), // Behavior column
  tableRowEven: rgb(0.98, 0.98, 0.99),
  tableRowOdd: rgb(1, 1, 1),
  border: rgb(0.9, 0.9, 0.9),
  textDark: rgb(0.2, 0.2, 0.2),
  textGray: rgb(0.5, 0.5, 0.5),
  footerGray: rgb(0.95, 0.95, 0.95),
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
  // Draw checkmark as text image
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
 * Generate PDF Report matching the design
 */
export async function generatePDFReport(
  student: Student,
  record: DailyRecord,
  settings: SchoolSettings,
  schedule: ScheduleItem[]
): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    
    const margin = 40;
    const contentWidth = width - (margin * 2);
    let cursorY = height - 30;

    // ================= HEADER SECTION =================
    
    // Top Right: Kingdom, Ministry, Region, School Name
    const kingdomImg = await textToImage('المملكة العربية السعودية', {
      fontSize: 10, color: '#666666', align: 'right', isBold: true
    });
    const ministryImg = await textToImage(settings.ministry || 'وزارة التعليم', {
      fontSize: 10, color: '#333333', align: 'right', isBold: true
    });
    const regionImg = await textToImage(settings.region || 'الإدارة العامة للتعليم', {
      fontSize: 10, color: '#333333', align: 'right'
    });
    const schoolNameImg = await textToImage(settings.name || 'المدرسة', {
      fontSize: 11, color: '#143C55', align: 'right', isBold: true
    });

    const kEmb = await pdfDoc.embedPng(kingdomImg.buffer);
    const mEmb = await pdfDoc.embedPng(ministryImg.buffer);
    const rEmb = await pdfDoc.embedPng(regionImg.buffer);
    const sEmb = await pdfDoc.embedPng(schoolNameImg.buffer);

    let rightY = cursorY;
    page.drawImage(kEmb, { x: width - margin - kEmb.width, y: rightY, width: kEmb.width, height: kEmb.height });
    rightY -= 18;
    page.drawImage(mEmb, { x: width - margin - mEmb.width, y: rightY, width: mEmb.width, height: mEmb.height });
    rightY -= 18;
    page.drawImage(rEmb, { x: width - margin - rEmb.width, y: rightY, width: rEmb.width, height: rEmb.height });
    rightY -= 18;
    page.drawImage(sEmb, { x: width - margin - sEmb.width, y: rightY, width: sEmb.width, height: sEmb.height });

    // Top Left: Date, Day, Report Title - Simplified to match image
    const reportDate = record.date ? new Date(record.date) : new Date();
    const dateStr = reportDate.toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const dayName = reportDate.toLocaleDateString('ar-SA', { weekday: 'long' });
    
    const reportTitleImg = await textToImage('المتابعة اليومي', {
      fontSize: 14, color: '#143C55', align: 'left', isBold: true
    });
    const schoolNameTitleImg = await textToImage(settings.name || 'المدرسة', {
      fontSize: 12, color: '#143C55', align: 'left', isBold: true
    });

    const rtEmb = await pdfDoc.embedPng(reportTitleImg.buffer);
    const sntEmb = await pdfDoc.embedPng(schoolNameTitleImg.buffer);

    let leftY = cursorY;
    page.drawImage(rtEmb, { x: margin, y: leftY, width: rtEmb.width, height: rtEmb.height });
    leftY -= 20;
    page.drawImage(sntEmb, { x: margin, y: leftY, width: sntEmb.width, height: sntEmb.height });

    // Center: Logo
    if (settings.logoUrl) {
      const logo = await loadImage(pdfDoc, settings.logoUrl);
      if (logo) {
        const logoSize = 60;
        page.drawImage(logo, {
          x: width / 2 - logoSize / 2,
          y: cursorY - 20,
          width: logoSize,
          height: logoSize,
        });
      }
    }

    // ================= STUDENT INFO BAR =================
    cursorY -= 100;
    const infoBarHeight = 35;
    
    // Light blue bar
    page.drawRectangle({
      x: margin,
      y: cursorY - infoBarHeight,
      width: contentWidth,
      height: infoBarHeight,
      color: COLORS.lightBlue,
    });

    // Student info text - Only name and phone (matching the image)
    const studentNameText = `أسم الطالب : ${student.name}`;
    const phoneText = `رقم الجوال : ${student.parentPhone || '-'}`;

    const nameImg = await textToImage(studentNameText, {
      fontSize: 11, color: '#333333', align: 'right', isBold: true
    });
    const phoneImg = await textToImage(phoneText, {
      fontSize: 11, color: '#333333', align: 'right'
    });

    const nameEmb = await pdfDoc.embedPng(nameImg.buffer);
    const phoneEmb = await pdfDoc.embedPng(phoneImg.buffer);

    let infoY = cursorY - 20;
    page.drawImage(nameEmb, { x: width - margin - nameEmb.width, y: infoY, width: nameEmb.width, height: nameEmb.height });
    infoY -= 15;
    page.drawImage(phoneEmb, { x: width - margin - phoneEmb.width, y: infoY, width: phoneEmb.width, height: phoneEmb.height });

    // ================= MAIN TABLE =================
    cursorY -= (infoBarHeight + 30);
    
    // Filter schedule for the day
    const dailySchedule = schedule.filter(s => s.day === dayName).sort((a, b) => a.period - b.period);
    
    const tableY = cursorY;
    const rowHeight = 35;
    const headerHeight = 40;
    const numRows = Math.min(dailySchedule.length, 7);
    
    // Column widths
    const colWidths = {
      serial: contentWidth * 0.08,
      subject: contentWidth * 0.22,
      teacher: contentWidth * 0.18,
      attendance: contentWidth * 0.13,
      homework: contentWidth * 0.13,
      participation: contentWidth * 0.13,
      behavior: contentWidth * 0.13,
      notes: contentWidth * 0.10,
    };

    // Table header
    const headers = [
      { text: 'م', width: colWidths.serial },
      { text: 'المادة ( الجدول )', width: colWidths.subject },
      { text: 'اسم المعلم', width: colWidths.teacher },
      { text: 'الحضور', width: colWidths.attendance, bg: COLORS.attendanceBlue },
      { text: 'الواجبات', width: colWidths.homework, bg: COLORS.lightOrange },
      { text: 'المشاركة', width: colWidths.participation, bg: COLORS.participationPurple },
      { text: 'السلوك', width: colWidths.behavior, bg: COLORS.behaviorGreen },
      { text: 'الملاحظات', width: colWidths.notes, bg: COLORS.white },
    ];

    let headerX = width - margin;
    for (const header of headers) {
      const hImg = await textToImage(header.text, {
        fontSize: 10, color: '#333333', align: 'center', isBold: true, maxWidth: header.width
      });
      const hEmb = await pdfDoc.embedPng(hImg.buffer);
      
      // Header background
      if (header.bg) {
        page.drawRectangle({
          x: headerX - header.width,
          y: tableY - headerHeight,
          width: header.width,
          height: headerHeight,
          color: header.bg,
        });
      }
      
      page.drawImage(hEmb, {
        x: headerX - header.width / 2 - hImg.width / 2,
        y: tableY - 25,
        width: hImg.width,
        height: hImg.height
      });
      
      headerX -= header.width;
    }

    // Table rows
    let rowY = tableY - headerHeight;
    for (let i = 0; i < numRows; i++) {
      const session = dailySchedule[i];
      const isEven = i % 2 === 0;
      
      // Row background
      page.drawRectangle({
        x: margin,
        y: rowY - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: isEven ? COLORS.tableRowEven : COLORS.tableRowOdd,
      });

      // Row border
      page.drawLine({
        start: { x: margin, y: rowY - rowHeight },
        end: { x: width - margin, y: rowY - rowHeight },
        thickness: 0.5,
        color: COLORS.border
      });

      // Cell data
      let cellX = width - margin;
      
      // Serial number
      const serialImg = await textToImage(String(session.period), {
        fontSize: 10, color: '#333333', align: 'center', isBold: true
      });
      const serialEmb = await pdfDoc.embedPng(serialImg.buffer);
      page.drawImage(serialEmb, {
        x: cellX - colWidths.serial / 2 - serialImg.width / 2,
        y: rowY - rowHeight / 2 - serialImg.height / 2,
        width: serialImg.width,
        height: serialImg.height
      });
      cellX -= colWidths.serial;

      // Subject
      const subjectImg = await textToImage(session.subject || '-', {
        fontSize: 10, color: '#333333', align: 'right', maxWidth: colWidths.subject - 5
      });
      const subjectEmb = await pdfDoc.embedPng(subjectImg.buffer);
      page.drawImage(subjectEmb, {
        x: cellX - subjectImg.width,
        y: rowY - rowHeight / 2 - subjectImg.height / 2,
        width: subjectImg.width,
        height: subjectImg.height
      });
      cellX -= colWidths.subject;

      // Teacher
      const teacherImg = await textToImage(session.teacher || '-', {
        fontSize: 10, color: '#333333', align: 'right', maxWidth: colWidths.teacher - 5
      });
      const teacherEmb = await pdfDoc.embedPng(teacherImg.buffer);
      page.drawImage(teacherEmb, {
        x: cellX - teacherImg.width,
        y: rowY - rowHeight / 2 - teacherImg.height / 2,
        width: teacherImg.width,
        height: teacherImg.height
      });
      cellX -= colWidths.teacher;

      // Attendance (with checkmark if present) - Only column with checkmarks
      if (record.attendance === 'present') {
        await drawCheckmark(pdfDoc, page, cellX - colWidths.attendance / 2, rowY - rowHeight / 2, 14, { r: 0.1, g: 0.6, b: 0.2 });
      }
      cellX -= colWidths.attendance;

      // Homework - Empty (as shown in image)
      cellX -= colWidths.homework;

      // Participation - Empty (as shown in image)
      cellX -= colWidths.participation;

      // Behavior - Empty (as shown in image)
      cellX -= colWidths.behavior;

      // Notes - Show notes for each session (from record.notes)
      const notesText = record.notes || '';
      if (notesText) {
        const notesImg = await textToImage(notesText, {
          fontSize: 9, color: '#666666', align: 'right', maxWidth: colWidths.notes - 5
        });
        const notesEmb = await pdfDoc.embedPng(notesImg.buffer);
        page.drawImage(notesEmb, {
          x: cellX - notesImg.width,
          y: rowY - rowHeight / 2 - notesImg.height / 2,
          width: notesImg.width,
          height: notesImg.height
        });
      }
      cellX -= colWidths.notes;

      rowY -= rowHeight;
    }

    // ================= BOTTOM SECTION =================
    cursorY = rowY - 30;
    const boxHeight = 120;
    const boxWidth = (contentWidth - 20) / 2;

    // Left box: Counselor message
    const counselorTitleImg = await textToImage('رسالة الموجه الطلابي :', {
      fontSize: 12, color: '#143C55', align: 'right', isBold: true
    });
    const counselorMsgImg = await textToImage(
      settings.reportGeneralMessage || 'نقدر تعاونكم المستمر في متابعة التحصيل الدراسي والسلوكي لأبنائكم.',
      { fontSize: 10, color: '#333333', align: 'right', maxWidth: boxWidth - 20 }
    );

    const ctEmb = await pdfDoc.embedPng(counselorTitleImg.buffer);
    const cmEmb = await pdfDoc.embedPng(counselorMsgImg.buffer);

    page.drawRectangle({
      x: margin,
      y: cursorY - boxHeight,
      width: boxWidth,
      height: boxHeight,
      color: COLORS.lightGreen,
      borderColor: COLORS.border,
      borderWidth: 1,
    });

    page.drawImage(ctEmb, {
      x: margin + boxWidth - ctEmb.width - 10,
      y: cursorY - 20,
      width: ctEmb.width,
      height: ctEmb.height
    });

    page.drawImage(cmEmb, {
      x: margin + boxWidth - cmEmb.width - 10,
      y: cursorY - 40,
      width: cmEmb.width,
      height: cmEmb.height
    });

    // Right box: Graph title (we can't draw actual radar chart in pdf-lib easily, so we'll add placeholder)
    const graphTitleImg = await textToImage('الرسم البياني', {
      fontSize: 12, color: '#143C55', align: 'right', isBold: true
    });
    const graphPlaceholderImg = await textToImage('مؤشر الأداء', {
      fontSize: 10, color: '#666666', align: 'center'
    });

    const gtEmb = await pdfDoc.embedPng(graphTitleImg.buffer);
    const gpEmb = await pdfDoc.embedPng(graphPlaceholderImg.buffer);

    page.drawRectangle({
      x: margin + boxWidth + 20,
      y: cursorY - boxHeight,
      width: boxWidth,
      height: boxHeight,
      color: COLORS.lightPurple,
      borderColor: COLORS.border,
      borderWidth: 1,
    });

    page.drawImage(gtEmb, {
      x: margin + boxWidth + 20 + boxWidth - gtEmb.width - 10,
      y: cursorY - 20,
      width: gtEmb.width,
      height: gtEmb.height
    });

    page.drawImage(gpEmb, {
      x: margin + boxWidth + 20 + boxWidth / 2 - gpEmb.width / 2,
      y: cursorY - boxHeight / 2 - gpEmb.height / 2,
      width: gpEmb.width,
      height: gpEmb.height
    });

    // ================= FOOTER =================
    const footerY = 50;
    page.drawRectangle({
      x: 0,
      y: footerY,
      width: width,
      height: 30,
      color: COLORS.footerGray,
    });

    const footerText = `يصدر هذا التقرير من منصة التتبع الالكتروني - رقم واتساب المدرسة : ${settings.whatsappPhone || '-'} - ${settings.slogan || 'تميزكم ... غايتنا'}`;
    const footerImg = await textToImage(footerText, {
      fontSize: 8, color: '#666666', align: 'center', maxWidth: contentWidth
    });
    const footerEmb = await pdfDoc.embedPng(footerImg.buffer);
    page.drawImage(footerEmb, {
      x: width / 2 - footerImg.width / 2,
      y: footerY + 10,
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
