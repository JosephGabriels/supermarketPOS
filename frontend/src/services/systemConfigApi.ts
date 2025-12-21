import { ENDPOINTS } from '../config/api';
import httpClient from './httpClient';

export interface SystemConfig {
  id: number;
  key: string;
  value: string;
  description: string;
  updated_at: string;
  updated_by?: number;
}

export interface SystemConfigData {
  key: string;
  value: string;
  description?: string;
}

export const systemConfigApi = {
  // Get all system configs
  async getSystemConfigs(): Promise<SystemConfig[]> {
    const response = await httpClient.get<{data: SystemConfig[]}>(ENDPOINTS.SYSTEM_CONFIG);
    return response.data || [];
  },

  // Get system config by key
  async getSystemConfig(key: string): Promise<SystemConfig | null> {
    try {
      const configs = await this.getSystemConfigs();
      return configs.find(config => config.key === key) || null;
    } catch (error) {
      console.error('Failed to get system config:', error);
      return null;
    }
  },

  // Create new system config
  async createSystemConfig(data: SystemConfigData): Promise<SystemConfig> {
    return httpClient.post<SystemConfig>(ENDPOINTS.SYSTEM_CONFIG, data);
  },

  // Update system config
  async updateSystemConfig(id: number, data: Partial<SystemConfigData>): Promise<SystemConfig> {
    return httpClient.patch<SystemConfig>(`${ENDPOINTS.SYSTEM_CONFIG}${id}/`, data);
  },

  // Get or create system config by key
  async getOrCreateSystemConfig(key: string, defaultValue: string = '', description: string = ''): Promise<SystemConfig> {
    let config = await this.getSystemConfig(key);
    if (!config) {
      config = await this.createSystemConfig({ key, value: defaultValue, description });
    }
    return config;
  },

  // Update system config by key
  async updateSystemConfigByKey(key: string, value: string, description?: string): Promise<SystemConfig> {
    const config = await this.getSystemConfig(key);
    if (config) {
      return this.updateSystemConfig(config.id, { key, value, description });
    } else {
      return this.createSystemConfig({ key, value, description: description || '' });
    }
  },
};

export default systemConfigApi;