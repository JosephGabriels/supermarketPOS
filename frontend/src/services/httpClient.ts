import { API_CONFIG } from '../config/api';

// Types
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'cashier' | 'manager' | 'admin';
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

// HTTP Client Class
class HttpClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string, timeout: number) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('access_token');
    console.log(`[httpClient] Making request to: ${url}`);
    console.log(`[httpClient] Method: ${options.method || 'GET'}`);
    console.log(`[httpClient] Token present: ${!!token}`, token ? `Token: ${token.substring(0, 20)}...` : 'NO TOKEN');
    
    // Skip auth header for login endpoint to prevent sending invalid/expired tokens
    const isLoginEndpoint = endpoint.includes('/auth/token/') && !endpoint.includes('/refresh/');

    if (token && !isLoginEndpoint) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }
    
    console.log(`[httpClient] Final headers:`, config.headers);

    try {
      console.log(`[httpClient] Sending request to: ${url}`);
      const response = await fetch(url, config);
      console.log(`[httpClient] Response received:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      // Handle authentication errors
      if (response.status === 401) {
        // If this is a login request, don't attempt refresh or redirect
        if (isLoginEndpoint) {
             console.log('[httpClient] 401 on login endpoint. Throwing error.');
             const errorData = await response.json().catch(() => ({}));
             const message = errorData.detail || 'Invalid credentials';
             const apiErr = new ApiError(message);
             apiErr.status = response.status;
             apiErr.data = errorData;
             throw apiErr;
        }

        console.log('[httpClient] 401 Unauthorized, attempting token refresh...');
        // Try to refresh token
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const refreshed = await this.refreshAccessToken(refreshToken);
          if (refreshed) {
            console.log('[httpClient] Token refreshed, retrying original request...');
            // Retry original request with new token
            config.headers = {
              ...config.headers,
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            };
            const retryResponse = await fetch(url, config);
            console.log(`[httpClient] Retry response:`, {
              status: retryResponse.status,
              statusText: retryResponse.statusText,
              ok: retryResponse.ok
            });
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              console.log('[httpClient] Retry successful, returning data:', retryData);
              return this.transformResponse(retryData);
            }
          } else {
            console.log('[httpClient] Token refresh failed');
          }
        } else {
          console.log('[httpClient] No refresh token available');
        }
        
        // If refresh fails, redirect to login
        console.log('[httpClient] Authentication failed, redirecting to login');
        this.handleAuthError();
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        console.log('[httpClient] Response not ok, parsing error...');
        const errorData = await response.json().catch(() => ({}));
        console.log('[httpClient] Error response data:', errorData);
        const message = errorData.detail || errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        const apiErr = new ApiError(message);
        apiErr.status = response.status;
        apiErr.data = errorData;
        throw apiErr;
      }

      const responseData = await response.json();
      console.log('[httpClient] Request successful, returning data:', responseData);
      return this.transformResponse(responseData);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
        }

  // Transform DRF paginated response to expected format
  private transformResponse(data: any): any {
    if (data && typeof data === 'object' && 'results' in data && 'count' in data) {
      console.log('[httpClient] Detected DRF paginated response, transforming...');
      return {
        data: data.results,
        pagination: {
          page: 1,
          limit: data.results?.length || 0,
          total: data.count,
          totalPages: Math.ceil(data.count / (data.results?.length || 1)) || 1
        }
      };
    }
    console.log('[httpClient] Returning non-paginated response as-is');
    return data;
  }

  private handleAuthError(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    // Only redirect if not already on login page to prevent refresh loops
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
  }

  private async refreshAccessToken(refreshToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    return false;
  }

  // HTTP Methods
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(endpoint, this.baseURL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const result = await this.request<T>(url.pathname + url.search, {
      method: 'GET',
    });

    if (params && params.limit && typeof result === 'object' && result !== null && 'pagination' in result) {
      const paginationResult = result as any;
      paginationResult.pagination.page = params.page || 1;
      paginationResult.pagination.limit = params.limit;
    }

    return result;
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

}

// Extended Error with response details
export class ApiError extends Error {
  status?: number;
  data?: any;
  constructor(message?: string) {
    super(message);
    this.name = 'ApiError';
  }

}

// Create singleton instance
export const httpClient = new HttpClient(API_CONFIG.BASE_URL, API_CONFIG.TIMEOUT);

// Auth helper functions
export const auth = {
  async login(username: string, password: string): Promise<{ access: string; refresh: string; user: User }> {
    // Clear any existing tokens before login attempt to ensure a clean state
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    const response = await httpClient.post('/auth/token/', { username, password });
    
    if (!response.access || !response.refresh) {
        console.error('[auth.login] Invalid response structure:', response);
        throw new Error('Login failed: Invalid response from server');
    }

    // Store tokens
    console.log('[auth.login] Login successful, storing tokens...');
    localStorage.setItem('access_token', response.access);
    localStorage.setItem('refresh_token', response.refresh);
    localStorage.setItem('user', JSON.stringify(response.user));
    console.log('[auth.login] Tokens stored. Access token:', response.access.substring(0, 20) + '...');
    
    return response;
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
      try {
        await httpClient.post('/auth/logout/', { refresh_token: refreshToken });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }
    
    // Clear stored data
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  async getProfile(): Promise<User> {
    return httpClient.get('/auth/profile/');
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },

  getToken(): string | null {
    return localStorage.getItem('access_token');
  },

  async changePassword(data: { current_password: string; new_password: string; confirm_password: string }): Promise<{ message: string }> {
    return httpClient.post('/auth/change-password/', data);
  },
};

export default httpClient;