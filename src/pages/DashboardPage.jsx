import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Tv2, Video, Layers, User, ArrowLeft } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import FilterBar from '../components/common/FilterBar.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import GradeGrid from '../components/dashboard/GradeGrid.jsx';
import { ChannelReport, VideoReport } from './ReportsPage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const isPoc = user?.role === 'poc';
  const isManagerOrAdmin = ['admin', 'manager'].includes(user?.role);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const microUnitIdParam = searchParams.get('microUnitId');

  const [pocUnits, setPocUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState(microUnitIdParam || '');
  const [unit, setUnit] = useState(null);
  const [loadingUnit, setLoadingUnit] = useState(false);
  const [activeTab, setActiveTab] = useState('channels');

  const [filters, setFilters] = useState({
    group: '',
    startDate: '',
    endDate: '',
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // For POC users: automatically fetch their assigned micro unit(s)
  useEffect(() => {
    if (isPoc) {
      api.get('/micro-units')
        .then((res) => {
          setPocUnits(res.data);
          if (!microUnitIdParam && res.data.length > 0) {
            setSelectedUnitId(res.data[0]._id);
          }
        })
        .catch(() => {});
    }
  }, [isPoc, microUnitIdParam]);

  const currentUnitId = microUnitIdParam || selectedUnitId;

  // Fetch Micro Unit details if viewing a unit's dashboard
  useEffect(() => {
    if (!currentUnitId) {
      setUnit(null);
      return;
    }
    setLoadingUnit(true);
    api.get(`/micro-units/${currentUnitId}`)
      .then((res) => setUnit(res.data))
      .catch(() => toast.error('Failed to load Micro Unit details'))
      .finally(() => setLoadingUnit(false));
  }, [currentUnitId]);

  useEffect(() => {
    if (currentUnitId) return; // Skip grade-grid fetch when viewing specific unit dashboard
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      const params = {};
      if (filters.group) params.group = filters.group;
      if (filters.startDate && filters.endDate) {
        params.startDate = filters.startDate;
        params.endDate = filters.endDate;
      }
      try {
        const res = await api.get('/dashboard/grade-grid', { params });
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) toast.error('Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [filters, currentUnitId]);

  if (currentUnitId || isPoc) {
    if (isPoc && pocUnits.length === 0 && !loadingUnit && !unit) {
      return (
        <div className="flex flex-col h-full">
          <TopBar title="POC Dashboard" />
          <div className="p-6">
            <div className="glass-card p-12 text-center">
              <Layers className="w-12 h-12 text-dark-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-dark-300 mb-2">No Micro Units Assigned</h3>
              <p className="text-sm text-dark-400">
                You currently do not have any Micro Units assigned to your Point of Contact account. Please contact an Admin to assign a unit to you.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        <TopBar title={unit ? `${unit.name} Dashboard` : 'Unit Dashboard'} />
        <div className="p-6 flex-1 space-y-5">
          {/* Header Card for Micro Unit */}
          <div className="glass-card p-5 border border-accent-500/30 bg-dark-900/60 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/micro-units')}
                  className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-dark-100 transition-colors"
                  title="Back to Micro Units"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <Layers className="w-5 h-5 text-accent-400" />
                <h2 className="text-xl font-bold text-dark-100">{unit?.name || 'Loading Micro Unit...'}</h2>
              </div>
              <p className="text-xs text-dark-400 flex items-center gap-3 pl-8">
                <span>{unit?.channelIds?.length || 0} Added Channels</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-accent-400" />
                  POC: <strong className="text-dark-200">{unit?.poc?.name || 'Unassigned'}</strong>
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* If POC has multiple units assigned, show unit selector */}
              {isPoc && pocUnits.length > 1 && (
                <select
                  value={currentUnitId}
                  onChange={(e) => {
                    setSelectedUnitId(e.target.value);
                    setSearchParams({ microUnitId: e.target.value });
                  }}
                  className="input-field text-xs py-1.5 px-3 bg-dark-800 border-dark-600 font-medium"
                >
                  {pocUnits.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              )}

              {isManagerOrAdmin && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn-ghost text-xs text-dark-400 hover:text-dark-200"
                >
                  View Global Dashboard →
                </button>
              )}
            </div>
          </div>

          {/* Tab bar for Unit Reports */}
          <div className="flex gap-1 border-b border-dark-700">
            {[
              { id: 'channels', label: 'Channel Report', Icon: Tv2 },
              { id: 'videos', label: 'Video Report', Icon: Video },
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

          {/* Unit Filtered Reports */}
          {activeTab === 'channels' && <ChannelReport microUnitId={microUnitId} />}
          {activeTab === 'videos' && <VideoReport microUnitId={microUnitId} />}
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Dashboard" />
      <div className="py-6 space-y-4">
        <div className="px-6">
          <FilterBar
            filters={filters}
            onFilterChange={setFilters}
            showPeriod={false}
            showDateRange={true}
            showGroupFilter={true}
            showAdvancedFilters={false}
          />
        </div>
        <div className="px-6">
          {loading && !data ? (
            <LoadingSpinner size="lg" />
          ) : (
            <GradeGrid data={data} />
          )}
        </div>
      </div>
    </div>
  );
}

/* <DO NOT DELETE> Legacy dashboard — preserved for re-enablement.
   Restore by uncommenting this block and reverting the export above to use it.
   The endpoints it depends on are still live on the backend.

import { useState, useEffect, forwardRef } from 'react';
import { Users, Eye, Film, TrendingUp, Activity, Heart, Zap, BarChart3, MessageCircle } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import StatCard from '../components/common/StatCard.jsx';
import FilterBar from '../components/common/FilterBar.jsx';
import GrowthChart from '../components/dashboard/GrowthChart.jsx';
import TopChannelsChart from '../components/dashboard/TopChannelsChart.jsx';
import ViewsPerChannelChart from '../components/dashboard/ViewsPerChannelChart.jsx';
import PublishingChart from '../components/dashboard/PublishingChart.jsx';
import ViewsByCategoryChart from '../components/dashboard/ViewsByCategoryChart.jsx';
import TopVideosTable from '../components/dashboard/TopVideosTable.jsx';
import ChannelMetricsTable from '../components/dashboard/ChannelMetricsTable.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import DashboardGrid from '../components/common/DashboardGrid.jsx';
import DashboardWidget from '../components/common/DashboardWidget.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';

const GridItem = forwardRef(({ style, className, children, onMouseDown, onMouseUp, onTouchEnd, ...rest }, ref) => (
  <div
    ref={ref}
    style={style}
    className={`${className ?? ''} group`}
    onMouseDown={onMouseDown}
    onMouseUp={onMouseUp}
    onTouchEnd={onTouchEnd}
    {...rest}
  >
    {children}
  </div>
));
GridItem.displayName = 'GridItem';

export default function DashboardPageLegacy() {
  const [filters, setFilters] = useState({
    period: '30d',
    category: '',
    tags: '',
    status: '',
    startDate: '',
    endDate: '',
    group: '',
  });
  const [summary, setSummary] = useState(null);
  const [growthData, setGrowthData] = useState([]);
  const [topChannelsBySubs, setTopChannelsBySubs] = useState([]);
  const [topChannelsByViews, setTopChannelsByViews] = useState([]);
  const [topVideos, setTopVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [publishing, setPublishing] = useState([]);
  const [channelMetrics, setChannelMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  const buildParams = () => {
    const params = { period: filters.period };
    if (filters.category) params.category = filters.category;
    if (filters.group) params.group = filters.group;
    const tagsTrimmed = filters.tags?.trim?.();
    if (tagsTrimmed) params.tags = tagsTrimmed;
    if (filters.status) params.status = filters.status;
    if (filters.startDate && filters.endDate) {
      params.startDate = filters.startDate;
      params.endDate = filters.endDate;
    }
    return params;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = buildParams();
      try {
        const [sumRes, growthRes, topSubsRes, topViewsRes, videosRes, catRes, pubRes, metricsRes] =
          await Promise.all([
            api.get('/dashboard/summary', { params }),
            api.get('/dashboard/growth', { params }),
            api.get('/dashboard/top-channels', { params: { ...params, metric: 'subscribers' } }),
            api.get('/dashboard/top-channels', { params: { ...params, metric: 'views' } }),
            api.get('/dashboard/top-videos', { params }),
            api.get('/dashboard/categories', { params }),
            api.get('/dashboard/publishing', { params }),
            api.get('/dashboard/channel-metrics', { params }),
          ]);

        setSummary(sumRes.data);
        const raw = growthRes.data;
        const withDeltas = raw.map((d, i) => {
          const prev = raw[i - 1];
          return {
            ...d,
            subscribersDelta: prev != null ? d.subscribers - prev.subscribers : 0,
            viewsDelta:       prev != null ? d.views       - prev.views       : 0,
          };
        });
        setGrowthData(withDeltas);
        setTopChannelsBySubs(topSubsRes.data);
        setTopChannelsByViews(topViewsRes.data);
        setTopVideos(videosRes.data);
        setCategories(catRes.data);
        setPublishing(pubRes.data);
        setChannelMetrics(metricsRes.data);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  if (loading && !summary) return <LoadingSpinner size="lg" />;

  const avg = (key) => {
    const vals = channelMetrics.filter((c) => c[key] != null).map((c) => c[key]);
    if (!vals.length) return null;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  };
  const avgEngEff   = avg('engagementEfficiency');
  const avgVelocity = avg('subscriberVelocity');
  const avgImpact   = avg('contentImpact');
  const avgLoyalty  = avg('loyaltyIndex');

  return (
    <div>
      <TopBar title="Dashboard" />
      <div className="py-6 space-y-4">
        <div className="px-6">
          <FilterBar
            filters={filters}
            onFilterChange={setFilters}
            showPeriod={false}
            showDateRange={true}
            showGroupFilter={true}
          />
        </div>

        <DashboardGrid>
          <GridItem key="summary">
            <DashboardWidget id="summary" title="Summary Overview">
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 h-full content-start">
                  <StatCard title="Total Channels"     value={summary.totalChannels}                       icon={Users}      tooltip="The number of YouTube channels currently tracked in this dashboard." />
                  <StatCard title="Total Subscribers"  value={summary.totalSubscribers} change={summary.subsChange}  icon={TrendingUp} tooltip="Combined subscriber count across all tracked channels." />
                  <StatCard title="Total Views"        value={summary.totalViews}       change={summary.viewsChange} icon={Eye}        tooltip="Total video views accumulated across all channels in the selected period." />
                  <StatCard title="Videos Published"   value={summary.videosThisPeriod}                    icon={Film}       tooltip="Number of new videos published across all channels within the selected date range." />
                  <StatCard title="Avg Engagement"     value={`${summary.avgEngagement}%`} format={false}  icon={Activity}   tooltip="Average engagement rate across all channels: (Likes + Comments) ÷ Views × 100." />
                </div>
              )}
            </DashboardWidget>
          </GridItem>

          <GridItem key="viewstrend">
            <DashboardWidget id="viewstrend" title="Views per Subscriber by Category" className="h-full">
              <ViewsByCategoryChart data={categories} fullHeight />
            </DashboardWidget>
          </GridItem>

          <GridItem key="subgrowth">
            <DashboardWidget id="subgrowth" title="Daily Subscriber Change" className="h-full">
              <GrowthChart data={growthData} dataKey="subscribersDelta" title="Daily Subscriber Change" color="#3b82f6" unit="subscribers" fullHeight />
            </DashboardWidget>
          </GridItem>

          <GridItem key="publishing">
            <DashboardWidget id="publishing" title="Publishing Frequency" className="h-full">
              <PublishingChart data={publishing} fullHeight />
            </DashboardWidget>
          </GridItem>

          <GridItem key="viewgrowth">
            <DashboardWidget id="viewgrowth" title="Daily Views Change" className="h-full">
              <GrowthChart data={growthData} dataKey="viewsDelta" title="Daily Views Change" color="#8b5cf6" unit="views" fullHeight />
            </DashboardWidget>
          </GridItem>

          <GridItem key="viewscat">
            <DashboardWidget id="viewscat" title="Views by Category" className="h-full">
              <ViewsPerChannelChart data={categories} fullHeight />
            </DashboardWidget>
          </GridItem>

          <GridItem key="topchannels">
            <DashboardWidget id="topchannels" title="Top Channels" className="h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                <TopChannelsChart data={topChannelsBySubs}  dataKey="subsGrowth"  title="Top 10 by Subscriber Growth" color="#22c55e" fullHeight />
                <TopChannelsChart data={topChannelsByViews} dataKey="viewsGrowth" title="Top 10 by View Growth"       color="#f59e0b" fullHeight />
              </div>
            </DashboardWidget>
          </GridItem>

          <GridItem key="metrics">
            <DashboardWidget id="metrics" title="Portfolio Metrics">
              {channelMetrics.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-full content-start">
                  <StatCard title="Avg Eng. Efficiency"   value={avgEngEff   != null ? `${(avgEngEff   * 100).toFixed(2)}%` : '—'} format={false} icon={Heart}         />
                  <StatCard title="Avg Sub Velocity (7d)" value={avgVelocity != null ? `${avgVelocity >= 0 ? '+' : ''}${avgVelocity.toFixed(2)}%` : '—'} format={false} icon={Zap} />
                  <StatCard title="Avg Content Impact"    value={avgImpact   != null ? avgImpact : '—'}                            icon={BarChart3}     />
                  <StatCard title="Avg Loyalty Index"     value={avgLoyalty  != null ? `${(avgLoyalty * 100).toFixed(3)}%` : '—'} format={false} icon={MessageCircle} />
                </div>
              )}
            </DashboardWidget>
          </GridItem>

          <GridItem key="channelmetrics">
            <DashboardWidget id="channelmetrics" title="Channel Metrics Comparison" className="h-full">
              {channelMetrics.length > 0 && <ChannelMetricsTable data={channelMetrics} />}
            </DashboardWidget>
          </GridItem>

          <GridItem key="topvideos">
            <DashboardWidget id="topvideos" title="Top Videos This Period" className="h-full">
              <TopVideosTable videos={topVideos} />
            </DashboardWidget>
          </GridItem>
        </DashboardGrid>
      </div>
    </div>
  );
}
*/
