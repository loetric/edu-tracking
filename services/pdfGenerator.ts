import { PDFDocument, rgb, PDFPage } from 'pdf-lib';
import { Student, DailyRecord, SchoolSettings, ScheduleItem } from '../types';

// --- Configuration ---
// Fallback font stack for the canvas renderer
const ARABIC_FONT_STACK = '"Cairo", "Tajawal", "IBM Plex Sans Arabic", "Segoe UI", "Arial", sans-serif';

// --- Modern Color Palette ---
const COLORS = {
  primary: rgb(0.08, 0.48, 0.65),       // Teal Blue (Main Brand)
  secondary: rgb(0.15, 0.15, 0.18),     // Dark Charcoal (Headings)
  accent: rgb(0.92, 0.96, 0.99),        // Light Sky (Backgrounds)
  success: rgb(0.1, 0.6, 0.2),          // Green
  warning: rgb(0.8, 0.6, 0.1),          // Orange/Gold
  danger: rgb(0.8, 0.3, 0.3),           // Red
  textMain: rgb(0.2, 0.2, 0.2),         // Dark Gray
  textLight: rgb(0.5, 0.5, 0.5),        // Light Gray
  border: rgb(0.9, 0.9, 0.9),           // Subtle Border
  white: rgb(1, 1, 1),
  tableHeader: rgb(0.05, 0.35, 0.5),    // Darker Blue for tables
  rowEven: rgb(0.98, 0.98, 0.99),       // Very light gray for table rows
};

/**
 * Helper: Convert Arabic text to high-resolution image buffer.
 * This acts as a polyfill for RTL/Arabic rendering since pdf-lib standard fonts
 * do not support Arabic shaping natively.
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

      // 3x Scale for high DPI (Retina-like sharpness when embedded)
      const scale = 3;
      const fontWeight = isBold ? '700' : '400';
      
      // Setup font to measure text
      ctx.font = `${fontWeight} ${fontSize * scale}px ${ARABIC_FONT_STACK}`;

      // Text Wrapping Logic
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = words[0];
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
      lines.push(currentLine);

      // Calculate dimensions with padding
      const lineHeight = fontSize * 1.6 * scale;
      const canvasWidth = scaledMaxWidth + (10 * scale); // slight padding
      const canvasHeight = (lines.length * lineHeight) + (10 * scale);

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Redraw with correct size
      ctx.scale(1, 1);
      ctx.font = `${fontWeight} ${fontSize * scale}px ${ARABIC_FONT_STACK}`;
      ctx.fillStyle = color;
      ctx.textBaseline = 'middle';

      lines.forEach((line, index) => {
        const lineWidth = ctx.measureText(line).width;
        const y = (index * lineHeight) + (lineHeight / 2) + (5 * scale);
        let x = 0;
        
        // Adjust X based on alignment (RTL context)
        if (align === 'right') {
          x = canvasWidth - (5 * scale); // Right padding
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
 * Helper: Draw a modern container card with optional shadow line
 */
function drawCard(
  page: PDFPage, 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  borderColor = COLORS.border
) {
  // Background
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: COLORS.white,
    borderColor: borderColor,
    borderWidth: 1.5,
  });
  // Subtle bottom shadow effect
  page.drawLine({
    start: { x: x + 2, y: y - height - 2 },
    end: { x: x + width + 2, y: y - height - 2 },
    thickness: 2,
    color: rgb(0.95, 0.95, 0.95),
  });
}

/**
 * Helper: Draw Status Badge (Pill shape)
 */
async function drawStatusBadge(
  pdfDoc: PDFDocument,
  page: PDFPage,
  text: string,
  statusType: 'success' | 'warning' | 'danger' | 'neutral',
  x: number,
  y: number,
  width: number
) {
  let bgColor, textColorHex;
  
  switch (statusType) {
    case 'success': 
      bgColor = rgb(0.9, 0.98, 0.92); 
      textColorHex = '#006600'; 
      break;
    case 'warning': 
      bgColor = rgb(1, 0.98, 0.9); 
      textColorHex = '#996600'; 
      break;
    case 'danger': 
      bgColor = rgb(1, 0.94, 0.94); 
      textColorHex = '#CC0000'; 
      break;
    default: 
      bgColor = rgb(0.96, 0.96, 0.96); 
      textColorHex = '#666666'; 
      break;
  }

  // Draw Pill Background
  const height = 30;
  const radius = 10; // Approx radius simulation via rounded cap (pdf-lib limited support, using rect for simplicity or custom path)
  
  // Using standard rectangle for broad compatibility
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: bgColor,
    borderColor: bgColor,
    borderWidth: 0,
  });

  // Draw Text
  const img = await textToImage(text, { 
    fontSize: 11, 
    isBold: true, 
    color: textColorHex, 
    align: 'center', 
    maxWidth: width 
  });
  const embed = await pdfDoc.embedPng(img.buffer);
  
  page.drawImage(embed, {
    x: x + (width - img.width) / 2,
    y: y - (height + img.height) / 2,
    width: img.width,
    height: img.height
  });
}

