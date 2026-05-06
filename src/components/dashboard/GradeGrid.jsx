import { formatNumber } from '../../utils/formatters.js';
import GradeBarChart from './GradeBarChart.jsx';

const BUCKETS = ['A', 'B', 'C', 'D', 'E', 'Inactive'];

const colTitle = (b) => (b === 'Inactive' ? 'Inactive' : `Grade ${b}`);

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-dark-400 font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-bold mt-0.5 animate-count-up">
        {formatNumber(value ?? 0)}
      </p>
    </div>
  );
}

function BucketSection({ bucket, count, totalViews, topEntries, showRange }) {
  return (
    <div className="glass-card p-5 flex flex-col">
      <h3 className="text-base font-semibold text-dark-200 mb-4">
        {colTitle(bucket)}
      </h3>

      <div
        className={`grid ${
          showRange ? 'grid-cols-2' : 'grid-cols-1'
        } gap-4 mb-4`}
      >
        <Stat label="No. of Wisdom Warriors" value={count} />
        {showRange && <Stat label="Total Views" value={totalViews} />}
      </div>

      {showRange && (
        <div className="flex-1 min-h-0">
          <p className="text-xs text-dark-400 font-medium uppercase tracking-wide mb-2">
            Top 10 by views
          </p>
          {topEntries && topEntries.length > 0 ? (
            <div className="h-80">
              <GradeBarChart data={topEntries} />
            </div>
          ) : (
            <p className="text-sm text-dark-400 mt-4">
              No channels in this bucket
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function GradeGrid({ data }) {
  if (!data) return null;
  const { row1, row2, row3 } = data;
  const showRange = row2 != null && row3 != null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {BUCKETS.map((b) => (
        <BucketSection
          key={b}
          bucket={b}
          count={row1?.[b]}
          totalViews={row3?.[b]}
          topEntries={row2?.[b]}
          showRange={showRange}
        />
      ))}
    </div>
  );
}
