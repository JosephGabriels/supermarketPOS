import React, { useRef, useEffect } from 'react';
import { Menu, Search, Bell, Sun, Moon, User, Settings, LogOut, Command } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  showProfile: boolean;
  setShowProfile: (show: boolean) => void;
  notifications: Array<{
    id: number;
    type: string;
    message: string;
    time: string;
    unread: boolean;
    priority: string;
  }>;
  onNotificationClick?: (id: number) => void;
  onMarkAllRead?: () => void;
  onGlobalSearch?: () => void;
  onNavigateToProfile?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDark,
  setIsDark,
  sidebarCollapsed,
  setSidebarCollapsed,
  showNotifications,
  setShowNotifications,
  showProfile,
  setShowProfile,
  notifications,
  onNotificationClick,
  onMarkAllRead,
  onGlobalSearch,
  onNavigateToProfile,
  onLogout
}) => {
  const { user } = useAuth();
  const themeClasses = {
    bg: isDark ? 'bg-gray-900' : 'bg-gray-50',
    card: isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200',
    text: isDark ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-400' : 'text-gray-600',
    sidebar: isDark ? 'bg-gray-800/80 border-gray-700/50' : 'bg-white border-gray-200',
    hover: isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100',
    input: isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-300',
  };

  const unreadCount = notifications.filter(n => n.unread).length;
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }

    if (showNotifications || showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications, showProfile, setShowNotifications, setShowProfile]);

  const handleNotificationClick = (notificationId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    onNotificationClick?.(notificationId);
  };

  const handleSearchFocus = () => {
    onGlobalSearch?.();
  };

  return (
    <header className={`${themeClasses.sidebar} border-b backdrop-blur-xl sticky top-0 z-40`}>
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`${themeClasses.hover} p-2 rounded-lg lg:hidden`}
          >
            <Menu className={themeClasses.text} size={24} />
          </button>
          
          <div 
            className={`flex items-center gap-3 ${themeClasses.input} border rounded-xl px-4 py-2 w-96 hidden md:flex cursor-pointer`}
            onClick={handleSearchFocus}
          >
            <Search className={themeClasses.textSecondary} size={20} />
            <span className={`${themeClasses.textSecondary} flex-1`}>Search...</span>
            <div className="flex items-center gap-1">
              <Command size={14} className={themeClasses.textSecondary} />
              <span className={`${themeClasses.textSecondary} text-xs`}>K</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`${themeClasses.hover} p-2 rounded-lg`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className={themeClasses.text} size={20} /> : <Moon className={themeClasses.text} size={20} />}
          </button>
          
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifications(!showNotifications);
              }}
              className={`${themeClasses.hover} p-2 rounded-lg relative`}
              aria-label="Notifications"
            >
              <Bell className={themeClasses.text} size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className={`absolute right-0 mt-2 w-80 ${themeClasses.card} border rounded-xl shadow-2xl z-50 animate-in slide-in-from-top-2 duration-200`}>
                <div className="p-4 border-b border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <h3 className={`${themeClasses.text} font-bold`}>Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAllRead?.();
                        }}
                        className="text-xs text-violet-500 hover:text-violet-600"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className={`${themeClasses.textSecondary} text-sm`}>No notifications</p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={(e) => handleNotificationClick(notif.id, e)}
                          className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                            notif.unread 
                              ? 'bg-violet-500/10 border-l-4 border-violet-500' 
                              : `${themeClasses.hover}`
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              notif.priority === 'high' ? 'bg-red-500' :
                              notif.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              <p className={`${themeClasses.text} text-sm font-medium leading-tight`}>
                                {notif.message}
                              </p>
                              <p className={`${themeClasses.textSecondary} text-xs mt-1`}>
                                {notif.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-gray-700/50">
                  <button className="w-full text-center text-sm text-violet-500 hover:text-violet-600 py-2">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="relative" ref={profileRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowProfile(!showProfile);
              }}
              className={`w-10 h-10 bg-gradient-to-br from-violet-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold hover:shadow-lg transition-all`}
              aria-label="Profile menu"
            >
              {user ? (
                <span className="text-sm font-bold">
                  {user.first_name?.[0] || user.username?.[0] || 'U'}
                </span>
              ) : (
                <User size={20} />
              )}
            </button>
            
            {showProfile && (
              <div className={`absolute right-0 mt-2 w-48 ${themeClasses.card} border rounded-xl shadow-2xl z-50 animate-in slide-in-from-top-2 duration-200`}>
                <div className="p-2">
                  <div className="px-4 py-3 border-b border-gray-700/50 mb-2">
                    <p className={`${themeClasses.text} font-semibold`}>
                      {user ? (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username) : 'User'}
                    </p>
                    <p className={`${themeClasses.textSecondary} text-sm`}>
                      {user?.email || user?.username || 'user@example.com'}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProfile(false);
                      onNavigateToProfile?.();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 ${themeClasses.hover} rounded-lg transition-colors`}
                  >
                    <User size={18} className={themeClasses.text} />
                    <span className={themeClasses.text}>Profile</span>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProfile(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 ${themeClasses.hover} rounded-lg transition-colors`}
                  >
                    <Settings size={18} className={themeClasses.text} />
                    <span className={themeClasses.text}>Settings</span>
                  </button>
                  <hr className={`my-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProfile(false);
                      onLogout?.();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 ${themeClasses.hover} rounded-lg transition-colors text-red-500`}
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};