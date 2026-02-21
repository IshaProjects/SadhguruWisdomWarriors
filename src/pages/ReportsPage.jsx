import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileSpreadsheet, FileText, Search, Filter, X, ChevronUp, ChevronDown,
  ChevronsUpDown, RefreshCw, Tv2, Video,
} from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import { useCategories } from '../hooks/useCategories.js';
import api from '../services/api.js';
import toast from 'react-hot-toast';

/* ── helpers ── */
const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString());

function OutlierBadge({ score }) {
  if (score == null) return <span className="text-dark-500">—</span>;
  const label = `${score.toFixed(2)}×`;
  const cls =
    score >= 3    ? 'bg-green-500/20 text-green-300' :
    score >= 1.5  ? 'bg-emerald-500/15 text-emerald-400' :
    score >= 0.75 ? 'bg-dark-700 text-dark-300' :
    score >= 0.5  ? 'bg-yellow-500/15 text-yellow-400' :
                    'bg-red-500/15 text-red-400';
  return <span className={`badge text-xs font-mono ${cls}`}>{label}</span>;
}

function SortIcon({ col, sort }) {
  const [field, dir] = sort.startsWith('-') ? [sort.slice(1), 'desc'] : [sort, 'asc'];
  if (field !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return dir === 'asc'
    ? <ChevronUp   className="w-3 h-3 text-accent-400" />
    : <ChevronDown className="w-3 h-3 text-accent-400" />;
}

function Th({ label, col, sort, onSort }) {
  return (
    <th
      className="px-3 py-2.5 text-left text-xs font-semibold text-dark-400 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-dark-200 transition-colors"
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">{label}<SortIcon col={col} sort={sort} /></span>
    </th>
  );
}

function Pagination({ page, pages, total, limit, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700 text-sm text-dark-400">
      <span>{total.toLocaleString()} total records</span>
      <div className="flex items-center gap-2">
        <button className="btn-ghost px-2 py-1 text-xs disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
        <span className="text-dark-300">Page {page} of {pages}</span>
        <button className="btn-ghost px-2 py-1 text-xs disabled:opacity-40" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
      </div>
      <span className="text-xs">{limit} per page</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Page
═══════════════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('channels');

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Reports" />
      <div className="p-6 flex-1 space-y-4">
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-dark-700">
          {[
            { id: 'channels', label: 'Channel Report', Icon: Tv2   },
            { id: 'videos',   label: 'Video Report',   Icon: Video  },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === id
                  ? 'border-accent-500 text-accent-400'
                  : 'border-transparent text-dark-400 hover:text-dark-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'channels' && <ChannelReport />}
        {activeTab === 'videos'   && <VideoReport   />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Channel Report Tab
═══════════════════════════════════════════════════════════════════ */
function ChannelReport() {
  const { categories } = useCategories();

  const [filters, setFilters] = useState({
    search: '', category: '', status: '', tags: '',
    minSubs: '', maxSubs: '', minViews: '', maxViews: '', country: '',
  });
  const [showFilters, setShowFilters] = useState(true);
  const [sort,  setSort]  = useState('-subscribers');
  const [page,  setPage]  = useState(1);
  const LIMIT = 50;

  const [rows,       setRows]       = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [loading,    setLoading]    = useState(false);
  const [exporting,  setExporting]  = useState('');

  const debounceRef = useRef(null);

  const fetchData = useCallback(async (f, s, p) => {
    setLoading(true);
    try {
      const params = { ...f, sort: s, page: p, limit: LIMIT, format: 'json' };
      // map sort key back to mongo field name
      params.sort = s.replace('subscribers', 'currentStats.subscribers')
                     .replace('total_views', 'currentStats.views')
                     .replace('video_count', 'currentStats.videoCount');
      const res = await api.get('/export/report/channels', { params });
      setRows(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load channel report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(filters, sort, page), 300);
  }, [filters, sort, page, fetchData]);

  const handleSort = (col) => {
    setSort((prev) => {
      const cur = prev.startsWith('-') ? prev.slice(1) : prev;
      return cur === col ? (prev.startsWith('-') ? col : `-${col}`) : `-${col}`;
    });
    setPage(1);
  };

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', status: '', tags: '', minSubs: '', maxSubs: '', minViews: '', maxViews: '', country: '' });
    setPage(1);
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const params = { ...filters, sort, format };
      params.sort = sort.replace('subscribers', 'currentStats.subscribers')
                        .replace('total_views', 'currentStats.views')
                        .replace('video_count', 'currentStats.videoCount');
      const res = await api.get('/export/report/channels', {
        params,
        responseType: 'blob',
      });
      const ext  = format === 'excel' ? 'xlsx' : 'csv';
      const mime = format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';
      const url  = URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `channel-report-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${ext.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting('');
    }
  };

  const hasFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        {/* Search */}
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search channels…"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="input-field pl-9 w-full text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-ghost flex items-center gap-2 text-sm ${showFilters ? 'text-accent-400' : ''}`}
          >
            <Filter className="w-4 h-4" /> Filters
            {hasFilters && <span className="w-2 h-2 rounded-full bg-accent-500 ml-0.5" />}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost text-xs text-dark-400 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <button onClick={() => fetchData(filters, sort, page)} className="btn-ghost p-2" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={!!exporting}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {exporting === 'csv' ? 'Exporting…' : 'CSV'}
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={!!exporting}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exporting === 'excel' ? 'Exporting…' : 'Excel'}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="glass-card p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-dark-400 mb-1">Category</label>
            <select value={filters.category} onChange={(e) => handleFilterChange('category', e.target.value)} className="input-field text-sm w-full">
              <option value="">All</option>
              {categories.filter((c) => c !== 'Uncategorized').map((c) => <option key={c}>{c}</option>)}
              <option value="Uncategorized">Uncategorized</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Status</label>
            <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className="input-field text-sm w-full">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Country</label>
            <input type="text" placeholder="e.g. US, IN" value={filters.country} onChange={(e) => handleFilterChange('country', e.target.value)} className="input-field text-sm w-full" />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Tags</label>
            <input type="text" placeholder="comma-separated" value={filters.tags} onChange={(e) => handleFilterChange('tags', e.target.value)} className="input-field text-sm w-full" />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Min Subscribers</label>
            <input type="number" min="0" value={filters.minSubs} onChange={(e) => handleFilterChange('minSubs', e.target.value)} className="input-field text-sm w-full" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Max Subscribers</label>
            <input type="number" min="0" value={filters.maxSubs} onChange={(e) => handleFilterChange('maxSubs', e.target.value)} className="input-field text-sm w-full" placeholder="∞" />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Min Total Views</label>
            <input type="number" min="0" value={filters.minViews} onChange={(e) => handleFilterChange('minViews', e.target.value)} className="input-field text-sm w-full" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Max Total Views</label>
            <input type="number" min="0" value={filters.maxViews} onChange={(e) => handleFilterChange('maxViews', e.target.value)} className="input-field text-sm w-full" placeholder="∞" />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-800/60">
              <tr>
                <Th label="#"                  col="_idx"               sort={sort} onSort={handleSort} />
                <Th label="Channel"            col="title"              sort={sort} onSort={handleSort} />
                <Th label="Category"           col="category"           sort={sort} onSort={handleSort} />
                <Th label="Status"             col="status"             sort={sort} onSort={handleSort} />
                <Th label="Country"            col="country"            sort={sort} onSort={handleSort} />
                <Th label="Subscribers"        col="subscribers"        sort={sort} onSort={handleSort} />
                <Th label="Total Views"        col="total_views"        sort={sort} onSort={handleSort} />
                <Th label="Videos"             col="video_count"        sort={sort} onSort={handleSort} />
                <Th label="Avg Views/Video"    col="avg_views_per_video" sort={sort} onSort={handleSort} />
                <Th label="Tags"               col="tags"               sort={sort} onSort={handleSort} />
                <Th label="Assigned To"        col="assigned_to"        sort={sort} onSort={handleSort} />
                <Th label="Last Synced"        col="last_synced"        sort={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/50">
              {loading ? (
                <tr><td colSpan={12} className="text-center py-12 text-dark-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-12 text-dark-400">No channels match the current filters.</td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.youtube_channel_id || i} className="hover:bg-dark-800/40 transition-colors">
                  <td className="px-3 py-2.5 text-dark-500 text-xs">{(page - 1) * LIMIT + i + 1}</td>
                  <td className="px-3 py-2.5 font-medium max-w-[220px] truncate" title={r.title}>{r.title}</td>
                  <td className="px-3 py-2.5 text-dark-300">{r.category || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`badge text-xs capitalize ${
                      r.status === 'active'   ? 'bg-green-500/20 text-green-400' :
                      r.status === 'paused'   ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-dark-600 text-dark-400'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-dark-300">{r.country || '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(r.subscribers)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(r.total_views)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(r.video_count)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(r.avg_views_per_video)}</td>
                  <td className="px-3 py-2.5 text-dark-400 text-xs max-w-[140px] truncate" title={r.tags}>{r.tags || '—'}</td>
                  <td className="px-3 py-2.5 text-dark-300">{r.assigned_to || '—'}</td>
                  <td className="px-3 py-2.5 text-dark-400 text-xs">{r.last_synced || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={LIMIT} onPage={setPage} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Video Report Tab
═══════════════════════════════════════════════════════════════════ */
function VideoReport() {
  const { categories } = useCategories();

  const [filters, setFilters] = useState({
    search: '', category: '', status: '', tags: '',
    minViews: '', maxViews: '', startDate: '', endDate: '', channelId: '',
  });
  const [showFilters, setShowFilters] = useState(true);
  const [sort,  setSort]  = useState('-views');
  const [page,  setPage]  = useState(1);
  const LIMIT = 50;

  const [rows,       setRows]       = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [loading,    setLoading]    = useState(false);
  const [exporting,  setExporting]  = useState('');

  // Channel search for channelId filter
  const [channelSearch, setChannelSearch] = useState('');
  const [channelOptions, setChannelOptions] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const channelDebRef = useRef(null);

  const debounceRef = useRef(null);

  const fetchData = useCallback(async (f, s, p) => {
    setLoading(true);
    try {
      const params = { ...f, sort: s, page: p, limit: LIMIT, format: 'json' };
      const res = await api.get('/export/report/videos', { params });
      setRows(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load video report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(filters, sort, page), 300);
  }, [filters, sort, page, fetchData]);

  // Channel autocomplete
  useEffect(() => {
    if (!channelSearch.trim()) { setChannelOptions([]); return; }
    clearTimeout(channelDebRef.current);
    channelDebRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/channels', { params: { search: channelSearch, limit: 8 } });
        setChannelOptions(res.data.channels || []);
      } catch { /* ignore */ }
    }, 300);
  }, [channelSearch]);

  const selectChannel = (ch) => {
    setSelectedChannel(ch);
    setChannelSearch(ch.title);
    setChannelOptions([]);
    setFilters((prev) => ({ ...prev, channelId: ch._id }));
    setPage(1);
  };

  const clearChannel = () => {
    setSelectedChannel(null);
    setChannelSearch('');
    setFilters((prev) => ({ ...prev, channelId: '' }));
    setPage(1);
  };

  const handleSort = (col) => {
    setSort((prev) => {
      const cur = prev.startsWith('-') ? prev.slice(1) : prev;
      return cur === col ? (prev.startsWith('-') ? col : `-${col}`) : `-${col}`;
    });
    setPage(1);
  };

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', status: '', tags: '', minViews: '', maxViews: '', startDate: '', endDate: '', channelId: '' });
    setSelectedChannel(null);
    setChannelSearch('');
    setPage(1);
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const res = await api.get('/export/report/videos', {
        params: { ...filters, sort, format },
        responseType: 'blob',
      });
      const ext  = format === 'excel' ? 'xlsx' : 'csv';
      const mime = format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';
      const url  = URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `video-report-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${ext.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting('');
    }
  };

  const hasFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search video titles…"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="input-field pl-9 w-full text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-ghost flex items-center gap-2 text-sm ${showFilters ? 'text-accent-400' : ''}`}
          >
            <Filter className="w-4 h-4" /> Filters
            {hasFilters && <span className="w-2 h-2 rounded-full bg-accent-500 ml-0.5" />}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost text-xs text-dark-400 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <button onClick={() => fetchData(filters, sort, page)} className="btn-ghost p-2" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={!!exporting}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {exporting === 'csv' ? 'Exporting…' : 'CSV'}
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={!!exporting}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exporting === 'excel' ? 'Exporting…' : 'Excel'}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="glass-card p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Channel autocomplete */}
          <div className="col-span-2">
            <label className="block text-xs text-dark-400 mb-1">Channel</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search channel…"
                value={channelSearch}
                onChange={(e) => { setChannelSearch(e.target.value); if (!e.target.value) clearChannel(); }}
                className="input-field text-sm w-full pr-7"
              />
              {selectedChannel && (
                <button onClick={clearChannel} className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {channelOptions.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-dark-800 border border-dark-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {channelOptions.map((ch) => (
                    <button
                      key={ch._id}
                      type="button"
                      onClick={() => selectChannel(ch)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-dark-700 transition-colors truncate"
                    >
                      {ch.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-dark-400 mb-1">Category</label>
            <select value={filters.category} onChange={(e) => handleFilterChange('category', e.target.value)} className="input-field text-sm w-full">
              <option value="">All</option>
              {categories.filter((c) => c !== 'Uncategorized').map((c) => <option key={c}>{c}</option>)}
              <option value="Uncategorized">Uncategorized</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-dark-400 mb-1">Channel Status</label>
            <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className="input-field text-sm w-full">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-dark-400 mb-1">Tags</label>
            <input type="text" placeholder="comma-separated" value={filters.tags} onChange={(e) => handleFilterChange('tags', e.target.value)} className="input-field text-sm w-full" />
          </div>

          <div>
            <label className="block text-xs text-dark-400 mb-1">Published From</label>
            <input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} className="input-field text-sm w-full" max={filters.endDate || undefined} />
          </div>

          <div>
            <label className="block text-xs text-dark-400 mb-1">Published To</label>
            <input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} className="input-field text-sm w-full" min={filters.startDate || undefined} />
          </div>

          <div>
            <label className="block text-xs text-dark-400 mb-1">Min Views</label>
            <input type="number" min="0" value={filters.minViews} onChange={(e) => handleFilterChange('minViews', e.target.value)} className="input-field text-sm w-full" placeholder="0" />
          </div>

          <div>
            <label className="block text-xs text-dark-400 mb-1">Max Views</label>
            <input type="number" min="0" value={filters.maxViews} onChange={(e) => handleFilterChange('maxViews', e.target.value)} className="input-field text-sm w-full" placeholder="∞" />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-800/60">
              <tr>
                <Th label="#"               col="_idx"           sort={sort} onSort={handleSort} />
                <Th label="Title"           col="title"          sort={sort} onSort={handleSort} />
                <Th label="Channel"         col="channel"        sort={sort} onSort={handleSort} />
                <Th label="Category"        col="category"       sort={sort} onSort={handleSort} />
                <Th label="Published"       col="published_at"   sort={sort} onSort={handleSort} />
                <Th label="Views"           col="views"          sort={sort} onSort={handleSort} />
                <Th label="Likes"           col="likes"          sort={sort} onSort={handleSort} />
                <Th label="Comments"        col="comments"       sort={sort} onSort={handleSort} />
                <Th label="Engagement %"    col="engagement_rate" sort={sort} onSort={handleSort} />
                <Th label="Outlier Score"   col="outlier_score"  sort={sort} onSort={handleSort} />
                <Th label="Duration"        col="duration"       sort={sort} onSort={handleSort} />
                <Th label="Last Synced"     col="last_synced"    sort={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/50">
              {loading ? (
                <tr><td colSpan={12} className="text-center py-12 text-dark-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-12 text-dark-400">No videos match the current filters.</td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.youtube_video_id || i} className="hover:bg-dark-800/40 transition-colors">
                  <td className="px-3 py-2.5 text-dark-500 text-xs">{(page - 1) * LIMIT + i + 1}</td>
                  <td className="px-3 py-2.5 font-medium max-w-[260px] truncate" title={r.title}>{r.title}</td>
                  <td className="px-3 py-2.5 text-dark-300 max-w-[160px] truncate" title={r.channel}>{r.channel || '—'}</td>
                  <td className="px-3 py-2.5 text-dark-300">{r.category || '—'}</td>
                  <td className="px-3 py-2.5 text-dark-400 text-xs">{r.published_at || '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(r.views)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(r.likes)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(r.comments)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    <span className={`${r.engagement_rate >= 5 ? 'text-green-400' : r.engagement_rate >= 2 ? 'text-yellow-400' : 'text-dark-300'}`}>
                      {r.engagement_rate}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <OutlierBadge score={r.outlier_score} />
                  </td>
                  <td className="px-3 py-2.5 text-dark-400 text-xs">{r.duration || '—'}</td>
                  <td className="px-3 py-2.5 text-dark-400 text-xs">{r.last_synced || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={LIMIT} onPage={setPage} />
      </div>
    </div>
  );
}
