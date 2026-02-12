import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../../services/api.js';
import toast from 'react-hot-toast';

const categories = [
  'Uncategorized', 'Gaming', 'Education', 'Tech', 'Entertainment',
  'Music', 'Sports', 'News', 'Lifestyle', 'Comedy', 'Science', 'Finance',
];

export default function AddChannelModal({ open, onClose, onAdded }) {
  const [channelInput, setChannelInput] = useState('');
  const [category, setCategory] = useState('Uncategorized');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/channels', {
        channelInput,
        category,
        tags: tags ? tags.split(',').map((t) => t.trim()) : [],
        notes,
      });
      toast.success(`Added: ${res.data.title}`);
      onAdded?.(res.data);
      setChannelInput('');
      setCategory('Uncategorized');
      setTags('');
      setNotes('');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Add Channel</h2>
          <button onClick={onClose} className="p-1 hover:bg-dark-800 rounded">
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Channel ID or URL
            </label>
            <input
              type="text"
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              className="input-field w-full"
              placeholder="UCxxxx... or youtube.com/c/... or @handle"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field w-full"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
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
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Notes
            </label>
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
            <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
              {loading ? 'Adding...' : 'Add Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
