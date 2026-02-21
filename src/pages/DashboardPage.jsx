import { useState, useEffect, forwardRef } from 'react';
// forwardRef is required — react-grid-layout injects style/className/event handlers into direct children
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

// react-grid-layout injects style/className/mouse handlers into direct children
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

export default function DashboardPage() {
  const [filters, setFilters] = useState({
    period: '30d',
    category: '',
    tags: '',
    status: '',
    startDate: '',
    endDate: '',
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
        {/* Filters – outside the grid, always at top */}
        <div className="px-6">
          <FilterBar
            filters={filters}
            onFilterChange={setFilters}
            showPeriod={true}
            showDateRange={true}
          />
        </div>

        {/* Drag-and-drop grid */}
        <DashboardGrid>

          {/* ①  KPI Summary — at-a-glance totals, always first */}
          <GridItem key="summary">
            <DashboardWidget id="summary" title="Summary Overview">
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 h-full content-start">
                  <StatCard
                    title="Total Channels"
                    value={summary.totalChannels}
                    icon={Users}
                    tooltip="The number of YouTube channels currently tracked in this dashboard."
                  />
                  <StatCard
                    title="Total Subscribers"
                    value={summary.totalSubscribers}
                    change={summary.subsChange}
                    icon={TrendingUp}
                    tooltip="Combined subscriber count across all tracked channels. The percentage change compares the current period to the previous period of the same length."
                  />
                  <StatCard
                    title="Total Views"
                    value={summary.totalViews}
                    change={summary.viewsChange}
                    icon={Eye}
                    tooltip="Total video views accumulated across all channels in the selected period. The percentage change compares to the previous equal-length period."
                  />
                  <StatCard
                    title="Videos Published"
                    value={summary.videosThisPeriod}
                    icon={Film}
                    tooltip="Number of new videos published across all channels within the selected date range."
                  />
                  <StatCard
                    title="Avg Engagement"
                    value={`${summary.avgEngagement}%`}
                    format={false}
                    icon={Activity}
                    tooltip="Average engagement rate across all channels, calculated as (Likes + Comments) ÷ Views × 100. A higher rate indicates a more interactive audience."
                  />
                </div>
              )}
            </DashboardWidget>
          </GridItem>

          {/* ②  Views per Subscriber by Category */}
          <GridItem key="viewstrend">
            <DashboardWidget id="viewstrend" title="Views per Subscriber by Category" className="h-full">
              <ViewsByCategoryChart
                data={categories}
                tooltip="Views per Subscriber = total views ÷ total subscribers for each category. A higher ratio means the category's audience is highly engaged relative to its size — they watch more content per subscriber. The dashed line shows the overall average across all categories. Bars above the line are outperforming; bars below are underperforming."
                fullHeight
              />
            </DashboardWidget>
          </GridItem>

          {/* ②  Daily Subscriber Change — paired with views trend */}
          <GridItem key="subgrowth">
            <DashboardWidget id="subgrowth" title="Daily Subscriber Change" className="h-full">
              <GrowthChart
                data={growthData}
                dataKey="subscribersDelta"
                title="Daily Subscriber Change"
                color="#3b82f6"
                unit="subscribers"
                tooltip="Net subscribers gained or lost each day across all channels. Positive bars (green) mean net growth; negative bars (red) mean net loss. Helps identify which days had the biggest subscriber impact."
                fullHeight
              />
            </DashboardWidget>
          </GridItem>

          {/* ③  Publishing Frequency — "how active are we" */}
          <GridItem key="publishing">
            <DashboardWidget id="publishing" title="Publishing Frequency" className="h-full">
              <PublishingChart
                data={publishing}
                tooltip="Number of videos published per day across all tracked channels in the selected period. Helps identify upload cadence patterns and high-activity days."
                fullHeight
              />
            </DashboardWidget>
          </GridItem>

          {/* ③  Daily Views Change — paired with publishing activity */}
          <GridItem key="viewgrowth">
            <DashboardWidget id="viewgrowth" title="Daily Views Change" className="h-full">
              <GrowthChart
                data={growthData}
                dataKey="viewsDelta"
                title="Daily Views Change"
                color="#8b5cf6"
                unit="views"
                tooltip="Net change in total views compared to the previous day across all channels. Positive values indicate more views than the prior day; negative values indicate fewer. The overlay line shows the rolling trend."
                fullHeight
              />
            </DashboardWidget>
          </GridItem>

          {/* ④  Views by Category — audience distribution, full width */}
          <GridItem key="viewscat">
            <DashboardWidget id="viewscat" title="Views by Category" className="h-full">
              <ViewsPerChannelChart
                data={categories}
                tooltip="Total views broken down by channel category. Shows which content categories are driving the most audience consumption in the selected period."
                fullHeight
              />
            </DashboardWidget>
          </GridItem>

          {/* ⑤  Top Channels — who is growing fastest, full width */}
          <GridItem key="topchannels">
            <DashboardWidget id="topchannels" title="Top Channels" className="h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                <TopChannelsChart
                  data={topChannelsBySubs}
                  dataKey="subsGrowth"
                  title="Top 10 by Subscriber Growth"
                  color="#22c55e"
                  tooltip="The 10 channels with the highest net subscriber gain in the selected period. Subscriber growth = current subscribers minus subscribers at the start of the period."
                  fullHeight
                />
                <TopChannelsChart
                  data={topChannelsByViews}
                  dataKey="viewsGrowth"
                  title="Top 10 by View Growth"
                  color="#f59e0b"
                  tooltip="The 10 channels with the highest increase in total views during the selected period. View growth = views at end of period minus views at start of period."
                  fullHeight
                />
              </div>
            </DashboardWidget>
          </GridItem>

          {/* ⑥  Portfolio Metrics — advanced derived KPIs */}
          <GridItem key="metrics">
            <DashboardWidget id="metrics" title="Portfolio Metrics">
              {channelMetrics.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-full content-start">
                  <StatCard
                    title="Avg Eng. Efficiency"
                    value={avgEngEff != null ? `${(avgEngEff * 100).toFixed(2)}%` : '—'}
                    format={false}
                    icon={Heart}
                    tooltip="Engagement Efficiency = (Likes + Comments) ÷ Views. Measures how actively viewers interact with content relative to the number of impressions. Portfolio average across all channels."
                  />
                  <StatCard
                    title="Avg Sub Velocity (7d)"
                    value={avgVelocity != null ? `${avgVelocity >= 0 ? '+' : ''}${avgVelocity.toFixed(2)}%` : '—'}
                    format={false}
                    icon={Zap}
                    tooltip="Subscriber Velocity = % change in subscribers over the last 7 days. A positive value means the channel is growing; a negative value indicates subscriber loss. Portfolio average across all channels."
                  />
                  <StatCard
                    title="Avg Content Impact"
                    value={avgImpact != null ? avgImpact : '—'}
                    icon={BarChart3}
                    tooltip="Content Impact = Total Lifetime Views ÷ Total Videos Published. Represents the average views generated per uploaded video. Higher values indicate stronger individual video performance. Portfolio average across all channels."
                  />
                  <StatCard
                    title="Avg Loyalty Index"
                    value={avgLoyalty != null ? `${(avgLoyalty * 100).toFixed(3)}%` : '—'}
                    format={false}
                    icon={MessageCircle}
                    tooltip="Loyalty Index = Comments ÷ Views. A proxy for community depth — viewers who comment are more invested than those who merely watch. Portfolio average across all channels."
                  />
                </div>
              )}
            </DashboardWidget>
          </GridItem>

          {/* ⑦  Channel Metrics Table — deep per-channel comparison */}
          <GridItem key="channelmetrics">
            <DashboardWidget id="channelmetrics" title="Channel Metrics Comparison" className="h-full">
              {channelMetrics.length > 0 && (
                <ChannelMetricsTable
                  data={channelMetrics}
                  tooltip="Side-by-side comparison of advanced performance metrics for every tracked channel. Colour coding shows each channel's percentile rank — green = top 20%, red = bottom 20%. Click any column header to sort."
                />
              )}
            </DashboardWidget>
          </GridItem>

          {/* ⑧  Top Videos — content detail, last (most granular) */}
          <GridItem key="topvideos">
            <DashboardWidget id="topvideos" title="Top Videos This Period" className="h-full">
              <TopVideosTable
                videos={topVideos}
                tooltip="The highest-performing videos published in the selected period, ranked by views by default. Outlier Score = video views ÷ average views of all top videos in the list — scores above 1.5× indicate breakout performance."
              />
            </DashboardWidget>
          </GridItem>

        </DashboardGrid>
      </div>
    </div>
  );
}
