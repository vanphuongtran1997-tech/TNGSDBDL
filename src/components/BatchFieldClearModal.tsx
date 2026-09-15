import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Trash2, 
  AlertTriangle, 
  CheckSquare, 
  Square, 
  X, 
  Filter, 
  Users, 
  GraduationCap, 
  Clock, 
  CreditCard,
  Church,
  Phone,
  FileText
} from 'lucide-react';
import { Student, ClassRoom, Role, GradeRecord, AttendanceRecord, ConductRecord, TuitionItem } from '../types';

export interface BatchClearOptions {
  // Personal Info Fields
  clearPhones?: boolean;
  clearParentEmail?: boolean;
  clearAddress?: boolean;
  clearNotes?: boolean;

  // Sacraments Fields
  clearBaptism?: boolean;
  clearCommunion?: boolean;
  clearConfirmation?: boolean;
  clearGodparent?: boolean;

  // Grades Fields
  clearMidtermHK1?: boolean;
  clearFinalHK1?: boolean;
  clearMidtermHK2?: boolean;
  clearFinalHK2?: boolean;
  clearRetestScores?: boolean;
  clearAllGrades?: boolean;

  // Attendance Fields
  clearAttendanceHK1?: boolean;
  clearAttendanceHK2?: boolean;
  clearAbsenceOnlyD?: boolean;

  // Conduct Fields
  clearConductHK1?: boolean;
  clearConductHK2?: boolean;

  // Tuition Fields
  resetTuitionToUnpaid?: boolean;
  clearAllTuition?: boolean;

  // Delete students completely
  deleteStudentsInScope?: boolean;
}

interface BatchFieldClearModalProps {
  userRole: Role;
  classes: ClassRoom[];
  students: Student[];
  selectedStudentIds?: string[];
  onExecuteBatchClear: (
    scope: { type: 'all' | 'class' | 'selected'; classId?: string; studentIds?: string[] },
    options: BatchClearOptions
  ) => void;
  onClose: () => void;
}

