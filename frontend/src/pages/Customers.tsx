import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Star,
  Users,
  CheckCircle,
  Award
} from 'lucide-react';
import type { Customer } from '../types';
import { Button } from '../components/ui/Button';
import { customersApi, type CreateCustomerData, type UpdateCustomerData } from '../services/customersApi';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay';
import CreateEditCustomerModal from '../components/modals/CreateEditCustomerModal';
import DeleteCustomerModal from '../components/modals/DeleteCustomerModal';

interface CustomersProps {
  isDark: boolean;
  themeClasses: Record<string, string>;
}

export const Customers: React.FC<CustomersProps> = ({ isDark, themeClasses }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch customers from API
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await customersApi.getCustomers();
      setCustomers(response.data || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  // Load customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers based on search query
  const filteredCustomers = searchQuery.trim()
    ? customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery) ||
        (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : customers;

  const getStatusColor = (customer: Customer): string => {
    return customer.is_active ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-500 bg-gray-500/10';
  };

  const getTierColor = (tier: string): string => {
    const colors: Record<string, string> = {
      'bronze': 'text-amber-600 bg-amber-100',
      'silver': 'text-gray-600 bg-gray-100',
      'gold': 'text-yellow-600 bg-yellow-100',
    };
    return colors[tier] || 'text-gray-500 bg-gray-100';
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Handlers
  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setIsEditMode(false);
    setIsCreateModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditMode(true);
    setIsCreateModalOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  const handleSaveCustomer = async (data: CreateCustomerData | UpdateCustomerData) => {
    try {
      if (isEditMode && selectedCustomer) {
        await customersApi.updateCustomer(selectedCustomer.id, data);
      } else {
        await customersApi.createCustomer(data as CreateCustomerData);
      }
      await fetchCustomers();
      return { success: true };
    } catch (err) {
      console.error('Failed to save customer:', err);
      return { success: false, error: 'Failed to save customer' };
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return;
    try {
      await customersApi.deleteCustomer(selectedCustomer.id);
      await fetchCustomers();
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error('Failed to delete customer:', err);
    }
  };

  // Calculate stats
  const totalCustomers = filteredCustomers.length;
  const activeCustomers = filteredCustomers.filter(c => c.is_active).length;
  const vipCustomers = filteredCustomers.filter(c => c.tier === 'gold').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner themeClasses={themeClasses} isDark={isDark} size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${themeClasses.card} border rounded-2xl p-8 text-center`}>
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={fetchCustomers} 
          className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>Customers</h2>
          <p className={themeClasses.textSecondary}>Manage your customer database</p>
        </div>
        <Button className="flex items-center gap-2" onClick={handleCreateCustomer}>
          <Plus size={20} /> Add Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center">
              <Users className="text-white" size={24} />
            </div>
            <div>
              <p className={`${themeClasses.textSecondary} text-sm`}>Total Customers</p>
              <p className={`text-2xl font-bold ${themeClasses.text}`}>{totalCustomers}</p>
            </div>
          </div>
        </div>
        <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="text-white" size={24} />
            </div>
            <div>
              <p className={`${themeClasses.textSecondary} text-sm`}>Active</p>
              <p className={`text-2xl font-bold ${themeClasses.text}`}>{activeCustomers}</p>
            </div>
          </div>
        </div>
        <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
              <Award className="text-white" size={24} />
            </div>
            <div>
              <p className={`${themeClasses.textSecondary} text-sm`}>Gold Tier</p>
              <p className={`text-2xl font-bold ${themeClasses.text}`}>{vipCustomers}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden`}>
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 ${themeClasses.input} border rounded-xl px-4 py-2 flex-1`}>
              <Search className={themeClasses.textSecondary} size={20} />
              <input
                type="text"
                placeholder="Search customers by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className={`bg-transparent ${themeClasses.text} outline-none flex-1`}
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter size={20} /> Filter
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`${isDark ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Customer</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Contact</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Lifetime Purchases</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Loyalty Points</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Tier</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Status</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className={`border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200'} ${themeClasses.hover}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-gradient-to-br from-violet-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold`}>
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <span className={`${themeClasses.text} font-medium`}>{customer.name}</span>
                        <p className={`${themeClasses.textSecondary} text-sm`}>Since {new Date(customer.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`p-4 ${themeClasses.textSecondary}`}>
                    <div>
                      <p>{customer.email || 'No email'}</p>
                      <p className="text-sm">{customer.phone}</p>
                    </div>
                  </td>
                  <td className={`p-4 ${themeClasses.text} font-semibold`}>
                    <CurrencyDisplay amount={customer.lifetime_purchases} />
                  </td>
                  <td className={`p-4 ${themeClasses.text}`}>{customer.total_points}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierColor(customer.tier)}`}>
                      {customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(customer)}`}>
                      {customer.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button 
                        className={`${themeClasses.hover} p-2 rounded-lg`}
                        onClick={() => handleEditCustomer(customer)}
                      >
                        <Edit size={18} className={themeClasses.text} />
                      </button>
                      <button 
                        className={`${themeClasses.hover} p-2 rounded-lg`}
                        onClick={() => handleDeleteCustomer(customer)}
                      >
                        <Trash2 size={18} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CreateEditCustomerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleSaveCustomer}
        customer={selectedCustomer}
        isEdit={isEditMode}
        themeClasses={themeClasses}
        isDark={isDark}
      />

      <DeleteCustomerModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        customer={selectedCustomer}
        themeClasses={themeClasses}
        isDark={isDark}
      />
    </div>
  );
};