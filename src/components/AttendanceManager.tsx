import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { Student, ClassRoom, AttendanceRecord, AttendanceStatus, Role, AttendanceTimeSlot } from '../types';
import { calculateSemesterAttendanceScore } from '../utils/calculations';
import { checkAttendanceEditPermission } from '../utils/attendanceTimeUtils';

interface AttendanceManagerProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords: AttendanceRecord[];
  userRole: Role;
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

  // Absence recording modal state for Catechists
  const [absenceModalStudent, setAbsenceModalStudent] = useState<Student | null>(null);
  const [absenceStatus, setAbsenceStatus] = useState<'C' | 'D'>('C');
  const [absenceReason, setAbsenceReason] = useState<string>('');

  // Cell inspection popover
  const [inspectedRecord, setInspectedRecord] = useState<{
    student: Student;
    record: AttendanceRecord;
  } | null>(null);

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
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Quét Thẻ QR (Tính Giờ Thực)</span>
            </button>

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
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-800"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.isSacramentClass ? '★ (Bí Tích)' : ''}
              </option>
            ))}
          </select>
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
          <label className="block text-slate-600 font-semibold mb-1">Ngày Điểm Danh Đang Chọn:</label>
          <input
            type="date"
            value={activeDate}
            onChange={(e) => setActiveDate(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium"
          />
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1">Buổi Học:</label>
          <select
            value={activeSessionType}
            onChange={(e) => setActiveSessionType(e.target.value as 'Chúa Nhật' | 'Thứ 5')}
            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
          >
            <option value="Chúa Nhật">Chúa Nhật (07h30 - 10h30)</option>
            <option value="Thứ 5">Thứ 5 (Dành cho Lớp Bí Tích)</option>
          </select>
        </div>
      </div>

      {/* Main Attendance Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Bảng Ghi Điểm Chuyên Cần — {selectedClass?.name} (HK {selectedSemester})
            </span>
            {selectedClass?.isSacramentClass && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                Lớp Bí Tích (Học Thứ 5 & CN)
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-300 text-[11px]">
              <tr>
                <th className="py-2.5 px-2 border-r border-slate-200 w-10 text-center">STT</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[180px]">Tên Thánh & Họ Tên</th>
                
                {/* Dates Columns */}
                {allDisplayDates.map((d) => {
                  const perm = checkAttendanceEditPermission(d, userRole);
                  return (
                    <th
                      key={d}
                      className={`py-2 px-1 border-r border-slate-200 text-center min-w-[42px] ${
                        d === activeDate ? 'bg-amber-100/80 font-bold text-amber-900 ring-1 ring-amber-300 inset-0' : ''
                      }`}
                      title={perm.canEdit ? `Ngày ${d} (Được phép nhập)` : `Ngày ${d}: ${perm.reason}`}
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        <span className="text-[10px] whitespace-nowrap font-mono">
                          {new Date(d).getDate()}/{new Date(d).getMonth() + 1}
                        </span>
                        {!perm.canEdit && (
                          <Lock className="w-2.5 h-2.5 text-rose-500 shrink-0" />
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
    </div>
  );
};
