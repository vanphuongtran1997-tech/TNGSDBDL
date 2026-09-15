import { AttendanceStatus, AttendanceTimeSlot, Role } from '../types';

export interface AttendanceTimeConfig {
  slot: AttendanceTimeSlot;
  label: string;
  description: string;
  startTime: string; // HH:mm
  targetTime: string; // HH:mm (mốc đúng giờ)
  graceMinutes: number; // số phút ân hạn
  endTime: string; // HH:mm
}

// Cấu hình khung giờ cho Chúa Nhật
export const SUNDAY_TIME_CONFIGS: Record<AttendanceTimeSlot, AttendanceTimeConfig> = {
  tap_trung: {
    slot: 'tap_trung',
    label: 'Giờ Tập Trung',
    description: 'Tập trung sinh hoạt đầu giờ, kiểm tra tác phong & hàng lối',
    startTime: '07:00',
    targetTime: '07:30',
    graceMinutes: 0,
    endTime: '07:45',
  },
  gio_le: {
    slot: 'gio_le',
    label: 'Giờ Thánh Lễ',
    description: 'Tham dự Thánh Lễ Chúa Nhật Thiếu Nhi',
    startTime: '07:30',
    targetTime: '07:35', // Cho phép 5 phút ân hạn đầu lễ
    graceMinutes: 5,
    endTime: '08:35',
  },
  giao_ly: {
    slot: 'giao_ly',
    label: 'Giờ Học Giáo Lý',
    description: 'Học giáo lý theo phân lớp tại phòng học',
    startTime: '08:45',
    targetTime: '08:50', // Cho phép 5 phút ân hạn
    graceMinutes: 5,
    endTime: '10:15',
  },
};

// Cấu hình khung giờ cho Thứ 5 (Lớp Bí Tích)
export const THURSDAY_TIME_CONFIGS: Record<AttendanceTimeSlot, AttendanceTimeConfig> = {
  tap_trung: {
    slot: 'tap_trung',
    label: 'Tập Trung & Kinh Nguyện',
    description: 'Tập trung đầu giờ chiều Thứ 5',
    startTime: '17:15',
    targetTime: '17:30',
    graceMinutes: 0,
    endTime: '17:35',
  },
  gio_le: {
    slot: 'gio_le',
    label: 'Giờ Lễ / Chầu Thánh Thể',
    description: 'Thánh lễ Thứ 5 dành cho lớp Bí Tích',
    startTime: '17:30',
    targetTime: '17:35',
    graceMinutes: 5,
    endTime: '18:15',
  },
  giao_ly: {
    slot: 'giao_ly',
    label: 'Học Giáo Lý Bí Tích',
    description: 'Học giáo lý Bí Tích (Xưng tội, Rước lễ, Thêm sức)',
    startTime: '17:30',
    targetTime: '17:35',
    graceMinutes: 5,
    endTime: '19:00',
  },
};

/**
 * Tự động nhận diện khung giờ phù hợp dựa theo giờ thực tế
 */
export function autoDetectTimeSlot(
  timeStr: string, // HH:mm:ss hoặc HH:mm
  sessionType: 'Chúa Nhật' | 'Thứ 5'
): AttendanceTimeSlot {
  const parts = timeStr.split(':');
  const minutesFromMidnight = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);

  if (sessionType === 'Chúa Nhật') {
    // Trước 07:30 -> Giờ tập trung
    if (minutesFromMidnight < 7 * 60 + 30) {
      return 'tap_trung';
    }
    // 07:30 - 08:40 -> Giờ Thánh Lễ
    if (minutesFromMidnight < 8 * 60 + 40) {
      return 'gio_le';
    }
    // 08:40 trở đi -> Giờ học giáo lý
    return 'giao_ly';
  } else {
    // Thứ 5
    if (minutesFromMidnight < 17 * 60 + 30) {
      return 'tap_trung';
    }
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
}

/**
 * Tính điểm chuyên cần (A hay B) khi học sinh quét thẻ bằng mã QR theo giờ thực và khung giờ tham dự
 */
export function evaluateAttendanceTime(
  scanTime: string, // HH:mm:ss hoặc HH:mm
  sessionType: 'Chúa Nhật' | 'Thứ 5',
  selectedSlot?: AttendanceTimeSlot | 'auto'
): AttendanceTimeEvaluation {
  const configs = sessionType === 'Chúa Nhật' ? SUNDAY_TIME_CONFIGS : THURSDAY_TIME_CONFIGS;

  const activeSlot: AttendanceTimeSlot = 
    !selectedSlot || selectedSlot === 'auto' 
      ? autoDetectTimeSlot(scanTime, sessionType)
      : selectedSlot;

  const config = configs[activeSlot];

  // Chuyển đổi sang số phút từ 0h
  const parseMinutes = (str: string) => {
    const parts = str.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  const currentMinutes = parseMinutes(scanTime);
  const targetMinutes = parseMinutes(config.targetTime);

  if (currentMinutes <= targetMinutes) {
    return {
      status: 'A',
      slot: activeSlot,
      slotLabel: config.label,
      scanTime,
      isLate: false,
      lateMinutes: 0,
      reason: `Đến đúng giờ ${config.label} (trước mốc ${config.targetTime})`,
      targetTime: config.targetTime,
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
      reason: `Trễ ${lateMinutes} phút so với mốc ${config.targetTime} (${config.label})`,
      targetTime: config.targetTime,
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
