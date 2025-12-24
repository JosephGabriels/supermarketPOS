import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  MoreVertical,
  Check,
  X,
  ArrowUpDown
} from 'lucide-react';
import type { TableColumn } from '../../types';

interface DataTableProps {
  data: any[];
  columns: TableColumn[];
  isLoading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  actions?: {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    action: (item: any) => void;
    variant?: 'primary' | 'danger' | 'secondary';
  }[];
  onRowClick?: (item: any) => void;
  onSearch?: (searchTerm: string) => void;
  serverSide?: boolean;
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  themeClasses: Record<string, string>;
  emptyMessage?: string;
  isDark: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  isLoading = false,
  searchable = true,
  filterable = true,
  pagination = true,
  pageSize = 10,
  actions = [],
  onRowClick,
  onSearch,
  serverSide = false,
  totalItems = 0,
  currentPage: propCurrentPage,
  onPageChange,
  themeClasses,
  emptyMessage = "No data available",
  isDark
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [internalPage, setInternalPage] = useState(1);
  const currentPage = propCurrentPage !== undefined ? propCurrentPage : internalPage;
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    let filtered = data;

    // Apply client-side search filter only if onSearch is not provided
    // (onSearch means server-side search is handled by parent component)
    if (searchTerm && !onSearch) {
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([column, filterValue]) => {
      if (filterValue) {
        filtered = filtered.filter(item =>
          String(item[column]).toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });

    return filtered;
  }, [data, searchTerm, filters, onSearch]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (serverSide) return sortedData; // Server already paginated
    if (!pagination) return sortedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, pagination, serverSide]);

  const totalPages = serverSide 
    ? Math.ceil(totalItems / pageSize)
    : Math.ceil(sortedData.length / pageSize);

  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    } else {
      setInternalPage(page);
    }
  };

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handleSelectRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedData.map((_, i) => i)));
    }
  };

  const handleFilterChange = (column: string, value: string) => {
    setFilters(prev => ({ ...prev, [column]: value }));
    if (!serverSide) setInternalPage(1);
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`h-16 ${themeClasses.card} rounded-xl animate-pulse`}>
          <div className="flex items-center gap-4 p-4">
            <div className="w-8 h-8 bg-gray-300 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden`}>
      {/* Header with search and filters */}
      {(searchable || filterable) && (
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-4 mb-4">
            {searchable && (
              <div className={`flex items-center gap-3 ${themeClasses.input} border rounded-xl px-4 py-2 flex-1`}>
                <Search className={themeClasses.textSecondary} size={20} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (!serverSide) setInternalPage(1);
                    if (onSearch) {
                      onSearch(e.target.value);
                    }
                  }}
                  className={`bg-transparent ${themeClasses.text} outline-none flex-1`}
                />
              </div>
            )}
            {filterable && (
              <button className={`${themeClasses.hover} px-4 py-2 rounded-xl border ${themeClasses.card} flex items-center gap-2`}>
                <Filter size={20} className={themeClasses.text} /> Filters
              </button>
            )}
          </div>

          {/* Quick filters */}
          {filterable && Object.keys(filters).length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(filters).map(([column, value]) => (
                value && (
                  <span key={column} className={`px-3 py-1 ${themeClasses.card} border rounded-full text-sm flex items-center gap-2`}>
                    {column}: {value}
                    <button
                      onClick={() => handleFilterChange(column, '')}
                      className={themeClasses.textSecondary}
                    >
                      <X size={14} />
                    </button>
                  </span>
                )
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`${isDark ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
              {selectedRows.size > 0 && (
                <th className={`${themeClasses.text} text-left p-4 font-semibold w-12`}>
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${themeClasses.text} text-left p-4 font-semibold ${column.sortable ? 'cursor-pointer hover:bg-gray-700/20' : ''} ${column.width ? column.width : ''}`}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && (
                      sortColumn === column.key ? (
                        sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      ) : (
                        <ArrowUpDown size={16} className="opacity-50" />
                      )
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className={`${themeClasses.text} text-left p-4 font-semibold w-24`}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions.length > 0 ? 1 : 0) + (selectedRows.size > 0 ? 1 : 0)} className="p-8 text-center">
                  <div className="text-gray-500">{emptyMessage}</div>
                </td>
              </tr>
            ) : (
              paginatedData.map((item, i) => (
                <tr
                  key={i}
                  className={`border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200'} ${themeClasses.hover} ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {selectedRows.size > 0 && (
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(i)}
                        onChange={() => handleSelectRow(i)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="p-4">
                      {column.render ? column.render(item[column.key], item) : String(item[column.key] || '')}
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {actions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.action(item);
                            }}
                            className={`${themeClasses.hover} p-2 rounded-lg ${
                              action.variant === 'danger' ? 'text-red-500 hover:bg-red-500/10' : ''
                            }`}
                            title={action.label}
                          >
                            <action.icon size={18} />
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="p-6 border-t border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className={`${themeClasses.textSecondary} text-sm`}>
              {serverSide 
                ? `Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, totalItems)} of ${totalItems} results`
                : `Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, sortedData.length)} of ${sortedData.length} results`
              }
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : themeClasses.hover}`}
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Logic to show pages around current page, not just 1-5
                let page = i + 1;
                if (totalPages > 5) {
                   if (currentPage > 3) {
                      page = currentPage - 2 + i;
                   }
                   if (page > totalPages) {
                      page = totalPages - 4 + i;
                   }
                }
                
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 rounded-lg ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white'
                        : themeClasses.hover
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : themeClasses.hover}`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};