import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  User, 
  Award, 
  Calendar, 
  CreditCard, 
  BookOpen, 
  Church, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Clock,
  MapPin,
  Users,
  Download,
  ShieldCheck,
  Heart,
  Bell
} from 'lucide-react';
import { 
  Student, 
  ClassRoom, 
  GradeRecord, 
  AttendanceRecord, 
  ConductRecord, 
  TuitionItem, 
  UserAccount,
  CalendarEvent,
  EmailNotification 
} from '../types';
import { 
  calculateSemesterAcademicAverage, 
  calculateYearlyAcademicAverage,
  calculateSemesterAttendanceScore,
  calculateSemesterConductScore,
  calculateYearlyAverageHalf,
  evaluatePromotionAndRank,
  formatVNCurrency
} from '../utils/calculations';
import { exportCalendarEventsToExcel } from '../utils/excelExport';
import { getUserAuthorizedClasses, hasParishWideAccess } from '../utils/rolePermissions';
import { ParentGeneralCalendarView } from './ParentGeneralCalendarView';

interface ParentPortalViewProps {
  students: Student[];
  classes: ClassRoom[];
  grades: GradeRecord[];
  conducts: ConductRecord[];
  attendanceRecords: AttendanceRecord[];
  tuitionList: TuitionItem[];
  currentUser?: UserAccount;
  events?: CalendarEvent[];
  notifications?: EmailNotification[];
  onOpenReportBook: (student: Student) => void;
}

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({
  students,
  classes,
  grades,
  conducts,
  attendanceRecords,
  tuitionList,
  currentUser,
  events = [],
  notifications = [],
  onOpenReportBook,
}) => {
  const isParent = currentUser?.role === 'parent';

  // Find all children belonging to this parent (strict matching by phone or parentName or email)
  const matchedChildren = useMemo(() => {
    if (!currentUser || currentUser.role !== 'parent') return [];
    const phone = currentUser.phone?.replace(/[\s.-]/g, '') || '';
    const name = currentUser.name?.toLowerCase() || '';
    const email = currentUser.email?.toLowerCase().trim() || '';

    return students.filter(s => {
      // Direct link by student ID or parent account username
      if (currentUser.studentId && currentUser.studentId.toLowerCase() === s.id.toLowerCase()) return true;
      if (currentUser.username && currentUser.username.toLowerCase() === s.id.toLowerCase()) return true;

      const sPhone = s.parentPhone?.replace(/[\s.-]/g, '') || '';
      const sParentName = s.parentName?.toLowerCase() || '';
      const sParentEmail = s.parentEmail?.toLowerCase().trim() || '';
      
      const matchPhone = phone && sPhone && (phone.includes(sPhone) || sPhone.includes(phone));
      const matchName = name && sParentName && (name.includes(sParentName) || sParentName.includes(name));
      const matchEmail = email && sParentEmail && email === sParentEmail;

      return matchPhone || matchName || matchEmail;
    });
  }, [currentUser, students]);

  // For non-parents (teachers/admins) - find authorized students they can search
  const teacherClasses = useMemo(() => {
    if (!currentUser || hasParishWideAccess(currentUser.role)) return classes;
    return getUserAuthorizedClasses(currentUser, classes);
  }, [currentUser, classes]);

  const authorizedStudents = useMemo(() => {
    if (isParent) return matchedChildren;
    if (!currentUser || hasParishWideAccess(currentUser.role)) return students;
    const allowedClassIds = new Set(teacherClasses.map(c => c.id));
    return students.filter(s => allowedClassIds.has(s.classId));
  }, [isParent, matchedChildren, currentUser, teacherClasses, students]);

  // Initial selected student:
  // For parent: ONLY matchedChildren[0] or null (NEVER fallback to students[0] to prevent data leakage)
  // For admin/staff: authorizedStudents[0] or null
  const [searchedStudent, setSearchedStudent] = useState<Student | null>(() => {
    if (isParent) {
      return matchedChildren[0] || null;
    }
    return authorizedStudents[0] || null;
  });

  const [query, setQuery] = useState<string>(searchedStudent?.id || '');
  const [hasSearched, setHasSearched] = useState(true);

  // Parent tab switcher: "academic" (Hồ sơ học tập & Sổ liên lạc) vs "schedule" (Niên lịch & Lịch học)
  const [parentActiveTab, setParentActiveTab] = useState<'academic' | 'schedule'>('academic');

  // Keep selected student synced when parent logs in or switches
  useEffect(() => {
    if (isParent) {
      if (matchedChildren.length > 0) {
        if (!searchedStudent || !matchedChildren.some(c => c.id === searchedStudent.id)) {
          setSearchedStudent(matchedChildren[0]);
          setQuery(matchedChildren[0].id);
        }
      } else {
        setSearchedStudent(null);
      }
    }
  }, [isParent, matchedChildren]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (isParent) return; // Parents don't use the search bar

    const cleanQ = query.trim().toLowerCase();
    if (!cleanQ) return;

    const found = authorizedStudents.find(
      s => (s.id && s.id.toLowerCase() === cleanQ) ||
           (s.parentPhone && s.parentPhone.replace(/[\s.-]/g, '').includes(cleanQ.replace(/[\s.-]/g, ''))) ||
           (s.fullName && s.fullName.toLowerCase().includes(cleanQ))
    );

    setSearchedStudent(found || null);
    setHasSearched(true);
  };

  const currentClass = classes.find(c => c.id === searchedStudent?.classId);
  const isSacrament = currentClass?.isSacramentClass || false;

  // Compute academic records for current student
  const stGrades1 = grades.find(g => g.studentId === searchedStudent?.id && g.semester === 1);
  const stGrades2 = grades.find(g => g.studentId === searchedStudent?.id && g.semester === 2);

  const hk1Academic = calculateSemesterAcademicAverage(stGrades1?.midTermScore ?? null, stGrades1?.finalExamScore ?? null, stGrades1?.retestScore);
  const hk2Academic = calculateSemesterAcademicAverage(stGrades2?.midTermScore ?? null, stGrades2?.finalExamScore ?? null, stGrades2?.retestScore);
  const yearlyAcademic = calculateYearlyAcademicAverage(hk1Academic, hk2Academic);

  const stViolations1 = conducts.filter(c => c.studentId === searchedStudent?.id && c.semester === 1);
  const stViolations2 = conducts.filter(c => c.studentId === searchedStudent?.id && c.semester === 2);
  const hk1Conduct = calculateSemesterConductScore(stViolations1.map(v => v.violation));
  const hk2Conduct = calculateSemesterConductScore(stViolations2.map(v => v.violation));
  const yearlyConduct = calculateYearlyAverageHalf(hk1Conduct, hk2Conduct);

  const stAtt1 = attendanceRecords.filter(r => r.studentId === searchedStudent?.id && r.semester === 1);
  const stAtt2 = attendanceRecords.filter(r => r.studentId === searchedStudent?.id && r.semester === 2);
  const { score: att1, counts: c1 } = calculateSemesterAttendanceScore(stAtt1.map(r => r.status), isSacrament);
  const { score: att2, counts: c2 } = calculateSemesterAttendanceScore(stAtt2.map(r => r.status), isSacrament);
  const yearlyAttendance = calculateYearlyAverageHalf(att1, att2);

  const totalD = c1.D + c2.D;
  const yearlyAvg = calculateYearlyAverageHalf(yearlyAttendance, yearlyConduct);
  const { academicRank, finalResult } = evaluatePromotionAndRank(yearlyAcademic, yearlyAvg, totalD, isSacrament);

  const studentTuition = tuitionList.filter(t => t.studentId === searchedStudent?.id);

  // Relevant notifications for this student / class
  const classNotifications = useMemo(() => {
    if (!currentClass) return notifications.slice(0, 3);
    return notifications.filter(n => {
      const recipientGrp = (n.recipientGroup || '').toLowerCase();
      const clsName = currentClass.name.toLowerCase();
      const subject = (n.subject || '').toLowerCase();
      return (
        recipientGrp.includes(clsName) || 
        recipientGrp.includes('toàn bộ') ||
        recipientGrp.includes('phụ huynh') ||
        subject.includes(clsName) ||
        (n.recipientType === 'sacrament_classes' && currentClass.isSacramentClass)
      );
    });
  }, [currentClass, notifications]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="text-center space-y-1">
          <div className="inline-flex p-2.5 rounded-full bg-blue-100 text-blue-900 mb-1">
            <Church className="w-6 h-6 text-blue-800" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            {isParent 
              ? 'Cổng Thông Tin Học Vụ & Sổ Liên Lạc Gia Đình'
              : 'Tra Cứu Hồ Sơ & Kết Quả Học Tập Dành Cho Phụ Huynh'
            }
          </h1>
          <p className="text-xs text-slate-500">
            {isParent
              ? 'Giáo Sở Don Bosco Đà Lạt • Xem thông tin học tập con em và niên lịch sinh hoạt giáo lý'
              : 'Nhập Mã học sinh hoặc Số điện thoại để tra cứu hồ sơ (Chế độ xem trước dành cho Quản lý & Giáo lý viên)'
            }
          </p>
        </div>

        {/* Personalized Section for Logged-In Parent */}
        {isParent && (
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-xl">👨‍👩‍👧‍👦</span>
                <div>
                  <span className="font-bold text-amber-950">
                    Kính chào Quý Phụ Huynh: {currentUser.name}
                  </span>
                  <p className="text-[11px] text-amber-800">
                    Số điện thoại liên kết: <strong>{currentUser.phone || 'Chưa cập nhật'}</strong> • Tài khoản bảo mật thông tin gia đình
                  </p>
                </div>
              </div>

              <div className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-700" />
                <span>Bảo Mật Quyền Riêng Tư</span>
              </div>
            </div>

            {/* If Parent has multiple children: Family Child Selector */}
            {matchedChildren.length > 1 && (
              <div className="pt-2 border-t border-amber-200/70 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>Chọn con em cần xem hồ sơ ({matchedChildren.length} học viên):</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {matchedChildren.map(c => {
                    const cls = classes.find(cl => cl.id === c.classId);
                    const isSelected = searchedStudent?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSearchedStudent(c);
                          setQuery(c.id);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                        }`}
                      >
                        <span>{c.gender === 'Nam' ? '👦' : '👧'}</span>
                        <span>{c.holyName} {c.fullName}</span>
                        <span className="text-[10px] opacity-80">({cls?.name || c.id})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Bar: ONLY for Non-Parents (Admins, Leaders, Secretaries, Teachers) */}
        {!isParent && (
          <div className="space-y-2">
            <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Nhập mã học sinh (DBS-2026-011) hoặc SĐT (0918889900)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <span>Tra Cứu</span>
              </button>
            </form>

            {/* Sample pills for teachers/admins */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <span>Học sinh xem thử nhanh:</span>
              {authorizedStudents.slice(0, 4).map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setQuery(st.id);
                    setSearchedStudent(st);
                    setHasSearched(true);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono cursor-pointer"
                >
                  {st.id} ({st.holyName} {st.fullName})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* If Parent has NO matched child in database */}
      {isParent && matchedChildren.length === 0 && (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-xl">
            ℹ️
          </div>
          <h3 className="font-bold text-sm text-slate-800">
            Chưa Tìm Thấy Hồ Sơ Học Viên Liên Kết
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Hệ thống chưa tìm thấy hồ sơ thiếu nhi liên kết với số điện thoại (<strong>{currentUser?.phone || 'Chưa có'}</strong>) hoặc email của tài khoản Quý Phụ Huynh.
          </p>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto text-[11px] text-blue-900">
            Kính mong Quý Phụ Huynh liên hệ <strong>Thư Ký Ban Giáo Lý</strong> hoặc <strong>Giáo Lý Viên phụ trách lớp</strong> để cập nhật số điện thoại phụ huynh vào hồ sơ học sinh của con em.
          </div>
        </div>
      )}

      {/* Main Student Profile & Calendar Information */}
      {searchedStudent && (
        <div className="space-y-4 text-xs">
          {/* Parent Tab Switcher */}
          {isParent && (
            <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3 gap-3 text-xs font-semibold shadow-2xs">
              <button
                type="button"
                onClick={() => setParentActiveTab('academic')}
                className={`pb-2.5 px-2 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  parentActiveTab === 'academic' 
                    ? 'border-blue-700 text-blue-900 font-bold' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <BookOpen className="w-4 h-4 text-blue-700" />
                <span>Hồ Sơ Học Tập & Sổ Liên Lạc Con Em</span>
              </button>

              <button
                type="button"
                onClick={() => setParentActiveTab('schedule')}
                className={`pb-2.5 px-2 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  parentActiveTab === 'schedule' 
                    ? 'border-blue-700 text-blue-900 font-bold' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4 text-blue-700" />
                <span>Niên Lịch & Lịch Sinh Hoạt Của Con</span>
              </button>
            </div>
          )}

          {/* VIEW TAB 1: ACADEMIC & REPORT BOOK */}
          {(!isParent || parentActiveTab === 'academic') && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              {/* Header Info */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-base border border-amber-300">
                    {searchedStudent.gender === 'Nam' ? '👦' : '👧'}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-amber-800">{searchedStudent.holyName}</span>
                      <span>{searchedStudent.fullName}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-normal font-mono">
                        {searchedStudent.id}
                      </span>
                    </h2>
                    <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-3 mt-0.5">
                      <span>Lớp: <strong className="text-blue-900">{currentClass?.name}</strong></span>
                      <span>Giáo họ: <strong>{searchedStudent.subParish}</strong></span>
                      <span>Ngày sinh: <strong>{searchedStudent.dob}</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenReportBook(searchedStudent)}
                  className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer text-xs"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Xem Sổ Liên Lạc Bản In</span>
                </button>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                  <span className="text-amber-800 block text-[11px]">ĐTB Học Lực Cả Năm:</span>
                  <span className="text-lg font-bold text-amber-950 font-mono">
                    {yearlyAcademic > 0 ? yearlyAcademic.toFixed(2) : 'Đang cập nhật'}
                  </span>
                  <span className="block text-[10px] text-amber-700 mt-0.5">Xếp loại: {academicRank}</span>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                  <span className="text-emerald-800 block text-[11px]">Điểm Chuyên Cần:</span>
                  <span className="text-lg font-bold text-emerald-950 font-mono">{yearlyAttendance.toFixed(2)}</span>
                  <span className="block text-[10px] text-emerald-700 mt-0.5">Nghỉ CP: {c1.C + c2.C} • KP: {totalD}</span>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                  <span className="text-blue-800 block text-[11px]">Điểm Hạnh Kiểm:</span>
                  <span className="text-lg font-bold text-blue-950 font-mono">{yearlyConduct.toFixed(2)}</span>
                  <span className="block text-[10px] text-blue-700 mt-0.5">Thang điểm 10</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-600 block text-[11px]">Xét Lên Lớp:</span>
                  <span className={`text-xs font-bold inline-block mt-1 px-2 py-0.5 rounded ${
                    finalResult === 'Được lên lớp' 
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {finalResult}
                  </span>
                </div>
              </div>

              {/* Sacramental History */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Church className="w-4 h-4 text-amber-700" />
                  <span>Hồ Sơ Các Bí Tích Đã Lãnh Nhận:</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <div className="font-bold text-slate-900">Bí Tích Rửa Tội (Thanh Tẩy):</div>
                    <div className="text-slate-600 mt-0.5">
                      Ngày: {searchedStudent.sacraments?.baptism?.date || searchedStudent.baptismDate || 'Chưa ghi'}<br />
                      Tại: {searchedStudent.sacraments?.baptism?.place || 'Don Bosco Đà Lạt'}<br />
                      Linh mục: {searchedStudent.sacraments?.baptism?.minister || 'Lm. Quản sở'}<br />
                      Người đỡ đầu: {searchedStudent.sacraments?.baptism?.godparent || searchedStudent.godParentName || 'Chưa ghi'}
                    </div>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200">
                    <div className="font-bold text-slate-900">Bí Tích Giao Hòa & Thánh Thể:</div>
                    <div className="text-slate-600 mt-0.5">
                      {searchedStudent.sacraments?.firstCommunion?.date || searchedStudent.firstCommunionDate ? (
                        <>
                          Ngày: {searchedStudent.sacraments?.firstCommunion?.date || searchedStudent.firstCommunionDate}<br />
                          Tại: {searchedStudent.sacraments?.firstCommunion?.place || 'Don Bosco Đà Lạt'}<br />
                          Linh mục: {searchedStudent.sacraments?.firstCommunion?.minister || 'Lm. Quản sở'}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Đang chuẩn bị học</span>
                      )}
                    </div>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200">
                    <div className="font-bold text-slate-900">Bí Tích Thêm Sức:</div>
                    <div className="text-slate-600 mt-0.5">
                      {searchedStudent.sacraments?.confirmation?.date || searchedStudent.confirmationDate ? (
                        <>
                          Ngày: {searchedStudent.sacraments?.confirmation?.date || searchedStudent.confirmationDate}<br />
                          Tại: {searchedStudent.sacraments?.confirmation?.place || 'Don Bosco Đà Lạt'}<br />
                          Đức Giám mục: {searchedStudent.sacraments?.confirmation?.minister || 'Đức Giám Mục Giáo phận'}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Chưa lãnh nhận</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tuition Status */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <span>Tình Hình Quỹ Giáo Lý & Sách Học:</span>
                </span>
                {studentTuition.length === 0 ? (
                  <div className="text-slate-400 text-[11px]">Chưa có khoản thu nào được tạo.</div>
                ) : (
                  <div className="space-y-1.5">
                    {studentTuition.map(t => (
                      <div key={t.id} className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-medium text-slate-900">{t.feeName}</span>
                          <span className="text-slate-400 ml-2 font-mono">{formatVNCurrency(t.amount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            t.status === 'Đã đóng' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {t.status}
                          </span>
                          {t.receiptNumber && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              Số BL: {t.receiptNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW TAB 2: SCHEDULE & CALENDAR FOR CHILD */}
          {isParent && parentActiveTab === 'schedule' && (
            <ParentGeneralCalendarView
              events={events}
              notifications={notifications}
              students={students}
              classes={classes}
              currentUser={currentUser!}
            />
          )}
        </div>
      )}
    </div>
  );
};