/**
 * Main Function: Generate PDF Report
 */
export async function generatePDFReport(
  student: Student,
  record: DailyRecord,
  settings: SchoolSettings,
  schedule: ScheduleItem[]
): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    // A4 Size: 595 x 842 points
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    
    // Layout Constants
    const margin = 40;
    const contentWidth = width - (margin * 2);
    let cursorY = height - margin;

    // ================= HEADER SECTION =================
    // Top colored strip
    page.drawRectangle({
      x: 0,
      y: height - 8,
      width: width,
      height: 8,
      color: COLORS.primary
    });

    // 1. Logo (Left side)
    if (settings.logoUrl) {
      try {
        const response = await fetch(settings.logoUrl);
        const logoBytes = await response.arrayBuffer();
        let logoImage;
        // Basic format detection
        if (settings.logoUrl.toLowerCase().endsWith('.png')) {
          logoImage = await pdfDoc.embedPng(logoBytes);
        } else {
          logoImage = await pdfDoc.embedJpg(logoBytes);
        }
        
        const logoDim = logoImage.scaleToFit(70, 70);
        page.drawImage(logoImage, {
          x: margin,
          y: cursorY - 80,
          width: logoDim.width,
          height: logoDim.height,
        });
      } catch (error) {
        console.warn('Logo loading failed', error);
      }
    }

    // 2. School Details (Right side - Text)
    const schoolNameImg = await textToImage(settings.name || 'المدرسة', { 
      fontSize: 18, isBold: true, color: '#143C55', align: 'right', maxWidth: 350 
    });
    const ministryImg = await textToImage(settings.ministry || 'وزارة التعليم', { 
      fontSize: 10, color: '#666666', align: 'right' 
    });
    
    const sNameEmb = await pdfDoc.embedPng(schoolNameImg.buffer);
    const minEmb = await pdfDoc.embedPng(ministryImg.buffer);

    page.drawImage(sNameEmb, {
      x: width - margin - sNameEmb.width,
      y: cursorY - 45,
      width: sNameEmb.width,
      height: sNameEmb.height
    });
    
    page.drawImage(minEmb, {
      x: width - margin - minEmb.width,
      y: cursorY - 20,
      width: minEmb.width,
      height: minEmb.height
    });

    // 3. Report Title (Center)
    cursorY -= 80;
    const titleText = 'تقرير المتابعة اليومي';
    const reportDate = record.date ? new Date(record.date) : new Date();
    const dateText = reportDate.toLocaleDateString('ar-SA', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    const titleImg = await textToImage(titleText, { 
      fontSize: 20, isBold: true, color: '#143C55', align: 'center', maxWidth: 400 
    });
    const dateImg = await textToImage(dateText, { 
      fontSize: 11, color: '#666666', align: 'center', maxWidth: 400 
    });

    const tEmb = await pdfDoc.embedPng(titleImg.buffer);
    const dEmb = await pdfDoc.embedPng(dateImg.buffer);

    page.drawImage(tEmb, {
      x: (width - tEmb.width) / 2,
      y: cursorY,
      width: tEmb.width,
      height: tEmb.height
    });
    
    cursorY -= 25;
    page.drawImage(dEmb, {
      x: (width - dEmb.width) / 2,
      y: cursorY,
      width: dEmb.width,
      height: dEmb.height
    });


    // ================= STUDENT INFO CARD =================
    cursorY -= 50;
    const infoCardHeight = 90;
    drawCard(page, margin, cursorY, contentWidth, infoCardHeight);

    // Grid positions for student info
    const col1X = width - margin - 20;
    const col2X = width - margin - (contentWidth / 2) - 20;
    const row1Y = cursorY - 25;
    const row2Y = cursorY - 60;

    const studentInfo = [
      { label: 'اسم الطالب', val: student.name, x: col1X, y: row1Y },
      { label: 'الفصل', val: student.classGrade || 'غير محدد', x: col1X, y: row2Y },
      { label: 'رقم الملف', val: student.id, x: col2X, y: row1Y },
      { label: 'ولي الأمر', val: student.parentPhone || '-', x: col2X, y: row2Y },
    ];

    for (const info of studentInfo) {
      // Label
      const lImg = await textToImage(info.label + ':', { 
        fontSize: 10, color: '#888888', align: 'right' 
      });
      const lEmb = await pdfDoc.embedPng(lImg.buffer);
      page.drawImage(lEmb, {
        x: info.x - lEmb.width,
        y: info.y,
        width: lEmb.width,
        height: lEmb.height
      });

      // Value
      const vImg = await textToImage(info.val, { 
        fontSize: 12, isBold: true, color: '#000000', align: 'right', maxWidth: 220 
      });
      const vEmb = await pdfDoc.embedPng(vImg.buffer);
      page.drawImage(vEmb, {
        x: info.x - vEmb.width,
        y: info.y - 20,
        width: vEmb.width,
        height: vEmb.height
      });
    }

    // ================= PERFORMANCE INDICATORS =================
    cursorY -= (infoCardHeight + 35);
    
    // Section Title
    const perfTitle = await textToImage('ملخص الأداء', { 
      fontSize: 14, isBold: true, color: '#143C55', align: 'right' 
    });
    const ptEmb = await pdfDoc.embedPng(perfTitle.buffer);
    page.drawImage(ptEmb, {
      x: width - margin - ptEmb.width,
      y: cursorY,
      width: ptEmb.width,
      height: ptEmb.height
    });

    cursorY -= 25;
    const boxSize = (contentWidth - 30) / 4; // 4 boxes equal width with gaps
    
    // Helper to determine color based on value
    const getStatusColor = (val: string): 'success' | 'warning' | 'danger' | 'neutral' => {
      if (['present', 'excellent', 'good'].includes(val)) return 'success';
      if (['average', 'excused'].includes(val)) return 'warning';
      if (['poor', 'absent'].includes(val)) return 'danger';
      return 'neutral';
    };

    const getArabicStatus = (s: string) => {
      const map: any = {
        present: 'حاضر', absent: 'غائب', excused: 'مستأذن',
        excellent: 'متميز', good: 'جيد', average: 'متوسط', poor: 'ضعيف'
      };
      return map[s] || s;
    };

    const stats = [
      { label: 'الحضور', val: record.attendance },
      { label: 'السلوك', val: record.behavior },
      { label: 'المشاركة', val: record.participation },
      { label: 'الواجبات', val: record.homework },
    ];

    let currentStatX = width - margin - boxSize; // Start from right

    for (const stat of stats) {
      drawCard(page, currentStatX, cursorY, boxSize, 70);
      
      // Label
      const lblImg = await textToImage(stat.label, { 
        fontSize: 10, color: '#666666', align: 'center', maxWidth: boxSize 
      });
      const lblEmb = await pdfDoc.embedPng(lblImg.buffer);
      page.drawImage(lblEmb, {
        x: currentStatX + (boxSize - lblEmb.width) / 2,
        y: cursorY - 25,
        width: lblEmb.width,
        height: lblEmb.height
      });

      // Status Badge
      await drawStatusBadge(
        pdfDoc, 
        page, 
        getArabicStatus(stat.val), 
        getStatusColor(stat.val), 
        currentStatX + 10, 
        cursorY - 45, 
        boxSize - 20
      );

      currentStatX -= (boxSize + 10);
    }

    // ================= SCHEDULE TABLE =================
    cursorY -= 110;
    
    // Filter schedule for the day
    const dayName = reportDate.toLocaleDateString('ar-SA', { weekday: 'long' });
    const dailySchedule = schedule.filter(s => s.day === dayName).sort((a, b) => a.period - b.period);
    
    // Section Title
    const tableTitle = await textToImage('الجدول الدراسي والملاحظات', { 
      fontSize: 14, isBold: true, color: '#143C55', align: 'right' 
    });
    const ttEmb = await pdfDoc.embedPng(tableTitle.buffer);
    page.drawImage(ttEmb, {
      x: width - margin - ttEmb.width,
      y: cursorY,
      width: ttEmb.width,
      height: ttEmb.height
    });

    cursorY -= 20;

    // Table Header
    const headerHeightT = 35;
    page.drawRectangle({
      x: margin,
      y: cursorY - headerHeightT,
      width: contentWidth,
      height: headerHeightT,
      color: COLORS.tableHeader,
    });

    const columns = [
      { header: 'م', widthPercent: 0.10 },
      { header: 'المادة', widthPercent: 0.30 },
      { header: 'المعلم', widthPercent: 0.30 },
      { header: 'الفصل', widthPercent: 0.30 },
    ];

    // Draw Headers
    let colX = width - margin;
    for (const col of columns) {
      const colW = contentWidth * col.widthPercent;
      const hImg = await textToImage(col.header, { 
        fontSize: 11, isBold: true, color: '#FFFFFF', align: 'center', maxWidth: colW 
      });
      const hEmb = await pdfDoc.embedPng(hImg.buffer);
      page.drawImage(hEmb, {
        x: colX - (colW / 2) - (hImg.width / 2),
        y: cursorY - 25,
        width: hImg.width,
        height: hImg.height
      });
      colX -= colW;
    }

    cursorY -= headerHeightT;

    // Draw Rows
    const rowHeight = 35;
    for (let i = 0; i < Math.min(dailySchedule.length, 6); i++) {
      const item = dailySchedule[i];
      const isEven = i % 2 === 0;
      
      // Row Background
      if (isEven) {
        page.drawRectangle({
          x: margin,
          y: cursorY - rowHeight,
          width: contentWidth,
          height: rowHeight,
          color: COLORS.rowEven
        });
      }

      // Border bottom
      page.drawLine({
        start: { x: margin, y: cursorY - rowHeight },
        end: { x: width - margin, y: cursorY - rowHeight },
        thickness: 0.5,
        color: COLORS.border
      });

      // Cell Data
      const rowData = [
        String(item.period),
        item.subject || '-',
        item.teacher || '-',
        item.classRoom || '-'
      ];

      let cellX = width - margin;
      for (let j = 0; j < rowData.length; j++) {
        const colW = contentWidth * columns[j].widthPercent;
        const text = rowData[j];
        
        // Create image for cell content
        const cImg = await textToImage(text, { 
          fontSize: 10, color: '#333333', align: 'center', maxWidth: colW - 10 
        });
        const cEmb = await pdfDoc.embedPng(cImg.buffer);
        
        page.drawImage(cEmb, {
          x: cellX - (colW / 2) - (cImg.width / 2),
          y: cursorY - 22,
          width: cImg.width,
          height: cImg.height
        });
        cellX -= colW;
      }
      cursorY -= rowHeight;
    }

    // ================= NOTES & FOOTER =================
    
    // Check if we need a new page for notes if schedule was long
    if (cursorY < 150) {
      // For simplicity in this snippet, we assume content fits or just squeeze it at bottom
      // Ideally, you would add a new page here: page = pdfDoc.addPage(...) and reset cursorY
    }

    cursorY -= 30;
    if (record.notes) {
      const noteLabel = await textToImage('ملاحظات عامة:', { 
        fontSize: 12, isBold: true, color: '#143C55', align: 'right' 
      });
      const noteEmb = await pdfDoc.embedPng(noteLabel.buffer);
      page.drawImage(noteEmb, {
        x: width - margin - noteEmb.width,
        y: cursorY,
        width: noteEmb.width,
        height: noteEmb.height
      });

      cursorY -= 15;
      const noteVal = await textToImage(record.notes, { 
        fontSize: 11, color: '#444444', align: 'right', maxWidth: contentWidth 
      });
      const noteValEmb = await pdfDoc.embedPng(noteVal.buffer);
      page.drawImage(noteValEmb, {
        x: width - margin - noteValEmb.width,
        y: cursorY - noteValEmb.height,
        width: noteValEmb.width,
        height: noteValEmb.height
      });
    }

    // Footer Line & Text
    const footerY = 40;
    page.drawLine({
      start: { x: margin, y: footerY + 15 },
      end: { x: width - margin, y: footerY + 15 },
      thickness: 1,
      color: COLORS.border
    });

    const footerText = 'تم إصدار هذا التقرير آلياً - معتمد من إدارة المدرسة';
    const fImg = await textToImage(footerText, { 
      fontSize: 9, color: '#888888', align: 'center', maxWidth: contentWidth 
    });
    const fEmb = await pdfDoc.embedPng(fImg.buffer);
    page.drawImage(fEmb, {
      x: (width - fImg.width) / 2,
      y: footerY,
      width: fImg.width,
      height: fImg.height
    });

    return await pdfDoc.save();
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
}

/**
 * Helper: Trigger Download in Browser
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
    link.download = `Report_${student.id}_${record.date}.pdf`;
    link.click();
  } catch (e) {
    console.error('Download failed', e);
  }
}
