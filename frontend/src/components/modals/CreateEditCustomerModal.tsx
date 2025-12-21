import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Calendar, MapPin } from 'lucide-react';
import { type Customer, type CreateCustomerData, type UpdateCustomerData } from '../../services/customersApi';

interface CreateEditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCustomerData | UpdateCustomerData) => Promise<{ success: boolean; error?: string }>;
  customer?: Customer | null;
  isEdit: boolean;
  themeClasses: any;
  isDark: boolean;
}

export const CreateEditCustomerModal: React.FC<CreateEditCustomerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customer,
  isEdit,
  themeClasses,
  isDark
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthday: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (isEdit && customer) {
        setFormData({
          name: customer.name,
          phone: customer.phone,
          email: customer.email || '',
          birthday: customer.birthday || '',
          address: customer.address || '',
        });
      } else {
        setFormData({
          name: '',
          phone: '',
          email: '',
          birthday: '',
          address: '',
        });
      }
      setError(null);
    }
  }, [isOpen, isEdit, customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }
    if (!formData.phone.trim()) {
      setError('Phone is required');
      setLoading(false);
      return;
    }

    try {
      const cleanedData = {
        ...formData,
        email: formData.email.trim() || undefined,
        birthday: formData.birthday || undefined,
        address: formData.address.trim() || undefined,
      };

      const submitData = isEdit && customer
        ? { ...cleanedData, id: customer.id }
        : cleanedData;

      const result = await onSubmit(submitData);
      if (result.success) {
        onClose();
      } else {
        setError(result.error || 'Failed to save customer');
      }
    } catch (err) {
      let errorMsg = 'An unexpected error occurred';
      const errorText = err instanceof Error ? err.message : String(err);

      try {
        const parsed = JSON.parse(errorText);
        if (parsed.name && Array.isArray(parsed.name)) {
          errorMsg = parsed.name[0];
        } else if (parsed.phone && Array.isArray(parsed.phone)) {
          errorMsg = parsed.phone[0];
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
            {isEdit ? 'Edit Customer' : 'Add New Customer'}
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
            {/* Name */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Name *
              </label>
              <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
                <User className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full pl-10 bg-transparent ${themeClasses.text} outline-none`}
                  placeholder="Enter customer name"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Phone *
              </label>
              <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
                <Phone className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={`w-full pl-10 bg-transparent ${themeClasses.text} outline-none`}
                  placeholder="Enter phone number"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Email
              </label>
              <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
                <Mail className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`w-full pl-10 bg-transparent ${themeClasses.text} outline-none`}
                  placeholder="Enter email address"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Birthday */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Birthday
              </label>
              <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
                <Calendar className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
                <input
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => handleChange('birthday', e.target.value)}
                  className={`w-full pl-10 bg-transparent ${themeClasses.text} outline-none`}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Address
              </label>
              <div className={`relative ${themeClasses.input} border rounded-lg px-4 py-3`}>
                <MapPin className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className={`w-full pl-10 bg-transparent ${themeClasses.text} outline-none`}
                  placeholder="Enter address"
                  disabled={loading}
                />
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
              {isEdit ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditCustomerModal;
