import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Search, 
  Plus, 
  Download, 
  FileText, 
  AlertCircle,
  X
} from 'lucide-react';
import { TuitionItem, Student, ClassRoom, Role } from '../types';
import { formatVNCurrency } from '../utils/calculations';

interface TuitionManagerProps {
  tuitionList: TuitionItem[];
  students: Student[];
  classes: ClassRoom[];
  userRole: Role;
  onUpdateTuition: (item: TuitionItem) => void;
  onAddTuition: (item: Omit<TuitionItem, 'id'>) => void;
}

export const TuitionManager: React.FC<TuitionManagerProps> = ({
  tuitionList,
  students,
  classes,
  userRole,
  onUpdateTuition,
  onAddTuition,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedReceiptItem, setSelectedReceiptItem] = useState<{
    tuition: TuitionItem;
    student: Student;
  } | null>(null);

  // New Tuition Form
  const [newFeeTarget, setNewFeeTarget] = useState<'individual' | 'class'>('class');
  const [targetClassId, setTargetClassId] = useState<string>(classes[0]?.id || '');
  const [targetStudentId, setTargetStudentId] = useState<string>(students[0]?.id || '');
  const [feeName, setFeeName] = useState<string>('Quỹ Giáo Lý & Sinh Hoạt Niên Khóa 2026 - 2027');
  const [feeAmount, setFeeAmount] = useState<number>(150000);
  const [dueDate, setDueDate] = useState<string>('2026-10-15');

  const canManage = userRole === 'admin' || userRole === 'pastor' || userRole === 'catechist_leader';

  const getStudent = (studentId: string) => {
    return students.find(s => s.id === studentId);
  };

  const getClassName = (cid?: string) => {
    return classes.find(c => c.id === cid)?.name || cid || '';
  };

  // Filter list
  const filteredTuition = tuitionList.filter(t => {
    const student = getStudent(t.studentId);
    if (!student) return false;

    const matchesClass = selectedClassId === 'all' || student.classId === selectedClassId;
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
    const matchesSearch = 
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.holyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.feeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.receiptNumber && t.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesClass && matchesStatus && matchesSearch;
  });

  // Aggregate stats
  const totalAmount = filteredTuition.reduce((acc, curr) => acc + curr.amount, 0);
  const paidAmount = filteredTuition.filter(t => t.status === 'Đã đóng').reduce((acc, curr) => acc + curr.amount, 0);
  const unpaidCount = filteredTuition.filter(t => t.status === 'Chưa đóng').length;
  const paidCount = filteredTuition.filter(t => t.status === 'Đã đóng').length;

  const handleConfirmPayment = (item: TuitionItem) => {
    const student = getStudent(item.studentId);
    const receiptNum = `BL-DBS-${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().split('T')[0];

    onUpdateTuition({
      ...item,
      status: 'Đã đóng',
      paidDate: today,
      receiptNumber: receiptNum,
      payerName: student ? `${student.parentName} (Phụ huynh)` : 'Phụ huynh',
    });
  };

  const handleCreateTuition = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFeeTarget === 'individual') {
      onAddTuition({
        studentId: targetStudentId,
        feeName,
        amount: feeAmount,
        dueDate,
        status: 'Chưa đóng',
      });
    } else {
      // Add for all students in target class
      const targetStudents = students.filter(s => s.classId === targetClassId);
      targetStudents.forEach(st => {
        onAddTuition({
          studentId: st.id,
          feeName,
          amount: feeAmount,
          dueDate,
          status: 'Chưa đóng',
        });
      });
      alert(`Đã khởi tạo khoản thu cho ${targetStudents.length} học sinh trong lớp!`);
    }
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header and Stats */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-700" />
              <span>Quản Lý Học Phí & Quỹ Giáo Lý Don Bosco</span>
            </h1>
            <p className="text-xs text-slate-500">
              Thu quỹ giáo lý, tiền sách, đồng phục, xác nhận đóng học phí và in biên lai thu tiền Công giáo
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo Khoản Thu Mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Tổng Số Khoản Thu:</span>
            <span className="text-base font-bold text-slate-900">{filteredTuition.length} khoản</span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <span className="text-emerald-800 block text-[11px]">Đã Thu Hoàn Tất:</span>
            <span className="text-base font-bold text-emerald-900">
              {paidCount} khoản ({formatVNCurrency(paidAmount)})
            </span>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <span className="text-amber-800 block text-[11px]">Chưa Thu:</span>
            <span className="text-base font-bold text-amber-900">
              {unpaidCount} em ({formatVNCurrency(totalAmount - paidAmount)})
            </span>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-blue-800 block text-[11px]">Tỷ Lệ Hoàn Thành:</span>
            <span className="text-base font-bold text-blue-900">
              {filteredTuition.length > 0 ? Math.round((paidCount / filteredTuition.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên học sinh, số biên lai..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50"
          />
        </div>

        <div>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full py-1.5 px-2.5 border border-slate-300 rounded-lg bg-white font-medium"
          >
            <option value="all">Tất cả các lớp</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full py-1.5 px-2.5 border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">Tất cả trạng thái đóng</option>
            <option value="Đã đóng">Đã đóng</option>
            <option value="Chưa đóng">Chưa đóng</option>
            <option value="Miễn giảm">Miễn giảm (Khó khăn)</option>
          </select>
        </div>
      </div>

      {/* Tuition Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Học Sinh</th>
                <th className="py-2.5 px-3">Lớp</th>
                <th className="py-2.5 px-3">Khoản Thu</th>
                <th className="py-2.5 px-3">Số Tiền</th>
                <th className="py-2.5 px-3">Hạn Đóng</th>
                <th className="py-2.5 px-3">Trạng Thái</th>
                <th className="py-2.5 px-3">Số Biên Lai</th>
                <th className="py-2.5 px-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredTuition.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Không có bản ghi học phí nào.
                  </td>
                </tr>
              ) : (
                filteredTuition.map((item) => {
                  const student = getStudent(item.studentId);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">
                          {student?.holyName} {student?.fullName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.studentId}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-700">
                          {getClassName(student?.classId)}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {item.feeName}
                      </td>

                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">
                        {formatVNCurrency(item.amount)}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        {item.dueDate}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'Đã đóng' 
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                            : item.status === 'Miễn giảm'
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {item.receiptNumber || '-'}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {item.status === 'Chưa đóng' && canManage && (
                            <button
                              onClick={() => handleConfirmPayment(item)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                              title="Xác nhận đã nhận tiền và xuất biên lai"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Thu Tiền</span>
                            </button>
                          )}

                          {item.status === 'Đã đóng' && student && (
                            <button
                              onClick={() => setSelectedReceiptItem({ tuition: item, student })}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium flex items-center gap-1"
                              title="In biên lai thu tiền"
                            >
                              <Printer className="w-3 h-3" />
                              <span>In Biên Lai</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Catholic Receipt Modal */}
      {selectedReceiptItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 text-xs p-6 print:border-none print:shadow-none print:w-full">
            {/* Action Bar (screen only) */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 print:hidden">
              <span className="font-bold text-slate-700 text-sm">Xem Trước Biên Lai Thu Quỹ Giáo Lý</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-blue-700 text-white rounded font-medium flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Biên Lai</span>
                </button>
                <button onClick={() => setSelectedReceiptItem(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="border-2 border-slate-800 p-4 rounded-lg space-y-4 font-serif">
              <div className="text-center space-y-1 border-b border-slate-300 pb-3">
                <div className="text-[10px] uppercase font-sans font-bold text-slate-600">
                  GIÁO PHẬN ĐÀ LẠT • GIÁO SỞ DON BOSCO
                </div>
                <div className="text-xs font-bold text-amber-900 font-sans">
                  BAN GIÁO LÝ THIẾU NHI
                </div>
                <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 pt-1">
                  BIÊN LAI THU QUỸ GIÁO LÝ
                </h2>
                <p className="text-[10px] text-slate-500 font-mono">
                  Số: {selectedReceiptItem.tuition.receiptNumber}
                </p>
              </div>

              <div className="space-y-1.5 text-slate-800 font-sans text-xs">
                <div>
                  <span className="text-slate-500">Họ và Tên Học Sinh:</span>{' '}
                  <strong className="text-blue-950 font-serif text-sm">
                    {selectedReceiptItem.student.holyName} {selectedReceiptItem.student.fullName}
                  </strong>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Mã Học Sinh:</span>{' '}
                    <span className="font-mono font-semibold">{selectedReceiptItem.student.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Lớp:</span>{' '}
                    <span className="font-semibold">{getClassName(selectedReceiptItem.student.classId)}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Nội Dung Thu:</span>{' '}
                  <span className="font-medium text-slate-900">{selectedReceiptItem.tuition.feeName}</span>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded flex justify-between items-center my-2">
                  <span className="font-bold text-slate-700">Số Tiền Thu:</span>
                  <span className="font-bold text-base text-emerald-900 font-mono">
                    {formatVNCurrency(selectedReceiptItem.tuition.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Người Nộp Tiền:</span>{' '}
                  <span>{selectedReceiptItem.tuition.payerName || selectedReceiptItem.student.parentName}</span>
                </div>
                <div>
                  <span className="text-slate-500">Ngày Thu:</span>{' '}
                  <span>{selectedReceiptItem.tuition.paidDate || new Date().toLocaleDateString('vi-VN')}</span>
                </div>
              </div>

              {/* Signature section */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-300 font-sans text-center text-xs">
                <div>
                  <p className="font-medium text-slate-700">Người Nộp</p>
                  <p className="text-[9px] text-slate-400">(Ký và ghi rõ họ tên)</p>
                  <div className="h-10"></div>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Văn Phòng Giáo Lý</p>
                  <p className="text-[9px] text-slate-400">(Đã thu đủ tiền)</p>
                  <div className="h-10 flex items-center justify-center font-serif italic text-blue-900">
                    Ban Tài Chánh Don Bosco
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Tuition Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 border border-slate-200 text-xs">
            <h3 className="font-bold text-slate-800 text-sm mb-3">Tạo Khoản Thu Mới</h3>
            <form onSubmit={handleCreateTuition} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Đối Tượng Áp Dụng:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewFeeTarget('class')}
                    className={`p-2 rounded border font-semibold ${newFeeTarget === 'class' ? 'bg-amber-100 border-amber-500 text-amber-950' : 'bg-slate-50'}`}
                  >
                    Toàn Bộ 1 Lớp
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFeeTarget('individual')}
                    className={`p-2 rounded border font-semibold ${newFeeTarget === 'individual' ? 'bg-amber-100 border-amber-500 text-amber-950' : 'bg-slate-50'}`}
                  >
                    Học Sinh Riêng Lẻ
                  </button>
                </div>
              </div>

              {newFeeTarget === 'class' ? (
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Chọn Lớp:</label>
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1.5"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Chọn Học Sinh:</label>
                  <select
                    value={targetStudentId}
                    onChange={(e) => setTargetStudentId(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1.5"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.holyName} {s.fullName} ({s.id})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tên Khoản Thu:</label>
                <input
                  type="text"
                  required
                  value={feeName}
                  onChange={(e) => setFeeName(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Số Tiền (VNĐ):</label>
                  <input
                    type="number"
                    step="10000"
                    required
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Hạn Đóng:</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1 border rounded text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-emerald-700 text-white rounded font-semibold"
                >
                  Xác Nhận Tạo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
