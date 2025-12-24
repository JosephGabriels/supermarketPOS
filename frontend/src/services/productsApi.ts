import httpClient from './httpClient';
import { ENDPOINTS } from '../config/api';

// Types matching Django models and serializers
export interface BranchInfo {
  id: number;
  name: string;
}

export interface CategoryInfo {
  id: number;
  name: string;
  description?: string;
}

export interface SupplierInfo {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
}

export interface Product {
  id: number;
  name: string;
  barcode: string;
  category: number | null;
  category_details: CategoryInfo | null;
  description: string;
  price: string;
  cost_price: string;
  stock_quantity: number;
  reorder_level: number;
  branch: number;
  branch_details: BranchInfo;
  supplier: number | null;
  supplier_details: SupplierInfo | null;
  is_active: boolean;
  tax_rate: string;
  is_low_stock: boolean;
  price_with_tax: string;
  image?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  parent?: Category;
  created_at?: string;
  updated_at?: string;
}

export interface StockMovement {
  id: number;
  product: number;
  product_name: string;
  movement_type: 'sale' | 'purchase' | 'adjustment' | 'return' | 'damage' | 'transfer';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  reference_id?: string;
  branch: number;
  branch_name: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
}

export interface CreateProductData {
  name: string;
  barcode: string;
  category_id?: number | null;
  supplier_id?: number | null;
  description?: string;
  price: string;
  cost_price: string;
  stock_quantity: number;
  reorder_level?: number;
  tax_rate?: string;
  branch: number;
  is_active?: boolean;
}

// Products API
export const productsApi = {
  getProducts: async (params?: {
    search?: string;
    category?: number;
    barcode?: string;
    low_stock?: boolean;
    branch?: number;
    page?: number;
    limit?: number;
  }): Promise<any> => {
    const response = await httpClient.get<any>(ENDPOINTS.PRODUCTS, params);
    
    // Return full paginated response if available
    if (response && response.data && Array.isArray(response.data) && response.pagination) {
      return response;
    }

    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  },

  getProduct: async (id: number): Promise<Product> => {
    const response = await httpClient.get<any>(`${ENDPOINTS.PRODUCTS}${id}/`);
    return response || {};
  },

  createProduct: async (data: CreateProductData): Promise<Product> => {
    return httpClient.post<Product>(ENDPOINTS.PRODUCTS, data);
  },

  updateProduct: async (id: number, data: Partial<CreateProductData>): Promise<Product> => {
    return httpClient.put<Product>(`${ENDPOINTS.PRODUCTS}${id}/`, data);
  },

  deleteProduct: async (id: number): Promise<void> => {
    return httpClient.delete(`${ENDPOINTS.PRODUCTS}${id}/`);
  },

  lookupByBarcode: async (barcode: string, branch?: number): Promise<Product> => {
    const params: any = { barcode };
    if (branch) params.branch = branch;
    const response = await httpClient.get<any>(ENDPOINTS.PRODUCT_LOOKUP, params);
    return response || {};
  },

  getLowStock: async (): Promise<Product[]> => {
    const response = await httpClient.get<any>(ENDPOINTS.LOW_STOCK);
    
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  },

  adjustStock: async (id: number, data: {
    quantity: number;
    reason: string;
    movement_type: 'adjustment' | 'damage' | 'purchase' | 'return';
  }): Promise<any> => {
    return httpClient.post(ENDPOINTS.STOCK_ADJUST(id), data);
  },

  searchProducts: async (query: string): Promise<any> => {
    const response = await httpClient.get<any>(ENDPOINTS.PRODUCTS, { search: query });
    
    // Return full paginated response if available
    if (response && response.data && Array.isArray(response.data) && response.pagination) {
      return response;
    }

    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  },
};

// Categories API
export const categoriesApi = {
  getCategories: async (): Promise<Category[]> => {
    const response = await httpClient.get<any>(ENDPOINTS.CATEGORIES);
    
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  },

  getCategory: async (id: number): Promise<Category> => {
    const response = await httpClient.get<any>(`${ENDPOINTS.CATEGORIES}${id}/`);
    return response || {};
  },

  createCategory: async (data: { name: string; description?: string; parent_id?: number }): Promise<Category> => {
    return httpClient.post<Category>(ENDPOINTS.CATEGORIES, data);
  },

  updateCategory: async (id: number, data: { name?: string; description?: string; parent_id?: number }): Promise<Category> => {
    return httpClient.put<Category>(`${ENDPOINTS.CATEGORIES}${id}/`, data);
  },

  deleteCategory: async (id: number): Promise<void> => {
    return httpClient.delete(`${ENDPOINTS.CATEGORIES}${id}/`);
  },
};

// Stock Movements API
export const stockMovementsApi = {
  getStockMovements: async (params?: {
    product?: number;
    movement_type?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<StockMovement[]> => {
    const response = await httpClient.get<any>(ENDPOINTS.STOCK_MOVEMENTS, params);
    
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  },

  getStockMovement: async (id: number): Promise<StockMovement> => {
    const response = await httpClient.get<any>(`${ENDPOINTS.STOCK_MOVEMENTS}${id}/`);
    return response || {};
  },

  createStockMovement: async (data: {
    product_id: number;
    movement_type: string;
    quantity: number;
    reason: string;
    reference_id?: string;
  }): Promise<StockMovement> => {
    return httpClient.post<StockMovement>(ENDPOINTS.STOCK_MOVEMENTS, data);
  },
};