import React, { useEffect, useState, useMemo } from 'react';
import { 
  X, Printer, Download, CheckSquare, Square, 
  Search, ExternalLink, Image as ImageIcon, SlidersHorizontal,
  Check, RefreshCw, Sparkles, AlertCircle, Info, Eye, EyeOff
} from 'lucide-react';
import { Student, ClassRoom } from '../types';
import { generateQRCodeDataUrl } from '../utils/qrHelper';
import { 
  CardPrintOptions, 
  generateCardPrintHtml, 
  printViaIsolatedIframe, 
  openPrintTab, 
  downloadPrintHtmlFile, 
  downloadCardAsPng 
} from '../utils/studentCardHtmlGenerator';

interface StudentCardModalProps {
  students: Student[];
  classes: ClassRoom[];
  selectedClassId?: string;
  initialStudentIds?: string[];
  onClose: () => void;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({
  students,
  classes,
  selectedClassId,
  initialStudentIds,
  onClose,
}) => {
  // Filter and Selection State
  const [filterClassId, setFilterClassId] = useState<string>(selectedClassId || 'all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>(initialStudentIds || []);

  // Card Appearance & Print Options (CR-80 ATM Standard: 85.6mm x 54mm)
  const [printMode, setPrintMode] = useState<'a4_sheet' | 'cr80_single'>('a4_sheet');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [sides, setSides] = useState<'front_only' | 'both_sides' | 'back_only'>('front_only');
  const [theme, setTheme] = useState<'classic' | 'modern' | 'eco'>('classic');
  const [showCutGuides, setShowCutGuides] = useState<boolean>(true);
  const [showParentPhone, setShowParentPhone] = useState<boolean>(true);
  const [showLanyardHole, setShowLanyardHole] = useState<boolean>(false);
  const [previewActualScale, setPreviewActualScale] = useState<boolean>(false);
  const [previewFlipMap, setPreviewFlipMap] = useState<Record<string, boolean>>({});

  // QR Generation State
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isGeneratingQRs, setIsGeneratingQRs] = useState<boolean>(false);
  const [qrProgress, setQrProgress] = useState<number>(0);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [exportingPngId, setExportingPngId] = useState<string | null>(null);

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = filterClassId === 'all' || s.classId === filterClassId;
      if (!matchClass) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        s.fullName.toLowerCase().includes(term) ||
        s.holyName.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term)
      );
    });
  }, [students, filterClassId, searchTerm]);

  // If initialStudentIds wasn't provided, select all filtered students on class filter change
  useEffect(() => {
    if (initialStudentIds && initialStudentIds.length > 0) {
      setSelectedIds(initialStudentIds);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  }, [filterClassId]);

  // Generate QR codes for all students
  useEffect(() => {
    let isCancelled = false;
    async function loadQRs() {
      setIsGeneratingQRs(true);
      const map: Record<string, string> = {};
      const targetList = students;
      const total = targetList.length;

      for (let i = 0; i < total; i++) {
        if (isCancelled) return;
        const st = targetList[i];
        // QR payload: standard student ID for crisp scan and maximal reading speed
        // e.g. DBS-KT-001 or DBS:DBS-KT-001:FullName
        const payload = `DBS:${st.id}:${st.fullName}`;
        const url = await generateQRCodeDataUrl(payload, {
          width: 380,
          margin: 1,
          darkColor: '#000000',
        });
        map[st.id] = url;
        if (i % 5 === 0 || i === total - 1) {
          setQrProgress(Math.round(((i + 1) / total) * 100));
        }
      }

      if (!isCancelled) {
        setQrMap(map);
        setIsGeneratingQRs(false);
      }
    }

    loadQRs();
    return () => {
      isCancelled = true;
    };
  }, [students]);

  const selectedStudents = useMemo(() => {
    return students.filter(s => selectedIds.includes(s.id));
  }, [students, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  const getClassName = (cid: string) => {
    return classes.find(c => c.id === cid)?.name || cid;
  };

  // Build print options object
  const currentPrintOptions: CardPrintOptions = {
    mode: printMode,
    orientation,
    sides,
    theme,
    showCutGuides,
    showParentPhone,
    showLanyardHole,
    academicYear: '2026 - 2027',
  };

  // Generate HTML for printing
  const printableHtml = useMemo(() => {
    return generateCardPrintHtml(
      selectedStudents,
      classes,
      qrMap,
      currentPrintOptions
    );
  }, [selectedStudents, classes, qrMap, currentPrintOptions]);

  // Execution: In thẻ trực tiếp qua isolated iframe (không bị vướng modal, không bị lỗi iframe)
  const handleDirectPrint = async () => {
    if (selectedStudents.length === 0) return;
    setIsPrinting(true);

    try {
      const success = await printViaIsolatedIframe(printableHtml);
      if (!success) {
        // Fallback 1: Thử mở tab mới
        const opened = openPrintTab(printableHtml);
        if (!opened) {
          // Fallback 2: Tải file HTML
          downloadPrintHtmlFile(printableHtml);
        }
      }
    } finally {
      setIsPrinting(false);
    }
  };

  // Execution: Mở trong tab mới
  const handleOpenNewTab = () => {
    if (selectedStudents.length === 0) return;
    const opened = openPrintTab(printableHtml);
    if (!opened) {
      downloadPrintHtmlFile(printableHtml);
    }
  };

  // Execution: Tải file HTML offline
  const handleDownloadHtml = () => {
    if (selectedStudents.length === 0) return;
    downloadPrintHtmlFile(printableHtml);
  };

  // Execution: Tải ảnh thẻ PNG đơn lẻ
  const handleDownloadSinglePng = async (st: Student) => {
    setExportingPngId(st.id);
    try {
      const qrUrl = qrMap[st.id] || '';
      const clsName = getClassName(st.classId);
      await downloadCardAsPng(st, clsName, qrUrl);
    } catch (err) {
      console.error('PNG export failed', err);
    } finally {
      setExportingPngId(null);
    }
  };

  const toggleFlip = (stId: string) => {
    setPreviewFlipMap(prev => ({
      ...prev,
      [stId]: !prev[stId],
    }));
  };

  return (
    <div id="student-card-modal-root" className="modal-backdrop-screen fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="modal-dialog-screen bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col my-auto border border-slate-200 overflow-hidden">
        
        {/* TOP BAR: Title & Primary Print Actions */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              ✝
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">
                  In Thẻ Học Sinh &amp; Mã QR Điểm Danh
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 tracking-wider">
                  CHUẨN THẺ ATM (85.6 × 54 mm)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Kích thước thẻ ngân hàng CR-80 tiêu chuẩn quốc tế • Đeo dây hoặc bỏ ví • Quét điểm danh tự động
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Print Button */}
            <button
              id="btn-direct-print-cards"
              type="button"
              onClick={handleDirectPrint}
              disabled={selectedIds.length === 0 || isPrinting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="In trực tiếp"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Đang chuẩn bị...' : `In Ngay (${selectedIds.length} thẻ)`}</span>
            </button>

            {/* Open in New Tab Button (Guaranteed to work in all browsers and iframes) */}
            <button
              id="btn-open-print-tab"
              type="button"
              onClick={handleOpenNewTab}
              disabled={selectedIds.length === 0}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Mở toàn màn hình trong tab mới để in"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở Tab In Mới</span>
            </button>

            {/* Download Standalone HTML */}
            <button
              id="btn-download-print-html"
              type="button"
              onClick={handleDownloadHtml}
              disabled={selectedIds.length === 0}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs flex items-center gap-1.5 border border-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Tải file HTML hoàn chỉnh để in trên máy khác không cần mạng"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải File HTML</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTROLS & SETTINGS TOOLBAR */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 space-y-3">
          {/* Row 1: Search, Filter, Select All */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              {/* Class selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">Lớp:</span>
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="all">Tất cả các lớp ({students.length})</option>
                  {classes.map(c => {
                    const count = students.filter(s => s.classId === c.id).length;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({count} em)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Search box */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên thánh, họ tên hoặc mã số..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 text-xs placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Select All Toggle */}
              <button
                type="button"
                onClick={toggleAll}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {selectedIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Bỏ chọn ({filteredStudents.length})</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>Chọn tất cả ({filteredStudents.length})</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-slate-500 font-medium">
                Đã chọn: <strong className="text-blue-700">{selectedIds.length}</strong> / {filteredStudents.length} học sinh
              </span>
            </div>

            {/* QR Code Status */}
            <div className="flex items-center gap-2">
              {isGeneratingQRs ? (
                <div className="flex items-center gap-1.5 text-amber-600 font-medium text-[11px] bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Đang nạp mã QR: {qrProgress}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Check className="w-3 h-3" />
                  <span>Mã QR sẵn sàng ({Object.keys(qrMap).length} mã)</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: ATM Card Print Options (Mode, Orientation, Sides, Theme) */}
          <div className="pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-700">
            <div className="flex flex-wrap items-center gap-3">
              {/* Print layout mode */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                <span className="text-slate-500 px-1 font-semibold text-[11px]">Bố cục:</span>
                <button
                  type="button"
                  onClick={() => setPrintMode('a4_sheet')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    printMode === 'a4_sheet' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Trang A4 (8-10 thẻ/trang)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('cr80_single')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    printMode === 'cr80_single' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Khổ thẻ nhựa PVC CR-80 cho máy in thẻ Hiti, Zebra, Fargo..."
                >
                  Thẻ đơn CR-80 (Máy in thẻ nhựa)
                </button>
              </div>

              {/* Orientation */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                <span className="text-slate-500 px-1 font-semibold text-[11px]">Hướng:</span>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    orientation === 'landscape' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Thẻ Ngang (85.6 × 54mm)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    orientation === 'portrait' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Thẻ Dọc (54 × 85.6mm)
                </button>
              </div>

              {/* Card Sides */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                <span className="text-slate-500 px-1 font-semibold text-[11px]">Mặt in:</span>
                <button
                  type="button"
                  onClick={() => setSides('front_only')}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    sides === 'front_only' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Mặt Trước
                </button>
                <button
                  type="button"
                  onClick={() => setSides('both_sides')}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    sides === 'both_sides' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  2 Mặt (Trước + Sau)
                </button>
                <button
                  type="button"
                  onClick={() => setSides('back_only')}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    sides === 'back_only' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Mặt Sau (Nội quy)
                </button>
              </div>

              {/* Theme */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                <span className="text-slate-500 px-1 font-semibold text-[11px]">Mẫu thẻ:</span>
                <button
                  type="button"
                  onClick={() => setTheme('classic')}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    theme === 'classic' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Don Bosco
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('modern')}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    theme === 'modern' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Hiện đại
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('eco')}
                  className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                    theme === 'eco' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Tiết kiệm mực - Thích hợp máy in laser trắng đen"
                >
                  Tiết kiệm mực
                </button>
              </div>
            </div>

            {/* Checkboxes: Cut lines, Parent Phone, Lanyard hole, Preview scale */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={showCutGuides}
                  onChange={(e) => setShowCutGuides(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Đường cắt kéo</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={showParentPhone}
                  onChange={(e) => setShowParentPhone(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Hiện SĐT Phụ huynh</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={showLanyardHole}
                  onChange={(e) => setShowLanyardHole(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Dấu lỗ bấm dây đeo</span>
              </label>

              <button
                type="button"
                onClick={() => setPreviewActualScale(!previewActualScale)}
                className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 border transition-colors cursor-pointer ${
                  previewActualScale 
                    ? 'bg-amber-100 border-amber-300 text-amber-900' 
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
                title="Bật kích thước chuẩn mm trên màn hình"
              >
                <span>Tỷ lệ chuẩn thẻ ATM 1:1</span>
              </button>
            </div>
          </div>
        </div>

        {/* INSTRUCTION TIP BANNER */}
        <div className="bg-amber-50/80 border-b border-amber-200/60 px-5 py-2 flex items-center justify-between text-xs text-amber-900 gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Kích thước chuẩn ATM:</strong> Thẻ được thiết kế chính xác theo tỷ lệ thẻ card ATM (85.6mm × 54mm). Khi in, bạn chọn khổ <strong>A4</strong> (hoặc máy in thẻ nhựa), và nhớ bật <strong>"Đồ họa nền (Background graphics)"</strong> trong hộp thoại in.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-amber-700">
              Mẹo: Nếu trình duyệt chặn cửa sổ popup, hãy dùng nút <strong>"In Ngay"</strong> hoặc <strong>"Tải File HTML"</strong>.
            </span>
          </div>
        </div>

        {/* PREVIEW CONTAINER */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-200/70">
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center max-w-md mx-auto shadow-sm border border-slate-200">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Không tìm thấy học sinh nào</h3>
              <p className="text-xs text-slate-500 mt-1">
                Thử thay đổi bộ lọc lớp hoặc từ khóa tìm kiếm để hiển thị học sinh.
              </p>
            </div>
          ) : (
            <div className={`grid gap-6 justify-items-center ${
              orientation === 'landscape' 
                ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2' 
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
            }`}>
              {filteredStudents.map((st) => {
                const isSelected = selectedIds.includes(st.id);
                const isFlipped = previewFlipMap[st.id] || false;
                const qrUrl = qrMap[st.id];
                const className = getClassName(st.classId);
                const dobFormatted = st.dob ? new Date(st.dob).toLocaleDateString('vi-VN') : '---';

                return (
                  <div
                    key={st.id}
                    className={`relative transition-all duration-200 flex flex-col items-center ${
                      isSelected ? 'opacity-100' : 'opacity-40 grayscale-40'
                    }`}
                  >
                    {/* Top Action Toolbar for each card */}
                    <div className="w-full flex items-center justify-between pb-1.5 px-1 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(st.id)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-[11px] truncate max-w-[140px]">{st.holyName} {st.fullName}</span>
                      </label>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleFlip(st.id)}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-300 rounded hover:bg-slate-100 text-slate-700 flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Lật mặt trước/mặt sau"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{isFlipped ? 'Mặt trước' : 'Mặt sau'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadSinglePng(st)}
                          disabled={exportingPngId === st.id}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-300 rounded hover:bg-slate-100 text-blue-700 flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Tải ảnh PNG thẻ này (chuẩn ATM 300 DPI)"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>{exportingPngId === st.id ? 'Đang xuất...' : 'Lưu PNG'}</span>
                        </button>
                      </div>
                    </div>

                    {/* PHYSICAL ATM CARD CONTAINER */}
                    <div
                      style={{
                        width: previewActualScale 
                          ? (orientation === 'landscape' ? '85.6mm' : '54mm') 
                          : (orientation === 'landscape' ? '410px' : '260px'),
                        height: previewActualScale 
                          ? (orientation === 'landscape' ? '54mm' : '85.6mm') 
                          : (orientation === 'landscape' ? '258px' : '410px'),
                        borderRadius: '3.18mm',
                      }}
                      className={`relative bg-white shadow-md border overflow-hidden flex flex-col justify-between select-none ${
                        theme === 'classic' ? 'border-blue-900' : theme === 'modern' ? 'border-sky-700' : 'border-slate-800'
                      } ${showCutGuides ? 'ring-1 ring-dashed ring-slate-400 ring-offset-2' : ''}`}
                    >
                      {/* Lanyard punch hole preview */}
                      {showLanyardHole && (
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-2 rounded-full border border-dashed border-slate-400 bg-slate-100/90 z-20"></div>
                      )}

                      {!isFlipped ? (
                        /* FRONT OF CARD */
                        <>
                          {/* Card Header */}
                          <div className={`px-3 py-1.5 border-b ${
                            theme === 'classic' 
                              ? 'bg-gradient-to-r from-blue-900 to-indigo-950 text-white border-amber-500' 
                              : theme === 'modern' 
                              ? 'bg-sky-50 border-sky-600 text-sky-950' 
                              : 'bg-white border-slate-800 text-slate-900'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-amber-400 font-bold text-sm">✝</span>
                                <div>
                                  <div className="text-[8.5px] font-black tracking-wider uppercase leading-none">
                                    GIÁO SỞ DON BOSCO ĐÀ LẠT
                                  </div>
                                  <div className="text-[7.5px] font-bold text-amber-300 uppercase leading-tight mt-0.5">
                                    BAN GIÁO LÝ THIẾU NHI
                                  </div>
                                </div>
                              </div>
                              <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                2026 - 2027
                              </span>
                            </div>
                            <div className="text-center mt-1">
                              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                                THẺ HỌC SINH GIÁO LÝ
                              </span>
                            </div>
                          </div>

                          {/* Card Body */}
                          <div className="p-2.5 flex-1 flex items-center justify-between gap-2 overflow-hidden bg-white">
                            {orientation === 'landscape' ? (
                              /* LANDSCAPE BODY */
                              <div className="flex items-center w-full justify-between gap-2">
                                {/* Photo column */}
                                <div className="flex flex-col items-center shrink-0">
                                  <div className="w-16 h-20 bg-slate-100 border border-slate-300 rounded overflow-hidden flex items-center justify-center">
                                    {st.avatarUrl ? (
                                      <img src={st.avatarUrl} alt={st.fullName} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="text-center">
                                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center mx-auto mb-1">
                                          {st.holyName.charAt(0)}
                                        </div>
                                        <span className="text-[7px] text-slate-400 font-semibold">ẢNH 3x4</span>
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[7.5px] font-mono font-bold text-slate-800 mt-1 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                                    {st.id}
                                  </span>
                                </div>

                                {/* Student details column */}
                                <div className="flex-1 overflow-hidden">
                                  <div className="text-[11px] font-bold text-amber-700 leading-tight">
                                    {st.holyName}
                                  </div>
                                  <div className="text-[12px] font-black text-slate-900 uppercase truncate leading-tight mb-1">
                                    {st.fullName}
                                  </div>

                                  <div className="text-[8.5px] text-slate-600 space-y-0.5">
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-400 min-w-[36px]">Lớp:</span>
                                      <strong className="text-blue-800">{className}</strong>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-400 min-w-[36px]">Sinh:</span>
                                      <span>{dobFormatted}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-400 min-w-[36px]">Giáo họ:</span>
                                      <span>{st.subParish || 'Don Bosco'}</span>
                                    </div>
                                    {showParentPhone && (
                                      <div className="flex items-center gap-1 text-[8px] text-slate-500">
                                        <span className="text-slate-400 min-w-[36px]">PH:</span>
                                        <span className="truncate">{st.parentName || 'PH'} ({st.parentPhone || '---'})</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* QR Code column */}
                                <div className="flex flex-col items-center shrink-0 pl-1.5 border-l border-dashed border-slate-200">
                                  <div className="w-[70px] h-[70px] bg-white border border-slate-200 rounded p-1 flex items-center justify-center">
                                    {qrUrl ? (
                                      <img src={qrUrl} alt={`QR ${st.id}`} className="w-full h-full object-contain" />
                                    ) : (
                                      <span className="text-[7px] text-slate-400">Đang nạp...</span>
                                    )}
                                  </div>
                                  <span className="text-[6px] font-black text-slate-600 uppercase tracking-wider mt-1">
                                    QUÉT ĐIỂM DANH
                                  </span>
                                </div>
                              </div>
                            ) : (
                              /* PORTRAIT BODY */
                              <div className="flex flex-col h-full w-full justify-between items-center text-center">
                                <div className="flex items-center gap-2 w-full text-left">
                                  <div className="w-14 h-18 bg-slate-100 border border-slate-300 rounded overflow-hidden flex items-center justify-center shrink-0">
                                    {st.avatarUrl ? (
                                      <img src={st.avatarUrl} alt={st.fullName} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="text-center">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center mx-auto mb-0.5">
                                          {st.holyName.charAt(0)}
                                        </div>
                                        <span className="text-[6px] text-slate-400">ẢNH 3x4</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                    <div className="text-[10px] font-bold text-amber-700">{st.holyName}</div>
                                    <div className="text-[11px] font-black text-slate-900 uppercase truncate">{st.fullName}</div>
                                    <div className="text-[8px] text-blue-800 font-bold mt-0.5">{className}</div>
                                    <div className="text-[7.5px] font-mono text-slate-500">{st.id}</div>
                                  </div>
                                </div>

                                <div className="w-full border-t border-dashed border-slate-200 my-1"></div>

                                <div className="flex flex-col items-center">
                                  <div className="w-20 h-20 bg-white border border-slate-200 rounded p-1">
                                    {qrUrl ? (
                                      <img src={qrUrl} alt={`QR ${st.id}`} className="w-full h-full object-contain" />
                                    ) : (
                                      <span className="text-[7px] text-slate-400">Đang nạp...</span>
                                    )}
                                  </div>
                                  <span className="text-[7px] font-bold text-slate-600 uppercase tracking-wider mt-1">
                                    QUÉT ĐIỂM DANH CHUYÊN CẦN
                                  </span>
                                  <span className="text-[7px] text-slate-400 mt-0.5">
                                    {st.subParish || 'Giáo họ Don Bosco'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Card Footer */}
                          <div className="px-3 py-1 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[7px] text-slate-500">
                            <span className="italic text-amber-800 font-semibold">✝ Yêu thương &amp; Phục vụ</span>
                            <span className="font-bold">Don Bosco Đà Lạt</span>
                          </div>
                        </>
                      ) : (
                        /* BACK OF CARD (NỘI QUY) */
                        <>
                          <div className="px-3 py-1.5 bg-slate-800 text-white border-b border-slate-700">
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-400 font-bold text-xs">✝</span>
                              <div>
                                <div className="text-[8.5px] font-bold uppercase">GIÁO SỞ DON BOSCO ĐÀ LẠT</div>
                                <div className="text-[7px] text-amber-300 uppercase">NỘI QUY &amp; HƯỚNG DẪN SỬ DỤNG THẺ</div>
                              </div>
                            </div>
                          </div>

                          <div className="p-3 flex-1 flex flex-col justify-center text-[7.5px] text-slate-700 leading-tight space-y-1 bg-slate-50">
                            <div className="font-bold text-slate-900 text-[8px] mb-0.5">Quy định dành cho Thiếu nhi Giáo lý:</div>
                            <div className="flex items-start gap-1">
                              <strong className="text-blue-800 shrink-0">1.</strong>
                              <span>Luôn mang theo và đeo thẻ khi tham dự Thánh lễ &amp; các giờ học giáo lý.</span>
                            </div>
                            <div className="flex items-start gap-1">
                              <strong className="text-blue-800 shrink-0">2.</strong>
                              <span>Quẹt mã QR tại cửa nhà thờ hoặc lớp học để hệ thống tự động ghi nhận chuyên cần.</span>
                            </div>
                            <div className="flex items-start gap-1">
                              <strong className="text-blue-800 shrink-0">3.</strong>
                              <span>Giữ gìn thẻ cẩn thận, không uốn gập hoặc làm mờ rách mã QR.</span>
                            </div>
                            <div className="flex items-start gap-1">
                              <strong className="text-blue-800 shrink-0">4.</strong>
                              <span>Nếu làm mất thẻ, báo ngay cho GLV Chủ nhiệm để được cấp lại.</span>
                            </div>
                          </div>

                          <div className="px-3 py-1.5 bg-slate-100 border-t border-slate-200 text-center text-[6.5px] text-slate-500">
                            <div>Ban Giáo Lý Thiếu Nhi • 40 Bùi Thị Xuân, Phường 2, TP. Đà Lạt</div>
                            <div className="font-mono text-slate-700 font-bold mt-0.5">
                              {st.id} - {st.holyName} {st.fullName}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BOTTOM MODAL FOOTER */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 flex items-center gap-2">
            <span>
              Đang chọn <strong className="text-blue-700 font-bold">{selectedStudents.length}</strong> học sinh
            </span>
            <span>•</span>
            <span>
              Tổng số trang in ước tính: <strong className="text-slate-900 font-bold">
                {printMode === 'cr80_single' 
                  ? `${selectedStudents.length * (sides === 'both_sides' ? 2 : 1)} phôi thẻ` 
                  : `${Math.ceil((selectedStudents.length * (sides === 'both_sides' ? 2 : 1)) / 8)} trang A4`
                }
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleDirectPrint}
              disabled={selectedIds.length === 0 || isPrinting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-md flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Đang chuẩn bị...' : `In ${selectedStudents.length} Thẻ ATM`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
