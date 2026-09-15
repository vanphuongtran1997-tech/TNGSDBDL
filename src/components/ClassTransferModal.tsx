import React, { useState } from 'react';
import { X, ArrowRightLeft, Users, User, CheckCircle2, History, AlertCircle } from 'lucide-react';
import { Student, ClassRoom, GradeRecord, AttendanceRecord, ConductRecord } from '../types';
import { 
  calculateSemesterAcademicAverage, 
  calculateYearlyAcademicAverage,
  calculateSemesterAttendanceScore,
  calculateSemesterConductScore,
  calculateYearlyAverageHalf,
  evaluatePromotionAndRank
} from '../utils/calculations';

interface ClassTransferModalProps {
  students: Student[];
  classes: ClassRoom[];
  grades: GradeRecord[];
  conducts: ConductRecord[];
  attendanceRecords: AttendanceRecord[];
  initialStudent?: Student;
  onClose: () => void;
  onTransferIndividual: (studentId: string, toClassId: string, reason: string) => void;
  onTransferBatch: (fromClassId: string, toClassId: string, onlyQualified: boolean, reason: string) => void;
}

export const ClassTransferModal: React.FC<ClassTransferModalProps> = ({
  students,
  classes,
  grades,
  conducts,
  attendanceRecords,
  initialStudent,
  onClose,
  onTransferIndividual,
  onTransferBatch,
}) => {
  const [activeMode, setActiveMode] = useState<'individual' | 'batch' | 'history'>(
    initialStudent ? 'individual' : 'batch'
  );

  // Individual Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudent?.id || students[0]?.id || '');
  const [individualTargetClassId, setIndividualTargetClassId] = useState<string>(classes[1]?.id || classes[0]?.id || '');
  const [individualReason, setIndividualReason] = useState<string>('Chuyển giờ sinh hoạt / Nguyện vọng gia đình');

  // Batch Form State
  const [batchSourceClassId, setBatchSourceClassId] = useState<string>(classes[0]?.id || '');
  const [batchTargetClassId, setBatchTargetClassId] = useState<string>(classes[1]?.id || '');
  const [onlyQualified, setOnlyQualified] = useState<boolean>(true);
  const [batchReason, setBatchReason] = useState<string>('Lên lớp niên khóa mới 2027 - 2028');

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const currentStudentClass = classes.find(c => c.id === selectedStudent?.classId);

  const getClassName = (cid?: string) => {
    return classes.find(c => c.id === cid)?.name || cid || 'Chưa phân lớp';
  };

  // Batch preview calculation
  const sourceClassStudents = students.filter(s => s.classId === batchSourceClassId);
  const sourceClass = classes.find(c => c.id === batchSourceClassId);

  const qualifiedStudents = sourceClassStudents.filter(st => {
    if (!onlyQualified) return true;
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
    const { score: s1, counts: c1 } = calculateSemesterAttendanceScore(hk1Att.map(r => r.status), sourceClass?.isSacramentClass || false);
    const { score: s2, counts: c2 } = calculateSemesterAttendanceScore(hk2Att.map(r => r.status), sourceClass?.isSacramentClass || false);
    const yearlyAttendance = calculateYearlyAverageHalf(s1, s2);

    const totalD = c1.D + c2.D;
    const yearlyAvg = calculateYearlyAverageHalf(yearlyAttendance, yearlyConduct);
    const { finalResult } = evaluatePromotionAndRank(yearlyAcademic, yearlyAvg, totalD, sourceClass?.isSacramentClass || false);

    return finalResult === 'Được lên lớp';
  });

  const handleIndividualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !individualTargetClassId) return;
    if (selectedStudent?.classId === individualTargetClassId) {
      alert('Học sinh hiện tại đã ở lớp này rồi!');
      return;
    }
    onTransferIndividual(selectedStudentId, individualTargetClassId, individualReason);
    alert(`Đã chuyển học sinh ${selectedStudent?.holyName} ${selectedStudent?.fullName} sang lớp ${getClassName(individualTargetClassId)} thành công!`);
    onClose();
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (batchSourceClassId === batchTargetClassId) {
      alert('Lớp nguồn và lớp đích không được trùng nhau!');
      return;
    }
    const countToTransfer = qualifiedStudents.length;
    if (countToTransfer === 0) {
      alert('Không có học sinh nào đủ điều kiện để chuyển!');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn chuyển ${countToTransfer} học sinh từ ${getClassName(batchSourceClassId)} sang ${getClassName(batchTargetClassId)}?`)) {
      onTransferBatch(batchSourceClassId, batchTargetClassId, onlyQualified, batchReason);
      alert(`Đã hoàn tất chuyển lớp cho ${countToTransfer} học sinh!`);
      onClose();
    }
  };

  // Collect all transfer histories
  const allTransferHistories: {
    student: Student;
    fromClass: string;
    toClass: string;
    date: string;
    reason: string;
  }[] = [];

  students.forEach(s => {
    if (s.transferHistory) {
      s.transferHistory.forEach(h => {
        allTransferHistories.push({
          student: s,
          ...h,
        });
      });
    }
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-auto border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Quản Lý Chuyển Lớp Giáo Lý
              </h2>
              <p className="text-xs text-slate-300">
                Chuyển lớp riêng cho từng học sinh hoặc chuyển hàng loạt cả lớp lên cấp mới
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveMode('individual')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeMode === 'individual'
                ? 'border-amber-600 text-amber-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Chuyển Riêng Từng Học Sinh</span>
          </button>

          <button
            onClick={() => setActiveMode('batch')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeMode === 'batch'
                ? 'border-amber-600 text-amber-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Chuyển Cả Lớp Lên Niên Khóa Mới</span>
          </button>

          <button
            onClick={() => setActiveMode('history')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeMode === 'history'
                ? 'border-amber-600 text-amber-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Nhật Ký Chuyển Lớp ({allTransferHistories.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 text-xs text-slate-700">
          {activeMode === 'individual' && (
            <form onSubmit={handleIndividualSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Chọn Học Sinh:</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.holyName} {s.fullName} ({s.id}) — Hiện ở {getClassName(s.classId)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px]">Lớp Hiện Tại:</span>
                  <span className="font-bold text-slate-900 text-sm">{currentStudentClass?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Chuyển Đến Lớp Mới (*):</span>
                  <select
                    value={individualTargetClassId}
                    onChange={(e) => setIndividualTargetClassId(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1 bg-white font-semibold text-blue-900"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Lý Do Chuyển Lớp:</label>
                <input
                  type="text"
                  required
                  value={individualReason}
                  onChange={(e) => setIndividualReason(e.target.value)}
                  placeholder="vd: Trùng giờ học văn hóa, chuyển giáo họ, học sinh học lực vượt trội..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Xác Nhận Chuyển Học Sinh</span>
                </button>
              </div>
            </form>
          )}

          {activeMode === 'batch' && (
            <form onSubmit={handleBatchSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Lớp Nguồn (Hiện tại):</label>
                  <select
                    value={batchSourceClassId}
                    onChange={(e) => setBatchSourceClassId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Lớp Đích (Lên cấp tiếp theo):</label>
                  <select
                    value={batchTargetClassId}
                    onChange={(e) => setBatchTargetClassId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-blue-900"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-qualified"
                    checked={onlyQualified}
                    onChange={(e) => setOnlyQualified(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <label htmlFor="chk-qualified" className="font-bold text-amber-950 cursor-pointer text-xs">
                    Chỉ chuyển các em ĐỦ ĐIỀU KIỆN LÊN LỚP (Theo ĐTB Học lực, CC và HK)
                  </label>
                </div>
                <p className="text-[11px] text-amber-900/80 pl-6">
                  Những em ở lại lớp hoặc cần thi lại sẽ được giữ lại lớp nguồn để theo dõi và bồi dưỡng hè.
                </p>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Lý Do / Niên Khóa:</label>
                <input
                  type="text"
                  value={batchReason}
                  onChange={(e) => setBatchReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5"
                />
              </div>

              {/* Preview Box */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="flex justify-between items-center mb-1 font-semibold text-slate-800">
                  <span>Xem Trước Danh Sách Chuyển ({qualifiedStudents.length} / {sourceClassStudents.length} em)</span>
                </div>
                <div className="max-h-28 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                  {qualifiedStudents.length === 0 ? (
                    <div className="text-slate-400 py-2 text-center">Chưa có học sinh phù hợp.</div>
                  ) : (
                    qualifiedStudents.map(s => (
                      <div key={s.id} className="py-1 flex justify-between">
                        <span>{s.holyName} {s.fullName} ({s.id})</span>
                        <span className="text-emerald-700 font-semibold">Được lên lớp</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={qualifiedStudents.length === 0}
                  className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Tiến Hành Chuyển {qualifiedStudents.length} Em</span>
                </button>
              </div>
            </form>
          )}

          {activeMode === 'history' && (
            <div className="space-y-3">
              {allTransferHistories.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Chưa có lịch sử chuyển lớp nào trong niên khóa này.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {allTransferHistories.map((h, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-900">
                          {h.student.holyName} {h.student.fullName} ({h.student.id})
                        </div>
                        <div className="text-slate-600 mt-0.5 flex items-center gap-1.5">
                          <span className="line-through text-slate-400">{getClassName(h.fromClass)}</span>
                          <span>→</span>
                          <span className="font-bold text-blue-900">{getClassName(h.toClass)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 italic mt-0.5">Lý do: {h.reason}</div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{h.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
