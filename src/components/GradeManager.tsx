import React, { useState, useEffect } from 'react';
import { 
  Award, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Printer, 
  Download,
  Info,
  ShieldAlert,
  ChevronDown,
  FileSpreadsheet,
  Lock,
  LayoutGrid,
  List,
  Search,
  Check
} from 'lucide-react';
import { 
  Student, 
  ClassRoom, 
  GradeRecord, 
  ConductRecord, 
  AttendanceRecord, 
  Role, 
  ConductViolation,
  SpecialPromotion 
} from '../types';
import { 
  calculateSemesterAcademicAverage, 
  calculateYearlyAcademicAverage,
  calculateSemesterAttendanceScore,
  calculateSemesterConductScore,
  calculateYearlyAverageHalf,
  evaluatePromotionAndRank
} from '../utils/calculations';
import { exportGradesToExcel } from '../utils/excelExport';
import { ExcelExportModal } from './ExcelExportModal';

interface GradeManagerProps {
  students: Student[];
  classes: ClassRoom[];
  grades: GradeRecord[];
  conducts: ConductRecord[];
  attendanceRecords: AttendanceRecord[];
  userRole: Role;
  specialPromotions?: SpecialPromotion[];
  onUpdateGrade: (grade: Omit<GradeRecord, 'id'>) => void;
  onAddConductViolation: (studentId: string, violation: ConductViolation, semester: 1 | 2, description?: string) => void;
  onRemoveConductViolation: (conductId: string) => void;
}

