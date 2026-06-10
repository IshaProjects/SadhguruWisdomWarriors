import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  FileSpreadsheet, FileText, Search, Filter, X, ChevronUp, ChevronDown,
  ChevronsUpDown, RefreshCw, Tv2, Video, Tag, Layers,
} from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import DateRangePicker from '../components/common/DateRangePicker.jsx';
import { useCategories } from '../hooks/useCategories.js';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import { getUtcCurrentMonthRange, toUtcDateInputValue } from '../utils/dateUtc.js';

/* ── helpers ── */
const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString());

function getCurrentMonthRange() {
  return getUtcCurrentMonthRange();
}

/* Single popover-style date range picker with presets — see DateRangePicker.jsx */

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
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Reports" />
      <div className="p-6 flex-1 space-y-4">
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-dark-700">
          {[
            { id: 'channels',     label: 'Channel Report',    Icon: Tv2     },
            { id: 'videos',       label: 'Video Report',      Icon: Video   },
            { id: 'categories',  label: 'Category Report',   Icon: Tag     },
            { id: 'micro-units', label: 'Micro Unit Report', Icon: Layers  },
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

        {activeTab === 'channels'     && <ChannelReport    />}
        {activeTab === 'videos'       && <VideoReport      />}
        {activeTab === 'categories'   && <CategoryReport   />}
        {activeTab === 'micro-units'  && <MicroUnitReport   />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Channel Report Tab
═══════════════════════════════════════════════════════════════════ */
function ChannelReport() {
  const { categories } = useCategories();
  const monthRange = getCurrentMonthRange();

  const [filters, setFilters] = useState({
    search: '', category: '', status: '', tags: '', classification: '',
    minSubs: '', maxSubs: '', minViews: '', maxViews: '', country: '',
    startDate: monthRange.startDate,
    endDate:   monthRange.endDate,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sort,  setSort]  = useState('-subscribers');
  const [page,  setPage]  = useState(1);
  const LIMIT = 50;

  const [rows,       setRows]       = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [exporting,  setExporting]  = useState('');

  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const fetchData = useCallback(async (f, s, p) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const params = { ...f, sort: s, page: p, limit: LIMIT, format: 'json' };
      // map sort key back to mongo/row field name (period fields pass through as-is)
      const isPeriodSort = ['views_in_period', 'subscribers_in_period', 'videos_in_period'].includes(s.replace(/^[-+]/, ''));
      params.sort = isPeriodSort ? s : s.replace('subscribers', 'currentStats.subscribers')
                                         .replace('total_views', 'currentStats.views')
                                         .replace('video_count', 'currentStats.videoCount');
      const res = await api.get('/export/report/channels', { params, signal: controller.signal });
      setRows(res.data.data);
      setPagination(res.data.pagination);
      setSummary(res.data.summary ?? null);
    } catch (err) {
      if (err?.code === 'ERR_CANCELED') return;
      toast.error('Failed to load channel report');
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(filters, sort, page), 300);
  }, [filters, sort, page, fetchData]);

  // Default sort to Views (Period) when date range selected; reset when leaving period mode
  useEffect(() => {
    const curKey = sort.replace(/^[-+]/, '');
    const isPeriodSort = ['views_in_period', 'subscribers_in_period', 'videos_in_period'].includes(curKey);
    if (filters.startDate && filters.endDate) {
      if (!isPeriodSort) setSort('-views_in_period');
    } else if (isPeriodSort) {
      setSort('-subscribers');
    }
  }, [filters.startDate, filters.endDate]);

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
    const { startDate, endDate } = getCurrentMonthRange();
    setFilters({ search: '', category: '', status: '', tags: '', classification: '', minSubs: '', maxSubs: '', minViews: '', maxViews: '', country: '', startDate, endDate });
    setPage(1);
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const params = { ...filters, sort, format };
      const isPeriodSort = ['views_in_period', 'subscribers_in_period'].includes(sort.replace(/^[-+]/, ''));
      params.sort = isPeriodSort ? sort : sort.replace('subscribers', 'currentStats.subscribers')
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
      a.download = `channel-report-${toUtcDateInputValue()}.${ext}`;
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
  const isPeriodMode = !!(filters.startDate && filters.endDate);

  /** Safe number for summary cards (API may omit keys) */
  const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        {/* Search + Date range */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="relative min-w-52 max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search channels…"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input-field pl-9 w-full text-sm"
            />
          </div>
          <div className="shrink-0">
            <DateRangePicker
              startDate={filters.startDate}
              endDate={filters.endDate}
              onChange={({ startDate, endDate }) => {
                setFilters((prev) => ({ ...prev, startDate, endDate }));
                setPage(1);
              }}
            />
          </div>
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
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Classification</label>
            <select value={filters.classification} onChange={(e) => handleFilterChange('classification', e.target.value)} className="input-field text-sm w-full">
              <option value="">All</option>
              <option value="sadhguru">Has Sadhguru videos</option>
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

      {/* Summary cards — period metrics use totals that match the sum of the period columns across all filtered channels */}
      {!loading && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card p-4">
            <p className="text-xs text-dark-500 uppercase tracking-wide mb-1">
              {isPeriodMode ? 'Views in this time range' : 'Total views (all channels)'}
            </p>
            <p className="text-xl font-semibold text-accent-400">
              {fmt(isPeriodMode ? n(summary.totalViewsInPeriod) : n(summary.totalViews))}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-dark-500 uppercase tracking-wide mb-1">Channels</p>
            <p className="text-xl font-semibold text-dark-100">
              {fmt(n(pagination.total ?? summary.totalChannels))}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-dark-500 uppercase tracking-wide mb-1">
              {isPeriodMode ? 'Net subscriber change' : 'Total Subscribers'}
            </p>
            <p className="text-xl font-semibold text-dark-100">
              {fmt(isPeriodMode ? n(summary.totalSubscribersInPeriod) : n(summary.totalSubscribers))}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-dark-500 uppercase tracking-wide mb-1">
              {isPeriodMode ? 'Net videos added (channel)' : 'Total Videos'}
            </p>
            <p className="text-xl font-semibold text-dark-100">
              {fmt(isPeriodMode ? n(summary.totalVideosInPeriod) : n(summary.totalVideos))}
            </p>
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
                <Th label="Sadhguru"           col="sadhguru_count"     sort={sort} onSort={handleSort} />
                <Th label="Country"            col="country"            sort={sort} onSort={handleSort} />
                <Th label="Subscribers"        col="subscribers"        sort={sort} onSort={handleSort} />
                <Th label="Views in this time range" col={isPeriodMode ? 'views_in_period' : 'total_views'} sort={sort} onSort={handleSort} />
                {isPeriodMode && (
                  <Th label="Subs (Period)"   col="subscribers_in_period" sort={sort} onSort={handleSort} />
                )}
                {isPeriodMode && (
                  <Th label="Videos (Period)" col="videos_in_period" sort={sort} onSort={handleSort} />
                )}
                <Th label="Videos"             col="video_count"        sort={sort} onSort={handleSort} />
                <Th label="Avg Views/Video"    col="avg_views_per_video" sort={sort} onSort={handleSort} />
                <Th label="Tags"               col="tags"               sort={sort} onSort={handleSort} />
                <Th label="Assigned To"        col="assigned_to"        sort={sort} onSort={handleSort} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-dark-400 uppercase tracking-wide whitespace-nowrap">
                  Added On
                </th>
                <Th label="Last Synced"        col="last_synced"        sort={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/50">
              {loading ? (
                <tr><td colSpan={isPeriodMode ? 16 : 14} className="text-center py-12 text-dark-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={isPeriodMode ? 16 : 14} className="text-center py-12 text-dark-400">No channels match the current filters.</td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.youtube_channel_id || i} className="hover:bg-dark-800/40 transition-colors">
                  <td className="px-3 py-2.5 text-dark-500 text-xs">{(page - 1) * LIMIT + i + 1}</td>
                  <td className="px-3 py-2.5 font-medium max-w-[220px] truncate" title={r.title}>{r.title}</td>
                  <td className="px-3 py-2.5 text-dark-300">{r.category || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`badge text-xs capitalize ${
                      r.status === 'active'   ? 'bg-green-500/20 text-green-400' :
                      r.status === 'paused'   ? 'bg-yellow-500/20 text-yellow-400' :
                      r.status === 'inactive' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-dark-600 text-dark-400'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-green-400">{fmt(r.sadhguru_count)}</td>
                  <td className="px-3 py-2.5 text-dark-300">{r.country || '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(r.subscribers)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-accent-300">
                    {fmt(isPeriodMode ? r.views_in_period : r.total_views)}
                  </td>
                  {isPeriodMode && (
                    <td className="px-3 py-2.5 text-right font-mono text-accent-300">{fmt(r.subscribers_in_period)}</td>
                  )}
                  {isPeriodMode && (
                    <td className="px-3 py-2.5 text-right font-mono text-accent-300">{fmt(r.videos_in_period)}</td>
                  )}
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(r.video_count)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(r.avg_views_per_video)}</td>
                  <td className="px-3 py-2.5 text-dark-400 text-xs max-w-[140px] truncate" title={r.tags}>{r.tags || '—'}</td>
                  <td className="px-3 py-2.5 text-dark-300">{r.assigned_to || '—'}</td>
                  <td className="px-3 py-2.5 text-dark-400 text-xs">{r.added_on || '—'}</td>
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
   Category Views Report Tab
═══════════════════════════════════════════════════════════════════ */
function CategoryReport() {
  const monthRange = getCurrentMonthRange();
  // ── server-filter state (passed to the API) ───────────────────────────────
  const [statusFilter, setStatusFilter] = useState('');   // active | paused | archived | ''
  const [tagsFilter,   setTagsFilter]   = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [startDate,    setStartDate]    = useState(monthRange.startDate);
  const [endDate,      setEndDate]      = useState(monthRange.endDate);

  // channel autocomplete (maps to the `category` filter on the server — we
  // actually want to filter channels by a selected category name, which the
  // /dashboard/categories endpoint already supports via ?category=)
  // The user asked for a "channel" filter, interpreted as: pick a specific
  // channel → show only the category that channel belongs to.
  const [channelSearch,   setChannelSearch]   = useState('');
  const [channelOptions,  setChannelOptions]  = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null); // { _id, title, category }
  const channelDebRef = useRef(null);

  // ── display state ─────────────────────────────────────────────────────────
  const [rows,        setRows]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [sort,        setSort]        = useState('totalViews');
  const [sortDir,     setSortDir]     = useState('desc');
  const [search,      setSearch]      = useState('');      // client-side category name filter
  const [groupFilter, setGroupFilter] = useState('');      // '' | 'dedicated' | 'ihi'
  const [showFilters, setShowFilters] = useState(false);
  const [exporting,   setExporting]   = useState('');

  const abortRef = useRef(null);

  // ── fetch from server ─────────────────────────────────────────────────────
  const fetchData = useCallback(async (sf = statusFilter, tf = tagsFilter, cf = classificationFilter, sd = startDate, ed = endDate, gf = groupFilter) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const params = {};
      if (sf) params.status = sf;
      if (tf) params.tags = tf;
      if (cf) params.classification = cf;
      if (gf) params.group = gf;
      if (sd) params.startDate = sd;
      if (ed) params.endDate = ed;
      const res = await api.get('/dashboard/categories', { params, signal: controller.signal });
      setRows(res.data);
    } catch (err) {
      if (err?.code === 'ERR_CANCELED') return;
      toast.error('Failed to load category report');
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [statusFilter, tagsFilter, classificationFilter, startDate, endDate, groupFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── channel autocomplete ──────────────────────────────────────────────────
  useEffect(() => {
    if (!channelSearch.trim()) { setChannelOptions([]); return; }
    clearTimeout(channelDebRef.current);
    channelDebRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/channels', { params: { search: channelSearch, limit: 10 } });
        setChannelOptions(res.data.channels || []);
      } catch { /* ignore */ }
    }, 300);
  }, [channelSearch]);

  const selectChannel = (ch) => {
    setSelectedChannel(ch);
    setChannelSearch(ch.title);
    setChannelOptions([]);
    // narrow the category name filter to just that channel's category
    setSearch(ch.category || '');
  };

  const clearChannel = () => {
    setSelectedChannel(null);
    setChannelSearch('');
    setSearch('');
    setChannelOptions([]);
  };

  const clearAllFilters = () => {
    setStatusFilter('');
    setTagsFilter('');
    setClassificationFilter('');
    const { startDate: sd, endDate: ed } = getCurrentMonthRange();
    setStartDate(sd);
    setEndDate(ed);
    setGroupFilter('');
    clearChannel();
    fetchData('', '', '', sd, ed, '');
  };

  const hasFilters = statusFilter || tagsFilter || classificationFilter || selectedChannel || groupFilter || startDate || endDate;

  // ── sort ──────────────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sort === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(col); setSortDir('desc'); }
  };

  // ── computed rows (client-side sort + category name search) ───────────────
  const displayed = [...rows]
    .filter((r) => !search.trim() || r.category.toLowerCase().includes(search.toLowerCase()))
    .filter((r) => {
      if (groupFilter === 'dedicated') return r.category.toLowerCase().startsWith('dedicated');
      if (groupFilter === 'ihi')       return r.category.toLowerCase().includes('ihi');
      return true;
    })
    .map((r) => ({
      ...r,
      avgViews:    r.count      ? Math.round(r.totalViews / r.count) : 0,
      viewsPerSub: r.totalSubs  ? r.totalViews / r.totalSubs          : 0,
    }))
    .sort((a, b) => {
      const av = a[sort] ?? 0;
      const bv = b[sort] ?? 0;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  // ── aggregates ────────────────────────────────────────────────────────────
  const totals = displayed.reduce(
    (acc, r) => ({ channels: acc.channels + r.count, subs: acc.subs + r.totalSubs, views: acc.views + r.totalViews }),
    { channels: 0, subs: 0, views: 0 }
  );
  const overallViewsPerSub = totals.subs ? totals.views / totals.subs : 0;
  const maxViews    = Math.max(...displayed.map((r) => r.totalViews), 1);
  const maxVpS      = Math.max(...displayed.map((r) => r.viewsPerSub), 0.001);

  // ── export ────────────────────────────────────────────────────────────────
  const buildCsvContent = () => {
    const totalViews = totals.views || 1;
    const header = 'Category,Channels,Total Subscribers,Total Views,Avg Views/Channel,Views per Subscriber,% of Total Views\n';
    const body = displayed.map((r) => {
      const pct = ((r.totalViews / totalViews) * 100).toFixed(1);
      return `"${r.category}",${r.count},${r.totalSubs},${r.totalViews},${r.avgViews},${r.viewsPerSub.toFixed(3)},${pct}%`;
    }).join('\n');
    return header + body;
  };

  const downloadCsv = (filename) => {
    const blob = new Blob([buildCsvContent()], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    setExporting('csv');
    try { downloadCsv(`category-views-${toUtcDateInputValue()}.csv`); toast.success('Exported as CSV'); }
    catch { toast.error('Export failed'); }
    finally { setExporting(''); }
  };

  const handleExportExcel = () => {
    setExporting('excel');
    try { downloadCsv(`category-views-${toUtcDateInputValue()}.csv`); toast.success('Exported (CSV format)'); }
    catch { toast.error('Export failed'); }
    finally { setExporting(''); }
  };

  // ── scoped sort-icon + header helpers ────────────────────────────────────
  function CatSortIcon({ col }) {
    if (sort !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp   className="w-3 h-3 text-accent-400" />
      : <ChevronDown className="w-3 h-3 text-accent-400" />;
  }

  function CTh({ label, col, title }) {
    return (
      <th
        title={title}
        className="px-3 py-2.5 text-left text-xs font-semibold text-dark-400 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-dark-200 transition-colors"
        onClick={() => handleSort(col)}
      >
        <span className="flex items-center gap-1">{label}<CatSortIcon col={col} /></span>
      </th>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        {/* Search + Date range */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="relative min-w-48 max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Filter categories…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (selectedChannel) clearChannel(); }}
              className="input-field pl-9 w-full text-sm"
            />
            {search && !selectedChannel && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="shrink-0">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={({ startDate: sd, endDate: ed }) => {
                setStartDate(sd);
                setEndDate(ed);
                fetchData(statusFilter, tagsFilter, classificationFilter, sd, ed, groupFilter);
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`btn-ghost flex items-center gap-2 text-sm ${showFilters ? 'text-accent-400' : ''}`}
          >
            <Filter className="w-4 h-4" /> Filters
            {hasFilters && <span className="w-2 h-2 rounded-full bg-accent-500 ml-0.5" />}
          </button>
          {hasFilters && (
            <button onClick={clearAllFilters} className="btn-ghost text-xs text-dark-400 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <button onClick={() => fetchData()} className="btn-ghost p-2" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleExportCsv} disabled={!!exporting}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50">
            <FileText className="w-4 h-4" />
            {exporting === 'csv' ? 'Exporting…' : 'CSV'}
          </button>
          <button onClick={handleExportExcel} disabled={!!exporting}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
            <FileSpreadsheet className="w-4 h-4" />
            {exporting === 'excel' ? 'Exporting…' : 'Excel'}
          </button>
        </div>
      </div>

      {/* ── Filter Panel ─────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="glass-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Channel autocomplete — narrows to that channel's category */}
          <div className="sm:col-span-1">
            <label className="block text-xs text-dark-400 mb-1">
              Filter by Channel
              <span className="ml-1 text-dark-500">(shows the channel's category)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search channel name…"
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
                    <button key={ch._id} type="button" onClick={() => selectChannel(ch)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-dark-700 transition-colors">
                      <span className="font-medium">{ch.title}</span>
                      {ch.category && <span className="ml-2 text-xs text-dark-500">{ch.category}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Channel status filter — affects which channels are aggregated */}
          <div>
            <label className="block text-xs text-dark-400 mb-1">Channel Status</label>
            <select value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); fetchData(e.target.value, tagsFilter, classificationFilter, startDate, endDate, groupFilter); }}
              className="input-field text-sm w-full">
              <option value="">All (excl. archived)</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Tags filter */}
          <div>
            <label className="block text-xs text-dark-400 mb-1">Tags</label>
            <input type="text" placeholder="comma-separated" value={tagsFilter}
              onChange={(e) => setTagsFilter(e.target.value)}
              onBlur={() => fetchData(statusFilter, tagsFilter, classificationFilter, startDate, endDate, groupFilter)}
              className="input-field text-sm w-full" />
          </div>

          {/* Classification filter */}
          <div>
            <label className="block text-xs text-dark-400 mb-1">Classification</label>
            <select value={classificationFilter}
              onChange={(e) => { setClassificationFilter(e.target.value); fetchData(statusFilter, tagsFilter, e.target.value, startDate, endDate, groupFilter); }}
              className="input-field text-sm w-full">
              <option value="">All channels</option>
              <option value="sadhguru">Has Sadhguru videos</option>
            </select>
          </div>

          {/* Group quick-filter */}
          <div className="sm:col-span-3">
            <label className="block text-xs text-dark-400 mb-2">Category Group</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: '',          label: 'All Categories' },
                { value: 'dedicated', label: 'Dedicated (starts with "Dedicated")' },
                { value: 'ihi',       label: 'IHI (contains "IHI")' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setGroupFilter(value); fetchData(statusFilter, tagsFilter, classificationFilter, startDate, endDate, value); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    groupFilter === value
                      ? 'bg-accent-500/20 border-accent-500/40 text-accent-300'
                      : 'bg-dark-800 border-dark-600 text-dark-400 hover:text-dark-200 hover:border-dark-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      {!loading && displayed.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Views in this time range', value: fmt(totals.views) },
            { label: 'Categories',               value: displayed.length.toLocaleString() },
            { label: 'Total Channels',           value: fmt(totals.channels) },
            { label: 'Total Subscribers',        value: fmt(totals.subs) },
            { label: 'Overall Views / Sub',      value: overallViewsPerSub.toFixed(2) },
          ].map(({ label, value }, idx) => (
            <div key={label} className="glass-card px-4 py-3">
              <p className="text-xs text-dark-400 mb-1">{label}</p>
              <p className={`text-lg font-semibold font-mono ${idx === 0 ? 'text-accent-400' : ''}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-800/60">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-dark-400 uppercase tracking-wide w-8">#</th>
                <CTh label="Category"            col="category"    />
                <CTh label="Channels"            col="count"       />
                <CTh label="Total Subscribers"   col="totalSubs"   />
                <CTh label="Views in this time range" col="totalViews"  />
                <CTh label="Avg Views / Channel" col="avgViews"    />
                <CTh
                  label="Views / Subscriber"
                  col="viewsPerSub"
                  title="Avg category views ÷ total subscribers — higher = more efficient audience reach"
                />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-dark-400 uppercase tracking-wide min-w-[160px]">
                  Share of Views
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-dark-400">Loading…</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-dark-400">No categories found.</td></tr>
              ) : displayed.map((r, i) => {
                const sharePct  = totals.views ? (r.totalViews / totals.views) * 100 : 0;
                const barW      = (r.totalViews / maxViews) * 100;
                const vpsBadge  =
                  r.viewsPerSub >= overallViewsPerSub * 1.5  ? 'text-green-400' :
                  r.viewsPerSub >= overallViewsPerSub         ? 'text-emerald-400' :
                  r.viewsPerSub >= overallViewsPerSub * 0.5  ? 'text-dark-300' :
                                                                'text-yellow-400';
                return (
                  <tr key={r.category} className="hover:bg-dark-800/40 transition-colors">
                    <td className="px-3 py-2.5 text-dark-500 text-xs">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">{r.category}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmt(r.count)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmt(r.totalSubs)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-accent-300">{fmt(r.totalViews)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-dark-300">{fmt(r.avgViews)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      <span className={`font-semibold ${vpsBadge}`}>
                        {r.viewsPerSub >= 1000
                          ? `${(r.viewsPerSub / 1000).toFixed(1)}k`
                          : r.viewsPerSub.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-dark-700 rounded-full h-2 overflow-hidden">
                          <div className="h-2 rounded-full bg-accent-500 transition-all duration-500"
                            style={{ width: `${barW}%` }} />
                        </div>
                        <span className="text-xs text-dark-400 w-10 text-right shrink-0">
                          {sharePct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {!loading && displayed.length > 0 && (
              <tfoot className="border-t-2 border-dark-600 bg-dark-800/40">
                <tr>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5 text-xs font-semibold text-dark-300">TOTAL</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-dark-200">{fmt(totals.channels)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-dark-200">{fmt(totals.subs)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-accent-300">{fmt(totals.views)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-dark-200">
                    {fmt(totals.channels ? Math.round(totals.views / totals.channels) : 0)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-dark-200">
                    {overallViewsPerSub.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-dark-400 text-right">100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Legend for Views/Sub colour coding */}
      {!loading && displayed.length > 0 && (
        <p className="text-xs text-dark-500">
          <span className="text-green-400 font-medium">Green</span> = 1.5× above average ·{' '}
          <span className="text-emerald-400 font-medium">Teal</span> = above average ·{' '}
          <span className="text-dark-300 font-medium">Grey</span> = average ·{' '}
          <span className="text-yellow-400 font-medium">Yellow</span> = below average ·
          {' '}Overall avg: <span className="font-mono">{overallViewsPerSub.toFixed(2)}</span>
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Micro Unit Report Tab
═══════════════════════════════════════════════════════════════════ */
function MicroUnitReport() {
  const monthRange = getCurrentMonthRange();
  const [statusFilter, setStatusFilter] = useState('');
  const [tagsFilter, setTagsFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [startDate, setStartDate] = useState(monthRange.startDate);
  const [endDate, setEndDate] = useState(monthRange.endDate);
  const [groupFilter, setGroupFilter] = useState('');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('totalViews');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState('');

  const abortRef = useRef(null);

  const fetchData = useCallback(async (sf = statusFilter, tf = tagsFilter, cf = classificationFilter, sd = startDate, ed = endDate, gf = groupFilter) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const params = {};
      if (sf) params.status = sf;
      if (tf) params.tags = tf;
      if (cf) params.classification = cf;
      if (sd) params.startDate = sd;
      if (ed) params.endDate = ed;
      if (gf) params.group = gf;
      const res = await api.get('/dashboard/micro-units-report', { params, signal: controller.signal });
      setRows(res.data);
    } catch (err) {
      if (err?.code === 'ERR_CANCELED') return;
      toast.error('Failed to load micro unit report');
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [statusFilter, tagsFilter, classificationFilter, startDate, endDate, groupFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const clearAllFilters = () => {
    setStatusFilter('');
    setTagsFilter('');
    setClassificationFilter('');
    const { startDate: sd, endDate: ed } = getCurrentMonthRange();
    setStartDate(sd);
    setEndDate(ed);
    setGroupFilter('');
    setSearch('');
    fetchData('', '', '', sd, ed, '');
  };

  const hasFilters = statusFilter || tagsFilter || classificationFilter || groupFilter || startDate || endDate;

  const handleSort = (col) => {
    if (sort === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(col); setSortDir('desc'); }
  };

  const isPeriodMode = !!(startDate && endDate);

  /** Full API rows (date + server filters); summary cards use this, not search-filtered rows */
  const mappedRows = useMemo(
    () => rows.map((r) => ({ ...r, totalVideos: r.totalVideos ?? 0 })),
    [rows],
  );

  const totalsForSummary = useMemo(
    () => mappedRows.reduce(
      (acc, r) => ({
        channels: acc.channels + r.count,
        subs: acc.subs + r.totalSubs,
        views: acc.views + r.totalViews,
        videos: acc.videos + (r.totalVideos ?? 0),
      }),
      { channels: 0, subs: 0, views: 0, videos: 0 },
    ),
    [mappedRows],
  );

  const displayed = useMemo(() => {
    const filtered = mappedRows.filter(
      (r) => !search.trim() || (r.name || '').toLowerCase().includes(search.toLowerCase()),
    );
    return [...filtered].sort((a, b) => {
      const av = a[sort] ?? 0;
      const bv = b[sort] ?? 0;
      const cmp = typeof av === 'string' ? (av || '').localeCompare(bv || '') : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [mappedRows, search, sort, sortDir]);

  const totalsFooter = useMemo(
    () => displayed.reduce(
      (acc, r) => ({
        channels: acc.channels + r.count,
        subs: acc.subs + r.totalSubs,
        views: acc.views + r.totalViews,
        videos: acc.videos + (r.totalVideos ?? 0),
      }),
      { channels: 0, subs: 0, views: 0, videos: 0 },
    ),
    [displayed],
  );

  const maxViews = Math.max(...mappedRows.map((r) => r.totalViews), 1);

  const buildCsvContent = () => {
    const totalViews = totalsForSummary.views || 1;
    const header = 'Micro Unit,Channels,Subscribers,Views,Videos,% of Total Views\n';
    const body = mappedRows.map((r) => {
      const pct = ((r.totalViews / totalViews) * 100).toFixed(1);
      return `"${r.name || ''}",${r.count},${r.totalSubs},${r.totalViews},${r.totalVideos ?? 0},${pct}%`;
    }).join('\n');
    return header + body;
  };

  const downloadCsv = (filename) => {
    const blob = new Blob([buildCsvContent()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    setExporting('csv');
    try { downloadCsv(`micro-unit-views-${toUtcDateInputValue()}.csv`); toast.success('Exported as CSV'); }
    catch { toast.error('Export failed'); }
    finally { setExporting(''); }
  };

  const handleExportExcel = () => {
    setExporting('excel');
    try { downloadCsv(`micro-unit-views-${toUtcDateInputValue()}.csv`); toast.success('Exported (CSV format)'); }
    catch { toast.error('Export failed'); }
    finally { setExporting(''); }
  };

  function MuSortIcon({ col }) {
    if (sort !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-accent-400" />
      : <ChevronDown className="w-3 h-3 text-accent-400" />;
  }

  function MuTh({ label, col, title }) {
    return (
      <th
        title={title}
        className="px-3 py-2.5 text-left text-xs font-semibold text-dark-400 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-dark-200 transition-colors"
        onClick={() => handleSort(col)}
      >
        <span className="flex items-center gap-1">{label}<MuSortIcon col={col} /></span>
      </th>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="relative min-w-48 max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Filter micro units…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 w-full text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="shrink-0">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={({ startDate: sd, endDate: ed }) => {
                setStartDate(sd);
                setEndDate(ed);
                fetchData(statusFilter, tagsFilter, classificationFilter, sd, ed, groupFilter);
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`btn-ghost flex items-center gap-2 text-sm ${showFilters ? 'text-accent-400' : ''}`}
          >
            <Filter className="w-4 h-4" /> Filters
            {hasFilters && <span className="w-2 h-2 rounded-full bg-accent-500 ml-0.5" />}
          </button>
          {hasFilters && (
            <button onClick={clearAllFilters} className="btn-ghost text-xs text-dark-400 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <button onClick={() => fetchData()} className="btn-ghost p-2" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleExportCsv} disabled={!!exporting}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50">
            <FileText className="w-4 h-4" />
            {exporting === 'csv' ? 'Exporting…' : 'CSV'}
          </button>
          <button onClick={handleExportExcel} disabled={!!exporting}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
            <FileSpreadsheet className="w-4 h-4" />
            {exporting === 'excel' ? 'Exporting…' : 'Excel'}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="glass-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-dark-400 mb-1">Channel Status</label>
            <select value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); fetchData(e.target.value, tagsFilter, classificationFilter, startDate, endDate, groupFilter); }}
              className="input-field text-sm w-full">
              <option value="">All (excl. archived)</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Tags</label>
            <input type="text" placeholder="comma-separated" value={tagsFilter}
              onChange={(e) => setTagsFilter(e.target.value)}
              onBlur={() => fetchData(statusFilter, tagsFilter, classificationFilter, startDate, endDate, groupFilter)}
              className="input-field text-sm w-full" />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Classification</label>
            <select value={classificationFilter}
              onChange={(e) => { setClassificationFilter(e.target.value); fetchData(statusFilter, tagsFilter, e.target.value, startDate, endDate, groupFilter); }}
              className="input-field text-sm w-full">
              <option value="">All channels</option>
              <option value="sadhguru">Has Sadhguru videos</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs text-dark-400 mb-2">Category Group</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: '', label: 'All Categories' },
                { value: 'dedicated', label: 'Dedicated (starts with "Dedicated")' },
                { value: 'ihi', label: 'IHI (contains "IHI")' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setGroupFilter(value); fetchData(statusFilter, tagsFilter, classificationFilter, startDate, endDate, value); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    groupFilter === value
                      ? 'bg-accent-500/20 border-accent-500/40 text-accent-300'
                      : 'bg-dark-800 border-dark-600 text-dark-400 hover:text-dark-200 hover:border-dark-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && mappedRows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              label: isPeriodMode ? 'Views (in range)' : 'Views',
              value: fmt(totalsForSummary.views),
            },
            {
              label: isPeriodMode ? 'Subscriber change' : 'Subscribers',
              value: fmt(totalsForSummary.subs),
            },
            {
              label: isPeriodMode ? 'Videos (published in range)' : 'Videos',
              value: fmt(totalsForSummary.videos),
            },
            { label: 'Micro Units', value: mappedRows.length.toLocaleString() },
            { label: 'Channels', value: fmt(totalsForSummary.channels) },
          ].map(({ label, value }, idx) => (
            <div key={label} className="glass-card px-4 py-3">
              <p className="text-xs text-dark-400 mb-1">{label}</p>
              <p className={`text-lg font-semibold font-mono ${idx === 0 ? 'text-accent-400' : ''}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-800/60">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-dark-400 uppercase tracking-wide w-8">#</th>
                <MuTh label="Micro Unit" col="name" />
                <MuTh label="Channels" col="count" />
                <MuTh label={isPeriodMode ? 'Subscribers (Δ)' : 'Subscribers'} col="totalSubs" title={isPeriodMode ? 'Net subscriber change from channel snapshots in the selected range' : undefined} />
                <MuTh label={isPeriodMode ? 'Views (in range)' : 'Views'} col="totalViews" />
                <MuTh label={isPeriodMode ? 'Videos (in range)' : 'Videos'} col="totalVideos" title={isPeriodMode ? 'Videos published in the selected date range' : 'Total videos across channels'} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-dark-400 uppercase tracking-wide min-w-[160px]">Share of Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-dark-400">Loading…</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-dark-400">No micro units found.</td></tr>
              ) : displayed.map((r, i) => {
                const sharePct = totalsForSummary.views ? (r.totalViews / totalsForSummary.views) * 100 : 0;
                const barW = (r.totalViews / maxViews) * 100;
                return (
                  <tr key={r.name || i} className="hover:bg-dark-800/40 transition-colors">
                    <td className="px-3 py-2.5 text-dark-500 text-xs">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">{r.name || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmt(r.count)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmt(r.totalSubs)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-accent-300">{fmt(r.totalViews)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-dark-300">{fmt(r.totalVideos ?? 0)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-dark-700 rounded-full h-2 overflow-hidden">
                          <div className="h-2 rounded-full bg-accent-500 transition-all duration-500" style={{ width: `${barW}%` }} />
                        </div>
                        <span className="text-xs text-dark-400 w-10 text-right shrink-0">{sharePct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {!loading && displayed.length > 0 && (
              <tfoot className="border-t-2 border-dark-600 bg-dark-800/40">
                <tr>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5 text-xs font-semibold text-dark-300">
                    TOTAL{search.trim() ? ' (visible)' : ''}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-dark-200">{fmt(totalsFooter.channels)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-dark-200">{fmt(totalsFooter.subs)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-accent-300">{fmt(totalsFooter.views)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-dark-200">{fmt(totalsFooter.videos)}</td>
                  <td className="px-3 py-2.5 text-xs text-dark-400 text-right">
                    {totalsForSummary.views
                      ? `${((totalsFooter.views / totalsForSummary.views) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
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
    search: '', category: '', status: '', tags: '', classification: '',
    minViews: '', maxViews: '', startDate: '', endDate: '', channelId: '',
    hashtags: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sort,  setSort]  = useState('-views');
  const [page,  setPage]  = useState(1);
  const LIMIT = 50;

  const [rows,       setRows]       = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [exporting,  setExporting]  = useState('');

  // Channel search for channelId filter
  const [channelSearch, setChannelSearch] = useState('');
  const [channelOptions, setChannelOptions] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const channelDebRef = useRef(null);

  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const fetchData = useCallback(async (f, s, p) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const params = { ...f, sort: s, page: p, limit: LIMIT, format: 'json' };
      const res = await api.get('/export/report/videos', { params, signal: controller.signal });
      setRows(res.data.data);
      setPagination(res.data.pagination);
      setSummary(res.data.summary ?? null);
    } catch (err) {
      if (err?.code === 'ERR_CANCELED') return;
      toast.error('Failed to load video report');
    } finally {
      if (abortRef.current === controller) setLoading(false);
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
    setFilters({ search: '', category: '', status: '', tags: '', classification: '', minViews: '', maxViews: '', startDate: '', endDate: '', channelId: '', hashtags: '' });
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
      a.download = `video-report-${toUtcDateInputValue()}.${ext}`;
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
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-dark-400 mb-1">Classification</label>
            <select value={filters.classification} onChange={(e) => handleFilterChange('classification', e.target.value)} className="input-field text-sm w-full">
              <option value="">All</option>
              <option value="sadhguru">Sadhguru</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-dark-400 mb-1">Channel Tags</label>
            <input type="text" placeholder="comma-separated" value={filters.tags} onChange={(e) => handleFilterChange('tags', e.target.value)} className="input-field text-sm w-full" />
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-dark-400 mb-1">
              Hashtag Keywords
              <span className="ml-1 text-dark-500">(searches title &amp; description)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. sadhguru, yoga, meditation"
              value={filters.hashtags}
              onChange={(e) => handleFilterChange('hashtags', e.target.value)}
              className="input-field text-sm w-full"
            />
            <p className="text-[10px] text-dark-500 mt-1">Comma-separated. Matches #keyword in video title or description. Returns videos with any matching hashtag.</p>
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-dark-400 mb-2">Published Date Range</label>
            <DateRangePicker
              startDate={filters.startDate}
              endDate={filters.endDate}
              onChange={({ startDate, endDate }) => {
                handleFilterChange('startDate', startDate);
                handleFilterChange('endDate', endDate);
              }}
            />
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

      {/* Summary cards */}
      {!loading && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card p-4">
            <p className="text-xs text-dark-500 uppercase tracking-wide mb-1">Videos (filtered)</p>
            <p className="text-xl font-semibold text-accent-400">{fmt(summary.totalVideos)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-dark-500 uppercase tracking-wide mb-1">Total Views</p>
            <p className="text-xl font-semibold text-dark-100">{fmt(summary.totalViews)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-dark-500 uppercase tracking-wide mb-1">Total Likes</p>
            <p className="text-xl font-semibold text-dark-100">{fmt(summary.totalLikes)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-dark-500 uppercase tracking-wide mb-1">Total Comments</p>
            <p className="text-xl font-semibold text-dark-100">{fmt(summary.totalComments)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-800/60">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-dark-400 uppercase tracking-wide w-8">#</th>
                <Th label="Title"           col="title"          sort={sort} onSort={handleSort} />
                <Th label="Channel"         col="channel"        sort={sort} onSort={handleSort} />
                <Th label="Category"        col="category"       sort={sort} onSort={handleSort} />
                <Th label="Classification"  col="classification" sort={sort} onSort={handleSort} />
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
                <tr><td colSpan={13} className="text-center py-12 text-dark-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-12 text-dark-400">No videos match the current filters.</td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.youtube_video_id || i} className="hover:bg-dark-800/40 transition-colors">
                  <td className="px-3 py-2.5 text-dark-500 text-xs">{(page - 1) * LIMIT + i + 1}</td>
                  <td className="px-3 py-2.5 font-medium max-w-[260px] truncate" title={r.title}>{r.title}</td>
                  <td className="px-3 py-2.5 text-dark-300 max-w-[160px] truncate" title={r.channel}>{r.channel || '—'}</td>
                  <td className="px-3 py-2.5 text-dark-300">{r.category || '—'}</td>
                  <td className="px-3 py-2.5">
                    {r.classification === 'non sadhguru' ? (
                      <span className="text-dark-400">-</span>
                    ) : (
                      <span className={`badge text-xs ${
                        r.classification === 'sadhguru' ? 'bg-green-500/20 text-green-400' :
                        'bg-dark-700 text-dark-500'
                      }`}>
                        {r.classification || '—'}
                      </span>
                    )}
                  </td>
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
