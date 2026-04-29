import { useState, useEffect, useCallback } from 'react';
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
  Sparkles,
  Download,
  LayoutDashboard,
  Video,
  Search,
  Filter,
  X,
  Heart,
  MessageCircle,
  RotateCw,
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
import { toUtcDateInputValue } from '../utils/dateUtc.js';
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
  const [videoCountInDb, setVideoCountInDb] = useState(null);
  const [videoTrends, setVideoTrends] = useState(null);
  const [trendPeriod, setTrendPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [showPullModal, setShowPullModal] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [showClassifyModal, setShowClassifyModal] = useState(false);
  const [classificationSummary, setClassificationSummary] = useState(null);
  const [reclassifying, setReclassifying] = useState(false);
  const [showReclassifyModal, setShowReclassifyModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Videos tab state
  const [activeTab, setActiveTab] = useState('videos');
  const [videosSearch, setVideosSearch] = useState('');
  const [videosClassification, setVideosClassification] = useState('');
  const [videosSort, setVideosSort] = useState('-views');
  const [videosPage, setVideosPage] = useState(1);
  const [videosData, setVideosData] = useState({ videos: [], pagination: null, summary: null });
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosShowFilters, setVideosShowFilters] = useState(false);
  const [videosMinViews, setVideosMinViews] = useState('');
  const [videosMaxViews, setVideosMaxViews] = useState('');

  const fetchChannelVideos = useCallback(async (overrides = {}) => {
    if (!id) return;
    setVideosLoading(true);
    try {
      const page = overrides.page ?? videosPage;
      const sort = overrides.sort ?? videosSort;
      const search = overrides.search ?? videosSearch;
      const classification = overrides.classification ?? videosClassification;
      const minViews = overrides.minViews ?? videosMinViews;
      const maxViews = overrides.maxViews ?? videosMaxViews;
      const params = { page, limit: 50, sort };
      if (search?.trim()) params.search = search.trim();
      if (classification) params.classification = classification;
      if (minViews) params.minViews = minViews;
      if (maxViews) params.maxViews = maxViews;
      const res = await api.get(`/channels/${id}/videos`, { params });
      const summary = res.data.summary ?? { totalVideos: 0, totalViews: 0, totalLikes: 0, totalComments: 0 };
      setVideosData({ videos: res.data.videos, pagination: res.data.pagination, summary });
    } catch {
      toast.error('Failed to load videos');
    } finally {
      setVideosLoading(false);
    }
  }, [id, videosPage, videosSort, videosSearch, videosClassification, videosMinViews, videosMaxViews]);

  useEffect(() => {
    if (activeTab === 'videos' && id && !loading) fetchChannelVideos();
  }, [activeTab, id, videosPage, videosSort, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchChannel = async () => {
      try {
        const res = await api.get(`/channels/${id}`);
        setChannel(res.data.channel);
        setSnapshots(res.data.snapshots);
        setVideos(res.data.videos);
        setVideoCountInDb(res.data.videoCountInDb ?? null);
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
        const startDate = toUtcDateInputValue(start);
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
      setVideoCountInDb(res.data.videoCountInDb ?? null);
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

  const handlePullAllVideos = async () => {
    setPulling(true);
    try {
      const res = await api.post(`/channels/${id}/pull-videos`);
      setShowPullModal(false);
      toast.success(`Pulled ${res.data.videosProcessed} videos`);
      const chRes = await api.get(`/channels/${id}`);
      setChannel(chRes.data.channel);
      setVideos(chRes.data.videos);
      setVideoCountInDb(chRes.data.videoCountInDb ?? null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Pull failed');
    } finally {
      setPulling(false);
    }
  };

  const handleClassify = async () => {
    setClassifying(true);
    try {
      const res = await api.post(`/channels/${id}/classify-videos`);
      setShowClassifyModal(false);
      setClassificationSummary(res.data);
      const chRes = await api.get(`/channels/${id}`);
      setVideos(chRes.data.videos);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Classification failed');
    } finally {
      setClassifying(false);
    }
  };

  const handleReclassify = async () => {
    setReclassifying(true);
    try {
      const res = await api.post(`/channels/${id}/reclassify-videos`);
      setShowReclassifyModal(false);
      setClassificationSummary(res.data);
      const chRes = await api.get(`/channels/${id}`);
      setVideos(chRes.data.videos);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reclassification failed');
    } finally {
      setReclassifying(false);
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
  const totalVideosInDb = typeof videoCountInDb === 'number' ? videoCountInDb : videos.length;

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
              onClick={() => setShowPullModal(true)}
              disabled={pulling || channel.allVideosPulled}
              className="btn-secondary text-sm flex items-center gap-1.5"
              title={channel.allVideosPulled ? 'All videos already pulled' : 'Pull all videos for this channel in batches of 100'}
            >
              <Download className={clsx('w-4 h-4', pulling && 'animate-pulse')} />
              {channel.allVideosPulled ? 'All Videos Pulled' : 'Pull All Videos'}
            </button>
            <button
              onClick={() => setShowClassifyModal(true)}
              disabled={classifying || totalVideosInDb === 0}
              className="btn-secondary text-sm flex items-center gap-1.5"
              title="Classify videos as Sadhguru or not using AI"
            >
              <Sparkles className={clsx('w-4 h-4', classifying && 'animate-pulse')} />
              Classify
            </button>
            <button
              onClick={() => setShowReclassifyModal(true)}
              disabled={reclassifying || totalVideosInDb === 0}
              className="btn-secondary text-sm flex items-center gap-1.5 text-amber-400 hover:text-amber-300"
              title="Re-classify all videos (overwrites existing classifications)"
            >
              <RotateCw className={clsx('w-4 h-4', reclassifying && 'animate-spin')} />
              Reclassify
            </button>
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

        {/* Tabs */}
        <div className="flex gap-1 border-b border-dark-700">
          {[
            { id: 'videos', label: 'All Videos', Icon: Video },
            { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === id
                  ? 'border-accent-500 text-accent-400'
                  : 'border-transparent text-dark-400 hover:text-dark-200'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
        <>
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
            tooltip="YouTube total vs videos in our database"
            subtitle={videoCountInDb != null ? `${formatNumber(videoCountInDb)} in our DB` : null}
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
                  <th
                    className="text-center py-2 px-2 text-dark-400 font-medium cursor-help"
                    title="Classification: sadhguru / -. Click Classify to run."
                  >
                    Classification
                  </th>
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
                        <td className="py-2.5 px-2 text-center">
                          {((v.classification === 'sadhguru') || (v.isSadguruVideo === true)) && (
                            <span className="badge bg-green-500/20 text-green-300 text-xs">sadhguru</span>
                          )}
                          {((v.classification === 'non sadhguru') || (v.isSadguruVideo === false)) && (
                            <span className="badge bg-dark-700 text-dark-400 text-xs">-</span>
                          )}
                          {(!v.classification || v.classification.trim() === '') && v.isSadguruVideo == null && (
                            <span className="text-dark-500 text-xs">—</span>
                          )}
                          {v.classification && v.classification !== 'sadhguru' && v.classification !== 'non sadhguru' && (
                            <span className="badge bg-accent-500/20 text-accent-300 text-xs">{v.classification}</span>
                          )}
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
                    <td colSpan={9} className="py-8 text-center text-dark-400">
                      No videos synced yet. Run a sync to fetch videos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {videosLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="glass-card p-5 animate-pulse">
                  <div className="h-4 bg-dark-700 rounded w-24 mb-2" />
                  <div className="h-8 bg-dark-700 rounded w-16" />
                </div>
              ))
            ) : videosData.summary ? (
              <>
                <StatCard title="Videos" value={videosData.summary.totalVideos} icon={Film} />
                <StatCard title="Total Views" value={videosData.summary.totalViews} icon={Eye} />
                <StatCard title="Total Likes" value={videosData.summary.totalLikes} icon={Heart} />
                <StatCard title="Total Comments" value={videosData.summary.totalComments} icon={MessageCircle} />
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="relative flex-1 min-w-52 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                placeholder="Search video titles…"
                value={videosSearch}
                onChange={(e) => setVideosSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setVideosPage(1), fetchChannelVideos({ page: 1 }))}
                className="input-field pl-9 pr-9 w-full text-sm"
              />
              {videosSearch && (
                <button
                  onClick={() => { setVideosSearch(''); setVideosPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVideosShowFilters((v) => !v)}
                className={clsx('btn-ghost flex items-center gap-2 text-sm', videosShowFilters && 'text-accent-400')}
              >
                <Filter className="w-4 h-4" /> Filters
              </button>
              <button
                onClick={() => fetchChannelVideos()}
                className="btn-ghost p-2"
                title="Refresh"
              >
                <RefreshCw className={clsx('w-4 h-4', videosLoading && 'animate-spin')} />
              </button>
              <button
                onClick={() => {
                  setVideosSearch('');
                  setVideosClassification('');
                  setVideosMinViews('');
                  setVideosMaxViews('');
                  setVideosPage(1);
                  fetchChannelVideos({ search: '', classification: '', minViews: '', maxViews: '', page: 1 });
                }}
                className="btn-ghost text-xs text-dark-400 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
          </div>

          {videosShowFilters && (
            <div className="glass-card p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-dark-400 mb-1">Classification</label>
                <select
                  value={videosClassification}
                  onChange={(e) => { setVideosClassification(e.target.value); setVideosPage(1); }}
                  className="input-field text-sm w-full"
                >
                  <option value="">All</option>
                  <option value="sadhguru">Sadhguru</option>
                  <option value="non_sadhguru">-</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">Min Views</label>
                <input
                  type="number"
                  min="0"
                  value={videosMinViews}
                  onChange={(e) => setVideosMinViews(e.target.value)}
                  className="input-field text-sm w-full"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">Max Views</label>
                <input
                  type="number"
                  min="0"
                  value={videosMaxViews}
                  onChange={(e) => setVideosMaxViews(e.target.value)}
                  className="input-field text-sm w-full"
                  placeholder="∞"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => fetchChannelVideos()}
                  className="btn-secondary text-sm w-full"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-dark-800/60">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-dark-400 uppercase tracking-wide w-8">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-dark-400 uppercase tracking-wide">Video</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-dark-400 uppercase tracking-wide">Classification</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-dark-400 uppercase tracking-wide cursor-pointer hover:text-dark-200" onClick={() => { const s = videosSort === '-views' ? 'views' : '-views'; setVideosSort(s); setVideosPage(1); fetchChannelVideos({ sort: s, page: 1 }); }}>
                      Views {videosSort === '-views' ? '↓' : videosSort === 'views' ? '↑' : ''}
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-dark-400 uppercase tracking-wide cursor-pointer hover:text-dark-200" onClick={() => { const s = videosSort === '-likes' ? 'likes' : '-likes'; setVideosSort(s); setVideosPage(1); fetchChannelVideos({ sort: s, page: 1 }); }}>
                      Likes {videosSort === '-likes' ? '↓' : videosSort === 'likes' ? '↑' : ''}
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-dark-400 uppercase tracking-wide cursor-pointer hover:text-dark-200" onClick={() => { const s = videosSort === '-comments' ? 'comments' : '-comments'; setVideosSort(s); setVideosPage(1); fetchChannelVideos({ sort: s, page: 1 }); }}>
                      Comments {videosSort === '-comments' ? '↓' : videosSort === 'comments' ? '↑' : ''}
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-dark-400 uppercase tracking-wide">Eng. Rate</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-dark-400 uppercase tracking-wide">Duration</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-dark-400 uppercase tracking-wide cursor-pointer hover:text-dark-200" onClick={() => { const s = videosSort === '-publishedAt' ? 'publishedAt' : '-publishedAt'; setVideosSort(s); setVideosPage(1); fetchChannelVideos({ sort: s, page: 1 }); }}>
                      Published {videosSort === '-publishedAt' ? '↓' : videosSort === 'publishedAt' ? '↑' : ''}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/50">
                  {videosLoading ? (
                    <tr><td colSpan={10} className="text-center py-12 text-dark-400">Loading…</td></tr>
                  ) : videosData.videos.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-12 text-dark-400">No videos found.</td></tr>
                  ) : (() => {
                    const avgViews = videosData.videos.length
                      ? videosData.videos.reduce((s, v) => s + (v.views || 0), 0) / videosData.videos.length
                      : 0;
                    return videosData.videos.map((v, i) => {
                      const score = avgViews > 0 ? v.views / avgViews : null;
                      const scoreBadge = score != null ? (
                        score >= 3 ? { label: `${score.toFixed(1)}×`, cls: 'bg-green-500/20 text-green-300' } :
                        score >= 1.5 ? { label: `${score.toFixed(1)}×`, cls: 'bg-emerald-500/15 text-emerald-400' } :
                        score >= 0.75 ? { label: `${score.toFixed(1)}×`, cls: 'bg-dark-700 text-dark-300' } :
                        score >= 0.5 ? { label: `${score.toFixed(1)}×`, cls: 'bg-yellow-500/15 text-yellow-400' } :
                        { label: `${score.toFixed(1)}×`, cls: 'bg-red-500/15 text-red-400' }
                      ) : null;
                      return (
                        <tr key={v._id} className="hover:bg-dark-800/40 transition-colors">
                          <td className="px-3 py-2.5 text-dark-500 text-xs">{(videosData.pagination.page - 1) * videosData.pagination.limit + i + 1}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-3">
                              {v.thumbnailUrl && (
                                <img src={v.thumbnailUrl} alt="" className="w-16 h-9 rounded object-cover bg-dark-700 shrink-0" />
                              )}
                              <a
                                href={`https://youtube.com/watch?v=${v.youtubeVideoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium truncate max-w-[220px] hover:text-accent-400 transition-colors"
                              >
                                {v.title || '—'}
                              </a>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            {v.classification === 'sadhguru' && <span className="badge bg-green-500/20 text-green-400 text-xs">sadhguru</span>}
                            {v.classification === 'non sadhguru' && <span className="badge bg-dark-700 text-dark-400 text-xs">-</span>}
                            {(!v.classification || !v.classification.trim()) && <span className="text-dark-500 text-xs">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono">{formatNumber(v.views)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-dark-300">{formatNumber(v.likes)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-dark-300">{formatNumber(v.comments)}</td>
                          <td className="px-3 py-2.5 text-right text-dark-300">
                            {engagementRate(v.views, v.likes, v.comments).toFixed(2)}%
                          </td>
                          <td className="px-3 py-2.5 text-right text-dark-400">{formatDuration(v.duration)}</td>
                          <td className="px-3 py-2.5 text-right text-dark-400">{formatRelativeDate(v.publishedAt)}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            {videosData.pagination && videosData.pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700 text-sm text-dark-400">
                <span>{videosData.pagination.total.toLocaleString()} total videos</span>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-ghost px-2 py-1 text-xs disabled:opacity-40"
                    disabled={videosData.pagination.page <= 1}
                    onClick={() => setVideosPage((p) => Math.max(1, p - 1))}
                  >
                    ← Prev
                  </button>
                  <span className="text-dark-300">
                    Page {videosData.pagination.page} of {videosData.pagination.pages}
                  </span>
                  <button
                    className="btn-ghost px-2 py-1 text-xs disabled:opacity-40"
                    disabled={videosData.pagination.page >= videosData.pagination.pages}
                    onClick={() => setVideosPage((p) => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Pull All Videos Modal */}
        {showPullModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-2">Pull All Videos</h2>
              <p className="text-sm text-dark-300 mb-4">
                Do you want to pull all videos for this channel? This will fetch video details (title, description, views, likes, comments, duration, etc.) in batches of 100. This may take a while for channels with many videos.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPullModal(false)}
                  disabled={pulling}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary flex items-center gap-1.5"
                  onClick={handlePullAllVideos}
                  disabled={pulling}
                >
                  {pulling ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Pulling…
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Pull All Videos
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Classify Videos Modal */}
        {showClassifyModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-2">Classify Videos</h2>
              <p className="text-sm text-dark-300 mb-4">
                Classify all videos for this channel as Sadhguru video or not. Each video title will be sent to Vertex AI to determine if it features Sadhguru content. Results will be saved for every video.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowClassifyModal(false)}
                  disabled={classifying}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary flex items-center gap-1.5"
                  onClick={handleClassify}
                  disabled={classifying}
                >
                  {classifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Classifying…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Classify
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reclassify Videos Modal */}
        {showReclassifyModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-2 text-amber-400">Reclassify All Videos</h2>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-4">
                <p className="text-sm text-amber-300 font-medium mb-1">Warning</p>
                <p className="text-sm text-dark-300">
                  This will clear all existing classifications and re-classify every video for this channel from scratch. Already classified videos will be overwritten.
                </p>
              </div>
              <p className="text-sm text-dark-400 mb-4">
                {totalVideosInDb} video{totalVideosInDb !== 1 ? 's' : ''} will be reclassified. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowReclassifyModal(false)}
                  disabled={reclassifying}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
                  onClick={handleReclassify}
                  disabled={reclassifying}
                >
                  {reclassifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Reclassifying…
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-4 h-4" />
                      Yes, Reclassify All
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Classification Summary Modal */}
        {classificationSummary && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Classification Complete</h2>
              {classificationSummary.isSadhguruChannel && (
                <p className="text-sm text-accent-300 mb-4 p-3 rounded-lg bg-accent-500/10">
                  This is a Sadhguru (Dedicated) channel. All unclassified videos were marked as sadhguru by default — no AI call was needed.
                </p>
              )}
              <div className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-dark-400">Total videos</span>
                  <span className="font-medium">{classificationSummary.totalVideos}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-dark-400">Already classified</span>
                  <span className="font-medium">{classificationSummary.alreadyClassified}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-dark-400">Newly classified</span>
                  <span className="font-medium text-green-400">{classificationSummary.newlyClassified}</span>
                </p>
                {classificationSummary.failed > 0 && (
                  <p className="flex justify-between">
                    <span className="text-dark-400">Could not process</span>
                    <span className="font-medium text-red-400">{classificationSummary.failed}</span>
                  </p>
                )}
                {!classificationSummary.isSadhguruChannel && classificationSummary.newlyClassified > 0 && (
                  <>
                    <p className="flex justify-between pt-2 border-t border-dark-700">
                      <span className="text-dark-400">→ Sadhguru</span>
                      <span className="font-medium text-green-400">{classificationSummary.sadhguruCount}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-dark-400">→ -</span>
                      <span className="font-medium">{classificationSummary.nonSadguruCount}</span>
                    </p>
                  </>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setClassificationSummary(null)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
