import React from 'react';
import { X, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import systemConfigApi from '../../services/systemConfigApi';

interface SidebarProps {
  isDark: boolean;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  menuItems: Array<{
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    page: string;
  }>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isDark,
  collapsed,
  setCollapsed,
  currentPage,
  setCurrentPage,
  menuItems
}) => {
  const [siteName, setSiteName] = useState('REACTZ');

  const themeClasses = {
    bg: isDark ? 'bg-gray-900' : 'bg-gray-50',
    card: isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200',
    text: isDark ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-400' : 'text-gray-600',
    sidebar: isDark ? 'bg-gray-800/80 border-gray-700/50' : 'bg-white border-gray-200',
    hover: isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100',
    input: isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-300',
  };

  useEffect(() => {
    const loadSiteName = async () => {
      try {
        const config = await systemConfigApi.getSystemConfig('site_name');
        if (config) {
          setSiteName(config.value);
        }
      } catch (error) {
        console.error('Failed to load site name:', error);
      }
    };
    loadSiteName();
  }, []);

  return (
    <aside className={`fixed left-0 top-0 h-full ${themeClasses.sidebar} border-r backdrop-blur-xl transition-all duration-300 z-40 ${
      collapsed ? 'w-20' : 'w-64'
    }`}>
      <div className="flex items-center justify-between p-6">
        {!collapsed && (
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">
            {siteName}
          </h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`${themeClasses.hover} p-2 rounded-lg hidden lg:block`}
        >
          {collapsed ? (
            <Menu className={themeClasses.text} size={24} />
          ) : (
            <X className={themeClasses.text} size={24} />
          )}
        </button>
      </div>
      
      <nav className="mt-8 px-4">
        {menuItems.map((item, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(item.page)}
            className={`w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-xl transition-all ${
              currentPage === item.page
                ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-lg'
                : `${themeClasses.text} ${themeClasses.hover}`
            }`}
            title={collapsed ? item.label : ''}
          >
            <item.icon size={20} />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
};