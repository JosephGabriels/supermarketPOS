
import { useState, useEffect } from 'react';
import {
  Home,
  Users as UsersIcon,
  ShoppingCart,
  Package,
  FileText,
  Settings as SettingsIcon,
  Warehouse,
  LogOut,
  Tags,
  Truck,
  Building,
  ShoppingBag,
  Clock,
  Banknote,
} from 'lucide-react';

// Layout Components
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';

// Page Components
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { Sales } from './pages/Sales';
import { POS } from './pages/POS';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Inventory } from './pages/Inventory';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { Categories } from './pages/Categories';
import { Suppliers } from './pages/Suppliers';
import { Branches } from './pages/Branches';
import UsersPage from './pages/Users';
import { ShiftManagement } from './pages/ShiftManagement';
import { Cash } from './pages/Cash';

// Context Providers
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SearchProvider } from './contexts/SearchContext';
import { RealtimeProvider, useLiveNotifications } from './contexts/RealtimeContext';


// UI Components
import { GlobalSearch } from './components/ui/GlobalSearch';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

import type { Notification } from './types';

function AppContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const [isDark, setIsDark] = useState(() => {
    // Load theme from localStorage or default to dark
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('pos_theme');
      return savedTheme ? savedTheme === 'dark' : true;
    }
    return true;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Load sidebar state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [currentPage, setCurrentPage] = useState(() => {
    // Load current page from localStorage or URL, default to dashboard
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const pageFromUrl = urlParams.get('page');
      const savedPage = localStorage.getItem('pos_current_page');
      return pageFromUrl || savedPage || 'dashboard';
    }
    return 'dashboard';
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [currentSaleId, setCurrentSaleId] = useState<string | null>(null);

  // Use the live notifications hook
  const { notifications, markAsRead, markAllAsRead } = useLiveNotifications();

  // Menu items configuration with role-based access
  const getMenuItems = () => {
    const baseItems = [
      { icon: Home, label: 'Dashboard', page: 'dashboard' },
      { icon: ShoppingCart, label: 'POS', page: 'pos' },
      { icon: UsersIcon, label: 'Customers', page: 'customers' },
    ];

    if (user?.role === 'cashier') {
      return [
        ...baseItems, 
        { icon: Package, label: 'Products', page: 'products' },
        { icon: ShoppingBag, label: 'Sales', page: 'sales' },
        { icon: FileText, label: 'Reports', page: 'reports' }
      ];
    }

    const managerItems = [
      ...baseItems,
      { icon: Package, label: 'Products', page: 'products' },
      { icon: Tags, label: 'Categories', page: 'categories' },
      { icon: Warehouse, label: 'Inventory', page: 'inventory' },
      { icon: Truck, label: 'Suppliers', page: 'suppliers' },
      { icon: Building, label: 'Branches', page: 'branches' },
      { icon: UsersIcon, label: 'Users', page: 'users' },
      { icon: Clock, label: 'Shifts', page: 'shifts' },
      { icon: Banknote, label: 'Cash', page: 'cash' },
      { icon: ShoppingBag, label: 'Sales', page: 'sales' },
      { icon: FileText, label: 'Reports', page: 'reports' },
      { icon: SettingsIcon, label: 'Settings', page: 'settings' },
    ];

    if (user?.role === 'manager') {
      return managerItems;
    }

    // Admin gets all (same as manager but kept for clarity)
    return managerItems;
  };

  const menuItems = getMenuItems();

  // Theme classes for consistent styling
  const themeClasses = {
    bg: isDark ? 'bg-gray-900' : 'bg-gray-50',
    card: isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200',
    text: isDark ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-400' : 'text-gray-600',
    sidebar: isDark ? 'bg-gray-800/80 border-gray-700/50' : 'bg-white border-gray-200',
    hover: isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100',
    input: isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-300',
  };

  // Helper function to handle page navigation
  const handlePageChange = (page: string) => {
    const validPages = ['dashboard', 'customers', 'pos', 'sales', 'products', 'categories', 'suppliers', 'branches', 'inventory', 'users', 'shifts', 'reports', 'settings', 'profile', 'cash'];
    if (validPages.includes(page)) {
      setCurrentPage(page);
    }
  };

  // Handle page rendering
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard isDark={isDark} themeClasses={themeClasses} />;
      case 'customers':
        return <Customers isDark={isDark} themeClasses={themeClasses} />;
      case 'pos':
        return <POS isDark={isDark} themeClasses={themeClasses} />;
      case 'sales':
        return <Sales isDark={isDark} themeClasses={themeClasses} />;
      case 'orders':
        return <Orders isDark={isDark} themeClasses={themeClasses} />;
      case 'products':
        return <Products isDark={isDark} themeClasses={themeClasses} />;
      case 'categories':
        return <Categories isDark={isDark} themeClasses={themeClasses} />;
      case 'suppliers':
        return <Suppliers isDark={isDark} themeClasses={themeClasses} />;
      case 'branches':
        return <Branches isDark={isDark} themeClasses={themeClasses} />;
      case 'inventory':
        return <Inventory isDark={isDark} themeClasses={themeClasses} />;
      case 'users':
        return <UsersPage isDark={isDark} themeClasses={themeClasses} />;
      case 'shifts':
        return <ShiftManagement isDark={isDark} themeClasses={themeClasses} />;
      case 'reports':
        return <Reports isDark={isDark} themeClasses={themeClasses} />;
      case 'cash':
        return <Cash isDark={isDark} themeClasses={themeClasses} />;
      case 'settings':
        return <Settings isDark={isDark} setIsDark={setIsDark} themeClasses={themeClasses} />;
      case 'profile':
        return <Profile isDark={isDark} themeClasses={themeClasses} />;
      default:
        return <Dashboard isDark={isDark} themeClasses={themeClasses} />;
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle URL parameters on mount and browser navigation
  useEffect(() => {
    const handleInitialLoad = () => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const pageFromUrl = urlParams.get('page');
        const savedPage = localStorage.getItem('pos_current_page');
        const validPages = ['dashboard', 'customers', 'pos', 'sales', 'products', 'categories', 'suppliers', 'branches', 'inventory', 'users', 'shifts', 'reports', 'settings', 'profile', 'cash'];
        
        // Priority: URL parameter > saved page > default
        if (pageFromUrl && validPages.includes(pageFromUrl)) {
          setCurrentPage(pageFromUrl);
        } else if (savedPage && validPages.includes(savedPage)) {
          setCurrentPage(savedPage);
        }
      }
    };

    // Handle initial load
    handleInitialLoad();

    // Handle browser navigation (back/forward buttons)
    const handlePopState = () => {
      handleInitialLoad();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Auto-save theme preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_theme', isDark ? 'dark' : 'light');
    }
  }, [isDark]);

  // Auto-save current page
  useEffect(() => {
    if (typeof window !== 'undefined' && currentPage) {
      localStorage.setItem('pos_current_page', currentPage);
      // Update URL without page refresh
      const url = new URL(window.location.href);
      url.searchParams.set('page', currentPage);
      window.history.replaceState({}, '', url.toString());
    }
  }, [currentPage]);

  // Auto-save sidebar state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_sidebar_collapsed', JSON.stringify(sidebarCollapsed));
    }
  }, [sidebarCollapsed]);

  // Show login screen if not authenticated
  if (authLoading) {
    return (
      <div className={`${themeClasses.bg} min-h-screen flex items-center justify-center`}>
        <LoadingSpinner themeClasses={themeClasses} isDark={isDark} size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Login isDark={isDark} />;
  }

  return (
    <div className={`${themeClasses.bg} min-h-screen`}>
      {/* Sidebar */}
      <Sidebar
        isDark={isDark}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        currentPage={currentPage}
        setCurrentPage={handlePageChange}
        menuItems={menuItems}
      />

      {/* Main Content */}
      <div className={`${sidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300`}>
        {/* Header */}
        <Header
          isDark={isDark}
          setIsDark={setIsDark}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          showProfile={showProfile}
          setShowProfile={setShowProfile}
          notifications={notifications}
          onNotificationClick={markAsRead}
          onMarkAllRead={markAllAsRead}
          onGlobalSearch={() => setShowGlobalSearch(true)}
          onNavigateToProfile={() => {
            handlePageChange('profile');
            setShowProfile(false);
          }}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <main className="p-8 pt-4">
          <ErrorBoundary>
            {renderPage()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        themeClasses={themeClasses}
        isDark={isDark}
      />

      {/* Mobile overlay for sidebar */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RealtimeProvider>
          <SearchProvider>
            <AppContent />
          </SearchProvider>
        </RealtimeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
