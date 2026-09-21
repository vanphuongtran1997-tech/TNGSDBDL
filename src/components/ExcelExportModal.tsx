import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Download, 
  CheckSquare, 
  Check, 
  Layers, 
  Users, 
  Award,
  Sparkles,
  Filter
} from 'lucide-react';
import { 
  Student, 
  ClassRoom, 
  GradeRecord, 
  ConductRecord, 
  AttendanceRecord, 
  SpecialPromotion 
} from '../types';
import { exportStudentsToExcel, exportGradesToExcel } from '../utils/excelExport';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  filteredStudents?: Student[];
  selectedStudentIds?: string[];
  classes: ClassRoom[];
  grades: GradeRecord[];
  conducts: ConductRecord[];
  attendanceRecords: AttendanceRecord[];
  specialPromotions?: SpecialPromotion[];
  defaultType?: 'students' | 'grades' | 'all';
  currentClassId?: string;
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  students,
  filteredStudents = students,
  selectedStudentIds = [],
  classes,
  grades,
  conducts,
  attendanceRecords,
  specialPromotions = [],
  defaultType = 'students',
  currentClassId = 'all',
}) => {
  const [exportType, setExportType] = useState<'students' | 'grades' | 'combined'>(
    defaultType === 'grades' ? 'grades' : 'students'
  );
  const [targetScope, setTargetScope] = useState<'selected' | 'filtered' | 'all'>(
    selectedStudentIds.length > 0 ? 'selected' : 'all'
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(currentClassId);
  const [selectedSemester, setSelectedSemester] = useState<1 | 2 | 'yearly'>('yearly');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  // Compute student list based on selected scope
  const getExportStudents = () => {
    if (targetScope === 'selected' && selectedStudentIds.length > 0) {
      return students.filter(s => selectedStudentIds.includes(s.id));
    }
    if (targetScope === 'filtered') {
      return filteredStudents;
    }
    if (selectedClassId !== 'all') {
      return students.filter(s => s.classId === selectedClassId);
    }
    return students;
  };

  const handleExport = () => {
    const studentsToExport = getExportStudents();
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    if (exportType === 'students') {
      exportStudentsToExcel(studentsToExport, classes, {
        filename: `DanhSach_HocSinh_DonBosco_${dateStr}.xlsx`,
        sheetTitle: 'Danh Sách Học Sinh',
      });
    } else if (exportType === 'grades') {
      exportGradesToExcel(
        studentsToExport,
        classes,
        grades,
        conducts,
        attendanceRecords,
        specialPromotions,
        {
          classId: selectedClassId,
          semester: selectedSemester,
          filename: `BangDiem_GiaoLy_DonBosco_${selectedSemester === 'yearly' ? 'CaNam' : `HK${selectedSemester}`}_${dateStr}.xlsx`,
        }
      );
    } else {
      // Combined: both student list and full yearly grades
      exportGradesToExcel(
        studentsToExport,
        classes,
        grades,
        conducts,
        attendanceRecords,
        specialPromotions,
        {
          classId: selectedClassId,
          semester: 'yearly',
          filename: `HoSo_HocSinh_Va_BangDiem_DonBosco_${dateStr}.xlsx`,
        }
      );
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  const exportCount = getExportStudents().length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700/60 rounded-xl border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Xuất Dữ Liệu Sang Tệp Excel (.xlsx)</h2>
              <p className="text-xs text-emerald-200/90">
                Phục vụ lưu trữ, in ấn và báo cáo ngoài hệ thống cho Giáo Sở
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Export Type Tabs */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-xs">
              Chọn Nội Dung Muốn Xuất:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setExportType('students')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  exportType === 'students'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Users className={`w-5 h-5 ${exportType === 'students' ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>Danh Sách Học Sinh</span>
              </button>

              <button
                type="button"
                onClick={() => setExportType('grades')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  exportType === 'grades'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Award className={`w-5 h-5 ${exportType === 'grades' ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>Bảng Điểm & Học Lực</span>
              </button>

              <button
                type="button"
                onClick={() => setExportType('combined')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  exportType === 'combined'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Layers className={`w-5 h-5 ${exportType === 'combined' ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>Tổng Hợp Đầy Đủ</span>
              </button>
            </div>
          </div>

          {/* Scope Selector */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-xs">
              Phạm Vi Học Sinh:
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="targetScope"
                  checked={targetScope === 'all'}
                  onChange={() => setTargetScope('all')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1 flex justify-between items-center">
                  <span className="font-medium text-slate-800">Toàn bộ học sinh hệ thống</span>
                  <span className="text-slate-500 font-semibold">{students.length} em</span>
                </div>
              </label>

              {filteredStudents.length !== students.length && (
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="targetScope"
                    checked={targetScope === 'filtered'}
                    onChange={() => setTargetScope('filtered')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1 flex justify-between items-center">
                    <span className="font-medium text-slate-800">Theo bộ lọc hiện tại trên màn hình</span>
                    <span className="text-slate-500 font-semibold">{filteredStudents.length} em</span>
                  </div>
                </label>
              )}

              {selectedStudentIds.length > 0 && (
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer">
                  <input
                    type="radio"
                    name="targetScope"
                    checked={targetScope === 'selected'}
                    onChange={() => setTargetScope('selected')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1 flex justify-between items-center">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
                      Chỉ các học sinh đang được tích chọn
                    </span>
                    <span className="text-emerald-800 font-bold">{selectedStudentIds.length} em</span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Additional Filter by Class (if scope is 'all') */}
          {targetScope === 'all' && (
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Lọc Theo Lớp Cụ Thể (Tùy Chọn):
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-800 font-medium"
              >
                <option value="all">Tất Cả Các Lớp Giáo Lý (Toàn Giáo Sở)</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.isSacramentClass ? '★ (Bí Tích)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Semester Selector (when exporting grades) */}
          {(exportType === 'grades' || exportType === 'combined') && (
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Kỳ Học Cần Xuất Điểm:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
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
                  type="button"
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
                  type="button"
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
          )}

          {/* Info Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600 space-y-1 text-[11px]">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Đặc Điểm Định Dạng Tệp Excel (.xlsx):</span>
            </div>
            <p>
              • Tương thích hoàn toàn với Microsoft Excel 2010 - 2024, Google Sheets, LibreOffice Calc và Numbers (macOS).
            </p>
            <p>
              • Tự động căn chỉnh độ rộng cột chuẩn xác, mã hóa tiếng Việt có dấu Unicode không bị lỗi font chữ.
            </p>
            <p>
              • Đính kèm đầy đủ điểm Giữa kỳ, Thi học kỳ, Điểm thi lại, Chuyên cần, Hạnh kiểm, Xếp loại và Kết quả lên lớp.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <div className="text-xs text-slate-600 font-medium">
            Sẽ xuất: <strong className="text-emerald-800 font-bold">{exportCount} học sinh</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Hủy Bỏ
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={exportCount === 0 || isSuccess}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                isSuccess
                  ? 'bg-emerald-600 text-white'
                  : exportCount === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white hover:shadow-md'
              }`}
            >
              {isSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Đã Xuất Thành Công!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Tải Tệp Excel (.xlsx) Ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
