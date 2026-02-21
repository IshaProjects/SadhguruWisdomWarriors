import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download } from 'lucide-react';
import clsx from 'clsx';
import { formatNumber } from '../../utils/formatters.js';
import { exportToCsv } from '../../utils/exportCsv.js';
import InfoTooltip from '../common/InfoTooltip.jsx';

// ── helpers ──────────────────────────────────────────────────────────────────

function pct(value, decimals = 2) {
  if (value == null) return '—';
  return `${value.toFixed(decimals)}%`;
}

function multiplier(value, decimals = 1) {
  if (value == null) return '—';
  return `${formatNumber(Math.round(value))}`;
}

/**
 * Colour-code a metric given its percentile position among all channels.
 * top 20% → green, bottom 20% → red, middle → yellow/neutral.
 */
function rankBadge(value, sortedValues, higherIsBetter = true) {
  if (value == null || sortedValues.length === 0) {
    return { text: '—', cls: 'text-dark-500' };
  }

  const rank = sortedValues.indexOf(value);
  const pctile = higherIsBetter
    ? 1 - rank / (sortedValues.length - 1)   // high value → low rank index → high percentile
    : rank / (sortedValues.length - 1);       // low value → low rank index → high percentile

  if (pctile >= 0.8) return { cls: 'bg-green-500/15 text-green-300' };
  if (pctile >= 0.5) return { cls: 'bg-emerald-500/10 text-emerald-400' };
  if (pctile >= 0.3) return { cls: 'bg-dark-700 text-dark-300' };
  if (pctile >= 0.1) return { cls: 'bg-yellow-500/10 text-yellow-400' };
  return { cls: 'bg-red-500/10 text-red-400' };
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30 shrink-0" />;
  return sortDir === 'asc'
    ? <ChevronUp   className="w-3 h-3 text-accent-400 shrink-0" />
    : <ChevronDown className="w-3 h-3 text-accent-400 shrink-0" />;
}

// ── column definitions ────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'title',                label: 'Channel',            align: 'left',  sortable: true, tip: null },
  { key: 'subscribers',          label: 'Subscribers',        align: 'right', sortable: true, tip: null },
  { key: 'engagementEfficiency', label: 'Eng. Efficiency',    align: 'right', sortable: true,
    tip: '(Likes + Comments) / Views — audience passion index' },
  { key: 'subscriberVelocity',   label: 'Sub Velocity (7d)',  align: 'right', sortable: true,
    tip: '(currentSubs − subs7dAgo) / subs7dAgo — current momentum' },
  { key: 'contentImpact',        label: 'Content Impact',     align: 'right', sortable: true,
    tip: 'Lifetime views / videoCount — average weight per upload' },
  { key: 'loyaltyIndex',         label: 'Loyalty Index',      align: 'right', sortable: true,
    tip: 'Comments / Views — proxy for community depth vs passive viewing' },
];

const PAGE_SIZE_OPTIONS = [5, 20, 50, 100, 200];

// ── component ─────────────────────────────────────────────────────────────────

