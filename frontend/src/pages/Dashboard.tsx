import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  ArrowUp,
  ArrowDown,
  DollarSign,
  Users,
  ShoppingCart,
  TrendingUp,
  MoreVertical
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '../services/dashboardApi';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface DashboardProps {
  isDark: boolean;
  themeClasses: Record<string, string>;
}

export const Dashboard: React.FC<DashboardProps> = ({ isDark, themeClasses }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B'];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [revenue, traffic, dashboardStats, activity] = await Promise.all([
          dashboardApi.getRevenueData(),
          dashboardApi.getTrafficSources(),
          dashboardApi.getStats(),
          dashboardApi.getRecentActivity(),
        ]);

        setRevenueData(revenue);
        setTrafficData(traffic);
        
        setStats([
          { 
            label: user?.role === 'cashier' ? 'My Sales Today' : 'Total Revenue', 
            value: dashboardStats.totalRevenue, 
            change: dashboardStats.totalRevenueChange, 
            icon: DollarSign, 
            up: !dashboardStats.totalRevenueChange.startsWith('-'), 
            color: 'violet' 
          },
          { 
            label: user?.role === 'cashier' ? 'My Shifts' : 'Active Customers', 
            value: dashboardStats.activeUsers.toString(), 
            change: dashboardStats.activeUsersChange, 
            icon: Users, 
            up: !dashboardStats.activeUsersChange.startsWith('-'), 
            color: 'pink' 
          },
          { 
            label: user?.role === 'cashier' ? 'My Transactions' : 'Total Sales', 
            value: dashboardStats.totalOrders.toString(), 
            change: dashboardStats.totalOrdersChange, 
            icon: ShoppingCart, 
            up: !dashboardStats.totalOrdersChange.startsWith('-'), 
            color: 'emerald' 
          },
          { 
            label: 'Conversion Rate', 
            value: dashboardStats.conversionRate, 
            change: dashboardStats.conversionRateChange, 
            icon: TrendingUp, 
            up: dashboardStats.conversionRateChange.startsWith('+'), 
            color: 'amber' 
          },
        ]);

        setRecentActivity(activity);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);


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
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>
          Welcome back, {user?.first_name || user?.username || 'User'}!
        </h2>
        <p className={themeClasses.textSecondary}>
          {user?.branch?.name ? `${user.branch.name} Branch` : 'POS System'} - Here's what's happening today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 hover:scale-105 transition-transform duration-200 shadow-lg`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600 rounded-xl flex items-center justify-center shadow-lg shadow-${stat.color}-500/25`}>
                <stat.icon className="text-white" size={24} />
              </div>
              <div className={`flex items-center gap-1 ${stat.up ? 'text-emerald-500' : 'text-red-500'} text-sm font-semibold`}>
                {stat.up ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                {stat.change}
              </div>
            </div>
            <p className={`${themeClasses.textSecondary} text-sm mb-1`}>{stat.label}</p>
            <p className={`text-2xl font-bold ${themeClasses.text}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {user?.role !== 'cashier' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 ${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-xl font-bold ${themeClasses.text} mb-1`}>Revenue Overview</h3>
                <p className={themeClasses.textSecondary}>Monthly revenue and user growth</p>
              </div>
              <button className={`${themeClasses.hover} p-2 rounded-lg transition-colors`}>
                <MoreVertical className={themeClasses.text} size={20} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
                <XAxis dataKey="month" stroke={isDark ? '#9CA3AF' : '#6B7280'} />
                <YAxis stroke={isDark ? '#9CA3AF' : '#6B7280'} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF', 
                    border: '1px solid ' + (isDark ? '#374151' : '#E5E7EB'), 
                    borderRadius: '12px' 
                  }} 
                />
                <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={3} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
            <div className="mb-6">
              <h3 className={`text-xl font-bold ${themeClasses.text} mb-1`}>Sales Channels</h3>
              <p className={themeClasses.textSecondary}>Sales distribution by channel</p>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie 
                  data={trafficData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {trafficData.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {trafficData.map((item: any, i: number) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <span className={`${themeClasses.textSecondary} text-sm`}>{item.name}</span>
                  </div>
                  <span className={`${themeClasses.text} font-semibold text-sm`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={`text-xl font-bold ${themeClasses.text} mb-1`}>
              {user?.role === 'cashier' ? 'My Recent Sales' : 'Recent Activity'}
            </h3>
            <p className={themeClasses.textSecondary}>
              {user?.role === 'cashier' ? 'Your latest transactions' : 'Latest customer interactions'}
            </p>
          </div>
          <button className={`px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all`}>
            View All
          </button>
        </div>
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className={`flex items-center justify-between p-4 ${themeClasses.hover} rounded-xl transition-colors`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-pink-500 rounded-full"></div>
                <div>
                  <p className={`${themeClasses.text} font-medium`}>{activity.message}</p>
                  <p className={`${themeClasses.textSecondary} text-sm`}>
                    {activity.type === 'sale' ? 'Sale completed' : 
                     activity.type === 'customer' ? 'Customer registered' :
                     activity.type === 'inventory' ? 'Inventory update' : 'Return processed'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {activity.amount && <p className={`${themeClasses.text} font-semibold mb-1`}>{activity.amount}</p>}
                <p className={`${themeClasses.textSecondary} text-sm`}>{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};