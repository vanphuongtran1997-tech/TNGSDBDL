import React, { useState } from 'react';
import { 
  Calendar, 
  Mail, 
  Send, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Plus,
  Search,
  Bell
} from 'lucide-react';
import { CalendarEvent, EmailNotification, Student, Catechist, ClassRoom, Role } from '../types';

interface ScheduleAndEmailManagerProps {
  events: CalendarEvent[];
  notifications: EmailNotification[];
  students: Student[];
  catechists: Catechist[];
  classes: ClassRoom[];
  userRole: Role;
  onAddEvent: (ev: Omit<CalendarEvent, 'id'>) => void;
  onSendEmail: (email: Omit<EmailNotification, 'id'>) => void;
}

export const ScheduleAndEmailManager: React.FC<ScheduleAndEmailManagerProps> = ({
  events,
  notifications,
  students,
  catechists,
  classes,
  userRole,
  onAddEvent,
  onSendEmail,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'email_dispatch' | 'email_logs'>('schedule');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);

  // Email Dispatch State
  const [emailTargetGroup, setEmailTargetGroup] = useState<'all_parents' | 'class_parents' | 'all_catechists' | 'unpaid_parents'>('all_catechists');
  const [selectedTargetClassId, setSelectedTargetClassId] = useState<string>(classes[0]?.id || '');
  const [emailTemplate, setEmailTemplate] = useState<string>('meeting');
  const [customSubject, setCustomSubject] = useState<string>('Thư Mời Họp Định Kỳ Ban Giáo Lý Don Bosco Đà Lạt');
  const [customBody, setCustomBody] = useState<string>(
    'Kính gửi Quý Thầy, Quý Sơ và Quý Anh Chị Giáo Lý Viên,\n\nBan Giáo Lý kính mời Quý Vị tham dự buổi họp định kỳ vào lúc 10h30 Chúa Nhật sau Thánh lễ tại Hội trường Don Bosco để triển khai kế hoạch thi học kỳ và chuẩn bị tĩnh tâm Mùa Chay.\n\nNguyện xin Don Bosco và Mẹ Phù Hộ chúc lành cho sứ vụ của chúng ta.\n\nTrân trọng,\nBan Giáo Lý Giáo Sở Don Bosco Đà Lạt'
  );
  const [isSending, setIsSending] = useState(false);

  // Event Form State
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '07:30',
    endTime: '10:30',
    location: 'Nhà thờ & Khuôn viên Don Bosco Đà Lạt',
    type: 'teaching' as CalendarEvent['type'],
    targetAudience: 'Toàn thể Thiếu nhi & GLV',
    description: '',
  });

  const canManage = userRole === 'admin' || userRole === 'pastor' || userRole === 'catechist_leader';

  const filteredEvents = events.filter(e => 
    selectedEventType === 'all' || e.type === selectedEventType
  );

  const handleTemplateChange = (tmpl: string) => {
    setEmailTemplate(tmpl);
    if (tmpl === 'meeting') {
      setCustomSubject('Thư Mời Họp Định Kỳ Ban Giáo Lý Don Bosco Đà Lạt');
      setCustomBody(
        'Kính gửi Quý Anh Chị Giáo Lý Viên,\n\nBan Giáo Lý kính mời Quý Anh Chị tham dự buổi họp định kỳ vào lúc 10h30 Chúa Nhật tuần này tại Hội trường Don Bosco để tổng kết chuyên cần và chuẩn bị bài kiểm tra 45 phút sắp tới.\n\nTrân trọng,\nBan Giáo Lý Giáo Sở Don Bosco Đà Lạt'
      );
    } else if (tmpl === 'attendance_alert') {
      setCustomSubject('Thông Báo Nhắc Nhở Chuyên Cần & Tham Dự Thánh Lễ Thiếu Nhi');
      setCustomBody(
        'Kính gửi Quý Phụ Huynh,\n\nBan Giáo Lý xin thông báo tình hình chuyên cần của các em thiếu nhi trong tháng vừa qua. Kính mong Quý Phụ Huynh tiếp tục đồng hành, nhắc nhở các em đi học giáo lý và tham dự Thánh lễ Chúa Nhật đúng giờ (07h30 sáng).\n\nTrân trọng cảm ơn Quý Phụ Huynh!'
      );
    } else if (tmpl === 'tuition_reminder') {
      setCustomSubject('Nhắc Nhở Nộp Quỹ Giáo Lý & Sách Học Niên Khóa 2026 - 2027');
      setCustomBody(
        'Kính gửi Quý Phụ Huynh,\n\nNhằm phục vụ kinh phí sách vở giáo lý, tài liệu và sinh hoạt cho các em trong niên khóa, Văn phòng Giáo lý kính nhắc Quý Phụ Huynh hoàn tất đóng quỹ trước ngày 15/10/2026.\n\nXin chân thành cảm ơn sự cộng tác của Quý Phụ Huynh!'
      );
    } else if (tmpl === 'exam_schedule') {
      setCustomSubject('Lịch Thi Học Kỳ & Đánh Giá Kết Quả Giáo Lý');
      setCustomBody(
        'Kính gửi Quý Phụ Huynh và các em Thiếu Nhi,\n\nBan Giáo Lý xin thông báo Lịch thi Giáo lý Học kỳ sẽ diễn ra vào Chúa Nhật tới. Bài thi gồm phần Giáo lý căn bản và Lịch sử Cứu Độ (hệ số 2). Chúc các em ôn tập sốt sắng và đạt kết quả tốt đẹp!\n\nBan Giáo Lý Don Bosco Đà Lạt'
      );
    }
  };

  const handleSendEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    let recipientCount = 0;
    let targetDesc = '';

    if (emailTargetGroup === 'all_parents') {
      recipientCount = students.length;
      targetDesc = `Phụ huynh toàn bộ ${students.length} thiếu nhi`;
    } else if (emailTargetGroup === 'class_parents') {
      const cls = classes.find(c => c.id === selectedTargetClassId);
      const count = students.filter(s => s.classId === selectedTargetClassId).length;
      recipientCount = count;
      targetDesc = `Phụ huynh lớp ${cls?.name} (${count} gia đình)`;
    } else if (emailTargetGroup === 'all_catechists') {
      recipientCount = catechists.length;
      targetDesc = `Toàn thể ${catechists.length} Giáo lý viên Don Bosco`;
    } else if (emailTargetGroup === 'unpaid_parents') {
      recipientCount = 18;
      targetDesc = 'Các gia đình chưa hoàn tất đóng quỹ giáo lý';
    }

    setTimeout(() => {
      onSendEmail({
        subject: customSubject,
        recipientGroup: targetDesc,
        recipientCount,
        content: customBody,
        sentAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'Đã gửi thành công',
        senderRole: userRole === 'pastor' ? 'Linh mục Quản sở' : 'Trưởng Ban Giáo Lý',
      });
      setIsSending(false);
      alert(`Đã gửi thông báo email thành công đến ${recipientCount} người nhận!`);
      setActiveTab('email_logs');
    }, 600);
  };

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEvent(newEvent);
    setIsAddEventModalOpen(false);
    setNewEvent({
      title: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '07:30',
      endTime: '10:30',
      location: 'Nhà thờ & Khuôn viên Don Bosco Đà Lạt',
      type: 'teaching',
      targetAudience: 'Toàn thể Thiếu nhi & GLV',
      description: '',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-800" />
              <span>Lịch Giảng Dạy, Sinh Hoạt & Gửi Email Nhắc Nhở</span>
            </h1>
            <p className="text-xs text-slate-500">
              Theo dõi lịch dạy giáo lý, họp phụ huynh, họp GLV và gửi email thông báo tự động
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => setIsAddEventModalOpen(true)}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Sự Kiện Lịch</span>
              </button>
            )}
          </div>
        </div>

        {/* Regular Weekly Schedules from Don Bosco Guidelines */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg">
            <span className="font-bold text-blue-900 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Chúa Nhật Hàng Tuần</span>
            </span>
            <p className="text-[11px] text-blue-950 mt-1">
              <strong>07h30 – 10h30:</strong> Tập trung, Thánh Lễ & Giờ học Giáo Lý toàn bộ các lớp.
            </p>
          </div>

          <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg">
            <span className="font-bold text-amber-900 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Thứ Năm (Lớp Bí Tích)</span>
            </span>
            <p className="text-[11px] text-amber-950 mt-1">
              <strong>17h30 – 19h00:</strong> Giờ học bổ sung cho Lớp Xưng Tội Rước Lễ & Thêm Sức.
            </p>
          </div>

          <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-lg">
            <span className="font-bold text-purple-900 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Thứ 3 & 6 (Đào Tạo GLV)</span>
            </span>
            <p className="text-[11px] text-purple-950 mt-1">
              <strong>19h00 – 20h30:</strong> Lớp đào tạo Dự trưởng & Huấn luyện Giáo lý viên kế thừa.
            </p>
          </div>

          <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg">
            <span className="font-bold text-emerald-900 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Thứ 7 Đầu Tháng</span>
            </span>
            <p className="text-[11px] text-emerald-950 mt-1">
              <strong>19h00 – 20h30:</strong> GLV Tĩnh tâm & Chầu Thánh Thể tại Nguyện đường Don Bosco.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3 gap-3 text-xs font-semibold shadow-2xs">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`pb-2.5 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'schedule' ? 'border-blue-700 text-blue-900 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Lịch Giảng Dạy & Sinh Hoạt Niên Khóa ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('email_dispatch')}
          className={`pb-2.5 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'email_dispatch' ? 'border-blue-700 text-blue-900 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Soạn & Gửi Email Nhắc Nhở</span>
        </button>

        <button
          onClick={() => setActiveTab('email_logs')}
          className={`pb-2.5 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'email_logs' ? 'border-blue-700 text-blue-900 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Nhật Ký Thông Báo Đã Gửi ({notifications.length})</span>
        </button>
      </div>

      {/* Schedule Calendar View */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Lọc theo loại:</span>
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="py-1 px-2.5 border border-slate-300 rounded bg-white text-xs"
              >
                <option value="all">Tất cả sự kiện</option>
                <option value="teaching">Lịch Giảng Dạy & Lớp Học</option>
                <option value="retreat">Tĩnh Tâm & Phụng Vụ</option>
                <option value="meeting">Họp GLV / Họp Phụ Huynh</option>
                <option value="training">Lớp Huấn Luyện & Đào Tạo</option>
              </select>
            </div>

            <span className="text-xs text-slate-500 font-mono">Niên khóa: 2026 - 2027</span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredEvents.map((ev) => (
              <div key={ev.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ev.type === 'teaching' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                      ev.type === 'retreat' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                      ev.type === 'meeting' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}>
                      {ev.type === 'teaching' ? 'Giảng Dạy' :
                       ev.type === 'retreat' ? 'Tĩnh Tâm' :
                       ev.type === 'meeting' ? 'Họp Định Kỳ' : 'Huấn Luyện'}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">{ev.title}</h3>
                  </div>

                  <p className="text-slate-600">{ev.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ev.date} ({ev.startTime} - {ev.endTime})</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ev.location}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ev.targetAudience}</span>
                    </span>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <button
                    onClick={() => {
                      setEmailTemplate('meeting');
                      setCustomSubject(`Nhắc nhở: ${ev.title} - Giáo Sở Don Bosco`);
                      setCustomBody(`Kính gửi Quý Thầy, Quý Sơ, Quý Phụ Huynh và Thiếu Nhi,\n\nBan Giáo Lý kính nhắc sự kiện: ${ev.title}\nThời gian: ${ev.date} từ ${ev.startTime} đến ${ev.endTime}\nĐịa điểm: ${ev.location}\nNội dung: ${ev.description}\n\nKính mong mọi người tham dự đúng giờ!`);
                      setActiveTab('email_dispatch');
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Gửi Email Nhắc Nhở</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Dispatch Tab */}
      {activeTab === 'email_dispatch' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-xs space-y-4 max-w-3xl mx-auto">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Soạn & Gửi Email Thông Báo Tự Động</h2>
            <p className="text-slate-500 text-[11px]">
              Gửi email thông báo lịch học, kết quả học tập, nhắc nhở học phí hoặc triệu tập họp GLV
            </p>
          </div>

          <form onSubmit={handleSendEmailSubmit} className="space-y-4">
            {/* Quick Template Selector */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mẫu Email Có Sẵn:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'meeting', label: 'Thư Mời Họp GLV' },
                  { id: 'attendance_alert', label: 'Cảnh Báo Chuyên Cần' },
                  { id: 'tuition_reminder', label: 'Nhắc Nộp Quỹ Giáo Lý' },
                  { id: 'exam_schedule', label: 'Lịch Thi Học Kỳ' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTemplateChange(t.id)}
                    className={`p-2 rounded border text-left transition-colors font-medium text-[11px] ${
                      emailTemplate === t.id ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Group Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nhóm Người Nhận:</label>
                <select
                  value={emailTargetGroup}
                  onChange={(e) => setEmailTargetGroup(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="all_catechists">Toàn thể Giáo Lý Viên ({catechists.length} người)</option>
                  <option value="all_parents">Phụ huynh toàn bộ các lớp ({students.length} gia đình)</option>
                  <option value="class_parents">Phụ huynh theo 1 Lớp cụ thể</option>
                  <option value="unpaid_parents">Phụ huynh chưa nộp quỹ giáo lý</option>
                </select>
              </div>

              {emailTargetGroup === 'class_parents' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chọn Lớp:</label>
                  <select
                    value={selectedTargetClassId}
                    onChange={(e) => setSelectedTargetClassId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tiêu Đề Email:</label>
              <input
                type="text"
                required
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 font-medium"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nội Dung Thư:</label>
              <textarea
                rows={6}
                required
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-sans leading-relaxed text-slate-800"
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="submit"
                disabled={isSending}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? 'Đang gửi email...' : 'Gửi Email Ngay'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Email History Logs */}
      {activeTab === 'email_logs' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
            Nhật Ký Các Email Đã Gửi Đi
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {notifications.map((n) => (
              <div key={n.id} className="p-4 space-y-1.5 hover:bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>{n.subject}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 text-[10px] rounded-full border border-emerald-300 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{n.status}</span>
                    </span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">{n.sentAt}</span>
                </div>

                <div className="text-slate-600 flex items-center gap-3 text-[11px]">
                  <span>Gửi tới: <strong>{n.recipientGroup}</strong> ({n.recipientCount} người)</span>
                  <span>• Người gửi: <strong>{n.senderRole}</strong></span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700 whitespace-pre-line text-[11px]">
                  {n.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {isAddEventModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 border border-slate-200 text-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Thêm Sự Kiện Vào Lịch Giảng Dạy</h3>
            <form onSubmit={handleAddEventSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tên Sự Kiện:</label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ngày:</label>
                  <input
                    type="date"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Loại Sự Kiện:</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  >
                    <option value="teaching">Giảng Dạy / Lớp Học</option>
                    <option value="meeting">Họp Định Kỳ</option>
                    <option value="retreat">Tĩnh Tâm / Thánh Lễ</option>
                    <option value="training">Lớp Huấn Luyện</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Giờ Bắt Đầu:</label>
                  <input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Giờ Kết Thúc:</label>
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Địa Điểm:</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Thành Phần Tham Dự:</label>
                <input
                  type="text"
                  value={newEvent.targetAudience}
                  onChange={(e) => setNewEvent({ ...newEvent, targetAudience: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Mô Tả Chi Tiết:</label>
                <textarea
                  rows={2}
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddEventModalOpen(false)}
                  className="px-3 py-1 border rounded text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-blue-700 text-white rounded font-semibold"
                >
                  Lưu Sự Kiện
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
