import React, { useState, useEffect } from 'react';
import { Plus, Building, Edit, Trash2, Search, Phone, Mail, MapPin, X, AlertCircle } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { branchesApi, type Branch } from '../services/branchesApi';

interface BranchesProps {
  isDark: boolean;
  themeClasses: Record<string, string>;
}

export const Branches: React.FC<BranchesProps> = ({ isDark, themeClasses }) => {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    phone: '',
    email: '',
    tax_id: '',
    is_active: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchBranches = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const branchList = await branchesApi.getBranches();
      setBranches(branchList || []);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
      setError('Failed to load branches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Branch name is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.tax_id.trim()) {
      newErrors.tax_id = 'Tax ID (KRA PIN) is required';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (modalMode === 'create') {
        await branchesApi.createBranch(formData);
      } else if (modalMode === 'edit' && selectedBranch) {
        await branchesApi.updateBranch(selectedBranch.id, formData);
      }

      setShowModal(false);
      setFormData({
        name: '',
        location: '',
        phone: '',
        email: '',
        tax_id: '',
        is_active: true
      });
      setSelectedBranch(null);
      fetchBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
      setErrors({ general: 'Failed to save branch' });
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (confirm(`Are you sure you want to delete "${branch.name}"?`)) {
      try {
        await branchesApi.deleteBranch(branch.id);
        fetchBranches();
      } catch (error) {
        console.error('Error deleting branch:', error);
        setError('Failed to delete branch');
      }
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedBranch(null);
    setFormData({
      name: '',
      location: '',
      phone: '',
      email: '',
      tax_id: '',
      is_active: true
    });
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (branch: Branch) => {
    setModalMode('edit');
    setSelectedBranch(branch);
    setFormData({
      name: branch.name,
      location: branch.location,
      phone: branch.phone,
      email: branch.email || '',
      tax_id: branch.tax_id,
      is_active: branch.is_active
    });
    setErrors({});
    setShowModal(true);
  };

  const filteredBranches = searchQuery.trim() 
    ? branches.filter(branch =>
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (branch.tax_id && branch.tax_id.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : branches;

  const columns = [
    {
      key: 'name',
      label: 'Branch',
      sortable: true,
      render: (value: any, row: Branch) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
            <Building size={16} />
          </div>
          <div>
            <p className={`${themeClasses.text} font-medium`}>{value}</p>
            <p className={`${themeClasses.textSecondary} text-sm`}>{row.location}</p>
          </div>
        </div>
      )
    },
    {
      key: 'contact_info',
      label: 'Contact',
      render: (value: any, row: Branch) => (
        <div className="space-y-1">
          {row.email && (
            <div className="flex items-center gap-1 text-sm">
              <Mail size={12} className={themeClasses.textSecondary} />
              <span className={themeClasses.textSecondary}>{row.email}</span>
            </div>
          )}
          {row.phone && (
            <div className="flex items-center gap-1 text-sm">
              <Phone size={12} className={themeClasses.textSecondary} />
              <span className={themeClasses.textSecondary}>{row.phone}</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'tax_id',
      label: 'Tax ID',
      render: (value: any, row: Branch) => (
        <span className={`${themeClasses.textSecondary} text-sm font-mono`}>{value || 'Not provided'}</span>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value: any, row: Branch) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value 
            ? 'text-green-600 bg-green-100' 
            : 'text-red-600 bg-red-100'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  const actions = [
    {
      label: 'Edit',
      icon: ({ size, className }: { size?: number; className?: string }) => (
        <Edit className={className} size={size} />
      ),
      action: openEditModal,
      variant: 'primary' as const
    },
    {
      label: 'Delete',
      icon: ({ size, className }: { size?: number; className?: string }) => (
        <Trash2 className={className} size={size} />
      ),
      action: handleDelete,
      variant: 'danger' as const
    }
  ];

  // Only admins can create/edit/delete branches
  const canManageBranches = user?.role === 'admin';

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-red-500 mb-4">
            <AlertCircle size={48} className="mx-auto" />
          </div>
          <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>Error Loading Branches</h3>
          <p className={`${themeClasses.textSecondary} mb-4`}>{error}</p>
          <button
            onClick={fetchBranches}
            className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>Branches</h2>
          <p className={themeClasses.textSecondary}>Manage your business locations and branches</p>
        </div>
        {canManageBranches && (
          <button 
            onClick={openCreateModal}
            className="px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2"
          >
            <Plus size={20} /> Add Branch
          </button>
        )}
      </div>

      <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden`}>
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 ${themeClasses.input} border rounded-xl px-4 py-2 flex-1`}>
              <Search className={themeClasses.textSecondary} size={20} />
              <input
                type="text"
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-transparent ${themeClasses.text} outline-none flex-1`}
              />
            </div>
          </div>
        </div>
        <DataTable
          data={filteredBranches}
          columns={columns}
          isLoading={isLoading}
          actions={canManageBranches ? actions : []}
          themeClasses={themeClasses}
          isDark={isDark}
          emptyMessage={searchQuery ? "No branches found matching your search" : "No branches found"}
          searchable={false}
          filterable={false}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${themeClasses.card} border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <h2 className={`text-2xl font-bold ${themeClasses.text}`}>
                {modalMode === 'create' ? 'Add Branch' : 'Edit Branch'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className={`${themeClasses.hover} p-2 rounded-lg`}
              >
                <X className={themeClasses.text} size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errors.general && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                  {errors.general}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="Enter branch name"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Location *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="Enter location"
                  />
                  {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="Enter phone number"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="Enter email address"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Tax ID (KRA PIN) *
                  </label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="Enter KRA PIN"
                  />
                  {errors.tax_id && <p className="text-red-500 text-sm mt-1">{errors.tax_id}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isActive" className={`${themeClasses.text} cursor-pointer`}>
                  Branch is active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`px-4 py-2 ${themeClasses.hover} border ${themeClasses.card} rounded-xl ${themeClasses.text}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium"
                >
                  {modalMode === 'create' ? 'Create Branch' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};