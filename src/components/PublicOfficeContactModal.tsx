import React, { useState } from 'react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  X, 
  Church, 
  Users, 
  MessageSquare, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Send
} from 'lucide-react';

interface PublicOfficeContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PublicOfficeContactModal: React.FC<PublicOfficeContactModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [messageSent, setMessageSent] = useState(false);
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackPhone, setFeedbackPhone] = useState('');
  const [feedbackContent, setFeedbackContent] = useState('');

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackName.trim() || !feedbackContent.trim()) return;
    setMessageSent(true);
    setTimeout(() => {
      setFeedbackName('');
      setFeedbackPhone('');
      setFeedbackContent('');
      setMessageSent(false);
    }, 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between relative shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-semibold uppercase tracking-wider">
              <Church className="w-3.5 h-3.5" />
              <span>Văn Phòng Giáo Lý</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Thông Tin Liên Hệ Văn Phòng Giáo Lý
            </h2>
            <p className="text-xs text-slate-300">
              Giáo Sở Don Bosco Đà Lạt • Tiếp nhận và đồng hành cùng Quý Phụ Huynh & Học Sinh
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

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-xs sm:text-sm space-y-4">
          {/* Main Contacts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Phone Hotline */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Phone className="w-4 h-4 text-amber-700" />
                  <span>Điện Thoại / Hotline Zalo</span>
                </div>
                <div className="font-mono font-bold text-base text-slate-900">
                  (0263) 3822 514
                </div>
                <div className="font-mono text-xs text-slate-600">
                  Di động / Zalo: 0918 345 678
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('02633822514', 'phone')}
                className="self-start px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-semibold text-amber-900 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedField === 'phone' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đã sao chép SĐT</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép số điện thoại</span>
                  </>
                )}
              </button>
            </div>

            {/* Email Contact */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                  <Mail className="w-4 h-4 text-indigo-700" />
                  <span>Hộp Thư Điện Tử (Email)</span>
                </div>
                <div className="font-mono font-semibold text-xs text-slate-900 break-all">
                  vanphong.giaoly@donboscodalat.vn
                </div>
                <div className="text-[11px] text-slate-500">
                  Hỗ trợ hồ sơ, giải đáp thủ tục giáo lý
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('vanphong.giaoly@donboscodalat.vn', 'email')}
                className="self-start px-2.5 py-1 bg-white hover:bg-indigo-100 border border-indigo-300 rounded-lg text-[11px] font-semibold text-indigo-900 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedField === 'email' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đã sao chép Email</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép địa chỉ Email</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Working Hours & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Working Hours */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Giờ Làm Việc & Tiếp Phụ Huynh</span>
              </div>
              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span>Thứ Ba – Thứ Bảy:</span>
                  <strong className="text-slate-900 font-mono">08:00 – 11:30 | 14:00 – 17:30</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span>Chúa Nhật:</span>
                  <strong className="text-slate-900 font-mono">07:30 – 11:30 | 14:30 – 17:00</strong>
                </div>
                <div className="flex justify-between text-rose-600 font-medium pt-0.5">
                  <span>Thứ Hai:</span>
                  <span>Nghỉ theo quy định</span>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>Địa Điểm Trực Tiếp</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                <strong>Văn phòng Ban Giáo Lý Don Bosco Đà Lạt</strong><br />
                04 Bùi Thị Xuân, Phường 2, TP. Đà Lạt, Tỉnh Lâm Đồng (Khuôn viên Giáo Sở Don Bosco Đà Lạt).
              </p>
              <div className="text-[11px] text-slate-500 italic">
                * Quý phụ huynh vào cổng chính, rẽ phải lên tầng 1 dãy nhà Mục Vụ.
              </div>
            </div>
          </div>

          {/* Key Responsible Persons */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Ban Điều Hành Giáo Lý Niên Khóa 2026 – 2027</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-amber-700">Cha Quản Sở / Giám Đốc</div>
                <div className="font-bold text-slate-900 mt-0.5">Lm. Giuse Nguyễn Văn Hoàng, SDB</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-indigo-700">Trưởng Ban Giáo Lý</div>
                <div className="font-bold text-slate-900 mt-0.5">Thầy GB. Trần Minh Tâm</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-emerald-700">Thư Ký Tiếp Nhận Hồ Sơ</div>
                <div className="font-bold text-slate-900 mt-0.5">Cô Maria Nguyễn Thị Lan</div>
              </div>
            </div>
          </div>

          {/* Quick Message / Inquiry Form */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <MessageSquare className="w-4 h-4 text-amber-700" />
                <span>Gửi Thắc Mắc / Lời Nhắn Nhanh Tới Văn Phòng</span>
              </div>
              <span className="text-[10px] text-slate-500">Phản hồi trong 24h</span>
            </div>

            {messageSent ? (
              <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Lời nhắn của Quý vị đã được gửi thành công đến Văn phòng Giáo lý! Xin chân thành cảm ơn.</span>
              </div>
            ) : (
              <form onSubmit={handleSendFeedback} className="space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Họ và tên của Quý Phụ Huynh..."
                    value={feedbackName}
                    onChange={(e) => setFeedbackName(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <input
                    type="tel"
                    placeholder="Số điện thoại liên hệ (nếu cần gọi lại)..."
                    value={feedbackPhone}
                    onChange={(e) => setFeedbackPhone(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <textarea
                  required
                  rows={2}
                  placeholder="Nội dung cần liên hệ hoặc thắc mắc về tình hình học giáo lý của con em..."
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi Lời Nhắn Đến Văn Phòng</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="text-[11px]">
            Văn phòng Giáo Lý Don Bosco Đà Lạt hân hạnh phục vụ
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Đóng Lại
          </button>
        </div>
      </div>
    </div>
  );
};
