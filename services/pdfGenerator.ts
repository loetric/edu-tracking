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
      const centerY = height / 2 - 10; // Move up a bit to leave space for performance text
      const radius = Math.min(width, height) * 0.28; // Smaller radius to avoid overlap
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

      // Draw labels (smaller font, further out to avoid overlap) - ALL labels including المشاركة
      ctx.font = 'bold 9px ' + ARABIC_FONT_STACK; // Increased font size for better visibility
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < numPoints; i++) {
        const angle = -Math.PI / 2 + (i * angleStep);
        const labelRadius = radius + 30; // Further out to ensure visibility
        const x = centerX + labelRadius * Math.cos(angle);
        const y = centerY + labelRadius * Math.sin(angle);
        
        // Always draw label, even if value is 0 - ensure all labels are visible
        if (data[i] && data[i].subject) {
          ctx.fillText(data[i].subject, x, y);
        }
      }

      // Don't draw performance level text here - it will be drawn below the chart box

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
 * Load image from URL (supports data URLs, blob URLs, and regular URLs)
 */
async function loadImage(pdfDoc: PDFDocument, imageUrl: string): Promise<any> {
  try {
    if (!imageUrl || imageUrl.trim() === '') {
      console.warn('loadImage: Empty image URL');
      return null;
    }
    
    console.log('loadImage: Attempting to load:', imageUrl);
    
    // Handle data URLs
    if (imageUrl.startsWith('data:')) {
      console.log('loadImage: Processing data URL, length:', imageUrl.length);
      const base64Data = imageUrl.split(',')[1];
      if (!base64Data) {
        console.error('loadImage: Invalid data URL format - no base64 data found');
        return null;
      }
      
      console.log('loadImage: Base64 data length:', base64Data.length);
      const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      console.log('loadImage: Image bytes length:', imageBytes.length);
      
      if (imageBytes.length === 0) {
        console.error('loadImage: Empty image bytes from data URL');
        return null;
      }
      
      // Check if PNG or JPG
      const isPng = imageUrl.includes('image/png');
      console.log('loadImage: Is PNG:', isPng, 'data URL prefix:', imageUrl.substring(0, 30));
      
      if (isPng) {
        console.log('loadImage: Attempting to embed PNG from data URL');
        try {
          const embedded = await pdfDoc.embedPng(imageBytes);
          console.log('loadImage: Successfully embedded PNG from data URL');
          return embedded;
        } catch (pngError) {
          console.warn('loadImage: PNG embedding failed, trying JPG:', pngError);
          try {
            const embedded = await pdfDoc.embedJpg(imageBytes);
            console.log('loadImage: Successfully embedded JPG from data URL (fallback)');
            return embedded;
          } catch (jpgError) {
            console.error('loadImage: Both PNG and JPG embedding failed from data URL:', jpgError);
            return null;
          }
        }
      } else {
        console.log('loadImage: Attempting to embed JPG from data URL');
        try {
          const embedded = await pdfDoc.embedJpg(imageBytes);
          console.log('loadImage: Successfully embedded JPG from data URL');
          return embedded;
        } catch (jpgError) {
          console.warn('loadImage: JPG embedding failed, trying PNG:', jpgError);
          try {
            const embedded = await pdfDoc.embedPng(imageBytes);
            console.log('loadImage: Successfully embedded PNG from data URL (fallback)');
            return embedded;
          } catch (pngError) {
            console.error('loadImage: Both JPG and PNG embedding failed from data URL:', pngError);
            return null;
          }
        }
      }
    }
    
    // Handle blob URLs - convert to arrayBuffer using FileReader
    if (imageUrl.startsWith('blob:')) {
      console.log('loadImage: Processing blob URL');
      try {
        // Use FileReader to convert blob to data URL, then to base64
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        if (!blob || blob.size === 0) {
          console.error('loadImage: Empty or invalid blob');
          return null;
        }
        
        // Convert blob to data URL using FileReader
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result && typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('Failed to read blob as data URL'));
            }
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(blob);
        });
        
        // Extract base64 data from data URL
        const base64Data = dataUrl.split(',')[1];
        if (!base64Data) {
          console.error('loadImage: Invalid data URL format from blob');
          return null;
        }
        
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        if (imageBytes.length === 0) {
          console.error('loadImage: Empty image bytes from blob');
          return null;
        }
        
        // Try to determine image type from blob or data URL
        const contentType = blob.type || '';
        const isPng = contentType.includes('png') || dataUrl.includes('image/png') || imageUrl.toLowerCase().includes('.png');
        
        console.log('loadImage: Blob content type:', contentType, 'isPng:', isPng, 'size:', blob.size);
        
        // Try PNG first if detected
        if (isPng) {
          console.log('loadImage: Attempting to embed blob as PNG');
          try {
            const embedded = await pdfDoc.embedPng(imageBytes);
            console.log('loadImage: Successfully embedded blob as PNG');
            return embedded;
          } catch (pngError) {
            console.warn('loadImage: PNG embedding failed, trying JPG:', pngError);
            try {
              const embedded = await pdfDoc.embedJpg(imageBytes);
              console.log('loadImage: Successfully embedded blob as JPG (fallback)');
              return embedded;
            } catch (jpgError) {
              console.error('loadImage: Both PNG and JPG embedding failed:', jpgError);
              return null;
            }
          }
        } else {
          // Try JPG first
          console.log('loadImage: Attempting to embed blob as JPG');
          try {
            const embedded = await pdfDoc.embedJpg(imageBytes);
            console.log('loadImage: Successfully embedded blob as JPG');
            return embedded;
          } catch (jpgError) {
            console.warn('loadImage: JPG embedding failed, trying PNG:', jpgError);
            try {
              const embedded = await pdfDoc.embedPng(imageBytes);
              console.log('loadImage: Successfully embedded blob as PNG (fallback)');
              return embedded;
            } catch (pngError) {
              console.error('loadImage: Both JPG and PNG embedding failed:', pngError);
              return null;
            }
          }
        }
      } catch (blobError) {
        console.error('loadImage: Error processing blob URL:', blobError);
        return null;
      }
    }
    
    // Handle regular URLs
    console.log('loadImage: Fetching image from URL');
    const response = await fetch(imageUrl, {
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      console.error('loadImage: Fetch failed:', response.status, response.statusText);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const imageBytes = new Uint8Array(arrayBuffer);
    
    if (imageBytes.length === 0) {
      console.error('loadImage: Empty image data');
      return null;
    }
    
    const contentType = response.headers.get('content-type') || '';
    const urlLower = imageUrl.toLowerCase();
    
    console.log('loadImage: Content type:', contentType, 'URL lower:', urlLower);
    
    // Try PNG first
    if (contentType.includes('png') || urlLower.includes('.png')) {
      console.log('loadImage: Attempting to embed as PNG');
      try {
        return await pdfDoc.embedPng(imageBytes);
      } catch (pngError) {
        console.warn('loadImage: PNG embedding failed, trying JPG:', pngError);
        // Fallback to JPG
        try {
          return await pdfDoc.embedJpg(imageBytes);
        } catch (jpgError) {
          console.error('loadImage: Both PNG and JPG embedding failed:', jpgError);
          return null;
        }
      }
    } else {
      // Try JPG
      console.log('loadImage: Attempting to embed as JPG');
      try {
        return await pdfDoc.embedJpg(imageBytes);
      } catch (jpgError) {
        console.warn('loadImage: JPG embedding failed, trying PNG:', jpgError);
        // Fallback to PNG
        try {
          return await pdfDoc.embedPng(imageBytes);
        } catch (pngError) {
          console.error('loadImage: Both JPG and PNG embedding failed:', pngError);
          return null;
        }
      }
    }
  } catch (error) {
    console.error('loadImage: Unexpected error:', error);
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
      principalName: settings.principalName || '',
      stampUrl: settings.stampUrl || '',
      ...settings
    };
    
    // Debug: Log settings to console
    console.log('PDF Generator - Settings received:', {
      reportGeneralMessage: safeSettings.reportGeneralMessage,
      stampUrl: safeSettings.stampUrl,
      hasReportGeneralMessage: !!safeSettings.reportGeneralMessage,
      hasStampUrl: !!safeSettings.stampUrl
    });

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
    const headerSectionHeight = 130;
    const headerY = cursorY;
    const headerStartY = headerY; // Unified starting Y position for all header elements
    
    // Unified font size and color for all header texts
    const headerFontSize = 10;
    const headerTextColor = '#2D3748'; // Unified color
    const headerLineSpacing = 18;
    
    // Center column - Logo (BIGGER and ALIGNED with header texts)
    const headerCenterX = width / 2;
    const logoSize = 110; // Bigger logo (increased from 100)
    
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
        
        // Logo aligned with header texts (same Y as headerStartY) - raised 29px (21 + 8)
        page.drawImage(logo, {
          x: headerCenterX - finalLogoWidth / 2,
          y: headerStartY - finalLogoHeight + 29, // Raised 29px (21 + 8)
          width: finalLogoWidth,
          height: finalLogoHeight,
        });
      }
    }
    
    // Title with underline (below logo, centered) - reduced spacing
    const titleY = headerStartY - logoSize - 5; // Reduced from 15 to 5 to remove gap
    const titleText = 'تقرير متابعة يومي';
    const titleImg = await textToImage(titleText, {
      fontSize: 16, color: '#1F2937', align: 'center', isBold: true
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
    
    // Right column - Kingdom info (unified font size and color, same starting Y)
    const rightColX = width - margin;
    let rightY = headerStartY;
    const rightTexts = [
      { text: 'المملكة العربية السعودية', bold: false },
      { text: safeSettings.ministry, bold: true },
      { text: safeSettings.region, bold: true },
      { text: safeSettings.name, bold: true }
    ];
    
    for (const item of rightTexts) {
      const img = await textToImage(item.text, {
        fontSize: headerFontSize,
        color: headerTextColor,
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
      rightY -= headerLineSpacing;
    }

    // Left column - Date and phone (unified font size and color, same starting Y)
    const leftColX = margin;
    const leftColWidth = (width - margin * 2) / 3; // 1/3 of content width
    const leftColRightX = leftColX + leftColWidth;
    let leftY = headerStartY;
    
    const dateLabelImg = await textToImage('تاريخ التقرير', {
      fontSize: headerFontSize, color: headerTextColor, align: 'right', isBold: false
    });
    const dateLabelEmb = await pdfDoc.embedPng(dateLabelImg.buffer);
    page.drawImage(dateLabelEmb, {
      x: leftColRightX - dateLabelImg.width,
      y: leftY,
      width: dateLabelImg.width,
      height: dateLabelImg.height
    });
    
    leftY -= headerLineSpacing;
    const dateValueImg = await textToImage(dateStr, {
      fontSize: headerFontSize, color: headerTextColor, align: 'right', isBold: true
    });
    const dateValueEmb = await pdfDoc.embedPng(dateValueImg.buffer);
    page.drawImage(dateValueEmb, {
      x: leftColRightX - dateValueImg.width,
      y: leftY,
      width: dateValueImg.width,
      height: dateValueImg.height
    });
    
    leftY -= headerLineSpacing;
    const dayImg = await textToImage(dayName, {
      fontSize: headerFontSize, color: headerTextColor, align: 'right', isBold: false
    });
    const dayEmb = await pdfDoc.embedPng(dayImg.buffer);
    page.drawImage(dayEmb, {
      x: leftColRightX - dayImg.width,
      y: leftY,
      width: dayImg.width,
      height: dayImg.height
    });
    
    if (safeSettings.whatsappPhone) {
      leftY -= headerLineSpacing;
      const phoneText = safeSettings.whatsappPhone;
      const phoneImg = await textToImage(phoneText, {
        fontSize: headerFontSize, color: headerTextColor, align: 'right', isBold: false
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
    cursorY = headerStartY - headerSectionHeight - 5;
    page.drawLine({
      start: { x: margin, y: cursorY },
      end: { x: width - margin, y: cursorY },
      thickness: 2,
      color: COLORS.gray200
    });

    // ================= STUDENT INFO CARD (Enhanced) =================

    cursorY -= 0; // Remove space between header and report

    const cardHeight = 85;

    const cardY = cursorY;

    

    // Card shadow

    page.drawRectangle({

      x: margin + 3,

      y: cardY - cardHeight - 3,

      width: contentWidth,

      height: cardHeight,

      color: rgb(0, 0, 0),

      opacity: 0.06

    });

    

    // Main card

    page.drawRectangle({

      x: margin,

      y: cardY - cardHeight,

      width: contentWidth,

      height: cardHeight,

      color: COLORS.white,

      borderColor: COLORS.gray300,

      borderWidth: 1.5,

    });

    

    // Left accent

    page.drawRectangle({

      x: margin,

      y: cardY - cardHeight,

      width: 4,

      height: cardHeight,

      color: COLORS.teal600,

    });



    // Student details grid (perfectly aligned)

    const cellWidth = contentWidth / 2;

    const cellHeight = cardHeight / 2;

    

    // الاسم الرباعي وجوال ولي الأمر في الخانات اليمنى (col 0)
    const studentDetails = [

      { label: 'الاسم الرباعي', value: student.name || '-', row: 0, col: 0 }, // Right column, top

      { label: 'الفصل', value: student.classGrade || '-', row: 0, col: 1 }, // Left column, top

      { label: 'جوال ولي الأمر', value: student.parentPhone || '-', row: 1, col: 0 }, // Right column, bottom

      { label: 'حالة التقرير', value: 'معتمد من المدرسة', row: 1, col: 1, isSpecial: true } // Left column, bottom

    ];

    

    for (const detail of studentDetails) {

      const cellX = margin + detail.col * cellWidth;

      const cellY = cardY - detail.row * cellHeight;

      

      // Cell background

      if (detail.isSpecial) {

        page.drawRectangle({

          x: cellX,

          y: cellY - cellHeight,

          width: cellWidth,

          height: cellHeight,

          color: COLORS.green50,

        });

      }

      

      // Borders

      page.drawLine({

        start: { x: cellX, y: cellY },

        end: { x: cellX + cellWidth, y: cellY },

        thickness: 0.8,

        color: COLORS.gray200

      });

      page.drawLine({

        start: { x: cellX, y: cellY - cellHeight },

        end: { x: cellX + cellWidth, y: cellY - cellHeight },

        thickness: 0.8,

        color: COLORS.gray200

      });

      page.drawLine({

        start: { x: cellX, y: cellY },

        end: { x: cellX, y: cellY - cellHeight },

        thickness: 0.8,

        color: COLORS.gray200

      });

      

      // Label (perfectly aligned) - lowered 5px more

      const labelImg = await textToImage(detail.label, {

        fontSize: 9, color: '#718096', align: 'right', isBold: true

      });

      const labelEmb = await pdfDoc.embedPng(labelImg.buffer);

      page.drawImage(labelEmb, {

        x: cellX + cellWidth - labelImg.width - 12,

        y: cellY - cellHeight / 2 - 2, // Lowered 5px more (from 3 to -2)

        width: labelImg.width,

        height: labelImg.height

      });

      

      // Value (perfectly aligned)

      const valueColor = detail.isSpecial ? '#0D9488' : '#1F2937';

      const valueImg = await textToImage(detail.value, {

        fontSize: 11, 

        color: valueColor, 

        align: 'right', 

        isBold: true, 

        maxWidth: cellWidth - 24

      });

      const valueEmb = await pdfDoc.embedPng(valueImg.buffer);

      page.drawImage(valueEmb, {

        x: cellX + cellWidth - valueImg.width - 12,

        y: cellY - cellHeight / 2 - 18, // Lowered 4px more (from -14 to -18)

        width: valueImg.width,

        height: valueImg.height

      });

    }

    // ================= SUMMARY SECTION (Enhanced) =================
    cursorY -= (cardHeight + 25);
    

    // Section title with icon

    const summaryTitleImg = await textToImage('⭐ ملخص الأداء والمستوى اليومي', {

      fontSize: 13, color: '#0D9488', align: 'right', isBold: true

    });

    const summaryTitleEmb = await pdfDoc.embedPng(summaryTitleImg.buffer);

    page.drawImage(summaryTitleEmb, {

      x: width - margin - summaryTitleImg.width,

      y: cursorY - 3, // Lowered 3px

      width: summaryTitleImg.width,

      height: summaryTitleImg.height

    });

    

    page.drawLine({

      start: { x: width - margin - summaryTitleImg.width, y: cursorY - 7 }, // Adjusted for lowered title

      end: { x: width - margin, y: cursorY - 7 },

      thickness: 2,

      color: COLORS.teal600

    });



    cursorY -= 30;
    // Cards only - no chart here (chart moved to footer)
    const summaryBoxHeight = 40; // Smaller boxes
    const summaryBoxWidth = (contentWidth - 45) / 4; // 4 cards in one row (instead of 2x2)



    // Summary cards (right) with enhanced styling

    const summaryItems = [

      { label: 'الحضور', info: attendanceInfo, icon: '✓' },

      { label: 'المشاركة', info: participationInfo, icon: '📊' },

      { label: 'الواجبات', info: homeworkInfo, icon: '📝' },

      { label: 'السلوك', info: behaviorInfo, icon: '⭐' }

    ];

    

    // All cards in one row (4 cards)
    let summaryX = width - margin;

    for (const item of summaryItems) {

      const boxX = summaryX - summaryBoxWidth;

      const boxY = cursorY; // All in same row

      

      // Box shadow

      page.drawRectangle({

        x: boxX + 1,

        y: boxY - summaryBoxHeight - 1,

        width: summaryBoxWidth - 5,

        height: summaryBoxHeight,

        color: rgb(0, 0, 0),

        opacity: 0.03

      });

      
      // Draw card background and border
      page.drawRectangle({
        x: boxX,
        y: boxY - summaryBoxHeight,
        width: summaryBoxWidth - 5,
        height: summaryBoxHeight,
        color: item.info.bg,
        borderColor: item.info.border,
        borderWidth: 0.8,
      });

      // Label with icon - at top of card (above values) - adjusted for smaller box
      const labelText = `${item.icon} ${item.label}`;
      const labelImg = await textToImage(labelText, {
        fontSize: 8, color: '#4B5563', align: 'center', isBold: true // Reduced from 9 to 8
      });
      const labelEmb = await pdfDoc.embedPng(labelImg.buffer);
      page.drawImage(labelEmb, {
        x: boxX + (summaryBoxWidth - 5) / 2 - labelImg.width / 2,
        y: boxY - 8, // Lowered 5px (from -3 to -8)
        width: labelImg.width,
        height: labelImg.height
      });

      // Value text - at bottom of card (below label) - adjusted for smaller box
      const valueImg = await textToImage(item.info.text, {
        fontSize: 9, // Keep at 9 (slightly larger)
        color: `rgb(${Math.round(item.info.textCol.r * 255)}, ${Math.round(item.info.textCol.g * 255)}, ${Math.round(item.info.textCol.b * 255)})`, 
        align: 'center', 
        isBold: true, 
        maxWidth: summaryBoxWidth - 20
      });
      const valueEmb = await pdfDoc.embedPng(valueImg.buffer);
      page.drawImage(valueEmb, {
        x: boxX + (summaryBoxWidth - 5) / 2 - valueImg.width / 2,
        y: boxY - summaryBoxHeight + 12, // Lowered 3px (from 15 to 12)

        width: valueImg.width,

        height: valueImg.height

      });

      

      // Move to next card (all in one row)
      summaryX -= summaryBoxWidth;
    }

    // ================= TABLE SECTION (Enhanced) =================
    cursorY -= (summaryBoxHeight + 25); // Adjusted spacing for single row (from 2 rows to 1 row)
    

    // Table title with icon - lowered 3px

    const tableTitleImg = await textToImage('📋 كشف المتابعة والحصص الدراسية', {

      fontSize: 13, color: '#0D9488', align: 'right', isBold: true

    });

    const tableTitleEmb = await pdfDoc.embedPng(tableTitleImg.buffer);

    page.drawImage(tableTitleEmb, {

      x: width - margin - tableTitleImg.width,

      y: cursorY - 3, // Lowered 3px

      width: tableTitleImg.width,

      height: tableTitleImg.height

    });

    

    page.drawLine({

      start: { x: width - margin - tableTitleImg.width, y: cursorY - 4 },

      end: { x: width - margin, y: cursorY - 4 },

      thickness: 2,

      color: COLORS.teal600

    });



    cursorY -= 30;
    const dailySchedule = schedule.filter(s => s.day === dayName).sort((a, b) => a.period - b.period);
    

    const tableY = cursorY;
    const rowHeight = 22; // Even smaller table
    const tableHeaderHeight = 26; // Even smaller header
    const numRows = Math.min(dailySchedule.length, 7);
    

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



    // Table shadow

    page.drawRectangle({

      x: margin + 2,

      y: tableY - tableHeaderHeight - numRows * rowHeight - 2,

      width: contentWidth,

      height: tableHeaderHeight + numRows * rowHeight,

      color: rgb(0, 0, 0),

      opacity: 0.04

    });



    // Draw header

    let headerX = width - margin;
    for (const header of headers) {

      const headerLeftX = headerX - header.width;

      

      // Header gradient effect

      page.drawRectangle({

        x: headerLeftX,

        y: tableY - tableHeaderHeight,

        width: header.width,

        height: tableHeaderHeight,

        color: COLORS.gray100,

      });

      

      const hImg = await textToImage(header.text, {

        fontSize: 9, // Smaller font

        color: '#374151',

        align: 'center',

        isBold: true,

        maxWidth: header.width - 6 // Less padding

      });

      const hEmb = await pdfDoc.embedPng(hImg.buffer);

      

      // Perfectly centered

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



    page.drawLine({

      start: { x: margin, y: tableY - tableHeaderHeight },

      end: { x: width - margin, y: tableY - tableHeaderHeight },

      thickness: 2,

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

        color: COLORS.gray200

      });



      let cellX = width - margin;

      

      // Serial (centered) - smaller font

      const serialImg = await textToImage(String(session.period), {

        fontSize: 8, color: '#1F2937', align: 'center', isBold: true

      });

      const serialEmb = await pdfDoc.embedPng(serialImg.buffer);

      page.drawImage(serialEmb, {

        x: cellX - colWidths.serial / 2 - serialImg.width / 2,

        y: rowY - rowHeight / 2 - serialImg.height / 2,

        width: serialImg.width,

        height: serialImg.height

      });

      cellX -= colWidths.serial;



      // Subject (right aligned) - smaller font

      const subjectImg = await textToImage(session.subject || '-', {

        fontSize: 8, color: '#1F2937', align: 'right', maxWidth: colWidths.subject - 12, isBold: true

      });

      const subjectEmb = await pdfDoc.embedPng(subjectImg.buffer);

      page.drawImage(subjectEmb, {

        x: cellX - subjectImg.width - 8,

        y: rowY - rowHeight / 2 - subjectImg.height / 2,

        width: subjectImg.width,

        height: subjectImg.height

      });

      cellX -= colWidths.subject;



      // Teacher (right aligned) - smaller font

      const teacherImg = await textToImage(session.teacher || '-', {

        fontSize: 7, color: '#4B5563', align: 'right', maxWidth: colWidths.teacher - 12

      });

      const teacherEmb = await pdfDoc.embedPng(teacherImg.buffer);

      page.drawImage(teacherEmb, {

        x: cellX - teacherImg.width - 8,

        y: rowY - rowHeight / 2 - teacherImg.height / 2,

        width: teacherImg.width,

        height: teacherImg.height

      });

      cellX -= colWidths.teacher;



      // Status boxes (perfectly centered)

      await drawStatusBox(

        pdfDoc, page,

        attendanceInfo.text,

        attendanceInfo.bg,

        attendanceInfo.border,

        attendanceInfo.textCol,

        cellX - colWidths.attendance / 2,

        rowY - rowHeight / 2,

        colWidths.attendance - 8,

        20

      );

      cellX -= colWidths.attendance;



      if (record.attendance === 'present' && record.participation && record.participation !== 'none') {

        await drawStatusBox(

          pdfDoc, page,

          participationInfo.text,

          participationInfo.bg,

          participationInfo.border,

          participationInfo.textCol,

          cellX - colWidths.participation / 2,

          rowY - rowHeight / 2,

          colWidths.participation - 8,

          20

        );

      }

      cellX -= colWidths.participation;



      if (record.attendance === 'present' && record.homework && record.homework !== 'none') {

        await drawStatusBox(

          pdfDoc, page,

          homeworkInfo.text,

          homeworkInfo.bg,

          homeworkInfo.border,

          homeworkInfo.textCol,

          cellX - colWidths.homework / 2,

          rowY - rowHeight / 2,

          colWidths.homework - 8,

          20

        );

      }

      cellX -= colWidths.homework;



      if (record.attendance === 'present' && record.behavior && record.behavior !== 'none') {

        await drawStatusBox(

          pdfDoc, page,

          behaviorInfo.text,

          behaviorInfo.bg,

          behaviorInfo.border,

          behaviorInfo.textCol,

          cellX - colWidths.behavior / 2,

          rowY - rowHeight / 2,

          colWidths.behavior - 8,

          20

        );

      }

      cellX -= colWidths.behavior;



      // Notes - smaller font

      const notesText = record.notes || '-';

      const notesImg = await textToImage(notesText, {

        fontSize: 7, color: '#4B5563', align: 'right', maxWidth: colWidths.notes - 12

      });

      const notesEmb = await pdfDoc.embedPng(notesImg.buffer);

      page.drawImage(notesEmb, {

        x: cellX - notesImg.width - 6,

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
        y: cursorY - 20, // Moved down to avoid border overlap
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
    const counselorMessage = safeSettings.reportGeneralMessage?.trim();
    console.log('Checking counselor message:', { 
      exists: !!safeSettings.reportGeneralMessage, 
      trimmed: counselorMessage,
      length: counselorMessage?.length 
    });
    if (counselorMessage && counselorMessage !== '') {
      console.log('Drawing counselor message:', counselorMessage);
      const messageBoxHeight = 50;
      // Lower the message box by 20px more (total 40px from original)
      page.drawRectangle({
        x: margin,
        y: cursorY - messageBoxHeight - 40, // Lowered 20px more (from -20 to -40)
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
        y: cursorY - 60, // Adjusted for lowered box (from -40 to -60)
        width: messageTitleImg.width,
        height: messageTitleImg.height
      });
      
      const messageContentImg = await textToImage(`"${safeSettings.reportGeneralMessage}"`, {
        fontSize: 9, color: '#1E3A8A', align: 'center', maxWidth: contentWidth - 20, isBold: false
      });
      const messageContentEmb = await pdfDoc.embedPng(messageContentImg.buffer);
      page.drawImage(messageContentEmb, {
        x: margin + contentWidth / 2 - messageContentImg.width / 2,
        y: cursorY - 80, // Adjusted for lowered box (from -60 to -80)
        width: messageContentImg.width,
        height: messageContentImg.height
      });
      
      cursorY -= (messageBoxHeight + 5); // Reduced spacing - removed separator line
    }

    // ================= FOOTER SECTION (Enhanced) =================
    const footerY = 55;
    const footerHeight = 65;
    

    // Top border with gradient - removed (no separator line between message and footer)



    // QR Code/Stamp (centered) - lowered 10px more (can overlap with footer box)

    const footerCenterX = width / 2;
    const stampY = footerY - 3; // Lowered 10px more (from 7 to -3, can overlap)
    

    if (safeSettings.stampUrl && safeSettings.stampUrl.trim() !== '') {

      const stamp = await loadImage(pdfDoc, safeSettings.stampUrl);

      if (stamp) {

        const stampDims = stamp.scale(1);

        const stampAspectRatio = stampDims.width / stampDims.height;

        let stampWidth = 55;

        let stampHeight = 55;

        

        if (stampAspectRatio > 1) {

          stampHeight = 55 / stampAspectRatio;

        } else {

          stampWidth = 55 * stampAspectRatio;

        }

        

        page.drawImage(stamp, {

          x: footerCenterX - stampWidth / 2,

          y: stampY,

          width: stampWidth,

          height: stampHeight,

        });

      }

    } else if (safeSettings.reportLink && safeSettings.reportLink.trim() !== '') {

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(safeSettings.reportLink)}`;

      const qrCode = await loadImage(pdfDoc, qrCodeUrl);

      if (qrCode) {

        page.drawImage(qrCode, {

          x: footerCenterX - 27.5,

          y: stampY,

          width: 55,

          height: 55,

        });

      }

    } else {

      // Placeholder

      page.drawRectangle({

        x: footerCenterX - 27.5,

        y: stampY,

        width: 55,

        height: 55,

        borderColor: COLORS.gray300,

        borderWidth: 2,

        borderDashArray: [4, 4],

      });

      

      const stampPlaceholderImg = await textToImage('مكان الختم', {

        fontSize: 8, color: '#9CA3AF', align: 'center', isBold: false

      });

      const stampPlaceholderEmb = await pdfDoc.embedPng(stampPlaceholderImg.buffer);

      page.drawImage(stampPlaceholderEmb, {

        x: footerCenterX - stampPlaceholderImg.width / 2,

        y: stampY + 22,

        width: stampPlaceholderImg.width,

        height: stampPlaceholderImg.height

      });

    }



    // Manager signature (left) - lowered 5px more

    const managerTitleImg = await textToImage('مدير المدرسة', {

      fontSize: 10, color: '#4B5563', align: 'center', isBold: true

    });

    const managerTitleEmb = await pdfDoc.embedPng(managerTitleImg.buffer);

    page.drawImage(managerTitleEmb, {

      x: margin + 60 - managerTitleImg.width / 2, // Moved to left (from width - margin - 60)

      y: footerY + 22, // Lowered 5px more (from 27 to 22)

      width: managerTitleImg.width,

      height: managerTitleImg.height

    });

    

    if (safeSettings.principalName) {

      const managerNameImg = await textToImage(safeSettings.principalName, {

        fontSize: 9, color: '#6B7280', align: 'center', isBold: false

      });

      const managerNameEmb = await pdfDoc.embedPng(managerNameImg.buffer);

      page.drawImage(managerNameEmb, {

        x: margin + 60 - managerNameImg.width / 2, // Moved to left (from width - margin - 60)

        y: footerY + 7, // Lowered 5px more (from 12 to 7)

        width: managerNameImg.width,

        height: managerNameImg.height

      });

    }



    // Bottom strip (enhanced)

    const bottomStripY = 12;
    const bottomStripHeight = 28;
    

    page.drawRectangle({

      x: margin,

      y: bottomStripY,

      width: contentWidth,

      height: bottomStripHeight,

      color: COLORS.gray100,

      borderColor: COLORS.gray200,

      borderWidth: 1,

    });

    

    // Slogan

    if (safeSettings.slogan) {

      const sloganImg = await textToImage(`✨ ${safeSettings.slogan}`, {

        fontSize: 9, color: '#0D9488', align: 'left', isBold: true

      });

      const sloganEmb = await pdfDoc.embedPng(sloganImg.buffer);

      page.drawImage(sloganEmb, {

        x: margin + 10,

        y: bottomStripY + bottomStripHeight / 2 - sloganImg.height / 2,

        width: sloganImg.width,

        height: sloganImg.height

      });

    }

    

    // Platform info

    const platformText = `صدر عن: نظام التتبع الذكي${safeSettings.whatsappPhone ? ` | رقم المدرسة: ${safeSettings.whatsappPhone}` : ''}`;

    const platformImg = await textToImage(platformText, {

      fontSize: 8, color: '#6B7280', align: 'right', isBold: false

    });

    const platformEmb = await pdfDoc.embedPng(platformImg.buffer);

    page.drawImage(platformEmb, {

      x: width - margin - platformImg.width - 10,

      y: bottomStripY + bottomStripHeight / 2 - platformImg.height / 2,

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
