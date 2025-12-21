import httpClient from './httpClient';
import { ENDPOINTS } from '../config/api';

export interface Payment {
  id: number;
  sale: number;
  payment_method: 'cash' | 'mpesa' | 'airtel_money' | 'card' | 'bank_transfer';
  amount: string;
  reference_number: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  phone_number: string;
  processed_at: string;
  processed_by?: {
    id: number;
    username: string;
  };
  notes: string;
}

export interface CreatePaymentData {
  sale_id: number;
  payment_method: 'cash' | 'mpesa' | 'airtel_money' | 'card' | 'bank_transfer';
  amount: string;
  reference_number?: string;
  phone_number?: string;
  notes?: string;
}

export const paymentsApi = {
  // Get all payments
  getPayments: (params?: {
    sale?: number;
    payment_method?: string;
    status?: string;
  }) => {
    return httpClient.get<Payment[]>(ENDPOINTS.PAYMENTS, params);
  },

  // Get single payment
  getPayment: (id: number) => {
    return httpClient.get<Payment>(`${ENDPOINTS.PAYMENTS}${id}/`);
  },

  // Create payment
  createPayment: (data: CreatePaymentData) => {
    return httpClient.post<Payment>(ENDPOINTS.PAYMENTS, data);
  },

  // M-Pesa STK Push
  mpesaSTKPush: (data: {
    sale_id: number;
    phone_number: string;
    amount: string;
  }) => {
    return httpClient.post(ENDPOINTS.Mpesa_STK_PUSH, data);
  },

  // Confirm M-Pesa payment
  confirmMpesa: (id: number, mpesa_receipt_number: string) => {
    return httpClient.post(ENDPOINTS.Mpesa_CONFIRM(id), { mpesa_receipt_number });
  },
};