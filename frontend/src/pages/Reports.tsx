import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  Calendar,
  BarChart3,
  PieChart,
  File,
  RefreshCw,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { reportsApi } from '../services/reportsApi';
import { customersApi } from '../services/customersApi';

interface ReportsProps {
  isDark: boolean;
  themeClasses: Record<string, string>;
}

interface BusinessStats {
  // Sales Performance
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  avgItemsPerOrder: number;
  dailySales: number;
  monthlyGrowth: number;
  weeklyGrowth: number;

  // Customer Metrics
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  customerRetentionRate: number;
  avgCustomerLifetimeValue: number;

  // Inventory & Products
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  inventoryTurnover: number;
  daysOfInventory: number;
  totalInventoryValue: number;

  // Category Performance
  topCategory: string;
  topCategorySales: number;
  freshProduceSales: number;
  dairySales: number;
  grocerySales: number;
  beverageSales: number;

  // Financial
  grossMargin: number;
  totalTaxCollected: number;
  totalDiscountsGiven: number;
  costOfGoodsSold: number;
  operatingExpenses: number;

  // Operational
  avgTransactionTime: number;
  peakHourSales: number;
  staffProductivity: number;
  shrinkageRate: number;

  // Top Products
  topSellingProduct: string;
  topSellingProductRevenue: number;
  secondTopProduct: string;
  thirdTopProduct: string;
}

