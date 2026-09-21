import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  User, 
  GraduationCap, 
  Calendar, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  Clock,
  BookOpen,
  Church,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { Student, ClassRoom, Catechist } from '../types';

interface PublicStudentLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classes: ClassRoom[];
  catechists?: Catechist[];
  onSelectForLogin?: (studentId: string) => void;
}

export const PublicStudentLookupModal: React.FC<PublicStudentLookupModalProps> = ({
  isOpen,
  onClose,
  students,
  classes,
  catechists = [],
  onSelectForLogin
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Map of classes for quick lookup
  const classMap = useMemo(() => {
    const map = new Map<string, ClassRoom>();
    classes.forEach(c => map.set(c.id, c));
    return map;
  }, [classes]);

  // Map of catechists for quick lookup
  const catechistMap = useMemo(() => {
    const map = new Map<string, Catechist>();
    catechists.forEach(c => map.set(c.id, c));
    return map;
  }, [catechists]);

  // Search logic
  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    const normQuery = query.replace(/[-_\s]/g, '');

    return students.filter(student => {
      const sIdLower = student.id.toLowerCase();
      const sIdNorm = sIdLower.replace(/[-_\s]/g, '');
      const fullNameLower = student.fullName.toLowerCase();
      const holyNameLower = student.holyName.toLowerCase();

      return (
        sIdLower === query ||
        sIdNorm === normQuery ||
        sIdLower.includes(query) ||
        sIdNorm.includes(normQuery) ||
        fullNameLower.includes(query) ||
        holyNameLower.includes(query)
      );
    });
  }, [searchTerm, students]);

  // Mask phone number for privacy: e.g. 0918 889 900 -> 0918 *** 900
  const maskPhone = (phone?: string) => {
    if (!phone) return 'Chưa cập nhật';
    const clean = phone.replace(/\s+/g, '');
    if (clean.length < 7) return phone;
    const start = clean.slice(0, 4);
    const end = clean.slice(-3);
    return `${start} *** ${end}`;
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApplyLogin = (studentId: string) => {
    if (onSelectForLogin) {
      onSelectForLogin(studentId);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between relative shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-semibold uppercase tracking-wider">
              <Church className="w-3.5 h-3.5" />
              <span>Cổng Thông Tin Công Khai</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Tra Cứu Thông Tin Học Sinh Giáo Lý
            </h2>
            <p className="text-xs text-slate-300">
              Nhập Mã Học Sinh (vd: <code className="text-amber-300 font-bold">DBS-2026-001</code>) để xem thông tin lớp học và giáo lý viên phụ trách.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            aria-label="Đóng tra cứu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Quick Tags */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4 text-amber-600" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nhập Mã Học Sinh (vd: DBS-2026-001, 001) hoặc Họ Tên..."
              className="w-full pl-10 pr-24 py-3 bg-white border-2 border-slate-300 focus:border-amber-500 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all font-mono shadow-xs"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-10 pr-2 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                Tìm kiếm
              </span>
            </div>
          </div>

          {/* Quick Click Sample IDs */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-600">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              Gợi ý mã mẫu:
            </span>
            {['DBS-2026-001', 'DBS-2026-004', 'DBS-2026-010', 'DBS-2026-020', 'DBS-2026-030'].map((sampleId) => (
              <button
                key={sampleId}
                type="button"
                onClick={() => setSearchTerm(sampleId)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium border transition-colors cursor-pointer ${
                  searchTerm.toUpperCase() === sampleId
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-amber-400 hover:bg-amber-50'
                }`}
              >
                {sampleId}
              </button>
            ))}
          </div>
        </div>

        {/* Results Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {searchTerm.trim() === '' ? (
            <div className="text-center py-10 text-slate-500 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xl">
                ✝
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">
                  Vui lòng nhập Mã Học Sinh để tra cứu
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Mã học sinh được in trên Thẻ Thiếu Nhi hoặc Phiếu Liên Lạc Giáo Lý (định dạng <code className="text-amber-800 font-bold font-mono">DBS-2026-xxx</code>).
                </p>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-10 text-slate-500 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  Không tìm thấy học sinh với mã "{searchTerm}"
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Quý phụ huynh vui lòng kiểm tra lại mã trên thẻ học sinh hoặc liên hệ Văn phòng Giáo lý để được hỗ trợ.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Tìm thấy <strong>{searchResults.length}</strong> kết quả phù hợp</span>
                <span className="text-[11px] italic">Thông tin niên khóa 2026 – 2027</span>
              </div>

              {searchResults.map((student) => {
                const cls = classMap.get(student.classId);
                const headTeacher = cls?.headTeacherId ? catechistMap.get(cls.headTeacherId) : null;
                const assistantTeachers = cls?.assistantTeacherIds?.map(id => catechistMap.get(id)).filter(Boolean) || [];

                return (
                  <div
                    key={student.id}
                    className="bg-white rounded-2xl border-2 border-slate-200 hover:border-amber-400 p-4 sm:p-5 shadow-xs transition-all space-y-4"
                  >
                    {/* Top Identity Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 flex items-center justify-center font-bold text-base shrink-0 mt-0.5">
                          {student.gender === 'Nữ' ? '👧' : '👦'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              {student.holyName}
                            </span>
                            <h3 className="text-base font-bold text-slate-900">
                              {student.fullName}
                            </h3>
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Đang theo học
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>Giới tính: <strong>{student.gender}</strong></span>
                            <span>•</span>
                            <span>Sinh ngày: <strong>{student.dob || 'Chưa cập nhật'}</strong></span>
                            {student.subParish && (
                              <>
                                <span>•</span>
                                <span>{student.subParish}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Student ID Badge with Copy */}
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <div className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Mã HS:</span>
                          <span className="font-mono font-bold text-sm text-slate-900">{student.id}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyId(student.id)}
                            className="text-slate-400 hover:text-amber-700 p-0.5 transition-colors cursor-pointer"
                            title="Sao chép Mã Học Sinh"
                          >
                            {copiedId === student.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Class & Academic Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Class & Room */}
                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <BookOpen className="w-4 h-4 text-amber-600" />
                          <span>Lớp Giáo Lý Đang Học</span>
                        </div>
                        <div className="text-slate-900 font-semibold text-sm pl-5">
                          {cls?.name || 'Lớp Giáo Lý Niên Khóa 2026 – 2027'}
                        </div>
                        <div className="text-[11px] text-slate-500 pl-5 flex items-center gap-2 flex-wrap">
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                            {cls?.roomNumber || 'Phòng học Ban Giáo Lý'}
                          </span>
                          {cls?.isSacramentClass && (
                            <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-semibold text-[10px]">
                              Lớp Bí Tích
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 pl-5 pt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{cls?.scheduleDescription || 'Chúa Nhật: 07h30 - 10h30'}</span>
                        </div>
                      </div>

                      {/* Catechist In Charge */}
                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <GraduationCap className="w-4 h-4 text-indigo-600" />
                          <span>Giáo Lý Viên Phụ Trách</span>
                        </div>
                        <div className="text-slate-900 font-semibold text-xs pl-5">
                          {headTeacher ? `${headTeacher.holyName} ${headTeacher.fullName}` : 'Ban Giáo Lý Phụ Trách'}
                        </div>
                        {assistantTeachers.length > 0 && (
                          <div className="text-[11px] text-slate-500 pl-5">
                            Trợ tá: {assistantTeachers.map(t => `${t?.holyName} ${t?.fullName}`).join(', ')}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-600 pl-5 pt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Hotline Giáo Lý: (0263) 3822 514</span>
                        </div>
                      </div>
                    </div>

                    {/* Parent & Family Info (Masked for privacy) */}
                    <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200/80 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-amber-950 font-bold">
                          <User className="w-3.5 h-3.5 text-amber-700" />
                          <span>Thông tin Phụ Huynh đại diện:</span>
                        </div>
                        <div className="text-[11px] text-slate-700 pl-5">
                          <strong>{student.parentName || 'Gia đình học sinh'}</strong> • SĐT: <code className="font-mono">{maskPhone(student.parentPhone || student.phone)}</code>
                        </div>
                      </div>

                      {/* 1-Click Login Action */}
                      {onSelectForLogin && (
                        <button
                          type="button"
                          onClick={() => handleApplyLogin(student.id)}
                          className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Đăng Nhập Sổ Liên Lạc Bằng Mã Này</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="text-[11px]">
            Hệ thống Quản Lý Giáo Lý Don Bosco Đà Lạt
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Đóng Tra Cứu
          </button>
        </div>
      </div>
    </div>
  );
};
