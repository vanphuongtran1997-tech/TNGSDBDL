import React, { useState } from 'react';
import { 
  UserCheck, 
  UserX, 
  KeyRound, 
  Search, 
  Plus, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  Shield, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  X,
  Phone,
  Mail,
  School
} from 'lucide-react';
import { UserAccount, Role, ClassRoom } from '../types';

interface AccountManagementProps {
  currentUser: UserAccount;
  allUsers: UserAccount[];
  classes: ClassRoom[];
  onAddUser: (user: Omit<UserAccount, 'id'>) => void;
  onUpdateUser: (user: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
  onToggleLockUser: (userId: string) => void;
  onResetPassword: (userId: string, newPass: string) => void;
  onSwitchUser: (user: UserAccount) => void;
}

export const AccountManagement: React.FC<AccountManagementProps> = ({
  currentUser,
  allUsers,
  classes,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onToggleLockUser,
  onResetPassword,
  onSwitchUser,
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'pastor';

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal States
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [targetResetUser, setTargetResetUser] = useState<UserAccount | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    holyName: '',
    name: '',
    email: '',
    phone: '',
    role: 'catechist' as Role,
    assignedClassId: '',
    status: 'active' as 'active' | 'locked',
  });
  const [showPassword, setShowPassword] = useState(false);

