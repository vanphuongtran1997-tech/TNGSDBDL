import React, { useState, useEffect, useMemo } from 'react';
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
  Bell,
  FileSpreadsheet,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Info,
  Lock,
  UserCheck
} from 'lucide-react';
import { CalendarEvent, EmailNotification, Student, Catechist, ClassRoom, Role, UserAccount } from '../types';
import { CalendarExcelModal } from './CalendarExcelModal';
import { exportCalendarTemplateToExcel, exportCalendarEventsToExcel } from '../utils/excelExport';
import { 
  getUserAuthorizedClasses, 
  canSendEmailToAllParents, 
  canSendEmailToLowerRoles, 
  canSendMassEmail,
  getRoleHierarchyLevel 
} from '../utils/rolePermissions';

export type EmailTargetKey = 
  | 'class_parents'
  | 'all_parents'
  | 'unpaid_parents'
  | 'all_catechists_trainees'
  | 'catechists_only'
  | 'trainees_only'
  | 'catechist_leaders_and_secretaries'
  | 'all_parish_staff';

interface ScheduleAndEmailManagerProps {
  events: CalendarEvent[];
  notifications: EmailNotification[];
  students: Student[];
  catechists: Catechist[];
  classes: ClassRoom[];
  userRole: Role;
  currentUser?: UserAccount;
  initialTab?: 'schedule' | 'email_dispatch' | 'email_logs';
  onAddEvent: (ev: Omit<CalendarEvent, 'id'>) => void;
  onBatchAddEvents?: (newEvents: Omit<CalendarEvent, 'id'>[], replaceExisting: boolean) => void;
  onDeleteEvent?: (id: string) => void;
  onSendEmail: (email: Omit<EmailNotification, 'id'>) => void;
}

