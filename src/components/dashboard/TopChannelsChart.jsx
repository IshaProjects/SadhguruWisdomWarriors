import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatNumber } from '../../utils/formatters.js';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
      <p className="text-sm font-medium">{data.title}</p>
      <p className="text-xs text-dark-400 mt-1">
        Growth: {formatNumber(payload[0].value)}
      </p>
    </div>
  );
};

export default function TopChannelsChart({ data, dataKey, title, color = '#3b82f6' }) {
  const chartData = data.map((d) => ({
    ...d,
    shortTitle: d.title?.length > 20 ? d.title.slice(0, 18) + '...' : d.title,
  }));

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-medium text-dark-300 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
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
            width={130}
            axisLine={{ stroke: '#334155' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