export const GradeManager: React.FC<GradeManagerProps> = ({
  students,
  classes,
  grades,
  conducts,
  attendanceRecords,
  userRole,
  specialPromotions = [],
  onUpdateGrade,
  onAddConductViolation,
  onRemoveConductViolation,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedSemester, setSelectedSemester] = useState<1 | 2 | 'yearly'>(1);
  const [localScores, setLocalScores] = useState<Record<string, { mid: string; final: string; retest: string }>>({});
  const [activeViolationModalStudent, setActiveViolationModalStudent] = useState<Student | null>(null);
  const [isExcelExportOpen, setIsExcelExportOpen] = useState(false);
  const [gradeViewMode, setGradeViewMode] = useState<'card' | 'table'>(() => typeof window !== 'undefined' && window.innerWidth < 768 ? 'card' : 'table');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedToastId, setSavedToastId] = useState<string | null>(null);

  useEffect(() => {
    if (classes.length > 0 && (!selectedClassId || !classes.some(c => c.id === selectedClassId))) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const selectedClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const classStudents = students.filter(s => s.classId === selectedClass?.id);

  const canEdit = userRole === 'admin' || userRole === 'pastor' || userRole === 'catechist_leader' || userRole === 'catechist';

  // Helper to get grade record
  const getGradeRecord = (studentId: string, sem: 1 | 2) => {
    return grades.find(g => g.studentId === studentId && g.semester === sem);
  };

  const handleScoreChange = (studentId: string, field: 'mid' | 'final' | 'retest', val: string) => {
    setLocalScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val,
      }
    }));
  };

  const saveStudentScore = (studentId: string, sem: 1 | 2) => {
    if (!canEdit) return;
    const currentGrade = getGradeRecord(studentId, sem);
    const studentInput = localScores[studentId];

    const midScore = studentInput?.mid !== undefined 
      ? (studentInput.mid === '' ? null : parseFloat(studentInput.mid))
      : (currentGrade?.midTermScore ?? null);

    const finalScore = studentInput?.final !== undefined 
      ? (studentInput.final === '' ? null : parseFloat(studentInput.final))
      : (currentGrade?.finalExamScore ?? null);

    const retestScore = studentInput?.retest !== undefined 
      ? (studentInput.retest === '' ? null : parseFloat(studentInput.retest))
      : (currentGrade?.retestScore ?? null);

    onUpdateGrade({
      studentId,
      classId: selectedClass.id,
      academicYear: '2026 - 2027',
      semester: sem,
      midTermScore: isNaN(midScore as number) ? null : midScore,
      finalExamScore: isNaN(finalScore as number) ? null : finalScore,
      retestScore: isNaN(retestScore as number) ? null : retestScore,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              <span>Sổ Điểm Học Lực, Hạnh Kiểm & Đánh Giá Cuối Năm</span>
            </h1>
            <p className="text-xs text-slate-500">
              Công thức Giáo Sở Don Bosco: ĐTB HK = (ĐGK + ĐTHK × 2) / 3 • ĐTB Cả Năm = (TB HK1 + TB HK2 × 2) / 3
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Export Current Class to Excel */}
            <button
              type="button"
              id="quick-export-grades-btn"
              onClick={() => {
                const now = new Date();
                const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                const semText = selectedSemester === 'yearly' ? 'CaNam' : `HK${selectedSemester}`;
                exportGradesToExcel(
                  classStudents,
                  classes,
                  grades,
                  conducts,
                  attendanceRecords,
                  specialPromotions,
                  {
                    classId: selectedClass.id,
                    semester: selectedSemester,
                    filename: `BangDiem_${selectedClass.name.replace(/[^a-zA-Z0-9]/g, '_')}_${semText}_${dateStr}.xlsx`,
                  }
                );
              }}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title={`Xuất bảng điểm lớp ${selectedClass?.name} (${selectedSemester === 'yearly' ? 'Cả Năm' : `HK ${selectedSemester}`}) sang Excel (.xlsx)`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Excel Lớp Này</span>
            </button>

            {/* Custom Export Modal Button */}
            <button
              type="button"
              id="open-export-modal-btn"
              onClick={() => setIsExcelExportOpen(true)}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Mở tùy chọn xuất Excel cho nhiều lớp hoặc toàn trường"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tùy Chọn Xuất...</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors print:hidden"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Bảng Tổng Hợp Điểm</span>
            </button>
          </div>
        </div>

        {/* Regulations Info Banner matching PDF Page 1 */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-900">
            <Info className="w-4 h-4 text-amber-700" />
            <span>Quy Chế Đánh Giá Ban Giáo Lý Don Bosco Đà Lạt:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900/90 pl-1">
            <li><strong>Học lực:</strong> Mỗi học kỳ có 1 bài kiểm tra 45 phút (hệ số 1) và 1 bài thi học kỳ (hệ số 2). Không kiểm tra 15 phút hoặc miệng ghi sổ.</li>
            <li><strong>Bài thi lại:</strong> Hoàn thành tốt bài thi lại lấy tối đa 8.0 điểm (giảm dần theo điểm bài thi).</li>
            <li><strong>Hạnh kiểm:</strong> Khởi đầu 10 điểm. Mỗi lần vi phạm tiêu chí (A: đồng phục, B: sách vở, C: làm bài, D: lễ phép, E: trật tự/vệ sinh) trừ 0.1 đ/lần.</li>
            <li><strong>Lên lớp:</strong> Kết hợp ĐTB Học lực cả năm và ĐTB Chuyên cần & Hạnh kiểm. Điểm D chuyên cần ≥ 15 (Bí Tích) hoặc ≥ 7 (Lớp thường) không được lên lớp.</li>
          </ul>
        </div>
      </div>

      {/* Selectors */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
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
          <label className="block text-slate-600 font-semibold mb-1">Xem Kỳ Học:</label>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setSelectedSemester(1)}
              className={`py-1.5 px-2 rounded-lg font-semibold border transition-colors ${
                selectedSemester === 1 
                  ? 'bg-blue-900 text-white border-blue-900' 
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Học Kỳ I
            </button>
            <button
              onClick={() => setSelectedSemester(2)}
              className={`py-1.5 px-2 rounded-lg font-semibold border transition-colors ${
                selectedSemester === 2 
                  ? 'bg-blue-900 text-white border-blue-900' 
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Học Kỳ II
            </button>
            <button
              onClick={() => setSelectedSemester('yearly')}
              className={`py-1.5 px-2 rounded-lg font-semibold border transition-colors ${
                selectedSemester === 'yearly' 
                  ? 'bg-amber-600 text-white border-amber-600' 
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Tổng Kết Cả Năm
            </button>
          </div>
        </div>
      </div>

      {/* Main Grade Table / Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              {selectedSemester === 'yearly' 
                ? `Bảng Tổng Kết Học Lực & Hạnh Kiểm Cả Năm — ${selectedClass?.name}`
                : `Sổ Điểm Học Kỳ ${selectedSemester} — ${selectedClass?.name}`}
            </div>
            <span className="text-[11px] text-slate-500">
              {canEdit ? 'Nhập điểm trực tiếp vào ô rồi bấm Lưu' : 'Chế độ xem bảng điểm'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle: Card vs Table */}
            <div className="inline-flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setGradeViewMode('card')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  gradeViewMode === 'card'
                    ? 'bg-white text-amber-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Dạng thẻ điểm trực quan, tối ưu cho màn hình điện thoại"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-amber-700" />
                <span>Dạng Thẻ (Điện thoại)</span>
              </button>

              <button
                type="button"
                onClick={() => setGradeViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  gradeViewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Dạng bảng tính đầy đủ, tối ưu cho máy tính"
              >
                <List className="w-3.5 h-3.5 text-slate-600" />
                <span>Dạng Bảng (Máy tính)</span>
              </button>
            </div>

            {/* Quick search input */}
            <div className="relative min-w-[150px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên / mã..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-6 py-1 text-xs border border-slate-300 rounded-md bg-white w-40 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RENDER GRADE VIEW: CARDS (Mobile-First) vs SPREADSHEET TABLE */}
        {gradeViewMode === 'card' ? (
          <div className="p-3 sm:p-4 space-y-3 bg-slate-50/50">
            {classStudents.filter(s => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return s.fullName.toLowerCase().includes(q) || s.holyName.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
            }).length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400">
                Không tìm thấy học sinh nào trong lớp phù hợp với từ khóa tìm kiếm.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {classStudents
                  .filter(s => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return s.fullName.toLowerCase().includes(q) || s.holyName.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
                  })
                  .map((st, idx) => {
                    const gr1 = getGradeRecord(st.id, 1);
                    const gr2 = getGradeRecord(st.id, 2);

                    const hk1Avg = calculateSemesterAcademicAverage(gr1?.midTermScore ?? null, gr1?.finalExamScore ?? null, gr1?.retestScore);
                    const hk2Avg = calculateSemesterAcademicAverage(gr2?.midTermScore ?? null, gr2?.finalExamScore ?? null, gr2?.retestScore);
                    const yearlyAcademic = calculateYearlyAcademicAverage(hk1Avg, hk2Avg);

                    const currentSemRecord = selectedSemester !== 'yearly' ? getGradeRecord(st.id, selectedSemester) : undefined;
                    const currentSemAvg = selectedSemester === 1 ? hk1Avg : hk2Avg;

                    // Conduct
                    const semViolations = conducts.filter(c => c.studentId === st.id && (selectedSemester === 'yearly' ? true : c.semester === selectedSemester));
                    const hk1Violations = conducts.filter(c => c.studentId === st.id && c.semester === 1);
                    const hk2Violations = conducts.filter(c => c.studentId === st.id && c.semester === 2);
                    const hk1Conduct = calculateSemesterConductScore(hk1Violations.map(v => v.violation));
                    const hk2Conduct = calculateSemesterConductScore(hk2Violations.map(v => v.violation));
                    const yearlyConduct = calculateYearlyAverageHalf(hk1Conduct, hk2Conduct);

                    // Attendance
                    const isSacrament = selectedClass?.isSacramentClass || false;
                    const hk1Att = attendanceRecords.filter(r => r.studentId === st.id && r.semester === 1);
                    const hk2Att = attendanceRecords.filter(r => r.studentId === st.id && r.semester === 2);
                    const { score: hk1AttScore, counts: c1 } = calculateSemesterAttendanceScore(hk1Att.map(r => r.status), isSacrament);
                    const { score: hk2AttScore, counts: c2 } = calculateSemesterAttendanceScore(hk2Att.map(r => r.status), isSacrament);
                    const currentAttScore = selectedSemester === 1 ? hk1AttScore : hk2AttScore;
                    const yearlyAttendance = calculateYearlyAverageHalf(hk1AttScore, hk2AttScore);
                    const yearlyConductAndAttendance = calculateYearlyAverageHalf(yearlyAttendance, yearlyConduct);

                    // Final evaluations
                    const totalUnexcused = c1.D + c2.D;
                    const specialPromo = specialPromotions.find(sp => sp.studentId === st.id);
                    const { academicRank, finalResult, atRiskReason } = evaluatePromotionAndRank(
                      yearlyAcademic,
                      yearlyConductAndAttendance,
                      totalUnexcused,
                      isSacrament,
                      specialPromo
                    );

                    const midVal = localScores[st.id]?.mid !== undefined 
                      ? localScores[st.id].mid 
                      : (currentSemRecord?.midTermScore !== null && currentSemRecord?.midTermScore !== undefined ? String(currentSemRecord.midTermScore) : '');
                    const finalVal = localScores[st.id]?.final !== undefined 
                      ? localScores[st.id].final 
                      : (currentSemRecord?.finalExamScore !== null && currentSemRecord?.finalExamScore !== undefined ? String(currentSemRecord.finalExamScore) : '');
                    const retestVal = localScores[st.id]?.retest !== undefined 
                      ? localScores[st.id].retest 
                      : (currentSemRecord?.retestScore !== null && currentSemRecord?.retestScore !== undefined ? String(currentSemRecord.retestScore) : '');

                    const isSavedRecently = savedToastId === st.id;

                    return (
                      <div
                        key={st.id}
                        className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs hover:border-amber-300 transition-all flex flex-col justify-between"
                      >
                        {/* Student Header */}
                        <div>
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                  <span className="text-amber-800 mr-1">{st.holyName}</span>
                                  <span>{st.fullName}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">{st.id}</div>
                              </div>
                            </div>

                            {selectedSemester !== 'yearly' ? (
                              <div className="text-right shrink-0">
                                <span className="text-[10px] text-slate-400 block">ĐTB HK{selectedSemester}:</span>
                                <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  {currentSemAvg !== null ? currentSemAvg.toFixed(2) : '--'}
                                </span>
                              </div>
                            ) : (
                              <div className="text-right shrink-0">
                                <span className="text-[10px] text-slate-400 block">ĐTB Cả Năm:</span>
                                <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-mono">
                                  {yearlyAcademic.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Inputs or Yearly Summary */}
                          {selectedSemester !== 'yearly' ? (
                            <div className="mt-3 space-y-3">
                              {/* 3 numeric score inputs (with inputMode="decimal" for smartphones) */}
                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                    KT 45P (HS 1)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    inputMode="decimal"
                                    disabled={!canEdit}
                                    placeholder="--"
                                    value={midVal}
                                    onChange={(e) => handleScoreChange(st.id, 'mid', e.target.value)}
                                    className="w-full text-center font-bold text-xs py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                                  />
                                </div>

                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                    Thi HK (HS 2)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    inputMode="decimal"
                                    disabled={!canEdit}
                                    placeholder="--"
                                    value={finalVal}
                                    onChange={(e) => handleScoreChange(st.id, 'final', e.target.value)}
                                    className="w-full text-center font-bold text-xs py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                                  />
                                </div>

                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
                                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                    Thi Lại (≤8)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="8"
                                    inputMode="decimal"
                                    disabled={!canEdit}
                                    placeholder="--"
                                    value={retestVal}
                                    onChange={(e) => handleScoreChange(st.id, 'retest', e.target.value)}
                                    className="w-full text-center font-bold text-xs py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                                  />
                                </div>
                              </div>

                              {/* Conduct & Attendance sub-bar */}
                              <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-200">
                                <div>
                                  <span className="text-slate-400">Điểm Chuyên Cần:</span>{' '}
                                  <strong className="text-emerald-700">{currentAttScore.toFixed(1)}/10</strong>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setActiveViolationModalStudent(st)}
                                  className="text-[11px] text-amber-800 hover:text-amber-900 font-semibold underline flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Hạnh Kiểm ({semViolations.length} vi phạm)</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Yearly Summary Cards */
                            <div className="mt-3 space-y-2.5">
                              <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                  <span className="text-[10px] text-slate-400 block">HK1</span>
                                  <span className="font-bold text-slate-800">{hk1Avg !== null ? hk1Avg.toFixed(1) : '--'}</span>
                                </div>
                                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                  <span className="text-[10px] text-slate-400 block">HK2</span>
                                  <span className="font-bold text-slate-800">{hk2Avg !== null ? hk2Avg.toFixed(1) : '--'}</span>
                                </div>
                                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                  <span className="text-[10px] text-slate-400 block">CC Năm</span>
                                  <span className="font-bold text-slate-800">{yearlyAttendance.toFixed(1)}</span>
                                </div>
                                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                  <span className="text-[10px] text-slate-400 block">HK Năm</span>
                                  <span className="font-bold text-slate-800">{yearlyConduct.toFixed(1)}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1">
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                  academicRank === 'GIỎI' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                  academicRank === 'KHÁ' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                                  academicRank === 'TRUNG BÌNH' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                                  'bg-red-100 text-red-900 border border-red-300'
                                }`}>
                                  Xếp Loại: {academicRank}
                                </span>

                                <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                                  finalResult === 'Được lên lớp' 
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                                    : 'bg-amber-50 text-amber-800 border border-amber-300'
                                }`}>
                                  {finalResult}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Bottom Save Button (HK1/HK2 only) */}
                        {selectedSemester !== 'yearly' && canEdit && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                            {isSavedRecently && (
                              <span className="text-emerald-700 text-xs font-bold flex items-center gap-1 animate-in fade-in">
                                <Check className="w-3.5 h-3.5" />
                                Đã lưu!
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                saveStudentScore(st.id, selectedSemester as 1 | 2);
                                setSavedToastId(st.id);
                                setTimeout(() => setSavedToastId(null), 2000);
                              }}
                              className="ml-auto py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Lưu Điểm Em Này</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-300 text-[11px]">
              <tr>
                <th className="py-2.5 px-2 border-r border-slate-200 w-10 text-center">STT</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[180px]">Tên Thánh & Họ Tên</th>

                {selectedSemester !== 'yearly' ? (
                  <>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-24">
                      KT 45P (Hệ số 1)
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-24">
                      Thi HK (Hệ số 2)
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-24">
                      Thi Lại (Tối đa 8)
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center bg-blue-50 text-blue-950 font-bold w-24">
                      ĐTB HK
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-32">
                      Hạnh Kiểm (-A,-B...)
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-24">
                      Điểm CC
                    </th>
                    <th className="py-2.5 px-3 text-center w-20">Lưu</th>
                  </>
                ) : (
                  <>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center w-20">ĐTB HK1</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center w-20">ĐTB HK2</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center bg-amber-100 font-bold text-amber-950 w-24">
                      ĐTB CẢ NĂM
                    </th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center w-20">CC Cả Năm</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center w-20">HK Cả Năm</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center bg-slate-100 font-bold w-24">
                      (CC+HK)/2
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center font-bold w-24">
                      Xếp Loại
                    </th>
                    <th className="py-2.5 px-3 text-center font-bold min-w-[130px]">
                      Xét Lên Lớp
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    Lớp chưa có học sinh.
                  </td>
                </tr>
              ) : (
                classStudents.map((st, idx) => {
                  const gr1 = getGradeRecord(st.id, 1);
                  const gr2 = getGradeRecord(st.id, 2);

                  // Scores for current selected semester
                  const currentSem = selectedSemester === 'yearly' ? 1 : selectedSemester;
                  const curGrade = getGradeRecord(st.id, currentSem);

                  const midVal = localScores[st.id]?.mid !== undefined
                    ? localScores[st.id].mid
                    : (curGrade?.midTermScore !== null && curGrade?.midTermScore !== undefined ? String(curGrade.midTermScore) : '');

                  const finalVal = localScores[st.id]?.final !== undefined
                    ? localScores[st.id].final
                    : (curGrade?.finalExamScore !== null && curGrade?.finalExamScore !== undefined ? String(curGrade.finalExamScore) : '');

                  const retestVal = localScores[st.id]?.retest !== undefined
                    ? localScores[st.id].retest
                    : (curGrade?.retestScore !== null && curGrade?.retestScore !== undefined ? String(curGrade.retestScore) : '');

                  // Calculation for Semester
                  const parsedMid = midVal !== '' ? parseFloat(midVal) : null;
                  const parsedFinal = finalVal !== '' ? parseFloat(finalVal) : null;
                  const parsedRetest = retestVal !== '' ? parseFloat(retestVal) : null;

                  const semAcademicAvg = calculateSemesterAcademicAverage(parsedMid, parsedFinal, parsedRetest);

                  // Conduct violations for current semester
                  const stViolations = conducts.filter(c => c.studentId === st.id && c.semester === currentSem);
                  const semConductScore = calculateSemesterConductScore(stViolations.map(v => v.violation));

                  // Attendance score
                  const stAtt = attendanceRecords.filter(r => r.studentId === st.id && r.semester === currentSem);
                  const { score: semAttScore, counts: semAttCounts } = calculateSemesterAttendanceScore(
                    stAtt.map(r => r.status),
                    selectedClass?.isSacramentClass || false
                  );

                  // Yearly Calculations
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
                  const { score: hk1AttScore, counts: counts1 } = calculateSemesterAttendanceScore(hk1Att.map(r => r.status), selectedClass?.isSacramentClass || false);
                  const { score: hk2AttScore, counts: counts2 } = calculateSemesterAttendanceScore(hk2Att.map(r => r.status), selectedClass?.isSacramentClass || false);
                  const yearlyAttendance = calculateYearlyAverageHalf(hk1AttScore, hk2AttScore);

                  const yearlyConductAndAttendance = calculateYearlyAverageHalf(yearlyAttendance, yearlyConduct);
                  const totalD = counts1.D + counts2.D;

                  const { academicRank, finalResult, atRiskReason } = evaluatePromotionAndRank(
                    yearlyAcademic,
                    yearlyConductAndAttendance,
                    totalD,
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

                      {selectedSemester !== 'yearly' ? (
                        <>
                          {/* 45p mid term input */}
                          <td className="py-1 px-2 border-r border-slate-200 text-center">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              disabled={!canEdit}
                              value={midVal}
                              onChange={(e) => handleScoreChange(st.id, 'mid', e.target.value)}
                              placeholder="-"
                              className="w-16 py-1 px-1.5 text-center font-mono font-bold border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                            />
                          </td>

                          {/* Final exam input */}
                          <td className="py-1 px-2 border-r border-slate-200 text-center">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              disabled={!canEdit}
                              value={finalVal}
                              onChange={(e) => handleScoreChange(st.id, 'final', e.target.value)}
                              placeholder="-"
                              className="w-16 py-1 px-1.5 text-center font-mono font-bold border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                            />
                          </td>

                          {/* Retest score input */}
                          <td className="py-1 px-2 border-r border-slate-200 text-center">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="8"
                              disabled={!canEdit}
                              value={retestVal}
                              onChange={(e) => handleScoreChange(st.id, 'retest', e.target.value)}
                              placeholder="-"
                              title="Tối đa 8 điểm theo quy chế Don Bosco"
                              className="w-16 py-1 px-1.5 text-center font-mono border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 bg-slate-50 text-slate-600"
                            />
                          </td>

                          {/* Calculated Semester Academic Average */}
                          <td className="py-2 px-2 border-r border-slate-200 text-center bg-blue-50/50 font-mono font-bold text-sm text-blue-900">
                            {semAcademicAvg > 0 ? semAcademicAvg.toFixed(2) : '-'}
                          </td>

                          {/* Conduct */}
                          <td className="py-1 px-2 border-r border-slate-200 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900">
                                {semConductScore.toFixed(1)}
                              </span>
                              {stViolations.length > 0 && (
                                <span className="text-[10px] text-red-600 font-semibold">
                                  (-{stViolations.map(v => v.violation).join(',')})
                                </span>
                              )}
                              {canEdit && (
                                <button
                                  onClick={() => setActiveViolationModalStudent(st)}
                                  className="text-[10px] px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded"
                                  title="Ghi nhận vi phạm (-A, -B, -C, -D, -E)"
                                >
                                  + Lỗi
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Attendance Score */}
                          <td className="py-2 px-2 border-r border-slate-200 text-center font-mono font-bold text-slate-700">
                            {semAttScore.toFixed(1)}
                          </td>

                          {/* Save button */}
                          <td className="py-1 px-2 text-center">
                            {canEdit && (
                              <button
                                onClick={() => saveStudentScore(st.id, currentSem)}
                                className="p-1 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded"
                                title="Lưu điểm học sinh này"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-2 border-r border-slate-200 text-center font-mono">
                            {hk1Academic.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-center font-mono">
                            {hk2Academic.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-center bg-amber-50 font-mono font-bold text-sm text-amber-950">
                            {yearlyAcademic.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-center font-mono">
                            {yearlyAttendance.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-center font-mono">
                            {yearlyConduct.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-center bg-slate-50 font-mono font-bold">
                            {yearlyConductAndAttendance.toFixed(2)}
                          </td>

                          {/* Rank Badge */}
                          <td className="py-2 px-2 border-r border-slate-200 text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              academicRank === 'GIỎI' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                              academicRank === 'KHÁ' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                              academicRank === 'TRUNG BÌNH' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                              academicRank === 'YẾU' ? 'bg-orange-100 text-orange-900 border border-orange-300' :
                              'bg-red-100 text-red-900 border border-red-300'
                            }`}>
                              {academicRank}
                            </span>
                          </td>

                          {/* Promotion Result */}
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              finalResult === 'Được lên lớp' 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                                : finalResult === 'Được lên lớp sau thi lại/rèn hạnh kiểm'
                                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                : 'bg-red-50 text-red-800 border border-red-300 font-bold'
                            }`}>
                              {finalResult}
                            </span>
                            {atRiskReason && (
                              <div className="text-[10px] text-red-600 mt-0.5 max-w-xs truncate mx-auto" title={atRiskReason}>
                                {atRiskReason}
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* Conduct Violation Modal */}
      {activeViolationModalStudent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 border border-slate-200 text-xs">
            <h3 className="font-bold text-slate-800 text-sm mb-1">
              Ghi Nhận Vi Phạm Hạnh Kiểm — {activeViolationModalStudent.holyName} {activeViolationModalStudent.fullName}
            </h3>
            <p className="text-slate-500 mb-3 text-[11px]">
              Mỗi vi phạm trừ 0.1 điểm từ thang 10. Chọn tiêu chí vi phạm:
            </p>

            <div className="space-y-1.5 mb-4">
              {[
                { code: 'A', label: 'Không mặc đồng phục đầy đủ (-A)' },
                { code: 'B', label: 'Không mang sách vở, đồ dùng học tập (-B)' },
                { code: 'C', label: 'Chưa học bài hoặc chưa làm bài đầy đủ (-C)' },
                { code: 'D', label: 'Chưa ngoan, thiếu lễ phép, mất trật tự (-D)' },
                { code: 'E', label: 'Chưa tích cực tham gia hoạt động, vệ sinh (-E)' },
              ].map((item) => (
                <button
                  key={item.code}
                  onClick={() => {
                    onAddConductViolation(
                      activeViolationModalStudent.id, 
                      item.code as ConductViolation, 
                      selectedSemester === 'yearly' ? 1 : selectedSemester,
                      item.label
                    );
                    setActiveViolationModalStudent(null);
                  }}
                  className="w-full text-left p-2 rounded-lg border border-slate-200 hover:bg-amber-50 hover:border-amber-300 transition-colors flex items-center justify-between"
                >
                  <span className="font-medium text-slate-800">{item.label}</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-mono font-bold text-[10px]">
                    -0.1 đ
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveViolationModalStudent(null)}
                className="px-3.5 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Export Modal */}
      {isExcelExportOpen && (
        <ExcelExportModal
          isOpen={isExcelExportOpen}
          onClose={() => setIsExcelExportOpen(false)}
          students={students}
          filteredStudents={classStudents}
          classes={classes}
          grades={grades}
          conducts={conducts}
          attendanceRecords={attendanceRecords}
          specialPromotions={specialPromotions}
          defaultType="grades"
          currentClassId={selectedClassId}
        />
      )}
    </div>
  );
};
