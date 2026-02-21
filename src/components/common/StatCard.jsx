import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatNumber, formatPercentChange } from '../../utils/formatters.js';
import InfoTooltip from './InfoTooltip.jsx';
import clsx from 'clsx';

export default function StatCard({ title, value, change, icon: Icon, format = true, tooltip }) {
  const displayValue = format ? formatNumber(value) : value;
  const changeInfo = formatPercentChange(change);

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-dark-400 font-medium">{title}</p>
            {tooltip && <InfoTooltip text={tooltip} side="top" />}
          </div>
          <p className="text-2xl font-bold mt-1 animate-count-up">{displayValue}</p>
        </div>
        {Icon && (
          <div className="p-2.5 rounded-lg bg-accent-500/10 shrink-0 ml-3">
            <Icon className="w-5 h-5 text-accent-400" />
          </div>
        )}
      </div>
      {change != null && (
        <div className="flex items-center gap-1 mt-3">
          {changeInfo.positive ? (
            <TrendingUp className="w-4 h-4 text-success" />
          ) : (
            <TrendingDown className="w-4 h-4 text-danger" />
          )}
          <span
            className={clsx(
              'text-sm font-medium',
              changeInfo.positive ? 'text-success' : 'text-danger'
            )}
          >
            {changeInfo.text}
          </span>
          <span className="text-xs text-dark-400 ml-1">vs last period</span>
        </div>
      )}
    </div>
  );
}
