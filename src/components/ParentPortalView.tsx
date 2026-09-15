import React, { useState } from 'react';
import { 
  Search, 
  User, 
  Award, 
  Calendar, 
  CreditCard, 
  BookOpen, 
  Church, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { Student, ClassRoom, GradeRecord, AttendanceRecord, ConductRecord, TuitionItem } from '../types';
import { 
  calculateSemesterAcademicAverage, 
  calculateYearlyAcademicAverage,
  calculateSemesterAttendanceScore,
  calculateSemesterConductScore,
  calculateYearlyAverageHalf,
  evaluatePromotionAndRank,
  formatVNCurrency
} from '../utils/calculations';

interface ParentPortalViewProps {
  students: Student[];
  classes: ClassRoom[];
  grades: GradeRecord[];
  conducts: ConductRecord[];
  attendanceRecords: AttendanceRecord[];
  tuitionList: TuitionItem[];
  onOpenReportBook: (student: Student) => void;
}

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({
  students,
  classes,
  grades,
  conducts,
  attendanceRecords,
  tuitionList,
  onOpenReportBook,
}) => {
  const [query, setQuery] = useState<string>('DBS-KT-001');
  const [searchedStudent, setSearchedStudent] = useState<Student | null>(() => students[0] || null);
  const [hasSearched, setHasSearched] = useState(true);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQ = query.trim().toLowerCase();
    if (!cleanQ) return;

    const found = students.find(
      s => s.id.toLowerCase() === cleanQ ||
           s.parentPhone.includes(cleanQ) ||
           s.fullName.toLowerCase().includes(cleanQ)
    );

    setSearchedStudent(found || null);
    setHasSearched(true);
  };

  const currentClass = classes.find(c => c.id === searchedStudent?.classId);
  const isSacrament = currentClass?.isSacramentClass || false;

  // Compute records for searched student
  const stGrades1 = grades.find(g => g.studentId === searchedStudent?.id && g.semester === 1);
  const stGrades2 = grades.find(g => g.studentId === searchedStudent?.id && g.semester === 2);

  const hk1Academic = calculateSemesterAcademicAverage(stGrades1?.midTermScore ?? null, stGrades1?.finalExamScore ?? null, stGrades1?.retestScore);
  const hk2Academic = calculateSemesterAcademicAverage(stGrades2?.midTermScore ?? null, stGrades2?.finalExamScore ?? null, stGrades2?.retestScore);
  const yearlyAcademic = calculateYearlyAcademicAverage(hk1Academic, hk2Academic);

  const stViolations1 = conducts.filter(c => c.studentId === searchedStudent?.id && c.semester === 1);
  const stViolations2 = conducts.filter(c => c.studentId === searchedStudent?.id && c.semester === 2);
  const hk1Conduct = calculateSemesterConductScore(stViolations1.map(v => v.violation));
  const hk2Conduct = calculateSemesterConductScore(stViolations2.map(v => v.violation));
  const yearlyConduct = calculateYearlyAverageHalf(hk1Conduct, hk2Conduct);

  const stAtt1 = attendanceRecords.filter(r => r.studentId === searchedStudent?.id && r.semester === 1);
  const stAtt2 = attendanceRecords.filter(r => r.studentId === searchedStudent?.id && r.semester === 2);
  const { score: att1, counts: c1 } = calculateSemesterAttendanceScore(stAtt1.map(r => r.status), isSacrament);
  const { score: att2, counts: c2 } = calculateSemesterAttendanceScore(stAtt2.map(r => r.status), isSacrament);
  const yearlyAttendance = calculateYearlyAverageHalf(att1, att2);

  const totalD = c1.D + c2.D;
  const yearlyAvg = calculateYearlyAverageHalf(yearlyAttendance, yearlyConduct);
  const { academicRank, finalResult } = evaluatePromotionAndRank(yearlyAcademic, yearlyAvg, totalD, isSacrament);

  const studentTuition = tuitionList.filter(t => t.studentId === searchedStudent?.id);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="text-center space-y-1 mb-4">
          <div className="inline-flex p-2 rounded-full bg-blue-100 text-blue-900 mb-1">
            <Church className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            Tra Cứu Hồ Sơ & Kết Quả Học Tập Dành Cho Phụ Huynh
          </h1>
          <p className="text-xs text-slate-500">
            Giáo Sở Don Bosco Đà Lạt • Nhập Mã học sinh (vd: DBS-KT-001) hoặc Số điện thoại phụ huynh để tra cứu
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="Nhập mã học sinh (DBS-KT-001) hoặc SĐT (0912345678)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Tra Cứu</span>
          </button>
        </form>

        {/* Quick Sample pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-[11px] text-slate-500">
          <span>Gợi ý thử nhanh:</span>
          {students.slice(0, 4).map(st => (
            <button
              key={st.id}
              onClick={() => {
                setQuery(st.id);
                setSearchedStudent(st);
                setHasSearched(true);
              }}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono"
            >
              {st.id} ({st.holyName} {st.fullName})
            </button>
          ))}
        </div>
      </div>

      {/* Result Display */}
      {searchedStudent ? (
        <div className="space-y-4 text-xs">
          {/* Main Info Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-base border border-amber-300">
                  {searchedStudent.gender === 'Nam' ? '👦' : '👧'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    <span className="text-amber-800 mr-1.5">{searchedStudent.holyName}</span>
                    <span>{searchedStudent.fullName}</span>
                  </h2>
                  <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-3 mt-0.5">
                    <span>Mã HS: <strong className="font-mono text-slate-800">{searchedStudent.id}</strong></span>
                    <span>Lớp: <strong className="text-blue-900">{currentClass?.name}</strong></span>
                    <span>Giáo họ: <strong>{searchedStudent.subParish}</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onOpenReportBook(searchedStudent)}
                className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Xem Sổ Liên Lạc Bản In</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                <span className="text-amber-800 block text-[11px]">ĐTB Học Lực Cả Năm:</span>
                <span className="text-lg font-bold text-amber-950 font-mono">
                  {yearlyAcademic > 0 ? yearlyAcademic.toFixed(2) : 'Đang cập nhật'}
                </span>
                <span className="block text-[10px] text-amber-700 mt-0.5">Xếp loại: {academicRank}</span>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                <span className="text-emerald-800 block text-[11px]">Điểm Chuyên Cần:</span>
                <span className="text-lg font-bold text-emerald-950 font-mono">{yearlyAttendance.toFixed(2)}</span>
                <span className="block text-[10px] text-emerald-700 mt-0.5">Nghỉ CP: {c1.C + c2.C} • KP: {totalD}</span>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                <span className="text-blue-800 block text-[11px]">Điểm Hạnh Kiểm:</span>
                <span className="text-lg font-bold text-blue-950 font-mono">{yearlyConduct.toFixed(2)}</span>
                <span className="block text-[10px] text-blue-700 mt-0.5">Thang điểm 10</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-600 block text-[11px]">Xét Lên Lớp:</span>
                <span className={`text-xs font-bold inline-block mt-1 px-2 py-0.5 rounded ${
                  finalResult === 'Được lên lớp' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {finalResult}
                </span>
              </div>
            </div>

            {/* Sacramental History */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Church className="w-4 h-4 text-amber-700" />
                <span>Hồ Sơ Các Bí Tích Đã Lãnh Nhận:</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 bg-white rounded border border-slate-200">
                  <div className="font-bold text-slate-900">Bí Tích Rửa Tội (Thanh Tẩy):</div>
                  <div className="text-slate-600 mt-0.5">
                    Ngày: {searchedStudent.sacraments.baptism?.date || 'Chưa ghi'}<br />
                    Tại: {searchedStudent.sacraments.baptism?.place || 'Don Bosco Đà Lạt'}<br />
                    Linh mục: {searchedStudent.sacraments.baptism?.minister || 'Lm. Quản sở'}<br />
                    Người đỡ đầu: {searchedStudent.sacraments.baptism?.godparent || 'Chưa ghi'}
                  </div>
                </div>

                <div className="p-2 bg-white rounded border border-slate-200">
                  <div className="font-bold text-slate-900">Bí Tích Giao Hòa & Thánh Thể:</div>
                  <div className="text-slate-600 mt-0.5">
                    {searchedStudent.sacraments.firstCommunion ? (
                      <>
                        Ngày: {searchedStudent.sacraments.firstCommunion.date}<br />
                        Tại: {searchedStudent.sacraments.firstCommunion.place}<br />
                        Linh mục: {searchedStudent.sacraments.firstCommunion.minister}
                      </>
                    ) : (
                      <span className="text-slate-400 italic">Đang chuẩn bị học</span>
                    )}
                  </div>
                </div>

                <div className="p-2 bg-white rounded border border-slate-200">
                  <div className="font-bold text-slate-900">Bí Tích Thêm Sức:</div>
                  <div className="text-slate-600 mt-0.5">
                    {searchedStudent.sacraments.confirmation ? (
                      <>
                        Ngày: {searchedStudent.sacraments.confirmation.date}<br />
                        Tại: {searchedStudent.sacraments.confirmation.place}<br />
                        Đức Giám mục: {searchedStudent.sacraments.confirmation.minister}
                      </>
                    ) : (
                      <span className="text-slate-400 italic">Chưa lãnh nhận</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tuition Status */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <span>Tình Hình Quỹ Giáo Lý & Học Phí:</span>
              </span>
              {studentTuition.length === 0 ? (
                <div className="text-slate-400 text-[11px]">Chưa có khoản thu nào được tạo.</div>
              ) : (
                <div className="space-y-1.5">
                  {studentTuition.map(t => (
                    <div key={t.id} className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-medium text-slate-900">{t.feeName}</span>
                        <span className="text-slate-400 ml-2 font-mono">{formatVNCurrency(t.amount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          t.status === 'Đã đóng' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {t.status}
                        </span>
                        {t.receiptNumber && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Số BL: {t.receiptNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : hasSearched ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
          Không tìm thấy học sinh nào với từ khóa "{query}". Quý phụ huynh vui lòng kiểm tra lại Mã học sinh hoặc Số điện thoại.
        </div>
      ) : null}
    </div>
  );
};
