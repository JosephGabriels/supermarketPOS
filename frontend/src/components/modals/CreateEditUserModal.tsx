import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, User, Mail, Shield, Phone, Hash } from 'lucide-react';
import { type User as UserType, type CreateUserData, type UpdateUserData, type Role } from '../../services/usersApi';

interface CreateEditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserData | UpdateUserData) => Promise<{ success: boolean; error?: string }>;
  user?: UserType | null;
  isEdit: boolean;
  availableRoles: Role[];
  themeClasses: any;
  isDark: boolean;
}

export const CreateEditUserModal: React.FC<CreateEditUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
  isEdit,
  availableRoles,
  themeClasses,
  isDark
}) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier',
    phone: '',
    employee_id: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (isEdit && user) {
        setFormData({
          username: user.username,
          email: user.email,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          role: user.role,
          phone: user.phone || '',
          employee_id: user.employee_id || '',
          password: '',
          confirm_password: '',
        });
      } else {
        setFormData({
          username: '',
          email: '',
          first_name: '',
          last_name: '',
          role: 'cashier',
          phone: '',
          employee_id: '',
          password: '',
          confirm_password: '',
        });
      }
      setError(null);
    }
  }, [isOpen, isEdit, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.username.trim()) {
      setError('Username is required');
      setLoading(false);
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }
    if (!isEdit && (!formData.password || formData.password.length < 8)) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }
    if (formData.password && formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const submitData = isEdit
        ? {
            ...formData,
            ...(formData.password ? { password: formData.password, confirm_password: formData.confirm_password } : {}),
          }
        : formData;

      const result = await onSubmit(submitData);
      if (result.success) {
        onClose();
      } else {
        setError(result.error || 'Failed to save user');
      }
    } catch (err) {
      let errorMsg = 'An unexpected error occurred';
      const errorText = err instanceof Error ? err.message : String(err);

      try {
        const parsed = JSON.parse(errorText);
        if (parsed.username && Array.isArray(parsed.username)) {
          errorMsg = parsed.username[0];
        } else if (parsed.email && Array.isArray(parsed.email)) {
          errorMsg = parsed.email[0];
        } else if (parsed.detail) {
          errorMsg = parsed.detail;
        } else if (typeof parsed === 'string') {
          errorMsg = parsed;
        } else {
          errorMsg = 'Validation error occurred';
        }
      } catch {
        errorMsg = errorText;
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${themeClasses.card} border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700/50">
          <h2 className={`text-xl font-bold ${themeClasses.text}`}>
            {isEdit ? 'Edit User' : 'Create New User'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${themeClasses.hover} ${themeClasses.textSecondary}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Username *
              </label>
              <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
                <User className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  className={`w-full pl-10 bg-transparent ${themeClasses.text} outline-none`}
                  placeholder="Enter username"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Email *
              </label>
              <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
                <Mail className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`w-full pl-10 bg-transparent ${themeClasses.text} outline-none`}
                  placeholder="Enter email"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* First Name */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                First Name
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                className={`w-full px-4 py-3 ${themeClasses.input} border rounded-lg ${themeClasses.text} outline-none focus:ring-2 focus:ring-violet-500`}
                placeholder="Enter first name"
                disabled={loading}
              />
            </div>

            {/* Last Name */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                className={`w-full px-4 py-3 ${themeClasses.input} border rounded-lg ${themeClasses.text} outline-none focus:ring-2 focus:ring-violet-500`}
                placeholder="Enter last name"
                disabled={loading}
              />
            </div>

            {/* Role */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Role *
              </label>
              <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
                <Shield className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
                <select
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  className={`w-full pl-10 bg-transparent ${themeClasses.text} outline-none`}
                  required
                  disabled={loading}
                >
                  {availableRoles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Phone
              </label>
              <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
                <Phone className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={`w-full pl-10 bg-transparent ${themeClasses.text} outline-none`}
                  placeholder="Enter phone number"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Employee ID */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Employee ID
              </label>
              <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
                <Hash className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
                <input
                  type="text"
                  value={formData.employee_id}
                  onChange={(e) => handleChange('employee_id', e.target.value)}
                  className={`w-full pl-10 bg-transparent ${themeClasses.text} outline-none`}
                  placeholder="Enter employee ID"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Password Fields (only for create or when changing password) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                {isEdit ? 'New Password' : 'Password'} {!isEdit && '*'}
              </label>
              <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`w-full bg-transparent ${themeClasses.text} outline-none`}
                  placeholder={isEdit ? 'Leave blank to keep current' : 'Enter password'}
                  required={!isEdit}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-3.5 ${themeClasses.textSecondary} hover:${themeClasses.text}`}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Confirm Password {!isEdit && '*'}
              </label>
              <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirm_password}
                  onChange={(e) => handleChange('confirm_password', e.target.value)}
                  className={`w-full bg-transparent ${themeClasses.text} outline-none`}
                  placeholder={isEdit ? 'Leave blank to keep current' : 'Confirm password'}
                  required={!isEdit}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-3 top-3.5 ${themeClasses.textSecondary} hover:${themeClasses.text}`}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-700/50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`px-6 py-2 rounded-lg ${themeClasses.hover} ${themeClasses.text} disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 rounded-lg ${themeClasses.button} text-white disabled:opacity-50 flex items-center gap-2`}
            >
              {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {isEdit ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditUserModal;
