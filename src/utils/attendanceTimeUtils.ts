import { AttendanceStatus, AttendanceTimeSlot, Role, CustomDateSchedule } from '../types';

export interface AttendanceTimeConfig {
  slot: AttendanceTimeSlot;
  label: string;
  description: string;
  startTime: string; // HH:mm
  targetTime: string; // HH:mm (mốc đúng giờ: <= targetTime là Bình thường, > targetTime là Đi muộn)
  graceMinutes: number; // số phút ân hạn
  endTime: string; // HH:mm
}

// Cấu hình khung giờ chuẩn mặc định cho Chúa Nhật (7h30 tập trung, 8h00 Thánh lễ, 9h15 học giáo lý)
export const SUNDAY_TIME_CONFIGS: Record<AttendanceTimeSlot, AttendanceTimeConfig> = {
  tap_trung: {
    slot: 'tap_trung',
    label: 'Giờ Tập Trung',
    description: 'Tập trung sinh hoạt đầu giờ, kiểm tra tác phong & hàng lối (Mốc 07:30)',
    startTime: '07:00',
    targetTime: '07:30', // Mốc 07:30: sớm hơn/đúng 7h30 là bình thường (A), muộn hơn là đi muộn (B)
    graceMinutes: 0,
    endTime: '07:55',
  },
  gio_le: {
    slot: 'gio_le',
    label: 'Giờ Thánh Lễ',
    description: 'Tham dự Thánh Lễ Chúa Nhật Thiếu Nhi (Mốc 08:00)',
    startTime: '07:45',
    targetTime: '08:00', // Mốc 08:00: sớm hơn/đúng 8h00 là bình thường (A), muộn hơn là đi muộn (B)
    graceMinutes: 0,
    endTime: '09:10',
  },
  giao_ly: {
    slot: 'giao_ly',
    label: 'Giờ Học Giáo Lý',
    description: 'Học giáo lý theo phân lớp tại phòng học (Mốc 09:15)',
    startTime: '09:00',
    targetTime: '09:15', // Mốc 09:15: sớm hơn/đúng 9h15 là bình thường (A), muộn hơn là đi muộn (B)
    graceMinutes: 0,
    endTime: '10:30',
  },
};

// Cấu hình khung giờ chuẩn mặc định cho Thứ 5 (2 lớp học Thứ 5 là 18h00 học giáo lý - chỉ có mốc giờ này)
export const THURSDAY_TIME_CONFIGS: Record<AttendanceTimeSlot, AttendanceTimeConfig> = {
  tap_trung: {
    slot: 'tap_trung',
    label: 'Học Giáo Lý Thứ 5',
    description: '2 lớp học Thứ 5 học giáo lý (Mốc 18:00 - mốc giờ duy nhất)',
    startTime: '17:30',
    targetTime: '18:00',
    graceMinutes: 0,
    endTime: '19:30',
  },
  gio_le: {
    slot: 'gio_le',
    label: 'Học Giáo Lý Thứ 5',
    description: '2 lớp học Thứ 5 học giáo lý (Mốc 18:00 - mốc giờ duy nhất)',
    startTime: '17:30',
    targetTime: '18:00',
    graceMinutes: 0,
    endTime: '19:30',
  },
  giao_ly: {
    slot: 'giao_ly',
    label: 'Giờ Học Giáo Lý Thứ 5',
    description: '2 lớp học Thứ 5 học giáo lý (Mốc 18:00 - mốc giờ duy nhất)',
    startTime: '17:30',
    targetTime: '18:00', // Mốc 18:00: sớm hơn/đúng 18h00 là bình thường (A), muộn hơn là đi muộn (B)
    graceMinutes: 0,
    endTime: '19:30',
  },
};

const CUSTOM_SCHEDULES_STORAGE_KEY = 'dbs_attendance_custom_schedules_v1';

/**
 * Tải danh sách mốc giờ ngoại thường từ localStorage
 */
