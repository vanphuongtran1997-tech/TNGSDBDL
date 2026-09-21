import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  UserCheck, 
  ArrowRightLeft,
  LogOut
} from 'lucide-react';
import { UserAccount, Role } from '../types';
import { getDefaultPasswordForRole } from '../data/mockData';

interface SwitchAccountModalProps {
  currentUser: UserAccount;
  allUsers: UserAccount[];
  targetUser?: UserAccount | null;
  onConfirmSwitch: (user: UserAccount) => void;
  onLogoutToLoginScreen: () => void;
  onClose: () => void;
}

export const SwitchAccountModal: React.FC<SwitchAccountModalProps> = ({
  currentUser,
  allUsers,
  targetUser: initialTargetUser,
  onConfirmSwitch,
  onLogoutToLoginScreen,
  onClose,
}) => {
  const [selectedUser, setSelectedUser] = useState<UserAccount>(() => {
    if (initialTargetUser && initialTargetUser.id !== currentUser.id) {
      return initialTargetUser;
    }
    const other = allUsers.find(u => u.id !== currentUser.id && u.status === 'active');
    return other || allUsers[0];
  });

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-900 border border-rose-300">🛡️ Quản Trị Viên</span>;
      case 'pastor':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-900 border border-amber-300">Cha Quản Sở</span>;
      case 'catechist_leader':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-900 border border-blue-300">Trưởng Ban Giáo Lý</span>;
      case 'secretary':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300">Thư Ký Ban Giáo Lý</span>;
      case 'catechist':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">Giáo Lý Viên</span>;
      case 'trainee':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-900 border border-purple-300">Dự Trưởng</span>;
      case 'parent':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-stone-100 text-stone-800 border border-stone-300">Phụ Huynh</span>;
    }
  };

  const handleSwitchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedUser.status === 'locked') {
      setErrorMessage('Tài khoản này đang bị khóa, không thể chuyển đổi.');
      return;
    }

    const defaultPass = getDefaultPasswordForRole(selectedUser.role, selectedUser.username, selectedUser.studentId);
    const expectedPassword = selectedUser.password || defaultPass;

    const isMatch = 
      password === expectedPassword ||
      password === defaultPass ||
      (selectedUser.role === 'parent' && (
        password.trim().toLowerCase() === expectedPassword.toLowerCase() ||
        (selectedUser.studentId && password.trim().toLowerCase() === selectedUser.studentId.toLowerCase()) ||
        password.trim().toLowerCase() === selectedUser.username.toLowerCase()
      )) ||
      (['catechist', 'trainee'].includes(selectedUser.role) && password.trim().toLowerCase() === selectedUser.username.toLowerCase());

    if (!isMatch) {
      setErrorMessage(
        selectedUser.role === 'parent'
          ? `Mật khẩu không chính xác. Mật khẩu mặc định của phụ huynh là Mã Học Sinh (${selectedUser.studentId || selectedUser.username}).`
          : 'Mật khẩu của tài khoản được chọn không chính xác.'
      );
      return;
    }

    onConfirmSwitch(selectedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">Chuyển Đổi Tài Khoản Có Xác Thực</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSwitchSubmit} className="p-5 space-y-4">
          <div className="text-xs text-slate-600">
            Hệ thống yêu cầu nhập mật khẩu của tài khoản mục tiêu để bảo vệ phân quyền, tránh việc tự ý chuyển đổi tài khoản mà không có thẩm quyền.
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Select Target Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Chọn Tài Khoản Cần Chuyển Đến:
            </label>
            <select
              value={selectedUser.id}
              onChange={(e) => {
                const found = allUsers.find(u => u.id === e.target.value);
                if (found) {
                  setSelectedUser(found);
                  setPassword('');
                  setErrorMessage(null);
                }
              }}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-amber-500 font-medium"
            >
              {allUsers
                .filter(u => u.id !== currentUser.id)
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.username}) • {u.role}
                  </option>
                ))}
            </select>
          </div>

          {/* Target User Card */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-amber-900 text-sm shrink-0">
              {selectedUser.holyName ? selectedUser.holyName.charAt(0) : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-xs truncate">
                {selectedUser.name}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                @{selectedUser.username}
              </div>
              <div className="mt-1">
                {getRoleBadge(selectedUser.role)}
              </div>
            </div>
          </div>

          {/* Password Input for Target User */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Nhập Mật Khẩu Của "{selectedUser.username}": <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const def = selectedUser.password || getDefaultPasswordForRole(selectedUser.role, selectedUser.username, selectedUser.studentId);
                  setPassword(def);
                }}
                className="text-[10px] text-amber-600 hover:text-amber-800 font-medium cursor-pointer"
                title="Điền mật khẩu mặc định"
              >
                {selectedUser.role === 'parent' ? 'Điền Mã Học Sinh' : 'Điền mật khẩu mặc định'}
              </button>
            </div>
            {selectedUser.role === 'parent' && (
              <div className="mb-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                💡 Mật khẩu mặc định của phụ huynh là <strong>Mã Học Sinh</strong> ({selectedUser.studentId || selectedUser.username}).
              </div>
            )}
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
                className="w-full pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Xác Nhận & Chuyển Sang Tài Khoản Này</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onLogoutToLoginScreen();
              }}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Đăng Xuất Ra Màn Hình Đăng Nhập Chính</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
