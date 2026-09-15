import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  RefreshCw, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  FileJson, 
  Clock, 
  ShieldCheck, 
  Users, 
  BookOpen, 
  Calendar, 
  Award,
  HardDrive
} from 'lucide-react';
import { 
  Student, 
  ClassRoom, 
  AttendanceRecord, 
  GradeRecord, 
  ConductRecord, 
  TuitionItem, 
  Catechist, 
  CatechistEvaluation, 
  CalendarEvent, 
  EmailNotification, 
  UserAccount, 
  SpecialPromotion, 
  SystemBackupData,
  Role 
} from '../types';
import { 
  INITIAL_STUDENTS, 
  INITIAL_CLASSES, 
  INITIAL_ATTENDANCE, 
  INITIAL_GRADES, 
  INITIAL_CONDUCT, 
  INITIAL_TUITION, 
  INITIAL_CATECHISTS, 
  INITIAL_EVALUATIONS, 
  INITIAL_CALENDAR_EVENTS, 
  INITIAL_EMAIL_NOTIFICATIONS, 
  INITIAL_USERS, 
  INITIAL_SPECIAL_PROMOTIONS 
} from '../data/mockData';

interface BackupRestoreModalProps {
  currentUser: UserAccount;
  students: Student[];
  classes: ClassRoom[];
  attendanceRecords: AttendanceRecord[];
  grades: GradeRecord[];
  conducts: ConductRecord[];
  tuitionList: TuitionItem[];
  catechists: Catechist[];
  evaluations: CatechistEvaluation[];
  events: CalendarEvent[];
  notifications: EmailNotification[];
  users: UserAccount[];
  specialPromotions: SpecialPromotion[];
  onClose: () => void;
  onRestoreData: (backup: SystemBackupData, mode: 'replace' | 'merge') => void;
  onResetToDefault: () => void;
}

