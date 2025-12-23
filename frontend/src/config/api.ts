// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  TIMEOUT: 30000,
};

// API Endpoints
export const ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/token/',
    LOGOUT: '/auth/logout/',
    REFRESH: '/auth/token/refresh/',
    PROFILE: '/auth/profile/',
    CHANGE_PASSWORD: '/auth/change-password/',
  },
  
  // Core
  USERS: '/users/',
  BRANCHES: '/branches/',
  CATEGORIES: '/categories/',
  SUPPLIERS: '/suppliers/',
  SYSTEM_CONFIG: '/system-config/',
  
  // Products & Inventory
  PRODUCTS: '/products/',
  PRODUCT_LOOKUP: '/products/lookup/',
  LOW_STOCK: '/products/low_stock/',
  STOCK_ADJUST: (id: number) => `/products/${id}/adjust_stock/`,
  STOCK_MOVEMENTS: '/stock-movements/',
  
  // Sales
  SALES: '/sales/',
  SALE_COMPLETE: (id: number) => `/sales/${id}/complete/`,
  DISCOUNTS: '/discounts/',
  DISCOUNT_VALIDATE: '/discounts/validate_code/',
  RETURNS: '/returns/',
  
  // Customers
  CUSTOMERS: '/customers/',
  CUSTOMER_LOOKUP: '/customers/lookup/',
  CUSTOMER_ADD_POINTS: (id: number) => `/customers/${id}/add_points/`,
  CUSTOMER_REDEEM_POINTS: (id: number) => `/customers/${id}/redeem_points/`,
  LOYALTY_TIERS: '/loyalty-tiers/',
  LOYALTY_TRANSACTIONS: '/loyalty-transactions/',
  
  // Payments
  PAYMENTS: '/payments/',
  Mpesa_STK_PUSH: '/payments/mpesa_stk_push/',
  Mpesa_CONFIRM: (id: number) => `/payments/${id}/confirm_mpesa/`,
  Mpesa_CALLBACK: '/mpesa/callback/',
  
  // Shifts
  SHIFTS: '/shifts/',
  SHIFT_OPEN: '/shifts/open_shift/',
  SHIFT_CLOSE: (id: number) => `/shifts/${id}/close_shift/`,
  SHIFT_CURRENT: '/shifts/current/',
  SHIFT_REPORT: (id: number) => `/shifts/${id}/report/`,
  SHIFT_TRANSACTIONS: '/shift-transactions/',
  
  // Approvals
  APPROVALS: '/approval-requests/',
  APPROVAL_PENDING: '/approval-requests/pending/',
  APPROVAL_MY_REQUESTS: '/approval-requests/my_requests/',
  APPROVAL_APPROVE: (id: number) => `/approval-requests/${id}/approve/`,
  APPROVAL_REJECT: (id: number) => `/approval-requests/${id}/reject/`,
  
  // Reports
  REPORTS: {
    DAILY_SALES: '/reports/daily-sales/',
    CASH_FLOW: '/reports/cash-flow/',
    CASHIER_PERFORMANCE: '/reports/cashier-performance/',
    STOCK_ALERTS: '/reports/stock-alerts/',
    TAX_REPORT: '/reports/tax-report/',
    SALES_SUMMARY: '/reports/sales-summary/',
  },
} as const;

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;