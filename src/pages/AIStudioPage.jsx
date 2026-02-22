import { useState } from 'react';
import { Cpu, ListVideo, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import TopBar from '../components/layout/TopBar.jsx';
import VideoQueue from '../components/ai/VideoQueue.jsx';
import RAGChat from '../components/ai/RAGChat.jsx';

const TABS = [
  { id: 'queue', label: 'Ingestion Queue', icon: ListVideo  },
  { id: 'chat',  label: 'AI Chat',         icon: MessageSquare },
];

export default function AIStudioPage() {
  const [activeTab, setActiveTab] = useState('queue');

  return (
    <div className="flex flex-col h-full">
      <TopBar />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent-500/10 border border-accent-500/20">
            <Cpu className="w-5 h-5 text-accent-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">AI Studio</h1>
            <p className="text-xs text-dark-400 mt-0.5">
              Ingest YouTube videos into the AI knowledge base and query them with RAG-powered chat.
            </p>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-dark-800/60 border border-dark-700/50 rounded-xl w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === id
                  ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30'
                  : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ─────────────────────────────────────────────────── */}
        <div className={clsx(activeTab === 'queue' ? 'block' : 'hidden')}>
          <VideoQueue />
        </div>

        <div className={clsx(
          activeTab === 'chat' ? 'flex flex-col' : 'hidden',
          'glass-card p-5'
        )}>
          <RAGChat />
        </div>

      </div>
    </div>
  );
}
