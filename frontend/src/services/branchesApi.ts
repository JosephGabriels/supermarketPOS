import httpClient from './httpClient';
import { ENDPOINTS } from '../config/api';

// Types matching Django models
export interface Branch {
  id: number;
  name: string;
  location: string;
  phone: string;
  email: string;
  tax_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBranchData {
  name: string;
  location: string;
  phone: string;
  email?: string;
  tax_id: string;
  is_active?: boolean;
}

export interface UpdateBranchData extends Partial<CreateBranchData> {
  id: number;
}

export const branchesApi = {
  getBranches: async (params?: {
    search?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<Branch[]> => {
    const response = await httpClient.get<any>(ENDPOINTS.BRANCHES, params);
    
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  },

  getBranch: async (id: number): Promise<Branch> => {
    const response = await httpClient.get<any>(`${ENDPOINTS.BRANCHES}${id}/`);
    return response || {};
  },

  createBranch: (data: CreateBranchData) => {
    return httpClient.post(ENDPOINTS.BRANCHES, data);
  },

  updateBranch: (id: number, data: Partial<CreateBranchData>) => {
    return httpClient.put(`${ENDPOINTS.BRANCHES}${id}/`, data);
  },

  deleteBranch: (id: number) => {
    return httpClient.delete(`${ENDPOINTS.BRANCHES}${id}/`);
  },

  getActiveBranches: async (): Promise<Branch[]> => {
    const response = await httpClient.get<any>(ENDPOINTS.BRANCHES, { is_active: true });
    
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  },

  searchBranches: async (query: string): Promise<Branch[]> => {
    const response = await httpClient.get<any>(ENDPOINTS.BRANCHES, { search: query });
    
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  },
};