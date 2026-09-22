import React from 'react';
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
  Church
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
  onOpenBackupRestore,
  onOpenSpecialPromotion,
  onOpenParishInfoEdit,
  parishInfo,
}) => {
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);

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

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner with Catholic & Salesian Identity */}
      <div className="bg-slate-900 text-white px-4 py-2 border-b border-amber-500/30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Cross / Emblem */}
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-lg">
              ✝
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-wider uppercase text-amber-300">
                  {parishInfo?.parishName || 'Giáo Sở Don Bosco Đà Lạt'}
                </span>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-300 font-medium">Ban Giáo Lý Niên Khóa {parishInfo?.academicYear || '2026 – 2027'}</span>
              </div>
              <p className="text-[11px] text-slate-300 italic">
                {parishInfo?.motto ? `"${parishInfo.motto}"` : 'Hệ thống giáo dục dự phòng Don Bosco: "Lý trí – Tôn giáo – Lòng thương mến"'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Edit Parish & Catechist info button (Admin / Pastor) */}
            {onOpenParishInfoEdit && (currentUser.role === 'admin' || currentUser.role === 'pastor' || currentUser.role === 'catechist_leader') && (
              <button
                id="top-parish-info-edit-btn"
                onClick={onOpenParishInfoEdit}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                title="Chỉnh sửa thông tin Ban Giáo Lý & Giáo Sở"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Thông Tin Giáo Sở</span>
              </button>
            )}

            {/* Quick Regular Student ID Search Button (Only for authorized roles) */}
            {permissions.canSearchId && (
              <button
                id="top-quick-id-search-btn"
                onClick={onOpenIdSearch}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                title="Tìm kiếm thông thường bằng mã học sinh (DBS-KT-xxx)"
              >
                <Search className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Tìm Mã HS</span>
              </button>
            )}

            {/* Quick QR Scanner button on top (Only for authorized roles) */}
            {permissions.canScanQR && (
              <button
                id="top-quick-scan-btn"
                onClick={onOpenQRScanner}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-md shadow-xs transition-colors cursor-pointer"
                title="Quét thẻ QR điểm danh nhanh"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quét QR</span>
              </button>
            )}

            {/* Special Promotion trigger for Admin / Pastor */}
            {onOpenSpecialPromotion && permissions.canSpecialPromotion && (
              <button
                id="top-special-promotion-btn"
                onClick={onOpenSpecialPromotion}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                title="Xét duyệt đặc cách lên thẳng lớp trên (Quyền Cha Quản Sở & Admin)"
              >
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden md:inline">Đặc Cách</span>
              </button>
            )}

            {/* Backup & Restore Data trigger (Admin / Pastor only) */}
            {onOpenBackupRestore && permissions.canBackupRestore && (
              <button
                id="top-backup-restore-btn"
                onClick={onOpenBackupRestore}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                title="Sao lưu & Phục hồi dữ liệu hệ thống (JSON)"
              >
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">Sao Lưu</span>
              </button>
            )}

            {/* Role switch dropdown & Logout */}
            <div className="relative">
              <button
                id="user-role-switch-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
                title="Tài khoản đang đăng nhập & Đổi người dùng"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium max-w-[140px] truncate">{currentUser.name}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showUserDropdown && (
                <div 
                  className="absolute right-0 mt-1 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800"
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

                  {isParent ? (
                    <div className="p-3 mx-2 my-1.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs space-y-1">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                        <span>Chế Độ Phụ Huynh Bảo Mật</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Tài khoản chỉ xem thông tin học tập của con em mình và niên lịch sinh hoạt chung của Giáo Sở Don Bosco.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="px-3.5 py-1 text-[11px] text-slate-500 font-semibold flex items-center justify-between">
                        <span>Chuyển Sang Quản Trị / Cha Sở:</span>
                        <span className="text-[10px] text-amber-600 font-normal flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Yêu cầu mật khẩu
                        </span>
                      </div>

                      <div className="max-h-48 overflow-y-auto pr-1">
                        {allUsers
                          .filter((u) => u.id !== currentUser.id && (u.role === 'admin' || u.role === 'pastor'))
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
                        {allUsers.filter((u) => u.id !== currentUser.id && (u.role === 'admin' || u.role === 'pastor')).length === 0 && (
                          <div className="px-3.5 py-2 text-[11px] text-slate-400 italic">
                            Không có tài khoản Quản trị viên hoặc Cha Quản sở khác.
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="mt-2 pt-2 border-t border-slate-100 px-3 space-y-1">
                    {/* Only show Parish Info if admin/pastor */}
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

                    {/* Only show Accounts link if user has permission */}
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
              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-rose-950/80 hover:text-rose-200 text-slate-300 border border-slate-700 hover:border-rose-700 text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer"
              title="Đăng xuất khỏi phiên làm việc hiện tại"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden lg:inline">Đăng Xuất</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main navigation menu - ONLY SHOW AUTHORIZED TABS */}
      <div className="max-w-7xl mx-auto px-4 overflow-x-auto scrollbar-none">
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
                    ? 'bg-amber-100/70 text-amber-950 font-bold border-b-2 border-amber-600'
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
    </header>
  );
};
