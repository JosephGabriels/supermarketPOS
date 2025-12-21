import React from 'react';

// Core data types - POS System specific
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
  // Legacy fields for backward compatibility
  avatar?: string;
  spent?: string;
  orders?: number;
  status?: 'Active' | 'Inactive';
  joinedDate?: string;
  lastOrder?: string;
  location?: string;
}

export interface Order {
  id: number;
  sale_number: string;
  customer?: {
    id: number;
    name: string;
  };
  cashier: {
    id: number;
    username: string;
  };
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  created_at: string;
  items: number;
  payment_method?: string;
  notes?: string;
  // Legacy fields for backward compatibility
  customerName?: string;
  customerEmail?: string;
  date?: string;
  amount?: string;
  trackingNumber?: string;
  shippingAddress?: string;
}

export interface Product {
  id: number;
  name: string;
  barcode: string;
  category?: {
    id: number;
    name: string;
  };
  supplier?: {
    id: number;
    name: string;
  };
  description: string;
  price: string;
  cost_price: string;
  stock_quantity: number;
  reorder_level: number;
  branch: {
    id: number;
    name: string;
  };
  is_active: boolean;
  tax_rate: string;
  created_at: string;
  updated_at: string;
  // Legacy fields for backward compatibility
  categoryName?: string;
  originalPrice?: string;
  stock?: number;
  sales?: number;
  rating?: number;
  reviews?: number;
  image?: string;
  sku?: string;
  weight?: string;
  dimensions?: string;
  tags?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RevenueData {
  month: string;
  revenue: number;
  users: number;
  orders: number;
  profit?: number;
  growth?: number;
}

export interface PieData {
  name: string;
  value: number;
  color: string;
}

export interface StatCard {
  label: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  up: boolean;
  color: string;
  description?: string;
}

export interface Notification {
  id: number;
  type: 'order' | 'user' | 'alert' | 'message' | 'system';
  message: string;
  time: string;
  unread: boolean;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Activity {
  id: number;
  user: string;
  userAvatar?: string;
  action: string;
  time: string;
  amount?: string | null;
  entity?: string;
  status?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Customer' | 'Staff';
  avatar: string;
  lastActive: string;
  isOnline: boolean;
  permissions: string[];
}

export interface Message {
  id: number;
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  time: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  hasAttachments: boolean;
}

export interface Report {
  id: string;
  title: string;
  type: 'sales' | 'inventory' | 'customer' | 'financial';
  period: string;
  status: 'generating' | 'ready' | 'failed';
  createdAt: string;
  downloadUrl?: string;
  size?: string;
}

export interface Setting {
  id: string;
  category: 'general' | 'notifications' | 'security' | 'integrations' | 'billing';
  label: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'select' | 'multiselect';
  value: string | number | boolean | string[];
  options?: string[];
  required: boolean;
  defaultValue: string | number | boolean | string[];
}

export interface Theme {
  isDark: boolean;
  primaryColor: string;
  sidebarCollapsed: boolean;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, row: any) => React.ReactNode;
}

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface BulkAction {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action: string;
  variant?: 'primary' | 'danger' | 'secondary';
}