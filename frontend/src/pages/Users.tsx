import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Power, 
  Key,
  Shield,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  User as UserIcon,
  Users as UsersIcon,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import usersApi, { type User, type UserFilters, type CreateUserData, type UpdateUserData, type Role } from '../services/usersApi';
import { branchesApi, type Branch } from '../services/branchesApi';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import CreateEditUserModal from '../components/modals/CreateEditUserModal';
import DeleteUserModal from '../components/modals/DeleteUserModal';
import ResetPasswordModal from '../components/modals/ResetPasswordModal';

interface UsersProps {
  isDark: boolean;
  themeClasses: any;
}

const defaultRoles: Role[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'cashier', label: 'Cashier' }
];

export const Users: React.FC<UsersProps> = ({ isDark, themeClasses }) => {
  const { user: currentUser } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [userStats, setUserStats] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const canCreateUsers = currentUser && currentUser.role === 'admin';
  const canViewUsers = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');
  const canEditUsers = currentUser && currentUser.role === 'admin';

  useEffect(() => {
    loadUsers();
  }, [pagination?.page, searchTerm, selectedRole, selectedStatus, selectedBranch]);

  useEffect(() => {
    loadRoles();
    loadUserStats();
    if (currentUser?.role === 'admin') {
      branchesApi.getActiveBranches().then((data) => {
        setBranches(data);
        if (!selectedBranch && data.length > 0) {
          setSelectedBranch(data[0].id);
        }
      });
    } else if (currentUser?.branch) {
      setSelectedBranch(currentUser.branch);
    }
  }, [currentUser]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const filters: UserFilters = {
        search: searchTerm || undefined,
        role: selectedRole || undefined,
        is_active: selectedStatus === 'active' ? true : selectedStatus === 'inactive' ? false : undefined,
        ordering: '-date_joined',
        branch: selectedBranch || undefined
      };
      const response = await usersApi.getUsers(filters);
      // Ensure data is always an array and pagination has defaults
      const usersData = Array.isArray(response.data) ? response.data : [];
      setUsers(usersData);
      setPagination({
        page: response.pagination?.page || 1,
        limit: response.pagination?.limit || 10,
        total: response.pagination?.total || usersData.length,
        totalPages: response.pagination?.totalPages || Math.ceil(usersData.length / (response.pagination?.limit || 10))
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      // Set safe defaults on error
      setUsers([]);
      setPagination({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const availableRoles = await usersApi.getAvailableRoles();
      // Ensure roles is always an array and has defaults if empty
      setRoles(Array.isArray(availableRoles) && availableRoles.length > 0 ? availableRoles : defaultRoles);
    } catch (err) {
      console.error('Failed to load roles:', err);
      // Set default roles on error
      setRoles(defaultRoles);
    }
  };

  const loadUserStats = async () => {
    try {
      const response = await usersApi.getUsers({ limit: 10000 });
      const allUsers = Array.isArray(response.data) ? response.data : [];
      const total = response.pagination?.total || allUsers.length;
      const active = allUsers.filter(u => u.is_active).length;
      const inactive = total - active;
      const by_role = {
        admin: allUsers.filter(u => u.role === 'admin').length,
        manager: allUsers.filter(u => u.role === 'manager').length,
        cashier: allUsers.filter(u => u.role === 'cashier').length,
      };
      setUserStats({ total, active, inactive, by_role });
    } catch (err) {
      console.error('Failed to load user stats:', err);
      // Set to null on error to hide stats if not authorized
      setUserStats(null);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadUsers();
  };

  const handleCreateUser = async (data: CreateUserData) => {
    try {
      const submitData = {
        ...data,
        branch: currentUser?.role === 'admin' ? (data.branch ? data.branch : selectedBranch) : currentUser?.branch
      };
      await usersApi.createUser(submitData);
      setShowCreateModal(false);
      loadUsers();
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create user' 
      };
    }
  };

  const handleUpdateUser = async (data: UpdateUserData) => {
    if (!selectedUser) return { success: false, error: 'No user selected' };
    try {
      const submitData = {
        ...data,
        branch: currentUser?.role === 'admin' ? (data.branch ? data.branch : selectedBranch) : currentUser?.branch
      };
      await usersApi.updateUser(selectedUser.id, submitData);
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update user' 
      };
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await usersApi.deleteUser(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await usersApi.toggleUserActive(user.id);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle user status');
    }
  };

  const handleResetPassword = async (password: string, confirmPassword: string) => {
    if (!selectedUser) return { success: false, error: 'No user selected' };
    
    try {
      await usersApi.resetUserPassword(selectedUser.id, {
        new_password: password,
        confirm_password: confirmPassword
      });
      setShowPasswordModal(false);
      setSelectedUser(null);
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to reset password' 
      };
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.length === 0) {
      setError('Please select users first');
      return;
    }

    try {
      if (action === 'delete') {
        await Promise.all(selectedUsers.map(id => usersApi.deleteUser(id)));
      } else {
        await Promise.all(selectedUsers.map(id => usersApi.toggleUserActive(id)));
      }
      setSelectedUsers([]);
      loadUsers();
      loadUserStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} users`);
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (users && Array.isArray(users)) {
      if (selectedUsers.length === users.length) {
        setSelectedUsers([]);
      } else {
        setSelectedUsers(users.map(user => user.id));
      }
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800';
      case 'manager':
        return isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800';
      case 'cashier':
        return isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800';
      default:
        return isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
      : isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800';
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <CheckCircle size={16} /> : <XCircle size={16} />;
  };

  // Show loading if user is not available yet
  if (!currentUser) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner themeClasses={themeClasses} isDark={isDark} size="lg" />
      </div>
    );
  }

  // Show access denied if user doesn't have view access
  if (!canViewUsers) {
    return (
      <div className={`${themeClasses.card} rounded-xl p-8 text-center`}>
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
          <AlertCircle className="text-red-400" size={32} />
        </div>
        <h2 className={`text-2xl font-bold ${themeClasses.text} mb-2`}>Access Denied</h2>
        <p className={`${themeClasses.textSecondary} mb-6 max-w-md mx-auto`}>
          You don't have permission to access the User Management page. Only admins and managers can view this section.
        </p>
      </div>
    );
  }

  return (
    <div className={`${themeClasses.card} rounded-xl p-6`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className={`text-2xl font-bold ${themeClasses.text}`}>User Management</h1>
            {!canEditUsers && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                View Only
              </span>
            )}
          </div>
          <p className={`${themeClasses.textSecondary} mt-2`}>
            {canEditUsers ? 'Manage system users and their permissions' : 'View system users and their information'}
          </p>
        </div>
        <div className="flex gap-3">
          {selectedUsers.length > 0 && canEditUsers && (
            <div className="flex items-center gap-2">
              <span className={`${themeClasses.textSecondary} text-sm`}>
                {selectedUsers.length} selected
              </span>
              <button
                onClick={() => handleBulkAction('activate')}
                className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
              >
                <UserCheck size={16} />
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="flex items-center gap-1 px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
              >
                <UserX size={16} />
                Deactivate
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          )}
          {canCreateUsers && (
            <Button onClick={() => setShowCreateModal(true)} icon={<UserPlus size={20} />}>
              Add User
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Dashboard */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`${themeClasses.card} border rounded-xl p-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <UsersIcon className="text-blue-400" size={24} />
              </div>
              <div>
                <p className={`text-sm ${themeClasses.textSecondary}`}>Total Users</p>
                <p className={`text-2xl font-bold ${themeClasses.text}`}>{pagination.total || userStats.total || 0}</p>
              </div>
            </div>
          </div>
          
          <div className={`${themeClasses.card} border rounded-xl p-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <UserCheck className="text-green-400" size={24} />
              </div>
              <div>
                <p className={`text-sm ${themeClasses.textSecondary}`}>Active Users</p>
                <p className={`text-2xl font-bold ${themeClasses.text}`}>{userStats.active || 0}</p>
              </div>
            </div>
          </div>
          
          <div className={`${themeClasses.card} border rounded-xl p-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <UserX className="text-red-400" size={24} />
              </div>
              <div>
                <p className={`text-sm ${themeClasses.textSecondary}`}>Inactive Users</p>
                <p className={`text-2xl font-bold ${themeClasses.text}`}>{userStats.inactive || 0}</p>
              </div>
            </div>
          </div>
          
          <div className={`${themeClasses.card} border rounded-xl p-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Shield className="text-purple-400" size={24} />
              </div>
              <div>
                <p className={`text-sm ${themeClasses.textSecondary}`}>Admin Users</p>
                <p className={`text-2xl font-bold ${themeClasses.text}`}>{userStats.by_role?.admin || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                {/* Branch filter for admin */}
                {currentUser?.role === 'admin' && (
                  <select
                    value={selectedBranch || ''}
                    onChange={e => setSelectedBranch(Number(e.target.value))}
                    className={`px-4 py-3 ${themeClasses.input} border rounded-lg ${themeClasses.text} outline-none focus:ring-2 focus:ring-violet-500`}
                  >
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                )}
        <div className="relative">
          <Search className={`absolute left-3 top-3 ${themeClasses.textSecondary}`} size={20} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className={`w-full pl-10 pr-4 py-3 ${themeClasses.input} border rounded-lg ${themeClasses.text} outline-none focus:ring-2 focus:ring-violet-500`}
          />
        </div>
        
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className={`px-4 py-3 ${themeClasses.input} border rounded-lg ${themeClasses.text} outline-none focus:ring-2 focus:ring-violet-500`}
        >
          <option value="">All Roles</option>
          {roles.map(role => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className={`px-4 py-3 ${themeClasses.input} border rounded-lg ${themeClasses.text} outline-none focus:ring-2 focus:ring-violet-500`}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <Button onClick={handleSearch} icon={<Filter size={20} />} className="px-4 py-3">
          Apply Filters
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <AlertCircle className="text-red-400" size={20} />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner themeClasses={themeClasses} isDark={isDark} size="lg" />
          </div>
        ) : !users || !Array.isArray(users) || users.length === 0 ? (
          <div className="text-center py-12">
            <div className={`w-16 h-16 mx-auto ${themeClasses.card} border rounded-full flex items-center justify-center mb-6`}>
              <UsersIcon className={`${themeClasses.textSecondary}`} size={32} />
            </div>
            <h3 className={`text-xl font-semibold ${themeClasses.text} mb-2`}>
              No Users Found
            </h3>
            <p className={`${themeClasses.textSecondary} mb-6`}>
              {error ? 'Unable to load users. Please try again.' : 'No users match your current filters.'}
            </p>
            {error && (
              <button
                onClick={() => {
                  setError(null);
                  loadUsers();
                }}
                className="px-6 py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
              >
                Try Again
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className={`border-b ${themeClasses.card}`}>
                {canEditUsers && (
                  <th className={`text-left py-4 px-4 ${themeClasses.text} font-semibold`}>
                    <input
                      type="checkbox"
                      checked={users && Array.isArray(users) && selectedUsers.length === users.length && users.length > 0}
                      onChange={selectAllUsers}
                      className="rounded border-gray-600 bg-gray-700 text-violet-500 focus:ring-violet-500"
                    />
                  </th>
                )}
                <th className={`text-left py-4 px-4 ${themeClasses.text} font-semibold`}>User</th>
                <th className={`text-left py-4 px-4 ${themeClasses.text} font-semibold`}>Role</th>
                <th className={`text-left py-4 px-4 ${themeClasses.text} font-semibold`}>Branch</th>
                <th className={`text-left py-4 px-4 ${themeClasses.text} font-semibold`}>Contact</th>
                <th className={`text-left py-4 px-4 ${themeClasses.text} font-semibold`}>Status</th>
                <th className={`text-left py-4 px-4 ${themeClasses.text} font-semibold`}>Joined</th>
                <th className={`text-left py-4 px-4 ${themeClasses.text} font-semibold`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users && Array.isArray(users) && users.map(user => (
                <tr key={user.id} className={`border-b ${themeClasses.hover}`}>
                  {canEditUsers && (
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="rounded border-gray-600 bg-gray-700 text-violet-500 focus:ring-violet-500"
                      />
                    </td>
                  )}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center`}>
                        <UserIcon className={themeClasses.textSecondary} size={20} />
                      </div>
                      <div>
                        <p className={`font-semibold ${themeClasses.text}`}>{user.full_name || user.username}</p>
                        <p className={`text-sm ${themeClasses.textSecondary}`}>{user.username}</p>
                        <p className={`text-sm ${themeClasses.textSecondary}`}>{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      <Shield size={12} />
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <p className={`text-sm ${themeClasses.text}`}>{user.branch_name || 'No branch'}</p>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      {user.phone && (
                        <p className={`text-sm ${themeClasses.textSecondary} flex items-center gap-1`}>
                          <Phone size={12} />
                          {user.phone}
                        </p>
                      )}
                      {user.employee_id && (
                        <p className={`text-sm ${themeClasses.textSecondary} flex items-center gap-1`}>
                          <UserIcon size={12} />
                          {user.employee_id}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(user.is_active)}`}>
                      {getStatusIcon(user.is_active)}
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <p className={`text-sm ${themeClasses.textSecondary} flex items-center gap-1`}>
                      <Calendar size={12} />
                      {new Date(user.date_joined).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="py-4 px-4">
                    <div className="relative group">
                      <button className={`p-2 rounded-lg ${themeClasses.hover} ${themeClasses.textSecondary}`}>
                        <MoreVertical size={16} />
                      </button>
                      <div className={`absolute right-0 mt-2 w-48 ${themeClasses.card} border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10`}>
                        {canEditUsers ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowEditModal(true);
                              }}
                              className={`w-full px-4 py-2 text-left ${themeClasses.hover} ${themeClasses.text} flex items-center gap-2`}
                            >
                              <Edit size={16} />
                              Edit User
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowPasswordModal(true);
                              }}
                              className={`w-full px-4 py-2 text-left ${themeClasses.hover} ${themeClasses.text} flex items-center gap-2`}
                            >
                              <Key size={16} />
                              Reset Password
                            </button>
                            <button
                              onClick={() => handleToggleActive(user)}
                              className={`w-full px-4 py-2 text-left ${themeClasses.hover} ${themeClasses.text} flex items-center gap-2`}
                            >
                              <Power size={16} />
                              {user.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            {user.id !== currentUser?.id && (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeleteModal(true);
                                }}
                                className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                              >
                                <Trash2 size={16} />
                                Delete
                              </button>
                            )}
                          </>
                        ) : (
                          <div className={`px-4 py-3 text-sm ${themeClasses.textSecondary}`}>
                            View only access
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && users && Array.isArray(users) && users.length > 0 && (
        <div className="flex justify-between items-center mt-6">
          <p className={`text-sm ${themeClasses.textSecondary}`}>
            Showing {((pagination?.page - 1) * pagination?.limit) + 1} to {Math.min((pagination?.page || 1) * (pagination?.limit || 10), pagination?.total || 0)} of {pagination?.total || 0} users
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: (prev?.page || 1) - 1 }))}
              disabled={(pagination?.page || 1) === 1}
              className={`px-3 py-2 rounded-lg ${themeClasses.input} ${themeClasses.text} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: (prev?.page || 1) + 1 }))}
              disabled={(pagination?.page || 1) >= (pagination?.totalPages || 1)}
              className={`px-3 py-2 rounded-lg ${themeClasses.input} ${themeClasses.text} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateEditUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data: any) => handleCreateUser(data as CreateUserData)}
        isEdit={false}
        availableRoles={roles}
        themeClasses={themeClasses}
        isDark={isDark}
        currentUser={currentUser}
        branches={branches}
        selectedBranch={selectedBranch}
      />

      <CreateEditUserModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        onSubmit={(data: any) => handleUpdateUser(data as UpdateUserData)}
        user={selectedUser}
        isEdit={true}
        availableRoles={roles}
        themeClasses={themeClasses}
        isDark={isDark}
        currentUser={currentUser}
        branches={branches}
        selectedBranch={selectedBranch}
      />

      <DeleteUserModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDeleteUser}
        user={selectedUser}
        themeClasses={themeClasses}
        isDark={isDark}
      />

      <ResetPasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setSelectedUser(null);
        }}
        onSubmit={handleResetPassword}
        user={selectedUser}
        themeClasses={themeClasses}
        isDark={isDark}
      />
      
    </div>
  );
};

export default Users;
