import React, { useState } from 'react';
import { 
  Calendar, 
  X, 
  Clock, 
  BookOpen, 
  Award, 
  CheckCircle2, 
  Church, 
  Sparkles, 
  Users, 
  FileText,
  Heart,
  ChevronRight
} from 'lucide-react';
import { CalendarEvent, ParishInfo } from '../types';
import { DEFAULT_PARISH_INFO } from '../data/mockData';

interface PublicAcademicYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  events?: CalendarEvent[];
  parishInfo?: ParishInfo;
}

export const PublicAcademicYearModal: React.FC<PublicAcademicYearModalProps> = ({
  isOpen,
  onClose,
  events = [],
  parishInfo = DEFAULT_PARISH_INFO
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'schedule' | 'milestones' | 'rules'>('overview');

  if (!isOpen) return null;

  // Filter key milestone events
  const milestoneEvents = events.filter(e => 
    e.academicStatus === 'Học' && (
      e.liturgyRank === 'T' || 
      e.activity.includes('KHAI GIẢNG') || 
      e.activity.includes('THI') ||
      e.activity.includes('BÍ TÍCH') ||
      e.activity.includes('GIÁNG SINH') ||
      e.activity.includes('PHỤC SINH')
    )
  ).slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 sm:p-6 flex items-start justify-between relative shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-semibold uppercase tracking-wider">
              <Church className="w-3.5 h-3.5" />
              <span>{parishInfo.parishName}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Thông Tin Niên Khóa Giáo Lý {parishInfo.academicYear}
            </h2>
            <p className="text-xs text-slate-300">
              "{parishInfo.motto}" (Hệ thống dự phòng Thánh Don Bosco)
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 shrink-0 gap-1 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('overview')}
            className={`px-3 py-2.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'overview'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Tổng Quan & Khẩu Hiệu</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('schedule')}
            className={`px-3 py-2.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'schedule'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Thời Khóa Biểu & Khối Lớp</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('milestones')}
            className={`px-3 py-2.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'milestones'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Các Mốc Thời Gian Trọng Tâm</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('rules')}
            className={`px-3 py-2.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'rules'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>Nội Quy & Tác Phong</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-xs sm:text-sm space-y-4">
          {activeSubTab === 'overview' && (
            <div className="space-y-4">
              {/* Motto Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent border border-amber-300 text-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm sm:text-base">
                  <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Chủ Đề Niên Khóa {parishInfo.academicYear}</span>
                </div>
                <p className="text-base sm:text-lg font-extrabold text-amber-950 font-serif italic">
                  "{parishInfo.motto}"
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {parishInfo.rectorMessage || 'Đồng hành cùng Giáo Hội hoàn vũ và Tỉnh dòng Salêdiêng Don Bosco Việt Nam, Ban Giáo Lý hướng đến mục tiêu giáo dục toàn diện thiếu nhi: bồi đắp đức tin, rèn luyện nhân bản và mở rộng tinh thần tông đồ bác ái.'}
                </p>
              </div>

              {/* Pillars Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Lý Trí (Ragione)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Giáo dục qua sự hiểu biết, khuyến khích thiếu nhi tư duy, đối thoại cởi mở và tìm kiếm chân lý trong Lời Chúa.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Tôn Giáo (Religione)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Đưa thiếu nhi đến với các Bí tích, đặc biệt là Bí tích Thánh Thể và Hòa Giải, cùng lòng sùng kính Mẹ Phù Hộ các Giáo Hữu.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Lòng Thương Mến (Amorevolezza)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Yêu thương bằng cả con tim, hiện diện với các em trong sân chơi, lắng nghe và thấu hiểu để nâng đỡ thiếu nhi nên người tốt.
                  </p>
                </div>
              </div>

              {/* Statistics / Numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
                  <div className="text-xl sm:text-2xl font-black text-indigo-900 font-mono">11</div>
                  <div className="text-[11px] font-semibold text-indigo-700">Lớp Giáo Lý</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <div className="text-xl sm:text-2xl font-black text-emerald-900 font-mono">4</div>
                  <div className="text-[11px] font-semibold text-emerald-700">Ngành Thiếu Nhi</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <div className="text-xl sm:text-2xl font-black text-amber-900 font-mono">35+</div>
                  <div className="text-[11px] font-semibold text-amber-700">Giáo Lý Viên & Tu Sĩ</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
                  <div className="text-xl sm:text-2xl font-black text-rose-900 font-mono">350+</div>
                  <div className="text-[11px] font-semibold text-rose-700">Học Sinh Thiếu Nhi</div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'schedule' && (
            <div className="space-y-4">
              {/* Daily / Weekly Routine */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                <h4 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-700" />
                  <span>Khung Giờ Sinh Hoạt & Học Giáo Lý Hằng Tuần</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 flex items-start gap-3">
                    <span className="px-2 py-1 bg-amber-100 text-amber-900 font-bold rounded-lg shrink-0">Chúa Nhật</span>
                    <div>
                      <strong className="text-slate-900 block">Dành cho toàn thể các ngành:</strong>
                      <ul className="list-disc list-inside text-slate-600 mt-1 space-y-0.5">
                        <li><strong>{parishInfo.sundayGatherTime}</strong>: Tập trung chuẩn bị & tập hát phụng vụ</li>
                        <li><strong>{parishInfo.sundayMassTime}</strong>: Thánh Lễ Thiếu Nhi tại {parishInfo.parishName}</li>
                        <li><strong>{parishInfo.sundayStudyTime}</strong>: Học Giáo Lý theo từng phòng lớp quy định</li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-indigo-100 flex items-start gap-3">
                    <span className="px-2 py-1 bg-rose-100 text-rose-900 font-bold rounded-lg shrink-0">Chiều Thứ Năm</span>
                    <div>
                      <strong className="text-slate-900 block">Lớp Bí Tích (Sơ Cấp 2 & Căn Bản 4):</strong>
                      <ul className="list-disc list-inside text-slate-600 mt-1 space-y-0.5">
                        <li><strong>{parishInfo.thursdaySacramentMassTime}</strong>: Thánh Lễ / Ôn kinh & tập nghi thức phụng vụ</li>
                        <li><strong>{parishInfo.thursdaySacramentStudyTime}</strong>: Học Giáo lý chuyên sâu chuẩn bị Rước Lễ & Thêm Sức</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divisions & Classes */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Hệ Thống Các Khối Lớp Giáo Lý</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="font-bold text-slate-900 text-xs text-amber-800">1. Khối Khai Tâm (6 – 8 tuổi)</div>
                    <div className="text-[11px] text-slate-600">Gồm: Khai Tâm 1 (Lớp mẫu giáo lớn), Khai Tâm 2. Giúp các em nhận biết Thiên Chúa là Cha nhân lành.</div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="font-bold text-slate-900 text-xs text-emerald-800">2. Khối Sơ Cấp (9 – 11 tuổi)</div>
                    <div className="text-[11px] text-slate-600">Gồm: Sơ Cấp 1, Sơ Cấp 2. Trọng tâm: Chuẩn bị lãnh nhận Bí Tích Xưng Tội & Rước Lễ Lần Đầu.</div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="font-bold text-slate-900 text-xs text-indigo-800">3. Khối Căn Bản (12 – 14 tuổi)</div>
                    <div className="text-[11px] text-slate-600">Gồm: Căn Bản 1, 2, 3, 4. Trọng tâm: Bồi dưỡng đời sống ân sủng và lãnh nhận Bí Tích Thêm Sức.</div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="font-bold text-slate-900 text-xs text-purple-800">4. Khối Vào Đời & Dự Trưởng (15+ tuổi)</div>
                    <div className="text-[11px] text-slate-600">Gồm: Vào Đời 1, 2, 3 & Lớp Dự Trưởng kế thừa. Học hỏi Tin Mừng, kỹ năng sống và dấn thân phục vụ cộng đoàn.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'milestones' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 pb-1">
                <span className="font-semibold">Lịch Trình Sự Kiện Quan Trọng Niên Khóa 2026 – 2027</span>
                <span className="text-[11px] text-amber-700">Trích Niên Lịch Giáo Sở</span>
              </div>

              <div className="space-y-2">
                {[
                  { date: '13/09/2026', title: 'Lễ Khai Giảng Niên Khóa Giáo Lý 2026 – 2027', desc: 'Thánh lễ trọng thể lúc 08h00 tại Nhà thờ, sau đó sinh hoạt kết nối.', badge: 'Khai giảng' },
                  { date: '29/10/2026', title: 'Thi Giữa Học Kỳ 1 (Lớp Bí Tích)', desc: 'Kiểm tra 45 phút ôn kiến thức Bí Tích Rước Lễ & Thêm Sức.', badge: 'Khảo hạch' },
                  { date: '08/11/2026', title: 'Thi Giữa Học Kỳ 1 (Toàn ban)', desc: 'Tất cả các khối lớp làm bài kiểm tra định kỳ học kỳ 1.', badge: 'Khảo hạch' },
                  { date: '13/12/2026', title: 'Thi Học Kỳ 1 (Lớp Bí Tích)', desc: 'Khảo hạch giáo lý học kỳ 1 và vấn đáp kinh bổn.', badge: 'Thi học kỳ' },
                  { date: '24-25/12/2026', title: 'Đại Lễ Chúa Giáng Sinh', desc: 'Thiếu nhi tham dự Lễ Đêm và hội chợ Canh thức Giáng Sinh Don Bosco.', badge: 'Lễ Trọng' },
                  { date: '31/01/2027', title: 'Đại Lễ Thánh Gioan Don Bosco', desc: 'Bổn mạng Dòng và Hội dòng Salêdiêng, ngày hội thể thao thiếu nhi.', badge: 'Bổn mạng' },
                  { date: '07/03/2027', title: 'Tĩnh Tâm Mùa Chay & Bí Tích Hòa Giải', desc: 'Tĩnh tâm thiếu nhi, xét mình và xưng tội chuẩn bị Phục Sinh.', badge: 'Mùa Chay' },
                  { date: '16/05/2027', title: 'Thi Học Kỳ 2 Toàn Ban', desc: 'Kiểm tra tổng kết chương trình giáo lý cả năm học.', badge: 'Thi học kỳ' },
                  { date: '06/06/2027', title: 'Lễ Bế Giảng & Nghi Thức Trao Ban Bí Tích', desc: 'Thánh lễ Bế giảng, phát thưởng học sinh giỏi và rước lễ lần đầu.', badge: 'Bế giảng' },
                  { date: 'Tháng 07/2027', title: 'Hội Trại Hè Don Bosco & Khóa Huấn Luyện', desc: 'Trại hè thiếu nhi và khóa huấn luyện Huynh trưởng/Dự trưởng mới.', badge: 'Trại hè' }
                ].map((m, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 hover:bg-amber-50/50 border border-slate-200 rounded-xl flex items-start gap-3 transition-colors text-xs">
                    <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-1 rounded-md shrink-0">
                      {m.date}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900">{m.title}</strong>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'rules' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                <h4 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-700" />
                  <span>Quy Định Chuyên Cần & Tác Phong Thiếu Nhi</span>
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  Để hình thành nhân bản và nề nếp tốt, kính xin Quý Phụ Huynh cùng cộng tác nhắc nhở các em:
                </p>
                <div className="space-y-1.5 pt-1 text-slate-800">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span><strong>Đồng phục thiếu nhi:</strong> Áo sơ mi trắng, quần/váy tối màu, mang khăn quàng Thiếu Nhi Thánh Thể đúng ngành và mang giày/dép có quai hậu.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span><strong>Thời gian:</strong> Có mặt tại sân trước 15 phút trước Thánh lễ và giờ học. Trường hợp đi trễ hoặc vắng mặt có phép, phụ huynh vui lòng báo trước cho GLV chủ nhiệm.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span><strong>Học cụ:</strong> Mang theo sách giáo lý, tập ghi chép, bút và Phiếu liên lạc giáo lý mỗi tuần.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span><strong>Điểm chuyên cần:</strong> Được tính điểm tích lũy xếp loại đạo đức và là điều kiện để xét lãnh nhận các Bí Tích (Rước Lễ Lần Đầu, Thêm Sức).</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">Giao Lưu & Liên Lạc Gia Đình – Ban Giáo Lý</h4>
                <p className="text-slate-600 leading-relaxed">
                  Phụ huynh có thể theo dõi tiến độ điểm danh, hạnh kiểm và điểm số của con em trực tiếp trên Cổng Thông Tin Phụ Huynh bằng Mã Học Sinh hoặc liên hệ trực tiếp Văn phòng Giáo lý trong giờ tiếp phụ huynh.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="text-[11px]">
            Ban Giáo Lý Giáo Sở Don Bosco Đà Lạt
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
