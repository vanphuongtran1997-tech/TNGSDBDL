import { AttendanceStatus, ConductViolation, SpecialPromotion } from '../types';

/**
 * Tính điểm chuyên cần học kỳ theo quy định của Ban Giáo Lý Don Bosco Đà Lạt
 * - Thang điểm: 10
 * - B: Trừ 0.1 đ / lần
 * - C: Lớp Bí Tích trừ 0.1 đ từ lần thứ 7; Lớp thường trừ 0.1 đ từ lần thứ 4
 * - D: Trừ 0.5 đ / lần
 */
export function calculateSemesterAttendanceScore(
  statuses: AttendanceStatus[],
  isSacramentClass: boolean
): {
  score: number;
  counts: { A: number; B: number; C: number; D: number };
  isDisqualifiedDueToD: boolean;
} {
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const s of statuses) {
    if (counts[s] !== undefined) {
      counts[s]++;
    }
  }

  // Khấu trừ
  const lateDeduction = counts.B * 0.1;
  
  const excusedThreshold = isSacramentClass ? 6 : 3;
  const penalizedC = Math.max(0, counts.C - excusedThreshold);
  const excusedDeduction = penalizedC * 0.1;

  const unexcusedDeduction = counts.D * 0.5;

  const totalDeduction = lateDeduction + excusedDeduction + unexcusedDeduction;
  const rawScore = 10.0 - totalDeduction;
  const score = Math.max(0, Math.round(rawScore * 100) / 100);

  // Điều kiện phạm lỗi D
  const dLimit = isSacramentClass ? 15 : 7;
  const isDisqualifiedDueToD = counts.D >= dLimit;

  return {
    score,
    counts,
    isDisqualifiedDueToD,
  };
}

/**
 * Tính điểm hạnh kiểm học kỳ:
 * - Bắt đầu từ 10 điểm
 * - Mỗi vi phạm A, B, C, D, E trừ 0.1 đ / lần
 */
export function calculateSemesterConductScore(violations: ConductViolation[]): number {
  const deductions = violations.length * 0.1;
  const rawScore = 10.0 - deductions;
  return Math.max(0, Math.round(rawScore * 100) / 100);
}

/**
 * Tính điểm trung bình học lực học kỳ:
 * ĐTB HK = (ĐGK + ĐTHK * 2) / 3
 */
export function calculateSemesterAcademicAverage(
  midTerm: number | null,
  finalExam: number | null,
  retestScore?: number | null
): number {
  if (midTerm === null || finalExam === null) return 0;
  
  let effectiveFinal = finalExam;
  if (retestScore !== null && retestScore !== undefined) {
    effectiveFinal = Math.min(8.0, retestScore);
  }

  const raw = (midTerm + effectiveFinal * 2) / 3;
  return Math.round(raw * 100) / 100;
}

/**
 * Điểm trung bình học lực cả năm:
 * ĐIỂM TRUNG BÌNH CẢ NĂM = (TB HK1 + TB HK2 * 2) / 3
 */
export function calculateYearlyAcademicAverage(
  hk1Average: number,
  hk2Average: number
): number {
  const raw = (hk1Average + hk2Average * 2) / 3;
  return Math.round(raw * 100) / 100;
}

/**
 * Điểm trung bình chuyên cần / hạnh kiểm cả năm:
 * (ĐTB HK1 + ĐTB HK2) / 2
 */
export function calculateYearlyAverageHalf(hk1: number, hk2: number): number {
  const raw = (hk1 + hk2) / 2;
  return Math.round(raw * 100) / 100;
}

/**
 * Xếp loại cả năm & Xét Lên Lớp theo quy chế Don Bosco Đà Lạt
 * Bảng tiêu chuẩn:
 * - Giỏi: ĐTB Học lực 9.0 - 10, ĐTB CC&HK >= 9.0
 * - Khá: ĐTB Học lực 7.0 - 8.9, ĐTB CC&HK 8.0 - 8.9
 * - Trung Bình: ĐTB Học lực 5.0 - 6.9, ĐTB CC&HK 7.0 - 7.9
 * - Yếu: ĐTB Học lực 4.0 - 4.9, ĐTB CC&HK 6.0 - 6.9
 * - Kém: ĐTB Học lực 0.0 - 3.9, ĐTB CC&HK < 6.0
 */
export function evaluatePromotionAndRank(
  academicAvg: number,
  conductAndAttendanceAvg: number,
  totalD: number,
  isSacramentClass: boolean,
  specialPromotion?: SpecialPromotion | null
): {
  academicRank: 'GIỎI' | 'KHÁ' | 'TRUNG BÌNH' | 'YẾU' | 'KÉM';
  finalResult: 'Được lên lớp' | 'Được lên lớp sau thi lại/rèn hạnh kiểm' | 'Ở lại lớp' | 'Đặc cách lên lớp (Quyết định Quý Cha/Admin)';
  atRiskReason?: string;
  isSpecialPromotion?: boolean;
} {
  const dLimit = isSacramentClass ? 15 : 7;
  
  // Xét danh hiệu theo sự kết hợp của Học lực và (CC+HK)/2
  let rank: 'GIỎI' | 'KHÁ' | 'TRUNG BÌNH' | 'YẾU' | 'KÉM' = 'KÉM';

  if (academicAvg >= 9.0 && conductAndAttendanceAvg >= 9.0) {
    rank = 'GIỎI';
  } else if (academicAvg >= 7.0 && conductAndAttendanceAvg >= 8.0) {
    rank = 'KHÁ';
  } else if (academicAvg >= 5.0 && conductAndAttendanceAvg >= 7.0) {
    rank = 'TRUNG BÌNH';
  } else if (academicAvg >= 4.0 || conductAndAttendanceAvg >= 6.0) {
    rank = 'YẾU';
  } else {
    rank = 'KÉM';
  }

  // Trường hợp đặc biệt: Có quyết định đặc cách lên lớp của Quản trị viên hoặc Cha Quản Sở
  if (specialPromotion) {
    return {
      academicRank: rank,
      finalResult: 'Đặc cách lên lớp (Quyết định Quý Cha/Admin)',
      atRiskReason: undefined,
      isSpecialPromotion: true,
    };
  }

  // Kiểm tra vi phạm D chuyên cần trước
  if (totalD >= dLimit) {
    return {
      academicRank: rank,
      finalResult: 'Ở lại lớp',
      atRiskReason: `Vắng không phép/bỏ lễ (${totalD} lần) vượt ngưỡng ${dLimit} lần quy định.`,
      isSpecialPromotion: false,
    };
  }

  let finalResult: 'Được lên lớp' | 'Được lên lớp sau thi lại/rèn hạnh kiểm' | 'Ở lại lớp' | 'Đặc cách lên lớp (Quyết định Quý Cha/Admin)' = 'Ở lại lớp';
  let atRiskReason: string | undefined = undefined;

  if (rank === 'GIỎI' || rank === 'KHÁ' || rank === 'TRUNG BÌNH') {
    finalResult = 'Được lên lớp';
  } else if (rank === 'YẾU') {
    finalResult = 'Được lên lớp sau thi lại/rèn hạnh kiểm';
    atRiskReason = 'Cần thi lại môn Giáo Lý hoặc rèn luyện thêm Chuyên cần / Hạnh kiểm trong hè.';
  } else {
    finalResult = 'Ở lại lớp';
    atRiskReason = 'Điểm học lực hoặc chuyên cần/hạnh kiểm dưới chuẩn tối thiểu.';
  }

  return {
    academicRank: rank,
    finalResult,
    atRiskReason,
    isSpecialPromotion: false,
  };
}

export function formatVNCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}
