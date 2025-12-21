// @ts-nocheck
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Customer, Product, Order } from '../types';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  performGlobalSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
  recentSearches: string[];
  addToRecentSearches: (query: string) => void;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  applyFilters: (items: any[]) => any[];
}

interface SearchResult {
  type: 'customer' | 'product' | 'order' | 'page';
  item: any;
  relevanceScore: number;
  matchedFields: string[];
}

interface SearchFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  categories?: string[];
  status?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  sortBy?: 'relevance' | 'date' | 'name' | 'price';
  sortOrder?: 'asc' | 'desc';
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Mock data for demonstration
/* @ts-ignore */
const mockCustomers: any = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    phone: '+1 234-567-8900',
    avatar: '/avatars/sarah.jpg',
    spent: 'KSh 2,340',
    orders: 15,
    status: 'Active',
    joinedDate: '2023-01-15',
    location: 'New York, USA'
  }
];

/* @ts-ignore */
const mockProducts: any = [
  {
    id: 1,
    name: 'Wireless Headphones',
    category: 1, // Category ID
    category_name: 'Electronics',
    price: 'KSh 129',
    originalPrice: 'KSh 159',
    stock: 45,
    sales: 234,
    rating: 4.5,
    reviews: 89,
    sku: 'WH-001',
    description: 'Premium wireless headphones with noise cancellation',
    weight: '250g',
    dimensions: '18 x 15 x 8 cm',
    tags: ['audio', 'wireless', 'premium'],
    isActive: true,
    createdAt: '2024-01-15',
    updatedAt: '2024-11-01'
  }
];

// @ts-ignore
const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    customer: 'Sarah Johnson',
    customerEmail: 'sarah@example.com',
    date: '2024-11-01',
    amount: 'KSh 234.99',
    status: 'Delivered',
    items: 3,
    trackingNumber: 'TRK123456789',
    paymentMethod: 'Credit Card'
  }
];

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'relevance',
    sortOrder: 'desc'
  });

  const addToRecentSearches = useCallback((query: string) => {
    if (query.trim() && !recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 9)]); // Keep last 10 searches
    }
  }, [recentSearches]);

  const calculateRelevanceScore = (item: any, query: string): number => {
    const lowerQuery = query.toLowerCase();
    let score = 0;

    // Check name/title fields (highest weight)
    if (item.name?.toLowerCase().includes(lowerQuery)) score += 10;
    if (item.title?.toLowerCase().includes(lowerQuery)) score += 10;
    if (item.customer?.toLowerCase().includes(lowerQuery)) score += 8;
    if (item.email?.toLowerCase().includes(lowerQuery)) score += 8;

    // Check description fields
    if (item.description?.toLowerCase().includes(lowerQuery)) score += 5;
    if (item.subject?.toLowerCase().includes(lowerQuery)) score += 5;

    // Check category and tags
    if (item.category_name?.toLowerCase().includes(lowerQuery)) score += 4;
    if (item.category?.toLowerCase().includes(lowerQuery)) score += 4; // fallback for old format
    if (item.tags?.some((tag: string) => tag.toLowerCase().includes(lowerQuery))) score += 3;

    // Check SKU and ID
    if (item.sku?.toLowerCase().includes(lowerQuery)) score += 6;
    if (item.id?.toString().includes(query)) score += 2;

    return score;
  };

  const performGlobalSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      const results: SearchResult[] = [];

      // Search customers
      mockCustomers.forEach(customer => {
        const score = calculateRelevanceScore(customer, query);
        if (score > 0) {
          results.push({
            type: 'customer',
            item: customer,
            relevanceScore: score,
            matchedFields: Object.keys(customer).filter(key => 
              String((customer as any)[key]).toLowerCase().includes(query.toLowerCase())
            )
          });
        }
      });

      // Search products
      mockProducts.forEach(product => {
        const score = calculateRelevanceScore(product, query);
        if (score > 0) {
          results.push({
            type: 'product',
            item: product,
            relevanceScore: score,
            matchedFields: Object.keys(product).filter(key => 
              String((product as any)[key]).toLowerCase().includes(query.toLowerCase())
            )
          });
        }
      });

      // Search orders
      mockOrders.forEach(order => {
        const score = calculateRelevanceScore(order, query);
        if (score > 0) {
          results.push({
            type: 'order',
            item: order,
            relevanceScore: score,
            matchedFields: Object.keys(order).filter(key => 
              String((order as any)[key]).toLowerCase().includes(query.toLowerCase())
            )
          });
        }
      });

      // Sort results by relevance score
      results.sort((a, b) => {
        if (filters.sortBy === 'date') {
          return filters.sortOrder === 'asc' 
            ? new Date(a.item.date || a.item.createdAt).getTime() - new Date(b.item.date || b.item.createdAt).getTime()
            : new Date(b.item.date || b.item.createdAt).getTime() - new Date(a.item.date || a.item.createdAt).getTime();
        }
        if (filters.sortBy === 'name') {
          const nameA = a.item.name || a.item.customer || a.item.title || '';
          const nameB = b.item.name || b.item.customer || b.item.title || '';
          return filters.sortOrder === 'asc' 
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
        }
        if (filters.sortBy === 'price') {
          const priceA = parseFloat(a.item.amount || a.item.price?.replace('$', '') || '0');
          const priceB = parseFloat(b.item.amount || b.item.price?.replace('$', '') || '0');
          return filters.sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
        }
        return b.relevanceScore - a.relevanceScore;
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [filters]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const applyFilters = useCallback((items: any[]) => {
    return items.filter(item => {
      // Apply date range filter
      if (filters.dateRange) {
        const itemDate = new Date(item.date || item.createdAt);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (itemDate < startDate || itemDate > endDate) return false;
      }

      // Apply category filter
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(item.category_name) && !filters.categories.includes(item.category)) return false;
      }

      // Apply status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(item.status)) return false;
      }

      // Apply price range filter
      if (filters.priceRange) {
        const price = parseFloat(item.price?.replace('$', '') || item.amount?.replace('$', '') || '0');
        if (price < filters.priceRange.min || price > filters.priceRange.max) return false;
      }

      return true;
    });
  }, [filters]);

  return (
    <SearchContext.Provider value={{
      searchQuery,
      setSearchQuery,
      searchResults,
      isSearching,
      performGlobalSearch,
      clearSearch,
      recentSearches,
      addToRecentSearches,
      filters,
      setFilters,
      applyFilters
    }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};