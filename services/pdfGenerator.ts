import { PDFDocument, rgb, PDFPage } from 'pdf-lib';
import { Student, DailyRecord, SchoolSettings, ScheduleItem } from '../types';
import { getStatusLabel } from '../constants';

// --- Configuration ---
const ARABIC_FONT_STACK = '"Cairo", "Tajawal", "IBM Plex Sans Arabic", "Segoe UI", "Arial", sans-serif';

// --- Color Palette matching PDFReport.tsx design ---
const COLORS = {
  white: rgb(1, 1, 1),
  gray50: rgb(0.98, 0.98, 0.98),
  gray100: rgb(0.95, 0.95, 0.95),
  gray200: rgb(0.9, 0.9, 0.9),
  gray300: rgb(0.82, 0.82, 0.82),
  gray400: rgb(0.65, 0.65, 0.65),
  gray500: rgb(0.5, 0.5, 0.5),
  gray600: rgb(0.4, 0.4, 0.4),
  gray700: rgb(0.3, 0.3, 0.3),
  gray800: rgb(0.2, 0.2, 0.2),
  teal600: rgb(0.05, 0.58, 0.53),
  teal700: rgb(0.0, 0.47, 0.43),
  teal800: rgb(0.0, 0.37, 0.33),
  green50: rgb(0.95, 0.99, 0.97),
  green200: rgb(0.75, 0.9, 0.85),
  green800: rgb(0.0, 0.4, 0.3),
  blue50: rgb(0.93, 0.97, 1.0),
  blue200: rgb(0.7, 0.85, 0.95),
  blue900: rgb(0.0, 0.2, 0.4),
  yellow50: rgb(1.0, 0.98, 0.9),
  yellow200: rgb(0.95, 0.85, 0.7),
  red50: rgb(1.0, 0.95, 0.95),
  red200: rgb(0.95, 0.7, 0.7),
  red800: rgb(0.7, 0.2, 0.2),
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
 * Draw radar chart on canvas and return as image
 */
async function drawRadarChart(
  data: Array<{ subject: string; A: number; fullMark: number }>,
  performanceLevel: string,
  width: number = 200,
  height: number = 200
): Promise<{ buffer: Uint8Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      const scale = 3;
      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);

      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.35; // 35% of size
      const numPoints = data.length;
      const angleStep = (2 * Math.PI) / numPoints;

      // Draw background circles (grid)
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        const r = (radius * i) / 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Draw radial lines
      for (let i = 0; i < numPoints; i++) {
        const angle = -Math.PI / 2 + (i * angleStep); // Start from top
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      // Draw data polygon
      ctx.fillStyle = 'rgba(13, 148, 136, 0.5)'; // teal with opacity
      ctx.strokeStyle = '#0d9488'; // teal
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < numPoints; i++) {
        const angle = -Math.PI / 2 + (i * angleStep);
        const value = data[i].A;
        const normalizedValue = value / 100; // Normalize to 0-1
        const r = radius * normalizedValue;
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw labels
      ctx.font = 'bold 10px ' + ARABIC_FONT_STACK;
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < numPoints; i++) {
        const angle = -Math.PI / 2 + (i * angleStep);
        const labelRadius = radius + 15;
        const x = centerX + labelRadius * Math.cos(angle);
        const y = centerY + labelRadius * Math.sin(angle);
        
        ctx.fillText(data[i].subject, x, y);
      }

      // Draw performance level text at bottom
      ctx.font = 'bold 10px ' + ARABIC_FONT_STACK;
      ctx.fillStyle = '#0d9488';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const performanceText = `التقدير العام: ${performanceLevel}`;
      ctx.fillText(performanceText, centerX, height - 5);

      canvas.toBlob((blob) => {
        if (!blob) reject(new Error('Blob creation failed'));
        else blob.arrayBuffer().then(buf => resolve({ 
          buffer: new Uint8Array(buf), 
          width: width, 
          height: height 
        }));
      }, 'image/png');
    } catch (e) {
      reject(e);
    }
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
 * Get status display info (matching PDFReport.tsx)
 */
function getStatusDisplay(status: string, type: 'attendance' | 'academic') {
  if (type === 'attendance') {
    switch(status) {
      case 'present': return { text: 'حاضر', bg: COLORS.green50, border: COLORS.green200, textCol: COLORS.green800 };
      case 'excused': return { text: 'مستأذن', bg: COLORS.yellow50, border: COLORS.yellow200, textCol: rgb(0.7, 0.5, 0.0) };
      case 'absent': return { text: 'غائب', bg: COLORS.red50, border: COLORS.red200, textCol: COLORS.red800 };
      default: return { text: '-', bg: COLORS.gray50, border: COLORS.gray200, textCol: COLORS.gray800 };
    }
  } else {
    switch(status) {
      case 'excellent': return { text: 'متميز', bg: COLORS.green50, border: COLORS.green200, textCol: COLORS.teal800 };
      case 'good': return { text: 'جيد', bg: COLORS.blue50, border: COLORS.blue200, textCol: COLORS.blue900 };
      case 'average': return { text: 'متوسط', bg: COLORS.yellow50, border: COLORS.yellow200, textCol: rgb(0.7, 0.5, 0.0) };
      case 'poor': return { text: 'ضعيف', bg: COLORS.red50, border: COLORS.red200, textCol: COLORS.red800 };
      default: return { text: '-', bg: COLORS.gray50, border: COLORS.gray100, textCol: COLORS.gray300 };
    }
  }
}

