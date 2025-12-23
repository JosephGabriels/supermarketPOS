import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  Filter,
  Clock,
  User,
  DollarSign,
  X,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { shiftsApi, type Shift } from '../services/shiftsApi';
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface ShiftManagementProps {
  isDark: boolean;
  themeClasses: Record<string, string>;
}

export const ShiftManagement: React.FC<ShiftManagementProps> = ({ isDark, themeClasses }) => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');
  const [shiftReport, setShiftReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      fetchShifts();
    }
  }, [activeTab, user]);

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className={`text-2xl font-bold ${themeClasses.text} mb-2`}>Access Denied</h2>
          <p className={themeClasses.textSecondary}>You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (activeTab === 'open') {
        params.status = 'open';
      } else {
        params.status = 'closed';
      }
      
      const response = await shiftsApi.getShifts(params);
      // Handle both paginated and non-paginated responses
      const shiftsData = (response as any).data || (response as any).results || response;
      
      if (Array.isArray(shiftsData)) {
        setShifts(shiftsData);
      } else {
        console.error('Unexpected shifts data format:', response);
        setShifts([]);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching shifts:', err);
      setError('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const fetchShiftReport = async (shiftId: number) => {
    try {
      setReportLoading(true);
      const response = await shiftsApi.getShiftReport(shiftId);
      setShiftReport(response);
    } catch (err) {
      console.error('Error fetching shift report:', err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleShiftClick = (shift: Shift) => {
    setSelectedShift(shift);
    fetchShiftReport(shift.id);
  };

  const filteredShifts = shifts.filter(shift => 
    (shift.cashier_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shift.branch_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'open': 'text-emerald-500 bg-emerald-500/10',
      'closed': 'text-gray-500 bg-gray-500/10',
    };
    return colors[status] || 'text-gray-500 bg-gray-500/10';
  };

  if (loading && !shifts.length) {
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
          <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>Shift Management</h2>
          <p className={themeClasses.textSecondary}>Monitor active shifts and review shift history</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-700/50">
        <button
          onClick={() => setActiveTab('open')}
          className={`pb-4 px-2 font-medium transition-colors relative ${
            activeTab === 'open' 
              ? 'text-violet-500' 
              : themeClasses.textSecondary
          }`}
        >
          Open Shifts
          {activeTab === 'open' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-500 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-4 px-2 font-medium transition-colors relative ${
            activeTab === 'history' 
              ? 'text-violet-500' 
              : themeClasses.textSecondary
          }`}
        >
          Shift History
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-500 rounded-t-full" />
          )}
        </button>
      </div>

      <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden`}>
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 ${themeClasses.input} border rounded-xl px-4 py-2 flex-1`}>
              <Search className={themeClasses.textSecondary} size={20} />
              <input
                type="text"
                placeholder="Search by cashier or branch..."
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
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>ID</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Cashier</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Branch</th>
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Opened At</th>
                {activeTab === 'history' && (
                  <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Closed At</th>
                )}
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Opening Cash</th>
                {activeTab === 'history' && (
                  <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Closing Cash</th>
                )}
                <th className={`${themeClasses.text} text-left p-4 font-semibold`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredShifts.map((shift) => (
                <tr 
                  key={shift.id} 
                  onClick={() => handleShiftClick(shift)}
                  className={`border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200'} ${themeClasses.hover} cursor-pointer transition-colors`}
                >
                  <td className={`p-4 ${themeClasses.text} font-medium`}>
                    #{shift.id}
                  </td>
                  <td className={`p-4 ${themeClasses.text}`}>
                    <div className="flex items-center gap-2">
                      <User size={16} className={themeClasses.textSecondary} />
                      {shift.cashier_name}
                    </div>
                  </td>
                  <td className={`p-4 ${themeClasses.text}`}>
                    {shift.branch_name || '-'}
                  </td>
                  <td className={`p-4 ${themeClasses.textSecondary}`}>
                    {new Date(shift.opening_time).toLocaleString()}
                  </td>
                  {activeTab === 'history' && (
                    <td className={`p-4 ${themeClasses.textSecondary}`}>
                      {shift.closing_time ? new Date(shift.closing_time).toLocaleString() : '-'}
                    </td>
                  )}
                  <td className={`p-4 ${themeClasses.text} font-medium`}>
                    <CurrencyDisplay amount={shift.opening_cash} />
                  </td>
                  {activeTab === 'history' && (
                    <td className={`p-4 ${themeClasses.text} font-medium`}>
                      {shift.closing_cash ? <CurrencyDisplay amount={shift.closing_cash} /> : '-'}
                    </td>
                  )}
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(shift.status)}`}>
                      {shift.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredShifts.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'history' ? 8 : 6} className={`p-8 text-center ${themeClasses.textSecondary}`}>
                    No shifts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift Details Modal */}
      {selectedShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`${themeClasses.card} w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="p-6 border-b border-gray-700/50 flex justify-between items-center sticky top-0 bg-inherit z-10">
              <div>
                <h3 className={`text-2xl font-bold ${themeClasses.text}`}>Shift Details</h3>
                <p className={themeClasses.textSecondary}>#{selectedShift.id} - {selectedShift.cashier_name}</p>
              </div>
              <button 
                onClick={() => setSelectedShift(null)}
                className={`p-2 rounded-lg ${themeClasses.hover}`}
              >
                <X size={24} className={themeClasses.text} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {reportLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner themeClasses={themeClasses} isDark={isDark} />
                </div>
              ) : shiftReport ? (
                <>
                  {/* Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="text-violet-500" size={20} />
                        <span className={themeClasses.textSecondary}>Opening Time</span>
                      </div>
                      <p className={`font-semibold ${themeClasses.text} text-sm`}>
                        {new Date(selectedShift.opening_time).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="text-pink-500" size={20} />
                        <span className={themeClasses.textSecondary}>Closing Time</span>
                      </div>
                      <p className={`font-semibold ${themeClasses.text} text-sm`}>
                        {selectedShift.closing_time ? new Date(selectedShift.closing_time).toLocaleString() : 'Still Open'}
                      </p>
                    </div>

                    <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <AlertCircle className="text-emerald-500" size={20} />
                        <span className={themeClasses.textSecondary}>Status</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedShift.status)}`}>
                        {selectedShift.status}
                      </span>
                    </div>
                  </div>

                  {/* Financials */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <h4 className={`text-lg font-semibold ${themeClasses.text} mb-4 flex items-center gap-2`}>
                        <DollarSign className="text-emerald-500" size={20} />
                        Cash Summary
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className={themeClasses.textSecondary}>Opening Cash</span>
                          <span className={`${themeClasses.text} font-medium`}>
                            <CurrencyDisplay amount={shiftReport.shift.opening_cash} />
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={themeClasses.textSecondary}>Expected Cash</span>
                          <span className={`${themeClasses.text} font-medium`}>
                            <CurrencyDisplay amount={shiftReport.shift.expected_cash} />
                          </span>
                        </div>
                        {shiftReport.shift.closing_cash && (
                          <div className="flex justify-between items-center">
                            <span className={themeClasses.textSecondary}>Closing Cash</span>
                            <span className={`${themeClasses.text} font-medium`}>
                              <CurrencyDisplay amount={shiftReport.shift.closing_cash} />
                            </span>
                          </div>
                        )}
                        {shiftReport.shift.cash_difference && (
                          <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                            <span className={themeClasses.textSecondary}>Variance</span>
                            <span className={`font-bold ${
                              parseFloat(shiftReport.shift.cash_difference) < 0 ? 'text-red-500' : 'text-emerald-500'
                            }`}>
                              <CurrencyDisplay amount={shiftReport.shift.cash_difference} />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <h4 className={`text-lg font-semibold ${themeClasses.text} mb-4 flex items-center gap-2`}>
                        <DollarSign className="text-blue-500" size={20} />
                        Sales Summary
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className={themeClasses.textSecondary}>Total Sales Count</span>
                          <span className={`${themeClasses.text} font-medium`}>
                            {shiftReport.sales_summary.total_sales}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={themeClasses.textSecondary}>Total Revenue</span>
                          <span className={`${themeClasses.text} font-medium`}>
                            <CurrencyDisplay amount={shiftReport.sales_summary.total_amount || 0} />
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={themeClasses.textSecondary}>Total Tax</span>
                          <span className={`${themeClasses.text} font-medium`}>
                            <CurrencyDisplay amount={shiftReport.sales_summary.total_tax || 0} />
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={themeClasses.textSecondary}>Total Discounts</span>
                          <span className={`${themeClasses.text} font-medium text-red-500`}>
                            -<CurrencyDisplay amount={shiftReport.sales_summary.total_discount || 0} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div>
                    <h4 className={`text-lg font-semibold ${themeClasses.text} mb-4`}>Payment Methods Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {Object.entries(shiftReport.payment_summary).map(([method, amount]: [string, any]) => (
                        <div key={method} className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                          <p className={`text-sm ${themeClasses.textSecondary} capitalize mb-1`}>
                            {method.replace('_', ' ')}
                          </p>
                          <p className={`font-semibold ${themeClasses.text}`}>
                            <CurrencyDisplay amount={amount} />
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedShift.notes && (
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <h4 className={`text-sm font-semibold ${themeClasses.textSecondary} mb-2`}>Notes</h4>
                      <p className={themeClasses.text}>{selectedShift.notes}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className={`text-center py-8 ${themeClasses.textSecondary}`}>
                  Failed to load report data
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
