import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import { formatNumber } from '../../utils/formatters.js';

const COLORS = [
  '#fbbf24', '#60a5fa', '#4ade80', '#f87171', '#a78bfa',
  '#f472b6', '#2dd4bf', '#fb923c', '#a3e635', '#22d3ee',
];

const TRUNC_LEN = 28;

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
      <p className="text-sm font-medium">{d.title}</p>
      <p className="text-xs text-dark-400 mt-1">
        Views: {formatNumber(payload[0].value)}
      </p>
    </div>
  );
};

export default function GradeBarChart({ data }) {
  const chartData = data.map((d) => ({
    ...d,
    shortTitle:
      d.title?.length > TRUNC_LEN ? d.title.slice(0, TRUNC_LEN - 1) + '…' : d.title,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 64, left: 4, bottom: 4 }}
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
          dataKey="shortTitle"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          width={210}
          axisLine={{ stroke: '#334155' }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b88' }} />
        <Bar
          dataKey="viewsGrowth"
          radius={[0, 4, 4, 0]}
          barSize={18}
          isAnimationActive
          animationDuration={900}
          animationEasing="ease-out"
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
          <LabelList
            dataKey="viewsGrowth"
            position="right"
            formatter={formatNumber}
            style={{ fill: '#cbd5e1', fontSize: 13, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
