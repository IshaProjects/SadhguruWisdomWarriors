import { formatNumber, formatRelativeDate, engagementRate } from '../../utils/formatters.js';

export default function TopVideosTable({ videos }) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-medium text-dark-300 mb-4">
        Top Videos This Period
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="text-left py-2 px-2 text-dark-400 font-medium">Video</th>
              <th className="text-left py-2 px-2 text-dark-400 font-medium">Channel</th>
              <th className="text-right py-2 px-2 text-dark-400 font-medium">Views</th>
              <th className="text-right py-2 px-2 text-dark-400 font-medium">Likes</th>
              <th className="text-right py-2 px-2 text-dark-400 font-medium">Eng. Rate</th>
              <th className="text-right py-2 px-2 text-dark-400 font-medium">Published</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr
                key={video._id}
                className="border-b border-dark-800 hover:bg-dark-800/50 transition-colors"
              >
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      className="w-16 h-9 rounded object-cover bg-dark-700 shrink-0"
                    />
                    <span className="font-medium truncate max-w-[200px]">
                      {video.title}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-2 text-dark-300">
                  {video.channelId?.title || '—'}
                </td>
                <td className="py-2.5 px-2 text-right font-medium">
                  {formatNumber(video.views)}
                </td>
                <td className="py-2.5 px-2 text-right text-dark-300">
                  {formatNumber(video.likes)}
                </td>
                <td className="py-2.5 px-2 text-right text-dark-300">
                  {engagementRate(video.views, video.likes, video.comments).toFixed(2)}%
                </td>
                <td className="py-2.5 px-2 text-right text-dark-400">
                  {formatRelativeDate(video.publishedAt)}
                </td>
              </tr>
            ))}
            {videos.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-dark-400">
                  No videos found for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
