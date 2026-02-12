import { useState } from 'react';
import { Filter, X } from 'lucide-react';
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

export default function FilterBar({ filters, onFilterChange, showPeriod = true }) {
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key, value) => {
    onFilterChange({ ...filters, [key]: value === 'All' ? '' : value });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {showPeriod && (
          <div className="flex bg-dark-800 rounded-lg p-1">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => updateFilter('period', p.value)}
                className={clsx(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  filters.period === p.value
                    ? 'bg-accent-500 text-white'
                    : 'text-dark-400 hover:text-dark-100'
                )}
              >
                {p.label}
              </button>
            ))}
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
          if (!value || key === 'period') return null;
          return (
            <span
              key={key}
              className="badge bg-accent-500/20 text-accent-300 gap-1"
            >
              {key}: {value}
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
