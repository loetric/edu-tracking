
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, Check, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { Student } from '../types';
// @ts-ignore - xlsx doesn't have types by default
import * as XLSX from 'xlsx';

interface ExcelImporterProps {
  onImport: (newStudents: Student[]) => Promise<void>;
}

/**
 * Extracts the first part of classGrade (before underscore, dash, or other separators)
 * Example: "الرابع الابتدائي_عام بنين - We can Mc Graw Hill" -> "الرابع الابتدائي"
 */
const extractClassGrade = (text: string): string => {
  if (!text) return '';
  
  // Remove extra spaces
  let cleaned = text.trim();
  
  // Split by common separators: underscore, dash, hyphen, pipe, or " - "
  const separators = ['_', '-', '–', '—', '|', ' - ', ' – '];
  
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      cleaned = cleaned.split(sep)[0].trim();
      break;
    }
  }
  
  return cleaned;
};

/**
 * Cleans phone number - removes all non-numeric characters and limits to 13 digits
 */
const cleanPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '').slice(0, 13);
};

/**
 * Cleans student ID - removes all non-numeric characters and limits to 10 digits
 */
const cleanStudentId = (id: string | number): string => {
  if (!id) return '';
  return String(id).replace(/[^0-9]/g, '').slice(0, 10);
};

/**
 * Cleans student name - removes non-letter characters and limits to 50 characters
 */
const cleanStudentName = (name: string): string => {
  if (!name) return '';
  // Allow Arabic and English letters, spaces, and common Arabic characters
  return name.replace(/[^a-zA-Z\u0600-\u06FF\s\u0640]/g, '').slice(0, 50).trim();
};

/**
 * Generates a unique student ID
 * If studentNumber is provided and valid, use it. Otherwise generate a unique ID.
 * If there are duplicates, append index to make it unique.
 */
const generateStudentId = (studentNumber?: string | number, index?: number, existingIds?: Set<string>): string => {
  let baseId: string;
  
  if (studentNumber) {
    const cleaned = cleanStudentId(studentNumber);
    if (cleaned) {
      baseId = cleaned;
    } else {
      // Generate a numeric ID if no valid student number
      baseId = `${Date.now()}${index || Math.floor(Math.random() * 1000)}`.slice(0, 10);
    }
  } else {
    // Generate a numeric ID if no valid student number
    baseId = `${Date.now()}${index || Math.floor(Math.random() * 1000)}`.slice(0, 10);
  }
  
  // If we have existingIds set and baseId already exists, make it unique
  if (existingIds && existingIds.has(baseId)) {
    // Append index to make it unique
    const uniqueId = `${baseId}_${index || Date.now()}`.slice(0, 20); // Max 20 chars
    return uniqueId;
  }
  
  return baseId;
};

/**
 * Find the header row by searching for common header keywords
 */
const findHeaderRow = (jsonData: any[]): number => {
  // Keywords that indicate a header row
  const headerKeywords = [
    'اسم', 'name', 'الطالب', 'student', 'student_name',
    'رقم', 'number', 'id', 'student_id', 'طالب',
    'جوال', 'phone', 'mobile', 'parent', 'ولي',
    'صف', 'class', 'grade', 'الصف', 'class_grade',
    'فصل', 'classroom', 'room', 'الفصل', 'section'
  ];
  
  // Search from top to bottom (max 20 rows to avoid performance issues)
  for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
    const row = (jsonData[i] as any[]) || [];
    const rowText = row.map((cell: any) => String(cell || '').toLowerCase().trim()).join(' ');
    
    // Check if this row contains multiple header keywords
    let matchCount = 0;
    for (const keyword of headerKeywords) {
      if (rowText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }
    
    // If we found 2 or more header keywords, this is likely the header row
    if (matchCount >= 2) {
      return i;
    }
  }
  
  // Default to first row if no header found
  return 0;
};

/**
 * Process a single Excel sheet and extract student data
 */
