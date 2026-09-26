import React, { useState } from 'react';
import { 
  Users, 
  QrCode, 
  Award, 
  BookOpen, 
  ArrowRightLeft, 
  CreditCard, 
  GraduationCap, 
  Calendar, 
  BarChart3, 
  Mail, 
  Search,
  ShieldCheck,
  ChevronDown,
  UserCog,
  Database,
  Crown,
  LogOut,
  Lock,
  Sparkles,
  Building2,
  Church,
  Menu,
  X,
  ChevronRight,
  History
} from 'lucide-react';
import { Role, UserAccount, ParishInfo } from '../types';
import { ROLE_PERMISSIONS } from '../utils/rolePermissions';

export type ActiveTab = 
  | 'students'
  | 'attendance'
  | 'grades'
  | 'report_books'
  | 'transfer'
  | 'tuition'
  | 'catechists'
  | 'calendar'
  | 'reports'
  | 'notifications'
  | 'parent_portal'
  | 'accounts';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: UserAccount;
  allUsers: UserAccount[];
  onRequestSwitchAccount: (user?: UserAccount) => void;
  onLogout: () => void;
  onOpenQRScanner: () => void;
  onOpenIdSearch: () => void;
  onOpenHistoryModal?: () => void;
  onOpenBackupRestore?: () => void;
  onOpenSpecialPromotion?: () => void;
  onOpenParishInfoEdit?: () => void;
  parishInfo?: ParishInfo;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  allUsers,
  onRequestSwitchAccount,
  onLogout,
  onOpenQRScanner,
  onOpenIdSearch,
  onOpenHistoryModal,
  onOpenBackupRestore,
  onOpenSpecialPromotion,
  onOpenParishInfoEdit,
  parishInfo,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const permissions = ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS.parent;

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-900 border border-rose-300 inline-flex items-center gap-1">🛡️ Quản Trị Viên (Admin)</span>;
      case 'pastor':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-900 border border-amber-300">Cha Quản Sở (Toàn quyền)</span>;
      case 'catechist_leader':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-900 border border-blue-300">Trưởng Ban Giáo Lý</span>;
      case 'secretary':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300">Thư Ký Ban Giáo Lý</span>;
      case 'catechist':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">Giáo Lý Viên Phụ Trách</span>;
      case 'trainee':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-900 border border-purple-300">Dự Trưởng / Huấn Luyện</span>;
      case 'parent':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-stone-100 text-stone-800 border border-stone-300">Phụ Huynh / Thiếu Nhi</span>;
    }
  };

  const isParent = currentUser.role === 'parent';

  const allNavItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'parent_portal', label: isParent ? 'Thông Tin Con Em' : 'Tra Cứu Phụ Huynh', icon: isParent ? Users : Search },
    { id: 'calendar', label: isParent ? 'Niên Lịch & Sinh Hoạt' : 'Niên Lịch 2026-2027', icon: Calendar },
    { id: 'students', label: 'Học Sinh & Thẻ QR', icon: Users },
    { id: 'attendance', label: 'Điểm Danh & Chuyên Cần', icon: QrCode },
    { id: 'grades', label: 'Điểm Số & Hạnh Kiểm', icon: Award },
    { id: 'report_books', label: 'Sổ Liên Lạc', icon: BookOpen },
    { id: 'transfer', label: 'Chuyển Lớp', icon: ArrowRightLeft },
    { id: 'tuition', label: 'Học Phí & Quỹ', icon: CreditCard },
    { id: 'catechists', label: 'Giáo Lý Viên & Đánh Giá', icon: GraduationCap },
    { id: 'reports', label: 'Báo Cáo & Khen Thưởng', icon: BarChart3 },
    { id: 'notifications', label: 'Nhắc Nhở & Email', icon: Mail },
    { id: 'accounts', label: 'Tài Khoản & Phân Quyền', icon: UserCog },
  ];

  // Filter navigation items strictly by role permissions and preserve role's defined tab order
  const authorizedNavItems = permissions.allowedTabs
    .map(tabId => allNavItems.find(item => item.id === tabId))
    .filter((item): item is typeof allNavItems[0] => Boolean(item));

  // Determine top 4 quick tabs for bottom navigation bar on mobile
  const bottomQuickTabs = isParent
    ? authorizedNavItems.slice(0, 3)
    : authorizedNavItems.filter(item => ['students', 'attendance', 'grades', 'report_books'].includes(item.id));

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        {/* Top Banner with Catholic & Salesian Identity */}
        <div className="bg-slate-900 text-white px-3 sm:px-4 py-2 border-b border-amber-500/30">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
            {/* Left brand & parish info */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Mobile menu hamburger toggle */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer shrink-0"
                aria-label="Mở menu danh mục"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Cross / Emblem */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-base sm:text-lg shrink-0">
                ✝
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-semibold text-xs sm:text-sm tracking-wider uppercase text-amber-300 truncate">
                    {parishInfo?.parishName || 'Giáo Sở Don Bosco Đà Lạt'}
                  </span>
                  <span className="hidden sm:inline text-xs text-slate-400">|</span>
                  <span className="hidden sm:inline text-xs text-slate-300 font-medium truncate">
                    Niên Khóa {parishInfo?.academicYear || '2026 – 2027'}
                  </span>
                </div>
                <p className="hidden md:block text-[11px] text-slate-300 italic truncate">
                  {parishInfo?.motto ? `"${parishInfo.motto}"` : 'Hệ thống giáo dục dự phòng Don Bosco: "Lý trí – Tôn giáo – Lòng thương mến"'}
                </p>
              </div>
            </div>

            {/* Right Action buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Quick Regular Student ID Search Button */}
              {permissions.canSearchId && (
                <button
                  id="top-quick-id-search-btn"
                  onClick={onOpenIdSearch}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                  title="Tìm kiếm thông thường bằng mã học sinh (DBS-KT-xxx)"
                >
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Tìm Mã HS</span>
                </button>
              )}

              {/* Quick QR Scanner button on top */}
              {permissions.canScanQR && (
                <button
                  id="top-quick-scan-btn"
                  onClick={onOpenQRScanner}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-md shadow-xs transition-colors cursor-pointer"
                  title="Quét thẻ QR điểm danh nhanh"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Quét QR</span>
                </button>
              )}

              {/* Quick Attendance History Button */}
              {onOpenHistoryModal && permissions.allowedTabs.includes('attendance') && (
                <button
                  id="top-quick-history-btn"
                  onClick={onOpenHistoryModal}
                  className="hidden md:inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 bg-blue-800/80 hover:bg-blue-700 text-sky-100 hover:text-white border border-blue-600/40 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                  title="Xem lịch sử điểm danh theo lớp hoặc cá nhân học sinh"
                >
                  <History className="w-3.5 h-3.5 text-sky-300" />
                  <span className="hidden xl:inline">Lịch Sử Điểm Danh</span>
                </button>
              )}

              {/* Special Promotion trigger for Admin / Pastor */}
              {onOpenSpecialPromotion && permissions.canSpecialPromotion && (
                <button
                  id="top-special-promotion-btn"
                  onClick={onOpenSpecialPromotion}
                  className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                  title="Xét duyệt đặc cách lên thẳng lớp trên"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>Đặc Cách</span>
                </button>
              )}

              {/* Backup & Restore Data trigger (Admin / Pastor only) */}
              {onOpenBackupRestore && permissions.canBackupRestore && (
                <button
                  id="top-backup-restore-btn"
                  onClick={onOpenBackupRestore}
                  className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                  title="Sao lưu & Phục hồi dữ liệu hệ thống (JSON)"
                >
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sao Lưu</span>
                </button>
              )}

              {/* Edit Parish & Catechist info button (Admin / Pastor) */}
              {onOpenParishInfoEdit && (currentUser.role === 'admin' || currentUser.role === 'pastor' || currentUser.role === 'catechist_leader') && (
                <button
                  id="top-parish-info-edit-btn"
                  onClick={onOpenParishInfoEdit}
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                  title="Chỉnh sửa thông tin Ban Giáo Lý & Giáo Sở"
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden xl:inline">Thông Tin Giáo Sở</span>
                </button>
              )}

              {/* Role switch dropdown & Logout */}
              <div className="relative">
                <button
                  id="user-role-switch-btn"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
                  title="Tài khoản đang đăng nhập & Đổi người dùng"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-medium max-w-[90px] sm:max-w-[130px] truncate text-[11px] sm:text-xs">{currentUser.name}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                {showUserDropdown && (
                  <div 
                    className="absolute right-0 mt-1 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100"
                    onMouseLeave={() => setShowUserDropdown(false)}
                  >
                    {/* Current Active Account Header */}
                    <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-100 mb-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Đang Đăng Nhập Với Tư Cách
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                        {currentUser.holyName} {currentUser.name}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] font-mono text-slate-500">@{currentUser.username}</span>
                        {getRoleBadge(currentUser.role)}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 italic">
                        {permissions.description}
                      </p>
                    </div>

                    {currentUser.role === 'admin' ? (
                      <>
                        <div className="px-3.5 py-1 text-[11px] text-slate-500 font-semibold flex items-center justify-between">
                          <span>Chuyển Đổi Tài Khoản (Quản Trị):</span>
                          <span className="text-[10px] text-amber-600 font-normal flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Mật khẩu
                          </span>
                        </div>

                        <div className="max-h-48 overflow-y-auto pr-1">
                          {allUsers
                            .filter((u) => u.id !== currentUser.id && u.status === 'active')
                            .map((user) => (
                              <button
                                key={user.id}
                                onClick={() => {
                                  setShowUserDropdown(false);
                                  onRequestSwitchAccount(user);
                                }}
                                className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-xs hover:bg-slate-50 transition-colors group cursor-pointer"
                                title={`Chuyển sang tài khoản ${user.name} (Cần nhập mật khẩu)`}
                              >
                                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 text-xs group-hover:border-amber-400 group-hover:bg-amber-50">
                                  {user.holyName ? user.holyName.charAt(0) : 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-slate-900 font-medium truncate group-hover:text-amber-800">
                                    {user.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <span>@{user.username}</span>
                                    <span>•</span>
                                    <span>{ROLE_PERMISSIONS[user.role]?.name || user.role}</span>
                                  </div>
                                </div>
                                <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0" />
                              </button>
                            ))}
                        </div>
                      </>
                    ) : (
                      <div className="p-3 mx-2 my-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="font-semibold text-slate-700 flex items-center gap-1.5 text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                          <span>Bảo Mật Tài Khoản</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Tính năng chuyển đổi nhanh chỉ dành cho Quản trị viên. Để đổi tài khoản, vui lòng đăng xuất và đăng nhập lại.
                        </p>
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-slate-100 px-3 space-y-1">
                      {onOpenParishInfoEdit && (currentUser.role === 'admin' || currentUser.role === 'pastor' || currentUser.role === 'catechist_leader') && (
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            onOpenParishInfoEdit();
                          }}
                          className="w-full py-1.5 px-2 rounded-lg text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Building2 className="w-3.5 h-3.5 text-amber-700" />
                          <span>Sửa Thông Tin Ban GL & Giáo Sở</span>
                        </button>
                      )}

                      {permissions.canManageAccounts && (
                        <button
                          onClick={() => {
                            setActiveTab('accounts');
                            setShowUserDropdown(false);
                          }}
                          className="w-full py-1.5 px-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <UserCog className="w-3.5 h-3.5 text-slate-500" />
                          <span>Quản Lý Phân Quyền Tài Khoản</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onLogout();
                        }}
                        className="w-full py-1.5 px-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-600" />
                        <span>Đăng Xuất Khỏi Hệ Thống</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Quick Logout Button on Top Bar */}
              <button
                id="top-quick-logout-btn"
                onClick={onLogout}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-rose-950/80 hover:text-rose-200 text-slate-300 border border-slate-700 hover:border-rose-700 text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer"
                title="Đăng xuất khỏi phiên làm việc hiện tại"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden xl:inline">Đăng Xuất</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop horizontal navigation tabs (Hidden on mobile phones, shown on md and above) */}
        <div className="hidden md:block max-w-7xl mx-auto px-4 overflow-x-auto scrollbar-none">
          <nav className="flex space-x-1 py-1 min-w-max">
            {authorizedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-amber-100/70 text-amber-950 font-bold border-b-2 border-amber-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-700' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Mobile current active section indicator bar */}
        <div className="md:hidden bg-slate-50 border-t border-slate-200 px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mục hiện tại:</span>
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
              {allNavItems.find(i => i.id === activeTab)?.label || activeTab}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-0.5 cursor-pointer"
          >
            <span>Tất cả mục</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* Mobile Slide-over Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer container */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-amber-500/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-base">
                  ✝
                </div>
                <div>
                  <div className="font-bold text-xs uppercase tracking-wider text-amber-300">
                    {parishInfo?.parishName || 'Don Bosco Đà Lạt'}
                  </div>
                  <div className="text-[10px] text-slate-300">
                    Niên Khóa {parishInfo?.academicYear || '2026 – 2027'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Profile Card in Drawer */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200">
              <div className="text-xs font-bold text-slate-900 truncate">
                {currentUser.holyName} {currentUser.name}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                @{currentUser.username}
              </div>
              <div className="mt-1.5">
                {getRoleBadge(currentUser.role)}
              </div>
            </div>

            {/* Quick Actions in Drawer */}
            <div className="p-3 grid grid-cols-2 gap-2 border-b border-slate-100 bg-white">
              {permissions.canSearchId && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenIdSearch();
                  }}
                  className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold flex flex-col items-center justify-center gap-1"
                >
                  <Search className="w-4 h-4 text-amber-700" />
                  <span>Tra Cứu Mã HS</span>
                </button>
              )}

              {permissions.canScanQR && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenQRScanner();
                  }}
                  className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold flex flex-col items-center justify-center gap-1"
                >
                  <QrCode className="w-4 h-4 text-emerald-700" />
                  <span>Quét Mã QR</span>
                </button>
              )}
            </div>

            {/* Navigation Items List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1">
                Danh Mục Tính Năng
              </div>
              {authorizedNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-100 text-amber-950 font-bold shadow-2xs border-l-4 border-amber-600'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-700' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-amber-600" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-1.5">
              {onOpenParishInfoEdit && (currentUser.role === 'admin' || currentUser.role === 'pastor' || currentUser.role === 'catechist_leader') && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenParishInfoEdit();
                  }}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-amber-900 bg-white border border-amber-200 flex items-center justify-center gap-2"
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Sửa Thông Tin Giáo Sở</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span>Đăng Xuất Khỏi Hệ Thống</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Fixed thumb-reach for smartphones) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1 flex items-center justify-around safe-area-bottom">
        {bottomQuickTabs.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg text-[10px] transition-colors cursor-pointer ${
                isActive
                  ? 'text-amber-800 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1 rounded-full ${isActive ? 'bg-amber-100 text-amber-800' : ''}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="truncate max-w-[68px] mt-0.5">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}

        {/* Central Prominent QR Scanner Button on Mobile */}
        {permissions.canScanQR && (
          <button
            type="button"
            id="mobile-bottom-quick-scan-btn"
            onClick={onOpenQRScanner}
            className="flex flex-col items-center justify-center -mt-5 p-1 group cursor-pointer shrink-0"
            title="Quét thẻ QR điểm danh tức thì"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-amber-400/60 group-active:scale-95 transition-transform">
              <QrCode className="w-6 h-6 stroke-[2.3]" />
            </div>
            <span className="text-[10px] font-extrabold text-amber-900 mt-0.5">Quét QR</span>
          </button>
        )}

        {bottomQuickTabs.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg text-[10px] transition-colors cursor-pointer ${
                isActive
                  ? 'text-amber-800 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1 rounded-full ${isActive ? 'bg-amber-100 text-amber-800' : ''}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="truncate max-w-[68px] mt-0.5">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}

        {/* More / Menu Button to open drawer */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          <div className="p-1 rounded-full hover:bg-slate-100">
            <Menu className="w-4 h-4" />
          </div>
          <span className="truncate max-w-[68px] mt-0.5">Thêm</span>
        </button>
      </nav>
    </>
  );
};
