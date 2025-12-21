import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Package,
  DollarSign,
  Tag,
  AlertCircle,
  Check,
  Barcode
} from 'lucide-react';
import type { Product, Category, SupplierInfo, BranchInfo } from '../../services/productsApi';
import { productsApi, categoriesApi } from '../../services/productsApi';
import { suppliersApi } from '../../services/suppliersApi';
import { branchesApi } from '../../services/branchesApi';
import { useAuth } from '../../contexts/AuthContext';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  mode: 'create' | 'edit' | 'view';
  themeClasses: Record<string, string>;
  isDark: boolean;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  barcode: string;
  category_id: number | null;
  supplier_id: number | null;
  branch_id: number | null;
  description: string;
  price: string;
  cost_price: string;
  stock_quantity: number;
  reorder_level: number;
  tax_rate: string;
  is_active: boolean;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  mode,
  themeClasses,
  onSuccess
}) => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    barcode: '',
    category_id: null,
    supplier_id: null,
    branch_id: null,
    description: '',
    price: '',
    cost_price: '',
    stock_quantity: 0,
    reorder_level: 10,
    tax_rate: '16.00',
    is_active: true
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierInfo[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
      if (product && mode !== 'create') {
        populateForm(product);
      } else {
        resetForm();
      }
    }
  }, [isOpen, product, mode]);

  const loadDropdownData = async () => {
    try {
      setIsLoadingOptions(true);
      setErrors({});

      const [categoriesRes, suppliersRes, branchesRes] = await Promise.all([
        categoriesApi.getCategories(),
        suppliersApi.getSuppliers(),
        branchesApi.getBranches()
      ]);

      setCategories(categoriesRes || []);
      setSuppliers(suppliersRes || []);
      setBranches(branchesRes || []);
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
      setErrors({ general: 'Failed to load dropdown data' });
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const populateForm = (prod: Product) => {
    setFormData({
      name: prod.name || '',
      barcode: prod.barcode || '',
      category_id: prod.category || null,
      supplier_id: prod.supplier || null,
      branch_id: prod.branch || null,
      description: prod.description || '',
      price: prod.price || '',
      cost_price: prod.cost_price || '',
      stock_quantity: prod.stock_quantity || 0,
      reorder_level: prod.reorder_level || 10,
      tax_rate: prod.tax_rate || '16.00',
      is_active: prod.is_active ?? true
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      barcode: generateBarcode(),
      category_id: null,
      supplier_id: null,
      branch_id: user?.branch?.id || null,
      description: '',
      price: '',
      cost_price: '',
      stock_quantity: 0,
      reorder_level: 10,
      tax_rate: '16.00',
      is_active: true
    });
  };

  const generateBarcode = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PRD${timestamp}${random}`;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.barcode.trim()) {
      newErrors.barcode = 'Barcode is required';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid selling price is required';
    }

    if (!formData.cost_price || parseFloat(formData.cost_price) < 0) {
      newErrors.cost_price = 'Valid cost price is required';
    }

    if (parseFloat(formData.price) < parseFloat(formData.cost_price)) {
      newErrors.price = 'Selling price cannot be less than cost price';
    }

    if (formData.stock_quantity < 0) {
      newErrors.stock_quantity = 'Stock quantity cannot be negative';
    }

    if (formData.reorder_level < 0) {
      newErrors.reorder_level = 'Reorder level cannot be negative';
    }

    const selectedBranchId = formData.branch_id || user?.branch?.id;
    if (!selectedBranchId) {
      newErrors.branch = 'Branch is required';
    }

    const taxRate = parseFloat(formData.tax_rate);
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      newErrors.tax_rate = 'Tax rate must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const selectedBranchId = formData.branch_id || user?.branch?.id;
    if (!selectedBranchId) {
      setErrors({ branch: 'Branch selection is required' });
      return;
    }

    setIsLoading(true);
    
    try {
      const productData = {
        name: formData.name,
        barcode: formData.barcode,
        category_id: formData.category_id || undefined,
        supplier_id: formData.supplier_id || undefined,
        branch: selectedBranchId,
        description: formData.description,
        price: formData.price,
        cost_price: formData.cost_price,
        stock_quantity: Number(formData.stock_quantity),
        reorder_level: Number(formData.reorder_level),
        tax_rate: formData.tax_rate,
        is_active: formData.is_active
      };

      if (mode === 'create') {
        await productsApi.createProduct(productData);
      } else if (mode === 'edit' && product) {
        await productsApi.updateProduct(product.id, productData);
      }

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving product:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Failed to save product' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const modalTitle = mode === 'create' ? 'Add New Product' : mode === 'edit' ? 'Edit Product' : 'Product Details';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`${themeClasses.card} border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50 flex-shrink-0">
          <h2 className={`text-2xl font-bold ${themeClasses.text}`}>{modalTitle}</h2>
          <button
            onClick={onClose}
            className={`${themeClasses.hover} p-2 rounded-lg`}
          >
            <X className={themeClasses.text} size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {errors.general && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle size={20} />
                <span>{errors.general}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className={`${themeClasses.card} border rounded-xl p-6`}>
                  <h3 className={`text-lg font-semibold ${themeClasses.text} mb-4 flex items-center gap-2`}>
                    <Package size={20} />
                    Basic Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                        Product Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        disabled={isReadOnly}
                        className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500 ${isReadOnly ? 'opacity-60' : ''}`}
                        placeholder="Enter product name"
                      />
                      {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                        Barcode *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.barcode}
                          onChange={(e) => handleInputChange('barcode', e.target.value)}
                          disabled={isReadOnly}
                          className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500 ${isReadOnly ? 'opacity-60' : ''}`}
                          placeholder="Enter or scan barcode"
                        />
                        <Barcode className={`absolute right-3 top-3 ${themeClasses.textSecondary}`} size={20} />
                      </div>
                      {errors.barcode && <p className="text-red-500 text-sm mt-1">{errors.barcode}</p>}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                        Category
                      </label>
                      {isLoadingOptions ? (
                        <div className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} opacity-60`}>
                          Loading...
                        </div>
                      ) : (
                        <select
                          value={formData.category_id || ''}
                          onChange={(e) => handleInputChange('category_id', e.target.value ? Number(e.target.value) : null)}
                          disabled={isReadOnly}
                          className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500 ${isReadOnly ? 'opacity-60' : ''}`}
                        >
                          <option value="">Select category</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      )}
                      {errors.categories && <p className="text-red-500 text-sm mt-1">{errors.categories}</p>}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                        Supplier
                      </label>
                      {isLoadingOptions ? (
                        <div className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} opacity-60`}>
                          Loading...
                        </div>
                      ) : (
                        <select
                          value={formData.supplier_id || ''}
                          onChange={(e) => handleInputChange('supplier_id', e.target.value ? Number(e.target.value) : null)}
                          disabled={isReadOnly}
                          className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500 ${isReadOnly ? 'opacity-60' : ''}`}
                        >
                          <option value="">Select supplier (optional)</option>
                          {suppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {errors.suppliers && <p className="text-red-500 text-sm mt-1">{errors.suppliers}</p>}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        disabled={isReadOnly}
                        className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500 ${isReadOnly ? 'opacity-60' : ''}`}
                        placeholder="Enter product description"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div className={`${themeClasses.card} border rounded-xl p-6`}>
                  <h3 className={`text-lg font-semibold ${themeClasses.text} mb-4 flex items-center gap-2`}>
                    <DollarSign size={20} />
                    Pricing & Tax
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                        Selling Price *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        disabled={isReadOnly}
                        className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500 ${isReadOnly ? 'opacity-60' : ''}`}
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
                        min="0"
                        value={formData.cost_price}
                        onChange={(e) => handleInputChange('cost_price', e.target.value)}
                        disabled={isReadOnly}
                        className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500 ${isReadOnly ? 'opacity-60' : ''}`}
                        placeholder="0.00"
                      />
                      {errors.cost_price && <p className="text-red-500 text-sm mt-1">{errors.cost_price}</p>}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                        Tax Rate (%) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.tax_rate}
                        onChange={(e) => handleInputChange('tax_rate', e.target.value)}
                        disabled={isReadOnly}
                        className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500 ${isReadOnly ? 'opacity-60' : ''}`}
                        placeholder="16.00"
                      />
                      {errors.tax_rate && <p className="text-red-500 text-sm mt-1">{errors.tax_rate}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className={`${themeClasses.card} border rounded-xl p-6`}>
                  <h3 className={`text-lg font-semibold ${themeClasses.text} mb-4 flex items-center gap-2`}>
                    <Tag size={20} />
                    Stock Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                        Stock Quantity *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stock_quantity}
                        onChange={(e) => handleInputChange('stock_quantity', parseInt(e.target.value) || 0)}
                        disabled={isReadOnly}
                        className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500 ${isReadOnly ? 'opacity-60' : ''}`}
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
                        min="0"
                        value={formData.reorder_level}
                        onChange={(e) => handleInputChange('reorder_level', parseInt(e.target.value) || 0)}
                        disabled={isReadOnly}
                        className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500 ${isReadOnly ? 'opacity-60' : ''}`}
                        placeholder="10"
                      />
                      {errors.reorder_level && <p className="text-red-500 text-sm mt-1">{errors.reorder_level}</p>}
                    </div>
                  </div>
                </div>

                {!isReadOnly && (
                  <div className={`${themeClasses.card} border rounded-xl p-6`}>
                    <h3 className={`text-lg font-semibold ${themeClasses.text} mb-4 flex items-center gap-2`}>
                      <Check size={20} />
                      Status
                    </h3>
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.is_active}
                        onChange={(e) => handleInputChange('is_active', e.target.checked)}
                        disabled={isReadOnly}
                        className="rounded"
                      />
                      <label htmlFor="isActive" className={`${themeClasses.text} cursor-pointer`}>
                        Product is active and available for sale
                      </label>
                    </div>
                  </div>
                )}

                <div className={`${themeClasses.card} border rounded-xl p-6`}>
                  <h3 className={`text-lg font-semibold ${themeClasses.text} mb-4 flex items-center gap-2`}>
                    <Package size={20} />
                    Branch Information
                  </h3>
                  
                  <div>
                    <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                      Branch *
                    </label>
                    {isLoadingOptions ? (
                      <div className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} opacity-60`}>
                        Loading...
                      </div>
                    ) : (
                      <select
                        value={formData.branch_id || ''}
                        onChange={(e) => handleInputChange('branch_id', e.target.value ? Number(e.target.value) : null)}
                        disabled={isReadOnly || (user?.role === 'cashier')}
                        className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500 ${isReadOnly || (user?.role === 'cashier') ? 'opacity-60' : ''}`}
                      >
                        <option value="">Select branch</option>
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                    )}
                    {errors.branch && <p className="text-red-500 text-sm mt-1">{errors.branch}</p>}
                    {errors.branches && <p className="text-red-500 text-sm mt-1">{errors.branches}</p>}
                    {user?.role === 'cashier' && (
                      <p className={`${themeClasses.textSecondary} text-xs mt-1`}>
                        Your branch is automatically selected
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-700/50 flex-shrink-0">
          <button
            onClick={onClose}
            className={`px-6 py-3 ${themeClasses.hover} border ${themeClasses.card} rounded-xl ${themeClasses.text} font-medium`}
          >
            {mode === 'view' ? 'Close' : 'Cancel'}
          </button>
          
          {mode !== 'view' && (
            <button
              onClick={handleSubmit}
              disabled={isLoading || isLoadingOptions}
              className="px-6 py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  {mode === 'create' ? 'Create Product' : 'Save Changes'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
