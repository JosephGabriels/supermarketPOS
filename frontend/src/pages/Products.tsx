import React, { useState, useEffect } from 'react';
import { Plus, Package, Edit, Trash2, Search, X, AlertCircle, Filter, Download } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay';
import { useAuth } from '../contexts/AuthContext';
import { productsApi, categoriesApi, type Product, type Category } from '../services/productsApi';
import { branchesApi, type Branch } from '../services/branchesApi';
import { suppliersApi, type Supplier } from '../services/suppliersApi';
import type { TableColumn } from '../types';

interface ProductsProps {
  isDark: boolean;
  themeClasses: Record<string, string>;
}

export const Products: React.FC<ProductsProps> = ({ isDark, themeClasses }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(50); // Adjust as needed
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: '',
    supplier: '',
    description: '',
    price: '',
    cost_price: '',
    stock_quantity: '',
    reorder_level: '',
    tax_rate: '16'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchProducts = async (params?: any) => {
    try {
      setIsLoading(true);
      setError(null);
      let branchId = user?.branch || undefined;
      if (user?.role === 'admin' && formData.branch) {
        branchId = parseInt(formData.branch);
      }
      const productsRes = await productsApi.getProducts({
        branch: branchId,
        ...params
      });
      
      if (productsRes && productsRes.data && Array.isArray(productsRes.data) && productsRes.pagination) {
        // Paginated response
        setProducts(productsRes.data);
        setTotalCount(productsRes.pagination.total);
      } else if (Array.isArray(productsRes)) {
        // Non-paginated array
        setProducts(productsRes);
        setTotalCount(productsRes.length);
      } else {
        setProducts([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products');
      setProducts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [categoriesRes, suppliersRes, branchesRes] = await Promise.all([
        categoriesApi.getCategories(),
        suppliersApi.getSuppliers(),
        user?.role === 'admin' ? branchesApi.getActiveBranches() : Promise.resolve([])
      ]);
      setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
      setSuppliers(Array.isArray(suppliersRes) ? suppliersRes : []);
      setBranches(Array.isArray(branchesRes) ? branchesRes : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    }
  };

  useEffect(() => {
    fetchData();
    fetchProducts({ page: currentPage, limit: pageSize });

    const onSale = () => {
      // Re-fetch products when a sale completes elsewhere
      fetchProducts({ page: currentPage, limit: pageSize });
    };
    window.addEventListener('saleCompleted', onSale as EventListener);
    return () => {
      window.removeEventListener('saleCompleted', onSale as EventListener);
    };
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search or category changes
    fetchProducts({ 
      page: 1, 
      limit: pageSize, 
      search: searchQuery || undefined,
      category: selectedCategory ? parseInt(selectedCategory) : undefined
    });
  }, [searchQuery, selectedCategory]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (!formData.barcode.trim()) {
      newErrors.barcode = 'Barcode is required';
    }
    if (!formData.price || isNaN(parseFloat(formData.price))) {
      newErrors.price = 'Valid price is required';
    }
    if (!formData.cost_price || isNaN(parseFloat(formData.cost_price))) {
      newErrors.cost_price = 'Valid cost price is required';
    }
    if (!formData.stock_quantity || isNaN(parseInt(formData.stock_quantity))) {
      newErrors.stock_quantity = 'Valid stock quantity is required';
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
      let branchId = user?.branch || 4;
      if (user?.role === 'admin' && formData.branch) {
        branchId = parseInt(formData.branch);
      }
      const submitData = {
        name: formData.name,
        barcode: formData.barcode,
        category_id: formData.category ? parseInt(formData.category) : null,
        supplier_id: formData.supplier ? parseInt(formData.supplier) : null,
        description: formData.description,
        price: formData.price,
        cost_price: formData.cost_price,
        stock_quantity: parseInt(formData.stock_quantity),
        reorder_level: formData.reorder_level ? parseInt(formData.reorder_level) : 0,
        tax_rate: formData.tax_rate,
        branch: branchId
      };

      if (modalMode === 'create') {
        await productsApi.createProduct(submitData);
      } else if (modalMode === 'edit' && selectedProduct) {
        await productsApi.updateProduct(selectedProduct.id, submitData);
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving product:', error);
      setErrors({ general: 'Failed to save product' });
    }
  };

  const handleDelete = async (product: Product) => {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        await productsApi.deleteProduct(product.id);
        fetchData();
      } catch (error) {
        console.error('Error deleting product:', error);
        setError('Failed to delete product');
      }
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedProduct(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setModalMode('edit');
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode,
      category: product.category ? String(product.category) : '',
      supplier: product.supplier ? String(product.supplier) : '',
      description: product.description,
      price: product.price,
      cost_price: product.cost_price,
      stock_quantity: String(product.stock_quantity),
      reorder_level: String(product.reorder_level),
      tax_rate: product.tax_rate
    });
    setErrors({});
    setShowModal(true);
  };

  const resetForm = () => {
      setFormData({
        name: '',
        barcode: '',
        category: '',
        supplier: '',
        description: '',
        price: '',
        cost_price: '',
        stock_quantity: '',
        reorder_level: '',
        tax_rate: '16',
        branch: user?.role === 'admin' ? '' : String(user?.branch || '')
      });
    setErrors({});
  };

  const displayProducts = products;

  const columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Product Name',
      sortable: true,
      render: (value: any, row: Product) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
            {String(value).charAt(0)}
          </div>
          <div>
            <p className={`${themeClasses.text} font-medium`}>{value}</p>
            <p className={`${themeClasses.textSecondary} text-sm`}>SKU: {(row as Product).barcode}</p>
          </div>
        </div>
      )
    },
    {
      key: 'category_details',
      label: 'Category',
      sortable: true,
      render: (value: any) => (
        <span className={themeClasses.text}>
          {value?.name || 'Uncategorized'}
        </span>
      )
    },
    {
      key: 'price',
      label: 'Selling Price',
      sortable: true,
      render: (value: any) => (
        <span className={`${themeClasses.text} font-medium`}>
          <CurrencyDisplay amount={value} />
        </span>
      )
    },
    {
      key: 'cost_price',
      label: 'Cost Price',
      render: (value: any) => (
        <span className={themeClasses.textSecondary}>
          <CurrencyDisplay amount={value} />
        </span>
      )
    },
    {
      key: 'stock_quantity',
      label: 'Stock',
      sortable: true,
      render: (value: any, row: Product) => {
        const quantity = parseInt(String(value));
        const isLowStock = quantity <= (row as Product).reorder_level;
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            quantity === 0 
              ? 'bg-red-500/10 text-red-500'
              : isLowStock 
              ? 'bg-amber-500/10 text-amber-500'
              : 'bg-emerald-500/10 text-emerald-500'
          }`}>
            {quantity} units
          </span>
        );
      }
    },
    {
      key: 'supplier_details',
      label: 'Supplier',
      render: (value: any) => (
        <span className={themeClasses.textSecondary}>
          {value?.name || 'N/A'}
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
          <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>Error Loading Products</h3>
          <p className={`${themeClasses.textSecondary} mb-4`}>{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const canManageProducts = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>Products</h2>
          <p className={themeClasses.textSecondary}>Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <button className={`${themeClasses.hover} px-4 py-2 rounded-xl border ${themeClasses.card} flex items-center gap-2`}>
            <Download size={20} className={themeClasses.text} /> Export
          </button>
          {canManageProducts && (
            <button 
              onClick={openCreateModal}
              className="px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2"
            >
              <Plus size={20} /> Add Product
            </button>
          )}
        </div>
      </div>

      <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden`}>
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className={`flex items-center gap-3 ${themeClasses.input} border rounded-xl px-4 py-2 flex-1`}>
              <Search className={themeClasses.textSecondary} size={20} />
              <input
                type="text"
                placeholder="Search by name or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-transparent ${themeClasses.text} outline-none flex-1`}
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`${themeClasses.input} border rounded-xl px-4 py-2 ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
        <DataTable
          data={displayProducts}
          columns={columns}
          isLoading={isLoading}
          actions={canManageProducts ? actions : []}
          themeClasses={themeClasses}
          isDark={isDark}
          emptyMessage={searchQuery || selectedCategory ? "No products found matching your criteria" : "No products found"}
          pageSize={20}
          searchable={false}
          filterable={false}
        />

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <div className={`text-sm ${themeClasses.textSecondary}`}>
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} products
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  currentPage === 1
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : `${themeClasses.button} ${themeClasses.buttonHover}`
                }`}
              >
                Previous
              </button>
              <span className={`text-sm ${themeClasses.textSecondary}`}>
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / pageSize), prev + 1))}
                disabled={currentPage === Math.ceil(totalCount / pageSize)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  currentPage === Math.ceil(totalCount / pageSize)
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : `${themeClasses.button} ${themeClasses.buttonHover}`
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${themeClasses.card} border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50 sticky top-0">
              <h2 className={`text-2xl font-bold ${themeClasses.text}`}>
                {modalMode === 'create' ? 'Add Product' : 'Edit Product'}
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
                {user?.role === 'admin' && (
                  <div>
                    <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                      Branch *
                    </label>
                    <select
                      value={formData.branch || ''}
                      onChange={e => setFormData(prev => ({ ...prev, branch: e.target.value }))}
                      className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                      required
                    >
                      <option value="">Select branch</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="Enter product name"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Barcode/SKU *
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="Enter barcode"
                  />
                  {errors.barcode && <p className="text-red-500 text-sm mt-1">{errors.barcode}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Supplier
                  </label>
                  <select
                    value={formData.supplier}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={String(sup.id)}>{sup.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Selling Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="0.00"
                  />
                  {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Cost Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost_price: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="0.00"
                  />
                  {errors.cost_price && <p className="text-red-500 text-sm mt-1">{errors.cost_price}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="0"
                  />
                  {errors.stock_quantity && <p className="text-red-500 text-sm mt-1">{errors.stock_quantity}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, reorder_level: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: e.target.value }))}
                    className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="0"
                  />
                </div>
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
                  placeholder="Enter product description (optional)"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700/50">
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
                  {modalMode === 'create' ? 'Create Product' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
