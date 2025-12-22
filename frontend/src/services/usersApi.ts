import { httpClient, type PaginatedResponse } from './httpClient';
import { ENDPOINTS } from '../config/api';

export interface CreateUserData {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'manager' | 'cashier';
  branch?: number;
  phone?: string;
  employee_id?: string;
  password: string;
  confirm_password: string;
  is_active?: boolean;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: 'admin' | 'manager' | 'cashier';
  branch?: number;
  phone?: string;
  employee_id?: string;
  is_active?: boolean;
  password?: string;
  confirm_password?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role: 'admin' | 'manager' | 'cashier';
  branch?: number;
  branch_name?: string;
  branch_details?: {
    id: number;
    name: string;
  };
  phone?: string;
  employee_id?: string;
  is_active: boolean;
  date_joined: string;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  by_role: {
    admin: number;
    manager: number;
    cashier: number;
  };
}

export interface Role {
  value: 'admin' | 'manager' | 'cashier';
  label: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ResetPasswordData {
  new_password: string;
  confirm_password: string;
}

export interface UserFilters {
  role?: string;
  branch?: number;
  is_active?: boolean;
  search?: string;
  ordering?: string;
  limit?: number;
}

export const usersApi = {
  // Get all users with filtering and pagination
  async getUsers(params?: UserFilters): Promise<PaginatedResponse<User[]>> {
    const queryParams: Record<string, any> = {};

    if (params?.role) queryParams.role = params.role;
    if (params?.branch) queryParams.branch = params.branch;
    if (params?.is_active !== undefined) queryParams.is_active = params.is_active;
    if (params?.search) queryParams.search = params.search;
    if (params?.ordering) queryParams.ordering = params.ordering;
    if (params?.limit) queryParams.limit = params.limit;

    return httpClient.get<PaginatedResponse<User[]>>(ENDPOINTS.USERS, queryParams);
  },

  // Get user by ID
  async getUser(id: number): Promise<User> {
    return httpClient.get<User>(`${ENDPOINTS.USERS}${id}/`);
  },

  // Create new user
  async createUser(data: CreateUserData): Promise<User> {
    return httpClient.post<User>(ENDPOINTS.USERS, data);
  },

  // Update user
  async updateUser(id: number, data: UpdateUserData): Promise<User> {
    return httpClient.put<User>(`${ENDPOINTS.USERS}${id}/`, data);
  },

  // Partial update user
  async patchUser(id: number, data: Partial<UpdateUserData>): Promise<User> {
    return httpClient.patch<User>(`${ENDPOINTS.USERS}${id}/`, data);
  },

  // Delete/Deactivate user
  async deleteUser(id: number): Promise<{ message: string }> {
    return httpClient.delete<{ message: string }>(`${ENDPOINTS.USERS}${id}/`);
  },

  // Toggle user active status
  async toggleUserActive(id: number): Promise<{ message: string; is_active: boolean }> {
    return httpClient.post<{ message: string; is_active: boolean }>(`${ENDPOINTS.USERS}${id}/toggle_active/`);
  },

  // Reset user password (admin only)
  async resetUserPassword(id: number, data: ResetPasswordData): Promise<{ message: string }> {
    return httpClient.post<{ message: string }>(`${ENDPOINTS.USERS}${id}/reset_password/`, data);
  },

  // Get user statistics
  async getUserStats(): Promise<UserStats> {
    return httpClient.get<UserStats>(`${ENDPOINTS.USERS}stats/`);
  },

  // Get available roles for current user
  async getAvailableRoles(): Promise<Role[]> {
    return httpClient.get<Role[]>(`${ENDPOINTS.USERS}roles/`);
  },

  // Get current user profile
  async getCurrentUser(): Promise<User> {
    return httpClient.get<User>(`${ENDPOINTS.USERS}me/`);
  },

  // Change password for current user
  async changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    return httpClient.post<{ message: string }>(ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
  },

  // Get branches (if needed for user creation/editing)
  async getBranches(): Promise<any[]> {
    return httpClient.get<any[]>(ENDPOINTS.BRANCHES);
  },
};

export default usersApi;