export const BatchFieldClearModal: React.FC<BatchFieldClearModalProps> = ({
  userRole,
  classes,
  students,
  selectedStudentIds = [],
  onExecuteBatchClear,
  onClose,
}) => {
  const isAdmin = userRole === 'admin' || userRole === 'pastor';

  // Scope: 'all', 'class', or 'selected'
  const [scopeType, setScopeType] = useState<'all' | 'class' | 'selected'>(
    selectedStudentIds.length > 0 ? 'selected' : 'class'
  );
  const [targetClassId, setTargetClassId] = useState<string>(classes[0]?.id || '');

  // Options State
  const [options, setOptions] = useState<BatchClearOptions>({});
  const [confirmKeyword, setConfirmKeyword] = useState<string>('');
  const [acknowledged, setAcknowledged] = useState<boolean>(false);

  const toggleOption = (key: keyof BatchClearOptions) => {
    setOptions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Calculate affected students count
  const getAffectedStudents = (): Student[] => {
    if (scopeType === 'all') return students;
    if (scopeType === 'selected') {
      return students.filter(s => selectedStudentIds.includes(s.id));
    }
    return students.filter(s => s.classId === targetClassId);
  };

  const affectedStudents = getAffectedStudents();
  const selectedFieldsCount = Object.values(options).filter(Boolean).length;

  const targetClassObj = classes.find(c => c.id === targetClassId);

  const handleExecute = () => {
    if (!isAdmin) {
      alert('Chỉ tài khoản Quản Trị Viên (Admin) mới có quyền thực hiện xóa dữ liệu hàng loạt!');
      return;
    }

    if (selectedFieldsCount === 0) {
      alert('Vui lòng chọn ít nhất một trường dữ liệu cần xóa!');
      return;
    }

    if (confirmKeyword.trim().toUpperCase() !== 'XAC NHAN XOA' && confirmKeyword.trim().toUpperCase() !== 'XÓA') {
      alert('Vui lòng gõ chính xác từ khóa xác nhận: "XAC NHAN XOA" hoặc "XÓA" để tiếp tục.');
      return;
    }

    if (!acknowledged) {
      alert('Vui lòng tích chọn xác nhận hiểu rõ hậu quả của thao tác này.');
      return;
    }

    onExecuteBatchClear(
      {
        type: scopeType,
        classId: scopeType === 'class' ? targetClassId : undefined,
        studentIds: scopeType === 'selected' ? selectedStudentIds : undefined,
      },
      options
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-rose-300">
        {/* Header with Admin warning styling */}
        <div className="p-4 border-b border-rose-200 flex items-center justify-between bg-rose-950 text-white rounded-t-xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/30 text-rose-300 border border-rose-500/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-rose-200">
                  Xóa Từng Trường Dữ Liệu Hàng Loạt
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white uppercase">
                  Dành Riêng Cho Quản Trị Viên
                </span>
              </div>
              <p className="text-[11px] text-rose-300">
                Cho phép chọn lọc và xóa trắng chính xác từng trường dữ liệu của học sinh theo phạm vi chỉ định
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-rose-300 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {!isAdmin ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-3">
              <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
              <h3 className="font-bold text-sm text-rose-900">Truy Cập Bị Giới Hạn</h3>
              <p className="text-slate-600 max-w-md mx-auto">
                Tính năng này yêu cầu quyền <strong>Quản Trị Viên (Admin / Cha Quản Sở)</strong> để tránh làm mất mát dữ liệu học vụ của Giáo sở. Vui lòng chuyển sang tài khoản Quản Trị Viên ở góc trên thanh điều hướng để sử dụng.
              </p>
            </div>
          ) : (
            <>
              {/* Step 1: Select Target Scope */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Filter className="w-4 h-4 text-blue-700" />
                  <span>Bước 1: Chọn Phạm Vi Áp Dụng</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label 
                    className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-colors ${
                      scopeType === 'class' ? 'bg-blue-50 border-blue-400 font-semibold text-blue-900' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scopeType"
                      checked={scopeType === 'class'}
                      onChange={() => setScopeType('class')}
                      className="text-blue-600"
                    />
                    <span>Theo Lớp Cụ Thể</span>
                  </label>

                  {selectedStudentIds.length > 0 && (
                    <label 
                      className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-colors ${
                        scopeType === 'selected' ? 'bg-blue-50 border-blue-400 font-semibold text-blue-900' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="scopeType"
                        checked={scopeType === 'selected'}
                        onChange={() => setScopeType('selected')}
                        className="text-blue-600"
                      />
                      <span>Đã Chọn ({selectedStudentIds.length} em)</span>
                    </label>
                  )}

                  <label 
                    className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-colors ${
                      scopeType === 'all' ? 'bg-rose-50 border-rose-400 font-semibold text-rose-900' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scopeType"
                      checked={scopeType === 'all'}
                      onChange={() => setScopeType('all')}
                      className="text-rose-600"
                    />
                    <span>Toàn Giáo Sở ({students.length} em)</span>
                  </label>
                </div>

                {scopeType === 'class' && (
                  <div className="pt-2 flex items-center gap-3">
                    <span className="text-slate-600 font-medium">Chọn Lớp:</span>
                    <select
                      value={targetClassId}
                      onChange={(e) => setTargetClassId(e.target.value)}
                      className="border border-slate-300 rounded-lg py-1.5 px-3 bg-white font-semibold text-slate-800 flex-1 max-w-sm"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.isSacramentClass ? '★ (Bí Tích)' : ''} — ({students.filter(s => s.classId === c.id).length} học sinh)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200 flex items-center justify-between">
                  <span>
                    Số học sinh sẽ bị tác động: <strong className="text-rose-700 font-mono text-xs">{affectedStudents.length} học sinh</strong>
                    {scopeType === 'class' && targetClassObj && ` (Lớp ${targetClassObj.name})`}
                  </span>
                </div>
              </div>

              {/* Step 2: Choose which fields to clear */}
              <div className="space-y-3">
                <div className="font-bold text-slate-900 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Bước 2: Chọn Từng Trường Dữ Liệu Cần Xóa Hàng Loạt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Select common fields or clear all
                        setOptions({});
                      }}
                      className="text-slate-500 hover:text-slate-800 text-[11px] underline"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category 1: Contact & Personal Fields */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2">
                    <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-1 border-b border-slate-200">
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span>Thông Tin Liên Lạc & Cá Nhân</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!options.clearPhones}
                          onChange={() => toggleOption('clearPhones')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Xóa trường Số điện thoại</div>
                          <div className="text-[10px] text-slate-500">Làm trống cả SĐT học sinh và SĐT phụ huynh</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!options.clearParentEmail}
                          onChange={() => toggleOption('clearParentEmail')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Xóa trường Email phụ huynh</div>
                          <div className="text-[10px] text-slate-500">Làm trống toàn bộ địa chỉ hòm thư phụ huynh</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!options.clearAddress}
                          onChange={() => toggleOption('clearAddress')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Xóa trường Địa chỉ nhà</div>
                          <div className="text-[10px] text-slate-500">Xóa địa chỉ cư trú của các em</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!options.clearNotes}
                          onChange={() => toggleOption('clearNotes')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Xóa trường Ghi chú học sinh</div>
                          <div className="text-[10px] text-slate-500">Xóa sạch các lưu ý đặc biệt</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Category 2: Sacraments */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2">
                    <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-1 border-b border-slate-200">
                      <Church className="w-3.5 h-3.5 text-amber-600" />
                      <span>Hồ Sơ Các Bí Tích</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!options.clearBaptism}
                          onChange={() => toggleOption('clearBaptism')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Xóa ngày Bí tích Rửa Tội</div>
                          <div className="text-[10px] text-slate-500">Làm trống ngày lãnh nhận Bí tích Thanh tẩy</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!options.clearCommunion}
                          onChange={() => toggleOption('clearCommunion')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Xóa ngày Bí tích Rước Lễ Lần Đầu</div>
                          <div className="text-[10px] text-slate-500">Xóa mốc Thánh Thể (Giao Hòa)</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!options.clearConfirmation}
                          onChange={() => toggleOption('clearConfirmation')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Xóa ngày Bí tích Thêm Sức</div>
                          <div className="text-[10px] text-slate-500">Xóa mốc lãnh nhận Thêm Sức</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!options.clearGodparent}
                          onChange={() => toggleOption('clearGodparent')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Xóa Người Đỡ Đầu</div>
                          <div className="text-[10px] text-slate-500">Xóa tên Thánh và họ tên cha/mẹ đỡ đầu</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Category 3: Academic Grades */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2">
                    <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-1 border-b border-slate-200">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Điểm Số & Học Lực</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!options.clearMidtermHK1}
                          onChange={() => toggleOption('clearMidtermHK1')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Xóa Điểm Thi Giữa Kỳ (ĐGK 45P) HK1</div>
                          <div className="text-[10px] text-slate-500">Đặt lại điểm giữa kỳ 1 về trống</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!options.clearFinalHK1}
                          onChange={() => toggleOption('clearFinalHK1')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Xóa Điểm Thi Học Kỳ (ĐTHK) HK1</div>
                          <div className="text-[10px] text-slate-500">Đặt lại điểm thi cuối kỳ 1 về trống</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!options.clearMidtermHK2}
                          onChange={() => toggleOption('clearMidtermHK2')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Xóa Điểm Giữa Kỳ & Cuối Kỳ HK2</div>
                          <div className="text-[10px] text-slate-500">Đặt lại điểm số học kỳ 2 về trống</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!options.clearRetestScores}
                          onChange={() => toggleOption('clearRetestScores')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Xóa Điểm Thi Lại</div>
                          <div className="text-[10px] text-slate-500">Xóa sạch các bản ghi thi lại của học sinh</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer select-none pt-1 border-t border-slate-200">
                        <input
                          type="checkbox"
                          checked={!!options.clearAllGrades}
                          onChange={() => toggleOption('clearAllGrades')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-bold text-rose-700">Xóa toàn bộ Bảng Điểm</div>
                          <div className="text-[10px] text-rose-600">Xóa sạch toàn bộ điểm số để nhập mới từ đầu</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Category 4: Attendance, Conduct & Tuition */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2">
                    <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-1 border-b border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Chuyên Cần, Hạnh Kiểm & Học Phí</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!options.clearAttendanceHK1}
                          onChange={() => toggleOption('clearAttendanceHK1')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Xóa Dữ Liệu Điểm Danh Học Kỳ 1</div>
                          <div className="text-[10px] text-slate-500">Xóa toàn bộ buổi điểm danh HK1 của phạm vi</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!options.clearAbsenceOnlyD}
                          onChange={() => toggleOption('clearAbsenceOnlyD')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Xóa các lượt vắng Không Phép (D)</div>
                          <div className="text-[10px] text-slate-500">Chỉ xóa các lỗi vắng D (giúp ân xá điều kiện thi)</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!options.clearConductHK1}
                          onChange={() => toggleOption('clearConductHK1')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Xóa Lỗi Vi Phạm Hạnh Kiểm</div>
                          <div className="text-[10px] text-slate-500">Xóa vi phạm (-A,-B,-C,-D,-E), phục hồi về 10 đ</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer select-none pt-1 border-t border-slate-200">
                        <input
                          type="checkbox"
                          checked={!!options.resetTuitionToUnpaid}
                          onChange={() => toggleOption('resetTuitionToUnpaid')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800">Đặt lại Quỹ Giáo Lý về "Chưa đóng"</div>
                          <div className="text-[10px] text-slate-500">Xóa biên lai và ngày thu để bắt đầu đợt thu mới</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer select-none pt-1 border-t border-slate-200">
                        <input
                          type="checkbox"
                          checked={!!options.deleteStudentsInScope}
                          onChange={() => toggleOption('deleteStudentsInScope')}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-bold text-rose-700">Xóa Hồ Sơ Học Sinh Trong Phạm Vi</div>
                          <div className="text-[10px] text-rose-600">Xóa hoàn toàn danh sách học sinh đã chọn</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Confirmation and Safety lock */}
              <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2 text-rose-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>Bước 3: Xác Nhận Quản Trị Viên Để Thực Hiện</span>
                </div>

                <div className="text-slate-700 text-[11px] leading-relaxed">
                  Bạn đang chuẩn bị thực hiện xóa <strong>{selectedFieldsCount} trường dữ liệu</strong> đối với{' '}
                  <strong className="text-rose-700">{affectedStudents.length} học sinh</strong> trong phạm vi đã chọn.
                  Thao tác này là vĩnh viễn và không thể khôi phục lại dữ liệu đã xóa.
                </div>

                <label className="flex items-start gap-2 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="mt-0.5 rounded border-rose-400 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-rose-950 text-xs">
                    Tôi là Quản Trị Viên và tôi hiểu rõ rằng thao tác xóa các trường này không thể hoàn tác.
                  </span>
                </label>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <span className="text-slate-700 font-medium">
                    Nhập từ khóa xác nhận (<strong className="text-rose-700 font-mono">XÓA</strong> hoặc <strong className="text-rose-700 font-mono">XAC NHAN XOA</strong>):
                  </span>
                  <input
                    type="text"
                    placeholder="Gõ 'XÓA'..."
                    value={confirmKeyword}
                    onChange={(e) => setConfirmKeyword(e.target.value)}
                    className="border border-rose-400 rounded-lg px-3 py-1.5 bg-white font-mono font-bold text-rose-800 text-xs uppercase w-48 focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between rounded-b-xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-medium text-xs transition-colors"
          >
            Hủy Bỏ
          </button>

          {isAdmin && (
            <button
              type="button"
              disabled={
                selectedFieldsCount === 0 ||
                !acknowledged ||
                (confirmKeyword.trim().toUpperCase() !== 'XAC NHAN XOA' && confirmKeyword.trim().toUpperCase() !== 'XÓA')
              }
              onClick={handleExecute}
              className="px-5 py-2 bg-rose-700 hover:bg-rose-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xác Nhận Xóa Hàng Loạt ({selectedFieldsCount} trường đã chọn)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
