import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Download, 
  Copy, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  FileSpreadsheet, 
  Sparkles, 
  X, 
  HelpCircle,
  Users
} from 'lucide-react';
import { Student, ClassRoom } from '../types';

interface BatchImportModalProps {
  classes: ClassRoom[];
  existingStudents: Student[];
  onImport: (newStudents: Student[]) => void;
  onClose: () => void;
}

interface ParsedRow {
  index: number;
  raw: string;
  isValid: boolean;
  error?: string;
  data: Partial<Student>;
  targetClassName?: string;
}

const TEMPLATE_HEADERS = [
  'Tên Thánh',
  'Họ và Tên',
  'Giới Tính (Nam/Nữ)',
  'Ngày Sinh (YYYY-MM-DD)',
  'Lớp (Tên hoặc Mã lớp)',
  'SĐT Học Sinh',
  'Tên Phụ Huynh',
  'SĐT Phụ Huynh',
  'Email Phụ Huynh',
  'Địa Chỉ',
  'Giáo Họ / Khu Xóm',
  'Ngày Rửa Tội (YYYY-MM-DD)',
  'Ngày Rước Lễ (YYYY-MM-DD)',
  'Ngày Thêm Sức (YYYY-MM-DD)',
  'Người Đỡ Đầu',
  'Ghi Chú'
];

const SAMPLE_CSV_DATA = `Tên Thánh,Họ và Tên,Giới Tính (Nam/Nữ),Ngày Sinh (YYYY-MM-DD),Lớp (Tên hoặc Mã lớp),SĐT Học Sinh,Tên Phụ Huynh,SĐT Phụ Huynh,Email Phụ Huynh,Địa Chỉ,Giáo Họ / Khu Xóm,Ngày Rửa Tội (YYYY-MM-DD),Ngày Rước Lễ (YYYY-MM-DD),Ngày Thêm Sức (YYYY-MM-DD),Người Đỡ Đầu,Ghi Chú
Maria,Trần Mai Lan,Nữ,2018-03-15,Khai Tâm 1A,0912111222,Giuse Trần Văn Minh,0912333444,lan.parent@gmail.com,15 Phan Chu Trinh TP. Đà Lạt,Giáo họ Don Bosco,2018-04-20,,,Maria Nguyễn Thị Thoa,Chăm ngoan đi lễ đều
Giuse,Nguyễn Minh Hoàng,Nam,2017-08-22,Khai Tâm 2,,Phanxicô Nguyễn Văn Trí,0903888999,,45 Bùi Thị Xuân Đà Lạt,Giáo họ Don Bosco,2017-09-10,,,Giuse Lê Hoàng Nam,Tích cực hát lễ
Têrêsa,Lê Ngọc Thảo,Nữ,2016-11-05,Sơ Cấp 1,0933555777,Maria Lê Thị Hạnh,0933222111,thao.le@gmail.com,89 Hai Bà Trưng Đà Lạt,Giáo họ Thánh Tâm,2016-12-08,2024-05-19,,Têrêsa Phạm Ngọc Ánh,Chuẩn bị học Bí Tích
Phanxicô Xaviê,Phạm Quốc Bảo,Nam,2015-02-18,Sơ Cấp 2,0944111333,Giuse Phạm Văn Cường,0944999888,,120 Phù Đổng Thiên Vương Đà Lạt,Giáo họ Don Bosco,2015-03-25,2023-05-28,,Phêrô Trần Văn Phát,Lớp Rước Lễ lần đầu
Đaminh,Vũ Đình Trọng,Nam,2012-07-30,Căn Bản 4,,Đaminh Vũ Đình Hùng,0987654321,trong.vu@yahoo.com,32 Nguyên Tử Lực Đà Lạt,Giáo họ Don Bosco,2012-08-15,2020-05-17,2024-06-02,Đaminh Nguyễn Văn Toàn,Chuẩn bị Thêm Sức`;

