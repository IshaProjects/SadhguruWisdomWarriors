import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Users,
  Eye,
  Film,
  Calendar,
  ExternalLink,
  Save,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import TopBar from '../components/layout/TopBar.jsx';
import StatCard from '../components/common/StatCard.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import { formatNumber, formatDate, formatRelativeDate, engagementRate, formatDuration } from '../utils/formatters.js';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const categories = [
  'Uncategorized', 'Gaming', 'Education', 'Tech', 'Entertainment',
  'Music', 'Sports', 'News', 'Lifestyle', 'Comedy', 'Science', 'Finance',
];

export default function ChannelDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [channel, setChannel] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videoTrends, setVideoTrends] = useState(null);
  const [trendPeriod, setTrendPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const fetchChannel = async () => {
      try {
        const res = await api.get(`/channels/${id}`);
        setChannel(res.data.channel);
        setSnapshots(res.data.snapshots);
        setVideos(res.data.videos);
        setEditForm({
          category: res.data.channel.category,
          tags: res.data.channel.tags?.join(', ') || '',
          notes: res.data.channel.notes || '',
          status: res.data.channel.status,
        });
      } catch {
        toast.error('Failed to load channel');
        navigate('/channels');
      } finally {
        setLoading(false);
      }
    };
    fetchChannel();
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    const fetchVideoTrends = async () => {
      try {
        const start = new Date();
        start.setDate(start.getDate() - parseInt(trendPeriod));
        const startDate = start.toISOString().slice(0, 10);
        const res = await api.get(`/video-snapshots/channel/${id}`, {
          params: { startDate },
        });
        setVideoTrends(res.data);
      } catch {
        // Silently fail — no snapshots yet is expected
        setVideoTrends(null);
      }
    };
    fetchVideoTrends();
  }, [id, trendPeriod]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post(`/channels/${id}/sync`);
      toast.success('Sync complete');
      const res = await api.get(`/channels/${id}`);
      setChannel(res.data.channel);
      setSnapshots(res.data.snapshots);
      setVideos(res.data.videos);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await api.put(`/channels/${id}`, {
        category: editForm.category,
        tags: editForm.tags ? editForm.tags.split(',').map((t) => t.trim()) : [],
        notes: editForm.notes,
        status: editForm.status,
      });
      setChannel(res.data);
      setEditing(false);
      toast.success('Channel updated');
    } catch {
      toast.error('Update failed');
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!channel) return null;

  const chartData = snapshots.map((s) => ({
    date: s.date?.slice(0, 10),
    subscribers: s.subscribers,
    views: s.views,
  }));

  // Calculate growth from snapshots
  const firstSnap = snapshots[0];
  const lastSnap = snapshots[snapshots.length - 1];
  const subsGrowth =
    firstSnap && lastSnap
      ? lastSnap.subscribers - firstSnap.subscribers
      : 0;

  return (
    <div>
      <TopBar title="Channel Detail" />
      <div className="p-6 space-y-6">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/channels')}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Channels
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <RefreshCw className={clsx('w-4 h-4', syncing && 'animate-spin')} />
              Sync
            </button>
            <a
              href={`https://youtube.com/channel/${channel.youtubeChannelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-sm flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" /> View on YouTube
            </a>
          </div>
        </div>

        {/* Channel Header */}
        <div className="glass-card p-6">
          <div className="flex items-start gap-4">
            <img
              src={channel.thumbnailUrl}
              alt=""
              className="w-20 h-20 rounded-full object-cover bg-dark-700"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{channel.title}</h2>
              <p className="text-dark-400 text-sm mt-0.5">
                {channel.customUrl || channel.youtubeChannelId}
              </p>
              <p className="text-dark-300 text-sm mt-2 line-clamp-2">
                {channel.description}
              </p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className={clsx(
                  'badge',
                  channel.status === 'active' && 'badge-active',
                  channel.status === 'paused' && 'badge-paused',
                  channel.status === 'archived' && 'badge-archived',
                )}>
                  {channel.status}
                </span>
                <span className="badge bg-dark-700 text-dark-300">{channel.category}</span>
                {channel.tags?.map((tag) => (
                  <span key={tag} className="badge bg-accent-500/20 text-accent-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Subscribers"
            value={channel.currentStats?.subscribers}
            icon={Users}
          />
          <StatCard
            title="Total Views"
            value={channel.currentStats?.views}
            icon={Eye}
          />
          <StatCard
            title="Total Videos"
            value={channel.currentStats?.videoCount}
            icon={Film}
          />
          <StatCard
            title="Joined"
            value={formatDate(channel.publishedAt)}
            format={false}
            icon={Calendar}
          />
        </div>

        {/* Growth Charts */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-5">
              <h3 className="text-sm font-medium text-dark-300 mb-4">
                Subscriber Trend ({formatNumber(subsGrowth)} growth)
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={formatNumber} width={55} />
                  <Tooltip />
                  <Line type="monotone" dataKey="subscribers" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-card p-5">
              <h3 className="text-sm font-medium text-dark-300 mb-4">
                Views Trend
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={formatNumber} width={55} />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Video Trends */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent-400" />
              <h3 className="text-sm font-medium text-dark-300">Video Trends</h3>
            </div>
            <div className="flex gap-1">
              {[
                { label: '7D',  value: '7'  },
                { label: '30D', value: '30' },
                { label: '90D', value: '90' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTrendPeriod(opt.value)}
                  className={clsx(
                    'px-2.5 py-1 text-xs rounded font-medium transition-colors',
                    trendPeriod === opt.value
                      ? 'bg-accent-500 text-white'
                      : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {videoTrends && videoTrends.dailyTrend.length > 0 ? (
            <>
              {/* Aggregated daily views chart */}
              <div>
                <p className="text-xs text-dark-400 mb-2">Total daily views across all videos</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={videoTrends.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(d) => d.slice(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={formatNumber}
                      width={55}
                    />
                    <Tooltip formatter={(v) => formatNumber(v)} />
                    <Line
                      type="monotone"
                      dataKey="views"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      name="Views"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Top videos by views with mini trend */}
              {videoTrends.topVideos.length > 0 && (
                <div>
                  <p className="text-xs text-dark-400 mb-2">Top videos by views in this period</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-dark-700">
                          <th className="text-left py-2 px-2 text-dark-400 font-medium">Video</th>
                          <th className="text-right py-2 px-2 text-dark-400 font-medium">Views (period)</th>
                          <th className="text-right py-2 px-2 text-dark-400 font-medium">View Growth</th>
                          <th className="text-right py-2 px-2 text-dark-400 font-medium">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {videoTrends.topVideos.map((item) => (
                          <tr key={item._id} className="border-b border-dark-800 hover:bg-dark-800/50">
                            <td className="py-2.5 px-2">
                              <div className="flex items-center gap-3">
                                {item.video?.thumbnailUrl && (
                                  <img
                                    src={item.video.thumbnailUrl}
                                    alt=""
                                    className="w-14 h-8 rounded object-cover bg-dark-700 shrink-0"
                                  />
                                )}
                                <a
                                  href={`https://youtube.com/watch?v=${item.video?.youtubeVideoId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium truncate max-w-[220px] hover:text-accent-400 transition-colors"
                                >
                                  {item.video?.title || item._id}
                                </a>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-right">{formatNumber(item.totalViews)}</td>
                            <td className="py-2.5 px-2 text-right">
                              <span className={clsx(
                                'font-medium',
                                item.viewsGrowth >= 0 ? 'text-green-400' : 'text-red-400'
                              )}>
                                {item.viewsGrowth >= 0 ? '+' : ''}{formatNumber(item.viewsGrowth)}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              {item.dataPoints.length > 1 ? (
                                <div className="inline-block w-24 h-8">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={item.dataPoints}>
                                      <Line
                                        type="monotone"
                                        dataKey="views"
                                        stroke="#f59e0b"
                                        strokeWidth={1.5}
                                        dot={false}
                                      />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              ) : (
                                <span className="text-dark-500 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-10 text-center text-dark-400 text-sm">
              No video snapshot data yet. Run a sync to start collecting trend history.
            </div>
          )}
        </div>

        {/* Internal Metadata (Edit) */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-dark-300">Internal Metadata</h3>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="btn-ghost text-sm">
                Edit
              </button>
            ) : (
              <button onClick={handleSave} className="btn-primary text-sm flex items-center gap-1.5">
                <Save className="w-4 h-4" /> Save
              </button>
            )}
          </div>

          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-dark-400 mb-1">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="input-field w-full text-sm"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="input-field w-full text-sm"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">Tags</label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  className="input-field w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="input-field w-full text-sm h-20 resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-dark-400">Category</p>
                <p className="font-medium">{channel.category}</p>
              </div>
              <div>
                <p className="text-xs text-dark-400">Status</p>
                <p className="font-medium capitalize">{channel.status}</p>
              </div>
              <div>
                <p className="text-xs text-dark-400">Tags</p>
                <p className="font-medium">{channel.tags?.join(', ') || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-dark-400">Owner</p>
                <p className="font-medium">{channel.assignedTo?.name || '—'}</p>
              </div>
              {channel.notes && (
                <div className="col-span-full">
                  <p className="text-xs text-dark-400">Notes</p>
                  <p className="text-dark-300">{channel.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Videos */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-medium text-dark-300 mb-4">Recent Videos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-2 px-2 text-dark-400 font-medium">Video</th>
                  <th className="text-right py-2 px-2 text-dark-400 font-medium">Views</th>
                  <th className="text-right py-2 px-2 text-dark-400 font-medium">Likes</th>
                  <th className="text-right py-2 px-2 text-dark-400 font-medium">Comments</th>
                  <th className="text-right py-2 px-2 text-dark-400 font-medium">Eng. Rate</th>
                  <th
                    className="text-right py-2 px-2 text-dark-400 font-medium cursor-help"
                    title="Outlier Score = video views ÷ channel average views. >1.5× is an outlier hit; <0.5× is an underperformer."
                  >
                    Outlier Score
                  </th>
                  <th className="text-right py-2 px-2 text-dark-400 font-medium">Duration</th>
                  <th className="text-right py-2 px-2 text-dark-400 font-medium">Published</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const avgViews = videos.length
                    ? videos.reduce((s, v) => s + (v.views || 0), 0) / videos.length
                    : 0;
                  return videos.map((v) => {
                    const score = avgViews > 0 ? v.views / avgViews : null;
                    const scoreBadge = (() => {
                      if (score == null) return null;
                      if (score >= 3)    return { label: `${score.toFixed(1)}×`, cls: 'bg-green-500/20 text-green-300' };
                      if (score >= 1.5)  return { label: `${score.toFixed(1)}×`, cls: 'bg-emerald-500/15 text-emerald-400' };
                      if (score >= 0.75) return { label: `${score.toFixed(1)}×`, cls: 'bg-dark-700 text-dark-300' };
                      if (score >= 0.5)  return { label: `${score.toFixed(1)}×`, cls: 'bg-yellow-500/15 text-yellow-400' };
                      return              { label: `${score.toFixed(1)}×`, cls: 'bg-red-500/15 text-red-400' };
                    })();
                    return (
                      <tr key={v._id} className="border-b border-dark-800 hover:bg-dark-800/50">
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-3">
                            <img src={v.thumbnailUrl} alt="" className="w-16 h-9 rounded object-cover bg-dark-700 shrink-0" />
                            <span className="font-medium truncate max-w-[250px]">{v.title}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right">{formatNumber(v.views)}</td>
                        <td className="py-2.5 px-2 text-right text-dark-300">{formatNumber(v.likes)}</td>
                        <td className="py-2.5 px-2 text-right text-dark-300">{formatNumber(v.comments)}</td>
                        <td className="py-2.5 px-2 text-right text-dark-300">
                          {engagementRate(v.views, v.likes, v.comments).toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {scoreBadge ? (
                            <span
                              className={clsx('inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums', scoreBadge.cls)}
                              title={`Channel avg: ${formatNumber(Math.round(avgViews))} views`}
                            >
                              {scoreBadge.label}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-right text-dark-400">{formatDuration(v.duration)}</td>
                        <td className="py-2.5 px-2 text-right text-dark-400">{formatRelativeDate(v.publishedAt)}</td>
                      </tr>
                    );
                  });
                })()}
                {videos.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-dark-400">
                      No videos synced yet. Run a sync to fetch videos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