const processSheet = (worksheet: XLSX.WorkSheet, sheetName: string): Student[] => {
  const students: Student[] = [];
  
  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  if (jsonData.length < 2) {
    return students; // Empty or insufficient data
  }

  // Find the header row (not necessarily the first row)
  const headerRowIndex = findHeaderRow(jsonData);
  const headers = (jsonData[headerRowIndex] as any[]).map((h: any) => String(h || '').toLowerCase().trim());
  
  // Find column indices with smart matching
  const findColumnIndex = (keywords: string[], excludeKeywords: string[] = []): number => {
    for (const keyword of keywords) {
      const index = headers.findIndex((h, idx) => {
        // Skip if this column matches any exclude keyword
        const hLower = h.toLowerCase();
        for (const exclude of excludeKeywords) {
          if (hLower.includes(exclude.toLowerCase()) || exclude.toLowerCase().includes(hLower)) {
            return false;
          }
        }
        
        const keywordLower = keyword.toLowerCase();
        return hLower.includes(keywordLower) || 
               keywordLower.includes(hLower) ||
               hLower.replace(/\s+/g, '') === keywordLower.replace(/\s+/g, '');
      });
      if (index !== -1) return index;
    }
    return -1;
  };

  // Find student number column - prioritize "رقم الطالب" (Student ID)
  // Exclude "رقم الصف" to avoid confusion
  const studentNumberIndex = findColumnIndex(
    ['رقم الطالب', 'student_id', 'studentid', 'student number', 'student id'],
    ['رقم الصف', 'class number', 'class_grade', 'classgrade', 'class grade', 'الصف', 'class', 'grade']
  );
  
  // If not found with specific keywords, try general ones but still exclude class-related
  const studentNumberIndexFallback = studentNumberIndex === -1 
    ? findColumnIndex(['رقم', 'number', 'id'], ['الصف', 'class', 'grade', 'classroom', 'room'])
    : studentNumberIndex;
  
  // Find name column
  const nameIndex = findColumnIndex(['اسم الطالب', 'اسم', 'name', 'الطالب', 'student_name', 'studentname', 'الاسم']);
  
  // Find class grade column - prioritize "رقم الصف" (Class Number)
  const classIndex = findColumnIndex(['رقم الصف', 'class number', 'class_grade', 'classgrade', 'class grade', 'الصف', 'class', 'grade', 'الدرجة', 'level']);
  
  // Find class room/section column - prioritize "الفصل" (Semester/Section)
  const classRoomIndex = findColumnIndex(['الفصل', 'فصل', 'classroom', 'room', 'section', 'sec', 'semester']);
  
  // Find phone column - prioritize "الجوال" but exclude "رقم الطالب" and "رقم الصف"
  const phoneIndex = findColumnIndex(
    ['الجوال', 'جوال', 'phone', 'mobile', 'parent_phone', 'parentphone', 'parent phone', 'contact', 'telephone', 'ولي'],
    ['رقم الطالب', 'رقم الصف', 'student', 'class']
  );

  // Verify we found at least name or student number column
  if (nameIndex === -1 && studentNumberIndexFallback === -1) {
    console.warn('Could not find name or student number columns in header row', headerRowIndex);
    return students;
  }
  
  // Debug: Log found columns (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Found columns:', {
      studentNumber: studentNumberIndexFallback >= 0 ? headers[studentNumberIndexFallback] : 'NOT FOUND',
      name: nameIndex >= 0 ? headers[nameIndex] : 'NOT FOUND',
      classGrade: classIndex >= 0 ? headers[classIndex] : 'NOT FOUND',
      classRoom: classRoomIndex >= 0 ? headers[classRoomIndex] : 'NOT FOUND',
      phone: phoneIndex >= 0 ? headers[phoneIndex] : 'NOT FOUND'
    });
  }

  // Track IDs to ensure uniqueness within the sheet
  const seenIds = new Set<string>();

  // Process rows starting from the row after the header
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;

    const studentNumber = (studentNumberIndexFallback >= 0 ? String(row[studentNumberIndexFallback] || '').trim() : '');
    const name = nameIndex >= 0 ? String(row[nameIndex] || '').trim() : '';
    const classGradeRaw = classIndex >= 0 ? String(row[classIndex] || '').trim() : '';
    const classRoom = classRoomIndex >= 0 ? String(row[classRoomIndex] || '').trim() : '';
    const phone = phoneIndex >= 0 ? String(row[phoneIndex] || '').trim() : '';

    // Skip empty rows
    if (!name && !studentNumber) continue;

    // Extract classGrade (first part only)
    let classGrade = extractClassGrade(classGradeRaw);
    
    // If classRoom exists, combine it with classGrade
    if (classRoom && classGrade) {
      classGrade = `${classGrade}/${classRoom}`;
    } else if (classRoom && !classGrade) {
      classGrade = classRoom;
    }

    // Generate ID (clean and validate) - pass seenIds to ensure uniqueness
    let id = generateStudentId(studentNumber, i, seenIds);
    
    // If ID still exists, keep trying until we get a unique one
    let attempts = 0;
    while (seenIds.has(id) && attempts < 100) {
      id = generateStudentId(studentNumber, i + attempts * 1000, seenIds);
      attempts++;
    }
    
    if (!id || id.length === 0) continue; // Skip if no valid ID
    
    // Add to seenIds to track uniqueness
    seenIds.add(id);

    // Clean and validate name
    const cleanedName = cleanStudentName(name);
    if (!cleanedName || cleanedName.length === 0) continue; // Skip if no valid name

    // Clean phone (limit to 13 digits)
    const cleanedPhone = cleanPhoneNumber(phone);

    students.push({
      id,
      name: cleanedName,
      classGrade: classGrade || 'غير محدد',
      parentPhone: cleanedPhone || '',
      challenge: 'none',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanedName)}&background=random`,
      studentNumber: studentNumber || id // حفظ رقم الطالب الأصلي
    });
  }
  
  return students;
};

/**
 * Intelligently find the best sheet containing student data
 */
const findBestSheet = (workbook: XLSX.WorkBook): string | null => {
  const sheetNames = workbook.SheetNames;
  
  // Keywords that indicate student data
  const studentKeywords = ['طالب', 'student', 'students', 'الطلاب', 'بيانات', 'data', 'list'];
  
  // Score each sheet
  const sheetScores = sheetNames.map(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    if (jsonData.length < 2) return { name: sheetName, score: 0 };
    
    let score = 0;
    const sheetNameLower = sheetName.toLowerCase();
    
    // Check sheet name
    for (const keyword of studentKeywords) {
      if (sheetNameLower.includes(keyword.toLowerCase())) {
        score += 10;
      }
    }
    
    // Check headers (first row)
    const headers = (jsonData[0] as any[]).map((h: any) => String(h || '').toLowerCase().trim());
    const headerText = headers.join(' ');
    
    // Look for student-related columns
    const studentColumns = ['رقم', 'number', 'id', 'student', 'طالب', 'اسم', 'name', 'الطالب'];
    for (const col of studentColumns) {
      if (headerText.includes(col.toLowerCase())) {
        score += 5;
      }
    }
    
    // Prefer sheets with more rows (more data)
    score += Math.min(jsonData.length - 1, 20); // Cap at 20 points
    
    return { name: sheetName, score };
  });
  
  // Sort by score and return the best one
  sheetScores.sort((a, b) => b.score - a.score);
  
  return sheetScores[0].score > 0 ? sheetScores[0].name : sheetNames[0];
};

export const ExcelImporter: React.FC<ExcelImporterProps> = ({ onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('جاري معالجة الملف...');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Prevent page navigation during import
  useEffect(() => {
    if (isLoading) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'جاري استيراد البيانات. هل أنت متأكد من الخروج؟';
        return e.returnValue;
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isLoading]);

  // Prevent page navigation during import
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isLoading) {
        e.preventDefault();
        e.returnValue = 'جاري استيراد البيانات. هل أنت متأكد من الخروج؟';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isLoading]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) processFile(files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    // Reset all states when starting a new file upload
    setError(null);
    setSuccess(false);
    setImportedCount(0);
    setIsLoading(true);
    setLoadingMessage('جاري قراءة الملف...');
    setAvailableSheets([]);
    setSelectedSheet('');
    setShowSheetSelector(false);

    // Check file extension
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCSV = fileName.endsWith('.csv');

    if (!isExcel && !isCSV) {
      setError('الرجاء رفع ملف بصيغة Excel (.xlsx, .xls) أو CSV.');
      setIsLoading(false);
      return;
    }

    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        setLoadingMessage('جاري معالجة البيانات...');
        setProgress({ current: 0, total: 100 });
        const data = event.target?.result;
        let newStudents: Student[] = [];

        if (isExcel) {
          // Process Excel file
          setLoadingMessage('جاري قراءة ملف Excel...');
          setProgress({ current: 10, total: 100 });
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Find the best sheet with student data
          setLoadingMessage('جاري البحث عن البيانات...');
          setProgress({ current: 20, total: 100 });
          const bestSheetName = findBestSheet(workbook);
          
          if (!bestSheetName) {
            setError('لم يتم العثور على بيانات صالحة في الملف.');
            setIsLoading(false);
            setProgress({ current: 0, total: 0 });
            return;
          }

          // Process the best sheet using the dedicated function
          setLoadingMessage('جاري استخراج بيانات الطلاب...');
          setProgress({ current: 30, total: 100 });
          
          // Use processSheet function
          const sheetStudents = processSheet(workbook.Sheets[bestSheetName], bestSheetName);
          
          // Update progress after processing
          if (sheetStudents.length > 0) {
            setProgress({ current: 80, total: 100 });
            setLoadingMessage(`تم استخراج ${sheetStudents.length} طالب بنجاح`);
          } else {
            setProgress({ current: 50, total: 100 });
            setLoadingMessage('لم يتم العثور على بيانات صالحة في الورقة المحددة، جاري البحث في جميع الأوراق...');
          }
          
          if (sheetStudents.length === 0) {
            // Try processing all sheets if best sheet didn't work
            setLoadingMessage('جاري البحث في جميع الأوراق...');
            let allStudents: Student[] = [];
            for (const sheetName of workbook.SheetNames) {
              const studentsFromSheet = processSheet(workbook.Sheets[sheetName], sheetName);
              allStudents = [...allStudents, ...studentsFromSheet];
            }
            
            if (allStudents.length === 0) {
              setError('لم يتم العثور على بيانات صالحة في الملف.');
              setIsLoading(false);
              return;
            }
            
            newStudents = allStudents;
          } else {
            newStudents = sheetStudents;
          }
        } else {
          // Process CSV file (backward compatibility)
          setLoadingMessage('جاري معالجة ملف CSV...');
          setProgress({ current: 30, total: 100 });
          let text = data as string;
          
          // Remove Byte Order Mark (BOM) if present
          if (text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1);
          }

          const lines = text.split(/\r\n|\n/);
          const totalLines = lines.length - 1; // Exclude header
          
          // Track IDs to ensure uniqueness within CSV
          const csvSeenIds = new Set<string>();
          
          setLoadingMessage(`جاري معالجة ${totalLines} سطر...`);
          setProgress({ current: 40, total: 100 });
          
          // Skip header (index 0)
          for (let i = 1; i < lines.length; i++) {
            // Update progress every 10 rows
            if ((i - 1) % 10 === 0 || i === lines.length - 1) {
              const processed = i - 1;
              const progressPercent = 40 + Math.floor((processed / totalLines) * 30); // 40-70%
              setProgress({ current: progressPercent, total: 100 });
              setLoadingMessage(`جاري معالجة السطر ${processed} من ${totalLines}...`);
            }
            const line = lines[i].trim();
            if (!line) continue;
            
            // Split by comma
            const parts = line.split(',').map(p => p.trim());
            
            if (parts.length >= 2) {
              const studentNumber = parts[0] || '';
              const name = parts[1] || '';
              const classGradeRaw = parts[2] || '';
              const classRoom = parts[3] || '';
              const phone = parts[4] || '';

              // Clean and validate student ID
              const cleanedId = cleanStudentId(studentNumber);
              if (!cleanedId || cleanedId.length === 0) continue; // Skip if no valid ID

              // Clean and validate name
              const cleanedName = cleanStudentName(name);
              if (!cleanedName || cleanedName.length === 0) continue; // Skip if no valid name

              let classGrade = extractClassGrade(classGradeRaw);
              
              if (classRoom && classGrade) {
                classGrade = `${classGrade}/${classRoom}`;
              } else if (classRoom && !classGrade) {
                classGrade = classRoom;
              }

              // Generate unique ID - pass csvSeenIds to ensure uniqueness
              let id = generateStudentId(cleanedId, i, csvSeenIds);
              
              // If ID still exists, keep trying until we get a unique one
              let attempts = 0;
              while (csvSeenIds.has(id) && attempts < 100) {
                id = generateStudentId(cleanedId, i + attempts * 1000, csvSeenIds);
                attempts++;
              }
              
              if (!id || id.length === 0) continue; // Skip if no valid ID
              
              // Add to csvSeenIds to track uniqueness
              csvSeenIds.add(id);
              
              const cleanedPhone = cleanPhoneNumber(phone);

              newStudents.push({
                id,
                name: cleanedName,
                classGrade: classGrade || 'غير محدد',
                parentPhone: cleanedPhone || '',
                challenge: 'none',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanedName)}&background=random`,
                studentNumber: studentNumber || id // حفظ رقم الطالب الأصلي
              });
            }
          }
        }

        setLoadingMessage('جاري التحقق من البيانات...');
        if (newStudents.length === 0) {
          setError('لم يتم العثور على بيانات صالحة. تأكد من أن الملف يحتوي على بيانات الطلاب.');
          setIsLoading(false);
        } else {
          // Final check: remove any remaining duplicates by ID
          setLoadingMessage('جاري إزالة التكرارات...');
          const finalSeenIds = new Set<string>();
          const finalUniqueStudents = newStudents.filter(student => {
            if (finalSeenIds.has(student.id)) {
              return false; // Skip duplicate
            }
            finalSeenIds.add(student.id);
            return true;
          });
          
          if (finalUniqueStudents.length === 0) {
            setError('جميع الطلاب في الملف مكررون. يرجى التحقق من الملف.');
            setIsLoading(false);
            return;
          }
          
          if (finalUniqueStudents.length < newStudents.length) {
            const duplicateCount = newStudents.length - finalUniqueStudents.length;
            console.warn(`تم إزالة ${duplicateCount} طالب مكرر من الملف`);
          }
          
          setLoadingMessage('جاري استيراد البيانات إلى قاعدة البيانات...');
          setProgress({ current: 80, total: 100 });
          
          // Call onImport and wait for it to complete
          try {
            await onImport(finalUniqueStudents);
            setProgress({ current: 100, total: 100 });
            setImportedCount(finalUniqueStudents.length);
            setSuccess(true);
            setIsLoading(false);
            // Clear input
            if (fileInputRef.current) fileInputRef.current.value = '';
            
            // Reset progress after a short delay
            setTimeout(() => {
              setProgress({ current: 0, total: 0 });
            }, 2000);
          } catch (importError) {
            console.error('Import error:', importError);
            setError('حدث خطأ أثناء استيراد البيانات. يرجى المحاولة مرة أخرى.');
            setIsLoading(false);
            setProgress({ current: 0, total: 0 });
          }
        }
      } catch (err: any) {
        console.error('File processing error:', err);
        const errorMessage = err?.message || 'حدث خطأ أثناء قراءة الملف. تأكد من أنه ملف Excel أو CSV صالح.';
        setError(errorMessage);
        setIsLoading(false);
        setProgress({ current: 0, total: 0 });
      }
    };
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      setError('حدث خطأ أثناء قراءة الملف. يرجى التأكد من أن الملف غير تالف.');
      setIsLoading(false);
      setProgress({ current: 0, total: 0 });
    };

    if (isExcel) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file, 'UTF-8');
    }
  };

  // Handle sheet selection
  const handleSheetSelect = (sheetName: string) => {
    const workbook = (fileInputRef.current as any)?.workbook;
    if (!workbook) return;
    
    const worksheet = workbook.Sheets[sheetName];
    const newStudents = processSheet(worksheet, sheetName);
    
    if (newStudents.length === 0) {
      setError('التبويب المحدد لا يحتوي على بيانات صالحة.');
      setShowSheetSelector(false);
      return;
    }
    
    onImport(newStudents);
    setImportedCount(newStudents.length);
    setSuccess(true);
    setShowSheetSelector(false);
    setSelectedSheet('');
    setAvailableSheets([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      (fileInputRef.current as any).workbook = null;
    }
  };

  // Auto-select best sheet
  const handleAutoSelect = () => {
    const workbook = (fileInputRef.current as any)?.workbook;
    if (!workbook) return;
    
    const bestSheet = findBestSheet(workbook);
    if (bestSheet) {
      handleSheetSelect(bestSheet);
    } else {
      setError('لم يتم العثور على تبويب يحتوي على بيانات الطلاب.');
    }
  };

  // Process all sheets
  const handleProcessAllSheets = () => {
    const workbook = (fileInputRef.current as any)?.workbook;
    if (!workbook) return;
    
    let allStudents: Student[] = [];
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const students = processSheet(worksheet, sheetName);
      allStudents = [...allStudents, ...students];
    }
    
    if (allStudents.length === 0) {
      setError('لم يتم العثور على بيانات صالحة في أي تبويب.');
      setShowSheetSelector(false);
      return;
    }
    
    onImport(allStudents);
    setImportedCount(allStudents.length);
    setSuccess(true);
    setShowSheetSelector(false);
    setSelectedSheet('');
    setAvailableSheets([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      (fileInputRef.current as any).workbook = null;
    }
  };

  // Download template
  const downloadTemplate = () => {
    const templateData = [
      ['رقم الطالب', 'اسم الطالب', 'الصف', 'الفصل', 'رقم الجوال'],
      ['12345', 'أحمد محمد علي', 'الرابع الابتدائي_عام بنين - We can Mc Graw Hill', 'أ', '966500000000'],
      ['12346', 'فاطمة أحمد', 'الخامس الابتدائي_عام بنات', 'ب', '966501111111']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');
    XLSX.writeFile(wb, 'students_template.xlsx');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">استيراد بيانات الطلاب</h2>
          <p className="text-gray-500 mt-2">
            قم برفع ملف Excel (.xlsx, .xls) أو CSV يحتوي على: رقم الطالب، الاسم، الصف، الفصل، ورقم الجوال
          </p>
          <p className="text-xs text-gray-400 mt-1">
            ملاحظة: سيتم استخراج الجزء الأول فقط من حقل الصف (قبل الشرطة أو الشرطة السفلية)
          </p>
        </div>

        {isLoading ? (
          <div className="border-2 border-dashed border-teal-300 rounded-xl p-10 bg-teal-50">
            <Loader2 className="mx-auto text-teal-600 mb-4 animate-spin" size={40} />
            <p className="font-medium text-teal-700 mb-2">{loadingMessage}</p>
            {progress.total > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-teal-600 mb-2">
                  <span>التقدم: {progress.current} / {progress.total}</span>
                  <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-teal-200 rounded-full h-2.5">
                  <div 
                    className="bg-teal-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <p className="text-sm text-teal-600 mt-4">يرجى الانتظار... لا تغلق هذه الصفحة</p>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isLoading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 transition-colors ${
              isLoading 
                ? 'cursor-not-allowed opacity-50' 
                : 'cursor-pointer'
            } ${
              isDragging 
                ? 'border-teal-500 bg-teal-50' 
                : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              disabled={isLoading}
            />
            <Upload className="mx-auto text-gray-400 mb-4" size={40} />
            <p className="font-medium text-gray-700">اضغط للرفع أو اسحب الملف هنا</p>
            <p className="text-sm text-gray-400 mt-2">Excel (.xlsx, .xls) أو CSV (الحد الأقصى 10MB)</p>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button 
            onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
            className="flex items-center gap-2 text-sm text-teal-600 hover:underline"
          >
            <Download size={14} />
            تحميل نموذج الملف (Excel)
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3 shadow-sm">
            <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm mb-1">خطأ في الاستيراد</p>
              <p className="text-sm break-words">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-3 shadow-sm">
            <Check size={20} className="flex-shrink-0" />
            <span className="font-bold">تم استيراد {importedCount} طالب بنجاح!</span>
          </div>
        )}
      </div>
    </div>
  );
};