export const BatchImportModal: React.FC<BatchImportModalProps> = ({
  classes,
  existingStudents,
  onImport,
  onClose,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [defaultClassId, setDefaultClassId] = useState<string>(classes[0]?.id || '');
  const [overrideClass, setOverrideClass] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download template as CSV with UTF-8 BOM
  const handleDownloadTemplate = () => {
    const csvContent = '\uFEFF' + SAMPLE_CSV_DATA;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Mau_Danh_Sach_Thieu_Nhi_Don_Bosco.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy header row to clipboard
  const handleCopyHeaders = () => {
    navigator.clipboard.writeText(TEMPLATE_HEADERS.join('\t'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Load sample dataset
  const handleLoadSampleData = () => {
    setInputText(SAMPLE_CSV_DATA);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
        setActiveTab('paste');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // Parse lines
  const parseRows = (): ParsedRow[] => {
    if (!inputText.trim()) return [];

    const lines = inputText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) return [];

    // Check if first line is header
    const firstLineLower = lines[0].toLowerCase();
    const isFirstLineHeader = 
      firstLineLower.includes('tên thánh') || 
      firstLineLower.includes('họ và tên') || 
      firstLineLower.includes('holyname') ||
      firstLineLower.includes('mã');

    const dataLines = isFirstLineHeader ? lines.slice(1) : lines;

    return dataLines.map((line, idx) => {
      // Split by tab or comma (handling potential comma inside quotes)
      let tokens: string[] = [];
      if (line.includes('\t')) {
        tokens = line.split('\t').map(t => t.trim().replace(/^["']|["']$/g, ''));
      } else {
        // Basic CSV parsing
        const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
        const matches: string[] = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
          let token = match[1];
          if (token === undefined) break;
          if (token.startsWith('"') && token.endsWith('"')) {
            token = token.slice(1, -1).replace(/""/g, '"');
          }
          matches.push(token.trim());
          if (match.index + match[0].length >= line.length) break;
        }
        tokens = matches.length > 0 ? matches : line.split(',').map(t => t.trim());
      }

      const holyName = tokens[0] || '';
      const fullName = tokens[1] || '';
      const rawGender = tokens[2] || '';
      const gender: 'Nam' | 'Nữ' = rawGender.toLowerCase().includes('nữ') || rawGender.toLowerCase() === 'f' || rawGender.toLowerCase() === 'nu' ? 'Nữ' : 'Nam';
      const dob = tokens[3] || '2016-01-01';
      const rawClass = tokens[4] || '';
      const phone = tokens[5] || '';
      const parentName = tokens[6] || '';
      const parentPhone = tokens[7] || '';
      const parentEmail = tokens[8] || '';
      const address = tokens[9] || 'TP. Đà Lạt, Lâm Đồng';
      const subParish = tokens[10] || 'Giáo họ Don Bosco';
      const baptismDate = tokens[11] || '';
      const firstCommunionDate = tokens[12] || '';
      const confirmationDate = tokens[13] || '';
      const godParentName = tokens[14] || '';
      const notes = tokens[15] || '';

      // Determine target class
      let matchedClass: ClassRoom | undefined;
      if (overrideClass) {
        matchedClass = classes.find(c => c.id === defaultClassId);
      } else if (rawClass) {
        matchedClass = classes.find(
          c => c.id.toLowerCase() === rawClass.toLowerCase() ||
               c.name.toLowerCase() === rawClass.toLowerCase() ||
               c.level.toLowerCase() === rawClass.toLowerCase() ||
               c.name.toLowerCase().replace(/\s+/g, '') === rawClass.toLowerCase().replace(/\s+/g, '')
        );
      }

      if (!matchedClass) {
        matchedClass = classes.find(c => c.id === defaultClassId) || classes[0];
      }

      // Validation
      const errors: string[] = [];
      if (!holyName.trim()) errors.push('Thiếu Tên Thánh');
      if (!fullName.trim()) errors.push('Thiếu Họ và Tên');

      const isValid = errors.length === 0;

      return {
        index: idx + 1,
        raw: line,
        isValid,
        error: errors.join(', '),
        targetClassName: matchedClass?.name,
        data: {
          holyName,
          fullName,
          gender,
          dob,
          classId: matchedClass?.id || classes[0]?.id || '',
          phone,
          parentName: parentName || (holyName ? `Phụ huynh em ${holyName} ${fullName}` : 'Phụ huynh'),
          parentPhone: parentPhone || phone || 'Chưa cập nhật',
          parentEmail,
          address,
          subParish,
          baptismDate: baptismDate || undefined,
          firstCommunionDate: firstCommunionDate || undefined,
          confirmationDate: confirmationDate || undefined,
          godParentName: godParentName || undefined,
          notes,
        },
      };
    });
  };

  const parsedRows = parseRows();
  const validRows = parsedRows.filter(r => r.isValid);
  const invalidRows = parsedRows.filter(r => !r.isValid);

  // Execute Import
  const handleExecuteImport = () => {
    if (validRows.length === 0) {
      alert('Không có dòng dữ liệu hợp lệ nào để nhập!');
      return;
    }

    // Find highest current ID number
    let maxIdNum = 0;
    existingStudents.forEach(st => {
      const match = st.id.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxIdNum) maxIdNum = num;
      }
    });

    const newStudentObjects: Student[] = validRows.map((r, i) => {
      const generatedNum = maxIdNum + i + 1;
      const id = `DBS-KT-${String(generatedNum).padStart(3, '0')}`;

      return {
        id,
        holyName: r.data.holyName!,
        fullName: r.data.fullName!,
        gender: r.data.gender || 'Nam',
        dob: r.data.dob || '2016-01-01',
        classId: r.data.classId || classes[0]?.id || '',
        phone: r.data.phone || '',
        parentName: r.data.parentName || 'Phụ huynh',
        parentPhone: r.data.parentPhone || '',
        parentEmail: r.data.parentEmail || '',
        address: r.data.address || 'Đà Lạt, Lâm Đồng',
        subParish: r.data.subParish || 'Giáo họ Don Bosco',
        baptismDate: r.data.baptismDate,
        firstCommunionDate: r.data.firstCommunionDate,
        confirmationDate: r.data.confirmationDate,
        godParentName: r.data.godParentName,
        notes: r.data.notes,
      };
    });

    onImport(newStudentObjects);
    alert(`Đã nhập thành công ${newStudentObjects.length} học sinh vào hệ thống!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white rounded-t-xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                Nhập Danh Sách Học Sinh Hàng Loạt Theo Mẫu
              </h2>
              <p className="text-[11px] text-slate-300">
                Hỗ trợ tệp CSV, sao chép dán trực tiếp từ Excel / Google Sheets
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Quick Actions & Template Bar */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Mẫu Dữ Liệu Chuẩn Don Bosco Đà Lạt</span>
              </div>
              <div className="text-[11px] text-amber-800">
                Bao gồm 16 cột thông tin chuẩn (Tên Thánh, Họ Tên, Giới tính, Ngày sinh, Lớp, Phụ huynh, Bí tích...)
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Tải tệp CSV mẫu tương thích Excel tiếng Việt có dấu"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Tệp Mẫu CSV</span>
              </button>

              <button
                type="button"
                onClick={handleCopyHeaders}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
                title="Sao chép danh sách tiêu đề để dán vào Excel"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép!' : 'Chép Tiêu Đề'}</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSampleData}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Tự động điền 5 học sinh mẫu để thử nghiệm nhanh"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nạp Dữ Liệu Mẫu Thử Nghiệm</span>
              </button>
            </div>
          </div>

          {/* Configuration Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Lớp học mặc định (khi hàng dữ liệu không có thông tin lớp):
              </label>
              <select
                value={defaultClassId}
                onChange={(e) => setDefaultClassId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 bg-white font-medium text-slate-800"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.isSacramentClass ? '★ (Bí Tích)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center sm:pt-6">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={overrideClass}
                  onChange={(e) => setOverrideClass(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className="font-medium text-slate-700">
                  Ghi đè tất cả vào lớp đã chọn ở trên (bỏ qua cột Lớp trong dữ liệu)
                </span>
              </label>
            </div>
          </div>

          {/* Input Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1.5 font-semibold text-xs rounded-t-lg transition-colors ${
                    activeTab === 'paste'
                      ? 'bg-amber-100 text-amber-900 border-b-2 border-amber-600'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Dán Dữ Liệu (Copy-Paste từ Excel/Sheets)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('file');
                    fileInputRef.current?.click();
                  }}
                  className={`px-3 py-1.5 font-semibold text-xs rounded-t-lg transition-colors ${
                    activeTab === 'file'
                      ? 'bg-amber-100 text-amber-900 border-b-2 border-amber-600'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tải Lên Tệp (.CSV / .TXT)
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={handleFileUpload}
                className="hidden"
              />

              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                >
                  Xóa nội dung nhập
                </button>
              )}
            </div>

            <div className="relative">
              <textarea
                rows={7}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Dán các dòng dữ liệu học sinh tại đây (phân cách bằng dấu phẩy hoặc phím Tab từ Excel)...
Ví dụ:
Maria,Trần Mai Lan,Nữ,2018-03-15,Khai Tâm 1A,,Giuse Trần Văn Minh,0912333444,,15 Phan Chu Trinh Đà Lạt,Giáo họ Don Bosco"
                className="w-full border border-slate-300 rounded-lg p-3 font-mono text-[11px] bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Parsing Results & Live Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <span>Kết Quả Nhận Diện:</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700">
                    Tổng: {parsedRows.length} dòng
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-semibold">
                    ✓ Hợp lệ: {validRows.length}
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 font-semibold">
                      ✕ Lỗi: {invalidRows.length}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 italic">
                  * Hệ thống sẽ tự động gán Mã học sinh (DBS-KT-xxx) duy nhất cho các em hợp lệ.
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px] sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5 w-10">#</th>
                      <th className="py-2 px-2.5">Trạng Thái</th>
                      <th className="py-2 px-2.5">Tên Thánh & Họ Tên</th>
                      <th className="py-2 px-2.5">Giới Tính / Ngày Sinh</th>
                      <th className="py-2 px-2.5">Lớp Phân Bổ</th>
                      <th className="py-2 px-2.5">Phụ Huynh & SĐT</th>
                      <th className="py-2 px-2.5">Giáo Họ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {parsedRows.map((r) => (
                      <tr
                        key={r.index}
                        className={r.isValid ? 'hover:bg-emerald-50/40' : 'bg-rose-50/50 hover:bg-rose-100/40'}
                      >
                        <td className="py-1.5 px-2.5 text-slate-400 font-mono text-[10px]">{r.index}</td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                          {r.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Hợp lệ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-[10px]" title={r.error}>
                              <AlertCircle className="w-3.5 h-3.5" /> {r.error}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 font-medium text-slate-900">
                          <span className="text-amber-800 font-semibold mr-1">{r.data.holyName}</span>
                          <span>{r.data.fullName}</span>
                        </td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-[11px]">
                          <span>{r.data.gender}</span> • <span className="text-slate-500 font-mono">{r.data.dob}</span>
                        </td>
                        <td className="py-1.5 px-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold text-[10px] border border-blue-200">
                            {r.targetClassName}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-[11px]">
                          <div>{r.data.parentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.data.parentPhone}</div>
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-600 text-[11px]">{r.data.subParish}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between rounded-b-xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-medium text-xs transition-colors"
          >
            Hủy Bỏ
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={validRows.length === 0}
              onClick={handleExecuteImport}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Tiến Hành Nhập {validRows.length > 0 ? `(${validRows.length} Học Sinh)` : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
