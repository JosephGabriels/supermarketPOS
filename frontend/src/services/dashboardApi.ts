import httpClient from './httpClient';
import { ENDPOINTS } from '../config/api';

// Dashboard data types
export interface DashboardStats {
  totalRevenue: string;
  totalRevenueChange: string;
  activeUsers: number;
  activeUsersChange: string;
  totalOrders: number;
  totalOrdersChange: string;
  conversionRate: string;
  conversionRateChange: string;
  role?: string;
  branch?: string;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  users: number;
  orders: number;
}

export interface SalesSummary {
  today: {
    sales: number;
    revenue: string;
    customers: number;
  };
  week: {
    sales: number;
    revenue: string;
    customers: number;
  };
  month: {
    sales: number;
    revenue: string;
    customers: number;
  };
}

export interface RecentActivity {
  id: number;
  type: 'sale' | 'customer' | 'inventory' | 'return';
  message: string;
  time: string;
  amount?: string;
  user?: string;
}

// Dashboard API service
export const dashboardApi = {
  // Get dashboard statistics
  getStats: async (): Promise<DashboardStats> => {
    try {
      const response = await httpClient.get('/reports/dashboard-stats/');
      return response;
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Fallback to mock data if API fails
      return {
        totalRevenue: 'KES 0',
        totalRevenueChange: '0%',
        activeUsers: 0,
        activeUsersChange: '0%',
        totalOrders: 0,
        totalOrdersChange: '0%',
        conversionRate: '0%',
        conversionRateChange: '0%',
      };
    }
  },

  // Get revenue data for charts
  getRevenueData: async (): Promise<RevenueDataPoint[]> => {
    try {
      const response = await httpClient.get('/reports/revenue-chart/');
      return response;
    } catch (error) {
      console.error('Failed to fetch revenue chart data:', error);
      // Fallback to mock data
      return [
        { month: 'Jan', revenue: 0, users: 0, orders: 0 },
        { month: 'Feb', revenue: 0, users: 0, orders: 0 },
        { month: 'Mar', revenue: 0, users: 0, orders: 0 },
        { month: 'Apr', revenue: 0, users: 0, orders: 0 },
        { month: 'May', revenue: 0, users: 0, orders: 0 },
        { month: 'Jun', revenue: 0, users: 0, orders: 0 },
      ];
    }
  },

  // Get sales summary
  getSalesSummary: async (): Promise<SalesSummary> => {
    // Mock data for now
    return {
      today: { sales: 45, revenue: 'KES 15,420', customers: 38 },
      week: { sales: 287, revenue: 'KES 89,340', customers: 234 },
      month: { sales: 1205, revenue: 'KES 378,920', customers: 967 },
    };
  },

  // Get recent activity
  getRecentActivity: async (): Promise<RecentActivity[]> => {
    try {
      const response = await httpClient.get('/reports/recent-activity/');
      return response;
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      // Fallback to mock data
      return [
        {
          id: 1,
          type: 'sale',
          message: 'Sale completed by Sarah Johnson',
          time: '2 min ago',
          amount: 'KES 2,340',
          user: 'Sarah Johnson',
        },
        {
          id: 2,
          type: 'customer',
          message: 'New customer registered',
          time: '15 min ago',
          user: 'Mike Chen',
        },
      ];
    }
  },

  // Get traffic sources (for compatibility with existing dashboard)
  getTrafficSources: async () => {
    // Mock data for pie chart
    return [
      { name: 'Direct', value: 4500 },
      { name: 'Walk-in', value: 3200 },
      { name: 'Referral', value: 5400 },
      { name: 'Return Customer', value: 2100 },
    ];
  },
};