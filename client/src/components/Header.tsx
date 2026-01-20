import { Search, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface HeaderProps {
  title: string;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  actions?: React.ReactNode;
  filterOptions?: FilterOption[];
  filterValue?: string;
  onFilterChange?: (value: string) => void;
}

export default function Header({ title, showSearch, onSearch, actions, filterOptions, filterValue, onFilterChange }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-surface-200/60">
      <div className="px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
        {/* Title */}
        <h1 className="text-lg font-semibold text-surface-900">{title}</h1>
        
        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Filter Dropdown */}
          {filterOptions && filterOptions.length > 0 && (
            <div className="relative">
              <select
                value={filterValue}
                onChange={(e) => onFilterChange?.(e.target.value)}
                className="appearance-none pl-4 pr-9 py-2 bg-surface-50 border border-surface-200 rounded-xl text-sm font-medium text-surface-700 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
              >
                {filterOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
            </div>
          )}

          {/* Search */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Qidirish..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-48 lg:w-64 pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          )}
          
          {/* Custom Actions */}
          {actions}
        </div>
      </div>
    </header>
  );
}
