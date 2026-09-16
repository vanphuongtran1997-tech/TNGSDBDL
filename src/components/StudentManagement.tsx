import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  Printer, 
  Edit, 
  Trash2, 
  QrCode, 
  BookOpen, 
  ArrowRightLeft, 
  Download, 
  Upload,
  CheckCircle2,
  Calendar,
  Phone,
  MapPin,
  Church,
  ShieldAlert,
  CheckSquare,
  Square,
  Eraser,
  FileSpreadsheet,
  Crown
} from 'lucide-react';
import { Student, ClassRoom, Role, SpecialPromotion } from '../types';
import { BatchImportModal } from './BatchImportModal';
import { BatchFieldClearModal, BatchClearOptions } from './BatchFieldClearModal';

interface StudentManagementProps {
  students: Student[];
  classes: ClassRoom[];
  userRole: Role;
  specialPromotions?: SpecialPromotion[];
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onBatchImportStudents: (newStudents: Student[]) => void;
  onExecuteBatchClear: (
    scope: { type: 'all' | 'class' | 'selected'; classId?: string; studentIds?: string[] },
    options: BatchClearOptions
  ) => void;
  onDeleteMultipleStudents: (studentIds: string[]) => void;
  onOpenCardModal: (classId?: string, studentIds?: string[]) => void;
  onOpenReportBook: (student: Student) => void;
  onOpenTransferModal: (student?: Student) => void;
  onOpenIdSearchModal?: () => void;
  onOpenSpecialPromotion?: (student?: Student) => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  classes,
  userRole,
  specialPromotions = [],
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onBatchImportStudents,
  onExecuteBatchClear,
  onDeleteMultipleStudents,
  onOpenCardModal,
  onOpenReportBook,
  onOpenTransferModal,
  onOpenIdSearchModal,
  onOpenSpecialPromotion,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTarget, setSearchTarget] = useState<'all' | 'id_only'>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Batch states
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [isBatchClearOpen, setIsBatchClearOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    holyName: '',
    fullName: '',
    gender: 'Nam' as 'Nam' | 'Nữ',
    dob: '2016-01-01',
    classId: classes[0]?.id || '',
    phone: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    address: 'TP. Đà Lạt',
    subParish: 'Giáo họ Don Bosco',
    baptismDate: '',
    firstCommunionDate: '',
    confirmationDate: '',
    godParentName: '',
    notes: '',
  });

  const isAdmin = userRole === 'admin' || userRole === 'pastor';
  const canEdit = isAdmin || userRole === 'catechist_leader' || userRole === 'catechist';

  // Filter students
  const filteredStudents = students.filter(s => {
    const term = searchTerm.trim().toLowerCase();
    let matchesSearch = true;

    if (term) {
      if (searchTarget === 'id_only') {
        matchesSearch = s.id.toLowerCase().includes(term);
      } else {
        matchesSearch = 
          s.fullName.toLowerCase().includes(term) ||
          s.holyName.toLowerCase().includes(term) ||
          s.id.toLowerCase().includes(term) ||
          s.parentPhone.includes(term);
      }
    }

    const matchesClass = selectedClassId === 'all' || s.classId === selectedClassId;
    const matchesGender = selectedGender === 'all' || s.gender === selectedGender;

    return matchesSearch && matchesClass && matchesGender;
  });

  const getClassName = (cid: string) => {
    return classes.find(c => c.id === cid)?.name || cid;
  };

  // Toggle selection for all filtered students
  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  // Toggle individual student selection
  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({
      holyName: 'Maria',
      fullName: '',
      gender: 'Nữ',
      dob: '2018-05-10',
      classId: selectedClassId !== 'all' ? selectedClassId : (classes[0]?.id || ''),
      phone: '',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      address: 'Đà Lạt, Lâm Đồng',
      subParish: 'Giáo họ Don Bosco',
      baptismDate: '',
      firstCommunionDate: '',
      confirmationDate: '',
      godParentName: '',
      notes: '',
    });
    setIsFormOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      holyName: student.holyName,
      fullName: student.fullName,
      gender: student.gender,
      dob: student.dob,
      classId: student.classId,
      phone: student.phone,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail,
      address: student.address,
      subParish: student.subParish,
      baptismDate: student.baptismDate || '',
      firstCommunionDate: student.firstCommunionDate || '',
      confirmationDate: student.confirmationDate || '',
      godParentName: student.godParentName || '',
      notes: student.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.holyName.trim()) {
      alert('Vui lòng nhập Tên Thánh và Họ Tên học sinh!');
      return;
    }

    if (editingStudent) {
      onUpdateStudent({
        ...editingStudent,
        ...formData,
      });
    } else {
      onAddStudent(formData);
    }
    setIsFormOpen(false);
  };

  // Export JSON backup
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(students, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `HocSinh_DonBoscoDaLat_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4">
      {/* Header action bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <span>Danh Sách Thiếu Nhi Giáo Lý</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
              {filteredStudents.length} / {students.length} em
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Quản lý hồ sơ học tập, mốc lãnh nhận Bí tích, in thẻ học sinh và mã QR điểm danh
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Print all cards button */}
          <button
            id="print-class-cards-btn"
            onClick={() => onOpenCardModal(selectedClassId === 'all' ? undefined : selectedClassId)}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In Thẻ Học Sinh & QR</span>
          </button>

          {/* Export button */}
          <button
            onClick={handleExportData}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Xuất dữ liệu hồ sơ học sinh"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Dữ Liệu</span>
          </button>

          {/* Batch Import Button */}
          {canEdit && (
            <button
              id="batch-import-btn"
              onClick={() => setIsBatchImportOpen(true)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              title="Nhập danh sách học sinh hàng loạt từ tệp Excel/CSV hoặc dán văn bản"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Nhập Theo Mẫu Hàng Loạt</span>
            </button>
          )}

          {/* Batch Field Clear Button (Admin) */}
          <button
            id="batch-clear-btn"
            onClick={() => {
              if (!isAdmin) {
                alert('Chỉ tài khoản Quản Trị Viên (Admin) mới có quyền truy cập tính năng Xóa trường dữ liệu hàng loạt.');
                return;
              }
              setIsBatchClearOpen(true);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors ${
              isAdmin
                ? 'bg-rose-700 hover:bg-rose-800 text-white'
                : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
            }`}
            title="Xóa từng trường dữ liệu hàng loạt dành riêng cho Quản Trị Viên"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Xóa Trường Dữ Liệu Hàng Loạt</span>
          </button>

          {/* Add Student Button (Role checked) */}
          {canEdit && (
            <button
              id="add-student-btn"
              onClick={openAddModal}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tiếp Nhận Học Sinh Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedStudentIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-amber-700" />
            <span className="text-xs font-bold text-amber-950">
              Đang chọn <strong className="text-amber-700">{selectedStudentIds.length}</strong> học sinh
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenCardModal(selectedClassId === 'all' ? undefined : selectedClassId, selectedStudentIds)}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              title="In thẻ ATM cho các học sinh đã chọn"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Thẻ ATM ({selectedStudentIds.length} em)</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsBatchClearOpen(true)}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Xóa từng trường dữ liệu của các học sinh đã chọn"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Xóa Trường Dữ Liệu ({selectedStudentIds.length} em)</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Bạn có chắc chắn muốn xóa hoàn toàn ${selectedStudentIds.length} học sinh đã chọn khỏi hệ thống không?`)) {
                    onDeleteMultipleStudents(selectedStudentIds);
                    setSelectedStudentIds([]);
                  }
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Xóa hoàn toàn danh sách học sinh đã chọn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa {selectedStudentIds.length} Học Sinh Đã Chọn</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="text-xs text-slate-600 hover:text-slate-900 underline px-2 py-1"
            >
              Bỏ chọn ({selectedStudentIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search controls */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Main Search Input with Mode Toggle */}
          <div className="md:col-span-6 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  searchTarget === 'id_only'
                    ? "Tìm kiếm bằng Mã Học Sinh (vd: DBS-KT-001, 001)..."
                    : "Tìm theo Tên Thánh, Họ Tên, Mã số DBS, SĐT phụ huynh..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-8 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  searchTarget === 'id_only'
                    ? 'border-amber-400 bg-amber-50/50 font-mono focus:ring-amber-500 font-semibold'
                    : 'border-slate-300 bg-slate-50 focus:bg-white focus:ring-amber-500'
                }`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Search Target Selector */}
            <select
              value={searchTarget}
              onChange={(e) => setSearchTarget(e.target.value as 'all' | 'id_only')}
              className="py-1.5 px-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-medium shrink-0"
              title="Chọn phạm vi tìm kiếm"
            >
              <option value="all">Tìm tất cả</option>
              <option value="id_only">Chỉ tìm Mã HS (ID)</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-medium"
            >
              <option value="all">Tất cả các khối lớp (12 lớp)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.isSacramentClass ? '★ (Bí Tích)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="flex-1 py-1.5 px-2.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700"
            >
              <option value="all">Tất cả giới tính</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>

            {onOpenIdSearchModal && (
              <button
                type="button"
                onClick={onOpenIdSearchModal}
                className="py-1.5 px-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors shrink-0"
                title="Mở bảng tra cứu chi tiết bằng mã học sinh"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Tra Cứu Mã HS</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick ID hints bar if searching or when id_only is selected */}
        {searchTarget === 'id_only' && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-amber-800">
              Chế độ tìm nhanh theo Mã Học Sinh:
            </span>
            {students.slice(0, 7).map(st => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSearchTerm(st.id)}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors"
              >
                {st.id}
              </button>
            ))}
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-[10px] text-slate-500 hover:underline ml-auto"
              >
                Xóa bộ lọc mã
              </button>
            )}
          </div>
        )}
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer w-3.5 h-3.5"
                    title="Chọn tất cả danh sách đang hiển thị"
                  />
                </th>
                <th className="py-3 px-3">Mã Số</th>
                <th className="py-3 px-3">Tên Thánh & Họ Tên</th>
                <th className="py-3 px-3">Lớp Hiện Tại</th>
                <th className="py-3 px-3">Ngày Sinh / Giới Tính</th>
                <th className="py-3 px-3">Giáo Họ / Khu Xóm</th>
                <th className="py-3 px-3">Phụ Huynh & SĐT</th>
                <th className="py-3 px-3">Bí Tích Lãnh Nhận</th>
                <th className="py-3 px-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    Không tìm thấy học sinh nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr 
                    key={st.id} 
                    className={`transition-colors ${
                      selectedStudentIds.includes(st.id) ? 'bg-amber-50/70' : 'hover:bg-amber-50/30'
                    }`}
                  >
                    <td className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(st.id)}
                        onChange={() => toggleSelectStudent(st.id)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer w-3.5 h-3.5"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                      {st.id}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xs shrink-0 border border-amber-200">
                          {st.holyName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                            <span>{st.holyName} {st.fullName}</span>
                            {specialPromotions.some(sp => sp.studentId === st.id) && (
                              <span 
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 text-[10px] font-bold border border-purple-300"
                                title="Học sinh được Cha Quản Sở & Quản Trị Viên đặc cách lên thẳng lớp trên"
                              >
                                <Crown className="w-3 h-3 text-amber-500" />
                                Đặc cách
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">{st.address}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-blue-900 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[11px]">
                        {getClassName(st.classId)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div>{new Date(st.dob).toLocaleDateString('vi-VN')}</div>
                      <span className={`text-[10px] font-medium ${st.gender === 'Nam' ? 'text-blue-600' : 'text-pink-600'}`}>
                        {st.gender}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="text-slate-700 font-medium">{st.subParish}</span>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800">{st.parentName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{st.parentPhone}</div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        <span 
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            st.baptismDate 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-400'
                          }`}
                          title={st.baptismDate ? `Rửa tội: ${st.baptismDate}` : 'Chưa cập nhật'}
                        >
                          Rửa Tội
                        </span>
                        <span 
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            st.firstCommunionDate 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'bg-slate-100 text-slate-400'
                          }`}
                          title={st.firstCommunionDate ? `Rước lễ: ${st.firstCommunionDate}` : 'Chưa lãnh nhận'}
                        >
                          Rước Lễ
                        </span>
                        <span 
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            st.confirmationDate 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                              : 'bg-slate-100 text-slate-400'
                          }`}
                          title={st.confirmationDate ? `Thêm sức: ${st.confirmationDate}` : 'Chưa lãnh nhận'}
                        >
                          Thêm Sức
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {/* Open Report Book */}
                        <button
                          onClick={() => onOpenReportBook(st)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title="Xem Sổ Liên Lạc"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>

                        {/* Print Single Student ATM Card & QR */}
                        <button
                          onClick={() => onOpenCardModal(st.classId, [st.id])}
                          className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded"
                          title="In Thẻ ATM & QR cho em này"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Special Promotion for Admin or Pastor */}
                        {(userRole === 'admin' || userRole === 'pastor') && onOpenSpecialPromotion && (
                          <button
                            onClick={() => onOpenSpecialPromotion(st)}
                            className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded"
                            title="Xét đặc cách lên thẳng lớp trên"
                          >
                            <Crown className="w-4 h-4" />
                          </button>
                        )}

                        {/* Transfer single student */}
                        {canEdit && (
                          <button
                            onClick={() => onOpenTransferModal(st)}
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded"
                            title="Chuyển lớp cho học sinh này"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                        )}

                        {/* Edit */}
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(st)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="Chỉnh sửa hồ sơ"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete (Admin only) */}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc chắn muốn xóa học sinh ${st.holyName} ${st.fullName}?`)) {
                                onDeleteStudent(st.id);
                              }
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Xóa hồ sơ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-auto border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white rounded-t-xl">
              <h2 className="text-sm font-bold uppercase tracking-wider">
                {editingStudent ? 'Cập Nhật Hồ Sơ Học Sinh' : 'Tiếp Nhận Thiếu Nhi Mới'}
              </h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tên Thánh (*):</label>
                  <input
                    type="text"
                    required
                    placeholder="vd: Maria, Giuse, Têrêsa..."
                    value={formData.holyName}
                    onChange={(e) => setFormData({ ...formData, holyName: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1">Họ và Tên (*):</label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập họ và tên đầy đủ"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Giới tính:</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Nam' | 'Nữ' })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ngày sinh:</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Xếp vào lớp:</label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Giáo họ / Khu xóm:</label>
                  <input
                    type="text"
                    placeholder="vd: Giáo họ Don Bosco, Fatima..."
                    value={formData.subParish}
                    onChange={(e) => setFormData({ ...formData, subParish: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Địa chỉ cư trú:</label>
                  <input
                    type="text"
                    placeholder="Địa chỉ tại Đà Lạt"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              {/* Sacramental Milestones */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2">
                <div className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                  <Church className="w-3.5 h-3.5 text-amber-700" />
                  <span>Các Mốc Bí Tích Đã Lãnh Nhận</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-0.5">Ngày Rửa Tội:</label>
                    <input
                      type="date"
                      value={formData.baptismDate}
                      onChange={(e) => setFormData({ ...formData, baptismDate: e.target.value })}
                      className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-0.5">Rước Lễ Lần Đầu:</label>
                    <input
                      type="date"
                      value={formData.firstCommunionDate}
                      onChange={(e) => setFormData({ ...formData, firstCommunionDate: e.target.value })}
                      className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-0.5">Bí Tích Thêm Sức:</label>
                    <input
                      type="date"
                      value={formData.confirmationDate}
                      onChange={(e) => setFormData({ ...formData, confirmationDate: e.target.value })}
                      className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 text-[11px] mb-0.5">Người Đỡ Đầu:</label>
                  <input
                    type="text"
                    placeholder="Tên Thánh và họ tên người đỡ đầu"
                    value={formData.godParentName}
                    onChange={(e) => setFormData({ ...formData, godParentName: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-xs"
                  />
                </div>
              </div>

              {/* Parents Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Họ Tên Phụ Huynh:</label>
                  <input
                    type="text"
                    placeholder="Cha / Mẹ học sinh"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Số ĐT Phụ Huynh (*):</label>
                  <input
                    type="tel"
                    placeholder="09xx xxx xxx"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Email Phụ Huynh:</label>
                  <input
                    type="email"
                    placeholder="email@gmail.com"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Ghi chú đặc biệt / Sức khỏe:</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về học tập, hoàn cảnh gia đình..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-xs"
                >
                  {editingStudent ? 'Lưu Thay Đổi' : 'Tiếp Nhận Vào Hệ Thống'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {isBatchImportOpen && (
        <BatchImportModal
          classes={classes}
          existingStudents={students}
          onImport={(newStudents) => {
            onBatchImportStudents(newStudents);
            setIsBatchImportOpen(false);
          }}
          onClose={() => setIsBatchImportOpen(false)}
        />
      )}

      {/* Batch Field Clear Modal (Admin Only) */}
      {isBatchClearOpen && (
        <BatchFieldClearModal
          userRole={userRole}
          classes={classes}
          students={students}
          selectedStudentIds={selectedStudentIds}
          onExecuteBatchClear={(scope, options) => {
            onExecuteBatchClear(scope, options);
            setSelectedStudentIds([]);
            setIsBatchClearOpen(false);
          }}
          onClose={() => setIsBatchClearOpen(false)}
        />
      )}
    </div>
  );
};
