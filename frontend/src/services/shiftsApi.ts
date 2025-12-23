import httpClient from './httpClient';
import { ENDPOINTS } from '../config/api';

export interface Shift {
  id: number;
  cashier: number;
  cashier_name: string;
  branch: number;
  branch_name: string;
  opening_time: string;
  closing_time?: string;
  opening_cash: string;
  closing_cash?: string;
  expected_cash: string;
  cash_difference?: string;
  status: 'open' | 'closed';
  total_sales: number;
  total_transactions: number;
  notes: string;
}

export const shiftsApi = {
  // Get current open shift
  getCurrentShift: () => {
    return httpClient.get<Shift>(ENDPOINTS.SHIFT_CURRENT);
  },

  // Open a new shift
  openShift: (opening_cash: string, notes?: string) => {
    return httpClient.post<Shift>(ENDPOINTS.SHIFT_OPEN, { opening_cash, notes });
  },

  // Close a shift
  closeShift: (id: number, closing_cash: string, notes?: string) => {
    return httpClient.post<Shift>(ENDPOINTS.SHIFT_CLOSE(id), { closing_cash, notes });
  },

  // Get shift by ID
  getShift: (id: number) => {
    return httpClient.get<Shift>(`${ENDPOINTS.SHIFTS}${id}/`);
  },

  // Get all shifts
  getShifts: (params?: {
    status?: string;
    cashier?: number;
    date_from?: string;
    date_to?: string;
  }) => {
    return httpClient.get(`${ENDPOINTS.SHIFTS}`, params);
  },

  // Get shift report
  getShiftReport: (id: number) => {
    return httpClient.get(`${ENDPOINTS.SHIFT_REPORT(id)}`);
  },
};