export function BackupRestoreModal({
  currentUser,
  students,
  classes,
  attendanceRecords,
  grades,
  conducts,
  tuitionList,
  catechists,
  evaluations,
  events,
  notifications,
  users,
  specialPromotions,
  onClose,
  onRestoreData,
  onResetToDefault,
}: BackupRestoreModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'reset'>('export');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<SystemBackupData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [isSuccessMessage, setIsSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManageBackup = currentUser.role === 'admin' || currentUser.role === 'pastor' || currentUser.role === 'catechist_leader';

  // Generate and download full JSON backup
  const handleExportBackup = () => {
    const now = new Date();
    const timestampStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const backupPayload: SystemBackupData = {
      version: '2.1.0',
      exportedAt: now.toISOString(),
      exportedBy: currentUser.name,
      exportedByRole: currentUser.role,
      systemName: 'Hệ Thống Quản Lý Giáo Lý Giáo Sở Don Bosco Đà Lạt',
      parishName: 'Giáo Sở Don Bosco Đà Lạt - Giáo Phận Đà Lạt',
      academicYear: '2026 - 2027',
      summary: {
        totalStudents: students.length,
        totalClasses: classes.length,
        totalAttendanceRecords: attendanceRecords.length,
        totalGrades: grades.length,
        totalConducts: conducts.length,
        totalUsers: users.length,
      },
      data: {
        students,
        classes,
        attendanceRecords,
        grades,
        conducts,
        tuitionList,
        catechists,
        evaluations,
        events,
        notifications,
        users,
        specialPromotions,
      },
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupPayload, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `DonBosco_Backup_${dateFormatted}_${timestampStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setIsSuccessMessage(`Đã xuất và tải xuống bản sao lưu thành công (${students.length} học sinh, ${attendanceRecords.length} lượt điểm danh).`);
    setTimeout(() => setIsSuccessMessage(null), 4000);
  };

  // Handle file select for restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setParseError(null);
    setParsedBackup(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Basic validation
        if (!parsed.data || !Array.isArray(parsed.data.students) || !Array.isArray(parsed.data.classes)) {
          throw new Error('Tệp sao lưu không đúng cấu trúc hệ thống Don Bosco (thiếu dữ liệu students/classes).');
        }

        setParsedBackup(parsed as SystemBackupData);
      } catch (err: any) {
        setParseError(err.message || 'Không thể đọc tệp JSON. Vui lòng kiểm tra định dạng tệp sao lưu.');
        setParsedBackup(null);
      }
    };
    reader.onerror = () => {
      setParseError('Lỗi đọc tệp tin từ thiết bị.');
    };
    reader.readAsText(file);
  };

  // Execute restore
  const handleExecuteRestore = () => {
    if (!parsedBackup) return;

    if (!window.confirm(`XÁC NHẬN PHỤC HỒI DỮ LIỆU:\nBạn có chắc chắn muốn phục hồi hệ thống theo chế độ "${restoreMode === 'replace' ? 'Ghi đè toàn bộ' : 'Hợp nhất dữ liệu'}" không? Thao tác này sẽ cập nhật toàn bộ cơ sở dữ liệu học sinh, điểm danh và sổ điểm.`)) {
      return;
    }

    onRestoreData(parsedBackup, restoreMode);
    setIsSuccessMessage('Phục hồi dữ liệu từ bản sao lưu thành công!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Handle reset to default mock data
  const handleExecuteReset = () => {
    if (!window.confirm('CẢNH BÁO QUAN TRỌNG:\nBạn có chắc chắn muốn khôi phục lại toàn bộ dữ liệu mẫu ban đầu của Giáo Sở Don Bosco không?\nMọi dữ liệu mới thêm gần đây chưa sao lưu sẽ được đặt lại.')) {
      return;
    }

    onResetToDefault();
    setIsSuccessMessage('Đã khôi phục dữ liệu mẫu ban đầu thành công!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Database className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Sao Lưu & Phục Hồi Dữ Liệu Hệ Thống</h2>
              <p className="text-xs text-amber-200">
                Bảo vệ toàn vẹn dữ liệu học sinh, chuyên cần, sổ điểm và tài khoản Giáo Sở Don Bosco Đà Lạt
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'export'
                ? 'bg-white text-amber-800 border-amber-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>1. Sao Lưu Dữ Liệu (Xuất JSON)</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'import'
                ? 'bg-white text-blue-800 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>2. Phục Hồi (Nhập Tệp Sao Lưu)</span>
          </button>

          <button
            onClick={() => setActiveTab('reset')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'reset'
                ? 'bg-white text-rose-800 border-rose-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>3. Đặt Lại Dữ Liệu Gốc</span>
          </button>
        </div>

        {/* Success Banner */}
        {isSuccessMessage && (
          <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{isSuccessMessage}</span>
          </div>
        )}

        {/* Tab 1: Export Backup */}
        {activeTab === 'export' && (
          <div className="p-5 space-y-4">
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-900 space-y-2">
              <p className="font-semibold flex items-center gap-1.5 text-amber-950">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Quy Trình Sao Lưu Dữ Liệu An Toàn:
              </p>
              <p>
                Bản sao lưu sẽ đóng gói toàn bộ cơ sở dữ liệu hiện hành thành tệp tin tiêu chuẩn định dạng <strong className="font-mono bg-amber-100 px-1 py-0.5 rounded">.JSON</strong>. Bạn có thể lưu trữ trên máy tính, Google Drive, hoặc USB để bảo quản định kỳ hoặc chuyển giao dữ liệu giữa các niên khóa.
              </p>
            </div>

            {/* Current System Statistics */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Thống Kê Khối Dữ Liệu Sắp Được Sao Lưu:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Thiếu nhi</div>
                    <div className="text-sm font-bold text-slate-800">{students.length} em</div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-700 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Lớp giáo lý</div>
                    <div className="text-sm font-bold text-slate-800">{classes.length} lớp</div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Chuyên cần</div>
                    <div className="text-sm font-bold text-slate-800">{attendanceRecords.length} lượt</div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Sổ điểm & Hạnh kiểm</div>
                    <div className="text-sm font-bold text-slate-800">{grades.length + conducts.length} mục</div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-700 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Sự kiện & Thông báo</div>
                    <div className="text-sm font-bold text-slate-800">{events.length + notifications.length} mục</div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Tài khoản & Phân quyền</div>
                    <div className="text-sm font-bold text-slate-800">{users.length} tài khoản</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Download */}
            <div className="pt-2">
              <button
                type="button"
                id="download-backup-btn"
                onClick={handleExportBackup}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-5 h-5" />
                <span>Tải Bản Sao Lưu Về Thiết Bị (.JSON)</span>
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2">
                Tệp tin JSON được mã hóa UTF-8 tiêu chuẩn, tương thích với mọi trình duyệt và thiết bị
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Import / Restore */}
        {activeTab === 'import' && (
          <div className="p-5 space-y-4">
            {!canManageBackup ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Yêu cầu quyền Quản trị viên hoặc Cha Quản Sở</p>
                  <p className="mt-1">
                    Chức năng phục hồi hoặc thay thế dữ liệu toàn hệ thống chỉ dành riêng cho Quản trị viên và Ban Điều Hành nhằm tránh rủi ro ghi đè dữ liệu ngoài ý muốn.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <FileJson className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    {importFile ? importFile.name : 'Nhấp hoặc Kéo thả tệp sao lưu (.JSON) vào đây'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Chọn tệp sao lưu hợp lệ do hệ thống Don Bosco Đà Lạt xuất ra
                  </p>
                </div>

                {parseError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{parseError}</span>
                  </div>
                )}

                {parsedBackup && (
                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        Tệp sao lưu hợp lệ:
                      </span>
                      <span className="text-[11px] font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                        Phiên bản {parsedBackup.version || '1.0'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 bg-white p-3 rounded-lg border border-blue-100">
                      <div>Thời gian tạo: <strong>{new Date(parsedBackup.exportedAt).toLocaleString('vi-VN')}</strong></div>
                      <div>Người xuất: <strong>{parsedBackup.exportedBy || 'Không rõ'}</strong></div>
                      <div>Số học sinh: <strong className="text-blue-700">{parsedBackup.data.students?.length || 0} em</strong></div>
                      <div>Số lớp: <strong className="text-blue-700">{parsedBackup.data.classes?.length || 0} lớp</strong></div>
                      <div>Lượt điểm danh: <strong className="text-blue-700">{parsedBackup.data.attendanceRecords?.length || 0} lượt</strong></div>
                      <div>Tài khoản: <strong className="text-blue-700">{parsedBackup.data.users?.length || 0} người dùng</strong></div>
                    </div>

                    {/* Mode selection */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-bold text-slate-800 block">
                        Chọn Chế Độ Phục Hồi:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className={`p-2.5 rounded-lg border cursor-pointer text-xs flex items-start gap-2 ${
                          restoreMode === 'replace' ? 'bg-blue-100/60 border-blue-500 font-semibold text-blue-900' : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          <input
                            type="radio"
                            name="restoreMode"
                            value="replace"
                            checked={restoreMode === 'replace'}
                            onChange={() => setRestoreMode('replace')}
                            className="mt-0.5 text-blue-600"
                          />
                          <div>
                            <div>Ghi đè toàn bộ (Khuyên Dùng)</div>
                            <div className="text-[10px] text-slate-500 font-normal">Khôi phục chính xác trạng thái tại thời điểm sao lưu</div>
                          </div>
                        </label>

                        <label className={`p-2.5 rounded-lg border cursor-pointer text-xs flex items-start gap-2 ${
                          restoreMode === 'merge' ? 'bg-blue-100/60 border-blue-500 font-semibold text-blue-900' : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          <input
                            type="radio"
                            name="restoreMode"
                            value="merge"
                            checked={restoreMode === 'merge'}
                            onChange={() => setRestoreMode('merge')}
                            className="mt-0.5 text-blue-600"
                          />
                          <div>
                            <div>Hợp nhất dữ liệu (Merge)</div>
                            <div className="text-[10px] text-slate-500 font-normal">Bổ sung thêm học sinh mới mà không xóa danh sách hiện hành</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      id="execute-restore-btn"
                      onClick={handleExecuteRestore}
                      className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors text-xs"
                    >
                      <HardDrive className="w-4 h-4" />
                      <span>Xác Nhận Tiến Hành Phục Hồi Dữ Liệu</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 3: Reset to Default */}
        {activeTab === 'reset' && (
          <div className="p-5 space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-rose-950">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Cảnh Báo Về Việc Đặt Lại Dữ Liệu Gốc:
              </div>
              <p>
                Thao tác này sẽ thiết lập lại hệ thống về toàn bộ dữ liệu mẫu ban đầu (niên khóa 2026-2027 với 12 phân lớp, 21 học sinh mẫu, hệ thống điểm danh QR, sổ liên lạc và tài khoản mẫu).
              </p>
              <p className="text-[11px] text-rose-700 font-medium">
                * Vui lòng nhấn tab "1. Sao Lưu Dữ Liệu" để tải bản sao lưu về máy trước nếu bạn muốn bảo toàn dữ liệu hiện tại.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                id="execute-reset-default-btn"
                onClick={handleExecuteReset}
                className="w-full py-2.5 px-4 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors text-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Khôi Phục Về Dữ Liệu Mẫu Ban Đầu</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Giáo Sở Don Bosco Đà Lạt • Niên khóa 2026 – 2027</span>
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