export function loadCustomSchedules(): Record<string, CustomDateSchedule> {
  try {
    const raw = localStorage.getItem(CUSTOM_SCHEDULES_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not parse custom schedules from storage:', e);
    return {};
  }
}

/**
 * Lưu mốc giờ ngoại thường cho ngày cụ thể
 */
export function saveCustomSchedule(schedule: CustomDateSchedule): Record<string, CustomDateSchedule> {
  try {
    const all = loadCustomSchedules();
    const key = `${schedule.date}_${schedule.sessionType}`;
    all[key] = schedule;
    localStorage.setItem(CUSTOM_SCHEDULES_STORAGE_KEY, JSON.stringify(all));
    return all;
  } catch (e) {
    console.error('Failed to save custom schedule:', e);
    return {};
  }
}

/**
 * Xóa mốc giờ ngoại thường, khôi phục giờ mặc định cho ngày đó
 */
export function deleteCustomSchedule(date: string, sessionType: 'Chúa Nhật' | 'Thứ 5'): Record<string, CustomDateSchedule> {
  try {
    const all = loadCustomSchedules();
    const key = `${date}_${sessionType}`;
    delete all[key];
    delete all[date]; // Fallback delete if legacy key
    localStorage.setItem(CUSTOM_SCHEDULES_STORAGE_KEY, JSON.stringify(all));
    return all;
  } catch (e) {
    console.error('Failed to delete custom schedule:', e);
    return {};
  }
}

/**
 * Lấy cấu hình khung giờ hiệu lực cho một ngày và buổi sinh hoạt cụ thể
 * (nếu ngày đó có mốc ngoại thường thì ghi đè, nếu không thì dùng mặc định)
 */
export function getEffectiveTimeConfigs(
  date: string,
  sessionType: 'Chúa Nhật' | 'Thứ 5',
  customSchedules?: Record<string, CustomDateSchedule>
): {
  configs: Record<AttendanceTimeSlot, AttendanceTimeConfig>;
  customSchedule?: CustomDateSchedule;
  isCustom: boolean;
} {
  const baseConfigs = sessionType === 'Chúa Nhật' ? SUNDAY_TIME_CONFIGS : THURSDAY_TIME_CONFIGS;
  const schedules = customSchedules || loadCustomSchedules();
  const key1 = `${date}_${sessionType}`;
  const key2 = date;
  const custom = schedules[key1] || schedules[key2];

  if (!custom || !custom.targetTimes) {
    return {
      configs: { ...baseConfigs },
      customSchedule: undefined,
      isCustom: false,
    };
  }

  const mergedConfigs: Record<AttendanceTimeSlot, AttendanceTimeConfig> = {
    tap_trung: {
      ...baseConfigs.tap_trung,
      targetTime: custom.targetTimes.tap_trung || baseConfigs.tap_trung.targetTime,
    },
    gio_le: {
      ...baseConfigs.gio_le,
      targetTime: custom.targetTimes.gio_le || baseConfigs.gio_le.targetTime,
    },
    giao_ly: {
      ...baseConfigs.giao_ly,
      targetTime: custom.targetTimes.giao_ly || baseConfigs.giao_ly.targetTime,
    },
  };

  return {
    configs: mergedConfigs,
    customSchedule: custom,
    isCustom: true,
  };
}

/**
 * Tự động nhận diện khung giờ phù hợp dựa theo giờ thực tế và cấu hình đang áp dụng
 */
export function autoDetectTimeSlot(
  timeStr: string, // HH:mm:ss hoặc HH:mm
  sessionType: 'Chúa Nhật' | 'Thứ 5',
  configs?: Record<AttendanceTimeSlot, AttendanceTimeConfig>
): AttendanceTimeSlot {
  const parts = timeStr.split(':');
  const minutesFromMidnight = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  const activeConfigs = configs || (sessionType === 'Chúa Nhật' ? SUNDAY_TIME_CONFIGS : THURSDAY_TIME_CONFIGS);

  const parseM = (t: string) => {
    const p = t.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  };

  if (sessionType === 'Chúa Nhật') {
    // Mốc chuẩn: 7h30 tập trung, 8h00 Thánh lễ, 9h15 học giáo lý
    const gioLeTarget = parseM(activeConfigs.gio_le.targetTime);   // 8:00 = 480
    const giaoLyTarget = parseM(activeConfigs.giao_ly.targetTime); // 9:15 = 555

    // Trước 7h45 (khoảng chuyển giao giữa tập trung và lễ) -> Giờ tập trung (Mốc 07:30)
    if (minutesFromMidnight < gioLeTarget - 15) {
      return 'tap_trung';
    }
    // Từ 7h45 đến trước giờ giáo lý (trước 9h05) -> Giờ Thánh Lễ (Mốc 08:00)
    if (minutesFromMidnight < giaoLyTarget - 10) {
      return 'gio_le';
    }
    // Từ 9h05 trở đi -> Giờ học giáo lý (Mốc 09:15)
    return 'giao_ly';
  } else {
    // Thứ 5: 2 lớp Bí Tích chỉ có duy nhất mốc 18h00 học giáo lý
    return 'giao_ly';
  }
}

export interface AttendanceTimeEvaluation {
  status: 'A' | 'B';
  slot: AttendanceTimeSlot;
  slotLabel: string;
  scanTime: string; // HH:mm:ss
  isLate: boolean;
  lateMinutes: number;
  reason: string;
  targetTime: string;
  isCustomSchedule?: boolean;
  scheduleTitle?: string;
}

/**
 * Tính điểm chuyên cần (A hay B) khi học sinh quét thẻ bằng mã QR theo giờ thực và khung giờ tham dự:
 * - Sớm hơn hoặc bằng mốc thời gian (<= targetTime): Bình thường (Loại A - Đạt)
 * - Muộn hơn mốc thời gian (> targetTime): Đi muộn (Loại B - Trễ)
 */
export function evaluateAttendanceTime(
  scanTime: string, // HH:mm:ss hoặc HH:mm
  sessionType: 'Chúa Nhật' | 'Thứ 5',
  selectedSlot?: AttendanceTimeSlot | 'auto',
  customConfigs?: Record<AttendanceTimeSlot, AttendanceTimeConfig>,
  customSchedule?: CustomDateSchedule
): AttendanceTimeEvaluation {
  const configs = customConfigs || (sessionType === 'Chúa Nhật' ? SUNDAY_TIME_CONFIGS : THURSDAY_TIME_CONFIGS);

  const activeSlot: AttendanceTimeSlot = 
    !selectedSlot || selectedSlot === 'auto' 
      ? autoDetectTimeSlot(scanTime, sessionType, configs)
      : selectedSlot;

  const config = configs[activeSlot];

  // Chuyển đổi sang số phút từ 0h
  const parseMinutes = (str: string) => {
    const parts = str.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  const currentMinutes = parseMinutes(scanTime);
  const targetMinutes = parseMinutes(config.targetTime);

  const schedulePrefix = customSchedule?.title ? `[${customSchedule.title}] ` : '';

  if (currentMinutes <= targetMinutes) {
    return {
      status: 'A',
      slot: activeSlot,
      slotLabel: config.label,
      scanTime,
      isLate: false,
      lateMinutes: 0,
      reason: `${schedulePrefix}Đến đúng giờ ${config.label} (trước/đúng mốc ${config.targetTime})`,
      targetTime: config.targetTime,
      isCustomSchedule: !!customSchedule,
      scheduleTitle: customSchedule?.title,
    };
  } else {
    const lateMinutes = currentMinutes - targetMinutes;
    return {
      status: 'B',
      slot: activeSlot,
      slotLabel: config.label,
      scanTime,
      isLate: true,
      lateMinutes,
      reason: `${schedulePrefix}Đi muộn ${lateMinutes} phút so với mốc ${config.targetTime} (${config.label})`,
      targetTime: config.targetTime,
      isCustomSchedule: !!customSchedule,
      scheduleTitle: customSchedule?.title,
    };
  }
}

export interface EditPermissionCheck {
  canEdit: boolean;
  isExpiredForCatechist: boolean;
  reason: string;
  isToday: boolean;
  isAdminOrPastor: boolean;
}

/**
 * Kiểm tra quyền hạn tự nhập thủ công điểm chuyên cần:
 * - Giáo lý viên chỉ được nhập trong chính ngày học hôm đó (hạn chót 23:59)
 * - Quản trị viên và Quý Cha có quyền nhập/sửa hồi tố sau ngày học
 */
export function checkAttendanceEditPermission(
  recordDate: string,
  userRole: Role
): EditPermissionCheck {
  const isAdminOrPastor = userRole === 'admin' || userRole === 'pastor';
  
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (isAdminOrPastor) {
    return {
      canEdit: true,
      isExpiredForCatechist: false,
      isToday: recordDate === todayStr,
      isAdminOrPastor: true,
      reason: 'Đặc quyền Quản trị viên / Cha Quản Sở: Toàn quyền cập nhật bất kỳ ngày học nào trong quá khứ hoặc hiện tại.',
    };
  }

  // Giáo lý viên thông thường
  if (recordDate === todayStr) {
    return {
      canEdit: true,
      isExpiredForCatechist: false,
      isToday: true,
      isAdminOrPastor: false,
      reason: 'Trong ngày học hôm nay: Giáo lý viên được phép nhập thủ công điểm chuyên cần cho học sinh.',
    };
  }

  if (recordDate < todayStr) {
    return {
      canEdit: false,
      isExpiredForCatechist: true,
      isToday: false,
      isAdminOrPastor: false,
      reason: `Ngày học (${recordDate}) đã qua hạn tự nhập. Theo quy chế Don Bosco Đà Lạt, chỉ Quản trị viên và Quý Cha mới có quyền cập nhật bổ sung sau ngày học.`,
    };
  }

  // Ngày tương lai
  return {
    canEdit: false,
    isExpiredForCatechist: false,
    isToday: false,
    isAdminOrPastor: false,
    reason: 'Chưa đến ngày diễn ra buổi học.',
  };
}
