import React, { useState, useMemo } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  Users, 
  User, 
  CheckCircle2, 
  History, 
  AlertCircle,
  RotateCcw,
  CheckSquare,
  Square,
  Search,
  Filter
} from 'lucide-react';
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
  onTransferBatch: (fromClassId: string, toClassId: string, onlyQualified: boolean, reason: string, targetStudentIds?: string[]) => void;
  onRevertTransfer?: (studentId: string, historyIndex: number) => void;
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
  onRevertTransfer,
}) => {
  const [activeMode, setActiveMode] = useState<'individual' | 'batch' | 'history'>(
    initialStudent ? 'individual' : 'batch'
  );

  // Individual Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudent?.id || students[0]?.id || '');
  const [individualTargetClassId, setIndividualTargetClassId] = useState<string>(() => {
    const st = initialStudent || students[0];
    const otherClass = classes.find(c => c.id !== st?.classId);
    return otherClass?.id || classes[0]?.id || '';
  });
  const [individualReason, setIndividualReason] = useState<string>('Chuyển giờ sinh hoạt / Nguyện vọng gia đình');

  // Batch Form State
  const [batchSourceClassId, setBatchSourceClassId] = useState<string>(classes[0]?.id || '');
  const [batchTargetClassId, setBatchTargetClassId] = useState<string>(() => {
    return classes[1]?.id || classes[0]?.id || '';
  });
  const [onlyQualified, setOnlyQualified] = useState<boolean>(true);
  const [batchReason, setBatchReason] = useState<string>('Lên lớp niên khóa mới 2027 – 2028');
  const [batchSearchTerm, setBatchSearchTerm] = useState<string>('');
  
  // Custom manual student selection for batch transfer
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({});

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const currentStudentClass = classes.find(c => c.id === selectedStudent?.classId);

  const getClassName = (cid?: string) => {
    return classes.find(c => c.id === cid)?.name || cid || 'Chưa phân lớp';
  };

  // Handle source class change in batch
  const handleSourceClassChange = (newSourceId: string) => {
    setBatchSourceClassId(newSourceId);
    // Find next class in order or any different class
    const sourceIndex = classes.findIndex(c => c.id === newSourceId);
    if (sourceIndex >= 0 && sourceIndex < classes.length - 1) {
      setBatchTargetClassId(classes[sourceIndex + 1].id);
    } else {
      const otherClass = classes.find(c => c.id !== newSourceId);
      if (otherClass) setBatchTargetClassId(otherClass.id);
    }
    // Reset selection map
    setSelectedStudentIds({});
  };

  // Batch evaluation list
  const sourceClassStudents = useMemo(() => {
    return students.filter(s => s.classId === batchSourceClassId);
  }, [students, batchSourceClassId]);

  const sourceClass = classes.find(c => c.id === batchSourceClassId);

  // Evaluate each student in source class
  const evaluatedStudents = useMemo(() => {
    return sourceClassStudents.map(st => {
      const gr1 = grades.find(g => g.studentId === st.id && g.semester === 1);
      const gr2 = grades.find(g => g.studentId === st.id && g.semester === 2);
      
      const hasGrades = Boolean(gr1 || gr2);
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
      const { finalResult, academicRank } = evaluatePromotionAndRank(yearlyAcademic, yearlyAvg, totalD, sourceClass?.isSacramentClass || false);

      const isQualified = finalResult === 'Được lên lớp' || (!hasGrades && !onlyQualified);

      return {
        student: st,
        hasGrades,
        yearlyAcademic,
        academicRank,
        finalResult,
        isQualified,
      };
    });
  }, [sourceClassStudents, grades, conducts, attendanceRecords, sourceClass, onlyQualified]);

  // Determine final list of students to transfer based on onlyQualified & manual selection overrides
  const effectiveStudentsToTransfer = useMemo(() => {
    return evaluatedStudents.filter(item => {
      // If user manually set a boolean, respect it
      if (selectedStudentIds[item.student.id] !== undefined) {
        return selectedStudentIds[item.student.id];
      }
      // Otherwise default to qualified
      if (onlyQualified) {
        return item.isQualified;
      }
      return true;
    });
  }, [evaluatedStudents, selectedStudentIds, onlyQualified]);

  // Filtered by search term for UI preview
  const displayEvaluatedStudents = useMemo(() => {
    if (!batchSearchTerm.trim()) return evaluatedStudents;
    const term = batchSearchTerm.toLowerCase();
    return evaluatedStudents.filter(item => 
      item.student.fullName.toLowerCase().includes(term) ||
      item.student.holyName.toLowerCase().includes(term) ||
      item.student.id.toLowerCase().includes(term)
    );
  }, [evaluatedStudents, batchSearchTerm]);

  const handleToggleSelectAll = (selectAll: boolean) => {
    const newMap: Record<string, boolean> = {};
    evaluatedStudents.forEach(item => {
      newMap[item.student.id] = selectAll;
    });
    setSelectedStudentIds(newMap);
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const current = prev[studentId] !== undefined ? prev[studentId] : (onlyQualified ? evaluatedStudents.find(e => e.student.id === studentId)?.isQualified ?? true : true);
      return {
        ...prev,
        [studentId]: !current
      };
    });
  };

  const handleIndividualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !individualTargetClassId) return;
    if (selectedStudent?.classId === individualTargetClassId) {
      alert('Học sinh hiện tại đã ở lớp này rồi! Vui lòng chọn lớp khác.');
      return;
    }
    onTransferIndividual(selectedStudentId, individualTargetClassId, individualReason);
    alert(`Đã chuyển học sinh ${selectedStudent?.holyName} ${selectedStudent?.fullName} sang lớp ${getClassName(individualTargetClassId)} thành công!`);
    onClose();
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (batchSourceClassId === batchTargetClassId) {
      alert('Lớp nguồn và lớp đích không được trùng nhau! Vui lòng chọn lớp đích khác.');
      return;
    }
    const countToTransfer = effectiveStudentsToTransfer.length;
    if (countToTransfer === 0) {
      alert('Không có học sinh nào được chọn để chuyển!');
      return;
    }

    const targetStudentIds = effectiveStudentsToTransfer.map(item => item.student.id);

    if (confirm(`Bạn có chắc chắn muốn chuyển ${countToTransfer} học sinh từ "${getClassName(batchSourceClassId)}" sang "${getClassName(batchTargetClassId)}"?`)) {
      onTransferBatch(batchSourceClassId, batchTargetClassId, onlyQualified, batchReason, targetStudentIds);
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
    historyIndex: number;
  }[] = [];

  students.forEach(s => {
    if (s.transferHistory) {
      s.transferHistory.forEach((h, hIdx) => {
        allTransferHistories.push({
          student: s,
          historyIndex: hIdx,
          ...h,
        });
      });
    }
  });

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-auto border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Quản Lý Chuyển Lớp Giáo Lý
              </h2>
              <p className="text-xs text-slate-300">
                Chuyển lớp riêng từng em hoặc chuyển hàng loạt cả lớp lên niên khóa mới
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 gap-2 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveMode('individual')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeMode === 'individual'
                ? 'border-amber-600 text-amber-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5 text-amber-600" />
            <span>Chuyển Riêng Từng Học Sinh</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('batch')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeMode === 'batch'
                ? 'border-amber-600 text-amber-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Chuyển Cả Lớp Lên Niên Khóa Mới</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('history')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeMode === 'history'
                ? 'border-amber-600 text-amber-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nhật Ký Chuyển Lớp ({allTransferHistories.length})</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-xs sm:text-sm">
          {activeMode === 'individual' && (
            <form onSubmit={handleIndividualSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Chọn Học Sinh Cần Chuyển:</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedStudentId(newId);
                    const st = students.find(s => s.id === newId);
                    if (st && st.classId === individualTargetClassId) {
                      const other = classes.find(c => c.id !== st.classId);
                      if (other) setIndividualTargetClassId(other.id);
                    }
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.holyName} {s.fullName} ({s.id}) — Lớp: {getClassName(s.classId)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStudent && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">Lớp hiện tại: </span>
                    <strong className="text-slate-900 font-bold">{currentStudentClass?.name || 'Chưa phân lớp'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Khối: </span>
                    <span className="font-semibold text-slate-700">{currentStudentClass?.level}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Lớp Đích (Chuyển đến):</label>
                <select
                  value={individualTargetClassId}
                  onChange={(e) => setIndividualTargetClassId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-semibold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id} disabled={c.id === selectedStudent?.classId}>
                      {c.name} {c.id === selectedStudent?.classId ? '(Đang học)' : ''}
                    </option>
                  ))}
                </select>
                {selectedStudent?.classId === individualTargetClassId && (
                  <p className="text-rose-600 text-[11px] mt-1">Lớp chuyển đến không được trùng với lớp hiện tại.</p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Lý Do Chuyển Lớp:</label>
                <input
                  type="text"
                  required
                  value={individualReason}
                  onChange={(e) => setIndividualReason(e.target.value)}
                  placeholder="vd: Trùng giờ học văn hóa, chuyển giáo họ, nguyện vọng phụ huynh..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={selectedStudent?.classId === individualTargetClassId}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Xác Nhận Chuyển Học Sinh</span>
                </button>
              </div>
            </form>
          )}

          {activeMode === 'batch' && (
            <form onSubmit={handleBatchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Lớp Nguồn (Hiện tại):</label>
                  <select
                    value={batchSourceClassId}
                    onChange={(e) => handleSourceClassChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Lớp Đích (Lên cấp tiếp theo):</label>
                  <select
                    value={batchTargetClassId}
                    onChange={(e) => setBatchTargetClassId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id} disabled={c.id === batchSourceClassId}>
                        {c.name} {c.id === batchSourceClassId ? '(Trùng lớp nguồn)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-qualified"
                    checked={onlyQualified}
                    onChange={(e) => {
                      setOnlyQualified(e.target.checked);
                      setSelectedStudentIds({});
                    }}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="chk-qualified" className="font-bold text-amber-950 cursor-pointer text-xs sm:text-sm">
                    Tự động lọc các em ĐỦ ĐIỀU KIỆN LÊN LỚP
                  </label>
                </div>
                <p className="text-[11px] text-amber-900/80 pl-6">
                  {onlyQualified 
                    ? 'Chỉ chọn các em có kết quả "Được lên lớp". Những em ở lại lớp hoặc cần thi lại sẽ được giữ lại lớp nguồn để theo dõi và bồi dưỡng hè.'
                    : 'Đang tắt bộ lọc: Tất cả học sinh trong lớp sẽ được chọn theo mặc định (bạn vẫn có thể tích chọn từng em bên dưới).'}
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Lý Do / Ghi Chú Đợt Chuyển:</label>
                <input
                  type="text"
                  required
                  value={batchReason}
                  onChange={(e) => setBatchReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Preview & Selection Box */}
              <div className="border border-slate-200 rounded-xl p-3 sm:p-4 bg-slate-50 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-700" />
                    <span>Danh Sách Học Sinh Lớp Nguồn ({sourceClassStudents.length} em)</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                      Đã chọn: {effectiveStudentsToTransfer.length} em
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll(true)}
                      className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                    >
                      Chọn hết
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll(false)}
                      className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                    >
                      Bỏ chọn hết
                    </button>
                  </div>
                </div>

                {/* Search Bar inside batch */}
                {sourceClassStudents.length > 5 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={batchSearchTerm}
                      onChange={(e) => setBatchSearchTerm(e.target.value)}
                      placeholder="Lọc nhanh theo tên học sinh hoặc mã..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                )}

                {/* Students list */}
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 bg-white rounded-lg border border-slate-200 text-xs">
                  {displayEvaluatedStudents.length === 0 ? (
                    <div className="text-slate-400 py-4 text-center">Không tìm thấy học sinh nào trong lớp nguồn.</div>
                  ) : (
                    displayEvaluatedStudents.map(item => {
                      const isSelected = selectedStudentIds[item.student.id] !== undefined
                        ? selectedStudentIds[item.student.id]
                        : (onlyQualified ? item.isQualified : true);

                      return (
                        <div 
                          key={item.student.id} 
                          onClick={() => handleToggleStudent(item.student.id)}
                          className={`p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/50' : 'opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer shrink-0"
                            />
                            <div className="truncate">
                              <span className="font-bold text-slate-900">{item.student.holyName} {item.student.fullName}</span>
                              <span className="text-slate-400 text-[11px] ml-1">({item.student.id})</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.hasGrades ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.finalResult === 'Được lên lớp'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.finalResult.includes('sau thi lại')
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {item.finalResult}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
                                Chưa nhập điểm cả năm
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={effectiveStudentsToTransfer.length === 0 || batchSourceClassId === batchTargetClassId}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Tiến Hành Chuyển {effectiveStudentsToTransfer.length} Học Sinh</span>
                </button>
              </div>
            </form>
          )}

          {activeMode === 'history' && (
            <div className="space-y-3">
              {allTransferHistories.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Chưa có lịch sử chuyển lớp nào trong niên khóa này.
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {allTransferHistories.map((h, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3 text-xs hover:border-slate-300 transition-colors">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 text-sm">
                          {h.student.holyName} {h.student.fullName} <span className="font-mono text-xs text-slate-400">({h.student.id})</span>
                        </div>
                        <div className="text-slate-600 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 line-through text-[11px]">
                            {getClassName(h.fromClass)}
                          </span>
                          <span>→</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold text-[11px]">
                            {getClassName(h.toClass)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 italic">
                          Lý do: {h.reason}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[11px] text-slate-400 font-mono">{h.date}</span>
                        {onRevertTransfer && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Bạn có muốn hoàn tác chuyển lớp cho ${h.student.holyName} ${h.student.fullName}, đưa học sinh trở lại lớp ${getClassName(h.fromClass)}?`)) {
                                onRevertTransfer(h.student.id, h.historyIndex);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Hoàn tác chuyển lớp, đưa học sinh trở lại lớp cũ"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Hoàn tác</span>
                          </button>
                        )}
                      </div>
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
