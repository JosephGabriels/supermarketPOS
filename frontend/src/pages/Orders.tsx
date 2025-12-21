import React from 'react';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Clock,
  Activity,
  CheckCircle,
  ShoppingCart,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import type { Order } from '../types';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay';

interface OrdersProps {
  isDark: boolean;
  themeClasses: Record<string, string>;
}

export const Orders: React.FC<OrdersProps> = ({ isDark, themeClasses }) => {
  /* @ts-ignore */
  const orders: any = [
    {
      id: '#ORD-001',
      customer: 'Sarah Johnson',
      customerEmail: 'sarah@example.com',
      date: '2024-11-02',
      amount: '$234',
      status: 'Delivered',
      items: 3,
      trackingNumber: 'TRK123456789',
      paymentMethod: 'Credit Card',
      shippingAddress: '123 Main St, New York, NY 10001'
    },
    {
      id: '#ORD-002',
      customer: 'Mike Chen',
      customerEmail: 'mike@example.com',
      date: '2024-11-02',
      amount: '$456',
      status: 'Processing',
      items: 2,
      paymentMethod: 'PayPal',
      shippingAddress: '456 Oak Ave, San Francisco, CA 94102'
    },
    {
      id: '#ORD-003',
      customer: 'Emma Wilson',
      customerEmail: 'emma@example.com',
      date: '2024-11-01',
      amount: '$789',
      status: 'Shipped',
      items: 5,
      trackingNumber: 'TRK987654321',
      paymentMethod: 'Credit Card',
      shippingAddress: '789 Pine St, Chicago, IL 60601'
    },
    {
      id: '#ORD-004',
      customer: 'Alex Turner',
      customerEmail: 'alex@example.com',
      date: '2024-11-01',
      amount: '$123',
      status: 'Pending',
      items: 1,
      paymentMethod: 'Bank Transfer',
      shippingAddress: '321 Elm Dr, Seattle, WA 98101'
    },
    {
      id: '#ORD-005',
      customer: 'Lisa Anderson',
      customerEmail: 'lisa@example.com',
      date: '2024-10-31',
      amount: '$567',
      status: 'Delivered',
      items: 4,
      trackingNumber: 'TRK456789123',
      paymentMethod: 'Credit Card',
      shippingAddress: '654 Maple Ln, Austin, TX 78701'
    },
  ];

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'Delivered': 'text-emerald-500 bg-emerald-500/10',
      'Processing': 'text-amber-500 bg-amber-500/10',
      'Shipped': 'text-blue-500 bg-blue-500/10',
      'Pending': 'text-orange-500 bg-orange-500/10',
      'Cancelled': 'text-red-500 bg-red-500/10',
    };
    return colors[status] || 'text-gray-500 bg-gray-500/10';
  };

  const orderStats = [
    { label: 'Total Orders', value: '1,423', icon: ShoppingCart, color: 'violet', change: '+12.5%' },
    { label: 'Pending', value: '143', icon: Clock, color: 'amber', change: '-3.2%' },
    { label: 'Processing', value: '89', icon: Activity, color: 'blue', change: '+8.1%' },
    { label: 'Delivered', value: '1,191', icon: CheckCircle, color: 'emerald', change: '+15.3%' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>Orders</h2>
          <p className={themeClasses.textSecondary}>Track and manage all orders</p>
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2">
          <Plus size={20} /> Create Order
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {orderStats.map((stat, i) => (
          <div key={i} className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg hover:scale-105 transition-transform duration-200`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600 rounded-xl flex items-center justify-center shadow-lg shadow-${stat.color}-500/25`}>
                <stat.icon className="text-white" size={24} />
              </div>
              <div className="flex-1">
                <p className={`${themeClasses.textSecondary} text-sm`}>{stat.label}</p>
                <p className={`text-2xl font-bold ${themeClasses.text}`}>{stat.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {stat.change.startsWith('+') ? (
                    <ArrowUp size={12} className="text-emerald-500" />
                  ) : (
                    <ArrowDown size={12} className="text-red-500" />
                  )}
                  <span className={`text-xs font-semibold ${stat.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden`}>
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 ${themeClasses.input} border rounded-xl px-4 py-2 flex-1`}>
              <Search className={themeClasses.textSecondary} size={20} />
              <input
                type="text"
                placeholder="Search orders..."
                className={`bg-transparent ${themeClasses.text} outline-none flex-1`}
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
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Order ID</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Customer</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Date</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Amount</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Items</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Status</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Payment</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any, i: number) => (
                <tr key={i} className={`border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200'} ${themeClasses.hover}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                        {order.id.split('-')[1]}
                      </div>
                      <div>
                        <p className={`${themeClasses.text} font-semibold`}>{order.id}</p>
                        {order.trackingNumber && (
                          <p className={`${themeClasses.textSecondary} text-sm`}>Track: {order.trackingNumber}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className={`${themeClasses.text} font-medium`}>{order.customer}</p>
                      <p className={`${themeClasses.textSecondary} text-sm`}>{order.customerEmail}</p>
                    </div>
                  </td>
                  <td className={`p-4 ${themeClasses.textSecondary}`}>
                    {new Date(order.date).toLocaleDateString()}
                  </td>
                  <td className={`p-4 ${themeClasses.text} font-semibold`}>
                    <CurrencyDisplay amount={order.amount.replace('$', '')} />
                  </td>
                  <td className={`p-4 ${themeClasses.text}`}>{order.items}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className={`p-4 ${themeClasses.textSecondary} text-sm`}>{(order as any).paymentMethod}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button className={`${themeClasses.hover} p-2 rounded-lg`} title="View Details">
                        <Eye size={18} className={themeClasses.text} />
                      </button>
                      <button className={`${themeClasses.hover} p-2 rounded-lg`} title="Edit Order">
                        <Edit size={18} className={themeClasses.text} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};