export const ScheduleAndEmailManager: React.FC<ScheduleAndEmailManagerProps> = ({
  events,
  notifications,
  students,
  catechists,
  classes,
  userRole,
  currentUser,
  initialTab = 'schedule',
  onAddEvent,
  onBatchAddEvents,
  onDeleteEvent,
  onSendEmail,
}) => {
  const isParent = userRole === 'parent';
  const isHigherRole = canSendMassEmail(userRole); // admin, pastor, catechist_leader, secretary

  // Authorized classes for class teachers
  const authorizedClasses = useMemo(() => {
    if (!currentUser) return classes;
    return getUserAuthorizedClasses(currentUser, classes);
  }, [currentUser, classes]);

  const [activeTab, setActiveTab] = useState<'schedule' | 'email_dispatch' | 'email_logs'>(
    isParent ? 'schedule' : initialTab
  );

  useEffect(() => {
    if (isParent && activeTab !== 'schedule') {
      setActiveTab('schedule');
    }
  }, [isParent, activeTab]);

  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelModalTab, setExcelModalTab] = useState<'export_template' | 'import_excel' | 'export_current'>('export_template');

  // Initial Target Group & Selected Class based on role permissions
  // Rule: Teachers only can send to their class parents
  // Higher roles can send to all parents and lower roles
  const [emailTargetGroup, setEmailTargetGroup] = useState<EmailTargetKey>(
    isHigherRole ? 'all_parents' : 'class_parents'
  );

  const defaultClassId = authorizedClasses[0]?.id || classes[0]?.id || '';
  const [selectedTargetClassId, setSelectedTargetClassId] = useState<string>(defaultClassId);

  useEffect(() => {
    if (!isHigherRole) {
      setEmailTargetGroup('class_parents');
      if (authorizedClasses.length > 0 && !authorizedClasses.some(c => c.id === selectedTargetClassId)) {
        setSelectedTargetClassId(authorizedClasses[0].id);
      }
    }
  }, [isHigherRole, authorizedClasses, selectedTargetClassId]);

  const [emailTemplate, setEmailTemplate] = useState<string>(
    isHigherRole ? 'parish_announcement' : 'class_learning'
  );
  const [customSubject, setCustomSubject] = useState<string>(
    isHigherRole 
      ? 'Thông Báo Niên Khóa & Sinh Hoạt Thiếu Nhi Don Bosco Đà Lạt' 
      : `Thông Báo Học Tập & Chuyên Cần Lớp ${authorizedClasses[0]?.name || ''}`
  );
  const [customBody, setCustomBody] = useState<string>(
    isHigherRole
      ? 'Kính gửi Quý Phụ Huynh và Thiếu Nhi toàn Giáo Sở,\n\nBan Giáo Lý xin thông báo chương trình học tập và sinh hoạt niên khóa 2026 – 2027. Kính mong Quý Phụ Huynh tiếp tục đồng hành và nhắc nhở các em tham gia đầy đủ các giờ học và Thánh Lễ.\n\nNguyện xin Chúa và Mẹ Maria chúc lành cho Quý Gia đình!\n\nTrân trọng,\nBan Giáo Lý Giáo Sở Don Bosco Đà Lạt'
      : `Kính gửi Quý Phụ Huynh lớp ${authorizedClasses[0]?.name || ''},\n\nGiáo lý viên phụ trách xin gửi đến Quý Phụ Huynh tình hình học tập và sinh hoạt giáo lý của lớp trong tuần qua. Kính mong Quý Phụ Huynh tiếp tục nhắc nhở các em chuyên cần đi học giáo lý và dự Thánh lễ Chúa Nhật đúng giờ (07h30 sáng).\n\nTrân trọng cảm ơn Quý Phụ Huynh!`
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

  const filteredEvents = events.filter(e => 
    selectedEventType === 'all' || e.type === selectedEventType
  );

  // Handle Template Changes
  const handleTemplateChange = (tmpl: string) => {
    setEmailTemplate(tmpl);
    const targetClass = classes.find(c => c.id === selectedTargetClassId);
    const className = targetClass ? targetClass.name : 'Giáo Lý';

    if (tmpl === 'class_learning') {
      setCustomSubject(`Nhắc Nhở Học Tập & Chuẩn Bị Bài Lớp ${className}`);
      setCustomBody(
        `Kính gửi Quý Phụ Huynh và các em học viên Lớp ${className},\n\nGiáo lý viên phụ trách xin nhắc các em ôn tập bài học tuần này và chuẩn bị tập vở đầy đủ trước giờ học Chúa Nhật (09h15). Xin Quý Phụ Huynh cùng đồng hành nhắc nhở con em.\n\nTrân trọng,\nGiáo Lý Viên Phụ Trách Lớp ${className}`
      );
    } else if (tmpl === 'class_attendance') {
      setCustomSubject(`Thông Báo Chuyên Cần & Tham Dự Thánh Lễ Lớp ${className}`);
      setCustomBody(
        `Kính gửi Quý Phụ Huynh Lớp ${className},\n\nGiáo lý viên phụ trách xin thông báo tình hình chuyên cần của các em trong tháng vừa qua. Kính mong Quý Phụ Huynh tiếp tục đồng hành, nhắc nhở các em tập trung đúng 07h30 sáng Chúa Nhật để tham dự Thánh Lễ lúc 08h00 và học giáo lý lúc 09h15.\n\nTrân trọng cảm ơn Quý Phụ Huynh!`
      );
    } else if (tmpl === 'class_parents_meeting') {
      setCustomSubject(`Thư Mời Họp Phụ Huynh Lớp ${className} – Niên Khóa 2026-2027`);
      setCustomBody(
        `Kính gửi Quý Phụ Huynh Lớp ${className},\n\nGiáo lý viên phụ trách kính mời Quý Phụ Huynh tham dự buổi họp phụ huynh lớp vào lúc 10h30 Chúa Nhật tuần này tại phòng học số 3 (Khu Giáo Lý Don Bosco) để trao đổi về tình hình học tập và chuẩn bị cho các kỳ thi sắp tới.\n\nSự hiện diện của Quý Phụ Huynh là niềm khích lệ lớn cho các em!\n\nTrân trọng,\nGiáo Lý Viên Phụ Trách Lớp ${className}`
      );
    } else if (tmpl === 'class_exam') {
      setCustomSubject(`Lịch Kiểm Tra & Ôn Tập Lớp ${className}`);
      setCustomBody(
        `Kính gửi Quý Phụ Huynh và các em học sinh Lớp ${className},\n\nLớp chúng ta sẽ có bài kiểm tra học kỳ vào Chúa Nhật tới. Nội dung ôn tập đã được gửi trong sổ tay giáo lý. Kính mong Quý Phụ Huynh nhắc nhở các em ôn bài sốt sắng.\n\nTrân trọng,\nGiáo Lý Viên Phụ Trách Lớp ${className}`
      );
    } else if (tmpl === 'parish_announcement') {
      setCustomSubject('Thông Báo Niên Khóa & Sinh Hoạt Toàn Xứ Don Bosco Đà Lạt');
      setCustomBody(
        'Kính gửi Toàn thể Quý Phụ Huynh và các em Thiếu Nhi,\n\nBan Giáo Lý Giáo Sở Don Bosco Đà Lạt xin thông báo kế hoạch sinh hoạt và lịch học chung của niên khóa. Kính chúc Quý Phụ Huynh và các gia đình luôn an lành trong ân sủng của Thiên Chúa.\n\nTrân trọng,\nBan Giáo Lý Giáo Sở Don Bosco Đà Lạt'
      );
    } else if (tmpl === 'meeting') {
      setCustomSubject('Thư Triệu Tập Buổi Họp Ban Giáo Lý (Toàn Thể GLV & Dự Trưởng)');
      setCustomBody(
        'Kính gửi Quý Thầy Cô Giáo Lý Viên và Quý Anh Chị Dự Trưởng,\n\nBan Điều Hành & Thư Ký Ban Giáo Lý kính mời Quý Vị tham dự buổi họp định kỳ vào lúc 10h30 Chúa Nhật tại Hội trường Don Bosco Đà Lạt để đánh giá công tác giảng dạy, tổng kết chuyên cần và triển khai kế hoạch mục vụ sắp tới.\n\nKính mong Quý Vị sắp xếp hiện diện đầy đủ và đúng giờ.\n\nTrân trọng,\nBan Điều Hành & Thư Ký Giáo Lý Don Bosco Đà Lạt'
      );
    } else if (tmpl === 'tuition_reminder') {
      setCustomSubject('Nhắc Nhở Hoàn Tất Quỹ Giáo Lý & Sách Học Niên Khóa 2026 - 2027');
      setCustomBody(
        'Kính gửi Quý Phụ Huynh,\n\nNhằm phục vụ kinh phí sách vở giáo lý, tài liệu và sinh hoạt mục vụ cho các em trong niên khóa, Văn phòng Ban Giáo Lý kính nhắc Quý Phụ Huynh hoàn tất đóng quỹ trước hạn định.\n\nXin chân thành cảm ơn sự đồng hành và cộng tác quý báu của Quý Phụ Huynh!'
      );
    } else if (tmpl === 'exam_schedule') {
      setCustomSubject('Lịch Thi Giáo Lý Học Kỳ Toàn Giáo Sở – Niên Khóa 2026-2027');
      setCustomBody(
        'Kính gửi Quý Phụ Huynh và các em Thiếu Nhi toàn Giáo sở,\n\nBan Giáo Lý xin thông báo Lịch thi Giáo lý Học kỳ chính thức sẽ diễn ra vào Chúa Nhật tới. Đề nghị các em ôn tập kỹ phần Giáo lý và Kinh nguyện. Chúc các em đạt thành tích xuất sắc!\n\nBan Giáo Lý Don Bosco Đà Lạt'
      );
    } else if (tmpl === 'training_schedule') {
      setCustomSubject('Kế Hoạch Tập Huấn & Bồi Dưỡng Sư Phạm Giáo Lý (Gửi GLV & Dự Trưởng)');
      setCustomBody(
        'Kính gửi Quý Thầy Cô Giáo Lý Viên và các bạn Dự Trưởng,\n\nBan Giáo Lý tổ chức khóa bồi dưỡng chuyên đề Sư phạm Giáo lý Trực quan và Kỹ năng điều hành sinh hoạt vào lúc 19h00 Thứ Ba tuần tới tại Nhà sinh hoạt Don Bosco. Đề nghị toàn thể anh chị em tham gia đầy đủ.\n\nTrân trọng,\nBan Điều Hành Giáo Lý Don Bosco Đà Lạt'
      );
    }
  };

  // Compute Sender Role Name based on who is logged in
  const getSenderRoleName = (): string => {
    const targetClass = classes.find(c => c.id === selectedTargetClassId);
    const targetClassName = targetClass ? targetClass.name : '';

    switch (userRole) {
      case 'admin':
        return `Quản Trị Viên Hệ Thống (${currentUser?.name || 'Admin'})`;
      case 'pastor':
        return `Cha Quản Sở (${currentUser?.name || 'Linh mục Quản sở'})`;
      case 'catechist_leader':
        return `Trưởng Ban Giáo Lý (${currentUser?.name || 'Gioan Baotixita Trần Minh Tâm'})`;
      case 'secretary':
        return `Thư Ký Ban Giáo Lý (${currentUser?.name || 'Anna Maria Hoàng Thị Lan'})`;
      case 'catechist':
        return `Giáo Lý Viên Phụ Trách Lớp ${targetClassName} (${currentUser?.name || 'Giáo Lý Viên'})`;
      case 'trainee':
        return `Dự Trưởng Phụ Trách Lớp ${targetClassName} (${currentUser?.name || 'Dự Trưởng'})`;
      default:
        return 'Ban Giáo Lý Don Bosco Đà Lạt';
    }
  };

  const handleSendEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Security check: If teacher, cannot send to groups other than class_parents
    if (!isHigherRole && emailTargetGroup !== 'class_parents') {
      alert('Bạn chỉ có quyền gửi email cho phụ huynh lớp mình phụ trách!');
      return;
    }

    // Security check: teacher cannot send to a class they do not teach
    if (!isHigherRole) {
      const isAllowedClass = authorizedClasses.some(c => c.id === selectedTargetClassId);
      if (!isAllowedClass) {
        alert('Bạn không được phân công phụ trách lớp này!');
        return;
      }
    }

    setIsSending(true);

    let recipientCount = 0;
    let targetDesc = '';

    const totalTrainees = catechists.filter(c => c.title.toLowerCase().includes('dự trưởng') || c.title.toLowerCase().includes('đội trưởng')).length;
    const totalCatechistsOnly = catechists.length - totalTrainees;

    if (emailTargetGroup === 'all_parents') {
      recipientCount = students.length;
      targetDesc = `Toàn bộ Phụ huynh các lớp (${students.length} gia đình trong giáo sở)`;
    } else if (emailTargetGroup === 'class_parents') {
      const cls = classes.find(c => c.id === selectedTargetClassId);
      const count = students.filter(s => s.classId === selectedTargetClassId).length;
      recipientCount = count;
      targetDesc = `Phụ huynh lớp ${cls?.name || ''} (${count} gia đình)`;
    } else if (emailTargetGroup === 'unpaid_parents') {
      recipientCount = 18;
      targetDesc = 'Các gia đình phụ huynh chưa hoàn tất đóng quỹ giáo lý';
    } else if (emailTargetGroup === 'all_catechists_trainees') {
      recipientCount = catechists.length;
      targetDesc = `Toàn thể Giáo Lý Viên & Dự Trưởng (${catechists.length} nhân sự) [Phân quyền cấp dưới]`;
    } else if (emailTargetGroup === 'catechists_only') {
      recipientCount = totalCatechistsOnly;
      targetDesc = `Chỉ Giáo Lý Viên Phụ Trách (${totalCatechistsOnly} Thầy Cô GLV) [Phân quyền cấp dưới]`;
    } else if (emailTargetGroup === 'trainees_only') {
      recipientCount = totalTrainees > 0 ? totalTrainees : 3;
      targetDesc = `Chỉ Dự Trưởng / Huấn Luyện & Trợ Tá (${recipientCount} Dự Trưởng) [Phân quyền cấp dưới]`;
    } else if (emailTargetGroup === 'catechist_leaders_and_secretaries') {
      recipientCount = 3;
      targetDesc = 'Ban Điều Hành & Thư Ký Ban Giáo Lý';
    } else if (emailTargetGroup === 'all_parish_staff') {
      recipientCount = catechists.length + 3;
      targetDesc = 'Toàn thể Nhân Sự Giáo Lý Xứ (BĐH, Thư Ký, GLV, Dự Trưởng)';
    }

    setTimeout(() => {
      onSendEmail({
        subject: customSubject,
        recipientGroup: targetDesc,
        recipientCount,
        content: customBody,
        sentAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'Đã gửi thành công',
        senderRole: getSenderRoleName(),
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

  // Filter email logs based on user role
  const visibleNotifications = useMemo(() => {
    if (isHigherRole) return notifications;
    if (userRole === 'parent') return [];
    // For catechist / trainee: see emails sent to their class or sent by themselves
    return notifications.filter(n => {
      const senderRoleStr = n.senderRole || n.senderName || '';
      const isSentByMe = Boolean(currentUser?.name && senderRoleStr.includes(currentUser.name));
      const recipientGroupStr = (n.recipientGroup || '').toLowerCase();
      const isForMyClass = authorizedClasses.some(c => recipientGroupStr.includes(c.name.toLowerCase()));
      return isSentByMe || isForMyClass;
    });
  }, [isHigherRole, userRole, notifications, currentUser, authorizedClasses]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-800" />
              <span>
                {isParent 
                  ? 'Niên Lịch Học Tập & Lịch Sinh Hoạt Thiếu Nhi 2026 – 2027' 
                  : 'Niên Lịch Giảng Dạy & Hệ Thống Soạn Gửi Email'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isParent 
                ? 'Theo dõi lịch học Chúa Nhật, lịch học Bí Tích thứ Năm và các sự kiện chung của niên khóa'
                : 'Quản lý lịch dạy giáo lý, các sự kiện mục vụ và soạn gửi email theo đúng phân quyền'
              }
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Calendar Excel button - accessible for everyone including parents */}
            <button
              type="button"
              onClick={() => {
                exportCalendarEventsToExcel(events, {
                  academicYear: '2026 - 2027',
                });
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Tải tệp Excel niên lịch sinh hoạt về máy để xem"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isParent ? 'Tải Niên Lịch (.xlsx)' : 'Xuất Lịch Excel'}</span>
            </button>

            {/* Admin / Higher Role management tools */}
            {isHigherRole && (
              <>
                <div className="inline-flex rounded-lg shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      exportCalendarTemplateToExcel({
                        includeSampleData: true,
                        academicYear: '2026 - 2027',
                      });
                    }}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-l-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Tải ngay tệp mẫu Excel chuẩn có sẵn sự kiện mẫu để nhập niên lịch"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Mẫu Excel Nhập Lịch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExcelModalTab('import_excel');
                      setIsExcelModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-r-lg border-l border-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Nhập dữ liệu niên lịch hàng loạt từ tệp Excel"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Nhập Excel</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddEventModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Sự Kiện Lịch</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Regular Weekly Schedules from Don Bosco Guidelines */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {/* Sunday Schedule */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1">
            <span className="font-bold text-blue-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-700" />
              <span>Chúa Nhật Hàng Tuần</span>
            </span>
            <div className="text-[11px] text-blue-950 space-y-0.5 pt-0.5">
              <p>• <strong>07h30:</strong> Tập trung sinh hoạt & ổn định</p>
              <p>• <strong>08h00:</strong> Thánh Lễ Thiếu Nhi sốt sắng</p>
              <p>• <strong>09h15:</strong> Giờ học Giáo Lý theo từng lớp</p>
            </div>
          </div>

          {/* Thursday Schedule - Sacrament Classes */}
          <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl space-y-1">
            <span className="font-bold text-amber-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-700" />
              <span>Thứ Năm (2 Lớp Bí Tích)</span>
            </span>
            <div className="text-[11px] text-amber-950 space-y-0.5 pt-0.5">
              <p>• <strong>18h00:</strong> Học Giáo Lý Bí Tích</p>
              <p className="text-[10px] text-amber-800 italic">
                (Áp dụng riêng cho 2 lớp Sơ Cấp 2 và Căn Bản 4 - chỉ có mốc giờ 18h00 này)
              </p>
            </div>
          </div>

          {/* Catechist Training */}
          <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl space-y-1">
            <span className="font-bold text-purple-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-700" />
              <span>Thứ 3 & Thứ 6 (Đào Tạo)</span>
            </span>
            <div className="text-[11px] text-purple-950 space-y-0.5 pt-0.5">
              <p>• <strong>19h00 – 20h30:</strong> Bồi dưỡng Dự Trưởng</p>
              <p className="text-[10px] text-purple-800">
                Huấn luyện kỹ năng Sư phạm Giáo lý kế thừa
              </p>
            </div>
          </div>

          {/* Monthly Recollection */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span>Thứ 7 Đầu Tháng</span>
            </span>
            <div className="text-[11px] text-emerald-950 space-y-0.5 pt-0.5">
              <p>• <strong>19h00 – 20h30:</strong> Tĩnh tâm & Chầu Thánh Thể</p>
              <p className="text-[10px] text-emerald-800">
                Dành cho toàn thể Thầy Cô GLV & Dự Trưởng
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs (Hidden for Parents as they only need the calendar) */}
      {!isParent && (
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
            <span>Soạn & Gửi Email ({isHigherRole ? 'Phân Quyền Toàn Xứ & Cấp Dưới' : 'Gửi Phụ Huynh Lớp'})</span>
          </button>

          <button
            onClick={() => setActiveTab('email_logs')}
            className={`pb-2.5 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'email_logs' ? 'border-blue-700 text-blue-900 font-bold' : 'border-transparent text-slate-500'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Nhật Ký Email Đã Gửi ({visibleNotifications.length})</span>
          </button>
        </div>
      )}

      {/* Tab 1: Calendar Schedule View */}
      {activeTab === 'schedule' && (
        <div className="space-y-3">
          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
            <span className="font-semibold text-slate-700 mr-2 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Lọc theo sự kiện:</span>
            </span>
            {[
              { id: 'all', label: 'Tất Cả Niên Lịch' },
              { id: 'teaching', label: 'Học Giáo Lý' },
              { id: 'liturgy', label: 'Phụng Vụ & Thánh Lễ' },
              { id: 'exam', label: 'Thi Cử & Đánh Giá' },
              { id: 'meeting', label: 'Họp & Hội Thảo' },
              { id: 'recollection', label: 'Tĩnh Tâm & Khóa Tu' },
              { id: 'community', label: 'Sinh Hoạt & Dã Ngoại' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedEventType(f.id)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs ${
                  selectedEventType === f.id
                    ? 'bg-blue-800 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredEvents.map((e) => {
              const getTypeBadge = (type: CalendarEvent['type']) => {
                switch (type) {
                  case 'teaching':
                    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">Giảng Dạy</span>;
                  case 'liturgy':
                    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">Phụng Vụ</span>;
                  case 'exam':
                    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">Thi Cử</span>;
                  case 'meeting':
                    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">Họp Ban GL</span>;
                  case 'recollection':
                    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">Tĩnh Tâm</span>;
                  case 'community':
                    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Sinh Hoạt</span>;
                }
              };

              return (
                <div
                  key={e.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all space-y-2.5 text-xs relative group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-900 text-sm leading-snug">
                        {e.title}
                      </div>
                      {getTypeBadge(e.type)}
                    </div>

                    <div className="space-y-1 text-slate-600">
                      <div className="flex items-center gap-1.5 text-blue-900 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{e.date}</span>
                        <span className="text-slate-300">|</span>
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{e.startTime} - {e.endTime}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{e.location}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{e.targetAudience}</span>
                      </div>
                    </div>

                    {e.description && (
                      <p className="p-2 bg-slate-50 rounded border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                        {e.description}
                      </p>
                    )}
                  </div>

                  {/* Actions for Admin / Higher Roles only (NOT for parents) */}
                  {!isParent && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('email_dispatch');
                          setCustomSubject(`[Thông Báo] ${e.title} (${e.date})`);
                          setCustomBody(
                            `Kính gửi Quý Phụ Huynh và Thiếu Nhi,\n\nBan Giáo Lý xin gửi thông báo về sự kiện: "${e.title}".\n- Thời gian: ${e.startTime} - ${e.endTime}, ngày ${e.date}\n- Địa điểm: ${e.location}\n- Thành phần: ${e.targetAudience}\n\nNội dung: ${e.description || 'Kính mời Quý Vị sắp xếp tham gia đúng giờ.'}\n\nTrân trọng,\nBan Giáo Lý Don Bosco Đà Lạt`
                          );
                        }}
                        className="text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Soạn Email Sự Kiện</span>
                      </button>

                      {isHigherRole && onDeleteEvent && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa sự kiện "${e.title}"?`)) {
                              onDeleteEvent(e.id);
                            }
                          }}
                          className="text-rose-600 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Email Dispatch Form */}
      {activeTab === 'email_dispatch' && !isParent && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-xs space-y-4 max-w-3xl mx-auto">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-700" />
                <span>Soạn & Gửi Email Thông Báo Học Vụ</span>
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">
                {isHigherRole 
                  ? 'Thẩm quyền cấp cao: Gửi email cho toàn bộ phụ huynh, hoặc gửi email cho các phân quyền cấp dưới (GLV, Dự Trưởng)'
                  : 'Thẩm quyền Giáo Lý Viên: Quý Thầy/Cô chỉ gửi email cho phụ huynh lớp mình trực tiếp phụ trách'
                }
              </p>
            </div>

            <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{getSenderRoleName().split('(')[0]}</span>
            </div>
          </div>

          {/* Role Permission Guidance Banner */}
          {!isHigherRole ? (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-900">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-950">Quy Định Phân Quyền Giáo Viên Lớp:</span>
                <p className="mt-0.5 leading-relaxed">
                  Theo quy định giáo vụ, <strong>Giáo viên của các lớp chỉ được gửi email cho phụ huynh của lớp mình phụ trách</strong>. Tùy chọn gửi cho toàn bộ phụ huynh hoặc các giáo lý viên khác được quản lý bởi Trưởng Ban Giáo Lý, Thư Ký và Ban Quản Sở.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-2.5 text-[11px] text-indigo-950">
              <Sparkles className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-indigo-950">Thẩm Quyền Quản Trị & Ban Điều Hành:</span>
                <p className="mt-0.5 leading-relaxed">
                  Trưởng Ban Giáo Lý, Thư Ký và các phân quyền cao hơn có quyền gửi email cho <strong>Toàn bộ Phụ Huynh</strong>, hoặc gửi thông báo chỉ đạo cho <strong>Các phân quyền thấp hơn</strong> (Giáo Lý Viên, Dự Trưởng / Huấn Luyện).
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSendEmailSubmit} className="space-y-4">
            {/* Quick Template Selector */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mẫu Email Có Sẵn:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {isHigherRole ? (
                  // Templates for Higher Roles
                  [
                    { id: 'parish_announcement', label: 'Niên Lịch & Sinh Hoạt Toàn Xứ' },
                    { id: 'meeting', label: 'Triệu Tập Họp Ban GL (Gửi GLV)' },
                    { id: 'tuition_reminder', label: 'Nhắc Đóng Quỹ Giáo Lý' },
                    { id: 'exam_schedule', label: 'Lịch Thi Toàn Giáo Sở' },
                    { id: 'training_schedule', label: 'Kế Hoạch Bồi Dưỡng Dự Trưởng' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTemplateChange(t.id)}
                      className={`p-2 rounded-lg border text-left transition-colors font-medium text-[11px] cursor-pointer ${
                        emailTemplate === t.id 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold shadow-2xs' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))
                ) : (
                  // Templates for Class Teachers
                  [
                    { id: 'class_learning', label: 'Nhắc Nhở Học Tập Lớp' },
                    { id: 'class_attendance', label: 'Cảnh Báo Chuyên Cần Lớp' },
                    { id: 'class_parents_meeting', label: 'Họp Phụ Huynh Lớp' },
                    { id: 'class_exam', label: 'Lịch Kiểm Tra Lớp' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTemplateChange(t.id)}
                      className={`p-2 rounded-lg border text-left transition-colors font-medium text-[11px] cursor-pointer ${
                        emailTemplate === t.id 
                          ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold shadow-2xs' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Recipient Group Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nhóm Người Nhận Email:
                </label>
                {isHigherRole ? (
                  <select
                    value={emailTargetGroup}
                    onChange={(e) => setEmailTargetGroup(e.target.value as EmailTargetKey)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <optgroup label="👨‍👩‍👧‍👦 Nhóm Phụ Huynh (Toàn Xứ & Từng Lớp)">
                      <option value="all_parents">
                        Toàn bộ Phụ huynh các lớp ({students.length} gia đình trong giáo xứ)
                      </option>
                      <option value="class_parents">
                        Phụ huynh theo 1 Lớp cụ thể
                      </option>
                      <option value="unpaid_parents">
                        Phụ huynh chưa hoàn tất đóng quỹ giáo lý (18 gia đình)
                      </option>
                    </optgroup>

                    <optgroup label="👥 Phân Quyền Cấp Dưới (Trực thuộc Ban Giáo Lý)">
                      <option value="all_catechists_trainees">
                        Toàn thể Giáo Lý Viên & Dự Trưởng ({catechists.length} nhân sự) [Cấp Dưới]
                      </option>
                      <option value="catechists_only">
                        Chỉ Giáo Lý Viên Phụ Trách Lớp [Cấp Dưới]
                      </option>
                      <option value="trainees_only">
                        Chỉ Dự Trưởng / Huấn Luyện & Trợ Tá [Cấp Dưới]
                      </option>
                    </optgroup>

                    {(userRole === 'admin' || userRole === 'pastor') && (
                      <optgroup label="🏛️ Ban Điều Hành Giáo Lý">
                        <option value="catechist_leaders_and_secretaries">
                          Ban Điều Hành & Thư Ký Ban Giáo Lý
                        </option>
                        <option value="all_parish_staff">
                          Toàn thể Nhân Sự Ban Giáo Lý Xứ
                        </option>
                      </optgroup>
                    )}
                  </select>
                ) : (
                  // Locked for Class Teachers
                  <div className="p-2 border border-slate-300 bg-slate-50 rounded-lg text-slate-700 flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      Phụ huynh của lớp bạn phụ trách
                    </span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] rounded font-bold border border-amber-300">
                      Chỉ định cho lớp
                    </span>
                  </div>
                )}
              </div>

              {/* Class Selection: either when class_parents is selected, or always for class teachers */}
              {(emailTargetGroup === 'class_parents' || !isHigherRole) && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isHigherRole ? 'Chọn Lớp Nhận Email:' : 'Lớp Bạn Phụ Trách:'}
                  </label>
                  <select
                    value={selectedTargetClassId}
                    onChange={(e) => {
                      setSelectedTargetClassId(e.target.value);
                      const targetClass = classes.find(c => c.id === e.target.value);
                      if (!isHigherRole && targetClass) {
                        setCustomSubject(`Thông Báo Học Tập & Chuyên Cần Lớp ${targetClass.name}`);
                      }
                    }}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    {(isHigherRole ? classes : authorizedClasses).map(c => {
                      const count = students.filter(s => s.classId === c.id).length;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} ({count} học sinh / phụ huynh)
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* Sender Preview */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Danh tính người gửi: <strong>{getSenderRoleName()}</strong></span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Hệ thống Don Bosco Dalat</span>
            </div>

            {/* Subject */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tiêu Đề Email:</label>
              <input
                type="text"
                required
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 font-medium text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
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
                className="w-full border border-slate-300 rounded-lg p-2.5 font-sans leading-relaxed text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSending}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-2 shadow-xs disabled:opacity-50 transition-colors cursor-pointer text-xs"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? 'Đang gửi email theo phân quyền...' : 'Gửi Email Ngay'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Email History Logs */}
      {activeTab === 'email_logs' && !isParent && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
            <span>Nhật Ký Các Email Đã Gửi Đi ({visibleNotifications.length} email)</span>
            <span className="text-[11px] text-slate-500 font-normal">
              {isHigherRole ? 'Hiển thị toàn bộ lịch sử toàn xứ' : 'Hiển thị email của lớp bạn phụ trách'}
            </span>
          </div>

          {visibleNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Chưa có lịch sử email nào được gửi.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {visibleNotifications.map((n) => (
                <div key={n.id} className="p-4 space-y-1.5 hover:bg-slate-50 transition-colors">
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

                  <div className="text-slate-600 flex flex-wrap items-center gap-3 text-[11px]">
                    <span>Gửi tới: <strong>{n.recipientGroup}</strong> ({n.recipientCount} người nhận)</span>
                    <span>• Người gửi: <strong className="text-blue-900">{n.senderRole}</strong></span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700 whitespace-pre-line text-[11px] leading-relaxed">
                    {n.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Event Modal for Higher Roles */}
      {isAddEventModalOpen && isHigherRole && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl text-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2">
              Thêm Sự Kiện Niên Lịch Mới
            </h3>

            <form onSubmit={handleAddEventSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tên Sự Kiện:</label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Vd: Lễ Khai Giảng Niên Khóa..."
                  className="w-full border border-slate-300 rounded p-1.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ngày Diễn Ra:</label>
                  <input
                    type="date"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Phân Loại:</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    className="w-full border border-slate-300 rounded p-1.5 text-xs"
                  >
                    <option value="teaching">Giảng Dạy</option>
                    <option value="liturgy">Phụng Vụ</option>
                    <option value="exam">Thi Cử</option>
                    <option value="meeting">Họp Ban GL</option>
                    <option value="recollection">Tĩnh Tâm</option>
                    <option value="community">Sinh Hoạt</option>
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
                    className="w-full border border-slate-300 rounded p-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Giờ Kết Thúc:</label>
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Địa Điểm:</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Thành Phần Tham Dự:</label>
                <input
                  type="text"
                  value={newEvent.targetAudience}
                  onChange={(e) => setNewEvent({ ...newEvent, targetAudience: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Mô Tả Chi Tiết:</label>
                <textarea
                  rows={2}
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddEventModalOpen(false)}
                  className="px-3 py-1.5 border rounded-lg text-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Lưu Sự Kiện
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calendar Excel Modal */}
      {isExcelModalOpen && isHigherRole && (
        <CalendarExcelModal
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          events={events}
          onBatchAddEvents={(newEvents, replaceExisting) => {
            if (onBatchAddEvents) {
              onBatchAddEvents(newEvents, replaceExisting);
            }
          }}
          defaultTab={excelModalTab}
        />
      )}
    </div>
  );
};
