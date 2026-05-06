import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import TopBar from '../components/layout/TopBar.jsx';
import FilterBar from '../components/common/FilterBar.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import GradeGrid from '../components/dashboard/GradeGrid.jsx';
import api from '../services/api.js';

export default function DashboardPage() {
  const [filters, setFilters] = useState({
    group: '',
    startDate: '',
    endDate: '',
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        // Keep prior valid data visible on transient failure.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [filters]);

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
