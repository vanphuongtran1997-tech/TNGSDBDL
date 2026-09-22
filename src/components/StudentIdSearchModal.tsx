import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  IdCard, 
  BookOpen, 
  Calendar, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  MapPin, 
  Church, 
  User, 
  CreditCard, 
  QrCode,
  ArrowRight,
  Sparkles,
  Clock,
  ChevronRight,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { Student, ClassRoom, GradeRecord, AttendanceRecord, ConductRecord, TuitionItem, AttendanceStatus, UserAccount } from '../types';
import { hasParishWideAccess } from '../utils/rolePermissions';
import { 
  calculateSemesterAttendanceScore, 
  calculateSemesterAcademicAverage,
  calculateYearlyAcademicAverage,
  calculateSemesterConductScore,
  calculateYearlyAverageHalf,
  evaluatePromotionAndRank,
  formatVNCurrency
} from '../utils/calculations';

interface StudentIdSearchModalProps {
  students: Student[];
  classes: ClassRoom[];
  grades: GradeRecord[];
  conducts: ConductRecord[];
  attendanceRecords: AttendanceRecord[];
  tuitionList: TuitionItem[];
  currentUser?: UserAccount;
  authorizedClassIds?: string[];
  onOpenReportBook: (student: Student) => void;
  onOpenStudentCard: (student: Student) => void;
  onQuickMarkAttendance: (studentId: string, status: AttendanceStatus, date: string, sessionType: 'Chúa Nhật' | 'Thứ 5') => void;
  onSelectStudentInList?: (studentId: string) => void;
  onClose: () => void;
}

