import React, { useState, useRef } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Info, 
  HelpCircle,
  Clock,
  MapPin,
  Users
} from 'lucide-react';
import { CalendarEvent } from '../types';
import { 
  exportCalendarTemplateToExcel, 
  exportCalendarEventsToExcel, 
  parseCalendarEventsFromExcel 
} from '../utils/excelExport';

interface CalendarExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  onBatchAddEvents: (newEvents: Omit<CalendarEvent, 'id'>[], replaceExisting: boolean) => void;
  defaultTab?: 'export_template' | 'import_excel' | 'export_current';
}

export const CalendarExcelModal: React.FC<CalendarExcelModalProps> = ({
  isOpen,
  onClose,
  events,
  onBatchAddEvents,
  defaultTab = 'export_template',
}) => {
  const [activeTab, setActiveTab] = useState<'export_template' | 'import_excel' | 'export_current'>(defaultTab);

  // Template Export State
  const [academicYear, setAcademicYear] = useState('2026 - 2027');
  const [includeSampleData, setIncludeSampleData] = useState(true);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedEvents, setParsedEvents] = useState<Omit<CalendarEvent, 'id'>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [totalRowsRead, setTotalRowsRead] = useState(0);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isImportSuccess, setIsImportSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle template download
  const handleDownloadTemplate = () => {
    exportCalendarTemplateToExcel({
      includeSampleData,
      academicYear,
      filename: `Mau_Nhap_NienLich_GiaoLy_DonBosco_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`,
    });
  };

  // Handle exporting current events
  const handleExportCurrent = () => {
    exportCalendarEventsToExcel(events, {
      academicYear,
    });
  };

  // Handle file selection and parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setIsParsing(true);
    setIsImportSuccess(false);
    setParseErrors([]);

    try {
      const result = await parseCalendarEventsFromExcel(file);
      setParsedEvents(result.events);
      setParseErrors(result.errors);
      setTotalRowsRead(result.totalRows);
    } catch (err: any) {
      setParseErrors([err.message || 'Không thể đọc tệp Excel. Vui lòng kiểm tra lại định dạng tệp.']);
      setParsedEvents([]);
    } finally {
      setIsParsing(false);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setImportFile(file);
    setIsParsing(true);
    setIsImportSuccess(false);
    setParseErrors([]);

    try {
      const result = await parseCalendarEventsFromExcel(file);
      setParsedEvents(result.events);
      setParseErrors(result.errors);
      setTotalRowsRead(result.totalRows);
    } catch (err: any) {
      setParseErrors([err.message || 'Không thể đọc tệp Excel. Vui lòng kiểm tra lại định dạng tệp.']);
      setParsedEvents([]);
    } finally {
      setIsParsing(false);
    }
  };

  // Execute bulk import
  const handleExecuteImport = () => {
    if (parsedEvents.length === 0) return;

    const count = parsedEvents.length;
    onBatchAddEvents(parsedEvents, importMode === 'replace');
    setImportedCount(count);
    setIsImportSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Quản Lý Niên Lịch Bằng Excel (.xlsx)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Xuất file mẫu chuẩn, nhập lịch hàng loạt năm học mới hoặc sao lưu niên lịch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-2 gap-4 text-xs font-semibold">
          <button
            id="tab-export-template"
            onClick={() => { setActiveTab('export_template'); setIsImportSuccess(false); }}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'export_template'
                ? 'border-emerald-600 text-emerald-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>1. Xuất Mẫu Excel Nhập Lịch</span>
          </button>

          <button
            id="tab-import-excel"
            onClick={() => setActiveTab('import_excel')}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'import_excel'
                ? 'border-emerald-600 text-emerald-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>2. Nhập Lịch Hàng Loạt Từ Excel</span>
            {parsedEvents.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                {parsedEvents.length}
              </span>
            )}
          </button>

          <button
            id="tab-export-current"
            onClick={() => { setActiveTab('export_current'); setIsImportSuccess(false); }}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'export_current'
                ? 'border-emerald-600 text-emerald-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>3. Xuất Niên Lịch Hiện Tại ({events.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 text-xs space-y-4">
          {/* TAB 1: EXPORT TEMPLATE */}
          {activeTab === 'export_template' && (
            <div className="space-y-5">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="font-bold text-emerald-950 text-sm">
                      Mẫu Excel Nhập Niên Lịch Chuẩn Don Bosco Đà Lạt
                    </h3>
                    <p className="text-emerald-900 leading-relaxed text-[11px]">
                      Tệp Excel (.xlsx) được thiết kế đặc biệt gồm 2 trang tính:
                      <br />• <strong>Sheet 1 ("Mau_Nhap_NienLich"):</strong> Chứa đầy đủ các cột chuẩn hóa từ ngày tháng, thứ trong tuần, loại sự kiện, bậc lễ, tình trạng học, lớp bí tích, đến thời gian, địa điểm và nội dung chương trình.
                      <br />• <strong>Sheet 2 ("Huong_Dan_Nhap_Lieu"):</strong> Bản giải thích chi tiết quy tắc nhập liệu, các giá trị hợp lệ để Ban Giáo Lý dễ dàng điền hoặc bàn giao cho các khối lớp.
                    </p>
                  </div>
                </div>
              </div>

              {/* Template Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <label className="font-bold text-slate-800 block">Niên Khóa Áp Dụng:</label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="Ví dụ: 2026 - 2027"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                  <p className="text-[11px] text-slate-500">
                    Tên niên khóa sẽ được gắn tự động vào tiêu đề tệp tải về.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <label className="font-bold text-slate-800 block">Nội Dung Gợi Ý Trong Mẫu:</label>
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="sampleOption"
                        checked={includeSampleData}
                        onChange={() => setIncludeSampleData(true)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>
                        <strong>Kèm 15 sự kiện mẫu thực tế</strong> (Khai giảng, Lớp Bí Tích, Tĩnh tâm, Thi HK1, Giáng Sinh, Tết, Rước Lễ, Thêm Sức, Bế giảng)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="sampleOption"
                        checked={!includeSampleData}
                        onChange={() => setIncludeSampleData(false)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>
                        <strong>Mẫu trống</strong> (Chỉ gồm 1 dòng mẫu cơ bản để tự điền từ đầu)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Columns Table Preview */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>Cấu Trúc Các Cột Chuẩn Trong File Excel:</span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2 w-10">STT</th>
                        <th className="p-2">Tên Cột</th>
                        <th className="p-2">Bắt Buộc</th>
                        <th className="p-2">Ví Dụ Dữ Liệu</th>
                        <th className="p-2">Ghi Chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      <tr>
                        <td className="p-2 font-mono">1</td>
                        <td className="p-2 font-semibold text-slate-900">Ngày (YYYY-MM-DD)</td>
                        <td className="p-2 text-rose-600 font-bold">Bắt buộc</td>
                        <td className="p-2 font-mono text-emerald-800">2026-09-06 hoặc 06/09/2026</td>
                        <td className="p-2">Hệ thống nhận diện cả ngày dạng chuỗi hoặc số serial Excel</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">2</td>
                        <td className="p-2 font-semibold text-slate-900">Thứ</td>
                        <td className="p-2 text-slate-400">Tùy chọn</td>
                        <td className="p-2 font-mono text-emerald-800">CN, HAI, BA, TƯ, NĂM, SÁU, BẢY</td>
                        <td className="p-2">Tự động tính nếu để trống</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">3</td>
                        <td className="p-2 font-semibold text-slate-900">Tên Sự Kiện / Tiêu Đề</td>
                        <td className="p-2 text-rose-600 font-bold">Bắt buộc</td>
                        <td className="p-2 text-slate-800">ĐẠI LỄ KHAI GIẢNG NĂM HỌC GIÁO LÝ</td>
                        <td className="p-2">Tiêu đề chính hiển thị trên niên lịch</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">4</td>
                        <td className="p-2 font-semibold text-slate-900">Loại Sự Kiện</td>
                        <td className="p-2 text-slate-400">Tùy chọn</td>
                        <td className="p-2 text-slate-800">Giảng Dạy / Tĩnh Tâm / Họp / Huấn Luyện</td>
                        <td className="p-2">Mặc định: Giảng Dạy</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">5</td>
                        <td className="p-2 font-semibold text-slate-900">Ý Lễ / Phụng Vụ</td>
                        <td className="p-2 text-slate-400">Tùy chọn</td>
                        <td className="p-2 text-slate-800">CN XXIV Thường Niên A - Bổn Mạng Giáo Sở</td>
                        <td className="p-2">Tên Thánh lễ theo lịch Phụng Vụ Công Giáo</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">6</td>
                        <td className="p-2 font-semibold text-slate-900">Bậc Lễ</td>
                        <td className="p-2 text-slate-400">Tùy chọn</td>
                        <td className="p-2 font-mono text-emerald-800">T (Trọng), K (Kính), N (Nhớ)</td>
                        <td className="p-2">Để trống nếu là lễ Thường Niên</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">7</td>
                        <td className="p-2 font-semibold text-slate-900">Tình Trạng Học</td>
                        <td className="p-2 text-slate-400">Tùy chọn</td>
                        <td className="p-2 text-slate-800">Học / Nghỉ / Tập trung / Tổng kết</td>
                        <td className="p-2">Trạng thái có học giáo lý hay nghỉ lễ/Tết</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">8</td>
                        <td className="p-2 font-semibold text-slate-900">Lớp Bí Tích</td>
                        <td className="p-2 text-slate-400">Tùy chọn</td>
                        <td className="p-2 text-slate-800">Có / Không (hoặc x)</td>
                        <td className="p-2">Dành riêng cho Sơ Cấp 2 và Căn Bản 4</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">9-11</td>
                        <td className="p-2 font-semibold text-slate-900">Giờ BĐ / Giờ KT / Địa Điểm</td>
                        <td className="p-2 text-slate-400">Tùy chọn</td>
                        <td className="p-2">07:30 - 10:30 | Nhà thờ Don Bosco Đà Lạt</td>
                        <td className="p-2">Địa điểm tổ chức và khung giờ tham dự</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Download Action */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                <div className="text-[11px] text-slate-500">
                  Định dạng tệp: <strong>Microsoft Excel Worksheet (.xlsx)</strong>, tương thích với Excel, Google Sheets, Numbers.
                </div>
                <button
                  type="button"
                  id="download-template-excel-btn"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải Tệp Mẫu Excel (.xlsx) Ngay</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT EXCEL */}
          {activeTab === 'import_excel' && (
            <div className="space-y-4">
              {isImportSuccess ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-emerald-950">
                    Nhập Niên Lịch Thành Công!
                  </h3>
                  <p className="text-xs text-emerald-900 max-w-md mx-auto">
                    Đã nạp thành công <strong>{importedCount} sự kiện</strong> vào Niên lịch năm học mới của hệ thống. Quý Thầy/Quý GLV có thể theo dõi và lọc sự kiện ngay trên bảng lịch.
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setImportFile(null);
                        setParsedEvents([]);
                        setIsImportSuccess(false);
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                    >
                      Nhập Thêm Tệp Khác
                    </button>
                    <button
                      onClick={onClose}
                      className="px-4 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800"
                    >
                      Đóng Cửa Sổ & Xem Lịch
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Drag & Drop Upload Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                      importFile 
                        ? 'border-emerald-500 bg-emerald-50/40' 
                        : 'border-slate-300 hover:border-emerald-600 bg-slate-50/60 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-3 shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>

                    {importFile ? (
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-emerald-950 flex items-center justify-center gap-1.5">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                          <span>{importFile.name}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {(importFile.size / 1024).toFixed(1)} KB — Bấm để chọn tệp khác
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-slate-800">
                          Kéo thả tệp Excel (.xlsx) vào đây hoặc bấm để chọn tệp
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Hỗ trợ tệp định dạng .xlsx, .xls hoặc .csv (theo mẫu file Excel ở Tab 1)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Errors display */}
                  {parseErrors.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Lưu Ý / Cảnh Báo Khi Phân Tích Dữ Liệu ({parseErrors.length}):</span>
                      </div>
                      <ul className="list-disc list-inside text-[11px] text-amber-800 max-h-24 overflow-y-auto space-y-0.5">
                        {parseErrors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Preview of Parsed Events */}
                  {parsedEvents.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Đã nhận diện {parsedEvents.length} sự kiện hợp lệ (từ {totalRowsRead} dòng dữ liệu)</span>
                        </div>

                        {/* Import Mode: Append or Replace */}
                        <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-lg text-[11px]">
                          <span className="font-semibold text-slate-700">Chế độ nhập:</span>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="importMode"
                              checked={importMode === 'append'}
                              onChange={() => setImportMode('append')}
                              className="text-emerald-600"
                            />
                            <span>Thêm vào lịch hiện tại (+{parsedEvents.length})</span>
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer text-rose-700">
                            <input
                              type="radio"
                              name="importMode"
                              checked={importMode === 'replace'}
                              onChange={() => setImportMode('replace')}
                              className="text-rose-600"
                            />
                            <span className="font-semibold">Thay thế toàn bộ niên lịch cũ</span>
                          </label>
                        </div>
                      </div>

                      {/* Preview Table */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto shadow-2xs">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                            <tr>
                              <th className="p-2 w-10">STT</th>
                              <th className="p-2 w-24">Ngày</th>
                              <th className="p-2 w-12">Thứ</th>
                              <th className="p-2">Tên Sự Kiện / Tiêu Đề</th>
                              <th className="p-2 w-24">Loại</th>
                              <th className="p-2 w-16">Bậc Lễ</th>
                              <th className="p-2 w-20">Trạng Thái</th>
                              <th className="p-2 w-16">Bí Tích</th>
                              <th className="p-2 w-28">Thời Gian</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {parsedEvents.map((ev, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2 font-mono text-slate-400">{i + 1}</td>
                                <td className="p-2 font-mono font-semibold text-emerald-900">{ev.date}</td>
                                <td className="p-2 font-bold text-blue-900">{ev.dayOfWeek}</td>
                                <td className="p-2">
                                  <div className="font-semibold text-slate-900">{ev.title}</div>
                                  {ev.feastName && ev.feastName !== ev.title && (
                                    <div className="text-[10px] text-slate-500 italic">{ev.feastName}</div>
                                  )}
                                </td>
                                <td className="p-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    ev.type === 'retreat' ? 'bg-purple-100 text-purple-900' :
                                    ev.type === 'meeting' ? 'bg-amber-100 text-amber-900' :
                                    ev.type === 'training' ? 'bg-emerald-100 text-emerald-900' :
                                    'bg-blue-100 text-blue-900'
                                  }`}>
                                    {ev.type === 'retreat' ? 'Tĩnh Tâm' :
                                     ev.type === 'meeting' ? 'Họp' :
                                     ev.type === 'training' ? 'Huấn Luyện' : 'Giảng Dạy'}
                                  </span>
                                </td>
                                <td className="p-2 font-mono font-bold text-amber-700">{ev.liturgyRank || '-'}</td>
                                <td className="p-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    ev.academicStatus === 'Nghỉ' ? 'bg-rose-100 text-rose-800' :
                                    ev.academicStatus === 'Tập trung' ? 'bg-amber-100 text-amber-800' :
                                    ev.academicStatus === 'Tổng kết' ? 'bg-purple-100 text-purple-800' :
                                    'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {ev.academicStatus || 'Học'}
                                  </span>
                                </td>
                                <td className="p-2">
                                  {ev.isSacramentOnly ? (
                                    <span className="text-amber-800 font-bold bg-amber-50 px-1 rounded border border-amber-200">
                                      Có
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="p-2 font-mono text-[10px] text-slate-500">
                                  {ev.startTime} - {ev.endTime}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Confirm Import Button */}
                      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                        <span className="text-[11px] text-slate-500">
                          {importMode === 'replace' ? (
                            <span className="text-rose-700 font-semibold">
                              ⚠️ Chú ý: Lịch cũ ({events.length} sự kiện) sẽ được thay thế bằng {parsedEvents.length} sự kiện mới từ Excel.
                            </span>
                          ) : (
                            <span>
                              Sẽ bổ sung thêm {parsedEvents.length} sự kiện vào lịch hiện tại ({events.length} sự kiện).
                            </span>
                          )}
                        </span>

                        <button
                          type="button"
                          id="confirm-batch-import-btn"
                          onClick={handleExecuteImport}
                          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer text-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Xác Nhận Nhập {parsedEvents.length} Sự Kiện Vào Niên Lịch</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 3: EXPORT CURRENT CALENDAR */}
          {activeTab === 'export_current' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-bold text-blue-950 text-sm">
                    Xuất Bảng Niên Lịch Hiện Có Sang Tệp Excel (.xlsx)
                  </h3>
                  <p className="text-blue-900 leading-relaxed text-[11px]">
                    Hệ thống sẽ tổng hợp toàn bộ <strong>{events.length} sự kiện</strong> hiện có trong niên lịch (gồm lịch giảng dạy, tĩnh tâm phụng vụ, lịch họp GLV và huấn luyện) thành tệp bảng tính Excel có định dạng chuẩn. Bạn có thể mở tệp này để chỉnh sửa offline rồi nhập lại bất cứ lúc nào.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/60">
                <h4 className="font-bold text-slate-800">Thống Kê Các Sự Kiện Sắp Xuất:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="text-[11px] text-slate-500 block">Tổng số sự kiện</span>
                    <span className="text-base font-bold text-slate-900">{events.length}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-blue-200 rounded-lg">
                    <span className="text-[11px] text-blue-700 block">Lịch Giảng Dạy</span>
                    <span className="text-base font-bold text-blue-950">
                      {events.filter(e => !e.type || e.type === 'teaching').length}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white border border-purple-200 rounded-lg">
                    <span className="text-[11px] text-purple-700 block">Tĩnh Tâm & Phụng Vụ</span>
                    <span className="text-base font-bold text-purple-950">
                      {events.filter(e => e.type === 'retreat').length}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white border border-amber-200 rounded-lg">
                    <span className="text-[11px] text-amber-700 block">Họp GLV & Huấn Luyện</span>
                    <span className="text-base font-bold text-amber-950">
                      {events.filter(e => e.type === 'meeting' || e.type === 'training').length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  id="export-current-calendar-btn"
                  onClick={handleExportCurrent}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer text-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất Toàn Bộ Niên Lịch (.xlsx)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="text-slate-500 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Mẫu Excel tương thích chuẩn Microsoft Excel & Google Sheets</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
