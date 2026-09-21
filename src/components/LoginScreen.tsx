import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  Church, 
  ArrowRight,
  Search,
  Calendar,
  PhoneCall,
  Sparkles
} from 'lucide-react';
import { UserAccount, Role, Student, ClassRoom, Catechist, CalendarEvent } from '../types';
import { getDefaultPasswordForRole } from '../data/mockData';
import { PublicStudentLookupModal } from './PublicStudentLookupModal';
import { PublicAcademicYearModal } from './PublicAcademicYearModal';
import { PublicOfficeContactModal } from './PublicOfficeContactModal';

interface LoginScreenProps {
  allUsers: UserAccount[];
  students?: Student[];
  classes?: ClassRoom[];
  catechists?: Catechist[];
  events?: CalendarEvent[];
  onLogin: (user: UserAccount) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  allUsers, 
  students = [], 
  classes = [],
  catechists = [],
  events = [],
  onLogin 
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Modals for public access without login
  const [isStudentLookupOpen, setIsStudentLookupOpen] = useState(false);
  const [isAcademicYearOpen, setIsAcademicYearOpen] = useState(false);
  const [isOfficeContactOpen, setIsOfficeContactOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMessage('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setIsLoading(true);

    // Simulate authenticating against registered users
    setTimeout(() => {
      // 1. First look up in existing users by username, studentId, email, or phone
      let user = allUsers.find(
        u => u.username.toLowerCase() === cleanUsername || 
             (u.studentId && u.studentId.toLowerCase() === cleanUsername) ||
             u.email.toLowerCase() === cleanUsername || 
             u.phone.replace(/\s+/g, '') === cleanUsername.replace(/\s+/g, '')
      );

      // 2. If not found, check if input matches a Student ID (allowing ANY parent to log in directly)
      if (!user && students.length > 0) {
        const cleanNorm = cleanUsername.replace(/[-_\s]/g, '');
        const matchedStudent = students.find(s => {
          const sIdLower = s.id.toLowerCase();
          const sIdNorm = sIdLower.replace(/[-_\s]/g, '');
          return sIdLower === cleanUsername ||
                 sIdNorm === cleanNorm ||
                 sIdLower.endsWith(`-${cleanUsername}`) ||
                 sIdLower.endsWith(`-${cleanNorm}`);
        });

        if (matchedStudent) {
          // Check if parent account exists in allUsers for this student
          const existing = allUsers.find(u => 
            u.role === 'parent' && 
            (u.studentId?.toLowerCase() === matchedStudent.id.toLowerCase() || 
             u.username.toLowerCase() === matchedStudent.id.toLowerCase())
          );

          if (existing) {
            user = existing;
          } else {
            // Auto-create/resolve parent account with student ID as username and password
            user = {
              id: `usr-parent-${matchedStudent.id.toLowerCase()}`,
              username: matchedStudent.id,
              password: matchedStudent.id,
              name: matchedStudent.parentName 
                ? `${matchedStudent.parentName} (PH em ${matchedStudent.fullName})`
                : `Phụ huynh em ${matchedStudent.fullName}`,
              holyName: matchedStudent.holyName || 'Phụ Huynh',
              email: matchedStudent.parentEmail || `${matchedStudent.id.toLowerCase()}@phuhuynh.donboscodalat.vn`,
              phone: matchedStudent.parentPhone || matchedStudent.phone || '',
              role: 'parent',
              studentId: matchedStudent.id,
              status: 'active',
              lastLogin: new Date().toISOString().replace('T', ' ').slice(0, 16),
              createdAt: '2026-08-20',
            };
          }
        }
      }

      if (!user) {
        setIsLoading(false);
        setErrorMessage('Tên đăng nhập hoặc Mã học sinh không tồn tại trong hệ thống.');
        return;
      }

      if (user.status === 'locked') {
        setIsLoading(false);
        setErrorMessage('Tài khoản này đã bị tạm khóa. Vui lòng liên hệ Cha Quản Sở hoặc Ban Quản Trị.');
        return;
      }

      // Check password:
      // Default passwords:
      // - admin, pastor, catechist_leader, secretary: 'Tngsdbdl26@'
      // - catechist, trainee: username
      // - parent: studentId || username
      const defaultRolePassword = getDefaultPasswordForRole(user.role, user.username, user.studentId);
      const expectedPassword = user.password || defaultRolePassword;

      const isPasswordMatch = 
        cleanPassword === expectedPassword ||
        cleanPassword === defaultRolePassword ||
        (user.role === 'parent' && (
          cleanPassword.toLowerCase() === expectedPassword.toLowerCase() ||
          (user.studentId && cleanPassword.toLowerCase() === user.studentId.toLowerCase()) ||
          cleanPassword.toLowerCase() === user.username.toLowerCase()
        )) ||
        (['catechist', 'trainee'].includes(user.role) && cleanPassword.toLowerCase() === user.username.toLowerCase());

      if (!isPasswordMatch) {
        setIsLoading(false);
        setErrorMessage('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
        return;
      }

      // Successful login
      setIsLoading(false);
      onLogin(user);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold tracking-wide uppercase shadow-sm">
          <Church className="w-4 h-4 text-amber-400" />
          <span>Giáo Sở Don Bosco Đà Lạt • Niên Khóa 2026 – 2027</span>
        </div>
      </div>

      {/* Public Quick Access Bar (No login required) */}
      <div className="max-w-xl mx-auto w-full mt-2 mb-1 px-2">
        <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-slate-700/80 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="text-[11px] font-bold text-amber-300 px-1.5 py-0.5 flex items-center gap-1.5 uppercase tracking-wider shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Tiện ích công khai:</span>
          </div>

          <div className="grid grid-cols-3 gap-2 flex-1">
            <button
              type="button"
              onClick={() => setIsStudentLookupOpen(true)}
              className="px-2.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 hover:border-amber-400 text-amber-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center shadow-xs"
            >
              <Search className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate font-bold">Tra Cứu Học Sinh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAcademicYearOpen(true)}
              className="px-2.5 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/50 hover:border-indigo-400 text-indigo-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span className="truncate">Niên Khóa 26–27</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOfficeContactOpen(true)}
              className="px-2.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 hover:border-emerald-400 text-emerald-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center shadow-xs"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="truncate">Văn Phòng Giáo Lý</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-4">
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 text-white p-6 text-center relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-amber-300 font-bold text-2xl shadow-inner mb-3">
              ✝
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Đăng Nhập Hệ Thống Giáo Lý
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              "Lý trí – Tôn giáo – Lòng thương mến" (Thánh Gioan Don Bosco)
            </p>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8 space-y-5">
            {/* System Info Banner */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 flex items-start gap-2.5 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed flex-1">
                <span className="font-bold text-slate-900">Bảo Mật Phân Quyền:</span>
                <p className="text-slate-600 mt-0.5">
                  Vui lòng nhập chính xác tên đăng nhập (hoặc Mã học sinh) và mật khẩu được cấp để truy cập đúng quyền hạn.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <form id="system-login-form" onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              {/* Username Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-username-input" className="block text-xs font-semibold text-slate-700">
                    Tên Đăng Nhập / Mã Học Sinh
                  </label>
                  <button
                    id="btn-public-lookup-student"
                    type="button"
                    onClick={() => setIsStudentLookupOpen(true)}
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Search className="w-3 h-3 text-amber-600" />
                    <span>Tra cứu Mã HS</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="login-username-input"
                    name="login-username"
                    type="text"
                    required
                    autoComplete="off"
                    spellCheck="false"
                    placeholder="Nhập tên đăng nhập hoặc mã học sinh..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="login-password-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật Khẩu Đăng Nhập
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password-input"
                    name="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    spellCheck="false"
                    placeholder="Nhập mật khẩu..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono"
                  />
                  <button
                    id="btn-toggle-login-password"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Ghi nhớ phiên đăng nhập</span>
                </label>
                <span className="text-slate-400 text-[11px] italic">Bảo mật phân quyền</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <span>Đang xác thực bảo mật...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Đăng Nhập Vào Hệ Thống</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-2xl mx-auto text-center text-xs text-slate-400 space-y-1">
        <p>Hệ thống Quản Lý & Điểm Danh Giáo Lý Don Bosco Đà Lạt • Phiên bản Bảo Mật Phân Quyền</p>
        <p className="text-[11px] text-slate-500">Chỉ dành cho Quý Cha, Quý Tu Sĩ, Ban Giáo Lý & Quý Phụ Huynh được cấp quyền truy cập.</p>
      </div>

      {/* Public Modal Overlays (Accessible without logging in) */}
      <PublicStudentLookupModal
        isOpen={isStudentLookupOpen}
        onClose={() => setIsStudentLookupOpen(false)}
        students={students}
        classes={classes}
        catechists={catechists}
        onSelectForLogin={(studentId) => {
          setUsername(studentId);
          setPassword(studentId);
        }}
      />

      <PublicAcademicYearModal
        isOpen={isAcademicYearOpen}
        onClose={() => setIsAcademicYearOpen(false)}
        events={events}
      />

      <PublicOfficeContactModal
        isOpen={isOfficeContactOpen}
        onClose={() => setIsOfficeContactOpen(false)}
      />
    </div>
  );
};
