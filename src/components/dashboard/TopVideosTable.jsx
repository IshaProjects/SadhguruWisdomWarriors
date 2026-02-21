import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download } from 'lucide-react';
import clsx from 'clsx';
import { formatNumber, formatRelativeDate, engagementRate } from '../../utils/formatters.js';
import { exportToCsv } from '../../utils/exportCsv.js';
import InfoTooltip from '../common/InfoTooltip.jsx';

function outlierBadge(score) {
  if (score == null) return null;
  const label = `${score.toFixed(1)}×`;
  if (score >= 3)    return { label, cls: 'bg-green-500/20 text-green-300' };
  if (score >= 1.5)  return { label, cls: 'bg-emerald-500/15 text-emerald-400' };
  if (score >= 0.75) return { label, cls: 'bg-dark-700 text-dark-300' };
  if (score >= 0.5)  return { label, cls: 'bg-yellow-500/15 text-yellow-400' };
  return               { label, cls: 'bg-red-500/15 text-red-400' };
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return sortDir === 'asc'
    ? <ChevronUp   className="w-3 h-3 text-accent-400" />
    : <ChevronDown className="w-3 h-3 text-accent-400" />;
}

const COLUMNS = [
  { key: 'title',       label: 'Video',         align: 'left',  sortable: true  },
  { key: 'channel',     label: 'Channel',       align: 'left',  sortable: true  },
  { key: 'views',       label: 'Views',         align: 'right', sortable: true  },
  { key: 'likes',       label: 'Likes',         align: 'right', sortable: true  },
  { key: 'engRate',     label: 'Eng. Rate',     align: 'right', sortable: true  },
  { key: 'outlier',     label: 'Outlier Score', align: 'right', sortable: true,
    title: 'Outlier Score = video views ÷ average views of top videos this period. ≥1.5× is a hit; <0.5× is an underperformer.' },
  { key: 'publishedAt', label: 'Published',     align: 'right', sortable: true  },
];

export default function TopVideosTable({ videos, tooltip }) {
  const [sortCol, setSortCol] = useState('views');
  const [sortDir, setSortDir] = useState('desc');

  const avgViews = videos.length
    ? videos.reduce((s, v) => s + (v.views || 0), 0) / videos.length
    : 0;

  // Enrich each video with computed sort values
  const enriched = useMemo(() => videos.map((v) => ({
    ...v,
    _engRate: engagementRate(v.views, v.likes, v.comments),
    _outlier: avgViews > 0 ? v.views / avgViews : 0,
    _channel: v.channelId?.title || '',
  })), [videos, avgViews]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...enriched].sort((a, b) => {
      switch (sortCol) {
        case 'title':       return dir * a.title.localeCompare(b.title);
        case 'channel':     return dir * a._channel.localeCompare(b._channel);
        case 'views':       return dir * ((a.views || 0) - (b.views || 0));
        case 'likes':       return dir * ((a.likes || 0) - (b.likes || 0));
        case 'engRate':     return dir * (a._engRate - b._engRate);
        case 'outlier':     return dir * (a._outlier - b._outlier);
        case 'publishedAt': return dir * (new Date(a.publishedAt) - new Date(b.publishedAt));
        default:            return 0;
      }
    });
  }, [enriched, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const handleExport = () => {
    const headers = ['Title', 'Channel', 'Views', 'Likes', 'Comments', 'Eng. Rate (%)', 'Outlier Score', 'Published'];
    const rows = sorted.map((v) => [
      v.title,
      v.channelId?.title || '',
      v.views,
      v.likes,
      v.comments,
      v._engRate.toFixed(2),
      avgViews > 0 ? (v.views / avgViews).toFixed(2) : '',
      v.publishedAt ? new Date(v.publishedAt).toISOString().slice(0, 10) : '',
    ]);
    exportToCsv('top_videos', headers, rows);
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-dark-300">Top Videos This Period</h3>
          {tooltip && <InfoTooltip text={tooltip} side="top" />}
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-dark-200 transition-colors px-2 py-1 rounded hover:bg-dark-700"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-700">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  title={col.title}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={clsx(
                    'py-2 px-2 text-dark-400 font-medium select-none',
                    col.align === 'right' ? 'text-right' : 'text-left',
                    col.sortable && 'cursor-pointer hover:text-dark-200 transition-colors',
                    sortCol === col.key && 'text-dark-200'
                  )}
                >
                  <span className="inline-flex items-center gap-1 justify-end w-full">
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
            {sorted.map((video) => {
              const badge = outlierBadge(avgViews > 0 ? video.views / avgViews : null);
              return (
                <tr
                  key={video._id}
                  className="border-b border-dark-800 hover:bg-dark-800/50 transition-colors"
                >
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="w-16 h-9 rounded object-cover bg-dark-700 shrink-0"
                      />
                      <span className="font-medium truncate max-w-[200px]">
                        {video.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-dark-300">
                    {video.channelId?.title || '—'}
                  </td>
                  <td className="py-2.5 px-2 text-right font-medium">
                    {formatNumber(video.views)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-dark-300">
                    {formatNumber(video.likes)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-dark-300">
                    {video._engRate.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    {badge ? (
                      <span
                        className={clsx('inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums', badge.cls)}
                        title={`Period avg: ${formatNumber(Math.round(avgViews))} views`}
                      >
                        {badge.label}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2.5 px-2 text-right text-dark-400">
                    {formatRelativeDate(video.publishedAt)}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-dark-400">
                  No videos found for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
