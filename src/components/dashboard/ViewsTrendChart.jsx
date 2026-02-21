import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatNumber } from '../../utils/formatters.js';
import InfoTooltip from '../common/InfoTooltip.jsx';
import clsx from 'clsx';

const COLOR_POS = '#8b5cf6';
const COLOR_NEG = '#f87171';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  const isPositive = value >= 0;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-dark-400 mb-1">{label}</p>
      <p
        className="text-sm font-semibold"
        style={{ color: isPositive ? COLOR_POS : COLOR_NEG }}
      >
        {isPositive ? '+' : ''}{formatNumber(value)} views
      </p>
    </div>
  );
};

export default function ViewsTrendChart({ data, dataKey = 'viewsDelta', tooltip, fullHeight }) {
  const hasNegative = data.some((d) => (d[dataKey] ?? 0) < 0);

  return (
    <div className={clsx('glass-card p-5', fullHeight && 'h-full flex flex-col')}>
      <div className="flex items-center gap-1.5 mb-4 shrink-0">
        <h3 className="text-sm font-medium text-dark-300">Views Trend</h3>
        {tooltip && <InfoTooltip text={tooltip} side="top" />}
      </div>
      <ResponsiveContainer width="100%" height={fullHeight ? '100%' : 280}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(d) => d.slice(5)}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(v) => (v >= 0 ? `+${formatNumber(v)}` : formatNumber(v))}
            axisLine={{ stroke: '#334155' }}
            width={65}
          />
          <Tooltip content={<CustomTooltip />} />
          {hasNegative && (
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 2" />
          )}
          <Bar dataKey={dataKey} radius={[3, 3, 0, 0]} barSize={14}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={(entry[dataKey] ?? 0) >= 0 ? COLOR_POS : COLOR_NEG}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={COLOR_POS}
            strokeWidth={2}
            dot={false}
            activeDot={false}
            strokeOpacity={0.5}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
