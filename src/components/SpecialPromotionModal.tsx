import React, { useState } from 'react';
import { 
  Award, 
  Crown, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  FileText, 
  Sparkles, 
  ArrowRight, 
  UserCheck, 
  Clock, 
  Calendar,
  Building
} from 'lucide-react';
import { Student, ClassRoom, SpecialPromotion, UserAccount, Role } from '../types';

interface SpecialPromotionModalProps {
  currentUser: UserAccount;
  students: Student[];
  classes: ClassRoom[];
  specialPromotions: SpecialPromotion[];
  initialStudent?: Student;
  onClose: () => void;
  onGrantSpecialPromotion: (promotion: Omit<SpecialPromotion, 'id'>) => void;
  onRevokeSpecialPromotion: (promotionId: string) => void;
}

export function SpecialPromotionModal({
  currentUser,
  students,
  classes,
  specialPromotions,
  initialStudent,
  onClose,
  onGrantSpecialPromotion,
  onRevokeSpecialPromotion,
}: SpecialPromotionModalProps) {
  const isAuthorized = currentUser.role === 'admin' || currentUser.role === 'pastor';

  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudent?.id || students[0]?.id || '');
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [approvedBy, setApprovedBy] = useState<string>(currentUser.name);
  const [decisionDate, setDecisionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeStudent = students.find(s => s.id === selectedStudentId);
  const currentClass = classes.find(c => c.id === activeStudent?.classId);

  // Check if student already has a special promotion
  const existingPromotion = specialPromotions.find(sp => sp.studentId === selectedStudentId);

  // Set default target class to next class if available
  React.useEffect(() => {
    if (activeStudent && classes.length > 0) {
      const currentIdx = classes.findIndex(c => c.id === activeStudent.classId);
      if (currentIdx !== -1 && currentIdx < classes.length - 1) {
        setTargetClassId(classes[currentIdx + 1].id);
      } else if (classes.length > 0) {
        setTargetClassId(classes[0].id);
      }
    }
  }, [selectedStudentId, activeStudent, classes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      alert('Chỉ Quản trị viên và Quý Cha mới có thẩm quyền ký quyết định xét đặc cách lên thẳng lớp trên.');
      return;
    }

    if (!selectedStudentId || !targetClassId) {
      alert('Vui lòng chọn học sinh và lớp tiếp nhận.');
      return;
    }

    if (!reason.trim()) {
      alert('Vui lòng ghi rõ lý do xét đặc cách theo quy định của Ban Giáo Lý.');
      return;
    }

    onGrantSpecialPromotion({
      studentId: selectedStudentId,
      promotedToClassId: targetClassId,
      approvedBy,
      approvalRole: currentUser.role === 'pastor' ? 'pastor' : 'admin',
      reason: reason.trim(),
      decisionDate,
      academicYear: '2026 - 2027',
      notes: notes.trim() || undefined,
    });

    setSuccessMsg(`Đã cấp quyết định xét đặc cách lên thẳng lớp cho em ${activeStudent?.fullName}!`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center border border-amber-300/30 text-amber-300">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Xét Đặc Cách Lên Thẳng Lớp Trên</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-300/30">
                  Thẩm Quyền Quý Cha & Admin
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                Quyết định mục vụ đặc biệt dành cho các trường hợp thiếu nhi có hoàn cảnh riêng biệt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Permission Notice */}
          {!isAuthorized ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Quy Chế Phân Quyền Mục Vụ:</strong>
                Chỉ <strong>Quý Cha Quản Sở</strong> và <strong>Ban Quản Trị Hệ Thống</strong> mới có quyền phê duyệt quyết định đặc cách lên lớp. Tài khoản hiện tại của bạn ({currentUser.name} - {currentUser.role}) chỉ có thể xem danh sách đã được cấp quyền.
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                Theo quy chế Giáo sở Don Bosco Đà Lạt, quyết định đặc cách lên thẳng lớp trên được áp dụng khi thiếu nhi có hoàn cảnh khó khăn đột xuất, biến cố sức khỏe hoặc chuyển xứ, sau khi đã hoàn thành bồi dưỡng giáo lý trong kỳ hè và được Cha Quản sở hoặc Quản trị viên chấp thuận.
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form: Grant Special Promotion */}
          {isAuthorized && (
            <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-700" />
                <span>Cấp Quyết Định Đặc Cách Mới</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Select Student */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Chọn Thiếu Nhi Được Xét Đặc Cách:
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-600 font-medium"
                  >
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.id} — {st.holyName} {st.fullName} ({classes.find(c => c.id === st.classId)?.name || 'Chưa xếp lớp'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Class */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Lớp Tiếp Nhận (Lên Thẳng Lớp):
                  </label>
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-600 font-medium"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.level})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Signatory / Approver */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Người Ký Phê Duyệt:
                  </label>
                  <input
                    type="text"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    placeholder="vd: Lm. Giuse Nguyễn Văn Hoàng, SDB"
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                    required
                  />
                </div>

                {/* Decision Date */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Ngày Ra Quyết Định:
                  </label>
                  <input
                    type="date"
                    value={decisionDate}
                    onChange={(e) => setDecisionDate(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                    required
                  />
                </div>
              </div>

              {/* Justification / Reason */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Lý Do Xét Đặc Cách (Bắt buộc ghi rõ biên bản mục vụ):
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Em gặp biến cố tai nạn gia đình phải nằm viện điều trị dài ngày, đã nộp đơn xin phép và hoàn thành bài kiểm tra bổ túc kiến thức giáo lý hè đạt 8.0 điểm..."
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  required
                />
              </div>

              {/* Additional notes */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ghi chú lưu trữ sổ bộ (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ví dụ: Đã có sự hiệp ý của Cha Quản Sở và Giáo lý viên chủ nhiệm"
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  id="grant-special-promotion-btn"
                  className="px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Award className="w-4 h-4" />
                  <span>Ký Duyệt Quyết Định Đặc Cách Lên Lớp</span>
                </button>
              </div>
            </form>
          )}

          {/* List of Active Special Promotions */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-600" />
              <span>Danh Sách Thiếu Nhi Đã Được Phê Duyệt Đặc Cách ({specialPromotions.length} trường hợp)</span>
            </h3>

            {specialPromotions.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                Chưa có trường hợp nào được xét đặc cách lên thẳng lớp trong niên khóa này.
              </div>
            ) : (
              <div className="space-y-2.5">
                {specialPromotions.map((sp) => {
                  const st = students.find(s => s.id === sp.studentId);
                  const currentCls = classes.find(c => c.id === st?.classId);
                  const targetCls = classes.find(c => c.id === sp.promotedToClassId);

                  return (
                    <div
                      key={sp.id}
                      className="p-3.5 bg-white border border-purple-200 rounded-xl shadow-xs hover:border-purple-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded">
                            {sp.studentId}
                          </span>
                          <strong className="text-xs text-slate-900">
                            {st ? `${st.holyName} ${st.fullName}` : 'Học sinh'}
                          </strong>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            Đặc Cách Lên Lớp
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 flex items-center gap-2">
                          <span className="text-slate-500">Lớp hiện tại: <strong>{currentCls?.name || 'N/A'}</strong></span>
                          <ArrowRight className="w-3 h-3 text-purple-600" />
                          <span className="text-purple-800 font-semibold">Được lên thẳng: <strong>{targetCls?.name || 'N/A'}</strong></span>
                        </div>

                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100 mt-1">
                          <strong>Lý do mục vụ:</strong> {sp.reason}
                        </div>

                        <div className="text-[10px] text-slate-400 flex items-center gap-3 pt-0.5">
                          <span>Phê duyệt bởi: <strong className="text-slate-700">{sp.approvedBy}</strong></span>
                          <span>• Ngày ký: {sp.decisionDate}</span>
                        </div>
                      </div>

                      {isAuthorized && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`HỦY QUYẾT ĐỊNH ĐẶC CÁCH:\nBạn có chắc chắn muốn thu hồi quyết định đặc cách của em ${st?.fullName || sp.studentId} không?`)) {
                              onRevokeSpecialPromotion(sp.id);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium flex items-center gap-1 self-start sm:self-center transition-colors"
                          title="Hủy bỏ quyết định đặc cách"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Thu Hồi</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Ban Giáo Lý Giáo Sở Don Bosco Đà Lạt</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
