export type Role = 'admin' | 'pastor' | 'catechist_leader' | 'catechist' | 'trainee' | 'parent';

export interface UserAccount {
  id: string;
  username: string; // Tên đăng nhập (vd: admin_hoang, glv_thimai)
  password?: string; // Mật khẩu đăng nhập
  name: string;
  holyName: string; // Tên Thánh
  email: string;
  phone: string;
  role: Role;
  assignedClassId?: string;
  avatarUrl?: string;
  status: 'active' | 'locked'; // Trạng thái hoạt động hoặc bị khóa
  lastLogin?: string; // Lần đăng nhập gần nhất
  createdAt?: string;
}

export type GradeLevel = 
  | 'Khai Tâm 1'
  | 'Khai Tâm 2'
  | 'Sơ Cấp 1'
  | 'Sơ Cấp 2'
  | 'Căn Bản 1'
  | 'Căn Bản 2'
  | 'Căn Bản 3'
  | 'Căn Bản 4'
  | 'Kinh Thánh 1'
  | 'Kinh Thánh 2'
  | 'Kinh Thánh 3'
  | 'Vào Đời';

export interface ClassRoom {
  id: string;
  name: string; // vd: Khai Tâm 1A, Sơ Cấp 2, Căn Bản 4
  level: GradeLevel;
  academicYear: string; // 2026 - 2027
  isSacramentClass: boolean; // Sơ Cấp 2 (Rước Lễ) & Căn Bản 4 (Thêm Sức)
  scheduleDescription: string; // Lớp Bí Tích học Thứ 5 & Chúa Nhật; lớp khác học Chúa Nhật
  headTeacherId: string;
  assistantTeacherIds: string[];
  roomNumber: string;
}

export interface Student {
  id: string; // Mã học sinh vd: DBS-2026-001
  holyName: string; // Tên Thánh (vd: Maria, Giuse, Têrêsa...)
  fullName: string; // Họ và tên
  gender: 'Nam' | 'Nữ';
  dob: string; // YYYY-MM-DD
  classId: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  subParish: string; // Giáo họ / Khu xóm
  
  // Các mốc Bí tích
  baptismDate?: string; // Rửa tội
  firstCommunionDate?: string; // Rước lễ lần đầu
  confirmationDate?: string; // Thêm sức
  godParentName?: string; // Người đỡ đầu

  // Lịch sử chuyển lớp
  transferHistory?: {
    fromClass: string;
    toClass: string;
    date: string;
    reason: string;
  }[];

  avatarUrl?: string;
  notes?: string;
}

// Chuyên cần từng buổi học:
// A: Đạt (đi đều, tập trung đúng giờ, lễ đúng giờ)
// B: Đi học / Đi lễ trễ (-0.1 đ)
// C: Vắng có phép (Bí tích: trừ 0.1 từ lần 7; Lớp thường: trừ 0.1 từ lần 4)
// D: Vắng không phép, bỏ lễ (-0.5 đ)
export type AttendanceStatus = 'A' | 'B' | 'C' | 'D';

export type AttendanceTimeSlot = 'tap_trung' | 'gio_le' | 'giao_ly';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  sessionType: 'Chúa Nhật' | 'Thứ 5';
  semester: 1 | 2;
  status: AttendanceStatus;
  scanTime?: string; // Giờ thực tế quét thẻ vd: 07:22:15
  timeSlot?: AttendanceTimeSlot; // Khung giờ tham dự: tập trung, lễ, hoặc giáo lý
  isManualEntry?: boolean; // Nhập thủ công bởi GLV hoặc Admin
  enteredByRole?: Role; // Vai trò người nhập
  note?: string;
}

// Hạnh kiểm: vi phạm bị ghi -A, -B, -C, -D, -E (mỗi lần trừ 0.1 điểm từ 10)
// A: Đồng phục
// B: Sách vở đồ dùng
// C: Bài vở
// D: Lễ phép trật tự
// E: Hoạt động chung, giữ gìn vệ sinh
export type ConductViolation = 'A' | 'B' | 'C' | 'D' | 'E';

export interface ConductRecord {
  id: string;
  studentId: string;
  classId?: string;
  date: string;
  semester: 1 | 2;
  violation: ConductViolation;
  pointsDeducted?: number;
  description?: string;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  classId: string;
  academicYear: string;
  semester: 1 | 2;
  midTermScore: number | null; // 45p (hệ số 1)
  finalExamScore: number | null; // Thi học kỳ (hệ số 2)
  retestScore?: number | null; // Điểm thi lại (tối đa 8)
  teacherFeedback?: string;
}

export interface StudentYearlyReport {
  studentId: string;
  student: Student;
  className: string;
  isSacramentClass: boolean;
  
  // Học kỳ 1
  hk1MidTerm: number | null;
  hk1Final: number | null;
  hk1AcademicAverage: number; // ĐTB HK1 = (ĐGK + ĐTHK * 2) / 3
  hk1AttendanceScore: number;
  hk1ConductScore: number;
  hk1AttendanceCounts: { A: number; B: number; C: number; D: number };
  
  // Học kỳ 2
  hk2MidTerm: number | null;
  hk2Final: number | null;
  hk2AcademicAverage: number;
  hk2AttendanceScore: number;
  hk2ConductScore: number;
  hk2AttendanceCounts: { A: number; B: number; C: number; D: number };

