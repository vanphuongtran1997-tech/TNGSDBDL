import React, { useState, useMemo, useEffect } from 'react';
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
  Sparkles,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { UserAccount, Role, Student, ClassRoom, Catechist, CalendarEvent, ParishInfo } from '../types';
import { getDefaultPasswordForRole, DEFAULT_PARISH_INFO } from '../data/mockData';
import { 
  getRateLimitStatus, 
  recordFailedLoginAttempt, 
  resetFailedLoginAttempts, 
  sanitizeText 
} from '../utils/security';
import { PublicStudentLookupModal } from './PublicStudentLookupModal';
import { PublicAcademicYearModal } from './PublicAcademicYearModal';
import { PublicOfficeContactModal } from './PublicOfficeContactModal';

interface LoginScreenProps {
  allUsers: UserAccount[];
  students?: Student[];
  classes?: ClassRoom[];
  catechists?: Catechist[];
  events?: CalendarEvent[];
  parishInfo?: ParishInfo;
  onLogin: (user: UserAccount) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  allUsers, 
  students = [], 
  classes = [],
  catechists = [],
  events = [],
  parishInfo = DEFAULT_PARISH_INFO,
  onLogin 
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Rate-limiting & Brute Force Protection State
  const [rateLimit, setRateLimit] = useState(() => getRateLimitStatus());

  useEffect(() => {
    if (rateLimit.isLocked && rateLimit.remainingSeconds > 0) {
      const interval = setInterval(() => {
        const nextStatus = getRateLimitStatus();
        setRateLimit(nextStatus);
        if (!nextStatus.isLocked) {
          clearInterval(interval);
          setErrorMessage(null);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [rateLimit.isLocked, rateLimit.remainingSeconds]);

  // Modals for public access without login
  const [isStudentLookupOpen, setIsStudentLookupOpen] = useState(false);
  const [isAcademicYearOpen, setIsAcademicYearOpen] = useState(false);
  const [isOfficeContactOpen, setIsOfficeContactOpen] = useState(false);

  // Suggestions strictly restricted to Administrator (admin) and Pastor (pastor) accounts only
  const adminAndPastorUsers = useMemo(() => {
    return allUsers.filter(u => (u.role === 'admin' || u.role === 'pastor') && u.status === 'active');
  }, [allUsers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Guard: rate limit lockout
    if (rateLimit.isLocked) {
      setErrorMessage(`Hệ thống đang tạm khóa do nhập sai nhiều lần. Vui lòng chờ ${rateLimit.remainingSeconds} giây.`);
      return;
    }

    const cleanUsername = sanitizeText(username, 60).toLowerCase();
    const cleanPassword = sanitizeText(password, 60);

    if (!cleanUsername || !cleanPassword) {
      setErrorMessage('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setIsLoading(true);

    // Simulate authenticating against registered users with defense
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
        const result = recordFailedLoginAttempt();
        setRateLimit(result);
        if (result.isLocked) {
          setErrorMessage(`Bạn đã nhập sai 5 lần. Tạm khóa hệ thống ${result.remainingSeconds} giây.`);
        } else {
          setErrorMessage(`Tài khoản hoặc mã học sinh không tồn tại. (Còn ${result.attemptsLeft} lần thử)`);
        }
        return;
      }

      if (user.status === 'locked') {
        setIsLoading(false);
        setErrorMessage('Tài khoản này đã bị tạm khóa bởi Ban Quản Trị hoặc Cha Quản Sở.');
        return;
      }

      // Check password
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
        const result = recordFailedLoginAttempt();
        setRateLimit(result);
        if (result.isLocked) {
          setErrorMessage(`Đăng nhập thất bại quá 5 lần. Tạm dừng xác thực trong ${result.remainingSeconds} giây để bảo mật.`);
        } else {
          setErrorMessage(`Mật khẩu không chính xác. Còn ${result.attemptsLeft} lần thử trước khi tạm khóa.`);
        }
        return;
      }

      // Successful login -> Reset failed attempts
      resetFailedLoginAttempts();
      setRateLimit({ isLocked: false, remainingSeconds: 0, attempts: 0 });
      setIsLoading(false);
      onLogin(user);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold tracking-wide uppercase shadow-sm">
          <Church className="w-4 h-4 text-amber-400" />
          <span>{parishInfo.parishName} • Niên Khóa {parishInfo.academicYear}</span>
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

            {rateLimit.isLocked && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-3 shadow-xs animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 text-rose-700">
                  <Clock className="w-4 h-4 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-rose-900">Tạm thời giới hạn tốc độ đăng nhập</div>
                  <div className="text-[11px] text-rose-700 mt-0.5">
                    Đã nhập sai quá nhiều lần. Vui lòng đợi <strong>{rateLimit.remainingSeconds} giây</strong> để thử lại.
                  </div>
                </div>
              </div>
            )}

            {errorMessage && !rateLimit.isLocked && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <form id="system-login-form" onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              {/* Username Input */}
              <div>
                <label htmlFor="login-username-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên Đăng Nhập / Tài Khoản
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="login-username-input"
                    name="login-username"
                    type="text"
                    required
                    disabled={rateLimit.isLocked || isLoading}
                    maxLength={60}
                    autoComplete="off"
                    spellCheck="false"
                    placeholder="Nhập tên đăng nhập hoặc mã học sinh..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono disabled:opacity-50 disabled:bg-slate-100"
                    autoFocus
                  />
                </div>

                {/* Account suggestions strictly restricted to Admin and Pastor */}
                {adminAndPastorUsers.length > 0 && (
                  <div className="mt-2.5 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        <span>Gợi ý tài khoản quản trị & cha sở:</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {adminAndPastorUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setUsername(u.username);
                            setPassword(u.password || 'Tngsdbdl26@');
                            setErrorMessage(null);
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer shadow-2xs ${
                            u.role === 'pastor'
                              ? 'bg-amber-50 hover:bg-amber-100/80 text-amber-900 border-amber-300 hover:border-amber-400'
                              : 'bg-indigo-50 hover:bg-indigo-100/80 text-indigo-950 border-indigo-200 hover:border-indigo-300'
                          }`}
                          title={`Chọn nhanh tài khoản ${u.name}`}
                        >
                          <span>{u.role === 'pastor' ? '✝️ Cha Sở' : '🛡️ Quản trị'}</span>
                          <span className="font-mono text-slate-600 text-[10px]">@{u.username}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 italic">
                      * Các chức vụ khác (Giáo lý viên, Dự trưởng, Phụ huynh...) vui lòng tự nhập tài khoản và mật khẩu được cấp.
                    </p>
                  </div>
                )}
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
                    disabled={rateLimit.isLocked || isLoading}
                    maxLength={60}
                    autoComplete="new-password"
                    spellCheck="false"
                    placeholder="Nhập mật khẩu..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono disabled:opacity-50 disabled:bg-slate-100"
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
                disabled={isLoading || rateLimit.isLocked}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <span>Đang xác thực bảo mật...</span>
                ) : rateLimit.isLocked ? (
                  <span>Tạm khóa ({rateLimit.remainingSeconds}s)...</span>
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
      />

      <PublicAcademicYearModal
        isOpen={isAcademicYearOpen}
        onClose={() => setIsAcademicYearOpen(false)}
        events={events}
        parishInfo={parishInfo}
      />

      <PublicOfficeContactModal
        isOpen={isOfficeContactOpen}
        onClose={() => setIsOfficeContactOpen(false)}
        parishInfo={parishInfo}
      />
    </div>
  );
};
