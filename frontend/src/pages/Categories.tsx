import React, { useState, useEffect } from 'react';
import { Plus, Tag, Edit, Trash2, Search, X, AlertCircle } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { categoriesApi, type Category } from '../services/productsApi';

interface CategoriesProps {
  isDark: boolean;
  themeClasses: Record<string, string>;
}

export const Categories: React.FC<CategoriesProps> = ({ isDark, themeClasses }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await categoriesApi.getCategories();
      setCategories(response || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
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
        await categoriesApi.createCategory({
          name: formData.name,
          description: formData.description
        });
      } else if (modalMode === 'edit' && selectedCategory) {
        await categoriesApi.updateCategory(selectedCategory.id, {
          name: formData.name,
          description: formData.description
        });
      }

      setShowModal(false);
      setFormData({ name: '', description: '' });
      setSelectedCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      setErrors({ general: 'Failed to save category' });
    }
  };

  const handleDelete = async (category: Category) => {
    if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
      try {
        await categoriesApi.deleteCategory(category.id);
        fetchCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        setError('Failed to delete category');
      }
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedCategory(null);
    setFormData({ name: '', description: '' });
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setModalMode('edit');
    setSelectedCategory(category);
    setFormData({ 
      name: category.name, 
      description: category.description || '' 
    });
    setErrors({});
    setShowModal(true);
  };

  const filteredCategories = searchQuery.trim() 
    ? categories.filter(category =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : categories;

  const columns = [
    {
      key: 'name',
      label: 'Category Name',
      sortable: true,
      render: (value: any, row: Category) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
            {String(value).charAt(0)}
          </div>
          <div>
            <p className={`${themeClasses.text} font-medium`}>{value}</p>
            {row.description && (
              <p className={`${themeClasses.textSecondary} text-sm`}>{row.description}</p>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value: any, row: Category) => (
        <span>{new Date(value).toLocaleDateString()}</span>
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
          <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>Error Loading Categories</h3>
          <p className={`${themeClasses.textSecondary} mb-4`}>{error}</p>
          <button
            onClick={fetchCategories}
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
          <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>Categories</h2>
          <p className={themeClasses.textSecondary}>Manage product categories</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> Add Category
        </button>
      </div>

      <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden`}>
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 ${themeClasses.input} border rounded-xl px-4 py-2 flex-1`}>
              <Search className={themeClasses.textSecondary} size={20} />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-transparent ${themeClasses.text} outline-none flex-1`}
              />
            </div>
          </div>
        </div>
        <DataTable
          data={filteredCategories}
          columns={columns}
          isLoading={isLoading}
          actions={actions}
          themeClasses={themeClasses}
          isDark={isDark}
          emptyMessage={searchQuery ? "No categories found matching your search" : "No categories found"}
          searchable={false}
          filterable={false}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${themeClasses.card} border rounded-2xl shadow-2xl w-full max-w-md`}>
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <h2 className={`text-2xl font-bold ${themeClasses.text}`}>
                {modalMode === 'create' ? 'Add Category' : 'Edit Category'}
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

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Category Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                  placeholder="Enter category name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                  placeholder=")"
                />
             Enter description (optional </div>

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
                  {modalMode === 'create' ? 'Create Category' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};