export const Reports: React.FC<ReportsProps> = ({ isDark, themeClasses }) => {
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  // Fetch real business statistics
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Calculate date range based on selected period
        const now = new Date();
        let startDate: string | undefined;
        let endDate = now.toISOString().split('T')[0];

        switch (selectedPeriod) {
          case 'today':
            startDate = endDate;
            break;
          case 'this-week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            startDate = weekStart.toISOString().split('T')[0];
            break;
          case 'this-month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            break;
          case 'last-month':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            startDate = lastMonth.toISOString().split('T')[0];
            endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
            break;
          case 'this-quarter':
            const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            startDate = quarterStart.toISOString().split('T')[0];
            break;
          case 'this-year':
            startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            break;
        }

        const filters = {
          start_date: startDate,
          end_date: endDate
        };

        const data = await reportsApi.getBusinessStats(filters);
        setStats(data);
      } catch (error) {
        console.error('Error fetching business stats:', error);
        // Fallback to mock data if API fails
        setStats({
          // Sales Performance
          totalRevenue: 0,
          totalOrders: 0,
          avgOrderValue: 0,
          avgItemsPerOrder: 0,
          dailySales: 0,
          monthlyGrowth: 0,
          weeklyGrowth: 0,

          // Customer Metrics
          totalCustomers: 0,
          newCustomers: 0,
          repeatCustomers: 0,
          customerRetentionRate: 0,
          avgCustomerLifetimeValue: 0,

          // Inventory & Products
          totalProducts: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          inventoryTurnover: 0,
          daysOfInventory: 0,
          totalInventoryValue: 0,

          // Category Performance
          topCategory: 'N/A',
          topCategorySales: 0,
          freshProduceSales: 0,
          dairySales: 0,
          grocerySales: 0,
          beverageSales: 0,

          // Financial
          grossMargin: 0,
          totalTaxCollected: 0,
          totalDiscountsGiven: 0,
          costOfGoodsSold: 0,
          operatingExpenses: 0,

          // Operational
          avgTransactionTime: 0,
          peakHourSales: 0,
          staffProductivity: 0,
          shrinkageRate: 0,

          // Top Products
          topSellingProduct: 'N/A',
          topSellingProductRevenue: 0,
          secondTopProduct: 'N/A',
          thirdTopProduct: 'N/A'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedPeriod]);

  const handleDownloadReport = async (format: 'pdf' | 'excel', type: string) => {
    setGeneratingReport(`${type}-${format}`);
    try {
      // Calculate date range
      const now = new Date();
      let startDate: string | undefined;
      let endDate = now.toISOString().split('T')[0];

      switch (selectedPeriod) {
        case 'today':
          startDate = endDate;
          break;
        case 'this-week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          startDate = weekStart.toISOString().split('T')[0];
          break;
        case 'this-month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          break;
        case 'last-month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          startDate = lastMonth.toISOString().split('T')[0];
          endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
          break;
        case 'this-quarter':
          const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          startDate = quarterStart.toISOString().split('T')[0];
          break;
        case 'this-year':
          startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
          break;
      }

      // Generate CSV data based on report type
      let csvContent = '';
      let filename = `${type}-report-${selectedPeriod}`;

      switch (type) {
        case 'sales':
          // Get sales data and convert to CSV
          const salesData = await reportsApi.getSalesSummary('monthly', { start_date: startDate, end_date: endDate });
          csvContent = 'Period,Sales,Revenue,Orders\n';
          salesData.forEach((item: any) => {
            csvContent += `${item.period || item.date},${item.sales || 0},${item.revenue || 0},${item.orders || 0}\n`;
          });
          break;

        case 'inventory':
          // Get stock movements data
          const movements = await reportsApi.getStockMovementReport({ start_date: startDate, end_date: endDate });
          csvContent = 'Product,Movement Type,Quantity,Date,Reason\n';
          movements.forEach((movement: any) => {
            csvContent += `"${movement.product_name}",${movement.movement_type},${movement.quantity},"${movement.created_at}",${movement.reason}\n`;
          });
          break;

        case 'customers':
          // Get customers data
          const customersData = await customersApi.getCustomers();
          const customers = Array.isArray(customersData) ? customersData : customersData?.results || [];
          csvContent = 'Name,Email,Phone,Lifetime Purchases,Points,Tier\n';
          customers.forEach((customer: any) => {
            csvContent += `"${customer.name}",${customer.email},${customer.phone || ''},${customer.lifetime_purchases || 0},${customer.total_points || 0},${customer.tier || 'Bronze'}\n`;
          });
          break;

        case 'financial':
          // Financial summary
          csvContent = 'Metric,Value\n';
          if (stats) {
            csvContent += `Total Revenue,${stats.totalRevenue}\n`;
            csvContent += `Total Orders,${stats.totalOrders}\n`;
            csvContent += `Average Order Value,${stats.avgOrderValue}\n`;
            csvContent += `Tax Collected,${stats.totalTaxCollected}\n`;
            csvContent += `Discounts Given,${stats.totalDiscountsGiven}\n`;
            csvContent += `Gross Margin,${stats.grossMargin}%\n`;
          }
          break;

        case 'tax':
          // Tax report
          csvContent = 'Period,Tax Collected,Total Sales\n';
          if (stats) {
            csvContent += `${selectedPeriod},${stats.totalTaxCollected},${stats.totalRevenue}\n`;
          }
          break;

        default:
          throw new Error('Unknown report type');
      }

      // Create and download the file
      const blob = new Blob([csvContent], { type: format === 'excel' ? 'text/csv' : 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${format === 'excel' ? 'csv' : 'txt'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show success message
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} report downloaded successfully!`);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(null);
    }
  };

  const statCards = [
    {
      title: 'Total Revenue',
      value: stats?.totalRevenue || 0,
      icon: DollarSign,
      color: 'emerald',
      change: stats?.monthlyGrowth || 0,
      format: 'currency',
      subtitle: 'Monthly sales'
    },
    {
      title: 'Avg Basket Size',
      value: stats?.avgItemsPerOrder || 0,
      icon: ShoppingCart,
      color: 'violet',
      change: 2.1,
      format: 'decimal',
      subtitle: 'Items per transaction'
    },
    {
      title: 'Customer Retention',
      value: stats?.customerRetentionRate || 0,
      icon: Users,
      color: 'blue',
      change: 5.2,
      format: 'percentage',
      subtitle: 'Repeat customer rate'
    },
    {
      title: 'Gross Margin',
      value: stats?.grossMargin || 0,
      icon: TrendingUp,
      color: 'amber',
      change: 1.8,
      format: 'percentage',
      subtitle: 'Profit margin'
    },
    {
      title: 'Inventory Turnover',
      value: stats?.inventoryTurnover || 0,
      icon: Package,
      color: 'cyan',
      change: 3.2,
      format: 'decimal',
      subtitle: 'Times per year'
    },
    {
      title: 'Transaction Time',
      value: stats?.avgTransactionTime || 0,
      icon: Calendar,
      color: 'pink',
      change: -8.5,
      format: 'decimal',
      subtitle: 'Minutes per sale'
    },
    {
      title: 'Out of Stock',
      value: stats?.outOfStockItems || 0,
      icon: TrendingDown,
      color: 'red',
      change: -12.3,
      format: 'number',
      subtitle: 'Items unavailable'
    },
    {
      title: 'Staff Productivity',
      value: stats?.staffProductivity || 0,
      icon: BarChart3,
      color: 'orange',
      change: 6.7,
      format: 'currency',
      subtitle: 'Revenue per employee'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner themeClasses={themeClasses} isDark={isDark} size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>Business Reports</h2>
          <p className={themeClasses.textSecondary}>Comprehensive analytics and downloadable reports</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className={`${themeClasses.input} border rounded-xl px-4 py-2 ${themeClasses.text} outline-none`}
          >
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-quarter">This Quarter</option>
            <option value="this-year">This Year</option>
          </select>
          <button
            onClick={() => window.location.reload()}
            className={`${themeClasses.hover} px-4 py-2 rounded-xl border ${themeClasses.card} flex items-center gap-2`}
          >
            <RefreshCw size={20} className={themeClasses.text} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg hover:scale-105 transition-transform duration-200`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600 rounded-xl flex items-center justify-center shadow-lg shadow-${stat.color}-500/25`}>
                <stat.icon className="text-white" size={24} />
              </div>
              <div className={`flex items-center gap-1 ${stat.change >= 0 ? 'text-emerald-500' : 'text-red-500'} text-sm font-semibold`}>
                {stat.change >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                <span>{Math.abs(stat.change)}%</span>
              </div>
            </div>
            <p className={`${themeClasses.textSecondary} text-sm mb-1`}>{stat.title}</p>
            <p className={`text-2xl font-bold ${themeClasses.text}`}>
              {stat.format === 'currency' ? (
                <CurrencyDisplay amount={stat.value} showCents={false} />
              ) : stat.format === 'percentage' ? (
                `${stat.value}%`
              ) : stat.format === 'decimal' ? (
                stat.value.toFixed(1)
              ) : (
                stat.value.toLocaleString()
              )}
            </p>
            {stat.subtitle && (
              <p className={`${themeClasses.textSecondary} text-xs mt-1`}>{stat.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      {/* Report Generation Section */}
      <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={`text-xl font-bold ${themeClasses.text} mb-1`}>Generate Reports</h3>
            <p className={themeClasses.textSecondary}>Download detailed business reports in PDF or Excel format</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: 'Sales Report',
              description: 'Revenue, orders, and sales performance',
              icon: DollarSign,
              color: 'emerald',
              type: 'sales'
            },
            {
              title: 'Inventory Report',
              description: 'Stock levels and product analysis',
              icon: Package,
              color: 'violet',
              type: 'inventory'
            },
            {
              title: 'Customer Report',
              description: 'Customer data and analytics',
              icon: Users,
              color: 'blue',
              type: 'customers'
            },
            {
              title: 'Financial Summary',
              description: 'Complete financial overview',
              icon: BarChart3,
              color: 'amber',
              type: 'financial'
            },
            {
              title: 'Tax Report',
              description: 'Tax collected and financial compliance',
              icon: FileText,
              color: 'red',
              type: 'tax'
            }
          ].map((report, i) => (
            <div key={i} className={`${themeClasses.hover} p-4 rounded-xl border ${themeClasses.card} transition-all`}>
              <div className={`w-10 h-10 bg-gradient-to-br from-${report.color}-500 to-${report.color}-600 rounded-lg flex items-center justify-center mb-3`}>
                <report.icon className="text-white" size={20} />
              </div>
              <h4 className={`${themeClasses.text} font-semibold mb-2`}>{report.title}</h4>
              <p className={`${themeClasses.textSecondary} text-sm mb-4`}>{report.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadReport('pdf', report.type)}
                  disabled={generatingReport === `${report.type}-pdf`}
                  className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {generatingReport === `${report.type}-pdf` ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <FileText size={12} />
                  )}
                  PDF
                </button>
                <button
                  onClick={() => handleDownloadReport('excel', report.type)}
                  disabled={generatingReport === `${report.type}-excel`}
                  className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {generatingReport === `${report.type}-excel` ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <File size={12} />
                  )}
                  Excel
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Performance */}
      <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="text-indigo-500" size={24} />
          <h3 className={`text-xl font-bold ${themeClasses.text}`}>Category Performance</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Fresh Produce', value: stats?.freshProduceSales || 0, color: 'emerald' },
            { name: 'Dairy', value: stats?.dairySales || 0, color: 'blue' },
            { name: 'Groceries', value: stats?.grocerySales || 0, color: 'violet' },
            { name: 'Beverages', value: stats?.beverageSales || 0, color: 'amber' }
          ].map((category, i) => (
            <div key={i} className="text-center">
              <div className={`w-full bg-gradient-to-r from-${category.color}-500 to-${category.color}-600 rounded-lg p-3 mb-2`}>
                <CurrencyDisplay amount={category.value} showCents={false} className="text-white font-bold" />
              </div>
              <p className={`${themeClasses.textSecondary} text-sm`}>{category.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
          <div className="flex items-center gap-3 mb-4">
            <PieChart className="text-violet-500" size={24} />
            <h3 className={`text-lg font-bold ${themeClasses.text}`}>Top Insights</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className={`${themeClasses.textSecondary} text-sm`}>Top Selling Product</span>
              <span className={`${themeClasses.text} font-medium`}>{stats?.topSellingProduct}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className={`${themeClasses.textSecondary} text-sm`}>Top Category</span>
              <span className={`${themeClasses.text} font-medium`}>{stats?.topCategory || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className={`${themeClasses.textSecondary} text-sm`}>Tax Collected</span>
              <CurrencyDisplay amount={stats?.totalTaxCollected || 0} showCents={false} />
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className={`${themeClasses.textSecondary} text-sm`}>Discounts Given</span>
              <CurrencyDisplay amount={stats?.totalDiscountsGiven || 0} showCents={false} />
            </div>
          </div>
        </div>

        <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-emerald-500" size={24} />
            <h3 className={`text-lg font-bold ${themeClasses.text}`}>Performance Metrics</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className={`${themeClasses.textSecondary} text-sm`}>Customer Lifetime Value</span>
              <CurrencyDisplay amount={stats?.avgCustomerLifetimeValue || 0} showCents={false} />
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className={`${themeClasses.textSecondary} text-sm`}>Days of Inventory</span>
              <span className={`${themeClasses.text} font-medium`}>{stats?.daysOfInventory || 0} days</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className={`${themeClasses.textSecondary} text-sm`}>Shrinkage Rate</span>
              <span className={`${themeClasses.text} font-medium`}>{stats?.shrinkageRate || 0}%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className={`${themeClasses.textSecondary} text-sm`}>Fresh Produce Sales</span>
              <CurrencyDisplay amount={stats?.freshProduceSales || 0} showCents={false} />
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Insights */}
      <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="text-green-500" size={24} />
          <h3 className={`text-xl font-bold ${themeClasses.text}`}>Actionable Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Inventory Optimization',
              insight: (stats?.outOfStockItems || 0) > 5 ? 'High out-of-stock items detected' : 'Inventory levels are healthy',
              action: (stats?.outOfStockItems || 0) > 5 ? 'Reorder popular items immediately' : 'Maintain current stock levels',
              priority: (stats?.outOfStockItems || 0) > 5 ? 'high' : 'low',
              icon: Package
            },
            {
              title: 'Staff Performance',
              insight: `Avg transaction time: ${(stats?.avgTransactionTime || 0).toFixed(1)} minutes`,
              action: ((stats?.avgTransactionTime || 0) > 5) ? 'Consider staff training for faster service' : 'Service efficiency is good',
              priority: ((stats?.avgTransactionTime || 0) > 5) ? 'medium' : 'low',
              icon: Users
            },
            {
              title: 'Customer Retention',
              insight: `Retention rate: ${stats?.customerRetentionRate || 0}%`,
              action: ((stats?.customerRetentionRate || 0) < 70) ? 'Implement loyalty program improvements' : 'Retention strategy is effective',
              priority: ((stats?.customerRetentionRate || 0) < 70) ? 'high' : 'low',
              icon: TrendingUp
            },
            {
              title: 'Profitability Focus',
              insight: `Gross margin: ${stats?.grossMargin || 0}%`,
              action: ((stats?.grossMargin || 0) < 25) ? 'Review pricing strategy and supplier costs' : 'Profit margins are healthy',
              priority: ((stats?.grossMargin || 0) < 25) ? 'high' : 'medium',
              icon: DollarSign
            },
            {
              title: 'Category Performance',
              insight: `Top category: ${stats?.topCategory || 'N/A'}`,
              action: 'Focus marketing efforts on top-performing categories',
              priority: 'medium',
              icon: BarChart3
            },
            {
              title: 'Shrinkage Control',
              insight: `Shrinkage rate: ${stats?.shrinkageRate || 0}%`,
              action: ((stats?.shrinkageRate || 0) > 2) ? 'Implement better loss prevention measures' : 'Loss prevention is effective',
              priority: ((stats?.shrinkageRate || 0) > 2) ? 'high' : 'low',
              icon: TrendingDown
            }
          ].map((insight, i) => (
            <div key={i} className={`${themeClasses.hover} p-4 rounded-xl border ${themeClasses.card} transition-all`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg ${
                  insight.priority === 'high' ? 'bg-red-500/20 text-red-500' :
                  insight.priority === 'medium' ? 'bg-amber-500/20 text-amber-500' :
                  'bg-green-500/20 text-green-500'
                }`}>
                  <insight.icon size={16} />
                </div>
                <div className="flex-1">
                  <h4 className={`${themeClasses.text} font-semibold text-sm mb-1`}>{insight.title}</h4>
                  <p className={`${themeClasses.textSecondary} text-xs mb-2`}>{insight.insight}</p>
                  <p className={`text-xs font-medium ${
                    insight.priority === 'high' ? 'text-red-600 dark:text-red-400' :
                    insight.priority === 'medium' ? 'text-amber-600 dark:text-amber-400' :
                    'text-green-600 dark:text-green-400'
                  }`}>
                    {insight.action}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};