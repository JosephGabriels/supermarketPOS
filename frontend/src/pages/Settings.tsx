import React, { useState, useEffect } from 'react';
import {
  Bell,
  Shield,
  CreditCard,
  Globe,
  Mail,
  Lock,
  Save,
  RefreshCw,
  Settings as SettingsIcon,
  Moon,
  Sun
} from 'lucide-react';
import usersApi from '../services/usersApi';
import systemConfigApi from '../services/systemConfigApi';
import { clearCurrencyCache } from '../utils/currency';

interface SettingsProps {
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
  themeClasses: Record<string, string>;
}

export const Settings: React.FC<SettingsProps> = ({ isDark, setIsDark, themeClasses }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<any>({});
  const [userRole, setUserRole] = useState<string>('');
  const [systemConfigs, setSystemConfigs] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [themePreference, setThemePreference] = useState<'light' | 'dark'>(isDark ? 'dark' : 'light');

  useEffect(() => {
    setThemePreference(isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = localStorage.getItem('app_settings');
        if (stored) setSettings(JSON.parse(stored));

        // Load theme preference
        const savedTheme = localStorage.getItem('theme_preference');
        if (savedTheme) setThemePreference(savedTheme as 'light' | 'dark');

        // Load system configs
        const configs = await systemConfigApi.getSystemConfigs();
        const configMap: any = {};
        configs.forEach(config => {
          configMap[config.key] = config.value;
        });
        setSystemConfigs(configMap);
      } catch (err) {
        console.error('Failed to load settings', err);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await usersApi.getCurrentUser();
        setUserRole(user.role);
      } catch (err) {
        console.error('Failed to load user role', err);
      }
    };
    loadUser();
  }, []);

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'display', label: 'Display Preferences', icon: Moon },
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      localStorage.setItem('app_settings', JSON.stringify(settings));
      localStorage.setItem('theme_preference', themePreference);

      // Save system configs
      if (systemConfigs.site_name !== undefined) {
        await systemConfigApi.updateSystemConfigByKey('site_name', systemConfigs.site_name, 'Site name displayed in the application');
      }
      if (systemConfigs.default_currency !== undefined) {
        await systemConfigApi.updateSystemConfigByKey('default_currency', systemConfigs.default_currency, 'Default currency for the system');
        clearCurrencyCache(); // Clear cached currency when changed
      }

      // Save receipt configs
      if (systemConfigs.STORE_NAME !== undefined) {
        await systemConfigApi.updateSystemConfigByKey('STORE_NAME', systemConfigs.STORE_NAME, 'Store name displayed on receipt');
      }
      if (systemConfigs.STORE_ADDRESS !== undefined) {
        await systemConfigApi.updateSystemConfigByKey('STORE_ADDRESS', systemConfigs.STORE_ADDRESS, 'Store address displayed on receipt');
      }
      if (systemConfigs.STORE_PHONE !== undefined) {
        await systemConfigApi.updateSystemConfigByKey('STORE_PHONE', systemConfigs.STORE_PHONE, 'Store phone displayed on receipt');
      }
      if (systemConfigs.STORE_TAX_ID !== undefined) {
        await systemConfigApi.updateSystemConfigByKey('STORE_TAX_ID', systemConfigs.STORE_TAX_ID, 'Store KRA Tax ID displayed on receipt');
      }
      if (systemConfigs.STORE_EMAIL !== undefined) {
        await systemConfigApi.updateSystemConfigByKey('STORE_EMAIL', systemConfigs.STORE_EMAIL, 'Store email displayed on receipt');
      }
      if (systemConfigs.STORE_TAGLINE !== undefined) {
        await systemConfigApi.updateSystemConfigByKey('STORE_TAGLINE', systemConfigs.STORE_TAGLINE, 'Store tagline/motto displayed on receipt');
      }
      if (systemConfigs.STORE_WEBSITE !== undefined) {
        await systemConfigApi.updateSystemConfigByKey('STORE_WEBSITE', systemConfigs.STORE_WEBSITE, 'Store website displayed on receipt');
      }

      alert('Settings saved successfully');
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemConfigChange = (key: string, value: string) => {
    setSystemConfigs((prev: any) => ({ ...prev, [key]: value }));
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      {userRole === 'admin' || userRole === 'manager' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Site Name
              </label>
              <input
                type="text"
                value={systemConfigs.site_name || 'REACTZ'}
                onChange={(e) => handleSystemConfigChange('site_name', e.target.value)}
                className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}
              />
              <p className={`${themeClasses.textSecondary} text-sm mt-1`}>
                This name will be displayed throughout the application
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Default Currency
              </label>
              <select
                value={systemConfigs.default_currency || 'USD'}
                onChange={(e) => handleSystemConfigChange('default_currency', e.target.value)}
                className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="KES">KES (KSh)</option>
              </select>
              <p className={`${themeClasses.textSecondary} text-sm mt-1`}>
                Default currency for pricing and transactions
              </p>
            </div>
          </div>

          <hr className={`${themeClasses.textSecondary} opacity-20`} />

          {/* Store Information */}
          <div>
            <h4 className={`${themeClasses.text} font-semibold mb-4`}>Store Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Store Name
                </label>
                <input
                  type="text"
                  value={systemConfigs.STORE_NAME || ''}
                  onChange={(e) => handleSystemConfigChange('STORE_NAME', e.target.value)}
                  placeholder="e.g., My Supermarket"
                  className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Branch/Location
                </label>
                <input
                  type="text"
                  value={systemConfigs.STORE_BRANCH || ''}
                  onChange={(e) => handleSystemConfigChange('STORE_BRANCH', e.target.value)}
                  placeholder="e.g., Downtown Branch"
                  className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Street Address
                </label>
                <input
                  type="text"
                  value={systemConfigs.STORE_ADDRESS || ''}
                  onChange={(e) => handleSystemConfigChange('STORE_ADDRESS', e.target.value)}
                  placeholder="e.g., 123 Main Street"
                  className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={systemConfigs.STORE_PHONE || ''}
                  onChange={(e) => handleSystemConfigChange('STORE_PHONE', e.target.value)}
                  placeholder="e.g., +254 (0) 712 345678"
                  className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={systemConfigs.STORE_EMAIL || ''}
                  onChange={(e) => handleSystemConfigChange('STORE_EMAIL', e.target.value)}
                  placeholder="e.g., info@supermarket.com"
                  className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  KRA Tax ID (PIN)
                </label>
                <input
                  type="text"
                  value={systemConfigs.STORE_TAX_ID || ''}
                  onChange={(e) => handleSystemConfigChange('STORE_TAX_ID', e.target.value)}
                  placeholder="e.g., A000123456B"
                  className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}
                />
              </div>

              <div className="md:col-span-2">
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Website
                </label>
                <input
                  type="url"
                  value={systemConfigs.STORE_WEBSITE || ''}
                  onChange={(e) => handleSystemConfigChange('STORE_WEBSITE', e.target.value)}
                  placeholder="e.g., https://www.supermarket.com"
                  className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}
                />
              </div>

              <div className="md:col-span-2">
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Store Tagline/Motto
                </label>
                <textarea
                  value={systemConfigs.STORE_TAGLINE || ''}
                  onChange={(e) => handleSystemConfigChange('STORE_TAGLINE', e.target.value)}
                  placeholder="e.g., 'Where Quality Meets Affordability'"
                  rows={2}
                  className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className={`${themeClasses.textSecondary}`}>
            System settings are only available to administrators and managers.
          </p>
        </div>
      )}
    </div>
  );

  const renderDisplayPreferences = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className={`block text-sm font-medium ${themeClasses.text} mb-3`}>
            Theme
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setThemePreference('light');
                setIsDark(false);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                themePreference === 'light'
                  ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white border-violet-500'
                  : `${themeClasses.card} border-gray-300 ${themeClasses.text}`
              }`}
            >
              <Sun size={18} />
              <span className="font-medium">Light</span>
            </button>
            <button
              onClick={() => {
                setThemePreference('dark');
                setIsDark(true);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                themePreference === 'dark'
                  ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white border-violet-500'
                  : `${themeClasses.card} border-gray-300 ${themeClasses.text}`
              }`}
            >
              <Moon size={18} />
              <span className="font-medium">Dark</span>
            </button>
          </div>
          <p className={`${themeClasses.textSecondary} text-sm mt-2`}>
            Choose your preferred color scheme for the application
          </p>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${themeClasses.card} border rounded-xl p-6`}>
          <h4 className={`${themeClasses.text} font-semibold mb-4 flex items-center gap-2`}>
            <Bell size={20} /> Notification Channels
          </h4>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className={`${themeClasses.text} font-medium`}>Email Notifications</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500" />
            </label>
            <label className="flex items-center justify-between">
              <span className={`${themeClasses.text} font-medium`}>Push Notifications</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500" />
            </label>
          </div>
        </div>
        <div className={`${themeClasses.card} border rounded-xl p-6`}>
          <h4 className={`${themeClasses.text} font-semibold mb-4 flex items-center gap-2`}>
            <Mail size={20} /> Notification Types
          </h4>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className={`${themeClasses.text} font-medium`}>Order Updates</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500" />
            </label>
            <label className="flex items-center justify-between">
              <span className={`${themeClasses.text} font-medium`}>Inventory Alerts</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500" />
            </label>
            <label className="flex items-center justify-between">
              <span className={`${themeClasses.text} font-medium`}>Customer Messages</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500" />
            </label>
            {userRole !== 'cashier' && (
              <label className="flex items-center justify-between">
                <span className={`${themeClasses.text} font-medium`}>Marketing Emails</span>
                <input type="checkbox" className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500" />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${themeClasses.card} border rounded-xl p-6`}>
          <h4 className={`${themeClasses.text} font-semibold mb-4 flex items-center gap-2`}>
            <Shield size={20} /> Authentication
          </h4>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className={`${themeClasses.text} font-medium`}>Two-Factor Authentication</span>
              <input type="checkbox" className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500" />
            </label>
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Session Timeout (minutes)
              </label>
              <select className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>
        </div>
        <div className={`${themeClasses.card} border rounded-xl p-6`}>
          <h4 className={`${themeClasses.text} font-semibold mb-4 flex items-center gap-2`}>
            <Lock size={20} /> Password Policy
          </h4>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Minimum Requirements
              </label>
              <select className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}>
                <option value="basic">Basic (8+ characters)</option>
                <option value="medium">Medium (8+ chars, 1 number)</option>
                <option value="strong">Strong (8+ chars, 1 number, 1 special)</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Max Login Attempts
              </label>
              <select className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}>
                <option value={3}>3 attempts</option>
                <option value={5}>5 attempts</option>
                <option value={10}>10 attempts</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderIntegrationSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${themeClasses.card} border rounded-xl p-6`}>
          <h4 className={`${themeClasses.text} font-semibold mb-4`}>Payment Gateways</h4>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className={`${themeClasses.text} font-medium`}>Stripe</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500" />
            </label>
            <label className="flex items-center justify-between">
              <span className={`${themeClasses.text} font-medium`}>PayPal</span>
              <input type="checkbox" className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500" />
            </label>
          </div>
        </div>
        <div className={`${themeClasses.card} border rounded-xl p-6`}>
          <h4 className={`${themeClasses.text} font-semibold mb-4`}>Marketing Tools</h4>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className={`${themeClasses.text} font-medium`}>Mailchimp</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500" />
            </label>
            <label className="flex items-center justify-between">
              <span className={`${themeClasses.text} font-medium`}>Google Analytics</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500" />
            </label>
          </div>
        </div>
      </div>
      <div>
        <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
          Webhook URL
        </label>
        <input
          type="url"
          defaultValue="https://api.example.com/webhook"
          className={`w-full ${themeClasses.input} border rounded-xl px-4 py-3 ${themeClasses.text} outline-none`}
          placeholder="https://api.example.com/webhook"
        />
      </div>
    </div>
  );

  const renderBillingSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${themeClasses.card} border rounded-xl p-6`}>
          <h4 className={`${themeClasses.text} font-semibold mb-4`}>Current Plan</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className={`${themeClasses.textSecondary}`}>Plan</span>
              <span className={`${themeClasses.text} font-semibold`}>Professional</span>
            </div>
            <div className="flex justify-between">
              <span className={`${themeClasses.textSecondary}`}>Billing Cycle</span>
              <span className={`${themeClasses.text} font-semibold`}>Monthly</span>
            </div>
            <div className="flex justify-between">
              <span className={`${themeClasses.textSecondary}`}>Next Billing</span>
              <span className={`${themeClasses.text} font-semibold`}>2024-12-03</span>
            </div>
          </div>
          <button className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all">
            Upgrade Plan
          </button>
        </div>
        <div className={`${themeClasses.card} border rounded-xl p-6`}>
          <h4 className={`${themeClasses.text} font-semibold mb-4`}>Payment Method</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard size={20} className={themeClasses.text} />
                <span className={`${themeClasses.text}`}>**** **** **** 1234</span>
              </div>
              <button className={`${themeClasses.hover} px-3 py-1 rounded-lg text-sm`}>
                Update
              </button>
            </div>
            <label className="flex items-center justify-between">
              <span className={`${themeClasses.text} font-medium`}>Auto-renewal</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'display':
        return renderDisplayPreferences();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>Settings</h2>
          <p className={themeClasses.textSecondary}>Manage your account and application preferences</p>
        </div>
        <div className="flex items-center gap-3">
          <button className={`px-4 py-2 ${themeClasses.hover} border ${themeClasses.card} rounded-xl flex items-center gap-2`}>
            <RefreshCw size={20} className={themeClasses.text} /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save size={20} />
            )}
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-4 shadow-lg`}>
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-lg'
                    : `${themeClasses.text} ${themeClasses.hover}`
                }`}
              >
                <tab.icon size={20} />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className={`lg:col-span-3 space-y-6`}>
          <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg`}>
            <div className="mb-6">
              <h3 className={`text-xl font-bold ${themeClasses.text} mb-2`}>
                {tabs.find(t => t.id === activeTab)?.label}
              </h3>
              <p className={themeClasses.textSecondary}>
                {activeTab === 'general' 
                  ? 'Configure your general system preferences' 
                  : 'Customize your display and appearance settings'}
              </p>
            </div>
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`${themeClasses.card} border rounded-xl p-4 text-center`}>
        <p className={`${themeClasses.textSecondary} text-sm`}>
          Designed by <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-pink-500">El-Technologies</span>
        </p>
      </div>
    </div>
  );
};