  // Form State for Reset Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Filtered accounts
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.holyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.includes(searchTerm);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'admin':
        return { label: 'Quản Trị Viên (Admin)', badge: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'pastor':
        return { label: 'Cha Quản Sở', badge: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'catechist_leader':
        return { label: 'Trưởng Ban Giáo Lý', badge: 'bg-blue-100 text-blue-900 border-blue-200' };
      case 'catechist':
        return { label: 'Giáo Lý Viên Phụ Trách', badge: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
      case 'trainee':
        return { label: 'Dự Trưởng / Huấn Luyện', badge: 'bg-purple-100 text-purple-900 border-purple-200' };
      case 'parent':
        return { label: 'Phụ Huynh / Học Viên', badge: 'bg-stone-100 text-stone-800 border-stone-200' };
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: 'Password123!',
      holyName: '',
      name: '',
      email: '',
      phone: '',
      role: 'catechist',
      assignedClassId: '',
      status: 'active',
    });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      holyName: user.holyName,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      assignedClassId: user.assignedClassId || '',
      status: user.status || 'active',
    });
    setIsAddEditOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.name.trim()) {
      alert('Vui lòng nhập tên đăng nhập và họ tên người dùng.');
      return;
    }

    if (editingUser) {
      // Update existing
      const updated: UserAccount = {
        ...editingUser,
        username: formData.username.trim().toLowerCase(),
        name: formData.name.trim(),
        holyName: formData.holyName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        assignedClassId: formData.assignedClassId || undefined,
        status: formData.status,
      };
      if (formData.password.trim()) {
        updated.password = formData.password.trim();
      }
      onUpdateUser(updated);
    } else {
      // Add new
      // Check duplicate username
      if (allUsers.some(u => u.username.toLowerCase() === formData.username.trim().toLowerCase())) {
        alert('Tên đăng nhập này đã tồn tại trong hệ thống. Vui lòng chọn tên khác!');
        return;
      }
      onAddUser({
        username: formData.username.trim().toLowerCase(),
        password: formData.password.trim() || 'Password123!',
        name: formData.name.trim(),
        holyName: formData.holyName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        assignedClassId: formData.assignedClassId || undefined,
        status: formData.status,
        createdAt: new Date().toISOString().split('T')[0],
      });
    }

    setIsAddEditOpen(false);
  };

  const handleOpenResetPass = (user: UserAccount) => {
    setTargetResetUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setIsResetPassOpen(true);
  };

  const handleSaveResetPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Xác nhận mật khẩu mới không trùng khớp.');
      return;
    }
    if (targetResetUser) {
      onResetPassword(targetResetUser.id, newPassword);
      setIsResetPassOpen(false);
      alert(`Đã đổi mật khẩu thành công cho tài khoản "${targetResetUser.username}".`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Quản Lý Tài Khoản Đăng Nhập Hệ Thống
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cấp phát tài khoản, phân quyền vai trò (Admin, Cha Quản Sở, Trưởng Ban, Giáo Lý Viên, Dự Trưởng, Phụ Huynh) & bảo mật mật khẩu.
              </p>
            </div>
          </div>
        </div>

        {/* Action button */}
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-add-new-user"
              onClick={handleOpenAdd}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Tài Khoản Mới</span>
            </button>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500">Tổng tài khoản</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{allUsers.length}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-emerald-600 font-medium">Đang hoạt động</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {allUsers.filter(u => u.status === 'active').length}
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-rose-600 font-medium">Bị khóa tạm thời</div>
          <div className="text-xl font-bold text-rose-700 mt-1">
            {allUsers.filter(u => u.status === 'locked').length}
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-amber-700 font-medium">Ban Quản Trị / Quản Sở</div>
          <div className="text-xl font-bold text-amber-800 mt-1">
            {allUsers.filter(u => u.role === 'admin' || u.role === 'pastor').length}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên đăng nhập, họ tên, email, SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-700"
          >
            <option value="all">Tất cả phân quyền vai trò</option>
            <option value="admin">Quản Trị Viên (Admin)</option>
            <option value="pastor">Cha Quản Sở</option>
            <option value="catechist_leader">Trưởng Ban Giáo Lý</option>
            <option value="catechist">Giáo Lý Viên Phụ Trách</option>
            <option value="trainee">Dự Trưởng / Huấn Luyện</option>
            <option value="parent">Phụ Huynh / Học Viên</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-700"
          >
            <option value="all">Tất cả trạng thái hoạt động</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Đã bị khóa</option>
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-3">Tài Khoản & Tên Đăng Nhập</th>
                <th className="py-3 px-3">Tên Thánh & Họ Tên</th>
                <th className="py-3 px-3">Phân Quyền Vai Trò</th>
                <th className="py-3 px-3">Lớp Phụ Trách</th>
                <th className="py-3 px-3">Liên Hệ</th>
                <th className="py-3 px-3">Trạng Thái</th>
                <th className="py-3 px-3">Lần Đăng Nhập Cuối</th>
                <th className="py-3 px-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Không tìm thấy tài khoản người dùng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleMeta = getRoleLabel(user.role);
                  const assignedClass = classes.find(c => c.id === user.assignedClassId);
                  const isCurrent = currentUser.id === user.id;

                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isCurrent ? 'bg-amber-50/50 font-medium' : ''
                      }`}
                    >
                      {/* Username */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 text-xs">
                            {user.holyName ? user.holyName.charAt(0) : user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{user.username}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-semibold">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">ID: {user.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Full Name & Holy Name */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{user.name}</div>
                        <div className="text-[11px] text-amber-800 italic">{user.holyName}</div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border inline-block ${roleMeta.badge}`}>
                          {roleMeta.label}
                        </span>
                      </td>

                      {/* Assigned Class */}
                      <td className="py-3 px-3">
                        {assignedClass ? (
                          <div className="flex items-center gap-1 text-slate-800">
                            <School className="w-3.5 h-3.5 text-blue-600" />
                            <span className="font-medium">{assignedClass.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-3 space-y-0.5">
                        {user.email && (
                          <div className="flex items-center gap-1 text-slate-600 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[150px]">{user.email}</span>
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-1 text-slate-600 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {user.status === 'locked' ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Đã Khóa</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                            <CheckCircle className="w-2.5 h-2.5" />
                            <span>Hoạt động</span>
                          </span>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {user.lastLogin || 'Chưa đăng nhập'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick switch to this user */}
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => onSwitchUser(user)}
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                              title={`Chuyển đăng nhập sang "${user.name}"`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Reset Password */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenResetPass(user)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                              title="Đặt lại mật khẩu"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Toggle Lock / Unlock (cannot lock oneself) */}
                          {isAdmin && !isCurrent && (
                            <button
                              type="button"
                              onClick={() => onToggleLockUser(user.id)}
                              className={`p-1.5 rounded-md transition-colors ${
                                user.status === 'locked'
                                  ? 'text-emerald-700 hover:bg-emerald-50'
                                  : 'text-amber-700 hover:bg-amber-50'
                              }`}
                              title={user.status === 'locked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản này'}
                            >
                              {user.status === 'locked' ? (
                                <Unlock className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Edit info */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(user)}
                              className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
                              title="Chỉnh sửa thông tin"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete account */}
                          {isAdmin && !isCurrent && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.username}" (${user.name})?`)) {
                                  onDeleteUser(user.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Xóa tài khoản vĩnh viễn"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">
                  {editingUser ? 'Cập Nhật Tài Khoản Đăng Nhập' : 'Tạo Mới Tài Khoản Đăng Nhập'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên Đăng Nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="vd: glv_thimai"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>

                {/* Password (Optional on Edit) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editingUser ? 'Mật Khẩu Mới (Bỏ trống nếu không đổi)' : 'Mật Khẩu Ban Đầu *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser}
                      placeholder={editingUser ? '••••••••' : 'Nhập mật khẩu ban đầu'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-1.5 pr-8 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Holy Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên Thánh
                  </label>
                  <input
                    type="text"
                    placeholder="vd: Maria, Giuse, Phêrô..."
                    value={formData.holyName}
                    onChange={(e) => setFormData({ ...formData, holyName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và Tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="vd: Nguyễn Thị Mai"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="vd: thimai.glv@donboscodalat.vn"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số Điện Thoại
                  </label>
                  <input
                    type="text"
                    placeholder="vd: 0988 765 432"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phân Quyền Vai Trò
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-700"
                  >
                    <option value="admin">Quản Trị Viên (Admin)</option>
                    <option value="pastor">Cha Quản Sở</option>
                    <option value="catechist_leader">Trưởng Ban Giáo Lý</option>
                    <option value="catechist">Giáo Lý Viên Phụ Trách</option>
                    <option value="trainee">Dự Trưởng / Huấn Luyện</option>
                    <option value="parent">Phụ Huynh / Học Viên</option>
                  </select>
                </div>

                {/* Assigned Class */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lớp Phụ Trách (Nếu có)
                  </label>
                  <select
                    value={formData.assignedClassId}
                    onChange={(e) => setFormData({ ...formData, assignedClassId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-700"
                  >
                    <option value="">(Không phân công lớp)</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.level})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trạng Thái Tài Khoản
                  </label>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="account_status"
                        value="active"
                        checked={formData.status === 'active'}
                        onChange={() => setFormData({ ...formData, status: 'active' })}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-emerald-700 font-medium">Hoạt động bình thường</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="account_status"
                        value="locked"
                        checked={formData.status === 'locked'}
                        onChange={() => setFormData({ ...formData, status: 'locked' })}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-rose-700 font-medium">Khóa tạm thời</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  {editingUser ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetPassOpen && targetResetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Đặt Lại Mật Khẩu Đăng Nhập</h3>
              </div>
              <button
                onClick={() => setIsResetPassOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResetPass} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  Tài khoản: <strong className="font-mono text-slate-900">{targetResetUser.username}</strong>
                </div>
                <div className="text-slate-600 mt-0.5">
                  Người sở hữu: <strong>{targetResetUser.holyName} {targetResetUser.name}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật Khẩu Mới (Tối thiểu 6 ký tự) *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Nhập mật khẩu mới"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-1.5 pr-8 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Xác Nhận Mật Khẩu Mới *
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <button
                  type="button"
                  onClick={() => {
                    const defaultPass = 'Donbosco2026@';
                    setNewPassword(defaultPass);
                    setConfirmPassword(defaultPass);
                  }}
                  className="text-blue-600 hover:underline"
                >
                  Gợi ý: Đặt mặc định "Donbosco2026@"
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetPassOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  Cập Nhật Mật Khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
