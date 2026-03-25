import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Video,
  BarChart2,
  Settings,
  Save,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { formatDate, formatNumber } from '../utils/formatters.js';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useRbac } from '../context/RbacContext.jsx';

// ── helpers ─────────────────────────────────────────────────────────────────

const STATUS_ICON = {
  success: <CheckCircle className="w-4 h-4 text-green-400" />,
  partial: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  failed:  <XCircle      className="w-4 h-4 text-red-400"    />,
  running: <RefreshCw    className="w-4 h-4 text-accent-400 animate-spin" />,
};

const STATUS_BADGE = {
  success: 'bg-green-500/10 text-green-400',
  partial: 'bg-yellow-500/10 text-yellow-400',
  failed:  'bg-red-500/10 text-red-400',
  running: 'bg-accent-500/10 text-accent-400',
};

function duration(log) {
  if (!log.completedAt) return '—';
  const ms = new Date(log.completedAt) - new Date(log.startedAt);
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

// ── sub-components ──────────────────────────────────────────────────────────

function SyncLogTable({
  syncType,
  label,
  icon: Icon,
  triggerEndpoint,
  canTrigger,
  showTrigger = true,
}) {
  const [logs, setLogs]             = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]       = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      const res = await api.get('/sync/logs', { params: { syncType, page, limit: 10 } });
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [syncType]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await api.post(triggerEndpoint);
      toast.success(`${label} sync started`);
      setTimeout(() => fetchLogs(1), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || `${label} sync failed to start`);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent-400" />
          <h3 className="font-semibold text-sm">{label} Sync History</h3>
          <span className="text-xs text-dark-400 ml-1">({pagination.total} runs)</span>
        </div>
        {showTrigger && canTrigger && (
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="btn-primary text-xs flex items-center gap-1.5 py-1.5"
          >
            <Play className={clsx('w-3.5 h-3.5', triggering && 'animate-pulse')} />
            {triggering ? 'Starting…' : `Run ${label}`}
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner size="sm" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-2 px-2 text-dark-400 font-medium">Status</th>
                  <th className="text-left py-2 px-2 text-dark-400 font-medium">Trigger</th>
                  {syncType === 'channel' ? (
                    <th className="text-right py-2 px-2 text-dark-400 font-medium">Channels</th>
                  ) : (
                    <th className="text-right py-2 px-2 text-dark-400 font-medium">
                      Videos
                    </th>
                  )}
                  <th className="text-right py-2 px-2 text-dark-400 font-medium">Quota</th>
                  <th className="text-right py-2 px-2 text-dark-400 font-medium">Errors</th>
                  <th className="text-right py-2 px-2 text-dark-400 font-medium">Duration</th>
                  <th className="text-right py-2 px-2 text-dark-400 font-medium">Started</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-b border-dark-800 hover:bg-dark-800/50">
                    <td className="py-2.5 px-2">
                      <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full', STATUS_BADGE[log.status])}>
                        {STATUS_ICON[log.status]}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={clsx(
                        'text-xs px-1.5 py-0.5 rounded',
                        log.type === 'auto' ? 'bg-dark-700 text-dark-300' : 'bg-accent-500/20 text-accent-300'
                      )}>
                        {log.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {syncType === 'channel'
                        ? formatNumber(log.channelsProcessed)
                        : formatNumber(log.videosProcessed)}
                    </td>
                    <td className="py-2.5 px-2 text-right text-dark-300">{formatNumber(log.quotaUsed)}</td>
                    <td className="py-2.5 px-2 text-right">
                      {log.errors?.length > 0 ? (
                        <span className="text-red-400 font-medium">{log.errors.length}</span>
                      ) : (
                        <span className="text-dark-500">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right text-dark-400 tabular-nums">{duration(log)}</td>
                    <td className="py-2.5 px-2 text-right text-dark-400 tabular-nums whitespace-nowrap">
                      {formatDate(log.startedAt)}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-dark-400">
                      No {label.toLowerCase()} sync runs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {pagination.pages > 1 && (
            <Pagination
              page={pagination.page}
              pages={pagination.pages}
              total={pagination.total}
              onPageChange={(p) => fetchLogs(p)}
            />
          )}
        </>
      )}
    </div>
  );
}

function BatchJobCard({
  icon: Icon,
  title,
  description,
  scheduleExpr,
  scheduleEnabled,
  isRunning,
  canTrigger,
  onRun,
}) {
  const [busy, setBusy] = useState(false);

  const handleRun = async () => {
    setBusy(true);
    try {
      await onRun();
    } finally {
      setBusy(false);
    }
  };

  const scheduleLabel =
    scheduleExpr != null ? describeCron(scheduleExpr) : null;

  return (
    <div className="rounded-xl border border-dark-700/80 bg-dark-800/30 p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="flex gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-dark-700/60">
          <Icon className="w-5 h-5 text-accent-400" />
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold text-sm text-dark-100">{title}</h4>
          <p className="text-xs text-dark-400 mt-1 leading-relaxed">{description}</p>
          {scheduleExpr != null && (
            <p className="text-xs mt-2 text-dark-500">
              <span className="text-dark-500">Schedule: </span>
              <span className="text-dark-300">{scheduleLabel}</span>
              <span className="font-mono text-dark-400 ml-1">({scheduleExpr})</span>
              {scheduleEnabled === false && (
                <span className="ml-2 text-amber-400/90 font-medium">Off</span>
              )}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 sm:min-w-[7.5rem]">
        <span
          className={clsx(
            'text-xs font-medium px-2.5 py-1 rounded-full text-center self-end',
            isRunning ? 'bg-accent-500/20 text-accent-300' : 'bg-dark-700 text-dark-300'
          )}
        >
          {isRunning ? 'Running…' : 'Idle'}
        </span>
        {canTrigger && (
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning || busy}
            className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2 px-3 disabled:opacity-50"
          >
            <Play className={clsx('w-3.5 h-3.5', (busy || isRunning) && 'animate-pulse')} />
            {busy ? 'Starting…' : 'Run now'}
          </button>
        )}
      </div>
    </div>
  );
}

// Cron schedule field with a helpful preset selector
// Grouped presets — value '' marks a group header (disabled), 'custom' opens the input
const PRESET_GROUPS = [
  {
    group: 'Hourly',
    options: [
      { label: 'Every hour',     value: '0 * * * *'    },
      { label: 'Every 6 hours',  value: '0 */6 * * *'  },
      { label: 'Every 12 hours', value: '0 */12 * * *' },
    ],
  },
  {
    group: 'Daily',
    options: [
      { label: 'Daily — midnight', value: '0 0 * * *' },
      { label: 'Daily — 3 AM',     value: '0 3 * * *' },
      { label: 'Daily — 4 AM',     value: '0 4 * * *' },
      { label: 'Daily — 6 AM',     value: '0 6 * * *' },
      { label: 'Daily — noon',     value: '0 12 * * *' },
    ],
  },
  {
    group: 'Weekly',
    options: [
      { label: 'Weekly — Sunday midnight',  value: '0 0 * * 0' },
      { label: 'Weekly — Monday 3 AM',      value: '0 3 * * 1' },
      { label: 'Weekly — Saturday midnight',value: '0 0 * * 6' },
    ],
  },
  {
    group: 'Monthly',
    options: [
      { label: 'Monthly — 1st at midnight', value: '0 0 1 * *'  },
      { label: 'Monthly — 1st at 3 AM',     value: '0 3 1 * *'  },
      { label: 'Monthly — 15th at midnight',value: '0 0 15 * *' },
    ],
  },
  {
    group: 'Custom',
    options: [
      { label: 'Enter custom expression…', value: '__custom__' },
    ],
  },
];

// Map known cron expressions to a human-readable label
const CRON_LABELS = Object.fromEntries(
  PRESET_GROUPS.flatMap((g) =>
    g.options
      .filter((o) => o.value !== '__custom__')
      .map((o) => [o.value, o.label])
  )
);

function describeCron(expr) {
  return CRON_LABELS[expr] || `Custom: ${expr}`;
}

function ScheduleField({ label, value, onChange }) {
  // Start in customMode if the initial value isn't a known preset
  const [customMode, setCustomMode] = useState(() => !!value && !CRON_LABELS[value]);

  const handleSelect = (selected) => {
    if (selected === '__custom__') {
      setCustomMode(true);
    } else {
      setCustomMode(false);
      onChange(selected);   // propagate the chosen cron string up
    }
  };

  // Typing directly in the input → switch to custom mode automatically
  const handleTextChange = (e) => {
    setCustomMode(true);
    onChange(e.target.value);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs text-dark-400 font-medium">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={handleTextChange}
          placeholder="e.g. 0 3 * * *"
          className="input-field text-sm flex-1 font-mono"
        />
        {/* Controlled — shows the matching preset when value is a known expression */}
        <select
          value={customMode ? '__custom__' : (CRON_LABELS[value] ? value : '')}
          onChange={(e) => { if (e.target.value) handleSelect(e.target.value); }}
          className="input-field text-xs w-44"
        >
          <option value="" disabled>— Presets —</option>
          {PRESET_GROUPS.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      {/* Human-readable description of the current value */}
      <p className="text-xs text-dark-500">
        {customMode
          ? <span className="font-mono text-dark-400">{value || '—'}</span>
          : <span>{describeCron(value)}</span>
        }
      </p>
    </div>
  );
}

const DEFAULT_SYNC_CONFIG = {
  channelSyncSchedule: '0 3 * * *',
  videoSyncSchedule: '0 4 * * *',
  ihiIngestSchedule: '0 */6 * * *',
  ihiSadhguruStatsSchedule: '0 5 * * *',
  channelSyncEnabled: true,
  videoSyncEnabled: true,
  ihiIngestEnabled: true,
  ihiSadhguruStatsEnabled: true,
};

// ── main page ────────────────────────────────────────────────────────────────

export default function SyncPage() {
  const { canPerformAction } = useRbac();

  const canTriggerChannel = canPerformAction('sync.triggerChannel');
  const canTriggerVideo   = canPerformAction('sync.triggerVideo');
  const canTriggerIhiIngest = canPerformAction('sync.triggerIhiIngest');
  const canTriggerIhiSadhguruStats = canPerformAction('sync.triggerIhiSadhguruStats');
  const canConfigure      = canPerformAction('sync.configure');

  const [status,  setStatus]  = useState(null);
  const [config,  setConfig]  = useState(null);
  const [draft,   setDraft]   = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/sync/status');
      setStatus(res.data);
      if (!config) {
        const merged = { ...DEFAULT_SYNC_CONFIG, ...res.data.config };
        setConfig(merged);
        setDraft(merged);
      }
    } catch {
      toast.error('Failed to load sync status');
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await api.put('/sync/config', draft);
      setConfig(res.data);
      setDraft(res.data);
      toast.success('Sync schedule saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const configDirty = JSON.stringify(draft) !== JSON.stringify(config);

  const runChannelSync = async () => {
    try {
      await api.post('/sync/channels/trigger');
      toast.success('Channel sync started');
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start channel sync');
    }
  };
  const runDedicatedVideoSync = async () => {
    try {
      await api.post('/sync/videos/trigger');
      toast.success('Dedicated video sync started');
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start dedicated video sync');
    }
  };
  const runIhiIngest = async () => {
    try {
      await api.post('/sync/ihi/ingest/trigger');
      toast.success('IHI ingest started');
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start IHI ingest');
    }
  };
  const runIhiSadhguruStats = async () => {
    try {
      await api.post('/sync/ihi/sadhguru-stats/trigger');
      toast.success('IHI Sadhguru stats sync started');
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start IHI Sadhguru stats');
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  const quotaPercent = status?.quota
    ? Math.min(100, (status.quota.used / status.quota.limit) * 100)
    : 0;

  return (
    <div>
      <TopBar title="Sync Status" />
      <div className="p-6 space-y-6">

        <p className="text-sm text-dark-400 max-w-3xl leading-relaxed">
          Four separate batch jobs run on their own schedules. Use <span className="text-dark-300">Run now</span> to
          trigger one manually. Dedicated video sync applies only to channels whose category starts with
          &quot;Dedicated&quot;. IHI jobs apply to channels whose category contains &quot;IHI&quot; (and not Dedicated).
        </p>

        {/* ── Manual batch jobs (status + triggers) ───────────────── */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-accent-400" />
            <h3 className="font-semibold text-sm">Batch jobs &amp; manual triggers</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <BatchJobCard
              icon={Database}
              title="Channel sync"
              description="Fetches channel metadata and stats from YouTube, updates channel records and daily channel snapshots."
              scheduleExpr={draft?.channelSyncSchedule}
              scheduleEnabled={draft?.channelSyncEnabled}
              isRunning={!!status?.isChannelSyncing}
              canTrigger={canTriggerChannel}
              onRun={runChannelSync}
            />
            <BatchJobCard
              icon={Video}
              title="Dedicated video sync"
              description="For Dedicated channels only: refreshes the 10 most recent uploads per channel (details + stats + snapshots)."
              scheduleExpr={draft?.videoSyncSchedule}
              scheduleEnabled={draft?.videoSyncEnabled}
              isRunning={!!status?.isVideoSyncing}
              canTrigger={canTriggerVideo}
              onRun={runDedicatedVideoSync}
            />
            <BatchJobCard
              icon={Sparkles}
              title="IHI ingest"
              description="For IHI channels: loads uploads from the last 24 hours, then classifies new videos with Vertex (title + description)."
              scheduleExpr={draft?.ihiIngestSchedule}
              scheduleEnabled={draft?.ihiIngestEnabled}
              isRunning={!!status?.isIhiIngestSyncing}
              canTrigger={canTriggerIhiIngest}
              onRun={runIhiIngest}
            />
            <BatchJobCard
              icon={BarChart2}
              title="IHI Sadhguru stats"
              description="For IHI channels only: updates view counts and daily snapshots for videos classified as Sadhguru (for reporting)."
              scheduleExpr={draft?.ihiSadhguruStatsSchedule}
              scheduleEnabled={draft?.ihiSadhguruStatsEnabled}
              isRunning={!!status?.isIhiSadhguruStatsSyncing}
              canTrigger={canTriggerIhiSadhguruStats}
              onRun={runIhiSadhguruStats}
            />
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-dark-400 flex items-center gap-1">
              <BarChart2 className="w-3.5 h-3.5" /> YouTube API Quota
            </p>
            <p className="text-xs font-medium">
              {formatNumber(status?.quota?.used ?? 0)} / {formatNumber(status?.quota?.limit ?? 10000)}
            </p>
          </div>
          <div className="h-2 rounded-full bg-dark-700 overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-500',
                quotaPercent < 70 ? 'bg-green-500'
                : quotaPercent < 90 ? 'bg-yellow-500'
                : 'bg-red-500'
              )}
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
          <p className="text-xs text-dark-500 mt-1 text-right">{quotaPercent.toFixed(1)}% used today</p>
        </div>

        {/* ── Schedule Config ───────────────────────────────────────── */}
        <div className="glass-card p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-accent-400" />
              <h3 className="font-semibold text-sm">Sync Schedule Configuration</h3>
            </div>
            {canConfigure && (
              <button
                onClick={handleSaveConfig}
                disabled={saving || !configDirty}
                className={clsx(
                  'btn-primary text-xs flex items-center gap-1.5 py-1.5',
                  (!configDirty || saving) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving…' : 'Save Schedule'}
              </button>
            )}
          </div>

          {draft && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Channel sync config */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-dark-400" />
                    <span className="text-sm font-medium">Channel Sync</span>
                  </div>
                  {canConfigure ? (
                    <button
                      onClick={() => setDraft((d) => ({ ...d, channelSyncEnabled: !d.channelSyncEnabled }))}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {draft.channelSyncEnabled
                        ? <ToggleRight className="w-5 h-5 text-green-400" />
                        : <ToggleLeft  className="w-5 h-5 text-dark-500"  />}
                      <span className={draft.channelSyncEnabled ? 'text-green-400' : 'text-dark-500'}>
                        {draft.channelSyncEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </button>
                  ) : (
                    <span className={clsx('text-xs', draft.channelSyncEnabled ? 'text-green-400' : 'text-dark-500')}>
                      {draft.channelSyncEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  )}
                </div>
                {canConfigure ? (
                  <ScheduleField
                    label="Cron expression"
                    value={draft.channelSyncSchedule}
                    onChange={(v) => setDraft((d) => ({ ...d, channelSyncSchedule: v }))}
                  />
                ) : (
                  <div>
                    <p className="text-xs text-dark-400 mb-1">Cron expression</p>
                    <p className="text-sm font-mono text-dark-300">{draft.channelSyncSchedule}</p>
                    <p className="text-xs text-dark-500 mt-0.5">{describeCron(draft.channelSyncSchedule)}</p>
                  </div>
                )}
              </div>

              {/* Video sync config */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-dark-400" />
                    <span className="text-sm font-medium">Dedicated Video</span>
                  </div>
                  {canConfigure ? (
                    <button
                      onClick={() => setDraft((d) => ({ ...d, videoSyncEnabled: !d.videoSyncEnabled }))}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {draft.videoSyncEnabled
                        ? <ToggleRight className="w-5 h-5 text-green-400" />
                        : <ToggleLeft  className="w-5 h-5 text-dark-500"  />}
                      <span className={draft.videoSyncEnabled ? 'text-green-400' : 'text-dark-500'}>
                        {draft.videoSyncEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </button>
                  ) : (
                    <span className={clsx('text-xs', draft.videoSyncEnabled ? 'text-green-400' : 'text-dark-500')}>
                      {draft.videoSyncEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  )}
                </div>
                {canConfigure ? (
                  <ScheduleField
                    label="Cron expression"
                    value={draft.videoSyncSchedule}
                    onChange={(v) => setDraft((d) => ({ ...d, videoSyncSchedule: v }))}
                  />
                ) : (
                  <div>
                    <p className="text-xs text-dark-400 mb-1">Cron expression</p>
                    <p className="text-sm font-mono text-dark-300">{draft.videoSyncSchedule}</p>
                    <p className="text-xs text-dark-500 mt-0.5">{describeCron(draft.videoSyncSchedule)}</p>
                  </div>
                )}
              </div>

              {/* IHI ingest */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-dark-400" />
                    <span className="text-sm font-medium">IHI Ingest</span>
                  </div>
                  {canConfigure ? (
                    <button
                      onClick={() => setDraft((d) => ({ ...d, ihiIngestEnabled: !d.ihiIngestEnabled }))}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {draft.ihiIngestEnabled
                        ? <ToggleRight className="w-5 h-5 text-green-400" />
                        : <ToggleLeft  className="w-5 h-5 text-dark-500"  />}
                      <span className={draft.ihiIngestEnabled ? 'text-green-400' : 'text-dark-500'}>
                        {draft.ihiIngestEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </button>
                  ) : (
                    <span className={clsx('text-xs', draft.ihiIngestEnabled ? 'text-green-400' : 'text-dark-500')}>
                      {draft.ihiIngestEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  )}
                </div>
                {canConfigure ? (
                  <ScheduleField
                    label="Cron (24h window + classify)"
                    value={draft.ihiIngestSchedule}
                    onChange={(v) => setDraft((d) => ({ ...d, ihiIngestSchedule: v }))}
                  />
                ) : (
                  <div>
                    <p className="text-xs text-dark-400 mb-1">Cron expression</p>
                    <p className="text-sm font-mono text-dark-300">{draft.ihiIngestSchedule}</p>
                    <p className="text-xs text-dark-500 mt-0.5">{describeCron(draft.ihiIngestSchedule)}</p>
                  </div>
                )}
              </div>

              {/* IHI Sadhguru stats */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-dark-400" />
                    <span className="text-sm font-medium">IHI Sadhguru Stats</span>
                  </div>
                  {canConfigure ? (
                    <button
                      onClick={() => setDraft((d) => ({ ...d, ihiSadhguruStatsEnabled: !d.ihiSadhguruStatsEnabled }))}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {draft.ihiSadhguruStatsEnabled
                        ? <ToggleRight className="w-5 h-5 text-green-400" />
                        : <ToggleLeft  className="w-5 h-5 text-dark-500"  />}
                      <span className={draft.ihiSadhguruStatsEnabled ? 'text-green-400' : 'text-dark-500'}>
                        {draft.ihiSadhguruStatsEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </button>
                  ) : (
                    <span className={clsx('text-xs', draft.ihiSadhguruStatsEnabled ? 'text-green-400' : 'text-dark-500')}>
                      {draft.ihiSadhguruStatsEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  )}
                </div>
                {canConfigure ? (
                  <ScheduleField
                    label="Cron (Sadhguru videos only)"
                    value={draft.ihiSadhguruStatsSchedule}
                    onChange={(v) => setDraft((d) => ({ ...d, ihiSadhguruStatsSchedule: v }))}
                  />
                ) : (
                  <div>
                    <p className="text-xs text-dark-400 mb-1">Cron expression</p>
                    <p className="text-sm font-mono text-dark-300">{draft.ihiSadhguruStatsSchedule}</p>
                    <p className="text-xs text-dark-500 mt-0.5">{describeCron(draft.ihiSadhguruStatsSchedule)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-dark-500">
            Cron format: <span className="font-mono">minute hour day-of-month month day-of-week</span>.
            Changes apply immediately (no server restart).
          </p>
        </div>

        {/* ── Run history (use manual triggers above) ──────────────── */}
        <div className="flex items-center gap-2 pt-2">
          <RefreshCw className="w-4 h-4 text-dark-500" />
          <h3 className="text-sm font-semibold text-dark-300">Run history</h3>
        </div>

        <SyncLogTable
          syncType="channel"
          label="Channel"
          icon={Database}
          triggerEndpoint="/sync/channels/trigger"
          canTrigger={canTriggerChannel}
          showTrigger={false}
        />

        <SyncLogTable
          syncType="video"
          label="Dedicated Video"
          icon={Video}
          triggerEndpoint="/sync/videos/trigger"
          canTrigger={canTriggerVideo}
          showTrigger={false}
        />

        <SyncLogTable
          syncType="ihi_ingest"
          label="IHI Ingest"
          icon={Sparkles}
          triggerEndpoint="/sync/ihi/ingest/trigger"
          canTrigger={canTriggerIhiIngest}
          showTrigger={false}
        />

        <SyncLogTable
          syncType="ihi_sadhguru_stats"
          label="IHI Sadhguru Stats"
          icon={BarChart2}
          triggerEndpoint="/sync/ihi/sadhguru-stats/trigger"
          canTrigger={canTriggerIhiSadhguruStats}
          showTrigger={false}
        />
      </div>
    </div>
  );
}
