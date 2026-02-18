import { useState } from 'react';
import { Filter, X, Calendar } from 'lucide-react';
import clsx from 'clsx';

const periods = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

const categories = [
  'All',
  'Gaming',
  'Education',
  'Tech',
  'Entertainment',
  'Music',
  'Sports',
  'News',
  'Lifestyle',
  'Uncategorized',
];

const statuses = ['All', 'active', 'paused', 'archived'];

export default function FilterBar({ filters, onFilterChange, showPeriod = true, showDateRange = false }) {
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key, value) => {
    const next = { ...filters, [key]: value === 'All' ? '' : value };
    // When selecting a period tab, clear custom date range so API uses the tab's period
    if (key === 'period') {
      next.startDate = '';
      next.endDate = '';
    }
    onFilterChange(next);
  };

  const clearDateRange = () => {
    onFilterChange({ ...filters, startDate: '', endDate: '' });
  };

  const isPeriodActive = (periodValue) =>
    filters.period === periodValue && !(filters.startDate && filters.endDate);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {showPeriod && (
          <div className="flex bg-dark-800 rounded-lg p-1">
            {periods.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => updateFilter('period', p.value)}
                className={clsx(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  isPeriodActive(p.value)
                    ? 'bg-accent-500 text-white'
                    : 'text-dark-400 hover:text-dark-100'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {showDateRange && (
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-dark-400 shrink-0" />
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => updateFilter('startDate', e.target.value)}
              className="input-field text-sm py-1.5 w-40"
              max={filters.endDate || undefined}
            />
            <span className="text-dark-500 text-sm">to</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => updateFilter('endDate', e.target.value)}
              className="input-field text-sm py-1.5 w-40"
              min={filters.startDate || undefined}
            />
            {(filters.startDate || filters.endDate) && (
              <button
                type="button"
                onClick={clearDateRange}
                className="btn-ghost text-xs p-1.5 text-dark-400 hover:text-dark-200"
                title="Clear date range"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx(
            'btn-ghost flex items-center gap-2 text-sm',
            showFilters && 'bg-dark-800 text-dark-100'
          )}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>

        {/* Active filter tags */}
        {Object.entries(filters).map(([key, value]) => {
          if (key === 'period' || key === 'startDate' || key === 'endDate') return null;
          const str = typeof value === 'string' ? value.trim() : value;
          if (!str) return null;
          return (
            <span
              key={key}
              className="badge bg-accent-500/20 text-accent-300 gap-1"
            >
              {key}: {typeof value === 'string' ? value.trim() : value}
              <button onClick={() => updateFilter(key, '')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>

      {showFilters && (
        <div className="flex items-center gap-4 p-3 glass-card">
          <div>
            <label className="text-xs text-dark-400 block mb-1">Category</label>
            <select
              value={filters.category || 'All'}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="input-field text-sm py-1.5"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-dark-400 block mb-1">Status</label>
            <select
              value={filters.status || 'All'}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="input-field text-sm py-1.5"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-dark-400 block mb-1">Tags</label>
            <input
              type="text"
              placeholder="e.g. priority,new"
              value={filters.tags || ''}
              onChange={(e) => updateFilter('tags', e.target.value)}
              className="input-field text-sm py-1.5 w-40"
            />
          </div>
        </div>
      )}
    </div>
  );
}
