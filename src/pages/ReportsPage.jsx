import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileSpreadsheet, FileText, Search, Filter, X, ChevronUp, ChevronDown,
  ChevronsUpDown, RefreshCw, Tv2, Video, Tag,
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
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Reports" />
      <div className="p-6 flex-1 space-y-4">
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-dark-700">
          {[
            { id: 'channels',   label: 'Channel Report',  Icon: Tv2   },
            { id: 'videos',     label: 'Video Report',    Icon: Video  },
            { id: 'categories', label: 'Category Report', Icon: Tag    },
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

        {activeTab === 'channels'   && <ChannelReport   />}
        {activeTab === 'videos'     && <VideoReport     />}
        {activeTab === 'categories' && <CategoryReport  />}
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
   Category Views Report Tab
═══════════════════════════════════════════════════════════════════ */
function CategoryReport() {
  // ── server-filter state (passed to the API) ───────────────────────────────
  const [statusFilter, setStatusFilter] = useState('');   // active | paused | archived | ''
  const [tagsFilter,   setTagsFilter]   = useState('');

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
  const [sort,        setSort]        = useState('viewsPerSub');
  const [sortDir,     setSortDir]     = useState('desc');
  const [search,      setSearch]      = useState('');      // client-side category name filter
  const [groupFilter, setGroupFilter] = useState('');      // '' | 'dedicated' | 'ihi'
  const [showFilters, setShowFilters] = useState(false);
  const [exporting,   setExporting]   = useState('');

  // ── fetch from server ─────────────────────────────────────────────────────
  const fetchData = useCallback(async (sf = statusFilter, tf = tagsFilter) => {
    setLoading(true);
    try {
      const params = {};
      if (sf)  params.status = sf;
      if (tf)  params.tags   = tf;
      const res = await api.get('/dashboard/categories', { params });
      setRows(res.data);
    } catch {
      toast.error('Failed to load category report');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tagsFilter]);

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
    setGroupFilter('');
    clearChannel();
  };

  const hasFilters = statusFilter || tagsFilter || selectedChannel || groupFilter;

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
    try { downloadCsv(`category-views-${new Date().toISOString().slice(0, 10)}.csv`); toast.success('Exported as CSV'); }
    catch { toast.error('Export failed'); }
    finally { setExporting(''); }
  };

  const handleExportExcel = () => {
    setExporting('excel');
    try { downloadCsv(`category-views-${new Date().toISOString().slice(0, 10)}.csv`); toast.success('Exported (CSV format)'); }
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
        {/* Category name search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
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
              onChange={(e) => { setStatusFilter(e.target.value); fetchData(e.target.value, tagsFilter); }}
              className="input-field text-sm w-full">
              <option value="">All (excl. archived)</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Tags filter */}
          <div>
            <label className="block text-xs text-dark-400 mb-1">Tags</label>
            <input type="text" placeholder="comma-separated" value={tagsFilter}
              onChange={(e) => setTagsFilter(e.target.value)}
              onBlur={() => fetchData(statusFilter, tagsFilter)}
              className="input-field text-sm w-full" />
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
                  onClick={() => setGroupFilter(value)}
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
            { label: 'Categories',           value: displayed.length.toLocaleString() },
            { label: 'Total Channels',        value: fmt(totals.channels) },
            { label: 'Total Subscribers',     value: fmt(totals.subs) },
            { label: 'Total Views',           value: fmt(totals.views) },
            { label: 'Overall Views / Sub',   value: overallViewsPerSub.toFixed(2) },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card px-4 py-3">
              <p className="text-xs text-dark-400 mb-1">{label}</p>
              <p className="text-lg font-semibold font-mono">{value}</p>
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
                <CTh label="Total Views"         col="totalViews"  />
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
