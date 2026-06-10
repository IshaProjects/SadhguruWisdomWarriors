import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import { useCategories } from '../../hooks/useCategories.js';

export default function EditChannelModal({ channel, open, onClose, onSaved }) {
  const [category, setCategory] = useState('Uncategorized');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);

  const { categories, loading: catsLoading, refetch } = useCategories();

  useEffect(() => {
    if (!channel) return;
    setCategory(channel.category || 'Uncategorized');
    setTags(channel.tags?.join(', ') || '');
    setNotes(channel.notes || '');
    setStatus(channel.status || 'active');
  }, [channel]);

  // Re-fetch the categories list every time the modal opens
  useEffect(() => {
    if (open) refetch();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !channel) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/channels/${channel._id}`, {
        category,
        tags: tags ? tags.split(',').map((t) => t.trim()) : [],
        notes,
        status,
      });
      toast.success('Channel updated');
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold">Edit Channel</h2>
            <p className="text-xs text-dark-400 truncate max-w-xs">{channel.title}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-dark-800 rounded">
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field w-full"
              disabled={catsLoading}
            >
              {catsLoading ? (
                <option>Loading…</option>
              ) : (
                <>
                  {/* If the channel's current category isn't in the list, show it anyway */}
                  {category && !categories.includes(category) && (
                    <option key={category} value={category}>{category}</option>
                  )}
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="input-field w-full"
              placeholder="priority, new, growth"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-field w-full"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field w-full h-20 resize-none"
              placeholder="Internal notes..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