export default function ChannelMetricsTable({ data, tooltip }) {
  const [sortCol,  setSortCol]  = useState('subscribers');
  const [sortDir,  setSortDir]  = useState('desc');
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Pre-sort arrays for percentile ranking (descending for all four metrics)
  const ranks = useMemo(() => {
    const sorted = (key) =>
      [...data]
        .filter((d) => d[key] != null)
        .map((d) => d[key])
        .sort((a, b) => b - a);
    return {
      engagementEfficiency: sorted('engagementEfficiency'),
      subscriberVelocity:   sorted('subscriberVelocity'),
      contentImpact:        sorted('contentImpact'),
      loyaltyIndex:         sorted('loyaltyIndex'),
    };
  }, [data]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = a[sortCol] ?? (sortDir === 'asc' ? Infinity : -Infinity);
      const bv = b[sortCol] ?? (sortDir === 'asc' ? Infinity : -Infinity);
      if (typeof av === 'string') return dir * av.localeCompare(bv);
      return dir * (av - bv);
    });
  }, [data, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageData   = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('desc'); setPage(1); }
  };

  const handlePageSize = (size) => {
    setPageSize(size);
    setPage(1);
  };

  // Build compact page number list: always show first, last, current ±2, with ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set([1, totalPages, page]);
    for (let i = Math.max(2, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) pages.add(i);
    return [...pages].sort((a, b) => a - b);
  }, [totalPages, page]);

  const metricBadge = (key, value) => {
    const badge = rankBadge(value, ranks[key]);
    return badge;
  };

  const formatMetric = (key, value) => {
    if (value == null) return '—';
    if (key === 'engagementEfficiency') return pct(value * 100);
    if (key === 'subscriberVelocity')   return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    if (key === 'contentImpact')        return multiplier(value);
    if (key === 'loyaltyIndex')         return pct(value * 100, 3);
    return value;
  };

  const handleExport = () => {
    const headers = ['Channel', 'Category', 'Subscribers', 'Eng. Efficiency (%)', 'Sub Velocity 7d (%)', 'Content Impact (views/video)', 'Loyalty Index (%)'];
    const rows = sorted.map((ch) => [
      ch.title,
      ch.category || '',
      ch.subscribers,
      ch.engagementEfficiency != null ? (ch.engagementEfficiency * 100).toFixed(2) : '',
      ch.subscriberVelocity   != null ? ch.subscriberVelocity.toFixed(2)           : '',
      ch.contentImpact        != null ? Math.round(ch.contentImpact)               : '',
      ch.loyaltyIndex         != null ? (ch.loyaltyIndex * 100).toFixed(3)         : '',
    ]);
    exportToCsv('channel_metrics', headers, rows);
  };

  return (
    <div className="glass-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-medium text-dark-300">Channel Metrics Comparison</h3>
            {tooltip && <InfoTooltip text={tooltip} side="top" />}
          </div>
          <p className="text-xs text-dark-500 mt-0.5">
            {data.length} channels · showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.length)} · colours show percentile rank
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-dark-200 transition-colors px-2 py-1 rounded hover:bg-dark-700"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          {/* Rows per page */}
          <div className="flex items-center gap-1.5 text-xs text-dark-400">
            <span className="whitespace-nowrap">Rows per page:</span>
            <div className="flex gap-1">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  onClick={() => handlePageSize(size)}
                  className={clsx(
                    'px-2 py-1 rounded text-xs font-medium transition-colors',
                    pageSize === size
                      ? 'bg-accent-500 text-white'
                      : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Page navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1 text-xs">
              <button
                disabled={page === 1}
                onClick={() => setPage(1)}
                className="px-2 py-1 rounded bg-dark-700 text-dark-300 hover:bg-dark-600 disabled:opacity-40"
                title="First page"
              >
                «
              </button>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2 py-1 rounded bg-dark-700 text-dark-300 hover:bg-dark-600 disabled:opacity-40"
                title="Previous page"
              >
                ‹
              </button>
              {pageNumbers.map((p, i) => {
                const prev = pageNumbers[i - 1];
                const showEllipsis = prev != null && p - prev > 1;
                return (
                  <span key={p} className="flex items-center gap-1">
                    {showEllipsis && <span className="px-1 text-dark-500">…</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={clsx(
                        'w-7 h-7 rounded text-xs font-medium transition-colors',
                        page === p
                          ? 'bg-accent-500 text-white'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      )}
                    >
                      {p}
                    </button>
                  </span>
                );
              })}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 rounded bg-dark-700 text-dark-300 hover:bg-dark-600 disabled:opacity-40"
                title="Next page"
              >
                ›
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
                className="px-2 py-1 rounded bg-dark-700 text-dark-300 hover:bg-dark-600 disabled:opacity-40"
                title="Last page"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-700">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  title={col.tip || undefined}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={clsx(
                    'py-2 px-2 font-medium select-none whitespace-nowrap',
                    col.align === 'right' ? 'text-right' : 'text-left',
                    col.sortable
                      ? 'cursor-pointer text-dark-400 hover:text-dark-200 transition-colors'
                      : 'text-dark-400',
                    sortCol === col.key && 'text-dark-200',
                    col.tip && 'cursor-help'
                  )}
                >
                  <span className={clsx(
                    'inline-flex items-center gap-1',
                    col.align === 'right' ? 'justify-end' : 'justify-start',
                    'w-full'
                  )}>
                    {col.align === 'right' && col.sortable && (
                      <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
                    )}
                    {col.label}
                    {col.align === 'left' && col.sortable && (
                      <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((ch) => (
              <tr
                key={ch.channelId}
                className="border-b border-dark-800 hover:bg-dark-800/50 transition-colors"
              >
                {/* Channel */}
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-2.5">
                    {ch.thumbnailUrl && (
                      <img
                        src={ch.thumbnailUrl}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover bg-dark-700 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate max-w-[180px]">{ch.title}</p>
                      {ch.category && (
                        <p className="text-xs text-dark-500 truncate">{ch.category}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Subscribers */}
                <td className="py-2.5 px-2 text-right font-medium tabular-nums">
                  {formatNumber(ch.subscribers)}
                </td>

                {/* Engagement Efficiency */}
                <td className="py-2.5 px-2 text-right">
                  {ch.engagementEfficiency != null ? (
                    <span className={clsx(
                      'inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums',
                      metricBadge('engagementEfficiency', ch.engagementEfficiency).cls
                    )}>
                      {formatMetric('engagementEfficiency', ch.engagementEfficiency)}
                    </span>
                  ) : <span className="text-dark-500 text-xs">—</span>}
                </td>

                {/* Subscriber Velocity */}
                <td className="py-2.5 px-2 text-right">
                  {ch.subscriberVelocity != null ? (
                    <span className={clsx(
                      'inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums',
                      ch.subscriberVelocity >= 0
                        ? metricBadge('subscriberVelocity', ch.subscriberVelocity).cls
                        : 'bg-red-500/10 text-red-400'
                    )}>
                      {formatMetric('subscriberVelocity', ch.subscriberVelocity)}
                    </span>
                  ) : <span className="text-dark-500 text-xs">—</span>}
                </td>

                {/* Content Impact */}
                <td className="py-2.5 px-2 text-right">
                  {ch.contentImpact != null ? (
                    <span className={clsx(
                      'inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums',
                      metricBadge('contentImpact', ch.contentImpact).cls
                    )}>
                      {formatMetric('contentImpact', ch.contentImpact)}
                    </span>
                  ) : <span className="text-dark-500 text-xs">—</span>}
                </td>

                {/* Loyalty Index */}
                <td className="py-2.5 px-2 text-right">
                  {ch.loyaltyIndex != null ? (
                    <span className={clsx(
                      'inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums',
                      metricBadge('loyaltyIndex', ch.loyaltyIndex).cls
                    )}>
                      {formatMetric('loyaltyIndex', ch.loyaltyIndex)}
                    </span>
                  ) : <span className="text-dark-500 text-xs">—</span>}
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-dark-400">
                  No channel data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-dark-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-500/30 inline-block" /> Top 20%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 inline-block" /> Top 50%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-dark-700 inline-block" /> Average
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500/20 inline-block" /> Below avg
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500/15 inline-block" /> Bottom 10%
        </span>
        <span className="ml-2 text-dark-600">· Hover column headers for metric definitions</span>
      </div>
    </div>
  );
}