export const StudentIdSearchModal: React.FC<StudentIdSearchModalProps> = ({
  students,
  classes,
  grades,
  conducts,
  attendanceRecords,
  tuitionList,
  currentUser,
  authorizedClassIds,
  onOpenReportBook,
  onOpenStudentCard,
  onQuickMarkAttendance,
  onSelectStudentInList,
  onClose,
}) => {
  const [searchIdQuery, setSearchIdQuery] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    return students[0]?.id || '';
  });
  const [quickAttendanceSuccess, setQuickAttendanceSuccess] = useState<string | null>(null);

  const isParishWide = currentUser ? hasParishWideAccess(currentUser.role) : true;

  // Filter accessible students for initial list & samples
  const accessibleStudents = useMemo(() => {
    if (isParishWide || !authorizedClassIds || authorizedClassIds.length === 0) return students;
    return students.filter(s => authorizedClassIds.includes(s.classId));
  }, [students, isParishWide, authorizedClassIds]);

  // Suggested popular / demo student IDs
  const sampleIds = useMemo(() => {
    const list = accessibleStudents.length > 0 ? accessibleStudents : students;
    return list.slice(0, 6).map(s => s.id);
  }, [accessibleStudents, students]);

  // Filter matched students based on ID query
  const matchedStudents = useMemo(() => {
    const q = searchIdQuery.trim().toLowerCase();
    // Non-admin roles strictly only search within their accessible students
    const pool = !isParishWide ? accessibleStudents : students;
    if (!q) {
      return pool;
    }
    return pool.filter(s => {
      const idLower = s.id.toLowerCase();
      // Match full or partial ID, or also holy name + full name as backup
      return idLower.includes(q) || 
             s.fullName.toLowerCase().includes(q) ||
             s.holyName.toLowerCase().includes(q);
    });
  }, [students, accessibleStudents, searchIdQuery, isParishWide]);

  // Active student object - strictly restricted to accessibleStudents if non-parish-wide
  const activeStudent = useMemo(() => {
    const pool = !isParishWide ? accessibleStudents : students;
    if (selectedStudentId) {
      const foundInPool = pool.find(s => s.id === selectedStudentId);
      if (foundInPool) return foundInPool;
    }
    return matchedStudents[0] || pool[0] || null;
  }, [students, selectedStudentId, matchedStudents, accessibleStudents, isParishWide]);

  const activeClass = useMemo(() => {
    if (!activeStudent) return null;
    return classes.find(c => c.id === activeStudent.classId) || null;
  }, [classes, activeStudent]);

  // Check if current user is authorized to view full details of this active student
  const isStudentAuthorized = useMemo(() => {
    if (!activeStudent || isParishWide || !authorizedClassIds || authorizedClassIds.length === 0) return true;
    return authorizedClassIds.includes(activeStudent.classId);
  }, [activeStudent, isParishWide, authorizedClassIds]);

  // Attendance stats
  const attendanceStats = useMemo(() => {
    if (!activeStudent || !activeClass) return null;
    const studentAttendance = attendanceRecords.filter(r => r.studentId === activeStudent.id);
    const sem1Records = studentAttendance.filter(r => r.semester === 1);
    const sem2Records = studentAttendance.filter(r => r.semester === 2);

    const sem1Calc = calculateSemesterAttendanceScore(
      sem1Records.map(r => r.status),
      activeClass.isSacramentClass
    );
    const sem2Calc = calculateSemesterAttendanceScore(
      sem2Records.map(r => r.status),
      activeClass.isSacramentClass
    );

    const totalRecords = studentAttendance.length;
    const counts = {
      A: studentAttendance.filter(r => r.status === 'A').length,
      B: studentAttendance.filter(r => r.status === 'B').length,
      C: studentAttendance.filter(r => r.status === 'C').length,
      D: studentAttendance.filter(r => r.status === 'D').length,
    };

    return {
      sem1Calc,
      sem2Calc,
      totalRecords,
      counts,
      yearlyAvg: Math.round(((sem1Calc.score + sem2Calc.score) / 2) * 100) / 100,
    };
  }, [activeStudent, activeClass, attendanceRecords]);

  // Grades stats
  const gradeStats = useMemo(() => {
    if (!activeStudent) return null;
    const gSem1 = grades.find(g => g.studentId === activeStudent.id && g.semester === 1);
    const gSem2 = grades.find(g => g.studentId === activeStudent.id && g.semester === 2);

    const s1Avg = gSem1 ? calculateSemesterAcademicAverage(gSem1.midTermScore, gSem1.finalExamScore, gSem1.retestScore) : 0;
    const s2Avg = gSem2 ? calculateSemesterAcademicAverage(gSem2.midTermScore, gSem2.finalExamScore, gSem2.retestScore) : 0;
    const yearlyAcademic = calculateYearlyAcademicAverage(s1Avg, s2Avg);

    const studentConducts = conducts.filter(c => c.studentId === activeStudent.id);
    const c1Violations = studentConducts.filter(c => c.semester === 1).map(c => c.violation);
    const c2Violations = studentConducts.filter(c => c.semester === 2).map(c => c.violation);
    const condScore1 = calculateSemesterConductScore(c1Violations);
    const condScore2 = calculateSemesterConductScore(c2Violations);
    const condYearly = Math.round(((condScore1 + condScore2) / 2) * 100) / 100;

    const attendYearly = attendanceStats?.yearlyAvg || 10;
    const finalYearlyAvg = calculateYearlyAverageHalf(yearlyAcademic, attendYearly);
    const totalD = (attendanceStats?.sem1Calc.counts.D || 0) + (attendanceStats?.sem2Calc.counts.D || 0);
    const evalResult = evaluatePromotionAndRank(
      yearlyAcademic,
      finalYearlyAvg,
      totalD,
      activeClass?.isSacramentClass || false
    );

    return {
      s1Avg,
      s2Avg,
      yearlyAcademic,
      condYearly,
      attendYearly,
      finalYearlyAvg,
      evalResult,
    };
  }, [activeStudent, grades, conducts, attendanceStats]);

  // Tuition info
  const studentTuition = useMemo(() => {
    if (!activeStudent) return [];
    return tuitionList.filter(t => t.studentId === activeStudent.id);
  }, [activeStudent, tuitionList]);

  const handleQuickAttendance = (status: AttendanceStatus) => {
    if (!activeStudent) return;
    if (!isStudentAuthorized) {
      alert(`⚠️ TỪ CHỐI THAO TÁC:\nBạn không có quyền điểm danh cho học sinh thuộc lớp khác (${activeStudent.fullName} - ${activeClass?.name || activeStudent.classId}). Vui lòng chỉ thao tác trên học sinh lớp bạn được phân công.`);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    onQuickMarkAttendance(activeStudent.id, status, today, 'Chúa Nhật');
    setQuickAttendanceSuccess(`Đã ghi nhận điểm danh loại [${status}] cho ${activeStudent.holyName} ${activeStudent.fullName} (${activeStudent.id}) ngày ${today}`);
    setTimeout(() => {
      setQuickAttendanceSuccess(null);
    }, 3500);
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col my-auto border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <IdCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Tìm Kiếm Thông Thường Bằng Mã Học Sinh</span>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full">
                  Mã ID Don Bosco
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Nhập mã định danh học sinh (vd: DBS-KT-001) để tra cứu tức thời hồ sơ, chuyên cần, điểm số và sổ liên lạc
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Suggestions Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-amber-600" />
            </div>
            <input
              type="text"
              autoFocus
              value={searchIdQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchIdQuery(val);
                // If typed exact match or partial, auto-select first match
                const found = students.find(s => s.id.toLowerCase() === val.trim().toLowerCase());
                if (found) {
                  setSelectedStudentId(found.id);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && activeStudent && isStudentAuthorized) {
                  e.preventDefault();
                  handleQuickAttendance('A');
                }
              }}
              placeholder="Nhập mã học sinh để tìm kiếm (vd: DBS-KT-001, 001, KT-001, hoặc họ tên)... Nhấn Enter để điểm danh ngay"
              className="w-full pl-10 pr-10 py-2.5 bg-white border-2 border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 transition-all shadow-xs"
            />
            {searchIdQuery && (
              <button
                type="button"
                onClick={() => setSearchIdQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Instant 1-Step Attendance Action Banner */}
          {activeStudent && isStudentAuthorized && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-emerald-800">Đã khớp học sinh:</span>
                <span className="font-bold text-slate-900">{activeStudent.holyName} {activeStudent.fullName}</span>
                <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-950">{activeStudent.id}</span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickAttendance('A')}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <span>⚡ Điểm Danh Đạt (A) Ngay [Phím Enter]</span>
              </button>
            </div>
          )}

          {/* Quick sample chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Gợi ý mã nhanh:
            </span>
            {sampleIds.map(id => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSearchIdQuery(id);
                  setSelectedStudentId(id);
                }}
                className={`px-2.5 py-1 rounded-lg font-mono text-xs font-semibold transition-all ${
                  selectedStudentId === id
                    ? 'bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-400 font-bold'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {id}
              </button>
            ))}
            <span className="text-[11px] text-slate-400 ml-auto italic">
              Tìm thấy: <strong className="text-slate-700">{matchedStudents.length}</strong> học sinh
            </span>
          </div>
        </div>

        {/* Quick Notification Toast */}
        {quickAttendanceSuccess && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{quickAttendanceSuccess}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Column: Matched Students List */}
          <div className="lg:col-span-4 p-3 bg-slate-50/50 max-h-[60vh] lg:max-h-none overflow-y-auto space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 pb-1 flex items-center justify-between">
              <span>Danh Sách Kết Quả ({matchedStudents.length})</span>
              <span className="text-[10px] text-slate-400">Nhấp để xem hồ sơ</span>
            </div>

            {matchedStudents.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-500/70 mx-auto" />
                <p className="text-xs font-medium text-slate-600">
                  Không tìm thấy mã học sinh "{searchIdQuery}"
                </p>
                <p className="text-[11px] text-slate-400">
                  Vui lòng kiểm tra lại mã số (ví dụ chuẩn: DBS-KT-001, DBS-SC-004) hoặc họ tên.
                </p>
              </div>
            ) : (
              matchedStudents.map((st) => {
                const isSelected = activeStudent?.id === st.id;
                const cName = classes.find(c => c.id === st.classId)?.name || st.classId;

                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStudentId(st.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-300 shadow-xs ring-1 ring-amber-300'
                        : 'bg-white hover:bg-slate-100/80 border-slate-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                          {st.id}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {st.holyName} {st.fullName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span>Lớp: <strong className="text-slate-700">{cName}</strong></span>
                        <span>•</span>
                        <span>{st.gender}</span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-600' : 'text-slate-300'}`} />
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Active Student Detailed Profile */}
          <div className="lg:col-span-8 p-4 sm:p-5 overflow-y-auto space-y-4 bg-white">
            {activeStudent ? (
              <>
                {/* Profile Banner */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 shadow-2xs">
                          MÃ SỐ: {activeStudent.id}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-white border border-amber-300 font-semibold text-amber-900">
                          {activeClass?.name || activeStudent.classId} {activeClass?.isSacramentClass ? '★ (Bí Tích)' : ''}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700">
                          {activeStudent.gender}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900">
                        <span className="text-amber-800">{activeStudent.holyName}</span> {activeStudent.fullName}
                      </h3>

                      <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Sinh ngày: <strong>{activeStudent.dob}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Church className="w-3.5 h-3.5 text-slate-400" />
                          Giáo họ: <strong>{activeStudent.subParish}</strong>
                        </span>
                      </p>
                    </div>

                    {/* Quick Attendance Recorder */}
                    {isStudentAuthorized && (
                      <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                        <div className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>Điểm Danh Nhanh Hôm Nay:</span>
                          <Clock className="w-3 h-3 text-slate-400" />
                        </div>
                        <div className="flex items-center gap-1">
                          {(['A', 'B', 'C', 'D'] as AttendanceStatus[]).map(st => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleQuickAttendance(st)}
                              className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center transition-all ${
                                st === 'A' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                                st === 'B' ? 'bg-amber-500 hover:bg-amber-600 text-white' :
                                st === 'C' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                                'bg-red-600 hover:bg-red-700 text-white'
                              }`}
                              title={`Ghi nhận chuyên cần loại ${st}`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!isStudentAuthorized ? (
                  <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-800">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-sm text-amber-950">
                      Thiếu Nhi Thuộc Lớp Khác: {activeClass?.name || 'Khác'}
                    </div>
                    <p className="text-xs text-amber-800 max-w-md mx-auto leading-relaxed">
                      Tài khoản của bạn ({currentUser?.holyName ? `${currentUser.holyName} ` : ''}{currentUser?.name}) chỉ được phân quyền quản lý thiếu nhi trong phạm vi lớp được giao. Thông tin chi tiết học tập, điểm danh và hồ sơ gia đình của em <strong>{activeStudent.holyName} {activeStudent.fullName}</strong> ({activeStudent.id}) được bảo mật theo quy chế Giáo Xứ.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Điểm Chuyên Cần</span>
                    <span className="text-base font-bold text-emerald-700">
                      {attendanceStats?.yearlyAvg || 10}/10
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {attendanceStats?.counts.A || 0} buổi Đạt (A)
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Điểm TB Học Tập</span>
                    <span className="text-base font-bold text-blue-700">
                      {gradeStats?.yearlyAcademic || 0}/10
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      HK1: {gradeStats?.s1Avg} | HK2: {gradeStats?.s2Avg}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Điểm Hạnh Kiểm</span>
                    <span className="text-base font-bold text-amber-700">
                      {gradeStats?.condYearly || 10}/10
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Tác phong & Kỷ luật
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Xếp Loại Chung</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                      gradeStats?.evalResult.academicRank === 'GIỎI' ? 'bg-emerald-100 text-emerald-800' :
                      gradeStats?.evalResult.academicRank === 'KHÁ' ? 'bg-blue-100 text-blue-800' :
                      gradeStats?.evalResult.academicRank === 'TRUNG BÌNH' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {gradeStats?.evalResult.academicRank || 'Đang cập nhật'}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {gradeStats?.evalResult.finalResult}
                    </span>
                  </div>
                </div>

                {/* Tabular Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Left Box: Family & Sacraments */}
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 bg-white">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      <span>Thông Tin Gia Đình & Bí Tích</span>
                    </h4>

                    <div className="space-y-1.5 text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Phụ huynh:</span>
                        <span className="font-semibold text-slate-900">{activeStudent.parentName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">SĐT Liên hệ:</span>
                        <a 
                          href={`tel:${activeStudent.parentPhone}`}
                          className="font-mono text-amber-700 font-semibold hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          {activeStudent.parentPhone}
                        </a>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Địa chỉ:</span>
                        <span className="text-slate-800 text-right max-w-[200px] truncate">{activeStudent.address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rửa tội:</span>
                        <span className="font-medium text-slate-800">{activeStudent.baptismDate || 'Đã hoàn tất'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rước lễ lần đầu:</span>
                        <span className="font-medium text-slate-800">{activeStudent.firstCommunionDate || 'Chưa nhận'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Thêm sức:</span>
                        <span className="font-medium text-slate-800">{activeStudent.confirmationDate || 'Chưa nhận'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Người đỡ đầu:</span>
                        <span className="font-medium text-slate-800">{activeStudent.godParentName || 'Đang cập nhật'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Box: Tuition & Attendance Breakdown */}
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 bg-white">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
                      <Award className="w-3.5 h-3.5 text-blue-600" />
                      <span>Chuyên Cần & Học Phí / Quỹ</span>
                    </h4>

                    <div className="space-y-1.5 text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tổng số buổi đã học:</span>
                        <span className="font-semibold text-slate-900">{attendanceStats?.totalRecords || 0} buổi</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Đi trễ (B):</span>
                        <span className="text-amber-700 font-semibold">{attendanceStats?.counts.B || 0} lần (-0.1đ/lần)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vắng có phép (C):</span>
                        <span className="text-blue-700 font-semibold">{attendanceStats?.counts.C || 0} lần</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vắng không phép (D):</span>
                        <span className={`font-bold ${attendanceStats?.counts.D && attendanceStats.counts.D > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                          {attendanceStats?.counts.D || 0} lần
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Tình trạng quỹ / học phí:</span>
                          {studentTuition.length > 0 ? (
                            <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                              studentTuition[0].status === 'Đã đóng' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {studentTuition[0].status} ({formatVNCurrency(studentTuition[0].amount)})
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Chưa có khoản thu</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
                  <div className="flex flex-wrap items-center gap-2">
                    {isStudentAuthorized ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenReportBook(activeStudent)}
                          className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>Xem Sổ Liên Lạc Điện Tử</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenStudentCard(activeStudent)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <QrCode className="w-4 h-4 text-amber-400" />
                          <span>Xem & In Thẻ QR Thiếu Nhi</span>
                        </button>

                        {onSelectStudentInList && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectStudentInList(activeStudent.id);
                              onClose();
                            }}
                            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1 transition-colors"
                          >
                            <span>Xem trong danh sách</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-amber-800 font-medium bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Chỉ có quyền thao tác trên lớp phụ trách ({classes.find(c => authorizedClassIds?.includes(c.id))?.name || 'Lớp được phân công'})</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                  >
                    Đóng
                  </button>
                </div>
                  </>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Search className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  Nhập mã học sinh bên trên để xem chi tiết hồ sơ
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
