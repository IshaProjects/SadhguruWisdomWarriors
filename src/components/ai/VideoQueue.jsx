import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Trash2, Play, Loader2, Check, X, AlertCircle,
  ChevronDown, ChevronUp, Link, Clock, Zap, ListVideo,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api.js';
import { useRbac } from '../../context/RbacContext.jsx';
import InfoTooltip from '../common/InfoTooltip.jsx';

// ── constants ─────────────────────────────────────────────────────────────────

const VIDEO_TYPES = [
  { value: 'normal',      label: 'Normal' },
  { value: 'viral',       label: 'Viral' },
  { value: 'event',       label: 'Event-specific' },
  { value: 'educational', label: 'Educational' },
  { value: 'other',       label: 'Other' },
];

const PRIORITIES = [
  { value: 'high',   label: 'High',   cls: 'text-red-400   bg-red-500/10   border-red-500/30'   },
  { value: 'normal', label: 'Normal', cls: 'text-dark-300  bg-dark-700     border-dark-600'      },
  { value: 'low',    label: 'Low',    cls: 'text-dark-400  bg-dark-800     border-dark-700'      },
];

const STATUS_CONFIG = {
  queued:     { label: 'Queued',     icon: Clock,    cls: 'text-dark-400  bg-dark-700/60  border-dark-600'      },
  processing: { label: 'Processing', icon: Loader2,  cls: 'text-accent-400 bg-accent-500/10 border-accent-500/30', spin: true },
  completed:  { label: 'Done',       icon: Check,    cls: 'text-green-400  bg-green-500/10  border-green-500/30'  },
  failed:     { label: 'Failed',     icon: AlertCircle, cls: 'text-red-400 bg-red-500/10   border-red-500/30'    },
};

const POLL_INTERVAL_MS = 2500;

// ── sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg  = STATUS_CONFIG[status] ?? STATUS_CONFIG.queued;
  const Icon = cfg.icon;
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
      cfg.cls
    )}>
      <Icon className={clsx('w-3 h-3', cfg.spin && 'animate-spin')} />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[1];
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
      cfg.cls
    )}>
      {cfg.label}
    </span>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function VideoQueue() {
  const { canPerformAction } = useRbac();
  const canAdd     = canPerformAction('queue.add');
  const canProcess = canPerformAction('queue.process');

  // ── state ──────────────────────────────────────────────────────────────────
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [processing,  setProcessing]  = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [bulkMode,    setBulkMode]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [form, setForm] = useState({
    url: '', bulkUrls: '', videoType: 'normal',
    eventName: '', notes: '', priority: 'normal',
  });

  const pollRef = useRef(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    try {
      const { data } = await api.get('/video-queue');
      setItems(data.items ?? []);
    } catch { /* silent — polling */ }
  }, []);

  // Start/stop polling based on whether any item is processing
  useEffect(() => {
    fetchQueue().finally(() => setLoading(false));
  }, [fetchQueue]);

  useEffect(() => {
    const hasProcessing = items.some((i) => i.status === 'processing');
    if (hasProcessing && !pollRef.current) {
      pollRef.current = setInterval(fetchQueue, POLL_INTERVAL_MS);
    }
    if (!hasProcessing && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      setProcessing(false);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [items, fetchQueue]);

  // ── form handlers ──────────────────────────────────────────────────────────
  const handleFormChange = (field, value) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        videoType: form.videoType,
        eventName: form.eventName,
        notes:     form.notes,
        priority:  form.priority,
      };
      if (bulkMode) {
        body.urls = form.bulkUrls.split('\n').map((u) => u.trim()).filter(Boolean);
      } else {
        body.url = form.url.trim();
      }
      await api.post('/video-queue', body);
      setForm({ url: '', bulkUrls: '', videoType: 'normal', eventName: '', notes: '', priority: 'normal' });
      setShowForm(false);
      await fetchQueue();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add to queue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      await api.delete(`/video-queue/${id}`);
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch {
      alert('Failed to remove item');
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      await api.post('/video-queue/process');
      await fetchQueue();
      // Kick off polling immediately
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchQueue, POLL_INTERVAL_MS);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start processing');
      setProcessing(false);
    }
  };

  // ── derived stats ──────────────────────────────────────────────────────────
  const counts = items.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {});
  const queuedCount = counts.queued ?? 0;
  const hasProcessingItem = items.some((i) => i.status === 'processing');

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ListVideo className="w-5 h-5 text-accent-400" />
            <h2 className="text-base font-semibold">Video Ingestion Queue</h2>
            <InfoTooltip
              side="right"
              text="Sequential processing ensures high-quality transcript extraction and prevents API rate-limiting. Videos are processed one-by-one: transcript → chunk → embed → index into the AI knowledge base."
            />
          </div>
          <p className="text-xs text-dark-400 mt-0.5">
            {items.length} item{items.length !== 1 ? 's' : ''} total ·{' '}
            {queuedCount} queued ·{' '}
            {counts.completed ?? 0} completed ·{' '}
            {counts.failed ?? 0} failed
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canProcess && queuedCount > 0 && (
            <button
              onClick={handleProcess}
              disabled={processing || hasProcessingItem}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500
                         text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {hasProcessingItem
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Play className="w-4 h-4" />}
              {hasProcessingItem ? 'Processing…' : `Process ${queuedCount} item${queuedCount !== 1 ? 's' : ''}`}
            </button>
          )}

          {canAdd && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600
                         text-dark-200 text-sm font-medium border border-dark-600 transition-colors"
            >
              {showForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'Close' : 'Add Videos'}
            </button>
          )}
        </div>
      </div>

      {/* ── Add Form ───────────────────────────────────────────────────────── */}
      {showForm && canAdd && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Add to Queue</h3>
            <button
              onClick={() => setBulkMode((v) => !v)}
              className="text-xs text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1"
            >
              <Link className="w-3 h-3" />
              {bulkMode ? 'Single URL' : 'Bulk paste (multiple URLs)'}
            </button>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            {/* URL input */}
            {bulkMode ? (
              <div>
                <label className="block text-xs text-dark-400 mb-1">YouTube URLs (one per line)</label>
                <textarea
                  value={form.bulkUrls}
                  onChange={(e) => handleFormChange('bulkUrls', e.target.value)}
                  rows={4}
                  placeholder="https://youtube.com/watch?v=..."
                  required
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm
                             text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-500
                             resize-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-dark-400 mb-1">YouTube URL</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => handleFormChange('url', e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  required
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm
                             text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-500"
                />
              </div>
            )}

            {/* Video type + priority row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-dark-400 mb-1">Video Type</label>
                <select
                  value={form.videoType}
                  onChange={(e) => handleFormChange('videoType', e.target.value)}
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm
                             text-dark-100 focus:outline-none focus:border-accent-500"
                >
                  {VIDEO_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <p className="text-xs text-dark-500 mt-1">
                  Helps the AI understand the content context when indexing.
                </p>
              </div>

              <div>
                <label className="block text-xs text-dark-400 mb-1">Priority</label>
                <div className="flex gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleFormChange('priority', p.value)}
                      className={clsx(
                        'flex-1 py-2 rounded-lg text-xs font-medium border transition-colors',
                        form.priority === p.value ? p.cls : 'bg-dark-800 border-dark-600 text-dark-500'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Event name — only shown when type = event */}
            {form.videoType === 'event' && (
              <div>
                <label className="block text-xs text-dark-400 mb-1">Event Name</label>
                <input
                  type="text"
                  value={form.eventName}
                  onChange={(e) => handleFormChange('eventName', e.target.value)}
                  placeholder="e.g. Inner Engineering Intensive 2024"
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm
                             text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-500"
                />
              </div>
            )}

            {/* Notes / context for LLM */}
            <div>
              <label className="block text-xs text-dark-400 mb-1">
                Context notes{' '}
                <span className="text-dark-500">(optional — helps the AI during indexing)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                rows={2}
                placeholder="e.g. Sadhguru explains the concept of karma in detail. Key topics: karma, action, consciousness."
                className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm
                           text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm bg-dark-700 hover:bg-dark-600
                           border border-dark-600 text-dark-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-accent-600
                           hover:bg-accent-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {submitting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Plus className="w-4 h-4" />}
                {submitting ? 'Adding…' : 'Add to Queue'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Queue Table ─────────────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-accent-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-dark-400">
            <ListVideo className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No videos in queue.</p>
            {canAdd && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-sm text-accent-400 hover:text-accent-300"
              >
                Add your first video →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700 text-left">
                  <th className="py-3 px-4 text-xs font-medium text-dark-400 w-1/2">URL / Title</th>
                  <th className="py-3 px-3 text-xs font-medium text-dark-400">Type</th>
                  <th className="py-3 px-3 text-xs font-medium text-dark-400">Priority</th>
                  <th className="py-3 px-3 text-xs font-medium text-dark-400">Status</th>
                  <th className="py-3 px-3 text-xs font-medium text-dark-400">Added</th>
                  {canAdd && <th className="py-3 px-3 w-10" />}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-b border-dark-800 hover:bg-dark-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-dark-200 truncate max-w-xs">
                        {item.title || item.url}
                      </p>
                      {item.title && (
                        <p className="text-xs text-dark-500 truncate max-w-xs">{item.url}</p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-dark-500 italic mt-0.5 truncate max-w-xs">{item.notes}</p>
                      )}
                      {item.errorMessage && (
                        <p className="text-xs text-red-400 mt-0.5 truncate max-w-xs">{item.errorMessage}</p>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs text-dark-300 capitalize">{item.videoType}</span>
                      {item.eventName && (
                        <p className="text-xs text-dark-500 mt-0.5">{item.eventName}</p>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-3 text-xs text-dark-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    {canAdd && (
                      <td className="py-3 px-3">
                        {item.status !== 'processing' && (
                          <button
                            onClick={() => handleRemove(item._id)}
                            className="p-1.5 rounded hover:bg-dark-700 text-dark-500 hover:text-red-400 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
