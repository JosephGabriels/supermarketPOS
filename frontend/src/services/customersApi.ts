import httpClient from './httpClient';
import { ENDPOINTS } from '../config/api';

// Types matching Django models
export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  tier: 'bronze' | 'silver' | 'gold';
  total_points: number;
  lifetime_purchases: string; // Decimal as string
  birthday?: string;
  address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTier {
  id: number;
  name: 'bronze' | 'silver' | 'gold';
  min_purchase_amount: string;
  points_multiplier: string;
  discount_percentage: string;
}

export interface LoyaltyTransaction {
  id: number;
  customer: Customer;
  points: number;
  transaction_type: 'earn' | 'redeem' | 'adjust' | 'expire';
  sale?: {
    id: number;
    sale_number: string;
  };
  description: string;
  previous_points: number;
  new_points: number;
  created_at: string;
  created_by: {
    id: number;
    username: string;
  };
}

export interface CreateCustomerData {
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
  address?: string;
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  id: number;
}

// Customers API
export const customersApi = {
  // Get all customers with optional filtering
  getCustomers: (params?: {
    search?: string;
    phone?: string;
    tier?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }) => {
    return httpClient.get(ENDPOINTS.CUSTOMERS, params);
  },

  // Get single customer
  getCustomer: (id: number) => {
    return httpClient.get(`${ENDPOINTS.CUSTOMERS}${id}/`);
  },

  // Create new customer
  createCustomer: (data: CreateCustomerData) => {
    return httpClient.post(ENDPOINTS.CUSTOMERS, data);
  },

  // Update customer
  updateCustomer: (id: number, data: Partial<CreateCustomerData>) => {
    return httpClient.put(`${ENDPOINTS.CUSTOMERS}${id}/`, data);
  },

  // Delete customer
  deleteCustomer: (id: number) => {
    return httpClient.delete(`${ENDPOINTS.CUSTOMERS}${id}/`);
  },

  // Lookup customer by phone
  lookupByPhone: (phone: string) => {
    return httpClient.post(ENDPOINTS.CUSTOMER_LOOKUP, { phone });
  },

  // Add loyalty points
  addPoints: (id: number, data: { points: number; description: string }) => {
    return httpClient.post(ENDPOINTS.CUSTOMER_ADD_POINTS(id), data);
  },

  // Redeem loyalty points
  redeemPoints: (id: number, data: { points: number; sale_id?: number }) => {
    return httpClient.post(ENDPOINTS.CUSTOMER_REDEEM_POINTS(id), data);
  },
};

// Loyalty Tiers API
export const loyaltyTiersApi = {
  // Get all loyalty tiers
  getLoyaltyTiers: () => {
    return httpClient.get(ENDPOINTS.LOYALTY_TIERS);
  },

  // Get single loyalty tier
  getLoyaltyTier: (id: number) => {
    return httpClient.get(`${ENDPOINTS.LOYALTY_TIERS}${id}/`);
  },
};

// Loyalty Transactions API
export const loyaltyTransactionsApi = {
  // Get all loyalty transactions with optional filtering
  getLoyaltyTransactions: (params?: {
    customer?: number;
    transaction_type?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }) => {
    return httpClient.get(ENDPOINTS.LOYALTY_TRANSACTIONS, params);
  },

  // Get single loyalty transaction
  getLoyaltyTransaction: (id: number) => {
    return httpClient.get(`${ENDPOINTS.LOYALTY_TRANSACTIONS}${id}/`);
  },
};