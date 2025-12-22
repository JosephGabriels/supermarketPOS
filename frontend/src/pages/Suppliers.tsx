import React, { useState, useEffect } from 'react';
import { Plus, Truck, Edit, Trash2, Search, Phone, Mail, X, AlertCircle } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { suppliersApi, type Supplier } from '../services/suppliersApi';

interface SuppliersProps {
  isDark: boolean;
  themeClasses: Record<string, string>;
}

export const Suppliers: React.FC<SuppliersProps> = ({ isDark, themeClasses }) => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    payment_terms: '',
    is_active: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const supplierList = await suppliersApi.getSuppliers();
      setSuppliers(supplierList || []);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
      setError('Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
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
        await suppliersApi.createSupplier(formData);
      } else if (modalMode === 'edit' && selectedSupplier) {
        await suppliersApi.updateSupplier(selectedSupplier.id, formData);
      }

      setShowModal(false);
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        tax_id: '',
        payment_terms: '',
        is_active: true
      });
      setSelectedSupplier(null);
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      setErrors({ general: 'Failed to save supplier' });
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (confirm(`Are you sure you want to delete "${supplier.name}"?`)) {
      try {
        await suppliersApi.deleteSupplier(supplier.id);
        fetchSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
        setError('Failed to delete supplier');
      }
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedSupplier(null);
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      tax_id: '',
      payment_terms: '',
      is_active: true
    });
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setModalMode('edit');
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      tax_id: supplier.tax_id || '',
      payment_terms: supplier.payment_terms || '',
      is_active: supplier.is_active
    });
    setErrors({});
    setShowModal(true);
  };

  const filteredSuppliers = searchQuery.trim() 
    ? suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (supplier.email && supplier.email.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : suppliers;

  const columns = [
    {
      key: 'name',
      label: 'Supplier',
      sortable: true,
      render: (value: any, row: Supplier) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
            {String(value).charAt(0)}
          </div>
          <div>
            <p className={`${themeClasses.text} font-medium`}>{value}</p>
            {row.contact_person && (
              <p className={`${themeClasses.textSecondary} text-sm`}>Contact: {row.contact_person}</p>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'contact_info',
      label: 'Contact',
      render: (value: any, row: Supplier) => (
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
      key: 'payment_terms',
      label: 'Payment Terms',
      render: (value: any, row: Supplier) => (
        <span className={`${themeClasses.textSecondary} text-sm`}>{value || 'Not specified'}</span>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value: any, row: Supplier) => (
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-red-500 mb-4">
            <AlertCircle size={48} className="mx-auto" />
          </div>
          <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>Error Loading Suppliers</h3>
          <p className={`${themeClasses.textSecondary} mb-4`}>{error}</p>
          <button
            onClick={fetchSuppliers}
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
          <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>Suppliers</h2>
          <p className={themeClasses.textSecondary}>Manage your suppliers and their information</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> Add Supplier
        </button>
      </div>

      <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden`}>
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 ${themeClasses.input} border rounded-xl px-4 py-2 flex-1`}>
              <Search className={themeClasses.textSecondary} size={20} />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-transparent ${themeClasses.text} outline-none flex-1`}
              />
            </div>
          </div>
        </div>
        <DataTable
          data={filteredSuppliers}
          columns={columns}
          isLoading={isLoading}
          actions={actions}
          themeClasses={themeClasses}
          isDark={isDark}
          emptyMessage={searchQuery ? "No suppliers found matching your search" : "No suppliers found"}
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
                {modalMode === 'create' ? 'Add Supplier' : 'Edit Supplier'}
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
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="Enter supplier name"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="Enter contact person name"
                  />
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

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Tax ID (KRA PIN)
                  </label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="Enter KRA PIN"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="e.g., Net 30, COD"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  rows={3}
                  className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                  placeholder="Enter supplier address"
                />
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
                  Supplier is active
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
                  {modalMode === 'create' ? 'Create Supplier' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};