import { useState, useEffect } from 'react';
import { Users, Eye, Film, TrendingUp, Activity } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import StatCard from '../components/common/StatCard.jsx';
import FilterBar from '../components/common/FilterBar.jsx';
import GrowthChart from '../components/dashboard/GrowthChart.jsx';
import TopChannelsChart from '../components/dashboard/TopChannelsChart.jsx';
import CategoryDonut from '../components/dashboard/CategoryDonut.jsx';
import PublishingChart from '../components/dashboard/PublishingChart.jsx';
import TopVideosTable from '../components/dashboard/TopVideosTable.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';

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
        const [sumRes, growthRes, topSubsRes, topViewsRes, videosRes, catRes, pubRes] =
          await Promise.all([
            api.get('/dashboard/summary', { params }),
            api.get('/dashboard/growth', { params }),
            api.get('/dashboard/top-channels', { params: { ...params, metric: 'subscribers' } }),
            api.get('/dashboard/top-channels', { params: { ...params, metric: 'views' } }),
            api.get('/dashboard/top-videos', { params }),
            api.get('/dashboard/categories', { params }),
            api.get('/dashboard/publishing', { params }),
          ]);

        setSummary(sumRes.data);
        setGrowthData(growthRes.data);
        setTopChannelsBySubs(topSubsRes.data);
        setTopChannelsByViews(topViewsRes.data);
        setTopVideos(videosRes.data);
        setCategories(catRes.data);
        setPublishing(pubRes.data);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  if (loading && !summary) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <TopBar title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Filters */}
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          showPeriod={true}
          showDateRange={true}
        />

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Total Channels"
              value={summary.totalChannels}
              icon={Users}
            />
            <StatCard
              title="Total Subscribers"
              value={summary.totalSubscribers}
              change={summary.subsChange}
              icon={TrendingUp}
            />
            <StatCard
              title="Total Views"
              value={summary.totalViews}
              change={summary.viewsChange}
              icon={Eye}
            />
            <StatCard
              title="Videos Published"
              value={summary.videosThisPeriod}
              icon={Film}
            />
            <StatCard
              title="Avg Engagement"
              value={`${summary.avgEngagement}%`}
              format={false}
              icon={Activity}
            />
          </div>
        )}

        {/* Growth Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GrowthChart
            data={growthData}
            dataKey="subscribers"
            title="Subscriber Growth Over Time"
            color="#3b82f6"
          />
          <GrowthChart
            data={growthData}
            dataKey="views"
            title="Views Growth Over Time"
            color="#8b5cf6"
          />
        </div>

        {/* Top Channels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopChannelsChart
            data={topChannelsBySubs}
            dataKey="subsGrowth"
            title="Top 10 by Subscriber Growth"
            color="#22c55e"
          />
          <TopChannelsChart
            data={topChannelsByViews}
            dataKey="viewsGrowth"
            title="Top 10 by View Growth"
            color="#f59e0b"
          />
        </div>

        {/* Top Videos Table */}
        <TopVideosTable videos={topVideos} />

        {/* Publishing & Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PublishingChart data={publishing} />
          <CategoryDonut data={categories} />
        </div>
      </div>
    </div>
  );
}
