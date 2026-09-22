import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Bell, 
  Download, 
  Filter, 
  Church, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  BookOpen, 
  Heart,
  ChevronRight,
  Info
} from 'lucide-react';
import { CalendarEvent, EmailNotification, Student, ClassRoom, UserAccount } from '../types';
import { exportCalendarEventsToExcel } from '../utils/excelExport';

interface ParentGeneralCalendarViewProps {
  events: CalendarEvent[];
  notifications: EmailNotification[];
  students: Student[];
  classes: ClassRoom[];
  currentUser: UserAccount;
}

export const ParentGeneralCalendarView: React.FC<ParentGeneralCalendarViewProps> = ({
  events,
  notifications,
  students,
  classes,
  currentUser,
}) => {
  const [activeSection, setActiveSection] = useState<'all' | 'schedule' | 'announcements' | 'activities'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState<'all' | 'liturgy' | 'teaching' | 'exam' | 'community'>('all');

  // Find children of this parent
  const myChildren = useMemo(() => {
    if (!currentUser) return [];
    return students.filter(s => {
      if (currentUser.studentId && currentUser.studentId.toLowerCase() === s.id.toLowerCase()) return true;
      if (currentUser.username && currentUser.username.toLowerCase() === s.id.toLowerCase()) return true;

      const sPhone = s.parentPhone?.replace(/[\s.-]/g, '') || '';
      const sParentName = s.parentName?.toLowerCase() || '';
      const sParentEmail = s.parentEmail?.toLowerCase().trim() || '';
      const uPhone = currentUser.phone?.replace(/[\s.-]/g, '') || '';
      const uName = currentUser.name?.toLowerCase() || '';
      const uEmail = currentUser.email?.toLowerCase().trim() || '';
      
      const matchPhone = uPhone && sPhone && (sPhone.includes(uPhone) || uPhone.includes(sPhone));
      const matchName = uName && sParentName && (sParentName.includes(uName) || uName.includes(sParentName));
      const matchEmail = uEmail && sParentEmail && uEmail === sParentEmail;
      return matchPhone || matchName || matchEmail;
    });
  }, [currentUser, students]);

  // Find class details of children
  const myChildrenClasses = useMemo(() => {
    const classIds = new Set(myChildren.map(c => c.classId));
    return classes.filter(cls => classIds.has(cls.id));
  }, [myChildren, classes]);

  const hasSacramentClassChild = myChildrenClasses.some(cls => cls.isSacramentClass);

  // Filter general announcements meant for parents (exclude internal catechist meetings)
  const parentAnnouncements = useMemo(() => {
    return notifications.filter(n => {
      // Strictly exclude internal staff meetings
      if (n.recipientType === 'all_catechists') return false;
      const subj = (n.subject || '').toLowerCase();
      if (subj.includes('họp giáo lý viên') || subj.includes('glv')) return false;

      // If targeted to specific class, check if it's one of our children's classes
      if (n.targetClassId) {
        return myChildrenClasses.some(c => c.id === n.targetClassId);
      }

      // Check recipient group
      if (n.recipientGroup) {
        const grp = n.recipientGroup.toLowerCase();
        if (grp.includes('toàn bộ') || grp.includes('phụ huynh')) return true;
        return myChildrenClasses.some(c => grp.includes(c.name.toLowerCase()));
      }

      // Default: include general parent/family notices
      return true;
    });
  }, [notifications, myChildrenClasses]);

  // Filter general calendar events for students and parents (exclude internal GLV-only events)
  const publicStudentEvents = useMemo(() => {
    return events.filter(e => {
      // Exclude internal GLV events
      if (e.type === 'meeting' || e.type === 'training') return false;
      const activityText = (e.activity || '').toLowerCase();
      const titleText = (e.title || '').toLowerCase();
      const feastText = (e.feastName || '').toLowerCase();
      const combined = `${activityText} ${titleText} ${feastText}`;

      // If it's specifically a GLV retreat / meeting / training only
      if (
        (combined.includes('glv tĩnh tâm') || combined.includes('glv picnic') || combined.includes('tập huấn')) &&
        !combined.includes('khai giảng') &&
        !combined.includes('thiếu nhi')
      ) {
        return false;
      }

      return true;
    });
  }, [events]);

  // Filtered by month and type
  const filteredEvents = useMemo(() => {
    return publicStudentEvents.filter(e => {
      if (selectedMonth !== 'all' && e.month !== selectedMonth) return false;

      if (activityTypeFilter !== 'all') {
        if (activityTypeFilter === 'liturgy') {
          return e.type === 'liturgy' || Boolean(e.liturgyRank);
        }
        if (activityTypeFilter === 'teaching') {
          return e.academicStatus === 'Học' || e.type === 'teaching';
        }
        if (activityTypeFilter === 'exam') {
          const act = (e.activity || '').toLowerCase();
          return e.type === 'exam' || act.includes('thi') || act.includes('ôn thi') || act.includes('kiểm tra');
        }
        if (activityTypeFilter === 'community') {
          const act = (e.activity || '').toLowerCase();
          return e.type === 'community' || act.includes('sinh hoạt') || act.includes('hội chợ') || act.includes('trung thu') || act.includes('bổn mạng');
        }
      }

      return true;
    });
  }, [publicStudentEvents, selectedMonth, activityTypeFilter]);

  const handleExportExcel = () => {
    exportCalendarEventsToExcel(publicStudentEvents, {
      academicYear: '2026 - 2027',
      filename: 'Nien_Lich_Sinh_Hoat_Giao_Ly_Don_Bosco_2026_2027.xlsx',
    });
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto text-slate-800">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-600 font-bold text-xl shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Dành Cho Phụ Huynh & Gia Đình
                </span>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-500 font-medium">Niên Khóa 2026 – 2027</span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">
                Niên Lịch Học Tập & Lịch Sinh Hoạt Giáo Lý
              </h1>
              <p className="text-xs text-slate-500">
                Lịch học hàng tuần, các thông báo học vụ từ Ban Giáo Lý và niên lịch sinh hoạt thiếu nhi Don Bosco Đà Lạt
              </p>
            </div>
          </div>

          <button
            type="button"
            id="parent-export-calendar-btn"
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start md:self-center shrink-0"
            title="Tải tệp Excel niên lịch sinh hoạt về máy để lưu trữ và in ấn"
          >
            <Download className="w-4 h-4" />
            <span>Tải Niên Lịch (.xlsx)</span>
          </button>
        </div>

        {/* Family Children Sync Card */}
        {myChildren.length > 0 && (
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>Lịch Học Được Đồng Bộ Cho Con Em Trong Gia Đình:</span>
              </span>
              <span className="text-[11px] text-blue-800 font-medium">
                {myChildren.length} học sinh
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {myChildren.map(child => {
                const cls = classes.find(c => c.id === child.classId);
                const isSacrament = cls?.isSacramentClass || false;
                return (
                  <div key={child.id} className="p-2.5 bg-white rounded-lg border border-blue-200 flex items-start gap-2.5 shadow-2xs">
                    <span className="text-lg">{child.gender === 'Nam' ? '👦' : '👧'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {child.holyName} {child.fullName}
                      </div>
                      <div className="text-[11px] text-blue-800 font-medium">
                        Lớp: <strong>{cls?.name || child.classId}</strong> ({cls?.level || 'Giáo lý'})
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1 flex flex-wrap items-center gap-1">
                        <span className="px-1.5 py-0.2 bg-blue-50 text-blue-900 rounded border border-blue-200 font-semibold">
                          Chúa Nhật: 07h30 – 10h30
                        </span>
                        {isSacrament && (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded border border-amber-300 font-bold">
                            Thứ Năm: 18h00 (Lớp Bí Tích)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2 text-xs font-semibold overflow-x-auto scrollbar-none pt-1">
          <button
            type="button"
            onClick={() => setActiveSection('all')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'all'
                ? 'border-amber-600 text-amber-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Tất Cả Niên Lịch</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('schedule')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'schedule'
                ? 'border-amber-600 text-amber-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>1. Lịch Học Định Kỳ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('announcements')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'announcements'
                ? 'border-amber-600 text-amber-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            <span>2. Các Thông Báo ({parentAnnouncements.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('activities')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === 'activities'
                ? 'border-amber-600 text-amber-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>3. Lịch Sinh Hoạt & Sự Kiện ({filteredEvents.length})</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: REGULAR CLASS SCHEDULES */}
      {(activeSection === 'all' || activeSection === 'schedule') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700" />
              <span>Khung Giờ Học Tập & Sinh Hoạt Giáo Lý Định Kỳ</span>
            </h2>
            <span className="text-[11px] text-slate-500">Áp dụng xuyên suốt niên khóa 2026 – 2027</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Sunday Morning Session */}
            <div className="p-4 bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-950 flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    CN
                  </div>
                  <span>Chúa Nhật Hàng Tuần (Toàn Thể Thiếu Nhi)</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-900 text-[10px] font-bold">
                  Bắt buộc
                </span>
              </div>

              <div className="space-y-1.5 text-slate-800 pl-1 pt-1">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-900 font-mono text-xs w-14 shrink-0">07h30</span>
                  <p className="text-[11px] text-slate-700">
                    <strong>Tập trung sinh hoạt & ổn định điểm danh</strong> tại sân Đa năng Don Bosco. Khởi động bài hát, cử điệu thiếu nhi.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-900 font-mono text-xs w-14 shrink-0">08h00</span>
                  <p className="text-[11px] text-slate-700">
                    <strong>Thánh Lễ Thiếu Nhi sốt sắng</strong> tại Nguyện đường Don Bosco. Các em tham gia phụng vụ lời Chúa và hát lễ.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-900 font-mono text-xs w-14 shrink-0">09h15</span>
                  <p className="text-[11px] text-slate-700">
                    <strong>Giờ học Giáo Lý chính khóa</strong> tại các phòng học theo từng khối lớp (Đến 10h15 - 10h30 kết thúc).
                  </p>
                </div>
              </div>
            </div>

            {/* Thursday Evening Session (Sacrament Classes) */}
            <div className="p-4 bg-gradient-to-br from-amber-50/90 to-orange-50/70 border border-amber-300 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-md bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                    T5
                  </div>
                  <span>Thứ Năm Hàng Tuần (Khối Lớp Bí Tích)</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[10px] font-bold">
                  2 Lớp Bí Tích
                </span>
              </div>

              <div className="space-y-1.5 text-slate-800 pl-1 pt-1">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-amber-900 font-mono text-xs w-14 shrink-0">18h00</span>
                  <p className="text-[11px] text-slate-700">
                    <strong>Giờ học Giáo Lý Bí Tích</strong> (chỉ có duy nhất mốc giờ 18h00 này).
                  </p>
                </div>
                <div className="p-2 bg-white/90 rounded-lg border border-amber-200 text-[11px] text-amber-900 mt-1">
                  <strong>Đối tượng tham dự:</strong> Áp dụng riêng cho 2 lớp Bí Tích:
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-slate-700">
                    <li><strong>Sơ Cấp 2:</strong> Chuẩn bị lãnh nhận Bí Tích Xưng Tội & Rước Lễ Lần Đầu.</li>
                    <li><strong>Căn Bản 4:</strong> Chuẩn bị lãnh nhận Bí Tích Thêm Sức.</li>
                  </ul>
                </div>
                <p className="text-[10px] text-amber-800 italic">
                  * Các em học các lớp khác không có giờ học Thứ Năm này.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Notice Card for Parents */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2 text-xs text-slate-600">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Kính gửi Quý Phụ Huynh:</strong> Xin quý phụ huynh hỗ trợ nhắc nhở các em mặc trang phục trang nghiêm (đồng phục Thiếu Nhi Thánh Thể hoặc áo sơ mi trắng, quần/váy sẫm màu), đeo thẻ thiếu nhi và có mặt trước giờ tập trung 10 phút.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 2: ANNOUNCEMENTS FOR PARENTS */}
      {(activeSection === 'all' || activeSection === 'announcements') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" />
              <span>Các Thông Báo Học Vụ & Sinh Hoạt Dành Cho Phụ Huynh</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              {parentAnnouncements.length} thông báo mới
            </span>
          </div>

          {parentAnnouncements.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
              Hiện chưa có thông báo mới nào từ Ban Giáo Lý hoặc Thầy Cô phụ trách lớp.
            </div>
          ) : (
            <div className="space-y-3">
              {parentAnnouncements.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-amber-300 transition-all space-y-2 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>{item.subject}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.sentAt}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed pl-4 border-l-2 border-amber-300">
                    {item.content}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span>Người gửi:</span>
                      <strong className="text-slate-800">{item.senderName}</strong>
                      {item.senderRole && (
                        <span className="text-slate-400">({item.senderRole})</span>
                      )}
                    </div>
                    {item.category && (
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: GENERAL ACTIVITY SCHEDULE & CALENDAR */}
      {(activeSection === 'all' || activeSection === 'activities') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Lịch Sinh Hoạt & Sự Kiện Niên Khóa 2026 – 2027</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Các sự kiện phụng vụ, thi cử, sinh hoạt dã ngoại và lễ bổn mạng thiếu nhi
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActivityTypeFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activityTypeFilter === 'all'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất Cả
              </button>

              <button
                type="button"
                onClick={() => setActivityTypeFilter('teaching')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activityTypeFilter === 'teaching'
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ngày Học
              </button>

              <button
                type="button"
                onClick={() => setActivityTypeFilter('exam')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activityTypeFilter === 'exam'
                    ? 'bg-rose-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Thi Cử & Ôn Tập
              </button>

              <button
                type="button"
                onClick={() => setActivityTypeFilter('liturgy')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activityTypeFilter === 'liturgy'
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Phụng Vụ & Lễ
              </button>

              <button
                type="button"
                onClick={() => setActivityTypeFilter('community')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activityTypeFilter === 'community'
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sinh Hoạt & Dã Ngoại
              </button>
            </div>
          </div>

          {/* Month selector tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedMonth('all')}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors cursor-pointer ${
                selectedMonth === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Cả Năm
            </button>
            {[9, 10, 11, 12, 1, 2, 3, 4, 5].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMonth(m)}
                className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors cursor-pointer ${
                  selectedMonth === m
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tháng {m < 10 ? `0${m}` : m}
              </button>
            ))}
          </div>

          {/* Event Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {filteredEvents.map(e => {
              const isExam = (e.activity || '').toLowerCase().includes('thi') || e.type === 'exam';
              const isOff = e.academicStatus === 'Nghỉ';
              const isSacramentOnly = e.isSacramentOnly;

              return (
                <div
                  key={e.id}
                  className={`p-3 rounded-xl border transition-all space-y-1.5 shadow-2xs ${
                    isExam
                      ? 'bg-rose-50/80 border-rose-200 hover:border-rose-400'
                      : isOff
                      ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      : isSacramentOnly
                      ? 'bg-amber-50/70 border-amber-300 hover:border-amber-400'
                      : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 font-mono">
                        {e.date}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                        Thứ {e.dayOfWeek}
                      </span>
                    </div>

                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      e.academicStatus === 'Học' 
                        ? 'bg-blue-100 text-blue-900' 
                        : e.academicStatus === 'Nghỉ' 
                        ? 'bg-slate-200 text-slate-700' 
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      {e.academicStatus}
                    </span>
                  </div>

                  {e.feastName && (
                    <div className="font-bold text-amber-950 text-xs line-clamp-1">
                      {e.feastName}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-700 leading-snug">
                    {e.activity}
                  </p>

                  {isSacramentOnly && (
                    <span className="inline-block text-[9px] px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-950 font-bold">
                      ⭐ Chỉ Dành Cho Lớp Bí Tích (18h00 Thứ Năm)
                    </span>
                  )}

                  {e.notes && (
                    <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-100">
                      {e.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredEvents.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
              Không có sự kiện nào phù hợp với bộ lọc đã chọn.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
