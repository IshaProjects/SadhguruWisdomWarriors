import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatNumber } from '../../utils/formatters.js';
import InfoTooltip from '../common/InfoTooltip.jsx';
import clsx from 'clsx';

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e',
  '#06b6d4', '#f97316', '#ef4444', '#6366f1', '#14b8a6',
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-dark-300">
        <span className="text-purple-400 font-semibold">{formatNumber(d.totalViews)}</span> views
      </p>
      <p className="text-xs text-dark-400">
        {d.count} channel{d.count !== 1 ? 's' : ''}
      </p>
    </div>
  );
};

export default function ViewsPerChannelChart({ data, tooltip, fullHeight }) {
  return (
    <div className={clsx('glass-card p-5', fullHeight && 'h-full flex flex-col')}>
      <div className="flex items-center gap-1.5 mb-4 shrink-0">
        <h3 className="text-sm font-medium text-dark-300">Views by Category</h3>
        {tooltip && <InfoTooltip text={tooltip} side="top" />}
      </div>
      <ResponsiveContainer width="100%" height={fullHeight ? '100%' : 280}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={formatNumber}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis
            type="category"
            dataKey="category"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={{ stroke: '#334155' }}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="totalViews" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
