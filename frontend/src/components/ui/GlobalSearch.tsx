import React, { useState, useRef, useEffect } from 'react';
import { Search, Clock, TrendingUp, X, Package, User, ShoppingCart, FileText } from 'lucide-react';
import { useSearch } from '../../contexts/SearchContext';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  themeClasses: Record<string, string>;
  isDark: boolean;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  themeClasses,
  isDark
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    searchQuery,
    searchResults,
    isSearching,
    performGlobalSearch,
    clearSearch,
    recentSearches,
    addToRecentSearches,
    setSearchQuery
  } = useSearch();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle input changes
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    performGlobalSearch(query);
    if (query.trim()) {
      addToRecentSearches(query);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setSearchQuery(value);
    if (value.trim()) {
      performGlobalSearch(value);
    } else {
      clearSearch();
    }
  };

  const handleSelectResult = (result: any) => {
    // Handle navigation based on result type
    console.log('Selected result:', result);
    onClose();
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'customer': return User;
      case 'product': return Package;
      case 'order': return ShoppingCart;
      case 'page': return FileText;
      default: return Search;
    }
  };

  const getResultTitle = (result: any) => {
    return result.item.name || result.item.customer || result.item.title || result.item.id;
  };

  const getResultSubtitle = (result: any) => {
    if (result.type === 'customer') {
      return result.item.email;
    }
    if (result.type === 'product') {
      return `${result.item.category} • ${result.item.price}`;
    }
    if (result.type === 'order') {
      return `${result.item.customer} • ${result.item.amount}`;
    }
    return result.type;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
      <div className="flex items-start justify-center pt-20">
        <div 
          ref={containerRef}
          className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden`}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 p-6 border-b border-gray-700/50">
            <Search className={`${themeClasses.textSecondary} flex-shrink-0`} size={24} />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Search products, customers, orders, and more..."
              className={`flex-1 bg-transparent ${themeClasses.text} text-lg outline-none placeholder-gray-500`}
            />
            {inputValue && (
              <button
                onClick={() => {
                  setInputValue('');
                  clearSearch();
                }}
                className={`${themeClasses.hover} p-1 rounded-full flex-shrink-0`}
              >
                <X className={themeClasses.textSecondary} size={20} />
              </button>
            )}
          </div>

          {/* Results Container */}
          <div className="max-h-96 overflow-y-auto">
            {isSearching ? (
              <div className="p-6 text-center">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className={themeClasses.textSecondary}>Searching...</span>
                </div>
              </div>
            ) : searchQuery && searchResults.length === 0 ? (
              <div className="p-6 text-center">
                <Search className={`mx-auto ${themeClasses.textSecondary} mb-2`} size={48} />
                <p className={`${themeClasses.textSecondary} mb-1`}>No results found</p>
                <p className={`${themeClasses.textSecondary} text-sm`}>
                  Try searching for "headphones", "sarah", or "order"
                </p>
              </div>
            ) : inputValue ? (
              <div className="py-2">
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="px-4">
                    <h3 className={`text-xs font-semibold ${themeClasses.textSecondary} uppercase tracking-wider mb-2`}>
                      Results ({searchResults.length})
                    </h3>
                    {searchResults.map((result, index) => {
                      const Icon = getResultIcon(result.type);
                      return (
                        <button
                          key={index}
                          onClick={() => handleSelectResult(result)}
                          className={`w-full flex items-center gap-3 p-3 ${themeClasses.hover} rounded-xl text-left group`}
                        >
                          <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Icon className="text-violet-500" size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`${themeClasses.text} font-medium truncate`}>
                              {getResultTitle(result)}
                            </p>
                            <p className={`${themeClasses.textSecondary} text-sm truncate`}>
                              {getResultSubtitle(result)}
                            </p>
                          </div>
                          <div className="text-xs text-violet-500 font-medium">
                            {result.relevanceScore}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="px-6 pb-4">
                    <h3 className={`text-xs font-semibold ${themeClasses.textSecondary} uppercase tracking-wider mb-3`}>
                      Recent Searches
                    </h3>
                    <div className="space-y-1">
                      {recentSearches.slice(0, 5).map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleSearch(search)}
                          className={`w-full flex items-center gap-3 p-2 ${themeClasses.hover} rounded-lg text-left`}
                        >
                          <Clock className={`${themeClasses.textSecondary}`} size={16} />
                          <span className={`${themeClasses.text}`}>{search}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Searches */}
                <div className="px-6">
                  <h3 className={`text-xs font-semibold ${themeClasses.textSecondary} uppercase tracking-wider mb-3`}>
                    Popular
                  </h3>
                  <div className="space-y-1">
                    {[
                      { query: 'wireless headphones', icon: TrendingUp },
                      { query: 'sarah johnson', icon: TrendingUp },
                      { query: 'pending orders', icon: TrendingUp },
                      { query: 'electronics', icon: TrendingUp }
                    ].map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearch(item.query)}
                        className={`w-full flex items-center gap-3 p-2 ${themeClasses.hover} rounded-lg text-left`}
                      >
                        <item.icon className={`${themeClasses.textSecondary}`} size={16} />
                        <span className={`${themeClasses.text}`}>{item.query}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="px-6 pt-4 mt-4 border-t border-gray-700/50">
                  <h3 className={`text-xs font-semibold ${themeClasses.textSecondary} uppercase tracking-wider mb-3`}>
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        handleSearch('create product');
                        onClose();
                      }}
                      className={`flex items-center gap-2 p-3 ${themeClasses.card} border rounded-lg ${themeClasses.hover} text-left`}
                    >
                      <Package className="text-violet-500" size={16} />
                      <span className={`${themeClasses.text} text-sm`}>Add Product</span>
                    </button>
                    <button
                      onClick={() => {
                        handleSearch('new customer');
                        onClose();
                      }}
                      className={`flex items-center gap-2 p-3 ${themeClasses.card} border rounded-lg ${themeClasses.hover} text-left`}
                    >
                      <User className="text-violet-500" size={16} />
                      <span className={`${themeClasses.text} text-sm`}>Add Customer</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`px-6 py-3 border-t border-gray-700/50 flex items-center justify-between text-xs ${themeClasses.textSecondary}`}>
            <div className="flex items-center gap-4">
              <span>Enter to search</span>
              <span>Esc to close</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className={`px-2 py-1 ${themeClasses.card} border rounded text-xs`}>⌘K</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};