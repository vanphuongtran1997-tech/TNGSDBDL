import React, { useState, useEffect, useMemo } from 'react';
import { Lock } from 'lucide-react';
import { 
  mockStudents, 
  mockClasses, 
  mockAttendance, 
  mockGrades, 
  mockConductRecords, 
  mockTuition, 
  mockCatechists, 
  mockEvaluations, 
  mockCalendarEvents, 
  mockNotifications, 
  mockUsers,
  DEFAULT_PARISH_INFO
} from './data/mockData';
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
  AttendanceStatus, 
  AttendanceTimeSlot,
  ConductViolation,
  CustomDateSchedule,
  ParishInfo
} from './types';
import { loadCustomSchedules } from './utils/attendanceTimeUtils';
import { 
  isTabAllowed, 
  getDefaultTabForRole, 
  ROLE_PERMISSIONS, 
  getUserAuthorizedClasses,
  getUserAuthorizedStudents,
  hasParishWideAccess,
  isUserAuthorizedForClass,
  isUserAuthorizedForStudent
} from './utils/rolePermissions';
import { Navbar, ActiveTab } from './components/Navbar';
import { StudentManagement } from './components/StudentManagement';
import { AttendanceManager } from './components/AttendanceManager';
import { GradeManager } from './components/GradeManager';
import { TuitionManager } from './components/TuitionManager';
import { CatechistManager } from './components/CatechistManager';
import { ScheduleAndEmailManager } from './components/ScheduleAndEmailManager';
import { SemesterReportDashboard } from './components/SemesterReportDashboard';
import { ParentPortalView } from './components/ParentPortalView';
import { ParentGeneralCalendarView } from './components/ParentGeneralCalendarView';
import { StudentCardModal } from './components/StudentCardModal';
import { QRScannerModal } from './components/QRScannerModal';
import { StudentIdSearchModal } from './components/StudentIdSearchModal';
import { ReportBookModal } from './components/ReportBookModal';
import { ClassTransferModal } from './components/ClassTransferModal';
import { BatchClearOptions } from './components/BatchFieldClearModal';
import { AccountManagement } from './components/AccountManagement';
import { LoginScreen } from './components/LoginScreen';
import { SwitchAccountModal } from './components/SwitchAccountModal';
import { CustomScheduleModal } from './components/CustomScheduleModal';
import { ParishInfoEditModal } from './components/ParishInfoEditModal';

