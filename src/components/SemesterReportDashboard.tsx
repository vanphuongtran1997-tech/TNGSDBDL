import React, { useState } from 'react';
import { 
  BarChart3, 
  Award, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Printer, 
  Download, 
  TrendingUp,
  FileSpreadsheet,
  BookOpen
} from 'lucide-react';
import { Student, ClassRoom, GradeRecord, AttendanceRecord, ConductRecord, TuitionItem, SpecialPromotion, Role } from '../types';
import { 
  calculateSemesterAcademicAverage, 
  calculateYearlyAcademicAverage,
  calculateSemesterAttendanceScore,
  calculateSemesterConductScore,
  calculateYearlyAverageHalf,
  evaluatePromotionAndRank
} from '../utils/calculations';
import { exportGradesToExcel } from '../utils/excelExport';
import { Crown, Sparkles } from 'lucide-react';

interface SemesterReportDashboardProps {
  students: Student[];
  classes: ClassRoom[];
  grades: GradeRecord[];
  conducts: ConductRecord[];
  attendanceRecords: AttendanceRecord[];
  tuitionList: TuitionItem[];
  specialPromotions?: SpecialPromotion[];
  currentUserRole?: Role;
  onOpenReportBook: (student: Student) => void;
  onOpenSpecialPromotion?: (student?: Student) => void;
}

