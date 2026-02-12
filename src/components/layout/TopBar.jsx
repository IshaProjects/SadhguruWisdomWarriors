import { Search, Moon, Sun, Bell } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useState } from 'react';

export default function TopBar({ title, onSearch }) {
  const { isDark, toggleTheme } = useTheme();
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = (e) => {
    setSearchValue(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header className="h-16 border-b border-dark-700/50 bg-dark-900/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-40">
      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="flex items-center gap-3">
        {onSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchValue}
              onChange={handleSearch}
              className="input-field pl-9 w-64 text-sm"
            />
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-dark-100 transition-colors"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-dark-100 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
