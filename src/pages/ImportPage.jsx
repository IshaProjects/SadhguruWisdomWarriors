import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function ImportPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

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
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/channels/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(res.data);
      toast.success(`Import complete: ${res.data.added} added`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <TopBar title="Bulk Import" />
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/channels')}
          className="btn-ghost flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Channels
        </button>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-2">Import Channels from CSV</h2>
          <p className="text-sm text-dark-400 mb-6">
            Upload a CSV file with columns: <code className="text-accent-400">channel_id</code>,{' '}
            <code className="text-accent-400">category</code>,{' '}
            <code className="text-accent-400">tags</code> (semicolon-separated),{' '}
            <code className="text-accent-400">notes</code>
          </p>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-accent-500 bg-accent-500/10'
                : 'border-dark-600 hover:border-dark-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 text-dark-400 mx-auto mb-3" />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-accent-400" />
                <span className="font-medium">{file.name}</span>
                <span className="text-dark-400 text-sm">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <>
                <p className="font-medium">Drop your CSV file here</p>
                <p className="text-sm text-dark-400 mt-1">or click to browse</p>
              </>
            )}
          </div>

          {file && (
            <button
              onClick={handleUpload}
              disabled={loading}
              className="btn-primary w-full mt-4 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Start Import'}
            </button>
          )}
        </div>

        {results && (
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-semibold">Import Results</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <div>
                  <p className="text-2xl font-bold">{results.added}</p>
                  <p className="text-xs text-dark-400">Added</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{results.skipped}</p>
                  <p className="text-xs text-dark-400">Skipped (duplicates)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-danger" />
                <div>
                  <p className="text-2xl font-bold">{results.errors?.length || 0}</p>
                  <p className="text-xs text-dark-400">Errors</p>
                </div>
              </div>
            </div>

            {results.errors?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-dark-300 mb-2">Errors:</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {results.errors.map((err, i) => (
                    <p key={i} className="text-xs text-dark-400">
                      <span className="text-danger">{err.input}</span>: {err.error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
