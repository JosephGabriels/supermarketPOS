import httpClient from './httpClient';
import { ENDPOINTS } from '../config/api';

// Types matching Django models
export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  tax_id: string;
  payment_terms: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierData {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  is_active?: boolean;
}

export interface UpdateSupplierData extends Partial<CreateSupplierData> {
  id: number;
}

export const suppliersApi = {
  getSuppliers: async (params?: {
    search?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<Supplier[]> => {
    const response = await httpClient.get<any>(ENDPOINTS.SUPPLIERS, params);
    
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  },

  getSupplier: async (id: number): Promise<Supplier> => {
    const response = await httpClient.get<any>(`${ENDPOINTS.SUPPLIERS}${id}/`);
    return response || {};
  },

  createSupplier: (data: CreateSupplierData) => {
    return httpClient.post(ENDPOINTS.SUPPLIERS, data);
  },

  updateSupplier: (id: number, data: Partial<CreateSupplierData>) => {
    return httpClient.put(`${ENDPOINTS.SUPPLIERS}${id}/`, data);
  },

  deleteSupplier: (id: number) => {
    return httpClient.delete(`${ENDPOINTS.SUPPLIERS}${id}/`);
  },

  getActiveSuppliers: async (): Promise<Supplier[]> => {
    const response = await httpClient.get<any>(`${ENDPOINTS.SUPPLIERS}active/`);
    
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  },

  searchSuppliers: async (query: string): Promise<Supplier[]> => {
    const response = await httpClient.get<any>(ENDPOINTS.SUPPLIERS, { search: query });
    
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  },
};