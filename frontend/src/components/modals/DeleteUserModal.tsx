import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { type User } from '../../services/usersApi';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  user: User | null;
  themeClasses: any;
  isDark: boolean;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  themeClasses,
  isDark
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
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
          <h2 className={`text-xl font-bold ${themeClasses.text}`}>Confirm Deletion</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${themeClasses.hover} ${themeClasses.textSecondary}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-red-500/10 rounded-full">
              <AlertTriangle className="text-red-400" size={24} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>
                Delete User Account
              </h3>
              <p className={`${themeClasses.textSecondary} mb-4`}>
                Are you sure you want to delete the user account for{' '}
                <span className={`font-semibold ${themeClasses.text}`}>
                  {user.full_name || user.username}
                </span>
                ?
              </p>
              <div className={`p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg`}>
                <p className={`text-yellow-400 text-sm`}>
                  <strong>Warning:</strong> This action will deactivate the user account. 
                  The user will no longer be able to access the system.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`px-6 py-2 rounded-lg ${themeClasses.hover} ${themeClasses.text} disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 flex items-center gap-2`}
            >
              {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              Delete User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteUserModal;
