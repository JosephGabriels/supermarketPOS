import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  CreditCard,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay';
import { reportsApi } from '../services/reportsApi';
import type { CashFlowStats } from '../services/reportsApi';

interface CashProps {
  isDark: boolean;
  themeClasses: Record<string, string>;
}

export const Cash: React.FC<CashProps> = ({ isDark, themeClasses }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CashFlowStats | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchCashStats();
  }, [activeTab, paymentMethod]);

  // Effect to handle custom date range changes only when "Apply Filter" is clicked or when switching to custom tab
  // But for simplicity, we can just refetch when dateRange changes if activeTab is custom
  useEffect(() => {
    if (activeTab === 'custom') {
      // Optional: Debounce or wait for user action. 
      // For now, we'll rely on the "Apply Filter" button which calls fetchCashStats manually
    }
  }, [dateRange]);

  const fetchCashStats = async () => {
    setLoading(true);
    try {
      // Calculate dates based on activeTab
      const now = new Date();
      let start = dateRange.start;
      let end = dateRange.end;

      if (activeTab === 'daily') {
        start = now.toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
      } else if (activeTab === 'weekly') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        start = weekStart.toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
      } else if (activeTab === 'monthly') {
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      }

      const data = await reportsApi.getCashFlow({
        start_date: start,
        end_date: end,
        payment_method: paymentMethod
      });

      setStats(data);

    } catch (error) {
      console.error('Error fetching cash stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [type]: value }));
  };

  if (loading && !stats) {
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
          <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>Cash Management</h2>
          <p className={themeClasses.textSecondary}>Track finances, cash flow, and payment details</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
          {(['daily', 'weekly', 'monthly', 'custom'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : `${themeClasses.textSecondary} hover:bg-gray-100 dark:hover:bg-gray-700`
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${themeClasses.textSecondary}`}>Payment Method:</span>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className={`px-3 py-2 rounded-md border ${themeClasses.input} ${themeClasses.text} text-sm`}
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mpesa">M-Pesa</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {activeTab === 'custom' && (
        <div className={`p-4 rounded-lg border ${themeClasses.card} flex items-center gap-4`}>
          <div className="flex items-center gap-2">
            <span className={themeClasses.textSecondary}>From:</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className={`px-3 py-2 rounded-md border ${themeClasses.input} ${themeClasses.text}`}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className={themeClasses.textSecondary}>To:</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className={`px-3 py-2 rounded-md border ${themeClasses.input} ${themeClasses.text}`}
            />
          </div>
          <button
            onClick={fetchCashStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Filter size={16} />
            Apply Filter
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Cash In"
          value={stats?.summary.total_cash_in || 0}
          icon={TrendingUp}
          color="emerald"
          themeClasses={themeClasses}
        />
        <StatCard
          title="Total Cash Out"
          value={stats?.summary.total_cash_out || 0}
          icon={TrendingDown}
          color="red"
          themeClasses={themeClasses}
        />
        <StatCard
          title="Net Cash Flow"
          value={stats?.summary.net_cash_flow || 0}
          icon={DollarSign}
          color="blue"
          themeClasses={themeClasses}
        />
        <StatCard
          title="Cash Balance"
          value={stats?.summary.cash_balance || 0}
          icon={DollarSign}
          color="violet"
          themeClasses={themeClasses}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-1 p-6 rounded-lg border ${themeClasses.card}`}>
          <h3 className={`text-lg font-semibold ${themeClasses.text} mb-4`}>Payment Methods</h3>
          <div className="space-y-4">
            <PaymentMethodRow
              label="Cash"
              amount={stats?.breakdown.cash || 0}
              total={stats?.summary.total_cash_in || 1}
              icon={DollarSign}
              color="emerald"
              themeClasses={themeClasses}
            />
            <PaymentMethodRow
              label="Card"
              amount={stats?.breakdown.card || 0}
              total={stats?.summary.total_cash_in || 1}
              icon={CreditCard}
              color="blue"
              themeClasses={themeClasses}
            />
            <PaymentMethodRow
              label="Mobile Money"
              amount={stats?.breakdown.mpesa || 0}
              total={stats?.summary.total_cash_in || 1}
              icon={Smartphone}
              color="orange"
              themeClasses={themeClasses}
            />
             <PaymentMethodRow
              label="Other"
              amount={stats?.breakdown.other || 0}
              total={stats?.summary.total_cash_in || 1}
              icon={DollarSign}
              color="gray"
              themeClasses={themeClasses}
            />
          </div>
        </div>

        <div className={`lg:col-span-2 p-6 rounded-lg border ${themeClasses.card}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${themeClasses.text}`}>Recent Transactions</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className={`pb-3 font-medium ${themeClasses.textSecondary}`}>Date</th>
                  <th className={`pb-3 font-medium ${themeClasses.textSecondary}`}>Description</th>
                  <th className={`pb-3 font-medium ${themeClasses.textSecondary}`}>Method</th>
                  <th className={`pb-3 font-medium ${themeClasses.textSecondary}`}>Reference</th>
                  <th className={`pb-3 font-medium ${themeClasses.textSecondary} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {stats?.transactions.length === 0 ? (
                   <tr>
                     <td colSpan={5} className={`py-4 text-center ${themeClasses.textSecondary}`}>
                       No transactions found for this period.
                     </td>
                   </tr>
                ) : (
                  stats?.transactions.map((tx) => (
                    <tr key={tx.id} className={themeClasses.hover}>
                      <td className={`py-3 ${themeClasses.text}`}>
                        {new Date(tx.date).toLocaleDateString()} <span className="text-xs text-gray-500">{new Date(tx.date).toLocaleTimeString()}</span>
                      </td>
                      <td className={`py-3 ${themeClasses.text}`}>
                        <div className="flex items-center gap-2">
                          {tx.type === 'in' ? (
                            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-500" />
                          )}
                          {tx.description}
                        </div>
                      </td>
                      <td className={`py-3 ${themeClasses.text}`}>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tx.method === 'Cash' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          tx.method === 'M-Pesa' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {tx.method}
                        </span>
                      </td>
                      <td className={`py-3 ${themeClasses.textSecondary} text-sm`}>{tx.reference || '-'}</td>
                      <td className={`py-3 text-right font-medium ${
                        tx.type === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {tx.type === 'in' ? '+' : '-'}<CurrencyDisplay amount={tx.amount} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, themeClasses }: any) => (
  <div className={`p-6 rounded-lg border ${themeClasses.card}`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/30`}>
        <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
      </div>
    </div>
    <h3 className={`text-sm font-medium ${themeClasses.textSecondary}`}>{title}</h3>
    <div className={`text-2xl font-bold ${themeClasses.text} mt-1`}>
      <CurrencyDisplay amount={value} />
    </div>
  </div>
);

const PaymentMethodRow = ({ label, amount, total, icon: Icon, color, themeClasses }: any) => {
  const percentage = total > 0 ? Math.round((amount / total) * 100) : 0;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
            <Icon className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
          </div>
          <span className={`font-medium ${themeClasses.text}`}>{label}</span>
        </div>
        <div className="text-right">
          <div className={`font-bold ${themeClasses.text}`}><CurrencyDisplay amount={amount} /></div>
          <div className={`text-xs ${themeClasses.textSecondary}`}>{percentage}%</div>
        </div>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full bg-${color}-500 rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
