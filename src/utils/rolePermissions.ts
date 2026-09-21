import { Role, UserAccount, ClassRoom, Student } from '../types';
import { ActiveTab } from '../components/Navbar';

export interface RolePermissionConfig {
  name: string;
  badge: string;
  description: string;
  allowedTabs: ActiveTab[];
  canScanQR: boolean;
  canSearchId: boolean;
  canSpecialPromotion: boolean;
  canBackupRestore: boolean;
  canManageAccounts: boolean;
  defaultTab: ActiveTab;
}

export const ROLE_PERMISSIONS: Record<Role, RolePermissionConfig> = {
  admin: {
    name: 'Quản Trị Viên (Admin)',
    badge: '🛡️ Quản Trị Viên (Toàn quyền)',
    description: 'Toàn quyền cấu hình hệ thống, quản lý dữ liệu, cấp tài khoản và phân quyền.',
    allowedTabs: [
      'students',
      'attendance',
      'grades',
      'report_books',
      'transfer',
      'tuition',
      'catechists',
      'calendar',
      'reports',
      'notifications',
      'parent_portal',
      'accounts'
    ],
    canScanQR: true,
    canSearchId: true,
    canSpecialPromotion: true,
    canBackupRestore: true,
    canManageAccounts: true,
    defaultTab: 'students'
  },
  pastor: {
    name: 'Cha Quản Sở (Toàn quyền mục vụ)',
    badge: 'Cha Quản Sở (Toàn quyền)',
    description: 'Giám sát toàn diện học vụ, điểm danh, tài chính, GLV và đặc cách lên lớp.',
    allowedTabs: [
      'students',
      'attendance',
      'grades',
      'report_books',
      'transfer',
      'tuition',
      'catechists',
      'calendar',
      'reports',
      'notifications',
      'parent_portal',
      'accounts'
    ],
    canScanQR: true,
    canSearchId: true,
    canSpecialPromotion: true,
    canBackupRestore: true,
    canManageAccounts: true,
    defaultTab: 'reports'
  },
  catechist_leader: {
    name: 'Trưởng Ban Giáo Lý',
    badge: 'Trưởng Ban Giáo Lý',
    description: 'Điều hành chuyên môn giáo lý, theo dõi các lớp, duyệt chuyển lớp và báo cáo.',
    allowedTabs: [
      'students',
      'attendance',
      'grades',
      'report_books',
      'transfer',
      'tuition',
      'catechists',
      'calendar',
      'reports',
      'notifications',
      'parent_portal'
    ],
    canScanQR: true,
    canSearchId: true,
    canSpecialPromotion: false,
    canBackupRestore: false,
    canManageAccounts: false,
    defaultTab: 'students'
  },
  secretary: {
    name: 'Thư Ký Ban Giáo Lý',
    badge: 'Thư Ký Ban Giáo Lý',
    description: 'Quản lý văn thư, sổ sách, niên lịch, soạn và gửi email thông báo học vụ toàn xứ.',
    allowedTabs: [
      'students',
      'attendance',
      'grades',
      'report_books',
      'transfer',
      'tuition',
      'catechists',
      'calendar',
      'reports',
      'notifications',
      'parent_portal'
    ],
    canScanQR: true,
    canSearchId: true,
    canSpecialPromotion: false,
    canBackupRestore: false,
    canManageAccounts: false,
    defaultTab: 'notifications'
  },
  catechist: {
    name: 'Giáo Lý Viên Phụ Trách',
    badge: 'Giáo Lý Viên Phụ Trách',
    description: 'Điểm danh, nhập điểm số, hạnh kiểm, quản lý học sinh và sổ liên lạc lớp phụ trách.',
    allowedTabs: [
      'attendance',
      'grades',
      'students',
      'report_books',
      'calendar',
      'notifications',
      'parent_portal'
    ],
    canScanQR: true,
    canSearchId: true,
    canSpecialPromotion: false,
    canBackupRestore: false,
    canManageAccounts: false,
    defaultTab: 'attendance'
  },
  trainee: {
    name: 'Dự Trưởng / Huấn Luyện',
    badge: 'Dự Trưởng / Trợ Tá',
    description: 'Hỗ trợ điểm danh Chúa Nhật & Thứ 5, theo dõi danh sách học sinh và lịch trình sinh hoạt.',
    allowedTabs: [
      'attendance',
      'students',
      'calendar',
      'notifications'
    ],
    canScanQR: true,
    canSearchId: true,
    canSpecialPromotion: false,
    canBackupRestore: false,
    canManageAccounts: false,
    defaultTab: 'attendance'
  },
  parent: {
    name: 'Phụ Huynh / Thiếu Nhi',
    badge: 'Phụ Huynh / Thiếu Nhi',
    description: 'Cổng thông tin gia đình: Tra cứu hồ sơ con em, điểm số, chuyên cần và lịch sinh hoạt.',
    allowedTabs: [
      'parent_portal',
      'calendar'
    ],
    canScanQR: false,
    canSearchId: false,
    canSpecialPromotion: false,
    canBackupRestore: false,
    canManageAccounts: false,
    defaultTab: 'parent_portal'
  }
};

