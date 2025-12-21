import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Download,
  Upload,
  Filter,
  Search,
  MoreVertical,
  Truck,
  FileText,
  Calendar,
  BarChart3
} from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorBoundary';
import { LazyWrapper } from '../components/ui/LazyWrapper';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay';
import type { TableColumn } from '../types';
import { productsApi } from '../services/productsApi';
import { suppliersApi } from '../services/suppliersApi';
import { stockMovementsApi } from '../services/productsApi';
import type { Product, StockMovement } from '../services/productsApi';
import type { Supplier } from '../services/suppliersApi';

export const Inventory: React.FC<{ isDark: boolean; themeClasses: Record<string, string> }> = ({
  isDark,
  themeClasses
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Real data states
  const [products, setProducts] = useState<Product[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const inventoryStats = {
    totalItems: products.length,
    lowStock: products.filter(item => item.is_low_stock).length,
    outOfStock: products.filter(item => item.stock_quantity === 0).length,
    totalValue: products.reduce((sum, item) => sum + (parseFloat(item.price) * item.stock_quantity), 0),
    reorderNeeded: products.filter(item => item.is_low_stock).length
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'items', label: 'Items', icon: Package },
    { id: 'movements', label: 'Stock Movements', icon: TrendingUp },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [productsRes, movementsRes, suppliersRes] = await Promise.all([
          productsApi.getProducts(),
          stockMovementsApi.getStockMovements(),
          suppliersApi.getSuppliers()
        ]);
        setProducts(productsRes || []);
        setStockMovements(movementsRes || []);
        setSuppliers(suppliersRes || []);
      } catch (err) {
        setError('Failed to load inventory data');
        console.error('Error fetching inventory data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStockStatus = (item: Product) => {
    if (item.stock_quantity === 0) return { label: 'Out of Stock', color: 'text-red-500 bg-red-500/10', icon: AlertTriangle };
    if (item.is_low_stock) return { label: 'Low Stock', color: 'text-amber-500 bg-amber-500/10', icon: TrendingDown };
    return { label: 'In Stock', color: 'text-emerald-500 bg-emerald-500/10', icon: TrendingUp };
  };

  const handleStockAdjustment = async (itemId: number, quantity: number, reason: string) => {
    setIsLoading(true);
    try {
      await productsApi.adjustStock(itemId, { quantity, reason, movement_type: 'adjustment' });
      // Refresh products data
      const productsRes = await productsApi.getProducts();
      setProducts(productsRes || []);
      // Refresh movements
      const movementsRes = await stockMovementsApi.getStockMovements();
      setStockMovements(movementsRes || []);
    } catch (error) {
      setError('Failed to update stock');
      console.error('Stock adjustment error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Table columns for inventory items
  const itemColumns: TableColumn[] = [
    {
      key: 'name',
      label: 'Product',
      sortable: true,
      render: (value, row) => {
        const item = row as Product;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
              {String(value).charAt(0)}
            </div>
            <div>
              <p className={`${themeClasses.text} font-medium`}>{String(value)}</p>
              <p className={`${themeClasses.textSecondary} text-sm`}>Barcode: {item.barcode}</p>
            </div>
          </div>
        );
      }
    },
    {
      key: 'stock_quantity',
      label: 'Stock Level',
      sortable: true,
      render: (value, row) => {
        const item = row as Product;
        const status = getStockStatus(item);
        const Icon = status.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon size={16} className={status.color.split(' ')[0]} />
            <span className={`${themeClasses.text} font-medium`}>{String(value)}</span>
          </div>
        );
      }
    },
    {
      key: 'reorder_level',
      label: 'Reorder Point',
      render: (value) => (
        <span className={`${themeClasses.textSecondary} text-sm`}>
          {String(value)}
        </span>
      )
    },
    {
      key: 'supplier_name',
      label: 'Supplier',
      sortable: true
    },
    {
      key: 'price',
      label: 'Price',
      render: (value) => (
        <span className={`${themeClasses.text} font-medium`}>
          <CurrencyDisplay amount={String(value)} />
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value, row) => {
        const item = row as Product;
        const status = getStockStatus(item);
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
            {status.label}
          </span>
        );
      }
    }
  ];

  const actionButtons = [
    {
      label: 'Adjust Stock',
      icon: ({ size, className }: { size?: number; className?: string }) => (
        <Package className={className} size={size} />
      ),
      action: (item: Product) => {
        const adjustment = prompt(`Current stock: ${item.stock_quantity}\nEnter adjustment quantity (positive to add, negative to subtract):`, '0');
        if (adjustment && !isNaN(Number(adjustment))) {
          const reason = prompt('Reason for adjustment:') || 'Manual adjustment';
          handleStockAdjustment(item.id, Number(adjustment), reason);
        }
      },
      variant: 'primary' as const
    }
  ];

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorMessage
          title="Error loading inventory"
          message={error}
          onRetry={() => setError(null)}
          themeClasses={themeClasses}
          isDark={isDark}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>Inventory Management</h2>
          <p className={themeClasses.textSecondary}>Track and manage your inventory levels</p>
        </div>
        <div className="flex items-center gap-3">
          <button className={`${themeClasses.hover} px-4 py-2 rounded-xl border ${themeClasses.card} flex items-center gap-2`}>
            <Upload size={20} className={themeClasses.text} /> Import
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2">
            <Download size={20} /> Export
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              selectedTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-violet-500 shadow-sm'
                : `${themeClasses.textSecondary} hover:${themeClasses.text}`
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <>
          {/* Inventory Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <LazyWrapper themeClasses={themeClasses} isDark={isDark}>
              <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center">
                    <Package className="text-white" size={24} />
                  </div>
                  <div>
                    <p className={`${themeClasses.textSecondary} text-sm`}>Total Items</p>
                    <p className={`text-2xl font-bold ${themeClasses.text}`}>{inventoryStats.totalItems}</p>
                  </div>
                </div>
              </div>
            </LazyWrapper>

            <LazyWrapper themeClasses={themeClasses} isDark={isDark}>
              <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="text-white" size={24} />
                  </div>
                  <div>
                    <p className={`${themeClasses.textSecondary} text-sm`}>Low Stock</p>
                    <p className={`text-2xl font-bold ${themeClasses.text}`}>{inventoryStats.lowStock}</p>
                  </div>
                </div>
              </div>
            </LazyWrapper>

            <LazyWrapper themeClasses={themeClasses} isDark={isDark}>
              <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                    <TrendingDown className="text-white" size={24} />
                  </div>
                  <div>
                    <p className={`${themeClasses.textSecondary} text-sm`}>Out of Stock</p>
                    <p className={`text-2xl font-bold ${themeClasses.text}`}>{inventoryStats.outOfStock}</p>
                  </div>
                </div>
              </div>
            </LazyWrapper>

            <LazyWrapper themeClasses={themeClasses} isDark={isDark}>
              <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-white" size={24} />
                  </div>
                  <div>
                    <p className={`${themeClasses.textSecondary} text-sm`}>Total Value</p>
                    <p className={`text-2xl font-bold ${themeClasses.text}`}>
                      <CurrencyDisplay amount={inventoryStats.totalValue} showCents={false} />
                    </p>
                  </div>
                </div>
              </div>
            </LazyWrapper>

            <LazyWrapper themeClasses={themeClasses} isDark={isDark}>
              <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Calendar className="text-white" size={24} />
                  </div>
                  <div>
                    <p className={`${themeClasses.textSecondary} text-sm`}>Need Reorder</p>
                    <p className={`text-2xl font-bold ${themeClasses.text}`}>{inventoryStats.reorderNeeded}</p>
                  </div>
                </div>
              </div>
            </LazyWrapper>
          </div>

          {/* Recent Stock Movements */}
          <LazyWrapper themeClasses={themeClasses} isDark={isDark}>
            <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-bold ${themeClasses.text}`}>Recent Stock Movements</h3>
                <button className={`${themeClasses.hover} px-3 py-1 rounded-lg text-sm`}>
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {stockMovements.slice(0, 5).map(movement => (
                  <div key={movement.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        movement.movement_type === 'purchase' || movement.movement_type === 'return' ? 'bg-emerald-500/20' :
                        movement.movement_type === 'sale' || movement.movement_type === 'damage' ? 'bg-red-500/20' : 'bg-amber-500/20'
                      }`}>
                        {movement.movement_type === 'purchase' || movement.movement_type === 'return' ? <Plus size={16} className="text-emerald-500" /> :
                         movement.movement_type === 'sale' || movement.movement_type === 'damage' ? <Minus size={16} className="text-red-500" /> :
                         <Package size={16} className="text-amber-500" />}
                      </div>
                      <div>
                        <p className={`${themeClasses.text} font-medium`}>{movement.product_name}</p>
                        <p className={`${themeClasses.textSecondary} text-sm`}>{movement.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`${themeClasses.text} font-medium`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </p>
                      <p className={`${themeClasses.textSecondary} text-sm`}>{new Date(movement.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </LazyWrapper>
        </>
      )}

      {/* Items Tab */}
      {selectedTab === 'items' && (
        <DataTable
          data={products}
          columns={itemColumns}
          isLoading={isLoading}
          actions={actionButtons}
          themeClasses={themeClasses}
          isDark={isDark}
          emptyMessage="No inventory items found"
          pageSize={20}
        />
      )}

      {/* Stock Movements Tab */}
      {selectedTab === 'movements' && (
        <LazyWrapper themeClasses={themeClasses} isDark={isDark}>
          <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden`}>
            <div className="p-6 border-b border-gray-700/50">
              <h3 className={`text-xl font-bold ${themeClasses.text} mb-2`}>Stock Movements</h3>
              <p className={themeClasses.textSecondary}>Track all inventory changes and movements</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${isDark ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                    <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Product</th>
                    <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Type</th>
                    <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Quantity</th>
                    <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Reason</th>
                    <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Date</th>
                    <th className={`${themeClasses.text} text-left p-4 font-semibold`}>User</th>
                  </tr>
                </thead>
                <tbody>
                  {stockMovements.map((movement) => (
                    <tr key={movement.id} className={`border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200'} ${themeClasses.hover}`}>
                      <td className="p-4">
                        <p className={`${themeClasses.text} font-medium`}>{movement.product_name}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          movement.movement_type === 'purchase' ? 'bg-emerald-500/20 text-emerald-500' :
                          movement.movement_type === 'sale' ? 'bg-red-500/20 text-red-500' :
                          movement.movement_type === 'adjustment' ? 'bg-amber-500/20 text-amber-500' :
                          'bg-blue-500/20 text-blue-500'
                        }`}>
                          {movement.movement_type}
                        </span>
                      </td>
                      <td className={`p-4 ${themeClasses.text} font-medium`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </td>
                      <td className={`p-4 ${themeClasses.textSecondary} text-sm`}>
                        {movement.reason}
                      </td>
                      <td className={`p-4 ${themeClasses.textSecondary} text-sm`}>
                        {new Date(movement.created_at).toLocaleString()}
                      </td>
                      <td className={`p-4 ${themeClasses.textSecondary} text-sm`}>
                        {movement.created_by_name || 'System'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </LazyWrapper>
      )}

      {/* Suppliers Tab */}
      {selectedTab === 'suppliers' && (
        <LazyWrapper themeClasses={themeClasses} isDark={isDark}>
          <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden`}>
            <div className="p-6 border-b border-gray-700/50">
              <h3 className={`text-xl font-bold ${themeClasses.text} mb-2`}>Suppliers</h3>
              <p className={themeClasses.textSecondary}>Manage your supplier relationships</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${isDark ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                    <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Supplier</th>
                    <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Contact</th>
                    <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Contact Person</th>
                    <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Status</th>
                    <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className={`border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200'} ${themeClasses.hover}`}>
                      <td className="p-4">
                        <div>
                          <p className={`${themeClasses.text} font-medium`}>{supplier.name}</p>
                          <p className={`${themeClasses.textSecondary} text-sm`}>{supplier.address}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className={`${themeClasses.text} text-sm`}>{supplier.email}</p>
                          <p className={`${themeClasses.textSecondary} text-sm`}>{supplier.phone}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`${themeClasses.text} text-sm`}>{supplier.contact_person || 'N/A'}</span>
                      </td>
                      <td className={`p-4 ${themeClasses.text}`}>{supplier.is_active ? 'Active' : 'Inactive'}</td>
                      <td className="p-4">
                        <button className={`${themeClasses.hover} p-2 rounded-lg`}>
                          <MoreVertical className={themeClasses.text} size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </LazyWrapper>
      )}

      {/* Reports Tab */}
      {selectedTab === 'reports' && (
        <LazyWrapper themeClasses={themeClasses} isDark={isDark}>
          <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
            <h3 className={`text-xl font-bold ${themeClasses.text} mb-4`}>Inventory Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button className={`${themeClasses.hover} p-4 rounded-xl border ${themeClasses.card} text-left`}>
                <FileText className="text-violet-500 mb-2" size={24} />
                <h4 className={`${themeClasses.text} font-medium`}>Stock Alerts</h4>
                <p className={`${themeClasses.textSecondary} text-sm`}>Items below reorder level</p>
              </button>
              <button className={`${themeClasses.hover} p-4 rounded-xl border ${themeClasses.card} text-left`}>
                <BarChart3 className="text-emerald-500 mb-2" size={24} />
                <h4 className={`${themeClasses.text} font-medium`}>Movement History</h4>
                <p className={`${themeClasses.textSecondary} text-sm`}>Stock changes over time</p>
              </button>
              <button className={`${themeClasses.hover} p-4 rounded-xl border ${themeClasses.card} text-left`}>
                <Calendar className="text-amber-500 mb-2" size={24} />
                <h4 className={`${themeClasses.text} font-medium`}>Monthly Summary</h4>
                <p className={`${themeClasses.textSecondary} text-sm`}>Inventory performance</p>
              </button>
            </div>
          </div>
        </LazyWrapper>
      )}
    </div>
  );
};