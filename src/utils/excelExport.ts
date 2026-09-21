import * as XLSX from 'xlsx';
import { 
  Student, 
  ClassRoom, 
  GradeRecord, 
  ConductRecord, 
  AttendanceRecord, 
  SpecialPromotion,
  CalendarEvent
} from '../types';
import { 
  calculateSemesterAcademicAverage, 
  calculateYearlyAcademicAverage,
  calculateSemesterAttendanceScore,
  calculateSemesterConductScore,
  calculateYearlyAverageHalf,
  evaluatePromotionAndRank
} from './calculations';

/**
 * Format a date string to DD/MM/YYYY for Vietnamese Excel presentation
 */
function formatDateVN(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Export Students List to .xlsx
 */
export interface ExportStudentsOptions {
  filename?: string;
  sheetTitle?: string;
  selectedOnly?: boolean;
}

export function exportStudentsToExcel(
  students: Student[],
  classes: ClassRoom[],
  options?: ExportStudentsOptions
): void {
  const getClassName = (classId: string) => {
    const c = classes.find(item => item.id === classId);
    return c ? `${c.name}${c.isSacramentClass ? ' (Bí Tích)' : ''}` : classId;
  };

  const rows = students.map((s, index) => ({
    'STT': index + 1,
    'Mã Học Sinh': s.id,
    'Tên Thánh': s.holyName,
    'Họ và Tên': s.fullName,
    'Giới Tính': s.gender,
    'Ngày Sinh': formatDateVN(s.dob),
    'Lớp Giáo Lý': getClassName(s.classId),
    'SĐT Học Sinh': s.phone || '',
    'Họ Tên Phụ Huynh': s.parentName,
    'SĐT Phụ Huynh': s.parentPhone,
    'Email Phụ Huynh': s.parentEmail || '',
    'Địa Chỉ Gia Đình': s.address,
    'Giáo Họ / Xứ': s.subParish,
    'Ngày Rửa Tội': formatDateVN(s.baptismDate),
    'Ngày RTTL / Xưng Tội': formatDateVN(s.firstCommunionDate),
    'Ngày Thêm Sức': formatDateVN(s.confirmationDate),
    'Người Đỡ Đầu': s.godParentName || '',
    'Ghi Chú': s.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Define column widths for neat Excel appearance
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã Học Sinh
    { wch: 14 }, // Tên Thánh
    { wch: 24 }, // Họ và Tên
    { wch: 10 }, // Giới Tính
    { wch: 13 }, // Ngày Sinh
    { wch: 18 }, // Lớp Giáo Lý
    { wch: 14 }, // SĐT Học Sinh
    { wch: 22 }, // Họ Tên Phụ Huynh
    { wch: 15 }, // SĐT Phụ Huynh
    { wch: 25 }, // Email Phụ Huynh
    { wch: 28 }, // Địa Chỉ Gia Đình
    { wch: 20 }, // Giáo Họ / Xứ
    { wch: 14 }, // Ngày Rửa Tội
    { wch: 18 }, // Ngày RTTL / Xưng Tội
    { wch: 14 }, // Ngày Thêm Sức
    { wch: 20 }, // Người Đỡ Đầu
    { wch: 25 }, // Ghi Chú
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options?.sheetTitle || 'Danh Sách Học Sinh');

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = options?.filename || `DanhSach_HocSinh_DonBoscoDaLat_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

/**
 * Export Grades and Evaluation to .xlsx
 */
export interface ExportGradesOptions {
  filename?: string;
  classId?: string; // If 'all', exports all students
  semester?: 1 | 2 | 'yearly';
}

export function exportGradesToExcel(
  students: Student[],
  classes: ClassRoom[],
  grades: GradeRecord[],
  conducts: ConductRecord[],
  attendanceRecords: AttendanceRecord[],
  specialPromotions: SpecialPromotion[] = [],
  options?: ExportGradesOptions
): void {
  const targetClassId = options?.classId || 'all';
  const semester = options?.semester || 'yearly';

  const filteredStudents = targetClassId === 'all'
    ? students
    : students.filter(s => s.classId === targetClassId);

  const getClassName = (classId: string) => {
    const c = classes.find(item => item.id === classId);
    return c ? c.name : classId;
  };

  const workbook = XLSX.utils.book_new();

  if (semester === 1) {
    // Export Semester 1
    const rows = filteredStudents.map((st, index) => {
      const g = grades.find(item => item.studentId === st.id && item.semester === 1);
      const studentClass = classes.find(c => c.id === st.classId);
      const isSacrament = studentClass?.isSacramentClass || false;

      const mid = g?.midTermScore ?? '';
      const finalExam = g?.finalExamScore ?? '';
      const retest = g?.retestScore ?? '';
      const academicAvg = calculateSemesterAcademicAverage(g?.midTermScore ?? null, g?.finalExamScore ?? null, g?.retestScore);

      const hk1Att = attendanceRecords.filter(r => r.studentId === st.id && r.semester === 1);
      const { score: attScore, counts: attCounts } = calculateSemesterAttendanceScore(hk1Att.map(r => r.status), isSacrament);

      const hk1Cond = conducts.filter(c => c.studentId === st.id && c.semester === 1);
      const condScore = calculateSemesterConductScore(hk1Cond.map(c => c.violation));

      const totalHk1Avg = Math.round(((academicAvg + (attScore + condScore) / 2) / 2) * 100) / 100;

      let rank = 'KÉM';
      if (academicAvg >= 9.0 && (attScore + condScore) / 2 >= 9.0) rank = 'GIỎI';
      else if (academicAvg >= 7.0 && (attScore + condScore) / 2 >= 8.0) rank = 'KHÁ';
      else if (academicAvg >= 5.0 && (attScore + condScore) / 2 >= 7.0) rank = 'TRUNG BÌNH';
      else if (academicAvg >= 4.0) rank = 'YẾU';

      return {
        'STT': index + 1,
        'Mã HS': st.id,
        'Tên Thánh': st.holyName,
        'Họ và Tên': st.fullName,
        'Lớp': getClassName(st.classId),
        'Điểm GK (HS1)': mid,
        'Điểm Thi HK1 (HS2)': finalExam,
        'Điểm Thi Lại': retest,
        'ĐTB Học Lực HK1': academicAvg > 0 ? academicAvg : '',
        'Điểm Chuyên Cần': attScore,
        'Vắng D (Buổi)': attCounts.D,
        'Điểm Hạnh Kiểm': condScore,
        'ĐTB Tổng Hợp HK1': totalHk1Avg > 0 ? totalHk1Avg : '',
        'Xếp Loại HK1': academicAvg > 0 ? rank : 'Chưa xếp loại',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 14 }, // Mã HS
      { wch: 14 }, // Tên Thánh
      { wch: 24 }, // Họ và Tên
      { wch: 16 }, // Lớp
      { wch: 14 }, // GK
      { wch: 16 }, // Thi HK1
      { wch: 14 }, // Thi Lại
      { wch: 16 }, // ĐTB Học Lực
      { wch: 16 }, // Chuyên Cần
      { wch: 14 }, // Vắng D
      { wch: 16 }, // Hạnh Kiểm
      { wch: 16 }, // ĐTB Tổng Hợp
      { wch: 16 }, // Xếp Loại
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bảng Điểm Học Kỳ 1');

  } else if (semester === 2) {
    // Export Semester 2
    const rows = filteredStudents.map((st, index) => {
      const g = grades.find(item => item.studentId === st.id && item.semester === 2);
      const studentClass = classes.find(c => c.id === st.classId);
      const isSacrament = studentClass?.isSacramentClass || false;

      const mid = g?.midTermScore ?? '';
      const finalExam = g?.finalExamScore ?? '';
      const retest = g?.retestScore ?? '';
      const academicAvg = calculateSemesterAcademicAverage(g?.midTermScore ?? null, g?.finalExamScore ?? null, g?.retestScore);

      const hk2Att = attendanceRecords.filter(r => r.studentId === st.id && r.semester === 2);
      const { score: attScore, counts: attCounts } = calculateSemesterAttendanceScore(hk2Att.map(r => r.status), isSacrament);

      const hk2Cond = conducts.filter(c => c.studentId === st.id && c.semester === 2);
      const condScore = calculateSemesterConductScore(hk2Cond.map(c => c.violation));

      const totalHk2Avg = Math.round(((academicAvg + (attScore + condScore) / 2) / 2) * 100) / 100;

      let rank = 'KÉM';
      if (academicAvg >= 9.0 && (attScore + condScore) / 2 >= 9.0) rank = 'GIỎI';
      else if (academicAvg >= 7.0 && (attScore + condScore) / 2 >= 8.0) rank = 'KHÁ';
      else if (academicAvg >= 5.0 && (attScore + condScore) / 2 >= 7.0) rank = 'TRUNG BÌNH';
      else if (academicAvg >= 4.0) rank = 'YẾU';

      return {
        'STT': index + 1,
        'Mã HS': st.id,
        'Tên Thánh': st.holyName,
        'Họ và Tên': st.fullName,
        'Lớp': getClassName(st.classId),
        'Điểm GK (HS1)': mid,
        'Điểm Thi HK2 (HS2)': finalExam,
        'Điểm Thi Lại': retest,
        'ĐTB Học Lực HK2': academicAvg > 0 ? academicAvg : '',
        'Điểm Chuyên Cần': attScore,
        'Vắng D (Buổi)': attCounts.D,
        'Điểm Hạnh Kiểm': condScore,
        'ĐTB Tổng Hợp HK2': totalHk2Avg > 0 ? totalHk2Avg : '',
        'Xếp Loại HK2': academicAvg > 0 ? rank : 'Chưa xếp loại',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 14 }, // Mã HS
      { wch: 14 }, // Tên Thánh
      { wch: 24 }, // Họ và Tên
      { wch: 16 }, // Lớp
      { wch: 14 }, // GK
      { wch: 16 }, // Thi HK2
      { wch: 14 }, // Thi Lại
      { wch: 16 }, // ĐTB Học Lực
      { wch: 16 }, // Chuyên Cần
      { wch: 14 }, // Vắng D
      { wch: 16 }, // Hạnh Kiểm
      { wch: 16 }, // ĐTB Tổng Hợp
      { wch: 16 }, // Xếp Loại
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bảng Điểm Học Kỳ 2');

  } else {
    // Full Yearly Report (Bảng Tổng Hợp Điểm Cả Năm 2026 - 2027)
    const rows = filteredStudents.map((st, index) => {
      const studentClass = classes.find(c => c.id === st.classId);
      const isSacrament = studentClass?.isSacramentClass || false;

      const gr1 = grades.find(g => g.studentId === st.id && g.semester === 1);
      const gr2 = grades.find(g => g.studentId === st.id && g.semester === 2);

      const hk1Academic = calculateSemesterAcademicAverage(gr1?.midTermScore ?? null, gr1?.finalExamScore ?? null, gr1?.retestScore);
      const hk2Academic = calculateSemesterAcademicAverage(gr2?.midTermScore ?? null, gr2?.finalExamScore ?? null, gr2?.retestScore);
      const yearlyAcademic = calculateYearlyAcademicAverage(hk1Academic, hk2Academic);

      const hk1Violations = conducts.filter(c => c.studentId === st.id && c.semester === 1);
      const hk2Violations = conducts.filter(c => c.studentId === st.id && c.semester === 2);
      const hk1Conduct = calculateSemesterConductScore(hk1Violations.map(v => v.violation));
      const hk2Conduct = calculateSemesterConductScore(hk2Violations.map(v => v.violation));
      const yearlyConduct = calculateYearlyAverageHalf(hk1Conduct, hk2Conduct);

      const hk1Att = attendanceRecords.filter(r => r.studentId === st.id && r.semester === 1);
      const hk2Att = attendanceRecords.filter(r => r.studentId === st.id && r.semester === 2);
      const { score: s1, counts: c1 } = calculateSemesterAttendanceScore(hk1Att.map(r => r.status), isSacrament);
      const { score: s2, counts: c2 } = calculateSemesterAttendanceScore(hk2Att.map(r => r.status), isSacrament);
      const yearlyAttendance = calculateYearlyAverageHalf(s1, s2);

      const totalD = c1.D + c2.D;
      const yearlyAvg = calculateYearlyAverageHalf(yearlyAttendance, yearlyConduct);

      const specialPromo = specialPromotions.find(sp => sp.studentId === st.id);
      const { academicRank, finalResult, atRiskReason, isSpecialPromotion } = evaluatePromotionAndRank(
        yearlyAcademic,
        yearlyAvg,
        totalD,
        isSacrament,
        specialPromo
      );

      return {
        'STT': index + 1,
        'Mã HS': st.id,
        'Tên Thánh': st.holyName,
        'Họ và Tên': st.fullName,
        'Lớp': getClassName(st.classId),
        'ĐGK HK1': gr1?.midTermScore ?? '',
        'ĐThi HK1': gr1?.finalExamScore ?? '',
        'ĐTB HK1': hk1Academic > 0 ? hk1Academic : '',
        'ĐGK HK2': gr2?.midTermScore ?? '',
        'ĐThi HK2': gr2?.finalExamScore ?? '',
        'ĐTB HK2': hk2Academic > 0 ? hk2Academic : '',
        'ĐTB Học Lực Cả Năm': yearlyAcademic > 0 ? yearlyAcademic : '',
        'ĐTB Chuyên Cần': yearlyAttendance,
        'Tổng Buổi Vắng D': totalD,
        'ĐTB Hạnh Kiểm': yearlyConduct,
        'ĐTB Tổng Hợp (CC & HK)': yearlyAvg,
        'Xếp Loại Cả Năm': academicRank,
        'Kết Quả Lên Lớp': finalResult,
        'Ghi Chú / Đặc Cách': isSpecialPromotion 
          ? `Đặc cách: ${specialPromo?.reason || 'Theo quyết định Quý Cha/Admin'}` 
          : (atRiskReason || ''),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 14 }, // Mã HS
      { wch: 14 }, // Tên Thánh
      { wch: 24 }, // Họ và Tên
      { wch: 16 }, // Lớp
      { wch: 10 }, // ĐGK 1
      { wch: 10 }, // ĐThi 1
      { wch: 11 }, // ĐTB 1
      { wch: 10 }, // ĐGK 2
      { wch: 10 }, // ĐThi 2
      { wch: 11 }, // ĐTB 2
      { wch: 18 }, // ĐTB Cả Năm
      { wch: 15 }, // Chuyên Cần
      { wch: 16 }, // Tổng Vắng D
      { wch: 15 }, // Hạnh Kiểm
      { wch: 20 }, // ĐTB Tổng Hợp
      { wch: 16 }, // Xếp Loại
      { wch: 26 }, // Kết Quả Lên Lớp
      { wch: 30 }, // Ghi Chú
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tổng Kết Cả Năm 2026-2027');

    // Add Second Sheet: Thống kê tổng quan & Tuyên dương
    const countGioi = rows.filter(r => r['Xếp Loại Cả Năm'] === 'GIỎI').length;
    const countKha = rows.filter(r => r['Xếp Loại Cả Năm'] === 'KHÁ').length;
    const countTB = rows.filter(r => r['Xếp Loại Cả Năm'] === 'TRUNG BÌNH').length;
    const countYeu = rows.filter(r => r['Xếp Loại Cả Năm'] === 'YẾU').length;
    const countKem = rows.filter(r => r['Xếp Loại Cả Năm'] === 'KÉM').length;

    const countPromoted = rows.filter(r => r['Kết Quả Lên Lớp'] === 'Được lên lớp').length;
    const countRetest = rows.filter(r => r['Kết Quả Lên Lớp'] === 'Được lên lớp sau thi lại/rèn hạnh kiểm').length;
    const countSpecial = rows.filter(r => r['Kết Quả Lên Lớp'].includes('Đặc cách')).length;
    const countHeldBack = rows.filter(r => r['Kết Quả Lên Lớp'] === 'Ở lại lớp').length;

    const summaryData = [
      { 'Tiêu Chí Thống Kê': 'Tổng Số Học Sinh', 'Số Lượng': rows.length, 'Tỷ Lệ (%)': '100%' },
      { 'Tiêu Chí Thống Kê': 'Xếp Loại: GIỎI', 'Số Lượng': countGioi, 'Tỷ Lệ (%)': rows.length ? `${Math.round((countGioi / rows.length) * 100)}%` : '0%' },
      { 'Tiêu Chí Thống Kê': 'Xếp Loại: KHÁ', 'Số Lượng': countKha, 'Tỷ Lệ (%)': rows.length ? `${Math.round((countKha / rows.length) * 100)}%` : '0%' },
      { 'Tiêu Chí Thống Kê': 'Xếp Loại: TRUNG BÌNH', 'Số Lượng': countTB, 'Tỷ Lệ (%)': rows.length ? `${Math.round((countTB / rows.length) * 100)}%` : '0%' },
      { 'Tiêu Chí Thống Kê': 'Xếp Loại: YẾU', 'Số Lượng': countYeu, 'Tỷ Lệ (%)': rows.length ? `${Math.round((countYeu / rows.length) * 100)}%` : '0%' },
      { 'Tiêu Chí Thống Kê': 'Xếp Loại: KÉM', 'Số Lượng': countKem, 'Tỷ Lệ (%)': rows.length ? `${Math.round((countKem / rows.length) * 100)}%` : '0%' },
      { 'Tiêu Chí Thống Kê': '--- KẾT QUẢ XÉT LÊN LỚP ---', 'Số Lượng': '', 'Tỷ Lệ (%)': '' },
      { 'Tiêu Chí Thống Kê': 'Được lên thẳng lớp trên', 'Số Lượng': countPromoted, 'Tỷ Lệ (%)': rows.length ? `${Math.round((countPromoted / rows.length) * 100)}%` : '0%' },
      { 'Tiêu Chí Thống Kê': 'Thi lại / Rèn luyện hè', 'Số Lượng': countRetest, 'Tỷ Lệ (%)': rows.length ? `${Math.round((countRetest / rows.length) * 100)}%` : '0%' },
      { 'Tiêu Chí Thống Kê': 'Đặc cách lên lớp (Quyết định Quý Cha)', 'Số Lượng': countSpecial, 'Tỷ Lệ (%)': rows.length ? `${Math.round((countSpecial / rows.length) * 100)}%` : '0%' },
      { 'Tiêu Chí Thống Kê': 'Ở lại lớp', 'Số Lượng': countHeldBack, 'Tỷ Lệ (%)': rows.length ? `${Math.round((countHeldBack / rows.length) * 100)}%` : '0%' },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [
      { wch: 35 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Thống Kê Tổng Kết');
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const classLabel = targetClassId === 'all' ? 'ToanTruong' : `Lop_${targetClassId}`;
  const semLabel = semester === 'yearly' ? 'CaNam' : `HK${semester}`;
  const filename = options?.filename || `BangDiem_${classLabel}_${semLabel}_DonBoscoDaLat_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

/**
 * Calculate Day of Week in Vietnamese
 */
export function getDayOfWeekVN(dateStr: string): 'HAI' | 'BA' | 'TƯ' | 'NĂM' | 'SÁU' | 'BẢY' | 'CN' {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'CN';
  const day = d.getDay();
  switch (day) {
    case 0: return 'CN';
    case 1: return 'HAI';
    case 2: return 'BA';
    case 3: return 'TƯ';
    case 4: return 'NĂM';
    case 5: return 'SÁU';
    case 6: return 'BẢY';
    default: return 'CN';
  }
}

/**
 * Robust date parser for Excel input (supports serial dates, YYYY-MM-DD, DD/MM/YYYY)
 */
export function normalizeDateInput(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === 'number') {
    // Excel date serial number
    const date = new Date(Math.round((raw - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

/**
 * Export Calendar Template for Bulk Import of New School Year
 */
export interface CalendarTemplateOptions {
  includeSampleData?: boolean;
  academicYear?: string;
  filename?: string;
}

export function exportCalendarTemplateToExcel(options?: CalendarTemplateOptions): void {
  const academicYear = options?.academicYear || '2026 - 2027';
  const includeSample = options?.includeSampleData !== false;

  const sampleRows = includeSample ? [
    {
      'STT': 1,
      'Ngày (YYYY-MM-DD)': '2026-09-06',
      'Thứ': 'CN',
      'Tên Sự Kiện / Tiêu Đề': 'Tập trung thiếu nhi & Gặp mặt GLV đầu năm học mới',
      'Loại Sự Kiện': 'Giảng Dạy',
      'Ý Lễ / Phụng Vụ': 'CN XXIII Thường Niên Năm A',
      'Bậc Lễ': '',
      'Tình Trạng Học': 'Tập trung',
      'Lớp Bí Tích': 'Không',
      'Giờ Bắt Đầu': '07:30',
      'Giờ Kết Thúc': '10:30',
      'Địa Điểm': 'Sân đa năng & Nhà thờ Don Bosco Đà Lạt',
      'Thành Phần Tham Dự': 'Toàn thể thiếu nhi các khối & Quý GLV',
      'Chương Trình & Chi Tiết': 'Thiếu nhi tập trung, nhận lớp sau Thánh lễ 8h00. Gặp mặt GLV lúc 10h00 tại Hội trường',
      'Ghi Chú': 'Tất cả các khối lớp'
    },
    {
      'STT': 2,
      'Ngày (YYYY-MM-DD)': '2026-09-10',
      'Thứ': 'NĂM',
      'Tên Sự Kiện / Tiêu Đề': 'Tiết học giáo lý bổ sung Lớp Bí Tích',
      'Loại Sự Kiện': 'Giảng Dạy',
      'Ý Lễ / Phụng Vụ': 'Thứ Năm Tuần XXIII Thường Niên',
      'Bậc Lễ': '',
      'Tình Trạng Học': 'Học',
      'Lớp Bí Tích': 'Có',
      'Giờ Bắt Đầu': '17:30',
      'Giờ Kết Thúc': '19:00',
      'Địa Điểm': 'Phòng học C.102 & B.201',
      'Thành Phần Tham Dự': 'Lớp Sơ Cấp 2 (Rước Lễ) & Căn Bản 4 (Thêm Sức)',
      'Chương Trình & Chi Tiết': 'Học giáo lý bổ sung chuẩn bị lãnh nhận các Bí tích Khai tâm',
      'Ghi Chú': 'Lớp Bí Tích học cố định chiều thứ Năm'
    },
    {
      'STT': 3,
      'Ngày (YYYY-MM-DD)': '2026-09-12',
      'Thứ': 'BẢY',
      'Tên Sự Kiện / Tiêu Đề': 'GLV Tĩnh tâm & Tập nghi thức Khai giảng',
      'Loại Sự Kiện': 'Tĩnh Tâm',
      'Ý Lễ / Phụng Vụ': 'Thứ Bảy Tuần XXIII Thường Niên',
      'Bậc Lễ': '',
      'Tình Trạng Học': 'Nghỉ',
      'Lớp Bí Tích': 'Không',
      'Giờ Bắt Đầu': '19:00',
      'Giờ Kết Thúc': '20:30',
      'Địa Điểm': 'Nguyện đường Don Bosco',
      'Thành Phần Tham Dự': 'Quý Thầy, Quý Sơ và toàn thể GLV',
      'Chương Trình & Chi Tiết': 'Tĩnh tâm đầu tháng, chầu Thánh Thể và tập dợt nghi thức chào cờ, tuyên hứa khai giảng',
      'Ghi Chú': 'GLV có mặt đầy đủ'
    },
    {
      'STT': 4,
      'Ngày (YYYY-MM-DD)': '2026-09-13',
      'Thứ': 'CN',
      'Tên Sự Kiện / Tiêu Đề': 'ĐẠI LỄ KHAI GIẢNG NĂM HỌC GIÁO LÝ 2026 - 2027',
      'Loại Sự Kiện': 'Giảng Dạy',
      'Ý Lễ / Phụng Vụ': 'CN XXIV Thường Niên A - LỄ KHAI GIẢNG GIÁO LÝ',
      'Bậc Lễ': 'T',
      'Tình Trạng Học': 'Học',
      'Lớp Bí Tích': 'Không',
      'Giờ Bắt Đầu': '07:30',
      'Giờ Kết Thúc': '11:00',
      'Địa Điểm': 'Khuôn viên & Nhà thờ Don Bosco Đà Lạt',
      'Thành Phần Tham Dự': 'Toàn thể Thiếu nhi, Phụ huynh & GLV',
      'Chương Trình & Chi Tiết': '07h30 tập trung sân Đa năng. Thánh lễ Khai giảng 08h00. Sau 10h30 gặp mặt phụ huynh đầu năm',
      'Ghi Chú': 'Thiếu nhi mặc đồng phục áo trắng khăn quàng'
    },
    {
      'STT': 5,
      'Ngày (YYYY-MM-DD)': '2026-10-04',
      'Thứ': 'CN',
      'Tên Sự Kiện / Tiêu Đề': 'ĐẠI LỄ ĐỨC MẸ MÂN CÔI & KHAI MẠC THÁNG MÂN CÔI',
      'Loại Sự Kiện': 'Tĩnh Tâm',
      'Ý Lễ / Phụng Vụ': 'CN XXVII TN A - LỄ ĐỨC MẸ MÂN CÔI',
      'Bậc Lễ': 'T',
      'Tình Trạng Học': 'Học',
      'Lớp Bí Tích': 'Không',
      'Giờ Bắt Đầu': '07:30',
      'Giờ Kết Thúc': '10:30',
      'Địa Điểm': 'Nhà thờ Don Bosco Đà Lạt',
      'Thành Phần Tham Dự': 'Toàn thể Thiếu nhi & GLV',
      'Chương Trình & Chi Tiết': 'Kiệu Đức Mẹ, dâng hoa đầu giờ. Thánh lễ trọng thể và giờ học giáo lý chuyên đề Mân Côi',
      'Ghi Chú': 'Các em mang tràng hạt'
    },
    {
      'STT': 6,
      'Ngày (YYYY-MM-DD)': '2026-10-29',
      'Thứ': 'NĂM',
      'Tên Sự Kiện / Tiêu Đề': 'Lớp Bí Tích kiểm tra Giáo Lý Giữa Học Kỳ 1',
      'Loại Sự Kiện': 'Giảng Dạy',
      'Ý Lễ / Phụng Vụ': 'CHÂN PHƯỚC MICAE RUA',
      'Bậc Lễ': 'K',
      'Tình Trạng Học': 'Học',
      'Lớp Bí Tích': 'Có',
      'Giờ Bắt Đầu': '17:30',
      'Giờ Kết Thúc': '19:00',
      'Địa Điểm': 'Phòng học B.201 & C.102',
      'Thành Phần Tham Dự': 'Lớp Sơ Cấp 2 và Căn Bản 4',
      'Chương Trình & Chi Tiết': 'Kiểm tra 45 phút Giáo lý Căn bản và Kinh Thánh (hệ số 1)',
      'Ghi Chú': 'Nộp điểm về Ban Học Vụ'
    },
    {
      'STT': 7,
      'Ngày (YYYY-MM-DD)': '2026-11-01',
      'Thứ': 'CN',
      'Tên Sự Kiện / Tiêu Đề': 'LỄ CÁC THÁNH NAM NỮ (Lễ Họ) & ÔN THI GIỮA KỲ',
      'Loại Sự Kiện': 'Tĩnh Tâm',
      'Ý Lễ / Phụng Vụ': 'LỄ CÁC THÁNH NAM NỮ',
      'Bậc Lễ': 'T',
      'Tình Trạng Học': 'Học',
      'Lớp Bí Tích': 'Không',
      'Giờ Bắt Đầu': '07:30',
      'Giờ Kết Thúc': '10:30',
      'Địa Điểm': 'Nhà thờ & các lớp',
      'Thành Phần Tham Dự': 'Toàn thể Thiếu nhi & GLV',
      'Chương Trình & Chi Tiết': 'Thánh lễ trọng mừng các Thánh Bổn Mạng. Các lớp ôn thi giữa học kỳ 1 và lần hạt hiệp thông',
      'Ghi Chú': 'Chuẩn bị thi GK1 vào CN tuần tới'
    },
    {
      'STT': 8,
      'Ngày (YYYY-MM-DD)': '2026-11-08',
      'Thứ': 'CN',
      'Tên Sự Kiện / Tiêu Đề': 'TOÀN TRƯỜNG THI GIỮA HỌC KỲ I (45 PHÚT)',
      'Loại Sự Kiện': 'Giảng Dạy',
      'Ý Lễ / Phụng Vụ': 'CN XXXII Thường Niên A',
      'Bậc Lễ': '',
      'Tình Trạng Học': 'Học',
      'Lớp Bí Tích': 'Không',
      'Giờ Bắt Đầu': '07:30',
      'Giờ Kết Thúc': '10:30',
      'Địa Điểm': 'Các phòng học giáo lý',
      'Thành Phần Tham Dự': 'Tất cả các khối lớp Khai Tâm, Sơ Cấp, Căn Bản, Kinh Thánh, Vào Đời',
      'Chương Trình & Chi Tiết': 'Kiểm tra viết giữa học kỳ 1 (45 phút, hệ số 1). Tổng hợp điểm chuyên cần 2 tháng đầu',
      'Ghi Chú': 'GLV coi thi nghiêm túc'
    },
    {
      'STT': 9,
      'Ngày (YYYY-MM-DD)': '2026-12-25',
      'Thứ': 'SÁU',
      'Tên Sự Kiện / Tiêu Đề': 'ĐẠI LỄ CHÚA GIÁNG SINH - NGHỈ HỌC GIÁO LÝ',
      'Loại Sự Kiện': 'Tĩnh Tâm',
      'Ý Lễ / Phụng Vụ': 'ĐẠI LỄ CHÚA GIÁNG SINH',
      'Bậc Lễ': 'T',
      'Tình Trạng Học': 'Nghỉ',
      'Lớp Bí Tích': 'Không',
      'Giờ Bắt Đầu': '08:00',
      'Giờ Kết Thúc': '11:00',
      'Địa Điểm': 'Nhà thờ Don Bosco Đà Lạt',
      'Thành Phần Tham Dự': 'Cộng đoàn Giáo sở & Thiếu nhi',
      'Chương Trình & Chi Tiết': 'Thánh lễ mừng Chúa Giáng Sinh, phát quà bánh cho các em thiếu nhi',
      'Ghi Chú': 'Nghỉ học giáo lý các lớp'
    },
    {
      'STT': 10,
      'Ngày (YYYY-MM-DD)': '2027-01-03',
      'Thứ': 'CN',
      'Tên Sự Kiện / Tiêu Đề': 'CÁC LỚP THI GIÁO LÝ HỌC KỲ I (HỆ SỐ 2)',
      'Loại Sự Kiện': 'Giảng Dạy',
      'Ý Lễ / Phụng Vụ': 'ĐẠI LỄ CHÚA HIỂN LINH',
      'Bậc Lễ': 'T',
      'Tình Trạng Học': 'Học',
      'Lớp Bí Tích': 'Không',
      'Giờ Bắt Đầu': '07:30',
      'Giờ Kết Thúc': '10:30',
      'Địa Điểm': 'Các phòng học giáo lý',
      'Thành Phần Tham Dự': 'Toàn thể học sinh các khối lớp',
      'Chương Trình & Chi Tiết': 'Thi kết thúc học kỳ 1 (hệ số 2). Hoàn tất sổ điểm HK1 trước ngày 10/01/2027',
      'Ghi Chú': 'Nhập điểm lên hệ thống sau khi chấm xong'
    },
    {
      'STT': 11,
      'Ngày (YYYY-MM-DD)': '2027-01-31',
      'Thứ': 'CN',
      'Tên Sự Kiện / Tiêu Đề': 'ĐẠI LỄ THÁNH GIOAN BOSCO - BỔN MẠNG GIÁO SỞ & NGHỈ TẾT',
      'Loại Sự Kiện': 'Tĩnh Tâm',
      'Ý Lễ / Phụng Vụ': 'ĐẠI LỄ THÁNH GIOAN BOSCO (Lễ Bổn Mạng)',
      'Bậc Lễ': 'T',
      'Tình Trạng Học': 'Nghỉ',
      'Lớp Bí Tích': 'Không',
      'Giờ Bắt Đầu': '07:30',
      'Giờ Kết Thúc': '11:30',
      'Địa Điểm': 'Nhà thờ & Quảng trường Don Bosco Đà Lạt',
      'Thành Phần Tham Dự': 'Toàn thể cộng đoàn, Quý Phụ Huynh, GLV và Thiếu nhi',
      'Chương Trình & Chi Tiết': 'Thánh lễ Bổn Mạng Giáo Sở. Hội chợ Xuân tuổi trẻ Don Bosco, lì xì và bốc thăm may mắn',
      'Ghi Chú': 'Bắt đầu kỳ nghỉ Tết Nguyên Đán'
    },
    {
      'STT': 12,
      'Ngày (YYYY-MM-DD)': '2027-02-14',
      'Thứ': 'CN',
      'Tên Sự Kiện / Tiêu Đề': 'Học kỳ II: Các lớp đi học trở lại sau Tết',
      'Loại Sự Kiện': 'Giảng Dạy',
      'Ý Lễ / Phụng Vụ': 'Chúa Nhật I Mùa Chay B',
      'Bậc Lễ': '',
      'Tình Trạng Học': 'Học',
      'Lớp Bí Tích': 'Không',
      'Giờ Bắt Đầu': '07:30',
      'Giờ Kết Thúc': '10:30',
      'Địa Điểm': 'Các phòng học giáo lý',
      'Thành Phần Tham Dự': 'Tất cả các lớp',
      'Chương Trình & Chi Tiết': 'Khai mạc chương trình học kỳ II và chiến dịch Mùa Chay Thánh',
      'Ghi Chú': 'Kiểm diện chuyên cần đầu năm mới'
    },
    {
      'STT': 13,
      'Ngày (YYYY-MM-DD)': '2027-04-04',
      'Thứ': 'CN',
      'Tên Sự Kiện / Tiêu Đề': 'THÁNH LỄ BAN BÍ TÍCH RƯỚC LỄ LẦN ĐẦU',
      'Loại Sự Kiện': 'Tĩnh Tâm',
      'Ý Lễ / Phụng Vụ': 'Chúa Nhật II Phục Sinh (Kính Lòng Chúa Thương Xót)',
      'Bậc Lễ': 'T',
      'Tình Trạng Học': 'Học',
      'Lớp Bí Tích': 'Có',
      'Giờ Bắt Đầu': '07:30',
      'Giờ Kết Thúc': '10:30',
      'Địa Điểm': 'Nhà thờ Don Bosco Đà Lạt',
      'Thành Phần Tham Dự': 'Khối Sơ Cấp 2, Cha mẹ đỡ đầu và toàn thể cộng đoàn',
      'Chương Trình & Chi Tiết': 'Thánh Lễ trang trọng đón rước Mình Thánh Chúa lần đầu tiên của các em thiếu nhi Sơ Cấp 2',
      'Ghi Chú': 'Trang phục Rước Lễ quy định của Giáo xứ'
    },
    {
      'STT': 14,
      'Ngày (YYYY-MM-DD)': '2027-05-09',
      'Thứ': 'CN',
      'Tên Sự Kiện / Tiêu Đề': 'THÁNH LỄ BAN BÍ TÍCH THÊM SỨC',
      'Loại Sự Kiện': 'Tĩnh Tâm',
      'Ý Lễ / Phụng Vụ': 'ĐẠI LỄ CHÚA LÊN TRỜI (LỄ THĂNG THIÊN)',
      'Bậc Lễ': 'T',
      'Tình Trạng Học': 'Học',
      'Lớp Bí Tích': 'Có',
      'Giờ Bắt Đầu': '08:00',
      'Giờ Kết Thúc': '11:00',
      'Địa Điểm': 'Nhà thờ Don Bosco Đà Lạt',
      'Thành Phần Tham Dự': 'Khối Căn Bản 4 / Kinh Thánh 1, Cha Mẹ, Người đỡ đầu',
      'Chương Trình & Chi Tiết': 'Đức Giám Mục Giáo phận chủ tế Thánh lễ ban Bí Tích Thêm Sức và đặt tay cầu nguyện',
      'Ghi Chú': 'Tập nghi thức trước ngày lễ 3 ngày'
    },
    {
      'STT': 15,
      'Ngày (YYYY-MM-DD)': '2027-05-16',
      'Thứ': 'CN',
      'Tên Sự Kiện / Tiêu Đề': 'TỔNG KẾT NĂM HỌC GIÁO LÝ 2026 - 2027 & PHÁT THƯỞNG',
      'Loại Sự Kiện': 'Giảng Dạy',
      'Ý Lễ / Phụng Vụ': 'ĐẠI LỄ CHÚA THÁNH THẦN HIỆN XUỐNG',
      'Bậc Lễ': 'T',
      'Tình Trạng Học': 'Tổng kết',
      'Lớp Bí Tích': 'Không',
      'Giờ Bắt Đầu': '07:30',
      'Giờ Kết Thúc': '11:30',
      'Địa Điểm': 'Nhà thờ & Hội trường Don Bosco Đà Lạt',
      'Thành Phần Tham Dự': 'Toàn thể Thiếu nhi, Phụ huynh, Quý Cha, Quý Thầy, Quý Sơ và GLV',
      'Chương Trình & Chi Tiết': 'Thánh lễ Tạ ơn bế mạc năm học. Lễ tuyên dương phát thưởng Top 5 học sinh xuất sắc, trao chứng chỉ và liên hoan',
      'Ghi Chú': 'Hoàn tất xét lên lớp niên khóa 2026 - 2027'
    }
  ] : [
    {
      'STT': 1,
      'Ngày (YYYY-MM-DD)': '2026-09-06',
      'Thứ': 'CN',
      'Tên Sự Kiện / Tiêu Đề': 'Nhập tên sự kiện ví dụ: Lễ Khai Giảng',
      'Loại Sự Kiện': 'Giảng Dạy',
      'Ý Lễ / Phụng Vụ': 'CN XXIII TN A',
      'Bậc Lễ': 'T',
      'Tình Trạng Học': 'Học',
      'Lớp Bí Tích': 'Không',
      'Giờ Bắt Đầu': '07:30',
      'Giờ Kết Thúc': '10:30',
      'Địa Điểm': 'Nhà thờ Don Bosco',
      'Thành Phần Tham Dự': 'Toàn thể Thiếu nhi & GLV',
      'Chương Trình & Chi Tiết': 'Nhập nội dung chi tiết hoạt động',
      'Ghi Chú': ''
    }
  ];

  const workbook = XLSX.utils.book_new();
  const templateSheet = XLSX.utils.json_to_sheet(sampleRows);

  templateSheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 18 }, // Ngày
    { wch: 8 },  // Thứ
    { wch: 38 }, // Tiêu Đề
    { wch: 16 }, // Loại Sự Kiện
    { wch: 32 }, // Ý Lễ
    { wch: 10 }, // Bậc Lễ
    { wch: 16 }, // Tình Trạng
    { wch: 14 }, // Lớp Bí Tích
    { wch: 14 }, // Giờ BĐ
    { wch: 14 }, // Giờ KT
    { wch: 32 }, // Địa Điểm
    { wch: 34 }, // Thành Phần
    { wch: 50 }, // Chi Tiết
    { wch: 28 }, // Ghi Chú
  ];

  XLSX.utils.book_append_sheet(workbook, templateSheet, 'Mau_Nhap_NienLich');

  // Sheet 2: Guidelines
  const guideRows = [
    {
      'Tên Cột': 'STT',
      'Bắt Buộc?': 'Không',
      'Định Dạng / Kiểu Dữ Liệu': 'Số nguyên (1, 2, 3...)',
      'Hướng Dẫn & Giá Trị Hợp Lệ': 'Số thứ tự giúp theo dõi danh sách.'
    },
    {
      'Tên Cột': 'Ngày (YYYY-MM-DD)',
      'Bắt Buộc?': 'CÓ (Quan trọng)',
      'Định Dạng / Kiểu Dữ Liệu': 'YYYY-MM-DD (vd: 2026-09-06) hoặc DD/MM/YYYY',
      'Hướng Dẫn & Giá Trị Hợp Lệ': 'Ngày diễn ra sự kiện. Phải là ngày tháng hợp lệ. Hệ thống sẽ tự xác định tháng và năm học.'
    },
    {
      'Tên Cột': 'Thứ',
      'Bắt Buộc?': 'Không',
      'Định Dạng / Kiểu Dữ Liệu': 'CN, HAI, BA, TƯ, NĂM, SÁU, BẢY',
      'Hướng Dẫn & Giá Trị Hợp Lệ': 'Thứ trong tuần. Nếu để trống, hệ thống sẽ tự động tính từ cột Ngày.'
    },
    {
      'Tên Cột': 'Tên Sự Kiện / Tiêu Đề',
      'Bắt Buộc?': 'CÓ',
      'Định Dạng / Kiểu Dữ Liệu': 'Văn bản (Text)',
      'Hướng Dẫn & Giá Trị Hợp Lệ': 'Tên sự kiện hoặc tiêu đề hiển thị chính trên lịch (ví dụ: Đại Lễ Khai Giảng, Thi GK1...).'
    },
    {
      'Tên Cột': 'Loại Sự Kiện',
      'Bắt Buộc?': 'Không',
      'Định Dạng / Kiểu Dữ Liệu': 'Giảng Dạy, Tĩnh Tâm, Họp Định Kỳ, Huấn Luyện',
      'Hướng Dẫn & Giá Trị Hợp Lệ': 'Mặc định là "Giảng Dạy". Cũng có thể nhập mã: teaching, retreat, meeting, training.'
    },
    {
      'Tên Cột': 'Ý Lễ / Phụng Vụ',
      'Bắt Buộc?': 'Không',
      'Định Dạng / Kiểu Dữ Liệu': 'Văn bản (Text)',
      'Hướng Dẫn & Giá Trị Hợp Lệ': 'Tên Thánh lễ theo Lịch Phụng Vụ Công Giáo Giáo phận Đà Lạt (vd: CN XXIV TN A, Lễ Các Thánh...).'
    },
    {
      'Tên Cột': 'Bậc Lễ',
      'Bắt Buộc?': 'Không',
      'Định Dạng / Kiểu Dữ Liệu': 'T, K, N hoặc để trống',
      'Hướng Dẫn & Giá Trị Hợp Lệ': 'T: Lễ Trọng | K: Lễ Kính | N: Lễ Nhớ. Để trống nếu là lễ Thường Niên thông thường.'
    },
    {
      'Tên Cột': 'Tình Trạng Học',
      'Bắt Buộc?': 'Không',
      'Định Dạng / Kiểu Dữ Liệu': 'Học, Nghỉ, Tập trung, Tổng kết',
      'Hướng Dẫn & Giá Trị Hợp Lệ': 'Trạng thái học của thiếu nhi: Học (có giờ giáo lý), Nghỉ (nghỉ lễ/Tết), Tập trung, hoặc Tổng kết.'
    },
    {
      'Tên Cột': 'Lớp Bí Tích',
      'Bắt Buộc?': 'Không',
      'Định Dạng / Kiểu Dữ Liệu': 'Có / Không (hoặc x)',
      'Hướng Dẫn & Giá Trị Hợp Lệ': 'Điền "Có" hoặc "x" nếu sự kiện chỉ dành riêng hoặc áp dụng thêm cho khối Bí Tích (Sơ Cấp 2, Căn Bản 4).'
    },
    {
      'Tên Cột': 'Giờ Bắt Đầu',
      'Bắt Buộc?': 'Không',
      'Định Dạng / Kiểu Dữ Liệu': 'HH:MM (vd: 07:30)',
      'Hướng Dẫn & Giá Trị Hợp Lệ': 'Giờ bắt đầu sự kiện. Mặc định là 07:30.'
    },
    {
      'Tên Cột': 'Giờ Kết Thúc',
      'Bắt Buộc?': 'Không',
      'Định Dạng / Kiểu Dữ Liệu': 'HH:MM (vd: 10:30)',
      'Hướng Dẫn & Giá Trị Hợp Lệ': 'Giờ kết thúc sự kiện. Mặc định là 10:30.'
    },
    {
      'Tên Cột': 'Địa Điểm',
      'Bắt Buộc?': 'Không',
      'Định Dạng / Kiểu Dữ Liệu': 'Văn bản (Text)',
      'Hướng Dẫn & Giá Trị Hợp Lệ': 'Nơi tổ chức (Nhà thờ, Khuôn viên, Hội trường, Phòng học...). Mặc định: Nhà thờ & Khuôn viên Don Bosco Đà Lạt.'
    },
    {
      'Tên Cột': 'Thành Phần Tham Dự',
      'Bắt Buộc?': 'Không',
      'Định Dạng / Kiểu Dữ Liệu': 'Văn bản (Text)',
      'Hướng Dẫn & Giá Trị Hợp Lệ': 'Đối tượng tham dự (vd: Toàn thể Thiếu nhi & GLV, Phụ huynh, v.v.).'
    },
    {
      'Tên Cột': 'Chương Trình & Chi Tiết',
      'Bắt Buộc?': 'Không',
      'Định Dạng / Kiểu Dữ Liệu': 'Văn bản (Text)',
      'Hướng Dẫn & Giá Trị Hợp Lệ': 'Nội dung chi tiết chương trình, diễn tiến hoạt động, các mốc giờ cụ thể.'
    },
    {
      'Tên Cột': 'Ghi Chú',
      'Bắt Buộc?': 'Không',
      'Định Dạng / Kiểu Dữ Liệu': 'Văn bản (Text)',
      'Hướng Dẫn & Giá Trị Hợp Lệ': 'Lưu ý trang phục, tài liệu, nộp điểm, chuẩn bị phụng vụ.'
    }
  ];

  const guideSheet = XLSX.utils.json_to_sheet(guideRows);
  guideSheet['!cols'] = [
    { wch: 26 }, // Tên Cột
    { wch: 18 }, // Bắt Buộc?
    { wch: 36 }, // Định Dạng
    { wch: 60 }, // Hướng Dẫn
  ];

  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Huong_Dan_Nhap_Lieu');

  const cleanYear = academicYear.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = options?.filename || `Mau_Nhap_NienLich_GiaoLy_DonBosco_${cleanYear}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Export actual Calendar Events to Excel
 */
export function exportCalendarEventsToExcel(
  events: CalendarEvent[],
  options?: { filename?: string; academicYear?: string }
): void {
  const academicYear = options?.academicYear || '2026 - 2027';
  const rows = events.map((ev, index) => {
    const typeLabel = ev.type === 'retreat' ? 'Tĩnh Tâm' :
      ev.type === 'meeting' ? 'Họp Định Kỳ' :
      ev.type === 'training' ? 'Huấn Luyện' : 'Giảng Dạy';

    return {
      'STT': index + 1,
      'Ngày (YYYY-MM-DD)': ev.date,
      'Thứ': ev.dayOfWeek || getDayOfWeekVN(ev.date),
      'Tên Sự Kiện / Tiêu Đề': ev.title || ev.feastName || 'Sự kiện giáo lý',
      'Loại Sự Kiện': typeLabel,
      'Ý Lễ / Phụng Vụ': ev.feastName || '',
      'Bậc Lễ': ev.liturgyRank || '',
      'Tình Trạng Học': ev.academicStatus || 'Học',
      'Lớp Bí Tích': ev.isSacramentOnly ? 'Có' : 'Không',
      'Giờ Bắt Đầu': ev.startTime || '07:30',
      'Giờ Kết Thúc': ev.endTime || '10:30',
      'Địa Điểm': ev.location || 'Nhà thờ & Khuôn viên Don Bosco Đà Lạt',
      'Thành Phần Tham Dự': ev.targetAudience || 'Toàn thể Thiếu nhi & GLV',
      'Chương Trình & Chi Tiết': ev.activity || ev.description || '',
      'Ghi Chú': ev.notes || ''
    };
  });

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);

  sheet['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 8 },
    { wch: 38 },
    { wch: 16 },
    { wch: 32 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 32 },
    { wch: 34 },
    { wch: 50 },
    { wch: 28 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'Nien_Lich_Don_Bosco');

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const cleanYear = academicYear.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = options?.filename || `NienLich_GiaoLy_DonBosco_${cleanYear}_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

/**
 * Parse an Excel or CSV file containing calendar events
 */
export async function parseCalendarEventsFromExcel(
  file: File
): Promise<{ events: Omit<CalendarEvent, 'id'>[]; errors: string[]; totalRows: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Look for target sheet or use first sheet
  const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('nienlich') || n.toLowerCase().includes('mau')) || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    return { events: [], errors: ['Không tìm thấy bảng tính hợp lệ trong tệp Excel.'], totalRows: 0 };
  }

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  const errors: string[] = [];
  const parsedEvents: Omit<CalendarEvent, 'id'>[] = [];

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // header is row 1

    // Find date field
    const rawDate = row['Ngày (YYYY-MM-DD)'] || row['Ngày'] || row['Date'] || row['date'] || row['NGÀY'];
    const normalizedDate = normalizeDateInput(rawDate);

    // Find title or feast
    const rawTitle = row['Tên Sự Kiện / Tiêu Đề'] || row['Tên Sự Kiện'] || row['Tiêu Đề'] || row['title'] || row['Title'] || row['Ý Lễ / Phụng Vụ'] || row['Ý Lễ'];

    // If both date and title are empty, skip empty spacer row
    if (!rawDate && !rawTitle) {
      return;
    }

    if (!normalizedDate) {
      errors.push(`Dòng ${rowNum}: Ngày không hợp lệ hoặc để trống ("${rawDate || ''}").`);
      return;
    }

    const title = String(rawTitle || 'Sự kiện giáo lý').trim();
    if (!title) {
      errors.push(`Dòng ${rowNum}: Tên sự kiện không được để trống.`);
      return;
    }

    // Parse Day of Week
    const rawDay = String(row['Thứ'] || row['dayOfWeek'] || '').trim().toUpperCase();
    const validDays = ['HAI', 'BA', 'TƯ', 'NĂM', 'SÁU', 'BẢY', 'CN'];
    const dayOfWeek = validDays.includes(rawDay) 
      ? (rawDay as 'HAI' | 'BA' | 'TƯ' | 'NĂM' | 'SÁU' | 'BẢY' | 'CN') 
      : getDayOfWeekVN(normalizedDate);

    // Parse Type
    const rawType = String(row['Loại Sự Kiện'] || row['Loại'] || row['type'] || '').toLowerCase();
    let type: CalendarEvent['type'] = 'teaching';
    if (rawType.includes('tĩnh tâm') || rawType.includes('lễ') || rawType.includes('phụng vụ') || rawType.includes('retreat')) {
      type = 'retreat';
    } else if (rawType.includes('họp') || rawType.includes('meeting')) {
      type = 'meeting';
    } else if (rawType.includes('huấn luyện') || rawType.includes('đào tạo') || rawType.includes('training')) {
      type = 'training';
    }

    // Parse Academic Status
    const rawStatus = String(row['Tình Trạng Học'] || row['Tình Trạng'] || row['academicStatus'] || '').toLowerCase();
    let academicStatus: CalendarEvent['academicStatus'] = 'Học';
    if (rawStatus.includes('nghỉ')) {
      academicStatus = 'Nghỉ';
    } else if (rawStatus.includes('tập trung')) {
      academicStatus = 'Tập trung';
    } else if (rawStatus.includes('tổng kết') || rawStatus.includes('bế giảng')) {
      academicStatus = 'Tổng kết';
    }

    // Parse Liturgy Rank
    const rawRank = String(row['Bậc Lễ'] || row['liturgyRank'] || '').trim().toUpperCase();
    let liturgyRank: CalendarEvent['liturgyRank'] = undefined;
    if (rawRank === 'T' || rawRank.includes('TRỌNG')) liturgyRank = 'T';
    else if (rawRank === 'K' || rawRank.includes('KÍNH')) liturgyRank = 'K';
    else if (rawRank === 'N' || rawRank.includes('NHỚ')) liturgyRank = 'N';

    // Parse isSacramentOnly
    const rawSac = String(row['Lớp Bí Tích'] || row['isSacramentOnly'] || '').trim().toLowerCase();
    const isSacramentOnly = rawSac === 'có' || rawSac === 'x' || rawSac === 'true' || rawSac === '1';

    // Parse Times
    const startTime = String(row['Giờ Bắt Đầu'] || row['startTime'] || '07:30').trim();
    const endTime = String(row['Giờ Kết Thúc'] || row['endTime'] || '10:30').trim();
    const location = String(row['Địa Điểm'] || row['location'] || 'Nhà thờ & Khuôn viên Don Bosco Đà Lạt').trim();
    const targetAudience = String(row['Thành Phần Tham Dự'] || row['targetAudience'] || 'Toàn thể Thiếu nhi & GLV').trim();
    const detail = String(row['Chương Trình & Chi Tiết'] || row['Chương Trình & Hoạt Động Chi Tiết'] || row['description'] || row['activity'] || '').trim();
    const feastName = String(row['Ý Lễ / Phụng Vụ'] || row['Ý Lễ'] || row['feastName'] || '').trim();
    const notes = String(row['Ghi Chú'] || row['notes'] || '').trim();

    const dObj = new Date(normalizedDate);
    const month = dObj.getMonth() + 1;
    const year = dObj.getFullYear();

    parsedEvents.push({
      date: normalizedDate,
      dayOfWeek,
      title,
      type,
      academicStatus,
      liturgyRank,
      isSacramentOnly,
      startTime,
      endTime,
      location,
      targetAudience,
      description: detail,
      activity: detail,
      feastName: feastName || title,
      notes: notes || undefined,
      month,
      year
    });
  });

  return {
    events: parsedEvents,
    errors,
    totalRows: rawRows.length
  };
}

