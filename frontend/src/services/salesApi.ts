import httpClient from './httpClient';
import { ENDPOINTS } from '../config/api';

// Types matching Django models
export interface Sale {
  id: number;
  sale_number: string;
  branch: number;
  branch_name: string;
  cashier: number;
  cashier_name: string;
  customer?: number;
  customer_details?: Customer;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  status_display: string;
  shift?: number;
  notes: string;
  created_at: string;
  updated_at: string;
  items: SaleItem[];
  etims_response?: any;
  rcpt_signature?: string;
  etims_qr?: string;
  etims_qr_image?: string;
  etims_submitted?: boolean;
  etims_submitted_at?: string;
}

export interface SaleItem {
  id: number;
  sale: number;
  product: number;
  product_name: string;
  product_barcode: string;
  quantity: number;
  unit_price: string;
  discount: string;
  subtotal: string;
  tax_rate: string;
  tax_amount: string;
  is_ad_hoc: boolean;
  ad_hoc_name: string;
  total: number;
}

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

export interface Discount {
  id: number;
  code: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  value: string;
  min_purchase_amount: string;
  start_date: string;
  end_date: string;
  requires_approval: boolean;
  is_active: boolean;
  max_uses?: number;
  times_used: number;
  created_at: string;
}

export interface Return {
  id: number;
  original_sale: Sale;
  return_number: string;
  items_returned: any; // JSON field
  refund_amount: string;
  reason: string;
  customer?: Customer;
  manager_approval: {
    id: number;
    username: string;
  };
  approved_at: string;
  branch: {
    id: number;
    name: string;
  };
  created_at: string;
}

// Import types from other modules
import type { Customer } from './customersApi';
import type { Product } from './productsApi';

// Create Sale Data
export interface CreateSaleItemData {
  product_id?: number;
  barcode?: string;
  quantity: number;
  unit_price?: string;
  discount?: string;
  is_ad_hoc?: boolean;
  ad_hoc_name?: string;
}

export interface CreateSaleData {
  customer_id?: number;
  items: CreateSaleItemData[];
  discount_amount?: string;
  discount_code?: string;
  notes?: string;
}

// Sales API
export const salesApi = {
  // Get all sales with optional filtering
  getSales: (params?: {
    status?: string;
    cashier?: number;
    customer?: number;
    date_from?: string;
    date_to?: string;
    branch?: number;
    page?: number;
    limit?: number;
  }) => {
    return httpClient.get(ENDPOINTS.SALES, params);
  },

  // Get single sale
  getSale: (id: number) => {
    return httpClient.get(`${ENDPOINTS.SALES}${id}/`);
  },

  // Create new sale
  createSale: (data: CreateSaleData) => {
    return httpClient.post(ENDPOINTS.SALES, data);
  },

  // Complete sale (deduct inventory, award points)
  completeSale: (id: number) => {
    return httpClient.post(ENDPOINTS.SALE_COMPLETE(id));
  },

  // Print receipt for sale. If `direct:true` server will attempt system print.
  printReceipt: (id: number, options?: { direct?: boolean }) => {
    return httpClient.post(`${ENDPOINTS.SALES}${id}/print_receipt/`, options || {});
  },

  // Cancel sale
  cancelSale: (id: number, reason?: string) => {
    return httpClient.patch(`${ENDPOINTS.SALES}${id}/`, { status: 'cancelled', cancellation_reason: reason });
  },
};

// Discounts API
export const discountsApi = {
  // Get all discounts with optional filtering
  getDiscounts: (params?: {
    code?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }) => {
    return httpClient.get(ENDPOINTS.DISCOUNTS, params);
  },

  // Get single discount
  getDiscount: (id: number) => {
    return httpClient.get(`${ENDPOINTS.DISCOUNTS}${id}/`);
  },

  // Create new discount
  createDiscount: (data: {
    code: string;
    name: string;
    discount_type: 'percentage' | 'fixed';
    value: string;
    min_purchase_amount?: string;
    start_date: string;
    end_date: string;
    requires_approval?: boolean;
    max_uses?: number;
  }) => {
    return httpClient.post(ENDPOINTS.DISCOUNTS, data);
  },

  // Update discount
  updateDiscount: (id: number, data: {
    code?: string;
    name?: string;
    discount_type?: 'percentage' | 'fixed';
    value?: string;
    min_purchase_amount?: string;
    start_date?: string;
    end_date?: string;
    requires_approval?: boolean;
    max_uses?: number;
    is_active?: boolean;
  }) => {
    return httpClient.put(`${ENDPOINTS.DISCOUNTS}${id}/`, data);
  },

  // Delete discount
  deleteDiscount: (id: number) => {
    return httpClient.delete(`${ENDPOINTS.DISCOUNTS}${id}/`);
  },

  // Validate discount code
  validateCode: (code: string) => {
    return httpClient.post(ENDPOINTS.DISCOUNT_VALIDATE, { code });
  },
};

// Returns API
export const returnsApi = {
  // Get all returns with optional filtering
  getReturns: (params?: {
    customer?: number;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }) => {
    return httpClient.get(ENDPOINTS.RETURNS, params);
  },

  // Get single return
  getReturn: (id: number) => {
    return httpClient.get(`${ENDPOINTS.RETURNS}${id}/`);
  },

  // Create new return
  createReturn: (data: {
    original_sale_id: number;
    items_returned: any; // JSON array
    refund_amount: string;
    reason: string;
    customer_id?: number;
  }) => {
    return httpClient.post(ENDPOINTS.RETURNS, data);
  },
};