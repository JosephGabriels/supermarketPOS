import React, { useState } from 'react';
import { Key, Eye, EyeOff, X } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { current_password: string; new_password: string; confirm_password: string }) => Promise<{ success: boolean; error?: string }>;
  themeClasses: any;
  isDark: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  themeClasses,
  isDark
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!currentPassword) {
      setError('Current password is required');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const result = await onSubmit({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      if (result.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      } else {
        setError(result.error || 'Failed to change password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${themeClasses.card} border rounded-xl w-full max-w-md`}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700/50">
          <h2 className={`text-xl font-bold ${themeClasses.text}`}>Change Password</h2>
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

          {/* Current Password */}
          <div>
            <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
              Current Password *
            </label>
            <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
              <Key className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`w-full pl-10 pr-10 bg-transparent ${themeClasses.text} outline-none`}
                placeholder="Enter current password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className={`absolute right-3 top-3.5 ${themeClasses.textSecondary} hover:${themeClasses.text}`}
              >
                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
              New Password *
            </label>
            <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
              <Key className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full pl-10 pr-10 bg-transparent ${themeClasses.text} outline-none`}
                placeholder="Enter new password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className={`absolute right-3 top-3.5 ${themeClasses.textSecondary} hover:${themeClasses.text}`}
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>
              Password must be at least 8 characters long
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
              Confirm New Password *
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
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              className={`px-6 py-2 rounded-lg ${themeClasses.button} text-white disabled:opacity-50 flex items-center gap-2`}
            >
              {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              Change Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;