export function isTabAllowed(role: Role, tab: ActiveTab): boolean {
  const perm = ROLE_PERMISSIONS[role];
  return perm ? perm.allowedTabs.includes(tab) : false;
}

export function getDefaultTabForRole(role: Role): ActiveTab {
  return ROLE_PERMISSIONS[role]?.defaultTab || 'attendance';
}

/**
 * Returns whether a role has parish-wide administrative access (can see and manage all classes and all students).
 * Admin, Pastor, Catechist Leader, and Secretary manage the whole parish.
 */
export function hasParishWideAccess(role: Role): boolean {
  return role === 'admin' || role === 'pastor' || role === 'catechist_leader' || role === 'secretary';
}

/**
 * Returns the list of classes a user is authorized to access.
 * - Parish-wide roles: all classes.
 * - Catechists & Trainees: only their assigned class(es).
 * - Parents: empty array (not teachers).
 */
export function getUserAuthorizedClasses(user: UserAccount, classes: ClassRoom[]): ClassRoom[] {
  if (hasParishWideAccess(user.role)) {
    return classes;
  }
  if (user.role === 'catechist' || user.role === 'trainee') {
    if (user.assignedClassId) {
      const assigned = classes.filter(c => c.id === user.assignedClassId);
      if (assigned.length > 0) return assigned;
    }
    // Check if user is head teacher or assistant in any class
    const taught = classes.filter(c => c.headTeacherId === user.id || c.assistantTeacherIds?.includes(user.id));
    if (taught.length > 0) return taught;

    // Fallback if none assigned
    return classes.length > 0 ? [classes[0]] : [];
  }
  return [];
}

/**
 * Returns the list of students a user is authorized to access.
 * - Parish-wide roles: all students.
 * - Catechists & Trainees: only students in their assigned class(es).
 * - Parents: only their own children (matched by parent phone or name).
 */
export function getUserAuthorizedStudents(user: UserAccount, students: Student[], classes: ClassRoom[]): Student[] {
  if (hasParishWideAccess(user.role)) {
    return students;
  }
  if (user.role === 'catechist' || user.role === 'trainee') {
    const authorizedClasses = getUserAuthorizedClasses(user, classes);
    const authorizedClassIds = authorizedClasses.map(c => c.id);
    return students.filter(s => authorizedClassIds.includes(s.classId));
  }
  if (user.role === 'parent') {
    const phone = user.phone?.replace(/[\s.-]/g, '') || '';
    const name = user.name?.toLowerCase() || '';
    return students.filter(s => {
      const pPhone = s.parentPhone?.replace(/[\s.-]/g, '') || '';
      const pName = s.parentName?.toLowerCase() || '';
      return (phone && pPhone && (phone.includes(pPhone) || pPhone.includes(phone))) ||
             (name && pName && (name.includes(pName) || pName.includes(name)));
    });
  }
  return [];
}

/**
 * Check if a user is authorized to perform operations on a given class ID
 */