  // Cả năm
  yearlyAcademicAverage: number; // (TB HK1 + TB HK2 * 2) / 3
  yearlyAttendanceAverage: number; // (TB HK1 + TB HK2) / 2
  yearlyConductAverage: number; // (TB HK1 + TB HK2) / 2
  yearlyConductAndAttendanceAvg: number; // (CC + HK) / 2
  
  totalAbsencesExcused: number; // C
  totalAbsencesUnexcused: number; // D
  totalLate: number; // B

  academicRank: 'GIỎI' | 'KHÁ' | 'TRUNG BÌNH' | 'YẾU' | 'KÉM';
  finalResult: 'Được lên lớp' | 'Được lên lớp sau thi lại/rèn hạnh kiểm' | 'Ở lại lớp';
  atRiskReason?: string;
}

export interface Catechist {
  id: string;
  holyName: string;
  fullName: string;
  title: 'Linh mục Quản sở' | 'Tu sĩ Salêdiêng' | 'Huynh trưởng' | 'Giáo lý viên cơ hữu' | 'Dự trưởng' | 'Tông đồ Đội trưởng';
  assignedClassId?: string;
  assignedClassName?: string;
  email: string;
  phone: string;
  patronSaintDay: string; // Ngày lễ Bổn mạng
  serviceYears: number;
  status: 'Đang giảng dạy' | 'Nghỉ phép' | 'Đang đào tạo';
  avatarUrl?: string;
}

export interface CatechistEvaluation {
  id: string;
  catechistId: string;
  academicYear: string;
  evaluatorName: string;
  evaluatorRole: string;
  reasonScore: number; // Lý trí (soạn giáo án, đúng giờ, truyền đạt) 1-10
  religionScore: number; // Tôn giáo (tham dự lễ, chầu Thánh Thể, gương mẫu) 1-10
  lovingKindnessScore: number; // Lòng thương mến (gần gũi, thấu hiểu, sinh hoạt) 1-10
  preventiveMethodScore: number; // Hệ thống dự phòng & Lectio Divina 1-10
  totalAverage: number;
  comments: string;
  date: string;
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek?: 'HAI' | 'BA' | 'TƯ' | 'NĂM' | 'SÁU' | 'BẢY' | 'CN';
  liturgyRank?: 'T' | 'K' | 'N'; // T: Trọng, K: Kính, N: Nhớ
  academicStatus?: 'Học' | 'Nghỉ' | 'Tập trung' | 'Tổng kết';
  feastName?: string; // Ý lễ
  activity?: string; // Sinh hoạt
  notes?: string;
  month?: number;
  year?: number;
  isSacramentOnly?: boolean;
  type?: 'teaching' | 'retreat' | 'meeting' | 'training';
  title?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  targetAudience?: string;
  description?: string;
}

export interface TuitionItem {
  id: string;
  studentId: string;
  feeName: string; // vd: Quỹ Giáo Lý 2026-2027, Sách Giáo Lý & Kinh Thánh, Đồng Phục
  amount: number;
  dueDate: string;
  status: 'Đã đóng' | 'Chưa đóng' | 'Miễn giảm';
  paidDate?: string;
  receiptNumber?: string;
  payerName?: string;
  notes?: string;
}

export interface EmailNotification {
  id: string;
  recipientType: 'all_catechists' | 'class_parents' | 'individual_parent' | 'sacrament_classes';
  recipientEmails: string[];
  subject: string;
  content: string;
  category: 'Lịch học' | 'Lịch họp GLV' | 'Báo cáo điểm' | 'Nhắc học phí' | 'Chuyên cần';
  sentAt: string;
  senderName: string;
  status: 'Đã gửi' | 'Chờ gửi';
}

// Xét lên lớp đặc cách theo quyền Quản trị viên và Quý Cha
export interface SpecialPromotion {
  id: string;
  studentId: string;
  promotedToClassId: string;
  approvedBy: string; // Tên Cha Quản Sở hoặc Quản trị viên
  approvalRole: 'admin' | 'pastor';
  reason: string; // Lý do đặc cách
  decisionDate: string; // YYYY-MM-DD
  academicYear: string; // Niên khóa xét đặc cách vd: 2026 - 2027
  notes?: string;
}

// Dữ liệu sao lưu toàn hệ thống
export interface SystemBackupData {
  version: string;
  exportedAt: string;
  exportedBy: string;
  exportedByRole: Role;
  systemName: string;
  parishName: string;
  academicYear: string;
  summary: {
    totalStudents: number;
    totalClasses: number;
    totalAttendanceRecords: number;
    totalGrades: number;
    totalConducts: number;
    totalUsers: number;
  };
  data: {
    students: Student[];
    classes: ClassRoom[];
    attendanceRecords: AttendanceRecord[];
    grades: GradeRecord[];
    conducts: ConductRecord[];
    tuitionList: TuitionItem[];
    catechists: Catechist[];
    evaluations: CatechistEvaluation[];
    events: CalendarEvent[];
    notifications: EmailNotification[];
    users: UserAccount[];
    specialPromotions: SpecialPromotion[];
  };
}
