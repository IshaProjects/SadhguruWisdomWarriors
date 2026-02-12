import { useState, useEffect } from 'react';
import { RefreshCw, Database, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { formatDate } from '../utils/formatters.js';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const statusIcons = {
  success: <CheckCircle className="w-4 h-4 text-success" />,
  partial: <AlertTriangle className="w-4 h-4 text-warning" />,
  failed: <XCircle className="w-4 h-4 text-danger" />,
  running: <RefreshCw className="w-4 h-4 text-accent-400 animate-spin" />,
};

export default function SyncPage() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async (page = 1) => {
    try {
      const [statusRes, logsRes] = await Promise.all([
        api.get('/sync/status'),
        api.get('/sync/logs', { params: { page, limit: 15 } }),
      ]);
      setStatus(statusRes.data);
      setLogs(logsRes.data.logs);
      setPagination(logsRes.data.pagination);
    } catch {
      toast.error('Failed to load sync data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(pagination.page), 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  const quotaPercent = status?.quota
    ? (status.quota.used / status.quota.limit) * 100
    : 0;

  return (
    <div>
      <TopBar title="Sync Status" />
      <div className="p-6 space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-accent-500/10">
                <Database className="w-5 h-5 text-accent-400" />
              </div>
              <div>
                <p className="text-sm text-dark-400">Sync Status</p>
                <p className="text-lg font-semibold">
                  {status?.isSyncing ? (
                    <span className="text-accent-400">Running...</span>
                  ) : (
                    <span className="text-success">Idle</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-accent-500/10">
                <Clock className="w-5 h-5 text-accent-400" />
              </div>
              <div>
                <p className="text-sm text-dark-400">API Quota Usage</p>
                <p className="text-lg font-semibold">
                  {status?.quota?.used || 0} / {status?.quota?.limit || 10000}
                </p>
              </div>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2">
              <div
                className={clsx(
                  'h-2 rounded-full transition-all',
                  quotaPercent > 80 ? 'bg-danger' : quotaPercent > 50 ? 'bg-warning' : 'bg-success'
                )}
                style={{ width: `${Math.min(quotaPercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-dark-400 mt-1">
              {status?.quota?.remaining || 0} remaining today
            </p>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-accent-500/10">
                <RefreshCw className="w-5 h-5 text-accent-400" />
              </div>
              <div>
                <p className="text-sm text-dark-400">Total Syncs</p>
                <p className="text-lg font-semibold">{pagination.total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sync Logs */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-700">
            <h3 className="font-medium">Sync History</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-5 text-dark-400 font-medium">Status</th>
                <th className="text-left py-3 px-3 text-dark-400 font-medium">Type</th>
                <th className="text-right py-3 px-3 text-dark-400 font-medium">Channels</th>
                <th className="text-right py-3 px-3 text-dark-400 font-medium">Videos</th>
                <th className="text-right py-3 px-3 text-dark-400 font-medium">Quota Used</th>
                <th className="text-right py-3 px-3 text-dark-400 font-medium">Errors</th>
                <th className="text-right py-3 px-5 text-dark-400 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-b border-dark-800 hover:bg-dark-800/50">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      {statusIcons[log.status]}
                      <span className="capitalize">{log.status}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 capitalize text-dark-300">{log.type}</td>
                  <td className="py-3 px-3 text-right">{log.channelsProcessed}</td>
                  <td className="py-3 px-3 text-right">{log.videosProcessed || 0}</td>
                  <td className="py-3 px-3 text-right">{log.quotaUsed}</td>
                  <td className="py-3 px-3 text-right">
                    {log.errors?.length > 0 ? (
                      <span className="text-danger">{log.errors.length}</span>
                    ) : (
                      <span className="text-dark-400">0</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-right text-dark-400">
                    {formatDate(log.startedAt)}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-dark-400">
                    No sync logs yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          onPageChange={(p) => fetchData(p)}
        />
      </div>
    </div>
  );
}
