import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  Church, 
  BookOpen, 
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { UserAccount, Role } from '../types';

interface LoginScreenProps {
  allUsers: UserAccount[];
  onLogin: (user: UserAccount) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ allUsers, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

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
      const user = allUsers.find(
        u => u.username.toLowerCase() === cleanUsername || 
             u.email.toLowerCase() === cleanUsername || 
             u.phone.replace(/\s+/g, '') === cleanUsername.replace(/\s+/g, '')
      );

      if (!user) {
        setIsLoading(false);
        setErrorMessage('Tên đăng nhập không tồn tại trong hệ thống.');
        return;
      }

      if (user.status === 'locked') {
        setIsLoading(false);
        setErrorMessage('Tài khoản này đã bị tạm khóa. Vui lòng liên hệ Cha Quản Sở hoặc Ban Quản Trị.');
        return;
      }

      // Check password (default password if undefined is Password123!)
      const expectedPassword = user.password || 'Password123!';
      if (cleanPassword !== expectedPassword) {
        setIsLoading(false);
        setErrorMessage('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
        return;
      }

      // Successful login
      setIsLoading(false);
      onLogin(user);
    }, 250);
  };

  const handleSelectQuickAccount = (user: UserAccount) => {
    setUsername(user.username);
    setPassword(user.password || 'Password123!');
    setErrorMessage(null);
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'admin':
        return { title: 'Quản Trị Viên (Admin)', badge: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'pastor':
        return { title: 'Cha Quản Sở', badge: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'catechist_leader':
        return { title: 'Trưởng Ban Giáo Lý', badge: 'bg-blue-100 text-blue-900 border-blue-200' };
      case 'catechist':
        return { title: 'Giáo Lý Viên Phụ Trách', badge: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
      case 'trainee':
        return { title: 'Dự Trưởng / Huấn Luyện', badge: 'bg-purple-100 text-purple-900 border-purple-200' };
      case 'parent':
        return { title: 'Phụ Huynh / Học Viên', badge: 'bg-stone-100 text-stone-800 border-stone-200' };
    }
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

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-6">
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
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên Đăng Nhập / Email / Số Điện Thoại
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="vd: admin_hoang hoặc glv_thimai"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Mật Khẩu Đăng Nhập
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Mặc định: <code className="text-amber-700 font-bold font-mono">Password123!</code>
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Nhập mật khẩu..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
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

            {/* Quick Demo Helper Section */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Chọn nhanh tài khoản mẫu:</span>
                </span>
                <span className="text-[10px] text-slate-400">Click để điền thông tin</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {allUsers.slice(0, 6).map((u) => {
                  const roleInfo = getRoleLabel(u.role);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectQuickAccount(u)}
                      className="text-left p-2 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all text-xs group"
                    >
                      <div className="font-semibold text-slate-900 group-hover:text-amber-900 truncate">
                        {u.name}
                      </div>
                      <div className="flex items-center justify-between mt-0.5 text-[10px] text-slate-500">
                        <span className="font-mono font-medium">{u.username}</span>
                        <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${roleInfo.badge}`}>
                          {u.role === 'admin' ? 'Admin' : u.role === 'pastor' ? 'Cha Xứ' : u.role === 'catechist_leader' ? 'Trưởng' : 'GLV'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-2xl mx-auto text-center text-xs text-slate-400 space-y-1">
        <p>Hệ thống Quản Lý & Điểm Danh Giáo Lý Don Bosco Đà Lạt • Phiên bản Bảo Mật Phân Quyền</p>
        <p className="text-[11px] text-slate-500">Chỉ dành cho Quý Cha, Quý Tu Sĩ, Ban Giáo Lý & Quý Phụ Huynh được cấp quyền truy cập.</p>
      </div>
    </div>
  );
};