export function isUserAuthorizedForClass(user: UserAccount, classId: string, classes: ClassRoom[]): boolean {
  if (hasParishWideAccess(user.role)) return true;
  const authorizedClasses = getUserAuthorizedClasses(user, classes);
  return authorizedClasses.some(c => c.id === classId);
}

/**
 * Check if a user is authorized to perform operations on a given student
 */
export function isUserAuthorizedForStudent(user: UserAccount, student: Student, classes: ClassRoom[]): boolean {
  if (hasParishWideAccess(user.role)) return true;
  return isUserAuthorizedForClass(user, student.classId, classes);
}

/**
 * Role capability checks
 */
export function canAddStudent(role: Role): boolean {
  // Admin, Pastor, Catechist Leader, and Catechist can add students (Catechist only to their assigned class)
  // Trainees and Parents cannot add students
  return role === 'admin' || role === 'pastor' || role === 'catechist_leader' || role === 'catechist';
}

export function canEditStudent(role: Role): boolean {
  return role === 'admin' || role === 'pastor' || role === 'catechist_leader' || role === 'catechist';
}

export function canDeleteStudent(role: Role): boolean {
  // Only Admin and Pastor can delete students from the parish database
  return role === 'admin' || role === 'pastor';
}

export function canTransferStudent(role: Role): boolean {
  // Admin, Pastor, Catechist Leader
  return role === 'admin' || role === 'pastor' || role === 'catechist_leader';
}

export function canSpecialPromotion(role: Role): boolean {
  // Pastor and Admin
  return role === 'admin' || role === 'pastor';
}

export function canBatchClear(role: Role): boolean {
  // Admin and Pastor
  return role === 'admin' || role === 'pastor';
}

export function canBatchImport(role: Role): boolean {
  // Admin, Pastor, Catechist Leader
  return role === 'admin' || role === 'pastor' || role === 'catechist_leader';
}

export function canEditGrades(role: Role): boolean {
  // Admin, Pastor, Catechist Leader, Catechist
  // Trainees cannot edit grades
  return role === 'admin' || role === 'pastor' || role === 'catechist_leader' || role === 'catechist';
}

export function canSendMassEmail(role: Role): boolean {
  // Admin, Pastor, Catechist Leader, and Secretary can send parish-wide mass emails
  return role === 'admin' || role === 'pastor' || role === 'catechist_leader' || role === 'secretary';
}

/**
 * Role hierarchy levels for permission checks:
 * Higher level roles can send email to lower level roles.
 */
export function getRoleHierarchyLevel(role: Role): number {
  switch (role) {
    case 'admin': return 60;
    case 'pastor': return 50;
    case 'catechist_leader': return 40;
    case 'secretary': return 35;
    case 'catechist': return 20;
    case 'trainee': return 10;
    case 'parent': return 0;
  }
}

/**
 * Higher roles (Admin, Pastor, Catechist Leader, Secretary) can send email to ALL parents in the parish.
 */
export function canSendEmailToAllParents(role: Role): boolean {
  return role === 'admin' || role === 'pastor' || role === 'catechist_leader' || role === 'secretary';
}

/**
 * Higher roles (Trưởng ban giáo lý, Thư ký, Cha xứ, Admin) can send email to lower roles:
 * Lower roles include Catechists, Trainees, and Parents.
 */
export function canSendEmailToLowerRoles(role: Role): boolean {
  return role === 'admin' || role === 'pastor' || role === 'catechist_leader' || role === 'secretary';
}

/**
 * Check if the current user can compose and send emails:
 * - Parents: CANNOT send emails at all
 * - Higher roles: CAN send to all parents, lower roles, and specific groups
 * - Class teachers (Catechists / Trainees assigned to class): CAN ONLY send to parents of their assigned class
 */
export function canUserComposeEmail(user: UserAccount, classes: ClassRoom[]): boolean {
  if (user.role === 'parent') return false;
  if (canSendEmailToAllParents(user.role)) return true;
  const taughtClasses = getUserAuthorizedClasses(user, classes);
  return taughtClasses.length > 0;
}