/**
 * Draw status badge box
 */
async function drawStatusBox(
  pdfDoc: PDFDocument,
  page: PDFPage,
  text: string,
  bgColor: any,
  borderColor: any,
  textColor: any,
  x: number,
  y: number,
  width: number,
  height: number
) {
  // Draw background
  page.drawRectangle({
    x: x - width / 2,
    y: y - height / 2,
    width: width,
    height: height,
    color: bgColor,
    borderColor: borderColor,
    borderWidth: 1,
  });

  // Draw text
  const textImg = await textToImage(text, {
    fontSize: 9, 
    color: `rgb(${Math.round(textColor.r * 255)}, ${Math.round(textColor.g * 255)}, ${Math.round(textColor.b * 255)})`, 
    align: 'center', 
    isBold: true, 
    maxWidth: width - 5
  });
  const textEmb = await pdfDoc.embedPng(textImg.buffer);
  page.drawImage(textEmb, {
    x: x - textImg.width / 2,
    y: y - textImg.height / 2,
    width: textImg.width,
    height: textImg.height
  });
}

/**
 * Generate PDF Report matching PDFReport.tsx design exactly
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
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    
    const margin = 40;
    const contentWidth = width - (margin * 2);
    let cursorY = height - 40;

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
      classGrades: settings.classGrades || [],
      ...settings
    };

    // Date formatting (matching PDFReport.tsx)
    const reportDate = record.date ? new Date(record.date) : new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const dayName = reportDate.toLocaleDateString('ar-SA', { weekday: 'long' });
    const dateStr = reportDate.toLocaleDateString('ar-SA', dateOptions);

    // Get status displays
    const attendanceInfo = getStatusDisplay(record.attendance, 'attendance');
    const participationInfo = getStatusDisplay(record.participation, 'academic');
    const homeworkInfo = getStatusDisplay(record.homework, 'academic');
    const behaviorInfo = getStatusDisplay(record.behavior, 'academic');

    // Chart Data Preparation (matching PDFReport.tsx)
    const scoreMap: Record<string, number> = { excellent: 100, good: 75, average: 50, poor: 25, none: 0 };
    const partScore = record.attendance === 'present' ? (scoreMap[record.participation] || 0) : 0;
    const homeScore = record.attendance === 'present' ? (scoreMap[record.homework] || 0) : 0;
    const behScore = record.attendance === 'present' ? (scoreMap[record.behavior] || 0) : 0;

    const chartData = [
      { subject: 'المشاركة', A: partScore, fullMark: 100 },
      { subject: 'الواجبات', A: homeScore, fullMark: 100 },
      { subject: 'السلوك', A: behScore, fullMark: 100 },
    ];

    // Calculate Average Score
    const totalScore = (partScore + homeScore + behScore) / 3;
    let performanceLevel = 'غير محدد';
    if (record.attendance === 'present') {
      if (totalScore >= 90) performanceLevel = 'ممتاز';
      else if (totalScore >= 75) performanceLevel = 'جيد جداً';
      else if (totalScore >= 60) performanceLevel = 'جيد';
      else performanceLevel = 'يحتاج متابعة';
    }

    // ================= HEADER SECTION (3 columns like PDFReport.tsx) =================
    const headerSectionHeight = 120;
    const headerY = cursorY;
    
    // Right column - Kingdom info
    const rightColX = width - margin;
    let rightY = headerY;
    const rightTexts = [
      { text: 'المملكة العربية السعودية', fontSize: 10, color: '#6B7280', bold: false },
      { text: safeSettings.ministry, fontSize: 11, color: '#1F2937', bold: true },
      { text: safeSettings.region, fontSize: 11, color: '#1F2937', bold: true },
      { text: safeSettings.name, fontSize: 13, color: '#0D9488', bold: true }
    ];
    
    for (const item of rightTexts) {
      const img = await textToImage(item.text, {
        fontSize: item.fontSize,
        color: item.color,
        align: 'right',
        isBold: item.bold
      });
      const emb = await pdfDoc.embedPng(img.buffer);
      page.drawImage(emb, {
        x: rightColX - img.width,
        y: rightY,
        width: img.width,
        height: img.height
      });
      rightY -= 18;
    }

    // Center column - Logo and title
    const headerCenterX = width / 2;
    const logoSize = 60;
    const logoY = headerY - 10;
    
    if (safeSettings.logoUrl) {
      const logo = await loadImage(pdfDoc, safeSettings.logoUrl);
      if (logo) {
        const logoDims = logo.scale(1);
        const logoAspectRatio = logoDims.width / logoDims.height;
        let finalLogoWidth = logoSize;
        let finalLogoHeight = logoSize;
        
        if (logoAspectRatio > 1) {
          finalLogoHeight = logoSize / logoAspectRatio;
        } else {
          finalLogoWidth = logoSize * logoAspectRatio;
        }
        
        page.drawImage(logo, {
          x: headerCenterX - finalLogoWidth / 2,
          y: logoY - finalLogoHeight,
          width: finalLogoWidth,
          height: finalLogoHeight,
        });
      }
    }
    
    // Title with underline
    const titleY = logoY - logoSize - 15;
    const titleText = 'تقرير متابعة يومي';
    const titleImg = await textToImage(titleText, {
      fontSize: 18, color: '#1F2937', align: 'center', isBold: true
    });
    const titleEmb = await pdfDoc.embedPng(titleImg.buffer);
    page.drawImage(titleEmb, {
      x: headerCenterX - titleImg.width / 2,
      y: titleY,
      width: titleImg.width,
      height: titleImg.height
    });
    
    // Underline
    page.drawLine({
      start: { x: headerCenterX - titleImg.width / 2 - 10, y: titleY - 3 },
      end: { x: headerCenterX + titleImg.width / 2 + 10, y: titleY - 3 },
      thickness: 2,
      color: COLORS.teal600
    });

    // Left column - Date and phone (text aligned right but positioned on left side)
    const leftColX = margin;
    const leftColWidth = (width - margin * 2) / 3; // 1/3 of content width
    const leftColRightX = leftColX + leftColWidth;
    let leftY = headerY;
    
    const dateLabelImg = await textToImage('تاريخ التقرير', {
      fontSize: 9, color: '#6B7280', align: 'right', isBold: false
    });
    const dateLabelEmb = await pdfDoc.embedPng(dateLabelImg.buffer);
    page.drawImage(dateLabelEmb, {
      x: leftColRightX - dateLabelImg.width,
      y: leftY,
      width: dateLabelImg.width,
      height: dateLabelImg.height
    });
    
    leftY -= 16;
    const dateValueImg = await textToImage(dateStr, {
      fontSize: 11, color: '#1F2937', align: 'right', isBold: true
    });
    const dateValueEmb = await pdfDoc.embedPng(dateValueImg.buffer);
    page.drawImage(dateValueEmb, {
      x: leftColRightX - dateValueImg.width,
      y: leftY,
      width: dateValueImg.width,
      height: dateValueImg.height
    });
    
    leftY -= 16;
    const dayImg = await textToImage(dayName, {
      fontSize: 9, color: '#6B7280', align: 'right', isBold: false
    });
    const dayEmb = await pdfDoc.embedPng(dayImg.buffer);
    page.drawImage(dayEmb, {
      x: leftColRightX - dayImg.width,
      y: leftY,
      width: dayImg.width,
      height: dayImg.height
    });
    
    if (safeSettings.whatsappPhone) {
      leftY -= 20;
      const phoneText = safeSettings.whatsappPhone;
      const phoneImg = await textToImage(phoneText, {
        fontSize: 9, color: '#4B5563', align: 'right', isBold: false
      });
      const phoneEmb = await pdfDoc.embedPng(phoneImg.buffer);
      page.drawImage(phoneEmb, {
        x: leftColRightX - phoneImg.width,
        y: leftY,
        width: phoneImg.width,
        height: phoneImg.height
      });
    }

    // Border line under header
    cursorY = titleY - 20;
    page.drawLine({
      start: { x: margin, y: cursorY },
      end: { x: width - margin, y: cursorY },
      thickness: 2,
      color: COLORS.gray200
    });

    // ================= STUDENT INFO CARD (matching PDFReport.tsx) =================
    cursorY -= 30;
    const cardHeight = 80;
    const cardY = cursorY;
    
    // Main card background
    page.drawRectangle({
      x: margin,
      y: cardY - cardHeight,
      width: contentWidth,
      height: cardHeight,
      color: COLORS.white,
      borderColor: COLORS.gray300,
      borderWidth: 1,
    });

    // Left section - Avatar
    const avatarSectionWidth = 100;
    const avatarX = margin;
    const avatarY = cardY - cardHeight / 2;
    const avatarSize = 50;
    
    page.drawRectangle({
      x: avatarX,
      y: cardY - cardHeight,
      width: avatarSectionWidth,
      height: cardHeight,
      color: COLORS.gray50,
      borderColor: COLORS.gray300,
      borderWidth: 1,
    });
    
    // Load and draw avatar
    if (student.avatar) {
      const avatar = await loadImage(pdfDoc, student.avatar);
      if (avatar) {
        const avatarDims = avatar.scale(1);
        const avatarAspectRatio = avatarDims.width / avatarDims.height;
        let finalAvatarWidth = avatarSize;
        let finalAvatarHeight = avatarSize;
        
        if (avatarAspectRatio > 1) {
          finalAvatarHeight = avatarSize / avatarAspectRatio;
        } else {
          finalAvatarWidth = avatarSize * avatarAspectRatio;
        }
        
        page.drawImage(avatar, {
          x: avatarX + avatarSectionWidth / 2 - finalAvatarWidth / 2,
          y: avatarY - finalAvatarHeight / 2,
          width: finalAvatarWidth,
          height: finalAvatarHeight,
        });
      }
    }
    
    // Student ID below avatar
    const studentIdText = `رقم الملف: ${student.id}`;
    const studentIdImg = await textToImage(studentIdText, {
      fontSize: 9, color: '#6B7280', align: 'center', isBold: true
    });
    const studentIdEmb = await pdfDoc.embedPng(studentIdImg.buffer);
    page.drawImage(studentIdEmb, {
      x: avatarX + avatarSectionWidth / 2 - studentIdImg.width / 2,
      y: cardY - cardHeight + 10,
      width: studentIdImg.width,
      height: studentIdImg.height
    });

    // Right section - Student details grid (4 cells)
    const detailsX = margin + avatarSectionWidth;
    const detailsWidth = contentWidth - avatarSectionWidth;
    const cellWidth = detailsWidth / 2;
    const cellHeight = cardHeight / 2;
    
    const studentDetails = [
      { label: 'الاسم الرباعي', value: student.name || '-', row: 0, col: 0, hasBottomBorder: true, hasLeftBorder: true },
      { label: 'الفصل', value: student.classGrade || '-', row: 0, col: 1, hasBottomBorder: false, hasLeftBorder: true },
      { label: 'جوال ولي الأمر', value: student.parentPhone || '-', row: 1, col: 0, hasBottomBorder: false, hasLeftBorder: true },
      { label: 'حالة التقرير', value: 'معتمد من المدرسة', row: 1, col: 1, hasBottomBorder: false, hasLeftBorder: false, isSpecial: true }
    ];
    
    for (const detail of studentDetails) {
      const cellX = detailsX + detail.col * cellWidth;
      const cellY = cardY - detail.row * cellHeight;
      
      // Cell background
      const cellBg = detail.isSpecial ? COLORS.gray50 : COLORS.white;
      page.drawRectangle({
        x: cellX,
        y: cellY - cellHeight,
        width: cellWidth,
        height: cellHeight,
        color: cellBg,
      });
      
      // Draw borders only where needed
      // Top border (only for first row)
      if (detail.row === 0) {
        page.drawLine({
          start: { x: cellX, y: cellY },
          end: { x: cellX + cellWidth, y: cellY },
          thickness: 1,
          color: COLORS.gray200
        });
      }
      
      // Bottom border
      if (detail.hasBottomBorder) {
        page.drawLine({
          start: { x: cellX, y: cellY - cellHeight },
          end: { x: cellX + cellWidth, y: cellY - cellHeight },
          thickness: 1,
          color: COLORS.gray200
        });
      }
      
      // Left border
      if (detail.hasLeftBorder) {
        page.drawLine({
          start: { x: cellX, y: cellY },
          end: { x: cellX, y: cellY - cellHeight },
          thickness: 1,
          color: COLORS.gray200
        });
      }
      
      // Right border (always for rightmost cells)
      if (detail.col === 1) {
        page.drawLine({
          start: { x: cellX + cellWidth, y: cellY },
          end: { x: cellX + cellWidth, y: cellY - cellHeight },
          thickness: 1,
          color: COLORS.gray200
        });
      }
      
      // Label
      const labelImg = await textToImage(detail.label, {
        fontSize: 9, color: '#6B7280', align: 'right', isBold: true
      });
      const labelEmb = await pdfDoc.embedPng(labelImg.buffer);
      page.drawImage(labelEmb, {
        x: cellX + cellWidth - labelImg.width - 10,
        y: cellY - 15,
        width: labelImg.width,
        height: labelImg.height
      });
      
      // Value
      const valueColorStr = detail.isSpecial ? '#0D9488' : '#1F2937';
      const valueImg = await textToImage(detail.value, {
        fontSize: 11, color: valueColorStr, 
        align: 'right', isBold: true, maxWidth: cellWidth - 20
      });
      const valueEmb = await pdfDoc.embedPng(valueImg.buffer);
      page.drawImage(valueEmb, {
        x: cellX + cellWidth - valueImg.width - 10,
        y: cellY - 35,
        width: valueImg.width,
        height: valueImg.height
      });
    }

    // ================= SUMMARY SECTION (4 cards + chart placeholder) =================
    cursorY -= (cardHeight + 30);
    
    // Section title
    const summaryTitleImg = await textToImage('ملخص الأداء والمستوى اليومي', {
      fontSize: 12, color: '#0D9488', align: 'right', isBold: true
    });
    const summaryTitleEmb = await pdfDoc.embedPng(summaryTitleImg.buffer);
    page.drawImage(summaryTitleEmb, {
      x: width - margin - summaryTitleImg.width,
      y: cursorY,
      width: summaryTitleImg.width,
      height: summaryTitleImg.height
    });
    
    // Underline
    page.drawLine({
      start: { x: width - margin - summaryTitleImg.width, y: cursorY - 3 },
      end: { x: width - margin, y: cursorY - 3 },
      thickness: 1,
      color: COLORS.gray200
    });

    cursorY -= 25;
    const summaryBoxHeight = 50;
    const summaryBoxWidth = (contentWidth * 0.67 - 20) / 2; // 2/3 width for cards
    const chartWidth = contentWidth * 0.33; // 1/3 width for chart
    
    // 4 Summary cards (2x2 grid)
    const summaryItems = [
      { label: 'الحضور', info: attendanceInfo },
      { label: 'المشاركة', info: participationInfo },
      { label: 'الواجبات', info: homeworkInfo },
      { label: 'السلوك', info: behaviorInfo }
    ];
    
    let summaryX = width - margin;
    let summaryRow = 0;
    let summaryCol = 0;
    
    for (const item of summaryItems) {
      const boxX = summaryX - summaryBoxWidth;
      const boxY = cursorY - summaryRow * (summaryBoxHeight + 10);
      
      await drawStatusBox(
        pdfDoc, page,
        item.info.text,
        item.info.bg,
        item.info.border,
        item.info.textCol,
        boxX + summaryBoxWidth / 2,
        boxY - summaryBoxHeight / 2,
        summaryBoxWidth - 10,
        summaryBoxHeight
      );
      
      // Label
      const labelImg = await textToImage(item.label, {
        fontSize: 9, color: '#6B7280', align: 'center', isBold: true
      });
      const labelEmb = await pdfDoc.embedPng(labelImg.buffer);
      page.drawImage(labelEmb, {
        x: boxX + summaryBoxWidth / 2 - labelImg.width / 2,
        y: boxY - 15,
        width: labelImg.width,
        height: labelImg.height
      });
      
      summaryCol++;
      if (summaryCol === 2) {
        summaryCol = 0;
        summaryRow++;
        summaryX = width - margin;
      } else {
        summaryX -= summaryBoxWidth;
      }
    }

    // Chart (right side)
    const chartX = margin;
    const chartY = cursorY - summaryBoxHeight;
    const chartHeight = summaryBoxHeight * 2 + 10;
    const chartPadding = 10;
    
    page.drawRectangle({
      x: chartX,
      y: chartY - chartHeight,
      width: chartWidth,
      height: chartHeight,
      color: COLORS.white,
      borderColor: COLORS.gray200,
      borderWidth: 1,
    });
    
    // Chart title
    const chartTitleImg = await textToImage('مؤشر الأداء', {
      fontSize: 9, color: '#9CA3AF', align: 'right', isBold: true
    });
    const chartTitleEmb = await pdfDoc.embedPng(chartTitleImg.buffer);
    page.drawImage(chartTitleEmb, {
      x: chartX + chartWidth - chartTitleImg.width - chartPadding,
      y: chartY - 15,
      width: chartTitleImg.width,
      height: chartTitleImg.height
    });
    
    // Draw radar chart
    if (record.attendance === 'present') {
      const chartImageWidth = chartWidth - (chartPadding * 2);
      const chartImageHeight = chartHeight - 40; // Leave space for title and performance text
      const radarChart = await drawRadarChart(chartData, performanceLevel, chartImageWidth, chartImageHeight);
      const radarChartEmb = await pdfDoc.embedPng(radarChart.buffer);
      
      page.drawImage(radarChartEmb, {
        x: chartX + chartPadding,
        y: chartY - chartHeight + chartPadding + 5,
        width: radarChart.width,
        height: radarChart.height
      });
    } else {
      const noDataImg = await textToImage('لا يوجد تقييم (غائب)', {
        fontSize: 10, color: '#9CA3AF', align: 'center', isBold: false
      });
      const noDataEmb = await pdfDoc.embedPng(noDataImg.buffer);
      page.drawImage(noDataEmb, {
        x: chartX + chartWidth / 2 - noDataImg.width / 2,
        y: chartY - chartHeight / 2 - noDataImg.height / 2,
        width: noDataImg.width,
        height: noDataImg.height
      });
    }

    // ================= TABLE SECTION =================
    cursorY -= (summaryBoxHeight * 2 + 40);
    
    // Table title
    const tableTitleImg = await textToImage('كشف المتابعة والحصص الدراسية', {
      fontSize: 12, color: '#0D9488', align: 'right', isBold: true
    });
    const tableTitleEmb = await pdfDoc.embedPng(tableTitleImg.buffer);
    page.drawImage(tableTitleEmb, {
      x: width - margin - tableTitleImg.width,
      y: cursorY,
      width: tableTitleImg.width,
      height: tableTitleImg.height
    });
    
    // Underline
    page.drawLine({
      start: { x: width - margin - tableTitleImg.width, y: cursorY - 3 },
      end: { x: width - margin, y: cursorY - 3 },
      thickness: 1,
      color: COLORS.gray200
    });

    cursorY -= 25;
    const dailySchedule = schedule.filter(s => s.day === dayName).sort((a, b) => a.period - b.period);
    
    const tableY = cursorY;
    const rowHeight = 30;
    const tableHeaderHeight = 35;
    const numRows = Math.min(dailySchedule.length, 7);
    
    // Column widths (8 columns)
    const colWidths = {
      serial: contentWidth * 0.06,
      subject: contentWidth * 0.18,
      teacher: contentWidth * 0.18,
      attendance: contentWidth * 0.12,
      participation: contentWidth * 0.12,
      homework: contentWidth * 0.12,
      behavior: contentWidth * 0.12,
      notes: contentWidth * 0.10,
    };

    const headers = [
      { text: 'م', width: colWidths.serial },
      { text: 'المادة', width: colWidths.subject },
      { text: 'المعلم', width: colWidths.teacher },
      { text: 'الحضور', width: colWidths.attendance },
      { text: 'المشاركة', width: colWidths.participation },
      { text: 'الواجبات', width: colWidths.homework },
      { text: 'السلوك', width: colWidths.behavior },
      { text: 'ملاحظات', width: colWidths.notes },
    ];

    // Draw table header
    let headerX = width - margin;
    for (const header of headers) {
      const headerLeftX = headerX - header.width;
      
      page.drawRectangle({
        x: headerLeftX,
        y: tableY - tableHeaderHeight,
        width: header.width,
        height: tableHeaderHeight,
        color: COLORS.gray100,
      });
      
      const hImg = await textToImage(header.text, {
        fontSize: 10,
        color: '#374151',
        align: 'center',
        isBold: true,
        maxWidth: header.width - 10
      });
      const hEmb = await pdfDoc.embedPng(hImg.buffer);
      
      page.drawImage(hEmb, {
        x: headerLeftX + header.width / 2 - hImg.width / 2,
        y: tableY - tableHeaderHeight / 2 - hImg.height / 2,
        width: hImg.width,
        height: hImg.height
      });
      
      // Vertical border
      if (headerX < width - margin) {
        page.drawLine({
          start: { x: headerLeftX, y: tableY },
          end: { x: headerLeftX, y: tableY - tableHeaderHeight },
          thickness: 1,
          color: COLORS.gray300
        });
      }
      
      headerX -= header.width;
    }

    // Bottom border of header
    page.drawLine({
      start: { x: margin, y: tableY - tableHeaderHeight },
      end: { x: width - margin, y: tableY - tableHeaderHeight },
      thickness: 1.5,
      color: COLORS.gray300
    });

    // Draw rows
    let rowY = tableY - tableHeaderHeight;
    for (let i = 0; i < numRows; i++) {
      const session = dailySchedule[i];
      const isEven = i % 2 === 0;
      
      page.drawRectangle({
        x: margin,
        y: rowY - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: isEven ? COLORS.white : COLORS.gray50,
      });

      page.drawLine({
        start: { x: margin, y: rowY - rowHeight },
        end: { x: width - margin, y: rowY - rowHeight },
        thickness: 0.5,
        color: COLORS.gray300
      });

      let cellX = width - margin;
      
      // Serial
      const serialImg = await textToImage(String(session.period), {
        fontSize: 10, color: '#1F2937', align: 'center', isBold: true
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
        fontSize: 10, color: '#1F2937', align: 'right', maxWidth: colWidths.subject - 10, isBold: true
      });
      const subjectEmb = await pdfDoc.embedPng(subjectImg.buffer);
      page.drawImage(subjectEmb, {
        x: cellX - subjectImg.width - 5,
        y: rowY - rowHeight / 2 - subjectImg.height / 2,
        width: subjectImg.width,
        height: subjectImg.height
      });
      cellX -= colWidths.subject;

      // Teacher
      const teacherImg = await textToImage(session.teacher || '-', {
        fontSize: 9, color: '#4B5563', align: 'right', maxWidth: colWidths.teacher - 10
      });
      const teacherEmb = await pdfDoc.embedPng(teacherImg.buffer);
      page.drawImage(teacherEmb, {
        x: cellX - teacherImg.width - 5,
        y: rowY - rowHeight / 2 - teacherImg.height / 2,
        width: teacherImg.width,
        height: teacherImg.height
      });
      cellX -= colWidths.teacher;

      // Attendance
      await drawStatusBox(
        pdfDoc, page,
        attendanceInfo.text,
        attendanceInfo.bg,
        attendanceInfo.border,
        attendanceInfo.textCol,
        cellX - colWidths.attendance / 2,
        rowY - rowHeight / 2,
        colWidths.attendance - 5,
        18
      );
      cellX -= colWidths.attendance;

      // Participation
      if (record.attendance === 'present' && record.participation && record.participation !== 'none') {
        await drawStatusBox(
          pdfDoc, page,
          participationInfo.text,
          participationInfo.bg,
          participationInfo.border,
          participationInfo.textCol,
          cellX - colWidths.participation / 2,
          rowY - rowHeight / 2,
          colWidths.participation - 5,
          18
        );
      }
      cellX -= colWidths.participation;

      // Homework
      if (record.attendance === 'present' && record.homework && record.homework !== 'none') {
        await drawStatusBox(
          pdfDoc, page,
          homeworkInfo.text,
          homeworkInfo.bg,
          homeworkInfo.border,
          homeworkInfo.textCol,
          cellX - colWidths.homework / 2,
          rowY - rowHeight / 2,
          colWidths.homework - 5,
          18
        );
      }
      cellX -= colWidths.homework;

      // Behavior
      if (record.attendance === 'present' && record.behavior && record.behavior !== 'none') {
        await drawStatusBox(
          pdfDoc, page,
          behaviorInfo.text,
          behaviorInfo.bg,
          behaviorInfo.border,
          behaviorInfo.textCol,
          cellX - colWidths.behavior / 2,
          rowY - rowHeight / 2,
          colWidths.behavior - 5,
          18
        );
      }
      cellX -= colWidths.behavior;

      // Notes
      const notesText = record.notes || '-';
      const notesImg = await textToImage(notesText, {
        fontSize: 8, color: '#4B5563', align: 'right', maxWidth: colWidths.notes - 10
      });
      const notesEmb = await pdfDoc.embedPng(notesImg.buffer);
      page.drawImage(notesEmb, {
        x: cellX - notesImg.width - 5,
        y: rowY - rowHeight / 2 - notesImg.height / 2,
        width: notesImg.width,
        height: notesImg.height
      });
      cellX -= colWidths.notes;

      rowY -= rowHeight;
    }

    // ================= NOTES & MESSAGES SECTION =================
    cursorY = rowY - 25;
    
    // General notes
    if (record.notes) {
      const notesBoxHeight = 60;
      page.drawRectangle({
        x: margin,
        y: cursorY - notesBoxHeight,
        width: contentWidth,
        height: notesBoxHeight,
        color: COLORS.white,
        borderColor: COLORS.gray300,
        borderWidth: 1,
      });
      
      const notesTitleImg = await textToImage('الملاحظات العامة على اليوم الدراسي', {
        fontSize: 10, color: '#0D9488', align: 'right', isBold: true
      });
      const notesTitleEmb = await pdfDoc.embedPng(notesTitleImg.buffer);
      page.drawImage(notesTitleEmb, {
        x: width - margin - notesTitleImg.width - 10,
        y: cursorY - 15,
        width: notesTitleImg.width,
        height: notesTitleImg.height
      });
      
      const notesContentImg = await textToImage(record.notes, {
        fontSize: 10, color: '#1F2937', align: 'right', maxWidth: contentWidth - 20, isBold: false
      });
      const notesContentEmb = await pdfDoc.embedPng(notesContentImg.buffer);
      page.drawImage(notesContentEmb, {
        x: width - margin - notesContentImg.width - 10,
        y: cursorY - 40,
        width: notesContentImg.width,
        height: notesContentImg.height
      });
      
      cursorY -= (notesBoxHeight + 15);
    }

    // Counselor message
    if (safeSettings.reportGeneralMessage) {
      const messageBoxHeight = 50;
      page.drawRectangle({
        x: margin,
        y: cursorY - messageBoxHeight,
        width: contentWidth,
        height: messageBoxHeight,
        color: COLORS.blue50,
        borderColor: COLORS.blue200,
        borderWidth: 1,
      });
      
      const messageTitleImg = await textToImage('رسالة الموجه الطلابي / الإدارة', {
        fontSize: 10, color: '#1E40AF', align: 'right', isBold: true
      });
      const messageTitleEmb = await pdfDoc.embedPng(messageTitleImg.buffer);
      page.drawImage(messageTitleEmb, {
        x: width - margin - messageTitleImg.width - 10,
        y: cursorY - 15,
        width: messageTitleImg.width,
        height: messageTitleImg.height
      });
      
      const messageContentImg = await textToImage(`"${safeSettings.reportGeneralMessage}"`, {
        fontSize: 9, color: '#1E3A8A', align: 'center', maxWidth: contentWidth - 20, isBold: false
      });
      const messageContentEmb = await pdfDoc.embedPng(messageContentImg.buffer);
      page.drawImage(messageContentEmb, {
        x: margin + contentWidth / 2 - messageContentImg.width / 2,
        y: cursorY - 35,
        width: messageContentImg.width,
        height: messageContentImg.height
      });
      
      cursorY -= (messageBoxHeight + 15);
    }

    // ================= FOOTER SECTION =================
    const footerY = 80;
    const footerHeight = 60;
    
    // Top border
    page.drawLine({
      start: { x: margin, y: footerY + footerHeight },
      end: { x: width - margin, y: footerY + footerHeight },
      thickness: 1,
      color: COLORS.gray200
    });

    // Left - Educational affairs signature
    const affairsTitleImg = await textToImage('وكيل الشؤون التعليمية', {
      fontSize: 10, color: '#6B7280', align: 'center', isBold: true
    });
    const affairsTitleEmb = await pdfDoc.embedPng(affairsTitleImg.buffer);
    page.drawImage(affairsTitleEmb, {
      x: margin + 50 - affairsTitleImg.width / 2,
      y: footerY + 40,
      width: affairsTitleImg.width,
      height: affairsTitleImg.height
    });
    
    // Signature line
    page.drawLine({
      start: { x: margin + 20, y: footerY + 20 },
      end: { x: margin + 80, y: footerY + 20 },
      thickness: 1,
      color: COLORS.gray300
    });
    
    const signatureLabelImg = await textToImage('التوقيع', {
      fontSize: 8, color: '#9CA3AF', align: 'center', isBold: false
    });
    const signatureLabelEmb = await pdfDoc.embedPng(signatureLabelImg.buffer);
    page.drawImage(signatureLabelEmb, {
      x: margin + 50 - signatureLabelImg.width / 2,
      y: footerY + 10,
      width: signatureLabelImg.width,
      height: signatureLabelImg.height
    });

    // Center - QR Code or stamp placeholder
    const footerCenterX = width / 2;
    if (safeSettings.reportLink) {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(safeSettings.reportLink)}`;
      try {
        const qrCode = await loadImage(pdfDoc, qrCodeUrl);
        if (qrCode) {
          page.drawImage(qrCode, {
            x: footerCenterX - 30,
            y: footerY + 20,
            width: 60,
            height: 60,
          });
        }
      } catch (e) {
        console.warn('Could not load QR code:', e);
      }
    } else {
      // Stamp placeholder
      page.drawRectangle({
        x: footerCenterX - 30,
        y: footerY + 20,
        width: 60,
        height: 60,
        borderColor: COLORS.gray300,
        borderWidth: 2,
        borderDashArray: [3, 3],
      });
      
      const stampPlaceholderImg = await textToImage('مكان الختم', {
        fontSize: 8, color: '#9CA3AF', align: 'center', isBold: false
      });
      const stampPlaceholderEmb = await pdfDoc.embedPng(stampPlaceholderImg.buffer);
      page.drawImage(stampPlaceholderEmb, {
        x: footerCenterX - stampPlaceholderImg.width / 2,
        y: footerY + 45,
        width: stampPlaceholderImg.width,
        height: stampPlaceholderImg.height
      });
    }
    
    const stampLabelImg = await textToImage('ختم المدرسة', {
      fontSize: 8, color: '#9CA3AF', align: 'center', isBold: false
    });
    const stampLabelEmb = await pdfDoc.embedPng(stampLabelImg.buffer);
    page.drawImage(stampLabelEmb, {
      x: footerCenterX - stampLabelImg.width / 2,
      y: footerY + 5,
      width: stampLabelImg.width,
      height: stampLabelImg.height
    });

    // Right - School manager signature
    const managerTitleImg = await textToImage('مدير المدرسة', {
      fontSize: 10, color: '#6B7280', align: 'center', isBold: true
    });
    const managerTitleEmb = await pdfDoc.embedPng(managerTitleImg.buffer);
    page.drawImage(managerTitleEmb, {
      x: width - margin - 50 - managerTitleImg.width / 2,
      y: footerY + 40,
      width: managerTitleImg.width,
      height: managerTitleImg.height
    });
    
    // Signature line
    page.drawLine({
      start: { x: width - margin - 80, y: footerY + 20 },
      end: { x: width - margin - 20, y: footerY + 20 },
      thickness: 1,
      color: COLORS.gray300
    });
    
    page.drawImage(signatureLabelEmb, {
      x: width - margin - 50 - signatureLabelImg.width / 2,
      y: footerY + 10,
      width: signatureLabelImg.width,
      height: signatureLabelImg.height
    });

    // Bottom strip
    const bottomStripY = 20;
    page.drawRectangle({
      x: margin,
      y: bottomStripY,
      width: contentWidth,
      height: 25,
      color: COLORS.gray100,
      borderColor: COLORS.gray200,
      borderWidth: 1,
    });
    
    // Slogan
    if (safeSettings.slogan) {
      const sloganImg = await textToImage(safeSettings.slogan, {
        fontSize: 9, color: '#6B7280', align: 'left', isBold: true
      });
      const sloganEmb = await pdfDoc.embedPng(sloganImg.buffer);
      page.drawImage(sloganEmb, {
        x: margin + 10,
        y: bottomStripY + 8,
        width: sloganImg.width,
        height: sloganImg.height
      });
    }
    
    // Platform info
    const platformText = `صدر عن: نظام التتبع الذكي${safeSettings.whatsappPhone ? ` | Contact: ${safeSettings.whatsappPhone}` : ''}`;
    const platformImg = await textToImage(platformText, {
      fontSize: 8, color: '#6B7280', align: 'right', isBold: false
    });
    const platformEmb = await pdfDoc.embedPng(platformImg.buffer);
    page.drawImage(platformEmb, {
      x: width - margin - platformImg.width - 10,
      y: bottomStripY + 8,
      width: platformImg.width,
      height: platformImg.height
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
