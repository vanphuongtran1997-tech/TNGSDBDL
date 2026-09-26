import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  XCircle, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Check,
  Printer,
  Search,
  Lock,
  Unlock,
  ShieldCheck,
  Info,
  UserX,
  FileEdit,
  X,
  Zap,
  LayoutGrid,
  List,
  Sparkles,
  History
} from 'lucide-react';
import { Student, ClassRoom, AttendanceRecord, AttendanceStatus, Role, AttendanceTimeSlot, CustomDateSchedule } from '../types';
import { calculateSemesterAttendanceScore } from '../utils/calculations';
import { checkAttendanceEditPermission, getEffectiveTimeConfigs } from '../utils/attendanceTimeUtils';
import { playSuccessChime, playAlreadyMarkedChime, playErrorChime } from '../utils/soundUtils';
import { AttendanceHistoryModal } from './AttendanceHistoryModal';

interface AttendanceManagerProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords: AttendanceRecord[];
  userRole: Role;
  customSchedules?: Record<string, CustomDateSchedule>;
  onOpenCustomScheduleModal?: (date: string, sessionType: 'Chúa Nhật' | 'Thứ 5') => void;
  onUpdateAttendance: (
    studentId: string, 
    status: AttendanceStatus, 
    date: string, 
    sessionType: 'Chúa Nhật' | 'Thứ 5', 
    semester: 1 | 2,
    scanTime?: string,
    timeSlot?: AttendanceTimeSlot,
    note?: string,
    isManualEntry?: boolean
  ) => void;
  onBatchMarkAllA: (classId: string, date: string, sessionType: 'Chúa Nhật' | 'Thứ 5', semester: 1 | 2) => void;
  onOpenQRScanner: () => void;
  onOpenIdSearch?: () => void;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  students,
  classes,
  attendanceRecords,
  userRole,
  customSchedules,
  onOpenCustomScheduleModal,
  onUpdateAttendance,
  onBatchMarkAllA,
  onOpenQRScanner,
  onOpenIdSearch,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [activeDate, setActiveDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [activeSessionType, setActiveSessionType] = useState<'Chúa Nhật' | 'Thứ 5'>('Chúa Nhật');
  const [studentFilterQuery, setStudentFilterQuery] = useState<string>('');

  const activeDateConfig = getEffectiveTimeConfigs(activeDate, activeSessionType, customSchedules);

  useEffect(() => {
    if (classes.length > 0 && (!selectedClassId || !classes.some(c => c.id === selectedClassId))) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Absence recording modal state for Catechists
  const [absenceModalStudent, setAbsenceModalStudent] = useState<Student | null>(null);
  const [absenceStatus, setAbsenceStatus] = useState<'C' | 'D'>('C');
  const [absenceReason, setAbsenceReason] = useState<string>('');

  // Cell inspection popover
  const [inspectedRecord, setInspectedRecord] = useState<{
    student: Student;
    record: AttendanceRecord;
  } | null>(null);

  // Quick 1-step Barcode/ID Attendance Input
  const [quickScanCode, setQuickScanCode] = useState<string>('');
  const [quickScanToast, setQuickScanToast] = useState<{
    text: string;
    isSuccess: boolean;
  } | null>(null);

  // View Mode: day_focus (mobile-optimized) vs matrix (desktop spreadsheet)
  const [attendanceViewMode, setAttendanceViewMode] = useState<'day_focus' | 'matrix'>(() => typeof window !== 'undefined' && window.innerWidth < 768 ? 'day_focus' : 'matrix');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unrecorded' | 'A' | 'B' | 'C' | 'D'>('all');

  // Attendance History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyModalStudentId, setHistoryModalStudentId] = useState<string | undefined>(undefined);

  const selectedClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const classStudents = students.filter(s => {
    if (s.classId !== selectedClass?.id) return false;
    if (!studentFilterQuery.trim()) return true;
    const q = studentFilterQuery.trim().toLowerCase();
    return s.id.toLowerCase().includes(q) || s.fullName.toLowerCase().includes(q) || s.holyName.toLowerCase().includes(q);
  });

  // Permission check for the active date
  const activeDatePermission = checkAttendanceEditPermission(activeDate, userRole);

  // Get distinct recorded dates for this class and semester
  const classAttendance = attendanceRecords.filter(
    r => r.classId === selectedClass?.id && r.semester === selectedSemester
  );

  const distinctDates = Array.from(new Set(classAttendance.map(r => r.date))).sort();

  // If activeDate is not in distinctDates, include it for input
  const allDisplayDates = Array.from(new Set([activeDate, ...distinctDates])).sort();

  const getRecordForStudentAndDate = (studentId: string, date: string) => {
    return attendanceRecords.find(
      r => r.studentId === studentId && r.date === date && r.semester === selectedSemester
    );
  };

  const handleCellClick = (student: Student, date: string) => {
    const perm = checkAttendanceEditPermission(date, userRole);
    if (!perm.canEdit) {
      alert(perm.reason || 'Bạn không có quyền chỉnh sửa ngày điểm danh này.');
      return;
    }

    const currentRecord = getRecordForStudentAndDate(student.id, date);
    const current = currentRecord?.status;
    const nextStatusMap: Record<AttendanceStatus, AttendanceStatus> = {
      'A': 'B',
      'B': 'C',
      'C': 'D',
      'D': 'A',
    };
    const nextStatus = current ? nextStatusMap[current] : 'A';
    
    onUpdateAttendance(
      student.id, 
      nextStatus, 
      date, 
      activeSessionType, 
      selectedSemester,
      undefined,
      undefined,
      `Giáo lý viên tự nhập thủ công (Đổi trạng thái: ${nextStatus})`,
      true
    );
  };

  // Quét mã hoặc nhập mã điểm danh siêu tốc 1 bước - không cần xác nhận
  const handleQuickScanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = quickScanCode.trim();
    if (!raw) return;

    if (!activeDatePermission.canEdit) {
      setQuickScanToast({
        text: `Không thể điểm danh: ${activeDatePermission.reason || 'Ngày này đã bị khóa'}`,
        isSuccess: false
      });
      setTimeout(() => setQuickScanToast(null), 3500);
      return;
    }

    let cleanId = raw;
    if (cleanId.startsWith('DBS:')) cleanId = cleanId.split(':')[1] || cleanId;
    else if (cleanId.startsWith('DBS-STUDENT:')) cleanId = cleanId.split(':')[1] || cleanId;

    const cleanLower = cleanId.toLowerCase().trim();
    const cleanNormalized = cleanLower.replace(/[-_\s]/g, '');

    const student = students.find(s => {
      const sIdLower = s.id.toLowerCase().trim();
      const sIdNorm = sIdLower.replace(/[-_\s]/g, '');
      return sIdLower === cleanLower ||
             sIdNorm === cleanNormalized ||
             sIdLower.endsWith(`-${cleanLower}`) ||
             sIdLower.endsWith(`-${cleanNormalized}`);
    });

    if (!student) {
      playErrorChime();
      setQuickScanToast({
        text: `Không tìm thấy học sinh với mã: "${raw}". Vui lòng kiểm tra lại.`,
        isSuccess: false
      });
      setTimeout(() => setQuickScanToast(null), 3500);
      return;
    }

    // KIỂM TRA ĐIỀU KIỆN: Mỗi mã QR/Mã học sinh chỉ được điểm danh 1 lần duy nhất trong ngày
    const existingToday = attendanceRecords.find(
      r => r.studentId === student.id && r.date === activeDate
    );

    if (existingToday) {
      playAlreadyMarkedChime();
      const statusLabel = existingToday.status === 'A' ? 'Đạt (A)' :
                          existingToday.status === 'B' ? 'Trễ (B)' :
                          existingToday.status === 'C' ? 'Có Phép (C)' : 'Vắng (D)';
      setQuickScanToast({
        text: `⚠️ Học sinh ${student.holyName} ${student.fullName} (${student.id}) ĐÃ ĐIỂM DANH TRƯỚC ĐÓ lúc ${existingToday.scanTime || 'trong ngày'} (${statusLabel}). Mỗi mã chỉ điểm danh 1 lần duy nhất trong ngày!`,
        isSuccess: false
      });
      setQuickScanCode('');
      setTimeout(() => setQuickScanToast(null), 4500);
      return;
    }

    // Automatically switch class if student belongs to another class
    if (student.classId !== selectedClassId) {
      setSelectedClassId(student.classId);
    }

    const nowTime = new Date().toTimeString().slice(0, 5);

    // Phát âm báo thành công
    playSuccessChime(false);

    // Lưu điểm danh tức thì không cần thêm bất kỳ thao tác nào
    onUpdateAttendance(
      student.id,
      'A',
      activeDate,
      activeSessionType,
      selectedSemester,
      nowTime,
      undefined,
      'Điểm danh nhanh 1 bước',
      true
    );

    setQuickScanToast({
      text: `✓ ĐÃ ĐIỂM DANH THÀNH CÔNG: ${student.holyName} ${student.fullName} (${student.id}) • Đạt (Loại A)`,
      isSuccess: true
    });
    setQuickScanCode('');
    setTimeout(() => setQuickScanToast(null), 3500);
  };

  const handleSaveAbsence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!absenceModalStudent) return;

    const perm = checkAttendanceEditPermission(activeDate, userRole);
    if (!perm.canEdit) {
      alert(perm.reason);
      return;
    }

    onUpdateAttendance(
      absenceModalStudent.id,
      absenceStatus,
      activeDate,
      activeSessionType,
      selectedSemester,
      undefined,
      undefined,
      absenceReason.trim() ? `Vắng: ${absenceReason.trim()}` : (absenceStatus === 'C' ? 'Vắng có phép' : 'Vắng không phép'),
      true
    );

    setAbsenceModalStudent(null);
    setAbsenceReason('');
  };

  const getStatusBadge = (record?: AttendanceRecord) => {
    if (!record || !record.status) {
      return (
        <span className="inline-block w-6 h-6 rounded bg-slate-100 text-slate-400 font-mono text-xs leading-6 text-center">
          -
        </span>
      );
    }
    switch (record.status) {
      case 'A':
        return (
          <span 
            className="inline-block w-6 h-6 rounded bg-emerald-600 text-white font-bold text-xs leading-6 text-center shadow-2xs cursor-pointer"
            title={`A: Đạt • ${record.scanTime ? `Quét lúc ${record.scanTime}` : 'Đúng giờ'}`}
          >
            A
          </span>
        );
      case 'B':
        return (
          <span 
            className="inline-block w-6 h-6 rounded bg-amber-500 text-white font-bold text-xs leading-6 text-center shadow-2xs cursor-pointer"
            title={`B: Trễ • ${record.scanTime ? `Quét lúc ${record.scanTime}` : '-0.1đ'}`}
          >
            B
          </span>
        );
      case 'C':
        return (
          <span 
            className="inline-block w-6 h-6 rounded bg-blue-600 text-white font-bold text-xs leading-6 text-center shadow-2xs cursor-pointer"
            title={`C: Nghỉ có phép • ${record.note || ''}`}
          >
            C
          </span>
        );
      case 'D':
        return (
          <span 
            className="inline-block w-6 h-6 rounded bg-red-600 text-white font-bold text-xs leading-6 text-center shadow-2xs cursor-pointer animate-pulse"
            title={`D: Nghỉ không phép / Bỏ lễ • ${record.note || '-0.5đ'}`}
          >
            D
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Instructions matching Don Bosco guideline */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-700" />
              <span>Sổ Điểm Danh & Chuyên Cần Giáo Sở Don Bosco Đà Lạt</span>
            </h1>
            <p className="text-xs text-slate-500">
              Quét mã QR tự động tính giờ A/B • Giáo lý viên tự nhập thủ công trong ngày học • Quản trị viên & Quý Cha hỗ trợ hồi tố
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="qr-scan-attendance-btn"
              onClick={onOpenQRScanner}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Quét Thẻ QR (Tự Động 1 Bước)</span>
            </button>

            {onOpenCustomScheduleModal && (
              <button
                type="button"
                id="open-custom-schedule-btn"
                onClick={() => onOpenCustomScheduleModal(activeDate, activeSessionType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                  activeDateConfig.isCustom
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-bold'
                    : 'bg-indigo-700 hover:bg-indigo-600 text-white'
                }`}
                title="Cài đặt mốc giờ đúng giờ / đi muộn (dành cho các ngày ngoại thường)"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {activeDateConfig.isCustom 
                    ? `⚡ Giờ Ngoại Thường: ${activeDateConfig.configs.tap_trung.targetTime}` 
                    : '🕒 Mốc Giờ Ngoại Thường'}
                </span>
              </button>
            )}

            {onOpenIdSearch && (
              <button
                type="button"
                id="search-by-id-attendance-btn"
                onClick={onOpenIdSearch}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Tìm kiếm thông thường bằng mã học sinh để điểm danh hoặc xem hồ sơ"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Tìm Bằng Mã HS</span>
              </button>
            )}

            {activeDatePermission.canEdit && (
              <button
                onClick={() => onBatchMarkAllA(selectedClass.id, activeDate, activeSessionType, selectedSemester)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Đánh dấu tất cả học sinh trong lớp hôm nay đạt tiêu chí A"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Điểm danh cả lớp Đạt (A)</span>
              </button>
            )}

            <button
              type="button"
              id="open-attendance-history-btn"
              onClick={() => {
                setHistoryModalStudentId(undefined);
                setIsHistoryModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Xem lịch sử điểm danh chi tiết theo lớp hoặc theo từng cá nhân học sinh"
            >
              <History className="w-3.5 h-3.5 text-sky-200" />
              <span>Xem Lịch Sử Điểm Danh</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors print:hidden"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Bảng Điểm Danh</span>
            </button>
          </div>
        </div>

        {/* Role & Date Policy Notice */}
        <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 mb-3 ${
          activeDatePermission.isAdminOrPastor 
            ? 'bg-purple-50 border-purple-200 text-purple-900'
            : activeDatePermission.canEdit
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            {activeDatePermission.isAdminOrPastor ? (
              <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
            ) : activeDatePermission.canEdit ? (
              <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <div>
              <strong>
                {activeDatePermission.isAdminOrPastor
                  ? 'Đặc quyền Quản Trị Viên / Cha Quản Sở:'
                  : activeDatePermission.canEdit
                    ? 'Quyền Giáo Lý Viên (Trong ngày học):'
                    : 'Đã hết hạn tự nhập cho Giáo Lý Viên:'}
              </strong>{' '}
              <span>{activeDatePermission.reason}</span>
            </div>
          </div>

          <div className="shrink-0 font-mono text-[11px] font-semibold bg-white/70 px-2 py-0.5 rounded border border-slate-200">
            Ngày chọn: {activeDate}
          </div>
        </div>

        {/* Quick 1-step Barcode/ID attendance input */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3">
          <form onSubmit={handleQuickScanSubmit} className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 shrink-0">
              <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              <span>Điểm Danh Nhanh 1 Bước (Quét Barcode / Gõ Mã HS):</span>
            </div>

            <div className="relative flex-1 min-w-[240px]">
              <input
                type="text"
                value={quickScanCode}
                onChange={(e) => setQuickScanCode(e.target.value)}
                placeholder="Quét mã vạch hoặc nhập mã HS (vd: DBS-KT-001, 001) rồi nhấn Enter..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
              />
            </div>

            <button
              type="submit"
              disabled={!quickScanCode.trim() || !activeDatePermission.canEdit}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Điểm Danh Đạt (A) Ngay</span>
            </button>
          </form>

          {/* Quick Scan Toast */}
          {quickScanToast && (
            <div className={`mt-2 p-2 rounded-lg text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150 ${
              quickScanToast.isSuccess
                ? 'bg-emerald-100 border border-emerald-300 text-emerald-950'
                : 'bg-rose-100 border border-rose-300 text-rose-950'
            }`}>
              {quickScanToast.isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{quickScanToast.text}</span>
            </div>
          )}
        </div>

        {/* Legend / Tiêu chí đánh giá trích nguyên văn từ tài liệu */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded bg-emerald-600 text-white font-bold text-center leading-5 shrink-0 text-xs">
              A
            </span>
            <div>
              <span className="font-bold text-slate-800">Đạt (Không trừ)</span>
              <p className="text-[11px] text-slate-500">Tập trung đúng giờ, tham dự Thánh Lễ và giờ giáo lý nghiêm túc.</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded bg-amber-500 text-white font-bold text-center leading-5 shrink-0 text-xs">
              B
            </span>
            <div>
              <span className="font-bold text-slate-800">Trễ (-0.1 đ/lần)</span>
              <p className="text-[11px] text-slate-500">Quét thẻ sau giờ quy định hoặc vào lễ trễ.</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded bg-blue-600 text-white font-bold text-center leading-5 shrink-0 text-xs">
              C
            </span>
            <div>
              <span className="font-bold text-slate-800">Có phép (GLV nhập)</span>
              <p className="text-[11px] text-slate-500">
                {selectedClass?.isSacramentClass ? 'Bí Tích: Trừ từ lần thứ 7' : 'Lớp thường: Trừ từ lần thứ 4'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded bg-red-600 text-white font-bold text-center leading-5 shrink-0 text-xs">
              D
            </span>
            <div>
              <span className="font-bold text-slate-800">Không phép (GLV nhập)</span>
              <p className="text-[11px] text-slate-500">
                Bỏ lễ CN. {selectedClass?.isSacramentClass ? '≥ 15 lần: Ở LẠI LỚP' : '≥ 7 lần: Ở LẠI LỚP'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Selector Controls */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-slate-600 font-semibold mb-1">Chọn Lớp Giáo Lý:</label>
          {classes.length > 1 ? (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-800 cursor-pointer"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.isSacramentClass ? '★ (Bí Tích)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="w-full border border-amber-300 bg-amber-50 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 flex items-center justify-between">
              <span>{classes[0]?.name || 'Lớp phụ trách'}</span>
              <span className="text-[10px] text-amber-800 font-normal flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-700" /> Lớp phân công
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1">Học Kỳ:</label>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setSelectedSemester(1)}
              className={`py-1.5 px-3 rounded-lg font-semibold border transition-colors ${
                selectedSemester === 1 
                  ? 'bg-blue-900 text-white border-blue-900' 
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Học Kỳ I ({selectedClass?.isSacramentClass ? '30 buổi' : '16 buổi'})
            </button>
            <button
              onClick={() => setSelectedSemester(2)}
              className={`py-1.5 px-3 rounded-lg font-semibold border transition-colors ${
                selectedSemester === 2 
                  ? 'bg-blue-900 text-white border-blue-900' 
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Học Kỳ II ({selectedClass?.isSacramentClass ? '34 buổi' : '17 buổi'})
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-slate-600 font-semibold">Ngày Điểm Danh Đang Chọn:</label>
            {onOpenCustomScheduleModal && (
              <button
                type="button"
                onClick={() => onOpenCustomScheduleModal(activeDate, activeSessionType)}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline flex items-center gap-0.5 cursor-pointer"
                title="Thay đổi mốc thời gian đúng giờ / đi muộn của ngày này"
              >
                <span>Đổi mốc giờ</span>
              </button>
            )}
          </div>
          <input
            type="date"
            value={activeDate}
            onChange={(e) => setActiveDate(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium"
          />
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Mốc giờ:</span>
            <span className={`font-mono font-bold px-1.5 py-0.5 rounded border ${
              activeDateConfig.isCustom 
                ? 'bg-amber-100 text-amber-900 border-amber-300' 
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {activeSessionType === 'Chúa Nhật'
                ? `TT: ${activeDateConfig.configs.tap_trung.targetTime} • Lễ: ${activeDateConfig.configs.gio_le.targetTime} • GL: ${activeDateConfig.configs.giao_ly.targetTime}`
                : `Giáo lý: ${activeDateConfig.configs.giao_ly.targetTime}`}
              {activeDateConfig.isCustom ? ' (⚡ Ngoại thường)' : ' (Chuẩn)'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1">Buổi Học:</label>
          <select
            value={activeSessionType}
            onChange={(e) => setActiveSessionType(e.target.value as 'Chúa Nhật' | 'Thứ 5')}
            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
          >
            <option value="Chúa Nhật">Chúa Nhật (7h30 tập trung • 8h00 Thánh lễ • 9h15 học giáo lý)</option>
            <option value="Thứ 5">Thứ 5 (18h00 Học giáo lý - 2 lớp Bí Tích)</option>
          </select>
        </div>
      </div>

      {/* Main Attendance Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              {attendanceViewMode === 'day_focus' ? 'Chế Độ Điểm Danh Theo Ngày' : 'Bảng Ma Trận Chuyên Cần'}
            </span>
            <span className="text-xs text-slate-500">
              • Lớp <strong className="text-slate-800">{selectedClass?.name}</strong> (Học Kỳ {selectedSemester})
            </span>
            {selectedClass?.isSacramentClass && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                Lớp Bí Tích (Học Thứ 5 & CN)
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle: Day Focus vs Matrix */}
            <div className="inline-flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setAttendanceViewMode('day_focus')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  attendanceViewMode === 'day_focus'
                    ? 'bg-white text-emerald-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Chế độ điểm danh nhanh 1 chạm theo ngày, cực kỳ dễ dùng trên điện thoại"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
                <span>Theo Ngày (Điện thoại)</span>
              </button>

              <button
                type="button"
                onClick={() => setAttendanceViewMode('matrix')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  attendanceViewMode === 'matrix'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem toàn bộ ma trận các ngày trong học kỳ trên màn hình máy tính"
              >
                <List className="w-3.5 h-3.5 text-slate-600" />
                <span>Ma Trận (Máy tính)</span>
              </button>
            </div>

            <div className="relative min-w-[150px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Lọc nhanh Mã HS (001)..."
                value={studentFilterQuery}
                onChange={(e) => setStudentFilterQuery(e.target.value)}
                className="pl-7 pr-6 py-1 text-xs border border-slate-300 rounded-md bg-white w-44 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
              {studentFilterQuery && (
                <button
                  type="button"
                  onClick={() => setStudentFilterQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <span className="text-xs text-slate-500">
              Hiển thị: <strong className="text-slate-800">{classStudents.length} em</strong>
            </span>
          </div>
        </div>

        {/* DAY FOCUS VIEW (Mobile-First 1-Touch Attendance) vs MATRIX SPREADSHEET */}
        {attendanceViewMode === 'day_focus' ? (
          <div className="p-3 sm:p-4 space-y-3 bg-slate-50/50">
            {/* Active Date Bar & Day navigation */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0">
                  <Calendar className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span>Điểm danh ngày:</span>
                    <span className="font-mono text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {new Date(activeDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {activeSessionType}
                    </span>
                  </div>
                  {!activeDatePermission.canEdit && (
                    <div className="text-[11px] text-rose-600 flex items-center gap-1 mt-0.5">
                      <Lock className="w-3 h-3 shrink-0" />
                      <span>{activeDatePermission.reason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Jump buttons */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setActiveDate(todayStr);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Hôm nay
                </button>
              </div>
            </div>

            {/* Quick Filter by Status */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-400">Lọc trạng thái ngày này:</span>
              {(['all', 'unrecorded', 'A', 'B', 'C', 'D'] as const).map(statusKey => {
                const count = classStudents.filter(st => {
                  const rec = getRecordForStudentAndDate(st.id, activeDate);
                  if (statusKey === 'all') return true;
                  if (statusKey === 'unrecorded') return !rec?.status;
                  return rec?.status === statusKey;
                }).length;

                const labels: Record<string, string> = {
                  all: `Tất cả (${classStudents.length})`,
                  unrecorded: `Chưa điểm (${count})`,
                  A: `Đạt A (${count})`,
                  B: `Trễ B (${count})`,
                  C: `Phép C (${count})`,
                  D: `Vắng D (${count})`,
                };

                const isSelected = statusFilter === statusKey;

                return (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => setStatusFilter(statusKey)}
                    className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {labels[statusKey]}
                  </button>
                );
              })}
            </div>

            {/* Students List in Day Focus Mode */}
            <div className="space-y-2.5">
              {classStudents
                .filter(st => {
                  const rec = getRecordForStudentAndDate(st.id, activeDate);
                  if (statusFilter === 'all') return true;
                  if (statusFilter === 'unrecorded') return !rec?.status;
                  return rec?.status === statusFilter;
                })
                .map((st, idx) => {
                  const record = getRecordForStudentAndDate(st.id, activeDate);
                  const currentStatus = record?.status;

                  // Overall semester attendance score
                  const stRecords = attendanceRecords.filter(
                    r => r.studentId === st.id && r.semester === selectedSemester
                  );
                  const statuses = stRecords.map(r => r.status);
                  const { score, isDisqualifiedDueToD } = calculateSemesterAttendanceScore(
                    statuses,
                    selectedClass?.isSacramentClass || false
                  );

                  return (
                    <div
                      key={st.id}
                      className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-3.5 shadow-2xs hover:border-amber-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      {/* Student information */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs shrink-0 font-mono">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
                            <span className="text-amber-800">{st.holyName}</span>
                            <span className="truncate">{st.fullName}</span>
                            {isDisqualifiedDueToD && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 text-[10px] font-bold border border-rose-300 shrink-0">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                Nguy cơ hỏng CC
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono text-slate-600 font-semibold">{st.id}</span>
                            <span>•</span>
                            <span>Điểm CC kỳ: <strong className="text-emerald-700 font-mono">{score.toFixed(1)}/10</strong></span>
                            {record?.isManualEntry && (
                              <span className="text-[10px] text-slate-400 italic">(Nhập tay)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 4 Large Touch Buttons (A, B, C, D) + Note Button */}
                      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                        {/* Status A: Đạt */}
                        <button
                          type="button"
                          disabled={!activeDatePermission.canEdit}
                          onClick={() => {
                            onUpdateAttendance(
                              st.id,
                              'A',
                              activeDate,
                              activeSessionType,
                              selectedSemester,
                              undefined,
                              undefined,
                              'Điểm danh đạt (A)',
                              true
                            );
                          }}
                          className={`flex-1 sm:flex-none min-w-[64px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                            currentStatus === 'A'
                              ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>A: Đạt</span>
                        </button>

                        {/* Status B: Trễ */}
                        <button
                          type="button"
                          disabled={!activeDatePermission.canEdit}
                          onClick={() => {
                            onUpdateAttendance(
                              st.id,
                              'B',
                              activeDate,
                              activeSessionType,
                              selectedSemester,
                              undefined,
                              undefined,
                              'Điểm danh trễ (B)',
                              true
                            );
                          }}
                          className={`flex-1 sm:flex-none min-w-[64px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                            currentStatus === 'B'
                              ? 'bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-300'
                              : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>B: Trễ</span>
                        </button>

                        {/* Status C: Có phép */}
                        <button
                          type="button"
                          disabled={!activeDatePermission.canEdit}
                          onClick={() => {
                            onUpdateAttendance(
                              st.id,
                              'C',
                              activeDate,
                              activeSessionType,
                              selectedSemester,
                              undefined,
                              undefined,
                              'Vắng có phép (C)',
                              true
                            );
                          }}
                          className={`flex-1 sm:flex-none min-w-[64px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                            currentStatus === 'C'
                              ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400'
                              : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                          }`}
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          <span>C: Phép</span>
                        </button>

                        {/* Status D: Vắng không phép */}
                        <button
                          type="button"
                          disabled={!activeDatePermission.canEdit}
                          onClick={() => {
                            onUpdateAttendance(
                              st.id,
                              'D',
                              activeDate,
                              activeSessionType,
                              selectedSemester,
                              undefined,
                              undefined,
                              'Vắng không phép (D)',
                              true
                            );
                          }}
                          className={`flex-1 sm:flex-none min-w-[64px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                            currentStatus === 'D'
                              ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400'
                              : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>D: Vắng</span>
                        </button>

                        {/* Detailed Absence modal button */}
                        <button
                          type="button"
                          onClick={() => {
                            setAbsenceModalStudent(st);
                            setAbsenceStatus('C');
                            setAbsenceReason('');
                          }}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                          title="Ghi lý do vắng / Đính kèm ghi chú"
                        >
                          <UserX className="w-4 h-4 text-slate-500" />
                        </button>

                        {/* View Individual History Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryModalStudentId(st.id);
                            setIsHistoryModalOpen(true);
                          }}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors cursor-pointer border border-blue-200/60"
                          title={`Xem toàn bộ lịch sử điểm danh của ${st.holyName} ${st.fullName}`}
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

              {classStudents.filter(st => {
                const rec = getRecordForStudentAndDate(st.id, activeDate);
                if (statusFilter === 'all') return true;
                if (statusFilter === 'unrecorded') return !rec?.status;
                return rec?.status === statusFilter;
              }).length === 0 && (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400">
                  Không có học sinh nào phù hợp với bộ lọc trạng thái.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-300 text-[11px]">
              <tr>
                <th className="py-2.5 px-2 border-r border-slate-200 w-10 text-center">STT</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[180px]">Tên Thánh & Họ Tên</th>
                
                {/* Dates Columns */}
                {allDisplayDates.map((d) => {
                  const perm = checkAttendanceEditPermission(d, userRole);
                  const customSched = customSchedules?.[d];
                  const displayedTargetTime = activeSessionType === 'Chúa Nhật'
                    ? (customSched?.targetTimes?.tap_trung || '07:30')
                    : (customSched?.targetTimes?.giao_ly || '18:00');
                  return (
                    <th
                      key={d}
                      className={`py-2 px-1 border-r border-slate-200 text-center min-w-[42px] ${
                        d === activeDate ? 'bg-amber-100/80 font-bold text-amber-900 ring-1 ring-amber-300 inset-0' : ''
                      }`}
                      title={
                        customSched 
                          ? `Ngày ${d} (⚡ Mốc giờ ngoại thường: ${displayedTargetTime} - ${customSched.title})`
                          : perm.canEdit ? `Ngày ${d} (Được phép nhập)` : `Ngày ${d}: ${perm.reason}`
                      }
                    >
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="text-[10px] whitespace-nowrap font-mono">
                            {new Date(d).getDate()}/{new Date(d).getMonth() + 1}
                          </span>
                          {!perm.canEdit && (
                            <Lock className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                          )}
                        </div>
                        {customSched && (
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-200/90 px-0.5 rounded-xs leading-tight mt-0.5 whitespace-nowrap">
                            ⚡{displayedTargetTime}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* Summary letter counts matching PDF table */}
                <th className="py-2 px-1 border-r border-slate-200 text-center bg-emerald-50 text-emerald-800 w-9 font-bold">A</th>
                <th className="py-2 px-1 border-r border-slate-200 text-center bg-amber-50 text-amber-800 w-9 font-bold">B</th>
                <th className="py-2 px-1 border-r border-slate-200 text-center bg-blue-50 text-blue-800 w-9 font-bold">C</th>
                <th className="py-2 px-1 border-r border-slate-200 text-center bg-red-50 text-red-800 w-9 font-bold">D</th>

                {/* Calculated final score */}
                <th className="py-2 px-3 text-center bg-slate-200/80 font-bold text-slate-900 w-24">
                  ĐIỂM CC
                </th>
                <th className="py-2 px-3 text-center w-28">Cảnh Báo</th>
                <th className="py-2 px-2 text-center w-20">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={allDisplayDates.length + 9} className="text-center py-10 text-slate-400">
                    Lớp chưa có học sinh nào.
                  </td>
                </tr>
              ) : (
                classStudents.map((st, idx) => {
                  // Collect all attendance statuses of this student for this semester
                  const stRecords = attendanceRecords.filter(
                    r => r.studentId === st.id && r.semester === selectedSemester
                  );
                  const statuses = stRecords.map(r => r.status);

                  const { score, counts, isDisqualifiedDueToD } = calculateSemesterAttendanceScore(
                    statuses,
                    selectedClass?.isSacramentClass || false
                  );

                  return (
                    <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-2 border-r border-slate-200 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          <span className="text-amber-800 mr-1">{st.holyName}</span>
                          <span>{st.fullName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{st.id}</div>
                      </td>

                      {/* Date Cells */}
                      {allDisplayDates.map((d) => {
                        const rec = getRecordForStudentAndDate(st.id, d);
                        const perm = checkAttendanceEditPermission(d, userRole);

                        return (
                          <td
                            key={d}
                            onClick={() => handleCellClick(st, d)}
                            className={`py-1 px-1 border-r border-slate-200 text-center transition-colors ${
                              perm.canEdit ? 'cursor-pointer hover:bg-slate-100' : 'cursor-not-allowed opacity-85'
                            } ${
                              d === activeDate ? 'bg-amber-50/50' : ''
                            }`}
                            title={
                              perm.canEdit
                                ? `Nhấp để chuyển A -> B -> C -> D cho ngày ${d}`
                                : `Đã khóa: ${perm.reason}`
                            }
                          >
                            {getStatusBadge(rec)}
                          </td>
                        );
                      })}

                      {/* Counts */}
                      <td className="py-1 px-1 border-r border-slate-200 text-center font-mono font-bold text-emerald-800 bg-emerald-50/30">
                        {counts.A}
                      </td>
                      <td className="py-1 px-1 border-r border-slate-200 text-center font-mono font-bold text-amber-700 bg-amber-50/30">
                        {counts.B}
                      </td>
                      <td className="py-1 px-1 border-r border-slate-200 text-center font-mono font-bold text-blue-700 bg-blue-50/30">
                        {counts.C}
                      </td>
                      <td className="py-1 px-1 border-r border-slate-200 text-center font-mono font-bold text-red-700 bg-red-50/30">
                        {counts.D}
                      </td>

                      {/* Calculated Score */}
                      <td className="py-2 px-2 text-center bg-slate-100 font-mono font-bold text-sm text-slate-900 border-r border-slate-200">
                        {score.toFixed(1)}
                      </td>

                      {/* Warning column */}
                      <td className="py-1 px-2 text-center">
                        {isDisqualifiedDueToD ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded border border-red-300 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            <span>Không lên lớp (D≥{selectedClass?.isSacramentClass ? '15' : '7'})</span>
                          </span>
                        ) : counts.D > 0 ? (
                          <span className="text-[10px] text-amber-700 font-medium">
                            {counts.D} lần vi phạm D
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-medium">Đạt chuẩn</span>
                        )}
                      </td>

                      {/* Action column: quick absence entry button for Catechists */}
                      <td className="py-1 px-2 text-center">
                        {activeDatePermission.canEdit ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAbsenceModalStudent(st);
                              setAbsenceStatus('C');
                              setAbsenceReason('');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded text-[10px] font-medium transition-colors"
                            title="Giáo lý viên ghi nhận học sinh vắng có phép hoặc không phép hôm nay"
                          >
                            Báo Vắng
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Đã khóa</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* Quick Absence Recording Modal */}
      {absenceModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold">Ghi Nhận Vắng Cho Học Sinh</h3>
              </div>
              <button
                onClick={() => setAbsenceModalStudent(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAbsence} className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-slate-500">Học sinh:</div>
                <div className="text-sm font-bold text-slate-900">
                  {absenceModalStudent.holyName} {absenceModalStudent.fullName} ({absenceModalStudent.id})
                </div>
                <div className="text-slate-500 mt-1">
                  Ngày ghi nhận: <strong className="text-slate-800">{activeDate}</strong> • {activeSessionType}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Loại vắng:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAbsenceStatus('C')}
                    className={`py-2 px-3 rounded-lg font-bold border text-center transition-all ${
                      absenceStatus === 'C'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    C: Vắng Có Phép
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbsenceStatus('D')}
                    className={`py-2 px-3 rounded-lg font-bold border text-center transition-all ${
                      absenceStatus === 'D'
                        ? 'bg-red-600 text-white border-red-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    D: Vắng Không Phép
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Lý do vắng (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder="vd: Ốm sốt có đơn phụ huynh, bận thi học kỳ..."
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAbsenceModalStudent(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu Ghi Nhận</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance History Modal */}
      {isHistoryModalOpen && (
        <AttendanceHistoryModal
          students={students}
          classes={classes}
          attendanceRecords={attendanceRecords}
          initialClassId={selectedClassId}
          initialStudentId={historyModalStudentId}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setHistoryModalStudentId(undefined);
          }}
        />
      )}
    </div>
  );
};