export const SemesterReportDashboard: React.FC<SemesterReportDashboardProps> = ({
  students,
  classes,
  grades,
  conducts,
  attendanceRecords,
  tuitionList,
  specialPromotions = [],
  currentUserRole,
  onOpenReportBook,
  onOpenSpecialPromotion,
}) => {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<1 | 2 | 'yearly'>('yearly');

  // Compute evaluation stats for all students
  const studentEvaluations = students.map(st => {
    const studentClass = classes.find(c => c.id === st.classId);
    const isSacrament = studentClass?.isSacramentClass || false;

    const gr1 = grades.find(g => g.studentId === st.id && g.semester === 1);
    const gr2 = grades.find(g => g.studentId === st.id && g.semester === 2);

    const hk1Academic = calculateSemesterAcademicAverage(gr1?.midTermScore ?? null, gr1?.finalExamScore ?? null, gr1?.retestScore);
    const hk2Academic = calculateSemesterAcademicAverage(gr2?.midTermScore ?? null, gr2?.finalExamScore ?? null, gr2?.retestScore);
    const yearlyAcademic = calculateYearlyAcademicAverage(hk1Academic, hk2Academic);

    const hk1Violations = conducts.filter(c => c.studentId === st.id && c.semester === 1);
    const hk2Violations = conducts.filter(c => c.studentId === st.id && c.semester === 2);
    const yearlyConduct = calculateYearlyAverageHalf(
      calculateSemesterConductScore(hk1Violations.map(v => v.violation)),
      calculateSemesterConductScore(hk2Violations.map(v => v.violation))
    );

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
      student: st,
      studentClass,
      yearlyAcademic,
      yearlyAttendance,
      yearlyConduct,
      yearlyAvg,
      totalD,
      academicRank,
      finalResult,
      atRiskReason,
      isSacrament,
      specialPromo,
      isSpecialPromotion,
    };
  });

  const filteredEvals = studentEvaluations.filter(e => 
    selectedClassFilter === 'all' || e.student.classId === selectedClassFilter
  );

  // Aggregates
  const totalCount = filteredEvals.length;
  const countGioi = filteredEvals.filter(e => e.academicRank === 'GIỎI').length;
  const countKha = filteredEvals.filter(e => e.academicRank === 'KHÁ').length;
  const countTB = filteredEvals.filter(e => e.academicRank === 'TRUNG BÌNH').length;
  const countYeu = filteredEvals.filter(e => e.academicRank === 'YẾU').length;
  const countKem = filteredEvals.filter(e => e.academicRank === 'KÉM').length;

  const countPromoted = filteredEvals.filter(e => e.finalResult === 'Được lên lớp').length;
  const countRetest = filteredEvals.filter(e => e.finalResult === 'Được lên lớp sau thi lại/rèn hạnh kiểm').length;
  const countHeldBack = filteredEvals.filter(e => e.finalResult === 'Ở lại lớp').length;

  const topStudents = [...filteredEvals]
    .sort((a, b) => b.yearlyAcademic - a.yearlyAcademic)
    .filter(e => e.yearlyAcademic >= 8.0 && e.finalResult === 'Được lên lớp')
    .slice(0, 10);

  const atRiskStudents = filteredEvals.filter(e => e.finalResult !== 'Được lên lớp');

  const exportExcelXLSX = () => {
    const targetStudents = filteredEvals.map(e => e.student);
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const classLabel = selectedClassFilter === 'all' ? 'ToanTruong' : `Lop_${selectedClassFilter}`;
    
    exportGradesToExcel(
      targetStudents,
      classes,
      grades,
      conducts,
      attendanceRecords,
      specialPromotions,
      {
        classId: selectedClassFilter,
        semester: 'yearly',
        filename: `BaoCao_TongKet_${classLabel}_DonBosco_${dateStr}.xlsx`,
      }
    );
  };

  const exportCSV = () => {
    const headers = ['Mã HS', 'Tên Thánh', 'Họ và Tên', 'Lớp', 'ĐTB Cả Năm', 'CC Cả Năm', 'HK Cả Năm', 'Xếp Loại', 'Kết Quả Lên Lớp', 'Ghi Chú'];
    const rows = filteredEvals.map(e => [
      e.student.id,
      e.student.holyName,
      `"${e.student.fullName}"`,
      `"${e.studentClass?.name || ''}"`,
      e.yearlyAcademic.toFixed(2),
      e.yearlyAttendance.toFixed(2),
      e.yearlyConduct.toFixed(2),
      e.academicRank,
      `"${e.finalResult}"`,
      `"${e.atRiskReason || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bao_Cao_Tong_Ket_Don_Bosco_2026_2027.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-600" />
              <span>Báo Cáo Tổng Kết Kỳ Học & Niên Khóa 2026 – 2027</span>
            </h1>
            <p className="text-xs text-slate-500">
              Giáo Sở Don Bosco Đà Lạt • Báo cáo học lực, chuyên cần, xét lên lớp và danh sách tuyên dương
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSpecialPromotion && (currentUserRole === 'admin' || currentUserRole === 'pastor') && (
              <button
                type="button"
                id="special-promotion-header-btn"
                onClick={() => onOpenSpecialPromotion()}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
                title="Xét đặc cách lên thẳng lớp trên cho các trường hợp đặc biệt (Quyền Cha Quản Sở & Admin)"
              >
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>Xét Đặc Cách Lên Lớp</span>
              </button>
            )}

            <button
              id="export-report-xlsx-btn"
              onClick={exportExcelXLSX}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Xuất bảng báo cáo tổng kết và phân tích số liệu sang tệp Excel đa sheet (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Báo Cáo Excel (.xlsx)</span>
            </button>

            <button
              onClick={exportCSV}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Xuất dữ liệu thô dạng bảng CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors print:hidden"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Báo Cáo</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Lọc theo Lớp:</span>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 bg-white font-medium"
            >
              <option value="all">Toàn bộ Giáo sở ({students.length} em)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block text-[11px]">Tổng Sĩ Số Đang Xét:</span>
          <span className="text-xl font-bold text-slate-900">{totalCount} em</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">8 khối lớp giáo lý</span>
        </div>

        <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-emerald-800 block text-[11px]">Đủ Điều Kiện Lên Lớp:</span>
          <span className="text-xl font-bold text-emerald-900">
            {countPromoted} em ({totalCount > 0 ? Math.round((countPromoted / totalCount) * 100) : 0}%)
          </span>
          <span className="text-[10px] text-emerald-700 block mt-0.5">Đạt chuẩn học lực & chuyên cần</span>
        </div>

        <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-amber-800 block text-[11px]">Cần Thi Lại / Rèn HK:</span>
          <span className="text-xl font-bold text-amber-900">
            {countRetest} em ({totalCount > 0 ? Math.round((countRetest / totalCount) * 100) : 0}%)
          </span>
          <span className="text-[10px] text-amber-700 block mt-0.5">Thi lại tối đa 8.0 điểm</span>
        </div>

        <div className="p-3.5 bg-red-50/80 rounded-xl border border-red-200 shadow-2xs">
          <span className="text-red-800 block text-[11px]">Nguy Cơ Ở Lại Lớp:</span>
          <span className="text-xl font-bold text-red-900">
            {countHeldBack} em ({totalCount > 0 ? Math.round((countHeldBack / totalCount) * 100) : 0}%)
          </span>
          <span className="text-[10px] text-red-700 block mt-0.5">Bỏ lễ (D ≥ 7 hoặc 15) hoặc kém</span>
        </div>
      </div>

      {/* Rank Breakdown Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs space-y-3">
        <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between">
          <span>Phân Bố Xếp Loại Học Lực Cả Năm</span>
          <span className="text-xs text-slate-500 font-normal">
            Quy chế: Giỏi ≥8.0 • Khá ≥6.5 • TB ≥5.0 • Yếu ≥3.5 • Kém &lt;3.5
          </span>
        </h3>

        {/* Visual Progress Bar */}
        <div className="w-full h-6 rounded-lg overflow-hidden flex font-bold text-[10px] text-white">
          {countGioi > 0 && (
            <div 
              style={{ width: `${(countGioi / totalCount) * 100}%` }}
              className="bg-amber-600 flex items-center justify-center"
              title={`Giỏi: ${countGioi} em`}
            >
              Giỏi ({countGioi})
            </div>
          )}
          {countKha > 0 && (
            <div 
              style={{ width: `${(countKha / totalCount) * 100}%` }}
              className="bg-blue-600 flex items-center justify-center"
              title={`Khá: ${countKha} em`}
            >
              Khá ({countKha})
            </div>
          )}
          {countTB > 0 && (
            <div 
              style={{ width: `${(countTB / totalCount) * 100}%` }}
              className="bg-emerald-600 flex items-center justify-center"
              title={`Trung Bình: ${countTB} em`}
            >
              TB ({countTB})
            </div>
          )}
          {countYeu > 0 && (
            <div 
              style={{ width: `${(countYeu / totalCount) * 100}%` }}
              className="bg-orange-600 flex items-center justify-center"
              title={`Yếu: ${countYeu} em`}
            >
              Yếu ({countYeu})
            </div>
          )}
          {countKem > 0 && (
            <div 
              style={{ width: `${(countKem / totalCount) * 100}%` }}
              className="bg-red-600 flex items-center justify-center"
              title={`Kém: ${countKem} em`}
            >
              Kém ({countKem})
            </div>
          )}
        </div>

        {/* Badges Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] pt-1">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded bg-amber-600"></span>
            <span>Giỏi: <strong>{countGioi}</strong> em ({totalCount > 0 ? Math.round((countGioi / totalCount) * 100) : 0}%)</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded bg-blue-600"></span>
            <span>Khá: <strong>{countKha}</strong> em ({totalCount > 0 ? Math.round((countKha / totalCount) * 100) : 0}%)</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded bg-emerald-600"></span>
            <span>Trung Bình: <strong>{countTB}</strong> em ({totalCount > 0 ? Math.round((countTB / totalCount) * 100) : 0}%)</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded bg-orange-600"></span>
            <span>Yếu: <strong>{countYeu}</strong> em ({totalCount > 0 ? Math.round((countYeu / totalCount) * 100) : 0}%)</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded bg-red-600"></span>
            <span>Kém: <strong>{countKem}</strong> em ({totalCount > 0 ? Math.round((countKem / totalCount) * 100) : 0}%)</span>
          </span>
        </div>
      </div>

      {/* Two columns: Honor Roll & Students Needing Summer Remedial */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Honor Roll */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs space-y-3">
          <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            <span>Bảng Vàng Tuyên Dương Thiếu Nhi Xuất Sắc</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            Học lực Giỏi (ĐTB ≥ 8.0), chuyên cần và hạnh kiểm tốt, tích cực sinh hoạt Don Bosco
          </p>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {topStudents.length === 0 ? (
              <div className="text-center py-6 text-slate-400">Chưa có học sinh đạt điều kiện.</div>
            ) : (
              topStudents.map((item, idx) => (
                <div key={item.student.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">
                        <span className="text-amber-800 mr-1">{item.student.holyName}</span>
                        <span>{item.student.fullName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{item.studentClass?.name}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-amber-700 text-sm">
                      {item.yearlyAcademic.toFixed(2)} đ
                    </div>
                    <button
                      onClick={() => onOpenReportBook(item.student)}
                      className="text-[10px] text-blue-700 hover:underline flex items-center gap-0.5 justify-end"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Xem sổ liên lạc</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* At-risk / Remedial list */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs space-y-3">
          <h3 className="font-bold text-red-900 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Danh Sách Cần Bồi Dưỡng Hè & Thi Lại</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            Các em cần thi lại học kỳ, bồi dưỡng hạnh kiểm hoặc có nguy cơ ở lại lớp theo quy chế
          </p>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {atRiskStudents.length === 0 ? (
              <div className="text-center py-6 text-emerald-600 font-medium">
                Tuyệt vời! Toàn bộ học sinh trong danh sách đều đạt chuẩn lên lớp.
              </div>
            ) : (
              atRiskStudents.map((item) => (
                <div key={item.student.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900">
                      <span className="text-amber-800 mr-1">{item.student.holyName}</span>
                      <span>{item.student.fullName}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {item.studentClass?.name} • ĐTB: {item.yearlyAcademic.toFixed(2)} • {item.totalD} lần D
                    </div>
                    {item.atRiskReason && (
                      <div className="text-[10px] text-red-600 font-medium mt-0.5">
                        {item.atRiskReason}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {item.isSpecialPromotion ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1">
                        <Crown className="w-3 h-3 text-purple-600" />
                        Đặc cách lên lớp
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.finalResult === 'Ở lại lớp' ? 'bg-red-100 text-red-900 border border-red-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {item.finalResult}
                      </span>
                    )}

                    <div className="flex items-center gap-2 justify-end mt-1">
                      <button
                        onClick={() => onOpenReportBook(item.student)}
                        className="text-[10px] text-blue-700 hover:underline flex items-center gap-0.5"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Xem sổ liên lạc</span>
                      </button>

                      {!item.isSpecialPromotion && onOpenSpecialPromotion && (currentUserRole === 'admin' || currentUserRole === 'pastor') && (
                        <button
                          onClick={() => onOpenSpecialPromotion(item.student)}
                          className="text-[10px] text-purple-700 hover:text-purple-900 font-bold hover:underline flex items-center gap-0.5"
                          title="Xét duyệt đặc cách lên thẳng lớp trên"
                        >
                          <Crown className="w-3 h-3 text-amber-500" />
                          <span>Xét đặc cách</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Class by Class Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden text-xs">
        <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-800">
          Tổng Hợp Tình Hình Theo Từng Khối Lớp Giáo Lý Niên Khóa 2026 – 2027
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Tên Lớp</th>
                <th className="py-2.5 px-3">Phân Khối</th>
                <th className="py-2.5 px-3 text-center">Sĩ Số</th>
                <th className="py-2.5 px-3 text-center">ĐTB Lớp</th>
                <th className="py-2.5 px-3 text-center">Tỷ Lệ Giỏi/Khá</th>
                <th className="py-2.5 px-3 text-center">Được Lên Lớp</th>
                <th className="py-2.5 px-3 text-center">Cần Bồi Dưỡng Hè</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {classes.map((cls) => {
                const clsEvals = studentEvaluations.filter(e => e.student.classId === cls.id);
                const clsTotal = clsEvals.length;
                const clsAvg = clsTotal > 0 ? (clsEvals.reduce((a, b) => a + b.yearlyAcademic, 0) / clsTotal) : 0;
                const clsGoodCount = clsEvals.filter(e => e.academicRank === 'GIỎI' || e.academicRank === 'KHÁ').length;
                const clsPromoted = clsEvals.filter(e => e.finalResult === 'Được lên lớp').length;
                const clsRemedial = clsTotal - clsPromoted;

                return (
                  <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {cls.name} {cls.isSacramentClass ? '★' : ''}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{cls.gradeLevel}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">{clsTotal}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-900">
                      {clsAvg.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {clsTotal > 0 ? Math.round((clsGoodCount / clsTotal) * 100) : 0}%
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-emerald-800 font-bold">
                      {clsPromoted} ({clsTotal > 0 ? Math.round((clsPromoted / clsTotal) * 100) : 0}%)
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-amber-800">
                      {clsRemedial} em
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
