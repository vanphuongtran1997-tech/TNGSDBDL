import React from 'react';
import { X, Printer, BookOpen, CheckSquare, Square, Award, Crown } from 'lucide-react';
import { Student, ClassRoom, GradeRecord, ConductRecord, AttendanceRecord, SpecialPromotion } from '../types';
import { 
  calculateSemesterAcademicAverage, 
  calculateYearlyAcademicAverage,
  calculateSemesterAttendanceScore,
  calculateSemesterConductScore,
  calculateYearlyAverageHalf,
  evaluatePromotionAndRank
} from '../utils/calculations';

interface ReportBookModalProps {
  student: Student;
  classes: ClassRoom[];
  grades: GradeRecord[];
  conducts: ConductRecord[];
  attendanceRecords: AttendanceRecord[];
  specialPromotions?: SpecialPromotion[];
  onClose: () => void;
}

export const ReportBookModal: React.FC<ReportBookModalProps> = ({
  student,
  classes,
  grades,
  conducts,
  attendanceRecords,
  specialPromotions = [],
  onClose,
}) => {
  const currentClass = classes.find(c => c.id === student.classId);
  const isSacrament = currentClass?.isSacramentClass || false;

  const gr1 = grades.find(g => g.studentId === student.id && g.semester === 1);
  const gr2 = grades.find(g => g.studentId === student.id && g.semester === 2);

  // Học lực
  const hk1Academic = calculateSemesterAcademicAverage(gr1?.midTermScore ?? null, gr1?.finalExamScore ?? null, gr1?.retestScore);
  const hk2Academic = calculateSemesterAcademicAverage(gr2?.midTermScore ?? null, gr2?.finalExamScore ?? null, gr2?.retestScore);
  const yearlyAcademic = calculateYearlyAcademicAverage(hk1Academic, hk2Academic);

  // Hạnh kiểm
  const hk1Violations = conducts.filter(c => c.studentId === student.id && c.semester === 1);
  const hk2Violations = conducts.filter(c => c.studentId === student.id && c.semester === 2);
  const hk1Conduct = calculateSemesterConductScore(hk1Violations.map(v => v.violation));
  const hk2Conduct = calculateSemesterConductScore(hk2Violations.map(v => v.violation));
  const yearlyConduct = calculateYearlyAverageHalf(hk1Conduct, hk2Conduct);

  // Chuyên cần
  const hk1Att = attendanceRecords.filter(r => r.studentId === student.id && r.semester === 1);
  const hk2Att = attendanceRecords.filter(r => r.studentId === student.id && r.semester === 2);
  const { score: hk1AttScore, counts: c1 } = calculateSemesterAttendanceScore(hk1Att.map(r => r.status), isSacrament);
  const { score: hk2AttScore, counts: c2 } = calculateSemesterAttendanceScore(hk2Att.map(r => r.status), isSacrament);
  const yearlyAttendance = calculateYearlyAverageHalf(hk1AttScore, hk2AttScore);

  const totalExcused = c1.C + c2.C;
  const totalUnexcused = c1.D + c2.D;
  const totalLate = c1.B + c2.B;

  const yearlyConductAndAttendance = calculateYearlyAverageHalf(yearlyAttendance, yearlyConduct);
  const specialPromo = specialPromotions.find(sp => sp.studentId === student.id);
  const { academicRank, finalResult, isSpecialPromotion } = evaluatePromotionAndRank(
    yearlyAcademic,
    yearlyConductAndAttendance,
    totalUnexcused,
    isSacrament,
    specialPromo
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-auto border border-slate-200 print:border-none print:shadow-none print:w-full">
        {/* Modal Controls (screen only) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white rounded-t-xl print:hidden">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm uppercase">Sổ Liên Lạc Điện Tử Thiếu Nhi Don Bosco</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Sổ Liên Lạc (Bản Chính)</span>
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Book Body — EXACT Layout from PDF Page 3 */}
        <div className="p-8 text-slate-900 font-serif space-y-6 print:p-0 print:text-black">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="text-xs tracking-wider uppercase font-sans font-bold text-slate-700">
              GIÁO PHẬN ĐÀ LẠT • GIÁO SỞ DON BOSCO
            </div>
            <h1 className="text-xl font-bold uppercase tracking-widest text-blue-950 font-serif">
              SỔ LIÊN LẠC GIÁO LÝ
            </h1>
            <p className="text-[11px] italic text-slate-500 font-sans">
              (Học tập • Chuyên cần • Rèn luyện nhân đức Kitô giáo)
            </p>
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-300 pb-3 font-sans">
            <div>
              <span className="text-slate-500">Tên Thánh, Họ và Tên:</span>{' '}
              <strong className="text-blue-950 text-sm font-serif">{student.holyName} {student.fullName}</strong>
            </div>
            <div>
              <span className="text-slate-500">Mã Học Sinh:</span>{' '}
              <span className="font-mono font-bold text-slate-800">{student.id}</span>
            </div>
            <div>
              <span className="text-slate-500">Lớp:</span>{' '}
              <strong className="text-slate-800">{currentClass?.name}</strong>
            </div>
            <div>
              <span className="text-slate-500">Niên Khoá:</span>{' '}
              <strong className="text-slate-800">2026 – 2027</strong>
            </div>
            <div>
              <span className="text-slate-500">Phụ Huynh:</span>{' '}
              <span>{student.parentName} ({student.parentPhone})</span>
            </div>
            <div>
              <span className="text-slate-500">Giáo Họ:</span>{' '}
              <span>{student.subParish}</span>
            </div>
          </div>

          {/* Academic Table matching PDF page 3 */}
          <div>
            <div className="text-center font-bold text-xs uppercase tracking-wider mb-2 font-sans">
              KẾT QUẢ HỌC TẬP
            </div>
            <table className="w-full text-xs border-collapse border border-slate-700 font-sans">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-600 py-2 px-3 text-left w-1/3">NỘI DUNG</th>
                  <th className="border border-slate-600 py-2 px-3 text-center w-1/5">HỌC KỲ I</th>
                  <th className="border border-slate-600 py-2 px-3 text-center w-1/5">HỌC KỲ II</th>
                  <th className="border border-slate-600 py-2 px-3 text-center w-1/5 bg-slate-200/50 font-bold">CẢ NĂM</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-600 py-2 px-3 font-semibold">
                    HỌC LỰC
                  </td>
                  <td className="border border-slate-600 py-2 px-3 text-center">
                    <div>45P: <strong className="text-blue-900">{gr1?.midTermScore ?? '-'}</strong></div>
                    <div>THI: <strong className="text-blue-900">{gr1?.finalExamScore ?? '-'}</strong></div>
                  </td>
                  <td className="border border-slate-600 py-2 px-3 text-center">
                    <div>45P: <strong className="text-blue-900">{gr2?.midTermScore ?? '-'}</strong></div>
                    <div>THI: <strong className="text-blue-900">{gr2?.finalExamScore ?? '-'}</strong></div>
                  </td>
                  <td className="border border-slate-600 py-2 px-3 text-center bg-slate-50 font-mono font-bold text-sm">
                    {yearlyAcademic.toFixed(2)}
                  </td>
                </tr>

                <tr>
                  <td className="border border-slate-600 py-2 px-3 font-semibold">
                    HẠNH KIỂM
                  </td>
                  <td className="border border-slate-600 py-2 px-3 text-center font-mono font-bold text-blue-900">
                    {hk1Conduct.toFixed(1)}
                  </td>
                  <td className="border border-slate-600 py-2 px-3 text-center font-mono font-bold text-blue-900">
                    {hk2Conduct.toFixed(1)}
                  </td>
                  <td className="border border-slate-600 py-2 px-3 text-center font-mono font-bold text-blue-900 bg-slate-50">
                    {yearlyConduct.toFixed(2)}
                  </td>
                </tr>

                <tr>
                  <td className="border border-slate-600 py-2 px-3 font-semibold">
                    CHUYÊN CẦN
                  </td>
                  <td className="border border-slate-600 py-2 px-3 text-center font-mono font-bold text-blue-900">
                    {hk1AttScore.toFixed(1)}
                  </td>
                  <td className="border border-slate-600 py-2 px-3 text-center font-mono font-bold text-blue-900">
                    {hk2AttScore.toFixed(1)}
                  </td>
                  <td className="border border-slate-600 py-2 px-3 text-center font-mono font-bold text-blue-900 bg-slate-50">
                    {yearlyAttendance.toFixed(2)}
                  </td>
                </tr>

                <tr>
                  <td className="border border-slate-600 py-1.5 px-3 text-slate-600">
                    SỐ NGÀY NGHỈ CÓ PHÉP
                  </td>
                  <td className="border border-slate-600 py-1.5 px-3 text-center font-mono">{c1.C}</td>
                  <td className="border border-slate-600 py-1.5 px-3 text-center font-mono">{c2.C}</td>
                  <td className="border border-slate-600 py-1.5 px-3 text-center font-mono bg-slate-50 font-bold">{totalExcused}</td>
                </tr>

                <tr>
                  <td className="border border-slate-600 py-1.5 px-3 text-slate-600">
                    SỐ NGÀY NGHỈ KHÔNG PHÉP
                  </td>
                  <td className="border border-slate-600 py-1.5 px-3 text-center font-mono text-red-600 font-bold">{c1.D}</td>
                  <td className="border border-slate-600 py-1.5 px-3 text-center font-mono text-red-600 font-bold">{c2.D}</td>
                  <td className="border border-slate-600 py-1.5 px-3 text-center font-mono bg-slate-50 text-red-600 font-bold">{totalUnexcused}</td>
                </tr>

                <tr>
                  <td className="border border-slate-600 py-1.5 px-3 text-slate-600">
                    ĐI TRỄ (Số lần)
                  </td>
                  <td className="border border-slate-600 py-1.5 px-3 text-center font-mono">{c1.B}</td>
                  <td className="border border-slate-600 py-1.5 px-3 text-center font-mono">{c2.B}</td>
                  <td className="border border-slate-600 py-1.5 px-3 text-center font-mono bg-slate-50">{totalLate}</td>
                </tr>

                <tr className="bg-amber-50/70 font-bold">
                  <td className="border border-slate-600 py-2 px-3 text-amber-950 uppercase">
                    TỔNG KẾT ĐIỂM HỌC KỲ
                  </td>
                  <td className="border border-slate-600 py-2 px-3 text-center font-mono text-sm text-blue-950">
                    {hk1Academic.toFixed(2)}
                  </td>
                  <td className="border border-slate-600 py-2 px-3 text-center font-mono text-sm text-blue-950">
                    {hk2Academic.toFixed(2)}
                  </td>
                  <td className="border border-slate-600 py-2 px-3 text-center font-mono text-sm text-amber-900 bg-amber-100">
                    {yearlyAcademic.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Promotion & Year-end Status */}
          <div className="space-y-3 font-sans text-xs border border-slate-600 p-4 rounded-md">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <strong>TỔNG KẾT CUỐI NĂM:</strong> ĐTB Học lực cả năm:{' '}
                <strong className="text-amber-900 font-mono text-sm">{yearlyAcademic.toFixed(2)}</strong>
                {' '}(Xếp loại: <strong className="text-blue-900 uppercase">{academicRank}</strong>)
              </div>
              <div>
                <strong>XẾP LOẠI HẠNH KIỂM & CC:</strong>{' '}
                <span className="font-mono font-bold text-slate-800">{yearlyConductAndAttendance.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {isSpecialPromotion && (
                <div className="flex items-start gap-2 bg-purple-50 p-2 rounded border border-purple-200">
                  <CheckSquare className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-purple-950 block">
                      Được đặc cách lên lớp thẳng (Quyết định của Quý Cha & Ban Quản Trị)
                    </span>
                    <span className="text-[11px] text-purple-800 italic">
                      Lý do xét duyệt: {specialPromo?.reason} ({specialPromo?.approvedBy} phê chuẩn ngày {specialPromo?.decisionDate})
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                {finalResult === 'Được lên lớp' ? (
                  <CheckSquare className="w-4 h-4 text-emerald-700" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span className={finalResult === 'Được lên lớp' ? 'font-bold text-emerald-950' : 'text-slate-600'}>
                  Được lên lớp
                </span>
              </div>

              <div className="flex items-center gap-2">
                {finalResult === 'Được lên lớp sau thi lại/rèn hạnh kiểm' ? (
                  <CheckSquare className="w-4 h-4 text-amber-700" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span className={finalResult === 'Được lên lớp sau thi lại/rèn hạnh kiểm' ? 'font-bold text-amber-900' : 'text-slate-600'}>
                  Được lên lớp sau khi thi lại hoặc rèn thêm về hạnh kiểm
                </span>
              </div>

              <div className="flex items-center gap-2">
                {finalResult === 'Ở lại lớp' ? (
                  <CheckSquare className="w-4 h-4 text-red-700" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span className={finalResult === 'Ở lại lớp' ? 'font-bold text-red-950' : 'text-slate-600'}>
                  Ở lại lớp
                </span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-6 pt-4 font-sans text-xs">
            <div className="text-center space-y-12">
              <div>
                <p className="font-semibold text-slate-700">GIÁO LÝ VIÊN CHỦ NHIỆM</p>
                <p className="text-[10px] text-slate-400">(Ký và ghi rõ họ tên)</p>
              </div>
              <div className="font-serif italic font-medium text-slate-800">
                {currentClass?.headTeacherId ? 'Đã ký sổ điện tử' : ''}
              </div>
            </div>

            <div className="text-center space-y-12">
              <div>
                <p className="font-semibold text-slate-700">NHẬN XÉT VÀ KÝ TÊN CỦA CHA QUẢN SỞ</p>
                <p className="text-[10px] text-slate-400">(Đã phê chuẩn niên khóa)</p>
              </div>
              <div className="font-serif font-bold text-blue-950">
                Lm. Giuse Nguyễn Văn Hoàng, SDB
              </div>
            </div>
          </div>

          {/* Footnotes verbatim from PDF page 3 */}
          <div className="border-t border-slate-300 pt-3 text-[10px] text-slate-500 font-sans space-y-0.5 print:text-[9px]">
            <p className="font-bold text-slate-700">Ghi chú theo quy định Ban Giáo Lý Don Bosco Đà Lạt:</p>
            <p>• Ghi điểm trong sổ liên lạc vẫn ghi 2 chữ số thập phân.</p>
            <p>• Điểm trung bình cả năm phần Hạnh Kiểm và Chuyên Cần vẫn ghi cụ thể từng cái.</p>
            <p>• Phần "TỔNG KẾT ĐIỂM HỌC KỲ": phần điểm trung bình học lực từng học kỳ, cả năm.</p>
            <p>• Phần "TỔNG KẾT CUỐI NĂM": điểm trung bình học lực cả năm & xếp loại học lực.</p>
            <p>• Phần "XẾP LOẠI" dành cho kết quả hạnh kiểm, chuyên cần của cả năm học.</p>
          </div>
        </div>

        {/* Footer (screen only) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end text-xs rounded-b-xl print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-md"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
