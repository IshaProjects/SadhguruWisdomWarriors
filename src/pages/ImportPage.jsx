import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileSpreadsheet, ArrowLeft, CheckCircle,
  AlertCircle, XCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function ImportPage() {
  const navigate = useNavigate();
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [showAdded, setShowAdded]   = useState(false);
  const [showErrors, setShowErrors] = useState(true);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResults(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResults(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/channels/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(res.data);
      if (res.data.added > 0) {
        toast.success(`Import complete: ${res.data.added} channel${res.data.added !== 1 ? 's' : ''} added`);
      } else {
        toast(`Import complete: 0 new channels added (${res.data.skipped} already existed)`, { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <TopBar title="Bulk Import" />
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <button onClick={() => navigate('/channels')} className="btn-ghost flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Channels
        </button>

        {/* Upload Card */}
        <div className="glass-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-1">Import Channels from CSV</h2>
            <p className="text-sm text-dark-400">
              Upload a CSV with the columns below. Channel URLs (including <code className="text-accent-400">@handles</code>,{' '}
              <code className="text-accent-400">?si=</code> tracking links, and legacy URLs) are all supported.
              New categories in the file are automatically created in the system.
            </p>
          </div>

          {/* Format guide */}
          <div className="bg-dark-800 rounded-lg p-4 text-xs space-y-2">
            <p className="text-dark-300 font-medium mb-2">Expected CSV format</p>
            <table className="w-full text-left">
              <thead>
                <tr className="text-dark-500 uppercase text-[10px]">
                  <th className="pb-1.5 pr-6">Column</th>
                  <th className="pb-1.5 pr-6">Required</th>
                  <th className="pb-1.5">Notes</th>
                </tr>
              </thead>
              <tbody className="text-dark-300 space-y-1">
                {[
                  { col: 'channel_id', req: 'Yes', note: 'Full YouTube URL, @handle, or UCxxxx channel ID' },
                  { col: 'category',   req: 'No',  note: 'e.g. "Dedicated - Grade A". Created automatically if new.' },
                  { col: 'tags',       req: 'No',  note: 'Semicolon-separated, e.g. priority;growth' },
                  { col: 'notes',      req: 'No',  note: 'Free-text internal notes' },
                ].map(({ col, req, note }) => (
                  <tr key={col}>
                    <td className="pr-6 py-0.5"><code className="text-accent-400">{col}</code></td>
                    <td className="pr-6 py-0.5">{req}</td>
                    <td className="py-0.5 text-dark-400">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-dark-500 mt-2">
              Supported URL formats: <code>https://www.youtube.com/@Handle</code>,{' '}
              <code>youtube.com/@handle?si=…</code>, <code>m.youtube.com/@handle</code>,{' '}
              <code>youtube.com/channel/UCxxxx</code>, legacy <code>youtube.com/c/name</code>
            </p>
          </div>

          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-accent-500 bg-accent-500/10' : 'border-dark-600 hover:border-dark-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 text-dark-400 mx-auto mb-3" />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-accent-400" />
                <span className="font-medium">{file.name}</span>
                <span className="text-dark-400 text-sm">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <>
                <p className="font-medium">Drop your CSV file here</p>
                <p className="text-sm text-dark-400 mt-1">or click to browse</p>
              </>
            )}
          </div>

          {file && (
            <button onClick={handleUpload} disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Importing… this may take a while for large files
                </span>
              ) : (
                'Start Import'
              )}
            </button>
          )}
        </div>

        {/* Results */}
        {results && (
          <div className="glass-card p-6 space-y-5">
            <h3 className="font-semibold">Import Results</h3>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-green-400">{results.added}</p>
                  <p className="text-xs text-dark-400">Added</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle className="w-6 h-6 text-yellow-400 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{results.skipped}</p>
                  <p className="text-xs text-dark-400">Skipped (already exist)</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <XCircle className="w-6 h-6 text-red-400 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-red-400">{results.errors?.length || 0}</p>
                  <p className="text-xs text-dark-400">Errors</p>
                </div>
              </div>
            </div>

            {/* Added channels list */}
            {results.addedChannels?.length > 0 && (
              <div>
                <button
                  onClick={() => setShowAdded(!showAdded)}
                  className="flex items-center gap-2 text-sm font-medium text-green-400 hover:text-green-300 mb-2"
                >
                  {showAdded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  View {results.addedChannels.length} added channel{results.addedChannels.length !== 1 ? 's' : ''}
                </button>
                {showAdded && (
                  <div className="max-h-60 overflow-y-auto rounded-lg bg-dark-800 divide-y divide-dark-700">
                    {results.addedChannels.map((ch, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 gap-3">
                        <span className="text-sm font-medium truncate">{ch.title}</span>
                        <span className="text-xs text-dark-400 shrink-0 bg-dark-700 px-2 py-0.5 rounded-full">{ch.category}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Errors list */}
            {results.errors?.length > 0 && (
              <div>
                <button
                  onClick={() => setShowErrors(!showErrors)}
                  className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 mb-2"
                >
                  {showErrors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  View {results.errors.length} error{results.errors.length !== 1 ? 's' : ''}
                </button>
                {showErrors && (
                  <div className="max-h-60 overflow-y-auto rounded-lg bg-dark-800 divide-y divide-dark-700">
                    {results.errors.map((err, i) => (
                      <div key={i} className="px-3 py-2">
                        <p className="text-xs text-red-400 font-mono truncate">{err.input}</p>
                        <p className="text-xs text-dark-400 mt-0.5">{err.error}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
