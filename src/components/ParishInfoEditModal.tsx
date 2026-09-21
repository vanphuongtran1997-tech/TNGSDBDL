import React, { useState } from 'react';
import { 
  Church, 
  Users, 
  Clock, 
  Save, 
  RefreshCw, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck,
  Globe,
  MessageSquare
} from 'lucide-react';
import { ParishInfo, UserAccount } from '../types';
import { DEFAULT_PARISH_INFO } from '../data/mockData';

interface ParishInfoEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  parishInfo: ParishInfo;
  currentUser: UserAccount;
  onSaveParishInfo: (updatedInfo: ParishInfo) => void;
}

export const ParishInfoEditModal: React.FC<ParishInfoEditModalProps> = ({
  isOpen,
  onClose,
  parishInfo,
  currentUser,
  onSaveParishInfo
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'leadership' | 'academic' | 'schedule'>('general');
  const [formData, setFormData] = useState<ParishInfo>({ ...parishInfo });
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ParishInfo = {
      ...formData,
      updatedAt: new Date().toLocaleString('vi-VN'),
      updatedBy: `${currentUser.holyName || ''} ${currentUser.name}`.trim()
    };
    onSaveParishInfo(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục lại toàn bộ thông tin Ban Giáo Lý & Giáo Sở về trạng thái mặc định ban đầu không?')) {
      setFormData({ ...DEFAULT_PARISH_INFO });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between relative shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Quyền Quản Trị Viên & Quý Cha</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Chỉnh Sửa Thông Tin Ban Giáo Lý & Giáo Sở
            </h2>
            <p className="text-xs text-slate-300">
              Cập nhật thông tin liên hệ, niên khóa, nhân sự ban điều hành và thời khóa biểu áp dụng toàn hệ thống
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 shrink-0 gap-1 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3.5 py-2.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Church className="w-3.5 h-3.5 text-amber-600" />
            <span>Giáo Sở & Liên Hệ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leadership')}
            className={`px-3.5 py-2.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'leadership'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Ban Điều Hành & Nhân Sự</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('academic')}
            className={`px-3.5 py-2.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'academic'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Niên Khóa & Khẩu Hiệu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`px-3.5 py-2.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'schedule'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Lịch Lễ & Giờ Văn Phòng</span>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 text-xs space-y-4">
          {savedSuccess && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Đã lưu thành công! Toàn bộ thông tin hiển thị của Ban Giáo Lý đã được cập nhật.</span>
            </div>
          )}

          {/* TAB 1: GENERAL INFO */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-center gap-2">
                <Church className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Các thông tin này được công khai trên giao diện đăng nhập, chân trang và sổ liên lạc của thiếu nhi.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên Giáo Sở / Giáo Xứ (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.parishName}
                    onChange={(e) => setFormData({ ...formData, parishName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-medium"
                    placeholder="vd: Giáo Sở Don Bosco Đà Lạt"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giáo Phận (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.diocese}
                    onChange={(e) => setFormData({ ...formData, diocese: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-medium"
                    placeholder="vd: Giáo phận Đà Lạt"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thánh Bổn Mạng</label>
                  <input
                    type="text"
                    value={formData.patronSaint}
                    onChange={(e) => setFormData({ ...formData, patronSaint: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-medium"
                    placeholder="vd: Thánh Gioan Bosco (Don Bosco)"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày Lễ Bổn Mạng</label>
                  <input
                    type="text"
                    value={formData.patronSaintDay}
                    onChange={(e) => setFormData({ ...formData, patronSaintDay: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-medium"
                    placeholder="vd: 31/01"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Địa Chỉ Giáo Sở (*)</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-medium"
                      placeholder="vd: 04 Bùi Thị Xuân, Phường 2, TP. Đà Lạt, Tỉnh Lâm Đồng"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Vị Trí Cụ Thể Phòng Làm Việc Văn Phòng</label>
                  <input
                    type="text"
                    value={formData.officeLocation}
                    onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-medium"
                    placeholder="vd: Khu Mục Vụ Giáo Sở (Tầng 1 Dãy nhà Mục Vụ, đối diện sân bóng)"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Điện Thoại Bàn / Hotline (*)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={formData.hotline}
                      onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                      placeholder="vd: (0263) 3822 514"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Di Động / Hotline Zalo (*)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={formData.mobileZalo}
                      onChange={(e) => setFormData({ ...formData, mobileZalo: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                      placeholder="vd: 0918 345 678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Tiếp Nhận Văn Thư (*)</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-mono"
                      placeholder="vd: vanphong.giaoly@donboscodalat.vn"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trang Web / Kênh Thông Tin</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={formData.websiteUrl || ''}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                      placeholder="vd: https://donboscodalat.vn"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LEADERSHIP */}
          {activeTab === 'leadership' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-[11px] flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-700 shrink-0" />
                <span>Nhân sự lãnh đạo và điều hành ban giáo lý hiển thị trong hộp thông tin liên hệ và báo cáo chính thức.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cha Quản Sở / Giám Đốc (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.pastorName}
                    onChange={(e) => setFormData({ ...formData, pastorName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
                    placeholder="vd: Lm. Giuse Nguyễn Văn Hoàng, SDB"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thầy Phụ Trách / Đồng Hành</label>
                  <input
                    type="text"
                    value={formData.vicarOrAssistant}
                    onChange={(e) => setFormData({ ...formData, vicarOrAssistant: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
                    placeholder="vd: Thầy Giuse Phạm Hoàng Tuấn, SDB"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trưởng Ban Giáo Lý (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.catechistLeaderName}
                    onChange={(e) => setFormData({ ...formData, catechistLeaderName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
                    placeholder="vd: Thầy GB. Trần Minh Tâm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thư Ký Tiếp Nhận Hồ Sơ (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.secretaryName}
                    onChange={(e) => setFormData({ ...formData, secretaryName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
                    placeholder="vd: Cô Maria Nguyễn Thị Lan"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thủ Quỹ / Quản Lý Quỹ</label>
                  <input
                    type="text"
                    value={formData.treasurerName}
                    onChange={(e) => setFormData({ ...formData, treasurerName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
                    placeholder="vd: Cô Maria Nguyễn Thị Mai"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACADEMIC YEAR & MOTTO */}
          {activeTab === 'academic' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Chủ đề, khẩu hiệu và niên khóa xuất hiện trên thanh tiêu đề chính, bảng tin phụ huynh và bìa sổ liên lạc.</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên Niên Khóa Giáo Lý (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-bold text-amber-900"
                    placeholder="vd: 2026 – 2027"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Khẩu Hiệu / Chủ Đề Niên Khóa (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.motto}
                    onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-semibold"
                    placeholder="vd: Lý trí – Tôn giáo – Lòng thương mến"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tâm Tình / Thông Điệp Đầu Niên Khóa Của Quý Cha</label>
                  <textarea
                    rows={4}
                    value={formData.rectorMessage || ''}
                    onChange={(e) => setFormData({ ...formData, rectorMessage: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 leading-relaxed"
                    placeholder="Nhập thông điệp chào đón gửi tới phụ huynh và thiếu nhi..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SCHEDULE & WORKING HOURS */}
          {activeTab === 'schedule' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Thời gian biểu chính thức của các ca lễ, giờ học giáo lý và giờ tiếp phụ huynh tại văn phòng.</span>
              </div>

              <div className="space-y-3">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 pb-1 border-b border-slate-100">
                  <span>1. Lịch Học & Lễ Chúa Nhật (Các Khối Lớp)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Giờ Tập Trung</label>
                    <input
                      type="text"
                      value={formData.sundayGatherTime}
                      onChange={(e) => setFormData({ ...formData, sundayGatherTime: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      placeholder="07:00"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Giờ Thánh Lễ</label>
                    <input
                      type="text"
                      value={formData.sundayMassTime}
                      onChange={(e) => setFormData({ ...formData, sundayMassTime: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      placeholder="07:15"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Giờ Học Giáo Lý</label>
                    <input
                      type="text"
                      value={formData.sundayStudyTime}
                      onChange={(e) => setFormData({ ...formData, sundayStudyTime: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      placeholder="08:15 – 09:30"
                    />
                  </div>
                </div>

                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 pt-2 pb-1 border-b border-slate-100">
                  <span>2. Lịch Học Khối Bí Tích (Thứ Năm hàng tuần: Sơ Cấp 2 & Căn Bản 4)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Giờ Thánh Lễ Thứ 5</label>
                    <input
                      type="text"
                      value={formData.thursdaySacramentMassTime}
                      onChange={(e) => setFormData({ ...formData, thursdaySacramentMassTime: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      placeholder="17:30"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Giờ Học Giáo Lý Thứ 5</label>
                    <input
                      type="text"
                      value={formData.thursdaySacramentStudyTime}
                      onChange={(e) => setFormData({ ...formData, thursdaySacramentStudyTime: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      placeholder="18:15 – 19:15"
                    />
                  </div>
                </div>

                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 pt-2 pb-1 border-b border-slate-100">
                  <span>3. Thời Gian Làm Việc Văn Phòng Ban Giáo Lý</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Thứ Ba – Thứ Bảy</label>
                    <input
                      type="text"
                      value={formData.officeHoursWeekday}
                      onChange={(e) => setFormData({ ...formData, officeHoursWeekday: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      placeholder="Thứ Ba – Thứ Bảy: 08:00 – 11:30 | 14:00 – 17:30"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Chúa Nhật</label>
                    <input
                      type="text"
                      value={formData.officeHoursSunday}
                      onChange={(e) => setFormData({ ...formData, officeHoursSunday: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      placeholder="Chúa Nhật: 07:30 – 11:30 | 14:30 – 17:00"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Ngày Nghỉ Theo Quy Định</label>
                    <input
                      type="text"
                      value={formData.officeHoursClosed}
                      onChange={(e) => setFormData({ ...formData, officeHoursClosed: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-rose-700"
                      placeholder="Thứ Hai: Nghỉ theo quy định"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3 py-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
              title="Khôi phục dữ liệu gốc"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Khôi Phục Mặc Định</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition-colors cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
