import React, { useState } from 'react';
import { Key, Eye, EyeOff, X } from 'lucide-react';
import { type User } from '../../services/usersApi';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  user: User | null;
  themeClasses: any;
  isDark: boolean;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
  themeClasses,
  isDark
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const result = await onSubmit(password, confirmPassword);
      if (result.success) {
        setPassword('');
        setConfirmPassword('');
        onClose();
      } else {
        setError(result.error || 'Failed to reset password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${themeClasses.card} border rounded-xl w-full max-w-md`}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700/50">
          <h2 className={`text-xl font-bold ${themeClasses.text}`}>Reset Password</h2>
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

          <div className="mb-4">
            <p className={`${themeClasses.text} font-medium mb-2`}>
              Reset password for: {user.full_name || user.username}
            </p>
            <p className={`${themeClasses.textSecondary} text-sm`}>
              Enter a new password for this user account.
            </p>
          </div>

          {/* New Password */}
          <div>
            <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
              New Password *
            </label>
            <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
              <Key className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-10 bg-transparent ${themeClasses.text} outline-none`}
                placeholder="Enter new password"
                required
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
            <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>
              Password must be at least 8 characters long
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
              Confirm Password *
            </label>
            <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
              <Key className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full pl-10 pr-10 bg-transparent ${themeClasses.text} outline-none`}
                placeholder="Confirm new password"
                required
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
              disabled={loading || !password || !confirmPassword}
              className={`px-6 py-2 rounded-lg ${themeClasses.button} text-white disabled:opacity-50 flex items-center gap-2`}
            >
              {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
