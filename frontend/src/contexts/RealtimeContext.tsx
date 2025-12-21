import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Customer, Product, Order, Notification } from '../types';
import { productsApi } from '../services/productsApi';
import { useAuth } from './AuthContext';

interface RealtimeContextType {
  isConnected: boolean;
  lastUpdate: Date | null;
  updateStats: (type: 'customer' | 'product' | 'order', action: 'create' | 'update' | 'delete') => void;
  subscribe: (channel: string, callback: (data: any) => void) => () => void;
  sendMessage: (channel: string, data: any) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

// Mock WebSocket-like functionality for demonstration
class MockWebSocket {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connected = false;

  connect() {
    this.connected = true;
    console.log('MockWebSocket connected');
    
    // Simulate initial connection
    setTimeout(() => {
      this.emit('connection', { status: 'connected' });
    }, 500);

    // Simulate periodic updates
    setInterval(() => {
      this.simulateRandomUpdate();
    }, 30000); // Every 30 seconds
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  private simulateRandomUpdate() {
    if (!this.connected) return;

    const events = [
      {
        type: 'notification',
        data: {
          id: Date.now(),
          type: 'order',
          message: 'New order received',
          time: 'just now',
          unread: true,
          priority: 'medium'
        }
      },
      {
        type: 'stats',
        data: {
          revenue: { change: '+5.2%', value: 'KSh 45,231' },
          users: { change: '+12', value: '8,246' },
          orders: { change: '+3', value: '1,426' }
        }
      }
    ];

    const randomEvent = events[Math.floor(Math.random() * events.length)];
    this.emit('message', randomEvent);
  }

  disconnect() {
    this.connected = false;
    this.listeners.clear();
    console.log('MockWebSocket disconnected');
  }
}

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [ws] = useState(() => new MockWebSocket());

  useEffect(() => {
    ws.connect();
    
    // Connection status listener
    const unsubscribeConnection = ws.on('connection', (data) => {
      setIsConnected(data.status === 'connected');
    });

    // Message listener
    const unsubscribeMessage = ws.on('message', (event) => {
      if (event.type === 'stats') {
        setLastUpdate(new Date());
      }
    });

    return () => {
      unsubscribeConnection();
      unsubscribeMessage();
      ws.disconnect();
    };
  }, [ws]);

  const updateStats = useCallback((type: 'customer' | 'product' | 'order', action: 'create' | 'update' | 'delete') => {
    setLastUpdate(new Date());
    ws.emit('stats-update', { type, action, timestamp: new Date() });
  }, [ws]);

  const subscribe = useCallback((channel: string, callback: (data: any) => void) => {
    return ws.on(channel, callback);
  }, [ws]);

  const sendMessage = useCallback((channel: string, data: any) => {
    ws.emit(channel, data);
  }, [ws]);

  return (
    <RealtimeContext.Provider value={{
      isConnected,
      lastUpdate,
      updateStats,
      subscribe,
      sendMessage
    }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

// Hook for live notifications
export const useLiveNotifications = () => {
  const { subscribe } = useRealtime();
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchLowStockNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      // Fetch all products to ensure we catch all low stock and out of stock items
      // This matches the logic in Inventory.tsx to ensure consistency
      const allProducts = await productsApi.getProducts();
      
      const relevantProducts = allProducts.filter(product => 
        product.is_low_stock || product.stock_quantity === 0
      );
      
      const stockNotifications: Notification[] = relevantProducts.map(product => ({
        id: -product.id, // Use negative ID for low stock to avoid collision and keep it stable
        type: 'alert',
        message: product.stock_quantity === 0 
          ? `Out of stock: ${product.name}` 
          : `Low stock alert: ${product.name} (${product.stock_quantity} left)`,
        time: 'Just now',
        unread: true,
        priority: product.stock_quantity === 0 ? 'high' : 'medium'
      }));

      setNotifications(prev => {
        // Create a map of existing low stock notifications to preserve their state (unread)
        const existingStockNotifs = new Map(
          prev.filter(n => n.type === 'alert').map(n => [n.id, n])
        );

        const mergedStockNotifications = stockNotifications.map(newNotif => {
          const existing = existingStockNotifs.get(newNotif.id);
          if (existing) {
            // Preserve unread status and time
            return { ...newNotif, unread: existing.unread, time: existing.time };
          }
          return newNotif;
        });

        // Keep non-alert notifications
        const otherNotifications = prev.filter(n => n.type !== 'alert');
        return [...mergedStockNotifications, ...otherNotifications];
      });
    } catch (error) {
      console.error('Failed to fetch low stock notifications:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial fetch
    fetchLowStockNotifications();

    // Subscribe to real-time notifications
    const unsubscribe = subscribe('notifications', (event) => {
      if (event.type === 'notification') {
        const newNotification: Notification = {
          ...event.data,
          id: Date.now(),
          time: 'just now',
          unread: true
        };
        
        setNotifications(prev => [newNotification, ...prev]);
        
        if (newNotification.priority === 'high') {
          console.log('High priority notification received');
        }
      }
    });

    // Poll for low stock updates every minute
    const interval = setInterval(fetchLowStockNotifications, 60000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [subscribe, fetchLowStockNotifications, isAuthenticated]);

  const markAsRead = useCallback((id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, unread: false } : notif
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, unread: false }))
    );
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => n.unread).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification
  };
};

// Hook for live data updates
export const useLiveData = () => {
  const { subscribe, lastUpdate, isConnected } = useRealtime();
  const [dashboardStats, setDashboardStats] = useState({
    revenue: { value: 'KSh 45,231', change: '+12.5%' },
    users: { value: '8,234', change: '+8.2%' },
    orders: { value: '1,423', change: '-3.4%' },
    conversion: { value: '3.24%', change: '+2.1%' }
  });

  const [liveMetrics, setLiveMetrics] = useState({
    activeUsers: 156,
    pageViews: 2847,
    bounceRate: '23.4%',
    avgSessionDuration: '4m 32s'
  });

  useEffect(() => {
    const unsubscribe = subscribe('dashboard', (event) => {
      if (event.type === 'stats') {
        setDashboardStats(prev => ({
          ...prev,
          ...event.data
        }));
      }
    });

    const unsubscribeMetrics = subscribe('metrics', (event) => {
      if (event.type === 'live-metrics') {
        setLiveMetrics(prev => ({
          ...prev,
          ...event.data
        }));
      }
    });

    return () => {
      unsubscribe();
      unsubscribeMetrics();
    };
  }, [subscribe]);

  return {
    dashboardStats,
    liveMetrics,
    lastUpdate,
    isConnected
  };
};