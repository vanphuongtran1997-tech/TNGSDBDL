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
  Crown
} from 'lucide-react';
import { Role, UserAccount } from '../types';

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
  onSwitchUser: (user: UserAccount) => void;
  onOpenQRScanner: () => void;
  onOpenIdSearch: () => void;
  onOpenBackupRestore?: () => void;
  onOpenSpecialPromotion?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  allUsers,
  onSwitchUser,
  onOpenQRScanner,
  onOpenIdSearch,
  onOpenBackupRestore,
  onOpenSpecialPromotion,
}) => {
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-900 border border-rose-300 inline-flex items-center gap-1">🛡️ Quản Trị Viên (Admin)</span>;
      case 'pastor':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-900 border border-amber-300">Cha Quản Sở (Toàn quyền)</span>;
      case 'catechist_leader':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-900 border border-blue-300">Trưởng Ban Giáo Lý</span>;
      case 'catechist':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">Giáo Lý Viên Phụ Trách</span>;
      case 'trainee':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-900 border border-purple-300">Dự Trưởng / Huấn Luyện</span>;
      case 'parent':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-stone-100 text-stone-800 border border-stone-300">Phụ Huynh / Thiếu Nhi</span>;
    }
  };

  const navItems = [
    { id: 'students', label: 'Học Sinh & Thẻ QR', icon: Users },
    { id: 'attendance', label: 'Điểm Danh & Chuyên Cần', icon: QrCode },
    { id: 'grades', label: 'Điểm Số & Hạnh Kiểm', icon: Award },
    { id: 'report_books', label: 'Sổ Liên Lạc', icon: BookOpen },
    { id: 'transfer', label: 'Chuyển Lớp', icon: ArrowRightLeft },
    { id: 'tuition', label: 'Học Phí & Quỹ', icon: CreditCard },
    { id: 'catechists', label: 'Giáo Lý Viên & Đánh Giá', icon: GraduationCap },
    { id: 'calendar', label: 'Niên Lịch 2026-2027', icon: Calendar },
    { id: 'reports', label: 'Báo Cáo & Khen Thưởng', icon: BarChart3 },
    { id: 'notifications', label: 'Nhắc Nhở & Email', icon: Mail },
    { id: 'parent_portal', label: 'Tra Cứu Phụ Huynh', icon: Search },
    { id: 'accounts', label: 'Tài Khoản & Phân Quyền', icon: UserCog },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner with Catholic & Salesian Identity */}
      <div className="bg-slate-900 text-white px-4 py-2 border-b border-amber-500/30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Cross / Emblemn */}
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-lg">
              ✝
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-wider uppercase text-amber-300">
                  Giáo Sở Don Bosco Đà Lạt
                </span>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-300 font-medium">Ban Giáo Lý Niên Khóa 2026 – 2027</span>
              </div>
              <p className="text-[11px] text-slate-300 italic">
                Hệ thống giáo dục dự phòng Don Bosco: "Lý trí – Tôn giáo – Lòng thương mến"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Regular Student ID Search Button */}
            <button
              id="top-quick-id-search-btn"
              onClick={onOpenIdSearch}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 text-xs font-semibold rounded-md shadow-xs transition-colors"
              title="Tìm kiếm thông thường bằng mã học sinh (DBS-KT-xxx)"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Tìm Mã HS</span>
            </button>

            {/* Quick QR Scanner button on top */}
            <button
              id="top-quick-scan-btn"
              onClick={onOpenQRScanner}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-md shadow-xs transition-colors"
              title="Quét thẻ QR điểm danh nhanh"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quét QR</span>
            </button>

            {/* Special Promotion trigger for Admin / Pastor */}
            {onOpenSpecialPromotion && (currentUser.role === 'admin' || currentUser.role === 'pastor') && (
              <button
                id="top-special-promotion-btn"
                onClick={onOpenSpecialPromotion}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700 text-xs font-semibold rounded-md shadow-xs transition-colors"
                title="Xét duyệt đặc cách lên thẳng lớp trên (Quyền Cha Quản Sở & Admin)"
              >
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden md:inline">Đặc Cách</span>
              </button>
            )}

            {/* Backup & Restore Data trigger */}
            {onOpenBackupRestore && (currentUser.role === 'admin' || currentUser.role === 'pastor') && (
              <button
                id="top-backup-restore-btn"
                onClick={onOpenBackupRestore}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-md shadow-xs transition-colors"
                title="Sao lưu & Phục hồi dữ liệu hệ thống (JSON)"
              >
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">Sao Lưu</span>
              </button>
            )}

            {/* Role switch dropdown */}
            <div className="relative">
              <button
                id="user-role-switch-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium max-w-[150px] truncate">{currentUser.name}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showUserDropdown && (
                <div 
                  className="absolute right-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 text-slate-800"
                  onMouseLeave={() => setShowUserDropdown(false)}
                >
                  <div className="px-3 py-1.5 border-b border-slate-100 text-xs text-slate-600 font-semibold uppercase tracking-wider">
                    Chuyển Đổi Tài Khoản / Phân Quyền
                  </div>
                  {allUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        onSwitchUser(user);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-start gap-2.5 text-xs hover:bg-slate-50 transition-colors ${
                        currentUser.id === user.id ? 'bg-amber-50 font-medium' : ''
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 text-xs">
                        {user.holyName ? user.holyName.charAt(0) : 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-900 font-medium truncate">{user.name}</div>
                        <div className="mt-0.5">{getRoleBadge(user.role)}</div>
                      </div>
                    </button>
                  ))}
                  <div className="mt-1 pt-1.5 border-t border-slate-100 px-2">
                    <button
                      onClick={() => {
                        setActiveTab('accounts');
                        setShowUserDropdown(false);
                      }}
                      className="w-full py-1.5 px-2.5 rounded text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <UserCog className="w-3.5 h-3.5" />
                      <span>Trang Quản Lý Tài Khoản</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation menu */}
      <div className="max-w-7xl mx-auto px-4 overflow-x-auto scrollbar-none">
        <nav className="flex space-x-1 py-1 min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-amber-100/70 text-amber-950 font-semibold border-b-2 border-amber-600'
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
