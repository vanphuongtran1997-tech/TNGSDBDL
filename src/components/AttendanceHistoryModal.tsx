import React, { useState, useMemo } from 'react';
import { 
  X, 
  History, 
  Users, 
  User, 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Printer, 
  Download, 
  ChevronRight,
  ShieldCheck,
  Check,
  Sparkles,
  Smartphone,
  Info
} from 'lucide-react';
import { Student, ClassRoom, AttendanceRecord, AttendanceStatus, UserAccount } from '../types';

interface AttendanceHistoryModalProps {
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords: AttendanceRecord[];
  currentUser?: UserAccount;
  authorizedClassIds?: string[];
  initialClassId?: string;
  initialStudentId?: string;
  onClose: () => void;
}

export const AttendanceHistoryModal: React.FC<AttendanceHistoryModalProps> = ({
  students,
  classes,
  attendanceRecords,
  currentUser,
  authorizedClassIds,
  initialClassId,
  initialStudentId,
  onClose,
}) => {
  // Primary View Mode: 'class' (Xem theo lớp) | 'student' (Xem cá nhân)
  const [viewMode, setViewMode] = useState<'class' | 'student'>(() => {
    return initialStudentId ? 'student' : 'class';
  });

  // Filter accessible classes if teacher is restricted
  const accessibleClasses = useMemo(() => {
    if (!authorizedClassIds || authorizedClassIds.length === 0) return classes;
    return classes.filter(c => authorizedClassIds.includes(c.id));
  }, [classes, authorizedClassIds]);

  const accessibleStudents = useMemo(() => {
    if (!authorizedClassIds || authorizedClassIds.length === 0) return students;
    return students.filter(s => authorizedClassIds.includes(s.classId));
  }, [students, authorizedClassIds]);

  // --- CLASS VIEW STATE ---
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (initialClassId && accessibleClasses.some(c => c.id === initialClassId)) {
      return initialClassId;
    }
    return accessibleClasses[0]?.id || '';
  });

  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'today' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [sessionFilter, setSessionFilter] = useState<'all' | 'Chúa Nhật' | 'Thứ 5'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [semesterFilter, setSemesterFilter] = useState<'all' | 1 | 2>('all');
  const [classSearchQuery, setClassSearchQuery] = useState<string>('');

  // --- STUDENT VIEW STATE ---
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (initialStudentId && accessibleStudents.some(s => s.id === initialStudentId)) {
      return initialStudentId;
    }
    return accessibleStudents[0]?.id || '';
  });
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [studentSemesterFilter, setStudentSemesterFilter] = useState<'all' | 1 | 2>('all');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | AttendanceStatus>('all');

  const selectedClass = classes.find(c => c.id === selectedClassId) || accessibleClasses[0];
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtered Class Attendance Records
  const filteredClassRecords = useMemo(() => {
    if (!selectedClassId) return [];

    return attendanceRecords
      .filter(record => {
        // Must belong to students in this class
        if (record.classId !== selectedClassId) return false;

        // Date filter
        if (dateFilterMode === 'today' && record.date !== todayStr) return false;
        if (dateFilterMode === 'custom' && record.date !== customDate) return false;

        // Session filter
        if (sessionFilter !== 'all' && record.sessionType !== sessionFilter) return false;

        // Semester filter
        if (semesterFilter !== 'all' && record.semester !== semesterFilter) return false;

        // Status filter
        if (statusFilter !== 'all' && record.status !== statusFilter) return false;

        // Search Query (Student Name or ID)
        if (classSearchQuery.trim()) {
          const q = classSearchQuery.trim().toLowerCase();
          const st = students.find(s => s.id === record.studentId);
          if (!st) return false;
          const matchName = st.fullName.toLowerCase().includes(q);
          const matchHoly = st.holyName.toLowerCase().includes(q);
          const matchId = st.id.toLowerCase().includes(q);
          if (!matchName && !matchHoly && !matchId) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort newest date first, then newest scan time
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.scanTime || '').localeCompare(a.scanTime || '');
      });
  }, [attendanceRecords, selectedClassId, dateFilterMode, todayStr, customDate, sessionFilter, semesterFilter, statusFilter, classSearchQuery, students]);

  // Class View Statistics
  const classStats = useMemo(() => {
    const total = filteredClassRecords.length;
    const countA = filteredClassRecords.filter(r => r.status === 'A').length;
    const countB = filteredClassRecords.filter(r => r.status === 'B').length;
    const countC = filteredClassRecords.filter(r => r.status === 'C').length;
    const countD = filteredClassRecords.filter(r => r.status === 'D').length;
    const presentRate = total > 0 ? Math.round(((countA + countB) / total) * 100) : 0;

    return { total, countA, countB, countC, countD, presentRate };
  }, [filteredClassRecords]);

  // Filtered Student Attendance Records (Individual View)
  const filteredStudentRecords = useMemo(() => {
    if (!selectedStudentId) return [];

    return attendanceRecords
      .filter(record => {
        if (record.studentId !== selectedStudentId) return false;
        if (studentSemesterFilter !== 'all' && record.semester !== studentSemesterFilter) return false;
        if (studentStatusFilter !== 'all' && record.status !== studentStatusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.scanTime || '').localeCompare(a.scanTime || '');
      });
  }, [attendanceRecords, selectedStudentId, studentSemesterFilter, studentStatusFilter]);

  // Student View Statistics
  const studentStats = useMemo(() => {
    const total = filteredStudentRecords.length;
    const countA = filteredStudentRecords.filter(r => r.status === 'A').length;
    const countB = filteredStudentRecords.filter(r => r.status === 'B').length;
    const countC = filteredStudentRecords.filter(r => r.status === 'C').length;
    const countD = filteredStudentRecords.filter(r => r.status === 'D').length;

    // Chuyên cần = 10 - (trễ * 0.1) - (vắng không phép * 0.5)
    let score = 10 - (countB * 0.1) - (countD * 0.5);
    if (score < 0) score = 0;
    const attendanceScore = Math.round(score * 10) / 10;
    const attendanceRate = total > 0 ? Math.round(((countA + countB) / total) * 100) : 100;

    return { total, countA, countB, countC, countD, attendanceScore, attendanceRate };
  }, [filteredStudentRecords]);

  // Candidate students for quick selection
  const searchedCandidateStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return accessibleStudents.slice(0, 15);
    const q = studentSearchQuery.trim().toLowerCase();
    return accessibleStudents.filter(s => 
      s.fullName.toLowerCase().includes(q) || 
      s.holyName.toLowerCase().includes(q) || 
      s.id.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [accessibleStudents, studentSearchQuery]);

  // Format Status Badge
  const renderStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'A':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Đạt (A)
          </span>
        );
      case 'B':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Trễ (B)
          </span>
        );
      case 'C':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            Có Phép (C)
          </span>
        );
      case 'D':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Vắng (D)
          </span>
        );
    }
  };

  // Format slot label
  const formatSlotLabel = (slot?: string) => {
    if (!slot) return 'Giờ chuẩn';
    if (slot === 'tap_trung') return 'Tập trung';
    if (slot === 'gio_le') return 'Giờ Thánh Lễ';
    if (slot === 'giao_ly') return 'Giờ Học Giáo Lý';
    return slot;
  };

  // Format Date in Vietnamese
  const formatDateVietnamese = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const dayOfWeek = d.getDay() === 0 ? 'Chúa Nhật' : `Thứ ${d.getDay() + 1}`;
        return `${dayOfWeek}, ${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM
    if (viewMode === 'class') {
      csvContent += `LỊCH SỬ ĐIỂM DANH - LỚP: ${selectedClass?.name || ''}\n`;
      csvContent += `Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}\n\n`;
      csvContent += `STT,Mã Học Sinh,Tên Thánh,Họ Và Tên,Lớp,Ngày,Buổi Lễ,Giờ Quét,Trạng Thái,Khung Giờ,Ghi Chú / Lý Do\n`;

      filteredClassRecords.forEach((r, idx) => {
        const st = students.find(s => s.id === r.studentId);
        const statusLabel = r.status === 'A' ? 'Đạt' : r.status === 'B' ? 'Trễ' : r.status === 'C' ? 'Có phép' : 'Vắng';
        const line = [
          idx + 1,
          `"${r.studentId}"`,
          `"${st?.holyName || ''}"`,
          `"${st?.fullName || ''}"`,
          `"${selectedClass?.name || ''}"`,
          `"${r.date}"`,
          `"${r.sessionType}"`,
          `"${r.scanTime || ''}"`,
          `"${statusLabel} (${r.status})"`,
          `"${formatSlotLabel(r.timeSlot)}"`,
          `"${(r.note || '').replace(/"/g, '""')}"`
        ].join(',');
        csvContent += line + '\n';
      });
    } else {
      csvContent += `LỊCH SỬ ĐIỂM DANH CÁ NHÂN\n`;
      csvContent += `Học sinh: ${selectedStudent?.holyName || ''} ${selectedStudent?.fullName || ''} (Mã: ${selectedStudent?.id || ''})\n`;
      csvContent += `Lớp: ${classes.find(c => c.id === selectedStudent?.classId)?.name || ''}\n`;
      csvContent += `Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}\n\n`;
      csvContent += `STT,Ngày,Buổi Lễ,Giờ Quét,Trạng Thái,Khung Giờ,Học Kỳ,Ghi Chú / Lý Do\n`;

      filteredStudentRecords.forEach((r, idx) => {
        const statusLabel = r.status === 'A' ? 'Đạt' : r.status === 'B' ? 'Trễ' : r.status === 'C' ? 'Có phép' : 'Vắng';
        const line = [
          idx + 1,
          `"${r.date}"`,
          `"${r.sessionType}"`,
          `"${r.scanTime || ''}"`,
          `"${statusLabel} (${r.status})"`,
          `"${formatSlotLabel(r.timeSlot)}"`,
          `"HK ${r.semester}"`,
          `"${(r.note || '').replace(/"/g, '""')}"`
        ].join(',');
        csvContent += line + '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lich_Su_Diem_Danh_${viewMode === 'class' ? (selectedClass?.name || 'Lop') : (selectedStudent?.id || 'HocSinh')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-200 print:border-none print:shadow-none print:max-h-none">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white shadow-md print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-md">
              <History className="w-6 h-6 text-sky-200" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
                Lịch Sử Điểm Danh
                <span className="hidden sm:inline-block text-xs font-normal bg-sky-500/30 px-2.5 py-0.5 rounded-full border border-sky-300/30 text-sky-100">
                  Thời gian thực & Chi tiết
                </span>
              </h2>
              <p className="text-xs text-sky-100/90 hidden sm:block">
                Tra cứu chi tiết các lượt quét mã QR, giờ đến, trạng thái Đạt / Trễ / Vắng của cá nhân hoặc lớp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/20 cursor-pointer"
              title="In lịch sử điểm danh"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden md:inline">In Báo Cáo</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/20 cursor-pointer"
              title="Xuất file CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Xuất CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer ml-1"
              title="Đóng cửa sổ"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block p-6 text-center border-b border-slate-300">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-800">
            SỔ LỊCH SỬ ĐIỂM DANH GIÁO LÝ
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {viewMode === 'class' 
              ? `LỚP: ${selectedClass?.name || ''} • Niên Khóa: 2026 - 2027` 
              : `HỌC SINH: ${selectedStudent?.holyName || ''} ${selectedStudent?.fullName || ''} (${selectedStudent?.id || ''}) - Lớp: ${classes.find(c => c.id === selectedStudent?.classId)?.name || ''}`
            }
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Ngày in: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN')}
          </p>
        </div>

        {/* PRIMARY MODE SWITCHER: THEO LỚP VS CÁ NHÂN */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="inline-flex p-1 bg-slate-200/80 rounded-xl shadow-inner border border-slate-300/60 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('class')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'class'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Xem Theo Lớp</span>
              <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                {accessibleClasses.length} lớp
              </span>
            </button>
            <button
              onClick={() => setViewMode('student')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'student'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Xem Cá Nhân Từng Em</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 hidden lg:flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Mỗi mã QR chỉ điểm danh 1 lần duy nhất trong ngày • Lưu lại đầy đủ giờ quét</span>
          </div>
        </div>

        {/* BODY CONTAINER (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4">

          {/* ========================================================================= */}
          {/* MODE 1: XEM THEO LỚP                                                      */}
          {/* ========================================================================= */}
          {viewMode === 'class' && (
            <div className="space-y-4">
              {/* FILTERS TOOLBAR */}
              <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3 print:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Select Class */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Chọn Lớp Giáo Lý:
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      {accessibleClasses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({students.filter(s => s.classId === c.id).length} học sinh)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Thời Gian Ghi Nhận:
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={dateFilterMode}
                        onChange={(e) => setDateFilterMode(e.target.value as any)}
                        className="flex-1 text-xs font-semibold px-2.5 py-2 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="all">Tất cả các ngày</option>
                        <option value="today">Hôm nay ({todayStr})</option>
                        <option value="custom">Ngày cụ thể...</option>
                      </select>
                      {dateFilterMode === 'custom' && (
                        <input
                          type="date"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="w-32 text-xs font-semibold px-2 py-2 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      )}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Trạng Thái Điểm Danh:
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="w-full text-xs font-semibold px-3 py-2 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="A">Đạt (A) - Đúng giờ</option>
                      <option value="B">Trễ (B) - Đi muộn</option>
                      <option value="C">Có Phép (C)</option>
                      <option value="D">Vắng (D) - Không phép</option>
                    </select>
                  </div>

                  {/* Search Student in Class */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tìm Học Sinh Trong Lớp:
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Tên, mã học sinh..."
                        value={classSearchQuery}
                        onChange={(e) => setClassSearchQuery(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-2 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      {classSearchQuery && (
                        <button
                          onClick={() => setClassSearchQuery('')}
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-filter chips: Buổi & Học kỳ */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">Buổi Lễ:</span>
                    {(['all', 'Chúa Nhật', 'Thứ 5'] as const).map(sess => (
                      <button
                        key={sess}
                        onClick={() => setSessionFilter(sess)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          sessionFilter === sess
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {sess === 'all' ? 'Tất cả' : sess}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">Học Kỳ:</span>
                    {(['all', 1, 2] as const).map(sem => (
                      <button
                        key={sem}
                        onClick={() => setSemesterFilter(sem)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          semesterFilter === sem
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {sem === 'all' ? 'Cả năm' : `Học kỳ ${sem}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* STATS OVERVIEW CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Lượt Điểm Danh</p>
                  <p className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">{classStats.total}</p>
                </div>
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 shadow-2xs">
                  <p className="text-[11px] font-bold text-emerald-700 uppercase">Đạt (A)</p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-800 mt-0.5">{classStats.countA}</p>
                </div>
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 shadow-2xs">
                  <p className="text-[11px] font-bold text-amber-700 uppercase">Trễ (B)</p>
                  <p className="text-xl sm:text-2xl font-black text-amber-800 mt-0.5">{classStats.countB}</p>
                </div>
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 shadow-2xs">
                  <p className="text-[11px] font-bold text-blue-700 uppercase">Có Phép (C)</p>
                  <p className="text-xl sm:text-2xl font-black text-blue-800 mt-0.5">{classStats.countC}</p>
                </div>
                <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 shadow-2xs">
                  <p className="text-[11px] font-bold text-rose-700 uppercase">Vắng (D)</p>
                  <p className="text-xl sm:text-2xl font-black text-rose-800 mt-0.5">{classStats.countD}</p>
                </div>
                <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 shadow-2xs">
                  <p className="text-[11px] font-bold text-indigo-700 uppercase">Tỷ Lệ Đi Lễ</p>
                  <p className="text-xl sm:text-2xl font-black text-indigo-800 mt-0.5">{classStats.presentRate}%</p>
                </div>
              </div>

              {/* RECORD LIST / TABLE */}
              {filteredClassRecords.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-6">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Chưa có bản ghi điểm danh nào phù hợp</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Thử chọn lại bộ lọc ngày, trạng thái hoặc nhập từ khóa tìm kiếm khác.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  
                  {/* DESKTOP TABLE VIEW */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-3 w-12 text-center">STT</th>
                          <th className="py-3 px-3 w-28">Mã Học Sinh</th>
                          <th className="py-3 px-3">Học Sinh</th>
                          <th className="py-3 px-3 w-36">Ngày Điểm Danh</th>
                          <th className="py-3 px-3 w-24">Buổi Lễ</th>
                          <th className="py-3 px-3 w-24 text-center">Giờ Quét</th>
                          <th className="py-3 px-3 w-28 text-center">Trạng Thái</th>
                          <th className="py-3 px-3 w-28">Khung Giờ</th>
                          <th className="py-3 px-3">Ghi Chú / Chi Tiết</th>
                          <th className="py-3 px-2 text-center w-16 print:hidden">Cá Nhân</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredClassRecords.map((record, index) => {
                          const st = students.find(s => s.id === record.studentId);
                          return (
                            <tr 
                              key={record.id || `${record.studentId}-${record.date}-${index}`}
                              className="hover:bg-blue-50/40 transition-colors"
                            >
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                                {index + 1}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                                {record.studentId}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">
                                  <span className="text-blue-700 font-bold mr-1">{st?.holyName}</span>
                                  {st?.fullName}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {selectedClass?.name} {st?.gender ? `• ${st.gender}` : ''}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-700">
                                {formatDateVietnamese(record.date)}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  record.sessionType === 'Chúa Nhật' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
                                }`}>
                                  {record.sessionType}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                                {record.scanTime ? (
                                  <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-xs">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    {record.scanTime}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px] italic">Thủ công</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {renderStatusBadge(record.status)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-medium">
                                {formatSlotLabel(record.timeSlot)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                {record.note || (record.isManualEntry ? 'Nhập tay bởi GLV' : 'Quét mã QR tự động')}
                              </td>
                              <td className="py-2.5 px-2 text-center print:hidden">
                                <button
                                  onClick={() => {
                                    setSelectedStudentId(record.studentId);
                                    setViewMode('student');
                                  }}
                                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="Xem toàn bộ lịch sử của em này"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE CARDS VIEW */}
                  <div className="block md:hidden divide-y divide-slate-200">
                    {filteredClassRecords.map((record, index) => {
                      const st = students.find(s => s.id === record.studentId);
                      return (
                        <div 
                          key={record.id || `${record.studentId}-${record.date}-${index}`}
                          className="p-3 hover:bg-blue-50/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                <span className="text-blue-700 font-bold mr-1">{st?.holyName}</span>
                                {st?.fullName}
                              </div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">
                                {record.studentId} • {selectedClass?.name}
                              </div>
                            </div>
                            <div>
                              {renderStatusBadge(record.status)}
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Ngày & Buổi:</span>
                              <span className="font-semibold text-slate-700">
                                {formatDateVietnamese(record.date)} ({record.sessionType})
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Giờ Quét:</span>
                              <span className="font-mono font-bold text-slate-800">
                                {record.scanTime || 'Ghi nhận'} ({formatSlotLabel(record.timeSlot)})
                              </span>
                            </div>
                          </div>

                          {record.note && (
                            <p className="mt-1.5 text-xs text-slate-600 italic bg-amber-50/60 px-2 py-1 rounded border border-amber-200/50">
                              Ghi chú: {record.note}
                            </p>
                          )}

                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => {
                                setSelectedStudentId(record.studentId);
                                setViewMode('student');
                              }}
                              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>Xem lịch sử cá nhân em này</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 2: XEM CÁ NHÂN (STUDENT TIMELINE)                                     */}
          {/* ========================================================================= */}
          {viewMode === 'student' && (
            <div className="space-y-4">
              {/* STUDENT PICKER & SEARCH */}
              <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3 print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  
                  {/* Search / Select Student */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tìm Hoặc Chọn Học Sinh Cần Tra Cứu Lịch Sử:
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Nhập tên thánh, họ tên hoặc mã học sinh (vd: DBS-2026-001)..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-2 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      {studentSearchQuery && (
                        <button
                          onClick={() => setStudentSearchQuery('')}
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Candidate Chips */}
                    {studentSearchQuery && (
                      <div className="mt-2 max-h-36 overflow-y-auto bg-white rounded-lg border border-slate-200 shadow-sm p-1.5 divide-y divide-slate-100">
                        {searchedCandidateStudents.length === 0 ? (
                          <p className="text-xs text-slate-500 py-1 px-2">Không tìm thấy học sinh nào</p>
                        ) : (
                          searchedCandidateStudents.map(st => (
                            <button
                              key={st.id}
                              onClick={() => {
                                setSelectedStudentId(st.id);
                                setStudentSearchQuery('');
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50 rounded flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="font-semibold text-slate-800">
                                <span className="text-blue-700 font-bold mr-1">{st.holyName}</span>
                                {st.fullName} ({st.id})
                              </span>
                              <span className="text-slate-500 text-[11px]">
                                {classes.find(c => c.id === st.classId)?.name}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dropdown selector for quick class filter */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Hoặc Chọn Từ Danh Sách:
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {accessibleStudents.map(st => (
                        <option key={st.id} value={st.id}>
                          {st.holyName} {st.fullName} ({st.id}) - {classes.find(c => c.id === st.classId)?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sub filters */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">Trạng Thái:</span>
                    {(['all', 'A', 'B', 'C', 'D'] as const).map(st => (
                      <button
                        key={st}
                        onClick={() => setStudentStatusFilter(st)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          studentStatusFilter === st
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {st === 'all' ? 'Tất cả' : st === 'A' ? 'Đạt (A)' : st === 'B' ? 'Trễ (B)' : st === 'C' ? 'Phép (C)' : 'Vắng (D)'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">Học Kỳ:</span>
                    {(['all', 1, 2] as const).map(sem => (
                      <button
                        key={sem}
                        onClick={() => setStudentSemesterFilter(sem)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          studentSemesterFilter === sem
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {sem === 'all' ? 'Cả năm' : `Học kỳ ${sem}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* STUDENT PROFILE SUMMARY CARD */}
              {selectedStudent && (
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xl text-sky-300 shadow-inner">
                        {selectedStudent.holyName ? selectedStudent.holyName.slice(0, 1) : selectedStudent.fullName.slice(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                            <span className="text-sky-300 font-extrabold mr-1.5">{selectedStudent.holyName}</span>
                            {selectedStudent.fullName}
                          </h3>
                          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-sky-100">
                            {selectedStudent.id}
                          </span>
                        </div>
                        <div className="text-xs text-sky-200/80 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          <span>Lớp: <strong className="text-white">{classes.find(c => c.id === selectedStudent.classId)?.name || 'Chưa xếp lớp'}</strong></span>
                          <span>Giới tính: <strong className="text-white">{selectedStudent.gender}</strong></span>
                          <span>Phụ huynh: <strong className="text-white">{selectedStudent.parentName || 'Chưa cập nhật'}</strong></span>
                          {selectedStudent.parentPhone && (
                            <span>SĐT: <strong className="text-white">{selectedStudent.parentPhone}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats Pill */}
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 flex items-center justify-around gap-4 text-center">
                      <div>
                        <p className="text-[10px] text-sky-200 uppercase font-semibold">Tổng Buổi</p>
                        <p className="text-xl font-black text-white">{studentStats.total}</p>
                      </div>
                      <div className="h-8 w-px bg-white/20" />
                      <div>
                        <p className="text-[10px] text-emerald-300 uppercase font-semibold">Đúng Giờ</p>
                        <p className="text-xl font-black text-emerald-400">{studentStats.countA}</p>
                      </div>
                      <div className="h-8 w-px bg-white/20" />
                      <div>
                        <p className="text-[10px] text-amber-300 uppercase font-semibold">Trễ / Vắng</p>
                        <p className="text-xl font-black text-amber-300">{studentStats.countB + studentStats.countD}</p>
                      </div>
                      <div className="h-8 w-px bg-white/20" />
                      <div>
                        <p className="text-[10px] text-sky-300 uppercase font-semibold">Điểm Chuyên Cần</p>
                        <p className="text-xl font-black text-sky-200">{studentStats.attendanceScore}<span className="text-xs font-normal text-sky-300/80">/10</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TIMELINE OF ATTENDANCE RECORDS */}
              {filteredStudentRecords.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-6">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Học sinh chưa có lịch sử điểm danh nào theo bộ lọc</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Hãy kiểm tra học kỳ hoặc chọn trạng thái điểm danh khác.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3 sm:p-5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span>Nhật Ký Các Buổi Điểm Danh ({filteredStudentRecords.length} buổi)</span>
                    <span className="text-slate-400 text-[11px] font-normal lowercase">Sắp xếp: Mới nhất trước</span>
                  </h4>

                  <div className="relative border-l-2 border-slate-200 ml-4 sm:ml-6 space-y-4">
                    {filteredStudentRecords.map((record, index) => {
                      const isToday = record.date === todayStr;
                      return (
                        <div key={record.id || `${record.date}-${index}`} className="relative pl-6 sm:pl-8 group">
                          {/* Dot Icon */}
                          <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                            record.status === 'A' ? 'bg-emerald-600' :
                            record.status === 'B' ? 'bg-amber-500' :
                            record.status === 'C' ? 'bg-blue-600' : 'bg-rose-600'
                          }`} />

                          <div className={`p-3.5 rounded-xl border transition-all ${
                            isToday ? 'bg-blue-50/60 border-blue-200 shadow-2xs' : 'bg-slate-50/70 border-slate-200 group-hover:bg-white group-hover:shadow-2xs'
                          }`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-900">
                                  {formatDateVietnamese(record.date)}
                                </span>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                  record.sessionType === 'Chúa Nhật' ? 'bg-indigo-100 text-indigo-800' : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {record.sessionType}
                                </span>
                                <span className="text-[11px] font-medium text-slate-500">
                                  Học kỳ {record.semester}
                                </span>
                                {isToday && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white animate-pulse">
                                    Hôm nay
                                  </span>
                                )}
                              </div>

                              <div>
                                {renderStatusBadge(record.status)}
                              </div>
                            </div>

                            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Giờ quét thẻ:</span>
                                <strong className="font-mono text-slate-900">{record.scanTime || 'Ghi nhận'}</strong>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <Filter className="w-3.5 h-3.5 text-slate-400" />
                                <span>Khung giờ:</span>
                                <strong className="text-slate-900">{formatSlotLabel(record.timeSlot)}</strong>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                                <span>Hình thức:</span>
                                <strong className="text-slate-900">
                                  {record.isManualEntry ? 'GLV nhập tay' : 'Quét mã QR'}
                                </strong>
                              </div>
                            </div>

                            {record.note && (
                              <div className="mt-2 text-xs bg-white/80 p-2 rounded-lg border border-slate-200/80 text-slate-700">
                                <strong className="text-slate-900 mr-1">Chi tiết / Lý do:</strong>
                                <span>{record.note}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-4 sm:px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <div>
            <span>Đang hiển thị dữ liệu lịch sử điểm danh năm học <strong>2026 - 2027</strong></span>
          </div>
          <div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors cursor-pointer"
            >
              Đóng Cửa Sổ
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
