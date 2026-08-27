import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Plus, Database, XCircle } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function SpreadsheetSyncPage() {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [selectedNewChannels, setSelectedNewChannels] = useState(new Set());

  const handleSync = async () => {
    setLoading(true);
    setSelectedNewChannels(new Set());
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

  const handleApplyChanges = async () => {
    if (!data) return;
    
    const newChannels = data.items.filter(i => i.statusState === 'NEW_CHANNEL' && selectedNewChannels.has(i.id));
    const updatedChannels = data.items.filter(i => i.statusState === 'HANDLE_CHANGED');
    
    if (newChannels.length === 0 && updatedChannels.length === 0) {
      toast.error('No channels selected for import and no handles to update.');
      return;
    }

    setApplying(true);
    const toastId = toast.loading('Applying changes...');
    try {
      const res = await api.post('/channels/import-approved-sheet-channels', {
        approvedItems: {
          newChannels,
          updatedChannels
        }
      });
      
      const { importedCount, updatedCount, errors } = res.data;
      
      if (errors && errors.length > 0) {
        toast.error(`Applied with ${errors.length} errors. imported: ${importedCount}, updated: ${updatedCount}`, { id: toastId });
      } else {
        toast.success(`Success! Imported ${importedCount} new, updated ${updatedCount} handles.`, { id: toastId });
      }

      // Re-run the sync preview to reflect updated state
      handleSync();
      
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply changes', { id: toastId });
    } finally {
      setApplying(false);
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedNewChannels);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedNewChannels(newSet);
  };

  const toggleSelectAll = () => {
    if (!data) return;
    const newItems = data.items.filter(i => i.statusState === 'NEW_CHANNEL');
    if (selectedNewChannels.size === newItems.length) {
      setSelectedNewChannels(new Set());
    } else {
      setSelectedNewChannels(new Set(newItems.map(i => i.id)));
    }
  };

  const filteredItems = data?.items?.filter(item => {
    if (filter === 'ALL') return true;
    return item.statusState === filter;
  }) || [];

  const newCount = data?.items?.filter(i => i.statusState === 'NEW_CHANNEL').length || 0;
  const changedCount = data?.items?.filter(i => i.statusState === 'HANDLE_CHANGED').length || 0;
  const isAllSelected = newCount > 0 && selectedNewChannels.size === newCount;

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
            disabled={loading || applying}
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
              <div className="p-4 border-b border-dark-700 flex justify-between items-center">
                <div className="flex gap-2 overflow-x-auto">
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
                
                {(newCount > 0 || changedCount > 0) && (
                   <button onClick={handleApplyChanges} disabled={applying} className="btn-primary py-2 px-4 flex items-center gap-2 whitespace-nowrap">
                     {applying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                     Apply Selected ({selectedNewChannels.size} New, {changedCount} Updates)
                   </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-dark-800/50 text-dark-300">
                    <tr>
                      <th className="p-4 w-12 text-center">
                         {filter === 'ALL' || filter === 'NEW_CHANNEL' ? (
                            <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-accent-500 focus:ring-accent-500 focus:ring-offset-dark-900" />
                         ) : null}
                      </th>
                      <th className="p-4 font-medium">Channel</th>
                      <th className="p-4 font-medium">Channel ID</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/50">
                    {filteredItems.map(item => (
                      <tr key={item.id} className={`hover:bg-dark-700/20 transition-colors ${item.statusState === 'NEW_CHANNEL' && selectedNewChannels.has(item.id) ? 'bg-accent-500/5' : ''}`}>
                        <td className="p-4 text-center">
                          {item.statusState === 'NEW_CHANNEL' && (
                             <input type="checkbox" checked={selectedNewChannels.has(item.id)} onChange={() => toggleSelect(item.id)} className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-accent-500 focus:ring-accent-500 focus:ring-offset-dark-900" />
                          )}
                        </td>
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
                          {item.statusState === 'HANDLE_CHANGED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400"><AlertTriangle className="w-3.5 h-3.5"/> Handle Changed</span>}
                          {item.statusState === 'CHANNEL_NOT_FOUND' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400"><XCircle className="w-3.5 h-3.5"/> Not Found</span>}
                          {item.statusState === 'ERROR' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400"><AlertTriangle className="w-3.5 h-3.5"/> Error</span>}
                        </td>
                        <td className="p-4 text-dark-300">
                          {item.category || '-'}
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
