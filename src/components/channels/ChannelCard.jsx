import { useNavigate } from 'react-router-dom';
import { Sparkles, Check } from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';
import clsx from 'clsx';

const statusColors = {
  active: 'bg-success/20 text-success',
  paused: 'bg-warning/20 text-warning',
  inactive: 'bg-blue-500/20 text-blue-400',
  archived: 'bg-dark-600/20 text-dark-400',
};

export default function ChannelCard({ channel, onClassify }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/channels/${channel._id}`)}
      className="glass-card p-4 cursor-pointer hover:border-accent-500/30 transition-all duration-200 group relative"
    >
      <div className="flex items-start gap-3">
        <img
          src={channel.thumbnailUrl}
          alt=""
          className="w-12 h-12 rounded-full object-cover bg-dark-700 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium truncate group-hover:text-accent-400 transition-colors">
            {channel.title}
          </h3>
          <p className="text-xs text-dark-400 truncate">
            {channel.customUrl || channel.youtubeChannelId}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {channel.classificationDone && (
            <span className="p-1 rounded bg-green-500/20 text-green-400" title="Classification done">
              <Check className="w-3.5 h-3.5" />
            </span>
          )}
          {onClassify && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClassify(channel); }}
              className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-accent-400"
              aria-label="Classify videos"
              title="Classify videos as Sadhguru or not"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
          <span className={clsx('badge text-[10px]', statusColors[channel.status])}>
            {channel.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <div>
          <p className="text-xs text-dark-400">Subs</p>
          <p className="text-sm font-semibold">
            {formatNumber(channel.currentStats?.subscribers)}
          </p>
        </div>
        <div>
          <p className="text-xs text-dark-400">Views</p>
          <p className="text-sm font-semibold">
            {formatNumber(channel.currentStats?.views)}
          </p>
        </div>
        <div>
          <p className="text-xs text-dark-400">Videos</p>
          <p className="text-sm font-semibold">
            {formatNumber(channel.currentStats?.videoCount)}
          </p>
        </div>
      </div>

      {channel.tags?.length > 0 && (
        <div className="flex gap-1 mt-3 flex-wrap">
          {channel.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="badge bg-dark-700 text-dark-300 text-[10px]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
