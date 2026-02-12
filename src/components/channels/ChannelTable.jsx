import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { formatNumber, formatRelativeDate } from '../../utils/formatters.js';
import clsx from 'clsx';

const statusBadge = {
  active: 'badge-active',
  paused: 'badge-paused',
  archived: 'badge-archived',
};

export default function ChannelTable({ channels, onEdit, onDelete }) {
  const navigate = useNavigate();
  const showActions = !!(onEdit || onDelete);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-dark-700">
            <th className="text-left py-3 px-3 text-dark-400 font-medium">Channel</th>
            <th className="text-right py-3 px-3 text-dark-400 font-medium">Subscribers</th>
            <th className="text-right py-3 px-3 text-dark-400 font-medium">Views</th>
            <th className="text-right py-3 px-3 text-dark-400 font-medium">Videos</th>
            <th className="text-left py-3 px-3 text-dark-400 font-medium">Category</th>
            <th className="text-left py-3 px-3 text-dark-400 font-medium">Status</th>
            <th className="text-left py-3 px-3 text-dark-400 font-medium">Owner</th>
            <th className="text-right py-3 px-3 text-dark-400 font-medium">Last Synced</th>
            {showActions && (
              <th className="text-right py-3 px-3 text-dark-400 font-medium">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {channels.map((ch) => (
            <tr
              key={ch._id}
              onClick={() => navigate(`/channels/${ch._id}`)}
              className="border-b border-dark-800 hover:bg-dark-800/50 transition-colors cursor-pointer"
            >
              <td className="py-3 px-3">
                <div className="flex items-center gap-3">
                  <img
                    src={ch.thumbnailUrl}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover bg-dark-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium truncate max-w-[200px]">{ch.title}</p>
                    <p className="text-xs text-dark-400 truncate">{ch.customUrl || ch.youtubeChannelId}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-3 text-right font-medium">
                {formatNumber(ch.currentStats?.subscribers)}
              </td>
              <td className="py-3 px-3 text-right text-dark-300">
                {formatNumber(ch.currentStats?.views)}
              </td>
              <td className="py-3 px-3 text-right text-dark-300">
                {formatNumber(ch.currentStats?.videoCount)}
              </td>
              <td className="py-3 px-3">
                <span className="badge bg-dark-700 text-dark-300">{ch.category}</span>
              </td>
              <td className="py-3 px-3">
                <span className={clsx(statusBadge[ch.status])}>{ch.status}</span>
              </td>
              <td className="py-3 px-3 text-dark-300 text-sm">
                {ch.assignedTo?.name || '—'}
              </td>
              <td className="py-3 px-3 text-right text-dark-400 text-sm">
                {formatRelativeDate(ch.lastSyncedAt)}
              </td>
              {showActions && (
                <td className="py-3 px-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(ch);
                        }}
                        className="p-1.5 rounded hover:bg-dark-700 text-dark-300"
                        aria-label="Edit channel"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(ch);
                        }}
                        className="p-1.5 rounded hover:bg-dark-800 text-red-400 hover:text-red-300"
                        aria-label="Delete channel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
          {channels.length === 0 && (
            <tr>
              <td colSpan={showActions ? 9 : 8} className="py-12 text-center text-dark-400">
                No channels found. Add your first channel to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
