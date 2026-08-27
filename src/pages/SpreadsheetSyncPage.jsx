import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Plus, Database, XCircle } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function SpreadsheetSyncPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await api.get('/channels/preview-google-sheet-sync');
      setData(res.data);
      toast.success('Spreadsheet analyzed!');
    } catch (err) {
      toast.error('Failed to sync spreadsheet');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = async (item) => {
    // We will call the standard Add Channel endpoint
    const toastId = toast.loading('Adding channel...');
    try {
      await api.post('/channels', {
        channelInput: item.youtubeChannelId,
        category: item.category || 'Uncategorized',
      });
      toast.success('Channel added!', { id: toastId });
      // Update UI state
      setData(prev => {
        if (!prev) return prev;
        const newItems = prev.items.map(i => i.id === item.id ? { ...i, statusState: 'ALREADY_ADDED' } : i);
        return { ...prev, items: newItems, summary: { ...prev.summary, newCount: prev.summary.newCount - 1, alreadyAddedCount: prev.summary.alreadyAddedCount + 1 } };
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add channel', { id: toastId });
    }
  };

  const handleUpdateHandle = async (item) => {
    const toastId = toast.loading('Updating handle...');
    try {
      await api.put(`/channels/${item.dbId}`, {
        customUrl: item.currentHandle,
        title: item.name,
        thumbnailUrl: item.thumbnail
      });
      toast.success('Channel updated!', { id: toastId });
      setData(prev => {
        if (!prev) return prev;
        const newItems = prev.items.map(i => i.id === item.id ? { ...i, statusState: 'ALREADY_ADDED' } : i);
        return { ...prev, items: newItems, summary: { ...prev.summary, handleChangedCount: prev.summary.handleChangedCount - 1, alreadyAddedCount: prev.summary.alreadyAddedCount + 1 } };
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update channel', { id: toastId });
    }
  };

  const filteredItems = data?.items?.filter(item => {
    if (filter === 'ALL') return true;
    return item.statusState === filter;
  }) || [];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-dark-900">
      <TopBar title="YouTube Channel Sync" />
      
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex justify-between items-center bg-dark-800 p-6 rounded-xl border border-dark-700">
          <div>
            <h2 className="text-xl font-bold text-dark-100 flex items-center gap-2">
              <Database className="w-5 h-5 text-accent-500" />
              Spreadsheet Sync
            </h2>
            <p className="text-dark-300 mt-1">
              Analyze the Dedicated Master Database spreadsheet to find new channels, handle changes, and broken links.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Sync New Channels'}
          </button>
        </div>

        {data && (
          <>
            <div className="grid grid-cols-5 gap-4">
              <div className="glass-card p-4 text-center">
                <div className="text-3xl font-bold text-white">{data.summary.totalSheetChannels}</div>
                <div className="text-sm text-dark-300 mt-1">Total Links Processed</div>
              </div>
              <div className="glass-card p-4 text-center border-l-2 border-l-blue-500">
                <div className="text-3xl font-bold text-blue-400">{data.summary.newCount}</div>
                <div className="text-sm text-dark-300 mt-1">New Channels</div>
              </div>
              <div className="glass-card p-4 text-center border-l-2 border-l-yellow-500">
                <div className="text-3xl font-bold text-yellow-400">{data.summary.handleChangedCount}</div>
                <div className="text-sm text-dark-300 mt-1">Handle Changed</div>
              </div>
              <div className="glass-card p-4 text-center border-l-2 border-l-green-500">
                <div className="text-3xl font-bold text-green-400">{data.summary.alreadyAddedCount}</div>
                <div className="text-sm text-dark-300 mt-1">Already Added</div>
              </div>
              <div className="glass-card p-4 text-center border-l-2 border-l-red-500">
                <div className="text-3xl font-bold text-red-400">{data.summary.notFoundCount}</div>
                <div className="text-sm text-dark-300 mt-1">Not Found</div>
              </div>
            </div>

            <div className="glass-card flex flex-col">
              <div className="p-4 border-b border-dark-700 flex gap-2 overflow-x-auto">
                {['ALL', 'NEW_CHANNEL', 'HANDLE_CHANGED', 'ALREADY_ADDED', 'CHANNEL_NOT_FOUND', 'ERROR'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                      filter === f ? 'bg-accent-500/20 text-accent-300' : 'text-dark-300 hover:bg-dark-700'
                    }`}
                  >
                    {f.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-dark-800/50 text-dark-300">
                    <tr>
                      <th className="p-4 font-medium">Channel</th>
                      <th className="p-4 font-medium">Channel ID</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Category</th>
                      <th className="p-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/50">
                    {filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-dark-700/20 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt="" className="w-8 h-8 rounded-full bg-dark-700" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-dark-700" />
                            )}
                            <div>
                              <div className="font-medium text-dark-100">{item.name || 'Unknown'}</div>
                              {item.statusState === 'HANDLE_CHANGED' ? (
                                <div className="text-xs text-dark-400">
                                  <span className="line-through mr-2">{item.previousHandle}</span>
                                  <span className="text-yellow-400">{item.currentHandle}</span>
                                </div>
                              ) : (
                                <div className="text-xs text-dark-400 truncate max-w-[200px]">{item.currentHandle || item.rawLink}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs text-dark-300">{item.youtubeChannelId}</td>
                        <td className="p-4">
                          {item.statusState === 'NEW_CHANNEL' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400"><Plus className="w-3.5 h-3.5"/> New</span>}
                          {item.statusState === 'ALREADY_ADDED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400"><CheckCircle className="w-3.5 h-3.5"/> Added</span>}
                          {item.statusState === 'HANDLE_CHANGED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400"><AlertTriangle className="w-3.5 h-3.5"/> Changed</span>}
                          {item.statusState === 'CHANNEL_NOT_FOUND' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400"><XCircle className="w-3.5 h-3.5"/> Not Found</span>}
                          {item.statusState === 'ERROR' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400"><AlertTriangle className="w-3.5 h-3.5"/> Error</span>}
                        </td>
                        <td className="p-4 text-dark-300">
                          {item.category || '-'}
                        </td>
                        <td className="p-4 text-right">
                          {item.statusState === 'NEW_CHANNEL' && (
                            <button onClick={() => handleAddChannel(item)} className="btn-primary py-1 px-3 text-xs">
                              Add Channel
                            </button>
                          )}
                          {item.statusState === 'HANDLE_CHANGED' && (
                            <button onClick={() => handleUpdateHandle(item)} className="btn-secondary py-1 px-3 text-xs border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10">
                              Update Handle
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-dark-400">
                          No channels found matching the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
