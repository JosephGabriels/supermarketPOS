import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  ShoppingCart,
  Calendar,
  User,
  CreditCard,
  X
} from 'lucide-react';
import { salesApi } from '../services/salesApi';
import type { Sale, SaleItem } from '../services/salesApi';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface SalesProps {
  isDark: boolean;
  themeClasses: Record<string, string>;
}

export const Sales: React.FC<SalesProps> = ({ isDark, themeClasses }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await salesApi.getSales();
      // Handle both paginated and non-paginated responses
      const salesData = (response as any).data || (response as any).results || response;
      if (Array.isArray(salesData)) {
        setSales(salesData);
      } else {
        console.error('Unexpected sales data format:', response);
        setSales([]);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'completed': 'text-emerald-500 bg-emerald-500/10',
      'pending': 'text-amber-500 bg-amber-500/10',
      'cancelled': 'text-red-500 bg-red-500/10',
      'refunded': 'text-blue-500 bg-blue-500/10',
    };
    return colors[status] || 'text-gray-500 bg-gray-500/10';
  };

  const filteredSales = sales.filter(sale => 
    sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.customer_details?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !sales.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner themeClasses={themeClasses} isDark={isDark} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>Sales</h2>
          <p className={themeClasses.textSecondary}>View and manage sales transactions</p>
        </div>
      </div>

      <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden`}>
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 ${themeClasses.input} border rounded-xl px-4 py-2 flex-1`}>
              <Search className={themeClasses.textSecondary} size={20} />
              <input
                type="text"
                placeholder="Search sales by number or customer..."
                className={`bg-transparent ${themeClasses.text} outline-none flex-1`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className={`${themeClasses.hover} px-4 py-2 rounded-xl border ${themeClasses.card} flex items-center gap-2`}>
              <Filter size={20} className={themeClasses.text} /> Filter
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`${isDark ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Sale #</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Date</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Customer</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Cashier</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Items</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Total</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr 
                  key={sale.id} 
                  onClick={() => setSelectedSale(sale)}
                  className={`border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200'} ${themeClasses.hover} cursor-pointer transition-colors`}
                >
                  <td className={`p-4 ${themeClasses.text} font-medium`}>
                    {sale.sale_number}
                  </td>
                  <td className={`p-4 ${themeClasses.textSecondary}`}>
                    {new Date(sale.created_at).toLocaleString()}
                  </td>
                  <td className={`p-4 ${themeClasses.text}`}>
                    {sale.customer_details ? sale.customer_details.name : 'Walk-in Customer'}
                  </td>
                  <td className={`p-4 ${themeClasses.text}`}>
                    {sale.cashier_name}
                  </td>
                  <td className={`p-4 ${themeClasses.text}`}>
                    {sale.items.length}
                  </td>
                  <td className={`p-4 ${themeClasses.text} font-semibold`}>
                    <CurrencyDisplay amount={sale.total_amount} />
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sale.status)}`}>
                      {sale.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className={`p-8 text-center ${themeClasses.textSecondary}`}>
                    No sales found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`${themeClasses.card} w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="p-6 border-b border-gray-700/50 flex justify-between items-center sticky top-0 bg-inherit z-10">
              <div>
                <h3 className={`text-2xl font-bold ${themeClasses.text}`}>Sale Details</h3>
                <p className={themeClasses.textSecondary}>{selectedSale.sale_number}</p>
              </div>
              <button 
                onClick={() => setSelectedSale(null)}
                className={`p-2 rounded-lg ${themeClasses.hover}`}
              >
                <X size={24} className={themeClasses.text} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="text-violet-500" size={20} />
                    <span className={themeClasses.textSecondary}>Date & Time</span>
                  </div>
                  <p className={`font-semibold ${themeClasses.text} text-sm`}>
                    {new Date(selectedSale.created_at).toLocaleString()}
                  </p>
                </div>
                
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <User className="text-blue-500" size={20} />
                    <span className={themeClasses.textSecondary}>Customer</span>
                  </div>
                  <p className={`font-semibold ${themeClasses.text}`}>
                    {selectedSale.customer_details ? selectedSale.customer_details.name : 'Walk-in Customer'}
                  </p>
                </div>

                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <User className="text-pink-500" size={20} />
                    <span className={themeClasses.textSecondary}>Processed By</span>
                  </div>
                  <p className={`font-semibold ${themeClasses.text}`}>
                    {selectedSale.cashier_name}
                  </p>
                </div>

                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <CreditCard className="text-emerald-500" size={20} />
                    <span className={themeClasses.textSecondary}>Status</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedSale.status)}`}>
                    {selectedSale.status}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className={`text-lg font-semibold ${themeClasses.text} mb-4`}>Items Purchased</h4>
                <div className={`rounded-xl border ${isDark ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
                  <table className="w-full">
                    <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
                      <tr>
                        <th className={`text-left p-3 ${themeClasses.textSecondary} font-medium`}>Product</th>
                        <th className={`text-center p-3 ${themeClasses.textSecondary} font-medium`}>Qty</th>
                        <th className={`text-right p-3 ${themeClasses.textSecondary} font-medium`}>Price</th>
                        <th className={`text-right p-3 ${themeClasses.textSecondary} font-medium`}>Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {selectedSale.items.map((item: SaleItem) => (
                        <tr key={item.id}>
                          <td className={`p-3 ${themeClasses.text}`}>
                            {item.is_ad_hoc ? item.ad_hoc_name : item.product_name}
                          </td>
                          <td className={`p-3 text-center ${themeClasses.text}`}>
                            {item.quantity}
                          </td>
                          <td className={`p-3 text-right ${themeClasses.text}`}>
                            <CurrencyDisplay amount={item.unit_price} />
                          </td>
                          <td className={`p-3 text-right ${themeClasses.text} font-medium`}>
                            <CurrencyDisplay amount={item.subtotal} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
                      <tr>
                        <td colSpan={3} className={`p-3 text-right ${themeClasses.textSecondary}`}>Subtotal (Excl. Tax)</td>
                        <td className={`p-3 text-right ${themeClasses.text} font-semibold`}>
                          <CurrencyDisplay amount={(parseFloat(selectedSale.total_amount) - parseFloat(selectedSale.tax_amount)).toString()} />
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className={`p-3 text-right ${themeClasses.textSecondary}`}>Tax (16%)</td>
                        <td className={`p-3 text-right ${themeClasses.text} font-semibold`}>
                          <CurrencyDisplay amount={selectedSale.tax_amount} />
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className={`p-3 text-right ${themeClasses.textSecondary}`}>Discount</td>
                        <td className={`p-3 text-right text-red-500 font-semibold`}>
                          -<CurrencyDisplay amount={selectedSale.discount_amount} />
                        </td>
                      </tr>
                      <tr className="border-t border-gray-700">
                        <td colSpan={3} className={`p-4 text-right ${themeClasses.text} font-bold text-lg`}>Total</td>
                        <td className={`p-4 text-right ${themeClasses.text} font-bold text-lg`}>
                          <CurrencyDisplay amount={selectedSale.total_amount} />
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