export default function App() {
  // Application Data State
  const [allUsers, setAllUsers] = useState<UserAccount[]>(mockUsers);

  // Authentication & Session State (Persisted)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('donbosco_auth_user_id'));
  });

  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    const savedUserId = localStorage.getItem('donbosco_auth_user_id');
    if (savedUserId) {
      const matched = mockUsers.find(u => u.id === savedUserId);
      if (matched && matched.status !== 'locked') return matched;
    }
    return mockUsers[0];
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => getDefaultTabForRole(currentUser.role));

  // Enforce role-based access: auto-redirect if current tab is not allowed for the user's role
  useEffect(() => {
    if (!isTabAllowed(currentUser.role, activeTab)) {
      setActiveTab(getDefaultTabForRole(currentUser.role));
    }
  }, [currentUser.role, activeTab]);

  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [classes, setClasses] = useState<ClassRoom[]>(mockClasses);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(mockAttendance);
  const [grades, setGrades] = useState<GradeRecord[]>(mockGrades);
  const [conducts, setConducts] = useState<ConductRecord[]>(mockConductRecords);
  const [tuitionList, setTuitionList] = useState<TuitionItem[]>(mockTuition);
  const [catechists, setCatechists] = useState<Catechist[]>(mockCatechists);
  const [evaluations, setEvaluations] = useState<CatechistEvaluation[]>(mockEvaluations);
  const [events, setEvents] = useState<CalendarEvent[]>(mockCalendarEvents);
  const [notifications, setNotifications] = useState<EmailNotification[]>(mockNotifications);

  // Modal States
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardModalClassId, setCardModalClassId] = useState<string | undefined>(undefined);
  const [cardModalStudentIds, setCardModalStudentIds] = useState<string[] | undefined>(undefined);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isIdSearchModalOpen, setIsIdSearchModalOpen] = useState(false);
  const [reportBookStudent, setReportBookStudent] = useState<Student | null>(null);
  const [transferModalStudent, setTransferModalStudent] = useState<Student | undefined>(undefined);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Parish & Catechist Office Information State (Persisted)
  const [parishInfo, setParishInfo] = useState<ParishInfo>(() => {
    const saved = localStorage.getItem('donbosco_parish_info');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error('Failed to parse parish info from localStorage', err);
      }
    }
    return DEFAULT_PARISH_INFO;
  });
  const [isParishInfoEditOpen, setIsParishInfoEditOpen] = useState(false);

  const handleSaveParishInfo = (updatedInfo: ParishInfo) => {
    setParishInfo(updatedInfo);
    try {
      localStorage.setItem('donbosco_parish_info', JSON.stringify(updatedInfo));
    } catch (err) {
      console.error('Failed to persist parish info', err);
    }
  };

  // Custom Date Schedules (e.g. 7h30 standard cutoff overridden for special days)
  const [customSchedules, setCustomSchedules] = useState<Record<string, CustomDateSchedule>>(() => loadCustomSchedules());
  const [isCustomScheduleModalOpen, setIsCustomScheduleModalOpen] = useState(false);
  const [scheduleModalDate, setScheduleModalDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [scheduleModalSessionType, setScheduleModalSessionType] = useState<'Chúa Nhật' | 'Thứ 5'>('Chúa Nhật');

  const handleOpenCustomScheduleModal = (date?: string, sessionType?: 'Chúa Nhật' | 'Thứ 5') => {
    if (date) setScheduleModalDate(date);
    if (sessionType) setScheduleModalSessionType(sessionType);
    setIsCustomScheduleModalOpen(true);
  };

  const handleScheduleUpdated = (updated: Record<string, CustomDateSchedule>) => {
    setCustomSchedules(updated);
  };

  // Switch Account & Login Modals
  const [isSwitchAccountModalOpen, setIsSwitchAccountModalOpen] = useState(false);
  const [switchTargetUser, setSwitchTargetUser] = useState<UserAccount | null>(null);

  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('donbosco_auth_user_id', user.id);
    const nowStr = new Date().toLocaleString('vi-VN');
    setAllUsers(prev => {
      const exists = prev.some(u => u.id === user.id);
      if (exists) {
        return prev.map(u => u.id === user.id ? { ...u, lastLogin: nowStr } : u);
      }
      return [{ ...user, lastLogin: nowStr }, ...prev];
    });
    setActiveTab(getDefaultTabForRole(user.role));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('donbosco_auth_user_id');
    setIsSwitchAccountModalOpen(false);
    setSwitchTargetUser(null);
  };

  const handleOpenSwitchAccount = (targetUser?: UserAccount) => {
    setSwitchTargetUser(targetUser || null);
    setIsSwitchAccountModalOpen(true);
  };

  const handleConfirmSwitchAccount = (targetUser: UserAccount) => {
    setCurrentUser(targetUser);
    localStorage.setItem('donbosco_auth_user_id', targetUser.id);
    setIsSwitchAccountModalOpen(false);
    setSwitchTargetUser(null);
    const nowStr = new Date().toLocaleString('vi-VN');
    setAllUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, lastLogin: nowStr } : u));
    setActiveTab(getDefaultTabForRole(targetUser.role));
  };

  // --- Role & Authorization Scopes ---
  const isParishWide = hasParishWideAccess(currentUser.role);
  const authorizedClasses = useMemo(() => {
    return getUserAuthorizedClasses(currentUser, classes);
  }, [currentUser, classes]);
  const authorizedClassIds = useMemo(() => {
    return authorizedClasses.map(c => c.id);
  }, [authorizedClasses]);
  const authorizedStudents = useMemo(() => {
    return getUserAuthorizedStudents(currentUser, students, classes);
  }, [currentUser, students, classes]);

  // --- Student Management Handlers ---
  const handleAddStudent = (newSt: Omit<Student, 'id'>) => {
    if (!isParishWide && !isUserAuthorizedForClass(currentUser, newSt.classId, classes)) {
      alert('Bạn không có quyền thêm học sinh vào lớp này. Bạn chỉ được thao tác trên lớp được phân công.');
      return;
    }
    const nextIdNum = students.length + 1;
    const generatedId = `DBS-KT-${String(nextIdNum).padStart(3, '0')}`;
    const newRecord: Student = {
      ...newSt,
      id: generatedId,
    };
    setStudents(prev => [newRecord, ...prev]);
  };

  const handleUpdateStudent = (updatedSt: Student) => {
    if (!isParishWide && !isUserAuthorizedForStudent(currentUser, updatedSt, classes)) {
      alert('Bạn không có quyền chỉnh sửa học sinh thuộc lớp khác.');
      return;
    }
    setStudents(prev => prev.map(s => s.id === updatedSt.id ? updatedSt : s));
  };

  const handleDeleteStudent = (id: string) => {
    const targetStudent = students.find(s => s.id === id);
    if (!isParishWide && targetStudent && !isUserAuthorizedForStudent(currentUser, targetStudent, classes)) {
      alert('Bạn không có quyền xóa học sinh thuộc lớp khác.');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa hồ sơ học sinh này không?')) {
      setStudents(prev => prev.filter(s => s.id !== id));
      setAttendanceRecords(prev => prev.filter(a => a.studentId !== id));
      setGrades(prev => prev.filter(g => g.studentId !== id));
      setConducts(prev => prev.filter(c => c.studentId !== id));
      setTuitionList(prev => prev.filter(t => t.studentId !== id));
    }
  };

  const handleDeleteMultipleStudents = (studentIds: string[]) => {
    if (!isParishWide) {
      const unauthorized = students.filter(s => studentIds.includes(s.id) && !isUserAuthorizedForStudent(currentUser, s, classes));
      if (unauthorized.length > 0) {
        alert('Trong danh sách chọn có học sinh thuộc lớp khác bạn không được phụ trách. Thao tác bị từ chối.');
        return;
      }
    }
    if (confirm(`Bạn có chắc chắn muốn xóa ${studentIds.length} học sinh đã chọn khỏi hệ thống không?`)) {
      const idSet = new Set(studentIds);
      setStudents(prev => prev.filter(s => !idSet.has(s.id)));
      setAttendanceRecords(prev => prev.filter(a => !idSet.has(a.studentId)));
      setGrades(prev => prev.filter(g => !idSet.has(g.studentId)));
      setConducts(prev => prev.filter(c => !idSet.has(c.studentId)));
      setTuitionList(prev => prev.filter(t => !idSet.has(t.studentId)));
    }
  };

  const handleBatchImportStudents = (newStudentsList: Student[]) => {
    if (!isParishWide) {
      const unauthorized = newStudentsList.filter(s => !isUserAuthorizedForClass(currentUser, s.classId, classes));
      if (unauthorized.length > 0) {
        alert('Tệp nhập khẩu có chứa học sinh thuộc lớp bạn không được phân công quản lý.');
        return;
      }
    }
    setStudents(prev => [...newStudentsList, ...prev]);
    // Also auto-generate initial tuition records for new students
    const newTuitions: TuitionItem[] = newStudentsList.map(st => ({
      id: `tui-auto-${st.id}`,
      studentId: st.id,
      academicYear: '2026 - 2027',
      feeName: 'Quỹ Giáo Lý & Sinh Hoạt Niên Khóa 2026 - 2027',
      amount: 150000,
      status: 'Chưa đóng',
      dueDate: '2026-10-15',
    }));
    setTuitionList(prev => [...newTuitions, ...prev]);
  };

  const handleExecuteBatchClear = (
    scope: { type: 'all' | 'class' | 'selected'; classId?: string; studentIds?: string[] },
    options: BatchClearOptions
  ) => {
    let targetIds: string[] = [];
    if (scope.type === 'all') {
      targetIds = students.map(s => s.id);
    } else if (scope.type === 'class' && scope.classId) {
      targetIds = students.filter(s => s.classId === scope.classId).map(s => s.id);
    } else if (scope.type === 'selected' && scope.studentIds) {
      targetIds = scope.studentIds;
    }

    if (targetIds.length === 0) return;
    const targetSet = new Set(targetIds);

    // If completely deleting students in scope
    if (options.deleteStudentsInScope) {
      setStudents(prev => prev.filter(s => !targetSet.has(s.id)));
      setAttendanceRecords(prev => prev.filter(a => !targetSet.has(a.studentId)));
      setGrades(prev => prev.filter(g => !targetSet.has(g.studentId)));
      setConducts(prev => prev.filter(c => !targetSet.has(c.studentId)));
      setTuitionList(prev => prev.filter(t => !targetSet.has(t.studentId)));
      alert(`Đã xóa hoàn toàn ${targetIds.length} hồ sơ học sinh.`);
      return;
    }

    // Update Students profile fields
    setStudents(prev => prev.map(student => {
      if (!targetSet.has(student.id)) return student;

      const updated: Student = { ...student };
      if (options.clearPhones) {
        updated.phone = '';
        updated.parentPhone = '';
      }
      if (options.clearParentEmail) {
        updated.parentEmail = '';
      }
      if (options.clearAddress) {
        updated.address = '';
      }
      if (options.clearNotes) {
        updated.notes = undefined;
      }
      if (options.clearBaptism) {
        updated.baptismDate = undefined;
      }
      if (options.clearCommunion) {
        updated.firstCommunionDate = undefined;
      }
      if (options.clearConfirmation) {
        updated.confirmationDate = undefined;
      }
      if (options.clearGodparent) {
        updated.godParentName = undefined;
      }
      return updated;
    }));

    // Update Grades
    if (options.clearAllGrades) {
      setGrades(prev => prev.filter(g => !targetSet.has(g.studentId)));
    } else if (
      options.clearMidtermHK1 ||
      options.clearFinalHK1 ||
      options.clearMidtermHK2 ||
      options.clearRetestScores
    ) {
      setGrades(prev => prev.map(grade => {
        if (!targetSet.has(grade.studentId)) return grade;
        const updated = { ...grade };
        if (grade.semester === 1) {
          if (options.clearMidtermHK1) updated.midTermScore = null;
          if (options.clearFinalHK1) updated.finalScore = null;
        }
        if (grade.semester === 2) {
          if (options.clearMidtermHK2) {
            updated.midTermScore = null;
            updated.finalScore = null;
          }
        }
        if (options.clearRetestScores) {
          updated.retestScore = null;
        }
        return updated;
      }));
    }

    // Update Attendance
    if (options.clearAttendanceHK1) {
      setAttendanceRecords(prev => prev.filter(a => !(targetSet.has(a.studentId) && a.semester === 1)));
    }
    if (options.clearAttendanceHK2) {
      setAttendanceRecords(prev => prev.filter(a => !(targetSet.has(a.studentId) && a.semester === 2)));
    }
    if (options.clearAbsenceOnlyD) {
      setAttendanceRecords(prev => prev.filter(a => !(targetSet.has(a.studentId) && a.status === 'D')));
    }

    // Update Conduct
    if (options.clearConductHK1) {
      setConducts(prev => prev.filter(c => !(targetSet.has(c.studentId) && c.semester === 1)));
    }
    if (options.clearConductHK2) {
      setConducts(prev => prev.filter(c => !(targetSet.has(c.studentId) && c.semester === 2)));
    }

    // Update Tuition
    if (options.clearAllTuition) {
      setTuitionList(prev => prev.filter(t => !targetSet.has(t.studentId)));
    } else if (options.resetTuitionToUnpaid) {
      setTuitionList(prev => prev.map(t => {
        if (!targetSet.has(t.studentId)) return t;
        return {
          ...t,
          status: 'Chưa đóng',
          receiptNumber: undefined,
          paidDate: undefined,
          collectedBy: undefined,
        };
      }));
    }

    alert(`Đã hoàn tất xóa các trường dữ liệu hàng loạt cho ${targetIds.length} học sinh.`);
  };

  // --- User Account Management Handlers ---
  const handleAddUser = (newUserData: Omit<UserAccount, 'id'>) => {
    const nextIdNum = allUsers.length + 1;
    const newId = `usr-gen-${Date.now()}-${nextIdNum}`;
    const newAccount: UserAccount = {
      ...newUserData,
      id: newId,
    };
    setAllUsers(prev => [newAccount, ...prev]);
    alert(`Đã tạo tài khoản "${newAccount.username}" thành công cho ${newAccount.name}.`);
  };

  const handleUpdateUser = (updatedUser: UserAccount) => {
    setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    alert(`Đã cập nhật thông tin tài khoản "${updatedUser.username}".`);
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser.id) {
      alert('Không thể xóa tài khoản bạn đang đăng nhập!');
      return;
    }
    setAllUsers(prev => prev.filter(u => u.id !== userId));
    alert('Đã xóa tài khoản thành công khỏi hệ thống.');
  };

  const handleToggleLockUser = (userId: string) => {
    if (userId === currentUser.id) {
      alert('Không thể khóa tài khoản bạn đang đăng nhập!');
      return;
    }
    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextStatus = u.status === 'locked' ? 'active' : 'locked';
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const handleResetPassword = (userId: string, newPass: string) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, password: newPass };
      }
      return u;
    }));
  };

  // --- Attendance Handlers ---
  const handleUpdateAttendance = (
    studentId: string, 
    status: AttendanceStatus, 
    date: string, 
    sessionType: 'Chúa Nhật' | 'Thứ 5',
    semester: 1 | 2,
    note?: string,
    scanTime?: string,
    timeSlot?: AttendanceTimeSlot
  ) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    if (!isParishWide && !isUserAuthorizedForStudent(currentUser, student, classes)) {
      alert(`Bạn không có quyền điểm danh cho học sinh thuộc lớp khác (${student.fullName}).`);
      return;
    }

    setAttendanceRecords(prev => {
      const existingIdx = prev.findIndex(
        r => r.studentId === studentId && r.date === date && r.sessionType === sessionType && r.semester === semester
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          status,
          sessionType,
          scanTime: scanTime || updated[existingIdx].scanTime,
          timeSlot: timeSlot || updated[existingIdx].timeSlot,
          note: note !== undefined ? note : updated[existingIdx].note,
        };
        return updated;
      } else {
        const newRecord: AttendanceRecord = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          studentId,
          classId: student.classId,
          date,
          sessionType,
          status,
          semester,
          scanTime,
          timeSlot,
          note,
        };
        return [...prev, newRecord];
      }
    });
  };

  const handleBatchMarkAllA = (
    classId: string, 
    date: string, 
    sessionType: 'Chúa Nhật' | 'Thứ 5', 
    semester: 1 | 2
  ) => {
    if (!isParishWide && !isUserAuthorizedForClass(currentUser, classId, classes)) {
      alert('Bạn không có quyền điểm danh cho lớp này. Chỉ được thao tác trên lớp mình phụ trách.');
      return;
    }
    const targetStudents = students.filter(s => s.classId === classId);
    setAttendanceRecords(prev => {
      // Remove any existing records for this class & date, then replace with 'A'
      const filtered = prev.filter(
        r => !(r.classId === classId && r.date === date && r.sessionType === sessionType && r.semester === semester)
      );
      const newItems: AttendanceRecord[] = targetStudents.map(st => ({
        id: `att-batch-${st.id}-${date}`,
        studentId: st.id,
        classId,
        date,
        sessionType,
        status: 'A',
        semester,
      }));
      return [...filtered, ...newItems];
    });
    alert(`Đã điểm danh Đạt (A) cho toàn bộ ${targetStudents.length} học sinh trong lớp hôm nay!`);
  };

  // QR Scanner callback
  const handleQRScannerAttendanceMarked = (
    studentId: string,
    status: AttendanceStatus,
    date: string,
    sessionType: 'Chúa Nhật' | 'Thứ 5',
    scanTime?: string,
    timeSlot?: AttendanceTimeSlot,
    note?: string
  ) => {
    // Automatically determine semester based on month (Sept - Jan: Sem 1, Feb - Aug: Sem 2)
    const month = new Date(date).getMonth() + 1;
    const semester: 1 | 2 = (month >= 9 || month <= 1) ? 1 : 2;
    handleUpdateAttendance(studentId, status, date, sessionType, semester, note, scanTime, timeSlot);
  };

  // --- Grade Handlers ---
  const handleUpdateGrade = (gradeData: Omit<GradeRecord, 'id'>) => {
    const student = students.find(s => s.id === gradeData.studentId);
    if (!student) return;

    if (!isParishWide && !isUserAuthorizedForStudent(currentUser, student, classes)) {
      alert('Bạn không có quyền nhập/chỉnh sửa điểm cho học sinh thuộc lớp khác.');
      return;
    }

    setGrades(prev => {
      const existingIdx = prev.findIndex(
        g => g.studentId === gradeData.studentId && g.semester === gradeData.semester
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          ...gradeData,
        };
        return updated;
      } else {
        const newG: GradeRecord = {
          id: `gr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ...gradeData,
        };
        return [...prev, newG];
      }
    });
  };

  // --- Conduct Violation Handlers ---
  const handleAddConductViolation = (
    studentId: string, 
    violation: ConductViolation, 
    semester: 1 | 2, 
    description?: string
  ) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    if (!isParishWide && !isUserAuthorizedForStudent(currentUser, student, classes)) {
      alert('Bạn không có quyền ghi nhận nề nếp cho học sinh thuộc lớp khác.');
      return;
    }

    const newRecord: ConductRecord = {
      id: `cnd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId,
      classId: student.classId,
      date: new Date().toISOString().split('T')[0],
      violation,
      pointsDeducted: 0.1,
      description: description || `Vi phạm tiêu chuẩn -${violation}`,
      semester,
    };
    setConducts(prev => [...prev, newRecord]);
  };

  const handleRemoveConductViolation = (conductId: string) => {
    const conduct = conducts.find(c => c.id === conductId);
    if (conduct && !isParishWide && !isUserAuthorizedForClass(currentUser, conduct.classId, classes)) {
      alert('Bạn không có quyền xóa vi phạm của học sinh lớp khác.');
      return;
    }
    setConducts(prev => prev.filter(c => c.id !== conductId));
  };

  // --- Class Transfer Handlers ---
  const handleTransferIndividual = (studentId: string, toClassId: string, reason: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) {
      alert('Không tìm thấy học sinh cần chuyển.');
      return;
    }
    const oldClassId = student.classId;
    if (oldClassId === toClassId) {
      alert('Học sinh đã ở lớp này rồi.');
      return;
    }
    const toClass = classes.find(c => c.id === toClassId);
    if (!toClass) {
      alert('Lớp chuyển đến không tồn tại.');
      return;
    }

    const transferEntry = {
      fromClass: oldClassId,
      toClass: toClassId,
      date: new Date().toISOString().split('T')[0],
      reason: reason.trim() || 'Chuyển lớp cá nhân',
    };

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          classId: toClassId,
          transferHistory: [...(s.transferHistory || []), transferEntry],
        };
      }
      return s;
    }));
  };

  const handleTransferBatch = (
    fromClassId: string, 
    toClassId: string, 
    onlyQualified: boolean, 
    reason: string,
    targetStudentIds?: string[]
  ) => {
    if (fromClassId === toClassId) {
      alert('Lớp nguồn và lớp đích không được trùng nhau.');
      return;
    }
    const fromClass = classes.find(c => c.id === fromClassId);
    const toClass = classes.find(c => c.id === toClassId);
    if (!fromClass || !toClass) {
      alert('Không tìm thấy lớp học hợp lệ.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const targetSet = targetStudentIds && targetStudentIds.length > 0 
      ? new Set(targetStudentIds) 
      : null;

    setStudents(prev => prev.map(s => {
      if (s.classId === fromClassId && (!targetSet || targetSet.has(s.id))) {
        const transferEntry = {
          fromClass: fromClassId,
          toClass: toClassId,
          date: today,
          reason: reason.trim() || 'Lên lớp niên khóa mới',
        };
        return {
          ...s,
          classId: toClassId,
          transferHistory: [...(s.transferHistory || []), transferEntry],
        };
      }
      return s;
    }));
  };

  const handleRevertTransfer = (studentId: string, historyIndex: number) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId && s.transferHistory && s.transferHistory[historyIndex]) {
        const entryToRevert = s.transferHistory[historyIndex];
        const updatedHistory = s.transferHistory.filter((_, idx) => idx !== historyIndex);
        return {
          ...s,
          classId: entryToRevert.fromClass,
          transferHistory: updatedHistory,
        };
      }
      return s;
    }));
  };

  // --- Tuition Handlers ---
  const handleUpdateTuition = (item: TuitionItem) => {
    setTuitionList(prev => prev.map(t => t.id === item.id ? item : t));
  };

  const handleAddTuition = (item: Omit<TuitionItem, 'id'>) => {
    const newItem: TuitionItem = {
      ...item,
      id: `fee-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setTuitionList(prev => [newItem, ...prev]);
  };

  // --- Catechist Handlers ---
  const handleAddCatechist = (cat: Omit<Catechist, 'id'>) => {
    const newCat: Catechist = {
      ...cat,
      id: `GLV-${String(catechists.length + 1).padStart(2, '0')}`,
    };
    setCatechists(prev => [...prev, newCat]);
  };

  const handleUpdateCatechist = (cat: Catechist) => {
    setCatechists(prev => prev.map(c => c.id === cat.id ? cat : c));
  };

  const handleAddEvaluation = (evalItem: Omit<CatechistEvaluation, 'id'>) => {
    const newEval: CatechistEvaluation = {
      ...evalItem,
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setEvaluations(prev => [newEval, ...prev]);
  };

  // --- Schedule & Email Handlers ---
  const handleAddEvent = (ev: Omit<CalendarEvent, 'id'>) => {
    const newEv: CalendarEvent = {
      ...ev,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setEvents(prev => [...prev, newEv]);
  };

  const handleBatchAddEvents = (newEvents: Omit<CalendarEvent, 'id'>[], replaceExisting: boolean = false) => {
    const items: CalendarEvent[] = newEvents.map((ev, index) => ({
      ...ev,
      id: `evt-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
    }));
    if (replaceExisting) {
      setEvents(items);
    } else {
      setEvents(prev => [...prev, ...items]);
    }
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleSendEmail = (email: Omit<EmailNotification, 'id'>) => {
    const newNotification: EmailNotification = {
      ...email,
      id: `mail-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  // If not authenticated, render Login Screen
  if (!isAuthenticated) {
    return (
      <LoginScreen 
        allUsers={allUsers} 
        students={students} 
        classes={classes}
        catechists={catechists}
        events={events}
        parishInfo={parishInfo}
        onLogin={handleLogin} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Top Main Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        allUsers={allUsers}
        parishInfo={parishInfo}
        onOpenParishInfoEdit={() => setIsParishInfoEditOpen(true)}
        onRequestSwitchAccount={handleOpenSwitchAccount}
        onLogout={handleLogout}
        onOpenQRScanner={() => setIsQRScannerOpen(true)}
        onOpenIdSearch={() => setIsIdSearchModalOpen(true)}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        {!isTabAllowed(currentUser.role, activeTab) && (
          <div className="bg-white rounded-xl p-8 border border-slate-200 text-center space-y-3 max-w-md mx-auto my-12 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
              🚫
            </div>
            <h3 className="text-base font-bold text-slate-900">Tính năng không thuộc phân quyền</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tài khoản của bạn ({ROLE_PERMISSIONS[currentUser.role]?.name}) chỉ có quyền truy cập vào các mục được phân quyền cụ thể.
            </p>
            <button
              onClick={() => setActiveTab(getDefaultTabForRole(currentUser.role))}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Chuyển Về Mục Được Cấp Phép
            </button>
          </div>
        )}

        {isTabAllowed(currentUser.role, 'students') && activeTab === 'students' && (
          <StudentManagement
            students={isParishWide ? students : authorizedStudents}
            classes={isParishWide ? classes : authorizedClasses}
            userRole={currentUser.role}
            currentUser={currentUser}
            grades={grades}
            conducts={conducts}
            attendanceRecords={attendanceRecords}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onBatchImportStudents={handleBatchImportStudents}
            onExecuteBatchClear={handleExecuteBatchClear}
            onDeleteMultipleStudents={handleDeleteMultipleStudents}
            onOpenCardModal={(classId, studentIds) => {
              setCardModalClassId(classId || (!isParishWide ? authorizedClasses[0]?.id : undefined));
              setCardModalStudentIds(studentIds);
              setIsCardModalOpen(true);
            }}
            onOpenReportBook={(st) => setReportBookStudent(st)}
            onOpenTransferModal={(st) => {
              setTransferModalStudent(st);
              setIsTransferModalOpen(true);
            }}
            onOpenIdSearchModal={() => setIsIdSearchModalOpen(true)}
          />
        )}

        {isTabAllowed(currentUser.role, 'attendance') && activeTab === 'attendance' && (
          <AttendanceManager
            students={isParishWide ? students : authorizedStudents}
            classes={isParishWide ? classes : authorizedClasses}
            attendanceRecords={attendanceRecords}
            userRole={currentUser.role}
            customSchedules={customSchedules}
            onOpenCustomScheduleModal={handleOpenCustomScheduleModal}
            onUpdateAttendance={handleUpdateAttendance}
            onBatchMarkAllA={handleBatchMarkAllA}
            onOpenQRScanner={() => setIsQRScannerOpen(true)}
            onOpenIdSearch={() => setIsIdSearchModalOpen(true)}
          />
        )}

        {isTabAllowed(currentUser.role, 'grades') && activeTab === 'grades' && (
          <GradeManager
            students={isParishWide ? students : authorizedStudents}
            classes={isParishWide ? classes : authorizedClasses}
            grades={grades}
            conducts={conducts}
            attendanceRecords={attendanceRecords}
            userRole={currentUser.role}
            onUpdateGrade={handleUpdateGrade}
            onAddConductViolation={handleAddConductViolation}
            onRemoveConductViolation={handleRemoveConductViolation}
          />
        )}

        {isTabAllowed(currentUser.role, 'report_books') && activeTab === 'report_books' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Kho Lưu Trữ Sổ Liên Lạc & Hồ Sơ Học Tập Thiếu Nhi</span>
                  {!isParishWide && (
                    <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Lớp: {authorizedClasses[0]?.name || 'Lớp phụ trách'}
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-500">
                  {isParishWide 
                    ? 'Chọn học sinh bất kỳ để xem và in Sổ Liên Lạc chính thức theo đúng định dạng Ban Giáo Lý Don Bosco Đà Lạt'
                    : `Hiển thị danh sách học sinh thuộc ${authorizedClasses[0]?.name || 'lớp bạn phụ trách'}. Bạn chỉ có quyền truy cập sổ liên lạc học sinh lớp mình.`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              {(isParishWide ? students : authorizedStudents).map(s => {
                const cls = classes.find(c => c.id === s.classId);
                return (
                  <div key={s.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-amber-400 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] text-slate-400 font-semibold">{s.id}</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-semibold">{cls?.name}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        <span className="text-amber-800 mr-1">{s.holyName}</span>
                        <span>{s.fullName}</span>
                      </h3>
                      <p className="text-slate-500 text-[11px] mt-0.5">Giáo họ: {s.subParish}</p>
                    </div>

                    <button
                      onClick={() => setReportBookStudent(s)}
                      className="mt-3 w-full py-1.5 px-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold text-center text-xs shadow-2xs transition-colors"
                    >
                      Mở Sổ Liên Lạc A4
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isTabAllowed(currentUser.role, 'transfer') && activeTab === 'transfer' && (
          <div className="space-y-4">
            <ClassTransferModal
              students={students}
              classes={classes}
              grades={grades}
              conducts={conducts}
              attendanceRecords={attendanceRecords}
              initialStudent={transferModalStudent}
              onClose={() => setActiveTab('students')}
              onTransferIndividual={handleTransferIndividual}
              onTransferBatch={handleTransferBatch}
              onRevertTransfer={handleRevertTransfer}
            />
          </div>
        )}

        {isTabAllowed(currentUser.role, 'tuition') && activeTab === 'tuition' && (
          <TuitionManager
            tuitionList={tuitionList}
            students={students}
            classes={classes}
            userRole={currentUser.role}
            onUpdateTuition={handleUpdateTuition}
            onAddTuition={handleAddTuition}
          />
        )}

        {isTabAllowed(currentUser.role, 'catechists') && activeTab === 'catechists' && (
          <CatechistManager
            catechists={catechists}
            evaluations={evaluations}
            classes={classes}
            userRole={currentUser.role}
            onAddCatechist={handleAddCatechist}
            onUpdateCatechist={handleUpdateCatechist}
            onAddEvaluation={handleAddEvaluation}
          />
        )}

        {isTabAllowed(currentUser.role, 'calendar') && activeTab === 'calendar' && (
          currentUser.role === 'parent' ? (
            <ParentGeneralCalendarView
              events={events}
              notifications={notifications}
              students={students}
              classes={classes}
              currentUser={currentUser}
            />
          ) : (
            <ScheduleAndEmailManager
              events={events}
              notifications={notifications}
              students={students}
              catechists={catechists}
              classes={classes}
              userRole={currentUser.role}
              currentUser={currentUser}
              initialTab="schedule"
              onAddEvent={handleAddEvent}
              onBatchAddEvents={handleBatchAddEvents}
              onDeleteEvent={handleDeleteEvent}
              onSendEmail={handleSendEmail}
            />
          )
        )}

        {isTabAllowed(currentUser.role, 'reports') && activeTab === 'reports' && (
          <SemesterReportDashboard
            students={students}
            classes={classes}
            grades={grades}
            conducts={conducts}
            attendanceRecords={attendanceRecords}
            tuitionList={tuitionList}
            onOpenReportBook={(st) => setReportBookStudent(st)}
          />
        )}

        {isTabAllowed(currentUser.role, 'notifications') && activeTab === 'notifications' && (
          <ScheduleAndEmailManager
            events={events}
            notifications={notifications}
            students={students}
            catechists={catechists}
            classes={classes}
            userRole={currentUser.role}
            currentUser={currentUser}
            initialTab="email_dispatch"
            onAddEvent={handleAddEvent}
            onBatchAddEvents={handleBatchAddEvents}
            onDeleteEvent={handleDeleteEvent}
            onSendEmail={handleSendEmail}
          />
        )}

        {isTabAllowed(currentUser.role, 'parent_portal') && activeTab === 'parent_portal' && (
          <ParentPortalView
            students={students}
            classes={classes}
            grades={grades}
            conducts={conducts}
            attendanceRecords={attendanceRecords}
            tuitionList={tuitionList}
            currentUser={currentUser}
            events={events}
            notifications={notifications}
            onOpenReportBook={(st) => setReportBookStudent(st)}
          />
        )}

        {isTabAllowed(currentUser.role, 'accounts') && activeTab === 'accounts' && (
          <AccountManagement
            currentUser={currentUser}
            allUsers={allUsers}
            classes={classes}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onToggleLockUser={handleToggleLockUser}
            onResetPassword={handleResetPassword}
            onSwitchUser={handleOpenSwitchAccount}
          />
        )}
      </main>

      {/* Global Modals */}
      {isSwitchAccountModalOpen && (
        <SwitchAccountModal
          currentUser={currentUser}
          allUsers={allUsers}
          targetUser={switchTargetUser}
          onConfirmSwitch={handleConfirmSwitchAccount}
          onLogoutToLoginScreen={handleLogout}
          onClose={() => {
            setIsSwitchAccountModalOpen(false);
            setSwitchTargetUser(null);
          }}
        />
      )}
      {isCardModalOpen && (
        <StudentCardModal
          students={isParishWide ? students : authorizedStudents}
          classes={isParishWide ? classes : authorizedClasses}
          selectedClassId={cardModalClassId || (!isParishWide ? authorizedClasses[0]?.id : undefined)}
          initialStudentIds={cardModalStudentIds}
          onClose={() => {
            setIsCardModalOpen(false);
            setCardModalStudentIds(undefined);
            setCardModalClassId(undefined);
          }}
        />
      )}

      {isQRScannerOpen && (
        <QRScannerModal
          students={students}
          classes={classes}
          currentUser={currentUser}
          authorizedClassIds={isParishWide ? undefined : authorizedClassIds}
          customSchedules={customSchedules}
          onScheduleUpdated={handleScheduleUpdated}
          onAttendanceMarked={handleQRScannerAttendanceMarked}
          onClose={() => setIsQRScannerOpen(false)}
        />
      )}

      {isIdSearchModalOpen && (
        <StudentIdSearchModal
          students={students}
          classes={classes}
          attendanceRecords={attendanceRecords}
          grades={grades}
          conducts={conducts}
          tuitionList={tuitionList}
          currentUser={currentUser}
          authorizedClassIds={isParishWide ? undefined : authorizedClassIds}
          onClose={() => setIsIdSearchModalOpen(false)}
          onOpenReportBook={(st) => {
            setIsIdSearchModalOpen(false);
            setReportBookStudent(st);
          }}
          onOpenStudentCard={(st) => {
            setIsIdSearchModalOpen(false);
            setCardModalClassId(st.classId);
            setCardModalStudentIds([st.id]);
            setIsCardModalOpen(true);
          }}
          onQuickMarkAttendance={handleUpdateAttendance}
        />
      )}

      {reportBookStudent && (
        <ReportBookModal
          student={reportBookStudent}
          classes={classes}
          grades={grades}
          conducts={conducts}
          attendanceRecords={attendanceRecords}
          onClose={() => setReportBookStudent(null)}
        />
      )}

      {isTransferModalOpen && activeTab !== 'transfer' && (
        <ClassTransferModal
          students={students}
          classes={classes}
          grades={grades}
          conducts={conducts}
          attendanceRecords={attendanceRecords}
          initialStudent={transferModalStudent}
          onClose={() => {
            setIsTransferModalOpen(false);
            setTransferModalStudent(undefined);
          }}
          onTransferIndividual={handleTransferIndividual}
          onTransferBatch={handleTransferBatch}
          onRevertTransfer={handleRevertTransfer}
        />
      )}

      {isParishInfoEditOpen && (
        <ParishInfoEditModal
          isOpen={isParishInfoEditOpen}
          parishInfo={parishInfo}
          onSave={handleSaveParishInfo}
          onClose={() => setIsParishInfoEditOpen(false)}
        />
      )}

      {isCustomScheduleModalOpen && (
        <CustomScheduleModal
          initialDate={scheduleModalDate}
          initialSessionType={scheduleModalSessionType}
          customSchedules={customSchedules}
          onScheduleUpdated={handleScheduleUpdated}
          onClose={() => setIsCustomScheduleModalOpen(false)}
        />
      )}

      {/* Parish Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 px-4 border-t border-slate-800 mt-8 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <p className="text-white font-medium">{parishInfo.catechistDepartmentName} {parishInfo.parishName}</p>
            <p className="text-[11px] text-slate-400">Niên khóa {parishInfo.academicYear} • {parishInfo.motto}</p>
          </div>
          <div className="text-[11px] text-slate-500">
            {parishInfo.phone} • {parishInfo.email} • {parishInfo.address}
          </div>
        </div>
      </footer>
    </div>
  );
}
