import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { formatNumber } from '../../utils/formatters.js';
import InfoTooltip from '../common/InfoTooltip.jsx';
import clsx from 'clsx';

const COLORS = [
  '#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899',
  '#06b6d4', '#f97316', '#ef4444', '#6366f1', '#14b8a6',
];

/** Format a views-per-subscriber ratio nicely: e.g. 2.34, 0.78 */
const fmtRatio = (v) => {
  if (v == null || isNaN(v)) return '—';
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toFixed(2);
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl space-y-1.5 min-w-[180px]">
      <p className="text-sm font-semibold text-dark-100">{label}</p>
      <div className="border-t border-dark-700 pt-1.5 space-y-1">
        <p className="text-xs flex justify-between gap-4">
          <span className="text-dark-400">Views / Subscriber</span>
          <span className="font-semibold" style={{ color: payload[0].fill }}>
            {fmtRatio(d.viewsPerSub)}×
          </span>
        </p>
        <p className="text-xs flex justify-between gap-4">
          <span className="text-dark-400">Total Views</span>
          <span className="text-dark-200">{formatNumber(d.totalViews)}</span>
        </p>
        <p className="text-xs flex justify-between gap-4">
          <span className="text-dark-400">Total Subscribers</span>
          <span className="text-dark-200">{formatNumber(d.totalSubs)}</span>
        </p>
        <p className="text-xs flex justify-between gap-4">
          <span className="text-dark-400">Channels</span>
          <span className="text-dark-200">{d.count}</span>
        </p>
      </div>
      <p className="text-[10px] text-dark-500 pt-0.5">
        Avg views per subscriber across {d.count} channel{d.count !== 1 ? 's' : ''} in this category
      </p>
    </div>
  );
};

export default function ViewsByCategoryChart({ data = [], tooltip, fullHeight }) {
  // Compute views-per-subscriber for each category, filter out 0-sub categories
  const chartData = data
    .map((d) => ({
      ...d,
      viewsPerSub: d.totalSubs > 0 ? d.totalViews / d.totalSubs : null,
    }))
    .filter((d) => d.viewsPerSub !== null)
    .sort((a, b) => b.viewsPerSub - a.viewsPerSub);

  // Overall average across all categories (for reference line)
  const overallAvg =
    chartData.length > 0
      ? chartData.reduce((s, d) => s + d.viewsPerSub, 0) / chartData.length
      : null;

  return (
    <div className={clsx('glass-card p-5', fullHeight && 'h-full flex flex-col')}>
      <div className="flex items-center gap-1.5 mb-1 shrink-0">
        <h3 className="text-sm font-medium text-dark-300">Views per Subscriber by Category</h3>
        {tooltip && <InfoTooltip text={tooltip} side="top" />}
      </div>
      <p className="text-xs text-dark-500 mb-4 shrink-0">
        Avg category views ÷ subscribers — higher = more efficient audience reach
      </p>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-dark-500 text-sm">
          No category data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={fullHeight ? '100%' : 280}>
          <BarChart
            data={chartData}
            margin={{ top: 16, right: 24, left: 8, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={64}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(v) => `${fmtRatio(v)}×`}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />

            {/* Average reference line */}
            {overallAvg != null && (
              <ReferenceLine
                y={overallAvg}
                stroke="#f59e0b"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{
                  value: `Avg ${fmtRatio(overallAvg)}×`,
                  position: 'insideTopRight',
                  fontSize: 10,
                  fill: '#f59e0b',
                  dy: -4,
                }}
              />
            )}

            <Bar dataKey="viewsPerSub" radius={[4, 4, 0, 0]} maxBarSize={52}>
              {chartData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={COLORS[idx % COLORS.length]}
                  fillOpacity={entry.viewsPerSub >= (overallAvg ?? 0) ? 0.9 : 0.55}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
